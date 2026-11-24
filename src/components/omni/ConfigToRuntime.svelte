<script lang="ts">
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    COLOCATED_STAGE_SHARES,
    COLOCATED_USED_PERCENT,
    COLOCATED_FREE_PERCENT,
    COLOCATED_PROCESS_GROUPS,
    COLOCATED_STAGE_COUNT,
    COLOCATED_PROCESS_COUNT,
    COLOCATED_GPU_PROCESS_GROUPS,
    COLOCATED_CPU_PROCESS_GROUPS,
    COLOCATED_GPU_PROCESS_COUNT,
    COLOCATED_CPU_PROCESS_COUNT,
    COLOCATED_MAIN_REQUEST_EDGES,
    COLOCATED_REQUEST_EDGE_COUNT,
    COLOCATED_MAIN_REQUEST_EDGE_COUNT,
    COLOCATED_OMITTED_REQUEST_EDGE_COUNT,
    COLOCATED_CROSS_PROCESS_EDGE_COUNT,
    COLOCATED_INTERNAL_EDGE_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Five GPU stages put their memory budgets on one card. The budgets total ${COLOCATED_USED_PERCENT}%; ${COLOCATED_FREE_PERCENT}% is unassigned.`,
    captionZh: `五个 GPU stage 的显存预算放在同一张卡上。合计 ${COLOCATED_USED_PERCENT}%，还有 ${COLOCATED_FREE_PERCENT}% 未分配。`,
  }, {
    caption: `The ${COLOCATED_STAGE_COUNT} stages run in ${COLOCATED_PROCESS_COUNT} processes. talker_ar and code2wav share one.`,
    captionZh: `${COLOCATED_STAGE_COUNT} 个 stage 跑在 ${COLOCATED_PROCESS_COUNT} 个进程里。talker_ar 和 code2wav 共用一个。`,
  }, {
    caption: `${COLOCATED_GPU_PROCESS_COUNT} processes use GPU 0; ${COLOCATED_CPU_PROCESS_COUNT} use only CPU. ${COLOCATED_GPU_PROCESS_COUNT} + ${COLOCATED_CPU_PROCESS_COUNT} = ${COLOCATED_PROCESS_COUNT} processes.`,
    captionZh: `${COLOCATED_GPU_PROCESS_COUNT} 个进程用 GPU 0，另外 ${COLOCATED_CPU_PROCESS_COUNT} 个只用 CPU。${COLOCATED_GPU_PROCESS_COUNT} + ${COLOCATED_CPU_PROCESS_COUNT} = ${COLOCATED_PROCESS_COUNT} 个进程。`,
  }, {
    caption: `${COLOCATED_REQUEST_EDGE_COUNT} hand-offs connect ${COLOCATED_STAGE_COUNT} stages in ${COLOCATED_PROCESS_COUNT} processes. What if talker_ar and code2wav first run separately, then get copies?`,
    captionZh: `${COLOCATED_STAGE_COUNT} 个 stage 跑在 ${COLOCATED_PROCESS_COUNT} 个进程里，共交接 ${COLOCATED_REQUEST_EDGE_COUNT} 次。先把 talker_ar 和 code2wav 拆开，再各复制一份，会怎样？`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 1 || step === 2 ? 580 : 520) : 400);
  const cells = Array.from({ length: 100 }, (_, i) => ({ used: i < COLOCATED_USED_PERCENT }));
  const rowY = (i: number) => (phone ? 85 : 100) + i * (phone ? 32 : 36);
  const gridX = $derived(phone ? 90 : 460), gridY = $derived(phone ? 280 : 80);
  const cell = $derived(phone ? 12 : 20);
  const runtimeStages = COLOCATED_PROCESS_GROUPS.flatMap((group) => group.stages);
  const singleStageProcessCount = COLOCATED_PROCESS_GROUPS.filter((group) => group.stages.length === 1).length;
  const stageY = (i: number) => 82 + i * 40;
  const processY = (i: number) => 230 + i * 34;
  type RouteNode = { name: string; x: number; y: number; w: number; h: number; device: string };
  const desktopRoute: RouteNode[] = [
    { name: 'preprocessing', x: 16, y: 140, w: 100, h: 52, device: 'CPU' },
    { name: 'image_encoder', x: 162, y: 84, w: 100, h: 52, device: 'GPU 0' },
    { name: 'audio_encoder', x: 162, y: 210, w: 100, h: 52, device: 'GPU 0' },
    { name: 'thinker', x: 308, y: 140, w: 100, h: 52, device: 'GPU 0' },
    { name: 'decode', x: 454, y: 72, w: 100, h: 52, device: 'CPU' },
    { name: 'talker_ar', x: 454, y: 192, w: 100, h: 52, device: 'GPU 0' },
    { name: 'code2wav', x: 602, y: 192, w: 100, h: 52, device: 'GPU 0' },
  ];
  const phoneRoute: RouteNode[] = [
    { name: 'preprocessing', x: 100, y: 70, w: 100, h: 34, device: 'CPU' },
    { name: 'image_encoder', x: 15, y: 130, w: 125, h: 34, device: 'GPU 0' },
    { name: 'audio_encoder', x: 160, y: 130, w: 125, h: 34, device: 'GPU 0' },
    { name: 'thinker', x: 100, y: 195, w: 100, h: 34, device: 'GPU 0' },
    { name: 'decode', x: 15, y: 260, w: 125, h: 34, device: 'CPU' },
    { name: 'talker_ar', x: 160, y: 260, w: 125, h: 34, device: 'GPU 0' },
    { name: 'code2wav', x: 160, y: 325, w: 125, h: 34, device: 'GPU 0' },
  ];
  const routeNodes = $derived(phone ? phoneRoute : desktopRoute);
  const routeNode = (name: string) => routeNodes.find((node) => node.name === name)!;
  const sharedRouteBox = $derived.by(() => {
    const talker = routeNode('talker_ar');
    const code2wav = routeNode('code2wav');
    return {
      x: Math.min(talker.x, code2wav.x) - 6,
      y: Math.min(talker.y, code2wav.y) - 26,
      w: Math.max(talker.x + talker.w, code2wav.x + code2wav.w) - Math.min(talker.x, code2wav.x) + 12,
      h: Math.max(talker.y + talker.h, code2wav.y + code2wav.h) - Math.min(talker.y, code2wav.y) + 46,
    };
  });
  const routePath = (from: string, to: string) => {
    const a = routeNode(from), b = routeNode(to);
    if (phone) {
      const ax = a.x + a.w / 2, ay = a.y + a.h;
      const bx = b.x + b.w / 2, by = b.y;
      return `M ${ax} ${ay + 8} C ${ax} ${(ay + by) / 2}, ${bx} ${(ay + by) / 2}, ${bx} ${by - 6}`;
    }
    const ax = a.x + a.w, ay = a.y + a.h / 2;
    const bx = b.x, by = b.y + b.h / 2;
    return `M ${ax + 9} ${ay} C ${ax + 20} ${ay}, ${bx - 30} ${by}, ${bx - 24} ${by} L ${bx - 10} ${by}`;
  };
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? "Five GPU stages declare 94 percent of one card's memory budget" : step === 1 ? 'Seven stages run in six processes; talker_ar and code2wav share one' : step === 2 ? `${COLOCATED_GPU_PROCESS_COUNT} processes use GPU 0 and ${COLOCATED_CPU_PROCESS_COUNT} use only CPU` : `${COLOCATED_REQUEST_EDGE_COUNT} hand-offs connect ${COLOCATED_STAGE_COUNT} stages in ${COLOCATED_PROCESS_COUNT} processes`}>
      {#if step === 0}
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
      {:else if step === 1}
      <defs>
        <marker id="process-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if !phone}
        <text x="20" y="26" class="rowlabel">{t('Same config as Step 1 · review Ch.17 Step 3', '接着第 1 步 · 同一份配置 · 复习 Ch.17 Step 3')}</text>
        <text x="20" y="55" class="tag strong">{COLOCATED_STAGE_COUNT} {t('stages', '个 stage')}</text>
        <text x="340" y="55" class="tag strong">{COLOCATED_PROCESS_COUNT} {t('stage processes', '个 stage 进程')}</text>
        <rect x="20" y="66" width="260" height="276" rx="10" fill="var(--bg)" stroke="var(--line)" />
        {#each runtimeStages as name, i}
          <text x="40" y={stageY(i)} class="mono">{name}</text>
          <line x1="280" y1={stageY(i) - 4} x2="330" y2={i < 5 ? stageY(i) - 4 : i === 5 ? 296 : 320} stroke="var(--muted)" marker-end="url(#process-arrow)" />
        {/each}
        {#each COLOCATED_PROCESS_GROUPS as group, i}
          {#if i < 5}
            <rect x="340" y={stageY(i) - 20} width="340" height="30" rx="7" fill="var(--bg)" stroke="var(--line)" />
            <text x="355" y={stageY(i)} class="tag">{t('process', '进程')}: {group.name}</text>
            <text x="660" y={stageY(i)} text-anchor="end" class="tag strong">{group.device}</text>
          {:else}
            <rect x="340" y="262" width="340" height="80" rx="9" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
            <text x="355" y="280" class="tag strong">{t('shared process', '共用进程')}: {group.name}</text>
            <text x="660" y="280" text-anchor="end" class="tag strong">{group.device}</text>
            <text x="365" y="304" class="mono">stage: {group.stages[0]}</text>
            <text x="365" y="328" class="mono">stage: {group.stages[1]}</text>
          {/if}
        {/each}
        <text x={W / 2} y="366" text-anchor="middle" class="legend strong">{t(`${singleStageProcessCount} one-stage processes + 1 shared process = ${COLOCATED_PROCESS_COUNT} processes`, `${singleStageProcessCount} 个单 stage 进程 + 1 个共用进程 = ${COLOCATED_PROCESS_COUNT} 个进程`)}</text>
      {:else}
        <text x="16" y="24" class="rowlabel">{t('Same config as Step 1', '接着第 1 步 · 同一份配置')}</text>
        <text x="16" y="43" class="tag">{t('Ch.17 Step 3: stages can share a process', 'Ch.17 Step 3：stage 可共用进程')}</text>
        <rect x="12" y="56" width="276" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="24" y="76" class="tag strong">{COLOCATED_STAGE_COUNT} {t('stages', '个 stage')}</text>
        {#each runtimeStages as name, i}
          <text x={i < 4 ? 24 : 160} y={102 + (i % 4) * 24} class="mono">{name}</text>
        {/each}
        <line x1="150" y1="202" x2="150" y2="226" stroke="var(--muted)" marker-end="url(#process-arrow)" />
        <text x="166" y="218" class="tag strong">{t(`start ${COLOCATED_PROCESS_COUNT} processes`, `启动 ${COLOCATED_PROCESS_COUNT} 个进程`)}</text>
        {#each COLOCATED_PROCESS_GROUPS as group, i}
          {#if i < 5}
            <rect x="12" y={processY(i)} width="276" height="28" rx="7" fill="var(--bg)" stroke="var(--line)" />
            <text x="24" y={processY(i) + 19} class="tag">{t('process', '进程')}: {group.name}</text>
            <text x="276" y={processY(i) + 19} text-anchor="end" class="tag strong">{group.device}</text>
          {:else}
            <rect x="12" y={processY(i)} width="276" height="74" rx="9" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
            <text x="24" y={processY(i) + 17} class="tag strong">{t('shared process', '共用进程')}: {group.name}</text>
            <text x="276" y={processY(i) + 17} text-anchor="end" class="tag strong">{group.device}</text>
            <text x="34" y={processY(i) + 42} class="mono">stage: {group.stages[0]}</text>
            <text x="34" y={processY(i) + 64} class="mono">stage: {group.stages[1]}</text>
          {/if}
        {/each}
        <text x={W / 2} y="516" text-anchor="middle" class="legend strong">{t(`${singleStageProcessCount} one-stage + 1 shared`, `${singleStageProcessCount} 个单 stage 进程 + 1 个共用进程`)}</text>
        <text x={W / 2} y="538" text-anchor="middle" class="legend strong">{singleStageProcessCount} + 1 = {COLOCATED_PROCESS_COUNT} {t('processes', '个进程')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`This counts only the ${COLOCATED_PROCESS_COUNT} stage processes above.`, `这里只数上面 ${COLOCATED_PROCESS_COUNT} 个 stage 进程。`)}</text>
      {:else if step === 2}
      <text x={phone ? 16 : 20} y="26" class="rowlabel">{t(phone ? 'Step 2 · device = GPU or CPU' : `Same ${COLOCATED_PROCESS_COUNT} processes as Step 2 · device = GPU or CPU`, phone ? `第 2 步 · 设备 = GPU 或 CPU` : `第 2 步的 ${COLOCATED_PROCESS_COUNT} 个进程 · 设备 = GPU 或 CPU`)}</text>
      <rect x={phone ? 12 : 20} y={phone ? 48 : 52} width={phone ? 276 : 420} height={phone ? 282 : 278} rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 24 : 36} y={phone ? 72 : 78} class="rowlabel">GPU 0 · {t('one card', '同一张卡')}</text>
      <text x={phone ? 276 : 424} y={phone ? 72 : 78} text-anchor="end" class="tag strong">{COLOCATED_GPU_PROCESS_COUNT} {t('processes', '个进程')}</text>
      {#each COLOCATED_GPU_PROCESS_GROUPS as group, i}
        <rect x={phone ? 24 : 36} y={(phone ? 86 : 92) + i * (phone ? 58 : 56)} width={phone ? 252 : 388} height="46" rx="7" fill="var(--bg)" stroke="var(--accent)" />
        <text x={phone ? 36 : 50} y={(phone ? 86 : 92) + i * (phone ? 58 : 56) + 18} class="tag strong">{t('process', '进程')}: {group.name}</text>
        <text x={phone ? 36 : 50} y={(phone ? 86 : 92) + i * (phone ? 58 : 56) + 36} class="mono">{group.stages.length > 1 ? 'stages' : 'stage'}: {group.stages.join(' + ')}</text>
      {/each}
      <rect x={phone ? 12 : 460} y={phone ? 346 : 52} width={phone ? 276 : 240} height={phone ? 160 : 278} rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 24 : 476} y={phone ? 370 : 78} class="rowlabel">{t('CPU only', '只用 CPU')}</text>
      <text x={phone ? 276 : 684} y={phone ? 370 : 78} text-anchor="end" class="tag strong">{COLOCATED_CPU_PROCESS_COUNT} {t('processes', '个进程')}</text>
      {#each COLOCATED_CPU_PROCESS_GROUPS as group, i}
        <rect x={phone ? 24 : 476} y={(phone ? 386 : 110) + i * (phone ? 52 : 80)} width={phone ? 252 : 208} height="46" rx="7" fill="var(--bg)" stroke="var(--line)" />
        <text x={phone ? 36 : 490} y={(phone ? 386 : 110) + i * (phone ? 52 : 80) + 18} class="tag strong">{t('process', '进程')}: {group.name}</text>
        <text x={phone ? 36 : 490} y={(phone ? 386 : 110) + i * (phone ? 52 : 80) + 36} class="mono">stage: {group.stages[0]}</text>
      {/each}
      <text x={W / 2} y={phone ? 532 : 360} text-anchor="middle" class="legend strong">{COLOCATED_GPU_PROCESS_COUNT} + {COLOCATED_CPU_PROCESS_COUNT} = {COLOCATED_PROCESS_COUNT} {t('processes', '个进程')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('One box is one process; the shared process still counts once.', '一框一个进程；共用进程仍只算一次。')}</text>
      {:else}
      <defs>
        <marker id="route-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--muted)" />
        </marker>
        <marker id="route-inside-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--gen)" />
        </marker>
      </defs>
      <text x={W / 2} y="24" text-anchor="middle" class="rowlabel">{t('Example: image + audio in; text + sound out', '例：图像和音频输入，文本和声音输出')}</text>
      <text x={W / 2} y="44" text-anchor="middle" class="tag">{t('arrow = data hand-off · dashed box = one process', '箭头 = 交接数据 · 虚线框 = 一个进程')}</text>
      {#each COLOCATED_MAIN_REQUEST_EDGES as edge}
        <path d={routePath(edge.from, edge.to)} fill="none" stroke={edge.from === 'talker_ar' ? 'var(--gen)' : 'var(--muted)'} stroke-width={edge.from === 'talker_ar' ? 2 : 1.4} marker-end={edge.from === 'talker_ar' ? 'url(#route-inside-arrow)' : 'url(#route-arrow)'} />
      {/each}
      {#each routeNodes.filter((node) => node.name !== 'talker_ar' && node.name !== 'code2wav') as node}
        <rect x={node.x - 6} y={node.y - 20} width={node.w + 12} height={node.h + 28} rx="9" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
        {#if !phone}<text x={node.x + 2} y={node.y - 7} class="tag">{t('process', '进程')} · {node.device}</text>{/if}
      {/each}
      <rect x={sharedRouteBox.x} y={sharedRouteBox.y} width={sharedRouteBox.w} height={sharedRouteBox.h} rx="9" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
      {#if !phone}<text x={sharedRouteBox.x + 6} y={sharedRouteBox.y + 17} class="tag strong">{t('shared process', '共用进程')} · GPU 0</text>{/if}
      {#each routeNodes as node}
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" fill="white" stroke="var(--line)" />
        <text x={node.x + node.w / 2} y={node.y + (phone ? 14 : 32)} text-anchor="middle" class="mono strong">{node.name}</text>
        {#if phone}<text x={node.x + node.w / 2} y={node.y + 28} text-anchor="middle" class="tag">{node.device}</text>{/if}
      {/each}
      <text x={W / 2} y={phone ? 405 : 300} text-anchor="middle" class="legend strong">{t(`${COLOCATED_MAIN_REQUEST_EDGE_COUNT} shown + ${COLOCATED_OMITTED_REQUEST_EDGE_COUNT} below = ${COLOCATED_REQUEST_EDGE_COUNT} hand-offs`, `主图 ${COLOCATED_MAIN_REQUEST_EDGE_COUNT} 条 + 下列 ${COLOCATED_OMITTED_REQUEST_EDGE_COUNT} 条 = ${COLOCATED_REQUEST_EDGE_COUNT} 次交接`)}</text>
      <line x1={phone ? 30 : 170} x2={phone ? 55 : 200} y1={phone ? 429 : 325} y2={phone ? 429 : 325} stroke="var(--muted)" stroke-width="1.4" />
      <text x={phone ? 65 : 210} y={phone ? 433 : 329} class="legend">{t(`${COLOCATED_CROSS_PROCESS_EDGE_COUNT} cross processes = ${COLOCATED_MAIN_REQUEST_EDGE_COUNT - COLOCATED_INTERNAL_EDGE_COUNT} shown + ${COLOCATED_OMITTED_REQUEST_EDGE_COUNT} below`, `${COLOCATED_CROSS_PROCESS_EDGE_COUNT} 次跨进程 = 主图 ${COLOCATED_MAIN_REQUEST_EDGE_COUNT - COLOCATED_INTERNAL_EDGE_COUNT} 次 + 下列 ${COLOCATED_OMITTED_REQUEST_EDGE_COUNT} 次`)}</text>
      <line x1={phone ? 30 : 170} x2={phone ? 55 : 200} y1={phone ? 452 : 350} y2={phone ? 452 : 350} stroke="var(--gen)" stroke-width="2" />
      <text x={phone ? 65 : 210} y={phone ? 456 : 354} class="legend">{t(`${COLOCATED_INTERNAL_EDGE_COUNT} inside the shared talker_ar process`, `${COLOCATED_INTERNAL_EDGE_COUNT} 次留在 talker_ar 进程内`)}</text>
      {#if phone}
        <text x={W / 2} y={H - 42} text-anchor="middle" class="footnote">{t('3 more input hand-offs to talker_ar:', '另外 3 条输入交接都到 talker_ar：')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">preprocessing · image_encoder · audio_encoder</text>
      {:else}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('3 more input hand-offs to talker_ar: preprocessing, image_encoder, audio_encoder', '另外 3 条输入交接都到 talker_ar：preprocessing、image_encoder、audio_encoder')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Arrows show data flow, not strict timing.', '箭头表示数据流向，不代表严格先后。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
