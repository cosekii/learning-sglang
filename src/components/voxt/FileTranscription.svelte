<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_TRANSCRIBE_DEMO_SECONDS,
    VOXT_TRANSCRIBE_PCM_BYTES,
    VOXT_TRANSCRIBE_WAV_BYTES,
    VOXT_CUTTER_FRAME_MS,
    VOXT_CUTTER_SILENCE_MS,
    VOXT_CUTTER_MIN_VOICED_MS,
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
    VOXT_TRANSCRIBE_REMAIN_MS,
    VOXT_TRANSCRIBE_MAX_REQUEST_BYTES,
    VOXT_WAV_HEADER_BYTES,
    VOXT_PCM_BYTES_PER_SECOND,
    VOXT_CAPTURE_SAMPLE_RATE,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A dictation ends at a cursor. A file ends as SRT or TXT.',
    captionZh: '听写的结果落在光标处。文件转写的结果是 SRT 或 TXT。',
  }, {
    caption: 'The command asks macOS afconvert for 16 kHz mono PCM.',
    captionZh: '命令让 macOS 的 afconvert 把文件转成 16 kHz 单声道 PCM。',
  }, {
    caption: 'It sends that PCM to the running Voxt over a local socket.',
    captionZh: '它把 PCM 通过本机 socket 送给正在运行的 Voxt。',
  }, {
    caption: 'A pause of 450 ms ends a cue.',
    captionZh: '停顿满 450 ms 就结束一句。',
  }, {
    caption: 'A cue longer than 7 s is cut in its quietest part.',
    captionZh: '超过 7 秒的一句，在最安静处切开。',
  }, {
    caption: 'Voxt recognizes each cue with the Transcribe model.',
    captionZh: 'Voxt 用 Transcribe 的模型逐句识别。',
  }, {
    caption: 'SRT keeps the cue times; TXT keeps one line per cue.',
    captionZh: 'SRT 保留每句的时间；TXT 每句一行。',
  }, {
    caption: 'The file route writes no history and keeps no recording.',
    captionZh: '文件路线不写历史，也不留录音。',
  }];
  const ariaLabels = [{
    en: 'Two routes. A dictation goes from the microphone through a dictation session to the cursor and history. A file goes from disk through Voxt transcribe to SRT or TXT. Both use Voxt and a speech model, but the file route does not open a dictation session.',
    zh: '两条路线。听写从麦克风经过听写 session 到光标和历史。文件从磁盘经过 Voxt transcribe 到 SRT 或 TXT。两条都用 Voxt 和语音模型，但文件路线不打开听写 session。',
  }, {
    en: 'A constructed eight-second file is decoded by macOS afconvert to 16 kHz mono PCM, held as a temporary WAV. Eight seconds times 32000 bytes a second is 256000 PCM bytes, plus a 44-byte header.',
    zh: '构造的八秒文件由 macOS 的 afconvert 转成 16 kHz 单声道 PCM，放进一个临时 WAV。八秒乘每秒 32000 字节是 256000 字节 PCM，再加 44 字节文件头。',
  }, {
    en: 'The command sends one JSON request line and 256000 PCM bytes to the running Voxt through a local socket named transcribe.sock, mode 0600. The app answers with one line per cue, then a done line.',
    zh: '命令把一行 JSON 请求和 256000 字节 PCM，通过名为 transcribe.sock、权限 0600 的本机 socket 送给运行中的 Voxt。应用每句回一行，最后回 done。',
  }, {
    en: 'The cutter looks at 10 ms frames. 450 ms of quiet ends a cue, a new cue starts 300 ms before its speech, and a cue with less than 350 ms of speech is dropped.',
    zh: '切句器每 10 ms 看一帧。安静满 450 ms 结束一句，新一句在讲话前 300 ms 开始，讲话不足 350 ms 的一句丢掉。',
  }, {
    en: 'A constructed nine-second stretch never pauses for 450 ms. At seven seconds the cutter searches the last second for the quietest 100 ms and cuts at 6.5 seconds. The rest becomes the next cue.',
    zh: '构造的九秒连续讲话没有 450 ms 的停顿。到七秒时，切句器在最后 1 秒里找最安静的 100 ms，在 6.5 秒切开。剩下的成为下一句。',
  }, {
    en: 'Voxt sends each cue to the speech model chosen for Transcribe. Cue one returns Good morning and cue two returns See you at noon. A cue whose text is empty is left out.',
    zh: 'Voxt 把每一句送给 Transcribe 选定的语音模型。第一句返回 Good morning，第二句返回 See you at noon。文字为空的句子会被丢掉。',
  }, {
    en: 'The same two cues become SRT numbered cues with start and end times, or TXT with one line per cue. The command writes the file only after the last cue, so a failed run leaves no partial file.',
    zh: '同样的两句可以写成带起止时间的 SRT 编号字幕，也可以写成每句一行的 TXT。命令在最后一句之后才写文件，失败时不留半个文件。',
  }, {
    en: 'The file route writes no history row and keeps no recording. It writes one log line with the audio length and the cue count, not the text. The audio goes to the model chosen for Transcribe: on this Mac or a configured remote service. The next chapter asks how model files and app updates reach this Mac.',
    zh: '文件路线不写历史记录，也不留录音。它只写一行日志，记音频长度和句子数，不记文字。声音送给 Transcribe 选定的模型：本机或配置的远端服务。下一章问模型文件和应用更新怎样到达这台 Mac。',
  }];
  let step = $state(0);
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
  const H = $derived((phone ? [790, 760, 780, 780, 740, 760, 780, 840] : [450, 430, 430, 470, 430, 430, 470, 520])[step]);

  const srt = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor(ms / 60_000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  };
  const sec = (ms: number) => (ms / 1000).toFixed(2);
  const arrow = '-->';
  const requestLine = JSON.stringify({ op: 'transcribe', bytes: VOXT_TRANSCRIBE_PCM_BYTES, lang: '' });
  const replyLines = ['{"segment": …}', '{"segment": …}', `{"done":true,"count":${VOXT_TRANSCRIBE_CUE_COUNT}}`];
  const pcm = VOXT_TRANSCRIBE_PCM_BYTES.toLocaleString('en-US');
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
          <rect x="20" y="70" width="330" height="300" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="185" y="94" text-anchor="middle" class="label">{t('DICTATION · TO THE CURSOR', '听写 · 到光标')}</text>
          <rect x="45" y="110" width="280" height="50" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="185" y="131" text-anchor="middle" class="detail">{t('microphone + helper (Ch. 2–3)', '麦克风 + helper（第 2–3 章）')}</text>
          <text x="185" y="149" text-anchor="middle" class="detail">{t('16 kHz mono frames', '16 kHz 单声道帧')}</text>
          <line x1="185" y1="160" x2="185" y2="185" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="45" y="193" width="280" height="60" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="185" y="215" text-anchor="middle" class="label">{t('one dictation session', '一次听写 session')}</text>
          <text x="185" y="237" text-anchor="middle" class="detail">{t('model → cleanup → history?', '模型 → 整理 → 历史？')}</text>
          <line x1="185" y1="253" x2="185" y2="278" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="45" y="286" width="280" height="58" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="185" y="309" text-anchor="middle" class="label amber">{t('TEXT AT THE CURSOR', '光标处的文字')}</text>
          <text x="185" y="330" text-anchor="middle" class="detail">{t('plus a history row', '外加一条历史记录')}</text>

          <rect x="370" y="70" width="330" height="300" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="535" y="94" text-anchor="middle" class="label amber">{t('FILE · TO SRT OR TXT', '文件 · 到 SRT 或 TXT')}</text>
          <rect x="395" y="110" width="280" height="50" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="535" y="131" text-anchor="middle" class="detail">{t('meeting.m4a on disk', '磁盘上的 meeting.m4a')}</text>
          <text x="535" y="149" text-anchor="middle" class="detail">{t('or a video', '也可以是视频')}</text>
          <line x1="535" y1="160" x2="535" y2="185" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="395" y="193" width="280" height="60" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="535" y="215" text-anchor="middle" class="label">{t('Voxt transcribe', 'Voxt transcribe')}</text>
          <text x="535" y="237" text-anchor="middle" class="detail">{t('no dictation session', '不打开听写 session')}</text>
          <line x1="535" y1="253" x2="535" y2="278" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="395" y="286" width="280" height="58" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="535" y="309" text-anchor="middle" class="label amber">{t('meeting.srt / talk.txt', 'meeting.srt / talk.txt')}</text>
          <text x="535" y="330" text-anchor="middle" class="detail">{t('subtitle file / plain text', '字幕文件 / 纯文本')}</text>

          <text x="28" y="392" class="pt">·</text>
          <text x="38" y="392" class="detail">{t('both use Voxt and a speech model', '两条都用 Voxt 和语音模型')}</text>
          <text x="28" y="414" class="pt">·</text>
          <text x="38" y="414" class="detail">{t('the file route skips the dictation session and its history row', '文件路线不经过听写 session，也没有历史记录')}</text>
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
          <rect x="30" y="258" width="240" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="280" text-anchor="middle" class="label amber">{t('TEXT AT THE CURSOR', '光标处的文字')}</text>
          <text x="150" y="297" text-anchor="middle" class="detail">{t('plus a history row', '外加一条历史记录')}</text>

          <rect x="15" y="330" width="270" height="250" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="354" text-anchor="middle" class="label amber">{t('FILE · TO SRT OR TXT', '文件 · 到 SRT 或 TXT')}</text>
          <rect x="30" y="368" width="240" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="395" text-anchor="middle" class="detail">{t('meeting.m4a on disk', '磁盘上的 meeting.m4a')}</text>
          <line x1="150" y1="412" x2="150" y2="432" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="440" width="240" height="52" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="462" text-anchor="middle" class="label">{t('Voxt transcribe', 'Voxt transcribe')}</text>
          <text x="150" y="481" text-anchor="middle" class="detail">{t('no dictation session', '不打开听写 session')}</text>
          <line x1="150" y1="492" x2="150" y2="512" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="520" width="240" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="542" text-anchor="middle" class="label amber">{t('meeting.srt / talk.txt', 'meeting.srt / talk.txt')}</text>
          <text x="150" y="559" text-anchor="middle" class="detail">{t('subtitle file / plain text', '字幕文件 / 纯文本')}</text>

          <text x="20" y="612" class="pt">·</text>
          <text x="30" y="612" class="detail">{t('both use Voxt and a speech model', '两条都用 Voxt 和语音模型')}</text>
          <text x="20" y="634" class="pt">·</text>
          <text x="30" y="634" class="detail">{t('the file route skips the dictation session', '文件路线不经过听写 session')}</text>
          <text x="20" y="656" class="pt">·</text>
          <text x="30" y="656" class="detail">{t('so it writes no history row', '所以没有历史记录')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Orange marks the route this chapter follows.', '橙色是本章要走的路线。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('DECODE THE FILE TO PCM', '把文件转成 PCM')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('PCM = raw samples the speech model can read', 'PCM = 语音模型能直接读的声音样本')}</text>
        {#if !phone}
          <rect x="20" y="80" width="150" height="78" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="95" y="108" text-anchor="middle" class="label amber">talk.m4a</text>
          <text x="95" y="132" text-anchor="middle" class="detail">8 s {t('of sound', '声音')}</text>
          <line x1="172" y1="119" x2="212" y2="119" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="218" y="70" width="230" height="98" rx="9" fill="var(--bg)" stroke="var(--accent)" />
          <text x="333" y="94" text-anchor="middle" class="label">afconvert</text>
          <text x="333" y="115" text-anchor="middle" class="detail">{t('macOS file-to-sound tool', 'Mac 自带的转声音工具')}</text>
          <text x="333" y="136" text-anchor="middle" class="mono">-f WAVE -d LEI16@16000 -c 1</text>
          <text x="333" y="155" text-anchor="middle" class="detail">{t('also reads mp4 / mov sound', '也能读 mp4 / mov 的声音')}</text>
          <line x1="450" y1="119" x2="490" y2="119" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="496" y="80" width="204" height="78" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="598" y="108" text-anchor="middle" class="label">audio.wav</text>
          <text x="598" y="132" text-anchor="middle" class="detail">{t('temporary file', '临时文件')}</text>

          <rect x="70" y="200" width="580" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="226" text-anchor="middle" class="formula">{VOXT_TRANSCRIBE_DEMO_SECONDS} s × {VOXT_CAPTURE_SAMPLE_RATE.toLocaleString('en-US')} × 2 B = {pcm} B PCM</text>
          <text x="360" y="255" text-anchor="middle" class="formula">+ {VOXT_WAV_HEADER_BYTES} B {t('WAV header', 'WAV 文件头')} = {VOXT_TRANSCRIBE_WAV_BYTES.toLocaleString('en-US')} B</text>
          <text x="360" y="282" text-anchor="middle" class="detail">{t('about 256 KB, smaller than one phone photo', '约 256 KB，比一张手机照片小')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('The temporary WAV goes after the command reads it.', '命令读完 PCM 后就删掉这个临时 WAV。')}</text>
        {:else}
          <rect x="40" y="70" width="220" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="95" text-anchor="middle" class="label amber">talk.m4a · 8 s</text>
          <text x="150" y="116" text-anchor="middle" class="detail">{t('on disk', '磁盘上')}</text>
          <line x1="150" y1="132" x2="150" y2="158" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="166" width="240" height="92" rx="9" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="190" text-anchor="middle" class="label">afconvert</text>
          <text x="150" y="211" text-anchor="middle" class="detail">{t('macOS file-to-sound tool', 'Mac 自带的转声音工具')}</text>
          <text x="150" y="232" text-anchor="middle" class="mono">LEI16@16000 · mono</text>
          <text x="150" y="250" text-anchor="middle" class="detail">{t('reads mp4 / mov too', '也能读 mp4 / mov')}</text>
          <line x1="150" y1="258" x2="150" y2="284" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="40" y="292" width="220" height="60" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="316" text-anchor="middle" class="label">audio.wav</text>
          <text x="150" y="337" text-anchor="middle" class="detail">{t('temporary file', '临时文件')}</text>

          <rect x="20" y="380" width="260" height="170" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="406" text-anchor="middle" class="formula">8 s × 16,000 × 2 B</text>
          <text x="150" y="434" text-anchor="middle" class="formula">= {pcm} B PCM</text>
          <text x="150" y="466" text-anchor="middle" class="formula">+ {VOXT_WAV_HEADER_BYTES} B {t('header', '文件头')}</text>
          <text x="150" y="494" text-anchor="middle" class="formula">= {VOXT_TRANSCRIBE_WAV_BYTES.toLocaleString('en-US')} B</text>
          <text x="150" y="526" text-anchor="middle" class="detail">{t('about 256 KB', '约 256 KB')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('The temporary WAV goes after the command reads it.', '命令读完 PCM 后就删掉这个临时 WAV。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('SEND THE PCM TO THE RUNNING APP', '把 PCM 送给运行中的应用')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('socket = a door between two programs on this Mac', 'socket = 同一台 Mac 上两个程序之间的一扇门')}</text>
        {#if !phone}
          <rect x="20" y="82" width="220" height="86" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="130" y="108" text-anchor="middle" class="label amber">{t('the command', '命令')}</text>
          <text x="130" y="132" text-anchor="middle" class="mono">Voxt transcribe</text>
          <text x="130" y="152" text-anchor="middle" class="mono">talk.m4a</text>
          <line x1="242" y1="125" x2="282" y2="125" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="288" y="98" width="146" height="54" rx="27" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="361" y="120" text-anchor="middle" class="label">transcribe.sock</text>
          <text x="361" y="139" text-anchor="middle" class="detail">{t('your account only', '只有你的账户')}</text>
          <line x1="436" y1="125" x2="476" y2="125" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="482" y="82" width="218" height="86" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="591" y="108" text-anchor="middle" class="label">{t('running Voxt', '运行中的 Voxt')}</text>
          <text x="591" y="132" text-anchor="middle" class="detail">{t('picks Transcribe\'s model', '选 Transcribe 的模型')}</text>
          <text x="591" y="152" text-anchor="middle" class="detail">{t('and a language hint', '和一个语言提示')}</text>

          <rect x="30" y="190" width="660" height="36" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="213" class="mono">{requestLine}</text>
          <text x="40" y="250" class="detail">{t('then', '然后')} {pcm} {t('bytes of PCM', '字节 PCM')}</text>
          <line x1="360" y1="260" x2="360" y2="284" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="292" width="660" height="92" rx="8" fill="var(--bg)" stroke="var(--line)" />
          {#each replyLines as line, i}
            <text x="40" y={314 + i * 24} class="mono">{line}</text>
          {/each}
          <text x={W / 2} y={H - 32} text-anchor="middle" class="detail">{t(`one request line is at most ${VOXT_TRANSCRIBE_MAX_REQUEST_BYTES} bytes`, `请求行最多 ${VOXT_TRANSCRIBE_MAX_REQUEST_BYTES} 字节`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No network port; only your account can open it; Voxt reads none of your folders.', '没有网络端口；只有你的账户能打开；Voxt 不读你的文件夹。')}</text>
        {:else}
          <rect x="30" y="70" width="240" height="76" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="96" text-anchor="middle" class="label amber">{t('the command', '命令')}</text>
          <text x="150" y="120" text-anchor="middle" class="mono">Voxt transcribe</text>
          <text x="150" y="138" text-anchor="middle" class="mono">talk.m4a</text>
          <line x1="150" y1="148" x2="150" y2="174" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="70" y="182" width="160" height="50" rx="25" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="203" text-anchor="middle" class="label">transcribe.sock</text>
          <text x="150" y="221" text-anchor="middle" class="detail">{t('your account only', '只有你的账户')}</text>
          <line x1="150" y1="234" x2="150" y2="260" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="30" y="268" width="240" height="70" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="292" text-anchor="middle" class="label">{t('running Voxt', '运行中的 Voxt')}</text>
          <text x="150" y="315" text-anchor="middle" class="detail">{t('picks Transcribe\'s model', '选 Transcribe 的模型')}</text>

          <rect x="15" y="360" width="270" height="34" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="382" text-anchor="middle" class="mono">{`{"op":"transcribe",`}</text>
          <text x="150" y="410" text-anchor="middle" class="mono">{`"bytes":${pcm},"lang":""}`}</text>
          <text x="150" y="436" text-anchor="middle" class="detail">{t('then', '然后')} {pcm} {t('bytes of PCM', '字节 PCM')}</text>
          <line x1="150" y1="446" x2="150" y2="472" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="15" y="480" width="270" height="108" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="24" y="504" class="mono small">{`{"segment": …}`}</text>
          <text x="24" y="530" class="mono small">{`{"segment": …}`}</text>
          <text x="24" y="556" class="mono small">{`{"done":true,"count":2}`}</text>
          <text x={W / 2} y={H - 32} text-anchor="middle" class="detail">{t(`request line ≤ ${VOXT_TRANSCRIBE_MAX_REQUEST_BYTES} bytes`, `请求行 ≤ ${VOXT_TRANSCRIBE_MAX_REQUEST_BYTES} 字节`)}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No network port; only your account can open it.', '没有网络端口；只有你的账户能打开。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('A PAUSE ENDS A CUE', '停顿结束一句')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('cue = one stretch of speech sent to the model', '一句 = 送去模型的一段讲话')}</text>
        {#if !phone}
          <text x="174" y="84" text-anchor="middle" class="label">{t('CUE 1', '第 1 句')} 0.00–3.35 s</text>
          <text x="490" y="84" text-anchor="middle" class="label">{t('CUE 2', '第 2 句')} 3.40–7.85 s</text>
          <line x1="40" y1="96" x2="308" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="40" y1="90" x2="40" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="308" y1="90" x2="308" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="96" x2="668" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="312" y1="90" x2="312" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="668" y1="90" x2="668" y2="102" stroke="var(--accent)" stroke-width="2" />
          {#each Array.from({ length: 160 }, (_, i) => i) as i}
            {@const time = i / 20}
            {@const speech = time <= 2.9 || (time >= 3.7 && time <= 7.4)}
            {@const height = speech ? 10 + (i * 13 % 40) : 3}
            <line x1={40 + i * 4} y1={150 - height / 2} x2={40 + i * 4} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="3" stroke-linecap="round" />
          {/each}
          <rect x="272" y="182" width="36" height="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="290" y="214" text-anchor="middle" class="detail amber">{VOXT_CUTTER_SILENCE_MS} ms</text>
          <text x="290" y="232" text-anchor="middle" class="detail">{t('quiet ends cue 1', '安静结束第 1 句')}</text>
          <rect x="312" y="182" width="24" height="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="368" y="214" text-anchor="middle" class="detail">{VOXT_CUTTER_PREROLL_MS} ms</text>
          <text x="368" y="232" text-anchor="middle" class="detail">{t('starts early', '提前开始')}</text>
          <text x="40" y="270" class="pt">·</text>
          <text x="50" y="270" class="detail">{t(`every frame is ${VOXT_CUTTER_FRAME_MS} ms of sound`, `每一帧是 ${VOXT_CUTTER_FRAME_MS} ms 的声音`)}</text>
          <text x="40" y="294" class="pt">·</text>
          <text x="50" y="294" class="detail">{t(`less than ${VOXT_CUTTER_MIN_VOICED_MS} ms of speech: dropped`, `讲话不足 ${VOXT_CUTTER_MIN_VOICED_MS} ms：丢掉`)}</text>
          <text x="40" y="318" class="pt">·</text>
          <text x="50" y="318" class="detail">{t('the cue keeps the 450 ms of quiet at its end', '句子末尾的 450 ms 安静也一起留下')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example; quiet parts depend on the sound.', '构造的 8 秒例子；安静段由实际声音决定。')}</text>
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
            {@const speech = time <= 2.9 || (time >= 3.7 && time <= 7.4)}
            {@const height = speech ? 8 + (i * 13 % 30) : 3}
            <line x1={x} y1={150 - height / 2} x2={x} y2={150 + height / 2}
              stroke={speech ? 'var(--accent)' : 'var(--line)'} stroke-width="2.5" stroke-linecap="round" />
          {/each}
          <text x="65" y="178" text-anchor="middle" class="detail">0.00–3.35 s</text>
          <text x="222" y="178" text-anchor="middle" class="detail">3.40–7.85 s</text>
          <text x="30" y="216" class="pt">·</text>
          <text x="40" y="216" class="detail">{t('450 ms quiet ends a cue', '安静满 450 ms 结束一句')}</text>
          <text x="30" y="242" class="pt">·</text>
          <text x="40" y="242" class="detail">{t('next cue starts 300 ms early', '下一句提前 300 ms 开始')}</text>
          <text x="30" y="268" class="pt">·</text>
          <text x="40" y="268" class="detail">{t('under 350 ms of speech is dropped', '讲话不足 350 ms 丢掉')}</text>
          <text x="30" y="294" class="pt">·</text>
          <text x="40" y="294" class="detail">{t('10 ms per frame', '每帧 10 ms')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 8-second example.', '构造的 8 秒例子。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('NO PAUSE? CUT AT 7 SECONDS', '没有停顿？到 7 秒就切')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('the cutter looks for the quietest 100 ms', '切句器寻找最安静的 100 ms')}</text>
        {#if !phone}
          <text x="270" y="84" text-anchor="middle" class="label">{t('CUE 1', '第 1 段')} 0–6.5 s</text>
          <text x="585" y="84" text-anchor="middle" class="label">{t('CUE 2', '第 2 段')} 6.5–9 s</text>
          <line x1="40" y1="96" x2="502" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="40" y1="90" x2="40" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="502" y1="90" x2="502" y2="102" stroke="var(--accent)" stroke-width="2" />
          <line x1="502" y1="96" x2="680" y2="96" stroke="var(--accent)" stroke-width="2" />
          <line x1="680" y1="90" x2="680" y2="102" stroke="var(--accent)" stroke-width="2" />
          <rect x="466" y="118" width="72" height="64" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="502" y="200" text-anchor="middle" class="detail amber">{t('search 6.0–7.0 s', '在 6.0–7.0 秒找')}</text>
          {#each Array.from({ length: 180 }, (_, i) => i) as i}
            {@const x = 40 + i * 3.55}
            {@const height = 10 + (i * 11 % 42)}
            <line x1={x} y1={150 - height / 2} x2={x} y2={150 + height / 2} stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" />
          {/each}
          <line x1="502" y1="116" x2="502" y2="184" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
          <text x="40" y="238" class="pt">·</text>
          <text x="50" y="238" class="detail">{t(`at ${VOXT_CUTTER_MAX_SEGMENT_S} s, no 450 ms pause arrived`, `到 ${VOXT_CUTTER_MAX_SEGMENT_S} 秒还没有 450 ms 停顿`)}</text>
          <text x="40" y="264" class="pt">·</text>
          <text x="50" y="264" class="detail">{t(`cut inside the quietest ${VOXT_CUTTER_QUIET_WINDOW_MS} ms`, `在最安静的 ${VOXT_CUTTER_QUIET_WINDOW_MS} ms 里切`)}</text>
          <text x="40" y="290" class="pt">·</text>
          <text x="50" y="290" class="detail">{t('the rest continues as the next cue', '剩下的成为下一句')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 9-second stretch; the real cut follows the sound.', '构造的 9 秒连续讲话；真实切点跟着声音走。')}</text>
        {:else}
          <text x="76" y="82" text-anchor="middle" class="label">{t('CUE 1', '第 1 段')}</text>
          <text x="225" y="82" text-anchor="middle" class="label">{t('CUE 2', '第 2 段')}</text>
          <line x1="20" y1="94" x2="208" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="20" y1="88" x2="20" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="208" y1="88" x2="208" y2="100" stroke="var(--accent)" stroke-width="2" />
          <line x1="208" y1="94" x2="280" y2="94" stroke="var(--accent)" stroke-width="2" />
          <line x1="280" y1="88" x2="280" y2="100" stroke="var(--accent)" stroke-width="2" />
          <rect x="183" y="114" width="28" height="56" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#each Array.from({ length: 90 }, (_, i) => i) as i}
            {@const x = 20 + i * 2.9}
            {@const height = 8 + (i * 11 % 30)}
            <line x1={x} y1={142 - height / 2} x2={x} y2={142 + height / 2} stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" />
          {/each}
          <line x1="208" y1="112" x2="208" y2="174" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
          <text x="76" y="198" text-anchor="middle" class="detail">0–6.5 s</text>
          <text x="238" y="198" text-anchor="middle" class="detail">6.5–9 s</text>
          <text x="30" y="236" class="pt">·</text>
          <text x="40" y="236" class="detail">{t('no 450 ms pause by 7 s', '到 7 秒还没有 450 ms 停顿')}</text>
          <text x="30" y="262" class="pt">·</text>
          <text x="40" y="262" class="detail">{t('cut in the quietest 100 ms', '在最安静的 100 ms 里切')}</text>
          <text x="30" y="288" class="pt">·</text>
          <text x="40" y="288" class="detail">{t('the rest becomes the next cue', '剩下的成为下一句')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Constructed 9-second example.', '构造的 9 秒例子。')}</text>
        {/if}
      {:else if step === 5}
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
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Without --lang, the command uses dictation\'s language hint.', '不给 --lang 时，命令用听写的语言提示。')}</text>
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
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No --lang: dictation\'s hint.', '不给 --lang 时用听写的提示。')}</text>
        {/if}
      {:else if step === 6}
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

          <rect x="385" y="72" width="310" height="332" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="540" y="96" text-anchor="middle" class="label amber">{t('TXT · ONE LINE A CUE', 'TXT · 每句一行')}</text>
          <text x="400" y="136" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="400" y="162" class="mono">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="540" y="220" text-anchor="middle" class="detail">{t('no numbers, no times', '没有编号，没有时间')}</text>
          <text x="540" y="242" text-anchor="middle" class="detail">{t('easy to read or feed to a script', '方便阅读或交给脚本')}</text>
          <text x={W / 2} y={H - 34} text-anchor="middle" class="cut">{t('THE FILE IS WRITTEN ONLY AFTER THE LAST CUE', '最后一句之后才写文件')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('No -o, or -o -, prints to stdout; progress goes to stderr.', '不给 -o 或写 -o - 时输出到 stdout；进度走 stderr。')}</text>
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

          <rect x="15" y="352" width="270" height="170" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="376" text-anchor="middle" class="label amber">{t('TXT · ONE LINE A CUE', 'TXT · 每句一行')}</text>
          <text x="26" y="410" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[0]}</text>
          <text x="26" y="434" class="mono small">{VOXT_TRANSCRIBE_CUE_TEXT[1]}</text>
          <text x="150" y="478" text-anchor="middle" class="detail">{t('no numbers, no times', '没有编号，没有时间')}</text>
          <text x="150" y="500" text-anchor="middle" class="detail">{t('easy to read or feed to a script', '方便阅读或交给脚本')}</text>

          <text x={W / 2} y="552" text-anchor="middle" class="cut">{t('WRITTEN ONLY AFTER THE LAST CUE', '最后一句之后才写文件')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Failed run: no partial file.', '失败时不留半个文件。')}</text>
        {/if}
      {:else if step === 7}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('THE FILE ROUTE KEEPS NO TEXT', '文件路线不留文字')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('dictation writes history; this route does not', '听写写历史；这条路线不写')}</text>
        {#if !phone}
          <rect x="25" y="72" width="330" height="160" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="96" text-anchor="middle" class="label">{t('NOT WRITTEN', '不留下')}</text>
          <text x="45" y="128" class="detail">{t('✗ a history row', '✗ 历史记录')}</text>
          <text x="45" y="156" class="detail">{t('✗ a recording of the audio', '✗ 录音')}</text>
          <text x="45" y="184" class="detail">{t('✗ the text in the log', '✗ 日志里的文字')}</text>
          <text x="45" y="212" class="detail">{t('(no cursor, no session)', '（没有光标，没有 session）')}</text>

          <rect x="365" y="72" width="330" height="160" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="530" y="96" text-anchor="middle" class="label amber">{t('WRITTEN', '留下')}</text>
          <text x="385" y="128" class="detail">{t('one log line:', '一行日志：')}</text>
          <text x="385" y="152" class="mono small">transcribed a file for the</text>
          <text x="385" y="170" class="mono small">command line: 8s of audio,</text>
          <text x="385" y="188" class="mono small">2 segments</text>
          <text x="530" y="216" text-anchor="middle" class="detail">{t('length and cue count, never the text', '只有长度和句子数，没有文字')}</text>

          <text x="40" y="268" class="label">{t('WHERE THE AUDIO GOES', '声音去哪里')}</text>
          <line x1="120" y1="284" x2="120" y2="308" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <rect x="45" y="316" width="270" height="62" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="180" y="340" text-anchor="middle" class="detail">{t('the on-device speech model', '本机语音模型')}</text>
          <text x="180" y="360" text-anchor="middle" class="detail">{t('on this Mac', '就在这台 Mac')}</text>
          <rect x="405" y="316" width="270" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="540" y="340" text-anchor="middle" class="detail">{t('or the remote speech service', '或远端语音服务')}</text>
          <text x="540" y="360" text-anchor="middle" class="detail">{t('set for Transcribe', '按 Transcribe 的设置')}</text>
          <line x1="120" y1="300" x2="540" y2="300" stroke="var(--muted)" stroke-width="2" />
          <line x1="540" y1="300" x2="540" y2="308" stroke="var(--muted)" stroke-width="2" marker-end="url(#ft-arrow)" />
          <text x={W / 2} y={H - 46} text-anchor="middle" class="cut">{t('SO HOW DO MODEL FILES AND UPDATES REACH THIS MAC?', '那么模型文件和应用更新怎样到达这台 Mac？')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: Voxt/transcribe_socket.go and docs/transcribe.md.', '出处：Voxt/transcribe_socket.go 和 docs/transcribe.md。')}</text>
        {:else}
          <rect x="15" y="68" width="270" height="190" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="92" text-anchor="middle" class="label">{t('NOT WRITTEN', '不留下')}</text>
          <text x="30" y="124" class="detail">{t('✗ a history row', '✗ 历史记录')}</text>
          <text x="30" y="152" class="detail">{t('✗ a recording', '✗ 录音')}</text>
          <text x="30" y="180" class="detail">{t('✗ the text in the log', '✗ 日志里的文字')}</text>
          <text x="30" y="208" class="detail">{t('no cursor, no session', '没有光标，没有 session')}</text>

          <rect x="15" y="276" width="270" height="190" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="300" text-anchor="middle" class="label amber">{t('WRITTEN', '留下')}</text>
          <text x="30" y="330" class="detail">{t('one log line:', '一行日志：')}</text>
          <text x="30" y="354" class="mono small">transcribed a file: 8s of</text>
          <text x="30" y="374" class="mono small">audio, 2 segments</text>
          <text x="150" y="408" text-anchor="middle" class="detail">{t('length and cue count only', '只有长度和句子数')}</text>
          <text x="150" y="436" text-anchor="middle" class="detail">{t('never the text', '没有文字')}</text>

          <text x="150" y="498" text-anchor="middle" class="label">{t('WHERE THE AUDIO GOES', '声音去哪里')}</text>
          <rect x="25" y="516" width="250" height="58" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="539" text-anchor="middle" class="detail">{t('the on-device model (this Mac)', '本机模型（这台 Mac）')}</text>
          <text x="150" y="560" text-anchor="middle" class="detail">{t('or the remote service', '或远端服务')}</text>
          <text x="150" y="598" text-anchor="middle" class="detail">{t('both set for Transcribe', '都按 Transcribe 的设置')}</text>
          <text x={W / 2} y={H - 66} text-anchor="middle" class="cut">{t('SO HOW DO MODEL FILES', '那么模型文件')}</text>
          <text x={W / 2} y={H - 44} text-anchor="middle" class="cut">{t('AND UPDATES REACH THIS MAC?', '和应用更新怎样到达这台 Mac？')}</text>
          <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Source: transcribe_socket.go, docs/transcribe.md.', '出处：transcribe_socket.go、docs/transcribe.md。')}</text>
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
