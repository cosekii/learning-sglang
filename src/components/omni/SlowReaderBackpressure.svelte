<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    DELIVERY_PAYLOAD_TOTAL_BYTES,
    DELIVERY_TEST_CAP_BYTES,
    DELIVERY_IDLE_CASE_STREAMS,
    DELIVERY_IDLE_TRIGGER_BYTES,
    DELIVERY_IDLE_BEFORE_BYTES,
    DELIVERY_IDLE_OVER_BYTES,
    DELIVERY_IDLE_AFTER_BYTES,
    DELIVERY_REPEAT_CASE_STREAMS,
    DELIVERY_REPEAT_TRIGGER_BYTES,
    DELIVERY_REPEAT_BEFORE_BYTES,
    DELIVERY_REPEAT_OVER_BYTES,
    DELIVERY_REPEAT_AFTER_FIRST_BYTES,
    DELIVERY_REPEAT_AFTER_SECOND_BYTES,
    DELIVERY_REPEAT_FAILED_COUNT,
    DELIVERY_CLOSE_CASE_BYTES,
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
    caption: 'Generation can finish before the reader takes six seconds of audio. Those 576,000 bytes still wait in the API process.',
    captionZh: '生成结束时，读者还有 6 秒声音没取走。576,000 字节仍留在 API 进程里。',
  }, {
    caption: 'One API process shares one byte cap across its streams. It counts audio bytes, not text characters.',
    captionZh: '一个 API 进程里的多路流共用一个字节上限。只数声音字节，不数字符。',
  }, {
    caption: 'A queue read resets the idle clock. A new generated chunk does not.',
    captionZh: '读者取走一条消息，空闲钟就归零。新生成的 chunk 不会归零。',
  }, {
    caption: 'The longest-idle stream fails first, even when another stream holds more bytes.',
    captionZh: '最久没读取的流先失败，哪怕另一流积压更多。',
  }, {
    caption: 'The coordinator fails another oldest-idle stream until the total fits. This example fails two.',
    captionZh: 'coordinator 继续让最久没读的流失败，直到总量合格。这里失败两路。',
  }, {
    caption: 'A cap failure ends the whole stream. It aborts generation only if generation is still running.',
    captionZh: '超过上限会结束整条流。只有还在生成时，才中止生成。',
  }, {
    caption: 'SSE and WebSocket readers get an error event. Raw PCM closes early because it has no event envelope.',
    captionZh: 'SSE 和 WebSocket 读者收到错误事件。raw PCM 没有事件外壳，只能提前断开。',
  }, {
    caption: 'Closing the reader aborts unfinished work and removes its queue. When two API processes share one URL, which takes the next request?',
    captionZh: '关闭读者会中止未完成工作，并删掉剩余队列。两个 API 进程中，谁接收下一个请求？',
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
  const H = $derived(phone ? [760, 900, 760, 850, 900, 800, 850, 900][step] : [560, 680, 620, 650, 680, 610, 640, 650][step]);
  const bytes = (n: number) => n.toLocaleString('en-US');
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('GENERATION FINISHED. DELIVERY DID NOT.', '生成结束了，交付还没结束。')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('delivery backlog = audio made, but not taken by the reader', '交付积压 = 已生成、读者还没取走的声音')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = waiting audio · grey = audio already read', '蓝 = 等待取走的声音 · 灰 = 已经读取的声音')}</text>
        {#if !phone}
          {#each [
            { x: 20, title: 'GENERATOR', lines: ['10 s made', 'generation slot: FREE'], linesZh: ['生成 10 秒', '生成名额：已释放'] },
            { x: 270, title: 'API PROCESS', lines: ['hands audio to reader', '6 s still queued'], linesZh: ['把声音交给读者', '还排着 6 秒'] },
            { x: 520, title: 'READER', lines: ['took 4 s', 'reads at its own pace'], linesZh: ['取走 4 秒', '按自己的速度读取'] },
          ] as box, i}
            <rect x={box.x} y="110" width="180" height="112" rx="11" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x={box.x + 16} y="139" class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            {#each box.lines as line, j}
              <text x={box.x + 16} y={169 + j * 28} class="tag">{t(line, box.linesZh[j])}</text>
            {/each}
            {#if i < 2}<text x={box.x + 211} y="174" text-anchor="middle" class="result">→</text>{/if}
          {/each}
        {:else}
          {#each [
            { y: 104, title: 'GENERATOR', lines: ['10 s made · slot FREE'], linesZh: ['生成 10 秒 · 名额已释放'] },
            { y: 210, title: 'API PROCESS', lines: ['hands audio to reader · 6 s queued'], linesZh: ['把声音交给读者 · 还排着 6 秒'] },
            { y: 316, title: 'READER', lines: ['took 4 s · reads at its own pace'], linesZh: ['取走 4 秒 · 按自己的速度读取'] },
          ] as box, i}
            <rect x="15" y={box.y} width="270" height="82" rx="11" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x="30" y={box.y + 27} class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            <text x="30" y={box.y + 56} class="tag">{t(box.lines[0], box.linesZh[0])}</text>
            {#if i < 2}<text x="150" y={box.y + 99} text-anchor="middle" class="result">↓</text>{/if}
          {/each}
        {/if}
        {@const barY = phone ? 446 : 278}
        {@const barX = phone ? 15 : 120}
        {@const readW = phone ? 96 : 192}
        {@const queueW = phone ? 144 : 288}
        <text x={barX} y={barY - 18} class="tag strong">{t('THE SAME 10 SECONDS OF AUDIO', '同一段 10 秒声音')}</text>
        <rect x={barX} y={barY} width={readW} height="58" rx="7" fill="var(--bg)" stroke="var(--faint)" />
        <rect x={barX + readW} y={barY} width={queueW} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={barX + readW / 2} y={barY + 35} text-anchor="middle" class="tag">{DELIVERY_READ_SECONDS} s {t('read', '已读')}</text>
        <text x={barX + readW + queueW / 2} y={barY + 35} text-anchor="middle" class="tag strong">{DELIVERY_QUEUED_SECONDS} s {t('waiting', '等待')}</text>
        <text x={W / 2} y={barY + 100} text-anchor="middle" class="formula">{DELIVERY_GENERATED_SECONDS} − {DELIVERY_READ_SECONDS} = {DELIVERY_QUEUED_SECONDS} s {t('still queued', '仍在排队')}</text>
        <text x={W / 2} y={barY + 137} text-anchor="middle" class="formula">{bytes(DELIVERY_AUDIO_SAMPLE_RATE)} × {DELIVERY_AUDIO_BYTES_PER_SAMPLE} B × {DELIVERY_QUEUED_SECONDS} s = {bytes(DELIVERY_QUEUED_BYTES)} B</text>
        <text x={W / 2} y={barY + 169} text-anchor="middle" class="tag">{t(`${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} B each second × 6 seconds`, `每秒 ${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} 字节 × 6 秒`)}</text>
        <text x={W / 2} y={barY + (phone ? 222 : 214)} text-anchor="middle" class="rowlabel">{t('What stops this queue from growing?', '怎样阻止这条队列一直变长？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed example. Socket buffering is excluded.', '构造算例，不计 socket 缓冲。')}</text>
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('ONE API PROCESS, ONE SHARED BYTE CAP', '一个 API 进程，一个共享字节上限')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('cap = the most queued audio bytes all its streams may hold', '上限 = 这里所有流合计最多能保留的声音字节')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = counted audio · grey = not counted', '蓝 = 计入的声音 · 灰 = 不计入')}</text>
        <rect x={phone ? 15 : 70} y="102" width={phone ? 270 : 580} height="132" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="132" text-anchor="middle" class="mono">stream_delivery.max_total_backlog_bytes</text>
        <text x={W / 2} y="164" text-anchor="middle" class="result">1 GiB = {bytes(DELIVERY_DEFAULT_CAP_BYTES)} B</text>
        <text x={W / 2} y="194" text-anchor="middle" class="tag">{t('per API process', '每个 API 进程')} · none = {t('cap off', '关闭上限')}</text>
        <text x={W / 2} y="219" text-anchor="middle" class="tag">{bytes(DELIVERY_DEFAULT_CAP_BYTES)} ÷ {bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} ≈ {DELIVERY_DEFAULT_CAP_HOURS.toFixed(1)} h {t('of audio', '声音')}</text>
        {#each phone ? [
          { x: 15, y: 266, w: 270, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 15, y: 472, w: 270, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] : [
          { x: 40, y: 266, w: 300, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 380, y: 266, w: 300, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] as card}
          <rect x={card.x} y={card.y} width={card.w} height="174" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={card.x + 16} y={card.y + 28} class="tag strong">{card.name}</text>
          <rect x={card.x + 16} y={card.y + 45} width={card.w - 32} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={card.x + 28} y={card.y + 72} class="mono">audio_waveform: {card.audio} B</text>
          {#if card.text}
            <text x={card.x + 20} y={card.y + 115} class="tag" fill="var(--muted)">text: {DELIVERY_PAYLOAD_TEXT_CHARS} {t('characters', '个字符')}</text>
          {/if}
          <text x={card.x + 20} y={card.y + 151} class="result">{t('COUNT', '计入')} = {card.audio} B</text>
        {/each}
        {@const totalY = phone ? 686 : 474}
        <rect x={phone ? 15 : 170} y={totalY} width={phone ? 270 : 380} height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y={totalY + 29} text-anchor="middle" class="tag strong">{t('SHARED AUDIO-BYTE LEDGER', '共享声音字节账')}</text>
        <text x={W / 2} y={totalY + 56} text-anchor="middle" class="result">{DELIVERY_PAYLOAD_AUDIO_BYTES} + {DELIVERY_OTHER_AUDIO_BYTES} = {DELIVERY_PAYLOAD_TOTAL_BYTES} B</text>
        <text x={W / 2} y={totalY + 101} text-anchor="middle" class="tag">{t('Text and socket buffers stay outside this audio-byte ledger.', '文字和 socket 缓冲不记入这份声音字节账。')}</text>
        <text x={W / 2} y={totalY + (phone ? 160 : 151)} text-anchor="middle" class="rowlabel">{t('Over the cap, which stream fails?', '超过上限后，哪一路流失败？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed payloads. Another API process has its own cap.', '构造的消息内容。另一个 API 进程有自己的上限。')}</text>
      {:else if step === 2}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('READING RESETS THE IDLE CLOCK', '读取会把空闲钟归零')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('reader idle time = now − the last queue read', '读取空闲时间 = 现在 − 上次从队列读取的时刻')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = queued audio · both panels start with 8 B', '蓝 = 排队声音 · 两图都从 8 B 开始')}</text>
        <rect x={phone ? 15 : 170} y="100" width={phone ? 270 : 380} height="54" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="134" text-anchor="middle" class="formula">idle = now − last read = {DELIVERY_CLOCK_NOW_SECONDS} − {DELIVERY_CLOCK_LAST_READ_SECONDS} = {DELIVERY_CLOCK_IDLE_SECONDS} s</text>
        {#each phone ? [
          { x: 15, y: 190, h: 220, title: 'READER TAKES 4 B', titleZh: '读者取走 4 B', queue: DELIVERY_CLOCK_AFTER_READ_BYTES, last: DELIVERY_CLOCK_NOW_SECONDS, idle: 0, read: true },
          { x: 15, y: 446, h: 220, title: 'GENERATOR ADDS 4 B', titleZh: '生成器新增 4 B', queue: DELIVERY_CLOCK_AFTER_PRODUCE_BYTES, last: DELIVERY_CLOCK_LAST_READ_SECONDS, idle: DELIVERY_CLOCK_IDLE_SECONDS, read: false },
        ] : [
          { x: 40, y: 190, h: 300, title: 'READER TAKES 4 B', titleZh: '读者取走 4 B', queue: DELIVERY_CLOCK_AFTER_READ_BYTES, last: DELIVERY_CLOCK_NOW_SECONDS, idle: 0, read: true },
          { x: 380, y: 190, h: 300, title: 'GENERATOR ADDS 4 B', titleZh: '生成器新增 4 B', queue: DELIVERY_CLOCK_AFTER_PRODUCE_BYTES, last: DELIVERY_CLOCK_LAST_READ_SECONDS, idle: DELIVERY_CLOCK_IDLE_SECONDS, read: false },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          <rect x={panel.x + 16} y={panel.y + 52} width={phone ? 238 : 268} height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + 30} y={panel.y + 88} class="result">{DELIVERY_CLOCK_BEFORE_BYTES} B → {panel.queue} B</text>
          <text x={panel.x + 20} y={panel.y + 145} class="tag">now = {DELIVERY_CLOCK_NOW_SECONDS} s</text>
          <text x={panel.x + 20} y={panel.y + 174} class="tag">last read = {panel.last} s</text>
          <text x={panel.x + 20} y={panel.y + 212} class="result">idle = {panel.idle} s</text>
          {#if !phone}
            <text x={panel.x + 20} y={panel.y + 254} class="tag strong">{panel.read ? t('READ resets the clock', '读取让时钟归零') : t('PRODUCING does not reset it', '生成新消息不让时钟归零')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 716 : 550} text-anchor="middle" class="rowlabel">{t('Which stream has the oldest idle clock?', '哪一路流的空闲钟最老？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed times. This clock does not observe playback.', '构造时刻。这个时钟不观察播放位置。')}</text>
      {:else if step === 3}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('THE LONGEST-IDLE STREAM FAILS FIRST', '最久没读取的流先失败')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('fail = end the stream with an error · cap = 12 B', '失败 = 用错误结束这一路流 · 上限 = 12 B')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = queued and kept · orange = failed and removed', '蓝 = 保留的积压 · 橙 = 失败并移除的积压')}</text>
        <rect x={phone ? 15 : 20} y="104" width={phone ? 270 : 680} height="190" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="133" text-anchor="middle" class="tag strong">{t('BEFORE · total fits', '之前 · 总量不超上限')}</text>
        <text x={W / 2} y="158" text-anchor="middle" class="formula">{DELIVERY_IDLE_CASE_STREAMS[0].bytes} + {DELIVERY_IDLE_CASE_STREAMS[1].bytes} = {DELIVERY_IDLE_BEFORE_BYTES} B ≤ {DELIVERY_TEST_CAP_BYTES} B</text>
        {#each DELIVERY_IDLE_CASE_STREAMS as stream, i}
          {@const x = phone ? 27 + i * 132 : 40 + i * 340}
          <rect {x} y="180" width={phone ? 120 : 300} height="88" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 12} y="205" class="mono">{stream.id}</text>
          <text x={x + 12} y="232" class="tag strong">{stream.bytes} B · idle {stream.idleSeconds} s</text>
          <text x={x + 12} y="255" class="tag">{i === 0 ? t('older reader', '更久没读') : t('larger backlog', '积压更大')}</text>
        {/each}
        <rect x={phone ? 15 : 170} y="320" width={phone ? 270 : 380} height="66" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={W / 2} y="347" text-anchor="middle" class="tag strong">req-behind + {DELIVERY_IDLE_TRIGGER_BYTES} B</text>
        <text x={W / 2} y="373" text-anchor="middle" class="result">{DELIVERY_IDLE_BEFORE_BYTES} + {DELIVERY_IDLE_TRIGGER_BYTES} = {DELIVERY_IDLE_OVER_BYTES} B &gt; {DELIVERY_TEST_CAP_BYTES} B</text>
        <rect x={phone ? 15 : 20} y="412" width={phone ? 270 : 680} height="150" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="441" text-anchor="middle" class="tag strong">{t('AFTER · fail req-idle, keep req-behind', '之后 · req-idle 失败，req-behind 保留')}</text>
        <rect x={phone ? 27 : 40} y="463" width={phone ? 120 : 300} height="72" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={phone ? 39 : 52} y="491" class="mono">req-idle</text>
        <text x={phone ? 39 : 52} y="518" class="tag strong">FAIL · −{DELIVERY_IDLE_CASE_STREAMS[0].bytes} B</text>
        <rect x={phone ? 159 : 380} y="463" width={phone ? 120 : 300} height="72" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 171 : 392} y="491" class="mono">req-behind</text>
        <text x={phone ? 171 : 392} y="518" class="tag strong">{DELIVERY_IDLE_AFTER_BYTES} B · {t('KEPT', '保留')}</text>
        <text x={W / 2} y="596" text-anchor="middle" class="formula">{DELIVERY_IDLE_OVER_BYTES} − {DELIVERY_IDLE_CASE_STREAMS[0].bytes} = {DELIVERY_IDLE_AFTER_BYTES} B ≤ {DELIVERY_TEST_CAP_BYTES} B</text>
        <text x={W / 2} y={phone ? 770 : 626} text-anchor="middle" class="rowlabel">{t('What if one failure is not enough?', '如果失败一路还不够呢？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Unit-test values; idle timestamps were adjusted.', '单元测试算例；空闲时间戳经过调整。')}</text>
      {:else if step === 4}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('REPEAT UNTIL THE TOTAL FITS', '重复失败，直到总量合格')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{phone ? t('oldest idle clock · nonempty streams only', '非空流里选最老空闲钟') : t('same rule each time: oldest idle clock among nonempty streams', '每次规则相同：从非空流里选最老的空闲钟')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = kept · orange = failed this round · cap = 12 B', '蓝 = 保留 · 橙 = 本轮失败 · 上限 = 12 B')}</text>
        {#each phone ? [
          { x: 15, y: 112, h: 190, title: 'START · fresh adds 6 B', titleZh: '开始 · fresh 新增 6 B', total: DELIVERY_REPEAT_OVER_BYTES, failed: -1 },
          { x: 15, y: 342, h: 190, title: '1 · fail req-oldest', titleZh: '第 1 次 · req-oldest 失败', total: DELIVERY_REPEAT_AFTER_FIRST_BYTES, failed: 0 },
          { x: 15, y: 572, h: 190, title: '2 · fail req-older', titleZh: '第 2 次 · req-older 失败', total: DELIVERY_REPEAT_AFTER_SECOND_BYTES, failed: 1 },
        ] : [
          { x: 20, y: 122, h: 360, title: 'START · fresh adds 6 B', titleZh: '开始 · fresh 新增 6 B', total: DELIVERY_REPEAT_OVER_BYTES, failed: -1 },
          { x: 255, y: 122, h: 360, title: '1 · fail req-oldest', titleZh: '第 1 次 · req-oldest 失败', total: DELIVERY_REPEAT_AFTER_FIRST_BYTES, failed: 0 },
          { x: 490, y: 122, h: 360, title: '2 · fail req-older', titleZh: '第 2 次 · req-older 失败', total: DELIVERY_REPEAT_AFTER_SECOND_BYTES, failed: 1 },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 210} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 29} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#each DELIVERY_REPEAT_CASE_STREAMS as stream, i}
            {@const failed = panel.failed === i}
            {@const removed = panel.failed > i}
            {@const y = panel.y + 52 + i * (phone ? 31 : 62)}
            <rect x={panel.x + 12} {y} width={phone ? 246 : 186} height={phone ? 26 : 50} rx="6" fill={failed || removed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={failed || removed ? 'var(--gen)' : 'var(--accent)'} />
            <text x={panel.x + 21} y={y + (phone ? 18 : 22)} class="mono">{stream.id}</text>
            <text x={panel.x + (phone ? 238 : 174)} y={y + (phone ? 18 : 22)} text-anchor="end" class="tag strong">{failed || removed ? 0 : i === 2 && panel.failed === -1 ? stream.bytes + DELIVERY_REPEAT_TRIGGER_BYTES : stream.bytes} B</text>
            {#if !phone}
              <text x={panel.x + 21} y={y + 42} class="tag">{failed ? 'FAIL NOW' : removed ? 'FAILED' : `idle ${stream.idleSeconds} s`}</text>
            {/if}
          {/each}
          <text x={panel.x + 14} y={panel.y + (phone ? 166 : 264)} class="result">total = {panel.total} B {panel.total > DELIVERY_TEST_CAP_BYTES ? '>' : '≤'} {DELIVERY_TEST_CAP_BYTES} B</text>
          {#if !phone}
            <text x={panel.x + 14} y={panel.y + 310} class="tag strong">{panel.failed === -1 ? t('over: choose oldest', '超了：选最老') : panel.total > DELIVERY_TEST_CAP_BYTES ? t('still over: repeat', '还超：再选一次') : t('fits: stop', '合格：停止')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 806 : 536} text-anchor="middle" class="result">failed_stream_count = {DELIVERY_REPEAT_FAILED_COUNT}</text>
        <text x={W / 2} y={phone ? 850 : 584} text-anchor="middle" class="rowlabel">{t('What does a failed stream stop doing?', '失败的流会停止哪些工作？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Unit-test values. Fresh holds 4 + 6 = 10 B in every panel.', '单元测试算例。三幅图里 fresh 都是 4 + 6 = 10 B。')}</text>
      {:else if step === 5}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('FAIL THE WHOLE STREAM, NOT ONE CHUNK', '结束整条流，不只丢一个 chunk')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('abort = stop unfinished request work · orange = failure path', '中止 = 停止还没完成的请求工作 · 橙 = 失败路径')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('Dropping single chunks would corrupt the audio.', '只丢几个 chunk 会弄坏声音，所以整条流失败。')}</text>
        {#each phone ? [
          { x: 15, y: 116, h: 272, title: 'GENERATION STILL RUNNING', titleZh: '生成仍在运行', running: true },
          { x: 15, y: 424, h: 272, title: 'GENERATION ALREADY FINISHED', titleZh: '生成已经结束', running: false },
        ] : [
          { x: 40, y: 116, h: 360, title: 'GENERATION STILL RUNNING', titleZh: '生成仍在运行', running: true },
          { x: 380, y: 116, h: 360, title: 'GENERATION ALREADY FINISHED', titleZh: '生成已经结束', running: false },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          <rect x={panel.x + 16} y={panel.y + 52} width={phone ? 238 : 268} height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + 30} y={panel.y + 86} class="result">{DELIVERY_CLOSE_CASE_BYTES} B {t('queued audio', '排队声音')}</text>
          <text x={panel.x + (phone ? 135 : 150)} y={panel.y + 132} text-anchor="middle" class="result">↓</text>
          <rect x={panel.x + 16} y={panel.y + 150} width={phone ? 238 : 268} height="50" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={panel.x + 30} y={panel.y + 182} class="tag strong">{t('CAP FAILURE · whole stream', '超过上限 · 整条流失败')}</text>
          <text x={panel.x + 20} y={panel.y + 234} class="tag strong">{panel.running ? t('ABORT the generator', '中止生成器') : t('No generator left to abort', '没有还在运行的生成器可中止')}</text>
          <text x={panel.x + 20} y={panel.y + (phone ? 258 : 270)} class="tag">{t('Send the stream failure to its reader.', '把这条流的失败通知读者。')}</text>
        {/each}
        <text x={W / 2} y={phone ? 728 : 536} text-anchor="middle" class="rowlabel">{t('What error does the reader receive?', '读者会收到什么错误？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Same bytes · before or after generation ends', '同一份声音 · 生成前后都可能失败') : t('The same queued bytes can fail before or after generation ends.', '同一份排队声音可能在生成结束前或结束后失败。')}</text>
      {:else if step === 6}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('THE READER LEARNS THAT DELIVERY FAILED', '读者得知交付失败')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('event envelope = a named message wrapped around data', '事件外壳 = 包住数据、带有名字的消息')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('orange = failure output · all three show the same cap failure', '橙 = 失败输出 · 三种连接遇到同一个上限失败')}</text>
        {#each phone ? [
          { x: 15, y: 116, h: 276, title: 'EVENT CONNECTIONS', titleZh: '带事件的连接', raw: false },
          { x: 15, y: 428, h: 250, title: 'RAW PCM', titleZh: 'raw PCM', raw: true },
        ] : [
          { x: 40, y: 126, h: 350, title: 'EVENT CONNECTIONS', titleZh: '带事件的连接', raw: false },
          { x: 380, y: 126, h: 350, title: 'RAW PCM', titleZh: 'raw PCM', raw: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#if !panel.raw}
            <text x={panel.x + 16} y={panel.y + 60} class="tag">SSE · WebSocket</text>
            <text x={panel.x + 16} y={panel.y + 88} class="tag">{t('carry named events beside audio', '除了声音，还能携带带名字的事件')}</text>
            <rect x={panel.x + 16} y={panel.y + 116} width={phone ? 238 : 268} height="88" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + 28} y={panel.y + 147} class="tag strong">error</text>
            <text x={panel.x + 28} y={panel.y + 177} class="mono">The request queue is full.</text>
            <text x={panel.x + 20} y={panel.y + 240} class="tag">{t('The error can follow partial audio.', '错误之前可能已经交付部分声音。')}</text>
          {:else}
            <text x={panel.x + 16} y={panel.y + 60} class="tag">{t('audio samples only', '只有声音样本')}</text>
            <text x={panel.x + 16} y={panel.y + 88} class="tag">{t('no event envelope for an error', '没有装错误的事件外壳')}</text>
            <rect x={panel.x + 16} y={panel.y + 116} width={phone ? 238 : 268} height="88" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + 28} y={panel.y + 147} class="tag strong">{t('CONNECTION CLOSED EARLY', '连接提前关闭')}</text>
            <text x={panel.x + 28} y={panel.y + 177} class="tag">{t('no error event', '没有错误事件')}</text>
            <text x={panel.x + 20} y={panel.y + 240} class="tag">{t('The reader sees the stream end.', '读者看到流提前结束。')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 724 : 526} text-anchor="middle" class="tag">{t('This cap does not refuse new requests.', '这个上限不会因此拒绝新请求。')}</text>
        <text x={W / 2} y={phone ? 782 : 580} text-anchor="middle" class="rowlabel">{t('What remains until the reader closes?', '读者关闭以前，还留着什么？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('SSE · WebSocket · raw PCM: different envelopes', '三种连接的错误外壳不同') : t('Speech SSE, speech WebSocket and raw PCM have different envelopes.', '语音 SSE、语音 WebSocket 和 raw PCM 的消息外壳不同。')}</text>
      {:else if step === 7}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('CLOSING THE READER RELEASES THE REST', '关闭读者，释放剩余资源')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('close = the reader stops taking messages', '关闭 = 读者不再从队列取消息')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = remaining queue · orange = unfinished work to abort', '蓝 = 剩余队列 · 橙 = 需要中止的未完成工作')}</text>
        {#each phone ? [
          { x: 15, y: 112, h: 280, title: 'READER OPEN', titleZh: '读者还开着', closed: false },
          { x: 15, y: 428, h: 280, title: 'READER CLOSED', titleZh: '读者已经关闭', closed: true },
        ] : [
          { x: 40, y: 112, h: 330, title: 'READER OPEN', titleZh: '读者还开着', closed: false },
          { x: 380, y: 112, h: 330, title: 'READER CLOSED', titleZh: '读者已经关闭', closed: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={phone ? 270 : 300} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 16} y={panel.y + 30} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#if !panel.closed}
            <rect x={panel.x + 16} y={panel.y + 54} width={phone ? 238 : 268} height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 28} y={panel.y + 91} class="result">{DELIVERY_CLOSE_CASE_BYTES} B {t('still queued', '仍在队列')}</text>
            <text x={panel.x + 20} y={panel.y + 150} class="tag">{t('request work may still be owned', '请求工作可能仍被持有')}</text>
            <text x={panel.x + 20} y={panel.y + 180} class="tag">{t('after cap failure: stream ID reserved', '上限失败后：流 ID 仍保留')}</text>
            <text x={panel.x + 20} y={panel.y + 224} class="tag strong">{t('The stalled reader must close.', '停住的读者需要关闭。')}</text>
          {:else}
            <rect x={panel.x + 16} y={panel.y + 54} width={phone ? 238 : 268} height="60" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + 28} y={panel.y + 91} class="tag strong">{t('ABORT only if work is still owned', '只有工作仍被持有时才中止')}</text>
            <text x={panel.x + 20} y={panel.y + 150} class="tag">{t('remove stream queue + backlog', '删除流队列和积压记录')}</text>
            <text x={panel.x + 20} y={panel.y + 180} class="result">{DELIVERY_CLOSE_CASE_BYTES} B → 0 B</text>
            <text x={panel.x + 20} y={panel.y + 224} class="tag strong">{t('release the reserved stream ID', '释放保留的流 ID')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 752 : 486} text-anchor="middle" class="tag strong">{t('NEXT · TWO API PROCESSES SHARE ONE PUBLIC URL', '下一步 · 两个 API 进程共用一个公开网址')}</text>
        <rect x={phone ? 15 : 220} y={phone ? 776 : 510} width={phone ? 270 : 280} height="48" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y={phone ? 807 : 541} text-anchor="middle" class="tag strong">{t('same public URL', '同一个公开网址')}</text>
        <text x={W / 2} y={phone ? 850 : 584} text-anchor="middle" class="rowlabel">{phone ? t('A or B: who takes the next request?', 'A 还是 B：谁接收下一个请求？') : t('API process A or B: who takes the next request?', 'API 进程 A 还是 B：谁接收下一个请求？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Both close tests release the backlog', '两种关闭测试都会释放积压') : t('Early-close and cap-failure tests both release the remaining backlog.', '提前关闭和上限失败的测试都会释放剩余积压。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
