// Constructed example in zero-to-sglang Part I Chapter 5 §3.1, not a local benchmark.
export const DEMO_REQUEST_SENT_MS = 0;
export const DEMO_FIRST_TOKEN_MS = 250;
export const DEMO_TTFT_MS = DEMO_FIRST_TOKEN_MS - DEMO_REQUEST_SENT_MS;
export const DEMO_TTFT_SECONDS = DEMO_TTFT_MS / 1000;
export const DEMO_TTFT_FRACTION = `1/${1000 / DEMO_TTFT_MS}`;

// The same constructed request continues with three uneven inter-token gaps.
export const DEMO_OUTPUT_TOKEN_TIMES_MS = [DEMO_FIRST_TOKEN_MS, 275, 295, 325];
export const DEMO_ITL_GAPS_MS = DEMO_OUTPUT_TOKEN_TIMES_MS.slice(1).map((time, i) => time - DEMO_OUTPUT_TOKEN_TIMES_MS[i]);
export const DEMO_POST_FIRST_GAP_COUNT = DEMO_ITL_GAPS_MS.length;
export const DEMO_ITL_TOTAL_MS = DEMO_ITL_GAPS_MS.reduce((sum, gap) => sum + gap, 0);
export const DEMO_TPOT_MS = DEMO_ITL_TOTAL_MS / DEMO_POST_FIRST_GAP_COUNT;
export const DEMO_LAST_TOKEN_MS = DEMO_OUTPUT_TOKEN_TIMES_MS[DEMO_OUTPUT_TOKEN_TIMES_MS.length - 1];
export const DEMO_E2E_MS = DEMO_LAST_TOKEN_MS - DEMO_REQUEST_SENT_MS;

// A constructed 100-request distribution for nearest-rank P50, not a local benchmark.
export const DEMO_E2E_GROUPS = [
  { requests: 51, latencyMs: 200 },
  { requests: 48, latencyMs: 300 },
  { requests: 1, latencyMs: 2000 },
];
export const DEMO_SORTED_E2E_MS = DEMO_E2E_GROUPS.flatMap(({ requests, latencyMs }) => Array(requests).fill(latencyMs));
export const DEMO_PERCENTILE_REQUEST_COUNT = DEMO_SORTED_E2E_MS.length;
export const DEMO_P50_RANK = Math.ceil(0.50 * DEMO_PERCENTILE_REQUEST_COUNT);
export const DEMO_P50_MS = DEMO_SORTED_E2E_MS[DEMO_P50_RANK - 1];
export const DEMO_SLOWEST_E2E_MS = DEMO_SORTED_E2E_MS[DEMO_PERCENTILE_REQUEST_COUNT - 1];
export const DEMO_SLOWEST_OVER_P50 = DEMO_SLOWEST_E2E_MS / DEMO_P50_MS;
