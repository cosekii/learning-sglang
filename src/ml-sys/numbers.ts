import { BW, HBM_GB } from '../numbers';

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

// A second constructed 100-request batch uses the same latency scale for an A/B comparison.
export const DEMO_COMPARISON_E2E_GROUPS = [
  { requests: 50, latencyMs: 250 },
  { requests: 49, latencyMs: 400 },
  { requests: 1, latencyMs: 2000 },
];
export const DEMO_COMPARISON_SORTED_E2E_MS = DEMO_COMPARISON_E2E_GROUPS.flatMap(({ requests, latencyMs }) => Array(requests).fill(latencyMs));
export const DEMO_COMPARISON_P50_MS = DEMO_COMPARISON_SORTED_E2E_MS[DEMO_P50_RANK - 1];
export const DEMO_AT_MOST_COMPARISON_P50_COUNT = DEMO_COMPARISON_SORTED_E2E_MS.filter((latency) => latency <= DEMO_COMPARISON_P50_MS).length;
export const DEMO_COMPARISON_P99_MS = DEMO_COMPARISON_SORTED_E2E_MS[DEMO_P99_RANK - 1];
export const DEMO_AT_MOST_COMPARISON_P99_COUNT = DEMO_COMPARISON_SORTED_E2E_MS.filter((latency) => latency <= DEMO_COMPARISON_P99_MS).length;
export const DEMO_COMPARISON_SLOWEST_OVER_P50 = DEMO_SLOWEST_E2E_MS / DEMO_COMPARISON_P50_MS;
export const DEMO_COMPARISON_SLOWEST_OVER_P99_MS = DEMO_SLOWEST_E2E_MS - DEMO_COMPARISON_P99_MS;
export const DEMO_COMPARISON_WINDOW_SECONDS = 25;
export const DEMO_COMPARISON_THROUGHPUT_PER_SECOND = DEMO_PERCENTILE_REQUEST_COUNT / DEMO_COMPARISON_WINDOW_SECONDS;
export const DEMO_THROUGHPUT_CLOCK_TICK_SECONDS = 5;

// This permutation starts both distributions unsorted; request ids retain their sorted-rank identity.
export const DEMO_UNSORTED_ORDER = Array.from({ length: DEMO_PERCENTILE_REQUEST_COUNT }, (_, i) => (i * 37) % DEMO_PERCENTILE_REQUEST_COUNT);

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
export const HYBRID_LOG_PREFIX_REPLAY_POSITIONS = HYBRID_LOG_MATCH_TOKENS - HYBRID_LOG_CHECKPOINT_TOKENS;
export const HYBRID_LOG_NEW_TOKENS = HYBRID_LOG_END_TOKENS - HYBRID_LOG_MATCH_TOKENS;
export const HYBRID_LOG_REPLAY_POSITIONS = HYBRID_LOG_PREFIX_REPLAY_POSITIONS + HYBRID_LOG_NEW_TOKENS;
export const HYBRID_LOG_RECOMPUTE_APPROX = 1020;
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
export const COMM_CHUNK_IDS = ['A', 'B', 'C', 'D'];

type CommRingTransfer = {
  chunk: number;
  from: number;
  to: number;
  sent: number;
  before: number | null;
  after: number;
};
type CommRingPhase = {
  operation: 'inputs' | 'reduce-scatter' | 'all-gather' | 'complete';
  round: number;
  transfers: CommRingTransfer[];
  grid: (number | null)[][];
};

