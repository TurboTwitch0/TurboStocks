"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Vercel entry exports the existing Express app without starting a local listener", () => {
    const deployedApp = require("../index");
    const localApp = require("../backend");
    assert.equal(deployedApp, localApp);
    assert.equal(typeof deployedApp, "function");
    assert.equal(deployedApp.createApp, localApp.createApp);
});

test("Vercel configuration targets the Express entry and keeps public assets available", () => {
    const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    const deploymentIgnore = fs.readFileSync(".vercelignore", "utf8");
    assert.equal(config.functions["index.js"].maxDuration, 30);
    assert.match(deploymentIgnore, /^archive\/$/m, "archived source and old release bundles must not enter the current Vercel deployment");
    for (const asset of ["index.html", "styles.css", "app.js", "ui.js", "paper-engine.js"]) {
        assert.equal(fs.existsSync(`public/${asset}`), true, `${asset} should be in Vercel's public directory`);
    }
});

