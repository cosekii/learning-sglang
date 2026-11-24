<script lang="ts">
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { COLOCATED_STAGE_SHARES, COLOCATED_USED_PERCENT, COLOCATED_FREE_PERCENT } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Five GPU stages put their memory budgets on one card. The budgets total ${COLOCATED_USED_PERCENT}%; ${COLOCATED_FREE_PERCENT}% is unassigned.`,
    captionZh: `五个 GPU stage 的显存预算放在同一张卡上。合计 ${COLOCATED_USED_PERCENT}%，还有 ${COLOCATED_FREE_PERCENT}% 未分配。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 520 : 400);
  const cells = Array.from({ length: 100 }, (_, i) => ({ used: i < COLOCATED_USED_PERCENT }));
  const rowY = (i: number) => (phone ? 85 : 100) + i * (phone ? 32 : 36);
  const gridX = $derived(phone ? 90 : 460), gridY = $derived(phone ? 280 : 80);
  const cell = $derived(phone ? 12 : 20);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Five GPU stages declare 94 percent of one card's memory budget">
      <text x={phone ? 20 : 35} y="30" class="rowlabel">{t('Review · first book, Ch.19 Step 3', '复习 · 第 1 本 Ch.19 Step 3')}</text>
      <text x={phone ? 20 : 35} y="50" class="tag">{t(phone ? 'config file = startup list' : 'config file = the program’s startup list', '配置文件 = 程序启动时读的清单')}</text>
      <rect x={phone ? 12 : 25} y="64" width={phone ? 276 : 350} height={phone ? 174 : 200} rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 20 : 35} y="82" class="tag">gpu_memory_fraction = {t('memory share', '显存占比')}</text>
      {#each COLOCATED_STAGE_SHARES as stage, i}
        <text x={phone ? 20 : 35} y={rowY(i) + 13} class="mono">{stage.name}</text>
        <text x={phone ? 278 : 365} y={rowY(i) + 13} text-anchor="end" class="mono strong">{stage.percent / 100} = {stage.percent}%</text>
      {/each}

      <text x={gridX + cell * 5} y={phone ? 250 : 35} text-anchor="middle" class="rowlabel">{t('one GPU · memory budget', '一块 GPU · 显存预算')}</text>
      <text x={gridX + cell * 5} y={phone ? 270 : 58} text-anchor="middle" class="legend">{t('100 squares · 1% each · five shares together', '100 格 · 每格 1% · 五项合起来')}</text>
      {#each cells as square, i}
        <rect x={gridX + (i % 10) * cell} y={gridY + Math.floor(i / 10) * cell} width={cell - 2} height={cell - 2} rx="2"
          fill={square.used ? 'var(--accent)' : 'white'} stroke={square.used ? 'var(--accent)' : 'var(--faint)'} />
      {/each}
      <text x={gridX + cell * 5} y={phone ? 435 : 322} text-anchor="middle" class="legend strong">2 + 2 + 78 + 10 + 2 = {COLOCATED_USED_PERCENT}%</text>
      <rect x={gridX} y={phone ? 455 : 340} width="12" height="12" rx="2" fill="var(--accent)" />
      <text x={gridX + 18} y={phone ? 465 : 350} class="tag strong">{t(`assigned: ${COLOCATED_USED_PERCENT}%`, `已分：${COLOCATED_USED_PERCENT}%`)}</text>
      <rect x={gridX + cell * 5 + 12} y={phone ? 455 : 340} width="12" height="12" rx="2" fill="white" stroke="var(--faint)" />
      <text x={gridX + cell * 5 + 30} y={phone ? 465 : 350} class="tag strong">{t(`unassigned: ${COLOCATED_FREE_PERCENT}%`, `未分：${COLOCATED_FREE_PERCENT}%`)}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Unassigned in this file, not measured free memory.', '配置文件未分配，不代表实际空闲。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
