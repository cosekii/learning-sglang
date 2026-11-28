<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_HISTORY_KEEP_DAYS, VOXT_RETRY_KEEP_DAYS, VOXT_RETRY_KEEP_HOURS, VOXT_HISTORY_SHORTER_DAYS,
    VOXT_HISTORY_DEMO_PER_DAY, VOXT_HISTORY_DEMO_ROWS,
    VOXT_HISTORY_TODAY, VOXT_HISTORY_CUTOFF, VOXT_HISTORY_OLD_DATE, VOXT_HISTORY_KEPT_DATE,
    VOXT_HISTORY_OLD_DAYS, VOXT_HISTORY_KEPT_DAYS,
    VOXT_HISTORY_COUNT_EXAMPLE, VOXT_HISTORY_COUNT_ROWS, VOXT_HISTORY_COUNT_DELETED,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'One finished dictation leaves one history row with its text and app. It may also keep the recording.',
    captionZh: '一次听写留一条历史记录，里面有文字和应用。可能还带一段录音。',
  }, {
    caption: 'The history row expires at 90 days. A failed or cancelled recording has its own 7-day clock.',
    captionZh: '历史记录 90 天后到期。失败或取消的录音另有 7 天的钟。',
  }, {
    caption: 'By default, entries older than 90 days are deleted with their recordings.',
    captionZh: '默认清理会删掉超过 90 天的记录，连同录音。',
  }, {
    caption: 'The same cleanup keeps at most N entries of each kind. Zero means no limit.',
    captionZh: '清理还给每种功能留最多 N 条。设 0 就是不限。',
  }, {
    caption: 'A failed or cancelled recognition keeps its recording 7 days when recordings are off. With recordings on, it lasts as long as the row.',
    captionZh: '保存录音关着时，失败或取消的录音留 7 天。开着时跟着记录走。',
  }, {
    caption: 'Retry reads that recording, recognizes it again, and runs the current settings. It updates the same row and inserts nothing.',
    captionZh: '重试读那段录音，重新识别，再用现在的设置跑一遍。它改同一条记录，不插入文字。',
  }, {
    caption: 'The JSONL export writes one object a line. Each object keeps the row’s fields.',
    captionZh: 'JSONL 导出每行一个对象。每个对象保留记录里的字段。',
  }, {
    caption: 'The Markdown export groups rows by day. Each line has time, app and text.',
    captionZh: 'Markdown 导出按天分组。每行只有时间、应用和文字。',
  }, {
    caption: 'The access switch opens one logged command. Programs running as you can still open the database directly.',
    captionZh: '访问开关只开一条会记账的命令。你账户里的程序仍能直接打开数据库。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: an empty history-row box appears, then its kind and app fields fill in, then the final text, then the recording field with audio.wav, and finally the count of ten dictations a day times ninety days making nine hundred rows and a dashed no-clock box.',
    zh: '画面按顺序形成：先出现空的历史记录框，再填入功能和应用字段，再填入最后的文字，再出现 audio.wav 录音字段，最后出现一天 10 次乘 90 天等于 900 条的算式和还没有钟的虚线框。',
  }, {
    en: 'The picture builds in order: the history-row ruler with its shortcut start and day-90 end appears, its blue bar fills, then the retry-recording ruler appears on the same scale, its short orange 7-day bar fills with an expiry tick and a dashed remainder, the 83-day difference appears, and finally the box explaining when a retry recording exists.',
    zh: '画面按顺序形成：先出现历史记录的尺，标出快捷键起点和第 90 天终点，蓝色条填满；再出现同一把尺上的重试录音，橙色 7 天短条填满并标出到期刻度和虚线剩余，出现短 83 天的一行，最后出现说明重试录音什么时候才存在的框。',
  }, {
    en: 'The picture builds in order: the formula today minus ninety days gives the cutoff, the cutoff line and the older and newer rows appear, then the older row is covered and struck out with a removed arrow while the newer row stays, and finally the lines about the moving cutoff, when the cleanup runs and the keep-day choices.',
    zh: '画面按顺序形成：先出现今天减 90 天等于分界线的算式，分界线和更早、更晚两条记录出现；随后更早那条被盖住并划掉、出现被清掉的箭头，更晚那条留下；最后出现分界线跟着今天走、清理什么时候跑和保留天数的几行。',
  }, {
    en: 'The picture builds in order: the transcribe box with its full 102-row bar appears, the bar then splits into a blue keep-newest-100 part and a red delete-2 part with the arithmetic 102 minus 100 equals 2, then the translate and rewrite boxes with the same rule, and finally the choices for N and the line that age and count run together.',
    zh: '画面按顺序形成：先出现听写框和完整的 102 条长条，长条随后分成蓝色的留最新 100 条和红色的删 2 条，出现 102 减 100 等于 2 的算式；再出现同样规则的翻译和改写框；最后出现 N 的选项和年龄条数一起生效的一行。',
  }, {
    en: 'The picture builds in order: the failed-dictation card with audio.wav appears, then the 90-day history-row ruler, then the 7-day retry-recording ruler with its expiry tick, the 168-hour clock and hourly sweep lines, and finally the strike through audio.wav for a successful retry with the lines about recordings on and what the copy is for.',
    zh: '画面按顺序形成：先出现带 audio.wav 的失败听写卡，再出现 90 天的历史记录尺，再出现 7 天的重试录音尺和到期刻度，随后是 168 小时的钟和每小时清扫两行，最后 audio.wav 被划掉表示重试成功马上删，并出现保存录音开着和这份副本干什么用的几行。',
  }, {
    en: 'The picture builds in order: the history-row box with its old text appears, then read the file, recognize and run the settings boxes arrive one at a time with their arrows, then the update-the-same-row box shows the old text struck through, the new text flies in to replace it, and the lines about inserting nothing appear.',
    zh: '画面按顺序形成：先出现装着旧文字的历史记录框，读文件、重新识别、跑现在的设置三个框带着箭头依次到达；随后改同一条记录的框里旧文字被划掉，新文字飞入替换，最后出现不插入文字的几行。',
  }, {
    en: 'The picture builds in order: the field table header appears, then the fields arrive group by group: id, created_at and kind, then app, text and heard, then instruction and target_lang, then selection and typed, and finally the lines about one object a line and the Transcribe row without an app key.',
    zh: '画面按顺序形成：先出现字段表头，字段再一组一组到达：id、created_at、kind，再 app、text、heard，再 instruction、target_lang，再 selection、typed，最后出现一行一个对象和听写没有 app 键的两行。',
  }, {
    en: 'The picture builds in order: an empty document box appears, then the day heading, then the three entry lines one at a time, and finally the lines listing what a Markdown file and both formats never write.',
    zh: '画面按顺序形成：先出现空的文档框，再出现日标题，三行记录再一行一行到达，最后出现 Markdown 不写和两种格式都不写的几行。',
  }, {
    en: 'The picture builds in order: the documented-way panel appears with its toggle off and a crossed-out socket, the toggle flips on and the socket opens, a read is logged with one audit line, the notice and no-text lines appear, then the same-account direct panel and its boundary lines, and finally the next-chapter box.',
    zh: '画面按顺序形成：先出现有文档的那条路的面板，开关关着、socket 被划掉；开关随后打开、socket 出现；一次读取被记下并出现一条审计记录；提醒和日志无文字的两行出现；再出现同一账户直接开的面板和边界行，最后出现下一章的框。',
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
  const H = $derived((phone ? [720, 700, 700, 700, 760, 720, 430, 410, 800] : [440, 440, 470, 510, 500, 460, 400, 360, 540])[step]);
  // Every step builds its state instead of showing a finished frame:
  // Step 1: empty row box, then kind/app, then text, then the recording,
  //   then the row count and the no-clock box.
  // Step 2: history ruler and its bar, then the retry ruler, its short bar
  //   and tick, the 83-day line, then the condition box.
  // Step 3: the cutoff formula and line, both rows, then the older row is
  //   covered and struck while the newer stays, then the moving-cutoff and
  //   cleanup lines.
  // Step 4: the 102-row bar, its split into keep 100 and delete 2 with the
  //   arithmetic, then the other kinds and the choices for N.
  // Step 5: the failed card, both rulers, the clock arithmetic and sweep,
  //   then the strike through audio.wav for a successful retry.
  // Step 6: the row box, then read, recognize and settings boxes, then the
  //   same row's old text struck and the new text flying in.
  // Step 7: the field header, then the fields group by group, then the
  //   summary lines.
  // Step 8: the empty document, the day heading, the three lines one at a
  //   time, then the never-written lines.
  // Step 9: the toggle off with a crossed-out socket, the toggle on and the
  //   socket open, one audit line per read, then the direct panel and the
  //   boundary lines.
  const PHASE_COUNTS = [6, 6, 6, 6, 6, 7, 6, 6, 7];
  // Phone LoopProgress spots per step, kept clear of content and footnotes.
  const LP_PHONE: [number, number][] = [[228, 660], [228, 646], [228, 646], [228, 640], [228, 700], [228, 660], [228, 372], [228, 350], [228, 736]];
  const PHASE_MS = 900;
  const REST_MS = 2400;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { phase = PHASE_COUNTS[s] - 1; return; }
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
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="hr-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="hr-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="hr-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
        <marker id="hr-arrow-eos" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--eos)" />
        </marker>
      </defs>
      {#if !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={LP_PHONE[step][0]} y={LP_PHONE[step][1]} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}

      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('ONE DICTATION → ONE HISTORY ROW', '一次听写 → 一条历史记录')}</text>
        <text x="20" y="46" class="tag">{t('A row holds what you said. A recording holds your voice.', '记录装着你说的话。录音装着你的声音。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g in:fly={{ y: 24, duration: 450 }}>
              <rect x="20" y="86" width="260" height="238" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="112" class="rowlabel">{t('history row', '历史记录')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="34" y="144" class="tag">{t('kind', '功能')}</text>
              <text x="120" y="144" class="mono">transcribe</text>
              <text x="34" y="176" class="tag">{t('app', '应用')}</text>
              <text x="120" y="176" class="mono">Mail</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="34" y="208" class="tag">{t('text', '文字')}</text>
              <text x="120" y="208" class="mono">“send it to Priya.”</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="34" y="240" class="tag">{t('recording', '录音')}</text>
              <text x="120" y="240" class="mono" fill="var(--gen)">audio.wav</text>
              <text x="34" y="280" class="tag">{t('one row per finished dictation', '每次听写完成留一条')}</text>
              <text x="34" y="304" class="tag">{t('only if you keep recordings', '只在你保留录音时')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="362" class="tag strong">{VOXT_HISTORY_DEMO_PER_DAY} × {VOXT_HISTORY_KEEP_DAYS} = {VOXT_HISTORY_DEMO_ROWS} {t('rows', '条记录')}</text>
              <text x="20" y="386" class="tag">{t('example: 10 dictations a day', '举例：一天 10 次听写')}</text>
              <rect x="20" y="410" width="260" height="92" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
              <text x="34" y="436" class="tag strong">{t('no clock yet', '还没有钟')}</text>
              <text x="34" y="462" class="tag">{t('both stay until a clock removes them', '两者都留着，直到钟把它们拿走')}</text>
              <text x="34" y="486" class="tag">{t('the next step adds the clocks', '下一步给它们加钟')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g in:fly={{ y: 24, duration: 450 }}>
              <rect x="20" y="66" width="680" height="150" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="92" class="rowlabel">{t('history row', '历史记录')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="40" y="132" class="tag">{t('kind', '功能')}</text>
              <text x="120" y="132" class="mono">transcribe</text>
              <text x="40" y="164" class="tag">{t('app', '应用')}</text>
              <text x="120" y="164" class="mono">Mail</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="40" y="196" class="tag">{t('text', '文字')}</text>
              <text x="120" y="196" class="mono">“send it to Priya.”</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="420" y="132" class="tag">{t('recording', '录音')}</text>
              <text x="420" y="164" class="mono" fill="var(--gen)">audio.wav</text>
              <text x="420" y="196" class="tag">{t('only if you keep recordings', '只在你保留录音时')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="258" class="tag strong">{VOXT_HISTORY_DEMO_PER_DAY} {t('dictations a day ×', '次听写一天 ×')} {VOXT_HISTORY_KEEP_DAYS} {t('days =', '天 =')} {VOXT_HISTORY_DEMO_ROWS} {t('rows', '条记录')}</text>
              <text x="20" y="284" class="tag">{t('Each row holds the text. A kept recording holds your voice.', '每条记录装着文字。保留的录音装着你的声音。')}</text>
              <rect x="20" y="312" width="680" height="76" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
              <text x="34" y="340" class="tag strong">{t('no clock yet', '还没有钟')}</text>
              <text x="34" y="366" class="tag">{t('Both stay until a clock removes them. The next step adds the clocks.', '两者都留着，直到有钟把它们拿走。下一步加钟。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('source: store.Entry · session/run.go keep()', '出处：store.Entry · session/run.go keep()') : t('Source: store.Entry · session/run.go keep() writes the row and its recording', '出处：store.Entry · session/run.go 的 keep() 写记录和录音')}</text>

      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('TWO CLOCKS', '两个钟')}</text>
        <text x="20" y="46" class="tag">{t('Two things expire at different times.', '两样东西在不同时间到期。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g transition:fade>
              <text x="20" y="80" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
              <text x="280" y="80" text-anchor="end" class="tag strong" fill="var(--accent)">{VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
              <line x1="20" y1="100" x2="280" y2="100" stroke="var(--line)" stroke-width="2" />
              <text x="20" y="128" class="tag">{t('shortcut', '按下快捷键')}</text>
              <text x="280" y="128" text-anchor="end" class="tag">{t('expires', '到期')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="94" width="260" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" transition:fade />
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="20" y="176" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
              <text x="280" y="176" text-anchor="end" class="tag strong" fill="var(--gen)">{VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
              <line x1="20" y1="196" x2="280" y2="196" stroke="var(--line)" stroke-width="2" />
              <text x="20" y="220" class="tag">{t('retry recording saved', '重试录音保存')}</text>
              <text x="20" y="244" class="tag">{t('same 90-day ruler', '同一条 90 天的尺')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <rect x="20" y="190" width="20" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
              <line x1="40" y1="183" x2="40" y2="209" stroke="var(--gen)" stroke-width="2" />
              <line x1="40" y1="196" x2="280" y2="196" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
              <text x="46" y="188" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
              <text x="20" y="268" class="tag">{t(`7 days is ${VOXT_HISTORY_SHORTER_DAYS} days shorter.`, `7 天比 90 天短 ${VOXT_HISTORY_SHORTER_DAYS} 天。`)}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <rect x="20" y="286" width="260" height="122" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="312" class="tag strong">{t('a retry recording is', '重试录音是')}</text>
              <text x="34" y="336" class="tag">{t('a kept recording of a', '一段留下的录音，')}</text>
              <text x="34" y="360" class="tag">{t('failed or cancelled dictation, so it', '给失败或取消的听写，')}</text>
              <text x="34" y="384" class="tag">{t('can be tried again.', '好让它再试一次。')}</text>
              <rect x="20" y="424" width="260" height="98" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
              <text x="34" y="450" class="tag strong">{t('when does it exist?', '什么时候才有？')}</text>
              <text x="34" y="476" class="tag">{t('recognition failed or you cancelled', '识别失败或你取消')}</text>
              <text x="34" y="500" class="tag">{t('and keep recordings is off', '并且保存录音关着')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g transition:fade>
              <text x="20" y="82" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
              <text x="660" y="82" text-anchor="end" class="tag strong" fill="var(--accent)">{t('default', '默认')} {VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
              <line x1="60" y1="110" x2="660" y2="110" stroke="var(--line)" stroke-width="2" />
              <text x="60" y="136" class="tag">{t('shortcut', '按下快捷键')}</text>
              <text x="660" y="136" text-anchor="end" class="tag">{t('expires at day 90', '第 90 天到期')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <rect x="60" y="104" width="600" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" transition:fade />
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="20" y="178" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
              <text x="660" y="178" text-anchor="end" class="tag strong" fill="var(--gen)">{t('default', '默认')} {VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
              <line x1="60" y1="206" x2="660" y2="206" stroke="var(--line)" stroke-width="2" />
              <text x="60" y="232" class="tag">{t('retry recording saved', '重试录音保存')}</text>
              <text x="660" y="232" text-anchor="end" class="tag">{t('same 90-day ruler', '同一条 90 天的尺')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <rect x="60" y="200" width="47" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
              <line x1="107" y1="193" x2="107" y2="219" stroke="var(--gen)" stroke-width="2" />
              <line x1="107" y1="206" x2="660" y2="206" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
              <text x="115" y="198" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
              <text x="20" y="262" class="tag">{t(`7 days is ${VOXT_HISTORY_SHORTER_DAYS} days shorter than 90.`, `7 天比 90 天短 ${VOXT_HISTORY_SHORTER_DAYS} 天。`)}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <rect x="20" y="282" width="680" height="84" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="308" class="tag strong">{t('A retry recording is a kept recording of a failed or cancelled dictation, so it can be tried again.', '重试录音是一段留下的失败或取消的听写录音，好让它再试一次。')}</text>
              <text x="34" y="336" class="tag">{t('It exists only when recognition failed or you cancelled, and keep recordings is off.', '它只在识别失败或你取消、并且保存录音关着时出现。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('settings/history.go · session/session.go', 'settings/history.go · session/session.go') : t('Source: settings/history.go DefaultKeepDays 90 · session/session.go DefaultAudioRetention 7×24h', '出处：settings/history.go DefaultKeepDays 90 · session/session.go DefaultAudioRetention 7×24h')}</text>

      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('CLOCK 1 · AGE', '钟 1 · 年龄')}</text>
        <text x="20" y="46" class="tag">{t('A row older than 90 days is deleted.', '超过 90 天的记录会被删。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g transition:fade>
              <text x="20" y="78" class="mono">{t('today', '今天')} {VOXT_HISTORY_TODAY}</text>
              <text x="20" y="100" class="mono">− {VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
              <text x="20" y="122" class="mono" fill="var(--accent)">{t('cutoff', '分界线')} {VOXT_HISTORY_CUTOFF}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="140" width="260" height="86" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
              <text x="34" y="166" class="tag strong">{VOXT_HISTORY_OLD_DAYS} {t('days old', '天前')}</text>
              <text x="34" y="190" class="mono">{VOXT_HISTORY_OLD_DATE}</text>
              <text x="34" y="214" class="tag strong" fill="var(--eos)">{t('older than cutoff → cleanup deletes', '早于分界线 → 清理时删')}</text>
            </g>
            <g in:fly={{ y: 20, duration: 450, delay: 150 }}>
              <rect x="20" y="240" width="260" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="266" class="tag strong">{VOXT_HISTORY_KEPT_DAYS} {t('days old', '天前')}</text>
              <text x="34" y="290" class="mono">{VOXT_HISTORY_KEPT_DATE}</text>
              <text x="34" y="314" class="tag strong" fill="var(--accent)">{t('newer than cutoff → stays', '晚于分界线 → 留下')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <rect x="20" y="140" width="260" height="86" rx="8" fill="var(--bg)" opacity="0.55" />
              <line x1="34" y1="152" x2="60" y2="214" stroke="var(--eos)" stroke-width="3" />
              <line x1="60" y1="152" x2="34" y2="214" stroke="var(--eos)" stroke-width="3" />
              <text x="20" y="356" class="tag">{t('the row goes with its recording', '记录连同录音一起删')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="20" y="380" class="tag">{t('the cutoff moves with today', '分界线跟着今天走')}</text>
              <text x="20" y="404" class="tag">{t('tomorrow it is one day later', '明天它就晚一天')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="440" class="tag strong">{t('runs at start', '启动时跑')}</text>
              <text x="20" y="464" class="tag">{t('after each new row', '每条新记录之后')}</text>
              <text x="20" y="488" class="tag">{t('when the setting changes', '设置改动时')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g transition:fade>
              <text x="20" y="86" class="mono">{t('today', '今天')} {VOXT_HISTORY_TODAY} − {VOXT_HISTORY_KEEP_DAYS} {t('days = cutoff', '天 = 分界线')} {VOXT_HISTORY_CUTOFF}</text>
              <line x1="360" y1="118" x2="360" y2="330" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 5" />
              <text x="368" y="114" class="tag strong">{t('cutoff', '分界线')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="40" y="132" width="296" height="112" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" />
              <text x="56" y="160" class="rowlabel">{t('OLDER', '更早')}</text>
              <text x="56" y="190" class="tag strong">{VOXT_HISTORY_OLD_DAYS} {t('days old', '天前')} · {VOXT_HISTORY_OLD_DATE}</text>
              <text x="56" y="218" class="tag strong" fill="var(--eos)">{t('at cleanup, with its recording', '清理时删，录音一起')}</text>
            </g>
            <g in:fly={{ y: 20, duration: 450, delay: 150 }}>
              <rect x="384" y="132" width="296" height="112" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="400" y="160" class="rowlabel">{t('NEWER', '更晚')}</text>
              <text x="400" y="190" class="tag strong">{VOXT_HISTORY_KEPT_DAYS} {t('days old', '天前')} · {VOXT_HISTORY_KEPT_DATE}</text>
              <text x="400" y="218" class="tag strong" fill="var(--accent)">{t('stays, with its recording', '留下，录音一起')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <rect x="40" y="132" width="296" height="112" rx="10" fill="var(--bg)" opacity="0.55" />
              <line x1="56" y1="146" x2="96" y2="230" stroke="var(--eos)" stroke-width="3" />
              <line x1="96" y1="146" x2="56" y2="230" stroke="var(--eos)" stroke-width="3" />
              <path d="M170 244 V272" stroke="var(--eos)" stroke-width="2" marker-end="url(#hr-arrow-eos)" />
              <text x="184" y="266" class="tag" fill="var(--eos)">{t('removed', '被清掉')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <text x="20" y="300" class="tag" transition:fade>{t('The cutoff moves with today: tomorrow it is one day later.', '分界线跟着今天走：明天它就晚一天。')}</text>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="334" class="tag strong">{t('When the automatic cleanup runs', '自动清理什么时候跑')}</text>
              <text x="20" y="358" class="tag">{t('at start · after each new row · when the setting changes', '启动时 · 每条新记录之后 · 设置改动时')}</text>
              <text x="20" y="392" class="tag">{t('Keep days is one of 365 / 180 / 90 / 30 / 7.', '保留天数可选 365 / 180 / 90 / 30 / 7。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('history_settings_ops.go · history_retention.go', 'history_settings_ops.go · history_retention.go') : t('Source: settings/history.go Cutoff() · sqlitestore/history_retention.go pruneWhere()', '出处：settings/history.go Cutoff() · sqlitestore/history_retention.go pruneWhere()')}</text>

      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('CLOCK 1 · COUNT', '钟 1 · 条数')}</text>
        <text x="20" y="46" class="tag">{t('Each kind keeps its newest N rows.', '每种功能各留最新的 N 条。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="72" width="260" height="176" rx="10" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="98" class="rowlabel">transcribe</text>
              <text x="34" y="124" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} {t('rows', '条')}</text>
              <rect x="34" y="162" width="227" height="18" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="34" y="150" class="tag" fill="var(--accent)">{t('keep newest', '留最新')} {VOXT_HISTORY_COUNT_EXAMPLE}</text>
              <text x="266" y="150" text-anchor="end" class="tag" fill="var(--eos)">{t('delete', '删')} {VOXT_HISTORY_COUNT_DELETED}</text>
              <rect x="261" y="162" width="5" height="18" rx="1" fill="var(--eos-soft)" stroke="var(--eos)" />
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="34" y="204" class="tag">{VOXT_HISTORY_COUNT_ROWS} − {VOXT_HISTORY_COUNT_EXAMPLE} = {VOXT_HISTORY_COUNT_DELETED}</text>
              <text x="34" y="228" class="tag">{t('blue 100/102 · red 2/102', '蓝 100/102 · 红 2/102')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="264" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="290" class="rowlabel">translate</text>
              <text x="34" y="316" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
              <text x="34" y="340" class="tag">{t('no shared count', '不共用条数')}</text>
            </g>
            <g in:fly={{ y: 20, duration: 450, delay: 150 }}>
              <rect x="20" y="376" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="402" class="rowlabel">rewrite</text>
              <text x="34" y="428" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
              <text x="34" y="452" class="tag">{t('no shared count', '不共用条数')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="508" class="tag strong">{t('N: 50 / 100 / 300 / 500 / 1000', 'N 可选 50 / 100 / 300 / 500 / 1000')}</text>
              <text x="20" y="532" class="tag">{t('0 = no limit (default)', '0 = 不限（默认）')}</text>
              <text x="20" y="556" class="tag">{t('age and count run together', '年龄和条数一起生效')}</text>
              <text x="20" y="580" class="tag">{t('either rule can delete a row', '哪条规则都能删记录')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="70" width="680" height="240" rx="10" fill="var(--bg)" stroke="var(--line)" />
              <text x="40" y="100" class="rowlabel">transcribe · {t('the example', '例子')}</text>
              <text x="40" y="124" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} {t('rows', '条')}</text>
              <rect x="40" y="136" width="588" height="40" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="330" y="124" class="tag" fill="var(--accent)">{t('keep newest', '留最新')} {VOXT_HISTORY_COUNT_EXAMPLE}</text>
              <text x="650" y="124" text-anchor="end" class="tag" fill="var(--eos)">{t('delete', '删')} {VOXT_HISTORY_COUNT_DELETED}</text>
              <rect x="628" y="136" width="12" height="40" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="40" y="204" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} − {VOXT_HISTORY_COUNT_EXAMPLE} = {VOXT_HISTORY_COUNT_DELETED}</text>
              <text x="40" y="230" class="tag">{t('The bar length is the row count: 102 rows in all, 100 kept, 2 deleted.', '条长就是条数：一共 102 条，留 100 条，删 2 条。')}</text>
              <text x="40" y="256" class="tag">{t('Blue is 100/102 of the bar; red is 2/102.', '蓝色占整条的 100/102，红色占 2/102。')}</text>
              <text x="40" y="288" class="tag">{t('The deleted rows are the oldest of this kind.', '删掉的是这种功能里最旧的记录。')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="330" width="330" height="80" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="356" class="rowlabel">translate</text>
              <text x="34" y="382" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
            </g>
            <g in:fly={{ y: 20, duration: 450, delay: 150 }}>
              <rect x="370" y="330" width="330" height="80" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="384" y="356" class="rowlabel">rewrite</text>
              <text x="384" y="382" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="446" class="tag strong">{t('N: 50 / 100 / 300 / 500 / 1000; 0 = no limit (default)', 'N 可选 50 / 100 / 300 / 500 / 1000；0 = 不限（默认）')}</text>
              <text x="20" y="472" class="tag">{t('Age and count run together: either rule can delete a row.', '年龄和条数一起生效：哪条规则都能删记录。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('history_retention.go · pruneWhere()', 'history_retention.go · pruneWhere()') : t('Source: sqlitestore/history_retention.go pruneWhere() · settings/history.go KeepCountChoices', '出处：sqlitestore/history_retention.go pruneWhere() · settings/history.go KeepCountChoices')}</text>

      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('CLOCK 2 · RETRY RECORDING', '钟 2 · 重试录音')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Failed or cancelled: 7 days with recordings off.', '保存录音关着时，留 7 天。') : t('A failed or cancelled recording lasts 7 days with recordings off.', '保存录音关着时，失败或取消的录音留 7 天。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="70" width="260" height="96" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="34" y="96" class="rowlabel">{t('failed transcribe', '失败的听写')}</text>
              <text x="34" y="120" class="mono">2026-11-26</text>
              <text x="34" y="150" class="mono" fill="var(--gen)">audio.wav</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="20" y="204" class="boxtitle">{t('HISTORY ROW · 90 days', '历史记录 · 90 天')}</text>
              <rect x="20" y="216" width="260" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="20" y="250" class="boxtitle">{t('RETRY RECORDING · 7 days', '重试录音 · 7 天')}</text>
              <rect x="20" y="262" width="20" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
              <line x1="40" y1="258" x2="40" y2="276" stroke="var(--gen)" stroke-width="2" />
              <line x1="40" y1="267" x2="280" y2="267" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
              <text x="46" y="284" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
              <text x="20" y="304" class="tag">{t('kept even when keep recordings is off', '保存录音关着也留')}</text>
              <text x="20" y="328" class="tag">{t('so the dictation can run again', '所以这次听写还能再跑')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="20" y="364" class="tag strong">{t('retry clock:', '重试钟：')} {VOXT_RETRY_KEEP_DAYS} × 24 = {VOXT_RETRY_KEEP_HOURS} {t('hours', '小时')}</text>
              <text x="20" y="388" class="tag">{t('sweep: every 1 hour', '清扫：每 1 小时')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <line x1="32" y1="146" x2="104" y2="146" stroke="var(--eos)" stroke-width="2.5" />
              <text x="112" y="150" class="tag" fill="var(--eos)">{t('deleted on success', '成功即删')}</text>
              <text x="20" y="424" class="tag">{t('successful retry deletes it at once', '重试成功马上删')}</text>
              <text x="20" y="448" class="tag">{t('recordings on: it follows the row', '保存录音开：跟着记录走')}</text>
              <text x="20" y="472" class="tag">{t('so it lasts as long as the row', '所以和记录一样久')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="66" width="680" height="86" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="34" y="92" class="rowlabel">{t('failed transcribe', '失败的听写')}</text>
              <text x="34" y="120" class="mono">2026-11-26</text>
              <text x="250" y="92" class="tag">{t('no result', '没有结果')}</text>
              <text x="250" y="120" class="mono" fill="var(--gen)">audio.wav</text>
              <text x="470" y="92" class="tag">{t('kept so the dictation can run again', '留给这次听写再跑')}</text>
              <text x="470" y="120" class="tag" fill="var(--gen)">{t('even with recordings off', '保存录音关着也留')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="20" y="182" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
              <text x="660" y="182" text-anchor="end" class="tag strong" fill="var(--accent)">{VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
              <rect x="60" y="192" width="600" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="20" y="236" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
              <text x="660" y="236" text-anchor="end" class="tag strong" fill="var(--gen)">{VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
              <rect x="60" y="246" width="47" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
              <line x1="107" y1="240" x2="107" y2="264" stroke="var(--gen)" stroke-width="2" />
              <line x1="107" y1="252" x2="660" y2="252" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
              <text x="115" y="278" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="20" y="296" class="tag strong">{t('retry clock:', '重试钟：')} {VOXT_RETRY_KEEP_DAYS} × 24 = {VOXT_RETRY_KEEP_HOURS} {t('hours', '小时')}</text>
              <text x="20" y="322" class="tag">{t('sweep: every 1 hour', '清扫：每 1 小时')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <line x1="248" y1="116" x2="320" y2="116" stroke="var(--eos)" stroke-width="2.5" />
              <text x="330" y="120" class="tag" fill="var(--eos)">{t('deleted on success', '成功即删')}</text>
              <text x="20" y="348" class="tag">{t('A successful retry deletes it at once.', '重试成功马上删掉它。')}</text>
              <text x="20" y="374" class="tag">{t('With recordings on, the recording follows the row’s clock.', '保存录音开着时，录音跟着记录的钟走。')}</text>
              <text x="20" y="410" class="tag strong">{t('What the copy is for', '这份副本干什么用')}</text>
              <text x="20" y="434" class="tag">{t('Retry runs the dictation again from this file.', '重试就是拿这段录音再跑一次这次听写。')}</text>
              <text x="20" y="458" class="tag">{t('When it is gone, Retry says the recording is gone.', '录音没了，重试就说录音已经不在。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('session.go · session/run.go · history_retry.go', 'session.go · session/run.go · history_retry.go') : t('Source: session/session.go DefaultAudioRetention · session/run.go AudioUntil · history_retry.go hourly sweep', '出处：session/session.go DefaultAudioRetention · session/run.go AudioUntil · history_retry.go 每小时扫一次')}</text>

      {:else if step === 5}
        <text x="20" y="22" class="tag strong">{t('RETRY USES THE RECORDING', '重试用那段录音')}</text>
        <text x="20" y="46" class="tag">{t('Read the whole file, recognize again, run today’s settings.', '读整份文件，重新识别，再用现在的设置。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 400 }}>
              <rect x="20" y="66" width="260" height="76" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="34" y="94" class="rowlabel">{t('history row', '历史记录')}</text>
              <text x="34" y="120" class="mono">audio.wav</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M150 142 V160" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="20" y="164" width="260" height="76" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="192" class="rowlabel">{t('read the file', '读文件')}</text>
              <text x="34" y="218" class="mono">{t('16 kHz mono WAV', '16 kHz 单声道 WAV')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M150 240 V258" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="20" y="262" width="260" height="76" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="290" class="rowlabel">{t('recognize', '重新识别')}</text>
              <text x="34" y="316" class="mono">{t('whole recording', '整段录音')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M150 338 V356" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="20" y="360" width="260" height="76" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="388" class="rowlabel">{t('run the settings', '跑现在的设置')}</text>
              <text x="34" y="414" class="mono">{t('cleanup / language', '清理／语言模型')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M150 436 V454" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="20" y="458" width="260" height="98" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="486" class="rowlabel">{t('update the same row', '改同一条记录')}</text>
              <text x="34" y="512" class="mono" fill="var(--muted)">“send it to priya.”</text>
              <line x1="32" y1="508" x2="160" y2="508" stroke="var(--eos)" stroke-width="2" />
            </g>
          {/if}
          {#if phase >= 6}
            <g in:fly={{ y: -10, duration: 400 }}>
              <text x="34" y="540" class="mono" fill="var(--accent)">→ “Send it to Priya,”</text>
            </g>
            <g transition:fade>
              <text x="20" y="586" class="tag strong">{t('It inserts nothing.', '它不插入文字。')}</text>
              <text x="20" y="610" class="tag">{t('Only rows with a kept recording can retry.', '只有留着录音的记录能重试。')}</text>
              <text x="20" y="634" class="tag">{t('No recording → “the recording is gone”.', '没录音 → “录音已经不在”。')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 400 }}>
              <rect x="20" y="92" width="146" height="96" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="34" y="120" class="rowlabel">{t('history row', '历史记录')}</text>
              <text x="34" y="150" class="mono">audio.wav</text>
            </g>
          {/if}
          {#if phase >= 2}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M166 140 H182" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="186" y="92" width="156" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="200" y="120" class="rowlabel">{t('read the file', '读文件')}</text>
              <text x="200" y="150" class="mono">{t('16 kHz mono WAV', '16 kHz 单声道 WAV')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M342 140 H358" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="362" y="92" width="166" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="376" y="120" class="rowlabel">{t('recognize', '重新识别')}</text>
              <text x="376" y="150" class="mono">{t('whole recording', '整段录音')}</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 20, duration: 400 }}>
              <path d="M528 140 H544" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
              <rect x="548" y="92" width="152" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x="562" y="120" class="rowlabel">{t('run the settings', '跑现在的设置')}</text>
              <text x="562" y="150" class="mono">{t('cleanup / language', '清理／语言模型')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fly={{ y: 20, duration: 400 }}>
              <rect x="20" y="212" width="680" height="76" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="240" class="tag strong">{t('update the same row', '改同一条记录')}</text>
              <text x="34" y="266" class="mono" fill="var(--muted)">“send it to priya.”</text>
              <line x1="32" y1="262" x2="162" y2="262" stroke="var(--eos)" stroke-width="2" />
            </g>
          {/if}
          {#if phase >= 6}
            <g in:fly={{ y: -10, duration: 400 }}>
              <text x="180" y="266" class="mono" fill="var(--accent)">→ “Send it to Priya,”</text>
            </g>
            <g transition:fade>
              <text x="420" y="240" class="tag">{t('the entry’s app and translation target are reused', '沿用原来的应用和翻译目标')}</text>
              <text x="20" y="318" class="tag strong">{t('It inserts nothing.', '它不插入文字。')}</text>
              <text x="20" y="344" class="tag">{t('Only rows with a kept recording can retry. No recording → “the recording is gone”.', '只有留着录音的记录能重试。没录音 → “录音已经不在”。')}</text>
              <text x="20" y="370" class="tag">{t('A success deletes a retry-only recording when recordings are off.', '成功时，保存录音关着就删掉只为重试留的那份。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('session/retry.go · Retry()', 'session/retry.go · Retry()') : t('Source: session/retry.go Retry() · ErrNoRecording · History.Put()', '出处：session/retry.go Retry() · ErrNoRecording · History.Put()')}</text>

      {:else if step === 6}
        <text x="20" y="22" class="tag strong">{t('EXPORT · JSONL · ONE OBJECT A LINE', '导出 · JSONL · 一行一个对象')}</text>
        {#if phone}
          <text x="20" y="46" class="tag">{t('The whole row schema.', '整份记录结构。')}</text>
          <text x="20" y="66" class="tag">{t('Empty optional fields are left out.', '空的可选字段不写。')}</text>
          {#if phase >= 1}
            <g transition:fade>
              <text x="34" y="98" class="boxtitle">{t('field', '字段')}</text>
              <text x="266" y="98" text-anchor="end" class="boxtitle">{t('when it is there', '什么时候有')}</text>
            </g>
          {/if}
          {#each [
            { name: 'id', en: 'always', zh: '总是', ph: 2 },
            { name: 'created_at', en: 'always', zh: '总是', ph: 2 },
            { name: 'kind', en: 'always', zh: '总是', ph: 2 },
            { name: 'app', en: 'when known', zh: '知道时', ph: 3 },
            { name: 'text', en: 'always', zh: '总是', ph: 3 },
            { name: 'heard', en: 'always', zh: '总是', ph: 3 },
            { name: 'instruction', en: 'Rewrite + words', zh: '改写 + 口述', ph: 4 },
            { name: 'target_lang', en: 'Translate', zh: '翻译', ph: 4 },
            { name: 'selection', en: 'with the setting', zh: '设置打开时', ph: 5 },
            { name: 'typed', en: 'setting + Rewrite + words', zh: '设置 + 改写 + 口述', ph: 5 },
          ] as f, i}
            {#if phase >= f.ph}
              <text x="34" y={122 + i * 22} class="mono" in:fly={{ y: 8, duration: 300, delay: (i % 3) * 120 }}>{f.name}</text>
              <text x="266" y={122 + i * 22} text-anchor="end" class="tag" in:fly={{ y: 8, duration: 300, delay: (i % 3) * 120 }}>{t(f.en, f.zh)}</text>
            {/if}
          {/each}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="352" class="tag strong">{t('One object a line.', '一行一个对象。')}</text>
              <text x="20" y="376" class="tag">{t('The schema has all ten fields.', '结构里有十个字段。')}</text>
              <text x="20" y="400" class="tag">{t('Only empty optional fields are absent.', '只有空的可选字段不写。')}</text>
            </g>
          {/if}
        {:else}
          <text x="20" y="46" class="tag">{t('The whole row schema, minus empty optional fields.', '整份记录结构，去掉空的可选字段。')}</text>
          {#if phase >= 1}
            <g transition:fade>
              <text x="40" y="88" class="boxtitle">{t('field', '字段')}</text>
              <text x="360" y="88" class="boxtitle">{t('when it is in the object', '什么时候写进去')}</text>
            </g>
          {/if}
          {#each [
            { name: 'id', en: 'always', zh: '总是', ph: 2 },
            { name: 'created_at', en: 'always', zh: '总是', ph: 2 },
            { name: 'kind', en: 'always', zh: '总是', ph: 2 },
            { name: 'app', en: 'when known', zh: '知道时', ph: 3 },
            { name: 'text', en: 'always', zh: '总是', ph: 3 },
            { name: 'heard', en: 'always', zh: '总是', ph: 3 },
            { name: 'instruction', en: 'Rewrite with spoken words', zh: '改写且有口述', ph: 4 },
            { name: 'target_lang', en: 'Translate', zh: '翻译', ph: 4 },
            { name: 'selection', en: 'include selected text on', zh: '包含选中文字打开时', ph: 5 },
            { name: 'typed', en: 'that setting + Rewrite + spoken words', zh: '该设置 + 改写 + 口述', ph: 5 },
          ] as f, i}
            {#if phase >= f.ph}
              <text x="40" y={118 + i * 22} class="mono" in:fly={{ y: 8, duration: 300, delay: (i % 3) * 120 }}>{f.name}</text>
              <text x="360" y={118 + i * 22} class="tag" in:fly={{ y: 8, duration: 300, delay: (i % 3) * 120 }}>{t(f.en, f.zh)}</text>
            {/if}
          {/each}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="346" class="tag strong">{t('One object a line. The schema supports all ten fields; empty optional fields are left out.', '一行一个对象。结构支持全部十个字段；空的可选字段不写。')}</text>
              <text x="20" y="370" class="tag">{t('A Transcribe row with an unknown app has no app key, and no instruction or target language.', '应用未知的听写没有 app 键，也没有口述指令和目标语言。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('historyapi/row.go · FromEntry · render.go', 'historyapi/row.go · FromEntry · render.go') : t('Source: historyapi/row.go Row tags · FromEntry · render.go JSONL', '出处：historyapi/row.go 的 Row 标签 · FromEntry · render.go 的 JSONL')}</text>

      {:else if step === 7}
        <text x="20" y="22" class="tag strong">{t('EXPORT · MARKDOWN · A DAY SECTION', '导出 · MARKDOWN · 一天一节')}</text>
        {#if phone}
          <text x="20" y="46" class="tag">{t('Rows grouped by local day.', '记录按本地日期分组。')}</text>
          <text x="20" y="66" class="tag">{t('Each line has time, app and text.', '每行只有时间、应用和文字。')}</text>
          {#if phase >= 1}
            <rect x="20" y="90" width="260" height="160" rx="8" fill="var(--bg)" stroke="var(--line)" in:fly={{ y: 20, duration: 400 }} />
          {/if}
          {#if phase >= 2}
            <text x="34" y="122" class="mono" in:fly={{ y: 8, duration: 300 }}>## 2026-11-26</text>
          {/if}
          {#if phase >= 3}
            <text x="34" y="152" class="mono" in:fly={{ y: 8, duration: 300 }}>- 09:14 · Mail: hello Priya.</text>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 8, duration: 300 }}>
              <text x="34" y="180" class="mono">- 09:20 ·: no app name</text>
              <text x="34" y="208" class="mono">- 09:31 · Notes: buy milk</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="278" class="tag">{t('Only time, app (when known), text.', '只有时间、应用（知道时）和文字。')}</text>
              <text x="20" y="306" class="tag">{t('No id, kind, heard, instruction,', '不带 id、功能、识别原文、口述指令、')}</text>
              <text x="20" y="328" class="tag">{t('target_lang, selection, typed.', '目标语言、选中和输入文字。')}</text>
              <text x="20" y="358" class="tag">{t('Never either: recording, web address,', '两种都不带：录音、网址、')}</text>
              <text x="20" y="380" class="tag">{t('errors, internal names, timings.', '错误、内部名字、计时。')}</text>
            </g>
          {/if}
        {:else}
          <text x="20" y="46" class="tag">{t('Rows grouped by local day.', '记录按本地日期分组。')}</text>
          {#if phase >= 1}
            <rect x="20" y="80" width="680" height="150" rx="8" fill="var(--bg)" stroke="var(--line)" in:fly={{ y: 20, duration: 400 }} />
          {/if}
          {#if phase >= 2}
            <text x="40" y="112" class="mono" in:fly={{ y: 8, duration: 300 }}>## 2026-11-26</text>
          {/if}
          {#if phase >= 3}
            <text x="40" y="142" class="mono" in:fly={{ y: 8, duration: 300 }}>- 09:14 · Mail: send it to Priya.</text>
          {/if}
          {#if phase >= 4}
            <g in:fly={{ y: 8, duration: 300 }}>
              <text x="40" y="170" class="mono">- 09:20 ·: no app name</text>
              <text x="40" y="198" class="mono">- 09:31 · Notes: buy milk</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g transition:fade>
              <text x="20" y="258" class="tag">{t('Each line: time, app (when known), text.', '每行：时间、应用（知道时）、文字。')}</text>
              <text x="20" y="286" class="tag">{t('Not in a Markdown file: id, kind, heard, instruction, target_lang, selection, typed.', 'Markdown 文件里没有：id、功能、识别原文、口述指令、目标语言、选中和输入文字。')}</text>
              <text x="20" y="314" class="tag">{t('Never in either format: recording, web address, errors, internal names, timings.', '两种格式都没有：录音、网址、错误、内部名字、计时。')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('historyapi/render.go · markdown()', 'historyapi/render.go · markdown()') : t('Source: historyapi/render.go Renderer.markdown()', '出处：historyapi/render.go 的 Renderer.markdown()')}</text>

      {:else if step === 8}
        <text x="20" y="22" class="tag strong">{t('THE ACCESS SWITCH', '访问开关')}</text>
        <text x="20" y="46" class="tag">{t('One logged command, only while the switch is on.', '一条会记账的命令，只在开关打开时。')}</text>
        {#if phone}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="66" width="260" height="250" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="92" class="rowlabel">{t('the documented way', '有文档的那条路')}</text>
              <text x="34" y="122" class="tag strong">{t('switch off', '开关关')}</text>
              <text x="34" y="146" class="tag">{t('command gets no answer (exit 3)', '命令没有回答（退出码 3）')}</text>
            </g>
          {/if}
          {#if phase >= 1}
            <g transition:fade>
              <rect x="222" y="84" width="40" height="16" rx="8" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--muted)'} stroke-width="1.5" />
              <circle cx={phase >= 2 ? 254 : 230} cy="92" r="6" fill={phase >= 2 ? 'var(--accent)' : 'var(--muted)'} />
              <rect x="160" y="112" width="112" height="22" rx="5" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-dasharray={phase >= 2 ? '0' : '4 3'} />
              <text x="168" y="127" class="mono">history.sock</text>
              {#if phase < 2}
                <line x1="160" y1="112" x2="272" y2="134" stroke="var(--eos)" stroke-width="2" />
              {/if}
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="34" y="180" class="tag strong">{t('switch on', '开关开')}</text>
              <text x="34" y="204" class="tag">{t('the socket opens for the command', '这条命令的 socket 打开')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="34" y="228" class="tag">{t('each read logs time, count, program', '每次读取记时间、条数、程序')}</text>
              <text x="34" y="248" class="mono" font-size="10">09:14 · export · 12 rows · Notes</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="34" y="272" class="tag">{t('a new program name raises a notice', '新程序名会提醒')}</text>
              <text x="34" y="296" class="tag">{t('the log holds no text', '日志里没有文字')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="332" width="260" height="164" rx="10" fill="var(--bg)" stroke="var(--line)" />
              <text x="34" y="358" class="rowlabel">{t('same account, direct', '同一账户，直接开')}</text>
              <text x="34" y="386" class="mono">voxtnew.db</text>
              <text x="34" y="412" class="tag">{t('the one file that holds the history', '装历史的那一个文件')}</text>
              <text x="34" y="436" class="tag">{t('a program running as you reads it', '以你身份运行的程序能读它')}</text>
              <text x="34" y="460" class="tag">{t('not logged; the switch does not change it', '不记账；开关改不了这一点')}</text>
              <text x="34" y="484" class="tag">{t('the switch does not block this', '开关挡不住这一点')}</text>
              <text x="20" y="526" class="tag">{t('other accounts cannot open the channel', '其他账户打不开这条通道')}</text>
              <text x="20" y="550" class="tag">{t('there is no network port', '没有网络端口')}</text>
            </g>
          {/if}
          {#if phase >= 6}
            <g transition:fade>
              <rect x="20" y="578" width="260" height="102" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
              <text x="34" y="604" class="tag strong">{t('next chapter', '下一章')}</text>
              <text x="34" y="630" class="tag">{t('an audio file you already have', '一个现成的音频文件')}</text>
              <text x="34" y="654" class="tag">{t('→ SRT or TXT. How?', '→ SRT 或 TXT。怎么变？')}</text>
            </g>
          {/if}
        {:else}
          {#if phase >= 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y="66" width="400" height="238" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y="92" class="rowlabel">{t('the documented way', '有文档的那条路')}</text>
              <text x="34" y="124" class="tag strong">{t('switch off', '开关关')}</text>
              <text x="34" y="148" class="tag">{t('the command gets no answer (exit 3)', '命令没有回答（退出码 3）')}</text>
            </g>
          {/if}
          {#if phase >= 1}
            <g transition:fade>
              <rect x="356" y="84" width="44" height="18" rx="9" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--muted)'} stroke-width="1.5" />
              <circle cx={phase >= 2 ? 391 : 365} cy="93" r="7" fill={phase >= 2 ? 'var(--accent)' : 'var(--muted)'} />
              <rect x="236" y="114" width="140" height="24" rx="5" fill="var(--bg)" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-dasharray={phase >= 2 ? '0' : '4 3'} />
              <text x="244" y="130" class="mono">history.sock</text>
              {#if phase < 2}
                <line x1="236" y1="114" x2="376" y2="138" stroke="var(--eos)" stroke-width="2" />
              {/if}
            </g>
          {/if}
          {#if phase >= 2}
            <g transition:fade>
              <text x="34" y="182" class="tag strong">{t('switch on', '开关开')}</text>
              <text x="34" y="206" class="tag">{t('the socket opens for the command', '这条命令的 socket 打开')}</text>
            </g>
          {/if}
          {#if phase >= 3}
            <g transition:fade>
              <text x="34" y="230" class="tag">{t('each read logs time, count, program name', '每次读取记时间、条数、程序名')}</text>
              <text x="34" y="252" class="mono" font-size="10">09:14 · export · 12 rows · Notes</text>
            </g>
          {/if}
          {#if phase >= 4}
            <g transition:fade>
              <text x="34" y="276" class="tag">{t('a new program name raises a notice', '新程序名会提醒')}</text>
              <text x="34" y="296" class="tag">{t('the log holds no history text', '日志里没有历史文字')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="440" y="66" width="260" height="238" rx="10" fill="var(--bg)" stroke="var(--line)" />
              <text x="454" y="92" class="rowlabel">{t('same account, direct', '同一账户，直接开')}</text>
              <text x="454" y="124" class="mono">voxtnew.db</text>
              <text x="454" y="150" class="tag">{t('the one file that holds', '装历史的')}</text>
              <text x="454" y="172" class="tag">{t('the history', '那一个文件')}</text>
              <text x="454" y="204" class="tag">{t('a program running as you', '以你身份运行的程序')}</text>
              <text x="454" y="226" class="tag">{t('can read it directly', '能直接读它')}</text>
              <text x="454" y="252" class="tag">{t('not logged', '不记账')}</text>
              <text x="454" y="276" class="tag">{t('the switch does not change it', '开关改不了这一点')}</text>
              <text x="20" y="336" class="tag">{t('Other accounts cannot open the channel (file mode 0600 inside ~/Library). There is no network port.', '其他账户打不开这条通道（文件权限 0600，在 ~/Library 里）。没有网络端口。')}</text>
            </g>
          {/if}
          {#if phase >= 6}
            <g transition:fade>
              <text x="20" y="368" class="tag strong">{t('The switch is opt-in and visible; it does not stop a program running as you.', '这个开关要你打开，而且看得见；它挡不住以你身份运行的程序。')}</text>
              <rect x="20" y="396" width="680" height="84" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
              <text x="34" y="424" class="tag strong">{t('next chapter', '下一章')}</text>
              <text x="34" y="450" class="tag">{t('An audio file you already have becomes SRT or TXT. How does a file become text?', '一个现成的音频文件变成 SRT 或 TXT。文件怎样变成文字？')}</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('docs/history-access.md · history_access_controller.go', 'docs/history-access.md · history_access_controller.go') : t('Source: docs/history-access.md · history_access_controller.go · historyapi/server.go', '出处：docs/history-access.md · history_access_controller.go · historyapi/server.go')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
