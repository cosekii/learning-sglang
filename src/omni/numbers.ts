// examples/configs/qwen3_omni_colocated_h100_bf16.yaml on sglang-omni origin/main.
export const COLOCATED_STAGE_SHARES = [
  { name: 'image_encoder', percent: 2 },
  { name: 'audio_encoder', percent: 2 },
  { name: 'thinker', percent: 78 },
  { name: 'talker_ar', percent: 10 },
  { name: 'code2wav', percent: 2 },
] as const;
export const COLOCATED_USED_PERCENT = COLOCATED_STAGE_SHARES.reduce((sum, stage) => sum + stage.percent, 0);
export const COLOCATED_FREE_PERCENT = 100 - COLOCATED_USED_PERCENT;

// COLOCATED_SPEECH_PROCESSES in sglang_omni/models/qwen3_omni/config.py.
export const COLOCATED_PROCESS_GROUPS = [
  { name: 'preprocessing', stages: ['preprocessing'], device: 'CPU' },
  { name: 'image_encoder', stages: ['image_encoder'], device: 'GPU 0' },
  { name: 'audio_encoder', stages: ['audio_encoder'], device: 'GPU 0' },
  { name: 'thinker', stages: ['thinker'], device: 'GPU 0' },
  { name: 'decode', stages: ['decode'], device: 'CPU' },
  { name: 'talker_ar', stages: ['talker_ar', 'code2wav'], device: 'GPU 0' },
] as const;
export const COLOCATED_STAGE_COUNT = COLOCATED_PROCESS_GROUPS.reduce((sum, group) => sum + group.stages.length, 0);
export const COLOCATED_PROCESS_COUNT = COLOCATED_PROCESS_GROUPS.length;
export const COLOCATED_GPU_PROCESS_GROUPS = COLOCATED_PROCESS_GROUPS.filter((group) => group.device === 'GPU 0');
export const COLOCATED_CPU_PROCESS_GROUPS = COLOCATED_PROCESS_GROUPS.filter((group) => group.device === 'CPU');
export const COLOCATED_GPU_PROCESS_COUNT = COLOCATED_GPU_PROCESS_GROUPS.length;
export const COLOCATED_CPU_PROCESS_COUNT = COLOCATED_CPU_PROCESS_GROUPS.length;
export const COLOCATED_SPEECH_GROUP = COLOCATED_PROCESS_GROUPS[COLOCATED_PROCESS_GROUPS.length - 1];
export const COLOCATED_SPEECH_STAGE_COUNT = COLOCATED_SPEECH_GROUP.stages.length;
export const COLOCATED_SPEECH_SCHEDULER_COUNT = COLOCATED_SPEECH_STAGE_COUNT;
export const COLOCATED_SPEECH_SEPARATE_PROCESS_COUNT = COLOCATED_SPEECH_STAGE_COUNT;
export const COLOCATED_SPEECH_SHARED_PROCESS_COUNT = 1;

// Stage connections in models/qwen3_omni/config.py, pruned per request in request_builders.py.
export const COLOCATED_REQUEST_EDGES = [
  { from: 'preprocessing', to: 'image_encoder' },
  { from: 'preprocessing', to: 'audio_encoder' },
  { from: 'preprocessing', to: 'thinker' },
  { from: 'image_encoder', to: 'thinker' },
  { from: 'audio_encoder', to: 'thinker' },
  { from: 'thinker', to: 'decode' },
  { from: 'thinker', to: 'talker_ar' },
  { from: 'talker_ar', to: 'code2wav' },
  { from: 'preprocessing', to: 'talker_ar' },
  { from: 'image_encoder', to: 'talker_ar' },
  { from: 'audio_encoder', to: 'talker_ar' },
] as const;
export const COLOCATED_MAIN_REQUEST_EDGES = COLOCATED_REQUEST_EDGES.slice(0, 8);
export const COLOCATED_REQUEST_EDGE_COUNT = COLOCATED_REQUEST_EDGES.length;
export const COLOCATED_MAIN_REQUEST_EDGE_COUNT = COLOCATED_MAIN_REQUEST_EDGES.length;
export const COLOCATED_OMITTED_REQUEST_EDGE_COUNT = COLOCATED_REQUEST_EDGE_COUNT - COLOCATED_MAIN_REQUEST_EDGE_COUNT;
const processNameForStage = (stage: string) => COLOCATED_PROCESS_GROUPS.find((group) => (group.stages as readonly string[]).includes(stage))?.name;
export const COLOCATED_INTERNAL_EDGE_COUNT = COLOCATED_REQUEST_EDGES.filter((edge) => processNameForStage(edge.from) === processNameForStage(edge.to)).length;
export const COLOCATED_CROSS_PROCESS_EDGE_COUNT = COLOCATED_REQUEST_EDGE_COUNT - COLOCATED_INTERNAL_EDGE_COUNT;

