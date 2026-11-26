<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    DUPLEX_GENERATED_MS,
    DUPLEX_DELIVERED_MS,
    DUPLEX_HEARD_MS,
    DUPLEX_DELIVERED_UNPLAYED_MS,
    DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Delivery reaches 2.0 seconds, but playback reaches 1.2. The remaining 800 ms is already beyond the server queues.',
    captionZh: '声音已交付 2.0 秒，但只播放了 1.2 秒。其余 800 ms 已不在服务器队列里。',
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
  const H = $derived(phone ? [650][step] : [540][step]);
  const seconds = (ms: number) => (ms / 1000).toFixed(1);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Delivered sound is not played sound', '交付的声音不等于播过的声音')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('one constructed reply · blue = reply audio', '同一段构造回答 · 蓝 = 回答声音')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('red outline = delivered but not played', '红框 = 已交付但还没播放')}</text>
        {#if !phone}
          {#each [
            { y: 120, ms: DUPLEX_GENERATED_MS, name: 'generated', sub: 'the model produced it', nameZh: '已生成', subZh: '模型已经算出' },
            { y: 205, ms: DUPLEX_DELIVERED_MS, name: 'delivered = D', sub: 'the server connection took it', nameZh: '已交付 = D', subZh: '服务器连接已经取走' },
            { y: 290, ms: DUPLEX_HEARD_MS, name: 'heard = H', sub: 'the client says it played', nameZh: '已播放 = H', subZh: '客户端报告已经播放' },
          ] as row}
            <text x="30" y={row.y + 20} class="small strong">{t(row.name, row.nameZh)}</text>
            <text x="30" y={row.y + 42} class="small">{t(row.sub, row.subZh)}</text>
            <rect x="240" y={row.y} width={(row.ms / DUPLEX_GENERATED_MS) * 410} height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="655" y={row.y + 31} text-anchor="end" class="result">{seconds(row.ms)} s</text>
          {/each}
          <rect x={240 + (DUPLEX_HEARD_MS / DUPLEX_GENERATED_MS) * 410} y="205" width={(DUPLEX_DELIVERED_UNPLAYED_MS / DUPLEX_GENERATED_MS) * 410} height="50" rx="7" fill="none" stroke="var(--eos)" stroke-width="3" />
          <text x="360" y="393" text-anchor="middle" class="result">D − H = {seconds(DUPLEX_DELIVERED_MS)} − {seconds(DUPLEX_HEARD_MS)} = {seconds(DUPLEX_DELIVERED_UNPLAYED_MS)} s = {DUPLEX_DELIVERED_UNPLAYED_MS} ms</text>
          <text x="360" y="433" text-anchor="middle" class="small strong">{t('The server can delete queued sound, not this delivered interval.', '服务器能删掉排队声音，删不掉这段已交付声音。')}</text>
          <text x="360" y="477" text-anchor="middle" class="result">{t('What does each design keep in the next answer?', '三种设计会把多少旧回答留进下一次回答？')}</text>
        {:else}
          {#each [
            { y: 125, ms: DUPLEX_GENERATED_MS, name: 'generated · model output', nameZh: '已生成 · 模型输出' },
            { y: 250, ms: DUPLEX_DELIVERED_MS, name: 'delivered = D · connection took it', nameZh: '已交付 = D · 连接取走' },
            { y: 375, ms: DUPLEX_HEARD_MS, name: 'heard = H · client played it', nameZh: '已播放 = H · 客户端播过' },
          ] as row}
            <text x="18" y={row.y - 14} class="small strong">{t(row.name, row.nameZh)}</text>
            <rect x="18" y={row.y} width={(row.ms / DUPLEX_GENERATED_MS) * 230} height="48" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="278" y={row.y + 30} text-anchor="end" class="result">{seconds(row.ms)} s</text>
          {/each}
          <rect x={18 + (DUPLEX_HEARD_MS / DUPLEX_GENERATED_MS) * 230} y="250" width={(DUPLEX_DELIVERED_UNPLAYED_MS / DUPLEX_GENERATED_MS) * 230} height="48" rx="7" fill="none" stroke="var(--eos)" stroke-width="3" />
          <text x="150" y="477" text-anchor="middle" class="result">D − H = {seconds(DUPLEX_DELIVERED_MS)} − {seconds(DUPLEX_HEARD_MS)}</text>
          <text x="150" y="507" text-anchor="middle" class="result">= {DUPLEX_DELIVERED_UNPLAYED_MS} ms {t('not played', '还没播放')}</text>
          <text x="150" y="551" text-anchor="middle" class="small">{t('Queued sound can be deleted.', '服务器能删掉排队声音。')}</text>
          <text x="150" y="577" text-anchor="middle" class="small">{t('This delivered interval cannot.', '删不掉这段已交付声音。')}</text>
          <text x="150" y="617" text-anchor="middle" class="small strong">{t('What enters the next answer?', '多少旧回答进入下次回答？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? `Constructed times · default lead ≤ ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms` : `Constructed times. The default output lead is ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms; delivery is a server ledger, not acoustic proof.`, phone ? `构造时刻 · 默认提前交付 ≤ ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms` : `构造时刻。默认最多提前交付 ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms；交付记录不是播放证明。`)}</text>
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
