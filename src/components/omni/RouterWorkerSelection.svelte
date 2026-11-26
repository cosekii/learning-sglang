<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    ROUTER_WORKER_COUNT,
    ROUTER_COMPATIBLE_WORKER_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Two workers share one URL, but only B accepts this image. The router must check compatibility before taking turns.',
    captionZh: '两个 worker 共用一个网址，但只有 B 接收这张图片。router 轮流选择前，必须先检查是否兼容。',
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
  const H = $derived(phone ? [650][step] : [520][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="router-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One URL, two workers' : 'One URL, two different workers', phone ? '一个网址，两个 worker' : '一个网址，两个能力不同的 worker')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'worker = one Omni server' : 'worker = one Omni server the router can call', phone ? 'worker = 一个 Omni server' : 'worker = router 可以调用的一个 Omni server')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'router = the shared URL that chooses' : 'router = the shared URL that chooses a worker', phone ? 'router = 共用网址，负责选择' : 'router = 共用网址背后的选择者')}</text>
        <text x={W / 2} y="112" text-anchor="middle" class="result">{ROUTER_WORKER_COUNT} {t('workers', '个 worker')} · 1 {t('image request', '个图片请求')} · {ROUTER_COMPATIBLE_WORKER_COUNT} {t('compatible', '个兼容')}</text>
        <rect x={phone ? 50 : 260} y="140" width={phone ? 200 : 200} height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y="169" text-anchor="middle" class="small strong">POST · model M</text>
        <text x={W / 2} y="195" text-anchor="middle" class="small">1 {t('image as input', '张图片作为输入')}</text>
        {#if !phone}
          <line x1="310" y1="216" x2="190" y2="280" stroke="var(--faint)" stroke-width="2" stroke-dasharray="5 4" />
          <line x1="410" y1="216" x2="530" y2="280" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" />
          {#each [
            { x: 50, name: 'worker A', ability: 'text input only', abilityZh: '只接收文字输入', result: 'cannot accept this image', resultZh: '不能接收这张图片', ok: false },
            { x: 410, name: 'worker B', ability: 'image input → text', abilityZh: '图片输入 → 文字', result: 'accepts this request', resultZh: '可以接收这个请求', ok: true },
          ] as worker}
            <rect x={worker.x} y="285" width="260" height="145" rx="12" fill={worker.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={worker.ok ? 'var(--accent)' : 'var(--line)'} />
            <text x={worker.x + 20} y="317" class="result">{worker.name}</text>
            <text x={worker.x + 20} y="351" class="small">{t(worker.ability, worker.abilityZh)}</text>
            <text x={worker.x + 20} y="397" class="small strong" style={worker.ok ? '' : 'fill:var(--muted)'}>{t(worker.result, worker.resultZh)}</text>
          {/each}
        {:else}
          <line x1="150" y1="216" x2="150" y2="244" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" />
          <rect x="20" y="250" width="260" height="115" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="36" y="280" class="result">worker A</text>
          <text x="36" y="309" class="small">{t('text input only', '只接收文字输入')}</text>
          <text x="36" y="341" class="small" style="fill:var(--muted)">{t('cannot accept this image', '不能接收这张图片')}</text>
          <rect x="20" y="385" width="260" height="115" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="36" y="415" class="result">worker B</text>
          <text x="36" y="444" class="small">{t('image input → text', '图片输入 → 文字')}</text>
          <text x="36" y="476" class="small strong">{t('accepts this request', '可以接收这个请求')}</text>
        {/if}
        <text x={W / 2} y={phone ? 545 : 470} text-anchor="middle" class="small strong">{t('Taking turns alone cannot answer who can accept it.', '只看轮流顺序，无法知道谁能接收这个请求。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed profiles from the router’s typed-image routing test.', '构造能力行来自 router 的 typed-image 路由测试。')}</text>
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