// Default Qwen speech stages and the shipped replica2 overrides on sglang-omni origin/main.
// At this revision each stage has its own process and one TP rank.
export const QWEN_SPEECH_DEFAULT_STAGE_PROCESSES = [
  { stage: 'preprocessing', gpu: null },
  { stage: 'image_encoder', gpu: 0 },
  { stage: 'audio_encoder', gpu: 0 },
  { stage: 'thinker', gpu: 0 },
  { stage: 'decode', gpu: null },
  { stage: 'talker_ar', gpu: 1 },
  { stage: 'code2wav', gpu: 0 },
] as const;
export const QWEN_SPEECH_REPLICA2_DEVICES = {
  talker_ar: [1, 2],
  code2wav: [1, 2],
} as const;
export const QWEN_SPEECH_REPLICA2_STAGE_PROCESSES = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.flatMap(({ stage, gpu }) => {
  if (stage === 'talker_ar' || stage === 'code2wav') {
    return QWEN_SPEECH_REPLICA2_DEVICES[stage].map((replicaGpu, replica) => ({ stage, gpu: replicaGpu, replica }));
  }
  return [{ stage, gpu, replica: 0 }];
});
const gpuIds = (processes: readonly { gpu: number | null }[]) => Array.from(new Set(processes.flatMap(({ gpu }) => gpu === null ? [] : [gpu]))).sort((a, b) => a - b);
export const QWEN_SPEECH_STAGE_TYPE_COUNT = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.length;
export const QWEN_SPEECH_UNCHANGED_STAGE_COUNT = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage !== 'talker_ar' && stage !== 'code2wav').length;
export const QWEN_SPEECH_DEFAULT_COPY_COUNT = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.length;
export const QWEN_SPEECH_REPLICA2_COPY_COUNT = QWEN_SPEECH_REPLICA2_STAGE_PROCESSES.length;
export const QWEN_SPEECH_DEFAULT_GPU_IDS = gpuIds(QWEN_SPEECH_DEFAULT_STAGE_PROCESSES);
export const QWEN_SPEECH_REPLICA2_GPU_IDS = gpuIds(QWEN_SPEECH_REPLICA2_STAGE_PROCESSES);
export const QWEN_SPEECH_DEFAULT_GPU_COUNT = QWEN_SPEECH_DEFAULT_GPU_IDS.length;
export const QWEN_SPEECH_REPLICA2_GPU_COUNT = QWEN_SPEECH_REPLICA2_GPU_IDS.length;

// A minimal tensor-parallel layout: one logical stage, one process per rank.
export const TP_EXAMPLE_SIZE = 2;
export const TP_EXAMPLE_STAGE_COUNT = 1;
export const TP_EXAMPLE_GPU_IDS = Array.from({ length: TP_EXAMPLE_SIZE }, (_, rank) => rank);
export const TP_EXAMPLE_PROCESS_COUNT = TP_EXAMPLE_SIZE;
export const TP_EXAMPLE_GPU_COUNT = TP_EXAMPLE_GPU_IDS.length;

// A fresh round-robin counter and two talker_ar replicas; requests arrive in order.
export const REQUEST_BINDING_PROCESS_NAME = 'talker_ar';
export const REQUEST_BINDING_REPLICA_COUNT = 2;
export const REQUEST_BINDING_REQUEST_IDS = ['A', 'B', 'C'] as const;
export const REQUEST_BINDING_ASSIGNMENTS = REQUEST_BINDING_REQUEST_IDS.map((_, index) => index % REQUEST_BINDING_REPLICA_COUNT);

