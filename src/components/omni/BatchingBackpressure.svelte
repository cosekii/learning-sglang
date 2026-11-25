<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A and B are already queued, but C arrives later. A five-ms collection budget delays A and B by five ms.',
    captionZh: 'A、B 已在队列，C 还没到。若为凑批等 5 ms，A、B 就晚 5 ms 开始计算。',
  }, {
    caption: 'A stays in the running batch until it finishes. C takes that row only after A finishes.',
    captionZh: 'A 没结束，下一轮仍留在 running batch。A 结束后，C 才补进空出的这一行。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 680 : step === 1 ? 450 : 410);
  const panels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, wait: 0 },
    { x: phone ? 15 : 375, y: phone ? 330 : 86, wait: BATCH_WAIT_ACTIVE_MS },
  ]);
  const arPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, title: t('ROUND 1 · A and B unfinished', '第 1 轮 · A、B 未完成'), running: AR_ROUND_ONE_RUNNING_IDS, waiting: AR_ROUND_ONE_WAITING_IDS },
    { x: phone ? 15 : 375, y: phone ? 340 : 86, title: t('ROUND 2 · A finished', '第 2 轮 · A 已结束'), running: AR_ROUND_TWO_RUNNING_IDS, waiting: [] },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('The same queued requests start immediately with zero collection delay, or five milliseconds later with a five-millisecond batching budget.', '同一批已排队请求，在零收集等待时立即开始，在 5 毫秒凑批预算下晚 5 毫秒开始。')}>
      <defs>
        <marker id="batch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
      <text x={phone ? 15 : 20} y="20" class="tag strong">SimpleScheduler.collect_batch · {t('same arrivals in both panels', '两幅图使用相同到达顺序')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">max_batch_size = {BATCH_WAIT_MAX_SIZE} · {BATCH_WAIT_READY_IDS.join('、')} @ 0 ms · {BATCH_WAIT_LATE_ID} @ {BATCH_WAIT_LATE_MS} ms</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: queued work · orange: extra collection wait', '蓝色：已排队的工作 · 橙色：额外的凑批等待')}</text>

      {#each panels as panel}
        {@const delayed = panel.wait > 0}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="222" rx="12" fill="var(--bg)" stroke={delayed ? 'var(--gen)' : 'var(--accent)'} stroke-width={delayed ? 1 : 2} />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">max_batch_wait_ms = {panel.wait}</text>
        <text x={panel.x + 14} y={panel.y + 48} class="tag">{t('batch slots when collection starts', '开始收集时的 batch 空位')}</text>
        {#each Array(BATCH_WAIT_MAX_SIZE) as _, i}
          <rect x={panel.x + 16 + i * (phone ? 58 : 68)} y={panel.y + 61} width={phone ? 48 : 56} height="36" rx="6" fill={i < BATCH_WAIT_READY_IDS.length ? 'var(--accent-soft)' : 'white'} stroke={i < BATCH_WAIT_READY_IDS.length ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={i < BATCH_WAIT_READY_IDS.length ? '0' : '4 3'} />
          <text x={panel.x + (phone ? 40 : 44) + i * (phone ? 58 : 68)} y={panel.y + 84} text-anchor="middle" class="mono strong">{BATCH_WAIT_READY_IDS[i] ?? '·'}</text>
        {/each}
        <text x={panel.x + 14} y={panel.y + 120} class="tag">{BATCH_WAIT_READY_IDS.length} {t('ready', '份现成工作')} + {BATCH_WAIT_EMPTY_SLOTS} {t('empty slots', '个空位')}</text>
        {#if delayed}
          <rect x={panel.x + 16} y={panel.y + 133} width={phone ? 238 : 293} height="32" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 154} text-anchor="middle" class="tag strong">{t('wait for more work: 0 → 5 ms', '继续等更多工作：0 → 5 ms')}</text>
        {:else}
          <rect x={panel.x + 16} y={panel.y + 133} width={phone ? 238 : 293} height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 154} text-anchor="middle" class="tag strong">{t('take A + B now · no empty-slot wait', '现在拿走 A + B · 不为空位等待')}</text>
        {/if}
        <path d="M{panel.x + 18} {panel.y + 187} H{panel.x + (phone ? 250 : 305)}" stroke="var(--line)" stroke-width="2" />
        <path d="M{panel.x + 18 + (BATCH_WAIT_LATE_MS / 10) * (phone ? 232 : 287)} {panel.y + 176} V{panel.y + 197}" stroke="var(--gen)" stroke-width="2" />
        <text x={panel.x + 18} y={panel.y + 207} class="tag">0 ms</text>
        <text x={panel.x + (phone ? 250 : 305)} y={panel.y + 207} text-anchor="end" class="tag">10 ms</text>
        <text x={panel.x + 18 + (BATCH_WAIT_LATE_MS / 10) * (phone ? 232 : 287)} y={panel.y + 176} text-anchor="middle" class="tag">{BATCH_WAIT_LATE_ID}</text>
        <circle cx={panel.x + 18 + (panel.wait / 10) * (phone ? 232 : 287)} cy={panel.y + 187} r="6" fill="var(--accent)" />
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 219} text-anchor="middle" class="tag strong">{t('compute starts at', '开始计算')} {panel.wait} ms</text>
      {/each}

      <text x={W / 2} y={phone ? 586 : 340} text-anchor="middle" class="mono strong">{BATCH_WAIT_ACTIVE_MS} ms − 0 ms = {BATCH_WAIT_ADDED_MS} ms {t('later for A and B', 'A、B 更晚开始')}</text>
      <text x={W / 2} y={phone ? 612 : 362} text-anchor="middle" class="tag">{t('C arrives at 6 ms, so it misses both collections; compute time is omitted.', 'C 在 6 ms 才到，两次收集都没赶上；图中不画计算耗时。')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t('The five-ms budget is a teaching counterfactual, not a recommended setting.', '5 ms 只是教学对照，不是推荐配置。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Next: an AR batch can keep running while requests join and leave.', '下一步：AR batch 怎样在请求加入和退出时继续运行。')}</text>
      {:else if step === 1}
      <text x={phone ? 15 : 20} y="20" class="tag strong">running batch = {t('unfinished requests advancing together', '未完成请求一起逐步前进')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{t('Teaching cap', '教学上限')} · max_running_requests = {AR_TEACHING_MAX_RUNNING} · {t('memory must also fit', '显存也必须放得下')}</text>
      <text x={phone ? 15 : 20} y="66" class="tag">{t('Blue: running row · orange: waiting request · grey: finished', '蓝色：运行中的行 · 橙色：等待请求 · 灰色：已结束')}</text>
      {#each arPanels as panel, round}
        <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="230" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 52} class="tag strong">running_batch</text>
        {#each panel.running as id, i}
          <rect x={panel.x + 16 + i * (phone ? 119 : 143)} y={panel.y + 65} width={phone ? 107 : 128} height="48" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + (phone ? 69 : 80) + i * (phone ? 119 : 143)} y={panel.y + 95} text-anchor="middle" class="mono strong">{id} · {t('next token', '下一 token')}</text>
        {/each}
        <text x={panel.x + 14} y={panel.y + 140} class="tag strong">waiting_queue</text>
        {#if panel.waiting.length}
          <rect x={panel.x + 16} y={panel.y + 152} width={phone ? 107 : 128} height="42" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={panel.x + (phone ? 69 : 80)} y={panel.y + 179} text-anchor="middle" class="mono strong">C · {t('waits', '等待')}</text>
          <text x={panel.x + (phone ? 139 : 163)} y={panel.y + 179} class="tag">{AR_ROUND_ONE_WAITING_COUNT} {t('request · no free row', '条请求 · 没有空行')}</text>
        {:else}
          <rect x={panel.x + 16} y={panel.y + 152} width={phone ? 238 : 293} height="42" rx="7" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
          <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 179} text-anchor="middle" class="tag">{t('empty · C has joined the running batch', '空了 · C 已补进 running batch')}</text>
        {/if}
        <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 216} text-anchor="middle" class="tag strong">{round === 0 ? t('A and B each advance one token', 'A、B 各自前进一个 token') : t('B and C each advance one token', 'B、C 各自前进一个 token')}</text>
      {/each}
      {#if !phone}
        <path d="M348 200 H371" stroke="var(--accent)" stroke-width="2" marker-end="url(#batch-arrow)" />
      {/if}
      <text x={W / 2} y={phone ? 600 : 350} text-anchor="middle" class="mono strong">A {t('finished', '结束')} → 1 {t('free row', '空行')} → C {t('joins if memory allows', '在显存允许时补入')}</text>
      <text x={W / 2} y={phone ? 626 : 372} text-anchor="middle" class="tag">{phone ? t('policy builds limits · OmniScheduler schedules', 'policy 构造并校验上限 · OmniScheduler 调度') : t('generation_batch_policy.py builds and validates limits; OmniScheduler schedules', 'generation_batch_policy.py 构造并校验上限；OmniScheduler 执行调度')}</text>
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t('Two rows are a teaching view; request and token budgets can both block admission.', '两行只是教学视角；请求行数和 token 预算都能阻止补入。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: an encoder collects only ready work.', '下一步：encoder 只收现成的编码请求。') : t('Next: a one-shot encoder drains ready work without keeping a running batch.', '下一步：一次性 encoder 怎样收集现成工作，而不保留 running batch。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
