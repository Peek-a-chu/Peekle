import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected numeric value but received: ${value}`);
  }
  return parsed;
}

async function createWhiteboardFixture(backendBaseUrl, seedHistorySize, prefix, syncMode) {
  const response = await fetch(`${backendBaseUrl}/api/benchmark/fixtures/whiteboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      totalIterations: 1,
      seedHistorySize,
      prefix,
      syncMode,
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.success !== true) {
    throw new Error(
      `createWhiteboardFixture failed: status=${response.status}, body=${JSON.stringify(
        payload
      )}`
    );
  }

  const fixture = payload.data?.studies?.[0];
  if (!fixture) {
    throw new Error(`Whiteboard fixture response did not include any study`);
  }
  return fixture;
}

async function waitForBridge(page, timeoutMs) {
  await page.waitForFunction(
    () =>
      Boolean(window.__PEEKLE_WHITEBOARD_BENCH__) &&
      window.__PEEKLE_WHITEBOARD_BENCH__.isReady(),
    undefined,
    { timeout: timeoutMs }
  );
}

async function requestSync(page) {
  await page.evaluate(() => {
    window.__PEEKLE_WHITEBOARD_BENCH__?.requestSync();
  });
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__PEEKLE_WHITEBOARD_BENCH__?.getSnapshot());
}

async function readSnapshotOrNull(page) {
  if (!page || page.isClosed()) {
    return null;
  }

  try {
    return await readSnapshot(page);
  } catch {
    return null;
  }
}

async function waitForSnapshot(page, expectedCount, expectedRevision, timeoutMs) {
  await page.waitForFunction(
    ({ count, revision }) => {
      const bridge = window.__PEEKLE_WHITEBOARD_BENCH__;
      if (!bridge || !bridge.isConnected() || !bridge.isReady()) {
        return false;
      }

      const snapshot = bridge.getSnapshot();
      const revisionMatches =
        revision == null || Number(snapshot.lastRevision || 0) === revision;
      return (
        snapshot.objectCount === count && revisionMatches
      );
    },
    { count: expectedCount, revision: expectedRevision },
    { timeout: timeoutMs }
  );
}

async function addRect(page) {
  return page.evaluate(() => window.__PEEKLE_WHITEBOARD_BENCH__?.addRect());
}

function snapshotHash(snapshot) {
  const semanticObjects = (snapshot?.objects || []).map((object) => ({
    id: object?.id ?? null,
    type: object?.type ?? null,
    left: object?.left ?? null,
    top: object?.top ?? null,
    width: object?.width ?? null,
    height: object?.height ?? null,
    strokeWidth: object?.strokeWidth ?? null,
    text: object?.text ?? null,
    senderId: object?.senderId ?? null,
    benchIndex: object?.benchIndex ?? null,
  }));
  const normalized = JSON.stringify(semanticObjects);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function summarizeNumbers(values) {
  if (!values.length) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      p50: 0,
      p95: 0,
      max: 0,
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (ratio) => {
    if (sorted.length === 1) {
      return sorted[0];
    }
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(sorted.length * ratio) - 1)
    );
    return sorted[index];
  };

  return {
    count: sorted.length,
    avg: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    min: sorted[0],
    p50: percentile(0.5),
    p95: percentile(0.95),
    max: sorted[sorted.length - 1],
  };
}