// One image-only speech request; the image result arrives before preprocessing.
export const READINESS_ONE_SHOT_INPUTS = ['image_encoder', 'preprocessing'] as const;
export const READINESS_ONE_SHOT_REQUIRED_COUNT = READINESS_ONE_SHOT_INPUTS.length;
export const READINESS_ONE_SHOT_ARRIVED_COUNTS = [0, 1, READINESS_ONE_SHOT_REQUIRED_COUNT] as const;

// A three-chunk thinker → talker_ar example; chunks 0 and 1 precede the whole result.
export const READINESS_STREAM_CHUNK_IDS = [0, 1, 2] as const;
export const READINESS_STREAM_STORED_COUNTS = READINESS_STREAM_CHUNK_IDS.map((_, index) => index + 1);

// Default Qwen speech config: build early at five usable chunks, or after stream completion.
export const READINESS_BUILD_MIN_CHUNKS = 5;
export const READINESS_BUILD_SNAPSHOTS = [
  { usable: 4, done: false },
  { usable: READINESS_BUILD_MIN_CHUNKS, done: false },
  { usable: 2, done: true },
] as const;

// While the thinker stream is open, the next decode needs feedback and the next text row.
export const READINESS_FEEDBACK_SNAPSHOTS = [
  { feedback: false, text: true },
  { feedback: true, text: false },
  { feedback: true, text: true },
] as const;

// Two results and one illustrative storage space; this is not a configured pool size.
export const LIFETIME_RESULT_IDS = ['A', 'B'] as const;
export const LIFETIME_SLOT_COUNT = 1;
export const LIFETIME_WAITING_COUNT = LIFETIME_RESULT_IDS.length - LIFETIME_SLOT_COUNT;

// DataRef's current wire format; data_ref.py accepts only this version.
export const LIFETIME_DATA_REF_WIRE_VERSION = 1;

// A SimpleScheduler teaching example: two requests are ready, one arrives at 6 ms.
// The five-ms collection budget is a counterfactual, not a shipped model default.
export const BATCH_WAIT_MAX_SIZE = 4;
export const BATCH_WAIT_READY_IDS = ['A', 'B'] as const;
export const BATCH_WAIT_LATE_ID = 'C';
export const BATCH_WAIT_LATE_MS = 6;
export const BATCH_WAIT_ACTIVE_MS = 5;
export const BATCH_WAIT_ADDED_MS = BATCH_WAIT_ACTIVE_MS;
export const BATCH_WAIT_EMPTY_SLOTS = BATCH_WAIT_MAX_SIZE - BATCH_WAIT_READY_IDS.length;

// Two visible AR rows make one completion and refill visible; this is not a model default.
export const AR_TEACHING_MAX_RUNNING = 2;
export const AR_ROUND_ONE_RUNNING_IDS = ['A', 'B'] as const;
export const AR_ROUND_ONE_WAITING_IDS = ['C'] as const;
export const AR_ROUND_TWO_RUNNING_IDS = ['B', 'C'] as const;
export const AR_ROUND_ONE_WAITING_COUNT = AR_ROUND_ONE_WAITING_IDS.length;

// ReferenceEncodeService defaults and a three-request ready-queue example.
export const REFERENCE_ENCODER_DEFAULT_MAX_BATCH = 1;
export const REFERENCE_ENCODER_DEFAULT_WAIT_MS = 0;
export const REFERENCE_ENCODER_TEACHING_MAX_BATCH = 4;
export const REFERENCE_ENCODER_READY_IDS = ['A', 'B', 'C'] as const;
export const REFERENCE_ENCODER_LATE_ID = 'D';
export const REFERENCE_ENCODER_FIRST_BATCH_COUNT = REFERENCE_ENCODER_READY_IDS.length;
export const REFERENCE_ENCODER_EMPTY_SLOTS = REFERENCE_ENCODER_TEACHING_MAX_BATCH - REFERENCE_ENCODER_FIRST_BATCH_COUNT;

