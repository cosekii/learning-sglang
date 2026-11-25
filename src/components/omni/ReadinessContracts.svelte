<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    READINESS_ONE_SHOT_INPUTS,
    READINESS_ONE_SHOT_ARRIVED_COUNTS,
    READINESS_ONE_SHOT_REQUIRED_COUNT,
    READINESS_STREAM_CHUNK_IDS,
    READINESS_STREAM_STORED_COUNTS,
    READINESS_BUILD_MIN_CHUNKS,
    READINESS_BUILD_SNAPSHOTS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Thinker hands over the request only when both whole results arrive: a one-shot handoff.',
    captionZh: '两份完整结果都到齐，thinker 才交出请求：这叫 one-shot handoff。',
  }, {
    caption: 'A chunk is one small piece of a result. Talker_ar stores early chunks in arrival order before the whole result arrives.',
    captionZh: 'chunk 是一小段结果。整份结果还没到，talker_ar 先按到达顺序存好。',
  }, {
    caption: 'By default, five usable chunks can start building the request early. A finished stream can also start building with fewer chunks.',
    captionZh: '默认存够 5 段可用 chunk 就能提前构建。流结束后，不够 5 段也能构建。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 2 ? 500 : 400) : (step === 2 ? 390 : 340));
  const panels = $derived(READINESS_ONE_SHOT_ARRIVED_COUNTS.map((arrived, i) => ({
    arrived,
    x: phone ? 15 : 20 + i * 235,
    y: phone ? 90 + i * 140 : 100,
    w: phone ? 270 : 210,
    h: phone ? 125 : 170,
  })));
  const streamPanels = $derived(READINESS_STREAM_STORED_COUNTS.map((count, i) => ({
    count,
    x: 20 + i * 235,
    y: 100,
    w: 210,
    h: 170,
  })));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? t('An image-only speech request needs complete image_encoder and preprocessing inputs. With zero or one of the two inputs, thinker waits. With both inputs, thinker dispatches the request to the scheduler. This waiting rule is a one-shot handoff.', '只有图的 speech 请求需要 image_encoder 和 preprocessing 的完整输入。两份输入到 0 份或 1 份时，thinker 等待；两份都到齐时，thinker 把请求交给 scheduler。这种等待规则叫 one-shot handoff。') : step === 1 ? t('A chunk is one small piece of a result. Talker_ar accepts early thinker chunks and stores them in arrival order before the whole result arrives. The example shows one, two, then three stored chunks. Storage does not imply computation has started.', 'chunk 是一小段结果。整份结果还没到，talker_ar 也允许接收 thinker 的 chunk，并按到达顺序存下。本例依次存下 1、2、3 段；存下不表示开始计算。') : t('The default early-build minimum is five usable chunks. Four usable chunks with an open stream wait; five can enter the request builder. A finished stream can also enter with two usable chunks. Entering the builder does not mean GPU work has started.', '默认至少 5 段可用 chunk 才能提前构建。流未结束时，4 段等待，5 段进入请求构建器；流已结束时，2 段也能进入。进入构建器不表示 GPU 已开始计算。')}>
      {#if step === 0}
      <text x={phone ? 15 : 20} y="20" class="tag strong">one-shot handoff = {t('each source delivers one whole result', '每个来源一次交来整份结果')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{t('Blue border = whole result arrived · gray dashes = not yet', '蓝框 = 整份结果已到 · 灰虚线 = 还没到')}</text>
      <text x={phone ? 15 : 20} y="68" class="tag">{t('A: image only · needs both · early results wait at thinker', 'A 只有图，需要两份；先到的留在 thinker 收件格')}</text>

      {#if !phone}
        {#each panels as panel, i}
          {@const canDispatch = panel.arrived === READINESS_ONE_SHOT_REQUIRED_COUNT}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke={canDispatch ? 'var(--accent)' : 'var(--line)'} stroke-width={canDispatch ? 2 : 1} />
          <text x={panel.x + 12} y={panel.y + 23} class="rowlabel">{i + 1} · {panel.arrived} / {READINESS_ONE_SHOT_REQUIRED_COUNT} {t('ARRIVED', '份已到')}</text>
          {#each READINESS_ONE_SHOT_INPUTS as input, j}
            {@const ready = panel.arrived > j}
            <rect x={panel.x + 12} y={panel.y + 43 + j * 42} width={panel.w - 24} height="32" rx="6" fill="white" stroke={ready ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={ready ? '0' : '4 3'} />
            <text x={panel.x + 21} y={panel.y + 64 + j * 42} class="mono">{input}</text>
            <text x={panel.x + panel.w - 21} y={panel.y + 64 + j * 42} text-anchor="end" class="tag strong">{ready ? t('✓ at thinker', '✓ 到 thinker') : t('— not yet', '— 未到')}</text>
          {/each}
          <rect x={panel.x + 12} y={panel.y + 132} width={panel.w - 24} height="28" rx="6" fill="white" stroke={canDispatch ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={canDispatch ? '0' : '4 3'} />
          <text x={panel.x + panel.w / 2} y={panel.y + 151} text-anchor="middle" class="legend strong">{canDispatch ? 'thinker → scheduler' : `thinker · ${t('WAIT', '等待')}`}</text>
        {/each}
      {:else}
        <text x="55" y="94" text-anchor="middle" class="mono">image_encoder</text>
        <text x="150" y="94" text-anchor="middle" class="mono">preprocessing</text>
        <text x="245" y="94" text-anchor="middle" class="mono">thinker</text>
        {#each READINESS_ONE_SHOT_ARRIVED_COUNTS as arrived, i}
          {@const canDispatch = arrived === READINESS_ONE_SHOT_REQUIRED_COUNT}
          {@const y = 104 + i * 80}
          <rect x="10" y={y} width="280" height="68" rx="9" fill="var(--bg)" stroke={canDispatch ? 'var(--accent)' : 'var(--line)'} stroke-width={canDispatch ? 2 : 1} />
          <text x="18" y={y + 15} class="rowlabel">{i + 1} · {arrived} / {READINESS_ONE_SHOT_REQUIRED_COUNT} {t('ARRIVED', '份已到')}</text>
          {#each [0, 1, 2] as column}
            {@const ready = column < 2 ? arrived > column : canDispatch}
            <rect x={15 + column * 95} y={y + 23} width="80" height="34" rx="6" fill="white" stroke={ready ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={ready ? '0' : '4 3'} />
            <text x={55 + column * 95} y={y + 45} text-anchor="middle" class="tag strong">{column === 2 ? (canDispatch ? '→ scheduler' : t('WAIT', '等待')) : (ready ? t('✓ at thinker', '✓ 到 thinker') : t('— not yet', '— 未到'))}</text>
          {/each}
        {/each}
      {/if}

      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t("Example: image_encoder's result arrives first.", '本例：image_encoder 的完整结果先到。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Next: what if a result arrives in pieces instead?', '下一步：结果分成小段送来，也要全部到齐吗？')}</text>
      {:else if step === 1}
      <text x={phone ? 15 : 20} y="20" class="tag strong">chunk = {t('one small piece of a result', '一小段结果')}</text>
      <rect x={phone ? 15 : 20} y="33" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 31 : 36} y="42" class="tag">{t('received', '已收到')}</text>
      <rect x={phone ? 118 : 130} y="33" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 134 : 146} y="42" class="tag">{t('new chunk', '新到的小段')}</text>
      <text x={phone ? 15 : 20} y="64" class="tag">thinker → talker_ar · {t('chunk numbers start at 0', 'chunk 编号从 0 开始')}</text>
      <text x={phone ? 15 : 20} y="86" class="tag">{t('Early chunks: save in order before whole result', '整份结果还没到，也能按到达顺序先存')}</text>

      {#if !phone}
        {#each streamPanels as panel, i}
          {@const wholeArrived = i === streamPanels.length - 1}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 12} y={panel.y + 23} class="rowlabel">{t(`picture ${i + 1}`, `第 ${i + 1} 张`)} · {panel.count} {t(panel.count === 1 ? 'chunk stored' : 'chunks stored', '段已存')}</text>
          <text x={panel.x + 12} y={panel.y + 48} class="mono">thinker → talker_ar</text>
          {#each READINESS_STREAM_CHUNK_IDS.slice(0, panel.count) as chunkId, j}
            {@const isNew = j === panel.count - 1}
            <rect x={panel.x + 15 + j * 48} y={panel.y + 60} width="40" height="32" rx="6" fill={isNew ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={isNew ? 'var(--gen)' : 'var(--accent)'} stroke-width={isNew ? 2 : 1} />
            <text x={panel.x + 35 + j * 48} y={panel.y + 81} text-anchor="middle" class="mono">{chunkId}</text>
          {/each}
          <rect x={panel.x + 12} y={panel.y + 113} width={panel.w - 24} height="32" rx="6" fill="white" stroke={wholeArrived ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={wholeArrived ? '0' : '4 3'} />
          <text x={panel.x + panel.w / 2} y={panel.y + 134} text-anchor="middle" class="tag strong">{wholeArrived ? t('whole result · arrived', '整份结果 · 已到') : t('whole result · not yet', '整份结果 · 还未到')}</text>
        {/each}
      {:else}
        {#each READINESS_STREAM_STORED_COUNTS as count, i}
          {@const wholeArrived = i === READINESS_STREAM_STORED_COUNTS.length - 1}
          {@const y = 104 + i * 80}
          <rect x="10" y={y} width="280" height="68" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="18" y={y + 15} class="rowlabel">{t(`picture ${i + 1}`, `第 ${i + 1} 张`)} · {count} {t(count === 1 ? 'chunk stored' : 'chunks stored', '段已存')}</text>
          {#each READINESS_STREAM_CHUNK_IDS.slice(0, count) as chunkId, j}
            {@const isNew = j === count - 1}
            <rect x={18 + j * 42} y={y + 25} width="34" height="32" rx="6" fill={isNew ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={isNew ? 'var(--gen)' : 'var(--accent)'} stroke-width={isNew ? 2 : 1} />
            <text x={35 + j * 42} y={y + 46} text-anchor="middle" class="mono">{chunkId}</text>
          {/each}
          <rect x="150" y={y + 25} width="130" height="32" rx="6" fill="white" stroke={wholeArrived ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={wholeArrived ? '0' : '4 3'} />
          <text x="215" y={y + 46} text-anchor="middle" class="tag strong">{wholeArrived ? t('whole · arrived', '整份 · 已到') : t('whole · not yet', '整份 · 还未到')}</text>
        {/each}
      {/if}

      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t('This result has 3 chunks; others can have more or fewer.', '本例有 3 小段，别的结果可以更多或更少。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Saving does not start work · Next: when does it start?', '存下不等于开始算。下一步：何时能开始算？')}</text>
      {:else}
      <text x={phone ? 15 : 20} y="20" class="tag strong">build-ready = {t('can build a request from stored data', '能把已存数据构建成请求')}</text>
      <text x={phone ? 15 : 20} y="44" class="tag">{t('Default: 5 usable chunks early · stream done also passes', '默认：5 段可提前构建 · 流结束也通过')}</text>
      <text x={phone ? 15 : 20} y="68" class="tag">{t('usable = stored, except a trailing end marker', '可用 = 已存下，末尾结束标记不算')}</text>
      <rect x={phone ? 15 : 20} y="81" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 31 : 36} y="90" class="tag">{t('condition met', '条件满足')}</text>
      <rect x={phone ? 137 : 140} y="81" width="10" height="10" rx="2" fill="white" stroke="var(--faint)" stroke-dasharray="3 2" />
      <text x={phone ? 153 : 156} y="90" class="tag">{t('not met', '未满足')}</text>

      {#each READINESS_BUILD_SNAPSHOTS as snapshot, i}
        {@const buildReady = snapshot.done || snapshot.usable >= READINESS_BUILD_MIN_CHUNKS}
        {@const panel = phone ? { x: 10, y: 110 + i * 110, w: 280, h: 96 } : { x: 20 + i * 235, y: 116, w: 210, h: 188 }}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke={buildReady ? 'var(--accent)' : 'var(--line)'} stroke-width={buildReady ? 2 : 1} />
        <text x={panel.x + 10} y={panel.y + (phone ? 16 : 24)} class="rowlabel">{i + 1} · {snapshot.usable} / {READINESS_BUILD_MIN_CHUNKS} {t('usable', '段可用')}</text>
        {#each Array.from({ length: READINESS_BUILD_MIN_CHUNKS }, (_, j) => j) as j}
          {@const arrived = j < snapshot.usable}
          <rect x={panel.x + 10 + j * (phone ? 25 : 36)} y={panel.y + (phone ? 26 : 43)} width={phone ? 20 : 29} height={phone ? 25 : 32} rx="5" fill={arrived ? 'var(--accent-soft)' : 'white'} stroke={arrived ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={arrived ? '0' : '4 3'} />
          <text x={panel.x + 10 + j * (phone ? 25 : 36) + (phone ? 10 : 14.5)} y={panel.y + (phone ? 44 : 64)} text-anchor="middle" class="mono">{arrived ? j : '—'}</text>
        {/each}
        {#if phone}
          <rect x="154" y={panel.y + 26} width="126" height="25" rx="5" fill={snapshot.done ? 'var(--accent-soft)' : 'white'} stroke={snapshot.done ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={snapshot.done ? '0' : '4 3'} />
          <text x="217" y={panel.y + 44} text-anchor="middle" class="tag strong">{snapshot.done ? t('stream · done', '流 · 已结束') : t('stream · open', '流 · 未结束')}</text>
          <rect x="20" y={panel.y + 61} width="260" height="26" rx="6" fill="white" stroke={buildReady ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={buildReady ? '0' : '4 3'} />
          <text x="150" y={panel.y + 79} text-anchor="middle" class="tag strong">{buildReady ? t('→ build request', '→ 构建请求') : t('WAIT', '等待')}</text>
        {:else}
          <rect x={panel.x + 12} y={panel.y + 94} width={panel.w - 24} height="32" rx="6" fill={snapshot.done ? 'var(--accent-soft)' : 'white'} stroke={snapshot.done ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={snapshot.done ? '0' : '4 3'} />
          <text x={panel.x + panel.w / 2} y={panel.y + 115} text-anchor="middle" class="tag strong">{snapshot.done ? t('stream · done', '流 · 已结束') : t('stream · open', '流 · 未结束')}</text>
          <rect x={panel.x + 12} y={panel.y + 140} width={panel.w - 24} height="32" rx="6" fill="white" stroke={buildReady ? 'var(--accent)' : 'var(--faint)'} stroke-dasharray={buildReady ? '0' : '4 3'} />
          <text x={panel.x + panel.w / 2} y={panel.y + 161} text-anchor="middle" class="tag strong">{buildReady ? t('→ build request', '→ 构建请求') : t('WAIT', '等待')}</text>
        {/if}
      {/each}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t('Build readiness only; admission and GPU work come later.', '只讲能否构建；准入和 GPU 计算还在后面。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Next: why does one decode step wait for the previous step?', '下一步：为什么下一步 decode 要等上一步？')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
