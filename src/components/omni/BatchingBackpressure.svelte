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
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A and B are already queued, but C arrives later. A five-ms collection budget delays A and B by five ms.',
    captionZh: 'A、B 已在队列，C 还没到。若为凑批等 5 ms，A、B 就晚 5 ms 开始计算。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 680 : 410);
  const panels = $derived([
    { x: phone ? 15 : 20, y: phone ? 82 : 86, wait: 0 },
    { x: phone ? 15 : 375, y: phone ? 330 : 86, wait: BATCH_WAIT_ACTIVE_MS },
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
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
