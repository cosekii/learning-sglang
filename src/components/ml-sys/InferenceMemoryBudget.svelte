<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    caption: `At ${DEMO_MEM_FRACTION_HIGH.toFixed(2)}, headroom halves to ${DEMO_DYNAMIC_HIGH_GB} GB. CUDA Graph buffers and temporary results share it.`,
    captionZh: `${DEMO_MEM_FRACTION_HIGH.toFixed(2)} 把动态余量减半到 ${DEMO_DYNAMIC_HIGH_GB} GB。CUDA Graph 的缓冲和临时结果共用这份余量。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 400 : 420) : 410);
  const barWidth = (gb: number, total: number) => gb / DEMO_PRE_MODEL_FREE_GB * total;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? t(`Free memory falls from about ${DEMO_PRE_MODEL_FREE_GB} to ${DEMO_POST_MODEL_FREE_GB} GB after model loading. At mem_fraction_static ${DEMO_MEM_FRACTION_LOW}, KV is ${Math.abs(DEMO_KV_LOW_GB)} GB short; at ${DEMO_MEM_FRACTION_HIGH}, KV has ${DEMO_KV_HIGH_GB} GB and dynamic headroom is smaller.`, `装入模型前后，空闲显存从约 ${DEMO_PRE_MODEL_FREE_GB} 降到 ${DEMO_POST_MODEL_FREE_GB} GB。mem_fraction_static 为 ${DEMO_MEM_FRACTION_LOW} 时 KV 短缺 ${Math.abs(DEMO_KV_LOW_GB)} GB；调到 ${DEMO_MEM_FRACTION_HIGH} 后 KV 有 ${DEMO_KV_HIGH_GB} GB，动态余量缩小。`) : t(`CUDA Graph buffers and temporary results share ${DEMO_DYNAMIC_HIGH_GB} GB of dynamic headroom.`, `CUDA Graph 缓冲和临时结果共用 ${DEMO_DYNAMIC_HIGH_GB} GB 动态余量。`)}>
      <defs>
        <pattern id="headroom" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--panel)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--faint)" stroke-width="2" />
        </pattern>
      </defs>
      {#if step === 0}
      {#if !phone}
        <text x="40" y="28" class="title">{t('Same GPU · measure free memory twice', '同一张 GPU · 量两次空闲显存')}</text>
        <rect x="40" y="45" width="170" height="65" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="125" y="70" text-anchor="middle" class="label">{t('before model loading', '装入模型前')}</text>
        <text x="125" y="98" text-anchor="middle" class="number">≈{DEMO_PRE_MODEL_FREE_GB} GB</text>
        <line x1="220" y1="78" x2="490" y2="78" stroke="var(--gen)" stroke-width="4" />
        <path d="M490,78 l-12,-7 v14 z" fill="var(--gen)" />
        <text x="355" y="61" text-anchor="middle" class="load">{t('model loading', '模型装入')}: {DEMO_PRE_MODEL_FREE_GB} − {DEMO_POST_MODEL_FREE_GB} ≈ {DEMO_MODEL_LOAD_GB} GB</text>
        <rect x="510" y="45" width="170" height="65" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="595" y="70" text-anchor="middle" class="label">{t('after model loading', '装入模型后')}</text>
        <text x="595" y="98" text-anchor="middle" class="number">≈{DEMO_POST_MODEL_FREE_GB} GB</text>

        <text x="40" y="150" class="fraction">mem_fraction_static = {DEMO_MEM_FRACTION_LOW.toFixed(2)}</text>
        <text x="40" y="174" class="derive">(1 − {DEMO_MEM_FRACTION_LOW.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_LOW_GB} GB</text>
        <text x="40" y="198" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_LOW_GB} = {DEMO_KV_LOW_GB} GB KV</text>
        <text x="465" y="127" text-anchor="middle" class="label">{t('same 78 GB scale', '同一把 78 GB 标尺')}</text>
        <text x="650" y="126" text-anchor="middle" class="label">78 GB</text>
        <rect x="280" y="137" width="370" height="48" fill="var(--bg)" stroke="var(--line)" />
        <rect x="280" y="137" width={barWidth(DEMO_MODEL_LOAD_GB, 370)} height="48" fill="var(--gen-soft)" stroke="var(--gen)" />
        <rect x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370)} y="137" width={barWidth(DEMO_DYNAMIC_LOW_GB, 370)} height="48" fill="url(#headroom)" stroke="var(--muted)" />
        <rect x="650" y="137" width={barWidth(Math.abs(DEMO_KV_LOW_GB), 370)} height="48" fill="var(--eos-soft)" stroke="var(--eos)" />
        <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) / 2} y="167" text-anchor="middle" class="barlabel">≈{DEMO_MODEL_LOAD_GB}</text>
        <text x={280 + barWidth(DEMO_MODEL_LOAD_GB, 370) + barWidth(DEMO_DYNAMIC_LOW_GB, 370) / 2} y="167" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_LOW_GB}</text>
        <text x="650" y="205" text-anchor="middle" class="short">{t(`${Math.abs(DEMO_KV_LOW_GB)} GB over`, `超出 ${Math.abs(DEMO_KV_LOW_GB)} GB`)}</text>
        <line x1="650" y1="130" x2="650" y2="192" stroke="var(--fg)" stroke-width="2" />

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

        <rect x="40" y="326" width="14" height="14" fill="var(--gen-soft)" stroke="var(--gen)" /><text x="62" y="338" class="label">{t('model load', '模型装入')}</text>
        <rect x="190" y="326" width="14" height="14" fill="var(--accent-soft)" stroke="var(--accent)" /><text x="212" y="338" class="label">KV cache</text>
        <rect x="330" y="326" width="14" height="14" fill="url(#headroom)" stroke="var(--muted)" /><text x="352" y="338" class="label">{t('dynamic headroom', '动态余量')}</text>
        <rect x="535" y="326" width="14" height="14" fill="var(--eos-soft)" stroke="var(--eos)" /><text x="557" y="338" class="label">{t('KV short', 'KV 短缺')}</text>
        <text x="360" y="373" text-anchor="middle" class="label">{t('KV cache saves token history; headroom leaves room for other work.', 'KV cache 保存 token 历史；动态余量留给其他工作。')}</text>
      {:else}
        <text x="20" y="23" class="title">{t('Measure free memory twice', '量两次空闲显存')}</text>
        <text x="20" y="45" class="label">{t('before', '装入前')} ≈{DEMO_PRE_MODEL_FREE_GB} GB → {t('after', '装入后')} ≈{DEMO_POST_MODEL_FREE_GB} GB</text>
        <text x="20" y="68" class="load">{t('model', '模型')}: {DEMO_PRE_MODEL_FREE_GB} − {DEMO_POST_MODEL_FREE_GB} ≈ {DEMO_MODEL_LOAD_GB} GB</text>

        <text x="20" y="102" class="fraction">{DEMO_MEM_FRACTION_LOW.toFixed(2)}: KV = {DEMO_KV_LOW_GB} GB</text>
        <text x="20" y="124" class="derive">(1 − {DEMO_MEM_FRACTION_LOW.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_LOW_GB} GB</text>
        <text x="20" y="146" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_LOW_GB} = {DEMO_KV_LOW_GB}</text>
        <rect x="30" y="158" width="240" height="28" fill="var(--bg)" stroke="var(--line)" />
        <rect x="30" y="158" width={barWidth(DEMO_MODEL_LOAD_GB, 240)} height="28" fill="var(--gen-soft)" stroke="var(--gen)" />
        <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB, 240)} y="158" width={barWidth(DEMO_DYNAMIC_LOW_GB, 240)} height="28" fill="url(#headroom)" stroke="var(--muted)" />
        <rect x="270" y="158" width={barWidth(Math.abs(DEMO_KV_LOW_GB), 240)} height="28" fill="var(--eos-soft)" stroke="var(--eos)" />
        <line x1="270" y1="153" x2="270" y2="193" stroke="var(--fg)" stroke-width="2" />
        <text x="150" y="207" text-anchor="middle" class="label">{t(`${DEMO_PRE_MODEL_FREE_GB} GB full · ${Math.abs(DEMO_KV_LOW_GB)} GB over`, `${DEMO_PRE_MODEL_FREE_GB} GB 已满 · 超出 ${Math.abs(DEMO_KV_LOW_GB)} GB`)}</text>

        <text x="20" y="232" class="fraction">{DEMO_MEM_FRACTION_HIGH.toFixed(2)}: KV = {DEMO_KV_HIGH_GB} GB</text>
        <text x="20" y="254" class="derive">(1 − {DEMO_MEM_FRACTION_HIGH.toFixed(2)}) × {DEMO_PRE_MODEL_FREE_GB} = {DEMO_DYNAMIC_HIGH_GB} GB</text>
        <text x="20" y="276" class="formula">{DEMO_POST_MODEL_FREE_GB} − {DEMO_DYNAMIC_HIGH_GB} = {DEMO_KV_HIGH_GB}</text>
        <rect x="30" y="288" width="240" height="28" fill="var(--bg)" stroke="var(--line)" />
        <rect x="30" y="288" width={barWidth(DEMO_MODEL_LOAD_GB, 240)} height="28" fill="var(--gen-soft)" stroke="var(--gen)" />
        <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB, 240)} y="288" width={barWidth(DEMO_KV_HIGH_GB, 240)} height="28" fill="var(--accent-soft)" stroke="var(--accent)" />
        <rect x={30 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 240)} y="288" width={barWidth(DEMO_DYNAMIC_HIGH_GB, 240)} height="28" fill="url(#headroom)" stroke="var(--muted)" />
        <line x1="270" y1="283" x2="270" y2="323" stroke="var(--fg)" stroke-width="2" />
        <text x="150" y="337" text-anchor="middle" class="label">≈{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
        <text x="150" y="359" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=headroom', '橙=模型 · 蓝=KV · 灰=动态余量')}</text>
        <text x="150" y="379" text-anchor="middle" class="label">{t('red=KV short · KV saves token history', '红=KV 短缺 · KV 保存 token 历史')}</text>
      {/if}
      {:else}
        {#if !phone}
          <text x="40" y="28" class="title">{t('Beyond model and KV · where headroom goes', '模型和 KV 之外 · 动态余量去哪了')}</text>
          <rect x="40" y="48" width="640" height="54" fill="var(--bg)" stroke="var(--line)" />
          <rect x="40" y="48" width={barWidth(DEMO_MODEL_LOAD_GB, 640)} height="54" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640)} y="48" width={barWidth(DEMO_KV_HIGH_GB, 640)} height="54" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 640)} y="48" width={barWidth(DEMO_DYNAMIC_HIGH_GB, 640)} height="54" fill="url(#headroom)" stroke="var(--muted)" />
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB, 640) / 2} y="81" text-anchor="middle" class="barlabel">{t(`model ≈${DEMO_MODEL_LOAD_GB} GB`, `模型 ≈${DEMO_MODEL_LOAD_GB} GB`)}</text>
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">{DEMO_KV_HIGH_GB}</text>
          <text x={40 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB + DEMO_DYNAMIC_HIGH_GB / 2, 640)} y="81" text-anchor="middle" class="barlabel">{DEMO_DYNAMIC_HIGH_GB}</text>
          <text x="40" y="124" class="label">{t('same 78 GB · orange model · blue KV · gray headroom', '同一 78 GB 标尺 · 橙=模型 · 蓝=KV · 灰=动态余量')}</text>
          <text x="680" y="124" text-anchor="end" class="derive">{DEMO_DYNAMIC_LOW_GB} → {DEMO_DYNAMIC_HIGH_GB} GB · {t('half', '减半')}</text>

          <rect x="40" y="145" width="300" height="160" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="171" text-anchor="middle" class="fraction">{t('startup · CUDA Graph', '启动 · CUDA Graph')}</text>
          <rect x="80" y="190" width="220" height="48" rx="7" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="190" y="220" text-anchor="middle" class="label">{t('buffers', 'buffers（缓冲）')}</text>
          <path d="M190 242 v8" stroke="var(--muted)" stroke-width="2" />
          <path d="M184 247 l6 7 6-7" fill="none" stroke="var(--muted)" stroke-width="2" />
          <text x="190" y="274" text-anchor="middle" class="label">{t('record GPU steps once; replay them later', 'GPU 步骤先录下来，之后照着跑')}</text>
          <text x="190" y="295" text-anchor="middle" class="label">{t('buffers keep their input / output data', '缓冲留着装这些计算的输入输出')}</text>

          <rect x="380" y="145" width="300" height="160" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="530" y="171" text-anchor="middle" class="fraction">{t('runtime · compute tokens', '运行 · 算 token')}</text>
          <rect x="415" y="190" width="52" height="48" rx="6" fill="url(#headroom)" stroke="var(--muted)" />
          <rect x="477" y="190" width="52" height="48" rx="6" fill="url(#headroom)" stroke="var(--muted)" />
          <rect x="539" y="190" width="52" height="48" rx="6" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="617" y="220" class="label">…</text>
          <text x="530" y="261" text-anchor="middle" class="label">{t('temporary, intermediate results', '临时的中间结果')}</text>
          <text x="530" y="284" text-anchor="middle" class="label">{t('made while computing tokens', '算 token 时产生')}</text>

          <text x="360" y="340" text-anchor="middle" class="formula budget">buffers + results ≤ {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="360" y="369" text-anchor="middle" class="label">{t('Startup buffers stay; runtime results join them.', '启动的缓冲还在，运行时又产生临时结果。')}</text>
        {:else}
          <text x="20" y="25" class="title">{t('Where headroom goes', '动态余量去哪了')}</text>
          <rect x="20" y="43" width="260" height="32" fill="var(--bg)" stroke="var(--line)" />
          <rect x="20" y="43" width={barWidth(DEMO_MODEL_LOAD_GB, 260)} height="32" fill="var(--gen-soft)" stroke="var(--gen)" />
          <rect x={20 + barWidth(DEMO_MODEL_LOAD_GB, 260)} y="43" width={barWidth(DEMO_KV_HIGH_GB, 260)} height="32" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={20 + barWidth(DEMO_MODEL_LOAD_GB + DEMO_KV_HIGH_GB, 260)} y="43" width={barWidth(DEMO_DYNAMIC_HIGH_GB, 260)} height="32" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="150" y="96" text-anchor="middle" class="label">≈{DEMO_MODEL_LOAD_GB} + {DEMO_KV_HIGH_GB} + {DEMO_DYNAMIC_HIGH_GB} = {DEMO_PRE_MODEL_FREE_GB} GB</text>
          <text x="150" y="113" text-anchor="middle" class="label">{t('orange=model · blue=KV · gray=headroom', '橙=模型 · 蓝=KV · 灰=动态余量')}</text>

          <rect x="20" y="126" width="260" height="98" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="148" text-anchor="middle" class="fraction">{t('startup · CUDA Graph', '启动 · CUDA Graph')}</text>
          <rect x="55" y="160" width="190" height="27" rx="5" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="150" y="179" text-anchor="middle" class="label">{t('buffers', 'buffers（缓冲）')}</text>
          <text x="150" y="204" text-anchor="middle" class="label">{t('record GPU steps once; replay later', 'GPU 步骤先录下，以后照着跑')}</text>
          <text x="150" y="220" text-anchor="middle" class="label">{t('buffers keep their input / output data', '缓冲留着装这些计算的输入输出')}</text>

          <rect x="20" y="234" width="260" height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="255" text-anchor="middle" class="fraction">{t('runtime · compute tokens', '运行 · 算 token')}</text>
          <rect x="57" y="265" width="42" height="24" rx="5" fill="url(#headroom)" stroke="var(--muted)" />
          <rect x="109" y="265" width="42" height="24" rx="5" fill="url(#headroom)" stroke="var(--muted)" />
          <rect x="161" y="265" width="42" height="24" rx="5" fill="url(#headroom)" stroke="var(--muted)" />
          <text x="225" y="284" class="label">…</text>
          <text x="150" y="306" text-anchor="middle" class="label">{t('temporary, intermediate results', '临时的中间结果')}</text>
          <text x="150" y="322" text-anchor="middle" class="label">{t('made while computing tokens', '算 token 时产生')}</text>

          <text x="150" y="352" text-anchor="middle" class="formula budget">buffers + results ≤ {DEMO_DYNAMIC_HIGH_GB} GB</text>
          <text x="150" y="378" text-anchor="middle" class="label">{t(`${DEMO_DYNAMIC_LOW_GB} → ${DEMO_DYNAMIC_HIGH_GB} GB · half`, `${DEMO_DYNAMIC_LOW_GB} → ${DEMO_DYNAMIC_HIGH_GB} GB · 减半`) }</text>
        {/if}
      {/if}
      <text x={W / 2} y={H - 7} text-anchor="middle" class="footnote">{step === 0 ? t('Rounded example; headroom is a reserve.', '约数例子；动态余量只是预留。') : t(`Two uses; schematic shares, not ${DEMO_DYNAMIC_HIGH_GB} GB each.`, `只画两类；示意份额，并非各有 ${DEMO_DYNAMIC_HIGH_GB} GB。`)}</text>
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
