<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { HOTKEY_BLOCKED_MESSAGE_COUNT, HOTKEY_MESSAGE_COUNT, HOTKEY_PRESS_COUNT, HOTKEY_PROGRAM_COUNT } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Right Option becomes one JSON message. The Go app reads it and starts dictation.',
    captionZh: '右 Option 变成 JSON 消息。Go app 读后启动听写。',
  }, {
    caption: 'Accessibility lets the helper see keys you press in other apps. Without it, this route stops.',
    captionZh: 'Accessibility 让 helper 看见你在其他 app 按的键。未开启时，这条路线断开。',
  }, {
    caption: 'Microphone permission controls sound, not keys. Without it, recording cannot start.',
    captionZh: '麦克风权限只管声音，不管按键。未开启时，录音不能开始。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 544 : 360);
  const boxes = $derived(phone ? [
    { x: 20, y: 60, w: 260, h: 72 },
    { x: 20, y: 150, w: 260, h: 72 },
    { x: 20, y: 240, w: 260, h: 154 },
    { x: 20, y: 412, w: 260, h: 72 },
  ] : [
    { x: 20, y: 90, w: 120, h: 170 },
    { x: 160, y: 90, w: 130, h: 170 },
    { x: 300, y: 90, w: 250, h: 170 },
    { x: 570, y: 90, w: 130, h: 170 },
  ]);
  const permissionPanels = $derived(phone ? [
    { x: 10, y: 78, allowed: false },
    { x: 10, y: 282, allowed: true },
  ] : [
    { x: 20, y: 78, allowed: false },
    { x: 370, y: 78, allowed: true },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'One Right Option tap crosses from the Swift helper to the Go app as one JSON message, which starts dictation' : step === 1 ? t('The same Right Option tap produces no message with Accessibility off and one message with it on', '同一个右 Option 在 Accessibility 关闭时没有消息，打开时产生一条消息') : t('The same recording request fails with Microphone permission off and brings sound to the Go app with it on', '同一个录音请求在麦克风权限关闭时失败，开启时把声音送到 Go app')}>
      <defs>
        <marker id="key-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="message-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      <text x={W / 2} y={phone ? 24 : 32} text-anchor="middle" class="title">{step === 0 ? t(
        `${HOTKEY_PRESS_COUNT} KEY · ${HOTKEY_PROGRAM_COUNT} PROGRAMS · ${HOTKEY_MESSAGE_COUNT} MESSAGE`,
        `${HOTKEY_PRESS_COUNT} 次按键 · ${HOTKEY_PROGRAM_COUNT} 个程序 · ${HOTKEY_MESSAGE_COUNT} 条消息`,
      ) : step === 1 ? t('SAME KEY · TWO SETTINGS', '同一个按键 · 两种设置') : t('SAME REQUEST · MICROPHONE OFF / ON', '同一个请求 · 麦克风权限关 / 开')}</text>
      {#if step === 0}
        <text x={W / 2} y={phone ? 45 : 55} text-anchor="middle" class="subtitle">{t('The key becomes a message, not sound', '按键变成消息，不是声音')}</text>
      {:else if step === 1}
        <text x={W / 2} y={phone ? 43 : 55} text-anchor="middle" class="subtitle">{t('Accessibility = a Mac setting', 'Accessibility = Mac 的一项设置')}</text>
        <text x={W / 2} y={phone ? 61 : 72} text-anchor="middle" class="subtitle">{t('It lets helper see keys from other apps', '让 helper 看见其他 app 的按键')}</text>
      {:else}
        <text x={W / 2} y={phone ? 43 : 55} text-anchor="middle" class="subtitle">{t('Microphone permission = Mac allows sound input', '麦克风权限 = Mac 允许声音进入')}</text>
        <text x={W / 2} y={phone ? 61 : 72} text-anchor="middle" class="subtitle">{t('Accessibility stays on in both panels', '两幅图都保持 Accessibility 开启')}</text>
      {/if}

      {#if step === 0}
      {#each boxes as box, i}
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="12" fill={i === 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={i === 2 ? 2 : 1} />
        {#if i < boxes.length - 1}
          <line x1={phone ? box.x + box.w / 2 : box.x + box.w} y1={phone ? box.y + box.h : box.y + box.h / 2} x2={phone ? box.x + box.w / 2 : boxes[i + 1].x - 4} y2={phone ? boxes[i + 1].y - 5 : box.y + box.h / 2} stroke={i === 0 ? 'var(--muted)' : 'var(--accent)'} stroke-width="2" marker-end={`url(#${i === 0 ? 'key-arrow' : 'message-arrow'})`} />
        {/if}
      {/each}

      <text x={boxes[0].x + boxes[0].w / 2} y={boxes[0].y + (phone ? 17 : 27)} text-anchor="middle" class="label">{t('YOU TAP', '你按一下')}</text>
      <text x={boxes[0].x + boxes[0].w / 2} y={boxes[0].y + (phone ? 43 : 76)} text-anchor="middle" class="key">{phone ? 'Right ⌥ Option' : 'Right ⌥'}</text>
      <text x={boxes[0].x + boxes[0].w / 2} y={boxes[0].y + (phone ? 63 : 105)} text-anchor="middle" class="detail">{t('default · once', '默认键 · 一次')}</text>
      {#if !phone}<text x={boxes[0].x + boxes[0].w / 2} y={boxes[0].y + 132} text-anchor="middle" class="detail">Option</text>{/if}

      <text x={boxes[1].x + boxes[1].w / 2} y={boxes[1].y + (phone ? 17 : 27)} text-anchor="middle" class="label">SWIFT HELPER</text>
      <text x={boxes[1].x + boxes[1].w / 2} y={boxes[1].y + (phone ? 39 : 65)} text-anchor="middle" class="detail">{t(phone ? 'companion · left ⌥ misses' : 'helper = companion', phone ? '辅助程序 · 左 ⌥ 不匹配' : '辅助程序')}</text>
      <text x={boxes[1].x + boxes[1].w / 2} y={boxes[1].y + (phone ? 61 : 96)} text-anchor="middle" class="detail">{t('spots right ⌥', '认出右边的 ⌥')}</text>
      {#if !phone}<text x={boxes[1].x + boxes[1].w / 2} y={boxes[1].y + 124} text-anchor="middle" class="detail">{t('left ⌥ does not match', '左边的 ⌥ 不匹配')}</text>{/if}

      <text x={boxes[2].x + boxes[2].w / 2} y={boxes[2].y + (phone ? 20 : 27)} text-anchor="middle" class="label">{t('ONE JSON MESSAGE', '一条 JSON 消息')}</text>
      <text x={boxes[2].x + boxes[2].w / 2} y={boxes[2].y + (phone ? 40 : 49)} text-anchor="middle" class="detail">{t('JSON = names + matching values', 'JSON = 名字 + 对应内容')}</text>
      <text x={boxes[2].x + 12} y={boxes[2].y + (phone ? 65 : 79)} class="mono">method=hotkey.event</text>
      <text x={boxes[2].x + boxes[2].w - 12} y={boxes[2].y + (phone ? 65 : 79)} text-anchor="end" class="meaning">{t('key message', '按键消息')}</text>
      <text x={boxes[2].x + 12} y={boxes[2].y + (phone ? 89 : 108)} class="mono">binding=transcribe/0</text>
      <text x={boxes[2].x + boxes[2].w - 12} y={boxes[2].y + (phone ? 89 : 108)} text-anchor="end" class="meaning">{t('default dictation key', '默认听写键')}</text>
      <text x={boxes[2].x + 12} y={boxes[2].y + (phone ? 113 : 137)} class="mono">phase=trigger</text>
      <text x={boxes[2].x + boxes[2].w - 12} y={boxes[2].y + (phone ? 113 : 137)} text-anchor="end" class="meaning">{t('press happened', '按一下已发生')}</text>
      <text x={boxes[2].x + boxes[2].w / 2} y={boxes[2].y + (phone ? 140 : 158)} text-anchor="middle" class="detail">{t('/0 = first key; counting starts at 0', '/0 = 第 1 个听写键，从 0 开始数')}</text>

      <text x={boxes[3].x + boxes[3].w / 2} y={boxes[3].y + (phone ? 16 : 27)} text-anchor="middle" class="label">GO APP</text>
      <text x={boxes[3].x + boxes[3].w / 2} y={boxes[3].y + (phone ? 33 : 62)} text-anchor="middle" class="detail">{t('main program', '主程序')}</text>
      <text x={boxes[3].x + boxes[3].w / 2} y={boxes[3].y + (phone ? 50 : 94)} text-anchor="middle" class="action">{t(phone ? 'idle → START' : 'START', phone ? '空闲 → 开始' : '开始')}</text>
      <text x={boxes[3].x + boxes[3].w / 2} y={boxes[3].y + (phone ? 66 : 122)} text-anchor="middle" class="detail">{t('Transcribe = dictation', 'Transcribe = 听写')}</text>
      {#if !phone}<text x={boxes[3].x + boxes[3].w / 2} y={boxes[3].y + 148} text-anchor="middle" class="detail">{t('nothing was recording', '此前没在听写')}</text>{/if}

      <text x={W / 2} y={H - (phone ? 34 : 38)} text-anchor="middle" class="footnote">{t('Permission already granted; key route only', '本步假设权限已通过，只画按键路线')}</text>
      <text x={W / 2} y={H - (phone ? 12 : 18)} text-anchor="middle" class="footnote">{t('After Start, Go asks helper for microphone audio.', '开始后，Go app 请 helper 采集麦克风。')}</text>
      {:else if step === 1}
        {#each permissionPanels as panel}
          {@const keyX = phone ? 12 : 16}
          {@const keyW = phone ? 68 : 82}
          {@const gateX = phone ? 99 : 119}
          {@const gateW = phone ? 82 : 92}
          {@const helperX = phone ? 200 : 232}
          {@const helperW = phone ? 68 : 82}
          <g transform={`translate(${panel.x} ${panel.y})`}>
            <rect width={phone ? 280 : 330} height={phone ? 190 : 210} rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="16" y="24" class="label">{panel.allowed ? t('ACCESSIBILITY: ON', '已开启 Accessibility') : t('ACCESSIBILITY: OFF', '未开启 Accessibility')}</text>

            <rect x={keyX} y="48" width={keyW} height="68" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={keyX + keyW / 2} y="68" text-anchor="middle" class="label">{t('YOU TAP', '你按一下')}</text>
            <text x={keyX + keyW / 2} y="91" text-anchor="middle" class="compare-key">Right ⌥</text>
            <text x={keyX + keyW / 2} y="110" text-anchor="middle" class="detail">Option</text>

            <rect x={gateX} y="48" width={gateW} height="68" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={gateX + gateW / 2} y="70" text-anchor="middle" class="label">MAC</text>
            <text x={gateX + gateW / 2} y="91" text-anchor="middle" class="detail">{t('setting', '设置')}</text>
            <text x={gateX + gateW / 2} y="110" text-anchor="middle" class={panel.allowed ? 'action' : 'blocked'}>{panel.allowed ? 'ON' : 'OFF'}</text>

            <rect x={helperX} y="48" width={helperW} height="68" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={helperX + helperW / 2} y="70" text-anchor="middle" class="label">HELPER</text>
            <text x={helperX + helperW / 2} y="96" text-anchor="middle" class="detail">{panel.allowed ? t('key seen', '看见按键') : t('no key', '看不见')}</text>

            <line x1={keyX + keyW} y1="82" x2={gateX - 4} y2="82" stroke="var(--muted)" stroke-width="2" marker-end="url(#key-arrow)" />
            <line x1={gateX + gateW} y1="82" x2={helperX - 5} y2="82" stroke={panel.allowed ? 'var(--accent)' : 'var(--eos)'} stroke-width="2" marker-end={panel.allowed ? 'url(#message-arrow)' : undefined} />
            {#if !panel.allowed}<text x={(gateX + gateW + helperX) / 2} y="77" text-anchor="middle" class="blocked-x">×</text>{/if}

            <text x={(phone ? 280 : 330) / 2} y={phone ? 150 : 158} text-anchor="middle" class={panel.allowed ? 'message' : 'blocked'}>{panel.allowed
              ? t(`${HOTKEY_MESSAGE_COUNT} key message`, `${HOTKEY_MESSAGE_COUNT} 条按键消息`)
              : t(`${HOTKEY_BLOCKED_MESSAGE_COUNT} key messages`, `${HOTKEY_BLOCKED_MESSAGE_COUNT} 条按键消息`)}</text>
            <text x={(phone ? 280 : 330) / 2} y={phone ? 174 : 184} text-anchor="middle" class="action">{panel.allowed ? t('Go app: START', 'Go app：开始') : t('Go app: idle', 'Go app：仍空闲')}</text>
          </g>
        {/each}
        <text x={W / 2} y={H - (phone ? 34 : 38)} text-anchor="middle" class="footnote">{t('Both panels use the same Right Option tap.', '两幅图里，你都按同一个右 Option。')}</text>
        <text x={W / 2} y={H - (phone ? 12 : 18)} text-anchor="middle" class="footnote">{t('The Go app starts idle.', 'Go app 起初都空闲。')}</text>
      {:else}
        {#each permissionPanels as panel}
          {@const panelW = phone ? 280 : 330}
          <g transform={`translate(${panel.x} ${panel.y})`}>
            <rect width={panelW} height={phone ? 200 : 210} rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="16" y="24" class="label">{panel.allowed ? t('MICROPHONE: ON', '麦克风权限：已开启') : t('MICROPHONE: OFF', '麦克风权限：未开启')}</text>

            <rect x="25" y="38" width={panelW - 50} height="58" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={panelW / 2} y="56" text-anchor="middle" class="label">{t('GO APP → HELPER', 'Go app → helper')}</text>
            <text x={panelW / 2} y="75" text-anchor="middle" class="mono">capture.start</text>
            <text x={panelW / 2} y="91" text-anchor="middle" class="detail">{t('please start recording', '请开始录音')}</text>
            <line x1={panelW / 2} y1="96" x2={panelW / 2} y2="105" stroke="var(--accent)" stroke-width="2" marker-end="url(#message-arrow)" />

            <rect x="25" y="108" width={panelW - 50} height="48" rx="9" fill={panel.allowed ? 'var(--accent-soft)' : 'var(--bg)'} stroke={panel.allowed ? 'var(--accent)' : 'var(--eos)'} />
            <text x={panelW / 2} y="127" text-anchor="middle" class="label">{t('MAC MICROPHONE', 'Mac 麦克风')}</text>
            <text x={panelW / 2} y="147" text-anchor="middle" class={panel.allowed ? 'message' : 'blocked'}>{panel.allowed ? t('sound may enter', '允许声音进入') : t('sound is blocked', '声音被挡住')}</text>

            {#if panel.allowed}
              <text x={panelW / 2} y={phone ? 178 : 184} text-anchor="middle" class="message">{t('sound → helper → Go app', '声音 → helper → Go app')}</text>
              <text x={panelW / 2} y={phone ? 195 : 204} text-anchor="middle" class="action">{t('recording starts', '录音开始')}</text>
            {:else}
              <text x={panelW / 2} y={phone ? 176 : 182} text-anchor="middle" class="mono">permission_denied</text>
              <text x={panelW / 2} y={phone ? 195 : 204} text-anchor="middle" class="blocked">{t('Permission refused; no recording', '权限被拒绝，录音没有开始')}</text>
            {/if}
          </g>
        {/each}
        <text x={W / 2} y={H - (phone ? 34 : 38)} text-anchor="middle" class="footnote">{t('Both send the same request after the hotkey.', '按键后，两边发出同一个请求。')}</text>
        <text x={W / 2} y={H - (phone ? 12 : 18)} text-anchor="middle" class="footnote">{t('Permission unblocks sound; the mic must also work.', '权限只取消阻拦；麦克风还要能收音。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 12px; fill: var(--muted); }
  .label { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .key { font-family: var(--mono); font-size: 19px; font-weight: 700; fill: var(--fg); }
  .compare-key { font-family: var(--mono); font-size: 17px; font-weight: 700; fill: var(--fg); }
  .blocked { font-size: 12px; font-weight: 700; fill: var(--eos); }
  .blocked-x { font-size: 22px; font-weight: 700; fill: var(--eos); }
  .message { font-size: 12px; font-weight: 700; fill: var(--accent); }
  .mono { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .meaning { font-size: 10px; fill: var(--fg); }
  .action { font-size: 14px; font-weight: 700; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 14px; }
    .subtitle, .label, .detail, .mono, .meaning, .footnote { font-size: 12px; }
    .compare-key { font-size: 15px; }
    .action { font-size: 13px; }
  }
</style>