// MiniCPM-o's real audio-encoder limits, with teaching request lengths.
export const AUDIO_BATCH_MAX_SIZE = 8;
export const AUDIO_BATCH_WAIT_MS = 0;
export const AUDIO_MAX_MEL_FRAMES = 24000;
export const AUDIO_FULL_CHUNK_MEL_FRAMES = 3000;
export const AUDIO_FULL_CHUNK_COUNT = AUDIO_MAX_MEL_FRAMES / AUDIO_FULL_CHUNK_MEL_FRAMES;
export const AUDIO_A_MEL_FRAMES = 15000;
export const AUDIO_B_MEL_FRAMES = 6000;
export const AUDIO_C_MEL_FRAMES = 6000;
export const AUDIO_AB_MEL_FRAMES = AUDIO_A_MEL_FRAMES + AUDIO_B_MEL_FRAMES;
export const AUDIO_ABC_MEL_FRAMES = AUDIO_AB_MEL_FRAMES + AUDIO_C_MEL_FRAMES;
export const AUDIO_REMAINING_MEL_FRAMES = AUDIO_MAX_MEL_FRAMES - AUDIO_AB_MEL_FRAMES;
export const AUDIO_OVERFLOW_MEL_FRAMES = AUDIO_ABC_MEL_FRAMES - AUDIO_MAX_MEL_FRAMES;

// MiniCPM-o Code2Wav batch configuration and a two-stream coalescing example.
export const CODE2WAV_MAX_BATCH_SIZE = 16;
export const CODE2WAV_BATCH_WAIT_MS = 0;
export const CODE2WAV_BATCH_WAIT_WHEN_IDLE = false;
export const STREAM_TEACHING_IDS = ['A', 'B'] as const;
export const STREAM_TEACHING_INPUT_COUNT = STREAM_TEACHING_IDS.length;
export const STREAM_TEACHING_SHARED_STEPS = 1;
export const STREAM_TEACHING_OUTPUT_COUNT = STREAM_TEACHING_IDS.length;

// Historical H200 FIFO Code2Wav comparison from Awesome batch.md / PR #2271.
export const H200_FIFO_BATCH_SMALL = 1;
export const H200_FIFO_BATCH_LARGE = 8;
export const H200_FIFO_SMALL_REQUESTS_PER_S = 4.100;
export const H200_FIFO_LARGE_REQUESTS_PER_S = 5.652;
export const H200_FIFO_REQUEST_COUNT = 200;
export const H200_FIFO_CLIENT_CONCURRENCY = 16;
export const H200_FIFO_WAIT_MS = 0;
export const H200_FIFO_WARMUP_REQUESTS = 50;
export const H200_FIFO_REPEATS = 3;
export const H200_FIFO_EXTRA_REQUESTS_PER_S = H200_FIFO_LARGE_REQUESTS_PER_S - H200_FIFO_SMALL_REQUESTS_PER_S;
export const H200_FIFO_SPEEDUP_PERCENT = Math.round(((H200_FIFO_LARGE_REQUESTS_PER_S / H200_FIFO_SMALL_REQUESTS_PER_S) - 1) * 1000) / 10;
export const H200_FIFO_BAR_MAX = Math.ceil(H200_FIFO_LARGE_REQUESTS_PER_S);

// Two independent admission examples with a teaching cap of two active requests.
export const ADMISSION_TEACHING_LIMIT = 2;
export const ADMISSION_ACTIVE_IDS = ['A', 'B'] as const;
export const ADMISSION_NEW_ID = 'C';
export const ADMISSION_ACTIVE_COUNT = ADMISSION_ACTIVE_IDS.length;
export const ADMISSION_NEW_COUNT = 1;
export const ADMISSION_FREE_PERMITS = ADMISSION_TEACHING_LIMIT - ADMISSION_ACTIVE_COUNT;
export const ADMISSION_ROUTER_STATUS = 429;
export const ADMISSION_COORDINATOR_STATUS = 503;

// DirectResponseBody forwards one downstream poll to one upstream poll.
export const RELAY_TEACHING_FRAME_COUNT = 3;
export const RELAY_DELIVERED_FRAME_COUNT = 1;
export const RELAY_UPSTREAM_FRAME_COUNT = RELAY_TEACHING_FRAME_COUNT - RELAY_DELIVERED_FRAME_COUNT;
export const RELAY_POLL_COUNT = 1;
export const RELAY_MAX_FRAMES_PER_POLL = 1;
export const RELAY_ADAPTER_QUEUE_COUNT = 0;

