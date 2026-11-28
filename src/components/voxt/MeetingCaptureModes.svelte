<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_MEETING_TRACK_BYTES_PER_SECOND,
    VOXT_MEETING_HOUR_SECONDS,
    VOXT_MEETING_TRACK_HOUR_MB,
    VOXT_MEETING_FULL_HOUR_MB,
    VOXT_MEETING_DISK_START_GIB,
    VOXT_MEETING_DISK_RECORD_GIB,
    VOXT_MEETING_FAILED_KEEP_DAYS,
    VOXT_MEETING_FAILED_KEEP_HOURS,
    VOXT_MEETING_SWEEP_HOURS,
    VOXT_WAV_HEADER_BYTES,
    VOXT_TRANSCRIBE_PHOTO_MB,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: "The capture mode decides what a meeting records: you, the Mac's sound, or both.",
    captionZh: '采集模式决定会议录什么：你、Mac 放的声音，或两者。',
  }, {
    caption: 'The system track is the sound the Mac plays, mixed into one mono stream.',
    captionZh: '系统音轨是 Mac 正在放的声音，混成一条单声道。',
  }, {
    caption: 'One meeting writes one WAV per track, 32,000 bytes a second each.',
    captionZh: '一场会议给每条音轨写一个 WAV，每秒 32,000 字节。',
  }, {
    caption: "Recording the Mac's sound needs a system-audio permission; without it, no meeting starts.",
    captionZh: '录 Mac 放的声音要系统音频权限；拿不到，会议不开始。',
  }, {
    caption: 'Switching modes never stops the shared tracks; new tracks start first.',
    captionZh: '切换模式时共用的音轨不停；新音轨先开始。',
  }, {
    caption: 'Every meeting writes its WAVs first; keeping them is decided when it ends.',
    captionZh: '录音总是先写好；留不留，结束时才决定。',
  }, {
    caption: "Your track is already labeled me; only the Mac's track needs splitting. Live words come first; the final pass re-reads both WAVs.",
    captionZh: '你的音轨整条标 me，不用模型；要分的只有系统音轨。会后那一遍重读两个 WAV。',
  }];
  const ariaLabels = [{
    en: 'Three capture modes side by side. Full meeting, the default, records two tracks: the microphone and the system audio. Subtitles records only the system audio. Recording records only the microphone. One track at 32,000 bytes a second for 3,600 seconds is 115.2 megabytes, so one hour of a full meeting writes 230.4 megabytes.',
    zh: '并排三种采集模式。完整会议是默认，录两条音轨：麦克风和系统音频。字幕只录系统音频。录音只录麦克风。一条音轨每秒 32,000 字节，3,600 秒是 115.2 MB，所以一小时完整会议写 230.4 MB。',
  }, {
    en: 'The microphone track comes from capture.start, the same helper path as dictation. The system track comes from capture.system: a tap on the Mac\'s output that mixes every other app\'s sound into one mono stream. You still hear the sound; only the helper holds the copy. Both paths end in two separate tracks.',
    zh: '麦克风音轨来自 capture.start，和听写是同一条 helper 路径。系统音轨来自 capture.system：在 Mac 的输出上接一个龙头，把其他每个应用的声音混成一条单声道。你照样听得到；副本只在 helper 手里。两条路径各自进入一条音轨。',
  }, {
    en: 'One meeting at a time, with a disk check of 1.5 gibibytes before it starts. The meeting makes a folder meetings/<id> and writes one WAV file per track: mic.wav and system.wav, each 16 kilohertz mono PCM16, growing 32,000 bytes each second. Each file starts with a 44-byte header whose lengths are filled in when the file closes. Below 0.9 gibibytes free, recording stops itself.',
    zh: '同时只有一场会议，开始前检查磁盘要有 1.5 GiB 空位。会议建一个 meetings/<id> 文件夹，每条音轨写一个 WAV：mic.wav 和 system.wav，都是 16 kHz 单声道 PCM16，每秒各长 32,000 字节。每个文件开头是 44 字节的头，长度在文件关闭时补写。磁盘空位低于 0.9 GiB 时录音自己停下。',
  }, {
    en: 'Recording the Mac\'s sound has one more gate: macOS asks for System Audio Recording the first time. Two outcomes side by side. Allow: the system tap runs, both tracks record. Cannot start: the tap fails, Start fails, and there is no meeting, no folder, no files.',
    zh: '录 Mac 的声音还有一道门：macOS 第一次会问系统音频权限。两种结果并排。允许：系统龙头跑起来，两条音轨都录。接不起来：龙头失败，Start 失败，没有会议，没有文件夹，没有文件。',
  }, {
    en: 'Switching capture mode mid-meeting. From full meeting to subtitles: the microphone track stops and leaves a gap; the system track never stops. Switching back: the microphone track starts again first, and only then the mode flips. New tracks start before old ones stop; a new track that cannot start leaves the meeting in its old mode.',
    zh: '会议中途切换采集模式。从完整会议切到字幕：麦克风音轨停下，留出一个空档；系统音轨从不停。切回来：麦克风音轨先重新开始，然后模式才翻过去。新音轨先开始，旧音轨再停；新音轨接不起来时，会议留在旧模式。',
  }, {
    en: 'Writing and keeping are separate decisions. With keep audio off, a full meeting that ended normally deletes its folder right away. A recording-mode meeting always keeps its WAVs. A failed or interrupted meeting keeps its recording seven days, 168 hours, and then the hourly sweep from Chapter 9 Step 5 deletes it.',
    zh: '写录音和留录音是两个决定。保留音频关闭时，正常结束的完整会议马上删掉文件夹。录音模式的会议总是留下 WAV。失败或中断的会议把录音留 7 天，168 小时，然后由第 9 章第 5 步的每小时清扫删掉。',
  }, {
    en: 'The microphone track needs no speaker model: the whole track is you, so every line is labeled me. The system track mixes several voices, so the after-meeting pass splits it into Speaker 1 and Speaker 2. Only the full meeting has both tracks, so only it gets a labeled transcript. Both tracks are read again after the meeting: live words first, final words later.',
    zh: '麦克风音轨不需要分人模型：整条都是你，每行都标 me。系统音轨混了几个人的声音，会后那遍把它分成 Speaker 1 和 Speaker 2。只有完整会议两条音轨都有，所以只有它得到带标签的终稿。两条音轨会后都会再读一遍：先有直播的字，后有终稿。',
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
  const H = $derived((phone ? [800, 660, 770, 830, 720, 830, 860] : [580, 496, 520, 530, 500, 560, 580])[step]);

  const PHASE_COUNTS = [5, 4, 4, 4, 4, 5, 4];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = PHASE_COUNTS[s];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const motionFrames = (isPhone: boolean, s: number): { x: number; y: number; w: number; h: number }[] => (isPhone ? [
    [{ x: 15, y: 64, w: 270, h: 40 }, { x: 15, y: 112, w: 270, h: 104 }, { x: 15, y: 228, w: 270, h: 104 }, { x: 15, y: 344, w: 270, h: 104 }, { x: 15, y: 520, w: 270, h: 70 }],
    [{ x: 15, y: 64, w: 270, h: 202 }, { x: 15, y: 64, w: 130, h: 100 }, { x: 155, y: 64, w: 130, h: 100 }, { x: 15, y: 416, w: 270, h: 84 }],
    [{ x: 15, y: 64, w: 270, h: 130 }, { x: 15, y: 240, w: 270, h: 100 }, { x: 15, y: 352, w: 270, h: 100 }, { x: 15, y: 500, w: 270, h: 130 }],
    [{ x: 15, y: 64, w: 270, h: 60 }, { x: 15, y: 136, w: 270, h: 190 }, { x: 15, y: 340, w: 270, h: 190 }, { x: 15, y: 136, w: 270, h: 394 }],
    [{ x: 15, y: 64, w: 270, h: 220 }, { x: 15, y: 64, w: 270, h: 220 }, { x: 15, y: 64, w: 270, h: 220 }, { x: 15, y: 300, w: 270, h: 120 }],
    [{ x: 15, y: 64, w: 270, h: 350 }, { x: 15, y: 64, w: 270, h: 108 }, { x: 15, y: 184, w: 270, h: 108 }, { x: 15, y: 304, w: 270, h: 108 }, { x: 15, y: 304, w: 270, h: 108 }],
    [{ x: 15, y: 64, w: 270, h: 170 }, { x: 15, y: 244, w: 270, h: 170 }, { x: 15, y: 244, w: 270, h: 170 }, { x: 15, y: 424, w: 270, h: 240 }],
  ] : [
    [{ x: 180, y: 70, w: 360, h: 42 }, { x: 20, y: 124, w: 680, h: 88 }, { x: 20, y: 228, w: 680, h: 88 }, { x: 20, y: 332, w: 680, h: 88 }, { x: 100, y: 470, w: 520, h: 60 }],
    [{ x: 20, y: 84, w: 680, h: 230 }, { x: 20, y: 84, w: 330, h: 320 }, { x: 370, y: 84, w: 330, h: 320 }, { x: 20, y: 420, w: 680, h: 50 }],
    [{ x: 20, y: 76, w: 680, h: 50 }, { x: 40, y: 180, w: 640, h: 80 }, { x: 40, y: 280, w: 640, h: 80 }, { x: 20, y: 416, w: 680, h: 78 }],
    [{ x: 160, y: 72, w: 400, h: 56 }, { x: 20, y: 150, w: 330, h: 240 }, { x: 370, y: 150, w: 330, h: 240 }, { x: 20, y: 150, w: 680, h: 240 }],
    [{ x: 90, y: 120, w: 610, h: 130 }, { x: 90, y: 120, w: 610, h: 130 }, { x: 90, y: 120, w: 610, h: 130 }, { x: 20, y: 320, w: 680, h: 60 }],
    [{ x: 20, y: 76, w: 680, h: 360 }, { x: 20, y: 76, w: 680, h: 110 }, { x: 20, y: 202, w: 680, h: 110 }, { x: 20, y: 328, w: 680, h: 110 }, { x: 20, y: 328, w: 680, h: 110 }],
    [{ x: 20, y: 76, w: 335, h: 200 }, { x: 365, y: 76, w: 335, h: 200 }, { x: 365, y: 76, w: 335, h: 200 }, { x: 20, y: 316, w: 680, h: 200 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  const trackBps = VOXT_MEETING_TRACK_BYTES_PER_SECOND.toLocaleString('en-US');
  const hourSeconds = VOXT_MEETING_HOUR_SECONDS.toLocaleString('en-US');
  const trackHourMb = VOXT_MEETING_TRACK_HOUR_MB.toFixed(1);
  const fullHourMb = VOXT_MEETING_FULL_HOUR_MB.toFixed(1);
  const fullHourPhotos = Math.round(VOXT_MEETING_FULL_HOUR_MB / VOXT_TRANSCRIBE_PHOTO_MB);
  const modes = [
    { name: t('FULL MEETING', '完整会议'), dflt: true, note: t('both sides of the call', '通话的两边'), records: t('microphone + system audio', '麦克风 + 系统音频'), tracks: 2 },
    { name: t('SUBTITLES', '字幕'), dflt: false, note: t('for reading along', '用来看'), records: t('system audio only', '仅系统音频'), tracks: 1 },
    { name: t('RECORDING', '录音'), dflt: false, note: t('your own voice', '自己的声音'), records: t('microphone only', '仅麦克风'), tracks: 1 },
  ];
  const meLines = ['00:01  hi everyone', '00:14  sounds good', '00:31  let me check'];
  const sysLines = [
    { text: '00:03  morning all', who: 'Speaker 1' },
    { text: '00:14  agree', who: 'Speaker 2' },
    { text: '00:40  next steps', who: 'Speaker 1' },
  ];
  const frameX = (i: number) => 90 + i * 44;
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="mc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THREE CAPTURE MODES', '三种采集模式')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('track = one sound stream, one file', '音轨 = 一条声音流，一个文件')}</text>
        {#if !phone}
          {#if phase === 0}
            <rect x="180" y="70" width="360" height="42" rx="8" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="6 4" />
            <text x={W / 2} y="96" text-anchor="middle" class="detail">{t('microphone ? · system audio ?', '麦克风？ · 系统音频？')}</text>
          {/if}
          {#each modes as m, i}
            {@const y = 124 + i * 104}
            <rect x="20" {y} width="680" height="88" rx="10" fill={phase > i ? 'var(--bg)' : 'none'} stroke={phase > i ? 'var(--line)' : 'var(--muted)'} stroke-dasharray={phase > i ? 'none' : '6 4'} />
            <text x="40" y={y + 28} class="label">{m.name}{m.dflt ? t(' · the default', ' · 默认') : ''}</text>
            {#if phase > i}
              <text x="40" y={y + 50} class="detail">{m.records}</text>
              <text x="40" y={y + 72} class="detail">{m.note} · {t(`${m.tracks} track${m.tracks > 1 ? 's' : ''}`, `${m.tracks} 条音轨`)}</text>
            {/if}
            {#if phase > i}
              {#if i !== 1}
                <rect x="430" y={y + 28} width="90" height="32" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x="475" y={y + 48} text-anchor="middle" class="detail">mic</text>
              {/if}
              {#if i !== 2}
                <rect x={i === 1 ? 430 : 532} y={y + 28} width="138" height="32" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
                <text x={i === 1 ? 499 : 601} y={y + 48} text-anchor="middle" class="detail">system audio</text>
              {/if}
            {/if}
          {/each}
          <rect x="220" y="440" width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="238" y="450" class="detail">{t('microphone track', '麦克风音轨')}</text>
          <rect x="400" y="440" width="12" height="12" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="418" y="450" class="detail">{t('system-audio track', '系统音频音轨')}</text>
          {#if phase >= 4}
            <text x={W / 2} y="496" text-anchor="middle" class="formula">{trackBps} B/s × {hourSeconds} s = {trackHourMb} MB · {t('one track, one hour', '一条音轨，一小时')}</text>
            <text x={W / 2} y="524" text-anchor="middle" class="formula">{t('FULL MEETING', '完整会议')}: 2 × {trackHourMb} MB = {fullHourMb} MB {t('an hour', '每小时')}{t(` (≈${fullHourPhotos} photos)`, `（≈${fullHourPhotos} 张手机照片）`)}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/mode.go, settings_meeting_view_state.go.', '出处：internal/meeting/mode.go、settings_meeting_view_state.go。')}</text>
        {:else}
          {#if phase === 0}
            <rect x="15" y="64" width="270" height="40" rx="8" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="6 4" />
            <text x={W / 2} y="88" text-anchor="middle" class="detail">{t('microphone ? · system audio ?', '麦克风？ · 系统音频？')}</text>
          {/if}
          {#each modes as m, i}
            {@const y = 112 + i * 116}
            <rect x="15" {y} width="270" height="104" rx="10" fill={phase > i ? 'var(--bg)' : 'none'} stroke={phase > i ? 'var(--line)' : 'var(--muted)'} stroke-dasharray={phase > i ? 'none' : '6 4'} />
            <text x="30" y={y + 26} class="label">{m.name}{m.dflt ? t(' · the default', ' · 默认') : ''}</text>
            {#if phase > i}
              <text x="30" y={y + 48} class="detail">{m.records}</text>
              <text x="30" y={y + 66} class="detail">{m.note} · {t(`${m.tracks} track${m.tracks > 1 ? 's' : ''}`, `${m.tracks} 条音轨`)}</text>
              {#if i !== 1}
                <rect x="30" y={y + 72} width="66" height="24" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x="63" y={y + 88} text-anchor="middle" class="detail">mic</text>
              {/if}
              {#if i !== 2}
                <rect x={i === 1 ? 30 : 104} y={y + 72} width="120" height="24" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
                <text x={i === 1 ? 90 : 164} y={y + 88} text-anchor="middle" class="detail">system audio</text>
              {/if}
            {/if}
          {/each}
          <rect x="30" y="478" width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="48" y="488" class="detail">{t('microphone track', '麦克风音轨')}</text>
          <rect x="30" y="500" width="12" height="12" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="48" y="510" class="detail">{t('system-audio track', '系统音频音轨')}</text>
          {#if phase >= 4}
            <text x={W / 2} y="548" text-anchor="middle" class="formula">{trackBps} B/s × {hourSeconds} s</text>
            <text x={W / 2} y="570" text-anchor="middle" class="formula">= {trackHourMb} MB · {t('one track-hour', '一条音轨一小时')}</text>
            <text x={W / 2} y="596" text-anchor="middle" class="formula">2 × {trackHourMb} = {fullHourMb} MB {t('an hour', '每小时')}</text>
            <text x={W / 2} y="618" text-anchor="middle" class="detail">{t(`≈${fullHourPhotos} phone photos`, `≈${fullHourPhotos} 张手机照片`)}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: internal/meeting/mode.go.', '出处：internal/meeting/mode.go。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('WHERE THE TWO TRACKS COME FROM', '两条音轨从哪来')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">capture.start · capture.system</text>
        {#if !phone}
          <rect x="20" y="84" width="210" height="110" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="125" y="116" text-anchor="middle" class="label blue">{t('MICROPHONE', '麦克风')}</text>
          <text x="125" y="142" text-anchor="middle" class="detail">{t('your voice', '你的声音')}</text>
          <text x="125" y="164" text-anchor="middle" class="detail">{t("Chapter 2's gate", '第 2 章的门')}</text>
          <rect x="490" y="84" width="210" height="110" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="595" y="116" text-anchor="middle" class="label amber">{t('THE MAC PLAYS', 'Mac 在放')}</text>
          <text x="595" y="142" text-anchor="middle" class="detail">{t('a call, a video', '通话、视频')}</text>
          <text x="595" y="164" text-anchor="middle" class="detail">{t("other apps' sound", '其他应用的声音')}</text>
          {#if phase >= 1}
            <line x1="232" y1="170" x2="286" y2="252" stroke="var(--accent)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <text x="252" y="204" text-anchor="end" class="mono">capture.start</text>
          {/if}
          {#if phase >= 2}
            <line x1="488" y1="170" x2="434" y2="252" stroke="var(--gen)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <text x="468" y="204" text-anchor="start" class="mono">capture.system</text>
          {/if}
          <rect x="290" y="252" width="140" height="64" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="280" text-anchor="middle" class="label">HELPER</text>
          <text x="360" y="300" text-anchor="middle" class="detail">{t('Chapter 2', '第 2 章')}</text>
          {#if phase >= 1}
            <line x1="335" y1="318" x2="290" y2="358" stroke="var(--accent)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <rect x="200" y="360" width="150" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="275" y="387" text-anchor="middle" class="detail">{t('mic track', '麦克风音轨')}</text>
          {/if}
          {#if phase >= 2}
            <line x1="385" y1="318" x2="440" y2="358" stroke="var(--gen)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <rect x="380" y="360" width="180" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="470" y="387" text-anchor="middle" class="detail">{t('system-audio track', '系统音频音轨')}</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="440" class="pt">·</text>
            <text x="38" y="440" class="detail">{t("capture.system mixes every other app's sound into one mono stream", 'capture.system 把其他每个应用的声音混成一条单声道')}</text>
            <text x="28" y="464" class="pt">·</text>
            <text x="38" y="464" class="detail">{t('you still hear it; the helper holds a private copy', '你照样听得到；副本只在 helper 手里')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: docs/helper-protocol.md (capture.system).', '出处：docs/helper-protocol.md（capture.system）。')}</text>
        {:else}
          <rect x="15" y="64" width="130" height="100" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="80" y="88" text-anchor="middle" class="label blue">{t('MICROPHONE', '麦克风')}</text>
          <text x="80" y="110" text-anchor="middle" class="detail">{t('your voice', '你的声音')}</text>
          {#if phase >= 1}
            <text x="80" y="140" text-anchor="middle" class="mono">capture.start</text>
          {/if}
          <rect x="155" y="64" width="130" height="100" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="220" y="88" text-anchor="middle" class="label amber">{t('THE MAC PLAYS', 'Mac 在放')}</text>
          <text x="220" y="110" text-anchor="middle" class="detail">{t('other apps', '其他应用')}</text>
          {#if phase >= 2}
            <text x="220" y="140" text-anchor="middle" class="mono">capture.system</text>
          {/if}
          {#if phase >= 1}
            <line x1="80" y1="168" x2="120" y2="208" stroke="var(--accent)" stroke-width="2" marker-end="url(#mc-arrow)" />
          {/if}
          {#if phase >= 2}
            <line x1="220" y1="168" x2="180" y2="208" stroke="var(--gen)" stroke-width="2" marker-end="url(#mc-arrow)" />
          {/if}
          <rect x="90" y="210" width="120" height="56" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="234" text-anchor="middle" class="label">HELPER</text>
          <text x="150" y="252" text-anchor="middle" class="detail">{t('Chapter 2', '第 2 章')}</text>
          {#if phase >= 1}
            <line x1="130" y1="268" x2="146" y2="288" stroke="var(--accent)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <rect x="75" y="290" width="150" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="150" y="315" text-anchor="middle" class="detail">{t('mic track', '麦克风音轨')}</text>
          {/if}
          {#if phase >= 2}
            <line x1="170" y1="268" x2="156" y2="340" stroke="var(--gen)" stroke-width="2" marker-end="url(#mc-arrow)" />
            <rect x="60" y="342" width="180" height="40" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="367" text-anchor="middle" class="detail">{t('system-audio track', '系统音频音轨')}</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="424" class="pt">·</text>
            <text x="30" y="424" class="detail">{t('capture.system mixes every other', 'capture.system 把其他每个应用')}</text>
            <text x="30" y="444" class="detail">{t("app's sound into one mono stream", '的声音混成一条单声道')}</text>
            <text x="20" y="470" class="pt">·</text>
            <text x="30" y="470" class="detail">{t('you still hear it; the helper', '你照样听得到；')}</text>
            <text x="30" y="490" class="detail">{t('holds a private copy', '副本只在 helper 手里')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: docs/helper-protocol.md.', '出处：docs/helper-protocol.md。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE MEETING · ONE FOLDER · TWO FILES', '一场会议 · 一个文件夹 · 两个文件')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">meetings/&lt;id&gt;/mic.wav + system.wav</text>
        {#if !phone}
          <rect x="20" y="76" width="330" height="50" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="98" class="label">{t('one meeting at a time', '同时只有一场会议')}</text>
          <text x="40" y="118" class="detail">{t('a second Start is refused', '第二个 Start 会被拒绝')}</text>
          <rect x="370" y="76" width="330" height="50" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="390" y="98" class="label">{t(`disk check: ≥ ${VOXT_MEETING_DISK_START_GIB} GiB free`, `磁盘检查：至少 ${VOXT_MEETING_DISK_START_GIB} GiB 空位`)}</text>
          <text x="390" y="118" class="detail">{t('less → the meeting does not start', '不够 → 会议不开始')}</text>
          <rect x="20" y="140" width="680" height="260" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="166" class="mono">meetings/&lt;id&gt;/</text>
          <rect x="40" y="180" width="640" height="80" rx="8" fill={phase >= 1 ? 'var(--accent-soft)' : 'none'} stroke="var(--accent)" stroke-dasharray={phase >= 1 ? 'none' : '6 4'} />
          <text x="56" y="206" class="mono">mic.wav</text>
          <text x="56" y="228" class="detail">{t('16 kHz · mono · PCM16', '16 kHz · 单声道 · PCM16')}</text>
          {#if phase >= 1}
            {#each [0, 1, 2, 3, 4, 5] as i}
              <rect x={330 + i * 26} y="198" width="18" height="18" rx="3" fill="var(--accent)" />
            {/each}
            <text x="664" y="216" text-anchor="end" class="mono">+{trackBps} B/s</text>
          {/if}
          <rect x="40" y="280" width="640" height="80" rx="8" fill={phase >= 2 ? 'var(--gen-soft)' : 'none'} stroke="var(--gen)" stroke-dasharray={phase >= 2 ? 'none' : '6 4'} />
          <text x="56" y="306" class="mono">system.wav</text>
          <text x="56" y="328" class="detail">{t('16 kHz · mono · PCM16', '16 kHz · 单声道 · PCM16')}</text>
          {#if phase >= 2}
            {#each [0, 1, 2, 3, 4, 5] as i}
              <rect x={330 + i * 26} y="298" width="18" height="18" rx="3" fill="var(--gen)" />
            {/each}
            <text x="664" y="316" text-anchor="end" class="mono">+{trackBps} B/s</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="440" class="pt">·</text>
            <text x="38" y="440" class="detail">{t(`each file starts with a ${VOXT_WAV_HEADER_BYTES} B header; its lengths are written when the file closes`, `每个文件开头是 ${VOXT_WAV_HEADER_BYTES} 字节的头，长度在关闭时补写`)}</text>
            <text x="28" y="464" class="pt">·</text>
            <text x="38" y="464" class="detail">{t(`below ${VOXT_MEETING_DISK_RECORD_GIB} GiB free, recording stops itself`, `空位低于 ${VOXT_MEETING_DISK_RECORD_GIB} GiB 时，录音自己停下`)}</text>
            <text x={W / 2} y="490" text-anchor="middle" class="formula">1 s × {trackBps} B/s = {trackBps} B {t('per track', '每条音轨')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/manager.go, archive.go, disk.go.', '出处：internal/meeting/manager.go、archive.go、disk.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="88" class="label">{t('one meeting at a time', '同时只有一场会议')}</text>
          <text x="30" y="110" class="detail">{t('a second Start is refused', '第二个 Start 会被拒绝')}</text>
          <rect x="15" y="134" width="270" height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="158" class="label">{t(`disk: ≥ ${VOXT_MEETING_DISK_START_GIB} GiB free`, `磁盘：至少 ${VOXT_MEETING_DISK_START_GIB} GiB 空位`)}</text>
          <text x="30" y="180" class="detail">{t('less → the meeting does not start', '不够 → 会议不开始')}</text>
          <rect x="15" y="206" width="270" height="280" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="230" class="mono">meetings/&lt;id&gt;/</text>
          <rect x="30" y="242" width="240" height="100" rx="8" fill={phase >= 1 ? 'var(--accent-soft)' : 'none'} stroke="var(--accent)" stroke-dasharray={phase >= 1 ? 'none' : '6 4'} />
          <text x="44" y="266" class="mono">mic.wav</text>
          <text x="44" y="288" class="detail">{t('16 kHz · mono · PCM16', '16 kHz · 单声道 · PCM16')}</text>
          {#if phase >= 1}
            {#each [0, 1, 2, 3, 4] as i}
              <rect x={44 + i * 24} y="302" width="16" height="16" rx="3" fill="var(--accent)" />
            {/each}
            <text x="256" y="316" text-anchor="end" class="mono">+{trackBps} B/s</text>
          {/if}
          <rect x="30" y="354" width="240" height="100" rx="8" fill={phase >= 2 ? 'var(--gen-soft)' : 'none'} stroke="var(--gen)" stroke-dasharray={phase >= 2 ? 'none' : '6 4'} />
          <text x="44" y="378" class="mono">system.wav</text>
          <text x="44" y="400" class="detail">{t('16 kHz · mono · PCM16', '16 kHz · 单声道 · PCM16')}</text>
          {#if phase >= 2}
            {#each [0, 1, 2, 3, 4] as i}
              <rect x={44 + i * 24} y="414" width="16" height="16" rx="3" fill="var(--gen)" />
            {/each}
            <text x="256" y="428" text-anchor="end" class="mono">+{trackBps} B/s</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="516" class="pt">·</text>
            <text x="30" y="516" class="detail">{t(`each file starts with a ${VOXT_WAV_HEADER_BYTES} B header;`, `每个文件开头是 ${VOXT_WAV_HEADER_BYTES} 字节的头，`)}</text>
            <text x="30" y="536" class="detail">{t('its lengths are written at close', '长度在关闭时补写')}</text>
            <text x="20" y="562" class="pt">·</text>
            <text x="30" y="562" class="detail">{t(`below ${VOXT_MEETING_DISK_RECORD_GIB} GiB free,`, `空位低于 ${VOXT_MEETING_DISK_RECORD_GIB} GiB 时，`)}</text>
            <text x="30" y="582" class="detail">{t('recording stops itself', '录音自己停下')}</text>
            <text x={W / 2} y="622" text-anchor="middle" class="formula">1 s × {trackBps} B/s</text>
            <text x={W / 2} y="644" text-anchor="middle" class="formula">= {trackBps} B {t('per track', '每条音轨')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: manager.go, archive.go, disk.go.', '出处：manager.go、archive.go、disk.go。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t("SYSTEM AUDIO HAS ONE MORE GATE", '系统音频还有一道门')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('System Audio Recording · macOS asks once', '系统音频权限 · macOS 第一次会问')}</text>
        {#if !phone}
          <rect x="160" y="72" width="400" height="56" rx="10" fill="var(--bg)" stroke="var(--eos)" stroke-dasharray="6 4" />
          <text x={W / 2} y="96" text-anchor="middle" class="label">{t("macOS asks: record the Mac's sound?", 'macOS 问：要录 Mac 放的声音吗？')}</text>
          <text x={W / 2} y="118" text-anchor="middle" class="detail">{t('asked the first time a system tap starts', '第一次接系统龙头时会问')}</text>
          <rect x="20" y="150" width="330" height="240" rx="12" fill="var(--bg)" stroke={phase >= 1 ? 'var(--accent)' : 'var(--line)'} />
          <text x="185" y="176" text-anchor="middle" class="label blue">{t('ALLOW', '允许')}</text>
          {#if phase >= 1}
            <rect x="60" y="196" width="250" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="185" y="223" text-anchor="middle" class="detail">{t('the system tap runs', '系统龙头跑起来')}</text>
            <rect x="60" y="254" width="118" height="36" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="119" y="277" text-anchor="middle" class="detail">{t('mic ✓', '麦克风 ✓')}</text>
            <rect x="192" y="254" width="118" height="36" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="251" y="277" text-anchor="middle" class="detail">{t('system ✓', '系统 ✓')}</text>
          {/if}
          {#if phase >= 3}
            <text x="185" y="336" text-anchor="middle" class="result">{t('the meeting records', '会议开始录')}</text>
          {/if}
          <rect x="370" y="150" width="330" height="240" rx="12" fill="var(--bg)" stroke={phase >= 2 ? 'var(--eos)' : 'var(--line)'} />
          <text x="535" y="176" text-anchor="middle" class="label">{t('CANNOT START', '接不起来')}</text>
          {#if phase >= 2}
            <rect x="410" y="196" width="250" height="44" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x="535" y="223" text-anchor="middle" class="detail">{t('the tap fails to start', '系统龙头接不起来')}</text>
            <text x="535" y="272" text-anchor="middle" class="detail">{t('Start fails', 'Start 失败')}</text>
            <text x="535" y="296" text-anchor="middle" class="detail">{t('no folder, no files', '没有文件夹，没有文件')}</text>
          {/if}
          {#if phase >= 3}
            <text x="535" y="336" text-anchor="middle" class="result">{t('no meeting', '会议不开始')}</text>
          {/if}
          <text x="28" y="424" class="pt">·</text>
          <text x="38" y="424" class="detail">{t("the microphone has its own permission (Ch. 2); this gate is only for the Mac's sound", '麦克风有自己的权限（第 2 章）；这道门只管 Mac 放的声音')}</text>
          <text x="28" y="448" class="pt">·</text>
          <text x="38" y="448" class="detail">{t('either track failing to start stops the whole meeting', '任何一条音轨接不起来，整场会议都不开始')}</text>
          <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('How a refusal reaches the app has not been observed on a real Mac.', '拒绝会怎样回报给应用，还没有在真机上见过。')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: docs/helper-protocol.md, internal/meeting/track.go.', '出处：docs/helper-protocol.md、internal/meeting/track.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="60" rx="10" fill="var(--bg)" stroke="var(--eos)" stroke-dasharray="6 4" />
          <text x={W / 2} y="88" text-anchor="middle" class="label">{t("macOS asks: record the Mac's sound?", 'macOS 问：要录 Mac 放的声音吗？')}</text>
          <text x={W / 2} y="110" text-anchor="middle" class="detail">{t('asked the first time a tap starts', '第一次接系统龙头时会问')}</text>
          <rect x="15" y="136" width="270" height="190" rx="12" fill="var(--bg)" stroke={phase >= 1 ? 'var(--accent)' : 'var(--line)'} />
          <text x="150" y="162" text-anchor="middle" class="label blue">{t('ALLOW', '允许')}</text>
          {#if phase >= 1}
            <rect x="35" y="178" width="230" height="40" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="203" text-anchor="middle" class="detail">{t('the system tap runs', '系统龙头跑起来')}</text>
            <rect x="35" y="228" width="110" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="90" y="249" text-anchor="middle" class="detail">{t('mic ✓', '麦克风 ✓')}</text>
            <rect x="155" y="228" width="110" height="34" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="210" y="249" text-anchor="middle" class="detail">{t('system ✓', '系统 ✓')}</text>
          {/if}
          {#if phase >= 3}
            <text x="150" y="300" text-anchor="middle" class="result">{t('the meeting records', '会议开始录')}</text>
          {/if}
          <rect x="15" y="340" width="270" height="190" rx="12" fill="var(--bg)" stroke={phase >= 2 ? 'var(--eos)' : 'var(--line)'} />
          <text x="150" y="366" text-anchor="middle" class="label">{t('CANNOT START', '接不起来')}</text>
          {#if phase >= 2}
            <rect x="35" y="382" width="230" height="40" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x="150" y="407" text-anchor="middle" class="detail">{t('the tap fails to start', '系统龙头接不起来')}</text>
            <text x="150" y="448" text-anchor="middle" class="detail">{t('Start fails · no folder, no files', 'Start 失败 · 没有文件夹和文件')}</text>
          {/if}
          {#if phase >= 3}
            <text x="150" y="504" text-anchor="middle" class="result">{t('no meeting', '会议不开始')}</text>
          {/if}
          <text x="20" y="566" class="pt">·</text>
          <text x="30" y="566" class="detail">{t('the microphone has its own permission', '麦克风有自己的权限（第 2 章）；')}</text>
          <text x="30" y="586" class="detail">{t("(Ch. 2); this gate is only for the Mac's sound", '这道门只管 Mac 放的声音')}</text>
          <text x="20" y="612" class="pt">·</text>
          <text x="30" y="612" class="detail">{t('either track failing to start', '任何一条音轨接不起来，')}</text>
          <text x="30" y="632" class="detail">{t('stops the whole meeting', '整场会议都不开始')}</text>
          <text x={W / 2} y={H - 44} text-anchor="middle" class="footnote">{t('How a refusal reaches the app', '拒绝会怎样回报给应用，')}</text>
          <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('has not been observed on a real Mac.', '还没有在真机上见过。')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: helper-protocol.md, track.go.', '出处：helper-protocol.md、track.go。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('SWITCHING MODES MID-MEETING', '会议中途切换模式')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('shared tracks never stop', '共用的音轨从不停')}</text>
        {#if !phone}
          <rect x="255" y="70" width="210" height="38" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="94" text-anchor="middle" class="label">{phase < 1 ? t('mode: FULL MEETING', '模式：完整会议') : phase < 3 ? t('mode: SUBTITLES', '模式：字幕') : t('mode: FULL MEETING', '模式：完整会议')}</text>
          {#if phase >= 1}
            <line x1="354" y1="122" x2="354" y2="252" stroke="var(--muted)" stroke-dasharray="4 4" />
            <line x1="530" y1="122" x2="530" y2="252" stroke="var(--muted)" stroke-dasharray="4 4" />
          {/if}
          <text x="30" y="156" class="label blue">mic</text>
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as i}
            {@const on = i < 6 || (phase >= 2 && i >= 10)}
            {@const gap = i >= 6 && i < 10}
            <rect x={frameX(i)} y="138" width="16" height="16" rx="3"
              fill={on ? 'var(--accent)' : 'none'}
              stroke={gap && phase >= 1 ? 'var(--muted)' : on ? 'var(--accent)' : 'var(--line)'}
              stroke-dasharray={gap && phase >= 1 && !on ? '3 3' : 'none'} />
          {/each}
          {#if phase >= 3}
            <text x="442" y="132" text-anchor="middle" class="detail">{t('gap · nothing recorded', '空档 · 这段没录')}</text>
          {/if}
          <text x="30" y="236" class="label amber">system</text>
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as i}
            {@const on = i < 6 || (phase >= 1 && i >= 6)}
            <rect x={frameX(i)} y="218" width="16" height="16" rx="3" fill={on ? 'var(--gen)' : 'none'} stroke={on ? 'var(--gen)' : 'var(--line)'} />
          {/each}
          {#if phase >= 3}
            <text x="442" y="262" text-anchor="middle" class="detail">{t('no gap', '没有空档')}</text>
          {/if}
          <text x="90" y="288" class="tag">t0</text>
          <text x="346" y="288" class="tag">t1 · {t('switch', '切换')}</text>
          <text x="522" y="288" class="tag">t2 · {t('switch back', '切回')}</text>
          <text x="684" y="288" class="tag">t3</text>
          {#if phase >= 3}
            <text x="28" y="340" class="pt">·</text>
            <text x="38" y="340" class="detail">{t('new tracks start before old ones stop', '新音轨先开始，旧音轨再停')}</text>
            <text x="28" y="364" class="pt">·</text>
            <text x="38" y="364" class="detail">{t('a new track that cannot start leaves the meeting in its old mode', '新音轨接不起来时，会议留在旧模式')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: internal/meeting/manager_mode.go.', '出处：internal/meeting/manager_mode.go。')}</text>
        {:else}
          <rect x="45" y="64" width="210" height="38" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="88" text-anchor="middle" class="label">{phase < 1 ? t('mode: FULL MEETING', '模式：完整会议') : phase < 3 ? t('mode: SUBTITLES', '模式：字幕') : t('mode: FULL MEETING', '模式：完整会议')}</text>
          <text x="15" y="152" class="label blue">mic</text>
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as i}
            {@const on = i < 4 || (phase >= 2 && i >= 7)}
            {@const gap = i >= 4 && i < 7}
            <rect x={70 + i * 22} y="136" width="14" height="14" rx="3"
              fill={on ? 'var(--accent)' : 'none'}
              stroke={gap && phase >= 1 ? 'var(--muted)' : on ? 'var(--accent)' : 'var(--line)'}
              stroke-dasharray={gap && phase >= 1 && !on ? '3 3' : 'none'} />
          {/each}
          {#if phase >= 1}
            <line x1="151" y1="118" x2="151" y2="240" stroke="var(--muted)" stroke-dasharray="4 4" />
            <line x1="217" y1="118" x2="217" y2="240" stroke="var(--muted)" stroke-dasharray="4 4" />
          {/if}
          {#if phase >= 3}
            <text x="184" y="130" text-anchor="middle" class="detail">{t('gap', '空档')}</text>
          {/if}
          <text x="15" y="226" class="label amber">system</text>
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as i}
            {@const on = i < 4 || (phase >= 1 && i >= 4)}
            <rect x={70 + i * 22} y="210" width="14" height="14" rx="3" fill={on ? 'var(--gen)' : 'none'} stroke={on ? 'var(--gen)' : 'var(--line)'} />
          {/each}
          {#if phase >= 3}
            <text x="184" y="252" text-anchor="middle" class="detail">{t('no gap', '没有空档')}</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="310" class="pt">·</text>
            <text x="30" y="310" class="detail">{t('new tracks start before old ones stop', '新音轨先开始，旧音轨再停')}</text>
            <text x="20" y="336" class="pt">·</text>
            <text x="30" y="336" class="detail">{t('a new track that cannot start', '新音轨接不起来时，')}</text>
            <text x="30" y="356" class="detail">{t('leaves the meeting in its old mode', '会议留在旧模式')}</text>
          {/if}
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: manager_mode.go.', '出处：manager_mode.go。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('RECORD FIRST · DECIDE AT THE END', '先录下来 · 结束才决定去留')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('setting here: keep audio off (the default)', '这里的设置：保留音频关闭（默认）')}</text>
        {#if !phone}
          <rect x="20" y="76" width="680" height="110" rx="10" fill="var(--bg)" stroke={phase >= 1 ? 'var(--eos)' : 'var(--line)'} />
          <text x="40" y="104" class="label">{t('FULL MEETING · ended normally', '完整会议 · 正常结束')}</text>
          <text x="40" y="126" class="detail">{t('two WAVs written', '两个 WAV 都写好了')}</text>
          {#if phase >= 1}
            <text x="680" y="104" text-anchor="end" class="detail">{t('folder deleted right away', '文件夹马上删除')}</text>
            <text x="680" y="130" text-anchor="end" class="label">{t('0 B kept', '留下 0 B')}</text>
          {/if}
          <rect x="20" y="202" width="680" height="110" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} />
          <text x="40" y="230" class="label">{t('RECORDING MODE · ended', '录音模式 · 结束')}</text>
          <text x="40" y="252" class="detail">{t('the mode keeps its WAVs, whatever the setting', '这个模式总是留下 WAV，与设置无关')}</text>
          {#if phase >= 2}
            <text x="680" y="230" text-anchor="end" class="detail">mic.wav</text>
            <text x="680" y="256" text-anchor="end" class="label blue">{t('kept', '留下')}</text>
          {/if}
          <rect x="20" y="328" width="680" height="110" rx="10" fill="var(--bg)" stroke={phase >= 3 ? 'var(--gen)' : 'var(--line)'} />
          <text x="40" y="356" class="label">{t('FAILED OR INTERRUPTED', '失败或中断的会议')}</text>
          <text x="40" y="378" class="detail">{t('the recording stays for now, on a clock', '录音先留着，上了闹钟')}</text>
          {#if phase >= 3}
            <text x="680" y="356" text-anchor="end" class="detail">{t(`kept ${VOXT_MEETING_FAILED_KEEP_DAYS} days = ${VOXT_MEETING_FAILED_KEEP_HOURS} h`, `留 ${VOXT_MEETING_FAILED_KEEP_DAYS} 天 = ${VOXT_MEETING_FAILED_KEEP_HOURS} 小时`)}</text>
          {/if}
          {#if phase >= 4}
            <text x="680" y="382" text-anchor="end" class="label">{t(`the hourly sweep deletes it`, `每小时清扫把它删掉`)}</text>
            <text x="680" y="406" text-anchor="end" class="detail">{t("(Ch. 9 Step 5's sweep)", '（第 9 章第 5 步的清扫）')}</text>
          {/if}
          <text x={W / 2} y="472" text-anchor="middle" class="formula">{VOXT_MEETING_FAILED_KEEP_DAYS} {t('days', '天')} × 24 h = {VOXT_MEETING_FAILED_KEEP_HOURS} h · {t(`sweep every ${VOXT_MEETING_SWEEP_HOURS} h`, `每 ${VOXT_MEETING_SWEEP_HOURS} 小时清扫`)}</text>
          <text x="38" y="510" class="detail">{t("with keep audio on, a finished meeting's WAVs stay too", '保留音频打开时，正常结束的会议也留下 WAV')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/finalize.go, Voxt/meeting_audio.go.', '出处：internal/meeting/finalize.go、Voxt/meeting_audio.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="108" rx="10" fill="var(--bg)" stroke={phase >= 1 ? 'var(--eos)' : 'var(--line)'} />
          <text x="30" y="90" class="label">{t('FULL MEETING · ended', '完整会议 · 正常结束')}</text>
          <text x="30" y="112" class="detail">{t('two WAVs written', '两个 WAV 都写好了')}</text>
          {#if phase >= 1}
            <text x="30" y="140" class="detail">{t('folder deleted right away', '文件夹马上删除')}</text>
            <text x="30" y="160" class="label">{t('0 B kept', '留下 0 B')}</text>
          {/if}
          <rect x="15" y="184" width="270" height="108" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} />
          <text x="30" y="210" class="label">{t('RECORDING MODE · ended', '录音模式 · 结束')}</text>
          <text x="30" y="232" class="detail">{t('the mode keeps its WAVs', '这个模式总是留下 WAV')}</text>
          {#if phase >= 2}
            <text x="30" y="260" class="detail">mic.wav</text>
            <text x="270" y="260" text-anchor="end" class="label blue">{t('kept', '留下')}</text>
          {/if}
          <rect x="15" y="304" width="270" height="108" rx="10" fill="var(--bg)" stroke={phase >= 3 ? 'var(--gen)' : 'var(--line)'} />
          <text x="30" y="330" class="label">{t('FAILED OR INTERRUPTED', '失败或中断的会议')}</text>
          <text x="30" y="352" class="detail">{t('the recording stays, on a clock', '录音先留着，上了闹钟')}</text>
          {#if phase >= 3}
            <text x="30" y="378" class="detail">{t(`kept ${VOXT_MEETING_FAILED_KEEP_DAYS} days = ${VOXT_MEETING_FAILED_KEEP_HOURS} h`, `留 ${VOXT_MEETING_FAILED_KEEP_DAYS} 天 = ${VOXT_MEETING_FAILED_KEEP_HOURS} 小时`)}</text>
          {/if}
          {#if phase >= 4}
            <text x="30" y="400" class="detail">{t('the hourly sweep deletes it (Ch. 9 Step 5)', '每小时清扫删掉（第 9 章第 5 步）')}</text>
          {/if}
          <text x={W / 2} y="452" text-anchor="middle" class="formula">{VOXT_MEETING_FAILED_KEEP_DAYS} × 24 h = {VOXT_MEETING_FAILED_KEEP_HOURS} h</text>
          <text x={W / 2} y="474" text-anchor="middle" class="formula">{t(`sweep every ${VOXT_MEETING_SWEEP_HOURS} h`, `每 ${VOXT_MEETING_SWEEP_HOURS} 小时清扫`)}</text>
          <text x="30" y="516" class="detail">{t('with keep audio on, a finished', '保留音频打开时，正常结束的')}</text>
          <text x="30" y="536" class="detail">{t("meeting's WAVs stay too", '会议也留下 WAV')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: finalize.go, meeting_audio.go.', '出处：finalize.go、meeting_audio.go。')}</text>
        {/if}
      {:else if step === 6}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('WHO SAID IT · THE TRACK ALREADY KNOWS', '谁说的 · 音轨本来就知道')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('me needs no model · speakers need one', 'me 不用模型 · 分人要模型')}</text>
        {#if !phone}
          <rect x="20" y="76" width="335" height="200" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="40" y="102" class="label blue">{t('MIC TRACK', '麦克风音轨')}</text>
          {#each meLines as line, i}
            <text x="40" y={132 + i * 24} class="mono">{line}</text>
            {#if phase >= 0}
              <rect x="290" y={118 + i * 24} width="44" height="20" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="312" y={132 + i * 24} text-anchor="middle" class="tag">me</text>
            {/if}
          {/each}
          <text x="40" y="216" class="detail">{t('the whole track is you', '整条音轨都是你')}</text>
          <text x="40" y="240" class="detail">{t('every line: me · no model', '每行都标 me · 不用模型')}</text>
          <rect x="365" y="76" width="335" height="200" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="385" y="102" class="label amber">{t('SYSTEM TRACK', '系统音轨')}</text>
          {#each sysLines as line, i}
            <text x="385" y={132 + i * 24} class="mono">{line.text}</text>
            {#if phase >= 1 && phase < 2}
              <rect x="600" y={118 + i * 24} width="44" height="20" rx="6" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="3 3" />
              <text x="622" y={132 + i * 24} text-anchor="middle" class="tag">?</text>
            {/if}
            {#if phase >= 2}
              <rect x="600" y={118 + i * 24} width="80" height="20" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="640" y={132 + i * 24} text-anchor="middle" class="tag">{line.who}</text>
            {/if}
          {/each}
          <text x="385" y="216" class="detail">{t('several voices in one track', '一条音轨里有几个人')}</text>
          <text x="385" y="240" class="detail">{t('the after-meeting pass splits it', '会后那一遍把它分开')}</text>
          <text x={W / 2} y="300" text-anchor="middle" class="detail">{t('speaker labels need the MOSS-Transcribe-Diarize model', '分人标签需要 MOSS-Transcribe-Diarize 模型')}</text>
          {#if phase >= 3}
            <rect x="20" y="316" width="680" height="56" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="340" class="label">{t('FULL MEETING', '完整会议')}</text>
            <text x="250" y="340" class="detail">{t('mic → me · system → split', '麦克风 → me · 系统 → 分人')}</text>
            <text x="680" y="340" text-anchor="end" class="label blue">{t('labeled transcript ✓', '带标签的终稿 ✓')}</text>
            <rect x="20" y="384" width="680" height="56" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="408" class="label">{t('SUBTITLES', '字幕')}</text>
            <text x="250" y="408" class="detail">{t('no mic track → no me to set apart', '没有麦克风音轨 → 没有要分开的 me')}</text>
            <rect x="20" y="452" width="680" height="56" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="476" class="label">{t('RECORDING', '录音')}</text>
            <text x="250" y="476" class="detail">{t('no system track → nothing to split', '没有系统音轨 → 没有要分的')}</text>
            <text x={W / 2} y="526" text-anchor="middle" class="cut">{t('LIVE WORDS NOW · FINAL WORDS AFTER THE MEETING', '边录边出字 · 会后再出终稿')}</text>
            <text x={W / 2} y="552" text-anchor="middle" class="cut">{t('Live words serve the moment; the transcript stays — what does each pass do?', '直播管现在，终稿管留下——两遍各做什么？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/track_transcribe.go, finalize.go, mode.go.', '出处：internal/meeting/track_transcribe.go、finalize.go、mode.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="170" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="30" y="88" class="label blue">{t('MIC TRACK', '麦克风音轨')}</text>
          {#each meLines as line, i}
            <text x="30" y={114 + i * 22} class="mono">{line}</text>
            {#if phase >= 0}
              <rect x="228" y={100 + i * 22} width="42" height="20" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="249" y={114 + i * 22} text-anchor="middle" class="tag">me</text>
            {/if}
          {/each}
          <text x="30" y="196" class="detail">{t('the whole track is you', '整条音轨都是你')}</text>
          <text x="30" y="218" class="detail">{t('every line: me · no model', '每行都标 me · 不用模型')}</text>
          <rect x="15" y="244" width="270" height="170" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="30" y="268" class="label amber">{t('SYSTEM TRACK', '系统音轨')}</text>
          {#each sysLines as line, i}
            <text x="30" y={294 + i * 22} class="mono">{line.text}</text>
            {#if phase >= 1 && phase < 2}
              <rect x="228" y={280 + i * 22} width="42" height="20" rx="6" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="3 3" />
              <text x="249" y={294 + i * 22} text-anchor="middle" class="tag">?</text>
            {/if}
            {#if phase >= 2}
              <rect x="190" y={280 + i * 22} width="80" height="20" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="230" y={294 + i * 22} text-anchor="middle" class="tag">{line.who}</text>
            {/if}
          {/each}
          <text x="30" y="376" class="detail">{t('several voices in one track', '一条音轨里有几个人')}</text>
          <text x="30" y="398" class="detail">{t('the after-meeting pass splits it', '会后那一遍把它分开')}</text>
          <text x={W / 2} y="434" text-anchor="middle" class="detail">{t('labels need MOSS-Transcribe-Diarize', '分人标签需要 MOSS-Transcribe-Diarize')}</text>
          {#if phase >= 3}
            <rect x="15" y="452" width="270" height="64" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="476" class="label">{t('FULL MEETING', '完整会议')}</text>
            <text x="30" y="498" class="detail">{t('mic → me · system → split ✓', '麦克风 → me · 系统 → 分人 ✓')}</text>
            <rect x="15" y="528" width="270" height="64" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="552" class="label">{t('SUBTITLES', '字幕')}</text>
            <text x="30" y="574" class="detail">{t('no mic track → no me', '没有麦克风音轨 → 没有 me')}</text>
            <rect x="15" y="604" width="270" height="64" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="628" class="label">{t('RECORDING', '录音')}</text>
            <text x="30" y="650" class="detail">{t('no system track → nothing to split', '没有系统音轨 → 没有要分的')}</text>
            <text x={W / 2} y="692" text-anchor="middle" class="cut">{t('LIVE NOW · FINAL AFTER THE MEETING', '边录边出字 · 会后出终稿')}</text>
            <text x={W / 2} y="718" text-anchor="middle" class="cut">{t('Live serves the moment; the transcript stays —', '直播管现在，终稿管留下——')}</text>
            <text x={W / 2} y="740" text-anchor="middle" class="cut">{t('what does each pass do?', '两遍各做什么？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: track_transcribe.go, finalize.go.', '出处：track_transcribe.go、finalize.go。')}</text>
        {/if}
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="10" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
      <LoopProgress ms={lapMs} {lap} x={phone ? 236 : 640} y={phone ? (step === 3 ? H - 64 : H - 44) : 20} />
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
  .formula { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .result { font-size: 20px; font-weight: 650; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 11.5px; fill: var(--fg); }
  .tag { font-size: 11px; fill: var(--muted); }
  .blue { fill: var(--accent); }
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
    .result { font-size: 16px; }
  }
</style>
