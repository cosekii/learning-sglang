<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_ASR_DEMO_BYTES,
    VOXT_ASR_DEMO_SECONDS,
    VOXT_ASR_FILE_PCM_BYTES,
    VOXT_ASR_FILE_SECONDS,
    VOXT_ASR_FILE_WAV_BYTES,
    VOXT_ASR_JOIN_INSERTED_SPACES,
    VOXT_ASR_JOIN_PIECE_COUNT,
    VOXT_ASR_ROUTE_COUNT,
    VOXT_ASR_RAW_RESULT_COUNT,
    VOXT_ASR_SPLIT_MAX_SECONDS,
    VOXT_ASR_SPLIT_PAUSE_MS,
    VOXT_ASR_SPLIT_PIECE_COUNT,
    VOXT_ASR_SPLIT_QUIET_MS,
    VOXT_ASR_SPLIT_SEARCH_SECONDS,
    VOXT_ASR_SPLIT_SECONDS,
    VOXT_ASR_STREAM_CALLS,
    VOXT_ASR_STREAM_SENDS,
    VOXT_OMNI_FIRST_DECODE_MS,
    VOXT_OMNI_PREVIEW_TIMES_MS,
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
  }, {
    caption: 'Pieces are recognised in order. Adjacent English words are joined with one space.',
    captionZh: '各块按顺序识别。英文相邻文字之间补一个空格。',
  }, {
    caption: 'By default, local Omni updates drafts about every second. It recognises the whole recording again after the stop.',
    captionZh: '默认本机 Omni 约每秒更新草稿。停止后，它重新识别完整录音。',
  }, {
    caption: 'The recognition route delivers raw text here. Next, see what else the language model receives.',
    captionZh: '识别路线到这里交出原话。下一章看语言模型还收到什么。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: the recording box appears first, then the three route cards one at a time, and last the selection appears — route 1 is selected in this example and the other two routes receive nothing.',
    zh: '画面按顺序形成：先出现录音框，再依次出现三条路线卡，最后出现选择结果——本例选中第 1 条，另外两条路线收不到录音。',
  }, {
    en: 'The picture builds in order: the speech waveform draws one second at a time up to the stop at three seconds, then the WAV upload box with its size formula, then the final text.',
    zh: '画面按顺序形成：说话波形一秒一秒画出，直到三秒处停止，然后出现带大小算式的 WAV 上传框，最后出现最终文字。',
  }, {
    en: 'The picture builds in order: draft one Good appears, then draft two Good mor replaces it — the old draft is struck through — then draft three Good morning replaces it, and Finish produces the final text.',
    zh: '画面按顺序形成：先出现草稿 Good，再出现 Good mor 并划掉旧草稿，随后 Good morning 取代上一份，最后 Finish 产生最终文字。',
  }, {
    en: 'The picture builds in order: the ten-second waveform appears, then the nine-second limit line, then the search window over the last quarter, then the quiet pause where the cut lands, and last the two pieces.',
    zh: '画面按顺序形成：先出现十秒波形，再出现九秒上限线，随后出现最后四分之一的搜索窗，再标出切点所在的安静停顿，最后出现两块。',
  }, {
    en: 'The picture builds in order: piece one is recognised as Good, then piece two as morning, then the join note, and last the joined final text Good morning.',
    zh: '画面按顺序形成：第一块先识别为 Good，第二块随后识别为 morning，再出现合并说明，最后出现合并后的 Good morning。',
  }, {
    en: 'The picture builds in order: audible sound starts, then drafts appear at 0.1, 1.1 and 2.1 seconds one at a time, then the update note, and last the stop and the final pass over the whole recording.',
    zh: '画面按顺序形成：可闻声音开始，草稿依次在零点一、一点一、二点一秒出现，再出现更新说明，最后停止并重新识别完整录音。',
  }, {
    en: 'The picture builds in order: the recognition result appears first, then the arrow into the next chapter box, then its two questions, and last the closing line that recognition is done.',
    zh: '画面按顺序形成：先出现识别结果，再出现指向下一章框的箭头，随后出现两个问题，最后出现识别阶段完成的收尾行。',
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
  // Every step builds its mechanism as a looping process: Step 1 forms the
  // three routes then the selection; Step 2 draws speech up to the stop, then
  // the upload and the final text; Step 3 replaces each draft with the next;
  // Step 4 forms the limit, the search window, the pause and the cut; Step 5
  // recognises piece by piece; Step 6 plays preview drafts then the final
  // pass; Step 7 hands the raw text over.
  const PHASE_COUNTS = [5, 7, 5, 7, 4, 6, 4];
  // Phone LoopProgress spot per step, kept clear of rows, cards and footnotes.
  const LP_PHONE: [number, number][] = [[225, 608], [225, 528], [225, 514], [225, 566], [225, 462], [225, 532], [225, 426]];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { phase = PHASE_COUNTS[s] - 1; return; }
    phase = 0;
    const count = PHASE_COUNTS[s];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  // Step 2: the speech waveform is revealed one second at a time.
  const speakX0 = $derived(phone ? 50 : 60);
  const speakX1 = $derived(phone ? 252 : 660);
  const speakRevealW = $derived(speakX0 + (speakX1 - speakX0) * Math.min(phase, 3) / 3 + 4);
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="asr-route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="asr-pick-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <clipPath id="asr-speak-reveal">
          <rect x="0" y="95" width={speakRevealW} height="70" />
        </clipPath>
      </defs>
      {#if !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={LP_PHONE[step][0]} y={LP_PHONE[step][1]} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}
      {#if step === 0}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE RECORDING · CHOOSE ONE ROUTE', '同一段录音 · 选一条识别路线')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('ASR = speech recognition: sound becomes words', 'ASR = 语音识别：把声音听成文字')}</text>

      <rect x={phone ? 45 : 250} y="70" width={phone ? 210 : 220} height="75" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={W / 2} y="94" text-anchor="middle" class="label">{t('PROCESSED AUDIO FROM CH. 3', '第 3 章处理好的声音')}</text>
      <text x={W / 2} y="121" text-anchor="middle" class="formula">{VOXT_ASR_DEMO_SECONDS} s = {VOXT_ASR_DEMO_BYTES.toLocaleString('en-US')} {t('bytes', '字节')}</text>
      <text x={W / 2} y="138" text-anchor="middle" class="detail">{t('blue = the same recording', '蓝色 = 同一段录音')}</text>
      <text x={W / 2} y={phone ? 166 : 165} text-anchor="middle" class="cut">{t(`CHOOSE 1 OF ${VOXT_ASR_ROUTE_COUNT}`, `${VOXT_ASR_ROUTE_COUNT} 条里选 1 条`)}</text>

      {#if phase >= 2}
      {#if !phone}
        <rect in:fade={{ duration: 250 }} x="25" y="205" width="420" height="190" rx="12" fill="none" stroke="var(--line)" stroke-dasharray="5 4" />
        <text in:fade={{ duration: 250 }} x="42" y="227" class="detail">{t('THIS MAC · sound stays here on these two routes', '这台 Mac · 这两条路线里，声音留在这里')}</text>
      {:else}
        <rect in:fade={{ duration: 250 }} x="15" y="195" width="270" height="270" rx="12" fill="none" stroke="var(--line)" stroke-dasharray="5 4" />
        <text in:fade={{ duration: 250 }} x="150" y="216" text-anchor="middle" class="detail">{t('THIS MAC · sound stays here', '这台 Mac · 声音留在这里')}</text>
      {/if}
      {/if}

      {#if phase >= 1}
      {#if !phone}<line in:fade={{ duration: 250 }} x1={W / 2} y1="175" x2="155" y2="240" stroke={phase >= 4 ? 'var(--accent)' : 'var(--muted)'} stroke-width="2" marker-end={phase >= 4 ? 'url(#asr-pick-arrow)' : 'url(#asr-route-arrow)'} />{/if}
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 45} y={phone ? 230 : 245} width={phone ? 230 : 180} height={phone ? 108 : 125} rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 135} y={phone ? 253 : 270} text-anchor="middle" class="label">{t('1 · LOCAL OMNI', '1 · 本机 Omni')}</text>
      <text x={phone ? 150 : 135} y={phone ? 276 : 294} text-anchor="middle" class="detail">Qwen3-ASR</text>
      <text x={phone ? 150 : 135} y={phone ? 297 : 317} text-anchor="middle" class="detail">127.0.0.1</text>
      <text x={phone ? 150 : 135} y={phone ? 316 : 342} text-anchor="middle" class="detail">{t('model server on this Mac', '模型服务就在这台 Mac')}</text>
      {#if phase >= 4}<text in:fade={{ duration: 250 }} x={phone ? 150 : 135} y={phone ? 331 : 360} text-anchor="middle" class="detail picked">{t('selected in this example', '本例选中这条')}</text>{/if}
      </g>
      {/if}

      {#if phase >= 2}
      {#if !phone}<line in:fade={{ duration: 250 }} x1="360" y1="175" x2="340" y2="240" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />{/if}
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 245} y={phone ? 352 : 245} width={phone ? 230 : 180} height={phone ? 108 : 125} rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 335} y={phone ? 375 : 270} text-anchor="middle" class="label">{t('2 · SYSTEM DICTATION', '2 · 系统听写')}</text>
      <text x={phone ? 150 : 335} y={phone ? 398 : 294} text-anchor="middle" class="detail">macOS SFSpeechRecognizer</text>
      <text x={phone ? 150 : 335} y={phone ? 419 : 317} text-anchor="middle" class="detail">{t('through the helper', '经过 helper')}</text>
      <text x={phone ? 150 : 335} y={phone ? 438 : 342} text-anchor="middle" class="detail">{t('built into this Mac', '这台 Mac 自带')}</text>
      {#if phase >= 4}<text in:fade={{ duration: 250 }} x={phone ? 150 : 335} y={phone ? 453 : 360} text-anchor="middle" class="detail muted">{t('receives nothing', '收不到录音')}</text>{/if}
      </g>
      {/if}

      {#if phase >= 3}
      {#if !phone}<line in:fade={{ duration: 250 }} x1={W / 2} y1="175" x2="585" y2="240" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />{/if}
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 465} y={phone ? 474 : 245} width={phone ? 230 : 230} height={phone ? 118 : 125} rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 150 : 580} y={phone ? 498 : 270} text-anchor="middle" class="label amber">{t('3 · CONFIGURED ASR API', '3 · 配置的 ASR API')}</text>
      <text x={phone ? 150 : 580} y={phone ? 521 : 294} text-anchor="middle" class="detail">{t('example: OpenAI Transcribe', '例子：OpenAI Transcribe')}</text>
      <text x={phone ? 150 : 580} y={phone ? 542 : 317} text-anchor="middle" class="detail">https:// · wss://</text>
      <text x={phone ? 150 : 580} y={phone ? 561 : 342} text-anchor="middle" class="detail">{t('another computer in this example', '本例在另一台电脑上')}</text>
      {#if phase >= 4}<text in:fade={{ duration: 250 }} x={phone ? 150 : 580} y={phone ? 584 : 360} text-anchor="middle" class="detail muted">{t('receives nothing', '收不到录音')}</text>{/if}
      </g>
      {#if !phone}<text in:fade={{ duration: 250 }} x="580" y="390" text-anchor="middle" class="detail amber">{t('OUTSIDE THIS MAC', '这台 Mac 之外')}</text>{/if}
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('An API at 127.0.0.1 stays on this Mac too.', 'API 地址是 127.0.0.1 时，声音也留在本机。')}</text>
      {:else if step === 1}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('FILE RECOGNITION · WAIT FOR THE STOP', '文件型识别 · 等说话停止')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('file transcriber = receives one finished recording', '文件型识别 = 接收一段完整录音')}</text>

      <rect x={phone ? 30 : 40} y="72" width={phone ? 240 : 640} height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={W / 2} y="93" text-anchor="middle" class="label">{t('YOU SPEAK · NO FINAL TEXT YET', '你正在说话 · 还没有最终文字')}</text>
      {#if phase >= 1}
      <g clip-path="url(#asr-speak-reveal)">
        {#each Array.from({ length: 30 }, (_, i) => i) as i}
          {@const x = (phone ? 50 : 60) + i * (phone ? 6.7 : 20)}
          {@const height = 8 + ((i * 7) % 19)}
          <line x1={x} y1={128 - height / 2} x2={x} y2={128 + height / 2} stroke="var(--accent)" stroke-width={phone ? 3 : 5} stroke-linecap="round" />
        {/each}
      </g>
      <text in:fade={{ duration: 200 }} x={phone ? 50 : 60} y="153" text-anchor="middle" class="detail">0 s</text>
      <text in:fade={{ duration: 200 }} x={phone ? 117 : 260} y="153" text-anchor="middle" class="detail">1 s</text>
      {/if}
      {#if phase >= 2}<text in:fade={{ duration: 200 }} x={phone ? 184 : 460} y="153" text-anchor="middle" class="detail">2 s</text>{/if}
      {#if phase >= 3}
      <line in:fade={{ duration: 200 }} x1={phone ? 252 : 660} y1="103" x2={phone ? 252 : 660} y2="146" stroke="var(--gen)" stroke-width="2" />
      <text in:fade={{ duration: 200 }} x={phone ? 250 : 660} y="153" text-anchor="middle" class="detail amber">3 s · {t('STOP', '停止')}</text>
      {/if}

      {#if phase >= 4}
      <line in:fade={{ duration: 250 }} x1={W / 2} y1="168" x2={W / 2} y2="197" stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 45} y="205" width={phone ? 230 : 290} height="125" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 150 : 190} y="230" text-anchor="middle" class="label">{t('EXAMPLE UPLOAD · WAV', '上传示例 · WAV')}</text>
      <text x={phone ? 150 : 190} y="252" text-anchor="middle" class="detail">{t('WAV = PCM + a 44-byte file header', 'WAV = PCM + 44 字节文件头')}</text>
      <text x={phone ? 150 : 190} y="280" text-anchor="middle" class="formula">{VOXT_ASR_FILE_SECONDS} × {VOXT_PCM_BYTES_PER_SECOND.toLocaleString('en-US')} + {VOXT_WAV_HEADER_BYTES}</text>
      <text x={phone ? 150 : 190} y="306" text-anchor="middle" class="formula">= {VOXT_ASR_FILE_WAV_BYTES.toLocaleString('en-US')} {t('bytes', '字节')}</text>
      </g>
      {/if}

      {#if phase >= 5}
      <line in:fade={{ duration: 250 }} x1={phone ? 150 : 340} y1={phone ? 334 : 267} x2={phone ? 150 : 380} y2={phone ? 362 : 267} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 385} y={phone ? 370 : 205} width={phone ? 230 : 290} height={phone ? 105 : 125} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 150 : 530} y={phone ? 396 : 234} text-anchor="middle" class="label amber">{t('FINAL TEXT · THE TEXT THAT COUNTS', '最终文字 · 正式采用的文字')}</text>
      <text x={phone ? 150 : 530} y={phone ? 431 : 277} text-anchor="middle" class="result">“Good morning.”</text>
      <text x={phone ? 150 : 530} y={phone ? 455 : 304} text-anchor="middle" class="detail">{t('one result after the stop', '停止后返回一份结果')}</text>
      </g>
      {/if}
      {#if phase >= 6}
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 510 : 363} text-anchor="middle" class="cut">{t('STOP → ONE UPLOAD → ONE FINAL RESULT', '停止 → 一次上传 → 一份最终结果')}</text>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t(`${VOXT_ASR_FILE_SECONDS} s example · OpenAI-compatible WAV upload.`, `构造的 ${VOXT_ASR_FILE_SECONDS} 秒例子；OpenAI 兼容接口上传 WAV。`)}</text>
      {:else if step === 2}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('STREAMING · DRAFTS CAN CHANGE', '流式识别 · 草稿可以变化')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('stream = recognise while sound is still arriving', '流式 = 声音还在送来，识别已经开始')}</text>
      {#each draftText as text, i}
        {@const x = phone ? 35 : 30 + i * 230}
        {@const y = phone ? 75 + i * 95 : 80}
        {@const struck = phase >= i + 1}
        {#if phase >= i}
        <g in:fade={{ duration: 250 }}>
        <rect x={x} y={y} width={phone ? 230 : 200} height="78" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={x + (phone ? 115 : 100)} y={y + 21} text-anchor="middle" class="detail">SEND {i + 1} → {t('DRAFT', '草稿')} {i + 1}</text>
        <text x={x + (phone ? 115 : 100)} y={y + 50} text-anchor="middle" class="result" class:struck={struck}>“{text}”</text>
        {#if struck}<line x1={x + (phone ? 115 : 100) - 52} y1={y + 46} x2={x + (phone ? 115 : 100) + 52} y2={y + 46} stroke="var(--muted)" stroke-width="2" />{/if}
        <text x={x + (phone ? 115 : 100)} y={y + 69} text-anchor="middle" class="detail">{t('the whole current draft', '当前整份草稿')}</text>
        </g>
        {/if}
        {#if i < 2 && phase >= i + 1}
          <line in:fade={{ duration: 250 }} x1={phone ? 150 : x + 200} y1={phone ? y + 78 : 119} x2={phone ? 150 : x + 225} y2={phone ? y + 91 : 119} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
        {/if}
      {/each}
      {#if phase >= 3}
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 373 : 190} text-anchor="middle" class="cut">{t('NEW DRAFT REPLACES OLD', '每份新草稿替换上一份 · 不是多加一句话')}</text>
      {/if}
      {#if phase >= 4}
      <line in:fade={{ duration: 250 }} x1={W / 2} y1={phone ? 385 : 205} x2={W / 2} y2={phone ? 414 : 240} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 180} y={phone ? 420 : 250} width={phone ? 230 : 360} height="82" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={W / 2} y={phone ? 444 : 276} text-anchor="middle" class="label amber">FINISH → {t('FINAL TEXT', '最终文字')}</text>
      <text x={W / 2} y={phone ? 477 : 309} text-anchor="middle" class="result">“Good morning.”</text>
      </g>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t(`${VOXT_ASR_STREAM_SENDS} Send calls + 1 Finish = ${VOXT_ASR_STREAM_CALLS} calls in this example.`, `本例 ${VOXT_ASR_STREAM_SENDS} 次 Send + 1 次 Finish = ${VOXT_ASR_STREAM_CALLS} 次调用。`)}</text>
      {:else if step === 3}
      {@const left = phone ? 20 : 40}
      {@const track = phone ? 260 : 640}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('SPLIT OVERSIZED AUDIO AT A QUIET PLACE', '超长上传 · 在安静处切开')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('last quarter = the final 1/4 of the 9-second budget', '最后四分之一 = 9 秒上限的最后 1/4')}</text>
      <text x={W / 2} y="74" text-anchor="middle" class="label">{VOXT_ASR_SPLIT_SECONDS} s {t('RECORDING', '录音')} · {t('LIMIT', '上限')} {VOXT_ASR_SPLIT_MAX_SECONDS} s</text>
      <line x1={left} y1="133" x2={left + track} y2="133" stroke="var(--line)" />
      {#each Array.from({ length: 81 }, (_, i) => i) as i}
        {@const seconds = i / 80 * VOXT_ASR_SPLIT_SECONDS}
        {@const quiet = seconds >= 8.5 && seconds <= 8.8}
        {@const height = quiet ? 2 : 12 + (i * 11 % 34)}
        <line x1={left + track * i / 80} y1={133 - height / 2} x2={left + track * i / 80} y2={133 + height / 2} stroke={quiet ? 'var(--muted)' : 'var(--accent)'} stroke-width={phone ? 2 : 4} stroke-linecap="round" />
      {/each}
      <text x={left} y="194" class="detail">0 s</text>
      <text x={left + track} y="194" text-anchor="end" class="detail">10 s</text>
      {#if phase >= 1}
      <line in:fade={{ duration: 250 }} x1={left + track * 0.9} y1="96" x2={left + track * 0.9} y2="166" stroke="var(--muted)" stroke-dasharray="3 3" />
      <text in:fade={{ duration: 250 }} x={left + track * 0.9} y={phone ? 229 : 194} text-anchor="middle" class="detail">9 s · {t('LIMIT', '上限')}</text>
      {/if}
      {#if phase >= 2}
      <rect in:fade={{ duration: 250 }} x={left + track * 0.675} y="91" width={track * 0.225} height="82" fill="var(--accent-soft)" />
      <text in:fade={{ duration: 250 }} x={left + track * 0.7875} y="87" text-anchor="middle" class="detail">{t('SEARCH HERE', '在这里找安静处')}</text>
      <text in:fade={{ duration: 250 }} x={left + track * 0.675} y="194" text-anchor="middle" class="detail">{VOXT_ASR_SPLIT_SEARCH_SECONDS} s</text>
      {/if}
      {#if phase >= 3}
      <rect in:fade={{ duration: 250 }} x={left + track * 0.85} y="105" width={track * 0.03} height="56" fill="none" stroke="var(--gen)" stroke-width="2" />
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 255 : 218} text-anchor="middle" class="detail amber">{t(`CUT INSIDE ${VOXT_ASR_SPLIT_PAUSE_MS} ms PAUSE · 8.5–8.8 s`, `在 ${VOXT_ASR_SPLIT_PAUSE_MS} ms 停顿里切开 · 8.5–8.8 秒`)}</text>
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 275 : 238} text-anchor="middle" class="detail">{t(`find the quietest ${VOXT_ASR_SPLIT_QUIET_MS} ms`, `寻找最安静的 ${VOXT_ASR_SPLIT_QUIET_MS} ms`)}</text>
      {/if}
      {#if phase >= 4}
      <line in:fade={{ duration: 250 }} x1={left + track * 0.865} y1="98" x2={left + track * 0.865} y2="169" stroke="var(--gen)" stroke-width="2" stroke-dasharray="4 3" />
      <line in:fade={{ duration: 250 }} x1={W / 2} y1={phone ? 285 : 248} x2={W / 2} y2={phone ? 302 : 263} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      {/if}
      {#if phase >= 5}
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 65} y={phone ? 310 : 280} width={phone ? 230 : 270} height="92" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 200} y={phone ? 338 : 310} text-anchor="middle" class="label">{t('PIECE 1', '第 1 块')}</text>
      <text x={phone ? 150 : 200} y={phone ? 369 : 347} text-anchor="middle" class="result">0 s → {t('pause', '停顿')}</text>
      </g>
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 385} y={phone ? 420 : 280} width={phone ? 230 : 270} height="92" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 520} y={phone ? 448 : 310} text-anchor="middle" class="label">{t('PIECE 2', '第 2 块')}</text>
      <text x={phone ? 150 : 520} y={phone ? 479 : 347} text-anchor="middle" class="result">{t('pause', '停顿')} → 10 s</text>
      </g>
      {/if}
      {#if phase >= 6}
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 550 : 410} text-anchor="middle" class="cut">{VOXT_ASR_SPLIT_PIECE_COUNT} {t('PIECES · EACH FITS THE 9-SECOND LIMIT', '块 · 每块都不超过 9 秒上限')}</text>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Public test fixture · cut depends on sound energy.', '公开测试例；实际切点由声音能量决定。')}</text>
      {:else if step === 4}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('RECOGNISE IN ORDER · JOIN IN ORDER', '按顺序识别 · 按顺序接回文字')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('join = put the text back in recording order', '合并 = 按录音顺序把文字接回来')}</text>
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 55} y="80" width={phone ? 230 : 250} height="95" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 180} y="107" text-anchor="middle" class="label">{t('1 · RECOGNISE FIRST', '1 · 先识别第 1 块')}</text>
      <text x={phone ? 150 : 180} y="148" text-anchor="middle" class="result">“Good”</text>
      </g>
      {#if phase >= 1}
      <line in:fade={{ duration: 250 }} x1={phone ? 150 : 310} y1={phone ? 180 : 127} x2={phone ? 150 : 345} y2={phone ? 200 : 127} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 415} y={phone ? 210 : 80} width={phone ? 230 : 250} height="95" rx="9" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 540} y={phone ? 237 : 107} text-anchor="middle" class="label">{t('2 · RECOGNISE NEXT', '2 · 再识别第 2 块')}</text>
      <text x={phone ? 150 : 540} y={phone ? 278 : 148} text-anchor="middle" class="result">“morning.”</text>
      </g>
      {/if}
      {#if phase >= 2}
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 337 : 211} text-anchor="middle" class="cut">{t('KEEP THIS ORDER · ADD ONE ENGLISH SPACE', '保持这个顺序 · 英文之间补一个空格')}</text>
      {/if}
      {#if phase >= 3}
      <line in:fade={{ duration: 250 }} x1={W / 2} y1={phone ? 348 : 224} x2={W / 2} y2={phone ? 365 : 241} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 160} y={phone ? 372 : 250} width={phone ? 230 : 400} height="76" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={W / 2} y={phone ? 397 : 274} text-anchor="middle" class="label amber">{t('JOINED FINAL TEXT', '合并后的文字')}</text>
      <text x={W / 2} y={phone ? 430 : 307} text-anchor="middle" class="result">“Good morning.”</text>
      </g>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{VOXT_ASR_JOIN_PIECE_COUNT} {t('pieces', '块')} · {VOXT_ASR_JOIN_INSERTED_SPACES} {t('inserted space', '个补充空格')}</text>
      {:else if step === 5}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('LOCAL OMNI · PREVIEW, THEN FINAL', '本机 Omni · 先预览，再最终识别')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('default Qwen3-ASR route · LiveResult off', '默认 Qwen3-ASR 路线 · LiveResult 关闭')}</text>
      <rect x={phone ? 35 : 180} y="72" width={phone ? 230 : 360} height="58" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={W / 2} y="96" text-anchor="middle" class="label">{t('AUDIBLE SOUND STARTS · 3-SECOND EXAMPLE', '可闻声音开始 · 本例录 3 秒')}</text>
      <text x={W / 2} y="118" text-anchor="middle" class="detail">{t(`first decode after about ${VOXT_OMNI_FIRST_DECODE_MS} ms`, `约 ${VOXT_OMNI_FIRST_DECODE_MS} ms 后开始第一次解码`)}</text>
      {#each draftText as text, i}
        {@const x = phone ? 35 : 30 + i * 230}
        {@const y = phone ? 150 + i * 80 : 160}
        {#if phase >= i + 1}
        <g in:fade={{ duration: 250 }}>
        <rect x={x} y={y} width={phone ? 230 : 200} height="65" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={x + (phone ? 115 : 100)} y={y + 22} text-anchor="middle" class="detail">+{VOXT_OMNI_PREVIEW_TIMES_MS[i] / 1000} s · {t('DRAFT', '草稿')} {i + 1}</text>
        <text x={x + (phone ? 115 : 100)} y={y + 49} text-anchor="middle" class="result">“{text}”</text>
        </g>
        {/if}
      {/each}
      {#if phase >= 4}
      <text in:fade={{ duration: 250 }} x={W / 2} y={phone ? 399 : 278} text-anchor="middle" class="cut">{t('ABOUT EVERY 1 SECOND · THE DRAFT CAN CHANGE', '约每 1 秒更新 · 草稿可以变化')}</text>
      {/if}
      {#if phase >= 5}
      <line in:fade={{ duration: 250 }} x1={W / 2} y1={phone ? 405 : 288} x2={W / 2} y2={phone ? 420 : 305} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 150} y={phone ? 427 : 315} width={phone ? 230 : 420} height="90" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={W / 2} y={phone ? 450 : 340} text-anchor="middle" class="label amber">STOP · 3 s → FINAL</text>
      <text x={W / 2} y={phone ? 480 : 370} text-anchor="middle" class="result">“Good morning.”</text>
      <text x={W / 2} y={phone ? 501 : 393} text-anchor="middle" class="detail">{t('recognise the whole recording again', '重新识别完整录音')}</text>
      </g>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Decode schedule, not a measured-latency promise.', '这是解码节拍，不是实测延迟承诺。')}</text>
      {:else if step === 6}
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('THE ASR ROUTE HANDS OVER RAW TEXT', '识别路线交出原话')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('raw text = recognised words before cleanup', '原话 = 识别出来、尚未由语言模型整理的文字')}</text>
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 55} y="90" width={phone ? 230 : 260} height="130" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 150 : 185} y="120" text-anchor="middle" class="label amber">{t('ONE RECOGNITION RESULT', '一份识别结果')}</text>
      <text x={phone ? 150 : 185} y="158" text-anchor="middle" class="result">“Good morning.”</text>
      <text x={phone ? 150 : 185} y="190" text-anchor="middle" class="detail">{t('raw text · not polished here', '原话 · 本章尚未润色')}</text>
      </g>
      {#if phase >= 1}
      <line in:fade={{ duration: 250 }} x1={phone ? 150 : 320} y1={phone ? 225 : 155} x2={phone ? 150 : 385} y2={phone ? 260 : 155} stroke="var(--muted)" stroke-width="2" marker-end="url(#asr-route-arrow)" />
      <g in:fade={{ duration: 250 }}>
      <rect x={phone ? 35 : 395} y={phone ? 270 : 90} width={phone ? 230 : 270} height={phone ? 145 : 180} rx="11" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="5 4" />
      <text x={phone ? 150 : 530} y={phone ? 299 : 120} text-anchor="middle" class="label">{t('NEXT CHAPTER · LANGUAGE MODEL', '下一章 · 语言模型')}</text>
      <text x={phone ? 150 : 530} y={phone ? 327 : 151} text-anchor="middle" class="detail">{t('a model that organises the wording', '负责整理文字的模型')}</text>
      {#if phase >= 2}
      <text in:fade={{ duration: 250 }} x={phone ? 150 : 530} y={phone ? 361 : 190} text-anchor="middle" class="cut">{t('WHAT ELSE DOES IT RECEIVE?', '它还收到什么？')}</text>
      <text in:fade={{ duration: 250 }} x={phone ? 150 : 530} y={phone ? 392 : 225} text-anchor="middle" class="cut">{t('WHERE DOES ITS API KEY LIVE?', '它的 API key 放在哪里？')}</text>
      {#if !phone}<text in:fade={{ duration: 250 }} x="530" y="250" text-anchor="middle" class="detail">endpoint · model · key</text>{/if}
      {/if}
      </g>
      {/if}
      {#if phase >= 3}
      <text in:fade={{ duration: 250 }} x={W / 2} y={H - 32} text-anchor="middle" class="cut">{VOXT_ASR_RAW_RESULT_COUNT} {t('RAW TEXT RESULT · RECOGNITION IS DONE', '份原话 · 识别阶段到此完成')}</text>
      {/if}
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Cleanup and delivery are later chapters.', '文字整理和交付留到后面章节。')}</text>
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
  .struck { fill: var(--muted); }
  .amber { fill: var(--gen); }
  .picked { fill: var(--accent); font-weight: 650; }
  .muted { fill: var(--muted); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
  }
</style>