// Qwen3-TTS B200 DP9: examples/mps_dp/b200/qwen3_tts_1_7b_b200_dp9.yaml.
export const DP9_REPLICA_COUNT = 9;
export const DP9_TTS_FRACTION = 0.0667;
export const DP9_VOCODER_FRACTION = 0.0178;
export const DP9_REPLICA_FRACTION = DP9_TTS_FRACTION + DP9_VOCODER_FRACTION;
export const DP9_TTS_TOTAL_PERCENT = DP9_TTS_FRACTION * DP9_REPLICA_COUNT * 100;
export const DP9_VOCODER_TOTAL_PERCENT = DP9_VOCODER_FRACTION * DP9_REPLICA_COUNT * 100;
export const DP9_USED_PERCENT = DP9_REPLICA_FRACTION * DP9_REPLICA_COUNT * 100;
export const DP9_UNASSIGNED_PERCENT = 100 - DP9_USED_PERCENT;
export const DP9_ENGINE_TOKEN_CAP = 32768;

// The paired physical-capacity cases in tests/unit_test/pipeline/test_placement.py.
export const CAPACITY_CARD_GIB = 80;
export const CAPACITY_RESERVE_GIB = 20;
export const CAPACITY_KV_GIB = 2;
export const CAPACITY_PASS_FRACTION = 0.50;
export const CAPACITY_FAIL_FRACTION = 0.90;
export const CAPACITY_PASS_FRACTION_GIB = CAPACITY_CARD_GIB * CAPACITY_PASS_FRACTION;
export const CAPACITY_FAIL_FRACTION_GIB = CAPACITY_CARD_GIB * CAPACITY_FAIL_FRACTION;
export const CAPACITY_PASS_DECLARED_GIB = CAPACITY_PASS_FRACTION_GIB + CAPACITY_RESERVE_GIB;
export const CAPACITY_FAIL_DECLARED_GIB = CAPACITY_FAIL_FRACTION_GIB + CAPACITY_RESERVE_GIB;
export const CAPACITY_PASS_HEADROOM_GIB = CAPACITY_CARD_GIB - CAPACITY_PASS_DECLARED_GIB;
export const CAPACITY_FAIL_OVERFLOW_GIB = CAPACITY_FAIL_DECLARED_GIB - CAPACITY_CARD_GIB;

// One stage-scoped KV declaration must be consumed by exactly one engine.
export const KV_SCOPE_TEACHING_GIB = 2;
export const KV_SCOPE_REQUIRED_ENGINE_COUNT = 1;
export const KV_SCOPE_ZERO_ENGINE_COUNT = 0;
export const KV_SCOPE_EXCESS_ENGINE_COUNT = 2;

// MOSS same-GPU DP2 with weight_share=on; the token cap is per replica.
export const WEIGHT_SHARE_REPLICA_COUNT = 2;
export const WEIGHT_SHARE_LEADER_COUNT = 1;
export const WEIGHT_SHARE_FOLLOWER_COUNT = WEIGHT_SHARE_REPLICA_COUNT - WEIGHT_SHARE_LEADER_COUNT;
export const WEIGHT_SHARE_CHECKPOINT_COPY_COUNT = 1;
export const WEIGHT_SHARE_INDEPENDENT_CHECKPOINT_COPY_COUNT = WEIGHT_SHARE_REPLICA_COUNT;
export const WEIGHT_SHARE_SAVED_CHECKPOINT_COPY_COUNT = WEIGHT_SHARE_INDEPENDENT_CHECKPOINT_COPY_COUNT - WEIGHT_SHARE_CHECKPOINT_COPY_COUNT;
export const WEIGHT_SHARE_PRIVATE_KV_POOL_COUNT = WEIGHT_SHARE_REPLICA_COUNT;
export const WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA = 30000;
export const WEIGHT_SHARE_COMBINED_TOKEN_CAP = WEIGHT_SHARE_REPLICA_COUNT * WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA;

// mps=auto needs two eligible single-GPU, non-TP processes on one physical GPU.
export const MPS_TEACHING_CLIENT_COUNT = 2;
export const MPS_AUTO_MIN_CLIENT_COUNT = 2;
export const MPS_LEASE_COUNT_PER_GPU = 1;
export const MPS_TEACHING_TP_CLIENT_COUNT = 0;

