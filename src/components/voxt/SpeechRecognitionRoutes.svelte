<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_ASR_DEMO_BYTES,
    VOXT_ASR_DEMO_SECONDS,
    VOXT_ASR_FILE_PCM_BYTES,
    VOXT_ASR_FILE_SECONDS,
    VOXT_ASR_FILE_WAV_BYTES,
    VOXT_ASR_ROUTE_COUNT,
    VOXT_ASR_SPLIT_MAX_SECONDS,
    VOXT_ASR_SPLIT_PAUSE_MS,
    VOXT_ASR_SPLIT_PIECE_COUNT,
    VOXT_ASR_SPLIT_QUIET_MS,
    VOXT_ASR_SPLIT_SEARCH_SECONDS,
    VOXT_ASR_SPLIT_SECONDS,
    VOXT_ASR_STREAM_CALLS,
    VOXT_ASR_STREAM_SENDS,
    VOXT_PCM_BYTES_PER_SECOND,
    VOXT_WAV_HEADER_BYTES,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Only the selected speech service receives the recording. The other two routes receive nothing.',
    captionZh: '只有选中的识别服务收到录音。另外两条路线收不到。',
  }, {
    caption: 'A file transcriber waits for the whole recording. It returns final text after the stop.',
    captionZh: '文件型识别等整段录音结束。停止后，它返回最终文字。',
  }, {
    caption: 'Streaming recognition revises a draft as sound arrives. The final result replaces the draft.',
    captionZh: '流式识别边收声音边改草稿。最终文字取代草稿。',
  }, {
    caption: 'Oversized audio is cut in a quiet part of the last quarter. Both pieces fit the upload limit.',
    captionZh: '超长录音在最后四分之一的安静处切开。两块都不超过上传上限。',
  }];
  const ariaLabels = [{
    en: 'One second of sound is 32000 bytes. A chooser selects one of three recognition routes: local Omni on this Mac, a configured remote ASR API, or macOS system dictation through the helper.',
    zh: '一秒声音有 32000 个字节。选择器从三条识别路线中选一条：这台 Mac 上的本机 Omni、配置的外部 ASR API，或经过 helper 的 macOS 系统听写。',
  }, {
    en: 'A file transcriber waits for three seconds of speech to stop. For this OpenAI-compatible example, 96000 PCM bytes plus a 44-byte WAV header become one 96044-byte upload, then one final text.',
    zh: '文件型识别等三秒说话结束。这个 OpenAI 兼容例子里，96000 字节 PCM 加 44 字节 WAV 头组成一次 96044 字节上传，然后返回一份最终文字。',
  }, {
    en: 'Three sends produce three replaceable whole-text drafts: Good, Good mor, Good morning. Finish produces one final Good morning. The drafts are not appended together.',
    zh: '三次发送产生三份可替换的完整草稿：Good、Good mor、Good morning。结束后产生一份最终 Good morning。草稿不是逐句拼接。',
  }, {
    en: 'A ten-second recording exceeds a nine-second upload limit. The algorithm searches the last quarter, from 6.75 to 9 seconds, for the quietest 100 milliseconds. It cuts inside a 300-millisecond pause at 8.5 seconds, producing two pieces.',
    zh: '十秒录音超过九秒上传上限。算法在六点七五到九秒的最后四分之一里寻找最安静的一百毫秒，在八点五秒开始的三百毫秒停顿中切开，得到两块。',
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
  const H = $derived((phone ? [650, 570, 550, 600, 500, 570, 480] : [440, 410, 450, 480, 390, 440, 370])[step]);
  const draftText = ['Good', 'Good mor', 'Good morning'];
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="asr-route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if step === 0}
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
      {:else if step === 1}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('FILE RECOGNITION · WAIT FOR THE STOP', '文件型识别 · 等说话停止')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('file transcriber = receives one finished recording', '文件型识别 = 接收一段完整录音')}</text>

      <rect x={phone ? 30 : 40} y="72" width={phone ? 240 : 640} height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={W / 2} y="93" text-anchor="middle" class="label">{t('YOU SPEAK · NO FINAL TEXT YET', '你正在说话 · 还没有最终文字')}</text>
      {#each Array.from({ length: 30 }, (_, i) => i) as i}
        {@const x = (phone ? 50 : 60) + i * (phone ? 6.7 : 20)}
        {@const height = 8 + ((i * 7) % 19)}
        <line x1={x} y1={128 - height / 2} x2={x} y2={128 + height / 2} stroke="var(--accent)" stroke-width={phone ? 3 : 5} stroke-linecap="round" />
      {/each}
      <line x1={phone ? 252 : 660} y1="103" x2={phone ? 252 : 660} y2="146" stroke="var(--gen)" stroke-width="2" />
      <text x={phone ? 50 : 60} y="153" text-anchor="middle" class="detail">0 s</text>
      <text x={phone ? 117 : 260} y="153" text-anchor="middle" class="detail">1 s</text>
      <text x={phone ? 184 : 460} y="153" text-anchor="middle" class="detail">2 s</text>
      <text x={phone ? 250 : 660} y="153" text-anchor="middle" class="detail amber">3 s · {t('STOP', '停止')}</text>

      <line x1={W / 2} y1="168" x2={W / 2} y2="197" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <rect x={phone ? 35 : 45} y="205" width={phone ? 230 : 290} height="125" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 150 : 190} y="230" text-anchor="middle" class="label">{t('EXAMPLE UPLOAD · WAV', '上传示例 · WAV')}</text>
      <text x={phone ? 150 : 190} y="252" text-anchor="middle" class="detail">{t('WAV = PCM + a 44-byte file header', 'WAV = PCM + 44 字节文件头')}</text>
      <text x={phone ? 150 : 190} y="280" text-anchor="middle" class="formula">{VOXT_ASR_FILE_SECONDS} × {VOXT_PCM_BYTES_PER_SECOND.toLocaleString('en-US')} + {VOXT_WAV_HEADER_BYTES}</text>
      <text x={phone ? 150 : 190} y="306" text-anchor="middle" class="formula">= {VOXT_ASR_FILE_WAV_BYTES.toLocaleString('en-US')} {t('bytes', '字节')}</text>

      <line x1={phone ? 150 : 340} y1={phone ? 334 : 267} x2={phone ? 150 : 380} y2={phone ? 362 : 267} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <rect x={phone ? 35 : 385} y={phone ? 370 : 205} width={phone ? 230 : 290} height={phone ? 105 : 125} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 150 : 530} y={phone ? 396 : 234} text-anchor="middle" class="label amber">{t('FINAL TEXT · THE TEXT THAT COUNTS', '最终文字 · 正式采用的文字')}</text>
      <text x={phone ? 150 : 530} y={phone ? 431 : 277} text-anchor="middle" class="result">“Good morning.”</text>
      <text x={phone ? 150 : 530} y={phone ? 455 : 304} text-anchor="middle" class="detail">{t('one result after the stop', '停止后返回一份结果')}</text>
      <text x={W / 2} y={phone ? 510 : 363} text-anchor="middle" class="cut">{t('STOP → ONE UPLOAD → ONE FINAL RESULT', '停止 → 一次上传 → 一份最终结果')}</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t(`Constructed ${VOXT_ASR_FILE_SECONDS}-second example; OpenAI-compatible WAV upload.`, `构造的 ${VOXT_ASR_FILE_SECONDS} 秒例子；OpenAI 兼容接口上传 WAV。`)}</text>
      {:else if step === 2}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('STREAMING · DRAFTS CAN CHANGE', '流式识别 · 草稿可以变化')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('stream = recognise while sound is still arriving', '流式 = 声音还在送来，识别已经开始')}</text>
      {#each draftText as text, i}
        {@const x = phone ? 35 : 30 + i * 230}
        {@const y = phone ? 75 + i * 95 : 80}
        <rect x={x} y={y} width={phone ? 230 : 200} height="78" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={x + (phone ? 115 : 100)} y={y + 21} text-anchor="middle" class="detail">SEND {i + 1} → {t('DRAFT', '草稿')} {i + 1}</text>
        <text x={x + (phone ? 115 : 100)} y={y + 50} text-anchor="middle" class="result">“{text}”</text>
        <text x={x + (phone ? 115 : 100)} y={y + 69} text-anchor="middle" class="detail">{t('the whole current draft', '当前整份草稿')}</text>
        {#if i < 2}
          <line x1={phone ? 150 : x + 200} y1={phone ? y + 78 : 119} x2={phone ? 150 : x + 225} y2={phone ? y + 91 : 119} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
        {/if}
      {/each}
      <text x={W / 2} y={phone ? 373 : 190} text-anchor="middle" class="cut">{t('EACH NEW DRAFT REPLACES THE LAST · NOT AN EXTRA SENTENCE', '每份新草稿替换上一份 · 不是多加一句话')}</text>
      <line x1={W / 2} y1={phone ? 385 : 205} x2={W / 2} y2={phone ? 414 : 240} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <rect x={phone ? 35 : 180} y={phone ? 420 : 250} width={phone ? 230 : 360} height="82" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={W / 2} y={phone ? 444 : 276} text-anchor="middle" class="label amber">FINISH → {t('FINAL TEXT', '最终文字')}</text>
      <text x={W / 2} y={phone ? 477 : 309} text-anchor="middle" class="result">“Good morning.”</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t(`${VOXT_ASR_STREAM_SENDS} Send calls + 1 Finish = ${VOXT_ASR_STREAM_CALLS} calls in this example.`, `本例 ${VOXT_ASR_STREAM_SENDS} 次 Send + 1 次 Finish = ${VOXT_ASR_STREAM_CALLS} 次调用。`)}</text>
      {:else if step === 3}
      {@const left = phone ? 20 : 40}
      {@const track = phone ? 260 : 640}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('SPLIT AN OVERSIZED UPLOAD AT A QUIET PLACE', '超长上传 · 在安静处切开')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('last quarter = the final 1/4 of the 9-second budget', '最后四分之一 = 9 秒上限的最后 1/4')}</text>
      <text x={W / 2} y="74" text-anchor="middle" class="label">{VOXT_ASR_SPLIT_SECONDS} s {t('RECORDING', '录音')} · {t('LIMIT', '上限')} {VOXT_ASR_SPLIT_MAX_SECONDS} s</text>
      <rect x={left + track * 0.675} y="91" width={track * 0.225} height="82" fill="var(--accent-soft)" />
      <text x={left + track * 0.7875} y="87" text-anchor="middle" class="detail">{t('SEARCH HERE', '在这里找安静处')}</text>
      <line x1={left} y1="133" x2={left + track} y2="133" stroke="var(--line)" />
      {#each Array.from({ length: 81 }, (_, i) => i) as i}
        {@const seconds = i / 80 * VOXT_ASR_SPLIT_SECONDS}
        {@const quiet = seconds >= 8.5 && seconds <= 8.8}
        {@const height = quiet ? 2 : 12 + (i * 11 % 34)}
        <line x1={left + track * i / 80} y1={133 - height / 2} x2={left + track * i / 80} y2={133 + height / 2} stroke={quiet ? 'var(--muted)' : 'var(--accent)'} stroke-width={phone ? 2 : 4} stroke-linecap="round" />
      {/each}
      <rect x={left + track * 0.85} y="105" width={track * 0.03} height="56" fill="none" stroke="var(--gen)" stroke-width="2" />
      <line x1={left + track * 0.865} y1="98" x2={left + track * 0.865} y2="169" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
      <line x1={left + track * 0.9} y1="96" x2={left + track * 0.9} y2="166" stroke="var(--muted)" stroke-dasharray="3 3" />
      <text x={left} y="194" class="detail">0 s</text>
      <text x={left + track * 0.675} y="194" text-anchor="middle" class="detail">{VOXT_ASR_SPLIT_SEARCH_SECONDS} s</text>
      <text x={left + track * 0.9} y={phone ? 229 : 194} text-anchor="middle" class="detail">9 s · {t('LIMIT', '上限')}</text>
      <text x={left + track} y="194" text-anchor="end" class="detail">10 s</text>
      <text x={W / 2} y={phone ? 255 : 218} text-anchor="middle" class="detail amber">{t(`CUT INSIDE ${VOXT_ASR_SPLIT_PAUSE_MS} ms PAUSE · 8.5–8.8 s`, `在 ${VOXT_ASR_SPLIT_PAUSE_MS} ms 停顿里切开 · 8.5–8.8 秒`)}</text>
      <text x={W / 2} y={phone ? 275 : 238} text-anchor="middle" class="detail">{t(`find the quietest ${VOXT_ASR_SPLIT_QUIET_MS} ms`, `寻找最安静的 ${VOXT_ASR_SPLIT_QUIET_MS} ms`)}</text>
      <line x1={W / 2} y1={phone ? 285 : 248} x2={W / 2} y2={phone ? 302 : 263} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <rect x={phone ? 35 : 65} y={phone ? 310 : 280} width={phone ? 230 : 270} height="92" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 200} y={phone ? 338 : 310} text-anchor="middle" class="label">{t('PIECE 1', '第 1 块')}</text>
      <text x={phone ? 150 : 200} y={phone ? 369 : 347} text-anchor="middle" class="result">0 s → {t('pause', '停顿')}</text>
      <rect x={phone ? 35 : 385} y={phone ? 420 : 280} width={phone ? 230 : 270} height="92" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 520} y={phone ? 448 : 310} text-anchor="middle" class="label">{t('PIECE 2', '第 2 块')}</text>
      <text x={phone ? 150 : 520} y={phone ? 479 : 347} text-anchor="middle" class="result">{t('pause', '停顿')} → 10 s</text>
      <text x={W / 2} y={phone ? 550 : 410} text-anchor="middle" class="cut">{VOXT_ASR_SPLIT_PIECE_COUNT} {t('PIECES · EACH FITS THE 9-SECOND LIMIT', '块 · 每块都不超过 9 秒上限')}</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Public test fixture; the exact cut depends on sound energy.', '公开测试例；实际切点由声音能量决定。')}</text>
      {/if}
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
  .result { font-size: 20px; font-weight: 650; fill: var(--fg); }
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
  }
</style>
