<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Line = { en: string; zh: string };
  type Node = { title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string; tone: Tone; dashed?: boolean };
  type MobileText = { title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; formulas?: Line[] };
  type Step = { caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; nodes: Node[]; formulas: Line[]; flow?: boolean; compare?: boolean; mobile?: MobileText };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: 'The second call needs nine context tokens. Separate records supply only the two prompt tokens.',
    captionZh: '第二次调用需要 9 个上下文 token。拆开后只剩 2 个 prompt token。',
    title: 'Keep one Sample for the whole interaction', titleZh: '一个 Sample 保存完整交互',
    subtitle: 'Sample = one task’s ordered token record', subtitleZh: 'Sample = 一个任务按顺序保存的 token 记录',
    foot: 'Constructed token counts; P, A, O and B are spans, not tokenizer output.', footZh: '构造的 token 数；P、A、O、B 是片段，不是 tokenizer 输出。',
    legend: 'Orange = missing context · blue = preserved record · red = current', legendZh: '橙 = 丢失的上下文 · 蓝 = 保留的记录 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'SEPARATE RECORDS', titleZh: '拆开的记录', result: 'second call: P P = 2', resultZh: '第二次调用：P P = 2', body: 'missing A(4) + O(3) = 7', bodyZh: '缺少 A(4) + O(3) = 7', tone: 'orange', dashed: true },
      { title: 'ONE SAMPLE', titleZh: '一个 SAMPLE', result: 'second call: P+A+O = 9', resultZh: '第二次调用：P+A+O = 9', body: 'then B(5) · response = 12', bodyZh: '再写 B(5) · 响应 = 12', tone: 'blue' },
    ],
    formulas: [
      { en: 'P = prompt (2) · A = model’s tool instruction (4)', zh: 'P = prompt（2）· A = 模型发给工具的指令（4）' },
      { en: 'O = tool reply (3) · B = later model action (5)', zh: 'O = 工具回复（3）· B = 后续模型动作（5）' },
      { en: 'missing response context: 4 + 3 = 7 tokens', zh: '丢失的响应上下文：4 + 3 = 7 token' },
      { en: 'one Sample response: 4 + 3 + 5 = 12 tokens', zh: '一个 Sample 的响应：4 + 3 + 5 = 12 token' },
      { en: 'Next: which response tokens should teach the model?', zh: '下一步：哪些响应 token 用来训练模型？' },
    ],
    mobile: {
      title: 'Keep one whole Sample', titleZh: '一个 Sample 保存完整交互',
      subtitle: 'Sample = one task’s ordered token record', subtitleZh: 'Sample = 一个任务按顺序保存的 token 记录',
      foot: 'Constructed spans, not real tokenizer output.', footZh: '构造片段，不是真实 tokenizer 输出。',
      legend: 'Orange = missing · blue = kept · red = current', legendZh: '橙 = 丢失 · 蓝 = 保留 · 红 = 当前',
      formulas: [
        { en: 'P = prompt (2) · A = first action (4)', zh: 'P = prompt（2）· A = 第一次动作（4）' },
        { en: 'O = tool reply (3) · B = next action (5)', zh: 'O = 工具回复（3）· B = 后续动作（5）' },
        { en: 'Missing response context: 4 + 3 = 7', zh: '丢失的响应上下文：4 + 3 = 7' },
        { en: 'One Sample response: 4 + 3 + 5 = 12', zh: '一个 Sample 的响应：4 + 3 + 5 = 12' },
        { en: 'Next: which tokens teach the model?', zh: '下一步：哪些 token 训练模型？' },
      ],
    },
  }, {
    caption: 'Mask 1 learns from model actions; mask 0 skips tool replies. Nine of twelve response tokens teach the model.',
    captionZh: 'mask 1 学习模型动作，mask 0 跳过工具回复。12 个响应 token 中有 9 个参与训练。',
    title: 'Give each response token a loss mask', titleZh: '给每个响应 token 一个 loss mask',
    subtitle: 'loss mask: 1 = learn from this token · 0 = skip it', subtitleZh: 'loss mask：1 = 学习这个 token · 0 = 跳过',
    foot: 'The mask selects training tokens; it does not remove context.', footZh: 'mask 只选择训练 token，不会删掉上下文。',
    legend: 'Blue = learn · orange = skip · red = current', legendZh: '蓝 = 学习 · 橙 = 跳过 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'MODEL ACTIONS', titleZh: '模型动作', result: `A(4) + B(5) = ${N.AGENT_MODEL_ACTION_TOKENS}`, resultZh: `A(4) + B(5) = ${N.AGENT_MODEL_ACTION_TOKENS}`, body: 'mask 1 for every action token', bodyZh: '每个动作 token 的 mask 都是 1', tone: 'blue' },
      { title: 'TOOL REPLY', titleZh: '工具回复', result: 'O = 3', resultZh: 'O = 3', body: 'mask 0 for every observation token', bodyZh: '每个观察 token 的 mask 都是 0', tone: 'orange' },
      { title: 'FOR TRAINING', titleZh: '用于训练', result: `${N.AGENT_MODEL_ACTION_TOKENS} of ${N.AGENT_RESPONSE_TOKENS}`, resultZh: `${N.AGENT_RESPONSE_TOKENS} 个中的 ${N.AGENT_MODEL_ACTION_TOKENS} 个`, body: 'O remains context, not a lesson', bodyZh: 'O 留作上下文，不参与学习', tone: 'blue' },
    ],
    formulas: [
      { en: 'response order: A(4) → O(3) → B(5)', zh: '响应顺序：A(4) → O(3) → B(5)' },
      { en: 'mask order: 1×4 → 0×3 → 1×5', zh: 'mask 顺序：1×4 → 0×3 → 1×5' },
      { en: `learn: 4 + 5 = ${N.AGENT_MODEL_ACTION_TOKENS} · skip: 3`, zh: `学习：4 + 5 = ${N.AGENT_MODEL_ACTION_TOKENS} · 跳过：3` },
      { en: 'O enters the next call; only its training loss is skipped', zh: 'O 仍进入下次调用，只是不计算它的训练损失' },
      { en: 'Next: encode O without repeating the prompt preamble', zh: '下一步：编码 O 时不重复 prompt 前缀' },
    ],
    mobile: {
      title: 'Mark tokens to learn', titleZh: '标出要学习的 token',
      subtitle: 'loss mask: 1 = learn · 0 = skip', subtitleZh: 'loss mask：1 = 学习 · 0 = 跳过',
      foot: 'The mask does not remove context.', footZh: 'mask 不会删掉上下文。',
      legend: 'Blue = learn · orange = skip · red = current', legendZh: '蓝 = 学习 · 橙 = 跳过 · 红 = 当前',
      formulas: [
        { en: 'Response: A(4) → O(3) → B(5)', zh: '响应：A(4) → O(3) → B(5)' },
        { en: 'Mask: 1×4 → 0×3 → 1×5', zh: 'mask：1×4 → 0×3 → 1×5' },
        { en: 'Learn: 4 + 5 = 9 · skip: 3', zh: '学习：4 + 5 = 9 · 跳过：3' },
        { en: 'O stays as context, not a lesson', zh: 'O 留作上下文，不参与学习' },
        { en: 'Next: encode only the new observation', zh: '下一步：只编码新的观察' },
      ],
    },
  }, {
    caption: 'The chat template adds six preamble tokens again. Keep only three new observation tokens.',
    captionZh: 'chat template 又加了 6 个前缀 token。只保留 3 个新观察 token。',
    title: 'Append only the observation delta', titleZh: '只追加观察带来的新 token',
    subtitle: 'delta = new tokens left after removing the repeated prefix', subtitleZh: 'delta = 去掉重复前缀后剩下的新 token',
    foot: 'Constructed counts; the real trim length comes from the tokenizer.', footZh: '构造数量；真实裁剪长度由 tokenizer 算出。',
    legend: 'Orange = repeated prefix · blue = appended observation · red = current', legendZh: '橙 = 重复前缀 · 蓝 = 追加的观察 · 红 = 当前',
    flow: true,
    nodes: [
      { title: 'DUMMY TEMPLATE', titleZh: '空观察模板', result: `prefix = ${N.AGENT_DUMMY_PREFIX_TOKENS}`, resultZh: `前缀 = ${N.AGENT_DUMMY_PREFIX_TOKENS}`, body: 'encode fixed dummy messages', bodyZh: '编码固定的空观察消息', tone: 'orange' },
      { title: 'FULL TEMPLATE', titleZh: '完整模板', result: `${N.AGENT_DUMMY_PREFIX_TOKENS} + ${N.AGENT_OBSERVATION_TOKENS} = ${N.AGENT_FORMATTED_OBSERVATION_TOKENS}`, resultZh: `${N.AGENT_DUMMY_PREFIX_TOKENS} + ${N.AGENT_OBSERVATION_TOKENS} = ${N.AGENT_FORMATTED_OBSERVATION_TOKENS}`, body: 'same prefix + new observation', bodyZh: '相同前缀 + 新观察', tone: 'orange' },
      { title: 'APPEND DELTA', titleZh: '追加 DELTA', result: `${N.AGENT_FORMATTED_OBSERVATION_TOKENS} − ${N.AGENT_DUMMY_PREFIX_TOKENS} = ${N.AGENT_OBSERVATION_TOKENS}`, resultZh: `${N.AGENT_FORMATTED_OBSERVATION_TOKENS} − ${N.AGENT_DUMMY_PREFIX_TOKENS} = ${N.AGENT_OBSERVATION_TOKENS}`, body: 'only O joins Sample.tokens', bodyZh: '只有 O 加入 Sample.tokens', tone: 'blue' },
    ],
    formulas: [
      { en: 'trim = tokens(dummy) = 6', zh: '裁剪长度 = dummy 的 token 数 = 6' },
      { en: 'formatted = tokens(dummy + observation) = 9', zh: '完整编码 = dummy + 观察的 token 数 = 9' },
      { en: 'prompt_ids = formatted[6:] → O O O', zh: 'prompt_ids = formatted[6:] → O O O' },
      { en: 'the 6-token prefix is not appended again', zh: '6 个前缀 token 不会再次追加' },
      { en: 'Next: what if O also carries an image?', zh: '下一步：如果 O 还有图片呢？' },
    ],
    mobile: {
      title: 'Keep only the new observation', titleZh: '只保留新的观察 token',
      subtitle: 'delta = tokens after the shared prefix', subtitleZh: 'delta = 去掉共同前缀后的 token',
      foot: 'Constructed counts; real trimming uses the tokenizer.', footZh: '构造数量；真实裁剪由 tokenizer 计算。',
      legend: 'Orange = prefix · blue = observation · red = current', legendZh: '橙 = 前缀 · 蓝 = 观察 · 红 = 当前',
      formulas: [
        { en: 'trim = tokens(dummy) = 6', zh: '裁剪长度 = dummy 的 token 数 = 6' },
        { en: 'formatted = dummy + observation = 9', zh: '完整编码 = dummy + 观察 = 9' },
        { en: 'formatted[6:] → O O O', zh: 'formatted[6:] → O O O' },
        { en: 'Do not append the prefix again', zh: '不要再次追加前缀' },
        { en: 'Next: add an image to O', zh: '下一步：O 里加入图片' },
      ],
    },
  }, {
    caption: 'One observation image takes two forms. Rollout gets encoded image data; training gets processor tensors.',
    captionZh: '一张观察图片有两份表示。rollout 收图片数据，训练收 processor 张量。',
    title: 'Send a VLM observation down two paths', titleZh: 'VLM 观察图片走两条路径',
    subtitle: 'VLM = a model that reads images and text', subtitleZh: 'VLM = 同时读取图片和文字的模型',
    foot: 'Constructed image counts; processor means the image-and-text input preparer.', footZh: '构造图片数量；processor 负责把图片和文字整理成模型输入。',
    legend: 'Orange = observation · blue = model inputs · red = current', legendZh: '橙 = 观察 · 蓝 = 模型输入 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'NEW OBSERVATION', titleZh: '新观察', result: '1 image', resultZh: '1 张图片', body: 'the initial image is already present', bodyZh: '初始图片已经在记录里', tone: 'orange' },
      { title: 'FOR NEXT ROLLOUT CALL', titleZh: '给下一次 ROLLOUT 调用', result: `image_data = ${N.AGENT_TOTAL_IMAGES}`, resultZh: `image_data = ${N.AGENT_TOTAL_IMAGES} 张`, body: 'two encoded images', bodyZh: '两张编码后的图片', tone: 'blue' },
      { title: 'FOR TRAINING', titleZh: '给训练', result: 'buffer = 2 dicts', resultZh: 'buffer = 2 份字典', body: 'two processor tensor dicts', bodyZh: '两份 processor 张量字典', tone: 'blue' },
    ],
    formulas: [
      { en: `rollout images: ${N.AGENT_INITIAL_IMAGES} + ${N.AGENT_OBSERVATION_IMAGES} = ${N.AGENT_TOTAL_IMAGES}`, zh: `rollout 图片：${N.AGENT_INITIAL_IMAGES} + ${N.AGENT_OBSERVATION_IMAGES} = ${N.AGENT_TOTAL_IMAGES} 张` },
      { en: 'training buffer: [initial tensors, observation tensors]', zh: '训练 buffer：[初始张量，观察张量]' },
      { en: 'a tensor is a grid of numbers used by the model', zh: '张量是模型使用的一格一格数字' },
      { en: 'the next call receives accumulated tokens + both images', zh: '下次调用收到累积 token 和两张图片' },
      { en: 'Next: merge the two training tensor chunks', zh: '下一步：合并两份训练张量' },
    ],
    mobile: {
      title: 'One image, two input paths', titleZh: '一张图片，两条输入路径',
      subtitle: 'VLM = a model reading images and text', subtitleZh: 'VLM = 读取图片和文字的模型',
      foot: 'Constructed counts; processor prepares model inputs.', footZh: '构造数量；processor 整理模型输入。',
      legend: 'Orange = observation · blue = inputs · red = current', legendZh: '橙 = 观察 · 蓝 = 输入 · 红 = 当前',
      formulas: [
        { en: 'Rollout images: 1 + 1 = 2', zh: 'rollout 图片：1 + 1 = 2 张' },
        { en: 'Training buffer: initial + observation', zh: '训练 buffer：初始 + 观察' },
        { en: 'A tensor is a grid of model numbers', zh: '张量是一格一格的模型数字' },
        { en: 'Next call: accumulated tokens + 2 images', zh: '下次调用：累积 token + 两张图片' },
        { en: 'Next: merge the training chunks', zh: '下一步：合并训练张量' },
      ],
    },
  }, {
    caption: 'Training buffers each turn’s tensors. One concat per key makes a three-row result.',
    captionZh: '训练先按轮保存张量。最后每个 key 拼一次，得到 3 行。',
    title: 'Merge each tensor key once', titleZh: '每个 tensor key 只拼接一次',
    subtitle: 'concat = join rows along dimension 0, the first axis', subtitleZh: 'concat = 沿第 0 维，也就是第一条轴拼接行',
    foot: 'Constructed rows and key k; only tensor values join.', footZh: '构造行数和 key k；只有张量值参与拼接。',
    legend: 'Orange = turn chunks · blue = merged tensor · red = current', legendZh: '橙 = 各轮片段 · 蓝 = 合并张量 · 红 = 当前',
    flow: true,
    nodes: [
      { title: 'INITIAL CHUNK', titleZh: '初始片段', result: 'k: 2 rows', resultZh: 'k：2 行', body: 'T0 from the initial input', bodyZh: '初始输入的 T0', tone: 'orange' },
      { title: 'OBSERVATION CHUNK', titleZh: '观察片段', result: 'k: 1 row', resultZh: 'k：1 行', body: 'T1 from the observation', bodyZh: '观察输入的 T1', tone: 'orange' },
      { title: 'CONCAT DIM 0', titleZh: '沿第 0 维拼接', result: '2 + 1 = 3 rows', resultZh: '2 + 1 = 3 行', body: 'one concat for key k', bodyZh: 'key k 只拼一次', tone: 'blue' },
      { title: 'TRAINING INPUT', titleZh: '训练输入', result: 'k: 3 rows', resultZh: 'k：3 行', body: 'non-tensors are ignored', bodyZh: '非张量字段被忽略', tone: 'blue' },
    ],
    formulas: [
      { en: 'collect by key: k → [T0, T1]', zh: '按 key 收集：k → [T0, T1]' },
      { en: 'torch.cat([T0, T1], dim=0)', zh: 'torch.cat([T0, T1], dim=0)' },
      { en: '2 rows + 1 row = 3 rows', zh: '2 行 + 1 行 = 3 行' },
      { en: 'one concat per key · non-tensor fields are ignored', zh: '每个 key 只拼一次 · 非张量字段被忽略' },
      { en: 'Next: when does the interaction stop?', zh: '下一步：交互什么时候停止？' },
    ],
    mobile: {
      title: 'Merge each key once', titleZh: '每个 key 只拼接一次',
      subtitle: 'concat = join rows on the first axis', subtitleZh: 'concat = 沿第一条轴拼接行',
      foot: 'Constructed rows; only tensor values join.', footZh: '构造行数；只有张量值参与拼接。',
      legend: 'Orange = chunks · blue = merged · red = current', legendZh: '橙 = 片段 · 蓝 = 合并 · 红 = 当前',
      formulas: [
        { en: 'Collect by key: k → [T0, T1]', zh: '按 key 收集：k → [T0, T1]' },
        { en: 'torch.cat([T0, T1], dim=0)', zh: 'torch.cat([T0, T1], dim=0)' },
        { en: '2 rows + 1 row = 3 rows', zh: '2 行 + 1 行 = 3 行' },
        { en: 'One concat per key; ignore non-tensors', zh: '每个 key 拼一次；忽略非张量' },
        { en: 'Next: when does interaction stop?', zh: '下一步：交互何时停止？' },
      ],
    },
  }, {
    caption: 'Three conditions can end the loop. Token exhaustion truncates; the other two complete.',
    captionZh: '三个条件都能结束循环。token 耗尽会截断，另外两种会完成。',
    title: 'Three exits from the interaction loop', titleZh: '交互循环的三个出口',
    subtitle: 'alternatives: the loop takes the first exit it reaches', subtitleZh: '三种备选条件：循环走到哪个出口就停在哪里',
    foot: 'Constructed alternatives; finish=length also truncates, and abort means cancelled.', footZh: '构造备选情形；finish=length 也会截断，abort 表示被取消。',
    legend: 'Orange = limit · blue = finished · red = current', legendZh: '橙 = 达到限制 · 蓝 = 已完成 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'MAX TURNS', titleZh: '最大轮数', result: `turn ${N.AGENT_EXAMPLE_MAX_TURNS} of ${N.AGENT_EXAMPLE_MAX_TURNS}`, resultZh: `第 ${N.AGENT_EXAMPLE_MAX_TURNS} / ${N.AGENT_EXAMPLE_MAX_TURNS} 轮`, body: 'after this turn → COMPLETED', bodyZh: '本轮结束后 → COMPLETED', tone: 'blue' },
      { title: 'TOKEN BUDGET', titleZh: 'TOKEN 预算', result: `${N.AGENT_EXAMPLE_TOKEN_BUDGET} − ${N.AGENT_RESPONSE_TOKENS} = 0`, resultZh: `${N.AGENT_EXAMPLE_TOKEN_BUDGET} − ${N.AGENT_RESPONSE_TOKENS} = 0`, body: 'no room → TRUNCATED', bodyZh: '没有余量 → TRUNCATED', tone: 'orange' },
      { title: 'ENV DONE', titleZh: '环境完成', result: 'done = True', resultZh: 'done = True', body: 'before observation → COMPLETED', bodyZh: '追加观察前 → COMPLETED', tone: 'blue' },
    ],
    formulas: [
      { en: 'max_turns reached → COMPLETED', zh: '达到 max_turns → COMPLETED' },
      { en: 'remaining token budget ≤ 0 → TRUNCATED', zh: '剩余 token 预算 ≤ 0 → TRUNCATED' },
      { en: 'env done = True → COMPLETED before observation', zh: 'env done = True → 追加观察前 COMPLETED' },
      { en: 'TRUNCATED = cut off by a limit · COMPLETED = finished', zh: 'TRUNCATED = 被限制截断 · COMPLETED = 已完成' },
      { en: 'Next: which object owns this loop in AgentLoop?', zh: '下一步：AgentLoop 中谁管理这个循环？' },
    ],
    mobile: {
      title: 'Three exits from the loop', titleZh: '交互循环的三个出口',
      subtitle: 'Alternatives: take the first exit reached', subtitleZh: '备选条件：走到哪个出口就停在哪里',
      foot: 'Constructed alternatives; abort means cancelled.', footZh: '构造备选情形；abort 表示被取消。',
      legend: 'Orange = limit · blue = finished · red = current', legendZh: '橙 = 达到限制 · 蓝 = 已完成 · 红 = 当前',
      formulas: [
        { en: 'max_turns reached → COMPLETED', zh: '达到 max_turns → COMPLETED' },
        { en: 'Token budget ≤ 0 → TRUNCATED', zh: 'token 预算 ≤ 0 → TRUNCATED' },
        { en: 'done=True → COMPLETED before observation', zh: 'done=True → 追加观察前 COMPLETED' },
        { en: 'TRUNCATED = limited · COMPLETED = finished', zh: 'TRUNCATED = 被截断 · COMPLETED = 已完成' },
        { en: 'Next: who owns the AgentLoop?', zh: '下一步：谁管理 AgentLoop？' },
      ],
    },
  }, {
    caption: 'ToolAgentLoop owns the model–tool loop. The server only turns input tokens into action tokens.',
    captionZh: 'ToolAgentLoop 管理模型与工具的循环。server 只把输入 token 变成动作 token。',
    title: 'Separate interaction logic from token generation', titleZh: '把交互管理与 token 生成分开',
    subtitle: 'ToolAgentLoop = owner of model calls, tool calls and stop rules', subtitleZh: 'ToolAgentLoop = 管理模型调用、工具调用和停止规则',
    foot: 'Pinned verl flow; arrows show ownership, not network timing.', footZh: '固定版本 verl 流程；箭头表示职责，不表示网络耗时。',
    legend: 'Blue = AgentLoop · orange = server or environment · red = current', legendZh: '蓝 = AgentLoop · 橙 = server 或环境 · 红 = 当前',
    flow: true,
    nodes: [
      { title: 'TOOLAGENTLOOP', titleZh: 'TOOLAGENTLOOP', result: 'tokens → server', resultZh: 'token → server', body: 'shared request_id', bodyZh: '共用 request_id', tone: 'blue' },
      { title: 'SERVER MANAGER', titleZh: 'SERVER MANAGER', result: 'tokens → action A', resultZh: 'token → 动作 A', body: 'no tool decisions here', bodyZh: '这里不决定工具调用', tone: 'orange' },
      { title: 'TOOLAGENTLOOP', titleZh: 'TOOLAGENTLOOP', result: 'parse A → tool call', resultZh: '解析 A → 调用工具', body: 'A gets mask 1', bodyZh: 'A 的 mask 为 1', tone: 'blue' },
      { title: 'TOOL / ENV', titleZh: '工具 / 环境', result: 'reply O → AgentLoop', resultZh: '回复 O → AgentLoop', body: 'O gets mask 0', bodyZh: 'O 的 mask 为 0', tone: 'orange' },
    ],
    formulas: [
      { en: 'same request_id → same server choice', zh: '相同 request_id → 相同 server 选择' },
      { en: 'server.generate(prompt_ids) → response_ids', zh: 'server.generate(prompt_ids) → response_ids' },
      { en: 'AgentLoop parses the action and calls the tool', zh: 'AgentLoop 解析动作并调用工具' },
      { en: 'tool reply returns to AgentLoop; the next call repeats', zh: '工具回复交给 AgentLoop，再进入下次模型调用' },
      { en: 'Next: pack different-length responses for training', zh: '下一步：把不同长度的响应装进训练 batch' },
    ],
    mobile: {
      title: 'Separate loop logic from generation', titleZh: '分开循环管理与 token 生成',
      subtitle: 'ToolAgentLoop owns model and tool calls', subtitleZh: 'ToolAgentLoop 管理模型和工具调用',
      foot: 'Pinned verl flow; arrows show ownership.', footZh: '固定版本 verl 流程；箭头表示职责。',
      legend: 'Blue = AgentLoop · orange = server/env · red = current', legendZh: '蓝 = AgentLoop · 橙 = server/环境 · 红 = 当前',
      formulas: [
        { en: 'Same request_id → same server', zh: '相同 request_id → 相同 server' },
        { en: 'generate(prompt_ids) → response_ids', zh: 'generate(prompt_ids) → response_ids' },
        { en: 'AgentLoop parses A and calls the tool', zh: 'AgentLoop 解析 A 并调用工具' },
        { en: 'O returns; the next model call repeats', zh: 'O 返回后进入下次模型调用' },
        { en: 'Next: pack responses for training', zh: '下一步：把响应装进训练 batch' },
      ],
    },
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
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = steps[s].nodes.length + 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * 1400));
      const ms = count * 1400 + 1800;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const start = 80;
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = 315;
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 29 + 45);
  const H = $derived(phone ? legendY + 55 : Math.max(500, legendY + 55));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
  const shown = (i: number) => cur.compare || i <= phase;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs><marker id="agent-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--line)" /></marker></defs>
      <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label={t('loops · red = current', '循环 · 红 = 当前')} />
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <g opacity={shown(i) ? 1 : 0.3} class="reveal">
            <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={phase === i ? 'var(--eos)' : stroke(node.tone)} stroke-width={phase === i ? 3 : 1} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x="150" y={y + 43} text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if cur.flow && i < cur.nodes.length - 1}<line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#agent-arrow)" />{/if}
          </g>
        {/each}
        {#each formulas as line, i}<text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <g opacity={shown(i) ? 1 : 0.3} class="reveal">
            <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={phase === i ? 'var(--eos)' : stroke(node.tone)} stroke-width={phase === i ? 3 : 1} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={x + w / 2} y="180" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x={x + w / 2} y="222" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if cur.flow && i < cur.nodes.length - 1}<line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#agent-arrow)" />{/if}
          </g>
        {/each}
        {#each cur.formulas as line, i}<text x="360" y={formulaStart + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobile?.foot ?? cur.foot, cur.mobile?.footZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label, .small { font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 14px; font-weight: 650; fill: var(--fg); }
  .reveal { transition: opacity 450ms; }
  @media (max-width: 600px) { .title { font-size: 16px; } .label, .small { font-size: 12px; } .result { font-size: 12px; } }
</style>