// AuK serial offload: three components, one request owner and one resident component.
export const AUK_OFFLOAD_COMPONENTS = ['conditioning', 'DiT', 'VAE'] as const;
export const AUK_OFFLOAD_COMPONENT_COUNT = AUK_OFFLOAD_COMPONENTS.length;
export const AUK_OFFLOAD_RESIDENT_COUNT = 1;
export const AUK_OFFLOAD_SLEEPING_COUNT = AUK_OFFLOAD_COMPONENT_COUNT - AUK_OFFLOAD_RESIDENT_COUNT;
export const AUK_OFFLOAD_REQUEST_OWNER_COUNT = 1;
export const AUK_OFFLOAD_MAX_BATCH_SIZE = 1;
export const AUK_OFFLOAD_PROCESS_REPLICA_COUNT = 1;

// PR #1235: p90 first sound on H200, two runs per talker placement.
const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
export const STREAM_P90_SHARED_RUNS_S = [2.697, 2.663] as const;
export const STREAM_P90_ALONE_RUNS_S = [1.463, 1.415] as const;
export const STREAM_P90_SHARED_S = mean(STREAM_P90_SHARED_RUNS_S);
export const STREAM_P90_ALONE_S = mean(STREAM_P90_ALONE_RUNS_S);
export const STREAM_P90_EXTRA_S = STREAM_P90_SHARED_S - STREAM_P90_ALONE_S;
export const STREAM_P90_SOONER_PERCENT = (1 - STREAM_P90_ALONE_S / STREAM_P90_SHARED_S) * 100;

// Constructed request for timer boundaries, not a measured response.
export const STREAM_TEACHING_SUBMIT_S = 0;
export const STREAM_TEACHING_FIRST_AUDIO_S = 1.4;
export const STREAM_TEACHING_DONE_S = 3.2;
export const STREAM_TEACHING_TTFT_S = STREAM_TEACHING_FIRST_AUDIO_S - STREAM_TEACHING_SUBMIT_S;
export const STREAM_TEACHING_TOTAL_S = STREAM_TEACHING_DONE_S - STREAM_TEACHING_SUBMIT_S;

// Constructed two-chunk playback example; chunk duration follows Learning SGLang Ch. 20.
export const STREAM_CHUNK_DURATION_S = 0.8;
export const STREAM_CHUNK1_ARRIVAL_S = STREAM_TEACHING_FIRST_AUDIO_S;
export const STREAM_CHUNK1_END_S = STREAM_CHUNK1_ARRIVAL_S + STREAM_CHUNK_DURATION_S;
export const STREAM_CHUNK2_ARRIVAL_S = 2.5;
export const STREAM_STALL_S = Math.max(0, STREAM_CHUNK2_ARRIVAL_S - STREAM_CHUNK1_END_S);
export const STREAM_CHUNK2_END_S = STREAM_CHUNK2_ARRIVAL_S + STREAM_CHUNK_DURATION_S;
export const STREAM_STALL_CHUNK_PERCENT = STREAM_STALL_S / STREAM_CHUNK_DURATION_S * 100;

// A constructed identifier used to read a communication trace, not captured log output.
export const STREAM_TRACE_OBJECT_ID = 'obj-17';

// Constructed CUDA IPC timing record for reading host and GPU-event intervals.
export const STREAM_TRACE_HOST_WAIT_MS = 12;
export const STREAM_TRACE_GPU_EVENT_MS = 5;
export const STREAM_TRACE_HOST_REST_MS = STREAM_TRACE_HOST_WAIT_MS - STREAM_TRACE_GPU_EVENT_MS;

// Shipped streaming TTFT benchmark protocol.
export const STREAM_BENCH_PROMPT_COUNT = 2;
export const STREAM_BENCH_WARMUP_PER_PROMPT = 2;
export const STREAM_BENCH_REPEATS_PER_PROMPT = 5;
export const STREAM_BENCH_SEED = 1000;
export const STREAM_BENCH_MAX_TOKENS = 256;
export const STREAM_SHORT_PROMPT = 'Please reply: Hello, how are you today?';
export const STREAM_MEDIUM_PROMPT = 'Please respond with the following sentence verbatim: The quick brown fox jumps over the lazy dog while the sun sets over the quiet hills, and the river continues to flow gently through the valley.';
export const STREAM_SHORT_WORDS = STREAM_SHORT_PROMPT.split(/\s+/).length;
export const STREAM_MEDIUM_WORDS = STREAM_MEDIUM_PROMPT.split(/\s+/).length;
export const STREAM_PARTIAL_START_MIN_CHUNKS = 5;
export const STREAM_BENCH_WARMUP_PER_LABEL = STREAM_BENCH_PROMPT_COUNT * STREAM_BENCH_WARMUP_PER_PROMPT;
export const STREAM_BENCH_KEPT_PER_LABEL = STREAM_BENCH_PROMPT_COUNT * STREAM_BENCH_REPEATS_PER_PROMPT;

