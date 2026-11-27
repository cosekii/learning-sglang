<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    DELIVERY_AUDIO_SAMPLE_RATE,
    DELIVERY_AUDIO_BYTES_PER_SAMPLE,
    DELIVERY_AUDIO_BYTES_PER_SECOND,
    DELIVERY_GENERATED_SECONDS,
    DELIVERY_READ_SECONDS,
    DELIVERY_QUEUED_SECONDS,
    DELIVERY_QUEUED_BYTES,
    DELIVERY_DEFAULT_CAP_BYTES,
    DELIVERY_DEFAULT_CAP_HOURS,
    DELIVERY_PAYLOAD_AUDIO_BYTES,
    DELIVERY_PAYLOAD_TEXT_CHARS,
    DELIVERY_OTHER_AUDIO_BYTES,
    DELIVERY_TEST_CAP_BYTES,
    DELIVERY_IDLE_CASE_STREAMS,
    DELIVERY_IDLE_TRIGGER_BYTES,
    DELIVERY_IDLE_BEFORE_BYTES,
    DELIVERY_IDLE_OVER_BYTES,
    DELIVERY_IDLE_AFTER_BYTES,
    DELIVERY_REPEAT_CASE_STREAMS,
    DELIVERY_REPEAT_TRIGGER_BYTES,
    DELIVERY_REPEAT_OVER_BYTES,
    DELIVERY_REPEAT_AFTER_FIRST_BYTES,
    DELIVERY_REPEAT_AFTER_SECOND_BYTES,
    DELIVERY_REPEAT_FAILED_COUNT,
    DELIVERY_CLOSE_CASE_BYTES,
    DELIVERY_FAILURE_CAP_BYTES,
    DELIVERY_CLOCK_BEFORE_BYTES,
    DELIVERY_CLOCK_CHUNK_BYTES,
    DELIVERY_CLOCK_AFTER_READ_BYTES,
    DELIVERY_CLOCK_AFTER_PRODUCE_BYTES,
    DELIVERY_CLOCK_LAST_READ_SECONDS,
    DELIVERY_CLOCK_NOW_SECONDS,
    DELIVERY_CLOCK_IDLE_SECONDS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Playback-speed reads can lag faster generation. Six unread seconds leave 576,000 bytes waiting in the API process.',
    captionZh: '读者按播放速度取声音，生成可以更快。6 秒未读声音仍有 576,000 字节，留在 API 进程里。',
  }, {
    caption: 'One API process shares one byte cap across its streams. It counts binary data directly inside each message, not text characters.',
    captionZh: '一个 API 进程里的多路流共用一个字节上限。只数消息里直接放置的二进制数据，不数字符。',
  }, {
    caption: 'A queue read resets the idle clock. A new generated chunk does not.',
    captionZh: '读者取走一条消息，空闲钟就归零。新生成的 chunk 不会归零。',
  }, {
    caption: 'The longest-idle stream fails first, even when another stream holds more bytes.',
    captionZh: '最久没读取的流先失败，哪怕另一流积压更多。',
  }, {
    caption: 'The coordinator fails another longest-idle stream until the total fits. This example fails two.',
    captionZh: 'coordinator 继续让最久没读的流失败，直到总量合格。这里失败两路。',
  }, {
    caption: 'A cap failure ends the whole stream. It aborts generation only if generation is still running.',
    captionZh: '超过上限会结束整条流。只有还在生成时，才中止生成。',
  }, {
    caption: 'Before first audio, HTTP SSE and raw audio return JSON 503. After SSE starts, an error event reports failure; raw response streams only end early.',
    captionZh: '首个声音前，HTTP SSE 和 raw audio 返回 JSON 503。SSE 开始后改发 error 事件，raw 响应流只能提前结束。',
  }, {
    caption: 'Closing releases the queue and backlog but may keep the stream ID. Two API processes share one URL: which takes the next request?',
    captionZh: '关闭会释放队列和积压，但不保证释放流 ID。两个 API 进程共用网址，谁接收下个请求？',
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
  const H = $derived(phone ? [760, 900, 760, 850, 900, 800, 850, 900][step] : [560, 680, 620, 660, 680, 610, 640, 650][step]);
  const bytes = (n: number) => n.toLocaleString('en-US');
  const desktopSmall: (number | null)[] = [12, 14, 13, 13.5, 14, null, null, null];
  const desktopFont = (base: number) => `${desktopSmall[step] ?? base}px`;

  // Each step plays its mechanism in held phases, then rests on the finished scene before looping.
  const PHASE_COUNTS = [4, 4, 4, 4, 4, 5, 4, 5];
  const PHASE_MS = 1100, REST_MS = 2500;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase = count - 1; return; }
    const ms = count * PHASE_MS + REST_MS;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || now - t0 >= ms) { t0 = now; nextLap(ms); }
      phase = Math.min(count - 1, Math.floor((now - t0) / PHASE_MS));
      raf = requestAnimationFrame(tick);
    };
    phase = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption} style:--reader-tag={desktopFont(10)} style:--reader-rowlabel={desktopFont(11)} style:--reader-footnote={desktopFont(10.5)}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('GENERATION FINISHED. DELIVERY DID NOT.', '生成结束了，交付还没结束。')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('delivery backlog = audio made, but not taken by the reader', '交付积压 = 已生成、读者还没取走的声音')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = waiting audio · grey = audio already read', '蓝 = 等待取走的声音 · 灰 = 已经读取的声音')}</text>
        {#if !phone}
          {#each [
            { x: 20, title: 'GENERATOR', lines: ['10 s made', 'generation finished'], linesZh: ['生成 10 秒', '生成已经结束'] },
            { x: 270, title: 'API PROCESS', lines: ['server process handing audio', phase >= 1 ? '6 s still queued' : '10 s still queued'], linesZh: ['服务器里交付声音的进程', phase >= 1 ? '还排着 6 秒' : '还排着 10 秒'] },
            { x: 520, title: 'READER', lines: ['client taking audio', phase >= 1 ? '4 s of audio taken' : '0 s of audio taken'], linesZh: ['取声音的客户端', phase >= 1 ? '取走 4 秒声音' : '还没取走声音'] },
          ] as box, i}
            <rect x={box.x} y="110" width="180" height="112" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x={box.x + 16} y="139" class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            {#each box.lines as line, j}
              <text x={box.x + 16} y={169 + j * 28} class="tag">{t(line, box.linesZh[j])}</text>
            {/each}
            {#if i < 2}<text x={box.x + 211} y="174" text-anchor="middle" class="result">→</text>{/if}
          {/each}
        {:else}
          {#each [
            { y: 104, title: 'GENERATOR', lines: ['10 s made · generation finished'], linesZh: ['生成 10 秒 · 已经结束'] },
            { y: 210, title: 'API PROCESS', lines: [phase >= 1 ? 'server hands audio · 6 s queued' : 'server hands audio · 10 s queued'], linesZh: [phase >= 1 ? '服务器交付声音 · 还排着 6 秒' : '服务器交付声音 · 还排着 10 秒'] },
            { y: 316, title: 'READER', lines: [phase >= 1 ? 'client taking audio · 4 s taken' : 'client taking audio · 0 s taken'], linesZh: [phase >= 1 ? '客户端取声音 · 取走 4 秒' : '客户端取声音 · 还没取走'] },
          ] as box, i}
            <rect x="15" y={box.y} width="270" height="82" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="30" y={box.y + 27} class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            <text x="30" y={box.y + 56} class="tag">{t(box.lines[0], box.linesZh[0])}</text>
            {#if i < 2}<text x="150" y={box.y + 99} text-anchor="middle" class="result">↓</text>{/if}
          {/each}
        {/if}
        {@const barY = phone ? 446 : 278}
        {@const barX = phone ? 15 : 120}
        {@const unitW = phone ? 24 : 48}
        {@const readW = phase >= 1 ? DELIVERY_READ_SECONDS * unitW : 0}
        {@const queueW = (DELIVERY_GENERATED_SECONDS - (phase >= 1 ? DELIVERY_READ_SECONDS : 0)) * unitW}
        <text x={barX} y={barY - 18} class="tag strong">{t('THE SAME 10 SECONDS OF AUDIO', '同一段 10 秒声音')}</text>
        <rect x={barX} y={barY} width={readW} height="58" rx="7" fill="var(--bg)" stroke="var(--faint)" style="transition: width 700ms" />
        <rect x={barX + readW} y={barY} width={queueW} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" style="transition: x 700ms, width 700ms" />
        <g style:opacity={phase >= 2 ? 1 : 0} style="transition: opacity 250ms">
          <text x={barX + DELIVERY_READ_SECONDS * unitW / 2} y={barY + 35} text-anchor="middle" class="tag">{DELIVERY_READ_SECONDS} s {t('read', '已读')}</text>
          <text x={barX + DELIVERY_READ_SECONDS * unitW + DELIVERY_QUEUED_SECONDS * unitW / 2} y={barY + 35} text-anchor="middle" class="tag strong">{DELIVERY_QUEUED_SECONDS} s {t('waiting', '等待')}</text>
        </g>
        <g style:opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">
          <text x={W / 2} y={barY + 100} text-anchor="middle" class="formula">{DELIVERY_GENERATED_SECONDS} − {DELIVERY_READ_SECONDS} = {DELIVERY_QUEUED_SECONDS} s {t('still queued', '仍在排队')}</text>
          {#if phone}
            <text x={W / 2} y={barY + 124} text-anchor="middle" class="tag">{t('coordinator queue: internal 24 kHz float32', 'coordinator 队列：internal 24 kHz float32')}</text>
            <text x={W / 2} y={barY + 148} text-anchor="middle" class="tag">{t('HTTP output: mono 16-bit', 'HTTP 输出：mono 16-bit')}</text>
            <text x={W / 2} y={barY + 172} text-anchor="middle" class="tag">{bytes(DELIVERY_AUDIO_SAMPLE_RATE)} samples/s × {DELIVERY_AUDIO_BYTES_PER_SAMPLE} B/sample</text>
            <text x={W / 2} y={barY + 196} text-anchor="middle" class="formula">× {DELIVERY_QUEUED_SECONDS} s = {bytes(DELIVERY_QUEUED_BYTES)} B</text>
          {:else}
            <text x={W / 2} y={barY + 124} text-anchor="middle" class="tag">{t('coordinator queue: internal 24 kHz float32 · HTTP output: mono 16-bit', 'coordinator 队列：internal 24 kHz float32 · HTTP 输出：mono 16-bit')}</text>
            <text x={W / 2} y={barY + 153} text-anchor="middle" class="formula">{bytes(DELIVERY_AUDIO_SAMPLE_RATE)} samples/s × {DELIVERY_AUDIO_BYTES_PER_SAMPLE} B/sample × {DELIVERY_QUEUED_SECONDS} s = {bytes(DELIVERY_QUEUED_BYTES)} B</text>
          {/if}
        </g>
        <text x={W / 2} y={barY + (phone ? 230 : 214)} text-anchor="middle" class="rowlabel">{t(phone ? 'Socket full → queue grows. What stops it?' : 'Socket full → this queue grows. What stops it?', 'socket 填满后，积压继续增长。怎样阻止它？')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'Socket buffer = bytes given to OS / HTTP runtime, excluded.' : 'Socket buffer = bytes already given to the OS or HTTP runtime, outside this ledger.', 'socket 缓冲是交给操作系统或 HTTP runtime 的字节，不计入。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed example · playback timing: Ch. 8 Step 3.', '构造算例 · 播放时间线见第 8 章第 3 步。')}</text>
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('ONE API PROCESS, ONE SHARED BYTE CAP', '一个 API 进程，一个共享字节上限')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{phone ? t('cap = total queued message-byte limit', '上限 = 所有流的消息字节总量限制') : t('cap = the most binary data queued by all streams', '上限 = 所有流合计最多能保留的二进制数据')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = counted binary data · grey = not counted', '蓝 = 计入的二进制数据 · 灰 = 不计入')}</text>
        <rect x={phone ? 15 : 70} y="102" width={phone ? 270 : 580} height="132" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="132" text-anchor="middle" class="mono">stream_delivery.max_total_backlog_bytes</text>
        <text x={W / 2} y="164" text-anchor="middle" class="result">1 GiB = {bytes(DELIVERY_DEFAULT_CAP_BYTES)} B</text>
        <text x={W / 2} y="194" text-anchor="middle" class="tag">{t('per API process', '每个 API 进程')} · none = {t('cap off', '关闭上限')}</text>
        <text x={W / 2} y="219" text-anchor="middle" class="tag">{phone ? `1 GiB ÷ ${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} B/s ÷ 3,600 s/h ≈ ${DELIVERY_DEFAULT_CAP_HOURS.toFixed(1)} h` : `${bytes(DELIVERY_DEFAULT_CAP_BYTES)} B ÷ ${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} B/s ÷ 3,600 s/h ≈ ${DELIVERY_DEFAULT_CAP_HOURS.toFixed(1)} h`}</text>
        <text x={W / 2} y="246" text-anchor="middle" class="tag">{t('internal 24 kHz float32 · HTTP output: mono 16-bit', 'internal 24 kHz float32 · HTTP 输出：mono 16-bit')}</text>
        {#each phone ? [
          { x: 15, y: 266, w: 270, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 15, y: 472, w: 270, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] : [
          { x: 40, y: 266, w: 300, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 380, y: 266, w: 300, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] as card, cardIndex}
          <rect x={card.x} y={card.y} width={card.w} height="174" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={card.x + 16} y={card.y + 28} class="tag strong">{card.name}</text>
          <rect x={card.x + 16} y={card.y + 45} width={card.w - 32} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" opacity={phase > cardIndex ? 1 : 0.2} style="transition: opacity 400ms" />
          <text x={card.x + 28} y={card.y + 72} class="mono" opacity={phase > cardIndex ? 1 : 0.35} style="transition: opacity 400ms">audio_waveform: {card.audio} B</text>
          {#if card.text}
            <text x={card.x + 20} y={card.y + 115} class="tag" fill="var(--muted)">text: {DELIVERY_PAYLOAD_TEXT_CHARS} {t('characters', '个字符')}</text>
          {/if}
          <text x={card.x + 20} y={card.y + 151} class="result" opacity={phase > cardIndex ? 1 : 0} style="transition: opacity 300ms">{t('COUNT', '计入')} = {card.audio} B</text>
        {/each}
        {@const totalY = phone ? 686 : 474}
        {@const countedA = phase >= 1 ? DELIVERY_PAYLOAD_AUDIO_BYTES : 0}
        {@const countedB = phase >= 2 ? DELIVERY_OTHER_AUDIO_BYTES : 0}
        <rect x={phone ? 15 : 170} y={totalY} width={phone ? 270 : 380} height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase >= 3 ? 3 : 1} opacity={phase >= 1 ? 1 : 0.25} style="transition: opacity 300ms, stroke-width 300ms" />
        <text x={W / 2} y={totalY + 29} text-anchor="middle" class="tag strong" opacity={phase >= 1 ? 1 : 0.25}>{t('SHARED MESSAGE-BYTE TOTAL', '共享消息字节总量')}</text>
        <text x={W / 2} y={totalY + 56} text-anchor="middle" class="result" opacity={phase >= 1 ? 1 : 0}>{countedA} + {countedB} = {countedA + countedB} B</text>
        <text x={W / 2} y={totalY + 96} text-anchor="middle" class="tag">{t('Text is not counted.', '文字不计入。')}</text>
        <text x={W / 2} y={totalY + 120} text-anchor="middle" class="tag">{t(phone ? 'Socket buffer = bytes given to OS / HTTP runtime, excluded.' : 'Socket buffer = bytes already given to the OS or HTTP runtime, outside this ledger.', 'socket 缓冲是交给操作系统或 HTTP runtime 的字节，不计入。')}</text>
        <text x={W / 2} y={totalY + (phone ? 160 : 151)} text-anchor="middle" class="rowlabel">{t('Over the cap, which stream fails?', '超过上限后，哪一路流失败？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed payloads. Another API process has its own cap.', '构造的消息内容。另一个 API 进程有自己的上限。')}</text>
      {:else if step === 2}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('READING RESETS THE IDLE CLOCK', '读取会把空闲钟归零')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('reader idle time = now − the last queue read', '读取空闲时间 = 现在 − 上次从队列读取的时刻')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = queued audio · both panels start with 8 B', '蓝 = 排队声音 · 两图都从 8 B 开始')}</text>
        <rect x={phone ? 15 : 170} y="100" width={phone ? 270 : 380} height="54" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="134" text-anchor="middle" class="formula">idle = now − last read = {DELIVERY_CLOCK_NOW_SECONDS} − {DELIVERY_CLOCK_LAST_READ_SECONDS} = {DELIVERY_CLOCK_IDLE_SECONDS} s</text>
        {#each phone ? [
          { x: 15, y: 190, h: 220, title: `READER TAKES ${DELIVERY_CLOCK_CHUNK_BYTES} B`, titleZh: '读者取走 4 B', queue: DELIVERY_CLOCK_AFTER_READ_BYTES, last: DELIVERY_CLOCK_NOW_SECONDS, idle: 0, read: true },
          { x: 15, y: 446, h: 220, title: `GENERATOR ADDS ${DELIVERY_CLOCK_CHUNK_BYTES} B`, titleZh: '生成器新增 4 B', queue: DELIVERY_CLOCK_AFTER_PRODUCE_BYTES, last: DELIVERY_CLOCK_LAST_READ_SECONDS, idle: DELIVERY_CLOCK_IDLE_SECONDS, read: false },
        ] : [
          { x: 40, y: 190, h: 300, title: `READER TAKES ${DELIVERY_CLOCK_CHUNK_BYTES} B`, titleZh: '读者取走 4 B', queue: DELIVERY_CLOCK_AFTER_READ_BYTES, last: DELIVERY_CLOCK_NOW_SECONDS, idle: 0, read: true },
          { x: 380, y: 190, h: 300, title: `GENERATOR ADDS ${DELIVERY_CLOCK_CHUNK_BYTES} B`, titleZh: '生成器新增 4 B', queue: DELIVERY_CLOCK_AFTER_PRODUCE_BYTES, last: DELIVERY_CLOCK_LAST_READ_SECONDS, idle: DELIVERY_CLOCK_IDLE_SECONDS, read: false },
        ] as panel}
          {@const changed = panel.read ? phase >= 1 : phase >= 3}
          {@const current = (panel.read && phase === 1) || (!panel.read && phase === 3)}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke={current ? 'var(--fg)' : 'var(--line)'} stroke-width={current ? 2 : 1} style="transition: stroke-width 250ms" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          <rect x={panel.x + 16} y={panel.y + 52} width={phone ? 238 : 268} height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" opacity={changed ? 1 : 0.45} style="transition: opacity 400ms" />
          <text x={panel.x + 30} y={panel.y + 88} class="result">{DELIVERY_CLOCK_BEFORE_BYTES} B → {changed ? panel.queue : DELIVERY_CLOCK_BEFORE_BYTES} B</text>
          <text x={panel.x + 20} y={panel.y + 145} class="tag">now = {DELIVERY_CLOCK_NOW_SECONDS} s</text>
          <text x={panel.x + 20} y={panel.y + 174} class="tag">last read = {changed ? panel.last : DELIVERY_CLOCK_LAST_READ_SECONDS} s</text>
          <text x={panel.x + 20} y={panel.y + 212} class="result">idle = {changed ? panel.idle : DELIVERY_CLOCK_IDLE_SECONDS} s</text>
          {#if !phone}
            <text x={panel.x + 20} y={panel.y + 254} class="tag strong" opacity={changed ? 1 : 0.2} style="transition: opacity 300ms">{panel.read ? t('READ resets the clock', '读取让时钟归零') : t('PRODUCING does not reset it', '生成新消息不让时钟归零')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 716 : 550} text-anchor="middle" class="rowlabel">{t('Which stream has the longest idle time?', '哪一路流最久没读取？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed times. This clock does not observe playback.', '构造时刻。这个时钟不观察播放位置。')}</text>
      {:else if step === 3}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('THE LONGEST-IDLE STREAM FAILS FIRST', '最久没读取的流先失败')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('fail = end the stream with an error · cap = 12 B', '失败 = 用错误结束这一路流 · 上限 = 12 B')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{phone ? t('blue = kept · orange = failed stream', '蓝 = 保留 · 橙 = 失败流') : t('blue = queued and kept · orange = failed stream; its bytes leave the total', '蓝 = 保留的积压 · 橙 = 失败流；它的字节从总量减去')}</text>
        <rect x={phone ? 15 : 20} y="104" width={phone ? 270 : 680} height="190" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="133" text-anchor="middle" class="tag strong">{t('BEFORE · total fits', '之前 · 总量不超上限')}</text>
        <text x={W / 2} y="158" text-anchor="middle" class="formula">{DELIVERY_IDLE_CASE_STREAMS[0].bytes} + {DELIVERY_IDLE_CASE_STREAMS[1].bytes} = {DELIVERY_IDLE_BEFORE_BYTES} B ≤ {DELIVERY_TEST_CAP_BYTES} B</text>
        {#each DELIVERY_IDLE_CASE_STREAMS as stream, i}
          {@const x = phone ? 27 + i * 132 : 40 + i * 340}
          <rect {x} y="180" width={phone ? 120 : 300} height="88" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 12} y="205" class="mono">{stream.id}</text>
          <text x={x + 12} y="232" class="tag strong">{stream.bytes} B · idle {stream.idleSeconds} s</text>
          <text x={x + 12} y="255" class="tag">{i === 0 ? t('longest idle time', '最久没读取') : t('larger backlog', '积压更大')}</text>
        {/each}
        <g opacity={phase >= 1 ? 1 : 0.18} style="transition: opacity 400ms">
          <rect x={phone ? 15 : 170} y="320" width={phone ? 270 : 380} height="66" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={W / 2} y="347" text-anchor="middle" class="tag strong">req-behind + {DELIVERY_IDLE_TRIGGER_BYTES} B</text>
          <text x={W / 2} y="373" text-anchor="middle" class="result">{DELIVERY_IDLE_BEFORE_BYTES} + {DELIVERY_IDLE_TRIGGER_BYTES} = {DELIVERY_IDLE_OVER_BYTES} B &gt; {DELIVERY_TEST_CAP_BYTES} B</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 500ms">
          <rect x={phone ? 15 : 20} y="412" width={phone ? 270 : 680} height="150" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="441" text-anchor="middle" class="tag strong">{t('AFTER · fail req-idle, keep req-behind', '之后 · req-idle 失败，req-behind 保留')}</text>
          <rect x={phone ? 27 : 40} y="463" width={phone ? 120 : 300} height="72" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={phone ? 39 : 52} y="491" class="mono">req-idle</text>
          <text x={phone ? 39 : 52} y="518" class="tag strong">FAIL · −{DELIVERY_IDLE_CASE_STREAMS[0].bytes} B</text>
          <rect x={phone ? 159 : 380} y="463" width={phone ? 120 : 300} height="72" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={phone ? 171 : 392} y="491" class="mono">req-behind</text>
          <text x={phone ? 171 : 392} y="518" class="tag strong">{DELIVERY_IDLE_AFTER_BYTES} B · {t('KEPT', '保留')}</text>
          <text x={W / 2} y="596" text-anchor="middle" class="formula">{DELIVERY_IDLE_OVER_BYTES} − {DELIVERY_IDLE_CASE_STREAMS[0].bytes} = {DELIVERY_IDLE_AFTER_BYTES} B ≤ {DELIVERY_TEST_CAP_BYTES} B</text>
        </g>
        <text x={W / 2} y={phone ? 770 : 626} text-anchor="middle" class="rowlabel">{t('What if one failure is not enough?', '如果失败一路还不够呢？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Unit-test values; idle timestamps were adjusted.', '单元测试算例；空闲时间戳经过调整。')}</text>
      {:else if step === 4}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('REPEAT UNTIL THE TOTAL FITS', '重复失败，直到总量合格')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{phone ? t('longest idle time · at least 1 B waiting', '最久没读 · 至少 1 B 等待') : t('same rule: longest idle time among streams with at least 1 B waiting', '每次规则相同：从至少 1 B 等待的流里选最久没读的')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = kept · orange = failed stream bytes · cap = 12 B', '蓝 = 保留 · 橙 = 失败流的字节 · 上限 = 12 B')}</text>
        {#each phone ? [
          { x: 15, y: 112, h: 190, title: 'START · fresh adds 6 B', titleZh: '开始 · fresh 新增 6 B', total: DELIVERY_REPEAT_OVER_BYTES, failed: -1 },
          { x: 15, y: 342, h: 190, title: '1 · fail req-oldest', titleZh: '第 1 次 · req-oldest 失败', total: DELIVERY_REPEAT_AFTER_FIRST_BYTES, failed: 0 },
          { x: 15, y: 572, h: 190, title: '2 · fail req-older', titleZh: '第 2 次 · req-older 失败', total: DELIVERY_REPEAT_AFTER_SECOND_BYTES, failed: 1 },
        ] : [
          { x: 20, y: 122, h: 360, title: 'START · fresh adds 6 B', titleZh: '开始 · fresh 新增 6 B', total: DELIVERY_REPEAT_OVER_BYTES, failed: -1 },
          { x: 255, y: 122, h: 360, title: '1 · fail req-oldest', titleZh: '第 1 次 · req-oldest 失败', total: DELIVERY_REPEAT_AFTER_FIRST_BYTES, failed: 0 },
          { x: 490, y: 122, h: 360, title: '2 · fail req-older', titleZh: '第 2 次 · req-older 失败', total: DELIVERY_REPEAT_AFTER_SECOND_BYTES, failed: 1 },
        ] as panel, panelIndex}
          <g opacity={panelIndex === 0 || phase >= panelIndex ? 1 : 0.1} style="transition: opacity 500ms">
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 210} height={panel.h} rx="11" fill="var(--bg)" stroke={phase === panelIndex ? 'var(--fg)' : 'var(--line)'} stroke-width={phase === panelIndex ? 2 : 1} />
          <text x={panel.x + 14} y={panel.y + 29} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#each DELIVERY_REPEAT_CASE_STREAMS as stream, i}
            {@const failed = panel.failed === i}
            {@const removed = panel.failed > i}
            {@const y = panel.y + 52 + i * (phone ? 31 : 62)}
            <rect x={panel.x + 12} {y} width={phone ? 246 : 186} height={phone ? 26 : 50} rx="6" fill={failed || removed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={failed || removed ? 'var(--gen)' : 'var(--accent)'} />
            <text x={panel.x + 21} y={y + (phone ? 18 : 22)} class="mono">{stream.id}</text>
            <text x={panel.x + (phone ? 238 : 174)} y={y + (phone ? 18 : 22)} text-anchor="end" class="tag strong">{failed || removed ? 0 : i === 2 ? stream.bytes + DELIVERY_REPEAT_TRIGGER_BYTES : stream.bytes} B</text>
            {#if !phone}
              <text x={panel.x + 21} y={y + 42} class="tag">{failed ? 'FAIL NOW' : removed ? 'FAILED' : `idle ${stream.idleSeconds} s`}</text>
            {/if}
          {/each}
          <text x={panel.x + 14} y={panel.y + (phone ? 166 : 264)} class="result">total = {panel.total} B {panel.total > DELIVERY_TEST_CAP_BYTES ? '>' : '≤'} {DELIVERY_TEST_CAP_BYTES} B</text>
          {#if !phone}
            <text x={panel.x + 14} y={panel.y + 310} class="tag strong">{panel.failed === -1 ? t('over: choose longest-idle', '超了：选最久没读的') : panel.total > DELIVERY_TEST_CAP_BYTES ? t('still over: repeat', '还超：再选一次') : t('fits: stop', '合格：停止')}</text>
          {/if}
          </g>
        {/each}
        <text x={W / 2} y={phone ? 806 : 536} text-anchor="middle" class="result" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 300ms">{t('failed streams', '失败流')} = {DELIVERY_REPEAT_FAILED_COUNT}</text>
        <text x={W / 2} y={phone ? 850 : 584} text-anchor="middle" class="rowlabel">{t('What does a failed stream stop doing?', '失败的流会停止哪些工作？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Unit-test values. Fresh holds 4 + 6 = 10 B in every panel.', '单元测试算例。三幅图里 fresh 都是 4 + 6 = 10 B。')}</text>
      {:else if step === 5}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('FAIL THE WHOLE STREAM, NOT ONE CHUNK', '结束整条流，不只丢一个 chunk')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t(`abort = stop unfinished request work · cap = ${DELIVERY_FAILURE_CAP_BYTES} B`, `中止 = 停止未完成工作 · 上限 = ${DELIVERY_FAILURE_CAP_BYTES} B`)}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = queued audio · orange = stream failure', '蓝 = 排队声音 · 橙 = 整条流失败')}</text>
        <text x={phone ? 15 : 20} y="98" class="tag">{t('A missing middle piece breaks ordered sound.', '中间缺一段，完整声音就坏了。')}</text>
        {#each phone ? [
          { x: 15, y: 116, h: 272, title: 'GENERATION STILL RUNNING', titleZh: '生成仍在运行', running: true },
          { x: 15, y: 424, h: 272, title: 'GENERATION ALREADY FINISHED', titleZh: '生成已经结束', running: false },
        ] : [
          { x: 40, y: 116, h: 360, title: 'GENERATION STILL RUNNING', titleZh: '生成仍在运行', running: true },
          { x: 380, y: 116, h: 360, title: 'GENERATION ALREADY FINISHED', titleZh: '生成已经结束', running: false },
        ] as panel}
          {@const failed = panel.running ? phase >= 1 : phase >= 3}
          {@const reported = panel.running ? phase >= 2 : phase >= 4}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          <rect x={panel.x + 16} y={panel.y + 52} width={phone ? 238 : 268} height="54" rx="8" fill={failed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={failed ? 'var(--gen)' : 'var(--accent)'} style="transition: fill 400ms, stroke 400ms" />
          <text x={panel.x + 30} y={panel.y + 86} class="result">{failed ? `${DELIVERY_CLOSE_CASE_BYTES} B → 0 B` : `${DELIVERY_CLOSE_CASE_BYTES} B ${t('queued audio', '排队声音')}`}</text>
          <text x={panel.x + (phone ? 135 : 150)} y={panel.y + 132} text-anchor="middle" class="result">↓</text>
          <g opacity={failed ? 1 : 0.1} style="transition: opacity 400ms">
            <rect x={panel.x + 16} y={panel.y + 150} width={phone ? 238 : 268} height="50" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + 30} y={panel.y + 182} class="tag strong">{DELIVERY_CLOSE_CASE_BYTES} B &gt; {DELIVERY_FAILURE_CAP_BYTES} B · {t('CAP FAILURE', '上限失败')}</text>
          </g>
          <g opacity={reported ? 1 : 0.1} style="transition: opacity 400ms">
            <text x={panel.x + 20} y={panel.y + 234} class="tag strong">{panel.running ? t('ABORT the generator', '中止生成器') : t('No generator left to abort', '没有还在运行的生成器可中止')}</text>
            <text x={panel.x + 20} y={panel.y + (phone ? 258 : 270)} class="tag">{t('Send the stream failure to its reader.', '把这条流的失败通知读者。')}</text>
          </g>
        {/each}
        <text x={W / 2} y={phone ? 728 : 536} text-anchor="middle" class="rowlabel">{t('What error does the reader receive?', '读者会收到什么错误？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Same bytes · before or after generation ends', '同一份声音 · 生成前后都可能失败') : t('The same queued bytes can fail before or after generation ends.', '同一份排队声音可能在生成结束前或结束后失败。')}</text>
      {:else if step === 6}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('THE READER LEARNS THAT DELIVERY FAILED', '读者得知交付失败')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('event envelope = a named message wrapped around data', '事件外壳 = 包住数据、带有名字的消息')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{phone ? t('orange = failure output · same failure in both panels', '橙 = 失败输出 · 两图同一失败') : t('orange = failure output · both panels show the same cap failure', '橙 = 失败输出 · 两幅图都是同一个上限失败')}</text>
        <text x={W / 2} y={phone ? 102 : 104} text-anchor="middle" class="tag strong">{t('BEFORE FIRST AUDIO · HTTP SSE + RAW: JSON 503', '首个声音前 · HTTP SSE + raw：JSON 503')}</text>
        {#each phone ? [
          { x: 15, y: 116, h: 276, title: 'SSE + SPEECH WEBSOCKET', titleZh: 'SSE + 语音 WebSocket', raw: false },
          { x: 15, y: 428, h: 250, title: 'RAW AUDIO · RESPONSE STARTED', titleZh: 'raw 响应已开始', raw: true },
        ] : [
          { x: 40, y: 126, h: 350, title: 'SSE + SPEECH WEBSOCKET', titleZh: 'SSE + 语音 WebSocket', raw: false },
          { x: 380, y: 126, h: 350, title: 'RAW AUDIO · RESPONSE STARTED', titleZh: 'raw 响应已开始', raw: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#if !panel.raw}
            <text x={panel.x + 16} y={panel.y + 60} class="tag">{t('after SSE starts, beside audio', 'SSE 开始后，在声音之外报告')}</text>
            <text x={panel.x + 16} y={panel.y + 88} class="tag">{t('Speech WebSocket: error event too', '语音 WebSocket 也发 error 事件')}</text>
            <g opacity={phase >= 1 ? 1 : 0.08} style="transition: opacity 450ms">
              <rect x={panel.x + 16} y={panel.y + 116} width={phone ? 238 : 268} height="88" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={panel.x + 28} y={panel.y + 147} class="tag strong">error</text>
              <text x={panel.x + 28} y={panel.y + 177} class="mono">The request queue is full.</text>
              <text x={panel.x + 20} y={panel.y + 240} class="tag">{t('The error can follow partial audio.', '错误之前可能已经交付部分声音。')}</text>
            </g>
          {:else}
            <text x={panel.x + 16} y={panel.y + 60} class="tag">{t('audio samples only', '只有声音样本')}</text>
            <text x={panel.x + 16} y={panel.y + 88} class="tag">{t('no event envelope for an error', '没有装错误的事件外壳')}</text>
            <g opacity={phase >= 2 ? 1 : 0.08} style="transition: opacity 450ms">
              <rect x={panel.x + 16} y={panel.y + 116} width={phone ? 238 : 268} height="88" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={panel.x + 28} y={panel.y + 147} class="tag strong">{t('RESPONSE STREAM ENDS EARLY', '响应流提前结束')}</text>
              <text x={panel.x + 28} y={panel.y + 177} class="tag">{t('no general error envelope', '没有通用错误外壳')}</text>
              <text x={panel.x + 20} y={panel.y + 240} class="tag">{t('The reader sees the response stream end.', '读者看到响应流提前结束。')}</text>
            </g>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 724 : 526} text-anchor="middle" class="tag">{t('This cap does not reject a request when it arrives.', '这个上限不在请求到达时拒绝它。')}</text>
        <text x={W / 2} y={phone ? 782 : 580} text-anchor="middle" class="rowlabel">{t('What remains until the reader closes?', '读者关闭以前，还留着什么？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed failure; no live connection was measured.', '构造失败场景，未测量真实连接。')}</text>
      {:else if step === 7}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('TWO CLOSE CASES, TWO DIFFERENT LEFTOVERS', '两种关闭情况，剩余内容不同')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('owned = the request work record remains · Ch. 3 Step 2', '仍持有 = 请求的工作记录还在 · 第 3 章第 2 步')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = unread bytes · orange = queued failure', '蓝 = 未读字节 · 橙 = 排队等待的失败消息')}</text>
        {#each phone ? [
          { x: 15, y: 112, h: 280, title: 'EARLY CLOSE · NO CAP FAILURE', titleZh: '提前关闭 · 没有上限失败', failed: false },
          { x: 15, y: 428, h: 280, title: 'AFTER CAP FAILURE', titleZh: '上限失败之后', failed: true },
        ] : [
          { x: 40, y: 112, h: 330, title: 'EARLY CLOSE · NO CAP FAILURE', titleZh: '提前关闭 · 没有上限失败', failed: false },
          { x: 380, y: 112, h: 330, title: 'AFTER CAP FAILURE', titleZh: '上限失败之后', failed: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#if !panel.failed}
            <g opacity={phase >= 1 ? 0.12 : 1} style="transition: opacity 500ms">
              <rect x={panel.x + 16} y={panel.y + 54} width={phone ? 238 : 268} height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 28} y={panel.y + 90} class="result">{DELIVERY_CLOSE_CASE_BYTES} B {t('unread before close', '关闭前未读')}</text>
            </g>
            <text x={panel.x + 20} y={panel.y + 146} class="tag">{t('close: abort if the work record remains', '关闭：工作记录还在就中止')}</text>
            <g opacity={phase >= 1 ? 1 : 0.08} style="transition: opacity 400ms">
              <text x={panel.x + 20} y={panel.y + 178} class="result">{DELIVERY_CLOSE_CASE_BYTES} B → 0 B</text>
              <text x={panel.x + 20} y={panel.y + 214} class="tag">{t('queue + backlog removed', '队列 + 积压都删除')}</text>
            </g>
            <text x={panel.x + 20} y={panel.y + 246} class="tag strong" opacity={phase >= 2 ? 1 : 0.08} style="transition: opacity 400ms">{t('abort message fails → work record + ID can remain', 'abort 消息没送到 → 工作记录和流 ID 可能保留')}</text>
          {:else}
            <g opacity={phase >= 3 ? 0.12 : 1} style="transition: opacity 500ms">
              <rect x={panel.x + 16} y={panel.y + 54} width={phone ? 238 : 268} height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={panel.x + 28} y={panel.y + 90} class="result">0 B audio · {t('error waiting', '错误等待读取')}</text>
            </g>
            <text x={panel.x + 20} y={panel.y + 146} class="tag">{t('stream ID = the stream’s name · still taken', '流 ID = 流的名字 · 仍被占用')}</text>
            <text x={panel.x + 20} y={panel.y + 178} class="tag">{t('take the error OR close the reader', '取走错误，或关闭读者')}</text>
            <text x={panel.x + 20} y={panel.y + 214} class="tag strong" opacity={phase >= 3 ? 1 : 0.08} style="transition: opacity 400ms">{t('queue + backlog released · 0 B', '队列 + 积压都释放 · 0 B')}</text>
            <text x={panel.x + 20} y={panel.y + 246} class="tag strong" opacity={phase >= 4 ? 1 : 0.08} style="transition: opacity 400ms">{t('abort message fails → work record + ID can remain', 'abort 消息没送到 → 工作记录和流 ID 可能保留')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 752 : 486} text-anchor="middle" class="tag strong">{t('NEXT · TWO API PROCESSES SHARE ONE PUBLIC URL', '下一步 · 两个 API 进程共用一个公开网址')}</text>
        <rect x={phone ? 15 : 220} y={phone ? 776 : 510} width={phone ? 270 : 280} height="48" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y={phone ? 807 : 541} text-anchor="middle" class="tag strong">{t('public URL = the address clients use for requests', '公开网址 = 客户端发送请求的地址')}</text>
        <text x={W / 2} y={phone ? 850 : 584} text-anchor="middle" class="rowlabel">{phone ? t('A or B: who takes the next request?', 'A 还是 B：谁接收下一个请求？') : t('API process A or B: who takes the next request?', 'API 进程 A 还是 B：谁接收下一个请求？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Early close: unread → 0 · cap failure: already 0', '提前关闭：未读变 0 · 上限失败：已经为 0') : t('Early close releases unread bytes. Cap failure already removed them.', '提前关闭会释放未读字节；上限失败时这些字节已经移除。')}</text>
      {/if}
      <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label={t('loops', '循环')} />
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>

<style>
  @media (min-width: 901px) {
    .canvas :global(.tag), .canvas :global(.mono) { font-size: var(--reader-tag); }
    .canvas :global(.rowlabel) { font-size: var(--reader-rowlabel); }
    .canvas :global(.footnote) { font-size: var(--reader-footnote); }
  }
</style>
