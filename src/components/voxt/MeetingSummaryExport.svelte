<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_CORRECT_BATCH_LINES,
    VOXT_CORRECT_BATCH_RUNES,
    VOXT_SUMMARY_WINDOW_MAX_RUNES,
    VOXT_SUMMARY_INTERMEDIATE_MAX_RUNES,
    VOXT_FOLLOWUP_WINDOW_MAX_RUNES,
    VOXT_FOLLOWUP_MAX_WINDOWS,
    VOXT_POST_MEETING_LINES,
    VOXT_LONG_MEETING_RUNES,
    VOXT_LONG_SUMMARY_WINDOWS,
    VOXT_LONG_FOLLOWUP_WINDOWS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'The transcript is stored. Correct and summarize run by themselves; ask and export wait for a click.',
    captionZh: '终稿存好了。纠正和总结自己跑，追问和导出等你点。',
  }, {
    caption: 'The lines go to the language model in batches. A line the answer skips keeps its recognized text.',
    captionZh: '这些行分批发给语言模型。答案里没提的行保留识别的原文。',
  }, {
    caption: 'The summary re-reads the stored transcript, 12,000 runes a window. It answers with a title, a body and to-dos.',
    captionZh: '总结重读存好的终稿，每窗 12,000 字。交回标题、正文和待办。',
  }, {
    caption: 'A question picks the windows that mention its words. The transcript outranks the summary.',
    captionZh: '提问按词挑出相关的窗。终稿比总结更算数。',
  }, {
    caption: 'Copy puts the text version on the clipboard. Save writes a .txt or .md from the same stored lines.',
    captionZh: '复制把文本版放进剪贴板。导出用同样的行写 .txt 或 .md。',
  }, {
    caption: 'Four jobs all read the same meeting row. Which of them have tests or evaluation evidence?',
    captionZh: '四个活都读同一行会议记录。哪些有测试或评测证据？',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: a stored transcript of five lines, each with a speaker tag. Two boxes appear one at a time, correct and summarize, then two more marked you click, ask and export. A chain line says transcript to correct to summary runs by itself, a failed correction still leads to a summary, and two lines list the chapter\'s six steps.',
    zh: '画面按顺序形成：一份存好的五行终稿，每行带说话人标签。两个框逐个出现：纠正、总结；再出现两个写着你点的框：追问、导出。一行链说明终稿到纠正到总结自己跑，纠正失败也照常总结，最后两行列出本章六步。',
  }, {
    en: 'The picture builds in order: the five stored lines pack into one batch, five lines and 107 runes against the limits 250 lines and 20,000 runes. The request goes out as a JSON list with the dictionary riding along, the answer fixes Preeya to Priya but leaves line 4 out, and the stored transcript changes only that one word. A last line says a failed batch keeps its lines and the rest land in one save.',
    zh: '画面按顺序形成：五行存稿打进一批，5 行、107 字对照上限 250 行、20,000 字。请求以 JSON 清单发出，词典跟着走；答案把 Preeya 改成 Priya，但漏了第 4 行；存回的终稿只改了那一个词。最后一行说失败的一批保留原文，其余批次一次存回。',
  }, {
    en: 'The picture builds in order: the summary re-reads the stored transcript as speaker and text lines, 148 runes fit one 12,000-rune window. The answer appears as a JSON object with a title, a body and one to-do, stored on the meeting row. A second panel shows the same call at full length: 100,000 runes become 9 windows, 9 short summaries, then 3, then 1.',
    zh: '画面按顺序形成：总结把存好的终稿重读成说话人加文字的行，148 字装进一个 12,000 字的窗。答案以一个 JSON 对象出现：标题、正文和一条待办，存到会议行上。第二个面板展示同一场会议的完整长度：100,000 字切成 9 个窗、9 段小总结，再合成 3 段、最后 1 段。',
  }, {
    en: 'The picture builds in order: the question who will send the file appears above a strip of the long call\'s 17 windows. The question\'s words appear, window 12 lights up as the match, and one 6,000-rune window fills the budget alone. The request carries the question, earlier answers, the summary and window 12, the transcript outranks the summary, and the answer Speaker 1 on Friday is saved to the meeting\'s chat.',
    zh: '画面按顺序形成：问题 who will send the file 出现在长会议的 17 个窗的条带上方。问题的词出现，第 12 窗作为命中亮起，一个 6,000 字的窗独自占满预算。请求带着问题、历史问答、总结和第 12 窗，终稿比总结更算数，答案 Speaker 1 周五发存进会议的问答记录。',
  }, {
    en: 'The picture builds in order: the five stored lines with a Copy and a Save button. Copy fills the clipboard with plain lines, time, name, text. Save writes Thursday plan dot txt through a file dialog. The Markdown variant appears with a title line and bold times. A last line gives the label rules and where a translated line rides.',
    zh: '画面按顺序形成：五行存稿和复制、导出两个按钮。复制把纯文本行放进剪贴板：时间、名字、文字。导出经文件对话框写出 Thursday plan.txt。Markdown 版出现：一行标题加粗体时间。最后一行给出标签规则和译文挂在哪里。',
  }, {
    en: 'The picture builds four rows one at a time: correct reads the stored lines and the dictionary and rewrites words only, summarize reads the stored transcript and writes the title, summary and to-dos, ask reads picked windows, the summary and earlier answers and appends the answer, export reads the stored lines and writes the clipboard or a file. The closing question asks which of these claims have tests or evaluation evidence.',
    zh: '画面逐行形成四行：纠正读存稿和词典、只改文字；总结读存好的终稿、写标题总结和待办；追问读挑出的窗、总结和历史问答、追加答案；导出读存稿、写剪贴板或文件。收尾问题问这些结论哪些有测试或评测证据。',
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
  const H = $derived((phone ? [760, 780, 820, 780, 740, 700] : [560, 560, 560, 560, 560, 530])[step]);
  const LP_PHONE = [716, 736, 776, 736, 696, 656];

  const PHASE_COUNTS = [6, 5, 5, 5, 5, 5];
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
    [{ x: 15, y: 64, w: 270, h: 190 }, { x: 15, y: 270, w: 270, h: 76 }, { x: 15, y: 362, w: 270, h: 76 }, { x: 15, y: 454, w: 270, h: 76 }, { x: 15, y: 546, w: 270, h: 60 }, { x: 15, y: 622, w: 270, h: 80 }],
    [{ x: 15, y: 64, w: 270, h: 180 }, { x: 15, y: 260, w: 270, h: 96 }, { x: 15, y: 372, w: 270, h: 100 }, { x: 15, y: 488, w: 270, h: 140 }, { x: 15, y: 644, w: 270, h: 76 }],
    [{ x: 15, y: 64, w: 270, h: 190 }, { x: 15, y: 270, w: 270, h: 60 }, { x: 15, y: 346, w: 270, h: 150 }, { x: 15, y: 512, w: 270, h: 160 }, { x: 15, y: 688, w: 270, h: 70 }],
    [{ x: 15, y: 64, w: 270, h: 130 }, { x: 15, y: 210, w: 270, h: 110 }, { x: 15, y: 336, w: 270, h: 76 }, { x: 15, y: 428, w: 270, h: 150 }, { x: 15, y: 594, w: 270, h: 120 }],
    [{ x: 15, y: 64, w: 270, h: 180 }, { x: 15, y: 260, w: 270, h: 160 }, { x: 15, y: 436, w: 270, h: 70 }, { x: 15, y: 522, w: 270, h: 110 }, { x: 15, y: 648, w: 270, h: 60 }],
    [{ x: 15, y: 64, w: 270, h: 120 }, { x: 15, y: 200, w: 270, h: 100 }, { x: 15, y: 316, w: 270, h: 100 }, { x: 15, y: 432, w: 270, h: 100 }, { x: 15, y: 556, w: 270, h: 80 }],
  ] : [
    [{ x: 20, y: 70, w: 680, h: 176 }, { x: 20, y: 266, w: 320, h: 76 }, { x: 380, y: 266, w: 320, h: 76 }, { x: 20, y: 362, w: 680, h: 66 }, { x: 20, y: 448, w: 680, h: 50 }, { x: 20, y: 496, w: 680, h: 38 }],
    [{ x: 20, y: 70, w: 680, h: 150 }, { x: 20, y: 236, w: 680, h: 76 }, { x: 20, y: 328, w: 680, h: 72 }, { x: 20, y: 416, w: 680, h: 100 }, { x: 20, y: 416, w: 680, h: 118 }],
    [{ x: 20, y: 70, w: 680, h: 146 }, { x: 160, y: 222, w: 400, h: 30 }, { x: 20, y: 254, w: 680, h: 110 }, { x: 20, y: 378, w: 680, h: 110 }, { x: 20, y: 378, w: 680, h: 146 }],
    [{ x: 20, y: 70, w: 680, h: 110 }, { x: 20, y: 196, w: 680, h: 96 }, { x: 160, y: 302, w: 400, h: 56 }, { x: 20, y: 356, w: 680, h: 104 }, { x: 20, y: 472, w: 680, h: 44 }],
    [{ x: 20, y: 70, w: 680, h: 140 }, { x: 20, y: 222, w: 680, h: 136 }, { x: 20, y: 372, w: 680, h: 50 }, { x: 20, y: 436, w: 680, h: 60 }, { x: 20, y: 502, w: 680, h: 26 }],
    [{ x: 20, y: 70, w: 680, h: 84 }, { x: 20, y: 174, w: 680, h: 76 }, { x: 20, y: 270, w: 680, h: 76 }, { x: 20, y: 366, w: 680, h: 76 }, { x: 20, y: 462, w: 680, h: 40 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  // The constructed stored meeting: five lines, two speakers (src/voxt/numbers.ts).
  const meet = [
    { span: '00:05', sp: 'me', raw: 'can Preeya join Thursday', fixed: 'can Priya join Thursday' },
    { span: '00:40', sp: 's1', raw: 'she reviews the budget first', fixed: 'she reviews the budget first' },
    { span: '01:10', sp: 's1', raw: 'then we send the file', fixed: 'then we send the file' },
    { span: '01:55', sp: 'me', raw: 'sounds right', fixed: 'sounds right' },
    { span: '02:30', sp: 's1', raw: 'I will send it Friday', fixed: 'I will send it Friday' },
  ];
  const spName = (sp: string) => (sp === 'me' ? 'Me' : 'Speaker 1');
  const spColor = (sp: string) => (sp === 'me' ? 'var(--muted)' : 'var(--gen)');
  const spSoft = (sp: string) => (sp === 'me' ? 'var(--bg)' : 'var(--gen-soft)');
  // The batch counts text runes only; the summary's record adds labels and newlines.
  const textRunes = meet.reduce((n, l) => n + [...l.raw].length, 0);
  const recordLines = meet.map((l) => `${spName(l.sp)}：${l.fixed}`);
  const recordRunes = recordLines.reduce((n, l) => n + [...l].length, 0) + recordLines.length - 1;
  const summaryChain = [
    `${(VOXT_LONG_MEETING_RUNES / 1000).toFixed(0)},000 ${t('runes', '字')}`,
    `${VOXT_LONG_SUMMARY_WINDOWS} ${t('windows', '个窗')}`,
    `${VOXT_LONG_SUMMARY_WINDOWS} ${t('short summaries', '段小总结')}`,
    '3 → 1',
  ];
  const followWindows = Array.from({ length: VOXT_LONG_FOLLOWUP_WINDOWS }, (_, i) => i + 1);
  const HIT_WINDOW = 12;
  const jobRows = [
    { job: t('correct', '纠正'), reads: t('stored lines + your dictionary', '存稿 + 你的词典'), writes: t('rewrites words only — times, speakers, order stay', '只改文字 —— 时间、说话人、顺序不动') },
    { job: t('summarize', '总结'), reads: t('the stored transcript, corrected or not', '存好的终稿，无论纠正成没成功'), writes: t('title + summary + to-dos', '标题 + 总结 + 待办') },
    { job: t('ask', '追问'), reads: t('picked windows + summary + earlier Q&A', '挑出的窗 + 总结 + 历史问答'), writes: t('appends the answer to the chat', '把答案追加进问答记录') },
    { job: t('export', '导出'), reads: t('the stored lines', '存好的行'), writes: t('the clipboard or a file', '剪贴板或文件') },
  ];
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="se-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('AFTER THE MEETING · THE CHAIN', '散会之后 · 一条链')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('chain = jobs that run one after another', '链 = 一个接一个跑的活')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="176" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="96" class="label">{t('THE STORED TRANSCRIPT · every line has a name (Ch. 14)', '存好的终稿 · 每行都有名字（第 14 章）')}</text>
          {#each meet as line, i}
            <text x="40" y={124 + i * 23} class="mono">{line.span} · {line.raw}</text>
            <rect x="596" y={111 + i * 23} width={line.sp === 'me' ? 40 : 84} height="19" rx="6" fill={spSoft(line.sp)} stroke={spColor(line.sp)} />
            <text x={line.sp === 'me' ? 616 : 638} y={125 + i * 23} text-anchor="middle" class="tagpill" fill={spColor(line.sp)}>{spName(line.sp)}</text>
          {/each}
          {#if phase >= 1}
            <rect x="20" y="266" width="320" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="296" class="label blue">{t('CORRECT · runs by itself', '纠正 · 自己跑')}</text>
            <text x="40" y="322" class="detail">{t('fixes misheard words', '修听错的词')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="380" y="266" width="320" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="400" y="296" class="label blue">{t('SUMMARIZE · runs by itself', '总结 · 自己跑')}</text>
            <text x="400" y="322" class="detail">{t('writes a title and to-dos', '写标题和待办')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="362" width="320" height="66" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="390" class="label">{t('ASK · you click', '追问 · 你点')}</text>
            <text x="40" y="412" class="detail">{t('questions about the meeting', '问这场会议的问题')}</text>
            <rect x="380" y="362" width="320" height="66" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="400" y="390" class="label">{t('EXPORT · you click', '导出 · 你点')}</text>
            <text x="400" y="412" class="detail">{t('clipboard or file', '剪贴板或文件')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="472" text-anchor="middle" class="formula">{t('transcript → correct → summary · runs by itself', '终稿 → 纠正 → 总结 · 自己跑')}</text>
            <text x={W / 2} y="494" text-anchor="middle" class="detail">{t('a failed correction still leads to a summary — it reads the recognized text', '纠正失败也照常总结 —— 那时读的是识别的原文')}</text>
          {/if}
          {#if phase >= 5}
            <text x="28" y="510" class="pt">·</text>
            <text x="38" y="510" class="detail">{t('a switch in settings turns the auto chain off', '设置里有个开关能关掉这条自动链')}</text>
            <text x="28" y="530" class="pt">·</text>
            <text x="38" y="530" class="detail">{t('this chapter: the chain (1) · correct (2) · summarize (3) · ask (4) · export (5) · the evidence question (6)', '本章：链（1）· 纠正（2）· 总结（3）· 追问（4）· 导出（5）· 证据之问（6）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/manager_finalize.go; settings/meeting.go.', '出处：internal/meeting/manager_finalize.go；settings/meeting.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="190" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('STORED TRANSCRIPT (Ch. 14)', '存好的终稿（第 14 章）')}</text>
          {#each meet as line, i}
            <text x="30" y={114 + i * 26} class="mono">{line.span} · {line.raw.length > 17 ? line.raw.slice(0, 16) + '…' : line.raw}</text>
            <text x="270" y={114 + i * 26} text-anchor="end" class="tagpill" fill={spColor(line.sp)}>{spName(line.sp)}</text>
          {/each}
          {#if phase >= 1}
            <rect x="15" y="270" width="270" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="298" class="label blue">{t('CORRECT · runs by itself', '纠正 · 自己跑')}</text>
            <text x="30" y="322" class="detail">{t('fixes misheard words', '修听错的词')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="362" width="270" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="390" class="label blue">{t('SUMMARIZE · runs by itself', '总结 · 自己跑')}</text>
            <text x="30" y="414" class="detail">{t('writes a title and to-dos', '写标题和待办')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="454" width="128" height="76" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="482" class="label">{t('ASK', '追问')}</text>
            <text x="30" y="506" class="detail">{t('you click', '你点')}</text>
            <rect x="157" y="454" width="128" height="76" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="172" y="482" class="label">{t('EXPORT', '导出')}</text>
            <text x="172" y="506" class="detail">{t('you click', '你点')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="562" text-anchor="middle" class="formula">{t('transcript → correct → summary', '终稿 → 纠正 → 总结')}</text>
            <text x={W / 2} y="586" text-anchor="middle" class="detail">{t('a failed correction still leads to a summary', '纠正失败也照常总结')}</text>
            <text x={W / 2} y="606" text-anchor="middle" class="detail">{t('— it reads the recognized text', '—— 那时读的是识别原文')}</text>
          {/if}
          {#if phase >= 5}
            <text x="20" y="648" class="pt">·</text>
            <text x="30" y="648" class="detail">{t('a switch turns the auto chain off', '有个开关能关掉自动链')}</text>
            <text x="20" y="674" class="pt">·</text>
            <text x="30" y="674" class="detail">{t('the chain (1) · correct (2) · summarize (3)', '链（1）· 纠正（2）· 总结（3）')}</text>
            <text x="30" y="694" class="detail">{t('ask (4) · export (5) · evidence (6)', '追问（4）· 导出（5）· 证据（6）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: manager_finalize.go.', '出处：manager_finalize.go。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('CORRECT · IN BATCHES', '纠正 · 分批')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('batch = the lines one request carries', '一批 = 一个请求装的行')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="150" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="94" class="label">{t('THE STORED TRANSCRIPT (constructed)', '存好的终稿（构造例）')}</text>
          {#each meet as line, i}
            <text x="40" y={118 + i * 20} class="mono">{line.span} · {spName(line.sp)} · {line.raw}</text>
          {/each}
          {#if phase >= 1}
            <rect x="20" y="236" width="680" height="76" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="262" class="label">{t('ONE BATCH HOLDS', '一批的上限')}</text>
            <text x="40" y="290" class="formula">{VOXT_POST_MEETING_LINES} ≤ {VOXT_CORRECT_BATCH_LINES} {t('lines', '行')} · {textRunes} ≤ {(VOXT_CORRECT_BATCH_RUNES / 1000).toFixed(0)},000 {t('runes', '字')} → 1 {t('request', '个请求')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="328" width="680" height="72" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="352" class="label blue">{t('THE REQUEST · ONE JSON LIST', '请求 · 一串 JSON')}</text>
            <text x="40" y="376" class="mono">{'[{"i":1,"text":"can Preeya join Thursday"}, …]'}</text>
            <text x="680" y="394" text-anchor="end" class="detail">{t('your dictionary rides along (Ch. 8): Preeya → Priya', '你的词典跟着走（第 8 章）：Preeya → Priya')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="416" width="680" height="100" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="40" y="440" class="label">{t('THE ANSWER → STORED', '答案 → 存回')}</text>
            <text x="40" y="464" class="mono">i:1 · can <tspan font-weight="700" fill="var(--gen)">Priya</tspan> join Thursday · {t('fixed', '改好了')}</text>
            <text x="40" y="486" class="mono">i:4 · {t('missing from the answer → stays as recognized', '答案里没提 → 保留识别的原文')}</text>
            <text x="40" y="508" class="detail">{t('times, speakers and order never change — only words', '时间、说话人、顺序都不动 —— 只改文字')}</text>
          {/if}
          {#if phase >= 4}
            <text x="38" y="532" class="detail">{t('a failed batch keeps its lines; the rest land in one save (Ch. 6\'s per-part fallback)', '失败的一批保留原文，其余批次一次存回（第 6 章的逐段兜底）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/correct.go (CorrectTranscript).', '出处：internal/meeting/correct.go（CorrectTranscript）。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="180" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('STORED TRANSCRIPT', '存好的终稿')}</text>
          {#each meet as line, i}
            <text x="30" y={114 + i * 25} class="mono">{line.span} · {line.raw.length > 24 ? line.raw.slice(0, 23) + '…' : line.raw}</text>
          {/each}
          {#if phase >= 1}
            <rect x="15" y="260" width="270" height="96" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="284" class="label">{t('ONE BATCH HOLDS', '一批的上限')}</text>
            <text x="30" y="310" class="formula">{VOXT_POST_MEETING_LINES} ≤ {VOXT_CORRECT_BATCH_LINES} {t('lines', '行')}</text>
            <text x="30" y="334" class="formula">{textRunes} ≤ {(VOXT_CORRECT_BATCH_RUNES / 1000).toFixed(0)},000 {t('runes → 1 request', '字 → 1 个请求')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="372" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="396" class="label blue">{t('THE REQUEST · JSON', '请求 · JSON')}</text>
            <text x="30" y="420" class="mono">{'[{"i":1,"text":"can Preeya…"}'}</text>
            <text x="30" y="446" class="detail">{t('dictionary rides along (Ch. 8):', '词典跟着走（第 8 章）：')}</text>
            <text x="30" y="464" class="detail">Preeya → Priya</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="488" width="270" height="140" rx="10" fill="var(--bg)" stroke="var(--gen)" stroke-width="1.5" />
            <text x="30" y="512" class="label">{t('THE ANSWER → STORED', '答案 → 存回')}</text>
            <text x="30" y="536" class="mono">i:1 · can Priya… · {t('fixed', '改好了')}</text>
            <text x="30" y="560" class="mono">i:4 · {t('missing → stays', '没提 → 保留')}</text>
            <text x="30" y="590" class="detail">{t('times, speakers and order', '时间、说话人、顺序')}</text>
            <text x="30" y="610" class="detail">{t('never change — only words', '都不动 —— 只改文字')}</text>
          {/if}
          {#if phase >= 4}
            <text x="30" y="664" class="detail">{t('a failed batch keeps its lines;', '失败的一批保留原文；')}</text>
            <text x="30" y="684" class="detail">{t('the rest land in one save (Ch. 6)', '其余一次存回（第 6 章）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: correct.go.', '出处：correct.go。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('SUMMARIZE · WHAT IT READS', '总结 · 它读什么')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('window = one chunk the model reads at a time', '窗 = 模型一次读的一段')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="146" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="92" class="label">{t('THE SUMMARY RE-READS THE STORE', '总结重读存好的终稿')}</text>
          {#each recordLines as line, i}
            <text x="40" y={116 + i * 20} class="mono">{line}</text>
          {/each}
          <text x="680" y="210" text-anchor="end" class="detail">{t('corrected text if correction landed, recognized if it failed', '纠正成功读改好的，失败读识别的')}</text>
          {#if phase >= 1}
            <text x={W / 2} y="240" text-anchor="middle" class="formula">{recordRunes} ≤ {(VOXT_SUMMARY_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 {t('runes → 1 window', '字 → 1 个窗')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="254" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="278" class="label blue">{t('THE ANSWER · ONE JSON OBJECT', '答案 · 一个 JSON 对象')}</text>
            <text x="40" y="302" class="mono">title · "Thursday plan"</text>
            <text x="40" y="324" class="mono">content · "Priya joins Thursday; budget first, then the file…"</text>
            <text x="40" y="346" class="mono">todo_list · ["Speaker 1 sends the file Friday"]</text>
            <text x="680" y="360" text-anchor="end" class="detail">{t('stored on the meeting row: title + summary', '存到会议行上：标题 + 总结')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="378" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="402" class="label">{t('THE SAME CALL AT FULL LENGTH ≈ three hours (constructed)', '同一场会议的完整长度 ≈ 三小时（构造例）')}</text>
            {#each summaryChain as node, i}
              <rect x={40 + i * 168} y="418" width="148" height="32" rx="8" fill="var(--bg)" stroke="var(--fg)" />
              <text x={114 + i * 168} y="439" text-anchor="middle" class="detail">{node}</text>
              {#if i < summaryChain.length - 1}
                <line x1={188 + i * 168} y1="434" x2={206 + i * 168} y2="434" stroke="var(--muted)" stroke-width="2" marker-end="url(#se-arrow)" />
              {/if}
            {/each}
            <text x="40" y="476" class="detail">{t(`every round: each window summarized, each answer cut to ${(VOXT_SUMMARY_INTERMEDIATE_MAX_RUNES / 1000).toFixed(0)},000 runes, then grouped again`, `每一轮：每窗各总结一次，答案裁到 ${(VOXT_SUMMARY_INTERMEDIATE_MAX_RUNES / 1000).toFixed(0)},000 字，再分组往下`)}</text>
          {/if}
          {#if phase >= 4}
            <text x="38" y="506" class="detail">{t('the summary is written in your main language', '总结用你的主要语言写')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/manager_summary.go, summary.go.', '出处：internal/meeting/manager_summary.go、summary.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="190" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('THE SUMMARY RE-READS THE STORE', '总结重读存好的终稿')}</text>
          {#each recordLines as line, i}
            <text x="30" y={114 + i * 25} class="mono">{line.length > 26 ? line.slice(0, 25) + '…' : line}</text>
          {/each}
          <text x="30" y="248" class="detail">{t('corrected if it landed,', '纠正成功读改好的，')}</text>
          <text x="30" y="266" class="detail">{t('recognized if it failed', '失败读识别的')}</text>
          {#if phase >= 1}
            <text x={W / 2} y="306" text-anchor="middle" class="formula">{recordRunes} ≤ {(VOXT_SUMMARY_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 {t('runes → 1 window', '字 → 1 个窗')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="346" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="372" class="label blue">{t('THE ANSWER · JSON', '答案 · JSON')}</text>
            <text x="30" y="398" class="mono">title · "Thursday plan"</text>
            <text x="30" y="422" class="mono">content · "Priya joins…"</text>
            <text x="30" y="446" class="mono">todo_list · ["Speaker 1…"]</text>
            <text x="30" y="474" class="detail">{t('stored: title + summary', '存回：标题 + 总结')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="512" width="270" height="160" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="536" class="label">{t('THE FULL-LENGTH CALL', '完整长度的会议')}</text>
            <text x="30" y="562" class="detail">{(VOXT_LONG_MEETING_RUNES / 1000).toFixed(0)},000 {t('runes (constructed)', '字（构造例）')}</text>
            <text x="30" y="592" class="formula">9 {t('windows', '个窗')} → 9 {t('short', '段小总结')}</text>
            <text x="30" y="616" class="formula">→ 3 → 1</text>
            <text x="30" y="646" class="detail">{t(`each answer cut to ${(VOXT_SUMMARY_INTERMEDIATE_MAX_RUNES / 1000).toFixed(0)},000 runes`, `每段答案裁到 ${(VOXT_SUMMARY_INTERMEDIATE_MAX_RUNES / 1000).toFixed(0)},000 字`)}</text>
          {/if}
          {#if phase >= 4}
            <text x="30" y="714" class="detail">{t('written in your main language', '用你的主要语言写')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: manager_summary.go, summary.go.', '出处：manager_summary.go、summary.go。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ASK · PICKING WINDOWS', '追问 · 挑窗')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('context = what the model gets to read', '上下文 = 给模型读的内容')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="94" class="label">{t('THE FULL-LENGTH CALL · 17 WINDOWS (constructed)', '完整会议 · 17 个窗（构造例）')}</text>
          {#each followWindows as w}
            <rect x={40 + (w - 1) * 37} y="108" width="30" height="26" rx="5"
              fill={phase >= 2 && w === HIT_WINDOW ? 'var(--gen-soft)' : 'var(--bg)'}
              stroke={phase >= 1 && w === HIT_WINDOW ? 'var(--gen)' : 'var(--line)'}
              stroke-width={phase >= 1 && w === HIT_WINDOW ? 2 : 1} />
            <text x={55 + (w - 1) * 37} y="126" text-anchor="middle" class="tag">{w}</text>
          {/each}
          <text x="40" y="162" class="detail">{t(`one window = up to ${(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 runes of transcript`, `一个窗 = 最多 ${(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 字终稿`)}</text>
          {#if phase >= 1}
            <rect x="20" y="196" width="680" height="96" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="220" class="label">{t('THE QUESTION', '问题')}</text>
            <text x="40" y="246" class="mono">"who will send the file?"</text>
            <text x="40" y="274" class="detail">{t('its words: who · will · send · the · file → window 12 mentions “send” and “file”', '问题的词：who · will · send · the · file → 第 12 窗提到 send 和 file')}</text>
          {/if}
          {#if phase >= 2}
            <text x={W / 2} y="322" text-anchor="middle" class="formula">{(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 ≤ {(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 {t('runes · one window fills the budget', '字 · 一个窗就占满预算')}</text>
            <text x={W / 2} y="346" text-anchor="middle" class="detail">{t(`at most ${VOXT_FOLLOWUP_MAX_WINDOWS} windows are picked`, `最多挑 ${VOXT_FOLLOWUP_MAX_WINDOWS} 个窗`)}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="356" width="680" height="104" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="382" class="label blue">{t('THE REQUEST CARRIES', '请求带着')}</text>
            <text x="40" y="408" class="detail">{t('the question · your earlier Q&A · the summary · window 12', '问题 · 历史问答 · 总结 · 第 12 窗')}</text>
            <text x="40" y="436" class="cut">{t('the transcript outranks the summary', '终稿比总结更算数')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="486" class="pt">·</text>
            <text x="38" y="486" class="detail">{t('the answer “Speaker 1, on Friday” is saved to the meeting\'s chat', '答案「Speaker 1，周五发」存进会议的问答记录')}</text>
            <text x="28" y="508" class="pt">·</text>
            <text x="38" y="508" class="detail">{t('a whole-meeting question takes the first + last window; no mention → it says so', '问整场的问题取第一窗加最后一窗；终稿没提就直说没提')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: internal/meeting/followup.go; manager_followup.go.', '出处：internal/meeting/followup.go；manager_followup.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('17 WINDOWS (constructed)', '17 个窗（构造例）')}</text>
          {#each followWindows as w}
            <rect x={30 + ((w - 1) % 9) * 27} y={104 + Math.floor((w - 1) / 9) * 34} width="22" height="24" rx="5"
              fill={phase >= 2 && w === HIT_WINDOW ? 'var(--gen-soft)' : 'var(--bg)'}
              stroke={phase >= 1 && w === HIT_WINDOW ? 'var(--gen)' : 'var(--line)'}
              stroke-width={phase >= 1 && w === HIT_WINDOW ? 2 : 1} />
            <text x={41 + ((w - 1) % 9) * 27} y={121 + Math.floor((w - 1) / 9) * 34} text-anchor="middle" class="tag">{w}</text>
          {/each}
          <text x="30" y="182" class="detail">{t(`one window ≤ ${(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 runes`, `一个窗 ≤ ${(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 字`)}</text>
          {#if phase >= 1}
            <rect x="15" y="210" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="234" class="label">{t('THE QUESTION', '问题')}</text>
            <text x="30" y="260" class="mono">"who will send the file?"</text>
            <text x="30" y="288" class="detail">{t('window 12 mentions', '第 12 窗提到')}</text>
            <text x="30" y="308" class="detail">{t('“send” and “file”', 'send 和 file')}</text>
          {/if}
          {#if phase >= 2}
            <text x={W / 2} y="362" text-anchor="middle" class="formula">{(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 ≤ {(VOXT_FOLLOWUP_WINDOW_MAX_RUNES / 1000).toFixed(0)},000 {t('runes', '字')}</text>
            <text x={W / 2} y="386" text-anchor="middle" class="detail">{t('one window fills the budget', '一个窗就占满预算')}</text>
            <text x={W / 2} y="406" text-anchor="middle" class="detail">{t(`at most ${VOXT_FOLLOWUP_MAX_WINDOWS} picked`, `最多挑 ${VOXT_FOLLOWUP_MAX_WINDOWS} 个`)}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="428" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="454" class="label blue">{t('THE REQUEST CARRIES', '请求带着')}</text>
            <text x="30" y="480" class="detail">{t('the question · earlier Q&A', '问题 · 历史问答')}</text>
            <text x="30" y="500" class="detail">{t('the summary · window 12', '总结 · 第 12 窗')}</text>
            <text x="30" y="532" class="cut">{t('the transcript outranks', '终稿比总结')}</text>
            <text x="30" y="552" class="cut">{t('the summary', '更算数')}</text>
          {/if}
          {#if phase >= 4}
            <text x="20" y="618" class="pt">·</text>
            <text x="30" y="618" class="detail">{t('the answer is saved to', '答案存进会议的')}</text>
            <text x="30" y="638" class="detail">{t('the meeting\'s chat', '问答记录')}</text>
            <text x="20" y="664" class="pt">·</text>
            <text x="30" y="664" class="detail">{t('whole-meeting question:', '问整场的问题：')}</text>
            <text x="30" y="684" class="detail">{t('first + last window', '取第一窗加最后一窗')}</text>
            <text x="30" y="704" class="detail">{t('no mention → it says so', '终稿没提就直说')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Source: followup.go.', '出处：followup.go。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('EXPORT · TXT OR MARKDOWN', '导出 · TXT 或 Markdown')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('export = taking the transcript out of the app', '导出 = 把终稿拿出 app')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="140" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="94" class="label">{t('THE STORED LINES · TWO BUTTONS', '存好的行 · 两个按钮')}</text>
          <text x="40" y="120" class="mono">00:05 · Me · can Priya join Thursday</text>
          <text x="40" y="142" class="mono">00:40 · Speaker 1 · she reviews the budget first · +3 {t('more', '行')}</text>
          <rect x="480" y="108" width="90" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="525" y="128" text-anchor="middle" class="detail">{t('Copy', '复制')}</text>
          <rect x="586" y="108" width="94" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="633" y="128" text-anchor="middle" class="detail">{t('Save…', '导出…')}</text>
          <text x="40" y="184" class="detail">{t('both read the same stored lines', '两个按钮读同样的存稿行')}</text>
          {#if phase >= 1}
            <rect x="20" y="222" width="680" height="136" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="40" y="248" class="label blue">{t('COPY → THE CLIPBOARD · PLAIN TEXT', '复制 → 剪贴板 · 纯文本')}</text>
            <text x="40" y="274" class="mono">00:05 Me can Priya join Thursday</text>
            <text x="40" y="296" class="mono">00:40 Speaker 1 she reviews the budget first</text>
            <text x="40" y="318" class="mono">01:10 Speaker 1 then we send the file</text>
            <text x="40" y="344" class="detail">{t('time · name · text, one line each', '时间 · 名字 · 文字，一行一条')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="372" width="680" height="50" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="402" class="detail">{t('SAVE… → a file dialog writes', '导出… → 文件对话框写出')}</text>
            <text x="680" y="402" text-anchor="end" class="mono">Thursday plan.txt</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="436" width="680" height="60" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="40" y="462" class="label">{t('THE .md VARIANT · marks like # and **', 'Markdown 版 · 用 # 和 ** 做记号')}</text>
            <text x="40" y="486" class="mono"># Thursday plan · **00:05** Me can Priya join Thursday</text>
          {/if}
          {#if phase >= 4}
            <text x="38" y="516" class="detail">{t('labels: me → Me · s1 → Speaker 1 · a translated line rides as -> (txt) or > (md)', '标签：me → Me · s1 → Speaker 1 · 译文挂成 ->（txt）或 >（md）')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/export.go; Voxt/meetings_detail_controller.go.', '出处：internal/meeting/export.go；Voxt/meetings_detail_controller.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="180" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="88" class="label">{t('THE STORED LINES', '存好的行')}</text>
          <text x="30" y="114" class="mono">00:05 · Me · can Priya…</text>
          <text x="30" y="138" class="mono">00:40 · Speaker 1 · she…</text>
          <rect x="30" y="162" width="100" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="80" y="182" text-anchor="middle" class="detail">{t('Copy', '复制')}</text>
          <rect x="170" y="162" width="100" height="30" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="220" y="182" text-anchor="middle" class="detail">{t('Save…', '导出…')}</text>
          <text x="30" y="226" class="detail">{t('both read the same lines', '两个按钮读同样的行')}</text>
          {#if phase >= 1}
            <rect x="15" y="260" width="270" height="160" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="30" y="286" class="label blue">{t('COPY → CLIPBOARD', '复制 → 剪贴板')}</text>
            <text x="30" y="312" class="mono">00:05 Me can Priya…</text>
            <text x="30" y="336" class="mono">00:40 Speaker 1 she…</text>
            <text x="30" y="360" class="mono">01:10 Speaker 1 then…</text>
            <text x="30" y="392" class="detail">{t('time · name · text', '时间 · 名字 · 文字')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="436" width="270" height="70" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="462" class="detail">{t('SAVE… writes', '导出… 写出')}</text>
            <text x="30" y="488" class="mono">Thursday plan.txt</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="522" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y="548" class="label">{t('THE .md VARIANT', 'Markdown 版')}</text>
            <text x="30" y="574" class="mono"># Thursday plan</text>
            <text x="30" y="598" class="mono">**00:05** Me can Priya…</text>
          {/if}
          {#if phase >= 4}
            <text x="30" y="672" class="detail">{t('me → Me · s1 → Speaker 1', 'me → Me · s1 → Speaker 1')}</text>
            <text x="30" y="692" class="detail">{t('a translation rides as -> or >', '译文挂成 -> 或 >')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: export.go.', '出处：export.go。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE MEETING ROW · FOUR JOBS', '一行会议记录 · 四个活')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('the meeting row = one meeting\'s stored record', '会议记录行 = 一场会议存下的那条记录')}</text>
        {#if !phone}
          {#each jobRows as row, i}
            {#if phase >= i}
              <rect x="20" y={70 + i * 100} width="680" height="84" rx="10" fill="var(--bg)" stroke={phase === i ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === i ? 1.5 : 1} />
              <text x="40" y={102 + i * 100} class="label">{row.job}</text>
              <text x="40" y={128 + i * 100} class="detail">{t('reads', '读')} · {row.reads}</text>
              <text x="40" y={148 + i * 100} class="detail">{t('writes', '写')} · {row.writes}</text>
            {/if}
          {/each}
          {#if phase >= 4}
            <text x={W / 2} y="490" text-anchor="middle" class="cut">{t('The chain is done — which of these claims have tests or evaluation evidence?', '功能链走完了 —— 哪些结论有测试或评测证据？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/meeting/correct.go, summary.go, followup.go, export.go.', '出处：internal/meeting/correct.go、summary.go、followup.go、export.go。')}</text>
        {:else}
          {#each jobRows as row, i}
            {#if phase >= i}
              <rect x="15" y={64 + i * 116} width="270" height="100" rx="10" fill="var(--bg)" stroke={phase === i ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === i ? 1.5 : 1} />
              <text x="30" y={92 + i * 116} class="label">{row.job}</text>
              <text x="30" y={118 + i * 116} class="detail">{t('reads', '读')} · {row.reads.length > 30 ? row.reads.slice(0, 29) + '…' : row.reads}</text>
              <text x="30" y={142 + i * 116} class="detail">{t('writes', '写')} · {row.writes.length > 28 ? row.writes.slice(0, 27) + '…' : row.writes}</text>
            {/if}
          {/each}
          {#if phase >= 4}
            <text x={W / 2} y="584" text-anchor="middle" class="cut">{t('The chain is done —', '功能链走完了 ——')}</text>
            <text x={W / 2} y="608" text-anchor="middle" class="cut">{t('which claims have tests', '哪些结论有测试')}</text>
            <text x={W / 2} y="632" text-anchor="middle" class="cut">{t('or evaluation evidence?', '或评测证据？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: correct.go, summary.go,', '出处：correct.go、summary.go、')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('followup.go, export.go.', 'followup.go、export.go。')}</text>
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
