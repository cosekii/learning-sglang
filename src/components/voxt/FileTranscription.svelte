<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_TRANSCRIBE_DEMO_SECONDS,
    VOXT_TRANSCRIBE_PCM_BYTES,
    VOXT_TRANSCRIBE_WAV_BYTES,
    VOXT_TRANSCRIBE_MEETING_SECONDS,
    VOXT_TRANSCRIBE_MEETING_BYTES,
    VOXT_TRANSCRIBE_MEETING_MB,
    VOXT_TRANSCRIBE_PHOTO_MB,
    VOXT_CUTTER_FRAME_MS,
    VOXT_CUTTER_SILENCE_MS,
    VOXT_CUTTER_MAX_SEGMENT_S,
    VOXT_CUTTER_PREROLL_MS,
    VOXT_CUTTER_QUIET_SEARCH_MS,
    VOXT_CUTTER_QUIET_WINDOW_MS,
    VOXT_TRANSCRIBE_CUE_COUNT,
    VOXT_TRANSCRIBE_CUE_STARTS_MS,
    VOXT_TRANSCRIBE_CUE_ENDS_MS,
    VOXT_TRANSCRIBE_SPEECH_STARTS_MS,
    VOXT_TRANSCRIBE_SPEECH_ENDS_MS,
    VOXT_TRANSCRIBE_CUE_TEXT,
    VOXT_TRANSCRIBE_LONG_SECONDS,
    VOXT_TRANSCRIBE_CUT_MS,
    VOXT_TRANSCRIBE_INPUT_QUIET_MS,
    VOXT_TRANSCRIBE_REMAIN_MS,
    VOXT_WAV_HEADER_BYTES,
    VOXT_PCM_BYTES_PER_SECOND,
    VOXT_PCM_BYTES_PER_SAMPLE,
    VOXT_CAPTURE_SAMPLE_RATE,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A dictation ends at a cursor. A file ends as SRT or TXT.',
    captionZh: '听写的结果落在光标处。文件转写的结果是 SRT 或 TXT。',
  }, {
    caption: 'The command uses a Mac tool to turn the file into 16 kHz mono PCM.',
    captionZh: '命令用 Mac 工具把文件转成 16 kHz 单声道 PCM。',
  }, {
    caption: 'It sends that PCM to the running Voxt over a local socket.',
    captionZh: '它把 PCM 通过本机 socket 送给正在运行的 Voxt。',
  }, {
    caption: 'A pause of 450 ms ends a cue.',
    captionZh: '停顿满 450 ms 就结束一句。',
  }, {
    caption: 'A new cue starts 300 ms before its speech.',
    captionZh: '新的一句在讲话前 300 ms 开始。',
  }, {
    caption: 'At 7 s, Voxt cuts at the quietest point in the last second.',
    captionZh: '到 7 秒，Voxt 在最后 1 秒最安静处切开。',
  }, {
    caption: 'Voxt recognizes each cue with the Transcribe model.',
    captionZh: 'Voxt 用 Transcribe 的模型逐句识别。',
  }, {
    caption: 'SRT keeps the cue times; TXT keeps one line per cue.',
    captionZh: 'SRT 保留每句的时间；TXT 每句一行。',
  }, {
    caption: 'Recognition failure leaves the output untouched. A later write can still leave part of it.',
    captionZh: '识别失败不动输出文件。识别成功后的写盘失败仍可能留下半个文件。',
  }, {
    caption: 'The file route writes no history and keeps no recording.',
    captionZh: '文件路线不写历史，也不留录音。',
  }, {
    caption: 'Audio goes to Transcribe, local or remote. How do its model files reach this Mac?',
    captionZh: '音频交给 Transcribe 模型，本机或远程。模型文件怎么来到这台 Mac？',
  }];
  const ariaLabels = [{
    en: 'Two routes. A dictation goes from the microphone through a dictation session and cleanup to the cursor, with a history row when history is enabled. A file goes from disk through Voxt transcribe to SRT or TXT; it reuses the model set for Transcribe but opens no session and runs no cleanup. A one-hour meeting is 3600 seconds of sound; Step 2 turns that into bytes.',
    zh: '两条路线。听写从麦克风经过听写 session 和整理，到光标处的文字；历史开启时还会写一条历史记录。文件从磁盘经过 Voxt transcribe 到 SRT 或 TXT；它复用 Transcribe 选定的模型，但不打开 session，也不做整理。一小时的会议是 3600 秒的声音；第 2 步把它算成字节。',
  }, {
    en: 'A constructed eight-second file is decoded by a Mac sound tool to 16 kHz mono PCM, held as a temporary file. Eight seconds times 32000 bytes a second is 256000 PCM bytes, plus a 44-byte header.',
    zh: '构造的八秒文件由 Mac 的声音工具转成 16 kHz 单声道 PCM，放进一个临时文件。八秒乘每秒 32000 字节是 256000 字节 PCM，再加 44 字节文件头。',
  }, {
    en: 'The command sends one JSON request line and 256000 PCM bytes to the running Voxt through a local socket named transcribe.sock. The command writes the PCM while it reads replies, and the app cuts and recognizes the stream as it arrives, so one reply for each finished piece of speech can come back before the last PCM byte.',
    zh: '命令把一行 JSON 请求和 256000 字节 PCM，通过名为 transcribe.sock 的本机 socket 送给运行中的 Voxt。命令一边写 PCM 一边读回复，应用边收边切句、识别，所以最后一块 PCM 还没传完，就可能已经有句子回来。',
  }, {
    en: 'The cutter looks at 10 ms slices, a different, smaller unit than the 100 ms audio frames of chapter 3. 450 ms of quiet ends a cue. The cue keeps that quiet at its end.',
    zh: '切句器每 10 ms 看一小片，比第 3 章 100 ms 的音频帧更小。安静满 450 ms 结束一句。这句末尾的安静也一起留下。',
  }, {
    en: 'A new cue starts 300 ms before its first speech frame, so the first consonant is not lost. Cue two starts at 3.40 seconds while its speech starts at 3.70.',
    zh: '新的一句在第一个讲话帧前 300 ms 开始，这样第一个辅音不会被切掉。第 2 句从 3.40 秒开始，而讲话从 3.70 秒开始。',
  }, {
    en: 'A constructed nine-second stretch never pauses for 450 ms. At seven seconds the cutter searches the last second for the quietest 100 ms and reports the cut at 6.51 seconds. The rest is 2.49 seconds and becomes the next cue.',
    zh: '构造的九秒连续讲话没有 450 ms 的停顿。到七秒时，切句器在最后 1 秒里找最安静的 100 ms，报告切点在 6.51 秒。剩下 2.49 秒，成为下一句。',
  }, {
    en: 'Voxt sends each cue to the speech model chosen for Transcribe. Cue one returns Good morning and cue two returns See you at noon. A cue whose text is empty is left out.',
    zh: 'Voxt 把每一句送给 Transcribe 选定的语音模型。第一句返回 Good morning，第二句返回 See you at noon。文字为空的句子会被丢掉。',
  }, {
    en: 'The same two cues become files. SRT writes a number, the start and end times, and the text for each cue. TXT writes the text only, one line per cue.',
    zh: '同样的两句可以写成文件。SRT 写编号、起止时间和每句文字；TXT 只写文字，每句一行。',
  }, {
    en: 'Recognition finishes before the output file is opened. If any cue fails, the command creates or overwrites no file, so an old file stays as it was. After success it writes once; a disk-write failure can still truncate an old file or leave a partial new one.',
    zh: '识别全部完成后才打开输出文件。任何一句失败时，命令不创建也不覆盖文件，旧文件保持原样。成功后写一次盘；写盘失败仍可能截断旧文件或留下部分新文件。',
  }, {
    en: 'Dictation writes history only when history is enabled, which is the default. The file route writes no history row and keeps no recording. It writes one log line with the audio length and the cue count, not the text.',
    zh: '听写只在历史开启时写历史，默认开启。文件路线不写历史记录，也不留录音。它只写一行日志，记音频长度和句子数，不记文字。',
  }, {
    en: 'The audio goes to the model chosen for Transcribe: on this Mac or a configured remote service. The next chapter asks how these model files reach this Mac.',
    zh: '声音送给 Transcribe 选定的模型：本机或配置的远端服务。下一章问这些模型文件怎样到达这台 Mac。',
  }];
  let step = $state(0);
  let clock = $state(0), lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    if (step !== 3) { clock = 0; return; }
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { clock = 8000; return; }
    const SPAN = 8000, SLOW = 1.6, REST = 1400, lapLen = SPAN / SLOW + REST;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || now - t0 >= lapLen) { t0 = now; nextLap(lapLen); }
      clock = Math.min(SPAN, (now - t0) * SLOW);
      raf = requestAnimationFrame(tick);
    };
    clock = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  const quietNow = $derived(clock >= 2900 && clock <= 3350);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived((phone ? [810, 760, 820, 760, 760, 740, 760, 650, 720, 620, 720] : [470, 430, 450, 460, 450, 440, 430, 470, 440, 470, 460])[step]);

  const srt = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor(ms / 60_000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  };
  const sec = (ms: number) => (ms / 1000).toFixed(2);
  const arrow = '-->';
  const requestLine = JSON.stringify({ op: 'transcribe', bytes: VOXT_TRANSCRIBE_PCM_BYTES });
  const requestSplit = requestLine.indexOf('"bytes"');
  const requestHead = requestLine.slice(0, requestSplit);
  const requestTail = requestLine.slice(requestSplit);
  const replyLines = ['{"segment": …}', '{"segment": …}', `{"done":true,"count":${VOXT_TRANSCRIBE_CUE_COUNT}}`];
  const pcm = VOXT_TRANSCRIBE_PCM_BYTES.toLocaleString('en-US');
  const photoCount = Math.round(VOXT_TRANSCRIBE_MEETING_MB / VOXT_TRANSCRIBE_PHOTO_MB);
  const searchStartMs = VOXT_CUTTER_MAX_SEGMENT_S * 1000 - VOXT_CUTTER_QUIET_SEARCH_MS;
  const searchEndMs = VOXT_CUTTER_MAX_SEGMENT_S * 1000;
  const quietFromMs = VOXT_TRANSCRIBE_INPUT_QUIET_MS - VOXT_CUTTER_QUIET_WINDOW_MS / 2;
  const quietToMs = VOXT_TRANSCRIBE_INPUT_QUIET_MS + VOXT_CUTTER_QUIET_WINDOW_MS / 2;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="ft-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="ft-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="ft-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TWO ROUTES TO TEXT', '两条得到文字的路')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('dictation ends at a cursor · a file ends as a file', '听写落到光标 · 文件写成文件')}</text>

        {#if !phone}
          <rect x="20" y="70" width="330" height="280" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="185" y="94" text-anchor="middle" class="label">{t('DICTATION · TO THE CURSOR', '听写 · 到光标')}</text>
          <rect x="45" y="110" width="280" height="50" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="185" y="131" text-anchor="middle" class="detail">{t('microphone + helper (Ch. 2–3)', '麦克风 + helper（第 2–3 章）')}</text>
          <text x="185" y="149" text-anchor="middle" class="detail">{t('16 kHz audio frames', '16 kHz 音频帧')}</text>
          <line x1="185" y1="160" x2="185" y2="185" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="45" y="193" width="280" height="60" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="185" y="215" text-anchor="middle" class="label">{t('one dictation session', '一次听写 session')}</text>
          <text x="185" y="237" text-anchor="middle" class="detail">{t('model → cleanup → history?', '模型 → 整理 → 历史？')}</text>
          <line x1="185" y1="253" x2="185" y2="278" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="45" y="286" width="280" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="185" y="309" text-anchor="middle" class="label">{t('TEXT AT THE CURSOR', '光标处的文字')}</text>
          <text x="185" y="328" text-anchor="middle" class="detail">{t('history row if enabled', '历史开启时写一条')}</text>

          <rect x="370" y="70" width="330" height="280" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="535" y="94" text-anchor="middle" class="label amber">{t('FILE · TO SRT OR TXT', '文件 · 到 SRT 或 TXT')}</text>
          <rect x="395" y="110" width="280" height="50" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="535" y="131" text-anchor="middle" class="detail">{t('meeting.m4a on disk', '磁盘上的 meeting.m4a')}</text>
          <text x="535" y="149" text-anchor="middle" class="detail">{t('1-hour meeting · compressed sound (M4A)', '1 小时会议 · 压缩声音（M4A）')}</text>
          <line x1="535" y1="160" x2="535" y2="185" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="395" y="193" width="280" height="60" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="535" y="215" text-anchor="middle" class="label">{t('Voxt transcribe', 'Voxt transcribe')}</text>
          <text x="535" y="237" text-anchor="middle" class="detail">{t('reuses Transcribe\'s model, no session', '复用 Transcribe 的模型，不开 session')}</text>
          <line x1="535" y1="253" x2="535" y2="278" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="395" y="286" width="280" height="52" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="535" y="309" text-anchor="middle" class="label amber">{t('meeting.srt / talk.txt', 'meeting.srt / talk.txt')}</text>
          <text x="535" y="328" text-anchor="middle" class="detail">{t('SRT = subtitle · TXT = plain text', 'SRT = 字幕 · TXT = 纯文本')}</text>

          <text x="28" y="370" class="pt">·</text>
          <text x="38" y="370" class="detail">{t(`a one-hour meeting is ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} s of sound; decoded, 115.2 MB before recognition`, `一小时的会议是 ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} 秒的声音；解码后、识别前有 115.2 MB`)}</text>
          <text x="28" y="392" class="pt">·</text>
          <text x="38" y="392" class="detail">{t('both use Voxt and a speech model', '两条都用 Voxt 和语音模型')}</text>
          <text x="28" y="414" class="pt">·</text>
          <text x="38" y="414" class="detail">{t('the file route skips the session, cleanup and history row', '文件路线不经过 session、整理和历史记录')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Orange marks the route this chapter follows.', '橙色是本章要走的路线。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="250" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="92" text-anchor="middle" class="label">{t('DICTATION · TO THE CURSOR', '听写 · 到光标')}</text>
          <rect x="30" y="106" width="240" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="133" text-anchor="middle" class="detail">{t('microphone + helper', '麦克风 + helper')}</text>
          <line x1="150" y1="150" x2="150" y2="170" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="178" width="240" height="52" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="200" text-anchor="middle" class="label">{t('one dictation session', '一次听写 session')}</text>
          <text x="150" y="219" text-anchor="middle" class="detail">{t('model → cleanup → history?', '模型 → 整理 → 历史？')}</text>
          <line x1="150" y1="230" x2="150" y2="250" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="258" width="240" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="280" text-anchor="middle" class="label">{t('TEXT AT THE CURSOR', '光标处的文字')}</text>
          <text x="150" y="297" text-anchor="middle" class="detail">{t('history row if enabled', '历史开启时写一条')}</text>

          <rect x="15" y="330" width="270" height="250" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="354" text-anchor="middle" class="label amber">{t('FILE · TO SRT OR TXT', '文件 · 到 SRT 或 TXT')}</text>
          <rect x="30" y="368" width="240" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="395" text-anchor="middle" class="detail">{t('1-hour meeting · sound (M4A)', '1 小时会议 · 声音（M4A）')}</text>
          <line x1="150" y1="412" x2="150" y2="432" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="440" width="240" height="52" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="462" text-anchor="middle" class="label">{t('Voxt transcribe', 'Voxt transcribe')}</text>
          <text x="150" y="481" text-anchor="middle" class="detail">{t('Transcribe\'s model, no session', 'Transcribe 的模型，不开 session')}</text>
          <line x1="150" y1="492" x2="150" y2="512" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="520" width="240" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="542" text-anchor="middle" class="label amber">{t('meeting.srt / talk.txt', 'meeting.srt / talk.txt')}</text>
          <text x="150" y="559" text-anchor="middle" class="detail">{t('SRT = subtitle · TXT = plain text', 'SRT = 字幕 · TXT = 纯文本')}</text>

          <text x="20" y="606" class="pt">·</text>
          <text x="30" y="606" class="detail">{t(`a one-hour meeting is ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} s of sound`, `一小时的会议是 ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} 秒的声音`)}</text>
          <text x="30" y="628" class="detail">{t('decoded: 115.2 MB before recognition', '解码后有 115.2 MB 才识别')}</text>
          <text x="20" y="650" class="pt">·</text>
          <text x="30" y="650" class="detail">{t('both use Voxt and a speech model', '两条都用 Voxt 和语音模型')}</text>
          <text x="20" y="672" class="pt">·</text>
          <text x="30" y="672" class="detail">{t('the file route skips the session,', '文件路线不经过 session、')}</text>
          <text x="30" y="694" class="detail">{t('cleanup and history row', '整理和历史记录')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Orange marks the route this chapter follows.', '橙色是本章要走的路线。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('DECODE THE FILE TO PCM', '把文件转成 PCM')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t(phone ? 'PCM = raw sound · mono · 16-bit = 2 B' : 'PCM = raw sound the model reads; mono = one channel; 16-bit = 2 bytes a sample', 'PCM = 原始声音；单声道 = 一条；16 位 = 每个采样 2 字节')}</text>
        {#if !phone}
          <rect x="20" y="80" width="150" height="78" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="95" y="108" text-anchor="middle" class="label amber">talk.m4a</text>
          <text x="95" y="132" text-anchor="middle" class="detail">8 s {t('of sound', '声音')}</text>
          <line x1="172" y1="119" x2="212" y2="119" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="218" y="70" width="230" height="98" rx="9" fill="var(--bg)" stroke="var(--accent)" />
          <text x="333" y="94" text-anchor="middle" class="label">{t('Mac sound tool', 'Mac 声音工具')}</text>
          <text x="333" y="115" text-anchor="middle" class="detail">{t('macOS\'s own converter', 'Mac 自带的转换器')}</text>
          <text x="333" y="136" text-anchor="middle" class="mono">{t('16 kHz · mono · 16-bit', '16 kHz · 单声道 · 16 位')}</text>
          <line x1="450" y1="119" x2="490" y2="119" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="496" y="80" width="204" height="78" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="598" y="108" text-anchor="middle" class="label">audio.wav</text>
          <text x="598" y="132" text-anchor="middle" class="detail">{t('temporary file', '临时文件')}</text>

          <rect x="70" y="200" width="580" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="226" text-anchor="middle" class="formula">{VOXT_TRANSCRIBE_DEMO_SECONDS} s × {VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × {VOXT_PCM_BYTES_PER_SAMPLE} B = {pcm} B PCM</text>
          <text x="360" y="255" text-anchor="middle" class="formula">+ {VOXT_WAV_HEADER_BYTES} B {t('file header', '文件头')} = {VOXT_TRANSCRIBE_WAV_BYTES.toLocaleString('en-US')} B</text>
          <text x="360" y="282" text-anchor="middle" class="detail">{t('about 256 KB, smaller than one phone photo', '约 256 KB，比一张手机照片小')}</text>
          <text x="360" y="308" text-anchor="middle" class="formula">{t(`one hour: ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} × ${VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × ${VOXT_PCM_BYTES_PER_SAMPLE} B`, `一小时：${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} × ${VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × ${VOXT_PCM_BYTES_PER_SAMPLE} B`)}</text>
          <text x="360" y="330" text-anchor="middle" class="formula">{t(`= ${VOXT_TRANSCRIBE_MEETING_BYTES.toLocaleString('en-US')} B = ${VOXT_TRANSCRIBE_MEETING_MB.toFixed(1)} MB (≈${photoCount} photos at ${VOXT_TRANSCRIBE_PHOTO_MB} MB each)`, `= ${VOXT_TRANSCRIBE_MEETING_BYTES.toLocaleString('en-US')} B = ${VOXT_TRANSCRIBE_MEETING_MB.toFixed(1)} MB（每张 ${VOXT_TRANSCRIBE_PHOTO_MB} MB，≈${photoCount} 张）`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example; the temporary file is deleted after reading the PCM.', '构造的 8 秒例子；命令读完 PCM 后就删掉临时文件。')}</text>
        {:else}
          <rect x="40" y="70" width="220" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="95" text-anchor="middle" class="label amber">talk.m4a · 8 s</text>
          <text x="150" y="116" text-anchor="middle" class="detail">{t('on disk', '磁盘上')}</text>
          <line x1="150" y1="132" x2="150" y2="158" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="166" width="240" height="92" rx="9" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="190" text-anchor="middle" class="label">{t('Mac sound tool', 'Mac 声音工具')}</text>
          <text x="150" y="211" text-anchor="middle" class="detail">{t('macOS\'s own converter', 'Mac 自带的转换器')}</text>
          <text x="150" y="232" text-anchor="middle" class="mono">{t('16 kHz · mono · 16-bit', '16 kHz · 单声道 · 16 位')}</text>
          <line x1="150" y1="258" x2="150" y2="284" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="40" y="292" width="220" height="60" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="316" text-anchor="middle" class="label">audio.wav</text>
          <text x="150" y="337" text-anchor="middle" class="detail">{t('temporary file', '临时文件')}</text>

          <rect x="20" y="380" width="260" height="230" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="406" text-anchor="middle" class="formula">{VOXT_TRANSCRIBE_DEMO_SECONDS} s × {VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × {VOXT_PCM_BYTES_PER_SAMPLE} B</text>
          <text x="150" y="434" text-anchor="middle" class="formula">= {pcm} B PCM</text>
          <text x="150" y="466" text-anchor="middle" class="formula">+ {VOXT_WAV_HEADER_BYTES} B {t('header', '文件头')}</text>
          <text x="150" y="494" text-anchor="middle" class="formula">= {VOXT_TRANSCRIBE_WAV_BYTES.toLocaleString('en-US')} B</text>
          <text x="150" y="526" text-anchor="middle" class="detail">{t('about 256 KB', '约 256 KB')}</text>
          <text x="150" y="552" text-anchor="middle" class="formula">{t(`one hour: ${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} × ${VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × ${VOXT_PCM_BYTES_PER_SAMPLE} B`, `一小时：${VOXT_TRANSCRIBE_MEETING_SECONDS.toLocaleString('en-US')} × ${VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × ${VOXT_PCM_BYTES_PER_SAMPLE} B`)}</text>
          <text x="150" y="574" text-anchor="middle" class="formula">{t(`= ${VOXT_TRANSCRIBE_MEETING_BYTES.toLocaleString('en-US')} B = ${VOXT_TRANSCRIBE_MEETING_MB.toFixed(1)} MB`, `= ${VOXT_TRANSCRIBE_MEETING_BYTES.toLocaleString('en-US')} B = ${VOXT_TRANSCRIBE_MEETING_MB.toFixed(1)} MB`)}</text>
          <text x="150" y="596" text-anchor="middle" class="detail">{t(`≈${photoCount} photos at ${VOXT_TRANSCRIBE_PHOTO_MB} MB each`, `每张 ${VOXT_TRANSCRIBE_PHOTO_MB} MB，≈${photoCount} 张`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8 s example; file deleted after reading.', '构造的 8 秒例子；读完删掉临时文件。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('SEND THE PCM TO THE RUNNING APP', '把 PCM 送给运行中的应用')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('socket = a door between two programs on this Mac', 'socket = 同一台 Mac 上两个程序之间的一扇门')}</text>
        {#if !phone}
          <rect x="20" y="72" width="170" height="64" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="105" y="96" text-anchor="middle" class="label amber">{t('the command', '命令')}</text>
          <text x="105" y="118" text-anchor="middle" class="mono">Voxt transcribe</text>
          <line x1="192" y1="104" x2="214" y2="104" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="220" y="80" width="130" height="48" rx="24" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="285" y="100" text-anchor="middle" class="label">transcribe.sock</text>
          <text x="285" y="118" text-anchor="middle" class="detail">{t('your account only', '只有你的账户')}</text>
          <line x1="352" y1="104" x2="374" y2="104" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="380" y="72" width="320" height="64" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="540" y="96" text-anchor="middle" class="label">{t('running Voxt', '运行中的 Voxt')}</text>
          <text x="540" y="118" text-anchor="middle" class="detail">{t('picks Transcribe\'s model', '选 Transcribe 的模型')}</text>

          <text x="36" y="150" class="mono">{requestLine}</text>
          <rect x="20" y="164" width="680" height="186" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="36" y="194" class="label">{t('PCM →', 'PCM →')}</text>
          <rect x="110" y="180" width="550" height="20" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
          <line x1="660" y1="190" x2="676" y2="190" stroke="var(--accent)" stroke-width="2" marker-end="url(#ft-arrow-accent)" />
          <text x="400" y="220" text-anchor="middle" class="detail">{t(`${pcm} bytes, still being sent`, `${pcm} 字节，还在发送`)}</text>
          <text x="36" y="252" class="label">{t('← one reply per piece of speech', '← 每段讲话一行回复')}</text>
          <line x1="660" y1="258" x2="110" y2="258" stroke="var(--accent)" stroke-width="2" marker-end="url(#ft-arrow-accent)" />
          {#each replyLines as line, i}
            <text x="120" y={286 + i * 22} class="mono">{line}</text>
          {/each}
          <text x="36" y="350" class="detail">{t('op = action · segment = one cue · done + count = finished, how many', 'op = 要做什么 · segment = 一句 · done + count = 完成和句数')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No network port; only your account can open it; Voxt reads none of your folders.', '没有网络端口；只有你的账户能打开；Voxt 不读你的文件夹。')}</text>
        {:else}
          <rect x="30" y="70" width="240" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="94" text-anchor="middle" class="label amber">{t('the command', '命令')}</text>
          <text x="150" y="116" text-anchor="middle" class="mono">Voxt transcribe</text>
          <line x1="150" y1="134" x2="150" y2="154" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="70" y="158" width="160" height="48" rx="24" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="178" text-anchor="middle" class="label">transcribe.sock</text>
          <text x="150" y="196" text-anchor="middle" class="detail">{t('your account only', '只有你的账户')}</text>
          <line x1="150" y1="208" x2="150" y2="228" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="232" width="240" height="56" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="255" text-anchor="middle" class="label">{t('running Voxt', '运行中的 Voxt')}</text>
          <text x="150" y="275" text-anchor="middle" class="detail">{t('picks Transcribe\'s model', '选 Transcribe 的模型')}</text>

          <text x="26" y="316" class="mono small">{requestHead}</text>
          <text x="26" y="336" class="mono small">{requestTail}</text>
          <rect x="15" y="348" width="270" height="290" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="26" y="374" class="label">PCM →</text>
          <rect x="30" y="384" width="240" height="18" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
          <line x1="270" y1="393" x2="282" y2="393" stroke="var(--accent)" stroke-width="2" marker-end="url(#ft-arrow-accent)" />
          <text x="150" y="414" text-anchor="middle" class="detail">{t(`${pcm} bytes, still being sent`, `${pcm} 字节，还在发送`)}</text>
          <text x="26" y="444" class="label">← {t('one reply per piece', '每段讲话一行回复')}</text>
          <line x1="270" y1="450" x2="30" y2="450" stroke="var(--accent)" stroke-width="2" marker-end="url(#ft-arrow-accent)" />
          <text x="36" y="474" class="mono small">{replyLines[0]}</text>
          <text x="36" y="496" class="mono small">{replyLines[1]}</text>
          <text x="36" y="518" class="mono small">{replyLines[2]}</text>
          <text x="36" y="536" class="detail">{t('op = action · segment = one cue', 'op = 要做什么 · segment = 一句')}</text>
          <text x="36" y="556" class="detail">{t('done + count = finished, how many', 'done + count = 完成和句数')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No network port; only your account can open it.', '没有网络端口；只有你的账户能打开。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('A PAUSE ENDS A CUE', '停顿结束一句')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('cue = one stretch of speech sent to the model', '一句 = 送去模型的一段讲话')}</text>
        {#if !phone}
          <text x="174" y="84" text-anchor="middle" class="label">{t('CUE 1', '第 1 句')} 0.00–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])} s</text>
          <text x="490" y="84" text-anchor="middle" class="label">{t('CUE 2', '第 2 句')} {sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[1])} s</text>
          <line x1="40" y1="96" x2="308" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="40" y1="90" x2="40" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="308" y1="90" x2="308" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="96" x2="668" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="90" x2="312" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="668" y1="90" x2="668" y2="102" stroke="var(--accent)" stroke-width="2" />
          {#each Array.from({ length: 160 }, (_, i) => i) as i}
            {@const time = i / 20}
            {@const speech = (time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[0] / 1000) || (time >= VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1] / 1000 && time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[1] / 1000)}
            {@const height = speech ? 10 + (i * 13 % 40) : 3}
            <line x1={40 + i * 4} y1={150 - height / 2} x2={40 + i * 4} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="3" stroke-linecap="round" />
          {/each}
          <line x1={40 + clock / 8000 * 636} y1="128" x2={40 + clock / 8000 * 636} y2="172" stroke="var(--fg)" stroke-width="2" />
          <circle cx={40 + clock / 8000 * 636} cy="124" r="4" fill="var(--fg)" />
          <rect x="272" y="182" width="36" height="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#if quietNow}<rect x="272" y="182" width="36" height="12" fill="none" stroke="var(--fg)" stroke-width="2" />{/if}
          <text x="290" y="214" text-anchor="middle" class="detail amber">{sec(VOXT_TRANSCRIBE_SPEECH_ENDS_MS[0])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])} s</text>
          <text x="290" y="232" text-anchor="middle" class="detail">{t(`${VOXT_CUTTER_SILENCE_MS} ms quiet ends cue 1`, `${VOXT_CUTTER_SILENCE_MS} ms 安静结束第 1 句`)}</text>
          <text x="40" y="270" class="pt">·</text>
          <text x="50" y="270" class="detail">{t(`the cutter looks at ${VOXT_CUTTER_FRAME_MS} ms slices`, `切句器每 ${VOXT_CUTTER_FRAME_MS} ms 看一小片`)}</text>
          <text x="40" y="294" class="pt">·</text>
          <text x="50" y="294" class="detail">{t('the cue keeps that quiet at its end', '句尾的安静也一起留下')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example; quiet parts depend on the sound.', '构造的 8 秒例子；安静段由实际声音决定。')}</text>
          {#if !reduced}<LoopProgress ms={lapMs} {lap} />{/if}
        {:else}
          <text x="65" y="82" text-anchor="middle" class="label">{t('CUE 1', '第 1 句')}</text>
          <text x="222" y="82" text-anchor="middle" class="label">{t('CUE 2', '第 2 句')}</text>
          <line x1="20" y1="94" x2="129" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="20" y1="88" x2="20" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="129" y1="88" x2="129" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="131" y1="94" x2="276" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="131" y1="88" x2="131" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="276" y1="88" x2="276" y2="100" stroke="var(--accent)" stroke-width="2" />
          {#each Array.from({ length: 80 }, (_, i) => i) as i}
            {@const time = i / 10}
            {@const x = 20 + i * 3.25}
            {@const speech = (time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[0] / 1000) || (time >= VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1] / 1000 && time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[1] / 1000)}
            {@const height = speech ? 8 + (i * 13 % 30) : 3}
            <line x1={x} y1={150 - height / 2} x2={x} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="2.5" stroke-linecap="round" />
          {/each}
          <line x1={20 + clock / 8000 * 256} y1="132" x2={20 + clock / 8000 * 256} y2="168" stroke="var(--fg)" stroke-width="2" />
          <circle cx={20 + clock / 8000 * 256} cy="128" r="3.5" fill="var(--fg)" />
          <rect x="113" y="172" width="14" height="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#if quietNow}<rect x="113" y="172" width="14" height="10" fill="none" stroke="var(--fg)" stroke-width="2" />{/if}
          <text x="65" y="178" text-anchor="middle" class="detail">0.00–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])} s</text>
          <text x="222" y="178" text-anchor="middle" class="detail">{sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[1])} s</text>
          <text x="30" y="216" class="pt">·</text>
          <text x="40" y="216" class="detail">{t('2.90–3.35 s: 450 ms quiet ends a cue', '2.90–3.35 秒：450 ms 安静结束一句')}</text>
          <text x="30" y="242" class="pt">·</text>
          <text x="40" y="242" class="detail">{t('10 ms slices', '每片 10 ms')}</text>
          <text x="30" y="268" class="pt">·</text>
          <text x="40" y="268" class="detail">{t('the quiet stays with the cue', '安静跟着句子留下')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example.', '构造的 8 秒例子。')}</text>
          {#if !reduced}<LoopProgress ms={lapMs} {lap} x={232} y={62} />{/if}
        {/if}
      {:else if step === 4}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('A CUE STARTS A LITTLE EARLY', '一句稍微提前开始')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('so the first consonant is not cut off', '这样第一个辅音不会被切掉')}</text>
        {#if !phone}
          <text x="174" y="84" text-anchor="middle" class="label">{t('CUE 1', '第 1 句')} 0.00–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])} s</text>
          <text x="490" y="84" text-anchor="middle" class="label">{t('CUE 2', '第 2 句')} {sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[1])} s</text>
          <line x1="40" y1="96" x2="308" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="40" y1="90" x2="40" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="308" y1="90" x2="308" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="96" x2="668" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="90" x2="312" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="668" y1="90" x2="668" y2="102" stroke="var(--accent)" stroke-width="2" />
          {#each Array.from({ length: 160 }, (_, i) => i) as i}
            {@const time = i / 20}
            {@const speech = (time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[0] / 1000) || (time >= VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1] / 1000 && time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[1] / 1000)}
            {@const height = speech ? 10 + (i * 13 % 40) : 3}
            <line x1={40 + i * 4} y1={150 - height / 2} x2={40 + i * 4} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="3" stroke-linecap="round" />
          {/each}
          <rect x="312" y="182" width="24" height="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="368" y="214" text-anchor="middle" class="detail">{VOXT_CUTTER_PREROLL_MS} ms</text>
          <text x="368" y="232" text-anchor="middle" class="detail">{t('starts early', '提前开始')}</text>
          <text x="40" y="270" class="pt">·</text>
          <text x="50" y="270" class="detail">{t(`speech starts at ${sec(VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1])} s; the cue starts at ${sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])} s`, `讲话从 ${sec(VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1])} 秒开始；句子从 ${sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])} 秒开始`)}</text>
          <text x="40" y="294" class="pt">·</text>
          <text x="50" y="294" class="detail">{t('that keeps the first consonant', '这样保住第一个辅音')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example; the cue starts before its speech.', '构造的 8 秒例子；句子在讲话前开始。')}</text>
        {:else}
          <text x="65" y="82" text-anchor="middle" class="label">{t('CUE 1', '第 1 句')}</text>
          <text x="222" y="82" text-anchor="middle" class="label">{t('CUE 2', '第 2 句')}</text>
          <line x1="20" y1="94" x2="129" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="20" y1="88" x2="20" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="129" y1="88" x2="129" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="131" y1="94" x2="276" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="131" y1="88" x2="131" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="276" y1="88" x2="276" y2="100" stroke="var(--accent)" stroke-width="2" />
          {#each Array.from({ length: 80 }, (_, i) => i) as i}
            {@const time = i / 10}
            {@const x = 20 + i * 3.25}
            {@const speech = (time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[0] / 1000) || (time >= VOXT_TRANSCRIBE_SPEECH_STARTS_MS[1] / 1000 && time <= VOXT_TRANSCRIBE_SPEECH_ENDS_MS[1] / 1000)}
            {@const height = speech ? 8 + (i * 13 % 30) : 3}
            <line x1={x} y1={150 - height / 2} x2={x} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="2.5" stroke-linecap="round" />
          {/each}
          <rect x="131" y="182" width="10" height="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="216" text-anchor="middle" class="detail">{VOXT_CUTTER_PREROLL_MS} ms</text>
          <text x="150" y="234" text-anchor="middle" class="detail">{t('starts early', '提前开始')}</text>
          <text x="30" y="270" class="pt">·</text>
          <text x="40" y="270" class="detail">{t('speech at 3.70 s', '讲话在 3.70 秒')}</text>
          <text x="30" y="296" class="pt">·</text>
          <text x="40" y="296" class="detail">{t('cue at 3.40 s', '句子在 3.40 秒')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example.', '构造的 8 秒例子。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('NO PAUSE? CUT AT THE QUIETEST POINT', '没有停顿？在最安静处切')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t(`the quietest ${VOXT_CUTTER_QUIET_WINDOW_MS} ms in the last second`, `在最后 1 秒找最安静的 ${VOXT_CUTTER_QUIET_WINDOW_MS} ms`)}</text>
        {#if !phone}
          <text x="240" y="84" text-anchor="middle" class="label">{t('CUE 1', '第 1 段')} 0–{sec(VOXT_TRANSCRIBE_CUT_MS)} s</text>
          <text x={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000) + 90} y="84" text-anchor="middle" class="label">{t('CUE 2', '第 2 段')} {sec(VOXT_TRANSCRIBE_CUT_MS)}–{VOXT_TRANSCRIBE_LONG_SECONDS} s</text>
          <line x1="40" y1="96" x2={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="40" y1="90" x2="40" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="90" x2={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="96" x2="680" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="680" y1="90" x2="680" y2="102" stroke="var(--accent)" stroke-width="2" />
          <rect x={40 + 640 * searchStartMs / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y="118" width={640 * (searchEndMs - searchStartMs) / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} height="64" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={40 + 640 * (searchStartMs + searchEndMs) / 2 / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y="200" text-anchor="middle" class="detail amber">{t(`search ${searchStartMs / 1000}–${searchEndMs / 1000} s`, `在 ${searchStartMs / 1000}–${searchEndMs / 1000} 秒找`)}</text>
          {#each Array.from({ length: 180 }, (_, i) => i) as i}
            {@const time = i * VOXT_TRANSCRIBE_LONG_SECONDS * 1000 / 180}
            {@const quiet = time >= quietFromMs && time <= quietToMs}
            {@const height = quiet ? 3 : 10 + (i * 11 % 42)}
            <line x1={40 + 640 * i / 180} y1={150 - height / 2} x2={40 + 640 * i / 180} y2={150 + height / 2} stroke={quiet ? 'var(--muted)' : 'var(--accent)'} stroke-width="2.5" stroke-linecap="round" />
          {/each}
          <line x1={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="116" x2={40 + 640 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="184" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
          <text x="40" y="238" class="pt">·</text>
          <text x="50" y="238" class="detail">{t(`at ${VOXT_CUTTER_MAX_SEGMENT_S} s, no 450 ms pause arrived`, `到 ${VOXT_CUTTER_MAX_SEGMENT_S} 秒还没有 450 ms 停顿`)}</text>
          <text x="40" y="264" class="pt">·</text>
          <text x="50" y="264" class="detail">{t(`cut inside the quietest ${VOXT_CUTTER_QUIET_WINDOW_MS} ms`, `在最安静的 ${VOXT_CUTTER_QUIET_WINDOW_MS} ms 里切`)}</text>
          <text x="40" y="290" class="pt">·</text>
          <text x="50" y="290" class="detail">{t(`the rest is ${sec(VOXT_TRANSCRIBE_REMAIN_MS)} s and becomes the next cue`, `剩下 ${sec(VOXT_TRANSCRIBE_REMAIN_MS)} 秒，成为下一句`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 9-second stretch; quiet 6.45–6.55 s, reported cut 6.51 s.', '构造的 9 秒连续讲话；安静窗 6.45–6.55 秒，报告切点 6.51 秒。')}</text>
        {:else}
          <text x="70" y="82" text-anchor="middle" class="label">{t('CUE 1', '第 1 段')}</text>
          <text x="225" y="82" text-anchor="middle" class="label">{t('CUE 2', '第 2 段')}</text>
          <line x1="20" y1="94" x2={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="20" y1="88" x2="20" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="88" x2={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="94" x2="280" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="280" y1="88" x2="280" y2="100" stroke="var(--accent)" stroke-width="2" />
          <rect x={20 + 260 * searchStartMs / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y="108" width={260 * (searchEndMs - searchStartMs) / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} height="52" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#each Array.from({ length: 90 }, (_, i) => i) as i}
            {@const time = i * VOXT_TRANSCRIBE_LONG_SECONDS * 1000 / 90}
            {@const quiet = time >= quietFromMs && time <= quietToMs}
            {@const height = quiet ? 3 : 8 + (i * 11 % 30)}
            <line x1={20 + 260 * i / 90} y1={142 - height / 2} x2={20 + 260 * i / 90} y2={142 + height / 2} stroke={quiet ? 'var(--muted)' : 'var(--accent)'} stroke-width="2.2" stroke-linecap="round" />
          {/each}
          <line x1={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y1="106" x2={20 + 260 * VOXT_TRANSCRIBE_CUT_MS / (VOXT_TRANSCRIBE_LONG_SECONDS * 1000)} y2="174" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
          <text x="70" y="198" text-anchor="middle" class="detail">0–{sec(VOXT_TRANSCRIBE_CUT_MS)} s</text>
          <text x="238" y="198" text-anchor="middle" class="detail">{sec(VOXT_TRANSCRIBE_CUT_MS)}–{VOXT_TRANSCRIBE_LONG_SECONDS} s</text>
          <text x="150" y="226" text-anchor="middle" class="detail amber">{t(`search ${searchStartMs / 1000}–${searchEndMs / 1000} s`, `在 ${searchStartMs / 1000}–${searchEndMs / 1000} 秒找`)}</text>
          <text x="30" y="262" class="pt">·</text>
          <text x="40" y="262" class="detail">{t('no 450 ms pause by 7 s', '到 7 秒还没有停顿')}</text>
          <text x="30" y="288" class="pt">·</text>
          <text x="40" y="288" class="detail">{t('cut in the quietest 100 ms', '在最安静的 100 ms 里切')}</text>
          <text x="30" y="314" class="pt">·</text>
          <text x="40" y="314" class="detail">{t(`the rest is ${sec(VOXT_TRANSCRIBE_REMAIN_MS)} s, the next cue`, `剩下 ${sec(VOXT_TRANSCRIBE_REMAIN_MS)} 秒，成为下一句`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 9-second example.', '构造的 9 秒例子。')}</text>
        {/if}
      {:else if step === 6}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE CUE AT A TIME', '一句一句识别')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('the model set for Transcribe does the work', '干活的是 Transcribe 选定的模型')}</text>
        {#if !phone}
          <rect x="170" y="70" width="380" height="64" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="95" text-anchor="middle" class="label">{t('Transcribe\'s speech model', 'Transcribe 的语音模型')}</text>
          <text x="360" y="117" text-anchor="middle" class="detail">{t('chosen in Settings → Speech models', '在设置 → Speech models 里选')}</text>
          {#each [0, 1] as i}
            {@const y = 168 + i * 100}
            <rect x="35" y={y} width="190" height="62" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="130" y={y + 24} text-anchor="middle" class="label amber">{t('CUE', '第')} {i + 1}{t('', ' 句')}</text>
            <text x="130" y={y + 46} text-anchor="middle" class="detail">{sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[i])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[i])} s</text>
            <line x1="228" y1={y + 31} x2="300" y2={y + 31} stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
            <rect x="306" y={y} width="380" height="62" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="496" y={y + 38} text-anchor="middle" class="result">“{VOXT_TRANSCRIBE_CUE_TEXT[i]}”</text>
          {/each}
          <text x={W / 2} y={H - 32} text-anchor="middle" class="detail">{t('an empty answer is left out', '返回空文字的句子会被丢掉')}</text>
        {:else}
          <rect x="25" y="68" width="250" height="58" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="93" text-anchor="middle" class="label">{t('Transcribe\'s speech model', 'Transcribe 的语音模型')}</text>
          <text x="150" y="113" text-anchor="middle" class="detail">{t('Settings → Speech models', '设置 → Speech models')}</text>
          {#each [0, 1] as i}
            {@const y = 150 + i * 150}
            <rect x="25" y={y} width="250" height="52" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y={y + 21} text-anchor="middle" class="label amber">{t('CUE', '第')} {i + 1}{t('', ' 句')} · {sec(VOXT_TRANSCRIBE_CUE_STARTS_MS[i])}–{sec(VOXT_TRANSCRIBE_CUE_ENDS_MS[i])} s</text>
            <text x="150" y={y + 42} text-anchor="middle" class="detail">{t('sent to the model', '送给模型')}</text>
            <line x1="150" y1={y + 52} x2="150" y2={y + 76} stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
            <rect x="25" y={y + 84} width="250" height="48" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y={y + 114} text-anchor="middle" class="result small">“{VOXT_TRANSCRIBE_CUE_TEXT[i]}”</text>
          {/each}
          <text x={W / 2} y={H - 32} text-anchor="middle" class="detail">{t('an empty answer is left out', '返回空文字的句子会被丢掉')}</text>
        {/if}
      {:else if step === 7}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('WRITE SRT OR TXT', '写成 SRT 或 TXT')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('the same two cues, two file formats', '同样的两句，两种文件格式')}</text>
        {#if !phone}
          <rect x="25" y="72" width="340" height="332" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="195" y="96" text-anchor="middle" class="label">{t('SRT · CUES WITH TIMES', 'SRT · 带时间的字幕')}</text>
          <text x="40" y="128" class="mono">1</text>
          <text x="40" y="148" class="mono">{srt(VOXT_TRANSCRIBE_CUE_STARTS_MS[0])} {arrow} {srt(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])}</text>
          <text x="40" y="168" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="40" y="204" class="mono">2</text>
          <text x="40" y="224" class="mono">{srt(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])} {arrow} {srt(VOXT_TRANSCRIBE_CUE_ENDS_MS[1])}</text>
          <text x="40" y="244" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="195" y="288" text-anchor="middle" class="detail">{t('numbered cue + start + end + text', '编号 + 开始 + 结束 + 文字')}</text>
          <text x="195" y="310" text-anchor="middle" class="detail">{t('players show it as subtitles', '播放器把它当字幕显示')}</text>
          <text x="195" y="332" text-anchor="middle" class="detail">{t('times: HH:MM:SS,mmm (hours:minutes:seconds,ms)', '时间：时:分:秒,毫秒')}</text>

          <rect x="385" y="72" width="310" height="332" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="540" y="96" text-anchor="middle" class="label amber">{t('TXT · ONE LINE A CUE', 'TXT · 每句一行')}</text>
          <text x="400" y="136" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="400" y="162" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="540" y="220" text-anchor="middle" class="detail">{t('no numbers, no times', '没有编号，没有时间')}</text>
          <text x="540" y="242" text-anchor="middle" class="detail">{t('easy to read or feed to a script', '方便阅读或交给脚本')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: fileasr.go Write.', '出处：fileasr.go 的 Write。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="270" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="92" text-anchor="middle" class="label">{t('SRT · CUES WITH TIMES', 'SRT · 带时间的字幕')}</text>
          <text x="26" y="122" class="mono small">1</text>
          <text x="26" y="142" class="mono small">{srt(VOXT_TRANSCRIBE_CUE_STARTS_MS[0])}</text>
          <text x="26" y="160" class="mono small">{arrow} {srt(VOXT_TRANSCRIBE_CUE_ENDS_MS[0])}</text>
          <text x="26" y="180" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="26" y="214" class="mono small">2</text>
          <text x="26" y="234" class="mono small">{srt(VOXT_TRANSCRIBE_CUE_STARTS_MS[1])}</text>
          <text x="26" y="252" class="mono small">{arrow} {srt(VOXT_TRANSCRIBE_CUE_ENDS_MS[1])}</text>
          <text x="26" y="272" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="150" y="306" text-anchor="middle" class="detail">{t('number + times + text', '编号 + 时间 + 文字')}</text>
          <text x="150" y="324" text-anchor="middle" class="detail">{t('times: HH:MM:SS,mmm (h:m:s,ms)', '时间：时:分:秒,毫秒')}</text>

          <rect x="15" y="352" width="270" height="170" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="376" text-anchor="middle" class="label amber">{t('TXT · ONE LINE A CUE', 'TXT · 每句一行')}</text>
          <text x="26" y="410" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="26" y="434" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="150" y="478" text-anchor="middle" class="detail">{t('no numbers, no times', '没有编号，没有时间')}</text>
          <text x="150" y="500" text-anchor="middle" class="detail">{t('easy to read or feed to a script', '方便阅读或交给脚本')}</text>

          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: fileasr.go Write.', '出处：fileasr.go 的 Write。')}</text>
        {/if}
      {:else if step === 8}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('FAILED RECOGNITION WRITES NOTHING', '识别失败就不写文件')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('the output opens only after every cue succeeds', '每一句都成功后才打开输出')}</text>
        {#if !phone}
          <rect x="25" y="76" width="315" height="140" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="182" y="102" text-anchor="middle" class="label">{t('RECOGNITION FAILS', '识别失败')}</text>
          <text x="45" y="134" class="detail">{t('✗ no output file is opened', '✗ 不打开输出文件')}</text>
          <text x="45" y="162" class="detail">{t('✗ an old file stays as it was', '✗ 旧文件保持原样')}</text>
          <text x="45" y="190" class="detail">{t('✗ no new file appears', '✗ 不会出现新文件')}</text>

          <rect x="380" y="76" width="315" height="140" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="537" y="102" text-anchor="middle" class="label">{t('RECOGNITION SUCCEEDS', '识别成功')}</text>
          <text x="400" y="134" class="detail">{t('the output opens', '这时才打开输出')}</text>
          <text x="400" y="162" class="detail">{t('SRT or TXT is written once', '一次写成 SRT 或 TXT')}</text>

          <rect x="25" y="248" width="670" height="92" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="45" y="278" class="label">{t('BUT A DISK-WRITE FAILURE CAN STILL HURT', '但写盘失败仍可能出问题')}</text>
          <text x="45" y="306" class="detail">{t('an old file can be truncated, or part of a new file left behind', '旧文件可能被截断，也可能留下部分新文件')}</text>
          <text x="45" y="328" class="detail">{t('recognition success does not make the write atomic', '识别成功不代表写盘是原子的')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_cli.go:73-100.', '出处：transcribe_cli.go:73-100。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="142" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="150" y="94" text-anchor="middle" class="label">{t('RECOGNITION FAILS', '识别失败')}</text>
          <text x="30" y="126" class="detail">{t('✗ no output file is opened', '✗ 不打开输出文件')}</text>
          <text x="30" y="152" class="detail">{t('✗ an old file stays as it was', '✗ 旧文件保持原样')}</text>
          <text x="30" y="178" class="detail">{t('✗ no new file appears', '✗ 不会出现新文件')}</text>

          <rect x="15" y="228" width="270" height="112" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="254" text-anchor="middle" class="label">{t('RECOGNITION SUCCEEDS', '识别成功')}</text>
          <text x="30" y="286" class="detail">{t('the output opens', '这时才打开输出')}</text>
          <text x="30" y="312" class="detail">{t('SRT or TXT is written once', '一次写成 SRT 或 TXT')}</text>

          <rect x="15" y="356" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="30" y="384" class="label">{t('BUT A DISK-WRITE FAILURE CAN STILL HURT', '但写盘失败仍可能出问题')}</text>
          <text x="30" y="412" class="detail">{t('an old file can be truncated,', '旧文件可能被截断，')}</text>
          <text x="30" y="436" class="detail">{t('or part of a new file left behind', '也可能留下部分新文件')}</text>
          <text x="30" y="460" class="detail">{t('the write is not atomic', '写盘不是原子的')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_cli.go:73-100.', '出处：transcribe_cli.go:73-100。')}</text>
        {/if}
      {:else if step === 9}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('NO HISTORY OR RECORDING', '不写历史，不留录音')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('dictation may write history; this route does not', '听写可能写历史；这条路线不写')}</text>
        {#if !phone}
          <rect x="25" y="72" width="330" height="160" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="96" text-anchor="middle" class="label">{t('NOT WRITTEN', '不留下')}</text>
          <text x="45" y="128" class="detail">{t('✗ a history row', '✗ 历史记录')}</text>
          <text x="45" y="156" class="detail">{t('✗ a recording saved by Voxt', '✗ Voxt 保存的录音')}</text>
          <text x="45" y="184" class="detail">{t('✗ the text in the log', '✗ 日志里的文字')}</text>
          <text x="45" y="212" class="detail">{t('(no cursor, no session)', '（没有光标，没有 session）')}</text>

          <rect x="365" y="72" width="330" height="160" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="530" y="96" text-anchor="middle" class="label amber">{t('WRITTEN', '留下')}</text>
          <text x="385" y="128" class="detail">{t("one line in the app's own log (not Ch. 9's access log):", '应用自己的日志（不是第 9 章的访问日志）：')}</text>
          <text x="385" y="152" class="mono small">transcribed a file for the</text>
          <text x="385" y="170" class="mono small">command line: {VOXT_TRANSCRIBE_DEMO_SECONDS}s of audio,</text>
          <text x="385" y="188" class="mono small">{VOXT_TRANSCRIBE_CUE_COUNT} segments</text>
          <text x="530" y="216" text-anchor="middle" class="detail">{t('length and cue count, never the text', '只有长度和句子数，没有文字')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: Voxt/transcribe_socket.go.', '出处：Voxt/transcribe_socket.go。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="190" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="92" text-anchor="middle" class="label">{t('NOT WRITTEN', '不留下')}</text>
          <text x="30" y="124" class="detail">{t('✗ a history row', '✗ 历史记录')}</text>
          <text x="30" y="152" class="detail">{t('✗ a recording saved by Voxt', '✗ Voxt 保存的录音')}</text>
          <text x="30" y="180" class="detail">{t('✗ the text in the log', '✗ 日志里的文字')}</text>
          <text x="30" y="208" class="detail">{t('no cursor, no session', '没有光标，没有 session')}</text>

          <rect x="15" y="276" width="270" height="190" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="300" text-anchor="middle" class="label amber">{t('WRITTEN', '留下')}</text>
          <text x="30" y="330" class="detail">{t("app's own log (not Ch. 9's):", '应用自己的日志（不是第 9 章）：')}</text>
          <text x="30" y="354" class="mono small">transcribed a file for the</text>
          <text x="30" y="374" class="mono small">command line: {VOXT_TRANSCRIBE_DEMO_SECONDS}s of</text>
          <text x="30" y="394" class="mono small">audio, {VOXT_TRANSCRIBE_CUE_COUNT} segments</text>
          <text x="150" y="424" text-anchor="middle" class="detail">{t('length and cue count only', '只有长度和句子数')}</text>
          <text x="150" y="446" text-anchor="middle" class="detail">{t('never the text', '没有文字')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_socket.go, docs/transcribe.md.', '出处：transcribe_socket.go、docs/transcribe.md。')}</text>
        {/if}
      {:else if step === 10}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('WHERE THE AUDIO GOES', '声音去哪里')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{phone ? t('set for Transcribe: this Mac or a remote', '按 Transcribe：本机或远端') : t('the model set for Transcribe: this Mac or a remote service', '按 Transcribe 的设置：本机或远端服务')}</text>
        {#if !phone}
          <rect x="255" y="76" width="210" height="54" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="100" text-anchor="middle" class="label">{t('THE DECODED AUDIO', '解码后的声音')}</text>
          <text x="360" y="120" text-anchor="middle" class="detail">{t('sent as each cue is cut', '每切出一句就送一次')}</text>
          <line x1="360" y1="130" x2="360" y2="150" stroke="var(--muted)" stroke-width="2" />
          <line x1="190" y1="150" x2="530" y2="150" stroke="var(--muted)" stroke-width="2" />
          <line x1="190" y1="150" x2="190" y2="168" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <line x1="530" y1="150" x2="530" y2="168" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />

          <rect x="55" y="170" width="270" height="74" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="190" y="198" text-anchor="middle" class="detail">{t('the on-device speech model', '本机语音模型')}</text>
          <text x="190" y="222" text-anchor="middle" class="detail">{t('runs on this Mac', '就在这台 Mac 上跑')}</text>
          <rect x="395" y="170" width="270" height="74" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="530" y="198" text-anchor="middle" class="detail">{t('the remote speech service', '远端语音服务')}</text>
          <text x="530" y="222" text-anchor="middle" class="detail">{t('set for Transcribe', '按 Transcribe 的设置')}</text>

          <text x={W / 2} y="282" text-anchor="middle" class="detail">{t('both are the model chosen for Transcribe', '两者都是 Transcribe 选定的模型')}</text>
          <text x={W / 2} y={H - 46} text-anchor="middle" class="cut">{t('SO HOW DO THESE MODEL FILES REACH THIS MAC?', '那么这些模型文件怎样到达这台 Mac？')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_socket.go:64-80, docs/transcribe.md.', '出处：transcribe_socket.go:64-80、docs/transcribe.md。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="56" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="92" text-anchor="middle" class="label">{t('THE DECODED AUDIO', '解码后的声音')}</text>
          <text x="150" y="112" text-anchor="middle" class="detail">{t('sent as each cue is cut', '每切出一句就送一次')}</text>
          <line x1="150" y1="124" x2="150" y2="146" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="15" y="154" width="270" height="84" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="182" text-anchor="middle" class="detail">{t('the on-device speech model', '本机语音模型')}</text>
          <text x="150" y="206" text-anchor="middle" class="detail">{t('runs on this Mac', '就在这台 Mac 上跑')}</text>
          <text x="150" y="266" text-anchor="middle" class="detail">{t('or', '或者')}</text>
          <rect x="15" y="286" width="270" height="84" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="314" text-anchor="middle" class="detail">{t('the remote speech service', '远端语音服务')}</text>
          <text x="150" y="338" text-anchor="middle" class="detail">{t('set for Transcribe', '按 Transcribe 的设置')}</text>
          <text x="150" y="400" text-anchor="middle" class="detail">{t('both chosen for Transcribe', '都是 Transcribe 选定的')}</text>
          <text x={W / 2} y={H - 66} text-anchor="middle" class="cut">{t('SO HOW DO THESE MODEL FILES', '那么这些模型文件')}</text>
          <text x={W / 2} y={H - 44} text-anchor="middle" class="cut">{t('REACH THIS MAC?', '怎样到达这台 Mac？')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_socket.go:64-80.', '出处：transcribe_socket.go:64-80。')}</text>
        {/if}
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 13px; font-weight: 600; fill: var(--accent); }
  .label { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 13px; font-weight: 650; fill: var(--fg); }
  .result { font-size: 20px; font-weight: 650; fill: var(--fg); }
  .result.small { font-size: 16px; }
  .mono { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .mono.small { font-size: 10.5px; }
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
    .mono.small { font-size: 9.5px; }
    .result { font-size: 16px; }
    .result.small { font-size: 13px; }
  }
</style>
