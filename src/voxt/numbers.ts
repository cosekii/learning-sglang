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

// Public PCMFramer defaults and its 0.5 test sample.
export const VOXT_CAPTURE_SAMPLE_RATE = 16000;
export const VOXT_CAPTURE_FRAME_SAMPLES = VOXT_CAPTURE_SAMPLE_RATE * VOXT_CAPTURE_FRAME_MS / 1000;
export const VOXT_PCM_MAX = 32767;
export const VOXT_PCM_BYTES_PER_SAMPLE = 2;
export const VOXT_CAPTURE_FRAME_BYTES = VOXT_CAPTURE_FRAME_SAMPLES * VOXT_PCM_BYTES_PER_SAMPLE;
export const VOXT_BYTE_STATES = 256;
export const VOXT_DEMO_SAMPLE = 0.5;
export const VOXT_DEMO_PCM_VALUE = Math.trunc(VOXT_DEMO_SAMPLE * VOXT_PCM_MAX);
export const VOXT_DEMO_LOW_BYTE = VOXT_DEMO_PCM_VALUE % VOXT_BYTE_STATES;
export const VOXT_DEMO_HIGH_BYTE = Math.floor(VOXT_DEMO_PCM_VALUE / VOXT_BYTE_STATES);

// Public PCMFramer test: 3,300 samples make two full frames and a partial final frame.
export const VOXT_DEMO_TOTAL_SAMPLES = 3300;
export const VOXT_DEMO_FULL_FRAME_COUNT = Math.floor(VOXT_DEMO_TOTAL_SAMPLES / VOXT_CAPTURE_FRAME_SAMPLES);
export const VOXT_DEMO_TAIL_SAMPLES = VOXT_DEMO_TOTAL_SAMPLES % VOXT_CAPTURE_FRAME_SAMPLES;
export const VOXT_DEMO_TAIL_BYTES = VOXT_DEMO_TAIL_SAMPLES * VOXT_PCM_BYTES_PER_SAMPLE;

// Public high-pass defaults and response test. Wave shapes are constructed from this response.
export const VOXT_HIGH_PASS_CORNER_HZ = 80;
export const VOXT_HIGH_PASS_HUM_HZ = 50;
export const VOXT_HIGH_PASS_CLEAR_HZ = 200;
export const VOXT_HIGH_PASS_HUM_RESPONSE_DB = -16.4;
export const VOXT_HIGH_PASS_HUM_RATIO = 10 ** (VOXT_HIGH_PASS_HUM_RESPONSE_DB / 20);

// Public energy-VAD defaults; the one-click and three-slice examples are constructed.
export const VOXT_VAD_FRAME_MS = 20;
export const VOXT_VAD_ONSET_MS = 60;
export const VOXT_VAD_ONSET_FRAMES = VOXT_VAD_ONSET_MS / VOXT_VAD_FRAME_MS;
export const VOXT_VAD_FRAME_SAMPLES = VOXT_CAPTURE_SAMPLE_RATE * VOXT_VAD_FRAME_MS / 1000;

// Public GainFor quiet-voice example; the wave shapes are constructed.
export const VOXT_QUIET_SPEECH_DB = -30;
export const VOXT_TARGET_SPEECH_DB = -23;
export const VOXT_QUIET_GAIN_DB = VOXT_TARGET_SPEECH_DB - VOXT_QUIET_SPEECH_DB;
export const VOXT_QUIET_GAIN_RATIO = 10 ** (VOXT_QUIET_GAIN_DB / 20);

// Public limiter default; the crossing peak is constructed.
export const VOXT_LIMITER_CEILING_DB = -1;
export const VOXT_LIMITER_CEILING_RATIO = 10 ** (VOXT_LIMITER_CEILING_DB / 20);

// ASR route map: one constructed second of already-captured PCM, one selected route.
export const VOXT_ASR_ROUTE_COUNT = 3;
export const VOXT_ASR_DEMO_SECONDS = 1;
export const VOXT_PCM_BYTES_PER_SECOND = VOXT_CAPTURE_SAMPLE_RATE * VOXT_PCM_BYTES_PER_SAMPLE;
export const VOXT_ASR_DEMO_BYTES = VOXT_ASR_DEMO_SECONDS * VOXT_PCM_BYTES_PER_SECOND;

