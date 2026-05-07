#!/usr/bin/env node

/**
 * Basic Stitch connectivity check.
 *
 * Usage:
 *   node scripts/test-stitch-connection.js
 *   STITCH_BASE_URL=https://example.com node scripts/test-stitch-connection.js
 *
 * Optional auth environment variables:
 *   STITCH_API_KEY
 *   STITCH_API_SECRET
 *   STITCH_AUTH_HEADER (defaults to "Authorization")
 *   STITCH_AUTH_SCHEME (defaults to "Bearer")
 */

const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
const dotenvResult = dotenv.config({ path: envPath });
const dotenvLoaded = !dotenvResult.error;

const baseUrl = process.env.STITCH_BASE_URL || "https://stitch.withgoogle.com";
const apiKey = process.env.STITCH_API_KEY;
const apiSecret = process.env.STITCH_API_SECRET;
const authHeader = process.env.STITCH_AUTH_HEADER || "Authorization";
const authScheme = process.env.STITCH_AUTH_SCHEME || "Bearer";

function buildHeaders() {
  const headers = {
    "User-Agent": "investment-report-stitch-check/1.0",
  };

  if (apiKey && apiSecret) {
    headers[authHeader] = `${authScheme} ${apiKey}:${apiSecret}`;
  } else if (apiKey) {
    headers[authHeader] = `${authScheme} ${apiKey}`;
  }

  return headers;
}

console.log(`Debug: STITCH_API_KEY present: ${Boolean(apiKey)}`);
console.log(`Debug: STITCH_API_SECRET present: ${Boolean(apiSecret)}`);
console.log(`Debug: dotenv loaded: ${dotenvLoaded}`);
console.log(`Debug: dotenv path attempted: ${envPath}`);
console.log(`Debug: auth header configured: ${authHeader}`);

async function main() {
  try {
    const response = await fetch(baseUrl, {
      method: "GET",
      headers: buildHeaders(),
      redirect: "follow",
    });

    console.log(`Stitch connectivity check: ${baseUrl}`);
    console.log(`HTTP status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const body = await response.text();
      console.error("Response body preview:", body.slice(0, 300));
      process.exitCode = 1;
      return;
    }

    console.log("Connection succeeded.");
  } catch (error) {
    console.error(`Connection failed for ${baseUrl}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