// One teaching schedule: send to GPU + 1, add on receipt, then forward reduced chunks.
const makeCommRingSchedule = (): CommRingPhase[] => {
  const initialGrid: (number | null)[][] = COMM_PARTIAL_TENSORS.map((tensor) => [...tensor]);
  const reduceGrid = initialGrid.map((row) => [...row]);
  const phases: CommRingPhase[] = [{ operation: 'inputs', round: 0, transfers: [], grid: initialGrid }];
  for (let round = 0; round < COMM_RING_PHASE_STEPS; round++) {
    const transfers = COMM_PARTIAL_TENSORS.map((_, from): CommRingTransfer => {
      const to = (from + 1) % COMM_WORLD_SIZE;
      const chunk = (from - round + COMM_WORLD_SIZE) % COMM_WORLD_SIZE;
      const sent = reduceGrid[from][chunk];
      const before = reduceGrid[to][chunk];
      if (sent === null || before === null) throw new Error('Reduce-Scatter requires both partial chunks');
      return { chunk, from, to, sent, before, after: before + sent };
    });
    transfers.forEach(({ to, chunk, after }) => { reduceGrid[to][chunk] = after; });
    phases.push({ operation: 'reduce-scatter', round: round + 1, transfers, grid: reduceGrid.map((row) => [...row]) });
  }

  const gatherGrid: (number | null)[][] = Array.from({ length: COMM_WORLD_SIZE }, () => Array(COMM_WORLD_SIZE).fill(null));
  phases[COMM_RING_PHASE_STEPS].transfers.forEach(({ to, chunk, after }) => { gatherGrid[to][chunk] = after; });
  for (let round = 0; round < COMM_RING_PHASE_STEPS; round++) {
    const transfers = COMM_PARTIAL_TENSORS.map((_, from): CommRingTransfer => {
      const to = (from + 1) % COMM_WORLD_SIZE;
      const chunk = (from + 1 - round + COMM_WORLD_SIZE) % COMM_WORLD_SIZE;
      const sent = gatherGrid[from][chunk];
      if (sent === null) throw new Error('All-Gather requires a reduced chunk at the sender');
      return { chunk, from, to, sent, before: gatherGrid[to][chunk], after: sent };
    });
    transfers.forEach(({ to, chunk, after }) => { gatherGrid[to][chunk] = after; });
    phases.push({ operation: 'all-gather', round: round + COMM_RING_PHASE_STEPS + 1, transfers, grid: gatherGrid.map((row) => [...row]) });
  }
  const last = phases[phases.length - 1];
  phases.push({ operation: 'complete', round: COMM_RING_TOTAL_STEPS, transfers: last.transfers, grid: last.grid });
  return phases;
};
export const COMM_RING_SCHEDULE = makeCommRingSchedule();

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

