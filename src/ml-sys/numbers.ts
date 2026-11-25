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

// A constructed 100-request distribution for nearest-rank P50 and P99, not a local benchmark.
export const DEMO_E2E_GROUPS = [
  { requests: 51, latencyMs: 200 },
  { requests: 48, latencyMs: 300 },
  { requests: 1, latencyMs: 2000 },
];
export const DEMO_SORTED_E2E_MS = DEMO_E2E_GROUPS.flatMap(({ requests, latencyMs }) => Array(requests).fill(latencyMs));
export const DEMO_PERCENTILE_REQUEST_COUNT = DEMO_SORTED_E2E_MS.length;
export const DEMO_P50_RANK = Math.ceil(0.50 * DEMO_PERCENTILE_REQUEST_COUNT);
export const DEMO_P50_MS = DEMO_SORTED_E2E_MS[DEMO_P50_RANK - 1];
export const DEMO_AT_MOST_P50_COUNT = DEMO_SORTED_E2E_MS.filter((latency) => latency <= DEMO_P50_MS).length;
export const DEMO_P99_RANK = Math.ceil(0.99 * DEMO_PERCENTILE_REQUEST_COUNT);
export const DEMO_P99_MS = DEMO_SORTED_E2E_MS[DEMO_P99_RANK - 1];
export const DEMO_AT_MOST_P99_COUNT = DEMO_SORTED_E2E_MS.filter((latency) => latency <= DEMO_P99_MS).length;
export const DEMO_SLOWEST_E2E_MS = DEMO_SORTED_E2E_MS[DEMO_PERCENTILE_REQUEST_COUNT - 1];
export const DEMO_SLOWEST_OVER_P50 = DEMO_SLOWEST_E2E_MS / DEMO_P50_MS;
export const DEMO_SLOWEST_OVER_P99_MS = DEMO_SLOWEST_E2E_MS - DEMO_P99_MS;

// The same constructed 100-request batch completes within one 20-second test window.
export const DEMO_MEASUREMENT_WINDOW_SECONDS = 20;
export const DEMO_REQUEST_THROUGHPUT_PER_SECOND = DEMO_PERCENTILE_REQUEST_COUNT / DEMO_MEASUREMENT_WINDOW_SECONDS;

// Rounded worked example from Awesome-ML-SYS mem-fraction-static.md, not a local measurement.
export const DEMO_PRE_MODEL_FREE_GB = 78;
export const DEMO_POST_MODEL_FREE_GB = 18;
export const DEMO_MODEL_LOAD_GB = DEMO_PRE_MODEL_FREE_GB - DEMO_POST_MODEL_FREE_GB;
export const DEMO_MEM_FRACTION_LOW = 0.70;
export const DEMO_MEM_FRACTION_HIGH = 0.85;
const rounded = (n: number) => Number(n.toFixed(1));
export const DEMO_DYNAMIC_LOW_GB = rounded((1 - DEMO_MEM_FRACTION_LOW) * DEMO_PRE_MODEL_FREE_GB);
export const DEMO_DYNAMIC_HIGH_GB = rounded((1 - DEMO_MEM_FRACTION_HIGH) * DEMO_PRE_MODEL_FREE_GB);
export const DEMO_KV_LOW_GB = rounded(DEMO_POST_MODEL_FREE_GB - DEMO_DYNAMIC_LOW_GB);
export const DEMO_KV_HIGH_GB = rounded(DEMO_POST_MODEL_FREE_GB - DEMO_DYNAMIC_HIGH_GB);

// Selected measurements from Awesome-ML-SYS hybrid-prefix-cache/readme.md:572-599.
export const HYBRID_SYSTEM_TOKENS = 5500;
export const HYBRID_NUM_BATCH_DEFAULT = 1024;
export const HYBRID_NUM_BATCH_TUNED = 64;
export const HYBRID_SHORT_WAIT_DEFAULT_S = 3.95;
export const HYBRID_SHORT_WAIT_TUNED_S = 0.91;
export const HYBRID_WAIT_SAVED_S = Number((HYBRID_SHORT_WAIT_DEFAULT_S - HYBRID_SHORT_WAIT_TUNED_S).toFixed(2));
export const HYBRID_WAIT_RATIO = HYBRID_SHORT_WAIT_DEFAULT_S / HYBRID_SHORT_WAIT_TUNED_S;
export const HYBRID_RECOMPUTE_DEFAULT_MIN = 1019;
export const HYBRID_RECOMPUTE_DEFAULT_MAX = 1029;
export const HYBRID_RECOMPUTE_TUNED_MIN = 63;
export const HYBRID_RECOMPUTE_TUNED_MAX = 69;
export const HYBRID_COLD_DEFAULT_S = 16.9;
export const HYBRID_COLD_TUNED_S = 28.4;
export const HYBRID_COLD_EXTRA_S = rounded(HYBRID_COLD_TUNED_S - HYBRID_COLD_DEFAULT_S);

// Simplified full-attention example from the same article, lines 71-89.
export const HYBRID_USER_TOKENS = 40;
export const HYBRID_PROMPT_TOKENS = HYBRID_SYSTEM_TOKENS + HYBRID_USER_TOKENS;
export const HYBRID_FULL_ATTENTION_NEW_TOKENS = HYBRID_PROMPT_TOKENS - HYBRID_SYSTEM_TOKENS;

// Logged request in hybrid-prefix-cache/readme.md:202-221 and 385-458.
export const HYBRID_LOG_MATCH_TOKENS = 5514;
export const HYBRID_LOG_END_TOKENS = 5558;
export const HYBRID_LOG_CHECKPOINT_TOKENS = 4536;
export const HYBRID_LOG_REPLAY_POSITIONS = HYBRID_LOG_END_TOKENS - HYBRID_LOG_CHECKPOINT_TOKENS;
export const HYBRID_LOG_RECOMPUTE_APPROX = 1020;
export const HYBRID_LOG_NEW_TOKENS = HYBRID_LOG_END_TOKENS - HYBRID_LOG_MATCH_TOKENS;
export const HYBRID_LOG_EXTRA_APPROX = HYBRID_LOG_RECOMPUTE_APPROX - HYBRID_LOG_NEW_TOKENS;
