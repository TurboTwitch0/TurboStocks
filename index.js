"use strict";

// Import Express in the recognized entry file so Vercel detects the framework.
// Locally, `npm start` still runs backend.js directly.
require("express");
module.exports = require("./backend");
