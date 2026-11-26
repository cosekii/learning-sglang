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
    DUPLEX_NATIVE_UNIT_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Delivery reaches 2.0 seconds, but playback reaches 1.2. The remaining 800 ms is already beyond the server queues.',
    captionZh: '声音已交付 2.0 秒，但只播放了 1.2 秒。其余 800 ms 已不在服务器队列里。',
  }, {
    caption: 'Three designs handle the same interruption. A streaming cascade separates recognition, language and speech services.',
    captionZh: '三种设计处理同一次打断。streaming cascade 让识别、语言模型和语音生成接力。',
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
  const H = $derived(phone ? [650, 790][step] : [540, 590][step]);
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
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Three strategies, one interruption', '三种策略，同一次打断')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('alternatives, not three stages in one pipeline', '三种替代方案，不是一条流水线里的三段')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = strategies · orange = interrupt' : 'blue = strategy map · orange = shared interruption', phone ? '蓝 = 策略 · 橙 = 打断' : '蓝 = 策略地图 · 橙 = 共用的打断')}</text>
        {#if !phone}
          {#each [
            { x: 30, n: '1 of 3', name: 'turn-based', model: 'Qwen3-Omni', lines: ['VAD finds the turn end', 'speech onset stops a reply'], linesZh: ['VAD 找到说话结束', '回答时一开口就打断'], ref: 'Ch. 21 Step 1', refZh: '第 21 章第 1 步' },
            { x: 265, n: '2 of 3', name: 'streaming cascade', model: 'ASR → LLM → TTS', lines: ['ASR: sound → text', 'LLM: text → reply', 'TTS: reply → sound'], linesZh: ['ASR：声音 → 文字', 'LLM：文字 → 回答', 'TTS：回答 → 声音'], ref: 'separate services', refZh: '不同服务接力' },
            { x: 500, n: '3 of 3', name: 'native full-duplex', model: 'MiniCPM-o 4.5', lines: [`${DUPLEX_NATIVE_UNIT_MS / 1000} s audio units`, 'one model listens or speaks'], linesZh: [`每份声音 ${DUPLEX_NATIVE_UNIT_MS / 1000} 秒`, '同一模型选择听或说'], ref: 'Ch. 21 Steps 1–2', refZh: '第 21 章第 1–2 步' },
          ] as card}
            <rect x={card.x} y="112" width="190" height="294" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={card.x + 16} y="140" class="small strong">{card.n}</text>
            <text x={card.x + 16} y="174" class="small strong">{card.name}</text>
            <text x={card.x + 16} y="204" class="code">{card.model}</text>
            {#each card.lines as line, i}
              <text x={card.x + 16} y={249 + i * 34} class="small">{t(line, card.linesZh[i])}</text>
            {/each}
            <text x={card.x + 16} y="378" class="small">{t(card.ref, card.refZh)}</text>
          {/each}
          <rect x="120" y="438" width="480" height="56" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="472" text-anchor="middle" class="small strong">{t('same interruption: “No, I meant London.”', '同一次打断：「不对，我说的是伦敦。」')}</text>
          <text x="360" y="538" text-anchor="middle" class="result">{t('Which old outputs can the graph delete first?', '修改对话记录前，图能先删掉哪些旧输出？')}</text>
        {:else}
          {#each [
            { y: 108, n: '1 of 3', name: 'turn-based · Qwen3-Omni', lines: ['VAD finds turn end', 'speech onset stops a reply'], linesZh: ['VAD 找到说话结束', '回答时一开口就打断'] },
            { y: 282, n: '2 of 3', name: 'streaming cascade', lines: ['ASR: sound → text', 'LLM: text → reply', 'TTS: reply → sound'], linesZh: ['ASR：声音 → 文字', 'LLM：文字 → 回答', 'TTS：回答 → 声音'] },
            { y: 456, n: '3 of 3', name: 'native full-duplex · MiniCPM-o', lines: [`${DUPLEX_NATIVE_UNIT_MS / 1000} s units · listen or speak`, 'Ch. 21 Steps 1–2'], linesZh: [`每份 ${DUPLEX_NATIVE_UNIT_MS / 1000} 秒 · 选择听或说`, '第 21 章第 1–2 步'] },
          ] as card}
            <rect x="18" y={card.y} width="264" height="150" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={card.y + 27} class="small strong">{card.n}</text>
            <text x="32" y={card.y + 55} class="small strong">{card.name}</text>
            {#each card.lines as line, i}
              <text x="32" y={card.y + 88 + i * 27} class="small">{t(line, card.linesZh[i])}</text>
            {/each}
          {/each}
          <rect x="18" y="630" width="264" height="62" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="656" text-anchor="middle" class="small strong">{t('same interruption', '同一次打断')}</text>
          <text x="150" y="680" text-anchor="middle" class="small">“No, I meant London.”</text>
          <text x="150" y="733" text-anchor="middle" class="small strong">{t('Which old outputs can be deleted?', '哪些旧输出能先删掉？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Different systems · not a benchmark' : 'Different models and services; this map does not compare their speed.', phone ? '不同系统 · 不比较速度' : '不同模型和服务；这张地图不比较速度。')}</text>
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
