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
