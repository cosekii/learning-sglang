// Constructed teaching example: two dictations, each with a different session ID.
export const DEMO_DICTATION_COUNT = 2;
export const DEMO_SESSION_COUNT = DEMO_DICTATION_COUNT;

// Constructed teaching example: one key press crosses two programs as one message.
export const HOTKEY_PRESS_COUNT = 1;
export const HOTKEY_PROGRAM_COUNT = 2;
export const HOTKEY_MESSAGE_COUNT = 1;
// Same constructed key press with Accessibility off: no hotkey message reaches Go.
export const HOTKEY_BLOCKED_MESSAGE_COUNT = 0;

// Public capture default; the one-second waveform is a constructed teaching example.
export const VOXT_CAPTURE_FRAME_MS = 100;
export const VOXT_DEMO_AUDIO_MS = 1000;
export const VOXT_CAPTURE_FRAME_COUNT = VOXT_DEMO_AUDIO_MS / VOXT_CAPTURE_FRAME_MS;