// One author's weight-update debug notes, not transport benchmarks.
export const UPDATE_DEBUG_PARAMS = 1_000_000_000;
export const UPDATE_DEBUG_BF16_BYTES = 2;
export const UPDATE_DEBUG_WEIGHT_GB = UPDATE_DEBUG_PARAMS * UPDATE_DEBUG_BF16_BYTES / 1_000_000_000;
export const UPDATE_DEBUG_INITIAL_S = 7.047;
export const UPDATE_DEBUG_INNER_S = 0.001;
export const UPDATE_DEBUG_OUTER_S = 0.033;
export const UPDATE_TRAINING_RANKS = 1;
export const UPDATE_TP_ONE = 1;
export const UPDATE_TP_TWO = 2;
export const UPDATE_GROUP_SIZE_TP_ONE = UPDATE_TRAINING_RANKS + UPDATE_TP_ONE;
export const UPDATE_GROUP_SIZE_TP_TWO = UPDATE_TRAINING_RANKS + UPDATE_TP_TWO;
export const UPDATE_EXAMPLE_FULL_ROWS = 1024;
export const UPDATE_EXAMPLE_FULL_COLS = 1024;
export const UPDATE_EXAMPLE_FSDP_TP = 4;
export const UPDATE_EXAMPLE_INFER_TP = 2;
export const UPDATE_EXAMPLE_FSDP_ROWS = UPDATE_EXAMPLE_FULL_ROWS / UPDATE_EXAMPLE_FSDP_TP;
export const UPDATE_EXAMPLE_INFER_ROWS = UPDATE_EXAMPLE_FULL_ROWS / UPDATE_EXAMPLE_INFER_TP;
export const UPDATE_EXAMPLE_FULL_ELEMENTS = UPDATE_EXAMPLE_FULL_ROWS * UPDATE_EXAMPLE_FULL_COLS;
export const UPDATE_DEBUG_SLEEP_COUNT = 3;
export const UPDATE_DEBUG_SLEEP_MS = 10;
export const UPDATE_DEBUG_SLEEP_TOTAL_MS = UPDATE_DEBUG_SLEEP_COUNT * UPDATE_DEBUG_SLEEP_MS;
export const UPDATE_DEBUG_OUTER_MS = 33;
export const UPDATE_DEBUG_INNER_MS = 1;
export const UPDATE_DEBUG_OTHER_MS = UPDATE_DEBUG_OUTER_MS - UPDATE_DEBUG_SLEEP_TOTAL_MS - UPDATE_DEBUG_INNER_MS;
export const UPDATE_DEBUG_NO_SLEEP_S = 2.202;
export const UPDATE_DEBUG_WARMUP_1B_S = 0.5;
export const UPDATE_DEBUG_WARMUP_8B_S = 0.6;
export const UPDATE_DEBUG_SAVED_S = Number((UPDATE_DEBUG_INITIAL_S - UPDATE_DEBUG_NO_SLEEP_S).toFixed(3));
export const UPDATE_DEBUG_SPEEDUP = UPDATE_DEBUG_INITIAL_S / UPDATE_DEBUG_NO_SLEEP_S;
// Decimal GB ÷ TB/s gives milliseconds; this HBM yardstick is not a transport prediction.
export const UPDATE_DEBUG_YARDSTICK_MS = UPDATE_DEBUG_WEIGHT_GB / BW;
export const UPDATE_DEBUG_FULL_YARDSTICK_RATIO = Math.round((UPDATE_DEBUG_INITIAL_S * 1000 / UPDATE_DEBUG_YARDSTICK_MS) / 100) * 100;
// Approximate sleep-block repetitions inferred from rounded full-update times, not an exact tensor count.
export const UPDATE_DEBUG_SLEEP_CALLS = UPDATE_DEBUG_SAVED_S * 1000 / UPDATE_DEBUG_SLEEP_TOTAL_MS;

// Constructed FSDP2 memory example, using the source's mixed-precision convention.
export const FSDP_EXAMPLE_PARAMS = 4_000_000_000;
export const FSDP_EXAMPLE_PARAMS_B = FSDP_EXAMPLE_PARAMS / 1_000_000_000;
export const FSDP_DP_SIZE = 8;
export const FSDP_WEIGHT_BYTES = 2;
export const FSDP_GRADIENT_BYTES = 2;
export const FSDP_FP32_BYTES = 4;
export const FSDP_OPTIMIZER_TABLES = 3;
export const FSDP_OPTIMIZER_BYTES = FSDP_OPTIMIZER_TABLES * FSDP_FP32_BYTES;
export const FSDP_BYTES_PER_PARAM = FSDP_WEIGHT_BYTES + FSDP_GRADIENT_BYTES + FSDP_OPTIMIZER_BYTES;
export const FSDP_FULL_WEIGHT_GB = FSDP_EXAMPLE_PARAMS * FSDP_WEIGHT_BYTES / 1_000_000_000;
export const FSDP_FULL_GRADIENT_GB = FSDP_EXAMPLE_PARAMS * FSDP_GRADIENT_BYTES / 1_000_000_000;
export const FSDP_FULL_OPTIMIZER_GB = FSDP_EXAMPLE_PARAMS * FSDP_OPTIMIZER_BYTES / 1_000_000_000;
export const FSDP_FULL_STATE_PER_GPU_GB = FSDP_FULL_WEIGHT_GB + FSDP_FULL_GRADIENT_GB + FSDP_FULL_OPTIMIZER_GB;
export const FSDP_FULL_CLUSTER_STATE_GB = FSDP_FULL_STATE_PER_GPU_GB * FSDP_DP_SIZE;
export const FSDP_FULL_CARD_SHARE = FSDP_FULL_STATE_PER_GPU_GB / HBM_GB;
export const FSDP_SHARD_WEIGHT_GB = FSDP_FULL_WEIGHT_GB / FSDP_DP_SIZE;
export const FSDP_SHARD_GRADIENT_GB = FSDP_FULL_GRADIENT_GB / FSDP_DP_SIZE;
export const FSDP_SHARD_OPTIMIZER_GB = FSDP_FULL_OPTIMIZER_GB / FSDP_DP_SIZE;
export const FSDP_SHARD_STATE_PER_GPU_GB = FSDP_FULL_STATE_PER_GPU_GB / FSDP_DP_SIZE;
export const FSDP_FORWARD_RESIDENT_GB = FSDP_SHARD_WEIGHT_GB + FSDP_SHARD_OPTIMIZER_GB;
export const FSDP_SHARD_CLUSTER_STATE_GB = FSDP_SHARD_STATE_PER_GPU_GB * FSDP_DP_SIZE;
export const FSDP_SHARD_RATIO = FSDP_FULL_STATE_PER_GPU_GB / FSDP_SHARD_STATE_PER_GPU_GB;
export const FSDP_UPDATE_BUFFER_BYTES = 536_870_912;
export const FSDP_UPDATE_BUFFER_MIB = FSDP_UPDATE_BUFFER_BYTES / 1024 / 1024;

