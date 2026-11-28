<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    QWEN_SPEECH_DEFAULT_STAGE_PROCESSES,
    QWEN_SPEECH_REPLICA2_STAGE_PROCESSES,
    QWEN_SPEECH_UNCHANGED_STAGE_COUNT,
    QWEN_SPEECH_DEFAULT_COPY_COUNT,
    QWEN_SPEECH_REPLICA2_COPY_COUNT,
    QWEN_SPEECH_DEFAULT_GPU_IDS,
    QWEN_SPEECH_REPLICA2_GPU_IDS,
    QWEN_SPEECH_DEFAULT_GPU_COUNT,
    QWEN_SPEECH_REPLICA2_GPU_COUNT,
    COLOCATED_SPEECH_STAGE_COUNT,
    COLOCATED_SPEECH_SCHEDULER_COUNT,
    COLOCATED_SPEECH_SEPARATE_PROCESS_COUNT,
    COLOCATED_SPEECH_SHARED_PROCESS_COUNT,
    TP_EXAMPLE_SIZE,
    TP_EXAMPLE_STAGE_COUNT,
    TP_EXAMPLE_GPU_IDS,
    TP_EXAMPLE_PROCESS_COUNT,
    TP_EXAMPLE_GPU_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Two speech stages get one more process each so queued requests can use different copies. Splitting first gives ${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes; adding the copies gives ${QWEN_SPEECH_REPLICA2_COPY_COUNT}.`,
    captionZh: `两个语音 stage 各添一个进程，排队请求就能用不同副本。先拆成 ${QWEN_SPEECH_DEFAULT_COPY_COUNT} 个进程，再添成 ${QWEN_SPEECH_REPLICA2_COPY_COUNT} 个。`,
  }, {
    caption: `Put talker_ar and code2wav in one process. Keep two stages and two schedulers; their hand-off can stay inside.`,
    captionZh: `把 talker_ar 和 code2wav 放进同一个进程。stage 和 scheduler 仍各有两个，交接可留在进程内。`,
  }, {
    caption: `tp_size = ${TP_EXAMPLE_SIZE} and gpu = [0, 1] make two processes share one stage's work. Each uses one GPU on the same request.`,
    captionZh: `tp_size = ${TP_EXAMPLE_SIZE}、gpu = [0, 1] 让两个进程一起做一个 stage 的活儿。它们各用一张 GPU，处理同一个请求。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const PHASE_COUNTS = [6, 4, 5];
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * 1400));
      const ms = count * 1400 + 1800;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 850 : step === 1 ? 810 : 790) : 480);
  const panels = $derived(phone ? [
    { x: 15, y: 75, w: 270, h: 350, replica2: false },
    { x: 15, y: 440, w: 270, h: 350, replica2: true },
  ] : [
    { x: 20, y: 80, w: 325, h: 355, replica2: false },
    { x: 375, y: 80, w: 325, h: 355, replica2: true },
  ]);
  const groupPanels = $derived(phone ? [
    { x: 15, y: 85, w: 270, h: 300, shared: false },
    { x: 15, y: 405, w: 270, h: 300, shared: true },
  ] : [
    { x: 20, y: 90, w: 325, h: 300, shared: false },
    { x: 375, y: 90, w: 325, h: 300, shared: true },
  ]);
  const tpPanels = $derived(phone ? [
    { x: 15, y: 100, w: 270, h: 290, tp: false },
    { x: 15, y: 410, w: 270, h: 290, tp: true },
  ] : [
    { x: 20, y: 105, w: 325, h: 300, tp: false },
    { x: 375, y: 105, w: 325, h: 300, tp: true },
  ]);
  const otherStages = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage !== 'talker_ar' && stage !== 'code2wav');
  const replicated = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage === 'talker_ar' || stage === 'code2wav');
  const copies = (stage: string) => QWEN_SPEECH_REPLICA2_STAGE_PROCESSES.filter((process) => process.stage === stage);
  const device = (gpu: number | null) => gpu === null ? 'CPU' : `GPU ${gpu}`;
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'First separate the speech stages: seven total processes and GPU ids 0 and 1, then add one copy of each: nine total processes and GPU ids 0, 1, and 2' : step === 1 ? t('Two stages and two schedulers stay unchanged while two separate processes become one shared process', '两个 stage 和两个 scheduler 不变，两个独立进程变成一个共用进程') : t('tp_size two keeps one thinker stage and one request, while two processes on two GPUs share the work', 'tp_size 为 2 时，仍是一个 thinker stage 和同一个请求；两个进程各用一张 GPU，一起算')}>
      {#if step === 0}
      <text x={phone ? 15 : 30} y={phone ? 18 : 22} class="tag strong">copy = {t(phone ? 'one more stage process' : 'one more process for the same stage', '同一个 stage 多一个进程')}</text>
      <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={phone ? 0 : 10} />
      <text x={phone ? 15 : 30} y={phone ? 39 : 43} class="tag">{t('Two configs assign GPU positions; → marks a move.', '两种配置指定 GPU 位置；→ 表示换卡。')}</text>
      <rect x={phone ? 15 : 400} y="51" width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 32 : 418} y="61" class="tag">{t('unchanged', '不变')}</text>
      <rect x={phone ? 105 : 500} y="51" width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 122 : 518} y="61" class="tag strong">{t('changed', '有变化')}</text>

      {#each panels as panel}
        {@const innerX = panel.x + 20}
        {@const innerW = panel.w - 40}
        {@const otherY = panel.y + 35}
        {@const rowY = panel.y + 170}
        {@const boxW = panel.replica2 ? (innerW - 10) / 2 : innerW}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={innerX} y={panel.y + 22} class="rowlabel">{panel.replica2 ? t('THEN COPY · SAME 7 STAGES', '再复制 · 仍是 7 个 stage') : phase === 0 ? t('CHAPTER 1 · SHARED SPEECH', '第 1 章 · 语音共用进程') : t('SPLIT FIRST · 7 STAGES', '先拆开 · 7 个 stage')}</text>

        <g opacity={!panel.replica2 || phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <rect x={innerX} y={otherY} width={innerW} height="120" rx="9" fill="white" stroke="var(--line)" />
          <text x={innerX + 10} y={otherY + 19} class="tag strong">{QWEN_SPEECH_UNCHANGED_STAGE_COUNT} {t('other stages · unchanged', '个其他 stage · 位置不变')}</text>
          {#each otherStages as stage, i}
            <text x={innerX + 10} y={otherY + 39 + i * 16} class="mono">{stage.stage}</text>
            <text x={innerX + innerW - 10} y={otherY + 39 + i * 16} text-anchor="end" class="tag">{device(stage.gpu)}</text>
          {/each}
        </g>

        {#if !panel.replica2 && phase === 0}
          <g data-spg="shared-speech">
            <rect x={innerX} y={rowY} width={innerW} height="119" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x={innerX + 10} y={rowY + 31} class="mono strong">talker_ar + code2wav</text>
            <text x={innerX + 10} y={rowY + 59} class="tag strong">{t('one shared process', '一个共用进程')}</text>
            <text x={innerX + 10} y={rowY + 86} class="tag">GPU 0</text>
          </g>
        {:else}
          {#each replicated as stage, i}
            {@const copiesHere = panel.replica2 ? copies(stage.stage) : [{ ...stage, replica: 0 }]}
            {#each copiesHere as copy, j}
              {@const x = innerX + j * (boxW + 10)}
              {@const y = rowY + i * 65}
              {@const added = panel.replica2 && j === 1}
              {@const moved = (!panel.replica2 && stage.stage === 'talker_ar') || (panel.replica2 && stage.stage === 'code2wav' && j === 0)}
              {@const changed = !panel.replica2 || added || moved}
              {@const visible = !panel.replica2 || (j === 0 ? phase >= 3 : stage.stage === 'talker_ar' ? phase >= 4 : phase >= 5)}
              <g data-spg="stage-copy" data-stage={stage.stage} data-copy={j + 1} data-panel={panel.replica2 ? 'replica2' : 'default'} opacity={visible ? 1 : 0} style="transition: opacity 300ms">
                <rect {x} {y} width={boxW} height="54" rx="9" fill={changed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={changed ? 'var(--gen)' : 'var(--accent)'} stroke-width="1.5" />
                <text x={x + 10} y={y + 17} class="mono strong">{stage.stage}</text>
                <text x={x + 10} y={y + 34} class="tag strong">{panel.replica2 ? t(`copy ${j + 1}`, `第 ${j + 1} 份`) : t('own process', '独立进程')}{added ? t(' · added', ' · 新增') : moved && panel.replica2 ? t(' · moved', ' · 换卡') : ''}</text>
                <text x={x + 10} y={y + 49} class="tag">{moved ? 'GPU 0 → GPU 1' : device(copy.gpu)}</text>
              </g>
            {/each}
          {/each}
        {/if}

        <text data-spg="process-count" data-panel={panel.replica2 ? 'replica2' : 'default'} x={panel.x + panel.w / 2} y={panel.y + panel.h - 38} text-anchor="middle" class="legend strong" opacity={!panel.replica2 || phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
          {#if panel.replica2}
            {phase >= 5 ? `${QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + 2 + 2 = ${QWEN_SPEECH_REPLICA2_COPY_COUNT}` : phase >= 4 ? `${QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + 2 + 1 = ${QWEN_SPEECH_DEFAULT_COPY_COUNT + 1}` : `${QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + 1 + 1 = ${QWEN_SPEECH_DEFAULT_COPY_COUNT}`} {t('processes', '个进程')}
          {:else}
            {phase === 0 ? `${QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + 1 = ${QWEN_SPEECH_DEFAULT_COPY_COUNT - 1}` : `${QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + 1 + 1 = ${QWEN_SPEECH_DEFAULT_COPY_COUNT}`} {t('processes', '个进程')}
          {/if}
        </text>
        <text data-spg="gpu-count" data-panel={panel.replica2 ? 'replica2' : 'default'} x={panel.x + panel.w / 2} y={panel.y + panel.h - 15} text-anchor="middle" class="formula" opacity={!panel.replica2 || phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
          {#if panel.replica2}
            {phase >= 4 ? QWEN_SPEECH_REPLICA2_GPU_COUNT : QWEN_SPEECH_DEFAULT_GPU_COUNT} {t('GPUs', '张 GPU')} · {t('ids', '编号')} {phase >= 4 ? QWEN_SPEECH_REPLICA2_GPU_IDS.join(', ') : QWEN_SPEECH_DEFAULT_GPU_IDS.join(', ')}
          {:else}
            {phase === 0 ? 1 : QWEN_SPEECH_DEFAULT_GPU_COUNT} {t(phase === 0 ? 'GPU' : 'GPUs', '张 GPU')} · {t(phase === 0 ? 'id' : 'ids', '编号')} {phase === 0 ? '0' : QWEN_SPEECH_DEFAULT_GPU_IDS.join(', ')}
          {/if}
        </text>
      {/each}
      <text x={W / 2} y={H - 25} text-anchor="middle" class="footnote">{phone ? t('Copied stages can run in parallel; thinker stays shared.', '副本 stage 可并行；thinker 仍共用。') : t('Two requests can use different copies of these two stages; both still share one thinker.', '两个请求可用这两个 stage 的不同副本；thinker 仍只有一份。')}</text>
      <text x={W / 2} y={H - 9} text-anchor="middle" class="footnote">{t('Next: what changes when stages share a process?', '下一步：两个 stage 共用进程会怎样？')}</text>
      {:else if step === 1}
      <defs>
        <marker id="group-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={phone ? 0 : 10} />
      <rect x={phone ? 15 : 30} y="12" width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 32 : 48} y="22" class="tag strong">{t('process boundary', '进程边界')}</text>
      <rect x={phone ? 150 : 255} y="12" width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 167 : 273} y="22" class="tag strong">{t('stage + scheduler', 'stage + scheduler')}</text>
      <text x={phone ? 15 : 30} y="44" class="tag">{phone ? t('2 of 7 stages · only boundaries change', '7 个中的 2 个 stage · 只改进程边界') : t('Two of the seven stages; only process boundaries change. GPU positions are not drawn.', '只画 7 个中的 2 个 stage，只改进程边界，不画 GPU 位置。')}</text>
      <text x={phone ? 15 : 30} y="64" class="tag">scheduler = {phone ? t('arranges stage work · GPUs omitted', '安排本 stage 的计算 · 不画 GPU') : t('arranges one stage’s computation work', '安排本 stage 的计算工作')}</text>

      {#each groupPanels as panel}
        {@const innerX = panel.x + 18}
        {@const innerW = panel.w - 36}
        {@const cardX = innerX + 15}
        {@const cardW = innerW - 30}
        {@const arrowX = cardX + cardW - 20}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={innerX} y={panel.y + 23} class="rowlabel">{panel.shared ? t('ONE SHARED PROCESS', '共用一个进程') : t('SEPARATE PROCESSES', '分开进程')}</text>
        <text x={innerX} y={panel.y + 43} class="tag">{t('same talker_ar → code2wav route', '相同的 talker_ar → code2wav 路线')}</text>

        {#if panel.shared}
          <g data-spg="shared-boundary" opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={innerX} y={panel.y + 58} width={innerW} height="190" rx="9" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="1.7" />
            <text x={innerX + 10} y={panel.y + 74} class="tag strong">process: talker_ar</text>
          </g>
        {:else}
          {#each replicated as stage, i}
            <g data-spg="separate-boundary" data-stage={stage.stage}>
              <rect x={innerX} y={panel.y + 58 + i * 108} width={innerW} height="82" rx="9" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="1.7" />
              <text x={innerX + 10} y={panel.y + 74 + i * 108} class="tag strong">process: {stage.stage}</text>
            </g>
          {/each}
        {/if}

        {#each replicated as stage, i}
          {@const y = panel.y + 80 + i * 108}
          <g data-spg="group-stage" data-stage={stage.stage} data-panel={panel.shared ? 'shared' : 'separate'} opacity={!panel.shared || phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={cardX} {y} width={cardW} height="45" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.4" />
            <text x={cardX + 12} y={y + 19} class="mono strong">{stage.stage}</text>
            <text x={cardX + 12} y={y + 36} class="tag">{t('stage + its scheduler', 'stage + 自己的 scheduler')}</text>
          </g>
        {/each}

        <g data-spg="handoff" data-panel={panel.shared ? 'shared' : 'separate'} opacity={panel.shared ? phase >= 3 ? 1 : 0 : phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <line x1={arrowX} y1={panel.y + 128} x2={arrowX} y2={panel.y + 181} stroke="var(--muted)" stroke-width="1.5" marker-end="url(#group-arrow)" />
          <text x={arrowX - 13} y={panel.y + 157} text-anchor="end" class="tag">{panel.shared ? t('local path available', '可用进程内路径') : t('between processes', '跨进程交接')}</text>
        </g>

        <text data-spg="stage-count" data-panel={panel.shared ? 'shared' : 'separate'} x={panel.x + panel.w / 2} y={panel.y + 270} text-anchor="middle" class="legend strong" opacity={!panel.shared || phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          {COLOCATED_SPEECH_STAGE_COUNT} {t('stages', '个 stage')} · {COLOCATED_SPEECH_SCHEDULER_COUNT} {t('schedulers', '个 scheduler')}
        </text>
        <text data-spg="group-process-count" data-panel={panel.shared ? 'shared' : 'separate'} x={panel.x + panel.w / 2} y={panel.y + 291} text-anchor="middle" class="formula" opacity={panel.shared ? phase >= 3 ? 1 : 0 : phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          {panel.shared ? COLOCATED_SPEECH_SHARED_PROCESS_COUNT : COLOCATED_SPEECH_SEPARATE_PROCESS_COUNT} {panel.shared ? t('process', '个进程') : t('processes', '个进程')}{panel.shared ? t(' · shared', ' · 共用') : ''}
        </text>
      {/each}
      <text data-spg="group-now" x={W / 2} y={phone ? 738 : 420} text-anchor="middle" class="tag strong">now: {[
        t('two stages keep their own schedulers', '两个 stage 各留一个 scheduler'),
        t('two processes · the hand-off crosses processes', '两个进程 · 交接跨过进程'),
        t('one shared boundary keeps both stages and schedulers', '一个共用边界仍装两个 stage 和 scheduler'),
        t('one process · the hand-off can stay inside', '一个进程 · 交接可留在内部'),
      ][phase]}</text>
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Grouping changes process boundaries, not the stage list.', '分组只改进程边界，stage 名单不变。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: how can one stage use more than one GPU?', '下一步：一个 stage 怎样用多张 GPU？')}</text>
      {:else}
      <defs>
        <marker id="tp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={phone ? 0 : 10} />
      <text x={phone ? 15 : 30} y="22" class="tag strong">TP = {t('processes computing one stage together', '多个进程一起做一个 stage 的活儿')}</text>
      <text x={phone ? 15 : 30} y="44" class="tag">tp_size = {t('cooperating process count for one stage', '一起做一个 stage 活儿的进程数')}</text>
      <rect x={phone ? 15 : 30} y="59" width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 32 : 48} y="69" class="tag strong">{t('process + GPU', '进程 + GPU')}</text>
      <rect x={phone ? 145 : 235} y="59" width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 162 : 253} y="69" class="tag strong">{t('stage + scheduler', 'stage + scheduler')}</text>

      {#each tpPanels as panel}
        {@const innerX = panel.x + 18}
        {@const innerW = panel.w - 36}
        {@const cardW = (innerW - 10) / 2}
        {@const centerX = panel.x + panel.w / 2}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={innerX} y={panel.y + 23} class="rowlabel">tp_size = {panel.tp ? TP_EXAMPLE_SIZE : 1} · gpu = {panel.tp ? '[0, 1]' : '0'}</text>
        <g data-spg="tp-request" data-panel={panel.tp ? 'tp2' : 'tp1'} opacity={!panel.tp || phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
          <rect x={centerX - 85} y={panel.y + 42} width="170" height="34" rx="9" fill="white" stroke="var(--line)" />
          <text x={centerX} y={panel.y + 64} text-anchor="middle" class="legend strong">{t('request A · same input', '同一个请求 A')}</text>
        </g>

        {#each (panel.tp ? TP_EXAMPLE_GPU_IDS : [0]) as gpu, j}
          {@const x = panel.tp ? innerX + j * (cardW + 10) : centerX - cardW / 2}
          {@const targetX = x + cardW / 2}
          {@const visible = !panel.tp || (j === 0 ? phase >= 2 : phase >= 3)}
          {#if !panel.tp || j === 0}
            <line data-spg="request-arrow" data-panel={panel.tp ? 'tp2' : 'tp1'} x1={centerX} y1={panel.y + 76} x2={targetX} y2={panel.y + 96} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#tp-arrow)" opacity={(panel.tp ? phase >= 4 : phase >= 1) ? 1 : 0} style="transition: opacity 300ms" />
          {/if}
          <g data-spg="tp-rank" data-rank={j} data-panel={panel.tp ? 'tp2' : 'tp1'} opacity={visible ? 1 : 0} style="transition: opacity 300ms">
            <rect {x} y={panel.y + 100} width={cardW} height="120" rx="9" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="1.6" />
            <text x={x + 8} y={panel.y + 119} class="tag strong">{t('process', '进程')} {j + 1} · GPU {gpu}</text>
            <rect x={x + 7} y={panel.y + 130} width={cardW - 14} height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.3" />
            <text x={x + 14} y={panel.y + 149} class="mono strong">thinker</text>
            <text x={x + 14} y={panel.y + 167} class="tag">{t('stage + scheduler', 'stage + scheduler')}</text>
            <text data-spg="rank-request" data-panel={panel.tp ? 'tp2' : 'tp1'} x={x + 8} y={panel.y + 203} class="tag strong" opacity={(panel.tp ? phase >= 4 : phase >= 1) ? 1 : 0} style="transition: opacity 300ms">{t('request A', '请求 A')}</text>
          </g>
        {/each}

        {#if panel.tp}
          <g data-spg="tp-cooperation" opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <line x1={innerX + cardW / 2} y1={panel.y + 220} x2={innerX + cardW / 2} y2={panel.y + 230} stroke="var(--muted)" />
            <line x1={innerX + cardW / 2} y1={panel.y + 230} x2={innerX + cardW + 10 + cardW / 2} y2={panel.y + 230} stroke="var(--muted)" marker-end="url(#tp-arrow)" />
            <line x1={innerX + cardW + 10 + cardW / 2} y1={panel.y + 220} x2={innerX + cardW + 10 + cardW / 2} y2={panel.y + 230} stroke="var(--muted)" />
          </g>
        {/if}
        <text data-spg="tp-status" data-panel={panel.tp ? 'tp2' : 'tp1'} x={centerX} y={panel.y + 250} text-anchor="middle" class="tag strong" opacity={!panel.tp || phase >= 2 ? 1 : 0} style="transition: opacity 300ms">{panel.tp ? phase >= 4 ? t('process 1 shares work · both processes compute', '进程 1 分活 · 两个进程一起算') : phase >= 3 ? t('both processes ready · no request yet', '两个进程就绪 · 请求尚未进入') : t('process 1 ready · no request yet', '进程 1 就绪 · 请求尚未进入') : phase >= 1 ? t('same request · one process computes', '同一个请求 · 一个进程算') : t('one process on GPU 0', '一个进程在 GPU 0 上')}</text>
        <text data-spg="tp-count" data-panel={panel.tp ? 'tp2' : 'tp1'} x={centerX} y={panel.y + 274} text-anchor="middle" class="legend strong" opacity={panel.tp ? phase >= 4 ? 1 : 0 : phase >= 1 ? 1 : 0} style="transition: opacity 300ms">{panel.tp ? t(`${TP_EXAMPLE_STAGE_COUNT} stage · ${TP_EXAMPLE_PROCESS_COUNT} processes · ${TP_EXAMPLE_GPU_COUNT} GPUs`, `${TP_EXAMPLE_STAGE_COUNT} 个 stage · ${TP_EXAMPLE_PROCESS_COUNT} 个进程 · ${TP_EXAMPLE_GPU_COUNT} 张 GPU`) : t('1 stage · 1 process · 1 GPU', '1 个 stage · 1 个进程 · 1 张 GPU')}</text>
      {/each}
      <text data-spg="tp-now" x={W / 2} y={phone ? 730 : 435} text-anchor="middle" class="tag strong">now: {[
        t('tp_size = 1 forms one process on GPU 0', 'tp_size = 1 形成 GPU 0 上的一个进程'),
        t('request A enters that one process', '请求 A 进入这个进程'),
        t('tp_size = 2 forms process 1 on GPU 0', 'tp_size = 2 先形成 GPU 0 上的进程 1'),
        t('process 2 forms on GPU 1; no request has entered', '进程 2 在 GPU 1 上形成；请求尚未进入'),
        t('request A enters process 1; both processes compute', '请求 A 进入进程 1，两个进程一起算'),
      ][phase]}</text>
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Same request on every GPU; not different request copies.', '每张 GPU 都算同一个请求，不是各算不同请求。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: Step 1 made copies; which copy takes a request?', '下一步：第 1 步有多份进程，请求该去哪一份？')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .formula { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .legend.strong { font-weight: 650; }
</style>
