"use strict";
(function (root) {
    const MAX_SHARES = 1e9;
    const SYMBOL = /^[A-Z][A-Z0-9.-]{0,9}$/;
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    function validShares(shares) {
        return Number.isFinite(shares) && shares >= 0.000001 && shares <= MAX_SHARES && Number(shares.toFixed(6)) === shares;
    }
    function validateAccount(account) {
        if (!record(account) || !Number.isFinite(account.cash) || account.cash < 0 ||
            !record(account.positions) || !Array.isArray(account.history) || !Array.isArray(account.watchlist) ||
            (account.realizedPnl !== undefined && !Number.isFinite(account.realizedPnl))) {
            throw new Error('Saved portfolio data is invalid. Export a backup, then explicitly reset the paper account.');
        }
        for (const [symbol, position] of Object.entries(account.positions)) {
            if (!SYMBOL.test(symbol) || !record(position) || !validShares(position.shares) ||
                !Number.isFinite(position.averagePrice) || position.averagePrice <= 0 ||
                !Number.isFinite(position.shares * position.averagePrice)) {
                throw new Error(`Invalid position data for ${symbol}. Export a backup before resetting.`);
            }
        }
        if (account.watchlist.some(symbol => typeof symbol !== 'string' || !SYMBOL.test(symbol))) {
            throw new Error('Saved watchlist data is invalid. Export a backup before resetting.');
        }
        for (const trade of account.history) {
            if (!record(trade) || !SYMBOL.test(trade.symbol) || !['BUY', 'SELL'].includes(trade.side) ||
                !validShares(trade.shares) || !Number.isFinite(trade.price) || trade.price <= 0) {
                throw new Error('Saved trade history is invalid. Export a backup before resetting.');
            }
        }
        return account;
    }
    function execute(account, symbol, side, shares, price) {
        if (typeof symbol !== 'string' || !SYMBOL.test(symbol) || !['BUY', 'SELL'].includes(side)) {
            throw new Error('Invalid symbol or order action.');
        }
        if (!validShares(shares)) throw new Error('Enter shares from 0.000001 to 1,000,000,000 with at most six decimal places.');
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(shares * price)) throw new Error('Sample price unavailable.');
        validateAccount(account);
        const next = JSON.parse(JSON.stringify(account));
        const position = Object.hasOwn(next.positions, symbol) ? next.positions[symbol] : null;
        const total = shares * price;
        if (side === 'BUY') {
            if (total > next.cash) throw new Error('Insufficient buying power.');
            const previousShares = position?.shares || 0;
            const newShares = Number((previousShares + shares).toFixed(6));
            if (newShares > MAX_SHARES) throw new Error('Position exceeds the supported share limit.');
            const previousCost = previousShares * (position?.averagePrice || 0);
            next.positions[symbol] = {shares: newShares, averagePrice:(previousCost + total) / newShares};
            next.cash -= total;
        } else {
            if (!position || shares > position.shares) throw new Error('You cannot sell more shares than you own.');
            next.cash += total;
            next.realizedPnl = (next.realizedPnl || 0) + shares * (price - position.averagePrice);
            position.shares = Number((position.shares - shares).toFixed(6));
            if (position.shares === 0) delete next.positions[symbol];
        }
        next.history.unshift({symbol, side, shares, price, total, timestamp:new Date().toISOString(), source:'Fixed educational sample', fees:0});
        validateAccount(next);
        return next;
    }
    function metrics(account, prices) {
        validateAccount(account);
        let marketValue = 0, cost = 0;
        for (const [symbol, position] of Object.entries(account.positions)) {
            const price = Object.hasOwn(prices, symbol) ? prices[symbol] : null;
            if (!Number.isFinite(price) || price <= 0) throw new Error(`Missing valuation price for ${symbol}.`);
            marketValue += position.shares * price;
            cost += position.shares * position.averagePrice;
        }
        if (!Number.isFinite(marketValue + cost + account.cash)) throw new Error('Portfolio valuation exceeds the supported numeric range.');
        return {cash:account.cash, marketValue, cost, value:account.cash + marketValue, unrealizedPnl:marketValue-cost, realizedPnl:account.realizedPnl || 0};
    }
    const api = {execute, metrics, validateAccount};
    if (typeof module !== 'undefined') module.exports = api;
    else root.PaperEngine = api;
})(globalThis);