// Constructed five-run summary using the benchmark's population-stdev rule.
export const STREAM_EXAMPLE_RUNS_S = [1.3, 1.4, 1.3, 1.4, 2.6] as const;
export const STREAM_EXAMPLE_RUN_SUM_S = STREAM_EXAMPLE_RUNS_S.reduce((sum, value) => sum + value, 0);
export const STREAM_EXAMPLE_MEAN_S = STREAM_EXAMPLE_RUN_SUM_S / STREAM_EXAMPLE_RUNS_S.length;
export const STREAM_EXAMPLE_MIN_S = Math.min(...STREAM_EXAMPLE_RUNS_S);
export const STREAM_EXAMPLE_MAX_S = Math.max(...STREAM_EXAMPLE_RUNS_S);
export const STREAM_EXAMPLE_SQUARED_DEVIATION_SUM = STREAM_EXAMPLE_RUNS_S.reduce((sum, value) => sum + (value - STREAM_EXAMPLE_MEAN_S) ** 2, 0);
export const STREAM_EXAMPLE_STDEV_S = Math.sqrt(STREAM_EXAMPLE_SQUARED_DEVIATION_SUM / STREAM_EXAMPLE_RUNS_S.length);
export const STREAM_EXAMPLE_MAX_OVER_MIN = STREAM_EXAMPLE_MAX_S / STREAM_EXAMPLE_MIN_S;
export const STREAM_EXAMPLE_FAST_MEAN_S = STREAM_EXAMPLE_RUNS_S.slice(0, 4).reduce((sum, value) => sum + value, 0) / 4;

// Public MOSS-TTS-Local-v1.5 reference-encoder profile and a three-request teaching example.
export const OPT_REFERENCE_ENCODE_MS = 250;
export const OPT_REFERENCE_REQUEST_COUNT = 3;
export const OPT_REFERENCE_TOTAL_MS = OPT_REFERENCE_REQUEST_COUNT * OPT_REFERENCE_ENCODE_MS;
export const OPT_CACHE_MISS_COUNT = 1;
export const OPT_CACHE_HIT_COUNT = OPT_REFERENCE_REQUEST_COUNT - OPT_CACHE_MISS_COUNT;
export const OPT_CACHED_TOTAL_MS = OPT_CACHE_MISS_COUNT * OPT_REFERENCE_ENCODE_MS;
export const OPT_CACHE_SAVED_MS = OPT_REFERENCE_TOTAL_MS - OPT_CACHED_TOTAL_MS;
export const OPT_SINGLE_FLIGHT_LEADER_COUNT = 1;
export const OPT_SINGLE_FLIGHT_FOLLOWER_COUNT = OPT_REFERENCE_REQUEST_COUNT - OPT_SINGLE_FLIGHT_LEADER_COUNT;
export const OPT_SINGLE_FLIGHT_COLD_HIT_COUNT = 0;
export const OPT_SINGLE_FLIGHT_GPU_TOTAL_MS = OPT_SINGLE_FLIGHT_LEADER_COUNT * OPT_REFERENCE_ENCODE_MS;

// Qwen3-Omni audio-layer graph buckets and a constructed 300-token replay.
export const OPT_AUDIO_TOKEN_BUCKETS = [128, 256, 512, 1024, 2048, 4096] as const;
export const OPT_AUDIO_REAL_TOKENS = 300;
export const OPT_AUDIO_BUCKET_TOKENS = OPT_AUDIO_TOKEN_BUCKETS.find((bucket) => bucket >= OPT_AUDIO_REAL_TOKENS)!;
export const OPT_AUDIO_PADDING_TOKENS = OPT_AUDIO_BUCKET_TOKENS - OPT_AUDIO_REAL_TOKENS;
export const OPT_AUDIO_GRAPH_COUNT = OPT_AUDIO_TOKEN_BUCKETS.length;

