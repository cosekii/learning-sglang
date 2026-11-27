<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    BUDGET_CARD_GIB, BUDGET_WEIGHT_GIB, BUDGET_KV_GIB,
    BUDGET_WEIGHT_PERCENT, BUDGET_KV_PERCENT,
    CAPACITY_CARD_GIB, CAPACITY_RESERVE_GIB, CAPACITY_KV_GIB,
    CAPACITY_PASS_FRACTION, CAPACITY_FAIL_FRACTION,
    CAPACITY_PASS_FRACTION_GIB, CAPACITY_FAIL_FRACTION_GIB,
    CAPACITY_PASS_DECLARED_GIB, CAPACITY_FAIL_DECLARED_GIB,
    CAPACITY_PASS_HEADROOM_GIB, CAPACITY_FAIL_OVERFLOW_GIB,
    KV_SCOPE_TEACHING_GIB, KV_SCOPE_REQUIRED_ENGINE_COUNT,
    KV_SCOPE_ZERO_ENGINE_COUNT, KV_SCOPE_EXCESS_ENGINE_COUNT,
    WEIGHT_SHARE_REPLICA_COUNT,
    WEIGHT_SHARE_CHECKPOINT_COPY_COUNT, WEIGHT_SHARE_INDEPENDENT_CHECKPOINT_COPY_COUNT,
    WEIGHT_SHARE_SAVED_CHECKPOINT_COPY_COUNT, WEIGHT_SHARE_PRIVATE_KV_POOL_COUNT,
    WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA, WEIGHT_SHARE_COMBINED_TOKEN_CAP,
    MPS_TEACHING_CLIENT_COUNT, MPS_AUTO_MIN_CLIENT_COUNT,
    MPS_LEASE_COUNT_PER_GPU, MPS_TEACHING_TP_CLIENT_COUNT,
    AUK_OFFLOAD_COMPONENTS, AUK_OFFLOAD_COMPONENT_COUNT,
    AUK_OFFLOAD_RESIDENT_COUNT, AUK_OFFLOAD_SLEEPING_COUNT,
    AUK_OFFLOAD_REQUEST_OWNER_COUNT, AUK_OFFLOAD_MAX_BATCH_SIZE,
    AUK_OFFLOAD_PROCESS_REPLICA_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'An 80-GiB card holds 60 GiB of weights, leaving 20 GiB for KV. Their fractions are 75% and 25%.',
    captionZh: '80 GiB 卡放进 60 GiB 权重，剩下 20 GiB 给 KV。两者分别占 75% 和 25%。',
  }, {
    caption: 'A 50% fraction plus 20 GiB fits an 80-GiB card. Raising the fraction to 90% exceeds it by 12 GiB.',
    captionZh: '50% 比例加 20 GiB，能装进 80 GiB 卡。改成 90% 后超出 12 GiB。',
  }, {
    caption: 'One stage declares a two-GiB KV pool. Zero or two consuming engines fail; exactly one succeeds.',
    captionZh: '一个 stage 申报 2 GiB KV 池。零个或两个 engine 领取都报错，只能一个。',
  }, {
    caption: 'Two replicas alias one checkpoint, but keep two private KV pools. Each pool has an explicit 30,000-token cap.',
    captionZh: '两个副本共用一份权重，各留一个 KV 池。每个池明确申报 30000 token 上限。',
  }, {
    caption: 'Two eligible processes join one MPS lease on this GPU. A tensor-parallel process does not join.',
    captionZh: '两个合格进程加入同一份 MPS 租约。TP 进程不能加入。',
  }, {
    caption: 'One request owns the GPU while one component stays resident. The other two sleep until their turn.',
    captionZh: '一个请求占用 GPU，一件组件常驻。另外两件休眠，轮到自己再唤醒。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const PHASE_COUNTS = [4, 4, 4, 6, 1, 1];
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (count === 1) return;
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
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [480, 690, 730, 730, 650, 790][step] : [440, 470, 460, 480, 450, 500][step]);
  const fractionPct = (value: number) => (value * 100).toFixed(2);
  const budgetX = $derived(phone ? 20 : 60);
  const budgetWidth = $derived(phone ? 260 : 600);
  const budgetWeightWidth = $derived(budgetWidth * BUDGET_WEIGHT_GIB / BUDGET_CARD_GIB);
  const budgetKvWidth = $derived(budgetWidth - budgetWeightWidth);
  const budgetNow = $derived([
    t(`start with the whole card: ${BUDGET_CARD_GIB} GiB`, `先看整张卡：${BUDGET_CARD_GIB} GiB`),
    t(`weights take ${BUDGET_WEIGHT_GIB} GiB`, `权重占去 ${BUDGET_WEIGHT_GIB} GiB`),
    t(`the remaining ${BUDGET_KV_GIB} GiB is the KV budget`, `剩余 ${BUDGET_KV_GIB} GiB 是 KV 预算`),
    t('divide each part by the whole card', '分别除以整卡，得到比例'),
  ][phase]);
  const capacityPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 90 : 96, fraction: CAPACITY_PASS_FRACTION, fractionGib: CAPACITY_PASS_FRACTION_GIB, declared: CAPACITY_PASS_DECLARED_GIB, pass: true },
    { x: phone ? 15 : 375, y: phone ? 350 : 96, fraction: CAPACITY_FAIL_FRACTION, fractionGib: CAPACITY_FAIL_FRACTION_GIB, declared: CAPACITY_FAIL_DECLARED_GIB, pass: false },
  ]);
  const capacityScale = $derived((phone ? 238 : 293) / CAPACITY_FAIL_DECLARED_GIB);
  const capacityNow = $derived([
    t('two fractions of the same 80-GiB card', '先看同一张 80 GiB 卡上的两个比例'),
    t('turn 50% and 90% into 40 and 72 GiB', '把 50% 和 90% 换成 40 和 72 GiB'),
    t('add the same 20-GiB reserve to each', '两边都加上同样的 20 GiB reserve'),
    t('compare 60 and 92 GiB with the 80-GiB limit', '拿 60 和 92 GiB 与 80 GiB 上限比较'),
  ][phase]);
  const kvPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 90 : 104, engines: KV_SCOPE_ZERO_ENGINE_COUNT, title: t('NO ENGINE', '没有 ENGINE'), ok: false },
    { x: phone ? 15 : 255, y: phone ? 265 : 104, engines: KV_SCOPE_REQUIRED_ENGINE_COUNT, title: t('ONE ENGINE', '一个 ENGINE'), ok: true },
    { x: phone ? 15 : 490, y: phone ? 440 : 104, engines: KV_SCOPE_EXCESS_ENGINE_COUNT, title: t('TWO ENGINES', '两个 ENGINE'), ok: false },
  ]);
  const kvNow = $derived([
    t('compare three separate cases, each with 2 GiB', '比较三种独立情况，各自有 2 GiB 预算'),
    t('the first engine marks the declaration consumed', '第一个 engine 把这份预算标为已领取'),
    t('check the empty case and the second consumer', '检查没有 engine 的情况和第二个领取者'),
    t('only exactly one consumer can start', '只有恰好一个领取者才能启动'),
  ][phase]);
  const weightPanels = $derived([
    { x: phone ? 15 : 20, y: phone ? 90 : 96, shared: false },
    { x: phone ? 15 : 375, y: phone ? 335 : 96, shared: true },
  ]);
  const weightNow = $derived([
    t('each cap = 30 × 1,000-token prompts (scale only)', '每池 = 30 份 1000-token prompt（只比大小）'),
    t('replica 0 loads one checkpoint as leader', 'replica 0 作为 leader 加载一份权重'),
    t("CUDA IPC handles let the follower open the leader's W", 'CUDA IPC handle 让 follower 打开 leader 的 W'),
    t('the follower aliases W instead of copying it', 'follower 指向同一个 W，不再复制'),
    t('each replica builds its own KV pool', '两个副本各自建立一个 KV 池'),
    t('count one W, then add the two pool caps', '最后数一份 W，并加上两个池的上限'),
  ][phase]);
  const aukFrames = $derived(AUK_OFFLOAD_COMPONENTS.map((active, index) => ({
    active, index, x: phone ? 15 : 20 + index * 235, y: phone ? 100 + index * 180 : 110,
  })));
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('Declared GPU fractions, byte reserves and runtime ownership determine whether colocated stages fit.', '同卡 stage 能否装下，要看比例、字节预留和运行时所有权。')}>
      <defs>
        <marker id="budget-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
        <marker id="budget-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x="20" y="22" class="tag strong">{phone ? t('CONSTRUCTED · ONE GPU', '构造例 · 一张 GPU') : t('CONSTRUCTED EXAMPLE · ONE GPU', '构造例 · 一张 GPU')}</text>
        <text x="20" y="46" class="tag">gpu_memory_fraction = {phone ? t('part bytes ÷ whole card', '部分字节 ÷ 整卡字节') : t('bytes for one purpose ÷ total card bytes', '一种用途的字节 ÷ 整卡字节')}</text>
        <text x="20" y="68" class="tag">KV = {t('saved token keys and values', '保存已算 token 的 key 和 value')}</text>
        <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={16} />
        <text x={budgetX} y="102" class="rowlabel">{phone ? t('TOTAL', '总显存') : t('TOTAL MEMORY', '总显存')} · {BUDGET_CARD_GIB} GiB</text>
        <rect data-budget="card" x={budgetX} y="116" width={budgetWidth} height="80" rx="8" fill="var(--bg)" />
        <rect data-budget="weights" x={budgetX} y="116" width={phase >= 1 ? budgetWeightWidth : 0} height="80" fill="var(--accent)" style="transition: width 450ms" />
        <rect data-budget="kv" x={budgetX + budgetWeightWidth} y="116" width={phase >= 2 ? budgetKvWidth : 0} height="80" fill="var(--gen)" style="transition: width 450ms" />
        <rect x={budgetX} y="116" width={budgetWidth} height="80" rx="8" fill="none" stroke={phase === 0 ? 'var(--text)' : 'var(--line)'} stroke-width={phase === 0 ? 2 : 1} style="transition: stroke 250ms" />
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <text x={budgetX + budgetWeightWidth / 2} y="150" text-anchor="middle" class="tag strong" fill="white">{t('WEIGHTS', '权重')}</text>
          <text x={budgetX + budgetWeightWidth / 2} y="176" text-anchor="middle" class="mono strong" fill="white">{BUDGET_WEIGHT_GIB} GiB</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <text x={budgetX + budgetWeightWidth + budgetKvWidth / 2} y="150" text-anchor="middle" class="tag strong" fill="white">{t('KV BUDGET', 'KV 预算')}</text>
          <text x={budgetX + budgetWeightWidth + budgetKvWidth / 2} y="176" text-anchor="middle" class="mono strong" fill="white">{BUDGET_KV_GIB} GiB</text>
        </g>
        <text x={W / 2} y="228" text-anchor="middle" class="tag strong">now: {budgetNow}</text>
        {#if phase === 2}
          <text x={W / 2} y="264" text-anchor="middle" class="mono strong">{BUDGET_CARD_GIB} − {BUDGET_WEIGHT_GIB} = {BUDGET_KV_GIB} GiB {t('KV budget', 'KV 预算')}</text>
        {:else if phase >= 3}
          <text x={W / 2} y="258" text-anchor="middle" class="mono strong">{t('weights', '权重')}: {BUDGET_WEIGHT_GIB} ÷ {BUDGET_CARD_GIB} = {BUDGET_WEIGHT_PERCENT}%</text>
          <text x={W / 2} y="288" text-anchor="middle" class="mono strong">KV: {BUDGET_KV_GIB} ÷ {BUDGET_CARD_GIB} = {BUDGET_KV_PERCENT}%</text>
          <text x={W / 2} y="318" text-anchor="middle" class="mono strong">{BUDGET_WEIGHT_PERCENT}% + {BUDGET_KV_PERCENT}% = 100% {t('of the card', '整卡')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Constructed values · next: check reserves', '构造数值 · 下一步：检查字节预留') : t('Constructed values, not measured memory · next: combine fractions with byte reserves', '构造数值，不是实测显存 · 下一步：比例与字节预留合并校验')}</text>
      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{phone ? t('validate capacity · GiB', '容量校验 · GiB') : `validate_gpu_capacity · ${t('convert every declaration to GiB', '把所有申报换算成 GiB')}`}</text>
        <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={16} />
        <text x="20" y="46" class="tag">{phone ? t('80-GiB teaching card · 20-GiB reserve includes 2-GiB KV', '80 GiB 教学卡 · 20 GiB reserve 含 2 GiB KV') : t('Teaching card: 80 GiB · reserve covers one stage footprint, including its 2-GiB KV pool', '教学卡：80 GiB · reserve 覆盖 stage 整体，包括其中 2 GiB KV 池')}</text>
        <text x="20" y="68" class="tag">{phone ? t('Blue: fraction · orange: reserve · dashed: card limit', '蓝：比例 · 橙：reserve · 虚线：卡上限') : t('Blue: fraction bytes · orange: total_reserve_bytes · dashed: physical limit', '蓝色：比例字节 · 橙色：total_reserve_bytes · 虚线：物理上限')}</text>
        {#each capacityPanels as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 325} height="218" rx="12" fill="var(--bg)" stroke={phase >= 3 ? (panel.pass ? 'var(--accent)' : 'var(--gen)') : 'var(--line)'} stroke-width={phase >= 3 && panel.pass ? 2 : 1} style="transition: stroke 300ms" />
          <text x={panel.x + 14} y={panel.y + 26} class="rowlabel">{fractionPct(panel.fraction)}% + {CAPACITY_RESERVE_GIB} GiB{phase >= 3 ? ` · ${panel.pass ? t('PASS', '通过') : t('REJECT', '拒绝')}` : ''}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <text x={panel.x + 14} y={panel.y + 50} class="tag">{panel.fraction} × {CAPACITY_CARD_GIB} = {panel.fractionGib} GiB</text>
          </g>
          <rect data-capacity="track" data-panel={panel.pass ? 'pass' : 'fail'} x={panel.x + 16} y={panel.y + 68} width={CAPACITY_FAIL_DECLARED_GIB * capacityScale} height="46" fill="var(--bg)" stroke="var(--faint)" />
          <rect data-capacity="fraction" data-panel={panel.pass ? 'pass' : 'fail'} x={panel.x + 16} y={panel.y + 68} width={phase >= 1 ? panel.fractionGib * capacityScale : 0} height="46" fill="var(--accent)" style="transition: width 450ms" />
          <rect data-capacity="reserve" data-panel={panel.pass ? 'pass' : 'fail'} x={panel.x + 16 + panel.fractionGib * capacityScale} y={panel.y + 68} width={phase >= 2 ? CAPACITY_RESERVE_GIB * capacityScale : 0} height="46" fill="var(--gen)" style="transition: width 450ms" />
          <path data-capacity="limit" data-panel={panel.pass ? 'pass' : 'fail'} d="M{panel.x + 16 + CAPACITY_CARD_GIB * capacityScale} {panel.y + 60} V{panel.y + 125}" stroke="var(--text)" stroke-width="2" stroke-dasharray="4 3" />
          <text x={panel.x + 16 + CAPACITY_CARD_GIB * capacityScale} y={panel.y + 140} text-anchor="middle" class="tag strong">80 GiB</text>
          <text x={panel.x + 16 + panel.fractionGib * capacityScale / 2} y={panel.y + 97} text-anchor="middle" class="tag strong" fill="white" opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">{panel.fractionGib}</text>
          <text x={panel.x + 16 + (panel.fractionGib + CAPACITY_RESERVE_GIB / 2) * capacityScale} y={panel.y + 97} text-anchor="middle" class="tag strong" fill="white" opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">20</text>
          <text data-capacity="declared" data-panel={panel.pass ? 'pass' : 'fail'} x={panel.x + 16} y={panel.y + 169} class="mono strong" opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">{panel.fractionGib} + {CAPACITY_RESERVE_GIB} = {panel.declared} GiB</text>
          <text data-capacity="verdict" data-panel={panel.pass ? 'pass' : 'fail'} x={panel.x + 16} y={panel.y + 198} class="tag strong" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">{panel.pass ? `${CAPACITY_CARD_GIB} − ${panel.declared} = ${CAPACITY_PASS_HEADROOM_GIB} GiB ${t('headroom', '余量')}` : `${panel.declared} − ${CAPACITY_CARD_GIB} = ${CAPACITY_FAIL_OVERFLOW_GIB} GiB ${t('too much', '超出')}`}</text>
        {/each}
        <text x={W / 2} y={phone ? 596 : 350} text-anchor="middle" class="tag strong">now: {capacityNow}</text>
        <text x={W / 2} y={phone ? 624 : 378} text-anchor="middle" class="mono strong">{phone ? 'declared = fraction × card + reserve' : 'declared = total_fraction × card_bytes + total_reserve_bytes'}</text>
        <text x={W / 2} y={phone ? 652 : 406} text-anchor="middle" class="tag" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">{CAPACITY_KV_GIB} GiB KV ≤ {CAPACITY_CARD_GIB} GiB · {phone ? t('separate check; already inside reserve', '单独检查；已含在 reserve 里') : t('checked separately; not added to its reserve again', '单独检查；不跟自己的 reserve 重复相加')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Unit-test values · next: one KV consumer', '单元测试数值 · 下一步：一个 KV 领取者') : t('Unit-test values, not a B200 measurement · next: deliver a KV budget once', '数值来自单元测试，不是 B200 实测 · 下一步：KV 预算只能领取一次')}</text>
      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{phone ? t('KV budget · one consumer', 'KV 预算 · 一个领取者') : `stage_kv_cache_budget · ${t('one declaration, exactly one consumer', '一份申报，只能由一个 engine 领取')}`}</text>
        <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={16} />
        <text x="20" y="46" class="tag">{phone ? t(`${KV_SCOPE_TEACHING_GIB} GiB · KV = saved token keys + values`, `${KV_SCOPE_TEACHING_GIB} GiB · KV = token 的 key + value`) : t(`engine.kv_cache_bytes = ${KV_SCOPE_TEACHING_GIB} GiB · KV = saved token keys and values`, `engine.kv_cache_bytes = ${KV_SCOPE_TEACHING_GIB} GiB · KV = 已算 token 的 key 和 value`)}</text>
        <text x="20" y="68" class="tag">{phone ? t('Blue: claimed · orange: error · dashed: unclaimed', '蓝：已领取 · 橙：报错 · 虚线：未领取') : t('Blue: consumed budget · orange: startup error · dashed: unconsumed', '蓝色：预算已领取 · 橙色：启动报错 · 虚线：未领取')}</text>
        {#each kvPanels as panel}
          <rect data-kv="panel" data-case={panel.engines} x={panel.x} y={panel.y} width={phone ? 270 : 210} height="142" rx="10" fill={phase >= 3 ? (panel.ok ? 'var(--accent-soft)' : 'var(--gen-soft)') : 'var(--bg)'} stroke={phase >= 3 ? (panel.ok ? 'var(--accent)' : 'var(--gen)') : 'var(--line)'} stroke-width={phase >= 3 && panel.ok ? 2 : 1} style="transition: fill 300ms, stroke 300ms" />
          <text x={panel.x + 13} y={panel.y + 25} class="rowlabel">{panel.title}</text>
          <text data-kv="consumed" data-case={panel.engines} x={panel.x + 13} y={panel.y + 49} class="tag">stage → {panel.engines} × engine · consumed={panel.engines > 0 && phase >= 1}</text>
          {#if panel.engines === 0 || phase === 0}
            <g data-kv="waiting" data-case={panel.engines}>
              <rect x={panel.x + 14} y={panel.y + 62} width={panel.engines === 0 ? (phone ? 238 : 180) : 82} height="34" rx="5" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={panel.x + (panel.engines === 0 ? (phone ? 133 : 104) : 55)} y={panel.y + 84} text-anchor="middle" class="tag">{panel.engines === 0 ? t('nobody consumed it', '没人领取') : t('unconsumed', '未领取')}</text>
            </g>
          {/if}
          {#if panel.engines > 0}
            <g data-kv="first" data-case={panel.engines} opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
              <rect x={panel.x + 14} y={panel.y + 62} width="82" height="34" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 55} y={panel.y + 84} text-anchor="middle" class="tag strong">KV {KV_SCOPE_TEACHING_GIB} GiB</text>
            </g>
          {/if}
          {#if panel.engines === KV_SCOPE_EXCESS_ENGINE_COUNT}
            <g data-kv="second" data-case={panel.engines} opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
              <rect x={panel.x + 106} y={panel.y + 62} width="82" height="34" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={panel.x + 147} y={panel.y + 84} text-anchor="middle" class="tag strong">KV {KV_SCOPE_TEACHING_GIB} GiB</text>
            </g>
          {/if}
          <text data-kv="outcome" data-case={panel.engines} x={panel.x + 13} y={panel.y + 122} class="tag strong" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">{panel.ok ? t('✓ consume once → start', '✓ 领取一次 → 启动') : panel.engines === 0 ? t('× unconsumed → error', '× 没领取 → 报错') : t('× second consume → error', '× 第二次领取 → 报错')}</text>
        {/each}
        <text x={W / 2} y={phone ? 606 : 296} text-anchor="middle" class="tag strong">now: {kvNow}</text>
        <text data-kv="total" x={W / 2} y={phone ? 638 : 330} text-anchor="middle" class="mono strong" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">{KV_SCOPE_TEACHING_GIB} GiB × {KV_SCOPE_REQUIRED_ENGINE_COUNT} = {KV_SCOPE_TEACHING_GIB} GiB · {t('not', '不是')} {KV_SCOPE_TEACHING_GIB} × {KV_SCOPE_EXCESS_ENGINE_COUNT}</text>
        <text x={W / 2} y={phone ? 666 : 364} text-anchor="middle" class="tag">{phone ? t('Cleanup checks the budget was claimed once.', '清理时检查预算是否被领取一次。') : t('After one stage build, cleanup checks that an engine claimed the budget.', '创建一个 stage 后，清理时检查有没有 engine 领取预算。')}</text>
        <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Teaching value · one declaration cannot fund two pools', '教学值 · 一份申报不能变成两份 KV 池') : t('Two GiB is a teaching value · one stage cannot silently fund two full pools', '2 GiB 是教学值 · 一份 stage 预算不能暗中变成两份完整 KV 池')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: share weights, not KV', '下一步：共享权重，不共享 KV') : t('Next: replicas share weights, never this KV pool', '下一步：副本共享权重，但不共享这个 KV 池')}</text>
      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{phone ? `MOSS TTS · GPU 0 · ${WEIGHT_SHARE_REPLICA_COUNT} ${t('replicas', '个副本')}` : `MOSS TTS · GPU 0 · replica 0 = ${t('leader', 'leader')} · replica 1 = ${t('follower', 'follower')}`}</text>
        <LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={16} />
        <text x="20" y="46" class="tag">{phone ? t('W = saved weights · alias = same W, no copy', 'W = 已存权重 · alias = 同一个 W，不复制') : t('W = saved model weights (checkpoint) · alias = same W, no copy', 'W = 已保存的模型权重（checkpoint） · alias = 同一个 W，不是复制')}</text>
        <rect x="20" y="58" width="10" height="10" rx="2" fill="var(--accent)" />
        <text x="36" y="68" class="tag">{phone ? 'W + IPC' : t('weights + CUDA IPC', '权重 + CUDA IPC')}</text>
        <rect x={phone ? 100 : 200} y="58" width="10" height="10" rx="2" fill="var(--gen)" />
        <text x={phone ? 116 : 216} y="68" class="tag">{t('private KV', '私有 KV')}</text>
        <rect x={phone ? 205 : 330} y="58" width="10" height="10" rx="2" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="2 2" />
        <text x={phone ? 221 : 346} y="68" class="tag">{phone ? t('no W yet', '还没有 W') : t('dashed: no W yet', '虚线：还没有 W')}</text>
        {#each weightPanels as panel}
          <rect data-weight="panel" data-mode={panel.shared ? 'on' : 'off'} x={panel.x} y={panel.y} width={phone ? 270 : 325} height="205" rx="12" fill="var(--bg)" stroke={panel.shared ? 'var(--accent)' : 'var(--line)'} stroke-width={panel.shared ? 2 : 1} />
          <text x={panel.x + 14} y={panel.y + 26} class="rowlabel">weight_share = {panel.shared ? 'on' : 'off'}</text>
          {#if panel.shared}
            <g data-weight="leader-placeholder" opacity={phase >= 1 ? 0 : 1} style="transition: opacity 300ms">
              <rect x={panel.x + 16} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={panel.x + (phone ? 71 : 83)} y={panel.y + 74} text-anchor="middle" class="tag">leader</text>
            </g>
            <g data-weight="leader-w" opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
              <rect x={panel.x + 16} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + (phone ? 71 : 83)} y={panel.y + 74} text-anchor="middle" class="mono strong">W · leader</text>
            </g>
            <g data-weight="follower-placeholder" opacity={phase >= 3 ? 0 : 1} style="transition: opacity 300ms">
              <rect x={panel.x + (phone ? 144 : 173)} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={panel.x + (phone ? 199 : 240)} y={panel.y + 74} text-anchor="middle" class="tag">follower</text>
            </g>
            <path data-weight="handles" d="M{panel.x + (phone ? 126 : 151)} {panel.y + 68} H{panel.x + (phone ? 140 : 169)}" stroke="var(--accent)" stroke-width="2" marker-end="url(#budget-arrow)" opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms" />
            <g data-weight="follower-alias" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
              <rect x={panel.x + (phone ? 144 : 173)} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + (phone ? 199 : 240)} y={panel.y + 74} text-anchor="middle" class="tag strong">alias · follower</text>
            </g>
            {#each [0, 1] as replica}
              <g data-weight="kv" data-replica={replica} opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
                <rect x={panel.x + (replica === 0 ? 16 : phone ? 144 : 173)} y={panel.y + 124} width={phone ? 110 : 135} height="42" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
                <text x={panel.x + (replica === 0 ? (phone ? 71 : 83) : (phone ? 199 : 240))} y={panel.y + 151} text-anchor="middle" class="tag strong">KV {replica} · {WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA}</text>
              </g>
            {/each}
            <text data-weight="shared-total" x={panel.x + (phone ? 135 : 162)} y={panel.y + 190} text-anchor="middle" class="mono strong" opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">{WEIGHT_SHARE_CHECKPOINT_COPY_COUNT} W + {WEIGHT_SHARE_PRIVATE_KV_POOL_COUNT} KV</text>
          {:else}
            <rect x={panel.x + 16} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <rect x={panel.x + (phone ? 144 : 173)} y={panel.y + 45} width={phone ? 110 : 135} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + (phone ? 71 : 83)} y={panel.y + 74} text-anchor="middle" class="mono strong">W · replica 0</text>
            <text x={panel.x + (phone ? 199 : 240)} y={panel.y + 74} text-anchor="middle" class="mono strong">W · replica 1</text>
            <rect x={panel.x + 16} y={panel.y + 124} width={phone ? 110 : 135} height="42" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <rect x={panel.x + (phone ? 144 : 173)} y={panel.y + 124} width={phone ? 110 : 135} height="42" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + (phone ? 71 : 83)} y={panel.y + 151} text-anchor="middle" class="tag strong">KV 0 · {WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA}</text>
            <text x={panel.x + (phone ? 199 : 240)} y={panel.y + 151} text-anchor="middle" class="tag strong">KV 1 · {WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA}</text>
            <text x={panel.x + (phone ? 135 : 162)} y={panel.y + 190} text-anchor="middle" class="mono strong">{WEIGHT_SHARE_INDEPENDENT_CHECKPOINT_COPY_COUNT} W + {WEIGHT_SHARE_PRIVATE_KV_POOL_COUNT} KV</text>
          {/if}
        {/each}
        <text data-weight="now" x={W / 2} y={phone ? 566 : 332} text-anchor="middle" class="tag strong">now: {weightNow}</text>
        <g data-weight="equations" opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
          <text x={W / 2} y={phone ? 594 : 360} text-anchor="middle" class="mono strong">{WEIGHT_SHARE_INDEPENDENT_CHECKPOINT_COPY_COUNT} W → {WEIGHT_SHARE_CHECKPOINT_COPY_COUNT} W · {t('one fewer copy', '少一份权重')} = {WEIGHT_SHARE_SAVED_CHECKPOINT_COPY_COUNT}</text>
          <text x={W / 2} y={phone ? 622 : 388} text-anchor="middle" class="mono strong">{WEIGHT_SHARE_REPLICA_COUNT} × {WEIGHT_SHARE_TOKEN_CAP_PER_REPLICA} = {WEIGHT_SHARE_COMBINED_TOKEN_CAP} {phone ? t('tokens across two pools', '两个私有池合计 token') : t('token capacity across two private pools', '两个私有池的合计上限')}</text>
        </g>
        <text x={W / 2} y={phone ? 650 : 416} text-anchor="middle" class="tag strong">{phone ? t('MOSS: max_total_tokens = 30000, not kv_cache_bytes', 'MOSS：max_total_tokens = 30000，不用 kv_cache_bytes') : t("MOSS config: max_total_tokens = 30000, not Step 3's kv_cache_bytes", 'MOSS 配置：max_total_tokens = 30000，不用第 3 步的 kv_cache_bytes')}</text>
        <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('W is symbolic · KV, graphs and request state stay private', 'W 是符号 · KV、graph 和请求状态仍私有') : t('W is symbolic: no byte saving is claimed · KV, graphs and request state stay private', 'W 只是符号，不声称省下多少字节 · KV、graph 和请求状态仍私有')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: MPS does not change memory sums', '下一步：MPS 不改变显存加法') : t('Next: MPS manages execution, not these memory sums', '下一步：MPS 管执行，不改变这些显存加法')}</text>
      {:else if step === 4}
        <text x="20" y="22" class="tag strong">mps = auto · {t('one physical GPU', '一张物理 GPU')}</text>
        <text x="20" y="46" class="tag">MPS = {phone ? t('shared GPU execution among processes', '多个进程共享 GPU 执行') : t('a service that shares GPU execution among processes', '让多个进程共享 GPU 执行的服务')}</text>
        <text x="20" y="68" class="tag">{t('Blue: eligible client · orange: excluded TP process', '蓝色：合格 client · 橙色：被排除的 TP 进程')}</text>
        <rect x={phone ? 15 : 20} y="96" width={phone ? 270 : 445} height="260" rx="12" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 29 : 34} y="122" class="rowlabel">GPU 0 · UUID → {MPS_LEASE_COUNT_PER_GPU} {t('pipeline lease', '份 pipeline 租约')}</text>
        {#each Array(MPS_TEACHING_CLIENT_COUNT) as _, i}
          <rect x={phone ? 30 : 36} y={143 + i * 66} width={phone ? 160 : 230} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={phone ? 44 : 50} y={172 + i * 66} class="tag strong">process {i} · cuda:0 · non-TP</text>
          <path d="M{phone ? 195 : 272} {166 + i * 66} H{phone ? 226 : 322}" stroke="var(--accent)" stroke-width="2" marker-end="url(#budget-arrow)" />
        {/each}
        <rect x={phone ? 210 : 330} y="153" width={phone ? 60 : 110} height="120" rx="9" fill="white" stroke="var(--accent)" />
        <text x={phone ? 240 : 385} y="196" text-anchor="middle" class="tag strong">MPS</text>
        <text x={phone ? 240 : 385} y="221" text-anchor="middle" class="tag">{MPS_TEACHING_CLIENT_COUNT} clients</text>
        <text x={phone ? 240 : 385} y="246" text-anchor="middle" class="tag">{MPS_LEASE_COUNT_PER_GPU} lease</text>
        <text x={phone ? 29 : 34} y="310" class="mono strong">{MPS_TEACHING_CLIENT_COUNT} ≥ {MPS_AUTO_MIN_CLIENT_COUNT} → {t('enable', '启用')}</text>
        <text x={phone ? 29 : 34} y="338" class="tag">{t('Runtime verifies each named client.', '运行时逐个核对 client 名单。')}</text>
        <rect x={phone ? 15 : 490} y={phone ? 382 : 96} width={phone ? 270 : 210} height={phone ? 128 : 260} rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={phone ? 29 : 504} y={phone ? 408 : 122} class="rowlabel">TP process · {MPS_TEACHING_TP_CLIENT_COUNT} client</text>
        <text x={phone ? 29 : 504} y={phone ? 437 : 153} class="tag">tp_size &gt; 1 → {t('not eligible', '不合格')}</text>
        <text x={phone ? 29 : 504} y={phone ? 465 : 183} class="tag">{t('No MPS attachment', '不加入 MPS')}</text>
        {#if !phone}
          <text x="504" y="213" class="tag">{t('A multi-GPU placement', '跨多卡的进程')}</text>
          <text x="504" y="239" class="tag">{t('is also rejected.', '也会被拒绝。')}</text>
          <text x="504" y="284" class="tag strong">mps=on: {t('failure is an error', '失败会报错')}</text>
          <text x="504" y="315" class="tag">auto: {t('ineligible → no MPS', '不合格 → 不用 MPS')}</text>
        {/if}
        <text x={W / 2} y={phone ? 550 : 388} text-anchor="middle" class="tag strong">{t('A lease is the pipeline’s ownership record, not extra memory.', '租约是 pipeline 的所有权记录，不是额外显存。')}</text>
        <text x={W / 2} y={phone ? 580 : 414} text-anchor="middle" class="tag">{phone ? t('Execution sharing changes; memory declarations do not.', '执行共享改变；显存申报不变。') : t('MPS changes execution sharing; fractions, KV and reserves stay as declared.', 'MPS 改变执行共享；比例、KV 和 reserve 申报不变。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: keep one AuK component resident', '下一步：只让一件 AuK 组件常驻') : t('Next: instead of more replicas, keep only one AuK component resident', '下一步：不增加副本，改为只让一件 AuK 组件常驻')}</text>
      {:else if step === 5}
        <text x="20" y="22" class="tag strong">AuK serial offload · {phone ? t('one resident component', '一次一件组件常驻') : t('one request, one GPU component at a time', '一个请求，一次只让一件组件上 GPU')}</text>
        <text x="20" y="46" class="tag">offload = {phone ? t('host-sleep weights, then restore them', '权重休眠到主机，之后再恢复') : t('sleep weights on the host, then restore them for a later stage', '让权重休眠到主机，轮到后续 stage 再恢复')}</text>
        <text x="20" y="68" class="tag">{phone ? t('Blue: resident · grey: sleeping · orange: waiting', '蓝：常驻 · 灰：休眠 · 橙：等待') : t('Blue: resident component · grey: sleeping component · orange: waiting request', '蓝色：常驻组件 · 灰色：休眠组件 · 橙色：等待请求')}</text>
        <rect x={phone ? 15 : 20} y="82" width={phone ? 270 : 680} height="22" rx="6" fill="var(--accent-soft)" />
        <text x={W / 2} y="98" text-anchor="middle" class="tag strong">A {t('owns the request path', '持有请求所有权')} · {AUK_OFFLOAD_REQUEST_OWNER_COUNT} owner · B {t('waits', '等待')}</text>
        {#each aukFrames as frame}
          <rect x={frame.x} y={frame.y} width={phone ? 270 : 210} height="146" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x={frame.x + 13} y={frame.y + 24} class="rowlabel">{frame.index + 1} · {frame.active}</text>
          {#each AUK_OFFLOAD_COMPONENTS as component, i}
            <rect x={frame.x + 13} y={frame.y + 38 + i * 29} width={phone ? 244 : 184} height="23" rx="4" fill={component === frame.active ? 'var(--accent-soft)' : 'var(--bg)'} stroke={component === frame.active ? 'var(--accent)' : 'var(--faint)'} />
            <text x={frame.x + 22} y={frame.y + 55 + i * 29} class="tag">{component} · {component === frame.active ? t('resident', '常驻') : t('sleeping', '休眠')}</text>
          {/each}
          <text x={frame.x + 13} y={frame.y + 137} class="tag strong">{AUK_OFFLOAD_RESIDENT_COUNT} {t('resident', '件常驻')} + {AUK_OFFLOAD_SLEEPING_COUNT} {t('sleeping', '件休眠')}</text>
        {/each}
        <rect x={phone ? 15 : 20} y={phone ? 646 : 282} width={phone ? 270 : 680} height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={W / 2} y={phone ? 673 : 310} text-anchor="middle" class="tag strong">A {t('terminal result delivered', '终态结果已交付')} → {t('release owner', '释放所有权')} → B {t('may begin', '才能开始')}</text>
        <text x={W / 2} y={phone ? 720 : 352} text-anchor="middle" class="mono strong">{AUK_OFFLOAD_COMPONENT_COUNT} components · {AUK_OFFLOAD_RESIDENT_COUNT} resident · {AUK_OFFLOAD_SLEEPING_COUNT} sleeping</text>
        <text x={W / 2} y={phone ? 748 : 380} text-anchor="middle" class="tag">max_batch_size = {AUK_OFFLOAD_MAX_BATCH_SIZE} · process_replicas = {AUK_OFFLOAD_PROCESS_REPLICA_COUNT} · tp_size = 1</text>
        <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Two sleeping boxes do not prove two-thirds byte savings', '两件休眠不等于省三分之二字节') : t('Component sizes differ: 2 sleeping boxes do not prove a two-thirds byte saving', '三件组件大小不同：两件休眠不等于省三分之二字节')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: measure the waiting these choices cause', '下一章：测量这些选择带来的等待') : t('Next chapter: measure the waits these budget choices introduce', '下一章：测量这些显存选择带来的等待')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
