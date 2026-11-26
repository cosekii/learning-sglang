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

// Public write path: one strict echo retry; Rewrite speech is an instruction, not fallback text.
export const VOXT_TRANSLATE_STRICT_RETRY_COUNT = 1;
export const VOXT_REWRITE_SPEECH_FALLBACK_COUNT = 0;

// A length-limited answer goes to one review card, never straight into the app.
export const VOXT_COMPOSE_TRUNCATED_ANSWER_COUNT = 1;
export const VOXT_COMPOSE_UNSEEN_INSERT_COUNT = 0;

// Public delivery defaults (Voxt/internal/deliver/deliver.go; helper TextIO.swift).
export const VOXT_DELIVER_VERIFY_MS = 1000;
export const VOXT_RESTORE_AFTER_INSERT_MS = 150;
export const VOXT_RESTORE_DEFAULT_MS = 500;

// Constructed dictionary example: one term, the alias recognition hears, and a note.
export const VOXT_DICT_TERM = 'Priya';
export const VOXT_DICT_ALIAS = 'Preeya';
export const VOXT_DICT_SECOND_TERM = 'MOSS-Transcribe';
export const VOXT_DICT_TERM_COUNT = 2;
export const VOXT_DICT_HINT_COUNT = VOXT_DICT_TERM_COUNT;

// Public limits (Voxt/internal/dict/dict.go; Voxt/internal/compose/compose.go).
export const VOXT_DICT_MAX_TERM_CHARS = 80;
export const VOXT_DICT_MAX_ALIASES = 10;
export const VOXT_DICT_GLOSSARY_ALL_UP_TO = 30;
export const VOXT_DICT_GLOSSARY_MAX_TERMS = 60;
export const VOXT_DICT_GLOSSARY_MAX_CHARS = 2000;

// Public history retention defaults (Voxt/internal/settings/history.go; Voxt/internal/session/session.go).
export const VOXT_HISTORY_KEEP_DAYS = 90;
export const VOXT_HISTORY_KEEP_DAYS_CHOICES = [365, 180, 90, 30, 7];
export const VOXT_HISTORY_KEEP_COUNT_DEFAULT = 0;
export const VOXT_HISTORY_KEEP_COUNT_CHOICES = [0, 50, 100, 300, 500, 1000];
export const VOXT_HISTORY_KIND_COUNT = 3;
export const VOXT_RETRY_KEEP_DAYS = 7;
export const VOXT_HISTORY_SWEEP_HOURS = 1;
export const VOXT_RETRY_KEEP_HOURS = VOXT_RETRY_KEEP_DAYS * 24;
export const VOXT_HISTORY_SHORTER_DAYS = VOXT_HISTORY_KEEP_DAYS - VOXT_RETRY_KEEP_DAYS;

// Constructed teaching example: ten dictations a day for the default 90-day window.
export const VOXT_HISTORY_DEMO_PER_DAY = 10;
export const VOXT_HISTORY_DEMO_ROWS = VOXT_HISTORY_DEMO_PER_DAY * VOXT_HISTORY_KEEP_DAYS;

// Constructed teaching dates around the default cutoff.
export const VOXT_HISTORY_TODAY = '2026-11-26';
export const VOXT_HISTORY_CUTOFF = '2026-08-28';
export const VOXT_HISTORY_OLD_DATE = '2026-08-27';
export const VOXT_HISTORY_KEPT_DATE = '2026-08-29';
export const VOXT_HISTORY_OLD_DAYS = 91;
export const VOXT_HISTORY_KEPT_DAYS = 89;
export const VOXT_HISTORY_COUNT_EXAMPLE = 100;
export const VOXT_HISTORY_COUNT_ROWS = 102;
export const VOXT_HISTORY_COUNT_DELETED = VOXT_HISTORY_COUNT_ROWS - VOXT_HISTORY_COUNT_EXAMPLE;

// Constructed file example: eight seconds of speech, two cues.
export const VOXT_TRANSCRIBE_DEMO_SECONDS = 8;
export const VOXT_TRANSCRIBE_PCM_BYTES = VOXT_TRANSCRIBE_DEMO_SECONDS * VOXT_PCM_BYTES_PER_SECOND;
export const VOXT_TRANSCRIBE_WAV_BYTES = VOXT_TRANSCRIBE_PCM_BYTES + VOXT_WAV_HEADER_BYTES;

