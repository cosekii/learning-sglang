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
