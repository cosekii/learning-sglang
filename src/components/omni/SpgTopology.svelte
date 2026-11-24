<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    QWEN_SPEECH_DEFAULT_STAGE_PROCESSES,
    QWEN_SPEECH_REPLICA2_STAGE_PROCESSES,
    QWEN_SPEECH_STAGE_TYPE_COUNT,
    QWEN_SPEECH_UNCHANGED_STAGE_COUNT,
    QWEN_SPEECH_DEFAULT_COPY_COUNT,
    QWEN_SPEECH_REPLICA2_COPY_COUNT,
    QWEN_SPEECH_DEFAULT_GPU_IDS,
    QWEN_SPEECH_REPLICA2_GPU_IDS,
    QWEN_SPEECH_DEFAULT_GPU_COUNT,
    QWEN_SPEECH_REPLICA2_GPU_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `When requests queue, copies can serve them in parallel, using one more GPU. The same ${QWEN_SPEECH_STAGE_TYPE_COUNT} stages now run in ${QWEN_SPEECH_REPLICA2_COPY_COUNT} processes instead of ${QWEN_SPEECH_DEFAULT_COPY_COUNT}.`,
    captionZh: `请求排队时，多份可同时处理，要多用一张 GPU。${QWEN_SPEECH_STAGE_TYPE_COUNT} 个 stage 不变，进程从 ${QWEN_SPEECH_DEFAULT_COPY_COUNT} 个变 ${QWEN_SPEECH_REPLICA2_COPY_COUNT} 个。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 850 : 480);
  const panels = $derived(phone ? [
    { x: 15, y: 75, w: 270, h: 350, replica2: false },
    { x: 15, y: 440, w: 270, h: 350, replica2: true },
  ] : [
    { x: 20, y: 80, w: 325, h: 355, replica2: false },
    { x: 375, y: 80, w: 325, h: 355, replica2: true },
  ]);
  const otherStages = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage !== 'talker_ar' && stage !== 'code2wav');
  const replicated = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter(({ stage }) => stage === 'talker_ar' || stage === 'code2wav');
  const copies = (stage: string) => QWEN_SPEECH_REPLICA2_STAGE_PROCESSES.filter((process) => process.stage === stage);
  const device = (gpu: number | null) => gpu === null ? 'CPU' : `GPU ${gpu}`;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Two speech processes are each copied, so seven stages run in nine processes on three GPUs instead of seven on two">
      <text x={phone ? 15 : 30} y={phone ? 18 : 22} class="tag strong">replica = {t('one whole process, copied', '同一进程再复制一份')}</text>
      <text x={phone ? 15 : 30} y={phone ? 39 : 43} class="tag">{t('One process per stage here; queued requests can run in parallel.', '每个 stage 一个进程；排队时多份可同时处理。')}</text>
      <rect x={phone ? 15 : 400} y={phone ? 51 : 51} width="11" height="11" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 32 : 418} y={phone ? 61 : 61} class="tag">{t('copy 1', '第 1 份')}</text>
      <rect x={phone ? 105 : 500} y={phone ? 51 : 51} width="11" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 122 : 518} y={phone ? 61 : 61} class="tag strong">{t('copy 2 = added', '第 2 份 = 新增')}</text>

      {#each panels as panel}
        {@const innerX = panel.x + 20}
        {@const innerW = panel.w - 40}
        {@const otherY = panel.y + 35}
        {@const rowY = panel.y + 170}
        {@const boxW = panel.replica2 ? (innerW - 10) / 2 : innerW}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={innerX} y={panel.y + 22} class="rowlabel">{panel.replica2 ? t('REPLICAS · SAME 7 STAGES', '多副本 · 仍是 7 个 stage') : t('DEFAULT · 7 STAGES', '默认 · 7 个 stage')}</text>

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
            <rect {x} {y} width={boxW} height="54" rx="9" fill={added ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={added ? 'var(--gen)' : 'var(--accent)'} stroke-width="1.5" />
            <text x={x + 10} y={y + 17} class="mono strong">{stage.stage}</text>
            <text x={x + 10} y={y + 34} class="tag strong">{t(`copy ${j + 1}`, `第 ${j + 1} 份`)}{added ? t(' · added', ' · 新增') : ''}</text>
            <text x={x + 10} y={y + 49} class="tag">{panel.replica2 && stage.stage === 'code2wav' && j === 0 ? 'GPU 0 → GPU 1' : device(copy.gpu)}</text>
          {/each}
        {/each}

        <text x={panel.x + panel.w / 2} y={panel.y + panel.h - 38} text-anchor="middle" class="legend strong">
          {QWEN_SPEECH_UNCHANGED_STAGE_COUNT} + {panel.replica2 ? '2 + 2' : '1 + 1'} = {panel.replica2 ? QWEN_SPEECH_REPLICA2_COPY_COUNT : QWEN_SPEECH_DEFAULT_COPY_COUNT} {t('processes', '个进程')}
        </text>
        <text x={panel.x + panel.w / 2} y={panel.y + panel.h - 15} text-anchor="middle" class="formula">
          {panel.replica2 ? QWEN_SPEECH_REPLICA2_GPU_COUNT : QWEN_SPEECH_DEFAULT_GPU_COUNT} {t('GPUs', '张 GPU')} · {t('ids', '编号')} {(panel.replica2 ? QWEN_SPEECH_REPLICA2_GPU_IDS : QWEN_SPEECH_DEFAULT_GPU_IDS).join(', ')}
        </text>
      {/each}
      <text x={W / 2} y={H - 25} text-anchor="middle" class="footnote">{t('Next: how does a request choose a copy?', '下一步：请求怎样选定一份？')}</text>
      <text x={W / 2} y={H - 9} text-anchor="middle" class="footnote">{t('A config comparison, not a speed measurement.', '这里只比较配置，没有测速度。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .formula { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .legend.strong { font-weight: 650; }
</style>