// Constructed DP1/CP1 packing example for the pinned FSDP2 train path.
// The shipped script uses 9,216 tokens per GPU; cap 4 belongs only to this example.
export const FSDP_PACK_TOKEN_CAP = 4;
export const FSDP_PRODUCTION_MAX_TOKENS_PER_GPU = 9216;
export const FSDP_PACK_DP_SIZE = 1;
export const FSDP_PACK_CP_SIZE = 1;
export const FSDP_PACK_RECORDS = [
  { id: 'A', tokens: ['pA', 'a1'], responseLength: 1, lossMask: [1], reward: SLIME_EXAMPLE_NORMALIZED_REWARDS[0] },
  { id: 'B', tokens: ['pB', 'b1'], responseLength: 1, lossMask: [1], reward: SLIME_EXAMPLE_NORMALIZED_REWARDS[4] },
  { id: 'C', tokens: ['pC', 'c1', 'c2', 'c3'], responseLength: 2, lossMask: [1, 1], reward: SLIME_EXAMPLE_NORMALIZED_REWARDS[0] },
];
// Balanced membership supplied by pack_sequences for this input; first fit only supplies the count.
export const FSDP_PACK_MEMBERS = [['A', 'B'], ['C']];

// Constructed actor-loss arithmetic for both packs. Clip bounds and zero optional-loss
// coefficients come from scripts/run-qwen3-4B-fsdp.sh at the pinned revision.
export const FSDP_PPO_EPS_CLIP = 0.2;
export const FSDP_PPO_EPS_CLIP_HIGH = 0.28;
const actorClipLow = 1 - FSDP_PPO_EPS_CLIP;
const actorClipHigh = 1 + FSDP_PPO_EPS_CLIP_HIGH;
const makeActorPack = (records: { reward: number; lossMask: number[] }[], ratios: number[][]) => {
  const advantages = records.map((record) => record.reward);
  const masks = records.map((record) => record.lossMask);
  const clippedRatios = ratios.map((values) => values.map((ratio) => Math.min(Math.max(ratio, actorClipLow), actorClipHigh)));
  const unclippedLosses = ratios.map((values, i) => values.map((ratio) => -ratio * advantages[i]));
  const clippedLosses = clippedRatios.map((values, i) => values.map((ratio) => -ratio * advantages[i]));
  const policyLosses = unclippedLosses.map((values, i) => values.map((value, j) => Math.max(value, clippedLosses[i][j])));
  const maskedMeans = policyLosses.map((values, i) => {
    const numerator = values.reduce((sum, value, j) => sum + value * masks[i][j], 0);
    const denominator = Math.max(masks[i].reduce((sum, value) => sum + value, 0), 1);
    return numerator / denominator;
  });
  return {
    logGaps: ratios.map((values) => values.map((ratio) => Math.log(ratio))),
    ratios,
    clippedRatios,
    clipLow: actorClipLow,
    clipHigh: actorClipHigh,
    advantages,
    masks,
    unclippedLosses,
    clippedLosses,
    policyLosses,
    maskedMeans,
    pgLoss: maskedMeans.reduce((sum, value) => sum + value, 0),
  };
};
const actorPack1 = makeActorPack(FSDP_PACK_RECORDS.slice(0, 2), [[1.4], [0.7]]);
const actorPack2 = makeActorPack([FSDP_PACK_RECORDS[2]], [[1, 1]]);
export const FSDP_ACTOR_EXAMPLE = { ...actorPack1, pack2: actorPack2 };