// File-transcription example: three seconds of PCM plus the public WAV header.
export const VOXT_ASR_FILE_SECONDS = 3;
export const VOXT_WAV_HEADER_BYTES = 44;
export const VOXT_ASR_FILE_PCM_BYTES = VOXT_ASR_FILE_SECONDS * VOXT_PCM_BYTES_PER_SECOND;
export const VOXT_ASR_FILE_WAV_BYTES = VOXT_ASR_FILE_PCM_BYTES + VOXT_WAV_HEADER_BYTES;

// Constructed stream: three audio sends, then one finish call.
export const VOXT_ASR_STREAM_SENDS = 3;
export const VOXT_ASR_STREAM_CALLS = VOXT_ASR_STREAM_SENDS + 1;

// Public SplitPCM test: ten seconds, a nine-second limit and a pause at 8.5 s.
export const VOXT_ASR_SPLIT_SECONDS = 10;
export const VOXT_ASR_SPLIT_MAX_SECONDS = 9;
export const VOXT_ASR_SPLIT_PAUSE_START_MS = 8500;
export const VOXT_ASR_SPLIT_PAUSE_MS = 300;
export const VOXT_ASR_SPLIT_QUIET_MS = 100;
export const VOXT_ASR_SPLIT_SEARCH_SECONDS = VOXT_ASR_SPLIT_MAX_SECONDS * 3 / 4;
export const VOXT_ASR_SPLIT_PIECE_COUNT = 2;

// The two non-empty English results need one inserted separator.
export const VOXT_ASR_JOIN_PIECE_COUNT = VOXT_ASR_SPLIT_PIECE_COUNT;
export const VOXT_ASR_JOIN_INSERTED_SPACES = VOXT_ASR_JOIN_PIECE_COUNT - 1;

// Public Qwen3-ASR preview cadence applied to the constructed three-second recording.
export const VOXT_OMNI_FIRST_DECODE_MS = 100;
export const VOXT_OMNI_DECODE_INTERVAL_MS = 1000;
export const VOXT_OMNI_PREVIEW_COUNT = 3;
export const VOXT_OMNI_PREVIEW_TIMES_MS = Array.from(
  { length: VOXT_OMNI_PREVIEW_COUNT },
  (_, i) => VOXT_OMNI_FIRST_DECODE_MS + i * VOXT_OMNI_DECODE_INTERVAL_MS,
);

// One selected recognition route hands off one raw text result.
export const VOXT_ASR_RAW_RESULT_COUNT = 1;

// Constructed language-model request: one text, one model name and one API key.
export const VOXT_LLM_TEXT_COUNT = 1;
export const VOXT_LLM_MODEL_COUNT = 1;
export const VOXT_LLM_KEY_COUNT = 1;
export const VOXT_LLM_REQUEST_ITEM_COUNT = VOXT_LLM_TEXT_COUNT + VOXT_LLM_MODEL_COUNT + VOXT_LLM_KEY_COUNT;

// Two constructed address alternatives; one setup selects one destination.
export const VOXT_LLM_ADDRESS_OPTION_COUNT = 2;
export const VOXT_LLM_DESTINATION_COUNT = 1;

// One constructed raw text can be paired with cleanup, translation or rewriting.
export const VOXT_COMPOSE_TASK_COUNT = 3;
export const VOXT_COMPOSE_PROMPT_PART_COUNT = 5;

// Constructed long dictation: three pieces rejoin as one ordered result.
export const VOXT_COMPOSE_PIECE_COUNT = 3;
export const VOXT_COMPOSE_ORDERED_RESULT_COUNT = 1;

// The same constructed dictation: one failed piece keeps its recognized text.
export const VOXT_COMPOSE_FAILED_PIECE_COUNT = 1;
export const VOXT_COMPOSE_CLEANED_PIECE_COUNT = VOXT_COMPOSE_PIECE_COUNT - VOXT_COMPOSE_FAILED_PIECE_COUNT;
