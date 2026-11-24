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
