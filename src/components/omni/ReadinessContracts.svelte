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
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Thinker hands over the request only when both whole results arrive: a one-shot handoff.',
    captionZh: '两份完整结果都到齐，thinker 才交出请求：这叫 one-shot handoff。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 400 : 340);
  const panels = $derived(READINESS_ONE_SHOT_ARRIVED_COUNTS.map((arrived, i) => ({
    arrived,
    x: phone ? 15 : 20 + i * 235,
    y: phone ? 90 + i * 140 : 100,
    w: phone ? 270 : 210,
    h: phone ? 125 : 170,
  })));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('An image-only speech request needs complete image_encoder and preprocessing inputs. With zero or one of the two inputs, thinker waits. With both inputs, thinker dispatches the request to the scheduler. This waiting rule is a one-shot handoff.', '只有图的 speech 请求需要 image_encoder 和 preprocessing 的完整输入。两份输入到 0 份或 1 份时，thinker 等待；两份都到齐时，thinker 把请求交给 scheduler。这种等待规则叫 one-shot handoff。')}>
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
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
