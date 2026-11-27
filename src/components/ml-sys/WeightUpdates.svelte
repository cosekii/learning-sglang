<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { UPDATE_DEBUG_BF16_BYTES, UPDATE_DEBUG_WEIGHT_GB, UPDATE_DEBUG_INITIAL_S, UPDATE_DEBUG_INNER_S, UPDATE_DEBUG_OUTER_S, UPDATE_GROUP_SIZE_TP_ONE, UPDATE_GROUP_SIZE_TP_TWO, UPDATE_EXAMPLE_FULL_ROWS, UPDATE_EXAMPLE_FULL_COLS, UPDATE_EXAMPLE_FSDP_TP, UPDATE_EXAMPLE_FSDP_ROWS, UPDATE_EXAMPLE_FULL_ELEMENTS, UPDATE_DEBUG_SLEEP_COUNT, UPDATE_DEBUG_SLEEP_MS, UPDATE_DEBUG_SLEEP_TOTAL_MS, UPDATE_DEBUG_OUTER_MS, UPDATE_DEBUG_INNER_MS, UPDATE_DEBUG_OTHER_MS, UPDATE_DEBUG_NO_SLEEP_S, UPDATE_DEBUG_SAVED_S, UPDATE_DEBUG_SPEEDUP, UPDATE_DEBUG_YARDSTICK_MS, UPDATE_DEBUG_FULL_YARDSTICK_RATIO, UPDATE_DEBUG_SLEEP_CALLS } from '../../ml-sys/numbers';

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
    title: 'Model code is fast, but the whole call is slow', titleZh: '模型代码本身很快，整个调用却很慢',
    subtitle: 'weight update = replace the rollout model\'s old number tables after training', subtitleZh: '权重更新 = 训练后换掉 rollout 模型里的旧数字表',
    foot: 'One author\'s distributed-update debug log; not a disk-versus-direct benchmark.', footZh: '一位作者的 distributed 更新调试记录，不是磁盘与直传的对比实验。',
    mobileTitle: 'The call is slow', mobileTitleZh: '整个调用很慢',
    mobileSubtitle: 'weight update = replace old weights', mobileSubtitleZh: '权重更新 = 换掉旧数字表',
    mobileFoot: 'Debug log; not a transport comparison.', mobileFootZh: '调试记录，不是传输对照实验。',
    mobile: [
      { title: 'TRAINING · WEIGHTS v1', titleZh: '训练端 · 权重 v1', body: 'new number tables', bodyZh: '新的数字表', tone: 'orange' },
      { title: 'WHOLE CALL · UPDATE WEIGHTS', titleZh: '整个调用 · 更新权重', body: 'model code = the inner part', bodyZh: '模型代码本身 = 内部部分', tone: 'orange' },
      { title: 'ROLLOUT WAITS', titleZh: 'ROLLOUT 等待', body: 'use v1 only after the update', bodyZh: '更新完成后才用 v1', tone: 'blue' },
    ],
    formulas: [
      { en: `1 billion values × ${UPDATE_DEBUG_BF16_BYTES} bytes = ${UPDATE_DEBUG_WEIGHT_GB} GB`, zh: `10 亿个数 × 每个 ${UPDATE_DEBUG_BF16_BYTES} 字节 = ${UPDATE_DEBUG_WEIGHT_GB} GB` },
      { en: `2 GB ÷ 3.35 TB/s ≈ ${UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms (HBM)`, zh: `2 GB ÷ 3.35 TB/s ≈ ${UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms（HBM 对照）` },
      { en: `full 1B: ${UPDATE_DEBUG_INITIAL_S} s ≈ ${UPDATE_DEBUG_FULL_YARDSTICK_RATIO.toLocaleString('en-US')} × ${UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms`, zh: `完整 1B：${UPDATE_DEBUG_INITIAL_S} 秒 ≈ ${UPDATE_DEBUG_FULL_YARDSTICK_RATIO.toLocaleString('en-US')} × ${UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms` },
      { en: `one tensor: model code ${UPDATE_DEBUG_INNER_S} s`, zh: `一个张量：模型代码本身 ${UPDATE_DEBUG_INNER_S} 秒` },
      { en: `whole call ${UPDATE_DEBUG_OUTER_S} s`, zh: `整个调用 ${UPDATE_DEBUG_OUTER_S} 秒` },
      { en: '0.033 ÷ 0.001 ≈ 33×, rounded', zh: '0.033 ÷ 0.001 ≈ 33 倍，均为舍入值' },
    ],
  }, {
    caption: 'Three update channels carry v1 into rollout. Choose a checkpoint file, a process group, or a GPU location note.',
    captionZh: '有三条通道把 v1 送进 rollout。可以选 checkpoint、process group 或 GPU 位置便签。',
    title: 'A map of three update channels', titleZh: '三条更新通道的地图',
    subtitle: 'update channel = the route that carries v1 into rollout', subtitleZh: '更新通道 = 把 v1 送进 rollout 的路线',
    foot: 'The three routes are alternatives; disk timing is not supplied.', footZh: '三条路线是三选一；来源没有给出磁盘计时。',
    mobileTitle: 'Three update channels', mobileTitleZh: '三条更新通道',
    mobileSubtitle: 'channel = a route for v1', mobileSubtitleZh: '通道 = v1 走的路线',
    mobileFoot: 'Choose one route; no disk time is claimed.', mobileFootZh: '三条选一条；不虚构磁盘时间。',
    mobile: [
      { title: 'DISK · CHECKPOINT', titleZh: '磁盘 · CHECKPOINT', body: 'checkpoint = saved weights', bodyZh: 'checkpoint = 存好的权重', tone: 'blue' },
      { title: 'DISTRIBUTED · GROUP', titleZh: 'DISTRIBUTED · 通信组', body: 'one sender → many receivers', bodyZh: '一个发送方 → 多个接收方', tone: 'blue' },
      { title: 'TENSOR · HANDLE', titleZh: 'TENSOR · 位置便签', body: 'handle = GPU location note', bodyZh: 'handle = GPU 位置便签', tone: 'blue' },
    ],
    formulas: [
      { en: 'disk: write file → read file', zh: '磁盘：写文件 → 读文件' },
      { en: 'distributed: send values → receive', zh: 'distributed：发数值 → 收数值' },
      { en: 'tensor: location note → find tensor', zh: 'tensor：位置便签 → 找到张量' },
    ],
  }, {
    caption: 'Training rank 0 broadcasts each full weight tensor. Each inference rank keeps and loads its part.',
    captionZh: '训练 rank 0 广播每个完整张量。推理 rank 留下并装入各自部分。',
    title: 'Three channels · 2 of 3: broadcast values', titleZh: '三条通道 · 第 2 条：广播数值',
    subtitle: 'rank = member number · broadcast = send identical values to every member', subtitleZh: 'rank = 成员编号 · broadcast = 把相同数值发给每个成员',
    foot: 'This example\'s process group has 1 training rank plus inference TP ranks.', footZh: '本例 process group 有 1 个训练 rank 和推理端 TP rank。',
    mobileTitle: '2 of 3 · broadcast values', mobileTitleZh: '第 2 条 · 广播数值',
    mobileSubtitle: 'rank = member · broadcast = send to all', mobileSubtitleZh: 'rank = 编号 · broadcast = 全员发送',
    mobileFoot: 'process group = 1 training + inference TP', mobileFootZh: '通信组 = 1 个训练 rank + 推理 TP',
    mobile: [
      { title: 'TRAINING RANK 0', titleZh: '训练端 RANK 0', body: 'send full weight tensors', bodyZh: '发出完整权重张量', tone: 'orange' },
      { title: 'PROCESS GROUP', titleZh: 'PROCESS GROUP', body: 'broadcast full tensor', bodyZh: '广播完整张量', tone: 'orange' },
      { title: 'INFERENCE RANKS', titleZh: '推理端各 RANK', body: 'keep and load their own parts', bodyZh: '留下并装入各自部分', tone: 'blue' },
    ],
    formulas: [
      { en: `TP 1 → ${UPDATE_GROUP_SIZE_TP_ONE} ranks · TP 2 → ${UPDATE_GROUP_SIZE_TP_TWO} ranks`, zh: `TP 1 → 组内 ${UPDATE_GROUP_SIZE_TP_ONE} 人 · TP 2 → 组内 ${UPDATE_GROUP_SIZE_TP_TWO} 人` },
      { en: 'world size = 1 + inference TP', zh: '组大小 = 1 + 推理 TP' },
      { en: 'broadcast tensor → keep part → load', zh: '广播完整张量 → 留自己部分 → 装入' },
    ],
  }, {
    caption: 'The tensor route assembles one full parameter. It sends handles that locate GPU memory, not the parameter\'s bytes.',
    captionZh: 'Tensor 路线先拼出一个完整参数。它发送的是 GPU 内存定位句柄，不是参数字节。',
    title: 'Three channels · 3 of 3: send GPU handles', titleZh: '三条通道 · 第 3 条：发送 GPU 句柄',
    subtitle: 'parameter = one weight table · handle = its GPU location note', subtitleZh: 'parameter = 一张权重表 · handle = 它在 GPU 上的位置便签',
    foot: 'Handles carry no weight bytes; memory-access details are outside this step.', footZh: '句柄不含权重字节；接收方怎样访问那块 GPU 内存，本步不展开。',
    mobileTitle: '3 of 3 · GPU handles', mobileTitleZh: '第 3 条 · GPU 句柄',
    mobileSubtitle: 'handle = tensor location information', mobileSubtitleZh: 'handle = 张量的位置信息',
    mobileFoot: 'Handles have no weight bytes; access details are omitted.', mobileFootZh: '句柄不含权重字节；访问细节本步不展开。',
    mobile: [
      { title: '4 TRAINING PIECES', titleZh: '4 块训练分片', body: '[256, 1024] each', bodyZh: '每块 [256, 1024]', tone: 'orange' },
      { title: 'FULL_TENSOR()', titleZh: 'FULL_TENSOR()', body: 'assemble [1024, 1024]', bodyZh: '拼成 [1024, 1024]', tone: 'orange' },
      { title: 'LOCATION NOTE (HANDLE)', titleZh: '位置便签（HANDLE）', body: 'shape + storage location', bodyZh: '形状 + 存储位置', tone: 'orange' },
      { title: 'SGLANG REBUILDS + LOADS', titleZh: 'SGLANG 重建并装入', body: 'full tensor → keep own part', bodyZh: '完整张量 → 留下自己部分', tone: 'blue' },
    ],
    formulas: [
      { en: `4 × 256 × 1024 = ${UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')}`, zh: `4 × 256 × 1024 = ${UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')} 个数` },
      { en: '= the pixels in a 1024×1024 photo', zh: '= 一张 1024×1024 照片的像素数' },
      { en: 'inference TP rank 0 collects notes', zh: '推理 TP rank 0 收拢位置便签' },
    ],
  }, {
    caption: 'Training weights moved off the GPU after training. Slime brings back one bucket, then clears it before the next.',
    captionZh: '训练后，训练权重先移出 GPU。slime 每次拿回一桶，清空后再拿下一桶。',
    title: 'Slime restores one bucket at a time', titleZh: 'slime 每次只恢复一桶权重',
    subtitle: 'bucket = a small group of parameters brought back to the GPU together', subtitleZh: 'bucket = 一起拿回 GPU 处理的一小组参数',
    foot: 'Schematic only: one bucket has fewer parameters; no byte ratio is claimed.', footZh: '示意图只表示一桶参数更少，不按字节比例绘制。',
    mobileTitle: 'One bucket at a time', mobileTitleZh: '每次只处理一桶',
    mobileSubtitle: 'bucket = a small parameter group', mobileSubtitleZh: 'bucket = 一小组参数',
    mobileFoot: 'No bucket size is claimed.', mobileFootZh: '不虚构每桶大小。',
    mobile: [
      { title: 'TRAINING WEIGHTS WAIT', titleZh: '训练权重先等待', body: 'moved off the GPU after training', bodyZh: '训练后已移出 GPU', tone: 'plain' },
      { title: 'UPLOAD BUCKET 1', titleZh: '拿回第 1 桶', body: 'only this small group', bodyZh: '只拿这一小组', tone: 'orange' },
      { title: 'ASSEMBLE + SEND HANDLES', titleZh: '拼好并发送句柄', body: 'arrange weights for SGLang', bodyZh: '排成 SGLang 要的样子', tone: 'orange' },
      { title: 'WAIT RESULT → CLEAR → NEXT', titleZh: '等结果 → 清空 → 下一桶', body: 'ray.get = wait for SGLang', bodyZh: 'ray.get = 等 SGLang 装入', tone: 'blue' },
    ],
    formulas: [
      { en: 'GPU holds SGLang + one bucket', zh: 'GPU 上是 SGLang + 一桶' },
      { en: 'not SGLang + the whole training model', zh: '不是 SGLang + 整套训练模型' },
      { en: 'arrange → wait for SGLang → clear', zh: '排好权重 → 等 SGLang 装入 → 清空' },
    ],
  }, {
    caption: 'Generation must not read a half-updated model. The next rollout waits for every parameter and cannot reuse old KV.',
    captionZh: '生成不能读到只更新一半的模型。下一轮要等参数全部更新，也不能复用旧 KV。',
    title: 'Replace one whole version, never a mixture', titleZh: '换成完整的新版本，不能新旧混用',
    subtitle: 'version boundary = generation pauses while any parameter is changing', subtitleZh: '版本边界 = 只要还有参数在变化，生成就暂停',
    foot: 'Slime clears old KV before buckets; verl, another RL framework, flushes on the last parameter.', footZh: 'slime 在分桶前清旧 KV；另一个 RL 框架 verl 在最后参数时清理。',
    mobileTitle: 'No old-and-new mixture', mobileTitleZh: '不能新旧混用',
    mobileSubtitle: 'generation pauses during replacement', mobileSubtitleZh: '替换期间暂停生成',
    mobileFoot: 'Old KV cannot be reused.', mobileFootZh: '旧 KV 也不能复用。',
    mobile: [
      { title: 'ROLLOUT 0 STOPS', titleZh: '第 0 轮停止', body: 'no new generation', bodyZh: '不再生成', tone: 'blue' },
      { title: 'DRAIN ACTIVE REQUESTS', titleZh: '等当前请求结束', body: 'no reader inside the update', bodyZh: '更新时没有读者', tone: 'orange' },
      { title: 'UPDATE EVERY PARAMETER', titleZh: '更新每个参数', body: 'do not reuse KV from v0', bodyZh: '不复用 v0 留下的 KV', tone: 'orange' },
      { title: 'AWAIT COMPLETION', titleZh: '等待全部完成', body: 'required: discard partial failure', bodyZh: '部分失败必须整套弃用', tone: 'orange' },
      { title: 'ROLLOUT 1 USES v1', titleZh: '第 1 轮使用 v1', body: 'one complete version', bodyZh: '完整的同一版本', tone: 'blue' },
    ],
    formulas: [
      { en: 'start after every parameter updates', zh: '每个参数都更新完，才开始' },
      { en: 'never generate with v0 + v1 mixed', zh: '绝不能新旧权重混着生成' },
      { en: 'automatic rollback is not shown', zh: '图中没有自动回滚或崩溃安全保证' },
    ],
  }, {
    caption: `Three ${UPDATE_DEBUG_SLEEP_MS} ms sleeps ran once per tensor. About 160 repetitions explain the ${UPDATE_DEBUG_SAVED_S}-second saving.`,
    captionZh: `每个张量都有 3 次 ${UPDATE_DEBUG_SLEEP_MS} ms 的 sleep。约 160 次调用合计少等 ${UPDATE_DEBUG_SAVED_S} 秒。`,
    title: 'Measure the whole call, not only ModelRunner', titleZh: '测量整个调用，不能只测 ModelRunner',
    subtitle: 'ModelRunner = model-owning code on each inference rank · outer timer = whole call', subtitleZh: 'ModelRunner = 每个推理 rank 上持有模型的代码 · 外部计时 = 整个调用',
    foot: 'Successive measurements in one debug note; not a general speedup.', footZh: '同一调试记录里的前后测量，不是普遍加速结论。',
    mobileTitle: 'Time the whole call', mobileTitleZh: '测量整个调用',
    mobileSubtitle: 'ModelRunner = model-owning code', mobileSubtitleZh: 'ModelRunner = 持有模型的代码',
    mobileFoot: 'about 160 calls · not an exact tensor count', mobileFootZh: '约 160 次调用，不是精确张量数。',
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
      { en: `4.845 s ÷ 0.030 s ≈ ${UPDATE_DEBUG_SLEEP_CALLS.toFixed(1)} calls`, zh: `4.845 秒 ÷ 0.030 秒 ≈ ${UPDATE_DEBUG_SLEEP_CALLS.toFixed(1)} 次调用` },
    ],
  }, {
    caption: 'Training also keeps gradients and optimizer records. If these tables do not fit, what should each GPU keep?',
    captionZh: '训练还要保存梯度和优化器记录。这些表装不下时，每张 GPU 该留哪一片？',
    title: 'The next limit is training\'s saved tables', titleZh: '下一个限制是训练长期保存的表',
    subtitle: 'saved tables = weights, gradients and optimizer state; activations are outside this step', subtitleZh: '长期保存的表 = 权重、梯度和优化器状态；本步不展开激活',
    foot: 'Example only: three GPUs; no sourced count. Next: FSDP2 divides these tables.', footZh: '三张 GPU 只是示例，来源未指定数量。下一章：FSDP2 分这些表。',
    mobileTitle: 'Training\'s saved tables', mobileTitleZh: '训练长期保存的表',
    mobileSubtitle: 'weights + gradients + optimizer state', mobileSubtitleZh: '权重 + 梯度 + 优化器状态',
    mobileFoot: 'Three GPUs are an example; FSDP2 is next.', mobileFootZh: '三张 GPU 只是示例；下一章讲 FSDP2。',
    mobile: [
      { title: 'WEIGHTS v1', titleZh: '权重 v1', body: 'the model numbers', bodyZh: '模型的数字', tone: 'orange' },
      { title: 'GRADIENTS', titleZh: '梯度', body: 'directions for changing weights', bodyZh: '修改权重的方向', tone: 'orange' },
      { title: 'OPTIMIZER STATE', titleZh: '优化器状态', body: 'the weight updater\'s saved tables', bodyZh: '权重更新器保存的表', tone: 'orange' },
      { title: 'THESE TABLES MAY NOT FIT', titleZh: '这些表可能装不下', body: 'activations are outside this step', bodyZh: '本步不展开激活', tone: 'plain' },
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
  const PHASE_COUNTS = [4, 4, 4, 5, 6, 5, 4, 5];
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
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [560, 500, 510, 620, 620, 640, 520, 640][step] : [440, 460, 460, 500, 490, 490, 520, 500][step]);
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
      <defs>
        <marker id="update-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="update-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
        <marker id="update-arrow-grey" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobileTitle ?? cur.title, cur.mobileTitleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobileSubtitle ?? cur.subtitle, cur.mobileSubtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.mobile as item, i}
          {@const y = 80 + i * 91}
          <g opacity={phase >= Math.min(i, PHASE_COUNTS[step] - 2) ? 1 : 0}>
            <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
            <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x="150" y={y + 50} text-anchor="middle" class="small">{step === 4 && i === 1 && phase >= 4 ? t('bucket 1 cleared', '第 1 桶已清空') : step === 4 && i === 3 && phase >= 5 ? t('bucket 2 is on the GPU', '第 2 桶在 GPU 上') : t(item.body, item.bodyZh)}</text>
            {#if i < cur.mobile.length - 1}
              <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={item.tone === 'plain' ? 'var(--accent)' : stroke(item.tone)} stroke-width="2.5" marker-end={item.tone === 'orange' ? 'url(#update-arrow-orange)' : 'url(#update-arrow-blue)'} />
            {/if}
          </g>
        {/each}
        <g opacity={phase >= PHASE_COUNTS[step] - 1 ? 1 : 0}>
          {#each cur.formulas as line, i}
            <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
          {/each}
        </g>
      {:else if step === 0}
        <rect x="35" y="92" width="170" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="120" y="126" text-anchor="middle" class="section">TRAINING</text>
        <text x="120" y="163" text-anchor="middle" class="result">weights v1</text>
        <text x="120" y="188" text-anchor="middle" class="small">{t('new number tables', '新的数字表')}</text>
        <g opacity={phase >= 1 ? 1 : 0}>
          <line x1="205" y1="148" x2="260" y2="148" stroke="var(--gen)" stroke-width="3" marker-end="url(#update-arrow-orange)" />
          <rect x="255" y="70" width="210" height="150" rx="14" fill="none" stroke="var(--muted)" stroke-dasharray="5 4" />
          <text x="360" y="85" text-anchor="middle" class="small strong">{t('WHOLE CALL', '整个调用')}</text>
          <rect x="270" y="92" width="180" height="112" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="126" text-anchor="middle" class="section">UPDATE WEIGHTS</text>
          <text x="360" y="163" text-anchor="middle" class="result">{phase >= 3 ? `${UPDATE_DEBUG_OUTER_S} s` : '?'}</text>
          <text x="360" y="188" text-anchor="middle" class="small">{t('model code · copy v1', '模型代码本身负责装入 v1')}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
          <line x1="450" y1="148" x2="505" y2="148" stroke="var(--accent)" stroke-width="3" marker-end="url(#update-arrow-blue)" />
          <rect x="515" y="92" width="170" height="112" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="600" y="126" text-anchor="middle" class="section">ROLLOUT</text>
          <text x="600" y="163" text-anchor="middle" class="result">{t('waits', '等待')}</text>
          <text x="600" y="188" text-anchor="middle" class="small">{t('then uses v1', '完成后才用 v1')}</text>
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <rect x="35" y="235" width="310" height="150" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="263" text-anchor="middle" class="small strong">{t('WEIGHT SIZE · FULL 1B', '权重规模 · 完整 1B')}</text>
          <text x="190" y="295" text-anchor="middle" class="result">{t(`1B values × ${UPDATE_DEBUG_BF16_BYTES} bytes = ${UPDATE_DEBUG_WEIGHT_GB} GB`, `10 亿个数 × 每个 ${UPDATE_DEBUG_BF16_BYTES} 字节 = ${UPDATE_DEBUG_WEIGHT_GB} GB`)}</text>
          <text x="190" y="322" text-anchor="middle" class="small">{t('1B = 1 billion values · bf16 = 2 bytes each', '1B = 10 亿个数 · bf16 = 每个数 2 字节')}</text>
          <text x="190" y="350" text-anchor="middle" class="result">2 GB ÷ 3.35 TB/s ≈ {UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms</text>
          <text x="190" y="375" text-anchor="middle" class="small">{t('HBM yardstick, not an update prediction', 'HBM 带宽对照，不是更新耗时预测')}</text>
          <rect x="375" y="235" width="310" height="150" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="530" y="263" text-anchor="middle" class="small strong">{t('FULL 1B UPDATE', '完整 1B 更新')}</text>
          <text x="530" y="298" text-anchor="middle" class="result">{UPDATE_DEBUG_INITIAL_S} s ≈ {UPDATE_DEBUG_FULL_YARDSTICK_RATIO.toLocaleString('en-US')} × {UPDATE_DEBUG_YARDSTICK_MS.toFixed(1)} ms</text>
          <text x="530" y="326" text-anchor="middle" class="small strong">{t('ONE TENSOR EXAMPLE', '一个张量示例')}</text>
          <text x="530" y="350" text-anchor="middle" class="small">{t(`model code ${UPDATE_DEBUG_INNER_S} s · whole call ${UPDATE_DEBUG_OUTER_S} s`, `模型代码本身 ${UPDATE_DEBUG_INNER_S} 秒 · 整个调用 ${UPDATE_DEBUG_OUTER_S} 秒`)}</text>
          <text x="530" y="374" text-anchor="middle" class="small">{t('0.033 ÷ 0.001 ≈ 33×, rounded', '0.033 ÷ 0.001 ≈ 33 倍，均为舍入值')}</text>
        </g>
      {:else if step === 1}
        {#each [
          { x: 30, title: '1 · DISK', titleZh: '1 · 磁盘', name: 'checkpoint', detail: 'saved weights', detailZh: '存好的整套权重', flow: 'write file', flowZh: '写入文件', end: 'read file', endZh: '读取文件' },
          { x: 265, title: '2 · DISTRIBUTED', titleZh: '2 · DISTRIBUTED', name: 'process group', detail: 'cooperating members', detailZh: '一起传权的成员', flow: 'one sender', flowZh: '一个发送方', end: 'many receivers', endZh: '多个接收方' },
          { x: 500, title: '3 · TENSOR', titleZh: '3 · TENSOR', name: 'handle', detail: 'GPU location note', detailZh: 'GPU 位置便签', flow: 'send note', flowZh: '发送便签', end: 'find tensor', endZh: '找到张量' },
        ] as route, i}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x={route.x} y="88" width="190" height="282" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={route.x + 95} y="124" text-anchor="middle" class="small strong">{t(route.title, route.titleZh)}</text>
            <text x={route.x + 95} y="166" text-anchor="middle" class="code">{route.name}</text>
            <text x={route.x + 95} y="195" text-anchor="middle" class="small">{t(route.detail, route.detailZh)}</text>
            <text x={route.x + 95} y="250" text-anchor="middle" class="small">{t(route.flow, route.flowZh)}</text>
            <text x={route.x + 95} y="280" text-anchor="middle" class="small">↓</text>
            <text x={route.x + 95} y="310" text-anchor="middle" class="small">{t(route.end, route.endZh)}</text>
          </g>
        {/each}
        <g opacity={phase >= 3 ? 1 : 0}>
          <text x="360" y="405" text-anchor="middle" class="small strong">{t('One update chooses one of these three routes.', '一次更新从三条路线中选一条。')}</text>
          <text x="360" y="434" text-anchor="middle" class="small">{t('Blue = the three alternative weight handoffs', '蓝 = 三条备选权重交接路线')}</text>
        </g>
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
        <text x="190" y="296" text-anchor="middle" class="small">{t('two members in this example', '本例组内两个成员')}</text>
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="375" y="86" width="310" height="235" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="530" y="116" text-anchor="middle" class="section">TP = 2</text>
          <rect x="395" y="160" width="105" height="62" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="447" y="185" text-anchor="middle" class="small strong">{t('TRAINING', '训练端')}</text>
          <text x="447" y="207" text-anchor="middle" class="small">rank 0</text>
          <line x1="500" y1="182" x2="545" y2="149" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
          <line x1="500" y1="201" x2="545" y2="232" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
          <rect x="555" y="123" width="110" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="610" y="143" text-anchor="middle" class="small strong">{t('INFERENCE', '推理端')}</text>
          <text x="610" y="163" text-anchor="middle" class="small">rank 1</text>
          <rect x="555" y="207" width="110" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="610" y="227" text-anchor="middle" class="small strong">{t('INFERENCE', '推理端')}</text>
          <text x="610" y="247" text-anchor="middle" class="small">rank 2</text>
          <text x="530" y="286" text-anchor="middle" class="result">world size = 1 + 2 = {UPDATE_GROUP_SIZE_TP_TWO}</text>
          <text x="530" y="310" text-anchor="middle" class="small">{t('three members in this example', '本例组内三个成员')}</text>
        </g>
        <text x="360" y="355" text-anchor="middle" class="code" opacity={phase >= 2 ? 1 : 0}>{t('make receiving space → broadcast full tensor → keep own part → load own part', '分配接收空间 → 广播完整张量 → 留下自己的部分 → 装入自己的部分')}</text>
        <g opacity={phase >= 3 ? 1 : 0}>
          <text x="360" y="390" text-anchor="middle" class="small">{t('Orange = sends values · blue = receives values', '橙 = 发出数值 · 蓝 = 接收数值')}</text>
          <text x="360" y="422" text-anchor="middle" class="small">{t('Distributed channel = broadcast full tensors through this group', 'Distributed 通道 = 通过这个组广播完整张量')}</text>
        </g>
      {:else if step === 3}
        <text x="360" y="88" text-anchor="middle" class="small strong">{t('ONE PARAMETER · FOUR TRAINING PIECES', '一个参数 · 训练端的四块分片')}</text>
        {#each [0, 1, 2, 3] as i}
          <rect x={30 + i * 76} y="108" width="66" height="59" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={63 + i * 76} y="134" text-anchor="middle" class="small">[{UPDATE_EXAMPLE_FSDP_ROWS},</text>
          <text x={63 + i * 76} y="153" text-anchor="middle" class="small">{UPDATE_EXAMPLE_FULL_COLS}]</text>
        {/each}
        <g opacity={phase >= 1 ? 1 : 0}>
          <line x1="337" y1="138" x2="380" y2="138" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
          <rect x="390" y="99" width="290" height="79" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="535" y="130" text-anchor="middle" class="section">FULL_TENSOR()</text>
          <text x="535" y="158" text-anchor="middle" class="result">[{UPDATE_EXAMPLE_FULL_ROWS}, {UPDATE_EXAMPLE_FULL_COLS}]</text>
          <text x="360" y="193" text-anchor="middle" class="small">{t('Each training piece has 256 rows and 1024 columns.', '每块训练分片有 256 行、1024 列。')}</text>
          <text x="360" y="220" text-anchor="middle" class="result">{UPDATE_EXAMPLE_FSDP_TP} × {UPDATE_EXAMPLE_FSDP_ROWS} × {UPDATE_EXAMPLE_FULL_COLS} = {UPDATE_EXAMPLE_FULL_ELEMENTS.toLocaleString('en-US')} {t('= the pixels in a 1024×1024 photo', '= 一张 1024×1024 照片的像素数')}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
          <text x="360" y="251" text-anchor="middle" class="code">{t('serialize = bundle the location notes', 'serialize = 打包位置便签')}</text>
          <rect x="40" y="274" width="270" height="116" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="175" y="307" text-anchor="middle" class="section">{t('LOCATION NOTE', '位置便签')}</text>
          <text x="175" y="340" text-anchor="middle" class="small">{t('shape · size', '形状 · 大小')}</text>
          <text x="175" y="366" text-anchor="middle" class="small">{t('storage location', '存储位置')}</text>
          <line x1="310" y1="332" x2="405" y2="332" stroke="var(--muted)" stroke-width="3" marker-end="url(#update-arrow-grey)" />
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <rect x="415" y="274" width="265" height="116" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="547" y="307" text-anchor="middle" class="section">SGLANG</text>
          <text x="547" y="340" text-anchor="middle" class="small">{t('rebuild full tensor', '重建完整张量')}</text>
          <text x="547" y="368" text-anchor="middle" class="small">load_weights: {t('keep own part', '留下自己部分')}</text>
        </g>
        <g opacity={phase >= 4 ? 1 : 0}>
          <text x="360" y="427" text-anchor="middle" class="small strong">{t('Only the handle crosses this arrow; the weight bytes do not.', '箭头只传句柄，不传权重字节。')}</text>
          <text x="360" y="458" text-anchor="middle" class="small">{t('Orange = training work · grey arrow = note handoff · blue = inference work', '橙 = 训练工作 · 灰箭头 = 便签交接 · 蓝 = 推理工作')}</text>
        </g>
      {:else if step === 4}
        <rect x="30" y="85" width="315" height="259" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="187" y="115" text-anchor="middle" class="section">{t('WITHOUT BUCKETS', '不分桶')}</text>
        <rect x="50" y="136" width="275" height="55" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="187" y="169" text-anchor="middle" class="small strong">SGLANG + KV</text>
        <rect x="50" y="207" width="275" height="104" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="187" y="237" text-anchor="middle" class="small strong">{t('ALL TRAINING WEIGHTS', '整套训练权重')}</text>
        <text x="187" y="267" text-anchor="middle" class="small">{t('restored beside SGLang', '全部恢复到 SGLang 旁边')}</text>
        <text x="187" y="295" text-anchor="middle" class="small">{t('can exceed the card', '可能超出显卡容量')}</text>
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="375" y="85" width="315" height="259" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="532" y="115" text-anchor="middle" class="section">{t('WITH BUCKETS', '分桶')}</text>
          <rect x="395" y="136" width="275" height="55" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="532" y="169" text-anchor="middle" class="small strong">SGLANG + KV</text>
          <rect x="395" y="207" width="275" height="52" rx="9" fill={phase >= 4 ? 'var(--bg)' : 'var(--gen-soft)'} stroke={phase >= 4 ? 'var(--line)' : 'var(--gen)'} stroke-dasharray={phase >= 4 ? '5 4' : '0'} />
          <text x="532" y="239" text-anchor="middle" class="small strong">BUCKET 1 · {phase >= 4 ? t('CLEARED', '已清空') : t('ON GPU', '在 GPU 上')}</text>
          <rect x="395" y="275" width="275" height="43" rx="9" fill={phase >= 5 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={phase >= 5 ? 'var(--gen)' : 'var(--line)'} stroke-dasharray={phase >= 5 ? '0' : '5 4'} />
          <text x="532" y="302" text-anchor="middle" class="small">{phase >= 5 ? `BUCKET 2 · ${t('ON GPU', '在 GPU 上')}` : `${t('LATER BUCKETS', '后面的桶')} · ${t('WAIT OFF GPU', '在 GPU 外等待')}`}</text>
        </g>
        <text x="360" y="378" text-anchor="middle" class="code" opacity={phase >= 2 ? 1 : 0}>{t('upload → assemble → arrange for SGLang → send handles → wait for SGLang → clear', '拿回 → 拼好 → 排成 SGLang 要的样子 → 发句柄 → 等 SGLang 装入 → 清空')}</text>
        <text x="360" y="413" text-anchor="middle" class="small strong" opacity={phase >= 3 ? 1 : 0}>{t('SGLang finishes loading before the converted bucket copy is cleared.', 'SGLang 装入完成后，才清空这一桶转换后的副本。')}</text>
        <text x="360" y="447" text-anchor="middle" class="small" opacity={phase >= 5 ? 1 : 0}>{t('Blue = rollout state · orange = training weights being updated', '蓝 = rollout 状态 · 橙 = 正在更新的训练权重')}</text>
      {:else if step === 5}
        <rect x="35" y="90" width="190" height="121" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="130" y="124" text-anchor="middle" class="section">{t('BEFORE', '更新前')}</text>
        <text x="130" y="165" text-anchor="middle" class="big">v0</text>
        <text x="130" y="191" text-anchor="middle" class="small">{t('one complete version', '完整的一套旧权重')}</text>
        <g opacity={phase >= 1 ? 1 : 0}>
          <line x1="225" y1="150" x2="255" y2="150" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
          <rect x="265" y="90" width="190" height="121" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-dasharray="6 4" />
          <text x="360" y="124" text-anchor="middle" class="section">{t('UPDATING', '更新中')}</text>
          <text x="360" y="160" text-anchor="middle" class="result">v0 + v1</text>
          <text x="360" y="191" text-anchor="middle" class="small strong">{t('GENERATION PAUSED', '生成暂停')}</text>
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <line x1="455" y1="150" x2="485" y2="150" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />
          <rect x="495" y="90" width="190" height="121" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="590" y="124" text-anchor="middle" class="section">{t('AFTER', '更新后')}</text>
          <text x="590" y="165" text-anchor="middle" class="big">v1</text>
          <text x="590" y="191" text-anchor="middle" class="small">{t('one complete version', '完整的一套新权重')}</text>
        </g>
        <text x="360" y="244" text-anchor="middle" class="small strong" opacity={phase >= 4 ? 1 : 0}>{t('KV saved under v0 cannot be reused with v1.', 'v0 留下的 KV 不能给 v1 继续用。')}</text>
        {#each [
          { x: 45, title: 'WAIT', titleZh: '等待', body: 'requests finish', bodyZh: '当前请求结束' },
          { x: 215, title: 'UPDATE ALL', titleZh: '全部更新', body: 'every parameter', bodyZh: '每个参数' },
          { x: 385, title: 'AWAIT', titleZh: '等待完成', body: 'the whole update', bodyZh: '整个更新' },
          { x: 555, title: 'ROLLOUT 1', titleZh: '第 1 轮', body: 'use v1', bodyZh: '使用 v1' },
        ] as node, i}
          <g opacity={phase >= 2 ? 1 : 0}>
            <rect x={node.x} y="280" width="125" height="90" rx="10" fill={i === 3 ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i === 3 ? 'var(--accent)' : 'var(--gen)'} />
            <text x={node.x + 62.5} y="311" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={node.x + 62.5} y="342" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if i < 3}<line x1={node.x + 125} y1="325" x2={node.x + 158} y2="325" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#update-arrow-orange)" />{/if}
          </g>
        {/each}
        <g opacity={phase >= 4 ? 1 : 0}>
          <text x="360" y="411" text-anchor="middle" class="small strong">{t('On failure, discard the partial model; automatic rollback is not shown.', '失败时必须弃用部分更新的模型；图中没有自动回滚。')}</text>
          <text x="360" y="447" text-anchor="middle" class="small">{t('Blue = complete versions · orange = update work · red outline = unsafe mixture', '蓝 = 完整版本 · 橙 = 更新工作 · 红框 = 危险的新旧混合')}</text>
        </g>
      {:else if step === 6}
        <text x="35" y="104" class="small strong">{t('WITH SLEEPS', '保留 SLEEP')}</text>
        <rect x="160" y="82" width="500" height="38" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="645" y="107" text-anchor="end" class="result">{UPDATE_DEBUG_INITIAL_S} s</text>
        <g opacity={phase >= 1 ? 1 : 0}>
          <text x="35" y="172" class="small strong">{t('WITHOUT SLEEPS', '去掉 SLEEP')}</text>
          <rect x="160" y="150" width={500 * UPDATE_DEBUG_NO_SLEEP_S / UPDATE_DEBUG_INITIAL_S} height="38" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={175 + 500 * UPDATE_DEBUG_NO_SLEEP_S / UPDATE_DEBUG_INITIAL_S} y="175" class="result">{UPDATE_DEBUG_NO_SLEEP_S} s</text>
          <text x="360" y="224" text-anchor="middle" class="result">{UPDATE_DEBUG_INITIAL_S} − {UPDATE_DEBUG_NO_SLEEP_S} = {UPDATE_DEBUG_SAVED_S} s {t('saved', '少等')} · ≈ {UPDATE_DEBUG_SPEEDUP.toFixed(2)}×</text>
          <text x="360" y="250" text-anchor="middle" class="result">{UPDATE_DEBUG_SAVED_S} s ÷ 0.030 s ≈ {UPDATE_DEBUG_SLEEP_CALLS.toFixed(1)} {t('calls · about 160', '次调用 · 约 160 次')}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
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
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <text x="360" y="427" text-anchor="middle" class="result">{UPDATE_DEBUG_INNER_MS} + {UPDATE_DEBUG_SLEEP_TOTAL_MS} + {UPDATE_DEBUG_OTHER_MS} = {UPDATE_DEBUG_OUTER_MS} ms</text>
          <text x="360" y="462" text-anchor="middle" class="small">{t('Each tensor pays three 10 ms pauses; 161.5 is not an exact tensor count.', '每个张量都有 3 次 10 ms 暂停；161.5 不是精确张量数。')}</text>
          <text x="360" y="490" text-anchor="middle" class="small">{t('Both full-update bars use the same seconds scale.', '两条完整更新柱使用相同的秒数比例。')}</text>
        </g>
      {:else if step === 7}
        <rect x="25" y="82" width="670" height="195" rx="13" fill="var(--bg)" stroke="var(--gen)" />
        <text x="360" y="112" text-anchor="middle" class="section">{t('SAVED TRAINING TABLES', '训练长期保存的表')}</text>
        {#each [
          { x: 45, title: 'WEIGHTS v1', titleZh: '权重 v1', body: 'model numbers', bodyZh: '模型的数字', body2: 'current tables', body2Zh: '当前的表' },
          { x: 260, title: 'GRADIENTS', titleZh: '梯度', body: 'directions to change them', bodyZh: '修改权重的方向', body2: 'computed in training', body2Zh: '训练时算出' },
          { x: 475, title: 'OPTIMIZER STATE', titleZh: '优化器状态', body: 'optimizer = weight updater', bodyZh: '优化器 = 权重更新器', body2: 'state = its saved tables', body2Zh: '状态 = 它保存的表' },
        ] as node, i}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x={node.x} y="134" width="200" height="112" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={node.x + 100} y="169" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={node.x + 100} y="205" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            <text x={node.x + 100} y="229" text-anchor="middle" class="small">{t(node.body2, node.body2Zh)}</text>
          </g>
        {/each}
        <g opacity={phase >= 3 ? 1 : 0}>
          <text x="360" y="309" text-anchor="middle" class="small">{t('Step 4 transferred the weight tensor. Activations are outside this step.', '第 4 步传的是权重张量；本步不展开激活。')}</text>
          <text x="360" y="345" text-anchor="middle" class="result">{t('If these tables do not fit, which slice should each GPU keep?', '如果这些表装不下，每张 GPU 该留下哪一片？')}</text>
          {#each [0, 1, 2] as i}
            <rect x={45 + i * 215} y="375" width="200" height="66" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
            <text x={145 + i * 215} y="415" text-anchor="middle" class="result">GPU {i} · ?</text>
          {/each}
        </g>
        <text x="360" y="470" text-anchor="middle" class="small" opacity={phase >= 4 ? 1 : 0}>{t('Orange = saved training tables · blue outline = unanswered per-GPU shares', '橙 = 训练保存的表 · 蓝框 = 尚未回答的每张 GPU 份额')}</text>
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
