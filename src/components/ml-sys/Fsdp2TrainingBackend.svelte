<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { FSDP_EXAMPLE_PARAMS_B, FSDP_DP_SIZE, FSDP_BYTES_PER_PARAM, FSDP_FULL_WEIGHT_GB, FSDP_FULL_GRADIENT_GB, FSDP_FULL_OPTIMIZER_GB, FSDP_FULL_STATE_PER_GPU_GB, FSDP_FULL_CLUSTER_STATE_GB, FSDP_FULL_CARD_SHARE } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; mobileTitle: string; mobileTitleZh: string; mobileSubtitle: string; mobileSubtitleZh: string;
    mobileFoot: string; mobileFootZh: string; mobile: MobileItem[]; formulas: { en: string; zh: string }[];
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: `This full training copy costs ${FSDP_FULL_STATE_PER_GPU_GB} GB per GPU. Eight replicated GPUs hold ${FSDP_FULL_CLUSTER_STATE_GB} GB.`,
    captionZh: `本例每张 GPU 保存完整训练表，共 ${FSDP_FULL_STATE_PER_GPU_GB} GB。8 张卡重复保存，总计 ${FSDP_FULL_CLUSTER_STATE_GB} GB。`,
    title: 'Full replication turns 64 GB into 512 GB', titleZh: '完整复制把 64 GB 变成 512 GB',
    subtitle: 'full replication = every GPU keeps the same weights, gradients and optimizer state',
    subtitleZh: '完整复制 = 每张 GPU 都保存同样的权重、梯度和优化器状态',
    foot: 'Constructed 4B example; 16-bit = 2 bytes and FP32 = 4 bytes per number.',
    footZh: '构造的 4B 示例；16 位 = 每个数 2 字节，FP32 = 每个数 4 字节。',
    mobileTitle: 'Eight full copies · 512 GB', mobileTitleZh: '8 份完整复制 · 512 GB',
    mobileSubtitle: 'full replication = every GPU keeps all tables', mobileSubtitleZh: '完整复制 = 每张卡保存所有表',
    mobileFoot: 'Constructed example, not a memory measurement.', mobileFootZh: '构造算例，不是显存实测。',
    mobile: [
      { title: 'TRAINING STATE', titleZh: '训练状态', body: 'weights + gradients + optimizer state', bodyZh: '权重 + 梯度 + 优化器状态', tone: 'orange' },
      { title: 'ONE GPU · FULL COPY', titleZh: '一张 GPU · 完整复制', body: '8 + 8 + 48 = 64 GB', bodyZh: '8 + 8 + 48 = 64 GB', tone: 'orange' },
      { title: '8 GPUS · SAME COPIES', titleZh: '8 张 GPU · 相同副本', body: '64 GB × 8 = 512 GB', bodyZh: '64 GB × 8 = 512 GB', tone: 'blue' },
    ],
    formulas: [
      { en: `${FSDP_EXAMPLE_PARAMS_B}B values × ${FSDP_BYTES_PER_PARAM} bytes = ${FSDP_FULL_STATE_PER_GPU_GB} GB`, zh: `${FSDP_EXAMPLE_PARAMS_B}B 个数 × ${FSDP_BYTES_PER_PARAM} 字节 = ${FSDP_FULL_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ 80 GB = ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% of one H100`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ 80 GB = 一张 H100 的 ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}%` },
      { en: '16 bytes = 2 + 2 + 12 per value', zh: '每个数 16 字节 = 2 + 2 + 12' },
    ],
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
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [560][step] : [500][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="fsdp-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="fsdp-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobileTitle, cur.mobileTitleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobileSubtitle, cur.mobileSubtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.mobile as item, i}
          {@const y = 80 + i * 91}
          <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
          <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
          <text x="150" y={y + 50} text-anchor="middle" class="small">{t(item.body, item.bodyZh)}</text>
          {#if i < cur.mobile.length - 1}
            <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={stroke(item.tone)} stroke-width="2.5" marker-end={item.tone === 'orange' ? 'url(#fsdp-arrow-orange)' : 'url(#fsdp-arrow-blue)'} />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
      {:else if step === 0}
        <rect x="35" y="88" width="310" height="252" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="190" y="120" text-anchor="middle" class="section">{t('ONE GPU · FULL COPY', '一张 GPU · 完整复制')}</text>
        <text x="65" y="158" class="small">{t('weights · 2 bytes each', '权重 · 每个 2 字节')}</text>
        <text x="315" y="158" text-anchor="end" class="result">{FSDP_FULL_WEIGHT_GB} GB</text>
        <text x="65" y="194" class="small">{t('gradients · 2 bytes each', '梯度 · 每个 2 字节')}</text>
        <text x="315" y="194" text-anchor="end" class="result">{FSDP_FULL_GRADIENT_GB} GB</text>
        <text x="65" y="230" class="small">{t('optimizer · 3 tables × 4 bytes', '优化器 · 3 张表 × 4 字节')}</text>
        <text x="315" y="230" text-anchor="end" class="result">{FSDP_FULL_OPTIMIZER_GB} GB</text>
        <line x1="60" y1="250" x2="320" y2="250" stroke="var(--line)" />
        <text x="65" y="284" class="small strong">{t('TOTAL ON THIS GPU', '这张 GPU 合计')}</text>
        <text x="315" y="284" text-anchor="end" class="big">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        <text x="190" y="318" text-anchor="middle" class="small">{(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% {t('of an 80 GB H100', '一张 80 GB H100')}</text>
        <rect x="375" y="88" width="310" height="252" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="530" y="120" text-anchor="middle" class="section">{t('8 GPUS · SAME COPIES', '8 张 GPU · 相同副本')}</text>
        {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
          <rect x={393 + (i % 4) * 70} y={140 + Math.floor(i / 4) * 72} width="60" height="56" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x={423 + (i % 4) * 70} y={163 + Math.floor(i / 4) * 72} text-anchor="middle" class="small">GPU {i}</text>
          <text x={423 + (i % 4) * 70} y={184 + Math.floor(i / 4) * 72} text-anchor="middle" class="small strong">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        {/each}
        <text x="530" y="318" text-anchor="middle" class="big">{FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="360" y="382" text-anchor="middle" class="result">{FSDP_EXAMPLE_PARAMS_B}B values × {FSDP_BYTES_PER_PARAM} bytes = {FSDP_FULL_STATE_PER_GPU_GB} GB {t('per GPU', '每张 GPU')}</text>
        <text x="360" y="416" text-anchor="middle" class="result">{FSDP_FULL_STATE_PER_GPU_GB} GB × {FSDP_DP_SIZE} = {FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="360" y="452" text-anchor="middle" class="small">{t('Orange = saved training tables · blue = repeated full copies', '橙 = 训练保存的表 · 蓝 = 重复的完整副本')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobileFoot, cur.mobileFootZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .big { font-family: var(--mono); font-size: 25px; font-weight: 700; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
    .big { font-size: 22px; }
  }
</style>
