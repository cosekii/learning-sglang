<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    STREAM_P90_SHARED_S, STREAM_P90_ALONE_S, STREAM_P90_EXTRA_S,
    STREAM_P90_SOONER_PERCENT,
    STREAM_TEACHING_SUBMIT_S, STREAM_TEACHING_FIRST_AUDIO_S, STREAM_TEACHING_DONE_S,
    STREAM_TEACHING_TTFT_S, STREAM_TEACHING_TOTAL_S,
    STREAM_CHUNK_DURATION_S, STREAM_CHUNK1_ARRIVAL_S, STREAM_CHUNK1_END_S,
    STREAM_CHUNK2_ARRIVAL_S, STREAM_CHUNK2_END_S, STREAM_STALL_S, STREAM_STALL_CHUNK_PERCENT,
    STREAM_TRACE_REQUEST_ID, STREAM_TRACE_CHUNK_ID, STREAM_TRACE_OBJECT_ID,
    STREAM_TRACE_HOST_WAIT_MS, STREAM_TRACE_GPU_EVENT_MS, STREAM_TRACE_HOST_REST_MS,
    STREAM_BENCH_PROMPT_COUNT, STREAM_BENCH_WARMUP_PER_PROMPT, STREAM_BENCH_REPEATS_PER_PROMPT,
    STREAM_BENCH_SEED, STREAM_BENCH_MAX_TOKENS, STREAM_PARTIAL_START_MIN_CHUNKS,
    STREAM_BENCH_WARMUP_PER_LABEL, STREAM_BENCH_KEPT_PER_LABEL,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `The talker's own GPU gave p90 first sound in ${STREAM_P90_ALONE_S.toFixed(1)} seconds. Sharing the thinker's GPU took ${STREAM_P90_SHARED_S.toFixed(1)} seconds.`,
    captionZh: `talker 独占 GPU 时，首音 p90 是 ${STREAM_P90_ALONE_S.toFixed(1)} 秒。与 thinker 同卡时是 ${STREAM_P90_SHARED_S.toFixed(1)} 秒。`,
  }, {
    caption: 'TTFT stops at the first audio delta. The total timer continues to [DONE].',
    captionZh: 'TTFT 在首个 audio delta 停止。总计时继续到 [DONE]。',
  }, {
    caption: `Chunk 2 arrives ${STREAM_STALL_S.toFixed(1)} seconds after chunk 1 ends. The player stays silent for ${STREAM_STALL_S.toFixed(1)} seconds.`,
    captionZh: `chunk 2 晚于 chunk 1 结束 ${STREAM_STALL_S.toFixed(1)} 秒。播放器因此静音 ${STREAM_STALL_S.toFixed(1)} 秒。`,
  }, {
    caption: 'Communication tracing records each event with a timestamp. Duration fields show how long that operation waited.',
    captionZh: '通信 trace 给每个事件记下时间戳。耗时字段记录这次操作等了多久。',
  }, {
    caption: `The host waited ${STREAM_TRACE_HOST_WAIT_MS} ms; the GPU event covered ${STREAM_TRACE_GPU_EVENT_MS} ms. The remaining ${STREAM_TRACE_HOST_REST_MS} ms was elsewhere on the host path.`,
    captionZh: `host 等了 ${STREAM_TRACE_HOST_WAIT_MS} ms，GPU event 覆盖 ${STREAM_TRACE_GPU_EVENT_MS} ms。其余 ${STREAM_TRACE_HOST_REST_MS} ms 在 host 路径上。`,
  }, {
    caption: `Warm up ${STREAM_BENCH_WARMUP_PER_PROMPT} times, then record ${STREAM_BENCH_REPEATS_PER_PROMPT} runs per prompt. Change only the partial-start setting.`,
    captionZh: `每个 prompt 预热 ${STREAM_BENCH_WARMUP_PER_PROMPT} 次，再测 ${STREAM_BENCH_REPEATS_PER_PROMPT} 次。只改 partial-start 设置。`,
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
  const H = $derived(phone ? [590, 650, 600, 650, 610, 680][step] : [430, 460, 480, 480, 460, 500][step]);
  const barMax = $derived(phone ? 185 : 400);
  const barScale = $derived(barMax / STREAM_P90_SHARED_S);
  const timeX = (seconds: number) => 60 + (seconds / STREAM_TEACHING_DONE_S) * 600;
  const timeY = (seconds: number) => 112 + (seconds / STREAM_TEACHING_DONE_S) * 300;
  const playX = (seconds: number) => (phone ? 20 : 40) + (seconds - 1) * (phone ? 100 : 240);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="measure-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="measure-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Measure the first-sound wait' : 'One GPU move changed the first-sound wait', phone ? '测量首音等待' : '挪动 talker，首音等待就变了')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'first sound = first returned audio' : 'first sound = the first audio returned to the client', phone ? '首音 = 返回的第一段声音' : '首音 = 返回给客户端的第一段声音')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('p90 = 9 in 10 first sounds arrived within this time', 'p90 = 十个首音里九个在此时间内到达')}</text>
        {#if !phone}
          <rect x="36" y="105" width="648" height="215" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="58" y="136" class="small strong">{t('SAME MODEL · SAME 8-REQUEST LOAD', '同一模型 · 同样同时 8 个请求')}</text>
          <text x="58" y="177" class="small">{t('TALKER BESIDE THINKER', 'talker 与 thinker 同卡')}</text>
          <rect x="260" y="156" width={STREAM_P90_SHARED_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="648" y="179" text-anchor="end" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="58" y="236" class="small">{t('TALKER ON ITS OWN GPU', 'talker 独占一张 GPU')}</text>
          <rect x="260" y="215" width={STREAM_P90_ALONE_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={272 + STREAM_P90_ALONE_S * barScale} y="237" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s</text>
          <text x="58" y="289" class="small">{t('blue = measured p90 wait, one scale', '蓝 = 实测 p90 等待，同一比例')}</text>
          <text x="648" y="289" text-anchor="end" class="result">+{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="360" y="356" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)} ≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="360" y="392" text-anchor="middle" class="small strong">{t('Which part of the wait did the move remove?', '这次挪动省掉了哪段等待？')}</text>
        {:else}
          <rect x="18" y="104" width="264" height="251" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="134" class="small strong">{t('SAME 8-REQUEST LOAD', '同样同时 8 个请求')}</text>
          <text x="32" y="174" class="small">{t('BESIDE THINKER', '与 thinker 同卡')}</text>
          <rect x="32" y="188" width={STREAM_P90_SHARED_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="244" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="32" y="278" class="small">{t('OWN GPU', '独占 GPU')}</text>
          <rect x="32" y="292" width={STREAM_P90_ALONE_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="347" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s · −{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="18" y="391" class="small">{t('blue = p90 wait · one scale', '蓝 = p90 等待 · 同一比例')}</text>
          <text x="150" y="435" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)}</text>
          <text x="150" y="465" text-anchor="middle" class="result">≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="150" y="510" text-anchor="middle" class="small strong">{t('Which wait disappeared?', '省掉了哪段等待？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'PR #1235 · H200 · two runs each' : 'PR #1235 · H200 · 8 requests at once · two runs each', phone ? 'PR #1235 · H200 · 各跑两次' : 'PR #1235 · H200 · 同时 8 个请求 · 各跑两次')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Stop at the first audio' : 'Two timers stop at different events', phone ? '到首个声音就停表' : '两个计时器在不同事件停止')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('TTFT = time to the first audio chunk', 'TTFT = 到第一段声音的时间')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('orange = TTFT · blue = whole request', '橙 = TTFT · 蓝 = 整个请求')}</text>
        {#if !phone}
          <line x1="60" y1="160" x2="660" y2="160" stroke="var(--line)" stroke-width="4" />
          {#each [
            { at: STREAM_TEACHING_SUBMIT_S, title: 'POST', sub: 'request submitted', titleZh: '提交请求', subZh: '计时开始' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S / 2, title: 'text delta', sub: 'no audio yet', titleZh: '文字 delta', subZh: '还没有声音' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S, title: 'first audio delta', sub: 'stop TTFT', titleZh: '首个 audio delta', subZh: 'TTFT 停表' },
            { at: STREAM_TEACHING_DONE_S, title: '[DONE]', sub: 'stop total', titleZh: '[DONE]', subZh: '总计时停表' },
          ] as event}
            <circle cx={timeX(event.at)} cy="160" r="8" fill={event.at === STREAM_TEACHING_FIRST_AUDIO_S ? 'var(--gen)' : 'var(--accent)'} />
            <text x={timeX(event.at)} y="126" text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x={timeX(event.at)} y="194" text-anchor="middle" class="small">{t(event.sub, event.subZh)}</text>
            <text x={timeX(event.at)} y="218" text-anchor="middle" class="result">{event.at.toFixed(1)} s</text>
          {/each}
          <line x1="60" y1="265" x2={timeX(STREAM_TEACHING_FIRST_AUDIO_S)} y2="265" stroke="var(--gen)" stroke-width="5" />
          <text x={(60 + timeX(STREAM_TEACHING_FIRST_AUDIO_S)) / 2} y="294" text-anchor="middle" class="result">TTFT = {STREAM_TEACHING_FIRST_AUDIO_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TTFT_S.toFixed(1)} s</text>
          <line x1="60" y1="335" x2="660" y2="335" stroke="var(--accent)" stroke-width="5" />
          <text x="360" y="364" text-anchor="middle" class="result">total = {STREAM_TEACHING_DONE_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TOTAL_S.toFixed(1)} s</text>
          <text x="360" y="410" text-anchor="middle" class="small strong">{t('Text deltas and [DONE] do not change the TTFT boundary.', '文字 delta 和 [DONE] 都不改变 TTFT 的停表点。')}</text>
        {:else}
          <line x1="52" y1="112" x2="52" y2="412" stroke="var(--line)" stroke-width="4" />
          {#each [
            { at: STREAM_TEACHING_SUBMIT_S, title: 'POST', sub: 'start', titleZh: '提交', subZh: '开始' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S / 2, title: 'text delta', sub: 'no audio', titleZh: '文字 delta', subZh: '无声音' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S, title: 'FIRST AUDIO', sub: 'stop TTFT', titleZh: '首个声音', subZh: 'TTFT 停表' },
            { at: STREAM_TEACHING_DONE_S, title: '[DONE]', sub: 'stop total', titleZh: '[DONE]', subZh: '总计时停表' },
          ] as event}
            <circle cx="52" cy={timeY(event.at)} r="8" fill={event.at === STREAM_TEACHING_FIRST_AUDIO_S ? 'var(--gen)' : 'var(--accent)'} />
            <text x="74" y={timeY(event.at) - 3} class="small strong">{t(event.title, event.titleZh)} · {event.at.toFixed(1)} s</text>
            <text x="74" y={timeY(event.at) + 19} class="small">{t(event.sub, event.subZh)}</text>
          {/each}
          <rect x="20" y="454" width="260" height="70" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="481" text-anchor="middle" class="result">TTFT = {STREAM_TEACHING_FIRST_AUDIO_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TTFT_S.toFixed(1)} s</text>
          <text x="150" y="507" text-anchor="middle" class="small">{t('stop at first audio', '到首个声音停止')}</text>
          <rect x="20" y="544" width="260" height="70" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="571" text-anchor="middle" class="result">total = {STREAM_TEACHING_DONE_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TOTAL_S.toFixed(1)} s</text>
          <text x="150" y="597" text-anchor="middle" class="small">{t('continue to [DONE]', '继续到 [DONE]')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed times · time.perf_counter()' : 'Constructed request times; the code uses time.perf_counter().', '构造时刻 · time.perf_counter()')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'A late chunk leaves silence' : 'A late chunk opens a silent gap', phone ? 'chunk 来晚就会静音' : '下一个 chunk 来晚，播放器就静音')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('stall = playback waits for a missing chunk', '卡顿 = 播放器等还没到的 chunk')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('blue = playing · orange = silence', '蓝 = 播放 · 橙 = 静音')}</text>
        <text x={phone ? 20 : 40} y="100" class="small strong">{t('CHUNK ARRIVALS', 'CHUNK 到达')}</text>
        {#each [STREAM_CHUNK1_ARRIVAL_S, STREAM_CHUNK2_ARRIVAL_S] as arrival, i}
          <circle cx={playX(arrival)} cy="145" r="8" fill="var(--accent)" />
          <text x={playX(arrival)} y="128" text-anchor="middle" class="result">{arrival.toFixed(1)} s</text>
          <text x={playX(arrival)} y="190" text-anchor="middle" class="small">chunk {i + 1}</text>
          <line x1={playX(arrival)} y1="204" x2={playX(arrival)} y2="235" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" />
        {/each}
        <text x={phone ? 20 : 40} y="226" class="small strong">{t('PLAYER', '播放器')}</text>
        <rect x={playX(STREAM_CHUNK1_ARRIVAL_S)} y="244" width={STREAM_CHUNK_DURATION_S * (phone ? 100 : 240)} height="60" fill="var(--accent-soft)" stroke="var(--accent)" />
        <rect x={playX(STREAM_CHUNK1_END_S)} y="244" width={STREAM_STALL_S * (phone ? 100 : 240)} height="60" fill="var(--gen-soft)" stroke="var(--gen)" />
        <rect x={playX(STREAM_CHUNK2_ARRIVAL_S)} y="244" width={STREAM_CHUNK_DURATION_S * (phone ? 100 : 240)} height="60" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={(playX(STREAM_CHUNK1_ARRIVAL_S) + playX(STREAM_CHUNK1_END_S)) / 2} y="280" text-anchor="middle" class="small strong">chunk 1</text>
        <text x={(playX(STREAM_CHUNK2_ARRIVAL_S) + playX(STREAM_CHUNK2_END_S)) / 2} y="280" text-anchor="middle" class="small strong">chunk 2</text>
        <text x={(playX(STREAM_CHUNK1_END_S) + playX(STREAM_CHUNK2_ARRIVAL_S)) / 2} y="331" text-anchor="middle" class="result">{STREAM_STALL_S.toFixed(1)} s {t('silent', '静音')}</text>
        <text x={W / 2} y="370" text-anchor="middle" class="result">chunk 1 {t('ends', '结束')} = {STREAM_CHUNK1_ARRIVAL_S.toFixed(1)} + {STREAM_CHUNK_DURATION_S.toFixed(1)} = {STREAM_CHUNK1_END_S.toFixed(1)} s</text>
        <text x={W / 2} y="407" text-anchor="middle" class="result">stall = max(0, {STREAM_CHUNK2_ARRIVAL_S.toFixed(1)} − {STREAM_CHUNK1_END_S.toFixed(1)}) = {STREAM_STALL_S.toFixed(1)} s</text>
        <text x={W / 2} y={phone ? 449 : 450} text-anchor="middle" class="small strong">{STREAM_STALL_S.toFixed(1)} ÷ {STREAM_CHUNK_DURATION_S.toFixed(1)} = {STREAM_STALL_CHUNK_PERCENT.toFixed(1)}% {t('of one chunk', '一个 chunk')}</text>
        {#if phone}
          <text x="150" y="493" text-anchor="middle" class="small">{t('Keep every audio arrival time', '记录每个声音块的到达时刻')}</text>
          <text x="150" y="521" text-anchor="middle" class="small">{t('to find this gap in a real run.', '就能在实测中找出空档。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed times · 800 ms from Ch. 20' : 'Constructed arrival times; the 800 ms chunk follows Learning SGLang Ch. 20.', phone ? '构造时刻 · 800 ms 见第 20 章' : '构造到达时刻；800 ms chunk 见 Learning SGLang 第 20 章。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Put the hand-off in a log' : 'A trace puts every hand-off in a log', phone ? '把交接写进日志' : 'trace 把每次交接写进日志')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('trace = timestamped records of runtime events', 'trace = 带时间戳的运行事件记录')}</text>
        <text x={phone ? 18 : 36} y="79" class="code">SGLANG_OMNI_COMM_TRACE=1</text>
        {#if !phone}
          <rect x="25" y="108" width="310" height="205" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="45" y="139" class="code strong">comm_send_enqueue</text>
          <text x="45" y="174" class="small">request_id: {STREAM_TRACE_REQUEST_ID} · chunk_id: {STREAM_TRACE_CHUNK_ID}</text>
          <text x="45" y="202" class="small">talker_ar → code2wav</text>
          <text x="45" y="230" class="small">transport: torch_cuda_ipc</text>
          <text x="45" y="270" class="code">elapsed_ms: {'<operation>'}</text>
          <rect x="385" y="108" width="310" height="205" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="405" y="139" class="code strong">comm_stream_read</text>
          <text x="405" y="174" class="small">object_id: {STREAM_TRACE_OBJECT_ID}</text>
          <text x="405" y="202" class="small">transport: torch_cuda_ipc</text>
          <text x="405" y="230" class="small">bytes: {'<buffer size>'}</text>
          <text x="405" y="270" class="code">elapsed_ms: {'<read>'}</text>
          <rect x="25" y="342" width="670" height="91" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="45" y="371" class="code">ts_ns = time.time_ns()  ·  {t('event time', '事件时刻')}</text>
          <text x="45" y="405" class="code">elapsed_ms = (perf_counter_ns() − start) ÷ 1,000,000</text>
        {:else}
          <rect x="20" y="103" width="260" height="172" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="133" class="code strong">comm_send_enqueue</text>
          <text x="34" y="166" class="small">request: {STREAM_TRACE_REQUEST_ID} · chunk: {STREAM_TRACE_CHUNK_ID}</text>
          <text x="34" y="194" class="small">talker_ar → code2wav</text>
          <text x="34" y="222" class="small">torch_cuda_ipc</text>
          <text x="34" y="253" class="code">elapsed_ms: {'<operation>'}</text>
          <rect x="20" y="295" width="260" height="147" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="325" class="code strong">comm_stream_read</text>
          <text x="34" y="358" class="small">object: {STREAM_TRACE_OBJECT_ID}</text>
          <text x="34" y="386" class="small">bytes: {'<buffer size>'}</text>
          <text x="34" y="417" class="code">elapsed_ms: {'<read>'}</text>
          <rect x="20" y="465" width="260" height="143" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="494" class="code">ts_ns = time.time_ns()</text>
          <text x="34" y="522" class="small">{t('event timestamp', '事件时间戳')}</text>
          <text x="34" y="554" class="code">elapsed_ms =</text>
          <text x="34" y="580" class="code">(perf_counter_ns() − start)</text>
          <text x="34" y="601" class="code">÷ 1,000,000</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed fields · trace off by default' : 'Constructed identifiers; tracing is off unless the environment switch enables it.', phone ? '构造字段 · trace 默认关闭' : '构造标识符；环境开关未打开时，trace 默认关闭。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Two timers in one record' : 'One CUDA IPC record holds two timers', phone ? '一条记录里的两个计时' : '一条 CUDA IPC 记录包含两种计时')}</text>
        <text x={phone ? 18 : 36} y="55" class="code">cuda_ipc_get_wait_copy</text>
        <text x={phone ? 18 : 36} y="80" class="label">{t(phone ? 'host = CPU side · event = GPU marks' : 'host = CPU-side wait · GPU event = start and done marks on the GPU', phone ? 'host = CPU 侧 · event = GPU 标记' : 'host = CPU 侧等待 · GPU event = GPU 上的起止标记')}</text>
        <text x={phone ? 18 : 36} y="104" class="label">{t('blue = GPU event · orange = rest of host wait', '蓝 = GPU event · 橙 = 其余 host 等待')}</text>
        {#if !phone}
          <rect x="55" y="135" width="610" height="112" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="75" y="166" class="small strong">elapsed_ms = {STREAM_TRACE_HOST_WAIT_MS.toFixed(1)} · {t('whole host wait', 'host 全程等待')}</text>
          <rect x="75" y="187" width={STREAM_TRACE_GPU_EVENT_MS * 40} height="38" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={75 + STREAM_TRACE_GPU_EVENT_MS * 40} y="187" width={STREAM_TRACE_HOST_REST_MS * 40} height="38" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={75 + STREAM_TRACE_GPU_EVENT_MS * 20} y="212" text-anchor="middle" class="small strong">GPU {STREAM_TRACE_GPU_EVENT_MS} ms</text>
          <text x={75 + STREAM_TRACE_GPU_EVENT_MS * 40 + STREAM_TRACE_HOST_REST_MS * 20} y="212" text-anchor="middle" class="small strong">host rest {STREAM_TRACE_HOST_REST_MS} ms</text>
          <text x="55" y="290" class="code">receiver_gpu_wait_copy_ms = {STREAM_TRACE_GPU_EVENT_MS.toFixed(1)}</text>
          <text x="55" y="330" class="code">host_minus_receiver_gpu_ms = {STREAM_TRACE_HOST_REST_MS.toFixed(1)}</text>
          <text x="360" y="374" text-anchor="middle" class="result">{STREAM_TRACE_HOST_WAIT_MS} − {STREAM_TRACE_GPU_EVENT_MS} = {STREAM_TRACE_HOST_REST_MS} ms</text>
          <text x="360" y="414" text-anchor="middle" class="small strong">{t(`The ${STREAM_TRACE_HOST_REST_MS} ms difference is not proof of ${STREAM_TRACE_HOST_REST_MS} ms spent computing.`, `${STREAM_TRACE_HOST_REST_MS} ms 差额不能证明 CPU 计算了 ${STREAM_TRACE_HOST_REST_MS} ms。`)}</text>
        {:else}
          <rect x="20" y="130" width="260" height="150" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="158" class="small strong">elapsed = {STREAM_TRACE_HOST_WAIT_MS.toFixed(1)} ms</text>
          <rect x="34" y="181" width={STREAM_TRACE_GPU_EVENT_MS * 18} height="40" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={34 + STREAM_TRACE_GPU_EVENT_MS * 18} y="181" width={STREAM_TRACE_HOST_REST_MS * 18} height="40" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={34 + STREAM_TRACE_GPU_EVENT_MS * 9} y="206" text-anchor="middle" class="small strong">GPU {STREAM_TRACE_GPU_EVENT_MS}</text>
          <text x={34 + STREAM_TRACE_GPU_EVENT_MS * 18 + STREAM_TRACE_HOST_REST_MS * 9} y="206" text-anchor="middle" class="small strong">rest {STREAM_TRACE_HOST_REST_MS}</text>
          <text x="34" y="254" class="small">{t('whole host wait', 'host 全程等待')}</text>
          <text x="20" y="321" class="code">receiver_gpu_wait_copy_ms</text>
          <text x="20" y="347" class="result">= {STREAM_TRACE_GPU_EVENT_MS.toFixed(1)}</text>
          <text x="20" y="390" class="code">host_minus_receiver_gpu_ms</text>
          <text x="20" y="416" class="result">= {STREAM_TRACE_HOST_REST_MS.toFixed(1)}</text>
          <text x="150" y="465" text-anchor="middle" class="result">{STREAM_TRACE_HOST_WAIT_MS} − {STREAM_TRACE_GPU_EVENT_MS} = {STREAM_TRACE_HOST_REST_MS} ms</text>
          <text x="150" y="510" text-anchor="middle" class="small strong">{t('The difference is not CPU compute time.', '差额不等于 CPU 计算时间。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed timing record, not captured output.', '构造的计时记录，不是抓取的日志。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Change one switch only' : 'A fair A/B changes one switch only', phone ? '只改一个开关' : '公平 A/B 只改一个开关')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? `partial-start = talker starts after ${STREAM_PARTIAL_START_MIN_CHUNKS} chunks` : `partial-start = start the talker after ${STREAM_PARTIAL_START_MIN_CHUNKS} thinker chunks, not the whole input`, `partial-start = ${STREAM_PARTIAL_START_MIN_CHUNKS} 个 thinker chunk 后就启动 talker`)}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('warmup = uncounted runs that absorb cold work', '预热 = 不计入结果，用来吸收冷启动工作')}</text>
        {#if !phone}
          <rect x="25" y="108" width="320" height="190" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="45" y="139" class="small strong">A · BASELINE</text>
          <text x="45" y="171" class="code">--no-enable-partial-start</text>
          <rect x="45" y="196" width="130" height="48" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="110" y="226" text-anchor="middle" class="small">{t('whole input', '完整输入')}</text>
          <line x1="180" y1="220" x2="228" y2="220" stroke="var(--accent)" stroke-width="3" marker-end="url(#measure-arrow)" />
          <text x="240" y="226" class="small">talker</text>
          <rect x="375" y="108" width="320" height="190" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="395" y="139" class="small strong">B · PARTIAL5</text>
          <text x="395" y="158" class="code">--enable-partial-start</text>
          <text x="395" y="180" class="code">--partial-start-min-chunks {STREAM_PARTIAL_START_MIN_CHUNKS}</text>
          <rect x="395" y="196" width="130" height="48" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="460" y="226" text-anchor="middle" class="small">{STREAM_PARTIAL_START_MIN_CHUNKS} {t('chunks', '个 chunk')}</text>
          <line x1="530" y1="220" x2="578" y2="220" stroke="var(--gen)" stroke-width="3" marker-end="url(#measure-arrow-gen)" />
          <text x="590" y="226" class="small">talker</text>
          <rect x="25" y="326" width="670" height="129" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="45" y="355" class="small strong">{t('KEEP IDENTICAL', '保持不变')}</text>
          <text x="45" y="383" class="small">short + medium prompts · seed {STREAM_BENCH_SEED} · max_tokens {STREAM_BENCH_MAX_TOKENS} · {t('same server', '同一服务配置')}</text>
          <text x="45" y="414" class="result">{STREAM_BENCH_PROMPT_COUNT} × {STREAM_BENCH_WARMUP_PER_PROMPT} = {STREAM_BENCH_WARMUP_PER_LABEL} {t('warmups excluded', '次预热剔除')}</text>
          <text x="45" y="442" class="result">{STREAM_BENCH_PROMPT_COUNT} × {STREAM_BENCH_REPEATS_PER_PROMPT} = {STREAM_BENCH_KEPT_PER_LABEL} {t('runs kept per label', '次结果保留 / 标签')}</text>
        {:else}
          <rect x="20" y="101" width="260" height="144" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="130" class="small strong">A · BASELINE</text>
          <text x="34" y="158" class="code">--no-enable-partial-start</text>
          <text x="34" y="193" class="small">{t('whole input', '完整输入')} → talker</text>
          <text x="34" y="222" class="small">{t('blue = unchanged work', '蓝 = 不变的工作')}</text>
          <rect x="20" y="265" width="260" height="157" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="294" class="small strong">B · PARTIAL5</text>
          <text x="34" y="322" class="code">--enable-partial-start</text>
          <text x="34" y="346" class="code">--partial-start-min-chunks {STREAM_PARTIAL_START_MIN_CHUNKS}</text>
          <text x="34" y="384" class="small">{STREAM_PARTIAL_START_MIN_CHUNKS} {t('chunks', '个 chunk')} → talker</text>
          <text x="34" y="409" class="small">{t('orange = changed setting', '橙 = 改动的设置')}</text>
          <rect x="20" y="442" width="260" height="192" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="470" class="small strong">{t('KEEP IDENTICAL', '保持不变')}</text>
          <text x="34" y="497" class="small">short + medium · seed {STREAM_BENCH_SEED}</text>
          <text x="34" y="523" class="small">max_tokens {STREAM_BENCH_MAX_TOKENS} · {t('same server', '同一服务配置')}</text>
          <text x="34" y="557" class="result">{STREAM_BENCH_PROMPT_COUNT}×{STREAM_BENCH_WARMUP_PER_PROMPT}={STREAM_BENCH_WARMUP_PER_LABEL} {t('warmups excluded', '次预热剔除')}</text>
          <text x="34" y="587" class="result">{STREAM_BENCH_PROMPT_COUNT}×{STREAM_BENCH_REPEATS_PER_PROMPT}={STREAM_BENCH_KEPT_PER_LABEL} {t('kept / label', '次保留 / 标签')}</text>
          <text x="34" y="617" class="small">{t('5 measured runs per prompt', '每个 prompt 实测 5 次')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Benchmark protocol · no result claimed' : 'Protocol from the shipped benchmark; no result claimed here.', phone ? 'benchmark 协议 · 不声称结果' : '协议来自随仓库发布的 benchmark；本步不声称性能结果。')}</text>
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
