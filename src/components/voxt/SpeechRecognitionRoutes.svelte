<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_ASR_DEMO_BYTES,
    VOXT_ASR_DEMO_SECONDS,
    VOXT_ASR_ROUTE_COUNT,
    VOXT_PCM_BYTES_PER_SECOND,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Only the selected speech service receives the recording. The other two routes receive nothing.',
    captionZh: '只有选中的识别服务收到录音。另外两条路线收不到。',
  }];
  const ariaLabels = [{
    en: 'One second of sound is 32000 bytes. A chooser selects one of three recognition routes: local Omni on this Mac, a configured remote ASR API, or macOS system dictation through the helper.',
    zh: '一秒声音有 32000 个字节。选择器从三条识别路线中选一条：这台 Mac 上的本机 Omni、配置的外部 ASR API，或经过 helper 的 macOS 系统听写。',
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
  const H = $derived(phone ? 650 : 440);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="asr-route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE RECORDING · CHOOSE ONE RECOGNITION ROUTE', '同一段录音 · 选一条识别路线')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('ASR = speech recognition: sound becomes words', 'ASR = 语音识别：把声音听成文字')}</text>

      <rect x={phone ? 45 : 250} y="70" width={phone ? 210 : 220} height="75" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={W / 2} y="94" text-anchor="middle" class="label">{t('PROCESSED AUDIO FROM CH. 3', '第 3 章处理好的声音')}</text>
      <text x={W / 2} y="121" text-anchor="middle" class="formula">{VOXT_ASR_DEMO_SECONDS} s = {VOXT_ASR_DEMO_BYTES.toLocaleString('en-US')} {t('bytes', '字节')}</text>
      <text x={W / 2} y="138" text-anchor="middle" class="detail">{t('blue = the same recording', '蓝色 = 同一段录音')}</text>
      <text x={W / 2} y={phone ? 166 : 165} text-anchor="middle" class="cut">{t(`CHOOSE 1 OF ${VOXT_ASR_ROUTE_COUNT}`, `${VOXT_ASR_ROUTE_COUNT} 条里选 1 条`)}</text>

      {#if !phone}
        <line x1={W / 2} y1="175" x2="155" y2="240" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
        <line x1={W / 2} y1="175" x2="585" y2="240" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
        <rect x="25" y="205" width="420" height="190" rx="12" fill="none" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="42" y="227" class="detail">{t('THIS MAC · sound stays here on these two routes', '这台 Mac · 这两条路线里，声音留在这里')}</text>
      {:else}
        <rect x="15" y="195" width="270" height="275" rx="12" fill="none" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="150" y="216" text-anchor="middle" class="detail">{t('THIS MAC · sound stays here', '这台 Mac · 声音留在这里')}</text>
      {/if}

      <rect x={phone ? 35 : 45} y={phone ? 230 : 245} width={phone ? 230 : 180} height={phone ? 95 : 125} rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 135} y={phone ? 253 : 270} text-anchor="middle" class="label">{t('1 · LOCAL OMNI', '1 · 本机 Omni')}</text>
      <text x={phone ? 150 : 135} y={phone ? 276 : 294} text-anchor="middle" class="detail">Qwen3-ASR</text>
      <text x={phone ? 150 : 135} y={phone ? 297 : 317} text-anchor="middle" class="detail">127.0.0.1</text>
      <text x={phone ? 150 : 135} y={phone ? 316 : 342} text-anchor="middle" class="detail">{t('model server on this Mac', '模型服务就在这台 Mac')}</text>

      {#if !phone}<line x1="360" y1="175" x2="340" y2="240" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />{/if}
      <rect x={phone ? 35 : 245} y={phone ? 340 : 245} width={phone ? 230 : 180} height={phone ? 95 : 125} rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 335} y={phone ? 363 : 270} text-anchor="middle" class="label">{t('2 · SYSTEM DICTATION', '2 · 系统听写')}</text>
      <text x={phone ? 150 : 335} y={phone ? 386 : 294} text-anchor="middle" class="detail">macOS SFSpeechRecognizer</text>
      <text x={phone ? 150 : 335} y={phone ? 407 : 317} text-anchor="middle" class="detail">{t('through the helper', '经过 helper')}</text>
      <text x={phone ? 150 : 335} y={phone ? 426 : 342} text-anchor="middle" class="detail">{t('built into this Mac', '这台 Mac 自带')}</text>

            <rect x={phone ? 35 : 465} y={phone ? 490 : 245} width={phone ? 230 : 230} height={phone ? 105 : 125} rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 150 : 580} y={phone ? 514 : 270} text-anchor="middle" class="label amber">{t('3 · CONFIGURED ASR API', '3 · 配置的 ASR API')}</text>
      <text x={phone ? 150 : 580} y={phone ? 537 : 294} text-anchor="middle" class="detail">{t('example: OpenAI Transcribe', '例子：OpenAI Transcribe')}</text>
      <text x={phone ? 150 : 580} y={phone ? 558 : 317} text-anchor="middle" class="detail">https:// · wss://</text>
      <text x={phone ? 150 : 580} y={phone ? 580 : 342} text-anchor="middle" class="detail">{t('another computer in this example', '本例在另一台电脑上')}</text>
      {#if !phone}<text x="580" y="390" text-anchor="middle" class="detail amber">{t('OUTSIDE THIS MAC', '这台 Mac 之外')}</text>{/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('An API at 127.0.0.1 stays on this Mac too.', 'API 地址是 127.0.0.1 时，声音也留在本机。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 13px; font-weight: 600; fill: var(--accent); }
  .label { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 13px; font-weight: 650; fill: var(--fg); }
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
  }
</style>