// Learning SGLang Ch. 20: ten Qwen codec frames make one 800 ms sound chunk.
export const OPT_VOCODER_FRAMES_PER_CHUNK = 10;
export const OPT_VOCODER_CHUNK_MS = 800;
export const OPT_VOCODER_FRAME_MS = OPT_VOCODER_CHUNK_MS / OPT_VOCODER_FRAMES_PER_CHUNK;

// Qwen3-Omni streaming Code2Wav: left-context replay, ready-window batching and retained state.
export const VOC_LEFT_CONTEXT_FRAMES = 25;
export const VOC_NEW_FRAMES = OPT_VOCODER_FRAMES_PER_CHUNK;
export const VOC_STATELESS_INPUT_FRAMES = VOC_LEFT_CONTEXT_FRAMES + VOC_NEW_FRAMES;
export const VOC_BATCH_REQUEST_COUNT = 3;
export const VOC_BATCH_CALLS_BEFORE = VOC_BATCH_REQUEST_COUNT;
export const VOC_BATCH_CALLS_AFTER = 1;

// PR #2909: Qwen3-Omni colocated BF16 on H200, one graph replay, median of 20 timings.
export const VOC_STATE_FIRST_MAIN_US = 3656.3;
export const VOC_STATE_FIRST_SLOT_US = 3992.0;
export const VOC_STATE_LATER_MAIN_US = 10777.5;
export const VOC_STATE_LATER_SLOT_US = 4255.3;
export const VOC_STATE_FIRST_CHANGE_PERCENT = (VOC_STATE_FIRST_SLOT_US / VOC_STATE_FIRST_MAIN_US - 1) * 100;
export const VOC_STATE_LATER_REDUCTION_PERCENT = (1 - VOC_STATE_LATER_SLOT_US / VOC_STATE_LATER_MAIN_US) * 100;

// PR #1101's historical H200 c16 sweep; the percent below derives from the two displayed mean QPS values.
export const VOC_GRAPH_CONCURRENCY = 16;
export const VOC_GRAPH_CONTROL_QPS = 0.575;
export const VOC_GRAPH_REPLAY_QPS = 0.635;
export const VOC_GRAPH_MEAN_QPS_GAIN_PERCENT = (VOC_GRAPH_REPLAY_QPS / VOC_GRAPH_CONTROL_QPS - 1) * 100;

// Fish S2 Pro drops the semantic row and sends ten codebook rows per frame to its vocoder.
export const VOC_FISH_CODEBOOK_ROWS = 10;

// Fish S2 Pro's shipped first streaming window and DAC frame dimensions.
export const FISH_FIRST_WINDOW_FRAMES = 40;
export const FISH_FIRST_WINDOW_CODE_CHOICES = FISH_FIRST_WINDOW_FRAMES * VOC_FISH_CODEBOOK_ROWS;
export const FISH_CODEC_SAMPLE_RATE = 44100;
export const FISH_SAMPLES_PER_FRAME = 2048;
export const FISH_FIRST_WINDOW_SAMPLES = FISH_FIRST_WINDOW_FRAMES * FISH_SAMPLES_PER_FRAME;
export const FISH_FIRST_WINDOW_AUDIO_MS = FISH_FIRST_WINDOW_SAMPLES / FISH_CODEC_SAMPLE_RATE * 1000;

// A constructed one-second reference clip, resampled and padded by the real DAC geometry.
export const FISH_TEACHING_REFERENCE_SAMPLE_RATE = 16000;
export const FISH_TEACHING_REFERENCE_SECONDS = 1;
export const FISH_TEACHING_REFERENCE_SAMPLES = FISH_TEACHING_REFERENCE_SAMPLE_RATE * FISH_TEACHING_REFERENCE_SECONDS;
export const FISH_REFERENCE_FRAMES = Math.ceil(FISH_CODEC_SAMPLE_RATE / FISH_SAMPLES_PER_FRAME);
export const FISH_REFERENCE_PADDED_SAMPLES = FISH_REFERENCE_FRAMES * FISH_SAMPLES_PER_FRAME;
export const FISH_REFERENCE_PADDING_SAMPLES = FISH_REFERENCE_PADDED_SAMPLES - FISH_CODEC_SAMPLE_RATE;
