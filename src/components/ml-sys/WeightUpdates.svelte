<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { UPDATE_DEBUG_PARAMS, UPDATE_DEBUG_BF16_BYTES, UPDATE_DEBUG_WEIGHT_GB, UPDATE_DEBUG_INITIAL_S, UPDATE_DEBUG_INNER_S, UPDATE_DEBUG_OUTER_S } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; foot2?: string; foot2Zh?: string;
    mobileTitle?: string; mobileTitleZh?: string; mobileSubtitle?: string; mobileSubtitleZh?: string; mobileFoot?: string; mobileFootZh?: string;
    mobile: MobileItem[]; formulas: { en: string; zh: string }[];
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: `A 1B bf16 model has about ${UPDATE_DEBUG_WEIGHT_GB} GB of weights. One debug run took ${UPDATE_DEBUG_INITIAL_S} seconds to update them.`,
    captionZh: `1B bf16 模型约有 ${UPDATE_DEBUG_WEIGHT_GB} GB 权重。一次调试中，完整更新花了 ${UPDATE_DEBUG_INITIAL_S} 秒。`,
    title: 'The inner copy looks fast, but the call is slow', titleZh: '里面复制很快，整个调用却很慢',
    subtitle: 'weight update = replace the rollout model\'s old number tables after training', subtitleZh: '权重更新 = 训练后换掉 rollout 模型里的旧数字表',
    foot: 'One author\'s distributed-update debug log; not a disk-versus-direct benchmark.', footZh: '一位作者的 distributed 更新调试记录，不是磁盘与直传的对比实验。',
    mobileTitle: 'The call is slow', mobileTitleZh: '整个调用很慢',
    mobileSubtitle: 'weight update = replace old weights', mobileSubtitleZh: '权重更新 = 换掉旧数字表',
    mobileFoot: 'Debug log; not a transport comparison.', mobileFootZh: '调试记录，不是传输对照实验。',
    mobile: [
      { title: 'TRAINING · WEIGHTS v1', titleZh: '训练端 · 权重 v1', body: 'new number tables', bodyZh: '新的数字表', tone: 'orange' },
      { title: 'UPDATE WEIGHTS', titleZh: '更新权重', body: 'copy v1 into rollout', bodyZh: '把 v1 装进 rollout', tone: 'orange' },
      { title: 'ROLLOUT WAITS', titleZh: 'ROLLOUT 等待', body: 'use v1 only after the update', bodyZh: '更新完成后才用 v1', tone: 'blue' },
    ],
    formulas: [
      { en: `1B × ${UPDATE_DEBUG_BF16_BYTES} B = ${UPDATE_DEBUG_WEIGHT_GB} GB of weights`, zh: `10 亿个数 × 每个 ${UPDATE_DEBUG_BF16_BYTES} B = ${UPDATE_DEBUG_WEIGHT_GB} GB 权重` },
      { en: `whole-model update = ${UPDATE_DEBUG_INITIAL_S} s`, zh: `完整更新 = ${UPDATE_DEBUG_INITIAL_S} 秒` },
      { en: `one parameter: inside ${UPDATE_DEBUG_INNER_S} s · whole call ${UPDATE_DEBUG_OUTER_S} s`, zh: `一个参数：内部 ${UPDATE_DEBUG_INNER_S} 秒 · 整个调用 ${UPDATE_DEBUG_OUTER_S} 秒` },
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
  const H = $derived(phone ? [480][step] : [410][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="update-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="update-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobileTitle ?? cur.title, cur.mobileTitleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobileSubtitle ?? cur.subtitle, cur.mobileSubtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.mobile as item, i}
          {@const y = 80 + i * 91}
          <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
          <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
          <text x="150" y={y + 50} text-anchor="middle" class="small">{t(item.body, item.bodyZh)}</text>
          {#if i < cur.mobile.length - 1}
            <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={item.tone === 'plain' ? 'var(--accent)' : stroke(item.tone)} stroke-width="2.5" marker-end={item.tone === 'orange' ? 'url(#update-arrow-orange)' : 'url(#update-arrow-blue)'} />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
      {:else if step === 0}
        <rect x="35" y="92" width="170" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="120" y="126" text-anchor="middle" class="section">TRAINING</text>
        <text x="120" y="163" text-anchor="middle" class="result">weights v1</text>
        <text x="120" y="188" text-anchor="middle" class="small">{t('new number tables', '新的数字表')}</text>
        <line x1="205" y1="148" x2="260" y2="148" stroke="var(--gen)" stroke-width="3" marker-end="url(#update-arrow-orange)" />
        <rect x="270" y="92" width="180" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="360" y="126" text-anchor="middle" class="section">UPDATE WEIGHTS</text>
        <text x="360" y="163" text-anchor="middle" class="result">?</text>
        <text x="360" y="188" text-anchor="middle" class="small">{t('copy v1 into rollout', '把 v1 装进 rollout')}</text>
        <line x1="450" y1="148" x2="505" y2="148" stroke="var(--accent)" stroke-width="3" marker-end="url(#update-arrow-blue)" />
        <rect x="515" y="92" width="170" height="112" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="600" y="126" text-anchor="middle" class="section">ROLLOUT</text>
        <text x="600" y="163" text-anchor="middle" class="result">{t('waits', '等待')}</text>
        <text x="600" y="188" text-anchor="middle" class="small">{t('then uses v1', '完成后才用 v1')}</text>
        <rect x="35" y="235" width="310" height="111" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="190" y="265" text-anchor="middle" class="small strong">{t('WEIGHT SIZE', '权重有多大')}</text>
        <text x="190" y="298" text-anchor="middle" class="result">1B × {UPDATE_DEBUG_BF16_BYTES} B = {UPDATE_DEBUG_WEIGHT_GB} GB</text>
        <text x="190" y="326" text-anchor="middle" class="small">{t('1 billion numbers, 2 bytes each', '10 亿个数，每个占 2 字节')}</text>
        <rect x="375" y="235" width="310" height="111" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="530" y="265" text-anchor="middle" class="small strong">{t('DEBUG TIME', '调试耗时')}</text>
        <text x="530" y="302" text-anchor="middle" class="big">{UPDATE_DEBUG_INITIAL_S} s</text>
        <text x="530" y="328" text-anchor="middle" class="small">{t(`one call: ${UPDATE_DEBUG_INNER_S} s inside, ${UPDATE_DEBUG_OUTER_S} s outside`, `一次调用：内部 ${UPDATE_DEBUG_INNER_S} 秒，外部 ${UPDATE_DEBUG_OUTER_S} 秒`)}</text>
      {/if}
      {#if cur.foot2}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(cur.foot2, cur.foot2Zh ?? cur.foot2)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobileFoot ?? cur.foot, cur.mobileFootZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
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
  .big { font-family: var(--mono); font-size: 26px; font-weight: 700; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
  }
</style>
