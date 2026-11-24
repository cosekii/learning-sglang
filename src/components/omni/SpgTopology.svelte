<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `First, separate talker_ar and code2wav: ${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes total, GPU ids ${QWEN_SPEECH_DEFAULT_GPU_IDS.join(' and ')}. Add one copy of each: ${QWEN_SPEECH_REPLICA2_COPY_COUNT} processes total, GPU ids ${QWEN_SPEECH_REPLICA2_GPU_IDS.join(', ')}.`,
    captionZh: `先拆开 talker_ar 和 code2wav：共 ${QWEN_SPEECH_DEFAULT_COPY_COUNT} 个进程，GPU 编号 ${QWEN_SPEECH_DEFAULT_GPU_IDS.join('、')}。再各复制一份：共 ${QWEN_SPEECH_REPLICA2_COPY_COUNT} 个进程，GPU 编号 ${QWEN_SPEECH_REPLICA2_GPU_IDS.join('、')}。`,
  }, {
    caption: `Put talker_ar and code2wav in one process. Keep two stages and two schedulers; their hand-off can stay inside.`,
    captionZh: `把 talker_ar 和 code2wav 放进同一个进程。stage 和 scheduler 仍各有两个，交接可留在进程内。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 1 ? 810 : 850) : 480);
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
  const otherStages = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage !== 'talker_ar' && stage !== 'code2wav');
  const replicated = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage === 'talker_ar' || stage === 'code2wav');
  const copies = (stage: string) => QWEN_SPEECH_REPLICA2_STAGE_PROCESSES.filter((process) => process.stage === stage);
  const device = (gpu: number | null) => gpu === null ? 'CPU' : `GPU ${gpu}`;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'First separate the speech stages: seven total processes and GPU ids 0 and 1, then add one copy of each: nine total processes and GPU ids 0, 1, and 2' : t('Two stages and two schedulers stay unchanged while two separate processes become one shared process', '两个 stage 和两个 scheduler 不变，两个独立进程变成一个共用进程')}>
      {#if step === 0}
      <text x={phone ? 15 : 30} y={phone ? 18 : 22} class="tag strong">copy = {t('one more process for the same stage', '同一个 stage 多一个进程')}</text>
      <text x={phone ? 15 : 30} y={phone ? 39 : 43} class="tag">{t('Two configs assign GPU positions; → marks a move.', '两种配置指定 GPU 位置；→ 表示换卡。')}</text>
      <rect x={phone ? 15 : 400} y={phone ? 51 : 51} width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 32 : 418} y={phone ? 61 : 61} class="tag">{t('unchanged', '不变')}</text>
      <rect x={phone ? 105 : 500} y={phone ? 51 : 51} width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 122 : 518} y={phone ? 61 : 61} class="tag strong">{t('changed', '有变化')}</text>

      {#each panels as panel}
        {@const innerX = panel.x + 20}
        {@const innerW = panel.w - 40}
        {@const otherY = panel.y + 35}
        {@const rowY = panel.y + 170}
        {@const boxW = panel.replica2 ? (innerW - 10) / 2 : innerW}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={innerX} y={panel.y + 22} class="rowlabel">{panel.replica2 ? t('THEN COPY · SAME 7 STAGES', '再复制 · 仍是 7 个 stage') : t('SPLIT FIRST · 7 STAGES', '先拆开 · 7 个 stage')}</text>

        <rect x={innerX} y={otherY} width={innerW} height="120" rx="9" fill="white" stroke="var(--line)" />
        <text x={innerX + 10} y={otherY + 19} class="tag strong">{QWEN_SPEECH_UNCHANGED_STAGE_COUNT} {t('other stages · unchanged', '个其他 stage · 位置不变')}</text>
        {#each otherStages as stage, i}
          <text x={innerX + 10} y={otherY + 39 + i * 16} class="mono">{stage.stage}</text>
          <text x={innerX + innerW - 10} y={otherY + 39 + i * 16} text-anchor="end" class="tag">{device(stage.gpu)}</text>
        {/each}

        {#each replicated as stage, i}
          {@const copiesHere = panel.replica2 ? copies(stage.stage) : [{ ...stage, replica: 0 }]}
          {#each copiesHere as copy, j}
            {@const x = innerX + j * (boxW + 10)}
            {@const y = rowY + i * 65}
            {@const added = panel.replica2 && j === 1}
            {@const moved = (!panel.replica2 && stage.stage === 'talker_ar') || (panel.replica2 && stage.stage === 'code2wav' && j === 0)}
            {@const changed = !panel.replica2 || added || moved}
            <rect {x} {y} width={boxW} height="54" rx="9" fill={changed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={changed ? 'var(--gen)' : 'var(--accent)'} stroke-width="1.5" />
            <text x={x + 10} y={y + 17} class="mono strong">{stage.stage}</text>
            <text x={x + 10} y={y + 34} class="tag strong">{panel.replica2 ? t(`copy ${j + 1}`, `第 ${j + 1} 份`) : t('own process', '独立进程')}{added ? t(' · added', ' · 新增') : moved && panel.replica2 ? t(' · moved', ' · 换卡') : ''}</text>
            <text x={x + 10} y={y + 49} class="tag">{moved ? 'GPU 0 → GPU 1' : device(copy.gpu)}</text>
          {/each}
        {/each}

        <text x={panel.x + panel.w / 2} y={panel.y + panel.h - 38} text-anchor="middle" class="legend strong">
          {QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + {panel.replica2 ? '2 + 2' : '1 + 1'} = {panel.replica2 ? QWEN_SPEECH_REPLICA2_COPY_COUNT : QWEN_SPEECH_DEFAULT_COPY_COUNT} {t('processes', '个进程')}
        </text>
        <text x={panel.x + panel.w / 2} y={panel.y + panel.h - 15} text-anchor="middle" class="formula">
          {panel.replica2 ? QWEN_SPEECH_REPLICA2_GPU_COUNT : QWEN_SPEECH_DEFAULT_GPU_COUNT} {t('GPUs', '张 GPU')} · {t('ids', '编号')} {(panel.replica2 ? QWEN_SPEECH_REPLICA2_GPU_IDS : QWEN_SPEECH_DEFAULT_GPU_IDS).join(', ')}
        </text>
      {/each}
      <text x={W / 2} y={H - 25} text-anchor="middle" class="footnote">{t('2 requests: 1 copy = one by one; 2 copies = at once.', '2 个请求同时来：1 份一个个做，2 份同时做。')}</text>
      <text x={W / 2} y={H - 9} text-anchor="middle" class="footnote">{t('Next: what changes when stages share a process?', '下一步：两个 stage 共用进程会怎样？')}</text>
      {:else}
      <defs>
        <marker id="group-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <rect x={phone ? 15 : 30} y="12" width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 32 : 48} y="22" class="tag strong">{t('process boundary', '进程边界')}</text>
      <rect x={phone ? 150 : 255} y="12" width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 167 : 273} y="22" class="tag strong">{t('stage + scheduler', 'stage + scheduler')}</text>
      <text x={phone ? 15 : 30} y="44" class="tag">{t('Same two stages; only process boundaries change.', '两个 stage 不变，只改进程边界。')}</text>
      <text x={phone ? 15 : 30} y="64" class="tag">{t('GPU positions are not drawn.', '本图不画 GPU 位置。')}</text>

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
          <rect x={innerX} y={panel.y + 58} width={innerW} height="190" rx="9" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="1.7" />
          <text x={innerX + 10} y={panel.y + 74} class="tag strong">process: talker_ar</text>
        {:else}
          {#each replicated as stage, i}
            <rect x={innerX} y={panel.y + 58 + i * 108} width={innerW} height="82" rx="9" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="1.7" />
            <text x={innerX + 10} y={panel.y + 74 + i * 108} class="tag strong">process: {stage.stage}</text>
          {/each}
        {/if}

        {#each replicated as stage, i}
          {@const y = panel.y + 80 + i * 108}
          <rect x={cardX} {y} width={cardW} height="45" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.4" />
          <text x={cardX + 12} y={y + 19} class="mono strong">{stage.stage}</text>
          <text x={cardX + 12} y={y + 36} class="tag">{t('stage + its scheduler', 'stage + 自己的 scheduler')}</text>
        {/each}

        <line x1={arrowX} y1={panel.y + 128} x2={arrowX} y2={panel.y + 181} stroke="var(--muted)" stroke-width="1.5" marker-end="url(#group-arrow)" />
        <text x={arrowX - 13} y={panel.y + 157} text-anchor="end" class="tag">{panel.shared ? t('local path available', '可用进程内路径') : t('between processes', '跨进程交接')}</text>

        <text x={panel.x + panel.w / 2} y={panel.y + 270} text-anchor="middle" class="legend strong">
          {COLOCATED_SPEECH_STAGE_COUNT} {t('stages', '个 stage')} · {COLOCATED_SPEECH_SCHEDULER_COUNT} {t('schedulers', '个 scheduler')}
        </text>
        <text x={panel.x + panel.w / 2} y={panel.y + 291} text-anchor="middle" class="formula">
          {panel.shared ? COLOCATED_SPEECH_SHARED_PROCESS_COUNT : COLOCATED_SPEECH_SEPARATE_PROCESS_COUNT} {panel.shared ? t('process', '个进程') : t('processes', '个进程')}{panel.shared ? t(' · shared', ' · 共用') : ''}
        </text>
      {/each}
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Grouping changes process boundaries, not the stage list.', '分组只改进程边界，stage 名单不变。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: how can one stage use more than one GPU?', '下一步：一个 stage 怎样用多张 GPU？')}</text>
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
