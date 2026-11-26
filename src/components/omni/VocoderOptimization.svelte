<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    OPT_VOCODER_CHUNK_MS,
    VOC_LEFT_CONTEXT_FRAMES,
    VOC_NEW_FRAMES,
    VOC_STATELESS_INPUT_FRAMES,
    VOC_BATCH_REQUEST_COUNT,
    VOC_BATCH_CALLS_BEFORE,
    VOC_BATCH_CALLS_AFTER,
    VOC_STATE_FIRST_MAIN_US,
    VOC_STATE_FIRST_SLOT_US,
    VOC_STATE_LATER_MAIN_US,
    VOC_STATE_LATER_SLOT_US,
    VOC_STATE_FIRST_CHANGE_PERCENT,
    VOC_STATE_LATER_REDUCTION_PERCENT,
    VOC_GRAPH_CONCURRENCY,
    VOC_GRAPH_CONTROL_QPS,
    VOC_GRAPH_REPLAY_QPS,
    VOC_GRAPH_MEAN_QPS_GAIN_PERCENT,
    VOC_FISH_CODEBOOK_ROWS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A stateless later window decodes 25 old frames plus 10 new ones. It emits only the 10 new frames.',
    captionZh: '无状态后续窗口要算 25 帧旧内容和 10 帧新内容。它只输出那 10 帧新内容。',
  }, {
    caption: 'Three matching windows share one model call. Each request still gets its own sound chunk.',
    captionZh: '三个匹配窗口共用一次模型调用。每个请求仍拿到自己的声音 chunk。',
  }, {
    caption: 'A codec-state slot keeps decoder work between windows. The next window reads only 10 new frames.',
    captionZh: 'codec-state slot 保存窗口之间的解码工作。下个窗口只读 10 帧新内容。',
  }, {
    caption: 'In PR #2909’s eight-row test, later windows got faster. First windows got slower because they also wrote state.',
    captionZh: 'PR #2909 的 8 行测试里，后续窗口更快。首个窗口还要写入状态，所以更慢。',
  }, {
    caption: 'Each exact shape needs its own graph. A missing key falls back to eager execution.',
    captionZh: '每种精确形状需要自己的 graph。找不到匹配 key 就回退 eager。',
  }, {
    caption: 'PR #1101’s H200 c16 test compared eager and graph replay. Mean throughput rose about 10.4%.',
    captionZh: 'PR #1101 的 H200 c16 测试对照 eager 和 graph replay。平均吞吐提升约 10.4%。',
  }, {
    caption: 'The three mechanisms do different jobs. Each model implements them at different boundaries.',
    captionZh: '三种机制分工不同。每个模型的实现边界不同。',
  }, {
    caption: 'Fish’s vocoder needs ten codebook entries per audio frame. Which generation loops choose them?',
    captionZh: 'Fish 的 vocoder 每帧需要十个 codebook 条目。哪些生成循环选出它们？',
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
  const fmt = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [790, 850, 850, 740, 800, 650, 730, 740][step] : [570, 630, 640, 570, 640, 570, 560, 600][step]);
  const roadmap = $derived([
    { title: 'ready windows', body: 'decode them together', titleZh: '准备好的窗口', bodyZh: '放在一起解码' },
    { title: 'earlier decoder work', body: 'keep it for next time', titleZh: '之前算过的内容', bodyZh: '留给下个窗口' },
    { title: 'recorded kernels', body: 'replay the same shape', titleZh: '录下的 kernels', bodyZh: '重放相同形状' },
  ]);
  const modelRows = $derived([
    { name: 'Qwen3-Omni', batch: 'ready windows', kept: 'codec-state slots', graph: 'exact Code2Wav shapes', batchZh: '准备好的窗口', keptZh: 'codec-state slots', graphZh: '精确 Code2Wav 形状' },
    { name: 'MiniCPM-o · full duplex', batch: 'next chunk per session', kept: 'saved decoder work', graph: 'one chunk-making loop', batchZh: '每个 session 的下个 chunk', keptZh: '已存的解码工作', graphZh: '一个生成 chunk 的循环' },
    { name: 'Fish S2 Pro', batch: 'completed requests only', kept: 'old code frames only', graph: 'not connected here', batchZh: '只 batch 已完成请求', keptZh: '只保留旧 code frames', graphZh: '这里没有接入' },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="voc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One stateless window' : 'One stateless later window repeats earlier work', phone ? '一个无状态窗口' : '无状态后续窗口重复计算旧内容')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'vocoder = frames → sound · blue = new' : 'vocoder = codec frames → sound · blue = new frames', phone ? 'vocoder = frames → 声音 · 蓝 = 新帧' : 'vocoder = codec frames → 声音 · 蓝 = 新帧')}</text>
        {#if !phone}
          <rect x="30" y="88" width="660" height="224" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="115" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="48" y="137" width="360" height="67" rx="8" fill="white" stroke="var(--faint)" />
          <text x="228" y="165" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="228" y="188" text-anchor="middle" class="small">{t('decoded again · not emitted again', '再次解码 · 不再次输出')}</text>
          <rect x="416" y="137" width="144" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="488" y="165" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="488" y="188" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="304" y="231" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <line x1="570" y1="170" x2="595" y2="170" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="603" y="137" width="70" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="638" y="176" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="638" y1="205" x2="638" y2="231" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="500" y="239" width="173" height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="586" y="261" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="586" y="281" text-anchor="middle" class="small">= {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="30" y="346" class="small strong">{t('THIS CHAPTER · THREE WAYS TO CHANGE THE WORK', '本章地图 · 三种改变工作的方式')}</text>
          {#each roadmap as item, i}
            {@const x = 30 + i * 225}
            <rect x={x} y="368" width="210" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y="395" class="result">{i + 1}</text>
            <text x={x + 15} y="425" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 15} y="454" class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {:else}
          <rect x="18" y="86" width="264" height="344" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="112" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="32" y="130" width="236" height="69" rx="8" fill="white" stroke="var(--faint)" />
          <text x="150" y="157" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="150" y="181" text-anchor="middle" class="small">{t('decoded again · not emitted', '再次解码 · 不再次输出')}</text>
          <rect x="32" y="209" width="236" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="237" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="150" y="260" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="150" y="304" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <rect x="32" y="323" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="350" text-anchor="middle" class="small strong">vocoder</text>
          <rect x="32" y="375" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="401" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')} = {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="18" y="466" class="small strong">{t('THIS CHAPTER · THREE CHANGES', '本章地图 · 三种改变')}</text>
          {#each roadmap as item, i}
            {@const y = 486 + i * 86}
            <rect x="18" y={y} width="264" height="73" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 24} class="result">{i + 1}</text>
            <text x="59" y={y + 24} class="small strong">{t(item.title, item.titleZh)}</text>
            <text x="59" y={y + 51} class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Qwen3-Omni · 10 new frames = 800 ms playback' : 'Qwen3-Omni stateless window; 800 ms is playback time, not compute time.', phone ? 'Qwen3-Omni · 10 帧新内容 = 800 ms 播放' : 'Qwen3-Omni 无状态窗口；800 ms 是播放时长，不是计算耗时。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Batch matching windows · 1 of 3', '合并匹配窗口 · 1 / 3')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'this match = same length and window kind' : 'this example matches frame count and window kind', phone ? '本例匹配 = 长度和窗口类型相同' : '本例匹配窗口的帧数和窗口类型')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('B = requests per call · T = frames per request', 'B = 每次调用的请求数 · T = 每请求的帧数')}</text>
        {#each [false, true] as shared}
          {@const x = phone ? 18 : shared ? 375 : 30}
          {@const y = phone ? shared ? 465 : 102 : 102}
          {@const pw = phone ? 264 : 315}
          {@const ph = phone ? 340 : 405}
          <rect x={x} y={y} width={pw} height={ph} rx="12" fill="var(--bg)" stroke={shared ? 'var(--accent)' : 'var(--line)'} />
          <text x={x + 15} y={y + 27} class="small strong">{shared ? t('ONE SHARED CALL', '一次共享调用') : t('THREE SEPARATE CALLS', '三次独立调用')}</text>
          <text x={x + 15} y={y + 51} class="small">{VOC_BATCH_REQUEST_COUNT} {t('first windows · 10 new frames each', '个首个窗口 · 各 10 帧新内容')}</text>
          {#if shared}
            <rect x={x + 91} y={y + 75} width={pw - 108} height="194" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={x + 107} y={y + 98} class="code">[B=3, T=10]</text>
          {/if}
          {#each ['A', 'B', 'C'] as id, i}
            {@const ry = y + 77 + i * 65}
            <text x={x + 15} y={ry + 23} class="small strong">{id}</text>
            <line x1={x + 37} y1={ry + 19} x2={x + 78} y2={ry + 19} stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
            {#if !shared}
              <rect x={x + 91} y={ry} width={pw - 108} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 102} y={ry + 18} class="code">[B=1, T=10]</text>
              <text x={x + 102} y={ry + 35} class="small">→ {id} {t('sound', '声音')}</text>
            {:else}
              <text x={x + 107} y={ry + 42} class="small">→ {id} {t('sound', '声音')}</text>
            {/if}
          {/each}
          <text x={x + 15} y={y + 302} class="result">{t('model calls', '模型调用')} = {shared ? VOC_BATCH_CALLS_AFTER : VOC_BATCH_CALLS_BEFORE}</text>
          <text x={x + 15} y={y + 331} class="small strong">{t('sound chunks', '声音 chunks')} = {VOC_BATCH_REQUEST_COUNT}</text>
          {#if !phone}
            <text x={x + 15} y={y + 370} class="small">{shared ? t('three rows inside one call', '一次调用里的三行') : t('one row inside each call', '每次调用里的一行')}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="548" text-anchor="middle" class="result">{VOC_BATCH_CALLS_BEFORE} {t('calls', '次调用')} → {VOC_BATCH_CALLS_AFTER} {t('call', '次调用')} · {VOC_BATCH_REQUEST_COUNT} {t('separate outputs', '份独立输出')}</text>
          <text x="360" y="582" text-anchor="middle" class="small">{t('Batching changes the call boundary, not who owns each output.', 'batching 改变调用边界，不改变每份输出的归属。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed shapes · real groups check more fields' : 'Constructed shapes; real groups also check whether each request uses saved decoder work.', phone ? '构造形状 · 真实分组还检查其他字段' : '构造形状；真实分组还检查每个请求是否使用已存解码工作。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Keep decoder work · 2 of 3 · 1/2' : 'Keep decoder work between windows · 2 of 3 · 1/2', phone ? '保留解码工作 · 2 / 3 · 1/2' : '在窗口之间保留解码工作 · 2 / 3 · 1/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'slot = one request’s saved decoder work' : 'codec-state slot = one request’s saved decoder work', phone ? 'slot = 一个请求已存的解码工作' : 'codec-state slot = 一个请求已存的解码工作')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue new · orange saved · grey repeated' : 'blue = new frames · orange = saved work · grey = old frames decoded again', phone ? '蓝新帧 · 橙已存 · 灰重算' : '蓝 = 新帧 · 橙 = 已存工作 · 灰 = 再次解码的旧帧')}</text>
        {#each [false, true] as slot}
          {@const x = phone ? 18 : slot ? 375 : 30}
          {@const y = phone ? slot ? 465 : 102 : 102}
          {@const pw = phone ? 264 : 315}
          {@const ph = phone ? 340 : 405}
          <rect x={x} y={y} width={pw} height={ph} rx="12" fill="var(--bg)" stroke={slot ? 'var(--gen)' : 'var(--line)'} />
          <text x={x + 15} y={y + 28} class="small strong">{slot ? t('WITH A SLOT', '使用 SLOT') : t('WITHOUT A SLOT', '不用 SLOT')}</text>
          <text x={x + 15} y={y + 52} class="small">{t('the same later window', '同一个后续窗口')}</text>
          <rect x={x + 15} y={y + 76} width="132" height="80" rx="8" fill={slot ? 'var(--gen-soft)' : 'white'} stroke={slot ? 'var(--gen)' : 'var(--faint)'} />
          <text x={x + 81} y={y + 107} text-anchor="middle" class="result">{slot ? t('saved work', '已存工作') : `${VOC_LEFT_CONTEXT_FRAMES} ${t('old frames', '帧旧内容')}`}</text>
          <text x={x + 81} y={y + 135} text-anchor="middle" class="small">{slot ? t('read from the slot', '从 slot 读取') : t('decode again', '再次解码')}</text>
          <rect x={x + 155} y={y + 76} width={pw - 170} height="80" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 155 + (pw - 170) / 2} y={y + 107} text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new', '帧新内容')}</text>
          <text x={x + 155 + (pw - 170) / 2} y={y + 135} text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <line x1={x + pw / 2} y1={y + 158} x2={x + pw / 2} y2={y + 183} stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x={x + 45} y={y + 191} width={pw - 90} height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + pw / 2} y={y + 221} text-anchor="middle" class="small strong">vocoder</text>
          <rect x={x + 45} y={y + 255} width={pw - 90} height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + pw / 2} y={y + 283} text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames out', '帧新内容输出')}</text>
          <text x={x + 15} y={y + 330} class="result">{t('input', '输入')} = {slot ? VOC_NEW_FRAMES : VOC_STATELESS_INPUT_FRAMES} {t('frames', '帧')}</text>
          {#if !phone}
            <text x={x + 15} y={y + 370} class="small">{slot ? t('the slot supplies earlier context', 'slot 提供旧上下文') : `${VOC_LEFT_CONTEXT_FRAMES} + ${VOC_NEW_FRAMES} = ${VOC_STATELESS_INPUT_FRAMES}`}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="548" text-anchor="middle" class="result">{VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')} → {VOC_NEW_FRAMES} {t('input frames', '帧输入')} · {VOC_NEW_FRAMES} {t('emitted in both', '两种都输出 10 帧')}</text>
          <text x="360" y="583" text-anchor="middle" class="small">{t('The slot replaces repeated decoding with saved decoder work.', 'slot 用已存解码工作替代重复解码。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Frame counts, not latency · first window writes state' : 'Input-frame counts, not latency. The first window writes the slot; no free slot keeps the stateless path.', phone ? '帧数不是耗时 · 首个窗口写入状态' : '输入帧数不是耗时。首个窗口写入 slot；没有空 slot 就走无状态路径。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Measure the slot · 2 of 3 · 2/2', '测量 slot · 2 / 3 · 2/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? '8 rows · median = mean of sorted #10 and #11' : '8 rows · 20 timings · median averages sorted values 10 and 11', phone ? '8 行 · 20 次排序计时 · 第 10、11 个取均值' : '每次调用 8 行 · 20 次计时 · 排序后第 10、11 个取均值')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue stateless · orange slot · one scale' : 'blue = stateless · orange = slot-backed · one shared scale', phone ? '蓝无状态 · 橙 slot · 同比例' : '蓝 = 无状态 · 橙 = 使用 slot · 同一比例')}</text>
        {#each [true, false] as first}
          {@const main = first ? VOC_STATE_FIRST_MAIN_US : VOC_STATE_LATER_MAIN_US}
          {@const kept = first ? VOC_STATE_FIRST_SLOT_US : VOC_STATE_LATER_SLOT_US}
          {@const x = phone ? 18 : first ? 30 : 375}
          {@const y = phone ? first ? 102 : 374 : 102}
          {@const pw = phone ? 264 : 315}
          {@const bw = phone ? 125 : 175}
          <rect x={x} y={y} width={pw} height="260" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 15} y={y + 28} class="small strong">{first ? t('FIRST WINDOW', '首个窗口') : t('LATER WINDOW', '后续窗口')}</text>
          <text x={x + 15} y={y + 52} class="small">{first ? t('10 frames + write state', '10 帧 + 写入状态') : t('35 frames → 10 frames', '35 帧 → 10 帧')}</text>
          <text x={x + 15} y={y + 80} class="small">{t('stateless', '无状态')}</text>
          <rect x={x + 15} y={y + 89} width={bw * main / VOC_STATE_LATER_MAIN_US} height="27" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 27 + bw} y={y + 109} class="result">{fmt(main)} µs</text>
          <text x={x + 15} y={y + 145} class="small">{t('slot-backed', '使用 slot')}</text>
          <rect x={x + 15} y={y + 154} width={bw * kept / VOC_STATE_LATER_MAIN_US} height="27" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={x + 27 + bw} y={y + 174} class="result">{fmt(kept)} µs</text>
          <text x={x + 15} y={y + 229} class="result">{first ? '+' : '−'}{fmt(first ? VOC_STATE_FIRST_CHANGE_PERCENT : VOC_STATE_LATER_REDUCTION_PERCENT)}% {t('time', '耗时')}</text>
        {/each}
        <text x={W / 2} y={phone ? 674 : 444} text-anchor="middle" class="small strong">{t(phone ? 'Both replay one CUDA graph' : 'Both sides replay one CUDA graph; only the window path changes.', phone ? '两边都重放一次 CUDA graph' : '两边都重放一次 CUDA graph；只有窗口路径不同。')}</text>
        <text x={W / 2} y={phone ? 700 : 478} text-anchor="middle" class="small">{t(phone ? 'Window GPU time, not request latency' : 'These are window GPU times, not whole-request latency.', phone ? '窗口 GPU 耗时，不是请求延迟' : '这些是窗口 GPU 耗时，不是整个请求的延迟。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'PR #2909 · Qwen3-Omni BF16 · H200' : 'Public PR #2909 · Qwen3-Omni colocated BF16 on H200 · median of 20 graph replays.', phone ? 'PR #2909 · Qwen3-Omni BF16 · H200' : '公开 PR #2909 · Qwen3-Omni 同卡 BF16 · H200 · 20 次 graph 重放取中位数。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Replay an exact shape · 3 of 3 · 1/2', '重放精确形状 · 3 / 3 · 1/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('graph key = B + T + window kind', 'graph key = B + T + 窗口类型')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('B = requests · T = frames', 'B = 请求数 · T = 帧数')}</text>
        <text x={phone ? 18 : 30} y="103" class="label">{t(phone ? 'window = stateless · first = slot first' : 'kind: window = stateless · first = slot-backed first · next = slot-backed later', phone ? 'window = 无状态 · first = slot 首个' : '类型：window = 无状态 · first = slot 首个 · next = slot 后续')}</text>
        {#if phone}
          <text x="18" y="127" class="label">next = slot {t('later', '后续')}</text>
        {/if}
        {#if !phone}
          <rect x="30" y="125" width="660" height="91" rx="11" fill="var(--bg)" stroke="var(--gen)" />
          <text x="48" y="151" class="small strong">{t('EXAMPLE CATALOGUE · ONE CAPTURED GRAPH', '示例目录 · 一张已 capture 的 graph')}</text>
          <rect x="230" y="163" width="260" height="37" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="187" text-anchor="middle" class="code">B=3 · T=10 · kind=first</text>
          {#each [{ id: 'A', b: 3 }, { id: 'B', b: 2 }] as call, i}
            {@const y = 242 + i * 120}
            {@const hit = call.b === 3}
            <rect x="30" y={y} width="660" height="99" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="48" y={y + 29} class="small strong">{t('incoming call', 'incoming 调用')} {call.id}</text>
            <text x="48" y={y + 65} class="code">B={call.b} · T=10 · kind=first</text>
            <text x="350" y={y + 29} class="small strong">{hit ? t('exact key found', '找到完全匹配的 key') : t('no matching key here', '此目录没有匹配 key')}</text>
            <text x="350" y={y + 61} class="small">{hit ? t('same B, T and kind', 'B、T、类型都相同') : t('B changes 3 → 2', 'B 从 3 变成 2')}</text>
            <rect x="550" y={y + 20} width="120" height="59" rx="8" fill={hit ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={hit ? 'var(--gen)' : 'var(--accent)'} />
            <text x="610" y={y + 56} text-anchor="middle" class="small strong">{hit ? 'REPLAY' : 'EAGER'}</text>
          {/each}
          <text x="360" y="513" text-anchor="middle" class="result">{t('same key', '相同 key')} → REPLAY · {t('missing key', '缺少 key')} → EAGER</text>
          <text x="360" y="548" text-anchor="middle" class="small">{t('The graph records launches; the key decides whether replay fits.', 'graph 录下 launches；key 决定能否重放。')}</text>
        {:else}
          <rect x="18" y="148" width="264" height="122" rx="11" fill="var(--bg)" stroke="var(--gen)" />
          <text x="32" y="174" class="small strong">{t('CATALOGUE · ONE GRAPH', '目录 · 一张 graph')}</text>
          <rect x="32" y="192" width="236" height="56" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="226" text-anchor="middle" class="code">B=3 · T=10 · kind=first</text>
          {#each [{ id: 'A', b: 3 }, { id: 'B', b: 2 }] as call, i}
            {@const y = 294 + i * 157}
            {@const hit = call.b === 3}
            <rect x="18" y={y} width="264" height="139" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 25} class="small strong">{t('incoming', 'incoming')} {call.id} · {hit ? t('key found', '找到 key') : t('no key here', '此目录无 key')}</text>
            <text x="32" y={y + 54} class="code">B={call.b} · T=10 · kind=first</text>
            <text x="32" y={y + 82} class="small">{hit ? t('same B, T and kind', 'B、T、类型都相同') : t('B changes 3 → 2', 'B 从 3 变成 2')}</text>
            <rect x="32" y={y + 96} width="236" height="29" rx="6" fill={hit ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={hit ? 'var(--gen)' : 'var(--accent)'} />
            <text x="150" y={y + 116} text-anchor="middle" class="small strong">{hit ? 'REPLAY' : 'EAGER'}</text>
          {/each}
          <text x="150" y="633" text-anchor="middle" class="result">{t('same key', '相同 key')} → REPLAY</text>
          <text x="150" y="664" text-anchor="middle" class="result">{t('missing key', '缺少 key')} → EAGER</text>
          <text x="150" y="701" text-anchor="middle" class="small">{t('The key decides whether replay fits.', 'key 决定能否重放。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed one-key catalogue · other keys may exist' : 'Constructed one-key catalogue; other captured keys may exist. A missing key runs eagerly.', phone ? '构造的单 key 目录 · 其他 key 可能存在' : '构造的单 key 目录；其他已 capture key 可能存在，缺少匹配 key 时 eager 运行。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Measure graph replay · 3 of 3 · 2/2', '测量 graph replay · 3 / 3 · 2/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">c{VOC_GRAPH_CONCURRENCY} = {VOC_GRAPH_CONCURRENCY} {t('requests running concurrently', '个请求同时运行')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue eager · orange graph · one scale' : 'blue = eager control · orange = graph replay · one shared scale', phone ? '蓝 eager · 橙 graph · 同比例' : '蓝 = eager 对照 · 橙 = graph replay · 同一比例')}</text>
        <rect x={phone ? 18 : 30} y="108" width={phone ? 264 : 660} height={phone ? 319 : 319} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={phone ? 32 : 48} y="137" class="small strong">{t(phone ? 'MEAN QPS' : 'MEAN THROUGHPUT · REQUESTS PER SECOND', phone ? '平均 QPS' : '平均吞吐 · 每秒请求数')}</text>
        <text x={phone ? 32 : 48} y="181" class="small strong">{t('eager control', 'eager 对照')}</text>
        <rect x={phone ? 32 : 180} y="198" width={(phone ? 155 : 390) * VOC_GRAPH_CONTROL_QPS / 0.7} height="45" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 264 : 660} y="227" text-anchor="end" class="result">{VOC_GRAPH_CONTROL_QPS.toFixed(3)}</text>
        <text x={phone ? 32 : 48} y="287" class="small strong">graph replay</text>
        <rect x={phone ? 32 : 180} y="304" width={(phone ? 155 : 390) * VOC_GRAPH_REPLAY_QPS / 0.7} height="45" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={phone ? 264 : 660} y="333" text-anchor="end" class="result">{VOC_GRAPH_REPLAY_QPS.toFixed(3)}</text>
        <text x={W / 2} y="392" text-anchor="middle" class="result">0 → 0.7 {t(phone ? 'requests/s · one axis' : 'requests/s · identical axis for both bars', phone ? 'requests/s · 同轴' : 'requests/s · 两根横条同一坐标轴')}</text>
        <text x={W / 2} y={phone ? 470 : 459} text-anchor="middle" class="result">({VOC_GRAPH_REPLAY_QPS.toFixed(3)} ÷ {VOC_GRAPH_CONTROL_QPS.toFixed(3)} − 1) × 100 = {fmt(VOC_GRAPH_MEAN_QPS_GAIN_PERCENT)}%</text>
        <text x={W / 2} y={phone ? 505 : 495} text-anchor="middle" class="small strong">{t('Mean QPS derived from the two displayed means.', '由展示的两个平均 QPS 推导。')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'PR #1101 · H200 BF16 · 128 requests per arm' : 'Historical PR #1101 · H200 BF16 · 128 measured requests per arm · two paired rounds.', phone ? 'PR #1101 · H200 BF16 · 每方案 128 请求' : '历史 PR #1101 · H200 BF16 · 每方案 128 个测量请求 · 两轮成对对照。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Talker cap 800 tokens · not a universal gain' : 'Talker capped at 800 tokens; matched audio work stayed within 0.076%. Not a universal speedup.', phone ? 'Talker 上限 800 token · 不是通用收益' : 'Talker 上限 800 token；匹配音频工作量相差不超过 0.076%。不是通用加速比。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Different vocoder paths' : 'Same goals, different implementations', phone ? '不同 vocoder 路径' : '目标相近，实现不同')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'The Qwen steps do not describe every vocoder' : 'The Qwen examples do not describe every model’s vocoder path', phone ? 'Qwen 步骤不适用于所有 vocoder' : 'Qwen 示例并不描述每个模型的 vocoder 路径')}</text>
        {#each modelRows as model, i}
          {@const x = phone ? 18 : 30 + i * 225}
          {@const y = phone ? 102 + i * 158 : 102}
          {@const pw = phone ? 264 : 210}
          <rect x={x} y={y} width={pw} height={phone ? 140 : 230} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 15} y={y + 29} class="small strong">{model.name}</text>
          {#if !phone}
            <text x={x + 15} y={y + 68} class="small strong">BATCH</text>
            <text x={x + 15} y={y + 94} class="small">{t(model.batch, model.batchZh)}</text>
            <text x={x + 15} y={y + 132} class="small strong">{t('KEEP BETWEEN WINDOWS', '窗口之间保留')}</text>
            <text x={x + 15} y={y + 158} class="small">{t(model.kept, model.keptZh)}</text>
            <text x={x + 15} y={y + 194} class="small strong">GRAPH</text>
            <text x={x + 15} y={y + 218} class="small">{t(model.graph, model.graphZh)}</text>
          {:else}
            <text x={x + 15} y={y + 57} class="small">BATCH · {t(model.batch, model.batchZh)}</text>
            <text x={x + 15} y={y + 86} class="small">KEEP · {t(model.kept, model.keptZh)}</text>
            <text x={x + 15} y={y + 115} class="small">GRAPH · {t(model.graph, model.graphZh)}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 594 : 380} text-anchor="middle" class="small strong">{t(phone ? 'Batch shares · state keeps · graph replays' : 'Batch shares work. Retained state avoids repeats. Graphs replay launches.', phone ? 'batch 共享 · state 保留 · graph 重放' : 'batch 共享工作。保留状态避免重复。graph 重放 launches。')}</text>
        <text x={W / 2} y={phone ? 628 : 416} text-anchor="middle" class="small">{t(phone ? 'Fish streams decode one request at a time' : 'Fish streaming windows still decode one request at a time.', phone ? 'Fish 流式窗口仍逐请求解码' : 'Fish 流式窗口仍逐请求解码。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'MiniCPM-o native · Fish streaming path shown here' : 'MiniCPM-o’s full-duplex path and Fish S2 Pro’s streaming scheduler are distinct from their offline paths.', phone ? 'MiniCPM-o native · 此处是 Fish 流式路径' : 'MiniCPM-o 全双工和 Fish S2 Pro 流式调度器都有别于各自的离线路径。')}</text>
      {:else if step === 7}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Ten entries for one audio frame' : 'One Fish audio frame needs ten codebook entries', phone ? '一个音频帧需要十个条目' : '一个 Fish 音频帧需要十个 codebook 条目')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'codebook = sound-choice table' : 'codebook = a table of sound-building choices', phone ? 'codebook = 声音选项表' : 'codebook = 构造声音的选项表')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue table rows · orange ? = earlier choices' : 'blue = codebook rows · orange ? = choices made before the vocoder', phone ? '蓝表行 · 橙 ? = 之前选出的条目' : '蓝 = codebook 行 · 橙 ? = vocoder 之前选出的条目')}</text>
        {#if !phone}
          {#each Array.from({ length: VOC_FISH_CODEBOOK_ROWS }, (_, i) => i + 1) as row, i}
            {@const y = 105 + i * 33}
            <rect x="30" y={y} width="250" height="27" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="43" y={y + 19} class="small">codebook {row}</text>
            <text x="259" y={y + 19} text-anchor="end" class="small" style="fill:var(--gen)">entry ?</text>
          {/each}
          <line x1="295" y1="119" x2="295" y2="414" stroke="var(--accent)" stroke-width="2" />
          <line x1="295" y1="266" x2="402" y2="266" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="415" y="220" width="115" height="91" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="472" y="270" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="531" y1="266" x2="572" y2="266" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="585" y="220" width="105" height="91" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="637" y="258" text-anchor="middle" class="small strong">1 audio</text>
          <text x="637" y="282" text-anchor="middle" class="small strong">frame</text>
          <text x="360" y="466" text-anchor="middle" class="result">{VOC_FISH_CODEBOOK_ROWS} codebooks × 1 {t('entry', '个条目')} = {VOC_FISH_CODEBOOK_ROWS} {t('inputs for this frame', '个本帧输入')}</text>
          <text x="360" y="521" text-anchor="middle" class="result" style="fill:var(--gen)">{t('Which generation loops choose these ten entries?', '哪些生成循环选出这十个条目？')}</text>
        {:else}
          {#each Array.from({ length: VOC_FISH_CODEBOOK_ROWS }, (_, i) => i + 1) as row, i}
            {@const y = 99 + i * 30}
            <rect x="18" y={y} width="264" height="24" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="30" y={y + 17} class="small">codebook {row}</text>
            <text x="264" y={y + 17} text-anchor="end" class="small" style="fill:var(--gen)">entry ?</text>
          {/each}
          <line x1="150" y1="402" x2="150" y2="427" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="18" y="438" width="264" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="468" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="150" y1="487" x2="150" y2="512" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="18" y="523" width="264" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="553" text-anchor="middle" class="small strong">1 {t('audio frame', '音频帧')}</text>
          <text x="150" y="610" text-anchor="middle" class="result">{VOC_FISH_CODEBOOK_ROWS} × 1 = {VOC_FISH_CODEBOOK_ROWS} {t('entries', '个条目')}</text>
          <text x="150" y="658" text-anchor="middle" class="result" style="fill:var(--gen)">{t('Which loops choose them?', '哪些循环选出它们？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Fish S2 Pro · codebook rows 1–10 enter vocoder' : 'Fish S2 Pro sends codebook rows 1–10 for this frame to its vocoder.', phone ? 'Fish S2 Pro · codebook 第 1–10 行进入 vocoder' : 'Fish S2 Pro 把这个帧的 codebook 第 1–10 行送入 vocoder。')}</text>
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
