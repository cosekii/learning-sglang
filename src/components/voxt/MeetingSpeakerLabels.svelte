<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_MTD_CHUNK_MAX_MINUTES,
    VOXT_MTD_HARD_OVERLAP_S,
    VOXT_MTD_NATIVE_SPLIT_MINUTES,
    VOXT_MTD_CARRY_MAX_RUNES,
    VOXT_MTD_ANCHOR_MIN_WORDS,
    VOXT_MTD_EVAL_SPEAKER_COUNTS,
    VOXT_MTD_EVAL_SEGMENTS,
    VOXT_MTD_EVAL_LABELS_CORRECT,
    VOXT_MTD_EVAL_ROUNDS,
    VOXT_MTD_EVAL_GAP_S,
    VOXT_MTD_EVAL_ERR_MIN_PERCENT,
    VOXT_MTD_EVAL_ERR_MAX_PERCENT,
    VOXT_MTD_PLAIN_ERR_PERCENT,
    VOXT_MTD_DEMO_TRACK_MINUTES,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Which lines get a name tag? Only the system track, and only when three checks pass.',
    captionZh: '哪些行贴姓名牌？只有系统音轨，还要过三道检查。',
  }, {
    caption: 'One speech model runs at a time. The first one clocks out before the name-tag model starts.',
    captionZh: '识别服务一次只开一个：旧的先下班，分人模型才上班。',
  }, {
    caption: 'The system track is read two minutes a request. Each answer line carries a time and a name.',
    captionZh: '系统音轨按两分钟一个请求来读，交回的行带着时间和名字。',
  }, {
    caption: 'Every request numbers voices from scratch. So requests after the first carry the last labeled lines.',
    captionZh: '每个请求都从头编号，所以第二个起都带上最后几行标签。',
  }, {
    caption: 'If a request still renumbers, a twice-heard line pins the voice back.',
    captionZh: '模型还是换号时，听两遍的那行把嗓子钉回旧标签。',
  }, {
    caption: 'The public sample labels 11 of 11 segments — on clean synthetic voices. That is an upper bound, not a promise.',
    captionZh: '公开样本 11 段全对，但那是干净合成嗓音的上限，不是保证。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: the system track holds three final lines, each with a question mark for a name. Three checks appear one at a time: full meeting, the name-tag model installed, and a zh or en language. Then the question marks become tags s1, s2, s2, the mic line gets me, and two lines say a failed check keeps the plain transcript and list the chapter\'s six steps.',
    zh: '画面按顺序形成：系统音轨有三行终稿，每行的名字都是问号。三道检查逐个出现：完整会议、分人模型已安装、语言是中文或英文。随后问号变成标签 s1、s2、s2，麦克风行得到 me，最后两行说明检查不过就保留无标签的终稿，并列出本章六步。',
  }, {
    en: 'The picture builds in order: the final pass reads mic.wav with the selected model Qwen3-ASR, whose server sits in the single speech-model slot under a hold. The mic track finishes, the hold releases and the slot empties, then MOSS-Transcribe-Diarize starts in the same slot and the system track enters it. Two lines explain: the name-tag model cannot start while the selected model lives, so the pass lets it go first.',
    zh: '画面按顺序形成：会后那一遍用选中的 Qwen3-ASR 读 mic.wav，它的服务在唯一的识别服务槽位里被占用着。麦克风音轨读完，占用释放，槽位空出来，MOSS-Transcribe-Diarize 在同一个槽位启动，系统音轨进入。两行解释：分人模型在选中模型开着时启动不了，所以先放掉它。',
  }, {
    en: 'The picture builds in order: a three-minute system.wav timeline gets a bracket for request 1 from 0:00 to 2:00, then request 2 from 1:59 to 3:00 with the one-second overlap shaded. The shared instruction appears, then request 1\'s answer lines with S01 and S02 tags, and last the stored form s1 and s2 with the reason for two minutes.',
    zh: '画面按顺序形成：三分钟的 system.wav 时间线先出现请求 1 的括号 0:00 到 2:00，再出现请求 2 的括号 1:59 到 3:00，重叠的一秒打上阴影。随后出现每个请求都带的指令、请求 1 交回的带 S01 和 S02 标签的行，最后换成存起来的 s1 和 s2，并说明为什么是两分钟。',
  }, {
    en: 'The picture builds in order: request 2 hears sounds right first, a voice request 1 called S02, but every request numbers from S01. The carry appears inside request 2: the last labeled lines with the note that the same voices keep their labels. The answer comes back continuing the numbers, the repeated line is dropped, and the new line stores as s2.',
    zh: '画面按顺序形成：请求 2 先听到 sounds right，这把嗓子在请求 1 里叫 S02，但每个请求都从 S01 数起。请求 2 里出现携带的内容：最后几行标签和「同样的嗓子保持标签」。交回的行接着编号，重复的行被丢掉，新行存成 s2。',
  }, {
    en: 'The picture builds in order: request 2\'s answer comes back renumbered, sounds right and I\'ll send the file both tagged S01. The overlap check matches the words of the twice-heard line against the stored s2 line, the anchor flips this request\'s S01 to s2, the repeated line drops, and two lines state the boundary: only a twice-heard line can anchor, and a one-word line anchors nothing.',
    zh: '画面按顺序形成：请求 2 交回的行换了号，sounds right 和 I\'ll send the file 都标成 S01。重叠检查把听两遍那行的词和已存的 s2 行对上，锚点把这个请求的 S01 折成 s2，重复的行丢掉，最后两行说明边界：只有听两遍的行能当锚点，一个词的行什么也钉不住。',
  }, {
    en: 'The picture builds in order: the public sample panel appears — synthetic voices spliced with 1.5 seconds of quiet, two, three and four speakers. The result appears: 11 of 11 segment labels correct, three identical rounds. Two error bars compare the name-tag task with the plain-text instruction. Three caveat lines follow, then the closing question: how do you correct, summarize, ask and export this transcript?',
    zh: '画面按顺序形成：先出现公开样本面板——合成嗓音按 1.5 秒静音拼接，两人、三人和四人。随后出现结果：11 段标签全对，三轮完全一致。两根错误率柱子对照分人任务和纯文本指令。接着是三条保留意见，最后是收尾问题：这份终稿怎样纠正、总结、追问和导出？',
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
  const H = $derived((phone ? [720, 640, 700, 720, 730, 780] : [560, 500, 560, 560, 560, 560])[step]);
  const LP_PHONE = [676, 596, 656, 676, 686, 736];

  const PHASE_COUNTS = [6, 5, 6, 5, 5, 5];
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
    [{ x: 15, y: 64, w: 270, h: 150 }, { x: 15, y: 230, w: 270, h: 120 }, { x: 15, y: 230, w: 270, h: 120 }, { x: 15, y: 230, w: 270, h: 120 }, { x: 15, y: 64, w: 270, h: 292 }, { x: 15, y: 420, w: 270, h: 220 }],
    [{ x: 15, y: 64, w: 270, h: 130 }, { x: 15, y: 64, w: 270, h: 130 }, { x: 15, y: 210, w: 270, h: 130 }, { x: 15, y: 210, w: 270, h: 130 }, { x: 15, y: 360, w: 270, h: 200 }],
    [{ x: 15, y: 80, w: 270, h: 70 }, { x: 15, y: 80, w: 270, h: 110 }, { x: 15, y: 80, w: 270, h: 150 }, { x: 15, y: 250, w: 270, h: 110 }, { x: 15, y: 380, w: 270, h: 130 }, { x: 15, y: 530, w: 270, h: 110 }],
    [{ x: 15, y: 80, w: 270, h: 130 }, { x: 15, y: 224, w: 270, h: 50 }, { x: 15, y: 290, w: 270, h: 140 }, { x: 15, y: 446, w: 270, h: 100 }, { x: 15, y: 562, w: 270, h: 110 }],
    [{ x: 15, y: 80, w: 270, h: 110 }, { x: 15, y: 206, w: 270, h: 100 }, { x: 15, y: 322, w: 270, h: 100 }, { x: 15, y: 438, w: 270, h: 110 }, { x: 15, y: 564, w: 270, h: 130 }],
    [{ x: 15, y: 70, w: 270, h: 150 }, { x: 15, y: 236, w: 270, h: 60 }, { x: 15, y: 312, w: 270, h: 130 }, { x: 15, y: 458, w: 270, h: 170 }, { x: 15, y: 644, w: 270, h: 60 }],
  ] : [
    [{ x: 20, y: 70, w: 680, h: 150 }, { x: 20, y: 240, w: 680, h: 110 }, { x: 20, y: 240, w: 680, h: 110 }, { x: 20, y: 240, w: 680, h: 110 }, { x: 20, y: 70, w: 680, h: 370 }, { x: 20, y: 458, w: 680, h: 74 }],
    [{ x: 20, y: 80, w: 330, h: 240 }, { x: 20, y: 80, w: 330, h: 240 }, { x: 370, y: 80, w: 330, h: 240 }, { x: 370, y: 80, w: 330, h: 240 }, { x: 20, y: 360, w: 680, h: 80 }],
    [{ x: 60, y: 90, w: 600, h: 60 }, { x: 60, y: 90, w: 600, h: 90 }, { x: 60, y: 90, w: 600, h: 130 }, { x: 20, y: 250, w: 680, h: 90 }, { x: 20, y: 356, w: 680, h: 100 }, { x: 20, y: 470, w: 680, h: 40 }],
    [{ x: 20, y: 90, w: 680, h: 110 }, { x: 160, y: 214, w: 400, h: 44 }, { x: 20, y: 274, w: 680, h: 120 }, { x: 20, y: 410, w: 680, h: 80 }, { x: 20, y: 480, w: 680, h: 52 }],
    [{ x: 20, y: 90, w: 680, h: 100 }, { x: 20, y: 206, w: 680, h: 90 }, { x: 20, y: 90, w: 680, h: 300 }, { x: 20, y: 406, w: 680, h: 80 }, { x: 20, y: 492, w: 680, h: 44 }],
    [{ x: 20, y: 80, w: 680, h: 130 }, { x: 160, y: 226, w: 400, h: 46 }, { x: 20, y: 288, w: 680, h: 110 }, { x: 20, y: 414, w: 680, h: 100 }, { x: 60, y: 514, w: 600, h: 20 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  // The constructed system track: two voices, three minutes (src/voxt/numbers.ts).
  const sysLines = [
    { span: '00:05', text: "let's review the budget", tag: 's1' },
    { span: '00:40', text: 'sure, starting with March', tag: 's2' },
    { span: '01:59', text: 'sounds right', tag: 's2' },
  ];
  const newLine = { span: '02:30', text: "I'll send the file", tag: 's2' };
  const micLine = { span: '00:14', text: 'sounds good' };
  const errBars = [
    { label: t('name-tag task', '分人任务'), lo: VOXT_MTD_EVAL_ERR_MIN_PERCENT, hi: VOXT_MTD_EVAL_ERR_MAX_PERCENT },
    { label: t('plain-text instruction', '纯文本指令'), lo: VOXT_MTD_PLAIN_ERR_PERCENT, hi: VOXT_MTD_PLAIN_ERR_PERCENT },
  ];
  const ERR_SCALE = 20; // both bars share one 0-20% scale
  const errWidth = (v: number) => (v / ERR_SCALE) * 400;
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="sl-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('NAME TAGS · THE GATE', '姓名牌 · 三道检查')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('a name tag = which voice said the line', '姓名牌 = 这行是哪把嗓子说的')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="150" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="96" class="label">{t('SYSTEM TRACK · final lines (Ch. 13)', '系统音轨 · 终稿行（第 13 章）')}</text>
          {#each sysLines as line, i}
            <text x="40" y={128 + i * 30} class="mono">{line.span} · {line.text}</text>
            {#if phase >= 4}
              <rect x="560" y={114 + i * 30} width="34" height="20" rx="6" fill={line.tag === 's1' ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={line.tag === 's1' ? 'var(--accent)' : 'var(--gen)'} />
              <text x="577" y={128 + i * 30} text-anchor="middle" class="tagpill" fill={line.tag === 's1' ? 'var(--accent)' : 'var(--gen)'}>{line.tag}</text>
            {:else}
              <rect x="560" y={114 + i * 30} width="34" height="20" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3" />
              <text x="577" y={128 + i * 30} text-anchor="middle" class="tagpill" fill="var(--muted)">?</text>
            {/if}
          {/each}
          <rect x="20" y="240" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="264" class="label">{t('THREE CHECKS', '三道检查')}</text>
          {#if phase >= 1}
            <text x="40" y="290" class="detail">{t('1 · a full meeting — subtitles and recording modes get no tags', '1 · 完整会议 —— subtitles 和 recording 模式不贴标签')}</text>
          {/if}
          {#if phase >= 2}
            <text x="40" y="312" class="detail">{t('2 · the name-tag model installed — MOSS-Transcribe-Diarize (MTD)', '2 · 分人模型已安装 —— MOSS-Transcribe-Diarize（MTD）')}</text>
          {/if}
          {#if phase >= 3}
            <text x="40" y="334" class="detail">{t('3 · the meeting language is zh or en — the two MTD knows', '3 · 会议语言是中文或英文 —— MTD 只懂这两种')}</text>
          {/if}
          {#if phase >= 1}
            <text x="680" y={phase >= 3 ? 334 : phase >= 2 ? 312 : 290} text-anchor="end" class="label" fill="var(--gen)">✓</text>
          {/if}
          {#if phase >= 4}
            <rect x="20" y="370" width="680" height="70" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="396" class="label">{t('MIC TRACK', '麦克风音轨')}</text>
            <text x="40" y="422" class="mono">{micLine.span} · {micLine.text}</text>
            <rect x="560" y="408" width="40" height="20" rx="6" fill="var(--bg)" stroke="var(--muted)" />
            <text x="580" y="422" text-anchor="middle" class="tagpill" fill="var(--muted)">me</text>
            <rect x="40" y="452" width="12" height="12" rx="3" fill="var(--accent)" />
            <text x="58" y="462" class="detail">s1 · {t('one voice', '一把嗓子')}</text>
            <rect x="150" y="452" width="12" height="12" rx="3" fill="var(--gen)" />
            <text x="168" y="462" class="detail">s2 · {t('another voice', '另一把嗓子')}</text>
            <rect x="280" y="452" width="12" height="12" rx="3" fill="var(--muted)" />
            <text x="298" y="462" class="detail">me · {t('you, on the mic track', '你，在麦克风音轨')}</text>
          {/if}
          {#if phase >= 5}
            <text x="28" y="488" class="pt">·</text>
            <text x="38" y="488" class="detail">{t('a failed check → the plain transcript from Ch. 13, no tags', '任何一道不过 → 就是第 13 章那份无标签终稿')}</text>
            <text x="28" y="510" class="pt">·</text>
            <text x="38" y="510" class="detail">{t('this chapter: the gate (1) · the hand-off (2) · two-minute requests (3)', '本章：检查（1）· 交接（2）· 两分钟请求（3）')}</text>
            <text x="38" y="532" class="detail">{t('the carry (4) · the anchor (5) · the evidence (6)', '携带（4）· 锚点（5）· 证据（6）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/mode.go, finalize.go; Voxt/meeting_asr.go.', '出处：internal/meeting/mode.go、finalize.go；Voxt/meeting_asr.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('SYSTEM TRACK · final (Ch. 13)', '系统音轨 · 终稿（第 13 章）')}</text>
          {#each sysLines as line, i}
            <text x="30" y={118 + i * 30} class="mono">{line.span} · {line.text}</text>
            {#if phase >= 4}
              <rect x="240" y={104 + i * 30} width="30" height="20" rx="6" fill={line.tag === 's1' ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={line.tag === 's1' ? 'var(--accent)' : 'var(--gen)'} />
              <text x="255" y={118 + i * 30} text-anchor="middle" class="tagpill" fill={line.tag === 's1' ? 'var(--accent)' : 'var(--gen)'}>{line.tag}</text>
            {:else}
              <rect x="240" y={104 + i * 30} width="30" height="20" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3" />
              <text x="255" y={118 + i * 30} text-anchor="middle" class="tagpill" fill="var(--muted)">?</text>
            {/if}
          {/each}
          <rect x="15" y="230" width="270" height="126" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="252" class="label">{t('THREE CHECKS', '三道检查')}</text>
          {#if phase >= 1}
            <text x="30" y="276" class="detail">{t('1 · a full meeting', '1 · 完整会议')}</text>
          {/if}
          {#if phase >= 2}
            <text x="30" y="298" class="detail">{t('2 · MTD installed', '2 · 分人模型已安装')}</text>
          {/if}
          {#if phase >= 3}
            <text x="30" y="320" class="detail">{t('3 · language zh or en', '3 · 语言是中文或英文')}</text>
          {/if}
          {#if phase >= 1}
            <text x="270" y={phase >= 3 ? 320 : phase >= 2 ? 298 : 276} text-anchor="end" class="label" fill="var(--gen)">✓</text>
          {/if}
          {#if phase >= 3}
            <text x="30" y="342" class="detail">{t('MTD = MOSS-Transcribe-Diarize', 'MTD = MOSS-Transcribe-Diarize')}</text>
          {/if}
          {#if phase >= 4}
            <rect x="15" y="372" width="270" height="66" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="396" class="label">{t('MIC TRACK', '麦克风音轨')}</text>
            <text x="30" y="420" class="mono">{micLine.span} · {micLine.text}</text>
            <rect x="232" y="406" width="38" height="20" rx="6" fill="var(--bg)" stroke="var(--muted)" />
            <text x="251" y="420" text-anchor="middle" class="tagpill" fill="var(--muted)">me</text>
            <rect x="30" y="450" width="12" height="12" rx="3" fill="var(--accent)" />
            <text x="47" y="460" class="detail">s1 · {t('one voice', '一把嗓子')}</text>
            <rect x="150" y="450" width="12" height="12" rx="3" fill="var(--gen)" />
            <text x="167" y="460" class="detail">s2 · {t('another', '另一把')}</text>
            <rect x="30" y="470" width="12" height="12" rx="3" fill="var(--muted)" />
            <text x="47" y="480" class="detail">me · {t('you, on the mic track', '你，在麦克风音轨')}</text>
          {/if}
          {#if phase >= 5}
            <text x="20" y="530" class="pt">·</text>
            <text x="30" y="530" class="detail">{t('a failed check → the plain transcript', '任何一道不过 → 无标签终稿')}</text>
            <text x="30" y="550" class="detail">{t('from Ch. 13, no tags', '（第 13 章那份）')}</text>
            <text x="20" y="576" class="pt">·</text>
            <text x="30" y="576" class="detail">{t('the gate (1) · the hand-off (2)', '检查（1）· 交接（2）')}</text>
            <text x="30" y="596" class="detail">{t('two-minute requests (3) · the carry (4)', '两分钟请求（3）· 携带（4）')}</text>
            <text x="30" y="616" class="detail">{t('the anchor (5) · the evidence (6)', '锚点（5）· 证据（6）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: mode.go, finalize.go, meeting_asr.go.', '出处：mode.go、finalize.go、meeting_asr.go。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE SPEECH MODEL AT A TIME', '识别服务一次只开一个')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('hold = keeping a model server loaded', '占用 = 让模型服务一直开着')}</text>
        {#if !phone}
          <rect x="20" y="80" width="330" height="240" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="106" class="label">{t('THE FINAL PASS (Ch. 13)', '会后那一遍（第 13 章）')}</text>
          <rect x="40" y="126" width="290" height="52" rx="8" fill={phase < 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke="var(--accent)" stroke-width={phase === 0 ? 2 : 1} />
          <text x="56" y="148" class="mono">mic.wav</text>
          <text x="56" y="168" class="detail">{phase < 1 ? t('reading with the selected model…', '正用选中的模型读…') : t('✓ done', '✓ 读完')}</text>
          <rect x="40" y="196" width="290" height="52" rx="8" fill={phase >= 4 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={phase >= 4 ? 'var(--gen)' : 'var(--muted)'} stroke-dasharray={phase >= 4 ? 'none' : '4 3'} />
          <text x="56" y="218" class="mono">system.wav</text>
          <text x="56" y="238" class="detail">{phase >= 4 ? t('reading with MTD…', '正用 MTD 读…') : t('waits its turn', '等轮到自己')}</text>
          <text x="40" y="300" class="detail">{t('tracks are read in order: mic, then system', '音轨按顺序读：先麦克风，后系统')}</text>
          <rect x="370" y="80" width="330" height="240" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="390" y="106" class="label">{t('THE SINGLE SERVER SLOT', '唯一的服务槽位')}</text>
          {#if phase <= 1}
            <rect x="390" y="126" width="290" height="90" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x={390 + 145} y="156" text-anchor="middle" class="mono">Qwen3-ASR</text>
            <text x={390 + 145} y="178" text-anchor="middle" class="detail">{t('your selected model · held', '你选中的模型 · 被占用')}</text>
            <text x={390 + 145} y="200" text-anchor="middle" class="detail">{t('(it read the mic track)', '（它读了麦克风音轨）')}</text>
          {:else if phase === 2}
            <rect x="390" y="126" width="290" height="90" rx="8" fill="none" stroke="var(--muted)" stroke-dasharray="6 4" />
            <text x={390 + 145} y="164" text-anchor="middle" class="detail">{t('hold released', '占用已释放')}</text>
            <text x={390 + 145} y="188" text-anchor="middle" class="detail">{t('the slot is free', '槽位空出来了')}</text>
          {:else}
            <rect x="390" y="126" width="290" height="90" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x={390 + 145} y="156" text-anchor="middle" class="mono">MOSS-Transcribe-Diarize</text>
            <text x={390 + 145} y="178" text-anchor="middle" class="detail">{t('the name-tag model (MTD)', '分人模型（MTD）')}</text>
            <text x={390 + 145} y="200" text-anchor="middle" class="detail">{t('starts in the same slot', '在同一个槽位启动')}</text>
          {/if}
          <text x="390" y="300" class="detail">{t('one speech-model server at a time', '同一时间只开一个识别服务')}</text>
          {#if phase >= 4}
            <text x="28" y="380" class="pt">·</text>
            <text x="38" y="380" class="detail">{t('MTD cannot start while the selected model\'s server lives', '选中模型的服务还开着，MTD 就启动不了')}</text>
            <text x="28" y="404" class="pt">·</text>
            <text x="38" y="404" class="detail">{t('so the pass lets it go after the mic track, then reads the system track', '所以读完麦克风先放掉它，再读系统音轨')}</text>
            <text x={W / 2} y="448" text-anchor="middle" class="formula">{t('mic (selected model) → release → system (MTD)', '麦克风（选中模型）→ 释放 → 系统（MTD）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/finalize.go (the hold release).', '出处：internal/meeting/finalize.go（占用释放）。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('THE FINAL PASS (Ch. 13)', '会后那一遍（第 13 章）')}</text>
          <rect x="30" y="100" width="240" height="36" rx="7" fill={phase < 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke="var(--accent)" />
          <text x="42" y="123" class="mono">mic.wav · {phase < 1 ? t('reading…', '在读…') : t('✓ done', '✓ 读完')}</text>
          <rect x="30" y="146" width="240" height="36" rx="7" fill={phase >= 4 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={phase >= 4 ? 'var(--gen)' : 'var(--muted)'} stroke-dasharray={phase >= 4 ? 'none' : '4 3'} />
          <text x="42" y="169" class="mono">system.wav · {phase >= 4 ? t('reading…', '在读…') : t('waits', '等待')}</text>
          <rect x="15" y="210" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="234" class="label">{t('THE SINGLE SERVER SLOT', '唯一的服务槽位')}</text>
          {#if phase <= 1}
            <rect x="30" y="246" width="240" height="74" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="272" text-anchor="middle" class="mono">Qwen3-ASR</text>
            <text x="150" y="294" text-anchor="middle" class="detail">{t('selected model · held', '选中的模型 · 被占用')}</text>
          {:else if phase === 2}
            <rect x="30" y="246" width="240" height="74" rx="8" fill="none" stroke="var(--muted)" stroke-dasharray="6 4" />
            <text x="150" y="278" text-anchor="middle" class="detail">{t('hold released · slot free', '占用释放 · 槽位空出')}</text>
          {:else}
            <rect x="30" y="246" width="240" height="74" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="272" text-anchor="middle" class="mono">MTD</text>
            <text x="150" y="294" text-anchor="middle" class="detail">{t('the name-tag model starts', '分人模型启动')}</text>
          {/if}
          {#if phase >= 4}
            <text x="20" y="390" class="pt">·</text>
            <text x="30" y="390" class="detail">{t('MTD cannot start while the selected', '选中模型的服务还开着，')}</text>
            <text x="30" y="410" class="detail">{t('model\'s server lives', 'MTD 就启动不了')}</text>
            <text x="20" y="436" class="pt">·</text>
            <text x="30" y="436" class="detail">{t('so the pass lets it go after the mic track,', '所以读完麦克风先放掉它，')}</text>
            <text x="30" y="456" class="detail">{t('then reads the system track', '再读系统音轨')}</text>
            <text x={W / 2} y="500" text-anchor="middle" class="formula">{t('mic → release → system (MTD)', '麦克风 → 释放 → 系统（MTD）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: finalize.go.', '出处：finalize.go。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('TWO MINUTES A REQUEST', '两分钟一个请求')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('one request = at most two minutes of the track', '一个请求 = 最多读两分钟音轨')}</text>
        {#if !phone}
          <text x="60" y="84" class="tag">system.wav · {VOXT_MTD_DEMO_TRACK_MINUTES} {t('minutes (constructed)', '分钟（构造例）')}</text>
          <rect x="60" y="96" width="600" height="14" rx="7" fill="var(--bg)" stroke="var(--line)" />
          {#each [0, 1, 2, 3] as i}
            <text x={60 + i * 200} y="128" text-anchor="middle" class="tag">{i}:00</text>
          {/each}
          {#if phase >= 1}
            <rect x="60" y="140" width="400" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x="260" y="160" text-anchor="middle" class="detail">{t('request 1 · 0:00–2:00', '请求 1 · 0:00–2:00')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="456" y="94" width="8" height="18" fill="var(--muted)" opacity="0.45" />
            <rect x="456" y="178" width="204" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x="558" y="198" text-anchor="middle" class="detail">{t('request 2 · 1:59–3:00', '请求 2 · 1:59–3:00')}</text>
            <text x="460" y="228" class="detail">{t(`a cut at the cap restarts ${VOXT_MTD_HARD_OVERLAP_S} s early`, `顶到上限的切分会提前 ${VOXT_MTD_HARD_OVERLAP_S} 秒`)}
            </text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="250" width="680" height="90" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="276" class="label">{t('EVERY REQUEST CARRIES THE SAME INSTRUCTION', '每个请求都带同一条指令')}</text>
            <text x="40" y="304" class="mono">{t('“start each segment with a timestamp and a speaker label ([S01], [S02], …)”', '“每段都以时间戳和说话人标签开头（[S01]、[S02]……）”')}</text>
            <text x="680" y="326" text-anchor="end" class="detail">{t('the model\'s own instruction, shortened', '模型自带的指令，有删节')}</text>
          {/if}
          {#if phase >= 4}
            <rect x="20" y="356" width="680" height="100" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="382" class="label">{t('REQUEST 1 ANSWERS', '请求 1 交回')}</text>
            {#each sysLines as line, i}
              <text x="40" y={408 + i * 22} class="mono">[{line.tag === 's1' ? 'S01' : 'S02'}] {line.span} · {line.text}</text>
            {/each}
          {/if}
          {#if phase >= 5}
            <text x={W / 2} y="494" text-anchor="middle" class="formula">{t('stored: S01 → s1 · S02 → s2 (the leading zero drops)', '存起来：S01 → s1 · S02 → s2（去掉前导零）')}</text>
            <text x={W / 2} y="518" text-anchor="middle" class="detail">{t(`why ${VOXT_MTD_CHUNK_MAX_MINUTES} minutes: a dictation waits at most one request · the model's own split is ${VOXT_MTD_NATIVE_SPLIT_MINUTES} min`, `为什么是 ${VOXT_MTD_CHUNK_MAX_MINUTES} 分钟：听写最多等一个请求 · 模型自己按 ${VOXT_MTD_NATIVE_SPLIT_MINUTES} 分钟切`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/finalize.go, chunks.go.', '出处：internal/meeting/finalize.go、chunks.go。')}</text>
        {:else}
          <text x="15" y="72" class="tag">system.wav · {VOXT_MTD_DEMO_TRACK_MINUTES} {t('min (constructed)', '分钟（构造例）')}</text>
          <rect x="15" y="82" width="270" height="14" rx="7" fill="var(--bg)" stroke="var(--line)" />
          {#each [0, 1, 2, 3] as i}
            <text x={15 + i * 90} y="114" text-anchor="middle" class="tag">{i}:00</text>
          {/each}
          {#if phase >= 1}
            <rect x="15" y="126" width="180" height="28" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x="105" y="145" text-anchor="middle" class="detail">{t('request 1 · 0:00–2:00', '请求 1 · 0:00–2:00')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="192" y="80" width="5" height="18" fill="var(--muted)" opacity="0.45" />
            <rect x="105" y="162" width="180" height="28" rx="8" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x="195" y="181" text-anchor="middle" class="detail">{t('request 2 · 1:59–3:00', '请求 2 · 1:59–3:00')}</text>
            <text x="15" y="212" class="detail">{t(`a cut at the cap restarts ${VOXT_MTD_HARD_OVERLAP_S} s early`, `顶到上限的切分提前 ${VOXT_MTD_HARD_OVERLAP_S} 秒`)}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="250" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="274" class="label">{t('THE SHARED INSTRUCTION', '同一条指令')}</text>
            <text x="30" y="300" class="mono">{t('“start each segment with a timestamp', '“每段都以时间戳和')}</text>
            <text x="30" y="322" class="mono">{t('and a speaker label ([S01], [S02], …)”', '说话人标签开头（[S01]……）”')}</text>
            <text x="30" y="346" class="detail">{t('the model\'s own, shortened', '模型自带的指令，有删节')}</text>
          {/if}
          {#if phase >= 4}
            <rect x="15" y="380" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="404" class="label">{t('REQUEST 1 ANSWERS', '请求 1 交回')}</text>
            {#each sysLines as line, i}
              <text x="30" y={430 + i * 24} class="mono">[{line.tag === 's1' ? 'S01' : 'S02'}] {line.text}</text>
            {/each}
          {/if}
          {#if phase >= 5}
            <text x={W / 2} y="548" text-anchor="middle" class="formula">{t('stored: S01 → s1 · S02 → s2', '存起来：S01 → s1 · S02 → s2')}</text>
            <text x={W / 2} y="576" text-anchor="middle" class="detail">{t(`why ${VOXT_MTD_CHUNK_MAX_MINUTES} min: a dictation waits`, `为什么是 ${VOXT_MTD_CHUNK_MAX_MINUTES} 分钟：`)}</text>
            <text x={W / 2} y="596" text-anchor="middle" class="detail">{t(`at most one request · own split ${VOXT_MTD_NATIVE_SPLIT_MINUTES} min`, `听写最多等一个请求 · 模型按 ${VOXT_MTD_NATIVE_SPLIT_MINUTES} 分钟切`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: finalize.go, chunks.go.', '出处：finalize.go、chunks.go。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('EVERY REQUEST NUMBERS FROM SCRATCH', '每个请求都从头编号')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('carry = the last labeled lines ride along', '携带 = 最后几行标签跟着走')}</text>
        {#if !phone}
          <rect x="20" y="80" width="680" height="120" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="106" class="label">{t('REQUEST 2 · audio 1:59–3:00 + the instruction', '请求 2 · 音频 1:59–3:00 + 指令')}</text>
          <text x="40" y="134" class="detail">{t('it hears “sounds right” first — the voice request 1 called S02', '它先听到 sounds right —— 请求 1 把这把嗓子叫 S02')}</text>
          {#if phase >= 1}
            <text x="40" y="164" class="cut">{t('but every request numbers voices from S01', '但每个请求都从 S01 数起')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="216" width="680" height="130" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="242" class="label blue">{t('THE CARRY · RIDES INSIDE REQUEST 2', '携带 · 装在请求 2 里')}</text>
            <text x="40" y="268" class="mono">[S01] let's review the budget</text>
            <text x="40" y="290" class="mono">[S02] sure, starting with March</text>
            <text x="40" y="312" class="mono">[S02] sounds right</text>
            <text x="680" y="332" text-anchor="end" class="detail">{t('“the same voices keep their labels”', '“同样的嗓子保持标签”')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="362" width="680" height="100" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="388" class="label">{t('REQUEST 2 ANSWERS · THE NUMBERS CONTINUE', '请求 2 交回 · 编号接着走')}</text>
            <text x="40" y="414" class="mono" opacity="0.5">[S02] sounds right · {t('heard before', '听过')}</text>
            <text x="40" y="440" class="mono">[S02] {newLine.span} · {newLine.text}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="488" class="pt">·</text>
            <text x="38" y="488" class="detail">{t('the twice-heard line is dropped — request 1 already stored it', '听两遍的那行丢掉 —— 请求 1 已经存过')}</text>
            <text x="28" y="510" class="pt">·</text>
            <text x="38" y="510" class="detail">{t(`the new line stores as ${newLine.tag} ${newLine.span} · ${newLine.text}`, `新行存成 ${newLine.tag} ${newLine.span} · ${newLine.text}`)}</text>
            <text x="28" y="532" class="pt">·</text>
            <text x="38" y="532" class="detail">{t(`the carry is the last labeled lines, at most a ${VOXT_MTD_CARRY_MAX_RUNES}-rune screen`, `携带的是最后几行标签，最多一屏 ${VOXT_MTD_CARRY_MAX_RUNES} 个字符`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/finalize.go (diarizeTrack).', '出处：internal/meeting/finalize.go（diarizeTrack）。')}</text>
        {:else}
          <rect x="15" y="80" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="104" class="label">{t('REQUEST 2 · audio 1:59–3:00', '请求 2 · 音频 1:59–3:00')}</text>
          <text x="30" y="130" class="detail">{t('it hears “sounds right” first —', '它先听到 sounds right ——')}</text>
          <text x="30" y="150" class="detail">{t('the voice request 1 called S02', '请求 1 把这把嗓子叫 S02')}</text>
          {#if phase >= 1}
            <text x="30" y="184" class="cut">{t('but every request numbers from S01', '但每个请求都从 S01 数起')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="226" width="270" height="140" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="250" class="label blue">{t('THE CARRY', '携带')}</text>
            <text x="30" y="276" class="mono">[S01] let's review the budget</text>
            <text x="30" y="298" class="mono">[S02] sure, starting with…</text>
            <text x="30" y="320" class="mono">[S02] sounds right</text>
            <text x="30" y="348" class="detail">{t('“the same voices keep their labels”', '“同样的嗓子保持标签”')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="382" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="406" class="label">{t('ANSWERS · NUMBERS CONTINUE', '交回 · 编号接着走')}</text>
            <text x="30" y="432" class="mono" opacity="0.5">[S02] sounds right · {t('heard', '听过')}</text>
            <text x="30" y="458" class="mono">[S02] {newLine.text}</text>
          {/if}
          {#if phase >= 4}
            <text x="20" y="530" class="pt">·</text>
            <text x="30" y="530" class="detail">{t('the twice-heard line is dropped —', '听两遍的那行丢掉 ——')}</text>
            <text x="30" y="550" class="detail">{t('request 1 already stored it', '请求 1 已经存过')}</text>
            <text x="20" y="576" class="pt">·</text>
            <text x="30" y="576" class="detail">{t(`the new line stores as ${newLine.tag}`, `新行存成 ${newLine.tag}`)}</text>
            <text x="20" y="602" class="pt">·</text>
            <text x="30" y="602" class="detail">{t(`the carry: the last labeled lines,`, `携带：最后几行标签，`)}</text>
            <text x="30" y="622" class="detail">{t(`at most ${VOXT_MTD_CARRY_MAX_RUNES} runes`, `最多 ${VOXT_MTD_CARRY_MAX_RUNES} 个字符`)}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: finalize.go (diarizeTrack).', '出处：finalize.go（diarizeTrack）。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('IF IT STILL RENUMBERS · THE ANCHOR', '如果还是换号 · 锚点')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('anchor = a twice-heard line pins a number', '锚点 = 听两遍的行钉住编号')}</text>
        {#if !phone}
          <rect x="20" y="80" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="106" class="label">{t('REQUEST 2 ANSWERS · NUMBERED FROM SCRATCH', '请求 2 交回 · 从头编了号')}</text>
          <text x="40" y="134" class="mono">[S01] sounds right</text>
          <text x="40" y="160" class="mono">[S01] {newLine.span} · {newLine.text}</text>
          <text x="680" y="106" text-anchor="end" class="detail">{t('the same voice request 1 called S02', '正是请求 1 叫 S02 的嗓子')}</text>
          {#if phase >= 1}
            <rect x="20" y="206" width="680" height="90" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="232" class="label">{t('THE OVERLAP CHECK', '重叠检查')}</text>
            <text x="40" y="258" class="detail">{t('“sounds right” was heard twice — request 1 already stored it as s2', 'sounds right 听过两遍 —— 请求 1 已把它存成 s2')}</text>
            <text x="40" y="280" class="formula">{t(`words match: “sounds right” = “sounds right” (${VOXT_MTD_ANCHOR_MIN_WORDS} ≥ ${VOXT_MTD_ANCHOR_MIN_WORDS})`, `词对上了：“sounds right” = “sounds right”（${VOXT_MTD_ANCHOR_MIN_WORDS} ≥ ${VOXT_MTD_ANCHOR_MIN_WORDS}）`)}</text>
          {/if}
          {#if phase >= 2}
            <line x1="120" y1="306" x2="120" y2="330" stroke="var(--muted)" stroke-width="2" marker-end="url(#sl-arrow)" />
            <text x="140" y="324" class="cut">{t('the anchor: this request\'s S01 = the earlier s2', '锚点：这个请求的 S01 = 之前的 s2')}</text>
            <rect x="20" y="344" width="680" height="80" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="40" y="372" class="mono" opacity="0.5">s2 sounds right · {t('dropped — heard before', '丢掉 —— 听过')}</text>
            <text x="40" y="400" class="mono">s2 {newLine.span} · {newLine.text}</text>
          {/if}
          {#if phase >= 3}
            <text x={W / 2} y="470" text-anchor="middle" class="formula">{t('both lines fold back to s2 — one voice, one tag', '两行都折回 s2 —— 一把嗓子一个标签')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="510" class="pt">·</text>
            <text x="38" y="510" class="detail">{t('only a twice-heard line can anchor — a voice missing from the overlap keeps the model\'s number', '只有听两遍的行能当锚点 —— 没在重叠里出声的嗓子保留模型给的号')}</text>
            <text x="28" y="532" class="pt">·</text>
            <text x="38" y="532" class="detail">{t('so the carry (Step 4) does the main work; a one-word line anchors nothing', '所以主力是携带（第 4 步）；一个词的行什么也钉不住')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/finalize.go (anchorSpeakers).', '出处：internal/meeting/finalize.go（anchorSpeakers）。')}</text>
        {:else}
          <rect x="15" y="80" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="104" class="label">{t('ANSWERS · NUMBERED FROM SCRATCH', '交回 · 从头编了号')}</text>
          <text x="30" y="132" class="mono">[S01] sounds right</text>
          <text x="30" y="158" class="mono">[S01] {newLine.text}</text>
          {#if phase >= 1}
            <rect x="15" y="206" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="230" class="label">{t('THE OVERLAP CHECK', '重叠检查')}</text>
            <text x="30" y="256" class="detail">{t('“sounds right” was heard twice —', 'sounds right 听过两遍 ——')}</text>
            <text x="30" y="276" class="detail">{t('request 1 stored it as s2', '请求 1 已把它存成 s2')}</text>
          {/if}
          {#if phase >= 2}
            <text x="30" y="332" class="cut">{t('the anchor: this S01 = the earlier s2', '锚点：这个 S01 = 之前的 s2')}</text>
            <rect x="15" y="352" width="270" height="96" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="30" y="380" class="mono" opacity="0.5">s2 sounds right · {t('dropped', '丢掉')}</text>
            <text x="30" y="406" class="mono">s2 {newLine.text}</text>
            <text x="30" y="434" class="detail">{t('both lines fold back to s2', '两行都折回 s2')}</text>
          {/if}
          {#if phase >= 4}
            <text x="20" y="506" class="pt">·</text>
            <text x="30" y="506" class="detail">{t('only a twice-heard line can anchor —', '只有听两遍的行能当锚点 ——')}</text>
            <text x="30" y="526" class="detail">{t('a voice missing from the overlap', '没在重叠里出声的嗓子')}</text>
            <text x="30" y="546" class="detail">{t('keeps the model\'s number', '保留模型给的号')}</text>
            <text x="20" y="572" class="pt">·</text>
            <text x="30" y="572" class="detail">{t('so the carry (Step 4) does the main work;', '所以主力是携带（第 4 步）；')}</text>
            <text x="30" y="592" class="detail">{t('a one-word line anchors nothing', '一个词的行什么也钉不住')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: finalize.go (anchorSpeakers).', '出处：finalize.go（anchorSpeakers）。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('WHAT THE PUBLIC SAMPLE PROVES', '公开样本证明了什么')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('upper bound = the best case, not a promise', '上限 = 最好的情况，不是保证')}</text>
        {#if !phone}
          <rect x="20" y="80" width="680" height="130" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="106" class="label">{t('THE SAMPLE · PUBLIC, 2026-11-16', '样本 · 公开，2026-11-16')}</text>
          <text x="40" y="132" class="detail">{t('synthetic voices — a model reading lines, not real people', '合成嗓音 —— 模型念稿子，不是真人')}</text>
          <text x="40" y="156" class="detail">{t(`spliced with ${VOXT_MTD_EVAL_GAP_S} s of quiet · the layout (who speaks when) is known`, `按 ${VOXT_MTD_EVAL_GAP_S} 秒静音拼接 · 布局（谁在什么时候说话）已知`)}</text>
          <text x="40" y="186" class="mono">{VOXT_MTD_EVAL_SPEAKER_COUNTS.join(' / ')} {t('speakers', '人')}</text>
          <text x="680" y="186" text-anchor="end" class="detail">{t('segments = transcript lines', '段 = 终稿里的行')}</text>
          {#if phase >= 1}
            <rect x="160" y="226" width="400" height="46" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={W / 2} y="254" text-anchor="middle" class="label">{VOXT_MTD_EVAL_LABELS_CORRECT} / {VOXT_MTD_EVAL_SEGMENTS} {t('segment labels correct ·', '段标签全对 ·')} {VOXT_MTD_EVAL_ROUNDS} {t('rounds identical', '轮一致')}</text>
          {/if}
          {#if phase >= 2}
            <text x="40" y="308" class="label">{t('TEXT ERRORS · ONE 0–20% SCALE', '文字错误率 · 同一把 0–20% 尺')}</text>
            {#each errBars as bar, i}
              <text x="40" y={340 + i * 40} class="detail">{bar.label}</text>
              <rect x="240" y={326 + i * 40} width={errWidth(bar.hi)} height="18" rx="4" fill={i === 0 ? 'var(--accent-soft)' : 'var(--eos-soft)'} stroke={i === 0 ? 'var(--accent)' : 'var(--eos)'} />
              <text x={246 + errWidth(bar.hi)} y={340 + i * 40} class="detail">{i === 0 ? `${bar.lo}–${bar.hi}%` : `${bar.hi}%`}</text>
            {/each}
          {/if}
          {#if phase >= 3}
            <text x="28" y="424" class="pt">·</text>
            <text x="38" y="424" class="detail">{t('scored under the old rule — a label counted right if its lines mostly matched one voice;', '按旧口径打分 —— 一个标签的行大半对上同一把嗓子就算对；')}</text>
            <text x="38" y="444" class="detail">{t('the rule is stricter now, and the rerun is pending', '口径已经收紧，重跑还没做')}</text>
            <text x="28" y="468" class="pt">·</text>
            <text x="38" y="468" class="detail">{t('clean voices taking turns, no overlap — noise, overlap and far-field are untested', '干净嗓音轮流说、不重叠 —— 噪声、重叠和远场都没测')}</text>
            <text x="28" y="492" class="pt">·</text>
            <text x="38" y="492" class="detail">{t('the code sets no four-person cap; five or more is simply unproven', '代码没有四人上限；五人以上只是还没证明')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="528" text-anchor="middle" class="cut">{t('Every line has a name — how do you correct, summarize, ask and export this transcript?', '每行都有名字了——这份终稿怎样纠正、总结、追问和导出？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: Voxt/docs/MTDEvaluation.zh-CN.md (synthetic sample).', '出处：Voxt/docs/MTDEvaluation.zh-CN.md（合成样本）。')}</text>
        {:else}
          <rect x="15" y="70" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="94" class="label">{t('THE SAMPLE · PUBLIC', '样本 · 公开')}</text>
          <text x="30" y="120" class="detail">{t('synthetic voices — a model reading', '合成嗓音 —— 模型念稿子，')}</text>
          <text x="30" y="140" class="detail">{t('lines, not real people', '不是真人')}</text>
          <text x="30" y="166" class="detail">{t(`spliced with ${VOXT_MTD_EVAL_GAP_S} s of quiet ·`, `按 ${VOXT_MTD_EVAL_GAP_S} 秒静音拼接 ·`)}</text>
          <text x="30" y="186" class="detail">{t('the layout is known', '布局已知')}</text>
          <text x="30" y="210" class="mono">{VOXT_MTD_EVAL_SPEAKER_COUNTS.join(' / ')} {t('speakers', '人')}</text>
          {#if phase >= 1}
            <rect x="35" y="236" width="230" height="60" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={W / 2} y="262" text-anchor="middle" class="label">{VOXT_MTD_EVAL_LABELS_CORRECT} / {VOXT_MTD_EVAL_SEGMENTS} {t('labels correct', '段标签全对')}</text>
            <text x={W / 2} y="284" text-anchor="middle" class="detail">{VOXT_MTD_EVAL_ROUNDS} {t('rounds identical', '轮一致')}</text>
          {/if}
          {#if phase >= 2}
            <text x="30" y="332" class="label">{t('TEXT ERRORS · ONE 0–20% SCALE', '文字错误率 · 同一把尺')}</text>
            {#each errBars as bar, i}
              <text x="30" y={362 + i * 40} class="detail">{bar.label}</text>
              <rect x="150" y={348 + i * 40} width={errWidth(bar.hi) / 3} height="18" rx="4" fill={i === 0 ? 'var(--accent-soft)' : 'var(--eos-soft)'} stroke={i === 0 ? 'var(--accent)' : 'var(--eos)'} />
              <text x={156 + errWidth(bar.hi) / 3} y={362 + i * 40} class="detail">{i === 0 ? `${bar.lo}–${bar.hi}%` : `${bar.hi}%`}</text>
            {/each}
          {/if}
          {#if phase >= 3}
            <text x="20" y="468" class="pt">·</text>
            <text x="30" y="468" class="detail">{t('scored under the old rule —', '按旧口径打分 ——')}</text>
            <text x="30" y="488" class="detail">{t('a label counted right if its lines mostly', '一个标签的行大半对上同一把嗓子')}</text>
            <text x="30" y="508" class="detail">{t('matched one voice; the rerun is pending', '就算对；收紧后还没重跑')}</text>
            <text x="20" y="534" class="pt">·</text>
            <text x="30" y="534" class="detail">{t('clean voices, no overlap — noise,', '干净嗓音、不重叠 —— 噪声、')}</text>
            <text x="30" y="554" class="detail">{t('overlap and far-field are untested', '重叠和远场都没测')}</text>
            <text x="20" y="580" class="pt">·</text>
            <text x="30" y="580" class="detail">{t('no four-person cap in code;', '代码没有四人上限；')}</text>
            <text x="30" y="600" class="detail">{t('five or more is simply unproven', '五人以上只是还没证明')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="666" text-anchor="middle" class="cut">{t('Every line has a name —', '每行都有名字了 ——')}</text>
            <text x={W / 2} y="690" text-anchor="middle" class="cut">{t('how do you correct, summarize,', '这份终稿怎样纠正、总结、')}</text>
            <text x={W / 2} y="714" text-anchor="middle" class="cut">{t('ask and export this transcript?', '追问和导出？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: MTDEvaluation.zh-CN.md.', '出处：MTDEvaluation.zh-CN.md。')}</text>
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
  .mono { font-family: var(--mono); font-size: 11.5px; fill: var(--fg); }
  .tag { font-size: 11px; fill: var(--muted); }
  .tagpill { font-family: var(--mono); font-size: 11px; font-weight: 700; }
  .blue { fill: var(--accent); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
    .tagpill { font-size: 10.5px; }
  }
</style>
