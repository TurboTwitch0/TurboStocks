"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execute, metrics } = require("../public/paper-engine");

function emptyAccount() {
    return { cash: 100000, positions: {}, history: [], watchlist: [] };
}

test("buy, average cost, partial sale, close, and reconcile P/L", () => {
    let account = execute(emptyAccount(), "AAPL", "BUY", 10, 100);
    account = execute(account, "AAPL", "BUY", 10, 200);

    assert.equal(account.positions.AAPL.averagePrice, 150);
    assert.equal(account.cash, 97000);

    account = execute(account, "AAPL", "SELL", 5, 180);
    assert.equal(account.realizedPnl, 150);

    const valuation = metrics(account, { AAPL: 180 });
    assert.equal(valuation.value, 100600);
    assert.equal(valuation.unrealizedPnl, 450);
    assert.equal(valuation.value - 100000, valuation.realizedPnl + valuation.unrealizedPnl);

    account = execute(account, "AAPL", "SELL", 15, 180);
    assert.deepEqual(account.positions, {});
    assert.equal(account.cash, 100600);
    assert.equal(account.realizedPnl, 600);
    assert.ok(account.history[0].timestamp);
});

test("reject invalid orders without mutating the original account", () => {
    const account = emptyAccount();

    for (const shares of [0, -1, NaN, Infinity, 0.0000001]) {
        assert.throws(() => execute(account, "AAPL", "BUY", shares, 100));
    }
    for (const price of [0, -1, NaN, Infinity]) {
        assert.throws(() => execute(account, "AAPL", "BUY", 1, price));
    }

    assert.throws(() => execute(account, "AAPL", "BUY", 1001, 100));
    assert.throws(() => execute(account, "AAPL", "SELL", 1, 100));
    assert.throws(() => execute(account, "<script>", "BUY", 1, 100));
    assert.equal(account.cash, 100000);
    assert.deepEqual(account.positions, {});
});

test("support fractional shares and reject overselling", () => {
    let account = execute(emptyAccount(), "AAPL", "BUY", 0.123456, 100);
    assert.throws(() => execute(account, "AAPL", "SELL", 0.123457, 100));

    account = execute(account, "AAPL", "SELL", 0.123456, 100);
    assert.equal(account.cash, 100000);
    assert.deepEqual(account.positions, {});
});

test("refuse to invent a valuation price", () => {
    const account = execute(emptyAccount(), "AAPL", "BUY", 1, 100);
    assert.throws(() => metrics(account, {}), /Missing valuation price/);
});

test('reject sub-minimum quantities that previously created zero-share positions', () => {
    for (const shares of [1e-10,1e-9,0.000000999999,0.1234567]) assert.throws(()=>execute(emptyAccount(),'AAPL','BUY',shares,100),/six decimal/);
    assert.equal(execute(emptyAccount(),'AAPL','BUY',0.000001,100).positions.AAPL.shares,0.000001);
});
test('corrupt cash, positions, history, watchlist and realized P/L are rejected', () => {
    const cases=[null,{}, {...emptyAccount(),cash:-1}, {...emptyAccount(),cash:'100'}, {...emptyAccount(),positions:[]}, {...emptyAccount(),history:{}}, {...emptyAccount(),watchlist:['<script>']}, {...emptyAccount(),realizedPnl:NaN}, {...emptyAccount(),positions:{AAPL:{shares:-10,averagePrice:100}}}, {...emptyAccount(),positions:{AAPL:{shares:0,averagePrice:100}}}, {...emptyAccount(),positions:{AAPL:{shares:1,averagePrice:-10}}}, {...emptyAccount(),history:[{}]}];
    for(const value of cases){assert.throws(()=>execute(value,'AAPL','BUY',1,100));assert.throws(()=>metrics(value,{AAPL:100}));}
});
test('overflow and aggregate-share limit are rejected before mutation', () => {
    const a={...emptyAccount(),cash:1e308,positions:{AAPL:{shares:1e9,averagePrice:1}}};
    assert.throws(()=>execute(a,'AAPL','BUY',1,1),/share limit/);
    const b={...emptyAccount(),cash:1e308,positions:{AAPL:{shares:1e9,averagePrice:1e299}}};
    assert.throws(()=>execute(b,'AAPL','SELL',1e9,1e299));
    assert.equal(b.cash,1e308);
});
test('fractional weighted cost reconciles with fractional sale', () => {
    let a=execute(emptyAccount(),'AAPL','BUY',0.123456,137.49);
    a=execute(a,'AAPL','BUY',0.654321,205.13);
    a=execute(a,'AAPL','SELL',0.111111,190.42);
    const m=metrics(a,{AAPL:190.42});
    assert.ok(Math.abs((m.value-100000)-(m.realizedPnl+m.unrealizedPnl))<1e-8);
});
