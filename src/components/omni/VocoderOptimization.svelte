<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    OPT_VOCODER_CHUNK_MS,
    VOC_LEFT_CONTEXT_FRAMES,
    VOC_NEW_FRAMES,
    VOC_STATELESS_INPUT_FRAMES,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A later window decodes 25 old frames plus 10 new ones. It emits only the 10 new frames.',
    captionZh: '后续窗口要算 25 帧旧内容和 10 帧新内容。它只输出那 10 帧新内容。',
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
  const H = $derived(phone ? 790 : 570);
  const roadmap = $derived([
    { title: 'ready windows', body: 'decode them together', titleZh: '准备好的窗口', bodyZh: '放在一起解码' },
    { title: 'earlier decoder work', body: 'keep it for next time', titleZh: '之前算过的内容', bodyZh: '留给下个窗口' },
    { title: 'recorded kernels', body: 'replay the same shape', titleZh: '录下的 kernels', bodyZh: '重放相同形状' },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="voc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One later window' : 'One later window repeats earlier work', phone ? '一个后续窗口' : '后续窗口重复计算旧内容')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'vocoder = frames → sound · blue = new' : 'vocoder = codec frames → sound · blue = new frames', phone ? 'vocoder = frames → 声音 · 蓝 = 新帧' : 'vocoder = codec frames → 声音 · 蓝 = 新帧')}</text>
        {#if !phone}
          <rect x="30" y="88" width="660" height="224" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="115" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="48" y="137" width="360" height="67" rx="8" fill="white" stroke="var(--faint)" />
          <text x="228" y="165" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="228" y="188" text-anchor="middle" class="small">{t('decoded again · not emitted again', '再次解码 · 不再次输出')}</text>
          <rect x="416" y="137" width="144" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="488" y="165" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="488" y="188" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="304" y="231" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <line x1="570" y1="170" x2="595" y2="170" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="603" y="137" width="70" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="638" y="176" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="638" y1="205" x2="638" y2="231" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="500" y="239" width="173" height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="586" y="261" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="586" y="281" text-anchor="middle" class="small">= {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="30" y="346" class="small strong">{t('THIS CHAPTER · THREE WAYS TO CHANGE THE WORK', '本章地图 · 三种改变工作的方式')}</text>
          {#each roadmap as item, i}
            {@const x = 30 + i * 225}
            <rect x={x} y="368" width="210" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y="395" class="result">{i + 1}</text>
            <text x={x + 15} y="425" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 15} y="454" class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {:else}
          <rect x="18" y="86" width="264" height="344" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="112" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="32" y="130" width="236" height="69" rx="8" fill="white" stroke="var(--faint)" />
          <text x="150" y="157" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="150" y="181" text-anchor="middle" class="small">{t('decoded again · not emitted', '再次解码 · 不再次输出')}</text>
          <rect x="32" y="209" width="236" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="237" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="150" y="260" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="150" y="304" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <rect x="32" y="323" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="350" text-anchor="middle" class="small strong">vocoder</text>
          <rect x="32" y="375" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="401" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')} = {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="18" y="466" class="small strong">{t('THIS CHAPTER · THREE CHANGES', '本章地图 · 三种改变')}</text>
          {#each roadmap as item, i}
            {@const y = 486 + i * 86}
            <rect x="18" y={y} width="264" height="73" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 24} class="result">{i + 1}</text>
            <text x="59" y={y + 24} class="small strong">{t(item.title, item.titleZh)}</text>
            <text x="59" y={y + 51} class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Qwen3-Omni · 10 new frames = 800 ms playback' : 'Qwen3-Omni default window; 800 ms is playback time, not compute time.', phone ? 'Qwen3-Omni · 10 帧新内容 = 800 ms 播放' : 'Qwen3-Omni 默认窗口；800 ms 是播放时长，不是计算耗时。')}</text>
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
