#!/usr/bin/env node

/**
 * Stitch MCP connectivity check.
 *
 * Usage:
 *   node scripts/test-stitch-connection.js
 *
 * Environment variables:
 *   STITCH_MCP_URL    (default: https://stitch.googleapis.com/mcp)
 *   STITCH_API_KEY    (preferred)
 *   GOOGLE_API_KEY    (fallback)
 */

require("dotenv").config();

const mcpUrl = process.env.STITCH_MCP_URL || "https://stitch.googleapis.com/mcp";
const apiKey = process.env.STITCH_API_KEY || process.env.GOOGLE_API_KEY;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function main() {
  if (!apiKey) {
    fail("Missing STITCH_API_KEY (or GOOGLE_API_KEY) in environment.");
    return;
  }

  const payload = {
    jsonrpc: "2.0",
    id: "stitch-connectivity-test",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "investment-report-connection-test",
        version: "1.0.0",
      },
    },
  };

  try {
    const response = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }

    console.log(`Stitch MCP URL: ${mcpUrl}`);
    console.log(`HTTP status: ${response.status} ${response.statusText}`);

    if (parsed?.result) {
      console.log("✅ MCP initialize succeeded.");
      return;
    }

    if (parsed?.error) {
      fail(`MCP error ${parsed.error.code}: ${parsed.error.message}`);
      return;
    }

    if (!response.ok) {
      fail(`Unexpected non-OK response body: ${bodyText.slice(0, 500)}`);
      return;
    }

    fail("Received OK response but did not get MCP result payload.");
  } catch (error) {
    fail(`Connection failed for ${mcpUrl}`);
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
