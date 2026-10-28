"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("lockfile versions and dependency requirements match the installed package manifests", () => {
    const root = path.resolve(__dirname, "..");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
    assert.equal(lock.version, manifest.version);
    assert.equal(lock.packages[""].version, manifest.version);
    assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);

    for (const [location, entry] of Object.entries(lock.packages)) {
        if (!location) continue;
        const installedPath = path.join(root, location, "package.json");
        if (entry.optional && !fs.existsSync(installedPath)) continue;
        const installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
        assert.equal(entry.version, installed.version, `${location}: version differs from the installed package`);
        assert.deepEqual(entry.dependencies || {}, installed.dependencies || {}, `${location}: dependency requirements differ from the installed package`);
    }
});
