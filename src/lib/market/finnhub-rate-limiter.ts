const MAX_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

const requestTimestamps: number[] = [];
let scheduleChain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneOldTimestamps(now: number) {
  while (
    requestTimestamps.length > 0 &&
    now - requestTimestamps[0] >= WINDOW_MS
  ) {
    requestTimestamps.shift();
  }
}

/**
 * Queues Finnhub API calls so no more than 60 are released per rolling minute.
 * Call before each Finnhub HTTP request.
 */
export async function acquireFinnhubSlot(): Promise<void> {
  scheduleChain = scheduleChain.then(async () => {
    const now = Date.now();
    pruneOldTimestamps(now);

    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const waitMs = WINDOW_MS - (now - requestTimestamps[0]) + 50;
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      pruneOldTimestamps(Date.now());
    }

    requestTimestamps.push(Date.now());
  });

  await scheduleChain;
}
