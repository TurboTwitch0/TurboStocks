"use strict";
const serverless = require("serverless-http");
const { createApp } = require("../../backend");

// Caches and the basic throttle are instance-local and best-effort on serverless.
// Provider calls abort after 8 seconds; Netlify synchronous functions time out at 60 seconds.
const app = createApp();
exports.handler = serverless(app);
