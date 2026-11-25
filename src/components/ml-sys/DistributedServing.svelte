<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DYNAMO_LOG_READY_US, DYNAMO_LOG_HTTP_US, DYNAMO_READY_TO_HTTP_US, DYNAMO_HTTP_PORT } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const seconds = (us: number) => (us / 1_000_000).toFixed(6);
  const steps = [{
    caption: `The public log waits ${(DYNAMO_LOG_READY_US / 1_000_000).toFixed(2)} s for SGLang readiness. HTTP starts ${(DYNAMO_READY_TO_HTTP_US / 1_000_000).toFixed(2)} s later, after the worker is ready.`,
    captionZh: `公开日志里，SGLang 就绪等了 ${(DYNAMO_LOG_READY_US / 1_000_000).toFixed(2)} 秒。HTTP 又过 ${(DYNAMO_READY_TO_HTTP_US / 1_000_000).toFixed(2)} 秒才启动。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 520 : 400);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="serve-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="serve-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t('A service starts before it can serve', '服务先完成启动，才能接请求')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'public log · microsecond timestamps' : 'public startup log · timestamps include microseconds', '公开启动日志 · 时间戳精确到微秒')}</text>
        {#if !phone}
          {#each [
            { x: 40, title: 'waiting for sglang0', titleZh: '等待 sglang0', time: '20:32:52.029318', color: 'var(--accent)' },
            { x: 270, title: 'sglang0 is ready', titleZh: 'sglang0 已就绪', time: '20:33:13.629792', color: 'var(--accent)' },
            { x: 500, title: `HTTP :${DYNAMO_HTTP_PORT} starts`, titleZh: `HTTP :${DYNAMO_HTTP_PORT} 启动`, time: '20:33:14.477283', color: 'var(--gen)' },
          ] as event, i}
            <rect x={event.x} y="104" width="180" height="104" rx="12" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={event.color} />
            <text x={event.x + 90} y="139" text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x={event.x + 90} y="178" text-anchor="middle" class="timestamp">{event.time}</text>
          {/each}
          <line x1="220" y1="156" x2="260" y2="156" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <text x="245" y="91" text-anchor="middle" class="delta">+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="450" y1="156" x2="490" y2="156" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <text x="475" y="91" text-anchor="middle" class="delta">+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <rect x="40" y="238" width="640" height="62" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="265" text-anchor="middle" class="result">ready = {t('worker finished startup and can compute', 'worker 完成启动，可以参加计算')}</text>
          <text x="360" y="288" text-anchor="middle" class="small">{t('blue = worker startup · orange = HTTP service', '蓝 = worker 启动 · 橙 = HTTP 服务')}</text>
          <text x="360" y="337" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_READY_US)} + {seconds(DYNAMO_READY_TO_HTTP_US)} = {seconds(DYNAMO_LOG_HTTP_US)} s</text>
          <text x="360" y="363" text-anchor="middle" class="small">{t('from the first log line to HTTP startup', '从第一条日志到 HTTP 启动的总时间')}</text>
        {:else}
          {#each [
            { y: 72, title: 'waiting for sglang0', titleZh: '等待 sglang0', time: '20:32:52.029318' },
            { y: 200, title: 'sglang0 is ready', titleZh: 'sglang0 已就绪', time: '20:33:13.629792' },
            { y: 328, title: `HTTP :${DYNAMO_HTTP_PORT} starts`, titleZh: `HTTP :${DYNAMO_HTTP_PORT} 启动`, time: '20:33:14.477283' },
          ] as event, i}
            <rect x="35" y={event.y} width="230" height="70" rx="11" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={i === 2 ? 'var(--gen)' : 'var(--accent)'} />
            <text x="150" y={event.y + 27} text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x="150" y={event.y + 53} text-anchor="middle" class="timestamp">{event.time}</text>
          {/each}
          <line x1="150" y1="142" x2="150" y2="190" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <text x="165" y="169" class="delta">+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="150" y1="270" x2="150" y2="318" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <text x="165" y="297" class="delta">+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <text x="150" y="425" text-anchor="middle" class="result">ready = {t('startup done; can compute', '启动完成，可以参加计算')}</text>
          <text x="150" y="452" text-anchor="middle" class="small">{t('blue = worker · orange = HTTP', '蓝 = worker · 橙 = HTTP')}</text>
          <text x="150" y="482" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_HTTP_US)} s {t('to HTTP', '到 HTTP')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Public single-node log, not a multi-node timing target.', '公开单节点日志，不是多节点耗时目标。')}</text>
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
  .strong { font-weight: 650; }
  .timestamp { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .delta { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .timestamp { font-size: 12px; }
    .delta { font-size: 11px; }
    .result { font-size: 12px; }
  }
</style>
