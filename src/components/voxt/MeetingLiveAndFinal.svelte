<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_LIVE_COMMIT_QUIET_MS,
    VOXT_LIVE_SEGMENT_MAX_S,
    VOXT_LIVE_STREAM_MAX_MINUTES,
    VOXT_LIVE_STALE_PARTIAL_S,
    VOXT_ECHO_SLACK_S,
    VOXT_ECHO_RUN_WORDS,
    VOXT_ECHO_SHARE_PERCENT,
    VOXT_FINAL_PASS_TRACK_COUNT,
    VOXT_LIVE_LINE_COUNT,
    VOXT_FINAL_LINE_COUNT,
    VOXT_MEETING_FAILED_KEEP_DAYS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Every meeting is read twice: live while you talk, final after it ends.',
    captionZh: '一场会议认两遍：边说边出直播行，结束后再跑会后那一遍。',
  }, {
    caption: 'The live line rewrites itself as you speak; 0.75 s of quiet stores it.',
    captionZh: '直播行随说话不断改写；安静 0.75 秒就定稿存起来。',
  }, {
    caption: 'When the meeting ends, the final pass re-reads both WAVs, one track at a time.',
    captionZh: '会议结束后，会后那一遍把两个 WAV 一条条重读。',
  }, {
    caption: 'A track that re-reads well swaps its live lines for final ones, never appends.',
    captionZh: '重读成功的音轨把直播行整组换成终稿行，不是往后加。',
  }, {
    caption: "If a track's re-read fails, its live lines stay and the recording waits seven days.",
    captionZh: '一条音轨重读失败：它的直播行留下，录音留 7 天。',
  }, {
    caption: 'A mic line that mostly repeats the system track is an echo; drop it whole.',
    captionZh: '麦克风行如果大半重复系统音轨，就是回声：整行删掉。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: the question strip live words, final transcript appears over one meeting bar holding mic.wav and system.wav. Then the live pass panel appears above: words on screen while recording. Then the final pass panel below: after the end, both WAVs are read once more. Last, two lines say live answers now, the final pass writes the transcript that stays, and name the steps of the chapter.',
    zh: '画面按顺序形成：先出现问题条「直播的字、会后的终稿」和装着 mic.wav、system.wav 的会议条。随后上方出现直播那一遍的面板：边录边出字。再出现下方会后那一遍的面板：结束后把两个 WAV 再读一遍。最后出现两行：直播管现在，会后那一遍写留下来的终稿，并列出本章各步。',
  }, {
    en: 'The picture builds in order: PCM frames arrive, an empty working line box appears, the partial text grows from the next, to the next release, to the next release is Friday, a quiet 0.75 seconds tag appears, and the line moves into the stored list with its timestamps while the working line starts empty again.',
    zh: '画面按顺序形成：PCM 帧到达，出现一个空的工作行框，临时文字从 the next 长到 the next release 再到 the next release is Friday，出现安静 0.75 秒的标签，这行带着起止时间进入已存列表，工作行重新空出来。',
  }, {
    en: 'The picture builds in order: the meeting has ended; mic.wav and system.wav stand side by side. The final pass reads mic.wav first, its three chunks appear, the pill reads track 1 of 2. Then it reads system.wav, its chunks appear, the pill reads track 2 of 2. Last, two lines say both tracks are re-read, the same sound by a second reader.',
    zh: '画面按顺序形成：会议已经结束，mic.wav 和 system.wav 并排。会后那一遍先读 mic.wav，出现它的三块，标签是第 1 条，共 2 条。再读 system.wav，出现它的块，标签是第 2 条，共 2 条。最后出现两行：两条音轨都重读完，同一段声音，第二个读者。',
  }, {
    en: 'The picture builds in order: the store holds four live lines from the live pass. A replace arrow deletes this track\'s old lines, then inserts the three final lines from the re-read. The count four lines out, three lines in appears, with the note that a track with no words re-read replaces with an empty set too.',
    zh: '画面按顺序形成：存档里是直播那一遍留下的四行。替换箭头先删掉这条音轨的旧行，再插入重读得到的三行终稿。出现 4 行出、3 行进的计数，以及一行说明：重读听不到字的音轨也照样换成空集合。',
  }, {
    en: 'The picture builds in order: the store already holds the mic track\'s final lines. The system track\'s re-read starts, chunk 1 succeeds, chunk 2 fails in red, chunk 3 never runs. The system track\'s live lines stay in the store, the meeting pill turns to interrupted, and two lines appear: the recording is kept seven days for a retry, and a meeting that kept no recording cannot be reprocessed.',
    zh: '画面按顺序形成：存档里已经有麦克风音轨的终稿行。系统音轨开始重读，第 1 块成功，第 2 块变红失败，第 3 块不再运行。系统音轨的直播行留在存档里，会议标记变成中断，并出现两行：录音留 7 天等重跑；没有留下录音的会议不能再跑，终稿保持原样。',
  }, {
    en: 'The picture builds in order: the system track line we should ship Friday appears with its plus or minus 2 seconds window, then the mic track with two lines, sounds good and the same we should ship Friday. The shared three-word runs are marked, the verdict echo drops the mic copy whole while sounds good stays, and the closing question asks which system lines are Speaker 1 and which are Speaker 2.',
    zh: '画面按顺序形成：先出现系统音轨的一行 we should ship Friday 和它的前后 2 秒窗口，再出现麦克风音轨的两行：sounds good 和同样的 we should ship Friday。标出共享的三词串，判定回声把麦克风的复制整行删掉，sounds good 留下，最后提出问题：系统音轨里哪句是 Speaker 1、哪句是 Speaker 2。',
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
  const H = $derived((phone ? [690, 590, 640, 640, 760, 800] : [510, 460, 470, 470, 500, 560])[step]);
  const LP_PHONE = [646, 530, 596, 596, 676, 660];

  const PHASE_COUNTS = [4, 5, 4, 4, 5, 5];
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
    [{ x: 15, y: 64, w: 270, h: 96 }, { x: 15, y: 180, w: 270, h: 120 }, { x: 15, y: 316, w: 270, h: 120 }, { x: 15, y: 460, w: 270, h: 110 }],
    [{ x: 15, y: 64, w: 270, h: 60 }, { x: 15, y: 140, w: 270, h: 110 }, { x: 15, y: 140, w: 270, h: 110 }, { x: 15, y: 266, w: 270, h: 40 }, { x: 15, y: 322, w: 270, h: 110 }],
    [{ x: 15, y: 64, w: 270, h: 110 }, { x: 15, y: 190, w: 270, h: 120 }, { x: 15, y: 326, w: 270, h: 120 }, { x: 15, y: 470, w: 270, h: 100 }],
    [{ x: 15, y: 64, w: 270, h: 170 }, { x: 15, y: 250, w: 270, h: 50 }, { x: 15, y: 316, w: 270, h: 160 }, { x: 15, y: 500, w: 270, h: 80 }],
    [{ x: 15, y: 64, w: 270, h: 120 }, { x: 15, y: 200, w: 270, h: 130 }, { x: 15, y: 200, w: 270, h: 130 }, { x: 15, y: 346, w: 270, h: 150 }, { x: 15, y: 520, w: 270, h: 130 }],
    [{ x: 15, y: 64, w: 270, h: 190 }, { x: 15, y: 270, w: 270, h: 60 }, { x: 15, y: 120, w: 270, h: 130 }, { x: 15, y: 356, w: 270, h: 120 }, { x: 15, y: 560, w: 270, h: 110 }],
  ] : [
    [{ x: 160, y: 70, w: 400, h: 42 }, { x: 20, y: 200, w: 680, h: 100 }, { x: 20, y: 320, w: 680, h: 100 }, { x: 20, y: 446, w: 680, h: 40 }],
    [{ x: 90, y: 76, w: 540, h: 40 }, { x: 60, y: 136, w: 600, h: 74 }, { x: 60, y: 136, w: 600, h: 74 }, { x: 60, y: 232, w: 600, h: 36 }, { x: 60, y: 288, w: 600, h: 70 }],
    [{ x: 20, y: 80, w: 680, h: 90 }, { x: 20, y: 190, w: 335, h: 130 }, { x: 365, y: 190, w: 335, h: 130 }, { x: 20, y: 360, w: 680, h: 60 }],
    [{ x: 20, y: 90, w: 335, h: 210 }, { x: 360, y: 170, w: 40, h: 50 }, { x: 365, y: 90, w: 335, h: 210 }, { x: 20, y: 350, w: 680, h: 70 }],
    [{ x: 365, y: 90, w: 335, h: 130 }, { x: 20, y: 90, w: 335, h: 130 }, { x: 20, y: 90, w: 335, h: 130 }, { x: 20, y: 250, w: 680, h: 120 }, { x: 20, y: 400, w: 680, h: 70 }],
    [{ x: 20, y: 80, w: 680, h: 200 }, { x: 60, y: 300, w: 600, h: 40 }, { x: 20, y: 170, w: 680, h: 120 }, { x: 20, y: 360, w: 680, h: 100 }, { x: 20, y: 486, w: 680, h: 50 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  const quietMs = VOXT_LIVE_COMMIT_QUIET_MS / 1000;
  // The constructed mic lines: four live commits, three final lines.
  const liveLines = [
    { span: '00:02–00:03', text: 'hi' },
    { span: '00:04–00:05', text: 'everyone' },
    { span: '00:14–00:16', text: 'sounds good' },
    { span: '00:21–00:25', text: 'the next release is Friday' },
  ];
  const finalLines = [
    { span: '00:02–00:05', text: 'hi everyone' },
    { span: '00:14–00:16', text: 'sounds good' },
    { span: '00:21–00:25', text: 'the next release is Friday' },
  ];
  const partials = ['“the next”', '“the next release”', '“the next release is Friday”'];
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="lf-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE MEETING · READ TWICE', '一场会议 · 认两遍')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('pass = one full read of the sound', '一遍 = 把声音完整读一次')}</text>
        {#if !phone}
          <rect x="160" y="70" width="400" height="42" rx="8" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="6 4" />
          <text x={W / 2} y="96" text-anchor="middle" class="detail">{t('live words ? · the final transcript ?', '直播的字 ？· 会后的终稿 ？')}</text>
          <rect x="60" y="128" width="600" height="12" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="60" y="122" class="tag">{t('the meeting records', '会议在录')}</text>
          <rect x="240" y="150" width="110" height="26" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="295" y="167" text-anchor="middle" class="detail">mic.wav</text>
          <rect x="370" y="150" width="130" height="26" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="435" y="167" text-anchor="middle" class="detail">system.wav</text>
          <text x="516" y="167" class="detail">{t('(Ch. 12)', '（第 12 章）')}</text>
          {#if phase >= 1}
            <rect x="20" y="200" width="680" height="100" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="228" class="label blue">{t('LIVE PASS · WHILE RECORDING', '直播那一遍 · 边录边认')}</text>
            <text x="40" y="254" class="mono">00:02 hi · 00:04 everyone · …</text>
            <text x="40" y="278" class="detail">{t('words on screen as you talk', '你一边说，字一边上屏')}</text>
            <text x="680" y="228" text-anchor="end" class="detail">{t("Ch. 4's streaming route", '第 4 章的流式路线')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="320" width="680" height="100" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="40" y="348" class="label amber">{t('FINAL PASS · AFTER THE END', '会后那一遍 · 结束之后')}</text>
            <text x="40" y="374" class="detail">{t('re-reads both WAVs from the files', '把两个 WAV 从文件里再读一遍')}</text>
            <text x="40" y="398" class="detail">{t('the whole file, no hurry', '整个文件，不赶时间')}</text>
            <text x="680" y="348" text-anchor="end" class="detail">{t("Ch. 4's file route", '第 4 章的文件路线')}</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="452" class="pt">·</text>
            <text x="38" y="452" class="detail">{t('live answers now; the final pass writes the transcript that stays', '直播管现在看得到，会后那一遍写留下来的终稿')}</text>
            <text x="28" y="476" class="pt">·</text>
            <text x="38" y="476" class="detail">{t('this chapter: live (Step 2), then the final pass — replace, failure, echo (Steps 3–6)', '本章：直播（第 2 步），再会后那一遍——替换、失败、回声（第 3–6 步）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/live.go, finalize.go.', '出处：internal/meeting/live.go、finalize.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="40" rx="8" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="6 4" />
          <text x={W / 2} y="88" text-anchor="middle" class="detail">{t('live words ? · final transcript ?', '直播的字 ？· 会后的终稿 ？')}</text>
          <rect x="30" y="120" width="240" height="12" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="114" class="tag">{t('the meeting records', '会议在录')}</text>
          <rect x="30" y="142" width="100" height="24" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="80" y="158" text-anchor="middle" class="detail">mic.wav</text>
          <rect x="140" y="142" width="120" height="24" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="200" y="158" text-anchor="middle" class="detail">system.wav</text>
          {#if phase >= 1}
            <rect x="15" y="180" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="206" class="label blue">{t('LIVE PASS · WHILE RECORDING', '直播那一遍 · 边录边认')}</text>
            <text x="30" y="232" class="mono">00:02 hi · 00:04 everyone</text>
            <text x="30" y="258" class="detail">{t('words on screen as you talk', '你一边说，字一边上屏')}</text>
            <text x="30" y="280" class="detail">{t("Ch. 4's streaming route", '第 4 章的流式路线')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="316" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="30" y="342" class="label amber">{t('FINAL PASS · AFTER THE END', '会后那一遍 · 结束之后')}</text>
            <text x="30" y="368" class="detail">{t('re-reads both WAVs', '把两个 WAV 再读一遍')}</text>
            <text x="30" y="390" class="detail">{t('the whole file, no hurry', '整个文件，不赶时间')}</text>
            <text x="30" y="412" class="detail">{t("Ch. 4's file route", '第 4 章的文件路线')}</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="470" class="pt">·</text>
            <text x="30" y="470" class="detail">{t('live answers now; the final pass', '直播管现在看得到，')}</text>
            <text x="30" y="490" class="detail">{t('writes the transcript that stays', '会后那一遍写留下来的终稿')}</text>
            <text x="20" y="516" class="pt">·</text>
            <text x="30" y="516" class="detail">{t('live (Step 2), then the final pass:', '直播（第 2 步），再会后那一遍：')}</text>
            <text x="30" y="536" class="detail">{t('replace, failure, echo (Steps 3–6)', '替换、失败、回声（第 3–6 步）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: live.go, finalize.go.', '出处：live.go、finalize.go。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('LIVE · REWRITE, THEN COMMIT', '直播 · 先改写，再定稿')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('commit = freeze a line and store it', '定稿 = 把一行固定下来存起来')}</text>
        {#if !phone}
          {#each [0, 1, 2, 3, 4, 5] as i}
            <rect x={246 + i * 40} y="76" width="18" height="18" rx="3" fill="var(--accent)" />
          {/each}
          <text x={W / 2} y="112" text-anchor="middle" class="detail">{t('PCM frames arrive (Ch. 3)', 'PCM 帧不断到达（第 3 章）')}</text>
          <rect x="60" y="136" width="600" height="74" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="6 4" />
          <text x="80" y="162" class="label blue">{t('WORKING LINE', '工作行')}</text>
          {#if phase >= 1 && phase < 4}
            <text x={W / 2} y="192" text-anchor="middle" class="value">{partials[Math.min(phase - 1, 2)]}</text>
          {/if}
          {#if phase === 0}
            <text x={W / 2} y="192" text-anchor="middle" class="detail">{t('(empty · listening)', '（空 · 在听）')}</text>
          {/if}
          {#if phase >= 3}
            <text x={W / 2} y="252" text-anchor="middle" class="cut">{t(`quiet ${quietMs} s`, `安静 ${quietMs} 秒`)}</text>
          {/if}
          <rect x="60" y="288" width="600" height="70" rx="10" fill={phase >= 4 ? 'var(--bg)' : 'none'} stroke={phase >= 4 ? 'var(--fg)' : 'var(--muted)'} stroke-dasharray={phase >= 4 ? 'none' : '6 4'} />
          <text x="80" y="314" class="label">{t('STORED', '已存')}</text>
          {#if phase >= 4}
            <text x={W / 2} y="340" text-anchor="middle" class="mono">{liveLines[3].span} · {liveLines[3].text}</text>
            <text x={W / 2} y="388" text-anchor="middle" class="detail">{t('the working line starts empty again', '工作行重新空出来')}</text>
            <text x={W / 2} y="418" text-anchor="middle" class="formula">{t(`quiet ${quietMs} s → commit · one line is cut at ${VOXT_LIVE_SEGMENT_MAX_S} s at most`, `安静 ${quietMs} 秒 → 定稿 · 一行最多 ${VOXT_LIVE_SEGMENT_MAX_S} 秒`)}</text>
          {/if}
          <text x={W / 2} y={H - 24} text-anchor="middle" class="footnote">{t(`A live stream also restarts after ${VOXT_LIVE_STREAM_MAX_MINUTES} min, or ${VOXT_LIVE_STALE_PARTIAL_S} s without updates.`, `一条直播流还会在 ${VOXT_LIVE_STREAM_MAX_MINUTES} 分钟或 ${VOXT_LIVE_STALE_PARTIAL_S} 秒没有更新后重启。`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/live.go, committer.go.', '出处：internal/meeting/live.go、committer.go。')}</text>
        {:else}
          {#each [0, 1, 2, 3, 4] as i}
            <rect x={90 + i * 26} y="64" width="16" height="16" rx="3" fill="var(--accent)" />
          {/each}
          <text x={W / 2} y="98" text-anchor="middle" class="detail">{t('PCM frames arrive (Ch. 3)', 'PCM 帧不断到达（第 3 章）')}</text>
          <rect x="15" y="140" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="6 4" />
          <text x="30" y="166" class="label blue">{t('WORKING LINE', '工作行')}</text>
          {#if phase >= 1 && phase < 4}
            <text x={W / 2} y="216" text-anchor="middle" class="value">{partials[Math.min(phase - 1, 2)]}</text>
          {/if}
          {#if phase === 0}
            <text x={W / 2} y="216" text-anchor="middle" class="detail">{t('(empty · listening)', '（空 · 在听）')}</text>
          {/if}
          {#if phase >= 3}
            <text x={W / 2} y="286" text-anchor="middle" class="cut">{t(`quiet ${quietMs} s`, `安静 ${quietMs} 秒`)}</text>
          {/if}
          <rect x="15" y="322" width="270" height="110" rx="10" fill={phase >= 4 ? 'var(--bg)' : 'none'} stroke={phase >= 4 ? 'var(--fg)' : 'var(--muted)'} stroke-dasharray={phase >= 4 ? 'none' : '6 4'} />
          <text x="30" y="348" class="label">{t('STORED', '已存')}</text>
          {#if phase >= 4}
            <text x={W / 2} y="380" text-anchor="middle" class="mono">{liveLines[3].span}</text>
            <text x={W / 2} y="404" text-anchor="middle" class="mono">{liveLines[3].text}</text>
            <text x={W / 2} y="452" text-anchor="middle" class="detail">{t('the working line starts empty again', '工作行重新空出来')}</text>
            <text x={W / 2} y="488" text-anchor="middle" class="formula">{t(`quiet ${quietMs} s → commit`, `安静 ${quietMs} 秒 → 定稿`)}</text>
            <text x={W / 2} y="510" text-anchor="middle" class="formula">{t(`one line ≤ ${VOXT_LIVE_SEGMENT_MAX_S} s`, `一行最多 ${VOXT_LIVE_SEGMENT_MAX_S} 秒`)}</text>
          {/if}
          <text x={W / 2} y={H - 40} text-anchor="middle" class="footnote">{t(`A stream also restarts after ${VOXT_LIVE_STREAM_MAX_MINUTES} min,`, `一条直播流还会在 ${VOXT_LIVE_STREAM_MAX_MINUTES} 分钟，`)}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`or ${VOXT_LIVE_STALE_PARTIAL_S} s without updates.`, `或 ${VOXT_LIVE_STALE_PARTIAL_S} 秒没有更新后重启。`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: live.go, committer.go.', '出处：live.go、committer.go。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THE FINAL PASS · ONE TRACK AT A TIME', '会后那一遍 · 一次一条音轨')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('file route = read a whole recording (Ch. 4)', '文件路线 = 读一整段录音（第 4 章）')}</text>
        {#if !phone}
          <rect x="230" y="80" width="260" height="40" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="105" text-anchor="middle" class="label">{phase < 1 ? t('the meeting has ended', '会议已经结束') : phase < 2 ? t(`FINAL PASS · track 1 of ${VOXT_FINAL_PASS_TRACK_COUNT}`, `会后那一遍 · 第 1 条，共 ${VOXT_FINAL_PASS_TRACK_COUNT} 条`) : t(`FINAL PASS · track 2 of ${VOXT_FINAL_PASS_TRACK_COUNT}`, `会后那一遍 · 第 2 条，共 ${VOXT_FINAL_PASS_TRACK_COUNT} 条`)}</text>
          <rect x="20" y="190" width="335" height="130" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width={phase === 1 ? 2.5 : 1.5} />
          <text x="40" y="216" class="label blue">mic.wav</text>
          {#if phase >= 1}
            {#each [0, 1, 2] as i}
              <rect x={40 + i * 100} y="236" width="84" height="34" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={82 + i * 100} y="258" text-anchor="middle" class="detail">{t(`chunk ${i + 1}`, `第 ${i + 1} 块`)}</text>
            {/each}
            <text x="40" y="300" class="detail">{t('read → find speech → chunks → transcribe', '读文件 → 找语音 → 切块 → 逐块认')}</text>
          {/if}
          <rect x="365" y="190" width="335" height="130" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width={phase === 2 ? 2.5 : 1.5} />
          <text x="385" y="216" class="label amber">system.wav</text>
          {#if phase >= 2}
            {#each [0, 1, 2] as i}
              <rect x={385 + i * 100} y="236" width="84" height="34" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={427 + i * 100} y="258" text-anchor="middle" class="detail">{t(`chunk ${i + 1}`, `第 ${i + 1} 块`)}</text>
            {/each}
            <text x="385" y="300" class="detail">{t('read → find speech → chunks → transcribe', '读文件 → 找语音 → 切块 → 逐块认')}</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="380" class="pt">·</text>
            <text x="38" y="380" class="detail">{t('both tracks re-read · the same sound, a second reader', '两条音轨都重读完 · 同一段声音，第二个读者')}</text>
            <text x="28" y="404" class="pt">·</text>
            <text x="38" y="404" class="detail">{t('the live lines stay on screen the whole time', '整个过程中直播行一直在屏上')}</text>
            <text x={W / 2} y="440" text-anchor="middle" class="formula">{t(`progress = tracks done ÷ ${VOXT_FINAL_PASS_TRACK_COUNT}`, `进度 = 已认音轨 ÷ ${VOXT_FINAL_PASS_TRACK_COUNT}`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/finalize.go.', '出处：internal/meeting/finalize.go。')}</text>
        {:else}
          <rect x="45" y="64" width="210" height="40" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="82" text-anchor="middle" class="label">{phase < 1 ? t('meeting ended', '会议结束') : t(`track ${Math.min(phase, 2)} of ${VOXT_FINAL_PASS_TRACK_COUNT}`, `第 ${Math.min(phase, 2)} 条，共 ${VOXT_FINAL_PASS_TRACK_COUNT} 条`)}</text>
          <text x={W / 2} y="98" text-anchor="middle" class="detail">{phase < 1 ? '' : t('FINAL PASS', '会后那一遍')}</text>
          <rect x="15" y="190" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width={phase === 1 ? 2.5 : 1.5} />
          <text x="30" y="214" class="label blue">mic.wav</text>
          {#if phase >= 1}
            {#each [0, 1, 2] as i}
              <rect x={30 + i * 84} y="232" width="72" height="30" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={66 + i * 84} y="251" text-anchor="middle" class="detail">{t(`chunk ${i + 1}`, `第 ${i + 1} 块`)}</text>
            {/each}
            <text x="30" y="286" class="detail">{t('read → speech → chunks → transcribe', '读 → 找语音 → 切块 → 逐块认')}</text>
          {/if}
          <rect x="15" y="326" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width={phase === 2 ? 2.5 : 1.5} />
          <text x="30" y="350" class="label amber">system.wav</text>
          {#if phase >= 2}
            {#each [0, 1, 2] as i}
              <rect x={30 + i * 84} y="368" width="72" height="30" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={66 + i * 84} y="387" text-anchor="middle" class="detail">{t(`chunk ${i + 1}`, `第 ${i + 1} 块`)}</text>
            {/each}
            <text x="30" y="422" class="detail">{t('read → speech → chunks → transcribe', '读 → 找语音 → 切块 → 逐块认')}</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="480" class="pt">·</text>
            <text x="30" y="480" class="detail">{t('both tracks re-read · same sound,', '两条音轨都重读完 · 同一段声音，')}</text>
            <text x="30" y="500" class="detail">{t('a second reader', '第二个读者')}</text>
            <text x="20" y="526" class="pt">·</text>
            <text x="30" y="526" class="detail">{t('the live lines stay on screen meanwhile', '这期间直播行一直在屏上')}</text>
            <text x={W / 2} y="562" text-anchor="middle" class="formula">{t(`progress = tracks ÷ ${VOXT_FINAL_PASS_TRACK_COUNT}`, `进度 = 已认音轨 ÷ ${VOXT_FINAL_PASS_TRACK_COUNT}`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: finalize.go.', '出处：finalize.go。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('REPLACE · NOT APPEND', '整组换掉 · 不是往后加')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t("store = where a meeting's lines are kept", '存档 = 存会议文字的地方')}</text>
        {#if !phone}
          <rect x="20" y="90" width="335" height="210" rx="10" fill="var(--bg)" stroke={phase >= 1 ? 'var(--muted)' : 'var(--accent)'} stroke-dasharray={phase >= 1 ? '6 4' : 'none'} />
          <text x="40" y="116" class="label">{t('BEFORE · the store', '之前 · 存档')}</text>
          {#each liveLines as line, i}
            <text x="40" y={148 + i * 30} class="mono" opacity={phase >= 1 ? 0.45 : 1}>{line.span} · {line.text}</text>
          {/each}
          <text x="40" y="282" class="detail">{t(`${VOXT_LIVE_LINE_COUNT} lines from the live pass`, `直播那一遍的 ${VOXT_LIVE_LINE_COUNT} 行`)}</text>
          {#if phase >= 1}
            <text x={W / 2} y="76" text-anchor="middle" class="label">{t('REPLACE · delete these, insert the re-read', '替换 · 删掉这些，插入重读的')}</text>
            <line x1="358" y1="195" x2="398" y2="195" stroke="var(--muted)" stroke-width="2" marker-end="url(#lf-arrow)" />
          {/if}
          <rect x="365" y="90" width="335" height="210" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--fg)' : 'var(--muted)'} stroke-dasharray={phase >= 2 ? 'none' : '6 4'} />
          <text x="385" y="116" class="label">{t('AFTER · the store', '之后 · 存档')}</text>
          {#if phase >= 2}
            {#each finalLines as line, i}
              <text x="385" y={148 + i * 30} class="mono">{line.span} · {line.text}</text>
            {/each}
            <text x="385" y="282" class="detail">{t(`${VOXT_FINAL_LINE_COUNT} lines from the final pass`, `会后那一遍的 ${VOXT_FINAL_LINE_COUNT} 行`)}</text>
          {/if}
          {#if phase >= 3}
            <text x={W / 2} y="356" text-anchor="middle" class="cut">{VOXT_LIVE_LINE_COUNT} {t('lines out', '行出')} · {VOXT_FINAL_LINE_COUNT} {t('lines in', '行进')}</text>
            <text x="28" y="392" class="pt">·</text>
            <text x="38" y="392" class="detail">{t('live split “hi” and “everyone” at your pause; the file read hears them together', '直播在你的停顿处切成两行；整读把它们听在一起')}</text>
            <text x="28" y="414" class="pt">·</text>
            <text x="38" y="414" class="detail">{t('a track with no words re-read replaces with an empty set too', '重读听不到字的音轨，也照样换成空集合')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/store/sqlitestore/meetings.go (ReplaceSegments).', '出处：internal/store/sqlitestore/meetings.go（ReplaceSegments）。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="170" rx="10" fill="var(--bg)" stroke={phase >= 1 ? 'var(--muted)' : 'var(--accent)'} stroke-dasharray={phase >= 1 ? '6 4' : 'none'} />
          <text x="30" y="88" class="label">{t('BEFORE · the store', '之前 · 存档')}</text>
          {#each liveLines as line, i}
            <text x="30" y={114 + i * 22} class="mono" opacity={phase >= 1 ? 0.45 : 1}>{line.text}</text>
          {/each}
          <text x="30" y="216" class="detail">{t(`${VOXT_LIVE_LINE_COUNT} live lines`, `直播的 ${VOXT_LIVE_LINE_COUNT} 行`)}</text>
          {#if phase >= 1}
            <text x={W / 2} y="270" text-anchor="middle" class="label">{t('↓ REPLACE · delete, then insert', '↓ 替换 · 先删，再插')}</text>
          {/if}
          <rect x="15" y="316" width="270" height="160" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--fg)' : 'var(--muted)'} stroke-dasharray={phase >= 2 ? 'none' : '6 4'} />
          <text x="30" y="340" class="label">{t('AFTER · the store', '之后 · 存档')}</text>
          {#if phase >= 2}
            {#each finalLines as line, i}
              <text x="30" y={366 + i * 22} class="mono">{line.text}</text>
            {/each}
            <text x="30" y="458" class="detail">{t(`${VOXT_FINAL_LINE_COUNT} final lines`, `终稿的 ${VOXT_FINAL_LINE_COUNT} 行`)}</text>
          {/if}
          {#if phase >= 3}
            <text x={W / 2} y="510" text-anchor="middle" class="cut">{VOXT_LIVE_LINE_COUNT} {t('out', '出')} · {VOXT_FINAL_LINE_COUNT} {t('in', '进')}</text>
            <text x="20" y="540" class="pt">·</text>
            <text x="30" y="540" class="detail">{t('live split “hi” / “everyone” at your pause', '直播在你的停顿处切成两行')}</text>
            <text x="20" y="566" class="pt">·</text>
            <text x="30" y="566" class="detail">{t('no words re-read → an empty set replaces too', '重读没字 → 也换成空集合')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: meetings.go (ReplaceSegments).', '出处：meetings.go（ReplaceSegments）。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('A FAILED RE-READ KEEPS THE LIVE LINES', '重读失败 · 直播行留下')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('interrupted = the meeting keeps what it had', '中断 = 会议保住已有的内容')}</text>
        {#if !phone}
          <rect x="20" y="90" width="335" height="130" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="40" y="116" class="label amber">{t('SYSTEM TRACK · re-reading', '系统音轨 · 正在重读')}</text>
          {#if phase >= 1}
            <rect x="40" y="136" width="90" height="32" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="85" y="157" text-anchor="middle" class="detail">{t('chunk 1 ✓', '第 1 块 ✓')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="140" y="136" width="90" height="32" rx="6" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x="185" y="157" text-anchor="middle" class="detail">{t('chunk 2 ✗', '第 2 块 ✗')}</text>
            <rect x="240" y="136" width="90" height="32" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3" />
            <text x="285" y="157" text-anchor="middle" class="detail">{t('never ran', '不再跑')}</text>
          {/if}
          {#if phase >= 2}
            <text x="40" y="200" class="detail">{t('the pass stops mid-track', '这一遍停在半路')}</text>
          {/if}
          <rect x="365" y="90" width="335" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="385" y="116" class="label">{t('THE STORE', '存档')}</text>
          <text x="385" y="146" class="mono">mic · {t('final lines', '终稿行')} ✓</text>
          <text x="385" y="176" class="mono">system · {phase >= 3 ? t('live lines · kept', '直播行 · 留下') : t('live lines', '直播行')}</text>
          {#if phase >= 3}
            <rect x="230" y="250" width="260" height="40" rx="9" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x={W / 2} y="275" text-anchor="middle" class="label">{t('meeting: INTERRUPTED', '会议：中断')}</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="330" class="pt">·</text>
            <text x="38" y="330" class="detail">{t('the mic track was replaced first, so it keeps its final lines', '麦克风音轨先认完，所以它留下终稿行')}</text>
            <text x="28" y="354" class="pt">·</text>
            <text x="38" y="354" class="detail">{t('the failed track keeps its live lines — nothing is lost', '失败的音轨留下直播行——什么都没丢')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="404" class="pt">·</text>
            <text x="38" y="404" class="detail">{t(`the recording waits ${VOXT_MEETING_FAILED_KEEP_DAYS} days for a reprocess (Ch. 12 Step 6's clock)`, `录音留 ${VOXT_MEETING_FAILED_KEEP_DAYS} 天等重跑（第 12 章第 6 步的钟）`)}</text>
            <text x="28" y="428" class="pt">·</text>
            <text x="38" y="428" class="detail">{t('a meeting that kept no recording cannot be reprocessed — its transcript stays', '没留下录音的会议不能再跑——终稿保持原样')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/finalize.go, manager_finalize.go.', '出处：internal/meeting/finalize.go、manager_finalize.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('THE STORE', '存档')}</text>
          <text x="30" y="116" class="mono">mic · {t('final lines', '终稿行')} ✓</text>
          <text x="30" y="144" class="mono">system · {phase >= 3 ? t('live lines · kept', '直播行 · 留下') : t('live lines', '直播行')}</text>
          <rect x="15" y="200" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="30" y="224" class="label amber">{t('SYSTEM TRACK · re-reading', '系统音轨 · 正在重读')}</text>
          {#if phase >= 1}
            <rect x="30" y="242" width="72" height="30" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="66" y="262" text-anchor="middle" class="detail">{t('chunk 1 ✓', '第 1 块 ✓')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="114" y="242" width="72" height="30" rx="6" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x="150" y="262" text-anchor="middle" class="detail">{t('chunk 2 ✗', '第 2 块 ✗')}</text>
            <rect x="198" y="242" width="72" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3" />
            <text x="234" y="262" text-anchor="middle" class="detail">{t('never ran', '不再跑')}</text>
            <text x="30" y="306" class="detail">{t('the pass stops mid-track', '这一遍停在半路')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="45" y="346" width="210" height="38" rx="9" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x={W / 2} y="370" text-anchor="middle" class="label">{t('meeting: INTERRUPTED', '会议：中断')}</text>
            <text x="20" y="420" class="pt">·</text>
            <text x="30" y="420" class="detail">{t('the mic track was replaced first,', '麦克风音轨先认完，')}</text>
            <text x="30" y="440" class="detail">{t('so it keeps its final lines', '所以它留下终稿行')}</text>
            <text x="20" y="466" class="pt">·</text>
            <text x="30" y="466" class="detail">{t('the failed track keeps its live lines', '失败的音轨留下直播行')}</text>
          {/if}
          {#if phase >= 4}
            <text x="20" y="530" class="pt">·</text>
            <text x="30" y="530" class="detail">{t(`the recording waits ${VOXT_MEETING_FAILED_KEEP_DAYS} days`, `录音留 ${VOXT_MEETING_FAILED_KEEP_DAYS} 天等重跑`)}</text>
            <text x="30" y="550" class="detail">{t("for a reprocess (Ch. 12 Step 6's clock)", '（第 12 章第 6 步的钟）')}</text>
            <text x="20" y="576" class="pt">·</text>
            <text x="30" y="576" class="detail">{t('no recording kept → no reprocess;', '没留下录音 → 不能再跑；')}</text>
            <text x="30" y="596" class="detail">{t('the transcript stays', '终稿保持原样')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: finalize.go, manager_finalize.go.', '出处：finalize.go、manager_finalize.go。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THE MIC HEARD THE SPEAKERS TOO', '麦克风也听到了喇叭')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t("echo = the speakers' words in your mic track", '回声 = 喇叭的话进了你的麦克风音轨')}</text>
        {#if !phone}
          <rect x="20" y="80" width="680" height="70" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="40" y="106" class="label amber">{t('SYSTEM TRACK', '系统音轨')}</text>
          <text x="40" y="132" class="mono">00:20–00:25 · we should ship Friday</text>
          <text x="680" y="106" text-anchor="end" class="detail">{t(`window: ±${VOXT_ECHO_SLACK_S} s`, `窗口：前后 ${VOXT_ECHO_SLACK_S} 秒`)}</text>
          <rect x="20" y="170" width="680" height="120" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="40" y="196" class="label blue">{t('MIC TRACK', '麦克风音轨')}</text>
          <text x="40" y="226" class="mono">00:14 · sounds good</text>
          <text x="40" y="258" class="mono" opacity={phase >= 2 ? 0.45 : 1}>00:21 · we should ship Friday</text>
          {#if phase >= 2}
            <line x1="40" y1="254" x2="305" y2="254" stroke="var(--eos)" stroke-width="2" />
            <text x="680" y="284" text-anchor="end" class="label" fill="var(--eos)">{t('ECHO · dropped whole', '回声 · 整行删掉')}</text>
          {/if}
          {#if phase >= 1}
            <rect x="330" y="238" width="150" height="24" rx="6" fill="var(--bg)" stroke="var(--fg)" />
            <text x="405" y="254" text-anchor="middle" class="mono">we should ship</text>
            <rect x="490" y="238" width="150" height="24" rx="6" fill="var(--bg)" stroke="var(--fg)" />
            <text x="565" y="254" text-anchor="middle" class="mono">should ship Friday</text>
          {/if}
          {#if phase >= 2}
            <text x={W / 2} y="318" text-anchor="middle" class="formula">{t(`shared 4 of 4 words ≥ ${VOXT_ECHO_SHARE_PERCENT}% → echo`, `4 个词里 4 个共享 ≥ ${VOXT_ECHO_SHARE_PERCENT}% → 回声`)}</text>
          {/if}
          {#if phase >= 3}
            <text x="28" y="380" class="pt">·</text>
            <text x="38" y="380" class="detail">{t(`the check: ${VOXT_ECHO_RUN_WORDS} words in a row, over half the line, within ±${VOXT_ECHO_SLACK_S} s`, `检查：连续 ${VOXT_ECHO_RUN_WORDS} 个词、超过半行、前后 ${VOXT_ECHO_SLACK_S} 秒内`)}</text>
            <text x="28" y="404" class="pt">·</text>
            <text x="38" y="404" class="detail">{t('sounds good shares no run → it stays; a dropped line is never rewritten', 'sounds good 没有共享词串 → 留下；删行不改写')}</text>
            <text x="28" y="428" class="pt">·</text>
            <text x="38" y="428" class="detail">{t('checked live (an echo never lands) and again after the final pass', '直播时查一遍（回声不上屏），会后再查一遍')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="506" text-anchor="middle" class="cut">{t('The words are final — but which system lines are Speaker 1, which Speaker 2?', '字都定稿了——系统音轨里哪句是 Speaker 1、哪句是 Speaker 2？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/echo.go, track_transcribe.go, finalize.go.', '出处：internal/meeting/echo.go、track_transcribe.go、finalize.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="96" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="30" y="88" class="label amber">{t('SYSTEM TRACK', '系统音轨')}</text>
          <text x="30" y="114" class="mono">00:20–00:25</text>
          <text x="30" y="138" class="mono">we should ship Friday</text>
          <rect x="15" y="176" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="30" y="200" class="label blue">{t('MIC TRACK', '麦克风音轨')}</text>
          <text x="30" y="228" class="mono">00:14 · sounds good</text>
          <text x="30" y="256" class="mono" opacity={phase >= 2 ? 0.45 : 1}>00:21 · we should ship Friday</text>
          {#if phase >= 2}
            <line x1="30" y1="252" x2="250" y2="252" stroke="var(--eos)" stroke-width="2" />
            <text x="30" y="288" class="label" fill="var(--eos)">{t('ECHO · dropped whole', '回声 · 整行删掉')}</text>
          {/if}
          {#if phase >= 1}
            <text x={W / 2} y="336" text-anchor="middle" class="mono">we should ship · should ship Friday</text>
            <text x={W / 2} y="358" text-anchor="middle" class="detail">{t('shared 3-word runs', '共享的三词串')}</text>
          {/if}
          {#if phase >= 2}
            <text x={W / 2} y="392" text-anchor="middle" class="formula">{t(`4 of 4 words ≥ ${VOXT_ECHO_SHARE_PERCENT}% → echo`, `4 个词里 4 个共享 → 回声`)}</text>
          {/if}
          {#if phase >= 3}
            <text x="20" y="440" class="pt">·</text>
            <text x="30" y="440" class="detail">{t(`the check: ${VOXT_ECHO_RUN_WORDS} words in a row, over half,`, `检查：连续 ${VOXT_ECHO_RUN_WORDS} 个词、超过半行、`)}</text>
            <text x="30" y="460" class="detail">{t(`within ±${VOXT_ECHO_SLACK_S} s`, `前后 ${VOXT_ECHO_SLACK_S} 秒内`)}</text>
            <text x="20" y="486" class="pt">·</text>
            <text x="30" y="486" class="detail">{t('sounds good shares no run → it stays', 'sounds good 没有共享 → 留下')}</text>
            <text x="20" y="512" class="pt">·</text>
            <text x="30" y="512" class="detail">{t('checked live, and again after the final pass', '直播时查一遍，会后再查一遍')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="586" text-anchor="middle" class="cut">{t('The words are final — but which system', '字都定稿了——系统音轨里')}</text>
            <text x={W / 2} y="610" text-anchor="middle" class="cut">{t('lines are Speaker 1, which Speaker 2?', '哪句是 Speaker 1、哪句是 Speaker 2？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: echo.go, track_transcribe.go, finalize.go.', '出处：echo.go、track_transcribe.go、finalize.go。')}</text>
        {/if}
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="10" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
      <LoopProgress ms={lapMs} {lap} x={phone ? 236 : 640} y={phone ? LP_PHONE[step] : 20} />
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
  .value { font-size: 16px; font-weight: 650; fill: var(--fg); }
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
    .value { font-size: 14px; }
  }
</style>
