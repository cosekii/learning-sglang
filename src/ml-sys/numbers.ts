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

// Constructed timing example for GPU communication, not a hardware benchmark.
export const COMM_EXAMPLE_COMPUTE_BEFORE_MS = 8;
export const COMM_EXAMPLE_COMPUTE_AFTER_MS = 4;
export const COMM_EXAMPLE_WAIT_BEFORE_MS = 2;
export const COMM_EXAMPLE_WAIT_AFTER_MS = 7;
export const COMM_EXAMPLE_TOTAL_BEFORE_MS = COMM_EXAMPLE_COMPUTE_BEFORE_MS + COMM_EXAMPLE_WAIT_BEFORE_MS;
export const COMM_EXAMPLE_TOTAL_AFTER_MS = COMM_EXAMPLE_COMPUTE_AFTER_MS + COMM_EXAMPLE_WAIT_AFTER_MS;
export const COMM_EXAMPLE_COMPUTE_SAVED_MS = COMM_EXAMPLE_COMPUTE_BEFORE_MS - COMM_EXAMPLE_COMPUTE_AFTER_MS;
export const COMM_EXAMPLE_WAIT_ADDED_MS = COMM_EXAMPLE_WAIT_AFTER_MS - COMM_EXAMPLE_WAIT_BEFORE_MS;
export const COMM_EXAMPLE_TOTAL_ADDED_MS = COMM_EXAMPLE_TOTAL_AFTER_MS - COMM_EXAMPLE_TOTAL_BEFORE_MS;

// Constructed four-GPU sum used throughout the communication chapter.
export const COMM_WORLD_SIZE = 4;
export const COMM_PARTIAL_TENSORS = [1, 2, 3, 4].map((value) => Array(COMM_WORLD_SIZE).fill(value));
export const COMM_REDUCED_TENSOR = COMM_PARTIAL_TENSORS[0].map((_, column) => COMM_PARTIAL_TENSORS.reduce((sum, tensor) => sum + tensor[column], 0));
export const COMM_TENSOR_TEXT = (tensor: number[]) => `[${tensor.join(',')}]`;
export const COMM_RING_PHASE_STEPS = COMM_WORLD_SIZE - 1;
export const COMM_RING_TOTAL_STEPS = 2 * COMM_RING_PHASE_STEPS;
export const COMM_RING_PER_RANK_SEND_TENSORS = COMM_RING_TOTAL_STEPS / COMM_WORLD_SIZE;

// Public Dynamo startup log in Awesome-ML-SYS nvidia-dynamo/dynamo.md:79-83.
// Microseconds are relative to the first log line; this is a single-node example.
export const DYNAMO_LOG_READY_US = 21_600_474;
export const DYNAMO_LOG_HTTP_US = 22_447_965;
export const DYNAMO_READY_TO_HTTP_US = DYNAMO_LOG_HTTP_US - DYNAMO_LOG_READY_US;
export const DYNAMO_HTTP_PORT = 8080;
export const DYNAMO_NUM_NODES = 2;
export const DYNAMO_DIST_INIT_PORT = 9876;
export const DYNAMO_TP_SIZE = 8;
export const DYNAMO_TP_PER_NODE = DYNAMO_TP_SIZE / DYNAMO_NUM_NODES;
export const DYNAMO_TP_RANKS_BY_NODE = Array.from({ length: DYNAMO_NUM_NODES }, (_, node) =>
  Array.from({ length: DYNAMO_TP_PER_NODE }, (_, i) => node * DYNAMO_TP_PER_NODE + i));
// A small cap for this chapter's adapted smoke request, not a Dynamo default.
export const DYNAMO_SMOKE_MAX_TOKENS = 8;

// Shipped slime Qwen3-4B config at 261ecee: one rollout feeds one global batch.
export const SLIME_ROLLOUT_BATCH_SIZE = 32;
export const SLIME_SAMPLES_PER_PROMPT = 8;
export const SLIME_SAMPLES_PER_ROUND = SLIME_ROLLOUT_BATCH_SIZE * SLIME_SAMPLES_PER_PROMPT;
export const SLIME_GLOBAL_BATCH_SIZE = 256;

// Constructed binary rewards for the GRPO arithmetic, not outputs from a training run.
export const SLIME_EXAMPLE_RAW_REWARDS = [1, 1, 1, 1, 0, 0, 0, 0];
export const SLIME_EXAMPLE_REWARD_MEAN = SLIME_EXAMPLE_RAW_REWARDS.reduce((sum, reward) => sum + reward, 0) / SLIME_EXAMPLE_RAW_REWARDS.length;
export const SLIME_EXAMPLE_CENTERED_REWARDS = SLIME_EXAMPLE_RAW_REWARDS.map((reward) => reward - SLIME_EXAMPLE_REWARD_MEAN);
// torch.std uses the unbiased estimator by default at the pinned slime revision.
export const SLIME_EXAMPLE_REWARD_STD = Math.sqrt(SLIME_EXAMPLE_CENTERED_REWARDS.reduce((sum, reward) => sum + reward ** 2, 0) / (SLIME_EXAMPLE_CENTERED_REWARDS.length - 1));
export const SLIME_GRPO_STD_EPSILON = 1e-6;
export const SLIME_EXAMPLE_NORMALIZED_REWARDS = SLIME_EXAMPLE_CENTERED_REWARDS.map((reward) => reward / (SLIME_EXAMPLE_REWARD_STD + SLIME_GRPO_STD_EPSILON));