// FP8 rollout and training. Source measurements keep their original configurations;
// the 4B-value byte and scale examples are constructed, not RL measurements.
export const FP8_BYTES = 1;
export const FP8_BF16_BYTES = FSDP_WEIGHT_BYTES;
export const FP8_PARAMS = FSDP_EXAMPLE_PARAMS;
export const FP8_PARAMS_B = FP8_PARAMS / 1_000_000_000;
export const FP8_BF16_WEIGHT_GB = FP8_PARAMS * FP8_BF16_BYTES / 1_000_000_000;
export const FP8_WEIGHT_GB = FP8_PARAMS * FP8_BYTES / 1_000_000_000;
export const FP8_WEIGHT_SAVED_GB = FP8_BF16_WEIGHT_GB - FP8_WEIGHT_GB;
export const FP8_BF16_IDEAL_READ_MS = FP8_BF16_WEIGHT_GB / BW;
export const FP8_IDEAL_READ_MS = FP8_WEIGHT_GB / BW;
export const FP8_H100_TFLOPS = 1979;
export const FP8_FORMAT_MAX = 448;
export const FP8_EXAMPLE_VALUES = [1, 3.2, 8];
export const FP8_EXAMPLE_MAX = Math.max(...FP8_EXAMPLE_VALUES.map(Math.abs));
export const FP8_EXAMPLE_SCALE = FP8_EXAMPLE_MAX / FP8_FORMAT_MAX;
export const FP8_EXAMPLE_SCALED_MIDDLE = FP8_EXAMPLE_VALUES[1] / FP8_EXAMPLE_SCALE;
export const FP8_EXAMPLE_FP8_VALUES = [56, 176, 448];
export const FP8_EXAMPLE_RESTORED = FP8_EXAMPLE_FP8_VALUES.map((value) => value * FP8_EXAMPLE_SCALE);
export const FP8_EXAMPLE_MIDDLE_ERROR = Math.abs(FP8_EXAMPLE_RESTORED[1] - FP8_EXAMPLE_VALUES[1]);
export const FP8_BLOCK_SIDE = 128;
export const FP8_BLOCK_VALUES = FP8_BLOCK_SIDE * FP8_BLOCK_SIDE;
export const FP8_BLOCK_PAYLOAD_BYTES = FP8_BLOCK_VALUES * FP8_BYTES;
export const FP8_BLOCK_BF16_BYTES = FP8_BLOCK_VALUES * FP8_BF16_BYTES;
export const FP8_SCALE_BYTES = 4;
export const FP8_BLOCK_TOTAL_BYTES = FP8_BLOCK_PAYLOAD_BYTES + FP8_SCALE_BYTES;
export const FP8_BLOCK_SAVED_BYTES = FP8_BLOCK_BF16_BYTES - FP8_BLOCK_TOTAL_BYTES;
export const FP8_BLOCK_SAVED_SHARE = FP8_BLOCK_SAVED_BYTES / FP8_BLOCK_BF16_BYTES;
export const FP8_PUBLIC_FORWARD_BF16_MS = 463;
export const FP8_PUBLIC_FORWARD_FP8_MS = 529;
export const FP8_PUBLIC_BACKWARD_BF16_MS = 1567;
export const FP8_PUBLIC_BACKWARD_FP8_MS = 1061;
export const FP8_PUBLIC_TOTAL_BF16_MS = FP8_PUBLIC_FORWARD_BF16_MS + FP8_PUBLIC_BACKWARD_BF16_MS;
export const FP8_PUBLIC_TOTAL_FP8_MS = FP8_PUBLIC_FORWARD_FP8_MS + FP8_PUBLIC_BACKWARD_FP8_MS;
export const FP8_PUBLIC_TIME_SAVED_MS = FP8_PUBLIC_TOTAL_BF16_MS - FP8_PUBLIC_TOTAL_FP8_MS;
export const FP8_PUBLIC_TIME_SAVED_SHARE = FP8_PUBLIC_TIME_SAVED_MS / FP8_PUBLIC_TOTAL_BF16_MS;
export const FP8_PUBLIC_MEMORY_BF16_GB = 68.1;
export const FP8_PUBLIC_MEMORY_FP8_GB = 58.3;
export const FP8_PUBLIC_MEMORY_SAVED_GB = FP8_PUBLIC_MEMORY_BF16_GB - FP8_PUBLIC_MEMORY_FP8_GB;
export const FP8_PUBLIC_MEMORY_SAVED_SHARE = FP8_PUBLIC_MEMORY_SAVED_GB / FP8_PUBLIC_MEMORY_BF16_GB;
export const FP8_PUBLIC_THROUGHPUT_BF16 = 340;
export const FP8_PUBLIC_THROUGHPUT_FP8 = 376;
export const FP8_PUBLIC_THROUGHPUT_GAIN = FP8_PUBLIC_THROUGHPUT_FP8 / FP8_PUBLIC_THROUGHPUT_BF16 - 1;
export const FP8_GEMM_DIFF_SMALL_CUBLAS = 0.00068;
export const FP8_GEMM_DIFF_SMALL_DEEPGEMM = 0.00036;
export const FP8_GEMM_DIFF_LARGE_CUBLAS = 0.000681;
export const FP8_GEMM_DIFF_LARGE_DEEPGEMM = 0.00065;
export const INT4_WEIGHT_BYTES = 0.5;
export const INT4_PAYLOAD_SAVING_SHARE = 1 - INT4_WEIGHT_BYTES / FP8_BF16_BYTES;

