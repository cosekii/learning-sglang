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
