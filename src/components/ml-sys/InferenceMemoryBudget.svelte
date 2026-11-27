<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DEMO_PRE_MODEL_FREE_GB, DEMO_POST_MODEL_FREE_GB, DEMO_MODEL_LOAD_GB, DEMO_MEM_FRACTION_LOW, DEMO_MEM_FRACTION_HIGH, DEMO_DYNAMIC_LOW_GB, DEMO_DYNAMIC_HIGH_GB, DEMO_KV_LOW_GB, DEMO_KV_HIGH_GB } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `In this example, ${DEMO_MEM_FRACTION_LOW.toFixed(2)} leaves KV ${Math.abs(DEMO_KV_LOW_GB)} GB short. Raising it to ${DEMO_MEM_FRACTION_HIGH.toFixed(2)} gives KV ${DEMO_KV_HIGH_GB} GB by shrinking spare space.`,
    captionZh: `例中，${DEMO_MEM_FRACTION_LOW.toFixed(2)} 让 KV 短缺 ${Math.abs(DEMO_KV_LOW_GB)} GB。调到 ${DEMO_MEM_FRACTION_HIGH.toFixed(2)} 后，KV 有 ${DEMO_KV_HIGH_GB} GB，其他工作余量缩小。`,
  }, {
    caption: `Startup loads the model, creates the KV pool, then reserves graph buffers. The buffers use spare space.`,
    captionZh: `启动先装模型，再建 KV pool，最后预留 graph 缓冲。缓冲使用其他工作余量。`,
  }, {
    caption: `Capture records GPU steps without executing them. Fixed input and output buffers stay reserved for replay.`,
    captionZh: `capture 只记录 GPU 步骤，不执行它们。输入输出缓冲保留给 replay。`,
  }, {
    caption: `Replay reuses the same graph and buffers. New input and output overwrite the old values.`,
    captionZh: `replay 复用同一张 graph 和同一组缓冲。新输入输出覆盖旧值。`,
  }, {
    caption: `Graph buffers stay reserved. Activations are temporary results, present only when computation needs them.`,
    captionZh: `graph 缓冲继续保留。激活是临时结果，只在计算需要时存在。`,
  }, {
    caption: `In this example, 0.85 passes KV sizing. Runtime memory can still run out.`,
    captionZh: `本例的 0.85 通过 KV 尺寸计算。运行时仍可能显存不足。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  let reduceMotion = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (phone = query.matches);
    const updateMotion = () => (reduceMotion = motion.matches);
    update();
    updateMotion();
    query.addEventListener('change', update);
    motion.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', update);
      motion.removeEventListener('change', updateMotion);
    };
  });
  const PHASE_COUNTS = [6, 5, 5, 6, 6, 7];
  const PHASE_MS = 1000, REST_MS = 2600;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (reduceMotion) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [400, 540, 540, 540, 540, 650][step] : [410, 430, 430, 430, 430, 500][step]);
  const barWidth = (gb: number, total: number) => gb / DEMO_PRE_MODEL_FREE_GB * total;
  const replayInput = $derived(phase >= 3 ? 'input t+1' : 'input t');
  const replayOutput = $derived(phase >= 4 ? 'output t+1' : phase >= 2 ? 'output t' : '—');
  const replayCount = $derived(phase >= 4 ? 2 : phase >= 2 ? 1 : 0);
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <pattern id="headroom" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--panel)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--faint)" stroke-width="2" />
        </pattern>
      </defs>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
      {#if step === 0}
      {#if !phone}
        <text x="40" y="28" class="title">{t('mem_fraction_static = model + KV share of pre-load 78 GB', 'mem_fraction_static = 模型 + KV 在装入前 78 GB 中的份额')}</text>
        <rect x="40" y="45" width="170" height="65" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="125" y="70" text-anchor="middle" class="label">{t('before model loading', '装入模型前')}</text>
        <text x="125" y="98" text-anchor="middle" class="number">≈{DEMO_PRE_MODEL_FREE_GB} GB</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <line x1="220" y1="78" x2="490" y2="78" stroke="var(--gen)" stroke-width="4" />
          <path d="M490,78 l-12,-7 v14 z" fill="var(--gen)" />
          <text x="355" y="61" text-anchor="middle" class="load">{t('model loading', '模型装入')}: {DEMO_PRE_MODEL_FREE_GB} − {DEMO_POST_MODEL_FREE_GB} ≈ {DEMO_MODEL_LOAD_GB} GB</text>
          <rect x="510" y="45" width="170" height="65" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="595" y="70" text-anchor="middle" class="label">{t('after model loading', '装入模型后')}</text>
          <text x="595" y="98" text-anchor="middle" class="number">≈{DEMO_POST_MODEL_FREE_GB} GB</text>
        </g>

        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <text x="40" y="150" class="fraction">mem_fraction_static = {DEMO_MEM_FRACTION_LOW.toFixed(2)}</text>
          <text x="40" y="174" class="derive">(1 − {DEMO_MEM_FRACTION_LOW.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_LOW_GB} GB</text>
          <text x="40" y="198" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_LOW_GB} = {DEMO_KV_LOW_GB} GB KV</text>
          <text x="465" y="127" text-anchor="middle" class="label">{t('same 78 GB scale', '同一把 78 GB 标尺')}</text>
          <text x="650" y="126" text-anchor="middle" class="label">78 GB</text>
          <rect x="280" y="137" width="370" height="48" fill="var(--bg)" stroke="var(--line)" />
          <rect x="280" y="137" width={barWidth(DEMO_MODEL_LOAD_GB, 370)} height="48" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370)} y="137" width={barWidth(DEMO_DYNAMIC_LOW_GB, 370)} height="48" fill="url(#headroom)" stroke="var(--muted)" />
          <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) / 2} y="167" text-anchor="middle" class="barlabel">≈{DEMO_MODEL_LOAD_GB}</text>
          <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) + barWidth(DEMO_DYNAMIC_LOW_GB, 370) / 2} y="167" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_LOW_GB}</text>
          <line x1="650" y1="130" x2="650" y2="192" stroke="var(--fg)" stroke-width="2" />
        </g>
        <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="650" y="137" width={barWidth(Math.abs(DEMO_KV_LOW_GB), 370)} height="48" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="465" y="211" text-anchor="middle" class="short">{t(`startup stops · KV ${Math.abs(DEMO_KV_LOW_GB)} GB short`, `启动停止 · KV 短缺 ${Math.abs(DEMO_KV_LOW_GB)} GB`)}</text>
        </g>

        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
          <text x="40" y="260" class="fraction">mem_fraction_static = {DEMO_MEM_FRACTION_HIGH.toFixed(2)}</text>
          <text x="40" y="284" class="derive">(1 − {DEMO_MEM_FRACTION_HIGH.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="40" y="308" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_HIGH_GB} = {DEMO_KV_HIGH_GB} GB KV</text>
          <rect x="280" y="247" width="370" height="48" fill="var(--bg)" stroke="var(--line)" />
          <rect x="280" y="247" width={barWidth(DEMO_MODEL_LOAD_GB, 370)} height="48" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370)} y="247" width={barWidth(DEMO_KV_HIGH_GB, 370)} height="48" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={280 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 370)} y="247" width={barWidth(DEMO_DYNAMIC_HIGH_GB, 370)} height="48" fill="url(#headroom)" stroke="var(--muted)" />
          <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) / 2} y="277" text-anchor="middle" class="barlabel">≈{DEMO_MODEL_LOAD_GB}</text>
          <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) + barWidth(DEMO_KV_HIGH_GB, 370) / 2} y="277" text-anchor="middle" class="barlabel">{DEMO_KV_HIGH_GB}</text>
          <text x={280 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 370) + barWidth(DEMO_DYNAMIC_HIGH_GB, 370) / 2} y="277" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_HIGH_GB}</text>
          <line x1="650" y1="240" x2="650" y2="302" stroke="var(--fg)" stroke-width="2" />
        </g>

        <g opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="40" y="326" width="14" height="14" fill="var(--gen-soft)" stroke="var(--gen)" /><text x="62" y="338" class="label">{t('model load', '模型装入')}</text>
          <rect x="190" y="326" width="14" height="14" fill="var(--accent-soft)" stroke="var(--accent)" /><text x="212" y="338" class="label">KV cache</text>
          <rect x="330" y="326" width="14" height="14" fill="url(#headroom)" stroke="var(--muted)" /><text x="352" y="338" class="label">{t('spare space', '其他工作余量')}</text>
          <rect x="535" y="326" width="14" height="14" fill="var(--eos-soft)" stroke="var(--eos)" /><text x="557" y="338" class="label">{t('KV short', 'KV 短缺')}</text>
          <text x="360" y="373" text-anchor="middle" class="label">{t('KV cache saves token history; spare space is for other work.', 'KV cache 保存 token 历史；其他工作余量留给其他工作。')}</text>
        </g>
      {:else}
        <text x="20" y="23" class="title">{t('model + KV · 78 GB', '模型 + KV 的 78 GB 份额')}</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <text x="20" y="45" class="label">{t('before', '装入前')} ≈{DEMO_PRE_MODEL_FREE_GB} GB → {t('after', '装入后')} ≈{DEMO_POST_MODEL_FREE_GB} GB</text>
          <text x="20" y="68" class="load">{t('model', '模型')}: {DEMO_PRE_MODEL_FREE_GB} − {DEMO_POST_MODEL_FREE_GB} ≈ {DEMO_MODEL_LOAD_GB} GB</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <text x="20" y="102" class="fraction">{DEMO_MEM_FRACTION_LOW.toFixed(2)}: KV = {DEMO_KV_LOW_GB} GB</text>
          <text x="20" y="124" class="derive">(1 − {DEMO_MEM_FRACTION_LOW.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_LOW_GB} GB</text>
          <text x="20" y="146" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_LOW_GB} = {DEMO_KV_LOW_GB}</text>
          <rect x="30" y="158" width="240" height="28" fill="var(--bg)" stroke="var(--line)" />
          <rect x="30" y="158" width={barWidth(DEMO_MODEL_LOAD_GB, 240)} height="28" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB, 240)} y="158" width={barWidth(DEMO_DYNAMIC_LOW_GB, 240)} height="28" fill="url(#headroom)" stroke="var(--muted)" />
          <line x1="270" y1="153" x2="270" y2="193" stroke="var(--fg)" stroke-width="2" />
        </g>
        <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="270" y="158" width={barWidth(Math.abs(DEMO_KV_LOW_GB), 240)} height="28" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="150" y="207" text-anchor="middle" class="short">{t(`${Math.abs(DEMO_KV_LOW_GB)} GB short · startup stops`, `短缺 ${Math.abs(DEMO_KV_LOW_GB)} GB · 启动停止`)}</text>
        </g>

        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
          <text x="20" y="232" class="fraction">{DEMO_MEM_FRACTION_HIGH.toFixed(2)}: KV = {DEMO_KV_HIGH_GB} GB</text>
          <text x="20" y="254" class="derive">(1 − {DEMO_MEM_FRACTION_HIGH.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="20" y="276" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_HIGH_GB} = {DEMO_KV_HIGH_GB}</text>
          <rect x="30" y="288" width="240" height="28" fill="var(--bg)" stroke="var(--line)" />
          <rect x="30" y="288" width={barWidth(DEMO_MODEL_LOAD_GB, 240)} height="28" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB, 240)} y="288" width={barWidth(DEMO_KV_HIGH_GB, 240)} height="28" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 240)} y="288" width={barWidth(DEMO_DYNAMIC_HIGH_GB, 240)} height="28" fill="url(#headroom)" stroke="var(--muted)" />
          <line x1="270" y1="283" x2="270" y2="323" stroke="var(--fg)" stroke-width="2" />
        </g>
        <g opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
          <text x="150" y="337" text-anchor="middle" class="label">≈{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
          <text x="150" y="359" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=spare space', '橙=模型 · 蓝=KV · 灰=其他工作余量')}</text>
          <text x="150" y="379" text-anchor="middle" class="label">{t('red=KV short · KV saves token history', '红=KV 短缺 · KV 保存 token 历史')}</text>
        </g>
      {/if}
      {:else if step === 1}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Startup order · 78 GB available before model loading', '启动顺序 · 装入模型前有 78 GB 可用')}</text>
          <rect x="40" y="48" width="640" height="54" fill="url(#headroom)" stroke="var(--line)" />
          <rect x="40" y="48" width={barWidth(DEMO_MODEL_LOAD_GB, 640)} height="54" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640) / 2} y="81" text-anchor="middle" class="barlabel">{t(`model ≈${DEMO_MODEL_LOAD_GB} GB`, `模型 ≈${DEMO_MODEL_LOAD_GB} GB`)}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640)} y="48" width={barWidth(DEMO_KV_HIGH_GB, 640)} height="54" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">KV {DEMO_KV_HIGH_GB}</text>
          </g>
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB + DEMO_DYNAMIC_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_HIGH_GB}</text>
          <text x="40" y="124" class="label">{t('orange=model · blue=KV · gray=spare space', '橙=模型 · 蓝=KV · 灰=其他工作余量')}</text>

          <rect x="40" y="160" width="170" height="105" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="125" y="190" text-anchor="middle" class="fraction">1 · model</text>
          <text x="125" y="220" text-anchor="middle" class="number">≈{DEMO_MODEL_LOAD_GB} GB</text>
          <text x="125" y="247" text-anchor="middle" class="label">{t('loaded first', '最先装入')}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M215 212 h38" stroke="var(--fg)" stroke-width="3" /><path d="M253 212 l-10 -6 v12 z" fill="var(--fg)" />
            <rect x="265" y="160" width="170" height="105" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="350" y="190" text-anchor="middle" class="fraction">2 · KV pool</text>
            <text x="350" y="220" text-anchor="middle" class="number">{DEMO_KV_HIGH_GB} GB</text>
            <text x="350" y="247" text-anchor="middle" class="label">{t('created second', '第二步创建')}</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M440 212 h38" stroke="var(--fg)" stroke-width="3" /><path d="M478 212 l-10 -6 v12 z" fill="var(--fg)" />
            <rect x="490" y="160" width="190" height="105" rx="11" fill="var(--bg)" stroke="var(--fg)" />
            <text x="585" y="190" text-anchor="middle" class="fraction">3 · graph buffers G</text>
            <text x="585" y="220" text-anchor="middle" class="label">{t('input + output space', '装输入输出的空间')}</text>
            <text x="585" y="247" text-anchor="middle" class="label">{t('reserved last', '最后预留')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M585 155 v-35" stroke="var(--fg)" stroke-width="3" /><path d="M585 112 l-6 10 h12 z" fill="var(--fg)" />
            <text x="360" y="306" text-anchor="middle" class="formula budget">{t(`G uses part of spare space · total ${DEMO_DYNAMIC_HIGH_GB} GB · size unknown`, `G 使用部分余量 · 共 ${DEMO_DYNAMIC_HIGH_GB} GB · 大小未知`)}</text>
          </g>
          <text x="360" y="358" text-anchor="middle" class="formula budget" opacity={phase >= 4 ? 1 : 0}>≈{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
        {:else}
          <text x="20" y="25" class="title">{t('Startup order', '启动顺序')}</text>
          <rect x="20" y="43" width="260" height="32" fill="url(#headroom)" stroke="var(--line)" />
          <rect x="20" y="43" width={barWidth(DEMO_MODEL_LOAD_GB, 260)} height="32" fill="var(--gen-soft)" stroke="var(--gen)" />
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={20 + barWidth(DEMO_MODEL_LOAD_GB, 260)} y="43" width={barWidth(DEMO_KV_HIGH_GB, 260)} height="32" fill="var(--accent-soft)" stroke="var(--accent)" />
          </g>
          <text x="150" y="96" text-anchor="middle" class="label">≈{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
          <text x="150" y="116" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=spare space', '橙=模型 · 蓝=KV · 灰=其他工作余量')}</text>
          <rect x="20" y="135" width="260" height="72" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="162" text-anchor="middle" class="fraction">1 · model ≈{DEMO_MODEL_LOAD_GB} GB</text>
          <text x="150" y="190" text-anchor="middle" class="label">{t('loaded first', '最先装入')}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M150 212 v18" stroke="var(--fg)" stroke-width="3" /><path d="M150 235 l-6 -10 h12 z" fill="var(--fg)" />
            <rect x="20" y="240" width="260" height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="150" y="267" text-anchor="middle" class="fraction">2 · KV pool {DEMO_KV_HIGH_GB} GB</text>
            <text x="150" y="295" text-anchor="middle" class="label">{t('created second', '第二步创建')}</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M150 317 v18" stroke="var(--fg)" stroke-width="3" /><path d="M150 340 l-6 -10 h12 z" fill="var(--fg)" />
            <rect x="20" y="345" width="260" height="72" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="372" text-anchor="middle" class="fraction">3 · graph buffers G</text>
            <text x="150" y="400" text-anchor="middle" class="label">{t('input + output space · reserved last', '装输入输出 · 最后预留')}</text>
          </g>
          <text x="150" y="452" text-anchor="middle" class="label" opacity={phase >= 3 ? 1 : 0}>{t('G uses spare space · size unknown', 'G 使用其他工作余量 · 大小未知')}</text>
          <text x="150" y="494" text-anchor="middle" class="label" opacity={phase >= 4 ? 1 : 0}>{t('model → KV pool → graph buffers', '模型 → KV pool → graph 缓冲')}</text>
        {/if}
      {:else if step === 2}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Capture once · fixed input and output buffers', '记录一次 · 固定的输入输出缓冲')}</text>
          <rect x="40" y="75" width="190" height="75" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="135" y="105" text-anchor="middle" class="fraction">G.input</text>
          <text x="135" y="135" text-anchor="middle" class="label" opacity={phase >= 1 ? 1 : 0}>{t('input space reserved', '输入空间已预留')}</text>
          <path d="M235 112 h65" stroke="var(--fg)" stroke-width="3" opacity={phase >= 2 ? 1 : 0} /><path d="M305 112 l-10 -6 v12 z" fill="var(--fg)" opacity={phase >= 2 ? 1 : 0} />
          <rect x="310" y="75" width="160" height="75" rx="10" fill={phase >= 2 ? 'var(--panel)' : 'var(--bg)'} stroke={phase >= 2 ? 'var(--fg)' : 'var(--line)'} stroke-width={phase >= 2 ? 3 : 1} />
          <text x="390" y="105" text-anchor="middle" class="fraction">GPU work</text>
          <text x="390" y="135" text-anchor="middle" class="label">{t('steps recorded, not executed', '只记录步骤，不执行')}</text>
          <path d="M310 150 L235 260" stroke="var(--fg)" stroke-width="3" opacity={phase >= 3 ? 1 : 0} /><path d="M230 267 l1 -13 11 5 z" fill="var(--fg)" opacity={phase >= 3 ? 1 : 0} />
          <rect x="40" y="240" width="190" height="75" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="135" y="270" text-anchor="middle" class="fraction">G.output</text>
          <text x="135" y="300" text-anchor="middle" class="label" opacity={phase >= 3 ? 1 : 0}>{t('filled on replay', '由 replay 写入')}</text>
          <rect x="520" y="75" width="160" height="240" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--fg)' : 'var(--line)'} stroke-width={phase >= 2 ? 3 : 1} />
          <text x="600" y="105" text-anchor="middle" class="fraction">{t('recorded graph', '记录的 graph')}</text>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <text x="545" y="150" class="label">1 · GPU step</text>
            <text x="545" y="180" class="label">2 · GPU step</text>
            <text x="545" y="210" class="label">…</text>
          </g>
          <text x="600" y="270" text-anchor="middle" class="label" opacity={phase >= 3 ? 1 : 0}>{t('saved for replay', '保存，等待重放')}</text>
          <text x="360" y="365" text-anchor="middle" class="formula budget" opacity={phase >= 4 ? 1 : 0}>capture = 1 · G {t('stays reserved', '继续保留')}</text>
        {:else}
          <text x="20" y="25" class="title">{t('Capture once', '记录一次')}</text>
          <rect x="20" y="50" width="260" height="65" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="150" y="77" text-anchor="middle" class="fraction">G.input</text>
          <text x="150" y="103" text-anchor="middle" class="label" opacity={phase >= 1 ? 1 : 0}>{t('input space reserved', '输入空间已预留')}</text>
          <path d="M150 120 v25" stroke="var(--fg)" stroke-width="3" opacity={phase >= 2 ? 1 : 0} /><path d="M150 150 l-6 -10 h12 z" fill="var(--fg)" opacity={phase >= 2 ? 1 : 0} />
          <rect x="20" y="155" width="260" height="65" rx="10" fill={phase >= 2 ? 'var(--panel)' : 'var(--bg)'} stroke={phase >= 2 ? 'var(--fg)' : 'var(--line)'} stroke-width={phase >= 2 ? 3 : 1} />
          <text x="150" y="182" text-anchor="middle" class="fraction">GPU work</text>
          <text x="150" y="208" text-anchor="middle" class="label">{t('steps recorded, not executed', '只记录步骤，不执行')}</text>
          <path d="M150 225 v25" stroke="var(--fg)" stroke-width="3" opacity={phase >= 3 ? 1 : 0} /><path d="M150 255 l-6 -10 h12 z" fill="var(--fg)" opacity={phase >= 3 ? 1 : 0} />
          <rect x="20" y="260" width="260" height="65" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="150" y="287" text-anchor="middle" class="fraction">G.output</text>
          <text x="150" y="313" text-anchor="middle" class="label" opacity={phase >= 3 ? 1 : 0}>{t('filled on replay', '由 replay 写入')}</text>
          <rect x="20" y="350" width="260" height="75" rx="10" fill="var(--bg)" stroke={phase >= 2 ? 'var(--fg)' : 'var(--line)'} />
          <text x="150" y="377" text-anchor="middle" class="fraction">{t('recorded graph · saved for replay', '记录的 graph · 保存待重放')}</text>
          <text x="150" y="405" text-anchor="middle" class="label" opacity={phase >= 2 ? 1 : 0}>GPU step 1 → GPU step 2 → …</text>
          <text x="150" y="480" text-anchor="middle" class="formula budget" opacity={phase >= 4 ? 1 : 0}>capture = 1 · G {t('stays reserved', '继续保留')}</text>
        {/if}
      {:else if step === 3}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Replay twice · same graph, same buffers', '重放两次 · 同一张 graph，同一组缓冲')}</text>
          <rect x="40" y="75" width="170" height="100" rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width={phase === 1 || phase === 3 ? 4 : 1} />
          <text x="125" y="107" text-anchor="middle" class="fraction">G.input</text>
          <text x="125" y="145" text-anchor="middle" class="label">{replayInput}</text>
          <path d="M215 125 h50" stroke="var(--fg)" stroke-width="3" /><path d="M270 125 l-10 -6 v12 z" fill="var(--fg)" />
          <rect x="275" y="75" width="170" height="100" rx="10" fill="var(--panel)" stroke="var(--fg)" stroke-width={phase === 2 || phase === 4 ? 4 : 1} />
          <text x="360" y="107" text-anchor="middle" class="fraction">Γ · recorded once</text>
          <text x="360" y="145" text-anchor="middle" class="label">GPU step 1 → 2 → …</text>
          <path d="M450 125 h50" stroke="var(--fg)" stroke-width="3" /><path d="M505 125 l-10 -6 v12 z" fill="var(--fg)" />
          <rect x="510" y="75" width="170" height="100" rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width={phase === 2 || phase === 4 ? 4 : 1} />
          <text x="595" y="107" text-anchor="middle" class="fraction">G.output</text>
          <text x="595" y="145" text-anchor="middle" class="label">{replayOutput}</text>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <text x="70" y="235" class="fraction">t</text>
            <text x="125" y="235" class="label">copy input t → Γ.replay() → output t</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <text x="70" y="280" class="fraction">t+1</text>
            <text x="125" y="280" class="label">copy input t+1 → Γ.replay() → output t+1</text>
          </g>
          <text x="360" y="350" text-anchor="middle" class="formula budget" opacity={phase >= 5 ? 1 : 0}>capture = 1 · replay = {replayCount} · same G</text>
        {:else}
          <text x="20" y="25" class="title">{t('Replay twice', '重放两次')}</text>
          <rect x="20" y="50" width="260" height="70" rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width={phase === 1 || phase === 3 ? 4 : 1} />
          <text x="150" y="78" text-anchor="middle" class="fraction">G.input</text>
          <text x="150" y="106" text-anchor="middle" class="label">{replayInput}</text>
          <path d="M150 125 v25" stroke="var(--fg)" stroke-width="3" /><path d="M150 155 l-6 -10 h12 z" fill="var(--fg)" />
          <rect x="20" y="160" width="260" height="70" rx="10" fill="var(--panel)" stroke="var(--fg)" stroke-width={phase === 2 || phase === 4 ? 4 : 1} />
          <text x="150" y="188" text-anchor="middle" class="fraction">Γ · recorded once</text>
          <text x="150" y="216" text-anchor="middle" class="label">GPU step 1 → 2 → …</text>
          <path d="M150 235 v25" stroke="var(--fg)" stroke-width="3" /><path d="M150 265 l-6 -10 h12 z" fill="var(--fg)" />
          <rect x="20" y="270" width="260" height="70" rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width={phase === 2 || phase === 4 ? 4 : 1} />
          <text x="150" y="298" text-anchor="middle" class="fraction">G.output</text>
          <text x="150" y="326" text-anchor="middle" class="label">{replayOutput}</text>
          <text x="150" y="385" text-anchor="middle" class="label" opacity={phase >= 2 ? 1 : 0}>t: input t → output t</text>
          <text x="150" y="420" text-anchor="middle" class="label" opacity={phase >= 4 ? 1 : 0}>t+1: input t+1 → output t+1</text>
          <text x="150" y="480" text-anchor="middle" class="formula budget" opacity={phase >= 5 ? 1 : 0}>capture = 1 · replay = {replayCount}</text>
        {/if}
      {:else if step === 4}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Runtime · G stays reserved, A is temporary', '运行时 · G 继续保留，A 是临时的')}</text>
          <rect x="40" y="55" width="640" height="115" rx="11" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="55" y="80" class="label">{DEMO_DYNAMIC_HIGH_GB} GB {t('spare space', '其他工作余量')}</text>
          <rect x="65" y="95" width="250" height="55" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="190" y="119" text-anchor="middle" class="fraction">G · graph buffers</text>
          <text x="190" y="141" text-anchor="middle" class="label">{phase >= 3 ? t('last output · stays reserved', '最后输出 · 继续保留') : t('stays reserved', '继续保留')}</text>
          <g opacity={phase >= 2 && phase < 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="385" y="95" width="220" height="55" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="495" y="119" text-anchor="middle" class="fraction">A · activations</text>
            <text x="495" y="141" text-anchor="middle" class="label">{t('temporary results · in use', '临时结果 · 正在使用')}</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="385" y="95" width="220" height="55" rx="8" fill="var(--bg)" stroke="var(--gen)" stroke-dasharray="6 4" />
            <text x="495" y="130" text-anchor="middle" class="label">A · {t('no longer needed', '不再需要')}</text>
          </g>
          <rect x="215" y="205" width="290" height="65" rx="10" fill="var(--panel)" stroke={phase >= 1 && phase < 4 ? 'var(--fg)' : 'var(--line)'} stroke-width={phase >= 1 && phase < 4 ? 3 : 1} />
          <text x="360" y="245" text-anchor="middle" class="fraction">Γ.replay() · {t('compute token', '计算 token')}</text>
          <path d="M360 170 v28" stroke="var(--fg)" stroke-width="3" opacity={phase >= 2 && phase < 4 ? 1 : 0} /><path d="M360 203 l-6 -10 h12 z" fill="var(--fg)" opacity={phase >= 2 && phase < 4 ? 1 : 0} />
          <text x="360" y="310" text-anchor="middle" class="formula budget" opacity={phase >= 3 ? 1 : 0}>{t('while computing', '计算期间')}: G + A ≤ {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="360" y="365" text-anchor="middle" class="label" opacity={phase >= 5 ? 1 : 0}>{t('G stays reserved; A is no longer needed.', 'G 继续保留；A 不再需要。')}</text>
        {:else}
          <text x="20" y="25" class="title">{t('Runtime · G and A', '运行时 · G 和 A')}</text>
          <rect x="20" y="50" width="260" height="345" rx="11" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="150" y="75" text-anchor="middle" class="label">{DEMO_DYNAMIC_HIGH_GB} GB {t('spare space', '其他工作余量')}</text>
          <rect x="45" y="95" width="210" height="60" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="150" y="120" text-anchor="middle" class="fraction">G · graph buffers</text>
          <text x="150" y="145" text-anchor="middle" class="label">{phase >= 3 ? t('last output · stays reserved', '最后输出 · 继续保留') : t('stays reserved', '继续保留')}</text>
          <rect x="45" y="180" width="210" height="55" rx="8" fill="var(--panel)" stroke={phase >= 1 && phase < 4 ? 'var(--fg)' : 'var(--line)'} />
          <text x="150" y="214" text-anchor="middle" class="fraction">Γ.replay()</text>
          <g opacity={phase >= 2 && phase < 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y="260" width="210" height="60" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="285" text-anchor="middle" class="fraction">A · activations</text>
            <text x="150" y="310" text-anchor="middle" class="label">{t('temporary results · in use', '临时结果 · 正在使用')}</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y="260" width="210" height="60" rx="8" fill="var(--bg)" stroke="var(--gen)" stroke-dasharray="6 4" />
            <text x="150" y="296" text-anchor="middle" class="label">A · {t('no longer needed', '不再需要')}</text>
          </g>
          <text x="150" y="355" text-anchor="middle" class="formula budget" opacity={phase >= 3 ? 1 : 0}>G + A ≤ {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="150" y="445" text-anchor="middle" class="label" opacity={phase >= 5 ? 1 : 0}>{t('G stays reserved; A is no longer needed.', 'G 继续保留；A 不再需要。')}</text>
        {/if}
      {:else}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Scoped account · startup success is not a runtime guarantee', '有范围的账 · 启动成功不保证运行时不爆显存')}</text>
          <rect x="40" y="55" width="640" height="54" fill="url(#headroom)" stroke="var(--line)" />
          <rect x="40" y="55" width={barWidth(DEMO_MODEL_LOAD_GB, 640)} height="54" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640) / 2} y="88" text-anchor="middle" class="barlabel">{t(`M ≈${DEMO_MODEL_LOAD_GB} GB`, `模型 ≈${DEMO_MODEL_LOAD_GB} GB`)}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640)} y="55" width={barWidth(DEMO_KV_HIGH_GB, 640)} height="54" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB / 2, 640)} y="88" text-anchor="middle" class="barlabel">K {DEMO_KV_HIGH_GB}</text>
          </g>
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB + DEMO_DYNAMIC_HIGH_GB / 2, 640)} y="88" text-anchor="middle" class="barlabel">R {DEMO_DYNAMIC_HIGH_GB}</text>
          <text x="40" y="135" class="formula budget" opacity={phase >= 1 ? 1 : 0}>{t(`M(model) + K(KV) + R(spare) = ${DEMO_MODEL_LOAD_GB} + ${DEMO_KV_HIGH_GB} + ${DEMO_DYNAMIC_HIGH_GB} = ${DEMO_PRE_MODEL_FREE_GB} GB`, `M(模型) + K(KV) + R(余量) = ${DEMO_MODEL_LOAD_GB} + ${DEMO_KV_HIGH_GB} + ${DEMO_DYNAMIC_HIGH_GB} = ${DEMO_PRE_MODEL_FREE_GB} GB`)}</text>
          <rect x="40" y="160" width="640" height="155" rx="11" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="55" y="185" class="label">R = {DEMO_DYNAMIC_HIGH_GB} GB · {t('shared dynamic work', '动态工作共用')}</text>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="60" y="205" width="180" height="75" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="235" text-anchor="middle" class="fraction">G = ? GB</text>
            <text x="150" y="263" text-anchor="middle" class="label">{t('graph buffers · stays reserved', 'graph 缓冲 · 继续保留')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="270" y="205" width="180" height="75" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="360" y="235" text-anchor="middle" class="fraction">A = ? GB</text>
            <text x="360" y="263" text-anchor="middle" class="label">{t('activations · temporary', '激活 · 临时')}</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="480" y="205" width="180" height="75" rx="8" fill="var(--bg)" stroke="var(--muted)" />
            <text x="570" y="235" text-anchor="middle" class="fraction">D = ? GB</text>
            <text x="570" y="263" text-anchor="middle" class="label">{t('other dynamic work', '其他动态工作')}</text>
          </g>
          <g opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
            <text x="360" y="355" text-anchor="middle" class="formula budget">G + A + D ≤ R = {DEMO_DYNAMIC_HIGH_GB} GB</text>
            <text x="360" y="392" text-anchor="middle" class="short">{t('KV sizing passes · runtime can still run out', 'KV 尺寸通过 · 运行时仍可能不足')}</text>
          </g>
          <g opacity={phase >= 6 ? 1 : 0} style="transition: opacity 300ms">
            <text x="360" y="425" text-anchor="middle" class="label">{t('Next: a hybrid request shares a prefix · token history + running summary', '下一章：hybrid 请求有共同前缀 · token 历史 + 随 token 更新的摘要')}</text>
            <text x="360" y="450" text-anchor="middle" class="label">{t('num_batch = tokens scheduled per batch', 'num_batch = 每批调度的 token 数')}</text>
            <text x="360" y="475" text-anchor="middle" class="fraction">{t('1024 vs 64: what happens to wait and recomputed tokens?', '1024 与 64：等待和重算 token 数怎样变化？')}</text>
          </g>
        {:else}
          <text x="20" y="25" class="title">{t('Scoped memory account', '有范围的显存账')}</text>
          <rect x="20" y="45" width="260" height="32" fill="url(#headroom)" stroke="var(--line)" />
          <rect x="20" y="45" width={barWidth(DEMO_MODEL_LOAD_GB, 260)} height="32" fill="var(--gen-soft)" stroke="var(--gen)" />
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={20 + barWidth(DEMO_MODEL_LOAD_GB, 260)} y="45" width={barWidth(DEMO_KV_HIGH_GB, 260)} height="32" fill="var(--accent-soft)" stroke="var(--accent)" />
          </g>
          <text x="150" y="96" text-anchor="middle" class="label" opacity={phase >= 1 ? 1 : 0}>{t('M=model · K=KV · R=spare', 'M=模型 · K=KV · R=余量')}</text>
          <text x="150" y="116" text-anchor="middle" class="label" opacity={phase >= 1 ? 1 : 0}>{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
          <rect x="20" y="125" width="260" height="300" rx="11" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="150" y="151" text-anchor="middle" class="label">R = {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y="170" width="210" height="60" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="195" text-anchor="middle" class="fraction">G = ? GB</text>
            <text x="150" y="218" text-anchor="middle" class="label">{t('graph buffers · stays reserved', 'graph 缓冲 · 继续保留')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y="250" width="210" height="60" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="275" text-anchor="middle" class="fraction">A = ? GB</text>
            <text x="150" y="298" text-anchor="middle" class="label">{t('activations · temporary', '激活 · 临时')}</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y="330" width="210" height="60" rx="8" fill="var(--bg)" stroke="var(--muted)" />
            <text x="150" y="355" text-anchor="middle" class="fraction">D = ? GB</text>
            <text x="150" y="378" text-anchor="middle" class="label">{t('other dynamic work', '其他动态工作')}</text>
          </g>
          <text x="150" y="460" text-anchor="middle" class="formula budget" opacity={phase >= 5 ? 1 : 0}>G + A + D ≤ {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="150" y="495" text-anchor="middle" class="short" opacity={phase >= 5 ? 1 : 0}>{t('runtime can still run out', '运行时仍可能不足')}</text>
          <text x="150" y="525" text-anchor="middle" class="label" opacity={phase >= 6 ? 1 : 0}>{t('Next: a hybrid request shares a prefix.', '下一章：hybrid 请求有共同前缀。')}</text>
          <text x="150" y="552" text-anchor="middle" class="label" opacity={phase >= 6 ? 1 : 0}>{t('hybrid = token history + running summary', 'hybrid = token 历史 + 更新的摘要')}</text>
          <text x="150" y="580" text-anchor="middle" class="label" opacity={phase >= 6 ? 1 : 0}>{t('num_batch = tokens scheduled per batch', 'num_batch = 每批调度的 token 数')}</text>
          <text x="150" y="608" text-anchor="middle" class="label" opacity={phase >= 6 ? 1 : 0}>{t('1024 vs 64: wait + recomputed tokens?', '1024 与 64：等待和重算 token 数？')}</text>
        {/if}
      {/if}
      <text x={W / 2} y={H - 7} text-anchor="middle" class="footnote">{step === 0 ? t('Rounded example; spare space is reserved, not fully used.', '约数例子；其他工作余量是预留，并非占满。') : step === 1 ? t('G has no measured GB value in this example.', '本例没有 G 的实测 GB 数。') : step === 2 ? t('One schematic graph; real capture depends on batch shape.', '示意一张 graph；实际 capture 随 batch 形状而变。') : step === 3 ? t('t = first replay; t+1 = next; values schematic.', 't = 第一次 replay；t+1 = 下一次；数值仅示意。') : step === 4 ? t('A is no longer needed; this is not an allocator trace.', '这里只画 A 不再需要，不是 allocator 轨迹。') : t('? means unknown here, not zero.', '? 表示本例未知，不是 0。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 14px; fill: var(--fg); }
  .load { font-size: 15px; font-weight: 650; fill: var(--gen); }
  .number { font-family: var(--mono); font-size: 22px; font-weight: 700; fill: var(--fg); }
  .fraction { font-family: var(--mono); font-size: 14px; font-weight: 650; fill: var(--fg); }
  .formula { font-family: var(--mono); font-size: 16px; font-weight: 650; fill: var(--accent); }
  .budget { fill: var(--fg); }
  .derive { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .barlabel { font-family: var(--mono); font-size: 14px; font-weight: 650; fill: var(--fg); }
  .short { font-family: var(--mono); font-size: 14px; font-weight: 700; fill: var(--eos); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label { font-size: 13px; }
    .fraction, .formula { font-size: 15px; }
  }
</style>
