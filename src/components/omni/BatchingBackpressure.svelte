<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    BATCH_WAIT_MAX_SIZE,
    BATCH_WAIT_READY_IDS,
    BATCH_WAIT_LATE_ID,
    BATCH_WAIT_LATE_MS,
    BATCH_WAIT_ACTIVE_MS,
    BATCH_WAIT_ADDED_MS,
    BATCH_WAIT_EMPTY_SLOTS,
    AR_TEACHING_MAX_RUNNING,
    AR_ROUND_ONE_RUNNING_IDS,
    AR_ROUND_ONE_WAITING_IDS,
    AR_ROUND_TWO_RUNNING_IDS,
    AR_ROUND_ONE_WAITING_COUNT,
    REFERENCE_ENCODER_DEFAULT_MAX_BATCH,
    REFERENCE_ENCODER_DEFAULT_WAIT_MS,
    REFERENCE_ENCODER_TEACHING_MAX_BATCH,
    REFERENCE_ENCODER_READY_IDS,
    REFERENCE_ENCODER_LATE_ID,
    REFERENCE_ENCODER_FIRST_BATCH_COUNT,
    REFERENCE_ENCODER_EMPTY_SLOTS,
    AUDIO_BATCH_MAX_SIZE,
    AUDIO_BATCH_WAIT_MS,
    AUDIO_MAX_MEL_FRAMES,
    AUDIO_FULL_CHUNK_MEL_FRAMES,
    AUDIO_FULL_CHUNK_COUNT,
    AUDIO_A_MEL_FRAMES,
    AUDIO_B_MEL_FRAMES,
    AUDIO_C_MEL_FRAMES,
    AUDIO_AB_MEL_FRAMES,
    AUDIO_ABC_MEL_FRAMES,
    AUDIO_REMAINING_MEL_FRAMES,
    AUDIO_OVERFLOW_MEL_FRAMES,
    CODE2WAV_MAX_BATCH_SIZE,
    CODE2WAV_BATCH_WAIT_MS,
    CODE2WAV_BATCH_WAIT_WHEN_IDLE,
    STREAM_TEACHING_IDS,
    STREAM_TEACHING_INPUT_COUNT,
    STREAM_TEACHING_SHARED_STEPS,
    STREAM_TEACHING_OUTPUT_COUNT,
    H200_FIFO_BATCH_SMALL,
    H200_FIFO_BATCH_LARGE,
    H200_FIFO_SMALL_REQUESTS_PER_S,
    H200_FIFO_LARGE_REQUESTS_PER_S,
    H200_FIFO_REQUEST_COUNT,
    H200_FIFO_CLIENT_CONCURRENCY,
    H200_FIFO_WAIT_MS,
    H200_FIFO_WARMUP_REQUESTS,
    H200_FIFO_REPEATS,
    H200_FIFO_EXTRA_REQUESTS_PER_S,
    H200_FIFO_SPEEDUP_PERCENT,
    H200_FIFO_BAR_MAX,
    ADMISSION_TEACHING_LIMIT,
    ADMISSION_ACTIVE_IDS,
    ADMISSION_NEW_ID,
    ADMISSION_ACTIVE_COUNT,
    ADMISSION_NEW_COUNT,
    ADMISSION_FREE_PERMITS,
    ADMISSION_ROUTER_STATUS,
    ADMISSION_COORDINATOR_STATUS,
    RELAY_TEACHING_FRAME_COUNT,
    RELAY_DELIVERED_FRAME_COUNT,
    RELAY_UPSTREAM_FRAME_COUNT,
    RELAY_POLL_COUNT,
    RELAY_MAX_FRAMES_PER_POLL,
    RELAY_ADAPTER_QUEUE_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A and B are already queued, but C arrives later. A five-ms collection budget delays A and B by five ms.',
    captionZh: 'A、B 已在队列，C 还没到。若为凑批等 5 ms，A、B 就晚 5 ms 开始计算。',
  }, {
    caption: 'A stays in the running batch until it finishes. C takes that row only after A finishes.',
    captionZh: 'A 没结束，下一轮仍留在 running batch。A 结束后，C 才补进空出的这一行。',
  }, {
    caption: 'A, B and C are already queued, so one encoder call takes all three. D arrives too late for this call.',
    captionZh: 'A、B、C 都已在队列，一次 encoder 调用就带走三条。D 到得晚，只能等下一次。',
  }, {
    caption: 'A and B use 21,000 frames. C crosses the 24,000-frame budget, so it waits despite free slots.',
    captionZh: 'A、B 已占 21000 帧，C 会超过 24000 帧预算。条数没满，C 也等下一批。',
  }, {
    caption: 'The left collects whole requests. The right stores each stream\'s chunk before one shared step.',
    captionZh: '左边收完整请求，右边先存各人的 chunk。两边都能合算，消息路径却不同。',
  }, {
    caption: 'In this H200 test, B8 throughput is 38% higher. That result does not promise a win elsewhere.',
    captionZh: '这组 H200 实验里，B8 吞吐高约 38%。它只说明当时条件，不保证别处更快。',
  }, {
    caption: 'Both limits are full, so C gets an immediate error. Router admission returns 429; a full coordinator returns 503.',
    captionZh: '两处容量都满，C 会立刻收到错误。Router 拒绝是 429；coordinator 满了是 503。',
  }, {
    caption: 'While active, each downstream poll triggers one upstream poll. A poll returns at most one frame; this adapter adds no queue.',
    captionZh: '传输中，下游 poll 会转成一次上游 poll。每次最多交出一帧，中间转接框不排队。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const PHASE_COUNTS = [5, 4, 5, 3, 6, 4, 5, 5];
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = PHASE_COUNTS[s];
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 2 ? 610 : step === 4 || step === 6 ? 820 : step === 5 || step === 7 ? 700 : 680) : step === 2 ? 460 : step >= 4 ? 500 : step > 0 ? 450 : 410);
  const panels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, wait: 0 },
    { x: phone ? 15 : 375, y: phone ? 330 : 86, wait: BATCH_WAIT_ACTIVE_MS },
  ]);
  const arPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, title: t('ROUND 1 · A and B unfinished', '第 1 轮 · A、B 未完成'), running: AR_ROUND_ONE_RUNNING_IDS, waiting: AR_ROUND_ONE_WAITING_IDS },
    { x: phone ? 15 : 375, y: phone ? 340 : 86, title: t('ROUND 2 · A finished', '第 2 轮 · A 已结束'), running: AR_ROUND_TWO_RUNNING_IDS, waiting: [] },
  ]);
  const costPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, accepted: true, title: t('THIS BATCH · A + B fit', '这一批 · A + B 装得下') },
    { x: phone ? 15 : 375, y: phone ? 330 : 86, accepted: false, title: t('TRY ADDING C · over budget', '试着加入 C · 超出预算') },
  ]);
  const streamPaths = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 92, kind: 'batch', title: t('MiniCPM-o Code2Wav · whole requests', 'MiniCPM-o Code2Wav · 完整请求') },
    { x: phone ? 15 : 375, y: phone ? 400 : 92, kind: 'stream', title: t('StreamingVocoderBase · opt-in coalescing', 'StreamingVocoderBase · 可选跨请求合步') },
  ]);
  const h200Bars = $derived([
    { batch: H200_FIFO_BATCH_SMALL, value: H200_FIFO_SMALL_REQUESTS_PER_S, x: phone ? 55 : 100 },
    { batch: H200_FIFO_BATCH_LARGE, value: H200_FIFO_LARGE_REQUESTS_PER_S, x: phone ? 185 : 290 },
  ].map((bar) => {
    const height = (phone ? 180 : 190) * bar.value / H200_FIFO_BAR_MAX;
    return { ...bar, height, y: (phone ? 320 : 330) - height };
  }));
  const admissionPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 92, kind: 'router', title: t('ROUTER · before worker dispatch', 'ROUTER · 发往 worker 之前') },
    { x: phone ? 15 : 375, y: phone ? 400 : 92, kind: 'coordinator', title: t('COORDINATOR · before pipeline submit', 'COORDINATOR · 交给 pipeline 之前') },
  ]);
  const relayNodes = $derived([
    { title: 'WORKER', subtitle: 'reqwest::Body', detail: t(`${RELAY_UPSTREAM_FRAME_COUNT} frames still upstream`, `${RELAY_UPSTREAM_FRAME_COUNT} 帧仍在上游`) },
    { title: 'ROUTER', subtitle: 'DirectResponseBody', detail: t(`own app queue = ${RELAY_ADAPTER_QUEUE_COUNT}`, `自己的应用队列 = ${RELAY_ADAPTER_QUEUE_COUNT}`) },
    { title: 'CLIENT', subtitle: t('downstream consumer', '下游消费者'), detail: t(`frame ${RELAY_DELIVERED_FRAME_COUNT} delivered`, `已收到第 ${RELAY_DELIVERED_FRAME_COUNT} 帧`) },
  ].map((node, index) => ({
    ...node,
    x: phone ? 30 : 20 + index * 245,
    y: phone ? 100 + index * 160 : 130,
  })));
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('The same queued requests start immediately with zero collection delay, or five milliseconds later with a five-millisecond batching budget.', '同一批已排队请求，在零收集等待时立即开始，在 5 毫秒凑批预算下晚 5 毫秒开始。')}>
      <LoopProgress ms={lapMs} {lap} x={phone ? 221 : 640} y={phone ? 70 : 20} />
      <defs>
        <marker id="batch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
        <marker id="batch-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
      <text x={phone ? 15 : 20} y="20" class="tag strong">SimpleScheduler.collect_batch · {phone ? t('same arrivals', '两幅图使用相同到达顺序') : t('same arrivals in both panels', '两幅图使用相同到达顺序')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">max_batch_size = {BATCH_WAIT_MAX_SIZE} · {BATCH_WAIT_READY_IDS.join('、')} @ 0 ms · {BATCH_WAIT_LATE_ID} @ {BATCH_WAIT_LATE_MS} ms</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: queued work · orange: extra collection wait', '蓝色：已排队的工作 · 橙色：额外的凑批等待')}</text>

      {#each panels as panel}
        {@const delayed = panel.wait > 0}
        {@const started = delayed ? phase >= 3 : phase >= 1}
        {@const cursorMs = delayed && phase >= 2 ? BATCH_WAIT_ACTIVE_MS : 0}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="222" rx="12" fill="var(--bg)" stroke={delayed ? 'var(--gen)' : 'var(--accent)'} stroke-width={delayed ? 1 : 2} />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">max_batch_wait_ms = {panel.wait}</text>
        <text x={panel.x + 14} y={panel.y + 48} class="tag">{started ? t('collected batch slots', '已经收集的 batch 位置') : t('batch slots when collection starts', '开始收集时的 batch 空位')}</text>
        {#each Array(BATCH_WAIT_MAX_SIZE) as _, i}
          <rect x={panel.x + 16 + i * (phone ? 58 : 68)} y={panel.y + 61} width={phone ? 48 : 56} height="36" rx="6" fill={i < BATCH_WAIT_READY_IDS.length ? 'var(--accent-soft)' : 'white'} stroke={i < BATCH_WAIT_READY_IDS.length ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={i < BATCH_WAIT_READY_IDS.length ? '0' : '4 3'} opacity={started || delayed ? 1 : 0.55} />
          <text x={panel.x + (phone ? 40 : 44) + i * (phone ? 58 : 68)} y={panel.y + 84} text-anchor="middle" class="mono strong" opacity={started || delayed ? 1 : 0.55}>{BATCH_WAIT_READY_IDS[i] ?? '·'}</text>
        {/each}
        <text x={panel.x + 14} y={panel.y + 120} class="tag">{BATCH_WAIT_READY_IDS.length} {t('ready', '份现成工作')} + {BATCH_WAIT_EMPTY_SLOTS} {t('empty slots', '个空位')}</text>
        <rect x={panel.x + 16} y={panel.y + 133} width={phone ? 238 : 293} height="32" rx="6" fill={started || delayed ? (delayed && !started ? 'var(--gen-soft)' : 'var(--accent-soft)') : 'white'} stroke={started || !delayed ? 'var(--accent)' : 'var(--gen)'} stroke-dasharray={started || delayed ? '0' : '4 3'} />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 154} text-anchor="middle" class="tag strong">{started ? (delayed ? t('deadline: take A + B at 5 ms', '到 5 ms：拿走 A + B') : t('take A + B now · no empty-slot wait', '现在拿走 A + B · 不为空位等待')) : (delayed ? t(`waiting for more work: ${cursorMs} / 5 ms`, `继续等更多工作：${cursorMs} / 5 ms`) : t('A + B ready · collection not run', 'A + B 已就绪 · 尚未收集'))}</text>
        <path d="M{panel.x + 18} {panel.y + 187} H{panel.x + (phone ? 250 : 305)}" stroke="var(--line)" stroke-width="2" />
        {#if phase >= 4}
          <path d="M{panel.x + 18 + (BATCH_WAIT_LATE_MS / 10) * (phone ? 232 : 287)} {panel.y + 176} V{panel.y + 197}" stroke="var(--gen)" stroke-width="2" />
          <text x={panel.x + 18 + (BATCH_WAIT_LATE_MS / 10) * (phone ? 232 : 287)} y={panel.y + 176} text-anchor="middle" class="tag">{BATCH_WAIT_LATE_ID}</text>
        {/if}
        <text x={panel.x + 18} y={panel.y + 207} class="tag">0 ms</text>
        <text x={panel.x + (phone ? 250 : 305)} y={panel.y + 207} text-anchor="end" class="tag">10 ms</text>
        <circle cx={panel.x + 18 + (cursorMs / 10) * (phone ? 232 : 287)} cy={panel.y + 187} r="6" fill={started ? 'var(--accent)' : delayed ? 'var(--gen)' : 'var(--faint)'} />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 219} text-anchor="middle" class="tag strong">{started ? `${t('compute starts at', '开始计算')} ${panel.wait} ms` : t('compute not started', '尚未开始计算')}</text>
      {/each}

      <text x={W / 2} y={phone ? 586 : 340} text-anchor="middle" class="mono strong">{BATCH_WAIT_ACTIVE_MS} ms − 0 ms = {BATCH_WAIT_ADDED_MS} ms {t('later for A and B', 'A、B 更晚开始')}</text>
      <text x={W / 2} y={phone ? 612 : 362} text-anchor="middle" class="tag">{phase >= 4 ? (phone ? t('C arrives at 6 ms and misses both; compute time omitted.', 'C 在 6 ms 才到，两次收集都没赶上；图中不画计算耗时。') : t('C arrives at 6 ms, so it misses both collections; compute time is omitted.', 'C 在 6 ms 才到，两次收集都没赶上；图中不画计算耗时。')) : t('C has not arrived yet', 'C 尚未到达')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('5 ms is a teaching comparison, not a recommendation.', '5 ms 只是教学对照，不是推荐配置。') : t('The five-ms budget is a teaching counterfactual, not a recommended setting.', '5 ms 只是教学对照，不是推荐配置。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: AR batches keep running as requests join and leave.', '下一步：AR batch 怎样在请求加入和退出时继续运行。') : t('Next: an AR batch can keep running while requests join and leave.', '下一步：AR batch 怎样在请求加入和退出时继续运行。')}</text>
      {:else if step === 1}
      <text x={phone ? 15 : 20} y="20" class="tag strong">running batch = {t('unfinished requests advancing together', '未完成请求一起逐步前进')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{phone ? t(`max_running_requests = ${AR_TEACHING_MAX_RUNNING} · memory must fit`, `教学上限 · max_running_requests = ${AR_TEACHING_MAX_RUNNING} · 显存也必须放得下`) : t(`Teaching cap · max_running_requests = ${AR_TEACHING_MAX_RUNNING} · memory must also fit`, `教学上限 · max_running_requests = ${AR_TEACHING_MAX_RUNNING} · 显存也必须放得下`)}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: running row · orange: waiting request · grey: finished', '蓝色：运行中的行 · 橙色：等待请求 · 灰色：已结束')}</text>
      {#each arPanels as panel, round}
        {@const later = round === 1}
        {@const joined = later && phase >= 2}
        {@const finished = !later && phase >= 1}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="230" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{later ? (joined ? panel.title : t('ROUND 2 · not started', '第 2 轮 · 尚未开始')) : (finished ? t('ROUND 1 · A finished', '第 1 轮 · A 已结束') : panel.title)}</text>
        <text x={panel.x + 14} y={panel.y + 52} class="tag strong">running_batch</text>
        {#if !later || joined}
          {#each panel.running as id, i}
            {@const isFinishedA = finished && id === 'A'}
            <rect x={panel.x + 16 + i * (phone ? 119 : 143)} y={panel.y + 65} width={phone ? 107 : 128} height="48" rx="7" fill={isFinishedA ? 'var(--line)' : 'var(--accent-soft)'} stroke={isFinishedA ? 'var(--faint)' : 'var(--accent)'} />
            <text x={panel.x + (phone ? 69 : 80) + i * (phone ? 119 : 143)} y={panel.y + 95} text-anchor="middle" class="mono strong">{id} · {isFinishedA ? t('finished', '已结束') : t('next token', '下一 token')}</text>
          {/each}
        {:else}
          {#each Array(AR_TEACHING_MAX_RUNNING) as _, i}
            <rect x={panel.x + 16 + i * (phone ? 119 : 143)} y={panel.y + 65} width={phone ? 107 : 128} height="48" rx="7" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
            <text x={panel.x + (phone ? 69 : 80) + i * (phone ? 119 : 143)} y={panel.y + 95} text-anchor="middle" class="tag">·</text>
          {/each}
        {/if}
        <text x={panel.x + 14} y={panel.y + 140} class="tag strong">waiting_queue</text>
        {#if !later && phase < 2}
          <rect x={panel.x + 16} y={panel.y + 152} width={phone ? 107 : 128} height="42" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={panel.x + (phone ? 69 : 80)} y={panel.y + 179} text-anchor="middle" class="mono strong">C · {t('waits', '等待')}</text>
          <text x={panel.x + (phone ? 139 : 163)} y={panel.y + 179} class="tag">{AR_ROUND_ONE_WAITING_COUNT} {t('request · no free row', '条请求 · 没有空行')}</text>
        {:else}
          <rect x={panel.x + 16} y={panel.y + 152} width={phone ? 238 : 293} height="42" rx="7" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
          <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 179} text-anchor="middle" class="tag">{later && !joined ? t('waiting for round 1', '等待第 1 轮结束') : t('empty · C has joined the running batch', '空了 · C 已补进 running batch')}</text>
        {/if}
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 216} text-anchor="middle" class="tag strong">{later ? (phase >= 3 ? t('B and C each advance one token', 'B、C 各自前进一个 token') : joined ? t("C takes A's old row", 'C 补进 A 空出的行') : t('no free row yet', '还没有空行')) : (finished ? t('A finished · one row free', 'A 结束 · 空出一行') : t('A and B each advance one token', 'A、B 各自前进一个 token'))}</text>
      {/each}
      {#if !phone}
        <path d="M348 200 H371" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" opacity={phase >= 2 ? 1 : 0.15} />
      {/if}
      <text x={W / 2} y={phone ? 600 : 350} text-anchor="middle" class="mono strong">A {t('finished', '结束')} → 1 {t('free row', '空行')} → C {t('joins if memory allows', '在显存允许时补入')}</text>
      <text x={W / 2} y={phone ? 626 : 372} text-anchor="middle" class="tag">{phone ? t('policy builds limits · OmniScheduler schedules', 'policy 构造并校验上限 · OmniScheduler 调度') : t('generation_batch_policy.py builds and validates limits; OmniScheduler schedules', 'generation_batch_policy.py 构造并校验上限；OmniScheduler 执行调度')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Two rows are illustrative; request/token budgets apply.', '两行只是教学视角；请求行数和 token 预算都能阻止补入。') : t('Two rows are a teaching view; request and token budgets can both block admission.', '两行只是教学视角；请求行数和 token 预算都能阻止补入。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: an encoder collects only ready work.', '下一步：encoder 只收现成的编码请求。') : t('Next: a one-shot encoder drains ready work without keeping a running batch.', '下一步：一次性 encoder 怎样收集现成工作，而不保留 running batch。')}</text>
      {:else if step === 2}
      <text x={phone ? 15 : 20} y="20" class="tag strong">ReferenceEncodeService · {phone ? t('collect ready work', '从就绪队列做一次收集') : t('one collection from the ready queue', '从就绪队列做一次收集')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{phone ? t('defaults: cap 1 · wait 0 ms', '默认值：上限 1 · 等待 0 ms') : `max_batch_size = ${REFERENCE_ENCODER_DEFAULT_MAX_BATCH} · max_batch_wait_ms = ${REFERENCE_ENCODER_DEFAULT_WAIT_MS}`}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Teaching view: cap 4 + batch-capable hook + wait 0 ms', '教学视角：上限 4 + 支持批处理的 hook + 等待 0 ms')}</text>

      <rect x={phone ? 15 : 20} y={phone ? 88 : 94} width={phone ? 270 : 680} height="76" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 29 : 34} y={phone ? 112 : 118} class="rowlabel">batch_queue · {t('before collection', '收集前')}</text>
      {#each REFERENCE_ENCODER_READY_IDS as id, i}
        <rect x={(phone ? 29 : 260) + i * 58} y={phone ? 124 : 108} width="46" height="32" rx="5" fill="white" stroke="var(--accent)" />
        <text x={(phone ? 52 : 283) + i * 58} y={phone ? 145 : 129} text-anchor="middle" class="mono strong">{id}</text>
      {/each}
      <text x={phone ? 222 : 480} y={phone ? 145 : 129} class="tag">{t('3 ready now', '现有 3 条')}</text>
      <text x={phone ? 29 : 590} y={phone ? 145 : 129} class="tag">{phone ? '' : t('D is not here yet', 'D 尚未到达')}</text>

      <path d={phone ? 'M150 172 V196' : 'M360 178 V204'} stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
      <text x={phone ? 162 : 374} y={phone ? 188 : 196} class="tag strong">get_nowait() · {phone ? t('no slot wait', '不为空位等待') : t('no empty-slot wait', '不为空位等待')}</text>

      <rect x={phone ? 15 : 20} y={phone ? 204 : 214} width={phone ? 270 : 680} height="90" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 29 : 34} y={phone ? 228 : 238} class="rowlabel">encode_batch([A, B, C]) · {t('one call', '一次调用')}</text>
      {#each Array(REFERENCE_ENCODER_TEACHING_MAX_BATCH) as _, i}
        <rect x={(phone ? 29 : 300) + i * (phone ? 58 : 68)} y={phone ? 241 : 231} width={phone ? 46 : 56} height="38" rx="6" fill={i < REFERENCE_ENCODER_FIRST_BATCH_COUNT ? 'white' : 'var(--bg)'} stroke={i < REFERENCE_ENCODER_FIRST_BATCH_COUNT ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={i < REFERENCE_ENCODER_FIRST_BATCH_COUNT ? '0' : '4 3'} />
        <text x={(phone ? 52 : 328) + i * (phone ? 58 : 68)} y={phone ? 265 : 255} text-anchor="middle" class="mono strong">{REFERENCE_ENCODER_READY_IDS[i] ?? '·'}</text>
      {/each}
      <text x={phone ? 150 : 510} y={phone ? 288 : 278} text-anchor="middle" class="tag">{REFERENCE_ENCODER_FIRST_BATCH_COUNT} {t('taken', '条入批')} · {REFERENCE_ENCODER_EMPTY_SLOTS} {t('left empty', '格留空')}</text>

      <rect x={phone ? 15 : 20} y={phone ? 316 : 326} width={phone ? 270 : 325} height={phone ? 90 : 52} rx="8" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 29 : 34} y={phone ? 340 : 347} class="tag strong">{t('same three results return', '同三条结果逐项返回')}</text>
      <text x={phone ? 29 : 34} y={phone ? 364 : 368} class="tag">A.result · B.result · C.result</text>
      <text x={phone ? 29 : 34} y={phone ? 390 : 368} class="tag">{phone ? t('cap > 1 alone is not enough', '只调大上限还不够') : ''}</text>

      <rect x={phone ? 15 : 375} y={phone ? 424 : 326} width={phone ? 270 : 325} height={phone ? 90 : 52} rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 29 : 389} y={phone ? 448 : 347} class="tag strong">{t('D arrives after collection', 'D 在收集结束后才到')}</text>
      <text x={phone ? 29 : 389} y={phone ? 472 : 368} class="tag">{REFERENCE_ENCODER_LATE_ID} → {t('next collection, not this batch', '下一次收集，不进这一批')}</text>
      <text x={phone ? 29 : 389} y={phone ? 498 : 368} class="tag">{phone ? t('hook.can_encode_batch() must also pass', 'hook.can_encode_batch() 也必须通过') : ''}</text>

      <text x={W / 2} y={phone ? 544 : 404} text-anchor="middle" class="tag strong">{phone ? t('Default: one per call · batching needs hook support', '默认一次一条；batch 还需要 hook 支持') : t('Three results need three encode calls with the shipped cap of one; batching also requires hook support.', '出厂上限为 1 时，三条结果要三次 encode；启用 batch 还需要 hook 支持。')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Ready work only · no retained AR running batch', '这个服务只取现成请求，不保留 AR 的 running batch。') : t('This service drains ready requests; it does not retain an AR running batch.', '这个服务只取现成请求，不保留 AR 的 running batch。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: cost budgets can defer large requests.', '下一步：成本预算怎样把大请求留给下一批。') : t('Next: a cost budget can leave a large request for the next batch.', '下一步：成本预算怎样把大请求留给下一批。')}</text>
      {:else if step === 3}
      <text x={phone ? 15 : 20} y="20" class="tag strong">SimpleScheduler · max_batch_cost = {phone ? t('second limit', '条数之外的第二个上限') : t('a second limit beside request count', '条数之外的第二个上限')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{phone ? t('MiniCPM-o audio: cap 8 · wait 0 ms', 'MiniCPM-o 音频：上限 8 条 · 等待 0 ms') : `MiniCPM-o audio_encoder · max_batch_size = ${AUDIO_BATCH_MAX_SIZE} · max_batch_wait_ms = ${AUDIO_BATCH_WAIT_MS}`}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">max_batch_mel_frames = {AUDIO_MAX_MEL_FRAMES} · {phone ? t('mel = sound column', 'mel 帧 = 一小格声音特征') : t('mel frame = one small sound column', 'mel 帧 = 一小格声音特征')}</text>
      {#each costPanels as panel}
        {@const barW = phone ? 238 : 280}
        {@const scale = AUDIO_ABC_MEL_FRAMES}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="222" rx="12" fill="var(--bg)" stroke={panel.accepted ? 'var(--accent)' : 'var(--gen)'} stroke-width={panel.accepted ? 2 : 1} />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 49} class="tag">{panel.accepted ? t('2 / 8 request slots used', '用了 2 / 8 个请求位置') : t('3 ≤ 8 · request count still fits', '3 ≤ 8 · 条数仍然装得下')}</text>
        <rect x={panel.x + 16} y={panel.y + 65} width={barW * AUDIO_A_MEL_FRAMES / scale} height="46" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
        <rect x={panel.x + 16 + barW * AUDIO_A_MEL_FRAMES / scale} y={panel.y + 65} width={barW * AUDIO_B_MEL_FRAMES / scale} height="46" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
        {#if !panel.accepted}
          <rect x={panel.x + 16 + barW * AUDIO_AB_MEL_FRAMES / scale} y={panel.y + 65} width={barW * AUDIO_C_MEL_FRAMES / scale} height="46" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
        {:else}
          <rect x={panel.x + 16 + barW * AUDIO_AB_MEL_FRAMES / scale} y={panel.y + 65} width={barW * AUDIO_REMAINING_MEL_FRAMES / scale} height="46" rx="3" fill="white" stroke="var(--faint)" stroke-dasharray="3 3" />
          <text x={panel.x + 16} y={panel.y + 137} class="tag">{AUDIO_REMAINING_MEL_FRAMES} {t('frames left', '帧剩余')}</text>
        {/if}
        <path d="M{panel.x + 16 + barW * AUDIO_MAX_MEL_FRAMES / scale} {panel.y + 58} V{panel.y + 120}" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
        <text x={panel.x + 16 + barW * AUDIO_MAX_MEL_FRAMES / scale} y={panel.y + 137} text-anchor="middle" class="tag strong">{AUDIO_MAX_MEL_FRAMES} {t('limit', '上限')}</text>
        <text x={panel.x + 16 + barW * AUDIO_A_MEL_FRAMES / scale / 2} y={panel.y + 94} text-anchor="middle" class="mono strong">A · {AUDIO_A_MEL_FRAMES}</text>
        <text x={panel.x + 16 + barW * (AUDIO_A_MEL_FRAMES + AUDIO_B_MEL_FRAMES / 2) / scale} y={panel.y + 94} text-anchor="middle" class="mono strong">B · {AUDIO_B_MEL_FRAMES}</text>
        {#if !panel.accepted}
          <text x={panel.x + 16 + barW * (AUDIO_AB_MEL_FRAMES + AUDIO_C_MEL_FRAMES / 2) / scale} y={panel.y + 94} text-anchor="middle" class="mono strong">C · {AUDIO_C_MEL_FRAMES}</text>
        {/if}
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 169} text-anchor="middle" class="mono strong">{panel.accepted ? `${AUDIO_A_MEL_FRAMES} + ${AUDIO_B_MEL_FRAMES} = ${AUDIO_AB_MEL_FRAMES}` : `${AUDIO_AB_MEL_FRAMES} + ${AUDIO_C_MEL_FRAMES} = ${AUDIO_ABC_MEL_FRAMES}`}</text>
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 198} text-anchor="middle" class="tag strong">{panel.accepted ? t(`collect A + B · ${AUDIO_REMAINING_MEL_FRAMES} frames left`, `收集 A + B · 还剩 ${AUDIO_REMAINING_MEL_FRAMES} 帧`) : t('keep C in pending_messages · stop', 'C 留回 pending_messages · 停止收集')}</text>
      {/each}
      <text x={W / 2} y={phone ? 586 : 340} text-anchor="middle" class="mono strong">{AUDIO_ABC_MEL_FRAMES} − {AUDIO_MAX_MEL_FRAMES} = {AUDIO_OVERFLOW_MEL_FRAMES} {t('frames too many', '帧超出')}</text>
      <text x={W / 2} y={phone ? 612 : 366} text-anchor="middle" class="tag">{AUDIO_FULL_CHUNK_COUNT} × {AUDIO_FULL_CHUNK_MEL_FRAMES} = {AUDIO_MAX_MEL_FRAMES} · {phone ? t('eight full 30-s chunks fit', '真实预算可容纳八段完整的 30 秒音频') : t('the real budget admits eight full 30-second chunks', '真实预算可容纳八段完整的 30 秒音频')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Teaching costs, not a benchmark: 15000 + 6000 + 6000', 'A、B、C 是教学成本；15000 + 6000 + 6000 不是实测数据。') : t('A, B and C use teaching costs; 15,000 + 6,000 + 6,000 is not a benchmark.', 'A、B、C 是教学成本；15000 + 6000 + 6000 不是实测数据。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: streaming chunks use a different batch path.', '下一步：流式 chunk 需要不同于一次性请求的成批路径。') : t('Next: streaming chunks need a different batch path from one-shot requests.', '下一步：流式 chunk 需要不同于一次性请求的成批路径。')}</text>
      {:else if step === 4}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{phone ? t('Two compute-sharing paths · keep them separate', '两种共享计算的路径 · 不要混成同一段代码') : t('Two ways to share compute · do not merge these code paths', '两种共享计算的路径 · 不要混成同一段代码')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">stream_chunk = {t('one small arriving piece of a request', '一条请求陆续到达的一小段')}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: scheduler / stream state · orange: one shared compute', '蓝色：调度器或流状态 · 橙色：一次共享计算')}</text>
      {#each streamPaths as panel}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="290" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 49} class="tag">{panel.kind === 'batch' ? (phone ? t(`cap ${CODE2WAV_MAX_BATCH_SIZE} · wait ${CODE2WAV_BATCH_WAIT_MS} ms · idle ${CODE2WAV_BATCH_WAIT_WHEN_IDLE}`, `上限 ${CODE2WAV_MAX_BATCH_SIZE} · 等待 ${CODE2WAV_BATCH_WAIT_MS} ms · idle ${CODE2WAV_BATCH_WAIT_WHEN_IDLE}`) : `max_batch_size = ${CODE2WAV_MAX_BATCH_SIZE} · wait = ${CODE2WAV_BATCH_WAIT_MS} ms · idle = ${CODE2WAV_BATCH_WAIT_WHEN_IDLE}`) : t('2 streams ready · subclass implements the step hooks', '2 条流就绪 · 子类实现合步钩子')}</text>
        <rect x={panel.x + 16} y={panel.y + 65} width={phone ? 238 : 293} height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 88} text-anchor="middle" class="mono strong">{panel.kind === 'batch' ? 'new_request: A + B' : 'stream_chunk: A + B'}</text>
        <path d="M{panel.x + (phone ? 135 : 162)} {panel.y + 105} V{panel.y + 123}" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <rect x={panel.x + 16} y={panel.y + 130} width={phone ? 238 : 293} height="42" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 156} text-anchor="middle" class="tag strong">{panel.kind === 'batch' ? 'SimpleScheduler.collect_batch' : 'ingest A → state A · ingest B → state B'}</text>
        <path d="M{panel.x + (panel.kind === 'batch' ? (phone ? 135 : 162) : 25)} {panel.y + 176} V{panel.y + 191}" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 189} text-anchor="middle" class="tag">{panel.kind === 'batch' ? '' : 'select_step_participants → A + B'}</text>
        <rect x={panel.x + 16} y={panel.y + 198} width={phone ? 238 : 293} height="48" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 227} text-anchor="middle" class="mono strong">{panel.kind === 'batch' ? 'vocode_and_release([A, B])' : 'run_step([A, B])'}</text>
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 272} text-anchor="middle" class="tag strong">{panel.kind === 'batch' ? t('one batch call → A.result + B.result', '一次批量调用 → A.result + B.result') : t('one shared step → A.audio + B.audio', '一次合步 → A.audio + B.audio')}</text>
      {/each}
      <text x={W / 2} y={phone ? 724 : 420} text-anchor="middle" class="mono strong">{STREAM_TEACHING_INPUT_COUNT} {t('inputs', '份输入')} → {STREAM_TEACHING_SHARED_STEPS} {t('shared compute', '次共享计算')} → {STREAM_TEACHING_OUTPUT_COUNT} {t('outputs', '份输出')}</text>
      <text x={W / 2} y={phone ? 750 : 446} text-anchor="middle" class="tag">{phone ? t('MiniCPM-o: left · optional streaming coalescing: right', 'MiniCPM-o 走左侧 · 可选流式合步走右侧') : t('MiniCPM-o uses the left SimpleScheduler path; the right path is optional for streaming-vocoder subclasses.', 'MiniCPM-o 走左边的 SimpleScheduler；右边是流式 vocoder 子类的可选路径。')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('A + B are examples; sharing a step keeps both identities.', 'A、B 是教学例子；合做一步不会抹掉各请求的身份。') : t('A and B are a teaching example; one shared step does not mean one request loses its identity.', 'A、B 是教学例子；合做一步不会抹掉各请求的身份。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: historical H200 results do not generalize.', '下一步：历史实验说明，更大 batch 不是普遍保证。') : t('Next: historical measurements show why a bigger batch is not a universal promise.', '下一步：历史实验说明，更大 batch 不是普遍保证。')}</text>
      {:else if step === 5}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{t('HISTORICAL H200 EXPERIMENT · quoted, not rerun here', '历史 H200 实验 · 引用记录，本章没有重跑')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">FIFO · {H200_FIFO_REQUEST_COUNT} {t('requests', '条请求')} · {t('concurrency', '客户端并发')} {H200_FIFO_CLIENT_CONCURRENCY} · {t('wait', '主动等待')} {H200_FIFO_WAIT_MS} ms</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{phone ? t(`warmup ${H200_FIFO_WARMUP_REQUESTS} · repeats ${H200_FIFO_REPEATS} · throughput = requests/s`, `预热 ${H200_FIFO_WARMUP_REQUESTS} · 重复 ${H200_FIFO_REPEATS} · 吞吐 = 请求数/秒`) : t(`${H200_FIFO_WARMUP_REQUESTS} warmup requests excluded · ${H200_FIFO_REPEATS} mixed-reference repeats · throughput = completed requests / second`, `${H200_FIFO_WARMUP_REQUESTS} 条预热剔除 · ${H200_FIFO_REPEATS} 次混合参考音频重复 · throughput = 每秒完成请求数`)}</text>
      <path d="M{phone ? 35 : 60} {phone ? 100 : 100} V{phone ? 320 : 330} H{phone ? 275 : 450}" fill="none" stroke="var(--line)" stroke-width="1.5" />
      <path d="M{phone ? 35 : 60} {phone ? 140 : 140} H{phone ? 275 : 450}" fill="none" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 4" />
      <text x={phone ? 31 : 56} y={phone ? 144 : 144} text-anchor="end" class="tag">{H200_FIFO_BAR_MAX}</text>
      <text x={phone ? 31 : 56} y={phone ? 324 : 334} text-anchor="end" class="tag">0</text>
      {#each h200Bars as bar}
        <rect x={bar.x} y={bar.y} width={phone ? 80 : 110} height={bar.height} rx="7" fill={bar.batch === H200_FIFO_BATCH_LARGE ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent)" stroke-width="2" />
        <text x={bar.x + (phone ? 40 : 55)} y={bar.y - 13} text-anchor="middle" class="mono strong">{bar.value.toFixed(3)}</text>
        <text x={bar.x + (phone ? 40 : 55)} y={(phone ? 320 : 330) + 30} text-anchor="middle" class="rowlabel">B{bar.batch} · {t('cap', '上限')} {bar.batch}</text>
      {/each}
      <rect x={phone ? 20 : 500} y={phone ? 392 : 105} width={phone ? 260 : 180} height={phone ? 128 : 225} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 34 : 514} y={phone ? 417 : 132} class="rowlabel">{t('WHAT THIS PROVES', '这组数字能证明什么')}</text>
      <text x={phone ? 34 : 514} y={phone ? 443 : 163} class="tag">✓ {t('B8 won on this workload', 'B8 在这份负载上更快')}</text>
      <text x={phone ? 34 : 514} y={phone ? 467 : 193} class="tag">✓ {t('same controlled comparison', '同一组受控对照')}</text>
      <text x={phone ? 34 : 514} y={phone ? 491 : 233} class="tag">× {t('not every GPU or workload', '不是所有 GPU 和负载')}</text>
      <text x={phone ? 34 : 514} y={phone ? 515 : 263} class="tag">× {t('not the current cap of 16', '不是当前主线的上限 16')}</text>
      {#if !phone}
        <text x="514" y="303" class="tag">× {t('not a universal optimum', '不是普遍最优配置')}</text>
      {/if}
      <text x={W / 2} y={phone ? 552 : 382} text-anchor="middle" class="mono strong">({H200_FIFO_LARGE_REQUESTS_PER_S} − {H200_FIFO_SMALL_REQUESTS_PER_S}) ÷ {H200_FIFO_SMALL_REQUESTS_PER_S} = {H200_FIFO_SPEEDUP_PERCENT}%</text>
      <text x={W / 2} y={phone ? 578 : 408} text-anchor="middle" class="tag">{t('About', '约')} {H200_FIFO_EXTRA_REQUESTS_PER_S.toFixed(2)} {t('more completed requests each second', '条请求每秒多完成')}</text>
      <text x={W / 2} y={phone ? 604 : 434} text-anchor="middle" class="tag strong">{phone ? t('Old cap 8 · current cap 16 · implementation changed', '历史代码：上限 8 · 当前主线：上限 16，实现也已变化') : t('Historical code: cap 8 · current main: cap 16 and changed implementation', '历史代码：上限 8 · 当前主线：上限 16，实现也已变化')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Source: batch.md / PR #2271 · old code 89e60d0', '出处：batch.md / PR #2271 · 旧版 89e60d0') : t('Historical reference: batch.md and PR #2271; old code 89e60d0, not current main.', '历史出处：batch.md 与 PR #2271；旧代码 89e60d0，不是当前主线。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: full capacity triggers backpressure.', '下一步：容量满时，背压拒绝新工作，而不是藏起无限队列。') : t('Next: when capacity is full, backpressure rejects work instead of hiding an unbounded queue.', '下一步：容量满时，背压拒绝新工作，而不是藏起无限队列。')}</text>
      {:else if step === 6}
      <text x={phone ? 15 : 20} y="20" class="tag strong">backpressure = {t('a full boundary tells its caller', '容量满时，把压力明确传回调用方')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{phone ? t(`Two examples · cap ${ADMISSION_TEACHING_LIMIT} · ${ADMISSION_ACTIVE_IDS.join(' + ')} active`, `两个独立例子 · 教学上限 = ${ADMISSION_TEACHING_LIMIT} · ${ADMISSION_ACTIVE_IDS.join(' + ')} 仍在处理`) : t(`Two independent examples · teaching cap = ${ADMISSION_TEACHING_LIMIT} · ${ADMISSION_ACTIVE_IDS.join(' + ')} still active`, `两个独立例子 · 教学上限 = ${ADMISSION_TEACHING_LIMIT} · ${ADMISSION_ACTIVE_IDS.join(' + ')} 仍在处理`)}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: active request · orange: rejected request C', '蓝色：处理中的请求 · 橙色：被拒绝的 C')}</text>
      {#each admissionPanels as panel}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="290" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 49} class="tag">{panel.kind === 'router' ? 'global + per-service permits' : 'max_in_flight'} = {ADMISSION_TEACHING_LIMIT}</text>
        {#each ADMISSION_ACTIVE_IDS as id, i}
          <rect x={panel.x + 16 + i * (phone ? 121 : 148)} y={panel.y + 64} width={phone ? 110 : 134} height="40" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + (phone ? 71 : 83) + i * (phone ? 121 : 148)} y={panel.y + 90} text-anchor="middle" class="mono strong">{id} · {t('active', '处理中')}</text>
        {/each}
        <text x={panel.x + 16} y={panel.y + 128} class="mono strong">{ADMISSION_NEW_ID} → {panel.kind === 'router' ? 'try_acquire_owned()' : 'submit_request()'}</text>
        <path d="M{panel.x + 20} {panel.y + 142} H{panel.x + (phone ? 248 : 303)}" stroke="var(--gen)" stroke-width="2" marker-end="url(#batch-arrow-gen)" />
        <text x={panel.x + 16} y={panel.y + 166} class="tag">{panel.kind === 'router' ? t(`${ADMISSION_FREE_PERMITS} permits → AdmissionError::Overloaded`, `${ADMISSION_FREE_PERMITS} 个许可 → AdmissionError::Overloaded`) : `${ADMISSION_ACTIVE_COUNT} >= ${ADMISSION_TEACHING_LIMIT} → QueueFullError`}</text>
        <rect x={panel.x + 16} y={panel.y + 184} width={phone ? 238 : 293} height="50" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 215} text-anchor="middle" class="mono strong">HTTP {panel.kind === 'router' ? ADMISSION_ROUTER_STATUS : ADMISSION_COORDINATOR_STATUS} · {panel.kind === 'router' ? t('not sent upstream', '不发给 worker') : t('no pipeline submit', '不交给 pipeline')}</text>
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 264} text-anchor="middle" class="tag">{panel.kind === 'router' ? t('released on response end / error / cancel', '响应结束 / 错误 / 取消才还许可') : t('counts only admission-counting requests', '只数计入准入的请求')}</text>
      {/each}
      <text x={W / 2} y={phone ? 724 : 420} text-anchor="middle" class="mono strong">{ADMISSION_ACTIVE_COUNT} {t('active', '条处理中')} + {ADMISSION_NEW_COUNT} {t('new', '条新到')} &gt; {ADMISSION_TEACHING_LIMIT} {t('cap', '条上限')} → {ADMISSION_FREE_PERMITS} {t('free', '个空位')}</text>
      <text x={W / 2} y={phone ? 750 : 446} text-anchor="middle" class="tag strong">{phone ? t('Different boundaries: router 429 · coordinator 503', '429 与 503 来自不同边界，不能互换。') : t('429 and 503 come from different boundaries; do not interchange them.', '429 与 503 来自不同边界，不能互换。')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Cap 2 and A/B/C are teaching values, not defaults.', '上限 2 和 A、B、C 都是教学值，不是部署默认值。') : t('Caps two and requests A, B, C are teaching values, not deployment defaults.', '上限 2 和 A、B、C 都是教学值，不是部署默认值。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: responses apply backpressure frame by frame.', '下一步：已接收的响应怎样逐帧施加背压。') : t('Next: an accepted response applies backpressure one frame at a time.', '下一步：已接收的响应怎样逐帧施加背压。')}</text>
      {:else if step === 7}
      <text x={phone ? 15 : 20} y="20" class="tag strong">poll_frame() = {t('ask for the next frame', '来取下一帧')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{phone ? t('Blue: response data · orange: read demand', '蓝色：响应数据 · 橙色：读取请求') : t('Blue: response data → · orange: ← read demand', '蓝色：响应数据 → · 橙色：← 读取请求')}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{phone ? t('Teaching example: 3 frames · frame 1 delivered', '教学例子：三帧数据，第 1 帧已交给下游') : t('Teaching example: three frames, with frame one already delivered', '教学例子：三帧数据，第 1 帧已交给下游')}</text>
      {#each relayNodes as node}
        <rect x={node.x} y={node.y} width={phone ? 240 : 190} height="120" rx="10" fill={node.title === 'ROUTER' ? 'var(--accent-soft)' : 'var(--bg)'} stroke={node.title === 'ROUTER' ? 'var(--accent)' : 'var(--line)'} stroke-width={node.title === 'ROUTER' ? 2 : 1} />
        <text x={node.x + 14} y={node.y + 27} class="rowlabel">{node.title}</text>
        <text x={node.x + 14} y={node.y + 54} class="mono strong">{node.subtitle}</text>
        <text x={node.x + 14} y={node.y + 82} class="tag">{node.detail}</text>
        {#if node.title === 'ROUTER'}
          <text x={node.x + 14} y={node.y + 103} class="tag">poll_frame() → inner.poll_frame()</text>
        {/if}
      {/each}
      {#if phone}
        <path d="M85 224 V252" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <path d="M85 384 V412" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <path d="M215 256 V228" stroke="var(--gen)" stroke-width="2" marker-end="url(#batch-arrow-gen)" />
        <path d="M215 416 V388" stroke="var(--gen)" stroke-width="2" marker-end="url(#batch-arrow-gen)" />
      {:else}
        <path d="M214 170 H257" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <path d="M459 170 H502" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
        <path d="M261 220 H218" stroke="var(--gen)" stroke-width="2" marker-end="url(#batch-arrow-gen)" />
        <path d="M506 220 H463" stroke="var(--gen)" stroke-width="2" marker-end="url(#batch-arrow-gen)" />
      {/if}
      <text x={W / 2} y={phone ? 570 : 316} text-anchor="middle" class="mono strong">{RELAY_POLL_COUNT} {t('downstream poll', '次下游 poll')} → {RELAY_POLL_COUNT} {t('upstream poll', '次上游 poll')} → ≤ {RELAY_MAX_FRAMES_PER_POLL} {phone ? t('frame', '帧数据') : t('data frame', '帧数据')}</text>
      <text x={W / 2} y={phone ? 596 : 344} text-anchor="middle" class="tag">{RELAY_TEACHING_FRAME_COUNT} {t('frames', '帧')} = {RELAY_DELIVERED_FRAME_COUNT} {t('delivered', '帧已交付')} + {RELAY_UPSTREAM_FRAME_COUNT} {t('upstream', '帧在上游')}</text>
      <text x={W / 2} y={phone ? 624 : 374} text-anchor="middle" class="tag strong">{t('No body pump · no application queue · no extra relay task', '不加 body pump · 不加应用队列 · 不加转发任务')}</text>
      <text x={W / 2} y={phone ? 650 : 402} text-anchor="middle" class="tag">{phone ? t('Adapter queue = 0 · socket and worker buffers remain', '队列是 0 只指这个转接框；socket 和 worker 仍可缓冲。') : t('Queue zero covers this adapter; socket and worker buffers can remain.', '队列是 0 只指这个转接框；socket 和 worker 仍可缓冲。')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Response relay only · upload/worker queues are separate', '这里只讲响应转发，不讲分类上传缓冲或 worker 内部队列。') : t('This is response relay, not classified-upload buffering or a worker-stage queue.', '这里只讲响应转发，不讲分类上传缓冲或 worker 内部队列。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Summary: bound admissions · relay responses directly', '本章收束：限制新请求准入，已接收响应直接逐帧转发。') : t('Chapter summary: bound new admissions and relay accepted responses directly.', '本章收束：限制新请求准入，已接收响应直接逐帧转发。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