// Constructed 32-value group used throughout the INT4 QAT chapter.
export const INT4_GROUP_SIZE = 32;
export const INT4_GROUP_BF16_BYTES = INT4_GROUP_SIZE * FP8_BF16_BYTES;
export const INT4_GROUP_PACKED_BYTES = INT4_GROUP_SIZE * INT4_WEIGHT_BYTES;
export const INT4_GROUP_SAVED_BYTES = INT4_GROUP_BF16_BYTES - INT4_GROUP_PACKED_BYTES;
export const INT4_PACK_OFFSET = 8;
export const INT4_CODES_PER_WORD = 8;
export const INT4_WORD_BITS = 32;
export const INT4_SCALE_BYTES = 2;
export const INT4_GROUP_STORED_BYTES = INT4_GROUP_PACKED_BYTES + INT4_SCALE_BYTES;
export const INT4_GROUP_EFFECTIVE_BITS = INT4_GROUP_STORED_BYTES * 8 / INT4_GROUP_SIZE;
export const INT4_GROUP_STORED_SAVING_SHARE = (INT4_GROUP_BF16_BYTES - INT4_GROUP_STORED_BYTES) / INT4_GROUP_BF16_BYTES;
export const INT4_PACK_EXAMPLE_CODES = [-8, -7, -1, 0, 1, 4, 6, 7];
export const INT4_PACK_EXAMPLE_UNSIGNED = INT4_PACK_EXAMPLE_CODES.map((value) => value + INT4_PACK_OFFSET);

