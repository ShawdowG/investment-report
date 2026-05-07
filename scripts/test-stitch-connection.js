#!/usr/bin/env node

/**
 * Basic Stitch connectivity check.
 *
 * Usage:
 *   node scripts/test-stitch-connection.js
 *   STITCH_BASE_URL=https://example.com node scripts/test-stitch-connection.js
 */

const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
const dotenvResult = dotenv.config({ path: envPath });
const dotenvLoaded = !dotenvResult.error;

const baseUrl = process.env.STITCH_BASE_URL || "https://stitch.withgoogle.com";

console.log(`Debug: STITCH_API_KEY present: ${Boolean(process.env.STITCH_API_KEY)}`);
console.log(`Debug: dotenv loaded: ${dotenvLoaded}`);
console.log(`Debug: dotenv path attempted: ${envPath}`);

async function main() {
  try {
    const response = await fetch(baseUrl, {
      method: "HEAD",
      redirect: "follow",
    });

    console.log(`Stitch connectivity check: ${baseUrl}`);
    console.log(`HTTP status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Connection failed for ${baseUrl}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
