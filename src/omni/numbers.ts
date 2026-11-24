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
