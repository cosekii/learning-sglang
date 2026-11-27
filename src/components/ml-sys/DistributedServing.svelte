<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DYNAMO_LOG_READY_US, DYNAMO_LOG_HTTP_US, DYNAMO_READY_TO_HTTP_US, DYNAMO_HTTP_PORT, DYNAMO_NUM_NODES, DYNAMO_DIST_INIT_PORT, DYNAMO_TP_SIZE, DYNAMO_TP_PER_NODE, DYNAMO_TP_RANKS_BY_NODE, DYNAMO_SMOKE_MAX_TOKENS, DEMO_REQUEST_SENT_MS, DEMO_FIRST_TOKEN_MS, DEMO_LAST_TOKEN_MS, DEMO_TTFT_MS, DEMO_ITL_GAPS_MS, DEMO_ITL_TOTAL_MS, DEMO_E2E_MS } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const seconds = (us: number) => (us / 1_000_000).toFixed(6);
  const steps = [{
    caption: `The public log waits ${(DYNAMO_LOG_READY_US / 1_000_000).toFixed(2)} s for SGLang readiness. HTTP starts ${(DYNAMO_READY_TO_HTTP_US / 1_000_000).toFixed(2)} s later, after the worker is ready.`,
    captionZh: `公开日志里，SGLang 就绪等了 ${(DYNAMO_LOG_READY_US / 1_000_000).toFixed(2)} 秒。HTTP 又过 ${(DYNAMO_READY_TO_HTTP_US / 1_000_000).toFixed(2)} 秒才启动。`,
  }, {
    caption: 'The public config gives both nodes one model and meeting address. Only node 0 accepts HTTP; node 1 uses in=none.',
    captionZh: '两节点共用模型和会合地址。0 号接 HTTP；1 号写 in=none。',
  }, {
    caption: `TP splits one model's math across ${DYNAMO_TP_SIZE} workers. This config places ${DYNAMO_TP_PER_NODE} workers on each node.`,
    captionZh: `TP 把同一模型的计算分给 ${DYNAMO_TP_SIZE} 个 worker。每节点 ${DYNAMO_TP_PER_NODE} 个。`,
  }, {
    caption: `Each node waits for its ${DYNAMO_TP_PER_NODE} local workers. If readiness never arrives, inspect the SGLang worker logs.`,
    captionZh: `每个节点先等本机 ${DYNAMO_TP_PER_NODE} 个 worker。没等到就绪，就查 SGLang worker 日志。`,
  }, {
    caption: 'Stream:true returns answer pieces as SSE deltas. The cap still limits generation to 8 tokens.',
    captionZh: 'stream:true 让回答按 SSE delta 逐段返回。最多仍生成 8 个 token。',
  }, {
    caption: 'Local ZMQ carries token IDs to rank 0, the leader scheduler. All 8 TP workers compute; rank 0 returns SSE deltas.',
    captionZh: '本地 ZMQ 把 token 交给 rank 0 调度器。8 个 worker 计算后，rank 0 返回 SSE delta。',
  }, {
    caption: 'For this streaming request, TTFT ends when delta 1 arrives. Add three later gaps to get E2E.',
    captionZh: '这条流式请求收到第 1 个 delta，TTFT 就结束。再加 3 段间隔，就是 E2E。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  let reduceMotion = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (phone = query.matches);
    const updateMotion = () => (reduceMotion = motion.matches);
    update();
    updateMotion();
    query.addEventListener('change', update);
    motion.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', update);
      motion.removeEventListener('change', updateMotion);
    };
  });
  const PHASE_COUNTS = [4, 3, 3, 5, 4, 6, 6];
  const PHASE_MS = 1000, REST_MS = 2800;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (reduceMotion) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const tokenTimes = DEMO_ITL_GAPS_MS.reduce((times, gap) => [...times, times[times.length - 1] + gap], [DEMO_FIRST_TOKEN_MS]);
  const arrivalIndex = $derived(Math.min(Math.max(phase - 1, 0), 3));
  const arrivalTop = $derived(['DELTA 1 ARRIVES', 'DELTA 2 ARRIVES', 'DELTA 3 ARRIVES', 'LAST DELTA ARRIVES'][arrivalIndex]);
  const arrivalTopZh = $derived(['收到第 1 个 delta', '收到第 2 个 delta', '收到第 3 个 delta', '收到末个 delta'][arrivalIndex]);
  const gapsSoFar = $derived(DEMO_ITL_GAPS_MS.slice(0, arrivalIndex).reduce((sum, gap) => sum + gap, 0));
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 3 ? 650 : step === 4 ? 640 : step === 5 ? 790 : step === 6 ? 630 : 520) : (step === 3 ? 460 : step === 4 ? 460 : step === 5 ? 440 : 400));
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
      <defs>
        <marker id="serve-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="serve-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t('A service starts before it can serve', '服务先完成启动，才能接请求')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'public log · microsecond timestamps' : 'public startup log · timestamps include microseconds', '公开启动日志 · 时间戳精确到微秒')}</text>
        {#if !phone}
          {#each [
            { x: 40, title: 'waiting for sglang0', titleZh: '等待 sglang0', time: '20:32:52.029318', color: 'var(--accent)' },
            { x: 270, title: 'sglang0 is ready', titleZh: 'sglang0 已就绪', time: '20:33:13.629792', color: 'var(--accent)' },
            { x: 500, title: `HTTP :${DYNAMO_HTTP_PORT} starts`, titleZh: `HTTP :${DYNAMO_HTTP_PORT} 启动`, time: '20:33:14.477283', color: 'var(--gen)' },
          ] as event, i}
            <g opacity={phase > i ? 1 : 0}>
              <rect x={event.x} y="104" width="180" height="104" rx="12" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={event.color} />
              <text x={event.x + 90} y="139" text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
              <text x={event.x + 90} y="178" text-anchor="middle" class="timestamp">{event.time}</text>
            </g>
          {/each}
          <line x1="220" y1="156" x2="260" y2="156" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" opacity={phase >= 1 ? 1 : 0} />
          <text x="245" y="91" text-anchor="middle" class="delta" opacity={phase >= 1 ? 1 : 0}>+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="450" y1="156" x2="490" y2="156" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" opacity={phase >= 2 ? 1 : 0} />
          <text x="475" y="91" text-anchor="middle" class="delta" opacity={phase >= 2 ? 1 : 0}>+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <g opacity={phase >= 3 ? 1 : 0}>
            <rect x="40" y="238" width="640" height="62" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="360" y="265" text-anchor="middle" class="result">ready = {t('worker finished startup and can compute', 'worker 完成启动，可以参加计算')}</text>
            <text x="360" y="288" text-anchor="middle" class="small">{t('blue = worker startup · orange = HTTP service', '蓝 = worker 启动 · 橙 = HTTP 服务')}</text>
            <text x="360" y="337" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_READY_US)} + {seconds(DYNAMO_READY_TO_HTTP_US)} = {seconds(DYNAMO_LOG_HTTP_US)} s</text>
            <text x="360" y="363" text-anchor="middle" class="small">{t('from the first log line to HTTP startup', '从第一条日志到 HTTP 启动的总时间')}</text>
          </g>
        {:else}
          {#each [
            { y: 72, title: 'waiting for sglang0', titleZh: '等待 sglang0', time: '20:32:52.029318' },
            { y: 200, title: 'sglang0 is ready', titleZh: 'sglang0 已就绪', time: '20:33:13.629792' },
            { y: 328, title: `HTTP :${DYNAMO_HTTP_PORT} starts`, titleZh: `HTTP :${DYNAMO_HTTP_PORT} 启动`, time: '20:33:14.477283' },
          ] as event, i}
            <g opacity={phase > i ? 1 : 0}>
              <rect x="35" y={event.y} width="230" height="70" rx="11" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={i === 2 ? 'var(--gen)' : 'var(--accent)'} />
              <text x="150" y={event.y + 27} text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
              <text x="150" y={event.y + 53} text-anchor="middle" class="timestamp">{event.time}</text>
            </g>
          {/each}
          <line x1="150" y1="142" x2="150" y2="190" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" opacity={phase >= 1 ? 1 : 0} />
          <text x="165" y="169" class="delta" opacity={phase >= 1 ? 1 : 0}>+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="150" y1="270" x2="150" y2="318" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" opacity={phase >= 2 ? 1 : 0} />
          <text x="165" y="297" class="delta" opacity={phase >= 2 ? 1 : 0}>+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <g opacity={phase >= 3 ? 1 : 0}>
            <text x="150" y="425" text-anchor="middle" class="result">ready = {t('startup done; can compute', '启动完成，可以参加计算')}</text>
            <text x="150" y="452" text-anchor="middle" class="small">{t('blue = worker · orange = HTTP', '蓝 = worker · 橙 = HTTP')}</text>
            <text x="150" y="482" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_HTTP_US)} s {t('to HTTP', '到 HTTP')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Public single-node log, not a multi-node timing target.', '公开单节点日志，不是多节点耗时目标。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Two nodes, two request roles', '两台节点，两种请求入口')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'node = one machine · one shared address' : 'node = one machine · dist-init-addr = shared meeting address', 'node = 一台机器 · dist-init-addr 是会合地址')}</text>
        {#if !phone}
          {#each [
            { x: 40, rank: 0, input: 'http', role: 'accepts client requests', roleZh: '接收客户端请求', note: `HTTP :${DYNAMO_HTTP_PORT}` },
            { x: 380, rank: 1, input: 'none', role: 'no HTTP input here', roleZh: '这里不开 HTTP 输入', note: 'worker still runs', noteZh: 'worker 仍然运行' },
          ] as node, i}
            <g opacity={phase > i ? 1 : 0}>
              <rect x={node.x} y="82" width="300" height="205" rx="13" fill="var(--bg)" stroke={node.rank === 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x={node.x + 20} y="113" class="section">NODE {node.rank} · node-rank {node.rank}</text>
              <text x={node.x + 150} y="151" text-anchor="middle" class="code">dynamo-run in={node.input} out=sglang</text>
              <text x={node.x + 150} y="190" text-anchor="middle" class="small strong">{t(node.role, node.roleZh)}</text>
              <rect x={node.x + 55} y="214" width="190" height="43" rx="9" fill={node.rank === 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} />
              <text x={node.x + 150} y="241" text-anchor="middle" class="result">{t(node.note, node.noteZh ?? node.note)}</text>
            </g>
          {/each}
          <g opacity={phase >= 2 ? 1 : 0}>
            <rect x="40" y="311" width="640" height="61" rx="11" fill="var(--panel)" stroke="var(--line)" />
            <text x="360" y="336" text-anchor="middle" class="code">--num-nodes {DYNAMO_NUM_NODES} · --model-path &lt;model&gt;</text>
            <text x="360" y="360" text-anchor="middle" class="code">--dist-init-addr &lt;node0-ip&gt;:{DYNAMO_DIST_INIT_PORT}</text>
          </g>
        {:else}
          {#each [
            { y: 76, rank: 0, input: 'http', role: 'accepts client requests', roleZh: '接收客户端请求', note: `HTTP :${DYNAMO_HTTP_PORT}` },
            { y: 229, rank: 1, input: 'none', role: 'no HTTP input here', roleZh: '这里不开 HTTP 输入', note: 'worker still runs', noteZh: 'worker 仍然运行' },
          ] as node, i}
            <g opacity={phase > i ? 1 : 0}>
              <rect x="20" y={node.y} width="260" height="137" rx="12" fill="var(--bg)" stroke={node.rank === 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x="150" y={node.y + 27} text-anchor="middle" class="section">NODE {node.rank} · rank {node.rank}</text>
              <text x="150" y={node.y + 58} text-anchor="middle" class="code">in={node.input} out=sglang</text>
              <text x="150" y={node.y + 87} text-anchor="middle" class="small">{t(node.role, node.roleZh)}</text>
              <text x="150" y={node.y + 116} text-anchor="middle" class="result">{t(node.note, node.noteZh ?? node.note)}</text>
            </g>
          {/each}
          <g opacity={phase >= 2 ? 1 : 0}>
            <rect x="20" y="387" width="260" height="82" rx="11" fill="var(--panel)" stroke="var(--line)" />
            <text x="150" y="412" text-anchor="middle" class="code">--num-nodes {DYNAMO_NUM_NODES}</text>
            <text x="150" y="437" text-anchor="middle" class="code">--model-path &lt;model&gt;</text>
            <text x="150" y="461" text-anchor="middle" class="code">dist-init :{DYNAMO_DIST_INIT_PORT}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("Placeholders replace the article's local path and IP.", '占位符代替原文的本机路径和 IP。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t('The TP flag assigns eight workers', 'TP 参数安排 8 个 worker')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'TP = split model math across workers' : 'tensor parallel (TP) = split one model\'s math across workers', 'TP = 把同一模型的计算分给多个 worker')}</text>
        {#if !phone}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const x = 40 + node * 340}
            <g opacity={phase > node ? 1 : 0}>
              <rect x={x} y="82" width="300" height="205" rx="13" fill="var(--bg)" stroke="var(--line)" />
              <text x={x + 20} y="113" class="section">NODE {node} · node-rank {node}</text>
              {#each ranks as rank, i}
                <rect x={x + 15 + i * 69} y="139" width="60" height="74" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={x + 45 + i * 69} y="166" text-anchor="middle" class="small">rank</text>
                <text x={x + 45 + i * 69} y="195" text-anchor="middle" class="result">{rank}</text>
              {/each}
              <text x={x + 150} y="250" text-anchor="middle" class="result">{DYNAMO_TP_PER_NODE} {t('workers', '个 worker')}</text>
            </g>
          {/each}
          <g opacity={phase >= 2 ? 1 : 0}>
            <rect x="40" y="311" width="640" height="61" rx="11" fill="var(--panel)" stroke="var(--line)" />
            <text x="360" y="336" text-anchor="middle" class="result">{DYNAMO_TP_SIZE} TP workers ÷ {DYNAMO_NUM_NODES} nodes = {DYNAMO_TP_PER_NODE} workers / node</text>
            <text x="360" y="360" text-anchor="middle" class="code">--tensor-parallel-size {DYNAMO_TP_SIZE}</text>
          </g>
        {:else}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const y = 76 + node * 157}
            <g opacity={phase > node ? 1 : 0}>
              <rect x="20" y={y} width="260" height="141" rx="12" fill="var(--bg)" stroke="var(--line)" />
              <text x="150" y={y + 27} text-anchor="middle" class="section">NODE {node} · node-rank {node}</text>
              {#each ranks as rank, i}
                <rect x={31 + i * 61} y={y + 45} width="52" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={57 + i * 61} y={y + 76} text-anchor="middle" class="result">r{rank}</text>
              {/each}
              <text x="150" y={y + 122} text-anchor="middle" class="small">{DYNAMO_TP_PER_NODE} {t('workers', '个 worker')}</text>
            </g>
          {/each}
          <g opacity={phase >= 2 ? 1 : 0}>
            <rect x="20" y="398" width="260" height="72" rx="11" fill="var(--panel)" stroke="var(--line)" />
            <text x="150" y="424" text-anchor="middle" class="result">{DYNAMO_TP_SIZE} ÷ {DYNAMO_NUM_NODES} = {DYNAMO_TP_PER_NODE} workers / node</text>
            <text x="150" y="451" text-anchor="middle" class="code">--tensor-parallel-size {DYNAMO_TP_SIZE}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Blue = one TP worker; ranks are unique across nodes.', '蓝色 = 一个 TP worker；rank 跨节点不重复。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Check first, then wait for readiness', '先检查配置，再等 worker 就绪')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('preflight = checks before starting the workers', 'preflight = 启动 worker 前的检查')}</text>
        {#if !phone}
          {#each [
            { x: 40, text: 'same model', textZh: '同一模型' },
            { x: 258, text: 'compatible versions', textZh: '版本兼容' },
            { x: 476, text: 'meeting address reachable', textZh: '会合地址可达' },
          ] as check}
            <rect x={check.x} y="74" width="204" height="38" rx="9" fill="var(--panel)" stroke="var(--line)" />
            <text x={check.x + 102} y="99" text-anchor="middle" class="small">✓ {t(check.text, check.textZh)}</text>
          {/each}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const x = 40 + node * 340}
            <g opacity={phase >= (node === 0 ? 1 : 3) ? 1 : 0}>
              <rect x={x} y="132" width="300" height="160" rx="13" fill="var(--bg)" stroke="var(--line)" />
              <text x={x + 20} y="160" class="section">NODE {node}</text>
              {#each ranks as rank, i}
                <rect x={x + 15 + i * 69} y="178" width="60" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={x + 45 + i * 69} y="208" text-anchor="middle" class="result">r{rank} ✓</text>
              {/each}
              <text x={x + 150} y="260" text-anchor="middle" class="small strong">{DYNAMO_TP_PER_NODE} {t('local workers ready', '个本机 worker 就绪')}</text>
            </g>
            <g opacity={phase >= (node === 0 ? 2 : 4) ? 1 : 0}>
              <line x1={x + 150} y1="292" x2={x + 150} y2="316" stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} stroke-width="3" marker-end={node === 0 ? 'url(#serve-arrow-orange)' : 'url(#serve-arrow-blue)'} />
              <rect x={x} y="326" width="300" height="64" rx="11" fill={node === 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x={x + 150} y="353" text-anchor="middle" class="result">{node === 0 ? `HTTP :${DYNAMO_HTTP_PORT}` : 'in=none'}</text>
              <text x={x + 150} y="377" text-anchor="middle" class="small">{node === 0 ? t('starts after local ready', '本机就绪后启动') : t('workers join the TP group', 'worker 加入 TP 组')}</text>
            </g>
          {/each}
          <text x="360" y="416" text-anchor="middle" class="result" opacity={phase >= 4 ? 1 : 0}>{DYNAMO_TP_PER_NODE} local + {DYNAMO_TP_PER_NODE} local = {DYNAMO_TP_SIZE} {t('workers must start', '个 worker 都要启动')}</text>
        {:else}
          {#each ['same model', 'compatible versions', 'meeting address reachable'] as check, i}
            <rect x="20" y={72 + i * 36} width="260" height="30" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="150" y={92 + i * 36} text-anchor="middle" class="small">✓ {t(check, ['同一模型', '版本兼容', '会合地址可达'][i])}</text>
          {/each}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const y = 194 + node * 156}
            <g opacity={phase >= (node === 0 ? 1 : 3) ? 1 : 0}>
              <rect x="20" y={y} width="260" height="140" rx="12" fill="var(--bg)" stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x="150" y={y + 26} text-anchor="middle" class="section">NODE {node}</text>
              {#each ranks as rank, i}
                <rect x={31 + i * 61} y={y + 42} width="52" height="42" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={57 + i * 61} y={y + 69} text-anchor="middle" class="result">r{rank} ✓</text>
              {/each}
              <text x="150" y={y + 112} text-anchor="middle" class="small">{phase >= (node === 0 ? 2 : 4) ? `${DYNAMO_TP_PER_NODE} ready → ${node === 0 ? `HTTP :${DYNAMO_HTTP_PORT}` : 'in=none'}` : `${DYNAMO_TP_PER_NODE} ${t('workers ready', '个 worker 就绪')}`}</text>
            </g>
          {/each}
          <g opacity={phase >= 4 ? 1 : 0}>
            <text x="150" y="535" text-anchor="middle" class="result">{DYNAMO_TP_PER_NODE} + {DYNAMO_TP_PER_NODE} = {DYNAMO_TP_SIZE} {t('workers must start', '个 worker 都要启动')}</text>
            <text x="150" y="567" text-anchor="middle" class="small">{t('a ready log is not a response yet', '就绪日志还不等于请求成功')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Old guide: initialization failure may exit silently.', '旧版指南提醒：初始化失败可能静默退出。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Check worker logs; ready is not a response.' : 'Check worker processes and logs; a ready log is not a response.', '检查 worker 进程与日志；就绪不等于请求成功。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'One streaming request' : 'Send one streaming request', '发一个流式请求')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'SSE delta = a new answer piece' : 'SSE delta = one new answer piece on the same HTTP response', phone ? 'SSE delta = 新回答片段' : 'SSE delta = 同一次 HTTP 回答里新到的一小段')}</text>
        {#if !phone}
          <rect x="40" y="82" width="250" height="230" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="60" y="113" class="section">CLIENT · {t('new terminal', '新终端')}</text>
          <text x="60" y="145" class="code">POST /v1/chat/completions</text>
          <text x="60" y="175" class="code">model: &lt;model&gt;</text>
          <text x="60" y="205" class="code">messages: [one question]</text>
          <text x="60" y="235" class="code">max_completion_tokens: {DYNAMO_SMOKE_MAX_TOKENS}</text>
          <text x="60" y="265" class="code">stream: true</text>
          <g opacity={phase >= 1 ? 1 : 0}>
            <rect x="430" y="82" width="250" height="230" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="555" y="125" text-anchor="middle" class="section">NODE 0</text>
            <text x="555" y="169" text-anchor="middle" class="result">HTTP :{DYNAMO_HTTP_PORT}</text>
            <text x="555" y="207" text-anchor="middle" class="code">in=http out=sglang</text>
            <text x="555" y="247" text-anchor="middle" class="small">{t('the only client entrance', '唯一的客户端入口')}</text>
            <line x1="290" y1="139" x2="420" y2="139" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="355" y="121" text-anchor="middle" class="small">{t('request', '请求')}</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0}>
            <line x1="430" y1="229" x2="300" y2="229" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <text x="355" y="214" text-anchor="middle" class="small">SSE deltas</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0}>
            <rect x="40" y="338" width="640" height="72" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="360" y="366" text-anchor="middle" class="result">✓ data: choices[0].delta.content = {t('new answer piece', '新回答片段')}</text>
            <text x="360" y="394" text-anchor="middle" class="small">data: [DONE] = {t('end of this stream', '这条流结束')}</text>
          </g>
        {:else}
          <rect x="20" y="76" width="260" height="190" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="105" text-anchor="middle" class="section">CLIENT</text>
          <text x="150" y="134" text-anchor="middle" class="code">POST /v1/chat/completions</text>
          <text x="150" y="162" text-anchor="middle" class="code">model: &lt;model&gt;</text>
          <text x="150" y="190" text-anchor="middle" class="code">messages: [one question]</text>
          <text x="150" y="218" text-anchor="middle" class="code">max tokens: {DYNAMO_SMOKE_MAX_TOKENS}</text>
          <text x="150" y="246" text-anchor="middle" class="code">stream: true</text>
          <g opacity={phase >= 1 ? 1 : 0}>
            <line x1="150" y1="266" x2="150" y2="296" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <rect x="20" y="306" width="260" height="91" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="339" text-anchor="middle" class="section">NODE 0 · HTTP :{DYNAMO_HTTP_PORT}</text>
            <text x="150" y="371" text-anchor="middle" class="code">in=http out=sglang</text>
          </g>
          <line x1="150" y1="397" x2="150" y2="433" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" opacity={phase >= 2 ? 1 : 0} />
          <g opacity={phase >= 3 ? 1 : 0}>
            <rect x="20" y="443" width="260" height="116" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y="472" text-anchor="middle" class="small">✓ choices[0].delta.content</text>
            <text x="150" y="503" text-anchor="middle" class="result">{t('new answer piece', '新回答片段')}</text>
            <text x="150" y="534" text-anchor="middle" class="small">data: [DONE] = {t('stream end', '流结束')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Placeholders replace local names; 8 is a teaching cap.', '占位符代替本机名称；8 是教学上限。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('One stream does not test quality, speed or concurrency.', '一条流不检验质量、速度或并发。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Rank 0 leads the TP workers', 'rank 0 调度器带领 TP worker')}</text>
        {#if phone}
          <text x="18" y="55" class="label">{t('ZMQ = local messages · blue in · orange out', 'ZMQ = 本机消息 · 蓝进 · 橙出')}</text>
        {:else}
          <text x="36" y="55" class="label">{t('local ZMQ = local messages · leader = rank 0 scheduler', 'local ZMQ = 本机消息 · leader = rank 0 调度器')}</text>
          <text x="684" y="55" text-anchor="end" class="label">{t('blue = input · orange = output', '蓝 = 输入 · 橙 = 输出')}</text>
        {/if}
        {#if !phone}
          <text x="20" y="78" class="small strong">{t('REQUEST · stream:true', '请求 · stream:true')}</text>
          <text x="282" y="82" text-anchor="middle" class="small">local ZMQ</text>
          <text x="452" y="82" text-anchor="middle" class="small">{t('cross-rank handoff', '跨 rank 交接')}</text>
          <rect x="20" y="96" width="95" height="116" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="67" y="130" text-anchor="middle" class="small strong">CLIENT</text>
          <text x="67" y="166" text-anchor="middle" class="small">{t('question', '问题')}</text>
          <g opacity={phase >= 1 ? 1 : 0}>
            <line x1="115" y1="136" x2="133" y2="136" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <rect x="140" y="96" width="130" height="116" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="205" y="130" text-anchor="middle" class="small strong">NODE 0 · HTTP</text>
            <text x="205" y="166" text-anchor="middle" class="small">{t('text → token IDs', '文本 → token')}</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0}>
            <line x1="270" y1="136" x2="288" y2="136" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <rect x="295" y="96" width="145" height="116" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="367" y="130" text-anchor="middle" class="small strong">RANK 0 · LEADER</text>
            <text x="367" y="166" text-anchor="middle" class="small">{t('scheduler role', 'scheduler 角色')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0}>
            <line x1="440" y1="136" x2="458" y2="136" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <rect x="465" y="96" width="235" height="116" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="582" y="122" text-anchor="middle" class="small strong">TP GROUP · 8</text>
            <text x="582" y="149" text-anchor="middle" class="small">NODE 0 · workers r0…r3</text>
            <text x="582" y="174" text-anchor="middle" class="small">NODE 1 · workers r4…r7</text>
            <text x="582" y="198" text-anchor="middle" class="small">{t('Ch. 4 tensor exchange', '第 4 章：交换张量')}</text>
          </g>
          <text x="20" y="238" class="small strong">{t('RESPONSE · SSE deltas', '回答 · SSE delta')}</text>
          <text x="452" y="238" text-anchor="middle" class="small">{t('new token', '新 token')}</text>
          <text x="282" y="238" text-anchor="middle" class="small">local ZMQ</text>
          <g opacity={phase >= 4 ? 1 : 0}>
            <rect x="465" y="247" width="235" height="105" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="582" y="281" text-anchor="middle" class="small strong">TP GROUP · 8</text>
            <text x="582" y="317" text-anchor="middle" class="small">{t('new token IDs', '新 token')}</text>
            <line x1="465" y1="292" x2="447" y2="292" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <rect x="295" y="247" width="145" height="105" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="367" y="281" text-anchor="middle" class="small strong">RANK 0 · LEADER</text>
            <text x="367" y="317" text-anchor="middle" class="small">{t('scheduler output', 'scheduler 输出')}</text>
          </g>
          <g opacity={phase >= 5 ? 1 : 0}>
            <line x1="295" y1="292" x2="277" y2="292" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <rect x="140" y="247" width="130" height="105" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="205" y="281" text-anchor="middle" class="small strong">NODE 0 · HTTP</text>
            <text x="205" y="317" text-anchor="middle" class="small">{t('token IDs → text', 'token → 文本')}</text>
            <line x1="140" y1="292" x2="122" y2="292" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <rect x="20" y="247" width="95" height="105" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="67" y="281" text-anchor="middle" class="small strong">CLIENT</text>
            <text x="67" y="317" text-anchor="middle" class="small">{t('delta text', 'delta 文本')}</text>
            <text x="360" y="383" text-anchor="middle" class="result">1 {t('stream', '条流')} · 2 {t('nodes', '台节点')} · 8 {t('TP workers', '个 TP worker')}</text>
          </g>
        {:else}
          <rect x="35" y="80" width="230" height="55" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="113" text-anchor="middle" class="small strong">CLIENT · {t('question', '问题')}</text>
          <g opacity={phase >= 1 ? 1 : 0}>
            <line x1="150" y1="135" x2="150" y2="160" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <rect x="35" y="170" width="230" height="100" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y="199" text-anchor="middle" class="small strong">NODE 0 · HTTP :{DYNAMO_HTTP_PORT}</text>
            <text x="150" y="230" text-anchor="middle" class="small">{t('text → token IDs', '文本 → token')}</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0}>
            <line x1="150" y1="270" x2="150" y2="300" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="165" y="292" class="small">local ZMQ</text>
            <rect x="35" y="310" width="230" height="85" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="150" y="339" text-anchor="middle" class="small strong">RANK 0 · LEADER</text>
            <text x="150" y="370" text-anchor="middle" class="small">{t('scheduler role', 'scheduler 角色')}</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0}>
            <line x1="150" y1="395" x2="150" y2="425" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="165" y="417" class="small">{t('cross-rank handoff', '跨 rank 交接')}</text>
            <rect x="35" y="435" width="230" height="125" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y="462" text-anchor="middle" class="small strong">TP GROUP · 8</text>
            <text x="150" y="490" text-anchor="middle" class="small">NODE 0 · r0…r3</text>
            <text x="150" y="517" text-anchor="middle" class="small">NODE 1 · r4…r7</text>
            <text x="150" y="545" text-anchor="middle" class="small">{t('Ch. 4 tensor exchange', '第 4 章：交换张量')}</text>
          </g>
          <g opacity={phase >= 4 ? 1 : 0}>
            <line x1="150" y1="560" x2="150" y2="590" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <text x="165" y="582" class="small">{t('new token IDs', '新 token')}</text>
            <rect x="35" y="600" width="230" height="80" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="628" text-anchor="middle" class="small strong">RANK 0 → NODE 0 HTTP</text>
            <text x="150" y="657" text-anchor="middle" class="small">local ZMQ · {t('token IDs → text', 'token → 文本')}</text>
          </g>
          <g opacity={phase >= 5 ? 1 : 0}>
            <line x1="150" y1="680" x2="150" y2="710" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
            <text x="165" y="702" class="small">SSE delta</text>
            <rect x="35" y="720" width="230" height="55" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="753" text-anchor="middle" class="small strong">CLIENT · {t('delta text', 'delta 文本')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Fixed path; buffering is omitted.' : 'Fixed Dynamo path; serialization and socket buffering are omitted.', phone ? '固定路径；不展开缓冲。' : '固定 Dynamo 路径；不展开序列化和 socket 缓冲。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Put the timers at the client', '在客户端放计时点')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'orange = SSE deltas · blue = time spans' : 'same stream:true request · orange = SSE delta arrivals · blue = time spans', phone ? '橙 = delta 到达 · 蓝 = 时间段' : '同一条 stream:true 请求 · 橙 = SSE delta 到达 · 蓝 = 时间段')}</text>
        {#if !phone}
          {#each [
            { x: 40, top: 'REQUEST SENT', topZh: '请求发出', time: DEMO_REQUEST_SENT_MS, orange: false },
            { x: 270, top: 'DELTA 1 ARRIVES', topZh: '收到第 1 个 delta', time: DEMO_FIRST_TOKEN_MS, orange: true },
            { x: 500, top: 'LAST DELTA ARRIVES', topZh: '收到末个 delta', time: DEMO_LAST_TOKEN_MS, orange: true },
          ] as event, i}
            <g opacity={phase >= (i === 0 ? 0 : i === 1 ? 1 : 2) ? 1 : 0}>
              <rect x={event.x} y="90" width="180" height="91" rx="12" fill={event.orange ? 'var(--gen-soft)' : 'var(--bg)'} stroke={event.orange ? 'var(--gen)' : 'var(--line)'} />
              <text x={event.x + 90} y="124" text-anchor="middle" class="small strong">{i === 2 ? t(arrivalTop, arrivalTopZh) : t(event.top, event.topZh)}</text>
              <text x={event.x + 90} y="158" text-anchor="middle" class="result">{i === 2 ? tokenTimes[arrivalIndex] : event.time} ms</text>
            </g>
          {/each}
          <g opacity={phase >= 1 ? 1 : 0}>
            <line x1="220" y1="136" x2="260" y2="136" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="245" y="78" text-anchor="middle" class="delta">TTFT</text>
            <text x="245" y="207" text-anchor="middle" class="result">+{DEMO_TTFT_MS} ms</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0}>
            <line x1="450" y1="136" x2="490" y2="136" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="475" y="78" text-anchor="middle" class="delta">{arrivalIndex} ITL</text>
            <text x="475" y="207" text-anchor="middle" class="result">+{gapsSoFar} ms</text>
          </g>
          <g opacity={phase >= 5 ? 1 : 0}>
            <rect x="40" y="234" width="640" height="91" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="360" y="269" text-anchor="middle" class="result">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS} = {DEMO_E2E_MS} ms</text>
            <text x="360" y="304" text-anchor="middle" class="small">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ms · 4 {t('deltas carry 4 tokens ≤ cap', '个 delta 携带 4 个 token ≤ 上限')} {DYNAMO_SMOKE_MAX_TOKENS}</text>
          </g>
        {:else}
          <rect x="35" y="75" width="230" height="65" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="101" text-anchor="middle" class="small strong">{t('REQUEST SENT', '请求发出')}</text>
          <text x="150" y="127" text-anchor="middle" class="result">{DEMO_REQUEST_SENT_MS} ms</text>
          <g opacity={phase >= 1 ? 1 : 0}>
            <line x1="150" y1="140" x2="150" y2="184" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="165" y="168" class="delta">TTFT +{DEMO_TTFT_MS} ms</text>
            <rect x="35" y="194" width="230" height="65" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="220" text-anchor="middle" class="small strong">{t('DELTA 1 ARRIVES', '收到第 1 个 delta')}</text>
            <text x="150" y="246" text-anchor="middle" class="result">{DEMO_FIRST_TOKEN_MS} ms</text>
          </g>
          <g opacity={phase >= 2 ? 1 : 0}>
            <line x1="150" y1="259" x2="150" y2="303" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
            <text x="165" y="287" class="delta">{arrivalIndex} ITL +{gapsSoFar} ms</text>
            <rect x="35" y="313" width="230" height="65" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="150" y="339" text-anchor="middle" class="small strong">{t(arrivalTop, arrivalTopZh)}</text>
            <text x="150" y="365" text-anchor="middle" class="result">{tokenTimes[arrivalIndex]} ms</text>
          </g>
          <g opacity={phase >= 5 ? 1 : 0}>
            <rect x="20" y="405" width="260" height="113" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="150" y="436" text-anchor="middle" class="result">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_E2E_MS} ms</text>
            <text x="150" y="466" text-anchor="middle" class="small">= {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS} = {DEMO_E2E_MS} ms</text>
            <text x="150" y="496" text-anchor="middle" class="small">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ms · 4 {t('deltas', '个 delta')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'Next: slime repeats answers → training → new weights' : 'Next: how does slime connect answers, training and new weights in a loop?', phone ? '下一章：slime 怎样重复回答 → 训练 → 新权重？' : '下一章：slime 怎样连成回答、训练和新权重的循环？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Ch. 1 times · 1 token per delta here.' : 'Chapter 1 constructed times; one token per delta here, but real SSE events may differ.', phone ? '第 1 章构造时间；本例 1 delta = 1 token。' : '第 1 章构造时间；本例每个 delta 一个 token，真实 SSE 事件未必如此。')}</text>
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
  .section { font-family: var(--mono); font-size: 16px; font-weight: 700; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 14px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .timestamp { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .delta { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .timestamp { font-size: 12px; }
    .section { font-size: 14px; }
    .code { font-size: 12px; }
    .delta { font-size: 11px; }
    .result { font-size: 12px; }
  }
</style>
