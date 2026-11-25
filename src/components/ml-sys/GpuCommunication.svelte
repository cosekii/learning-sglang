<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { COMM_EXAMPLE_COMPUTE_BEFORE_MS, COMM_EXAMPLE_COMPUTE_AFTER_MS, COMM_EXAMPLE_WAIT_BEFORE_MS, COMM_EXAMPLE_WAIT_AFTER_MS, COMM_EXAMPLE_TOTAL_BEFORE_MS, COMM_EXAMPLE_TOTAL_AFTER_MS, COMM_EXAMPLE_COMPUTE_SAVED_MS, COMM_EXAMPLE_WAIT_ADDED_MS, COMM_EXAMPLE_TOTAL_ADDED_MS, COMM_WORLD_SIZE, COMM_PARTIAL_TENSORS, COMM_REDUCED_TENSOR, COMM_TENSOR_TEXT, COMM_RING_PHASE_STEPS, COMM_RING_TOTAL_STEPS, COMM_RING_PER_RANK_SEND_TENSORS } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Compute halves to ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms, but communication grows from ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms to ${COMM_EXAMPLE_WAIT_AFTER_MS} ms. Total time rises by ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms.`,
    captionZh: `计算从 ${COMM_EXAMPLE_COMPUTE_BEFORE_MS} ms 减到 ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms，通信却从 ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms 增到 ${COMM_EXAMPLE_WAIT_AFTER_MS} ms。总时间多了 ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms。`,
  }, {
    caption: `Each GPU computes a four-number tensor. All-reduce adds them and gives every GPU ${COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}.`,
    captionZh: `每张卡算出自己的四格张量。all-reduce 求和，让四卡都得到 ${COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}。`,
  }, {
    caption: `One process drives each GPU in this example. Rank names the process; world size counts all ${COMM_WORLD_SIZE}.`,
    captionZh: `这个例子里，一个进程管一张 GPU。rank 是进程编号，world size 是总数 ${COMM_WORLD_SIZE}。`,
  }, {
    caption: 'torch.distributed exposes the all-reduce call. Its NCCL backend moves GPU tensors.',
    captionZh: 'torch.distributed 提供 all-reduce 接口。NCCL 后端负责搬 GPU 张量。',
  }, {
    caption: 'NVLink connects GPUs. SYS crosses PCIe and the interconnect between NUMA nodes.',
    captionZh: 'NVLink 连接 GPU。SYS 还经过 PCIe 和 NUMA 节点间连线。',
  }, {
    caption: `Reduce-Scatter takes ${COMM_RING_PHASE_STEPS} rounds. All-Gather takes ${COMM_RING_PHASE_STEPS} more, giving every GPU all four chunks.`,
    captionZh: `前 ${COMM_RING_PHASE_STEPS} 轮算出分块，后 ${COMM_RING_PHASE_STEPS} 轮发齐。每卡最后都有 4 块。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 5 ? 560 : 510) : 410);
  const barScale = 22;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t('More GPUs can still finish later', 'GPU 更多，总时间也可能更长')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('constructed example · same work · same millisecond scale', '构造示例 · 同一份计算 · 同一把毫秒标尺')}</text>
        {#if !phone}
          {#each [{ x: 40, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { x: 380, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x={row.x} y="82" width="300" height="196" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={row.x + 20} y="113" class="section">{row.gpus} GPUs</text>
            <text x={row.x + 20} y="145" class="small">{t('compute', '计算')} · {row.compute} ms</text>
            <rect x={row.x + 20} y="158" width={row.compute * barScale} height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={row.x + 20} y="215" class="small">{t('communication', '通信')} · {row.wait} ms</text>
            <rect x={row.x + 20} y="228" width={row.wait * barScale} height="32" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={row.x + 280} y="113" text-anchor="end" class="total">{row.total} ms</text>
          {/each}
          <rect x="40" y="300" width="640" height="62" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="360" y="326" text-anchor="middle" class="result">4 → 8 GPUs: −{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')} · +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms {t('total', '总时间')}</text>
          <text x="360" y="350" text-anchor="middle" class="small">{t('communication = moving tensors between GPUs and waiting', '通信 = 在 GPU 之间搬张量，并等它到齐')}</text>
          <text x="60" y="385" class="small"><tspan fill="var(--accent)">■</tspan> {t('compute', '计算')}   <tspan fill="var(--gen)">■</tspan> {t('communication', '通信')}</text>
        {:else}
          {#each [{ y: 76, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { y: 246, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x="18" y={row.y} width="264" height="154" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={row.y + 27} class="section">{row.gpus} GPUs</text>
            <text x="266" y={row.y + 27} text-anchor="end" class="total">{row.total} ms</text>
            <text x="32" y={row.y + 55} class="small">{t('compute', '计算')} {row.compute} ms</text>
            <rect x="32" y={row.y + 65} width={row.compute * 13} height="22" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={row.y + 111} class="small">{t('communication', '通信')} {row.wait} ms</text>
            <rect x="32" y={row.y + 121} width={row.wait * 13} height="22" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          {/each}
          <text x="150" y="427" text-anchor="middle" class="result">−{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')}</text>
          <text x="150" y="453" text-anchor="middle" class="result">{t('total', '总时间')} +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms</text>
          <text x="150" y="479" text-anchor="middle" class="small">{t('communication moves tensors and waits', '通信要搬张量，也要等待')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Teaching values, not a local benchmark.', '构造的教学数值，不是本机实测。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t('All-reduce · add, then give everyone the total', 'all-reduce · 求和，再发回每卡')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('a tensor is a row of numbers · four numbers here', '张量就是一排数 · 这里每份有 4 格')}</text>
        {#if !phone}
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x={25 + i * 172} y="86" width="150" height="82" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={100 + i * 172} y="115" text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={100 + i * 172} y="148" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <text x="360" y="198" text-anchor="middle" class="result">{t('1 + 2 + 3 + 4 = 10 · the same sum in all 4 positions', '每一格都是 1 + 2 + 3 + 4 = 10，共 4 格')}</text>
          <line x1="360" y1="214" x2="360" y2="245" stroke="var(--gen)" stroke-width="3" />
          <path d="M360,249 l-8,-13 h16 z" fill="var(--gen)" />
          <rect x="40" y="260" width="640" height="91" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#each COMM_PARTIAL_TENSORS as _, i}
            <text x={110 + i * 165} y="293" text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={110 + i * 165} y="328" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          {/each}
          <text x="360" y="378" text-anchor="middle" class="small">{t('blue = local part · orange = same reduced result on every GPU', '蓝 = 各卡自己的部分 · 橙 = 每卡相同的求和结果')}</text>
        {:else}
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x={18 + (i % 2) * 137} y={78 + Math.floor(i / 2) * 85} width="127" height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={81 + (i % 2) * 137} y={103 + Math.floor(i / 2) * 85} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={81 + (i % 2) * 137} y={132 + Math.floor(i / 2) * 85} text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <text x="150" y="267" text-anchor="middle" class="result">1 + 2 + 3 + 4 = 10</text>
          <text x="150" y="291" text-anchor="middle" class="result">{t('all 4 positions sum to 10', '4 格求和都是 10')}</text>
          <rect x="18" y="312" width="264" height="121" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="339" text-anchor="middle" class="small strong">{t('every GPU receives', '每张 GPU 都得到')}</text>
          <text x="150" y="374" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          <text x="150" y="407" text-anchor="middle" class="small">GPU 0 · GPU 1 · GPU 2 · GPU 3</text>
          <text x="150" y="462" text-anchor="middle" class="small">{t('blue = local part · orange = shared total', '蓝 = 自己的部分 · 橙 = 共同结果')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed values; the operation is SUM.', '构造数值；这里的归约操作是求和。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t('One process group · four GPU workers', '一个进程组 · 四个 GPU 工作者')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('rank = process number · world size = process count', 'rank = 进程编号 · world size = 进程总数')}</text>
        {#if !phone}
          <rect x="40" y="72" width="640" height="264" rx="15" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="7 5" />
          <text x="58" y="96" class="small strong">{t('process group', '进程组')}</text>
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x="70" y={108 + i * 53} width="210" height="42" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="88" y={135 + i * 53} class="small strong">{t('process', '进程')} {i} · rank {i}</text>
            <line x1="280" y1={129 + i * 53} x2="425" y2={129 + i * 53} stroke="var(--accent)" stroke-width="2" />
            <path d={`M425,${129 + i * 53} l-10,-6 v12 z`} fill="var(--accent)" />
            <rect x="435" y={108 + i * 53} width="210" height="42" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="453" y={135 + i * 53} class="small strong">GPU {i} · {COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <rect x="200" y="351" width="320" height="37" rx="18" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="375" text-anchor="middle" class="result">world size = {COMM_WORLD_SIZE}</text>
        {:else}
          <rect x="12" y="70" width="276" height="326" rx="14" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="7 5" />
          <text x="26" y="93" class="small strong">{t('process group', '进程组')}</text>
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x="25" y={105 + i * 67} width="108" height="49" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="79" y={125 + i * 67} text-anchor="middle" class="small strong">{t('process', '进程')} {i}</text>
            <text x="79" y={145 + i * 67} text-anchor="middle" class="small">rank {i}</text>
            <line x1="133" y1={129 + i * 67} x2="162" y2={129 + i * 67} stroke="var(--accent)" stroke-width="2" />
            <path d={`M162,${129 + i * 67} l-8,-5 v10 z`} fill="var(--accent)" />
            <rect x="170" y={105 + i * 67} width="103" height="49" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="221" y={125 + i * 67} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x="221" y={145 + i * 67} text-anchor="middle" class="small">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <rect x="45" y="415" width="210" height="39" rx="19" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="440" text-anchor="middle" class="result">world size = {COMM_WORLD_SIZE}</text>
          <text x="150" y="477" text-anchor="middle" class="small">{t('one process per GPU in this example', '本例：一个进程对应一张 GPU')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('The one-process-per-GPU mapping is an example, not a requirement.', '一进程一卡是本例安排，不是唯一做法。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 36} y="30" class="title">{t('Follow one call into the NCCL backend', '跟着一次调用走进 NCCL 后端')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('NCCL = NVIDIA’s GPU collective-communication library', 'NCCL = NVIDIA 的 GPU 集合通信库')}</text>
        {#if !phone}
          <rect x="42" y="86" width="155" height="226" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="120" y="113" text-anchor="middle" class="small strong">{t('all participants call', '所有参与者都调用')}</text>
          {#each COMM_PARTIAL_TENSORS as _, i}
            <rect x="66" y={130 + i * 42} width="108" height="31" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="120" y={151 + i * 42} text-anchor="middle" class="small">rank {i}</text>
          {/each}
          <line x1="197" y1="199" x2="238" y2="199" stroke="var(--accent)" stroke-width="3" />
          <path d="M238,199 l-11,-7 v14 z" fill="var(--accent)" />
          <rect x="248" y="86" width="422" height="65" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="459" y="113" text-anchor="middle" class="code">dist.all_reduce(tensor,</text>
          <text x="459" y="137" text-anchor="middle" class="code">op=dist.ReduceOp.SUM)</text>
          <line x1="459" y1="151" x2="459" y2="174" stroke="var(--gen)" stroke-width="3" />
          <path d="M459,180 l-8,-13 h16 z" fill="var(--gen)" />
          <rect x="248" y="187" width="422" height="51" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="459" y="219" text-anchor="middle" class="section">torch.distributed</text>
          <line x1="459" y1="238" x2="459" y2="261" stroke="var(--gen)" stroke-width="3" />
          <path d="M459,267 l-8,-13 h16 z" fill="var(--gen)" />
          <rect x="248" y="274" width="422" height="55" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="459" y="308" text-anchor="middle" class="section">NCCL backend</text>
          <text x="459" y="360" text-anchor="middle" class="small">{t('collective call → GPU communication backend', '集合通信调用 → GPU 通信后端')}</text>
        {:else}
          <rect x="45" y="76" width="210" height="39" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="101" text-anchor="middle" class="small strong">rank 0–3 · {t('same call', '同一个调用')}</text>
          <line x1="150" y1="115" x2="150" y2="132" stroke="var(--gen)" stroke-width="3" />
          <path d="M150,137 l-7,-11 h14 z" fill="var(--gen)" />
          <rect x="22" y="143" width="256" height="76" rx="10" fill="var(--panel)" stroke="var(--line)" />
          <text x="150" y="174" text-anchor="middle" class="code">dist.all_reduce(tensor,</text>
          <text x="150" y="201" text-anchor="middle" class="code">op=SUM)</text>
          <line x1="150" y1="219" x2="150" y2="239" stroke="var(--gen)" stroke-width="3" />
          <path d="M150,245 l-7,-11 h14 z" fill="var(--gen)" />
          <rect x="22" y="251" width="256" height="57" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="286" text-anchor="middle" class="section">torch.distributed</text>
          <line x1="150" y1="308" x2="150" y2="328" stroke="var(--gen)" stroke-width="3" />
          <path d="M150,334 l-7,-11 h14 z" fill="var(--gen)" />
          <rect x="22" y="340" width="256" height="59" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="376" text-anchor="middle" class="section">NCCL backend</text>
          <text x="150" y="434" text-anchor="middle" class="small">{t('interface above', '上面：程序调用的接口')}</text>
          <text x="150" y="460" text-anchor="middle" class="small">{t('GPU communication below', '下面：GPU 通信后端')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('PyTorch selects the NCCL backend with backend="nccl".', 'PyTorch 用 backend="nccl" 选择 NCCL 后端。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 36} y="30" class="title">{t('The tensor crosses physical links', '张量要走实际的硬件链路')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('two reported examples · not two choices on one machine', '两份实际输出示例 · 不是同一台机器的两个选项')}</text>
        {#if !phone}
          <rect x="35" y="82" width="310" height="254" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="112" text-anchor="middle" class="section">NV18</text>
          <rect x="58" y="148" width="82" height="48" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="99" y="178" text-anchor="middle" class="small strong">GPU 0</text>
          <line x1="140" y1="172" x2="238" y2="172" stroke="var(--gen)" stroke-width="5" />
          <rect x="240" y="148" width="82" height="48" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="281" y="178" text-anchor="middle" class="small strong">GPU 1</text>
          <text x="190" y="224" text-anchor="middle" class="result">NV18 = 18 × NVLink</text>
          <text x="190" y="263" text-anchor="middle" class="small">{t('NVLink = a link between GPUs', 'NVLink = GPU 之间的链路')}</text>
          <text x="190" y="301" text-anchor="middle" class="small">{t('18 links form this reported connection', '这份输出里，18 条链路组成该连接')}</text>

          <rect x="375" y="82" width="310" height="254" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="530" y="112" text-anchor="middle" class="section">SYS</text>
          <rect x="394" y="140" width="70" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="429" y="165" text-anchor="middle" class="small strong">GPU 0</text>
          <path d="M464,160 H493" stroke="var(--gen)" stroke-width="3" />
          <path d="M493,160 l-8,-5 v10 z" fill="var(--gen)" />
          <rect x="497" y="140" width="62" height="40" rx="8" fill="var(--panel)" stroke="var(--gen)" />
          <text x="528" y="165" text-anchor="middle" class="small">PCIe</text>
          <path d="M559,160 H588" stroke="var(--gen)" stroke-width="3" />
          <path d="M588,160 l-8,-5 v10 z" fill="var(--gen)" />
          <rect x="592" y="140" width="74" height="40" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="629" y="165" text-anchor="middle" class="small">NUMA 0↕1</text>
          <path d="M629,180 V204 H528 V219" stroke="var(--gen)" stroke-width="3" fill="none" />
          <path d="M528,224 l-6,-13 h12 z" fill="var(--gen)" />
          <rect x="497" y="224" width="62" height="40" rx="8" fill="var(--panel)" stroke="var(--gen)" />
          <text x="528" y="249" text-anchor="middle" class="small">PCIe</text>
          <path d="M497,244 H469" stroke="var(--gen)" stroke-width="3" fill="none" />
          <path d="M464,244 l13,-7 v14 z" fill="var(--gen)" />
          <rect x="394" y="224" width="70" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="429" y="249" text-anchor="middle" class="small strong">GPU 1</text>
          <text x="530" y="291" text-anchor="middle" class="small">{t('PCIe = GPU-to-host channel', 'PCIe = GPU 与主机之间的通道')}</text>
          <text x="530" y="316" text-anchor="middle" class="small">{t('NUMA nodes = host CPU/memory partitions', 'NUMA 节点 = 主机里的 CPU／内存分区')}</text>
        {:else}
          <rect x="18" y="72" width="264" height="118" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="96" text-anchor="middle" class="section">NV18 = 18 × NVLink</text>
          <rect x="35" y="112" width="70" height="36" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="70" y="135" text-anchor="middle" class="small strong">GPU 0</text>
          <line x1="105" y1="130" x2="195" y2="130" stroke="var(--gen)" stroke-width="4" />
          <rect x="195" y="112" width="70" height="36" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="230" y="135" text-anchor="middle" class="small strong">GPU 1</text>
          <text x="150" y="173" text-anchor="middle" class="small">{t('NVLink connects GPUs', 'NVLink 连接 GPU')}</text>

          <rect x="18" y="205" width="264" height="255" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="231" text-anchor="middle" class="section">SYS</text>
          <rect x="31" y="249" width="65" height="36" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="63" y="272" text-anchor="middle" class="small strong">GPU 0</text>
          <path d="M96,267 H108" stroke="var(--gen)" stroke-width="2" />
          <path d="M110,267 l-7,-5 v10 z" fill="var(--gen)" />
          <rect x="114" y="249" width="57" height="36" rx="8" fill="var(--panel)" stroke="var(--gen)" />
          <text x="142" y="272" text-anchor="middle" class="small">PCIe</text>
          <path d="M171,267 H183" stroke="var(--gen)" stroke-width="2" />
          <path d="M185,267 l-7,-5 v10 z" fill="var(--gen)" />
          <rect x="189" y="249" width="80" height="36" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="229" y="272" text-anchor="middle" class="small">NUMA 0↕1</text>
          <path d="M229,285 V302 H142 V315" stroke="var(--gen)" stroke-width="2" fill="none" />
          <path d="M142,320 l-6,-12 h12 z" fill="var(--gen)" />
          <rect x="114" y="320" width="57" height="36" rx="8" fill="var(--panel)" stroke="var(--gen)" />
          <text x="142" y="343" text-anchor="middle" class="small">PCIe</text>
          <path d="M114,338 H96" stroke="var(--gen)" stroke-width="2" />
          <path d="M91,338 l12,-6 v12 z" fill="var(--gen)" />
          <rect x="31" y="320" width="65" height="36" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="63" y="343" text-anchor="middle" class="small strong">GPU 1</text>
          <text x="150" y="387" text-anchor="middle" class="small">{t('PCIe connects a GPU to the host', 'PCIe 连接 GPU 与主机')}</text>
          <text x="150" y="414" text-anchor="middle" class="small">{t('NUMA nodes partition', 'NUMA 节点划分')}</text>
          <text x="150" y="437" text-anchor="middle" class="small">{t('host CPUs and memory', '主机里的 CPU 和内存')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Route labels come from nvidia-smi topo -m.', '路径标签来自 nvidia-smi topo -m 的输出示例。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 36} y="30" class="title">Ring all-reduce · 4 GPUs · {COMM_RING_TOTAL_STEPS} rounds</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('S = input tensor bytes · split into 4 chunks of S/4', 'S = 一份输入张量的字节数 · 分成 4 块，每块 S/4')}</text>
        {#if !phone}
          <rect x="25" y="82" width="320" height="250" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="185" y="108" text-anchor="middle" class="section">1 · Reduce-Scatter</text>
          <text x="185" y="132" text-anchor="middle" class="small">{t('add matching chunks · keep one per GPU', '对应分块求和 · 每卡留下一块')}</text>
          <path d="M170,177 H207" stroke="var(--gen)" stroke-width="2" /><path d="M212,177 l-10,-6 v12 z" fill="var(--gen)" />
          <path d="M270,200 V227" stroke="var(--gen)" stroke-width="2" /><path d="M270,232 l-6,-10 h12 z" fill="var(--gen)" />
          <path d="M215,257 H178" stroke="var(--gen)" stroke-width="2" /><path d="M173,257 l10,-6 v12 z" fill="var(--gen)" />
          <path d="M115,235 V208" stroke="var(--gen)" stroke-width="2" /><path d="M115,203 l-6,10 h12 z" fill="var(--gen)" />
          {#each COMM_PARTIAL_TENSORS as _, i}
            <rect x={i === 0 || i === 3 ? 60 : 215} y={i < 2 ? 155 : 235} width="110" height="45" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={i === 0 || i === 3 ? 115 : 270} y={i < 2 ? 174 : 254} text-anchor="middle" class="small strong">GPU {i} · {String.fromCharCode(65 + i)}</text>
            <text x={i === 0 || i === 3 ? 115 : 270} y={i < 2 ? 192 : 272} text-anchor="middle" class="small">= 10</text>
          {/each}
          <text x="185" y="311" text-anchor="middle" class="small">{COMM_RING_PHASE_STEPS} {t('rounds · one reduced chunk each', '轮 · 每卡一个归约分块')}</text>

          <rect x="375" y="82" width="320" height="250" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="535" y="108" text-anchor="middle" class="section">2 · All-Gather</text>
          <text x="535" y="132" text-anchor="middle" class="small">{t('share the reduced chunks with every GPU', '把归约分块发给每张卡')}</text>
          <path d="M520,177 H557" stroke="var(--gen)" stroke-width="2" /><path d="M562,177 l-10,-6 v12 z" fill="var(--gen)" />
          <path d="M620,200 V227" stroke="var(--gen)" stroke-width="2" /><path d="M620,232 l-6,-10 h12 z" fill="var(--gen)" />
          <path d="M565,257 H528" stroke="var(--gen)" stroke-width="2" /><path d="M523,257 l10,-6 v12 z" fill="var(--gen)" />
          <path d="M465,235 V208" stroke="var(--gen)" stroke-width="2" /><path d="M465,203 l-6,10 h12 z" fill="var(--gen)" />
          {#each COMM_PARTIAL_TENSORS as _, i}
            <rect x={i === 0 || i === 3 ? 400 : 555} y={i < 2 ? 155 : 235} width="130" height="45" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={i === 0 || i === 3 ? 465 : 620} y={i < 2 ? 174 : 254} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={i === 0 || i === 3 ? 465 : 620} y={i < 2 ? 193 : 273} text-anchor="middle" class="ringtensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          {/each}
          <text x="535" y="311" text-anchor="middle" class="small">{COMM_RING_PHASE_STEPS} {t('more rounds · all 4 chunks each', '轮 · 每卡集齐 4 块')}</text>
          <text x="360" y="358" text-anchor="middle" class="result">2 × (4 − 1) = {COMM_RING_TOTAL_STEPS} {t('rounds · each GPU sends S/4 per round', '轮 · 每卡每轮发送 S/4')}</text>
          <text x="360" y="383" text-anchor="middle" class="result">{t('sent per GPU', '每卡发送')} = {COMM_RING_TOTAL_STEPS} × S/4 = {COMM_RING_PER_RANK_SEND_TENSORS}S</text>
        {:else}
          <rect x="18" y="70" width="264" height="188" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="94" text-anchor="middle" class="section">1 · Reduce-Scatter</text>
          <text x="150" y="115" text-anchor="middle" class="small">{t('add · keep one chunk per GPU', '求和 · 每卡留下一块')}</text>
          {#each COMM_PARTIAL_TENSORS as _, i}
            <rect x={i === 0 || i === 3 ? 28 : 158} y={i < 2 ? 125 : 185} width="114" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={i === 0 || i === 3 ? 85 : 215} y={i < 2 ? 146 : 206} text-anchor="middle" class="small strong">GPU {i} · {String.fromCharCode(65 + i)}</text>
            <text x={i === 0 || i === 3 ? 85 : 215} y={i < 2 ? 165 : 225} text-anchor="middle" class="small">= 10</text>
          {/each}
          <text x="150" y="249" text-anchor="middle" class="small">0→1→2→3→0 · {COMM_RING_PHASE_STEPS} {t('rounds', '轮')}</text>

          <rect x="18" y="268" width="264" height="188" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="292" text-anchor="middle" class="section">2 · All-Gather</text>
          <text x="150" y="313" text-anchor="middle" class="small">{t('share all 4 chunks', '把 4 块发给每卡')}</text>
          {#each COMM_PARTIAL_TENSORS as _, i}
            <rect x={i === 0 || i === 3 ? 28 : 158} y={i < 2 ? 323 : 383} width="114" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={i === 0 || i === 3 ? 85 : 215} y={i < 2 ? 342 : 402} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={i === 0 || i === 3 ? 85 : 215} y={i < 2 ? 362 : 422} text-anchor="middle" class="ringtensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          {/each}
          <text x="150" y="447" text-anchor="middle" class="small">{t('same ring', '同一个环')} · +{COMM_RING_PHASE_STEPS} {t('rounds', '轮')}</text>
          <text x="150" y="482" text-anchor="middle" class="result">2 × (4 − 1) = {COMM_RING_TOTAL_STEPS} {t('rounds', '轮')}</text>
          <text x="150" y="507" text-anchor="middle" class="result">{COMM_RING_TOTAL_STEPS} × S/4 = {COMM_RING_PER_RANK_SEND_TENSORS}S</text>
          <text x="150" y="531" text-anchor="middle" class="small">{t('sent by each GPU in total', '每张卡总共发送的张量字节数')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Teaching ring; payload only, not a time forecast.', '教学 Ring；只算张量载荷，不预测耗时。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 17px; font-weight: 700; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .total { font-family: var(--mono); font-size: 18px; font-weight: 700; fill: var(--fg); }
  .tensor { font-family: var(--mono); font-size: 18px; font-weight: 700; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 15px; fill: var(--fg); }
  .ringtensor { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section, .total, .tensor { font-size: 15px; }
    .ringtensor { font-size: 10.5px; }
    .result { font-size: 13px; }
  }
</style>