// Public Kimi-K2-Thinking checkpoint metadata and the article's H200 capacity.
export const KIMI_CHECKPOINT_BYTES = 594_205_920_512;
export const KIMI_CHECKPOINT_GB = KIMI_CHECKPOINT_BYTES / 1_000_000_000;
export const INT4_H200_MEMORY_GB = 141;
export const INT4_ROLLOUT_GPU_COUNT = 8;
export const INT4_H200_TOTAL_GB = INT4_H200_MEMORY_GB * INT4_ROLLOUT_GPU_COUNT;
export const KIMI_CHECKPOINT_PER_GPU_GB = KIMI_CHECKPOINT_GB / INT4_ROLLOUT_GPU_COUNT;
export const KIMI_CHECKPOINT_OVER_ONE_CARD = KIMI_CHECKPOINT_GB / INT4_H200_MEMORY_GB;
export const INT4_QMAX = 7;
export const INT4_REAL_QMIN = -8;
export const INT4_EXAMPLE_VALUES = [0.10, 0.35, 0.70];
export const INT4_EXAMPLE_MAX = Math.max(...INT4_EXAMPLE_VALUES.map(Math.abs));
export const INT4_EXAMPLE_SCALE = INT4_EXAMPLE_MAX / INT4_QMAX;
export const INT4_EXAMPLE_SCALED_MIDDLE = INT4_EXAMPLE_VALUES[1] / INT4_EXAMPLE_SCALE;
export const INT4_EXAMPLE_MIDDLE_CODE = 4;
export const INT4_EXAMPLE_CODES = [1, INT4_EXAMPLE_MIDDLE_CODE, 7];
export const INT4_EXAMPLE_RESTORED = INT4_EXAMPLE_CODES.map((value) => value * INT4_EXAMPLE_SCALE);
export const INT4_EXAMPLE_MIDDLE_ERROR = Math.abs(INT4_EXAMPLE_RESTORED[1] - INT4_EXAMPLE_VALUES[1]);

// Reported MiMo-7B-RL H200 experiment in Awesome-ML-SYS slime/spec/readme.md:66-94.
export const SPEC_FROZEN_ROLLOUT_TOKENS_S = 1464;
export const SPEC_ONLINE_ROLLOUT_TOKENS_S = 1667;
export const SPEC_ONLINE_OVER_FROZEN = SPEC_ONLINE_ROLLOUT_TOKENS_S / SPEC_FROZEN_ROLLOUT_TOKENS_S - 1;

// Constructed one-layer MTP mask example from Awesome-ML-SYS slime/spec/readme.md:158-176.
export const SPEC_EXAMPLE_MASK = [1, 0, 1, 1, 0];
export const SPEC_MASK_SHIFT_ONCE = SPEC_EXAMPLE_MASK.map((_, i) => SPEC_EXAMPLE_MASK[i + 1] ?? 0);
export const SPEC_MASK_SHIFT_TWICE = SPEC_MASK_SHIFT_ONCE.map((_, i) => SPEC_MASK_SHIFT_ONCE[i + 1] ?? 0);
export const SPEC_MTP_MASK = SPEC_MASK_SHIFT_ONCE.map((value, i) => value * SPEC_MASK_SHIFT_TWICE[i]);