// A constructed one-hour meeting at the same PCM rate, for scale.
export const VOXT_TRANSCRIBE_MEETING_SECONDS = 3600;
export const VOXT_TRANSCRIBE_MEETING_BYTES = VOXT_TRANSCRIBE_MEETING_SECONDS * VOXT_PCM_BYTES_PER_SECOND;
export const VOXT_TRANSCRIBE_MEETING_MB = VOXT_TRANSCRIBE_MEETING_BYTES / 1_000_000;
export const VOXT_TRANSCRIBE_PHOTO_MB = 4;

// Public Cutter defaults (Voxt/internal/meeting/cutter.go).
export const VOXT_CUTTER_FRAME_MS = 10;
export const VOXT_CUTTER_SILENCE_MS = 450;
export const VOXT_CUTTER_MIN_VOICED_MS = 350;
export const VOXT_CUTTER_MAX_SEGMENT_S = 7;
export const VOXT_CUTTER_PREROLL_MS = 300;
export const VOXT_CUTTER_QUIET_SEARCH_MS = 1000;
export const VOXT_CUTTER_QUIET_WINDOW_MS = 100;
export const VOXT_CUTTER_SPEECH_RMS = 800;

// Constructed 8-second file: speech ends at 2.9 s; 450 ms of silence ends cue 1.
// Cue 2 starts 300 ms before its speech; its 450 ms silence ends cue 2 at 7.85 s.
export const VOXT_TRANSCRIBE_CUE_COUNT = 2;
export const VOXT_TRANSCRIBE_CUE_STARTS_MS = [0, 3400];
export const VOXT_TRANSCRIBE_CUE_ENDS_MS = [3350, 7850];
export const VOXT_TRANSCRIBE_SPEECH_STARTS_MS = [0, 3700];
export const VOXT_TRANSCRIBE_SPEECH_ENDS_MS = [2900, 7400];
export const VOXT_TRANSCRIBE_CUE_TEXT = ['Good morning.', 'See you at noon.'];

// Constructed nine-second stretch with no 450 ms pause: the 7-second cap cuts it.
export const VOXT_TRANSCRIBE_LONG_SECONDS = 9;
export const VOXT_TRANSCRIBE_CUT_MS = 6500;
export const VOXT_TRANSCRIBE_REMAIN_MS = VOXT_TRANSCRIBE_LONG_SECONDS * 1000 - VOXT_TRANSCRIBE_CUT_MS;

// Public request-line cap (Voxt/internal/fileasr/socket.go).
export const VOXT_TRANSCRIBE_MAX_REQUEST_BYTES = 4096;

// Public model catalogue: the default Qwen3-ASR 1.7B (8bit) snapshot and the
// Silero VAD it needs (Voxt/internal/models/catalog.go). Decimal MB/GB.
export const VOXT_MODEL_FILE_COUNT = 9;
export const VOXT_MODEL_WEIGHTS_BYTES = 2463307541;
export const VOXT_MODEL_VOCAB_BYTES = 2776833;
export const VOXT_MODEL_TOTAL_BYTES = 2467856503;
export const VOXT_MODEL_TOTAL_GB = VOXT_MODEL_TOTAL_BYTES / 1_000_000_000;
export const VOXT_MODEL_VAD_BYTES = 1238323;
export const VOXT_MODEL_JOB_BYTES = VOXT_MODEL_TOTAL_BYTES + VOXT_MODEL_VAD_BYTES;

// Public 0.1.0-beta.1 release sizes (Voxt/docs/release.md): app 280 MB, dmg 45 MB.
export const VOXT_APP_MB = 280;
export const VOXT_APP_DMG_MB = 45;
export const VOXT_MODEL_APP_RATIO = VOXT_MODEL_TOTAL_BYTES / 1_000_000 / VOXT_APP_MB;

// Public download and speech-runtime defaults (internal/models/manager.go,
// internal/omni/runtime.go).
export const VOXT_DOWNLOAD_RESERVE_GB = 2;
export const VOXT_SERVER_IDLE_MINUTES = 10;
export const VOXT_SERVER_START_TIMEOUT_S = 180;
export const VOXT_UPDATE_CHECK_HOURS = 24;
export const VOXT_UPDATE_BUNDLE_WATCH_MINUTES = 1;

// Pinned snapshot shown on the stage.
export const VOXT_MODEL_REPO = 'mlx-community/Qwen3-ASR-1.7B-8bit';
export const VOXT_MODEL_COMMIT = 'a8379a2e2f9e313c9292cdf1af4055ab56d50d55';
