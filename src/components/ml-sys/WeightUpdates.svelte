<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { UPDATE_DEBUG_BF16_BYTES, UPDATE_DEBUG_WEIGHT_GB, UPDATE_DEBUG_INITIAL_S, UPDATE_DEBUG_INNER_S, UPDATE_DEBUG_OUTER_S, UPDATE_GROUP_SIZE_TP_ONE, UPDATE_GROUP_SIZE_TP_TWO, UPDATE_EXAMPLE_FULL_ROWS, UPDATE_EXAMPLE_FULL_COLS, UPDATE_EXAMPLE_FSDP_TP, UPDATE_EXAMPLE_FSDP_ROWS, UPDATE_EXAMPLE_FULL_ELEMENTS, UPDATE_DEBUG_SLEEP_COUNT, UPDATE_DEBUG_SLEEP_MS, UPDATE_DEBUG_SLEEP_TOTAL_MS, UPDATE_DEBUG_OUTER_MS, UPDATE_DEBUG_INNER_MS, UPDATE_DEBUG_OTHER_MS, UPDATE_DEBUG_NO_SLEEP_S, UPDATE_DEBUG_SAVED_S, UPDATE_DEBUG_SPEEDUP } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; foot2?: string; foot2Zh?: string;
    mobileTitle?: string; mobileTitleZh?: string; mobileSubtitle?: string; mobileSubtitleZh?: string; mobileFoot?: string; mobileFootZh?: string;
    mobile: MobileItem[]; formulas: { en: string; zh: string }[];
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: `A 1B bf16 model has about ${UPDATE_DEBUG_WEIGHT_GB} GB of weights. One debug run took ${UPDATE_DEBUG_INITIAL_S} seconds to update them.`,
    captionZh: `1B bf16 模型约有 ${UPDATE_DEBUG_WEIGHT_GB} GB 权重。一次调试中，完整更新花了 ${UPDATE_DEBUG_INITIAL_S} 秒。`,
    title: 'The inner copy looks fast, but the call is slow', titleZh: '里面复制很快，整个调用却很慢',
    subtitle: 'weight update = replace the rollout model\'s old number tables after training', subtitleZh: '权重更新 = 训练后换掉 rollout 模型里的旧数字表',
    foot: 'One author\'s distributed-update debug log; not a disk-versus-direct benchmark.', footZh: '一位作者的 distributed 更新调试记录，不是磁盘与直传的对比实验。',
    mobileTitle: 'The call is slow', mobileTitleZh: '整个调用很慢',
    mobileSubtitle: 'weight update = replace old weights', mobileSubtitleZh: '权重更新 = 换掉旧数字表',
    mobileFoot: 'Debug log; not a transport comparison.', mobileFootZh: '调试记录，不是传输对照实验。',
    mobile: [
      { title: 'TRAINING · WEIGHTS v1', titleZh: '训练端 · 权重 v1', body: 'new number tables', bodyZh: '新的数字表', tone: 'orange' },
      { title: 'UPDATE WEIGHTS', titleZh: '更新权重', body: 'copy v1 into rollout', bodyZh: '把 v1 装进 rollout', tone: 'orange' },
      { title: 'ROLLOUT WAITS', titleZh: 'ROLLOUT 等待', body: 'use v1 only after the update', bodyZh: '更新完成后才用 v1', tone: 'blue' },
    ],
    formulas: [
      { en: `1B × ${UPDATE_DEBUG_BF16_BYTES} B = ${UPDATE_DEBUG_WEIGHT_GB} GB of weights`, zh: `10 亿个数 × 每个 ${UPDATE_DEBUG_BF16_BYTES} B = ${UPDATE_DEBUG_WEIGHT_GB} GB 权重` },
      { en: `whole-model update = ${UPDATE_DEBUG_INITIAL_S} s`, zh: `完整更新 = ${UPDATE_DEBUG_INITIAL_S} 秒` },
      { en: `one parameter: inside ${UPDATE_DEBUG_INNER_S} s · whole call ${UPDATE_DEBUG_OUTER_S} s`, zh: `一个参数：内部 ${UPDATE_DEBUG_INNER_S} 秒 · 整个调用 ${UPDATE_DEBUG_OUTER_S} 秒` },
    ],
  }, {
    caption: 'A checkpoint is a saved copy of the weights. Every rollout engine can read the same checkpoint.',
    captionZh: 'Checkpoint 是保存下来的整套权重。每个 rollout 都能读同一份 checkpoint。',
    title: 'Three channels · 1 of 3: the disk checkpoint', titleZh: '三条通道 · 第 1 条：磁盘 checkpoint',
    subtitle: 'checkpoint = a saved copy of all weights that another process can read', subtitleZh: 'checkpoint = 存下来的整套权重，别的进程可以读取',
    foot: 'Disk speed depends on storage; the source gives no disk timing.', footZh: '磁盘路线快慢取决于存储；来源没有给出磁盘计时。',
    mobileTitle: '1 of 3 · disk checkpoint', mobileTitleZh: '第 1 条 · 磁盘 checkpoint',
    mobileSubtitle: 'checkpoint = saved weights', mobileSubtitleZh: 'checkpoint = 存好的整套权重',
    mobileFoot: 'No disk timing is claimed.', mobileFootZh: '来源没有磁盘计时。',
    mobile: [
      { title: 'TRAINING WRITES v1', titleZh: '训练端写入 v1', body: 'save one complete copy', bodyZh: '存下一整套权重', tone: 'blue' },
      { title: 'CHECKPOINT v1', titleZh: 'CHECKPOINT v1', body: 'the saved weight file', bodyZh: '保存权重的文件', tone: 'blue' },
      { title: 'EVERY ROLLOUT READS', titleZh: '每个 ROLLOUT 读取', body: 'the same checkpoint', bodyZh: '读同一份 checkpoint', tone: 'blue' },
      { title: 'LOAD_WEIGHTS', titleZh: 'LOAD_WEIGHTS', body: 'replace the old weights', bodyZh: '替换旧权重', tone: 'blue' },
    ],
    formulas: [
      { en: 'disk = write v1, then read v1', zh: '磁盘路线 = 先写 v1，再读 v1' },
      { en: 'distributed = broadcast values', zh: 'distributed = 广播权重数值' },
      { en: 'tensor = send GPU handles', zh: 'tensor = 发送 GPU 定位句柄' },
    ],
  }, {
    caption: 'Training rank 0 broadcasts each parameter\'s values. Each inference rank receives and loads its part.',
    captionZh: '训练端 rank 0 广播每个参数的数值。每个推理 rank 收下并装入自己那部分。',
    title: 'Three channels · 2 of 3: broadcast values', titleZh: '三条通道 · 第 2 条：广播数值',
    subtitle: 'process group = cooperating training and inference ranks · rank = a member number', subtitleZh: 'process group = 一起传权的训练与推理 rank · rank = 成员编号',
    foot: 'The group has 1 training rank plus the inference TP ranks.', footZh: '通信组包含 1 个训练 rank，再加上推理端的 TP rank。',
    mobileTitle: '2 of 3 · broadcast values', mobileTitleZh: '第 2 条 · 广播数值',
    mobileSubtitle: 'process group = cooperating ranks', mobileSubtitleZh: 'process group = 一起传权的 rank',
    mobileFoot: 'world size = 1 + inference TP', mobileFootZh: '组大小 = 1 + 推理 TP',
    mobile: [
      { title: 'TRAINING RANK 0', titleZh: '训练端 RANK 0', body: 'send the parameter values', bodyZh: '发出参数数值', tone: 'orange' },
      { title: 'PROCESS GROUP', titleZh: 'PROCESS GROUP', body: 'broadcast(src = 0)', bodyZh: '从 rank 0 广播', tone: 'orange' },
      { title: 'INFERENCE RANKS', titleZh: '推理端各 RANK', body: 'receive and load their parts', bodyZh: '收下并装入各自部分', tone: 'blue' },
    ],
    formulas: [
      { en: `TP 1 → ${UPDATE_GROUP_SIZE_TP_ONE} ranks · TP 2 → ${UPDATE_GROUP_SIZE_TP_TWO} ranks`, zh: `TP 1 → 组内 ${UPDATE_GROUP_SIZE_TP_ONE} 人 · TP 2 → 组内 ${UPDATE_GROUP_SIZE_TP_TWO} 人` },
      { en: 'world size = 1 + inference TP', zh: '组大小 = 1 + 推理 TP' },
      { en: 'for each parameter: allocate → broadcast → load', zh: '每个参数：分配空间 → 广播 → 装入' },
    ],
  }, {
    caption: 'The tensor route assembles one full parameter. It sends handles that locate GPU memory, not the parameter\'s bytes.',
    captionZh: 'Tensor 路线先拼出一个完整参数。它发送的是 GPU 内存定位句柄，不是参数字节。',
    title: 'Three channels · 3 of 3: send GPU handles', titleZh: '三条通道 · 第 3 条：发送 GPU 句柄',
    subtitle: 'handle = instructions for finding an existing GPU tensor', subtitleZh: 'handle = 找到已有 GPU 张量所需的位置信息',
    foot: 'The handle tuple carries reconstruction metadata, not the tensor data.', footZh: 'handle tuple 携带重建信息，不携带张量数据本身。',
    mobileTitle: '3 of 3 · GPU handles', mobileTitleZh: '第 3 条 · GPU 句柄',
    mobileSubtitle: 'handle = tensor location information', mobileSubtitleZh: 'handle = 张量的位置信息',
    mobileFoot: 'Handles do not contain the weight bytes.', mobileFootZh: '句柄里没有权重字节。',
    mobile: [
      { title: '4 TRAINING PIECES', titleZh: '4 块训练分片', body: '[256, 1024] each', bodyZh: '每块 [256, 1024]', tone: 'orange' },
      { title: 'FULL_TENSOR()', titleZh: 'FULL_TENSOR()', body: 'assemble [1024, 1024]', bodyZh: '拼成 [1024, 1024]', tone: 'orange' },
      { title: 'HANDLE TUPLE', titleZh: 'HANDLE TUPLE', body: 'location information, not bytes', bodyZh: '位置信息，不是字节', tone: 'orange' },
      { title: 'SGLANG REBUILDS + LOADS', titleZh: 'SGLANG 重建并装入', body: 'tensor.get(tp_rank)', bodyZh: '按 rank 取得张量', tone: 'blue' },
    ],
    formulas: [
      { en: `4 × 256 × 1024 = ${UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')} elements`, zh: `4 × 256 × 1024 = ${UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')} 个数` },
      { en: 'serialize the handle, not the payload', zh: '序列化句柄，不序列化数据本体' },
      { en: 'gather_object collects handles at rank 0', zh: 'gather_object 把句柄收拢到 rank 0' },
    ],
  }, {
    caption: 'A bucket is a small group of parameters processed together. Slime finishes and clears one bucket before starting the next.',
    captionZh: 'Bucket 是一起处理的一小组参数。slime 处理并清空一桶，再取下一桶。',
    title: 'Slime restores one bucket at a time', titleZh: 'slime 每次只恢复一桶权重',
    subtitle: 'bucket = a small group of parameters brought back to the GPU together', subtitleZh: 'bucket = 一起拿回 GPU 处理的一小组参数',
    foot: 'Schematic residency; the source gives no bucket byte size.', footZh: '图中只画占用关系；来源没有给出每桶字节数。',
    mobileTitle: 'One bucket at a time', mobileTitleZh: '每次只处理一桶',
    mobileSubtitle: 'bucket = a small parameter group', mobileSubtitleZh: 'bucket = 一小组参数',
    mobileFoot: 'No bucket size is claimed.', mobileFootZh: '不虚构每桶大小。',
    mobile: [
      { title: 'TRAINING WEIGHTS WAIT', titleZh: '训练权重先等待', body: 'not all restored to the GPU', bodyZh: '不全部拿回 GPU', tone: 'plain' },
      { title: 'UPLOAD BUCKET 1', titleZh: '拿回第 1 桶', body: 'only this small group', bodyZh: '只拿这一小组', tone: 'orange' },
      { title: 'ASSEMBLE + SEND HANDLES', titleZh: '拼好并发送句柄', body: 'update these parameters', bodyZh: '更新这组参数', tone: 'orange' },
      { title: 'RAY.GET → CLEAR → NEXT', titleZh: '等待 → 清空 → 下一桶', body: 'finish before reusing the space', bodyZh: '完成后才复用空间', tone: 'blue' },
    ],
    formulas: [
      { en: 'GPU holds SGLang + one bucket', zh: 'GPU 上是 SGLang + 一桶' },
      { en: 'not SGLang + the whole training model', zh: '不是 SGLang + 整套训练模型' },
      { en: 'upload → assemble → send → wait → clear', zh: '拿回 → 拼好 → 发送 → 等待 → 清空' },
    ],
  }, {
    caption: 'Generation must not read a half-updated model. The next rollout waits for every parameter and the old cache.',
    captionZh: '生成不能读到只更新一半的模型。下一轮要等参数全部更新，并清掉旧缓存。',
    title: 'Replace one whole version, never a mixture', titleZh: '换成完整的新版本，不能新旧混用',
    subtitle: 'version boundary = generation pauses while any parameter is changing', subtitleZh: '版本边界 = 只要还有参数在变化，生成就暂停',
    foot: 'Slime clears old KV before buckets; verl requests a flush on the last parameter.', footZh: 'slime 在分桶前清旧 KV；verl 在最后一个参数时请求清理。',
    mobileTitle: 'No old-and-new mixture', mobileTitleZh: '不能新旧混用',
    mobileSubtitle: 'generation pauses during replacement', mobileSubtitleZh: '替换期间暂停生成',
    mobileFoot: 'Old KV also must be invalidated.', mobileFootZh: '旧 KV 也必须失效。',
    mobile: [
      { title: 'ROLLOUT 0 STOPS', titleZh: '第 0 轮停止', body: 'no new generation', bodyZh: '不再生成', tone: 'blue' },
      { title: 'DRAIN ACTIVE REQUESTS', titleZh: '等当前请求结束', body: 'no reader inside the update', bodyZh: '更新时没有读者', tone: 'orange' },
      { title: 'UPDATE EVERY PARAMETER', titleZh: '更新每个参数', body: 'invalidate KV made under v0', bodyZh: '让 v0 产生的 KV 失效', tone: 'orange' },
      { title: 'AWAIT COMPLETION', titleZh: '等待全部完成', body: 'discard a partial failure', bodyZh: '部分失败就整套弃用', tone: 'orange' },
      { title: 'ROLLOUT 1 USES v1', titleZh: '第 1 轮使用 v1', body: 'one complete version', bodyZh: '完整的同一版本', tone: 'blue' },
    ],
    formulas: [
      { en: 'start after every parameter updates', zh: '每个参数都更新完，才开始' },
      { en: 'never generate with v0 + v1 mixed', zh: '绝不能新旧权重混着生成' },
    ],
  }, {
    caption: `Three ${UPDATE_DEBUG_SLEEP_MS} ms sleeps sat outside ModelRunner. Removing them cut this full update from ${UPDATE_DEBUG_INITIAL_S} to ${UPDATE_DEBUG_NO_SLEEP_S} seconds.`,
    captionZh: `ModelRunner 外面有 3 次 ${UPDATE_DEBUG_SLEEP_MS} ms 的 sleep。去掉后，这次完整更新从 ${UPDATE_DEBUG_INITIAL_S} 秒降到 ${UPDATE_DEBUG_NO_SLEEP_S} 秒。`,
    title: 'Measure the whole call, not only ModelRunner', titleZh: '测量整个调用，不能只测 ModelRunner',
    subtitle: 'outer timer = whole request · inner timer = ModelRunner only', subtitleZh: '外部计时 = 整个请求 · 内部计时 = 只测 ModelRunner',
    foot: 'Successive measurements in one debug note; not a general speedup.', footZh: '同一调试记录里的前后测量，不是普遍加速结论。',
    mobileTitle: 'Time the whole call', mobileTitleZh: '测量整个调用',
    mobileSubtitle: 'inner timer misses outside waits', mobileSubtitleZh: '内部计时漏掉外面的等待',
    mobileFoot: 'One debug run, not a general result.', mobileFootZh: '一次调试结果，不是普遍结论。',
    mobile: [
      { title: 'OUTER CALL · 33 ms', titleZh: '外部调用 · 33 ms', body: 'ModelRunner reports only 1 ms', bodyZh: 'ModelRunner 只报告 1 ms', tone: 'orange' },
      { title: '3 SLEEPS · 30 ms', titleZh: '3 次 SLEEP · 30 ms', body: 'fixed waits outside ModelRunner', bodyZh: 'ModelRunner 外面的固定等待', tone: 'orange' },
      { title: 'REMOVE THE SLEEPS', titleZh: '去掉这些 SLEEP', body: 'full update becomes 2.202 s', bodyZh: '完整更新变成 2.202 秒', tone: 'blue' },
    ],
    formulas: [
      { en: '3 × 10 ms = 30 ms', zh: '3 × 10 ms = 30 ms' },
      { en: '1 + 30 + 2 = 33 ms, rounded', zh: '1 + 30 + 2 = 33 ms，均为舍入值' },
      { en: '7.047 − 2.202 = 4.845 s saved', zh: '7.047 − 2.202 = 少等 4.845 秒' },
      { en: '7.047 ÷ 2.202 ≈ 3.20×', zh: '7.047 ÷ 2.202 ≈ 3.20 倍' },
    ],
  }, {
    caption: 'Training also keeps gradients and optimizer records. If the full state does not fit, what should each GPU keep?',
    captionZh: '训练还要保存梯度和优化器记录。完整状态装不下时，每张 GPU 该留哪一片？',
    title: 'The next limit is the full training state', titleZh: '下一个限制是完整训练状态',
    subtitle: 'training state = the number tables that training must keep', subtitleZh: '训练状态 = 训练必须保存的那些数字表',
    foot: 'Next chapter: FSDP2 training backend.', footZh: '下一章：FSDP2 训练后端。',
    mobileTitle: 'The full training state', mobileTitleZh: '完整训练状态',
    mobileSubtitle: 'training keeps more than weights', mobileSubtitleZh: '训练保存的不只是权重',
    mobileFoot: 'Next: FSDP2 training backend.', mobileFootZh: '下一章：FSDP2 训练后端。',
    mobile: [
      { title: 'WEIGHTS v1', titleZh: '权重 v1', body: 'the model numbers', bodyZh: '模型的数字', tone: 'orange' },
      { title: 'GRADIENTS', titleZh: '梯度', body: 'directions for changing weights', bodyZh: '修改权重的方向', tone: 'orange' },
      { title: 'OPTIMIZER STATE', titleZh: '优化器状态', body: 'bookkeeping for later changes', bodyZh: '后续修改所需的记录', tone: 'orange' },
      { title: 'FULL STATE MAY NOT FIT', titleZh: '完整状态可能装不下', body: 'fast transfer does not shrink it', bodyZh: '传输变快也不会让它变小', tone: 'plain' },
      { title: 'EACH GPU KEEPS ?', titleZh: '每张 GPU 留下 ?', body: 'which slice of each table?', bodyZh: '每张表各留哪一片？', tone: 'blue' },
    ],
    formulas: [
      { en: 'weights + gradients + optimizer', zh: '训练状态 = 权重 + 梯度 + 优化器状态' },
      { en: 'next: which slice per GPU?', zh: '下一章：每张 GPU 各留哪一片？' },
    ],
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
  const H = $derived(phone ? [480, 620, 510, 620, 620, 640, 520, 640][step] : [410, 480, 460, 500, 490, 490, 520, 500][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="update-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="update-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobileTitle ?? cur.title, cur.mobileTitleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobileSubtitle ?? cur.subtitle, cur.mobileSubtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.mobile as item, i}
          {@const y = 80 + i * 91}
          <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
          <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
          <text x="150" y={y + 50} text-anchor="middle" class="small">{t(item.body, item.bodyZh)}</text>
          {#if i < cur.mobile.length - 1}
            <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={item.tone === 'plain' ? 'var(--accent)' : stroke(item.tone)} stroke-width="2.5" marker-end={item.tone === 'orange' ? 'url(#update-arrow-orange)' : 'url(#update-arrow-blue)'} />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
      {:else if step === 0}
        <rect x="35" y="92" width="170" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="120" y="126" text-anchor="middle" class="section">TRAINING</text>
        <text x="120" y="163" text-anchor="middle" class="result">weights v1</text>
        <text x="120" y="188" text-anchor="middle" class="small">{t('new number tables', '新的数字表')}</text>
        <line x1="205" y1="148" x2="260" y2="148" stroke="var(--gen)" stroke-width="3" marker-end="url(#update-arrow-orange)" />
        <rect x="270" y="92" width="180" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="360" y="126" text-anchor="middle" class="section">UPDATE WEIGHTS</text>
        <text x="360" y="163" text-anchor="middle" class="result">?</text>
        <text x="360" y="188" text-anchor="middle" class="small">{t('copy v1 into rollout', '把 v1 装进 rollout')}</text>
        <line x1="450" y1="148" x2="505" y2="148" stroke="var(--accent)" stroke-width="3" marker-end="url(#update-arrow-blue)" />
        <rect x="515" y="92" width="170" height="112" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="600" y="126" text-anchor="middle" class="section">ROLLOUT</text>
        <text x="600" y="163" text-anchor="middle" class="result">{t('waits', '等待')}</text>
        <text x="600" y="188" text-anchor="middle" class="small">{t('then uses v1', '完成后才用 v1')}</text>
        <rect x="35" y="235" width="310" height="111" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="190" y="265" text-anchor="middle" class="small strong">{t('WEIGHT SIZE', '权重有多大')}</text>
        <text x="190" y="298" text-anchor="middle" class="result">1B × {UPDATE_DEBUG_BF16_BYTES} B = {UPDATE_DEBUG_WEIGHT_GB} GB</text>
        <text x="190" y="326" text-anchor="middle" class="small">{t('1 billion numbers, 2 bytes each', '10 亿个数，每个占 2 字节')}</text>
        <rect x="375" y="235" width="310" height="111" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="530" y="265" text-anchor="middle" class="small strong">{t('DEBUG TIME', '调试耗时')}</text>
        <text x="530" y="302" text-anchor="middle" class="big">{UPDATE_DEBUG_INITIAL_S} s</text>
        <text x="530" y="328" text-anchor="middle" class="small">{t(`one call: ${UPDATE_DEBUG_INNER_S} s inside, ${UPDATE_DEBUG_OUTER_S} s outside`, `一次调用：内部 ${UPDATE_DEBUG_INNER_S} 秒，外部 ${UPDATE_DEBUG_OUTER_S} 秒`)}</text>
      {:else if step === 1}
        {#each [
          { x: 30, title: '1 · DISK', titleZh: '1 · 磁盘', body: 'checkpoint file', bodyZh: 'checkpoint 文件', selected: true },
          { x: 265, title: '2 · DISTRIBUTED', titleZh: '2 · DISTRIBUTED', body: 'broadcast values', bodyZh: '广播权重数值', selected: false },
          { x: 500, title: '3 · TENSOR', titleZh: '3 · TENSOR', body: 'GPU handles', bodyZh: 'GPU 定位句柄', selected: false },
        ] as route}
          <rect x={route.x} y="82" width="190" height="99" rx="12" fill={route.selected ? 'var(--accent-soft)' : 'var(--bg)'} stroke={route.selected ? 'var(--accent)' : 'var(--line)'} />
          <text x={route.x + 95} y="112" text-anchor="middle" class="small strong">{t(route.title, route.titleZh)}</text>
          <text x={route.x + 95} y="143" text-anchor="middle" class="small">{t(route.body, route.bodyZh)}</text>
          <text x={route.x + 95} y="165" text-anchor="middle" class="small">{route.selected ? t('write, then read', '先写入，再读取') : t('next steps', '后面两步')}</text>
        {/each}
        {#each [
          { x: 25, title: 'TRAINING', titleZh: '训练端', body: 'write v1', bodyZh: '写入 v1' },
          { x: 200, title: 'CHECKPOINT', titleZh: 'CHECKPOINT', body: 'saved v1', bodyZh: '存好的 v1' },
          { x: 375, title: 'ROLLOUT A + B', titleZh: 'ROLLOUT A + B', body: 'read same v1', bodyZh: '读同一 v1' },
          { x: 550, title: 'MODEL', titleZh: '模型', body: 'load v1', bodyZh: '装入 v1' },
        ] as node, i}
          <rect x={node.x} y="222" width="145" height="105" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={node.x + 72.5} y="255" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 72.5} y="293" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 3}<line x1={node.x + 145} y1="274" x2={node.x + 168} y2="274" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#update-arrow-blue)" />{/if}
        {/each}
        <text x="360" y="366" text-anchor="middle" class="code">update_weights_from_disk → model.load_weights</text>
        <text x="360" y="403" text-anchor="middle" class="small">{t('The same saved file can also serve a newly added rollout engine.', '新加入的 rollout 也能读取这份已保存的权重。')}</text>
        <text x="360" y="433" text-anchor="middle" class="small">{t('Blue = the disk route · grey = the two direct alternatives', '蓝 = 磁盘路线 · 灰 = 另外两条直接通道')}</text>
      {:else if step === 2}
        <rect x="35" y="86" width="310" height="235" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="190" y="116" text-anchor="middle" class="section">TP = 1</text>
        <rect x="55" y="160" width="110" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="110" y="185" text-anchor="middle" class="small strong">{t('TRAINING', '训练端')}</text>
        <text x="110" y="207" text-anchor="middle" class="small">rank 0</text>
        <line x1="165" y1="191" x2="207" y2="191" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <rect x="215" y="160" width="110" height="62" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="270" y="185" text-anchor="middle" class="small strong">{t('INFERENCE', '推理端')}</text>
        <text x="270" y="207" text-anchor="middle" class="small">rank 1</text>
        <text x="190" y="266" text-anchor="middle" class="result">world size = 1 + 1 = {UPDATE_GROUP_SIZE_TP_ONE}</text>
        <text x="190" y="296" text-anchor="middle" class="small">{t('two group members', '组内两个成员')}</text>
        <rect x="375" y="86" width="310" height="235" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="530" y="116" text-anchor="middle" class="section">TP = 2</text>
        <rect x="395" y="160" width="105" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="447" y="185" text-anchor="middle" class="small strong">{t('TRAINING', '训练端')}</text>
        <text x="447" y="207" text-anchor="middle" class="small">rank 0</text>
        <line x1="500" y1="182" x2="545" y2="149" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <line x1="500" y1="201" x2="545" y2="232" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <rect x="555" y="123" width="110" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="610" y="154" text-anchor="middle" class="small">rank 1</text>
        <rect x="555" y="207" width="110" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="610" y="238" text-anchor="middle" class="small">rank 2</text>
        <text x="530" y="286" text-anchor="middle" class="result">world size = 1 + 2 = {UPDATE_GROUP_SIZE_TP_TWO}</text>
        <text x="530" y="310" text-anchor="middle" class="small">{t('three group members', '组内三个成员')}</text>
        <text x="360" y="355" text-anchor="middle" class="code">for each parameter: allocate → broadcast(src=0) → load_weights</text>
        <text x="360" y="390" text-anchor="middle" class="small">{t('Orange = sends values · blue = receives values', '橙 = 发出数值 · 蓝 = 接收数值')}</text>
        <text x="360" y="422" text-anchor="middle" class="code">update_weights_from_distributed</text>
      {:else if step === 3}
        <text x="360" y="88" text-anchor="middle" class="small strong">{t('ONE PARAMETER · FOUR TRAINING PIECES', '一个参数 · 训练端的四块分片')}</text>
        {#each [0, 1, 2, 3] as i}
          <rect x={30 + i * 76} y="108" width="66" height="59" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={63 + i * 76} y="134" text-anchor="middle" class="small">[{UPDATE_EXAMPLE_FSDP_ROWS},</text>
          <text x={63 + i * 76} y="153" text-anchor="middle" class="small">{UPDATE_EXAMPLE_FULL_COLS}]</text>
        {/each}
        <line x1="337" y1="138" x2="380" y2="138" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <rect x="390" y="99" width="290" height="79" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="535" y="130" text-anchor="middle" class="section">FULL_TENSOR()</text>
        <text x="535" y="158" text-anchor="middle" class="result">[{UPDATE_EXAMPLE_FULL_ROWS}, {UPDATE_EXAMPLE_FULL_COLS}]</text>
        <text x="360" y="211" text-anchor="middle" class="result">{UPDATE_EXAMPLE_FSDP_TP} × {UPDATE_EXAMPLE_FSDP_ROWS} × {UPDATE_EXAMPLE_FULL_COLS} = {UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')} {t('elements', '个数')}</text>
        <text x="360" y="251" text-anchor="middle" class="code">MultiprocessingSerializer.serialize(full_tensor)</text>
        <rect x="40" y="274" width="270" height="116" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="175" y="307" text-anchor="middle" class="section">HANDLE TUPLE</text>
        <text x="175" y="340" text-anchor="middle" class="small">shape · stride</text>
        <text x="175" y="366" text-anchor="middle" class="small">storage handle</text>
        <line x1="310" y1="332" x2="405" y2="332" stroke="var(--accent)" stroke-width="3" marker-end="url(#update-arrow-blue)" />
        <rect x="415" y="274" width="265" height="116" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="547" y="307" text-anchor="middle" class="section">SGLANG</text>
        <text x="547" y="340" text-anchor="middle" class="code">tensor.get(tp_rank)</text>
        <text x="547" y="368" text-anchor="middle" class="code">→ load_weights</text>
        <text x="360" y="427" text-anchor="middle" class="small strong">{t('Only the handle crosses this arrow; the weight bytes do not.', '箭头只传句柄，不传权重字节。')}</text>
        <text x="360" y="458" text-anchor="middle" class="small">{t('Orange = training-side work · blue = inference-side work', '橙 = 训练端工作 · 蓝 = 推理端工作')}</text>
      {:else if step === 4}
        <rect x="30" y="85" width="315" height="259" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="187" y="115" text-anchor="middle" class="section">{t('WITHOUT BUCKETS', '不分桶')}</text>
        <rect x="50" y="136" width="275" height="55" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="187" y="169" text-anchor="middle" class="small strong">SGLANG + KV</text>
        <rect x="50" y="207" width="275" height="104" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="187" y="237" text-anchor="middle" class="small strong">{t('ALL TRAINING WEIGHTS', '整套训练权重')}</text>
        <text x="187" y="267" text-anchor="middle" class="small">{t('restored beside SGLang', '全部恢复到 SGLang 旁边')}</text>
        <text x="187" y="295" text-anchor="middle" class="small">{t('can exceed the card', '可能超出显卡容量')}</text>
        <rect x="375" y="85" width="315" height="259" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="532" y="115" text-anchor="middle" class="section">{t('WITH BUCKETS', '分桶')}</text>
        <rect x="395" y="136" width="275" height="55" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="532" y="169" text-anchor="middle" class="small strong">SGLANG + KV</text>
        <rect x="395" y="207" width="275" height="52" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="532" y="239" text-anchor="middle" class="small strong">BUCKET 1 · {t('ON GPU', '在 GPU 上')}</text>
        <rect x="395" y="275" width="275" height="43" rx="9" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="532" y="302" text-anchor="middle" class="small">BUCKETS 2, 3 · {t('WAIT OFF GPU', '在 GPU 外等待')}</text>
        <text x="360" y="378" text-anchor="middle" class="code">upload → assemble → convert → send handles → ray.get → clear</text>
        <text x="360" y="413" text-anchor="middle" class="small strong">{t('ray.get finishes before the converted bucket is cleared.', 'ray.get 完成后，才清空这一桶的转换结果。')}</text>
        <text x="360" y="447" text-anchor="middle" class="small">{t('Blue = rollout state · orange = training weights being updated', '蓝 = rollout 状态 · 橙 = 正在更新的训练权重')}</text>
      {:else if step === 5}
        <rect x="35" y="90" width="190" height="121" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="130" y="124" text-anchor="middle" class="section">{t('BEFORE', '更新前')}</text>
        <text x="130" y="165" text-anchor="middle" class="big">v0</text>
        <text x="130" y="191" text-anchor="middle" class="small">{t('one complete version', '完整的一套旧权重')}</text>
        <line x1="225" y1="150" x2="255" y2="150" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <rect x="265" y="90" width="190" height="121" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-dasharray="6 4" />
        <text x="360" y="124" text-anchor="middle" class="section">{t('UPDATING', '更新中')}</text>
        <text x="360" y="160" text-anchor="middle" class="result">v0 + v1</text>
        <text x="360" y="191" text-anchor="middle" class="small strong">{t('GENERATION PAUSED', '生成暂停')}</text>
        <line x1="455" y1="150" x2="485" y2="150" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
        <rect x="495" y="90" width="190" height="121" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="590" y="124" text-anchor="middle" class="section">{t('AFTER', '更新后')}</text>
        <text x="590" y="165" text-anchor="middle" class="big">v1</text>
        <text x="590" y="191" text-anchor="middle" class="small">{t('one complete version', '完整的一套新权重')}</text>
        <text x="360" y="244" text-anchor="middle" class="small strong">{t('KV produced under v0 must also become invalid.', 'v0 产生的 KV 也必须失效。')}</text>
        {#each [
          { x: 45, title: 'DRAIN', titleZh: '等待排空', body: 'active requests', bodyZh: '当前请求' },
          { x: 215, title: 'UPDATE ALL', titleZh: '全部更新', body: 'every parameter', bodyZh: '每个参数' },
          { x: 385, title: 'AWAIT', titleZh: '等待完成', body: 'the whole update', bodyZh: '整个更新' },
          { x: 555, title: 'ROLLOUT 1', titleZh: '第 1 轮', body: 'use v1', bodyZh: '使用 v1' },
        ] as node, i}
          <rect x={node.x} y="280" width="125" height="90" rx="10" fill={i === 3 ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i === 3 ? 'var(--accent)' : 'var(--gen)'} />
          <text x={node.x + 62.5} y="311" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 62.5} y="342" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 3}<line x1={node.x + 125} y1="325" x2={node.x + 158} y2="325" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />{/if}
        {/each}
        <text x="360" y="411" text-anchor="middle" class="small strong">{t('If any parameter fails, discard the partially updated model.', '只要一个参数失败，就弃用这套只更新了一部分的模型。')}</text>
        <text x="360" y="447" text-anchor="middle" class="small">{t('Blue = complete versions · orange = update work · red outline = unsafe mixture', '蓝 = 完整版本 · 橙 = 更新工作 · 红框 = 危险的新旧混合')}</text>
      {:else if step === 6}
        <text x="35" y="104" class="small strong">{t('WITH SLEEPS', '保留 SLEEP')}</text>
        <rect x="160" y="82" width="500" height="38" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="645" y="107" text-anchor="end" class="result">{UPDATE_DEBUG_INITIAL_S} s</text>
        <text x="35" y="172" class="small strong">{t('WITHOUT SLEEPS', '去掉 SLEEP')}</text>
        <rect x="160" y="150" width={500 * UPDATE_DEBUG_NO_SLEEP_S / UPDATE_DEBUG_INITIAL_S} height="38" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={175 + 500 * UPDATE_DEBUG_NO_SLEEP_S / UPDATE_DEBUG_INITIAL_S} y="175" class="result">{UPDATE_DEBUG_NO_SLEEP_S} s</text>
        <text x="360" y="224" text-anchor="middle" class="result">{UPDATE_DEBUG_INITIAL_S} − {UPDATE_DEBUG_NO_SLEEP_S} = {UPDATE_DEBUG_SAVED_S} s {t('saved', '少等')} · ≈ {UPDATE_DEBUG_SPEEDUP.toFixed(2)}×</text>
        <text x="360" y="278" text-anchor="middle" class="small strong">{t('ONE PARAMETER · OUTER CALL = 33 ms, ROUNDED', '一个参数 · 外部调用 = 33 ms，均为舍入值')}</text>
        <rect x="200" y="302" width="10" height="48" fill="var(--accent-soft)" stroke="var(--accent)" />
        {#each [0, 1, 2] as i}
          <rect x={210 + i * 100} y="302" width="100" height="48" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={260 + i * 100} y="331" text-anchor="middle" class="small">{UPDATE_DEBUG_SLEEP_MS} ms</text>
        {/each}
        <rect x="510" y="302" width="20" height="48" fill="var(--bg)" stroke="var(--line)" />
        <text x="205" y="374" text-anchor="middle" class="small">{UPDATE_DEBUG_INNER_MS} ms</text>
        <text x="205" y="394" text-anchor="middle" class="small">{t('inside', '内部')}</text>
        <text x="520" y="374" text-anchor="middle" class="small">{UPDATE_DEBUG_OTHER_MS} ms</text>
        <text x="520" y="394" text-anchor="middle" class="small">{t('other', '其他')}</text>
        <text x="360" y="427" text-anchor="middle" class="result">{UPDATE_DEBUG_INNER_MS} + {UPDATE_DEBUG_SLEEP_TOTAL_MS} + {UPDATE_DEBUG_OTHER_MS} = {UPDATE_DEBUG_OUTER_MS} ms</text>
        <text x="360" y="462" text-anchor="middle" class="small">{t('Three orange sleeps sit outside ModelRunner.', '三个橙色 sleep 都在 ModelRunner 外面。')}</text>
        <text x="360" y="490" text-anchor="middle" class="small">{t('Both full-update bars use the same seconds scale.', '两条完整更新柱使用相同的秒数比例。')}</text>
      {:else if step === 7}
        <rect x="25" y="82" width="670" height="195" rx="13" fill="var(--bg)" stroke="var(--gen)" />
        <text x="360" y="112" text-anchor="middle" class="section">{t('FULL TRAINING STATE', '完整训练状态')}</text>
        {#each [
          { x: 45, title: 'WEIGHTS v1', titleZh: '权重 v1', body: 'model numbers', bodyZh: '模型的数字' },
          { x: 260, title: 'GRADIENTS', titleZh: '梯度', body: 'directions to change them', bodyZh: '修改权重的方向' },
          { x: 475, title: 'OPTIMIZER STATE', titleZh: '优化器状态', body: 'later-update bookkeeping', bodyZh: '后续修改的记录' },
        ] as node}
          <rect x={node.x} y="134" width="200" height="112" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={node.x + 100} y="169" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 100} y="205" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          <text x={node.x + 100} y="229" text-anchor="middle" class="small">{t('kept for training', '训练需要保存')}</text>
        {/each}
        <text x="360" y="309" text-anchor="middle" class="small">{t('Step 4 transferred the weight tensor. Training keeps these other tables too.', '第 4 步传的是权重张量；训练还要保存这些其他数字表。')}</text>
        <text x="360" y="345" text-anchor="middle" class="result">{t('If the full set does not fit, which slice should each GPU keep?', '如果完整状态装不下，每张 GPU 该留下哪一片？')}</text>
        {#each [0, 1, 2] as i}
          <rect x={45 + i * 215} y="375" width="200" height="66" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x={145 + i * 215} y="415" text-anchor="middle" class="result">GPU {i} · ?</text>
        {/each}
        <text x="360" y="470" text-anchor="middle" class="small">{t('Orange = training state · blue outline = the unanswered per-GPU share', '橙 = 训练状态 · 蓝框 = 尚未回答的每张 GPU 份额')}</text>
      {/if}
      {#if cur.foot2}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(cur.foot2, cur.foot2Zh ?? cur.foot2)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobileFoot ?? cur.foot, cur.mobileFootZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .big { font-family: var(--mono); font-size: 26px; font-weight: 700; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .code { font-size: 12px; }
    .result { font-size: 12px; }
  }
</style>