export const SPEC_NO_SPEC_ROLLOUT_TOKENS_S = 1219;
export const SPEC_FROZEN_OVER_NO_SPEC = SPEC_FROZEN_ROLLOUT_TOKENS_S / SPEC_NO_SPEC_ROLLOUT_TOKENS_S - 1;
export const SPEC_ONLINE_OVER_NO_SPEC = SPEC_ONLINE_ROLLOUT_TOKENS_S / SPEC_NO_SPEC_ROLLOUT_TOKENS_S - 1;
export const SPEC_NO_SPEC_LONG_TAIL_TOKENS_S = 47;
export const SPEC_FROZEN_LONG_TAIL_TOKENS_S = 57;
export const SPEC_ONLINE_LONG_TAIL_TOKENS_S = 65;
export const SPEC_NO_SPEC_TRAIN_S = 141;
export const SPEC_FROZEN_TRAIN_S = 143;
export const SPEC_ONLINE_TRAIN_S = 148;
export const SPEC_ONLINE_EXTRA_TRAIN_S = SPEC_ONLINE_TRAIN_S - SPEC_NO_SPEC_TRAIN_S;
export const SPEC_ONLINE_EXTRA_FROZEN_TRAIN_S = SPEC_ONLINE_TRAIN_S - SPEC_FROZEN_TRAIN_S;
export const SPEC_ONLINE_TRAIN_OVER_NO_SPEC = SPEC_ONLINE_TRAIN_S / SPEC_NO_SPEC_TRAIN_S - 1;
export const SPEC_ONLINE_TRAIN_OVER_FROZEN = SPEC_ONLINE_TRAIN_S / SPEC_FROZEN_TRAIN_S - 1;

// Constructed two-action trajectory for the multi-turn agent chapter.
// Letters stand for token spans, not a real tokenizer's output.
export const AGENT_PROMPT_TOKENS = 2;
export const AGENT_FIRST_ACTION_TOKENS = 4;
export const AGENT_OBSERVATION_TOKENS = 3;
export const AGENT_SECOND_ACTION_TOKENS = 5;
export const AGENT_CONTEXT_BEFORE_SECOND_TOKENS = AGENT_FIRST_ACTION_TOKENS + AGENT_OBSERVATION_TOKENS;
export const AGENT_SECOND_CALL_INPUT_TOKENS = AGENT_PROMPT_TOKENS + AGENT_CONTEXT_BEFORE_SECOND_TOKENS;
export const AGENT_RESPONSE_TOKENS = AGENT_CONTEXT_BEFORE_SECOND_TOKENS + AGENT_SECOND_ACTION_TOKENS;
export const AGENT_MODEL_ACTION_TOKENS = AGENT_FIRST_ACTION_TOKENS + AGENT_SECOND_ACTION_TOKENS;
export const AGENT_SAMPLE_TOKENS = AGENT_PROMPT_TOKENS + AGENT_RESPONSE_TOKENS;
export const AGENT_DUMMY_PREFIX_TOKENS = 6;
export const AGENT_FORMATTED_OBSERVATION_TOKENS = AGENT_DUMMY_PREFIX_TOKENS + AGENT_OBSERVATION_TOKENS;
export const AGENT_INITIAL_IMAGES = 1;
export const AGENT_OBSERVATION_IMAGES = 1;
export const AGENT_TOTAL_IMAGES = AGENT_INITIAL_IMAGES + AGENT_OBSERVATION_IMAGES;
export const AGENT_INITIAL_TENSOR_ROWS = 2;
export const AGENT_OBSERVATION_TENSOR_ROWS = 1;
export const AGENT_MERGED_TENSOR_ROWS = AGENT_INITIAL_TENSOR_ROWS + AGENT_OBSERVATION_TENSOR_ROWS;
export const AGENT_CONCAT_LIVE_ROWS = AGENT_INITIAL_TENSOR_ROWS + AGENT_OBSERVATION_TENSOR_ROWS + AGENT_MERGED_TENSOR_ROWS;
export const AGENT_EXAMPLE_MAX_TURNS = 2;
export const AGENT_EXAMPLE_TOKEN_BUDGET = AGENT_RESPONSE_TOKENS;
export const AGENT_SHORT_RESPONSE_TOKENS = AGENT_CONTEXT_BEFORE_SECOND_TOKENS;
export const AGENT_SHORT_PADDING_TOKENS = AGENT_RESPONSE_TOKENS - AGENT_SHORT_RESPONSE_TOKENS;

export const AGENT_CONFIGURED_RESPONSE_LENGTH = AGENT_RESPONSE_TOKENS;
