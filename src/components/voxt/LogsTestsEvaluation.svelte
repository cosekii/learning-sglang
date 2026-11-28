<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_LOG_RING_LINES,
    VOXT_LOG_KEEP_FILES,
    VOXT_ISSUE_BODY_MAX_RUNES,
    VOXT_EVAL_SHORT_CLIPS,
    VOXT_EVAL_SHORT_SECONDS,
    VOXT_EVAL_LONG_CLIPS,
    VOXT_EVAL_LONG_SECONDS,
    VOXT_EVAL_CLIP_COUNT,
    VOXT_EVAL_DICT_TERMS,
    VOXT_EVAL_DICT_WITH,
    VOXT_EVAL_DICT_WITHOUT,
    VOXT_TEST_FILE_COUNT,
    VOXT_TEST_ROOT_FILES,
    VOXT_TEST_SESSION_FILES,
    VOXT_TEST_MEETING_FILES,
    VOXT_TEST_ASR_FILES,
    VOXT_TEST_OMNI_FILES,
    VOXT_TEST_LLM_FILES,
    VOXT_TEST_COMPOSE_FILES,
    VOXT_TEST_OTHER_FILES,
    VOXT_MANUAL_TEST_MINUTES,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Chapter 15 asked which claims have evidence. Three kinds of proof hang on the route.',
    captionZh: '第 15 章问哪些结论有证据。三种证据挂上这条路线。',
  }, {
    caption: 'The app checks itself with 515 test files. Each one pins a behavior.',
    captionZh: 'app 用 515 份测试自己考自己。每份钉住一个行为。',
  }, {
    caption: '31 fixed recordings get scored. The voices are synthetic, so real dictation scores worse.',
    captionZh: '31 段固定录音被打分。嗓音是合成的，真人说的话分数更差。',
  }, {
    caption: 'A person spends about 80 minutes on a real Mac. Key presses and permission dialogs cannot be faked.',
    captionZh: '人在真机上花约 80 分钟。按键和权限弹窗伪造不了。',
  }, {
    caption: 'The app keeps a diary of what it did. Keys and your words stay out of it.',
    captionZh: 'app 把自己做的事记成流水账。钥匙和你说的话进不去。',
  }, {
    caption: 'Every station has tests; samples cover recognition; a real Mac covers the human parts. The rest is still open.',
    captionZh: '每站都有测试，样本覆盖识别，真机覆盖人的部分。剩下的仍是空白。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: chapter 15\'s question about evidence, then the book\'s six-station route from you press to save text. Three tag cards appear one at a time: code test, the app checks itself; sample eval, fixed recordings scored; real check, a person on a real Mac. A last line lists the chapter\'s six steps.',
    zh: '画面按顺序形成：第 15 章关于证据的问题，然后是本书从你按一下到保存文字的六站路线。三张标签卡逐个出现：代码测试，app 自己考自己；样本评测，固定录音打分；真机检查，人在真机上做。最后一行列出本章六步。',
  }, {
    en: 'The picture builds in order: test files counted by home, root package 258, session 53, meeting 36, then asr 16, omni 13, llm 10, compose 8 and everywhere else 121. The sum 515 test files appears, then three pinned examples: the nine-second split fixture, a fake helper crashing on cue, and a test watching that keys never reach the log.',
    zh: '画面按顺序形成：按归属数出的测试文件，root 包 258、session 53、meeting 36，再是 asr 16、omni 13、llm 10、compose 8 和其余 121。出现合计 515 份测试，然后是三个钉住的例子：9 秒切分的测试夹具、一个按指令崩溃的假 helper，以及一个盯着钥匙不进日志的测试。',
  }, {
    en: 'The picture builds in order: 29 short clip tiles and 2 long bars, the sum 29 plus 2 equals 31 fixed recordings with a note that the voices are synthetic. A score card shows the dictionary test, 7 of 10 terms with the dictionary against 4 of 10 without. Warnings follow: real dictation scores worse, the speaker 11 of 11 was the old scoring, and the cleanup evals no longer run.',
    zh: '画面按顺序形成：29 个短录音格和 2 条长录音，出现算式 29 加 2 等于 31 段固定录音，并注明嗓音是合成的。一张记分卡展示词典测试：有词典 10 个词中 7 个，没有词典 4 个。随后是警示：真人听写分数更差，分人的 11/11 是旧口径，整理的评测不再跑了。',
  }, {
    en: 'The picture builds in order: a card saying one person, one real Mac, about 80 minutes. Four checklist cards appear: real microphone, permission dialogs, the key listener, reading other apps. A line explains a fake helper cannot press a real key, and a last line names the mac-e2e and mac-regress scripts.',
    zh: '画面按顺序形成：一张卡写着一个人、一台真 Mac、约 80 分钟。四张清单卡出现：真麦克风、权限弹窗、按键监听、读别的 app。一行解释假 helper 按不了真的键，最后一行点名 mac-e2e 和 mac-regress 两个脚本。',
  }, {
    en: 'The picture builds in order: a log panel where three lines arrive, the rule that the newest 2,000 lines stay in memory, three log files each capped at 5 MB, an authorization line struck through with the rule that keys never reach the log, and a diagnostics bundle with no words you said, its issue text cut to 5,000 runes.',
    zh: '画面按顺序形成：一个日志面板到达三行，出现最新 2,000 行留在内存的规则，三个各不超过 5 MB 的日志文件，一条被划掉的授权行和钥匙不进日志的规则，以及一个不含你说的话的诊断包，issue 正文裁到 5,000 字。',
  }, {
    en: 'The picture builds in order: the six-station route, then blue test tags land on every station, an amber sample tag lands on sound to words, dark real-check tags land on you press, helper and you see text. A dashed band lists what stays open: noisy rooms and real voices, more than four speakers, your Mac with your apps. A closing line says code says what it does, samples say how well on those recordings, the open parts stay on the map.',
    zh: '画面按顺序形成：六站路线，蓝色测试标签落到每一站，琥珀色样本标签落到声音变文字，深色真机标签落到你按一下、helper 和看到文字。一条虚线带列出仍空白的：噪声房间和真人嗓音、超过四人的会议、你的 Mac 和你的 app。收束行说：代码说清了做什么，样本说清了那些录音上的成绩，空白留在图上。',
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
  const H = $derived((phone ? [700, 660, 640, 560, 700, 780] : [470, 460, 470, 430, 500, 530])[step]);
  const LP_PHONE = [664, 624, 604, 528, 664, 744];

  const PHASE_COUNTS = [6, 5, 4, 4, 5, 6];
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
    [{ x: 13, y: 60, w: 274, h: 60 }, { x: 13, y: 140, w: 274, h: 150 }, { x: 13, y: 326, w: 274, h: 86 }, { x: 13, y: 428, w: 274, h: 86 }, { x: 13, y: 530, w: 274, h: 86 }, { x: 13, y: 612, w: 274, h: 50 }],
    [{ x: 13, y: 60, w: 274, h: 210 }, { x: 13, y: 60, w: 274, h: 330 }, { x: 13, y: 60, w: 274, h: 330 }, { x: 13, y: 406, w: 274, h: 90 }, { x: 13, y: 512, w: 274, h: 90 }],
    [{ x: 13, y: 60, w: 274, h: 190 }, { x: 13, y: 266, w: 274, h: 50 }, { x: 13, y: 352, w: 274, h: 120 }, { x: 13, y: 490, w: 274, h: 90 }],
    [{ x: 13, y: 60, w: 274, h: 70 }, { x: 13, y: 146, w: 274, h: 240 }, { x: 13, y: 402, w: 274, h: 50 }, { x: 13, y: 470, w: 274, h: 50 }],
    [{ x: 13, y: 60, w: 274, h: 130 }, { x: 13, y: 206, w: 274, h: 40 }, { x: 13, y: 262, w: 274, h: 90 }, { x: 13, y: 368, w: 274, h: 120 }, { x: 13, y: 504, w: 274, h: 140 }],
    [{ x: 13, y: 60, w: 274, h: 340 }, { x: 13, y: 60, w: 274, h: 400 }, { x: 13, y: 60, w: 274, h: 400 }, { x: 13, y: 60, w: 274, h: 400 }, { x: 13, y: 440, w: 274, h: 190 }, { x: 13, y: 646, w: 274, h: 80 }],
  ] : [
    [{ x: 20, y: 62, w: 680, h: 40 }, { x: 30, y: 116, w: 660, h: 70 }, { x: 20, y: 222, w: 213, h: 118 }, { x: 253, y: 222, w: 213, h: 118 }, { x: 487, y: 222, w: 213, h: 118 }, { x: 20, y: 366, w: 680, h: 60 }],
    [{ x: 20, y: 66, w: 350, h: 250 }, { x: 20, y: 66, w: 350, h: 250 }, { x: 20, y: 66, w: 350, h: 250 }, { x: 390, y: 66, w: 310, h: 250 }, { x: 20, y: 336, w: 680, h: 96 }],
    [{ x: 20, y: 66, w: 680, h: 130 }, { x: 20, y: 212, w: 680, h: 56 }, { x: 20, y: 284, w: 680, h: 92 }, { x: 20, y: 390, w: 680, h: 46 }],
    [{ x: 20, y: 66, w: 680, h: 54 }, { x: 20, y: 136, w: 680, h: 170 }, { x: 20, y: 316, w: 680, h: 40 }, { x: 20, y: 366, w: 680, h: 32 }],
    [{ x: 20, y: 66, w: 680, h: 104 }, { x: 20, y: 186, w: 680, h: 34 }, { x: 20, y: 230, w: 680, h: 70 }, { x: 20, y: 312, w: 680, h: 66 }, { x: 20, y: 394, w: 680, h: 76 }],
    [{ x: 30, y: 96, w: 660, h: 130 }, { x: 30, y: 96, w: 660, h: 160 }, { x: 30, y: 96, w: 660, h: 190 }, { x: 30, y: 96, w: 660, h: 190 }, { x: 20, y: 296, w: 680, h: 110 }, { x: 20, y: 422, w: 680, h: 60 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  // The book's route, station names shared with Ch. 1 Step 2.
  const route = [
    { name: 'YOU PRESS', nameZh: '你按一下' },
    { name: 'HELPER', nameZh: 'helper' },
    { name: 'SOUND → WORDS', nameZh: '声音 → 文字' },
    { name: 'TIDY WORDS', nameZh: '整理文字' },
    { name: 'YOU SEE TEXT', nameZh: '看到文字' },
    { name: 'SAVE TEXT', nameZh: '保存文字' },
  ];
  const kinds = [
    { id: 'test', name: 'CODE TEST', nameZh: '代码测试', gloss: 'the app checks itself', glossZh: 'app 自己考自己', extra: 're-runs any time', extraZh: '随时能再跑一遍', color: 'var(--accent)', soft: 'var(--accent-soft)' },
    { id: 'sample', name: 'SAMPLE EVAL', nameZh: '样本评测', gloss: 'fixed recordings, scored', glossZh: '固定录音，打分', extra: 'the same ones every run', extraZh: '每次都重放同几段', color: 'var(--gen)', soft: 'var(--gen-soft)' },
    { id: 'real', name: 'REAL CHECK', nameZh: '真机检查', gloss: 'a person on a real Mac', glossZh: '人在真机上做', extra: 'cannot be faked', extraZh: '伪造不了', color: 'var(--fg)', soft: 'var(--bg)' },
  ];
  // Step 2: test files counted by home (pinned source; src/voxt/numbers.ts).
  const testRows = $derived([
    { name: 'root package', count: VOXT_TEST_ROOT_FILES, phase: 1 },
    { name: 'session', count: VOXT_TEST_SESSION_FILES, phase: 1 },
    { name: 'meeting', count: VOXT_TEST_MEETING_FILES, phase: 1 },
    { name: 'asr', count: VOXT_TEST_ASR_FILES, phase: 2 },
    { name: 'omni', count: VOXT_TEST_OMNI_FILES, phase: 2 },
    { name: 'llm', count: VOXT_TEST_LLM_FILES, phase: 2 },
    { name: 'compose', count: VOXT_TEST_COMPOSE_FILES, phase: 2 },
    { name: t('everywhere else', '其余各处'), count: VOXT_TEST_OTHER_FILES, phase: 2 },
  ]);
  // Step 6: which tags land on which station (0-based station index).
  const stationTags: Record<number, { test: number; sample: number; real: number }> = {
    0: { test: 1, sample: 0, real: 1 },
    1: { test: 1, sample: 0, real: 1 },
    2: { test: 1, sample: 1, real: 0 },
    3: { test: 1, sample: 0, real: 0 },
    4: { test: 1, sample: 0, real: 1 },
    5: { test: 1, sample: 0, real: 0 },
  };
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="ev-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THE ROUTE · THREE KINDS OF PROOF', '这条路线 · 三种证据')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('proof = something you can check', '证据 = 能核对的东西')}</text>
        <rect x={phone ? 13 : 20} y={phone ? 60 : 62} width={phone ? 274 : 680} height={phone ? 60 : 40} rx="9" fill="var(--bg)" stroke="var(--line)" />
        {#if phone}
          <text x={W / 2} y="84" text-anchor="middle" class="detail">{t('Ch. 15 Step 6 asks: which claims', '第 15 章第 6 步问：')}</text>
          <text x={W / 2} y="104" text-anchor="middle" class="detail">{t('have tests or evaluation evidence?', '哪些结论有测试或评测证据？')}</text>
        {:else}
          <text x={W / 2} y="88" text-anchor="middle" class="detail">{t('Ch. 15 Step 6 asks: which claims have tests or evaluation evidence?', '第 15 章第 6 步问：哪些结论有测试或评测证据？')}</text>
        {/if}
        {#if phase >= 1}
          {#each route as station, i}
            {@const x = phone ? 13 + (i % 3) * 94 : 30 + i * 112}
            {@const y = phone ? 140 + Math.floor(i / 3) * 76 : 116}
            <rect x={x} {y} width={phone ? 86 : 100} height="64" rx="9" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x={x + (phone ? 43 : 50)} y={y + 28} text-anchor="middle" class="boxname">{t(station.name, station.nameZh)}</text>
            {#if !phone && i < route.length - 1}
              <line x1={x + 100} y1={y + 32} x2={x + 112} y2={y + 32} stroke="var(--muted)" stroke-width="2" marker-end="url(#ev-arrow)" />
            {/if}
          {/each}
          {#if phone}<text x={W / 2} y="306" text-anchor="middle" class="detail">{t('the route from Ch. 1 Step 2', '第 1 章第 2 步的路线')}</text>{/if}
        {/if}
        {#each kinds as kind, k}
          {#if phase >= 2 + k}
            {@const x = phone ? 13 : 20 + k * 233.5}
            {@const y = phone ? 326 + k * 102 : 222}
            <rect {x} {y} width={phone ? 274 : 213} height={phone ? 86 : 118} rx="10" fill={kind.soft} stroke={kind.color} stroke-width="1.5" />
            <rect x={x + 16} y={y + 16} width="14" height="14" rx="4" fill={kind.color} />
            <text x={x + 40} y={y + 28} class="label" fill={kind.color}>{t(kind.name, kind.nameZh)}</text>
            <text x={x + 16} y={y + (phone ? 52 : 62)} class="detail">{t(kind.gloss, kind.glossZh)}</text>
            <text x={x + 16} y={y + (phone ? 74 : 92)} class="detail">{t(kind.extra, kind.extraZh)}</text>
          {/if}
        {/each}
        {#if phase >= 5}
          {#if phone}
            <text x="20" y="632" class="pt">·</text>
            <text x="30" y="632" class="detail">{t('tests (2) · samples (3) · a real Mac (4)', '测试（2）· 样本（3）· 真机（4）')}</text>
            <text x="30" y="652" class="detail">{t('the diary (5) · the whole map (6)', '日记（5）· 全图（6）')}</text>
          {:else}
            <text x="28" y="392" class="pt">·</text>
            <text x="38" y="392" class="detail">{t('this chapter: tests (2) · samples (3) · a real Mac (4) · the diary (5) · the whole map (6)', '本章：测试（2）· 样本（3）· 真机（4）· 日记（5）· 全图（6）')}</text>
            <text x="28" y="416" class="pt">·</text>
            <text x="38" y="416" class="detail">{t('the station names are the ones from Ch. 1 Step 2', '站名沿用第 1 章第 2 步')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Tags are this chapter\'s map legend, not a coverage audit.', '标签是本章的地图图例，不是覆盖审计。')}</text>
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('CODE TESTS · 515 SELF-CHECKS', '代码测试 · 515 份自检')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('a test = a small check the app runs on itself', '测试 = app 对自己跑的小检查')}</text>
        <rect x={phone ? 13 : 20} y={phone ? 60 : 66} width={phone ? 274 : 350} height={phone ? 330 : 250} rx="10" fill="var(--bg)" stroke="var(--fg)" />
        <text x={phone ? 30 : 40} y={phone ? 86 : 92} class="label">{t('TEST FILES BY HOME', '按归属数测试文件')}</text>
        {#each testRows as row, i}
          {#if phase >= row.phase}
            <text x={phone ? 30 : 40} y={(phone ? 118 : 124) + i * (phone ? 30 : 26)} class="mono">{row.name}</text>
            <text x={phone ? 270 : 350} y={(phone ? 118 : 124) + i * (phone ? 30 : 26)} text-anchor="end" class="mono">{row.count}</text>
          {/if}
        {/each}
        {#if phase >= 3}
          {#if phone}
            <rect x="13" y="406" width="274" height="90" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="430" class="label blue">{t('IN ALL', '合计')}</text>
            <text x="30" y="458" class="formula">{VOXT_TEST_ROOT_FILES}+{VOXT_TEST_SESSION_FILES}+{VOXT_TEST_MEETING_FILES}+{VOXT_TEST_ASR_FILES}+{VOXT_TEST_OMNI_FILES}+{VOXT_TEST_LLM_FILES}+{VOXT_TEST_COMPOSE_FILES}+{VOXT_TEST_OTHER_FILES}</text>
            <text x="30" y="482" class="formula">= {VOXT_TEST_FILE_COUNT} {t('test files', '份测试')}</text>
          {:else}
            <rect x="390" y="66" width="310" height="250" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="410" y="96" class="label blue">{t('IN ALL', '合计')}</text>
            <text x="410" y="140" class="formula">{VOXT_TEST_ROOT_FILES} + {VOXT_TEST_SESSION_FILES} + {VOXT_TEST_MEETING_FILES}</text>
            <text x="410" y="168" class="formula">+ {VOXT_TEST_ASR_FILES} + {VOXT_TEST_OMNI_FILES} + {VOXT_TEST_LLM_FILES} + {VOXT_TEST_COMPOSE_FILES} + {VOXT_TEST_OTHER_FILES}</text>
            <text x="410" y="212" class="formula">= {VOXT_TEST_FILE_COUNT} {t('test files', '份测试')}</text>
            <text x="410" y="250" class="detail">{t('each pins one behavior', '每份钉住一个行为')}</text>
            <text x="410" y="278" class="detail">{t('and runs again after each change', '每次改动后再跑')}</text>
          {/if}
        {/if}
        {#if phase >= 4}
          {#if phone}
            <text x="20" y="534" class="pt">·</text>
            <text x="30" y="534" class="detail">{t('Ch. 4 Step 4\'s 9 s split is one test\'s fixture', '第 4 章第 4 步的 9 秒切分是测试夹具')}</text>
            <text x="20" y="564" class="pt">·</text>
            <text x="30" y="564" class="detail">{t('a fake helper crashes on cue (Ch. 2)', '假 helper 按指令崩溃（第 2 章）')}</text>
            <text x="20" y="594" class="pt">·</text>
            <text x="30" y="594" class="detail">{t('a test watches: keys never reach the log (Step 5)', '有测试盯着：钥匙进不了日志（第 5 步）')}</text>
          {:else}
            <rect x="20" y="336" width="680" height="96" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="360" class="label">{t('WHAT THEY PIN · three examples', '它们钉住什么 · 三个例子')}</text>
            <text x="28" y="384" class="pt">·</text>
            <text x="38" y="384" class="detail">{t('the 9 s limit and 300 ms pause from Ch. 4 Step 4 are one test\'s fixture', '第 4 章第 4 步的 9 秒上限和 300 ms 停顿就是一份测试的夹具')}</text>
            <text x="28" y="404" class="pt">·</text>
            <text x="38" y="404" class="detail">{t('a fake helper crashes and restarts on cue, watched by a test (Ch. 2)', '一个假 helper 按指令崩溃又重启，有测试看着（第 2 章）')}</text>
            <text x="28" y="424" class="pt">·</text>
            <text x="38" y="424" class="detail">{t('a test watches that keys never reach the log (Step 5)', '有测试盯着钥匙永远进不了日志（第 5 步）')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Counted at the pinned source · files hold many checks.' : 'Counted from the pinned source tree; each file can hold many checks.', '按固定的源码树数出；每份文件里有多条检查。')}</text>
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t(phone ? 'SAMPLE EVALUATIONS · SCORED' : 'SAMPLE EVALUATIONS · SCORED RECORDINGS', '样本评测 · 被打分的录音')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('a sample = the same recording, replayed every run', '样本 = 每次都重放的同一段录音')}</text>
        <rect x={phone ? 13 : 20} y={phone ? 60 : 66} width={phone ? 274 : 440} height={phone ? 190 : 130} rx="10" fill="var(--bg)" stroke="var(--fg)" />
        <text x={phone ? 30 : 40} y={phone ? 84 : 90} class="label">{t('SHORT CLIPS · SYNTHETIC VOICES', '短录音 · 合成嗓音')}</text>
        {#each Array(VOXT_EVAL_SHORT_CLIPS) as _, i}
          {@const perRow = phone ? 12 : 15}
          <rect x={(phone ? 30 : 40) + (i % perRow) * (phone ? 19 : 27)} y={(phone ? 96 : 102) + Math.floor(i / perRow) * 24} width={phone ? 14 : 20} height="16" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
        {/each}
        <text x={phone ? 30 : 40} y={phone ? 178 : 168} class="detail">{VOXT_EVAL_SHORT_CLIPS} {t('short ·', '段短的 · 共')} {VOXT_EVAL_SHORT_SECONDS} s</text>
          <text x={phone ? 30 : 40} y={phone ? 200 : 186} class="detail">{t(phone ? 'synthetic voice = a model, not a person' : 'synthetic voice = a model reading lines, not a person', '合成嗓音 = 模型念稿子，不是真人')}</text>
        {#if !phone}
          <rect x="480" y="66" width="220" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="500" y="90" class="label">{t('LONG ONES', '长录音')}</text>
          <rect x="500" y="104" width="120" height="18" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x="500" y="130" width="120" height="18" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="500" y="176" class="detail">{VOXT_EVAL_LONG_CLIPS} {t('long ·', '段长的 ·')} {VOXT_EVAL_LONG_SECONDS[0]} s + {VOXT_EVAL_LONG_SECONDS[1]} s</text>
        {:else}
          <text x="30" y="236" class="detail">{VOXT_EVAL_LONG_CLIPS} {t('long ·', '段长的 ·')} {VOXT_EVAL_LONG_SECONDS[0]} s + {VOXT_EVAL_LONG_SECONDS[1]} s</text>
        {/if}
        {#if phase >= 1}
          <text x={W / 2} y={phone ? 288 : 240} text-anchor="middle" class="formula">{VOXT_EVAL_SHORT_CLIPS} + {VOXT_EVAL_LONG_CLIPS} = {VOXT_EVAL_CLIP_COUNT} {t('fixed recordings · the same ones every run', '段固定录音 · 每次都重放这几段')}</text>
        {/if}
        {#if phase >= 2}
          <rect x={phone ? 13 : 20} y={phone ? 352 : 284} width={phone ? 274 : 680} height={phone ? 120 : 92} rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
          <text x={phone ? 30 : 40} y={phone ? 378 : 310} class="label blue">{t('ONE SCORE · THE DICTIONARY TEST (Ch. 8)', '一次打分 · 词典测试（第 8 章）')}</text>
          <text x={phone ? 30 : 40} y={phone ? 408 : 340} class="formula">{VOXT_EVAL_DICT_TERMS} {t('terms dictated', '个术语')}</text>
          <text x={phone ? 30 : 40} y={phone ? 434 : 364} class="formula">{t('with the dictionary', '有词典')} {VOXT_EVAL_DICT_WITH} / {VOXT_EVAL_DICT_TERMS} · {t('without', '没有')} {VOXT_EVAL_DICT_WITHOUT} / {VOXT_EVAL_DICT_TERMS}</text>
          {#if phone}<text x="30" y="460" class="detail">{t('the right word lands more often', '对的词更容易落上')}</text>{/if}
        {/if}
        {#if phase >= 3}
          {#if phone}
            <text x="20" y="510" class="pt">·</text>
            <text x="30" y="510" class="detail">{t('the doc itself: real dictation scores worse', '文档自己写：真人听写分数更差')}</text>
            <text x="20" y="540" class="pt">·</text>
            <text x="30" y="540" class="detail">{t('11 / 11 speakers: the old scoring (Ch. 14)', '分人的 11/11 是旧口径（第 14 章）')}</text>
            <text x="20" y="570" class="pt">·</text>
            <text x="30" y="570" class="detail">{t('the cleanup evals are a record; they no longer run', '整理的评测只留下记录，不再跑了')}</text>
          {:else}
            <text x="28" y="412" class="pt">·</text>
            <text x="38" y="412" class="detail">{t('studio-clean synthetic voices — the doc itself warns: real dictation scores worse', '录音棚级的干净合成嗓音 —— 文档自己警告：真人听写分数更差')}</text>
            <text x="28" y="436" class="pt">·</text>
            <text x="38" y="436" class="detail">{t('the speaker 11 / 11 was the old scoring (Ch. 14 Step 6); the cleanup evals are a kept record and no longer run', '分人的 11/11 是旧口径（第 14 章第 6 步）；整理的评测是留下的记录，不再跑了')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: Voxt/docs/eval.md at the pinned revision.', '出处：固定版本的 Voxt/docs/eval.md。')}</text>
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('REAL-MAC CHECKS · A PERSON\'S LIST', '真机检查 · 人的清单')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('checklist = things a person tries by hand', '清单 = 人亲手试的项')}</text>
        <rect x={phone ? 13 : 20} y={phone ? 60 : 66} width={phone ? 274 : 680} height={phone ? 70 : 54} rx="10" fill="var(--bg)" stroke="var(--fg)" />
        <text x={W / 2} y={phone ? 88 : 92} text-anchor="middle" class="label">{t('ONE PERSON · ONE REAL MAC', '一个人 · 一台真 Mac')}</text>
        <text x={W / 2} y={phone ? 112 : 108} text-anchor="middle" class="formula">≈ {VOXT_MANUAL_TEST_MINUTES} {t('minutes', '分钟')}</text>
        {#if phase >= 1}
          {#each [
            { name: 'REAL MICROPHONE', nameZh: '真麦克风', note: 'your voice, your room', noteZh: '你的嗓音，你的房间' },
            { name: 'PERMISSION DIALOGS', nameZh: '权限弹窗', note: 'the Mac asks, you answer', noteZh: 'Mac 问，你来答' },
            { name: 'THE KEY LISTENER', nameZh: '按键监听', note: 'a real finger presses', noteZh: '真的手指按下去' },
            { name: 'READING OTHER APPS', nameZh: '读别的 app', note: 'the real front window', noteZh: '真实的前台窗口' },
          ] as item, i}
            {@const x = phone ? 13 : 20 + (i % 2) * 350}
            {@const y = phone ? 146 + i * 62 : 136 + Math.floor(i / 2) * 86}
            <rect {x} {y} width={phone ? 274 : 330} height={phone ? 54 : 78} rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x={x + 16} y={y + 24} class="label">{t(item.name, item.nameZh)}</text>
            <text x={x + 16} y={y + (phone ? 44 : 48)} class="detail">{t(item.note, item.noteZh)}</text>
            {#if !phone}<text x={x + 16} y={y + 66} class="detail">{t('automation cannot fake it', '自动化伪造不了')}</text>{/if}
          {/each}
        {/if}
        {#if phase >= 2}
          {#if phone}
            <text x="30" y="422" class="detail">{t('a fake helper crashes on cue (Step 2);', '假 helper 能按指令崩溃（第 2 步）；')}</text>
            <text x="30" y="442" class="detail">{t('a real key press exists only on a real Mac', '真的按键只存在于真 Mac 上')}</text>
          {:else}
            <text x="38" y="340" class="detail">{t('a fake helper crashes on cue (Step 2); a real key press exists only on a real Mac', '假 helper 能按指令崩溃（第 2 步）；真的按键只存在于真 Mac 上')}</text>
          {/if}
        {/if}
        {#if phase >= 3}
          {#if phone}
            <text x="30" y="490" class="detail">{t('mac-e2e.sh and mac-regress.sh run parts', 'mac-e2e.sh 和 mac-regress.sh')}</text>
            <text x="30" y="510" class="detail">{t('of the list — still on a real Mac', '跑清单的一部分 —— 仍在真 Mac 上')}</text>
          {:else}
            <text x="38" y="392" class="detail">{t('mac-e2e.sh and mac-regress.sh run parts of the list — still on a real Mac', 'mac-e2e.sh 和 mac-regress.sh 跑清单的一部分 —— 仍在真 Mac 上')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: Voxt/docs/manual-test.md at the pinned revision.', '出处：固定版本的 Voxt/docs/manual-test.md。')}</text>
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('LOGS · THE APP\'S DIARY', '日志 · app 的日记')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('a log = the app writing down what it did', '日志 = app 记下自己做的事')}</text>
        <rect x={phone ? 13 : 20} y={phone ? 60 : 66} width={phone ? 274 : 680} height={phone ? 130 : 104} rx="10" fill="var(--bg)" stroke="var(--fg)" />
        <text x={phone ? 30 : 40} y={phone ? 84 : 90} class="label">{t('THE DIARY · newest first (constructed)', '日记 · 新的在前（构造例）')}</text>
        {#if phone}
          <text x="30" y="112" class="mono">09:15:06 INFO app saved A</text>
          <text x="30" y="138" class="mono">09:15:04 WARN helper slow 1.2 s</text>
          <text x="30" y="164" class="mono">09:15:02 INFO app started A</text>
        {:else}
          <text x="40" y="118" class="mono">2026-11-28 09:15:06.770 INFO app · session A saved</text>
          <text x="40" y="140" class="mono">2026-11-28 09:15:04.401 WARN helper · answer took 1.2 s</text>
          <text x="40" y="162" class="mono">2026-11-28 09:15:02.113 INFO app · session A started</text>
        {/if}
        {#if phase >= 1}
          <text x={W / 2} y={phone ? 224 : 204} text-anchor="middle" class="detail">{t(`the newest ${VOXT_LOG_RING_LINES} lines stay in memory — older ones roll off`, `最新 ${VOXT_LOG_RING_LINES} 行留在内存 —— 更老的滚出去`)}</text>
        {/if}
        {#if phase >= 2}
          {#each ['voxtnew.log', 'voxtnew.log.1', 'voxtnew.log.2'] as name, i}
            <rect x={(phone ? 30 : 60) + i * (phone ? 82 : 205)} y={phone ? 262 : 236} width={phone ? 76 : 185} height="34" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x={(phone ? 30 : 60) + i * (phone ? 82 : 205) + (phone ? 38 : 92)} y={phone ? 283 : 258} text-anchor="middle" class="mono">{phone ? name.replace('voxtnew', '…new') : name}</text>
          {/each}
          <text x={W / 2} y={phone ? 330 : 292} text-anchor="middle" class="detail">{t(`each capped at 5 MB · ${VOXT_LOG_KEEP_FILES} old ones kept`, `每个不超过 5 MB · 留 ${VOXT_LOG_KEEP_FILES} 个旧的`)}</text>
        {/if}
        {#if phase >= 3}
          <rect x={phone ? 13 : 20} y={phone ? 368 : 312} width={phone ? 274 : 680} height={phone ? 120 : 66} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
          <text x={phone ? 30 : 40} y={phone ? 394 : 338} class="mono" text-decoration="line-through">Authorization: Bearer sk-demo…1234</text>
          {#if phone}
            <text x="30" y="424" class="detail">{t('keys, tokens and passwords', '钥匙、令牌和密码')}</text>
            <text x="30" y="444" class="detail">{t('never reach the diary', '永远进不了日记')}</text>
            <text x="30" y="472" class="detail">{t('your words: off by default', '你说的话：默认不记')}</text>
          {:else}
            <text x="40" y="364" class="detail">{t('keys, tokens and passwords never reach the diary · your words: off by default', '钥匙、令牌和密码永远进不了日记 · 你说的话：默认不记')}</text>
          {/if}
        {/if}
        {#if phase >= 4}
          <rect x={phone ? 13 : 20} y={phone ? 504 : 394} width={phone ? 274 : 680} height={phone ? 140 : 76} rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
          <text x={phone ? 30 : 40} y={phone ? 530 : 420} class="label blue">{t('REPORT A BUG → a diagnostics .zip', '报告问题 → 一个诊断 .zip')}</text>
          {#if phone}
            <text x="30" y="556" class="detail">{t('diagnostics.txt + settings + the logs', 'diagnostics.txt + 设置 + 日志')}</text>
            <text x="30" y="580" class="detail">{t('no words you said', '没有你说的话')}</text>
            <text x="30" y="608" class="detail">{t(`the issue text is cut to ${VOXT_ISSUE_BODY_MAX_RUNES} runes`, `issue 正文裁到 ${VOXT_ISSUE_BODY_MAX_RUNES} 字`)}</text>
          {:else}
            <text x="40" y="446" class="detail">{t('diagnostics.txt + settings + the logs · no words you said', 'diagnostics.txt + 设置 + 日志 · 没有你说的话')}</text>
            <text x="680" y="466" text-anchor="end" class="detail">{t(`the issue text is cut to ${VOXT_ISSUE_BODY_MAX_RUNES} runes`, `issue 正文裁到 ${VOXT_ISSUE_BODY_MAX_RUNES} 字`)}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: logs.go; settings_about_controller.go.', '出处：logs.go；settings_about_controller.go。')}</text>
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THE WHOLE BOOK · WHAT EACH PROVES', '整本书 · 各证各的')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('a tag means: this book showed pinned evidence there', '标签表示：本书在这里展示过钉住的证据')}</text>
        {#if phone}
          {#each route as station, i}
            {@const y = 60 + i * 56}
            <rect x="13" {y} width="274" height="48" rx="9" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x="26" y={y + 29} class="boxname">{t(station.name, station.nameZh)}</text>
            {#if phase >= 1 && stationTags[i].test}
              <rect x="152" y={y + 13} width="42" height="22" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="173" y={y + 28} text-anchor="middle" class="tagpill" fill="var(--accent)">TEST</text>
            {/if}
            {#if phase >= 2 && stationTags[i].sample}
              <rect x="198" y={y + 13} width="54" height="22" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="225" y={y + 28} text-anchor="middle" class="tagpill" fill="var(--gen)">SAMPLE</text>
            {/if}
            {#if phase >= 3 && stationTags[i].real}
              <rect x="198" y={y + 13} width="44" height="22" rx="7" fill="var(--bg)" stroke="var(--fg)" />
              <text x="220" y={y + 28} text-anchor="middle" class="tagpill" fill="var(--fg)">REAL</text>
            {/if}
          {/each}
          {#if phase >= 1}
            <rect x="20" y="406" width="12" height="12" rx="4" fill="var(--accent)" />
            <text x="38" y="417" class="detail">{t('test · every station', '测试 · 每一站')}</text>
            <rect x="150" y="406" width="12" height="12" rx="4" fill="var(--gen)" />
            <text x="168" y="417" class="detail">{t('sample · recognition', '样本 · 识别')}</text>
          {/if}
        {:else}
          {#each route as station, i}
            {@const x = 30 + i * 112}
            <rect {x} y="96" width="100" height="64" rx="9" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
            <text x={x + 50} y="124" text-anchor="middle" class="boxname">{t(station.name, station.nameZh)}</text>
            {#if i < route.length - 1}
              <line x1={x + 100} y1="128" x2={x + 112} y2="128" stroke="var(--muted)" stroke-width="2" marker-end="url(#ev-arrow)" />
            {/if}
            {#if phase >= 1 && stationTags[i].test}
              <rect x={x + 16} y="170" width="68" height="22" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 50} y="185" text-anchor="middle" class="tagpill" fill="var(--accent)">TEST</text>
            {/if}
            {#if phase >= 2 && stationTags[i].sample}
              <rect x={x + 9} y="198" width="82" height="22" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x + 50} y="213" text-anchor="middle" class="tagpill" fill="var(--gen)">SAMPLE</text>
            {/if}
            {#if phase >= 3 && stationTags[i].real}
              <rect x={x + 16} y={stationTags[i].sample ? 226 : 198} width="68" height="22" rx="7" fill="var(--bg)" stroke="var(--fg)" />
              <text x={x + 50} y={stationTags[i].sample ? 241 : 213} text-anchor="middle" class="tagpill" fill="var(--fg)">REAL</text>
            {/if}
          {/each}
          {#if phase >= 1}
            <rect x="30" y="262" width="12" height="12" rx="4" fill="var(--accent)" />
            <text x="48" y="273" class="detail">{t('CODE TEST · every station (Step 2)', '代码测试 · 每一站（第 2 步）')}</text>
            <rect x="270" y="262" width="12" height="12" rx="4" fill="var(--gen)" />
            <text x="288" y="273" class="detail">{t('SAMPLE EVAL · recognition (Step 3)', '样本评测 · 识别（第 3 步）')}</text>
            <rect x="510" y="262" width="12" height="12" rx="4" fill="var(--fg)" />
            <text x="528" y="273" class="detail">{t('REAL · the human parts (Step 4)', '真机 · 人的部分（第 4 步）')}</text>
          {/if}
        {/if}
        {#if phase >= 4}
          <rect x={phone ? 13 : 20} y={phone ? 440 : 296} width={phone ? 274 : 680} height={phone ? 190 : 110} rx="10" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="6 5" />
          <text x={phone ? 30 : 40} y={phone ? 466 : 322} class="label" fill="var(--muted)">{t('STILL OPEN · nothing above proves these', '仍是空白 · 上面的都证明不了这些')}</text>
          {#if phone}
            <text x="30" y="496" class="detail">{t('noisy rooms and real voices', '噪声房间和真人嗓音')}</text>
            <text x="30" y="524" class="detail">{t('meetings with more than', '超过 4 个人的会议')}</text>
            <text x="30" y="544" class="detail">{t('4 speakers (Ch. 14 Step 6)', '（第 14 章第 6 步）')}</text>
            <text x="30" y="572" class="detail">{t('your Mac, your apps,', '你的 Mac、你的 app、')}</text>
            <text x="30" y="592" class="detail">{t('your way of talking', '你说话的方式')}</text>
          {:else}
            <text x="28" y="352" class="pt">·</text>
            <text x="38" y="352" class="detail">{t('noisy rooms, real voices and accents — the eval doc\'s own not-measured list', '噪声房间、真人嗓音和口音 —— 评测文档自己列的未测项')}</text>
            <text x="28" y="374" class="pt">·</text>
            <text x="38" y="374" class="detail">{t('meetings with more than 4 speakers (Ch. 14 Step 6)', '超过 4 个人的会议（第 14 章第 6 步）')}</text>
            <text x="28" y="396" class="pt">·</text>
            <text x="38" y="396" class="detail">{t('your Mac, your apps and your way of talking, together', '你的 Mac、你的 app 和你说话的方式，合在一起')}</text>
          {/if}
        {/if}
        {#if phase >= 5}
          {#if phone}
            <text x={W / 2} y="666" text-anchor="middle" class="cut">{t('code says what it does;', '代码说清了做什么；')}</text>
            <text x={W / 2} y="690" text-anchor="middle" class="cut">{t('samples say how well on them;', '样本说清了那些录音的成绩；')}</text>
            <text x={W / 2} y="714" text-anchor="middle" class="cut">{t('the open parts stay on the map', '空白留在图上')}</text>
          {:else}
            <text x={W / 2} y="452" text-anchor="middle" class="cut">{t('code says what it does · samples say how well on those recordings', '代码说清了做什么 · 样本说清了那些录音上的成绩')}</text>
            <text x={W / 2} y="478" text-anchor="middle" class="cut">{t('real-Mac checks cover the human parts — the open parts stay on the map', '真机检查覆盖人的部分 —— 空白留在图上')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: eval.md; MTDEvaluation; manual-test.md.', '出处：eval.md、MTDEvaluation、manual-test。')}</text>
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
  .boxname { font-size: 11px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 11.5px; fill: var(--fg); }
  .tagpill { font-family: var(--mono); font-size: 10.5px; font-weight: 700; }
  .blue { fill: var(--accent); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .boxname, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
    .tagpill { font-size: 10px; }
  }
</style>