async function runSample(browser, options) {
  const {
    backendBaseUrl,
    frontendBaseUrl,
    seedHistorySize,
    newEventsDuringDisconnect,
    timeoutMs,
    sampleIndex,
    syncMode,
    initialManualSync,
    reconnectManualSync,
  } = options;

  const fixture = await createWhiteboardFixture(
    backendBaseUrl,
    seedHistorySize,
    `pw-whiteboard-${Date.now()}-${sampleIndex}`,
    syncMode
  );

  const context = await browser.newContext();
  let ownerPage = null;
  let viewerPage = null;
  const consoleMessages = [];

  try {
    const ownerUrl = `${frontendBaseUrl}/study/${fixture.studyId}/whiteboard?userId=${fixture.ownerUserId}&syncMode=${encodeURIComponent(syncMode)}`;
    const viewerUrl = `${frontendBaseUrl}/study/${fixture.studyId}/whiteboard?userId=${fixture.peerUserId}&syncMode=${encodeURIComponent(syncMode)}`;

    ownerPage = await context.newPage();
    viewerPage = await context.newPage();
    const recordConsole = (label) => (message) => {
      consoleMessages.push({
        label,
        type: message.type(),
        text: message.text(),
      });
    };
    ownerPage.on("console", recordConsole("owner"));
    viewerPage.on("console", recordConsole("viewer"));

    await ownerPage.goto(ownerUrl, { waitUntil: "domcontentloaded" });
    await viewerPage.goto(viewerUrl, { waitUntil: "domcontentloaded" });

    await waitForBridge(ownerPage, timeoutMs);
    await waitForBridge(viewerPage, timeoutMs);

    if (initialManualSync) {
      await requestSync(ownerPage);
      await requestSync(viewerPage);
    }

    await waitForSnapshot(
      ownerPage,
      fixture.seededObjectCount,
      syncMode === "legacy" ? null : fixture.seededRevision,
      timeoutMs
    );
    await waitForSnapshot(
      viewerPage,
      fixture.seededObjectCount,
      syncMode === "legacy" ? null : fixture.seededRevision,
      timeoutMs
    );

    await viewerPage.close();
    viewerPage = null;

    for (let index = 0; index < newEventsDuringDisconnect; index += 1) {
      await addRect(ownerPage);
      await ownerPage.waitForTimeout(75);
    }

    const expectedCount = fixture.seededObjectCount + newEventsDuringDisconnect;
    const expectedRevision =
      syncMode === "legacy" ? null : fixture.seededRevision + newEventsDuringDisconnect;

    if (initialManualSync) {
      await requestSync(ownerPage);
    }
    await waitForSnapshot(ownerPage, expectedCount, expectedRevision, timeoutMs);

    const reconnectStartedAt = Date.now();
    viewerPage = await context.newPage();
    await viewerPage.goto(viewerUrl, { waitUntil: "domcontentloaded" });
    await waitForBridge(viewerPage, timeoutMs);
    if (reconnectManualSync) {
      await requestSync(viewerPage);
    }

    try {
      await waitForSnapshot(viewerPage, expectedCount, expectedRevision, timeoutMs);
    } catch (error) {
      return {
        sampleIndex,
        ok: false,
        studyId: fixture.studyId,
        ownerUserId: fixture.ownerUserId,
        peerUserId: fixture.peerUserId,
        seededObjectCount: fixture.seededObjectCount,
        seededRevision: fixture.seededRevision,
        expectedObjectCount: expectedCount,
        expectedRevision,
        reconnectRestoreMs: null,
        ownerHash: null,
        viewerHash: null,
        ownerSnapshot: await readSnapshotOrNull(ownerPage),
        viewerSnapshot: await readSnapshotOrNull(viewerPage),
        consoleMessages,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    const reconnectRestoreMs = Date.now() - reconnectStartedAt;

    const ownerSnapshot = await readSnapshot(ownerPage);
    const viewerSnapshot = await readSnapshot(viewerPage);
    const ownerHash = snapshotHash(ownerSnapshot);
    const viewerHash = snapshotHash(viewerSnapshot);

    return {
      sampleIndex,
      ok: ownerHash === viewerHash,
      studyId: fixture.studyId,
      ownerUserId: fixture.ownerUserId,
      peerUserId: fixture.peerUserId,
      seededObjectCount: fixture.seededObjectCount,
      seededRevision: fixture.seededRevision,
      expectedObjectCount: expectedCount,
      expectedRevision,
      reconnectRestoreMs,
      ownerHash,
      viewerHash,
      ownerSnapshot,
      viewerSnapshot,
      consoleMessages,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const backendBaseUrl =
    args.backendBaseUrl || process.env.BACKEND_BASE_URL || "http://localhost:8082";
  const frontendBaseUrl =
    args.frontendBaseUrl || process.env.FRONTEND_BASE_URL || "http://localhost:3001";
  const outputPath =
    args.output ||
    path.resolve(
      process.cwd(),
      "apps/backend/benchmark/results/whiteboard-sync/playwright-result.json"
    );

  const samples = toNumber(args.samples || process.env.SAMPLES, 5);
  const seedHistorySize = toNumber(
    args.seedHistorySize || process.env.SEED_HISTORY_SIZE,
    120
  );
  const newEventsDuringDisconnect = toNumber(
    args.newEventsDuringDisconnect || process.env.NEW_EVENTS_DURING_DISCONNECT,
    3
  );
  const timeoutMs = toNumber(args.timeoutMs || process.env.TIMEOUT_MS, 20000);
  const headless = (args.headless || process.env.HEADLESS || "1") !== "0";
  const syncMode = args.syncMode || process.env.SYNC_MODE || "default";
  const initialManualSync =
    (args.initialManualSync || process.env.INITIAL_MANUAL_SYNC || "1") !== "0";
  const reconnectManualSync =
    (args.reconnectManualSync || process.env.RECONNECT_MANUAL_SYNC || "0") !== "0";

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless });
  const sampleResults = [];
  try {
    for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
      try {
        sampleResults.push(
          await runSample(browser, {
            backendBaseUrl,
            frontendBaseUrl,
            seedHistorySize,
            newEventsDuringDisconnect,
            timeoutMs,
            sampleIndex,
            syncMode,
            initialManualSync,
            reconnectManualSync,
          })
        );
      } catch (error) {
        sampleResults.push({
          sampleIndex,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const restoreValues = sampleResults
    .filter((sample) => sample.ok && Number.isFinite(sample.reconnectRestoreMs))
    .map((sample) => sample.reconnectRestoreMs);
  const failedSamples = sampleResults.filter((sample) => !sample.ok).length;

  const result = {
    generatedAt: new Date().toISOString(),
    backendBaseUrl,
    frontendBaseUrl,
    samples,
    seedHistorySize,
    newEventsDuringDisconnect,
    syncMode,
    initialManualSync,
    reconnectManualSync,
    reconnectRestoreMs: summarizeNumbers(restoreValues),
    consistencyFailureRate: samples > 0 ? failedSamples / samples : 0,
    successfulSamples: sampleResults.filter((sample) => sample.ok).length,
    failedSamples,
    results: sampleResults,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
