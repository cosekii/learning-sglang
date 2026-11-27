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
    caption: `In this example, ${DEMO_MEM_FRACTION_LOW.toFixed(2)} leaves KV ${Math.abs(DEMO_KV_LOW_GB)} GB short. Raising it to ${DEMO_MEM_FRACTION_HIGH.toFixed(2)} gives KV ${DEMO_KV_HIGH_GB} GB by shrinking dynamic headroom.`,
    captionZh: `例中，${DEMO_MEM_FRACTION_LOW.toFixed(2)} 让 KV 短缺 ${Math.abs(DEMO_KV_LOW_GB)} GB。调到 ${DEMO_MEM_FRACTION_HIGH.toFixed(2)} 后，KV 有 ${DEMO_KV_HIGH_GB} GB，动态余量缩小。`,
  }, {
    caption: `Startup loads the model, creates the KV pool, then allocates graph buffers. The buffers use headroom.`,
    captionZh: `启动先装模型，再建 KV pool，最后分配 graph 缓冲。缓冲使用动态余量。`,
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
  const PHASE_COUNTS = [6, 5];
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 400 : 540) : (step === 0 ? 410 : 430));
  const barWidth = (gb: number, total: number) => gb / DEMO_PRE_MODEL_FREE_GB * total;
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
        <text x="40" y="28" class="title">{t('Same GPU · measure free memory twice', '同一张 GPU · 量两次空闲显存')}</text>
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
          <rect x="330" y="326" width="14" height="14" fill="url(#headroom)" stroke="var(--muted)" /><text x="352" y="338" class="label">{t('dynamic headroom', '动态余量')}</text>
          <rect x="535" y="326" width="14" height="14" fill="var(--eos-soft)" stroke="var(--eos)" /><text x="557" y="338" class="label">{t('KV short', 'KV 短缺')}</text>
          <text x="360" y="373" text-anchor="middle" class="label">{t('KV cache saves token history; headroom leaves room for other work.', 'KV cache 保存 token 历史；动态余量留给其他工作。')}</text>
        </g>
      {:else}
        <text x="20" y="23" class="title">{t('Measure free memory twice', '量两次空闲显存')}</text>
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
          <text x="150" y="359" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=headroom', '橙=模型 · 蓝=KV · 灰=动态余量')}</text>
          <text x="150" y="379" text-anchor="middle" class="label">{t('red=KV short · KV saves token history', '红=KV 短缺 · KV 保存 token 历史')}</text>
        </g>
      {/if}
      {:else if step === 1}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Startup order · one 78 GB card', '启动顺序 · 同一张 78 GB 卡')}</text>
          <rect x="40" y="48" width="640" height="54" fill="url(#headroom)" stroke="var(--line)" />
          <rect x="40" y="48" width={barWidth(DEMO_MODEL_LOAD_GB, 640)} height="54" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640) / 2} y="81" text-anchor="middle" class="barlabel">{t(`model ≈${DEMO_MODEL_LOAD_GB} GB`, `模型 ≈${DEMO_MODEL_LOAD_GB} GB`)}</text>
          <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
            <rect x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640)} y="48" width={barWidth(DEMO_KV_HIGH_GB, 640)} height="54" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">KV {DEMO_KV_HIGH_GB}</text>
          </g>
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB + DEMO_DYNAMIC_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_HIGH_GB}</text>
          <text x="40" y="124" class="label">{t('orange=model · blue=KV · gray=dynamic headroom', '橙=模型 · 蓝=KV · 灰=动态余量')}</text>

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
            <text x="585" y="247" text-anchor="middle" class="label">{t('allocated last', '最后分配')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
            <path d="M585 155 v-35" stroke="var(--fg)" stroke-width="3" /><path d="M585 112 l-6 10 h12 z" fill="var(--fg)" />
            <text x="360" y="306" text-anchor="middle" class="formula budget">G ⊂ {DEMO_DYNAMIC_HIGH_GB} GB headroom · G = ? GB</text>
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
          <text x="150" y="116" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=headroom', '橙=模型 · 蓝=KV · 灰=动态余量')}</text>
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
            <text x="150" y="400" text-anchor="middle" class="label">{t('input + output space · allocated last', '装输入输出 · 最后分配')}</text>
          </g>
          <text x="150" y="452" text-anchor="middle" class="formula budget" opacity={phase >= 3 ? 1 : 0}>G ⊂ {DEMO_DYNAMIC_HIGH_GB} GB · G = ? GB</text>
          <text x="150" y="494" text-anchor="middle" class="label" opacity={phase >= 4 ? 1 : 0}>{t('model → KV pool → graph buffers', '模型 → KV pool → graph 缓冲')}</text>
        {/if}
      {/if}
      <text x={W / 2} y={H - 7} text-anchor="middle" class="footnote">{step === 0 ? t('Rounded example; headroom is a reserve.', '约数例子；动态余量只是预留。') : t('G has no measured GB value in this example.', '本例没有 G 的实测 GB 数。')}</text>
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
