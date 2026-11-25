<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DYNAMO_LOG_READY_US, DYNAMO_LOG_HTTP_US, DYNAMO_READY_TO_HTTP_US, DYNAMO_HTTP_PORT, DYNAMO_NUM_NODES, DYNAMO_DIST_INIT_PORT, DYNAMO_TP_SIZE, DYNAMO_TP_PER_NODE, DYNAMO_TP_RANKS_BY_NODE, DYNAMO_SMOKE_MAX_TOKENS } from '../../ml-sys/numbers';

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
    caption: 'Send a short request to node 0. Answer text confirms the path, not the speed.',
    captionZh: '向 0 号节点发一个短请求。有回答说明链路通，不代表速度快。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 3 ? 650 : step === 4 ? 600 : 520) : (step === 3 ? 460 : 400));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
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
            <rect x={event.x} y="104" width="180" height="104" rx="12" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={event.color} />
            <text x={event.x + 90} y="139" text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x={event.x + 90} y="178" text-anchor="middle" class="timestamp">{event.time}</text>
          {/each}
          <line x1="220" y1="156" x2="260" y2="156" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <text x="245" y="91" text-anchor="middle" class="delta">+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="450" y1="156" x2="490" y2="156" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <text x="475" y="91" text-anchor="middle" class="delta">+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <rect x="40" y="238" width="640" height="62" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="265" text-anchor="middle" class="result">ready = {t('worker finished startup and can compute', 'worker 完成启动，可以参加计算')}</text>
          <text x="360" y="288" text-anchor="middle" class="small">{t('blue = worker startup · orange = HTTP service', '蓝 = worker 启动 · 橙 = HTTP 服务')}</text>
          <text x="360" y="337" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_READY_US)} + {seconds(DYNAMO_READY_TO_HTTP_US)} = {seconds(DYNAMO_LOG_HTTP_US)} s</text>
          <text x="360" y="363" text-anchor="middle" class="small">{t('from the first log line to HTTP startup', '从第一条日志到 HTTP 启动的总时间')}</text>
        {:else}
          {#each [
            { y: 72, title: 'waiting for sglang0', titleZh: '等待 sglang0', time: '20:32:52.029318' },
            { y: 200, title: 'sglang0 is ready', titleZh: 'sglang0 已就绪', time: '20:33:13.629792' },
            { y: 328, title: `HTTP :${DYNAMO_HTTP_PORT} starts`, titleZh: `HTTP :${DYNAMO_HTTP_PORT} 启动`, time: '20:33:14.477283' },
          ] as event, i}
            <rect x="35" y={event.y} width="230" height="70" rx="11" fill={i === 2 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={i === 2 ? 'var(--gen)' : 'var(--accent)'} />
            <text x="150" y={event.y + 27} text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x="150" y={event.y + 53} text-anchor="middle" class="timestamp">{event.time}</text>
          {/each}
          <line x1="150" y1="142" x2="150" y2="190" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <text x="165" y="169" class="delta">+{seconds(DYNAMO_LOG_READY_US)} s</text>
          <line x1="150" y1="270" x2="150" y2="318" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <text x="165" y="297" class="delta">+{seconds(DYNAMO_READY_TO_HTTP_US)} s</text>
          <text x="150" y="425" text-anchor="middle" class="result">ready = {t('startup done; can compute', '启动完成，可以参加计算')}</text>
          <text x="150" y="452" text-anchor="middle" class="small">{t('blue = worker · orange = HTTP', '蓝 = worker · 橙 = HTTP')}</text>
          <text x="150" y="482" text-anchor="middle" class="result">{seconds(DYNAMO_LOG_HTTP_US)} s {t('to HTTP', '到 HTTP')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Public single-node log, not a multi-node timing target.', '公开单节点日志，不是多节点耗时目标。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Two nodes, two request roles', '两台节点，两种请求入口')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'node = one machine · one shared address' : 'node = one machine · dist-init-addr = shared meeting address', 'node = 一台机器 · dist-init-addr 是会合地址')}</text>
        {#if !phone}
          {#each [
            { x: 40, rank: 0, input: 'http', role: 'accepts client requests', roleZh: '接收客户端请求', note: `HTTP :${DYNAMO_HTTP_PORT}` },
            { x: 380, rank: 1, input: 'none', role: 'no HTTP input here', roleZh: '这里不开 HTTP 输入', note: 'worker still runs', noteZh: 'worker 仍然运行' },
          ] as node}
            <rect x={node.x} y="82" width="300" height="205" rx="13" fill="var(--bg)" stroke={node.rank === 0 ? 'var(--gen)' : 'var(--accent)'} />
            <text x={node.x + 20} y="113" class="section">NODE {node.rank} · node-rank {node.rank}</text>
            <text x={node.x + 150} y="151" text-anchor="middle" class="code">dynamo-run in={node.input} out=sglang</text>
            <text x={node.x + 150} y="190" text-anchor="middle" class="small strong">{t(node.role, node.roleZh)}</text>
            <rect x={node.x + 55} y="214" width="190" height="43" rx="9" fill={node.rank === 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} />
            <text x={node.x + 150} y="241" text-anchor="middle" class="result">{t(node.note, node.noteZh ?? node.note)}</text>
          {/each}
          <rect x="40" y="311" width="640" height="61" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="360" y="336" text-anchor="middle" class="code">--num-nodes {DYNAMO_NUM_NODES} · --model-path &lt;model&gt;</text>
          <text x="360" y="360" text-anchor="middle" class="code">--dist-init-addr &lt;node0-ip&gt;:{DYNAMO_DIST_INIT_PORT}</text>
        {:else}
          {#each [
            { y: 76, rank: 0, input: 'http', role: 'accepts client requests', roleZh: '接收客户端请求', note: `HTTP :${DYNAMO_HTTP_PORT}` },
            { y: 229, rank: 1, input: 'none', role: 'no HTTP input here', roleZh: '这里不开 HTTP 输入', note: 'worker still runs', noteZh: 'worker 仍然运行' },
          ] as node}
            <rect x="20" y={node.y} width="260" height="137" rx="12" fill="var(--bg)" stroke={node.rank === 0 ? 'var(--gen)' : 'var(--accent)'} />
            <text x="150" y={node.y + 27} text-anchor="middle" class="section">NODE {node.rank} · rank {node.rank}</text>
            <text x="150" y={node.y + 58} text-anchor="middle" class="code">in={node.input} out=sglang</text>
            <text x="150" y={node.y + 87} text-anchor="middle" class="small">{t(node.role, node.roleZh)}</text>
            <text x="150" y={node.y + 116} text-anchor="middle" class="result">{t(node.note, node.noteZh ?? node.note)}</text>
          {/each}
          <rect x="20" y="387" width="260" height="82" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="150" y="412" text-anchor="middle" class="code">--num-nodes {DYNAMO_NUM_NODES}</text>
          <text x="150" y="437" text-anchor="middle" class="code">--model-path &lt;model&gt;</text>
          <text x="150" y="461" text-anchor="middle" class="code">dist-init :{DYNAMO_DIST_INIT_PORT}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("Placeholders replace the article's local path and IP.", '占位符代替原文的本机路径和 IP。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t('The TP flag assigns eight workers', 'TP 参数安排 8 个 worker')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'TP = split model math across workers' : 'tensor parallel (TP) = split one model\'s math across workers', 'TP = 把同一模型的计算分给多个 worker')}</text>
        {#if !phone}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const x = 40 + node * 340}
            <rect x={x} y="82" width="300" height="205" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 20} y="113" class="section">NODE {node} · node-rank {node}</text>
            {#each ranks as rank, i}
              <rect x={x + 15 + i * 69} y="139" width="60" height="74" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 45 + i * 69} y="166" text-anchor="middle" class="small">rank</text>
              <text x={x + 45 + i * 69} y="195" text-anchor="middle" class="result">{rank}</text>
            {/each}
            <text x={x + 150} y="250" text-anchor="middle" class="result">{DYNAMO_TP_PER_NODE} {t('workers', '个 worker')}</text>
          {/each}
          <rect x="40" y="311" width="640" height="61" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="360" y="336" text-anchor="middle" class="result">{DYNAMO_TP_SIZE} TP workers ÷ {DYNAMO_NUM_NODES} nodes = {DYNAMO_TP_PER_NODE} workers / node</text>
          <text x="360" y="360" text-anchor="middle" class="code">--tensor-parallel-size {DYNAMO_TP_SIZE}</text>
        {:else}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const y = 76 + node * 157}
            <rect x="20" y={y} width="260" height="141" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y={y + 27} text-anchor="middle" class="section">NODE {node} · node-rank {node}</text>
            {#each ranks as rank, i}
              <rect x={31 + i * 61} y={y + 45} width="52" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={57 + i * 61} y={y + 76} text-anchor="middle" class="result">r{rank}</text>
            {/each}
            <text x="150" y={y + 122} text-anchor="middle" class="small">{DYNAMO_TP_PER_NODE} {t('workers', '个 worker')}</text>
          {/each}
          <rect x="20" y="398" width="260" height="72" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="150" y="424" text-anchor="middle" class="result">{DYNAMO_TP_SIZE} ÷ {DYNAMO_NUM_NODES} = {DYNAMO_TP_PER_NODE} workers / node</text>
          <text x="150" y="451" text-anchor="middle" class="code">--tensor-parallel-size {DYNAMO_TP_SIZE}</text>
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
            <rect x={x} y="132" width="300" height="160" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 20} y="160" class="section">NODE {node}</text>
            {#each ranks as rank, i}
              <rect x={x + 15 + i * 69} y="178" width="60" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 45 + i * 69} y="208" text-anchor="middle" class="result">r{rank} ✓</text>
            {/each}
            <text x={x + 150} y="260" text-anchor="middle" class="small strong">{DYNAMO_TP_PER_NODE} {t('local workers ready', '个本机 worker 就绪')}</text>
            <line x1={x + 150} y1="292" x2={x + 150} y2="316" stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} stroke-width="3" marker-end={node === 0 ? 'url(#serve-arrow-orange)' : 'url(#serve-arrow-blue)'} />
            <rect x={x} y="326" width="300" height="64" rx="11" fill={node === 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} />
            <text x={x + 150} y="353" text-anchor="middle" class="result">{node === 0 ? `HTTP :${DYNAMO_HTTP_PORT}` : 'in=none'}</text>
            <text x={x + 150} y="377" text-anchor="middle" class="small">{node === 0 ? t('starts after local ready', '本机就绪后启动') : t('workers join the TP group', 'worker 加入 TP 组')}</text>
          {/each}
          <text x="360" y="416" text-anchor="middle" class="result">{DYNAMO_TP_PER_NODE} local + {DYNAMO_TP_PER_NODE} local = {DYNAMO_TP_SIZE} {t('workers must start', '个 worker 都要启动')}</text>
        {:else}
          {#each ['same model', 'compatible versions', 'meeting address reachable'] as check, i}
            <rect x="20" y={72 + i * 36} width="260" height="30" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="150" y={92 + i * 36} text-anchor="middle" class="small">✓ {t(check, ['同一模型', '版本兼容', '会合地址可达'][i])}</text>
          {/each}
          {#each DYNAMO_TP_RANKS_BY_NODE as ranks, node}
            {@const y = 194 + node * 156}
            <rect x="20" y={y} width="260" height="140" rx="12" fill="var(--bg)" stroke={node === 0 ? 'var(--gen)' : 'var(--accent)'} />
            <text x="150" y={y + 26} text-anchor="middle" class="section">NODE {node}</text>
            {#each ranks as rank, i}
              <rect x={31 + i * 61} y={y + 42} width="52" height="42" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={57 + i * 61} y={y + 69} text-anchor="middle" class="result">r{rank} ✓</text>
            {/each}
            <text x="150" y={y + 112} text-anchor="middle" class="small">{DYNAMO_TP_PER_NODE} ready → {node === 0 ? `HTTP :${DYNAMO_HTTP_PORT}` : 'in=none'}</text>
          {/each}
          <text x="150" y="535" text-anchor="middle" class="result">{DYNAMO_TP_PER_NODE} + {DYNAMO_TP_PER_NODE} = {DYNAMO_TP_SIZE} {t('workers must start', '个 worker 都要启动')}</text>
          <text x="150" y="567" text-anchor="middle" class="small">{t('a ready log is not a response yet', '就绪日志还不等于请求成功')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Old guide: initialization failure may exit silently.', '旧版指南提醒：初始化失败可能静默退出。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Check worker logs; ready is not a response.' : 'Check worker processes and logs; a ready log is not a response.', '检查 worker 进程与日志；就绪不等于请求成功。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'One request, one answer' : 'Send one request, check one answer', '发一个请求，检查一个回答')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? `cap ${DYNAMO_SMOKE_MAX_TOKENS} = at most ${DYNAMO_SMOKE_MAX_TOKENS} new tokens` : `max_completion_tokens ${DYNAMO_SMOKE_MAX_TOKENS} = at most ${DYNAMO_SMOKE_MAX_TOKENS} new tokens`, phone ? `最多生成 ${DYNAMO_SMOKE_MAX_TOKENS} 个新 token` : `max_completion_tokens ${DYNAMO_SMOKE_MAX_TOKENS} = 最多生成 ${DYNAMO_SMOKE_MAX_TOKENS} 个 token`)}</text>
        {#if !phone}
          <rect x="40" y="82" width="250" height="202" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="60" y="113" class="section">CLIENT · {t('new terminal', '新终端')}</text>
          <text x="60" y="151" class="code">POST /v1/chat/completions</text>
          <text x="60" y="183" class="code">model: &lt;model&gt;</text>
          <text x="60" y="215" class="code">messages: [one question]</text>
          <text x="60" y="247" class="code">max_completion_tokens: {DYNAMO_SMOKE_MAX_TOKENS}</text>
          <rect x="430" y="82" width="250" height="202" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="555" y="125" text-anchor="middle" class="section">NODE 0</text>
          <text x="555" y="169" text-anchor="middle" class="result">HTTP :{DYNAMO_HTTP_PORT}</text>
          <text x="555" y="207" text-anchor="middle" class="code">in=http out=sglang</text>
          <text x="555" y="247" text-anchor="middle" class="small">{t('the only client entrance', '唯一的客户端入口')}</text>
          <line x1="290" y1="139" x2="420" y2="139" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <text x="355" y="121" text-anchor="middle" class="small">{t('request', '请求')}</text>
          <line x1="430" y1="229" x2="300" y2="229" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <text x="355" y="214" text-anchor="middle" class="small">{t('response', '回答')}</text>
          <rect x="40" y="310" width="640" height="50" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="341" text-anchor="middle" class="result">✓ choices[0].message.content = {t('answer text', '回答文本')}</text>
        {:else}
          <rect x="20" y="76" width="260" height="164" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="105" text-anchor="middle" class="section">CLIENT</text>
          <text x="150" y="137" text-anchor="middle" class="code">POST /v1/chat/completions</text>
          <text x="150" y="169" text-anchor="middle" class="code">model: &lt;model&gt;</text>
          <text x="150" y="201" text-anchor="middle" class="code">messages: [one question]</text>
          <text x="150" y="228" text-anchor="middle" class="code">max tokens: {DYNAMO_SMOKE_MAX_TOKENS}</text>
          <line x1="150" y1="240" x2="150" y2="276" stroke="var(--accent)" stroke-width="3" marker-end="url(#serve-arrow-blue)" />
          <rect x="20" y="286" width="260" height="91" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="319" text-anchor="middle" class="section">NODE 0 · HTTP :{DYNAMO_HTTP_PORT}</text>
          <text x="150" y="351" text-anchor="middle" class="code">in=http out=sglang</text>
          <line x1="150" y1="377" x2="150" y2="413" stroke="var(--gen)" stroke-width="3" marker-end="url(#serve-arrow-orange)" />
          <rect x="20" y="423" width="260" height="91" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="455" text-anchor="middle" class="small">✓ choices[0].message.content</text>
          <text x="150" y="488" text-anchor="middle" class="result">{t('answer text returned', '返回了回答文本')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Placeholders replace local names; 8 is a teaching cap.', '占位符代替本机名称；8 是教学上限。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('One response does not test quality, speed or concurrency.', '一个回答不检验质量、速度或并发。')}</text>
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
