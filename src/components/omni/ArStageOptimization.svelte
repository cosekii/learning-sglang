<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    OPT_REFERENCE_ENCODE_MS,
    OPT_REFERENCE_REQUEST_COUNT,
    OPT_REFERENCE_TOTAL_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Three prompts reuse one reference voice. Three separate encodes cost about ${OPT_REFERENCE_TOTAL_MS} ms.`,
    captionZh: `三个 prompt 共用一段参考音频。分别编码三次约需 ${OPT_REFERENCE_TOTAL_MS} ms。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? 790 : 540);
  const requests = [
    { id: 'A', prompt: 'Hello', promptZh: '你好' },
    { id: 'B', prompt: 'Thank you', promptZh: '谢谢' },
    { id: 'C', prompt: 'Yes, please', promptZh: '好的' },
  ];
  const roadmap = $derived([
    { title: 'finished result', body: 'reuse it', titleZh: '已完成的结果', bodyZh: '下次复用' },
    { title: 'running encode', body: 'share it', titleZh: '正在做的编码', bodyZh: '同时共享' },
    { title: 'GPU + CPU', body: 'work at once', titleZh: 'GPU + CPU', bodyZh: '同时工作' },
    { title: 'recorded kernels', body: 'replay them', titleZh: '录下的 kernels', bodyZh: '重放它们' },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="opt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One voice, three encodes' : 'Three prompts repeat one reference encode', phone ? '一段声音，三次编码' : '三个 prompt 重复编码同一段声音')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'reference encoder = voice → codes' : 'reference encoder = example voice → model-readable codes', phone ? 'reference encoder = 声音 → codes' : 'reference encoder = 示例声音 → 模型可读的 codes')}</text>
        {#if !phone}
          {#each requests as request, i}
            {@const x = 30 + i * 230}
            <rect x={x} y="82" width="200" height="91" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y="108" class="small strong">{request.id} · {t(`prompt: ${request.prompt}`, `prompt：${request.promptZh}`)}</text>
            <text x={x + 15} y="136" class="code">voice.wav</text>
            <text x={x + 15} y="158" class="small">{t('same reference voice', '同一段参考音频')}</text>
            <line x1={x + 100} y1="174" x2={x + 100} y2="197" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
            <rect x={x} y="204" width="200" height="63" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={x + 100} y="230" text-anchor="middle" class="small strong">encoder</text>
            <text x={x + 100} y="253" text-anchor="middle" class="result">≈ {OPT_REFERENCE_ENCODE_MS} ms</text>
          {/each}
          <text x="360" y="309" text-anchor="middle" class="result">{OPT_REFERENCE_REQUEST_COUNT} × ≈{OPT_REFERENCE_ENCODE_MS} ms = ≈{OPT_REFERENCE_TOTAL_MS} ms {t('of encoder work', 'encoder 工作')}</text>
          <text x="30" y="350" class="small strong">{t('THIS CHAPTER · FOUR PLACES WHERE WORK CAN WAIT', '本章地图 · 四处可能等待的工作')}</text>
          {#each roadmap as item, i}
            {@const x = 30 + i * 170}
            <rect x={x} y="370" width="160" height="111" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 14} y="394" class="result">{i + 1}</text>
            <text x={x + 14} y="422" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 14} y="451" class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {:else}
          {#each requests as request, i}
            {@const y = 82 + i * 143}
            <rect x="18" y={y} width="264" height="124" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 25} class="small strong">{request.id} · {t(`prompt: ${request.prompt}`, `prompt：${request.promptZh}`)}</text>
            <text x="32" y={y + 50} class="code">voice.wav</text>
            <rect x="32" y={y + 65} width="150" height="41" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="107" y={y + 91} text-anchor="middle" class="small strong">encoder</text>
            <text x="264" y={y + 91} text-anchor="end" class="result">≈{OPT_REFERENCE_ENCODE_MS} ms</text>
          {/each}
          <text x="150" y="526" text-anchor="middle" class="result">{OPT_REFERENCE_REQUEST_COUNT} × ≈{OPT_REFERENCE_ENCODE_MS} = ≈{OPT_REFERENCE_TOTAL_MS} ms</text>
          <text x="18" y="564" class="small strong">{t('CHAPTER MAP · FOUR WAITS', '本章地图 · 四处等待')}</text>
          {#each roadmap as item, i}
            {@const x = 18 + (i % 2) * 135}
            {@const y = 582 + Math.floor(i / 2) * 87}
            <rect x={x} y={y} width="129" height="74" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 10} y={y + 22} class="result">{i + 1}</text>
            <text x={x + 10} y={y + 43} class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 10} y={y + 63} class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Public MOSS profile; constructed three-prompt example.', '公开 MOSS profile；三个 prompt 是构造示例。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
  }
</style>
