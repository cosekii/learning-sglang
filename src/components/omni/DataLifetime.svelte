<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { LIFETIME_DATA_REF_WIRE_VERSION, LIFETIME_RESULT_IDS, LIFETIME_SLOT_COUNT, LIFETIME_WAITING_COUNT } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: "One space cannot hold results A and B together. B must wait until A's reader finishes.",
    captionZh: '一格放不下 A、B 两份结果。等 A 的读者读完，B 才能用这一格。',
  }, {
    caption: 'A DataRef is a descriptor, not the payload. It names the object, transport and buffer used to fetch it.',
    captionZh: 'DataRef 是找数据的小卡片，不带数据本身。卡片写明数据名字、走哪条路、在哪里。',
  }, {
    caption: 'Publishing sends the DataRef and creates a pending transfer. The sender keeps its write operation alive until an ack arrives.',
    captionZh: '发布时，DataRef 发给读者，发送方另留等待回执的记录。记录没结束，写入操作就不能收尾。',
  }, {
    caption: "The SHM receiver copies the bytes, then closes its handle and unlinks the block's name. It rebuilds from the copy and acknowledges before scheduling.",
    captionZh: '接收方复制 SHM 字节，再关闭句柄、移除共享块名字。随后用副本还原、回 ACK，再交给 scheduler。',
  }, {
    caption: 'The sender finishes the SHM put after the ACK. Its wait returns a write permit in finally, then the watcher removes pending.',
    captionZh: 'ACK 到了，发送方才让 SHM put 收尾。等待在 finally 归还写入名额，watcher 再删除 pending。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const PHASE_COUNTS = [4, 3, 6, 7, 6];
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = PHASE_COUNTS[s];
    if (count <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * 1400));
      const ms = count * 1400 + 1800;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 700 : (step === 2 ? 430 : 390));
  const panels = $derived([
    { title: t('REUSE NOW · WRONG READ', '现在覆盖 · 读错'), x: phone ? 15 : 20, y: phone ? 105 : 105, w: phone ? 270 : 325 },
    { title: t('WAIT FOR THE READER', '等读者读完'), x: phone ? 15 : 375, y: phone ? 365 : 105, w: phone ? 270 : 325 },
  ]);
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('A result remains available while its receiver reads. A DataRef locates the payload, and the sender tracks the acknowledgement and operation completion.', '结果在接收方读取期间保持可用。DataRef 用来找到数据，发送方跟踪回执和操作完成。')}>
      {#if PHASE_COUNTS[step] > 1}<LoopProgress ms={lapMs} {lap} x={phone ? 230 : 640} y={phone ? 644 : 20} />{/if}
      <defs>
        <marker id="lifetime-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{phone ? t('One space · A and B · initially reading A', '一格 · A、B · 起初在读 A') : t('Example: one space, two results; initially talker_ar is reading A', '示例：一格空间、两份结果；起初 talker_ar 在读 A')}</text>
      <rect x={phone ? 15 : 20} y="33" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 31 : 36} y="42" class="tag">{t('A · first result', 'A · 先到的结果')}</text>
      <rect x={phone ? 147 : 175} y="33" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 163 : 191} y="42" class="tag">{t('next result', '下一份结果')}</text>
      <text x={phone ? 15 : 20} y="68" class="tag">thinker → talker_ar · {LIFETIME_RESULT_IDS.length} {t('results', '份结果')} − {LIFETIME_SLOT_COUNT} {t('space', '格')} = {LIFETIME_WAITING_COUNT} {t('must wait', '份要等')}</text>
      <text x={phone ? 15 : 20} y="90" class="tag">{phone ? t('One space is an example, not a configured limit.', '一格只是教学例子，不是实际配置的上限。') : t('The one-space pool is a teaching example, not a configured limit.', '一格只是教学例子，不是实际配置的上限。')}</text>

      {#each panels as panel, i}
        {@const wrong = i === 0}
        {@const overwritten = wrong && phase >= 1}
        {@const readFinished = !wrong && phase >= 2}
        {@const entered = !wrong && phase >= 3}
        <rect x={panel.x} y={panel.y} width={panel.w} height="220" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 24} class="rowlabel">{wrong ? t(`REUSE NOW${overwritten ? ' · WRONG READ' : ''}`, `现在覆盖${overwritten ? ' · 读错' : ''}`) : panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 48} class="tag">thinker</text>
        <rect x={panel.x + 14} y={panel.y + 58} width="62" height="36" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray={wrong ? '4 3' : '0'} />
        <text x={panel.x + 45} y={panel.y + 81} text-anchor="middle" class="mono strong">A</text>
        <rect x={panel.x + 14} y={panel.y + 104} width="62" height="36" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={panel.x + 45} y={panel.y + 127} text-anchor="middle" class="mono strong">B</text>
        <text x={panel.x + 45} y={panel.y + 158} text-anchor="middle" class="tag">{overwritten ? t('B takes the space', 'B 占了这一格') : entered ? t('B entered after A', 'A 读完后 B 进入') : t('B waits outside', 'B 在格外等')}</text>

        <text x={panel.x + 175} y={panel.y + 48} text-anchor="middle" class="tag">{t('one space', '一格空间')}</text>
        <rect x={panel.x + 120} y={panel.y + 58} width="110" height="58" rx="8" fill={overwritten || entered ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={overwritten || entered ? 'var(--gen)' : 'var(--accent)'} />
        <text x={panel.x + 175} y={panel.y + 93} text-anchor="middle" class="mono strong">{overwritten || entered ? 'B' : 'A'}</text>
        <text x={panel.x + 175} y={panel.y + 135} text-anchor="middle" class="tag">{overwritten ? t('A was replaced', 'A 被盖掉') : entered ? t('B entered after A', 'A 读完后 B 进入') : readFinished ? t('A read finished ✓', 'A 读取完成 ✓') : t('A stays readable', 'A 保持可读')}</text>

        <rect x={panel.x + 94} y={panel.y + 169} width="162" height="38" rx="7" fill="white" stroke="var(--line)" />
        <text x={panel.x + 175} y={panel.y + 185} text-anchor="middle" class="tag strong">talker_ar</text>
        <text x={panel.x + 175} y={panel.y + 200} text-anchor="middle" class="tag">{overwritten ? t('wanted A · reads B', '要读 A · 却读到 B') : readFinished ? t('A finished · B may enter', 'A 读完 · B 才能进') : t('reading A', '正在读 A')}</text>
      {/each}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Safe reuse only; no specific transport or pool size.', '本图只讲何时能安全复用，不限定传输方式或池子大小。') : t('The diagram covers safe reuse, not a particular transport or pool size.', '本图只讲何时能安全复用，不限定传输方式或池子大小。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: finding A and knowing the read finished.', '下一步：读者怎样找到 A，发送方怎样知道它读完了？') : t('Next: how does the reader find A, and how does the owner know it finished?', '下一步：读者怎样找到 A，发送方怎样知道它读完了？')}</text>
      {:else if step === 1}
      <text x={phone ? 15 : 20} y="20" class="tag strong">DataRef = {t('a small descriptor for finding a payload', '找数据的小卡片')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{phone ? t('SHM = shared memory · payload A stays', 'SHM = 共享内存 · 数据 A 留在后端') : t('Example: object A · SHM = shared memory · payload stays in the backend', '示例：数据 A · SHM = 共享内存 · 数据留在后端')}</text>
      {#if !phone}
        <rect x="20" y="85" width="210" height="205" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="35" y="112" class="rowlabel">{t('SENDER BACKEND', '发送方后端')}</text>
        <rect x="45" y="140" width="160" height="82" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="125" y="174" text-anchor="middle" class="mono strong">{t('payload A', '数据 A')}</text>
        <text x="125" y="198" text-anchor="middle" class="tag">{t('tensor bytes', 'tensor 字节')}</text>
        <text x="125" y="255" text-anchor="middle" class="tag">{t('large data stays here', '大块数据留在这里')}</text>
        <path d="M230 185 H270" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 1 ? 1 : 0.15} />

        <rect x="275" y="65" width="195" height="250" rx="10" fill="white" stroke={phase >= 1 ? 'var(--accent)' : 'var(--faint)'} stroke-width={phase >= 1 ? 2 : 1} stroke-dasharray={phase >= 1 ? '0' : '4 3'} />
        <text x="292" y="94" class="mono strong">{phase >= 1 ? 'DataRef' : 'DataRef · not built'}</text>
        {#if phase >= 1}
          <text x="292" y="126" class="mono">version = {LIFETIME_DATA_REF_WIRE_VERSION} · {t('format', '格式')}</text>
          <text x="292" y="158" class="mono">object_id = {LIFETIME_RESULT_IDS[0]}</text>
          <text x="292" y="190" class="mono">transport = SHM</text>
          <text x="292" y="222" class="mono">buffer = info + length</text>
          <line x1="292" y1="241" x2="453" y2="241" stroke="var(--line)" />
          <text x="372" y="269" text-anchor="middle" class="tag strong">{t('descriptor only', '只有说明')}</text>
          <text x="372" y="292" text-anchor="middle" class="tag">{t('no tensor bytes here', '这里没有 tensor 字节')}</text>
        {:else}
          <text x="372" y="158" text-anchor="middle" class="tag">{t('payload has no descriptor yet', '数据还没有描述卡片')}</text>
        {/if}
        <path d="M470 185 H510" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.15} />

        <rect x="515" y="85" width="185" height="205" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="532" y="112" class="rowlabel">talker_ar</text>
        {#if phase >= 2}
          <text x="607" y="139" text-anchor="middle" class="tag strong">{t('FIELDS IN USE · NOT SENT', '使用字段 · 尚未发布')}</text>
          <text x="607" y="174" text-anchor="middle" class="tag">{t('can find object A', '能找到数据 A')}</text>
          <text x="607" y="204" text-anchor="middle" class="tag">{t('choose SHM', '选择 SHM')}</text>
          <text x="607" y="234" text-anchor="middle" class="tag">{t('use buffer info', '使用 buffer 信息')}</text>
          <text x="607" y="269" text-anchor="middle" class="tag">{t('publication comes next', '下一步发布')}</text>
        {:else}
          <text x="607" y="174" text-anchor="middle" class="tag">{t('waiting for DataRef', '等待 DataRef')}</text>
        {/if}
      {:else}
        <rect x="35" y="68" width="230" height="98" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="50" y="92" class="rowlabel">{t('SENDER BACKEND', '发送方后端')}</text>
        <rect x="60" y="105" width="180" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="150" y="130" text-anchor="middle" class="mono strong">{t('payload A · stays here', '数据 A · 留在这里')}</text>
        <path d="M150 166 V194" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 1 ? 1 : 0.15} />

        <rect x="40" y="200" width="220" height="218" rx="10" fill="white" stroke={phase >= 1 ? 'var(--accent)' : 'var(--faint)'} stroke-width={phase >= 1 ? 2 : 1} stroke-dasharray={phase >= 1 ? '0' : '4 3'} />
        <text x="55" y="228" class="mono strong">{phase >= 1 ? 'DataRef' : 'DataRef · not built'}</text>
        {#if phase >= 1}
          <text x="55" y="258" class="mono">version = {LIFETIME_DATA_REF_WIRE_VERSION} · {t('format', '格式')}</text>
          <text x="55" y="288" class="mono">object_id = {LIFETIME_RESULT_IDS[0]}</text>
          <text x="55" y="318" class="mono">transport = SHM</text>
          <text x="55" y="348" class="mono">buffer = info + length</text>
          <line x1="55" y1="366" x2="245" y2="366" stroke="var(--line)" />
          <text x="150" y="395" text-anchor="middle" class="tag strong">{t('descriptor · no tensor bytes', '只有说明 · 没有 tensor 字节')}</text>
        {:else}
          <text x="150" y="288" text-anchor="middle" class="tag">{t('no descriptor yet', '还没有描述卡片')}</text>
        {/if}
        <path d="M150 418 V448" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.15} />

        <rect x="35" y="455" width="230" height="112" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="50" y="480" class="rowlabel">talker_ar</text>
        {#if phase >= 2}
          <text x="150" y="503" text-anchor="middle" class="tag strong">{t('FIELDS IN USE · NOT SENT', '使用字段 · 尚未发布')}</text>
          <text x="150" y="528" text-anchor="middle" class="tag">{t('find A · choose SHM', '找到 A · 选择 SHM')}</text>
          <text x="150" y="553" text-anchor="middle" class="tag">{t('use buffer info · publication next', '使用 buffer 信息 · 下一步发布')}</text>
        {:else}
          <text x="150" y="528" text-anchor="middle" class="tag">{t('waiting for DataRef', '等待 DataRef')}</text>
        {/if}
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('No reader count or ACK state; other fields rebuild data.', 'DataRef 没有读者计数或 ACK 状态；别的字段还原 tensor。') : t('DataRef has no reader count or ACK state; other fields reconstruct tensors.', 'DataRef 没有读者计数或 ACK 状态；其他字段用于还原 tensor。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: publishing adds a sender pending record.', '下一步：发布时，发送方另加一张等待回执的记录。') : t('Next: publishing adds a separate pending record on the sender.', '下一步：发布时，发送方另加一张等待回执的记录。')}</text>
      {:else if step === 2}
      <text x={phone ? 15 : 20} y="20" class="tag strong">pending = {phone ? t("sender's record waiting for a read receipt", '发送方等待读取回执的记录') : t("sender's record waiting for an ACK · ACK = read receipt", '发送方等待 ACK 的记录 · ACK = 读取回执')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{t('Object A: write first, register pending, then send DataReady', '数据 A：先写入，再登记 pending，最后发 DataReady')}</text>
      {#if !phone}
        <path d="M225 180 H252" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.15} />
        <path d="M462 180 H490" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 3 ? 1 : 0.15} />
        <rect x="20" y="80" width="205" height="210" rx="12" fill="var(--bg)" stroke={phase === 0 || phase === 1 ? 'var(--accent)' : 'var(--line)'} />
        <text x="35" y="108" class="rowlabel">1 · {t('WRITE', '写入')}</text>
        {#if phase >= 1}
          <text x="122" y="132" text-anchor="middle" class="mono strong">DataRef(A)</text>
          <text x="122" y="154" text-anchor="middle" class="mono strong">RelayOperation</text>
        {:else}
          <text x="122" y="142" text-anchor="middle" class="mono strong">write_payload()</text>
        {/if}
        <rect x="43" y="162" width="159" height="52" rx="7" fill={phase >= 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase >= 1 ? 'var(--accent)' : 'var(--line)'} />
        <text x="122" y="194" text-anchor="middle" class="mono">{phase >= 1 ? t('payload A written', '数据 A 已写入') : t('payload A · writing…', '数据 A · 正在写入…')}</text>
        <text x="122" y="246" text-anchor="middle" class="tag">{phase >= 1 ? t('operation still open', '操作仍未收尾') : t('DataRef + operation not returned', 'DataRef 和 operation 未返回')}</text>

        <rect x="257" y="80" width="205" height="210" rx="12" fill="white" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 2 ? 2 : 1} />
        <text x="272" y="108" class="rowlabel">2 · {t('REMEMBER', '登记')}</text>
        {#if phase >= 2}
          <text x="360" y="142" text-anchor="middle" class="mono strong">pending[A]</text>
          <text x="282" y="178" class="mono">ops = [operation]</text>
          <text x="282" y="208" class="mono">ack = waiting</text>
          <text x="282" y="238" class="mono">key = object_id A</text>
          <text x="360" y="268" text-anchor="middle" class="tag">{t('sender keeps this record', '发送方保存这张记录')}</text>
        {:else}
          <text x="360" y="142" text-anchor="middle" class="mono strong">pending: no A</text>
          <text x="360" y="178" text-anchor="middle" class="tag">{t('not registered', '尚未登记')}</text>
          <text x="360" y="208" text-anchor="middle" class="tag">{t('ack · no future yet', 'ack · 还没有 future')}</text>
          <text x="360" y="238" text-anchor="middle" class="tag">{phase >= 1 ? t('waiting for registration', '等待登记') : t('DataRef not returned', 'DataRef 未返回')}</text>
        {/if}

        <rect x="495" y="80" width="205" height="210" rx="12" fill="var(--bg)" stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} />
        <text x="510" y="108" class="rowlabel">3 · {t('NOTIFY', '通知')}</text>
        <rect x="518" y="127" width="159" height="64" rx="7" fill="white" stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} />
        <text x="597" y="153" text-anchor="middle" class="mono strong">{phase >= 3 ? 'DataReady' : 'DataReady · not sent'}</text>
        <text x="597" y="178" text-anchor="middle" class="mono">{phase >= 3 ? 'DataRef(A)' : t('notice not sent', '通知未发送')}</text>
        <text x="597" y="224" text-anchor="middle" class="tag">{phase >= 3 ? '→ talker_ar' : phase >= 2 ? t('ready to notify', '可以通知') : t('waiting for pending', '等待 pending')}</text>
        <text x="597" y="258" text-anchor="middle" class="tag">{phase >= 3 ? t('notice sent', '通知已发出') : t('no receiver read or ACK', '接收方未读取或回 ACK')}</text>

        <rect x="20" y="312" width="680" height="76" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="333" text-anchor="middle" class="tag strong">{phase >= 4 ? 'watch_pending = background ACK wait' : 'watch_pending · not started'}</text>
        <text x="360" y="356" text-anchor="middle" class="tag">{phase >= 5 ? 'job.ready = publication done ✓' : 'job.ready · waiting'}</text>
        <text x="360" y="379" text-anchor="middle" class="tag strong">send_payload(): {phase >= 5 ? t('write + notice complete · no read implied', '写入 + 通知完成 · 不表示已读取') : t('waiting', '等待中')}</text>
      {:else}
        <path d="M150 190 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.15} />
        <path d="M150 340 V365" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 3 ? 1 : 0.15} />
        <rect x="15" y="70" width="270" height="120" rx="10" fill="var(--bg)" stroke={phase === 0 || phase === 1 ? 'var(--accent)' : 'var(--line)'} />
        <text x="30" y="94" class="rowlabel">1 · {t('WRITE', '写入')}</text>
        <text x="150" y="121" text-anchor="middle" class="mono strong">{phase >= 1 ? 'DataRef(A) + RelayOperation' : 'write_payload()'}</text>
        <rect x="40" y="132" width="220" height="30" rx="6" fill={phase >= 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase >= 1 ? 'var(--accent)' : 'var(--line)'} />
        <text x="150" y="152" text-anchor="middle" class="mono">{phase >= 1 ? t('payload A written', '数据 A 已写入') : t('payload A · writing…', '数据 A · 正在写入…')}</text>
        <text x="150" y="181" text-anchor="middle" class="tag">{phase >= 1 ? t('operation still open', '操作仍未收尾') : t('DataRef + op not returned', 'DataRef 和 operation 未返回')}</text>

        <rect x="15" y="220" width="270" height="120" rx="10" fill="white" stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 2 ? 2 : 1} />
        <text x="30" y="244" class="rowlabel">2 · {t('REMEMBER', '登记')}</text>
        {#if phase >= 2}
          <text x="150" y="273" text-anchor="middle" class="mono strong">pending[A]</text>
          <text x="42" y="302" class="mono">ops = [operation]</text>
          <text x="42" y="326" class="mono">ack = waiting · key = A</text>
        {:else}
          <text x="150" y="273" text-anchor="middle" class="mono strong">pending: no A</text>
          <text x="150" y="302" text-anchor="middle" class="tag">{t('not registered · no ACK future', '尚未登记 · 没有 ACK future')}</text>
          <text x="150" y="328" text-anchor="middle" class="tag">{phase >= 1 ? t('waiting for registration', '等待登记') : t('DataRef not returned', 'DataRef 未返回')}</text>
        {/if}

        <rect x="15" y="370" width="270" height="120" rx="10" fill="var(--bg)" stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} />
        <text x="30" y="394" class="rowlabel">3 · {t('NOTIFY', '通知')}</text>
        <rect x="40" y="408" width="220" height="55" rx="6" fill="white" stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} />
        <text x="150" y="431" text-anchor="middle" class="mono strong">{phase >= 3 ? 'DataReady · DataRef(A)' : 'DataReady · not sent'}</text>
        <text x="150" y="453" text-anchor="middle" class="tag">{phase >= 3 ? '→ talker_ar' : phase >= 2 ? t('ready to notify', '可以通知') : t('waiting for pending', '等待 pending')}</text>
        <text x="150" y="479" text-anchor="middle" class="tag">{phase >= 3 ? t('notice sent · no read implied', '通知已发 · 不表示已读取') : t('no receiver read or ACK', '接收方未读取或回 ACK')}</text>

        <rect x="15" y="515" width="270" height="100" rx="7" fill="white" stroke="var(--line)" />
        <text x="150" y="540" text-anchor="middle" class="tag strong">{phase >= 4 ? 'watch_pending = background ACK wait' : 'watch_pending · not started'}</text>
        <text x="150" y="568" text-anchor="middle" class="tag">{phase >= 5 ? 'job.ready = publication done ✓' : 'job.ready · waiting'}</text>
        <text x="150" y="596" text-anchor="middle" class="tag strong">send_payload(): {phase >= 5 ? t('returns · no read implied', '返回 · 不表示已读取') : t('waiting', '等待中')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('pending uses object_id; DataRef has no ACK state.', 'pending 用 object_id 对应数据；DataRef 里仍没有 ACK 状态。') : t('The pending key is object_id; the DataRef still has no ACK state.', 'pending 用 object_id 对应数据；DataRef 里仍没有 ACK 状态。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: read, rebuild and acknowledge.', '下一步：接收方取字节、还原数据，再回 ACK。') : t('Next: the receiver gets the bytes, rebuilds the payload and acknowledges.', '下一步：接收方取字节、还原数据，再回 ACK。')}</text>
      {:else if step === 3}
      <text x={phone ? 15 : 20} y="20" class="tag strong">ACK = {t('receipt: the data-plane read has finished', '回执：数据平面已经读完')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{phone ? t('SHM: copy → close handle + unlink name → ACK', 'SHM：复制 → 关句柄 + 移除名字 → ACK') : t('SHM receiver: parse → copy → close handle + unlink name → rebuild → ACK', 'SHM 接收方：解析 → 复制 → 关句柄 + 移除名字 → 还原 → ACK')}</text>
      {#if !phone}
        <path d="M170 180 H192" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 1 ? 1 : 0.25} />
        <path d="M345 180 H367" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 5 ? 1 : 0.25} />
        <path d="M520 180 H542" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 6 ? 1 : 0.25} />
        <rect x="20" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="32" y="108" class="rowlabel">1 · {t('PARSE', '解析')}</text>
        <text x="95" y="145" text-anchor="middle" class="mono strong">DataRef(A)</text>
        <text x="95" y="181" text-anchor="middle" class="mono">SHM</text>
        <text x="95" y="211" text-anchor="middle" class="mono">buffer.info</text>
        <text x="95" y="258" text-anchor="middle" class="tag">{t('choose the relay', '选择 relay')}</text>

        <g opacity={phase >= 1 ? 1 : 0.25}>
          <rect x="195" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke={phase >= 1 && phase <= 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 1 && phase <= 4 ? 2 : 1} />
          <text x="207" y="108" class="rowlabel">2 · GET</text>
          <text x="270" y="130" text-anchor="middle" class="mono strong">get_async</text>
          <text x="270" y="150" text-anchor="middle" class="mono">→ ShmGetOperation</text>
          <rect x="215" y="160" width="110" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="270" y="179" text-anchor="middle" class="mono">uint8[length]</text>
          <text x="270" y="195" text-anchor="middle" class="tag strong">{phase < 2 ? t('empty', '等待复制') : phase === 2 ? t('copying…', '正在复制…') : t('copy ✓', '复制完成 ✓')}</text>
          <text x="270" y="221" text-anchor="middle" class="tag" opacity={phase >= 2 ? 1 : 0.25}>await wait_for_completion</text>
          <text x="270" y="238" text-anchor="middle" class="tag" opacity={phase >= 3 ? 1 : 0.25}>{t('finally: close + unlink', 'finally：close + unlink')}</text>
          <text x="270" y="258" text-anchor="middle" class="tag strong">{phase >= 3 ? t('handle closed ✓', '句柄已关闭 ✓') : t('handle open', '句柄未关闭')}</text>
          <text x="270" y="276" text-anchor="middle" class="tag strong">{phase >= 3 ? t('name unlinked ✓', '名字已移除 ✓') : t('name linked', '名字仍在')}</text>
          <text x="270" y="294" text-anchor="middle" class="tag">{phase >= 4 ? t('buffer returns ✓', '接收空间返回 ✓') : t('buffer not returned', '接收空间未返回')}</text>
        </g>

        <g opacity={phase >= 5 ? 1 : 0.25}>
          <rect x="370" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2 : 1} />
          <text x="382" y="108" class="rowlabel">3 · {t('REBUILD', '还原')}</text>
          <text x="445" y="145" text-anchor="middle" class="mono strong">TensorMeta</text>
          <text x="445" y="179" text-anchor="middle" class="tag">shape · dtype</text>
          <text x="445" y="205" text-anchor="middle" class="tag">device · offset</text>
          <rect x="390" y="229" width="110" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="445" y="254" text-anchor="middle" class="mono strong">{t('payload A', '数据 A')}</text>
          <text x="445" y="291" text-anchor="middle" class="tag">{t('from the copied buffer', '用复制后的字节还原')}</text>
        </g>

        <g opacity={phase >= 6 ? 1 : 0.25}>
          <rect x="545" y="80" width="155" height="220" rx="11" fill="white" stroke="var(--accent)" stroke-width="2" />
          <text x="557" y="108" class="rowlabel">4 · ACK</text>
          <text x="622" y="143" text-anchor="middle" class="mono strong">object_id = A</text>
          <text x="622" y="175" text-anchor="middle" class="mono">{phase >= 6 ? 'success = true' : 'success · waiting'}</text>
          <text x="622" y="211" text-anchor="middle" class="tag strong">{phase >= 6 ? t('read finished ✓', '读取完成 ✓') : t('not acknowledged yet', '尚未回 ACK')}</text>
          <line x1="565" y1="229" x2="680" y2="229" stroke="var(--line)" />
          <text x="622" y="257" text-anchor="middle" class="tag">{phase >= 6 ? t('then → scheduler', '然后 → scheduler') : t('scheduler waits', 'scheduler 等待')}</text>
        </g>

        <rect x="20" y="318" width="680" height="30" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="338" text-anchor="middle" class="tag strong">{t('rebuild reads the copied bytes · ACK goes to the sender · payload goes to the input handler', '用副本还原 · ACK 回发送方 · 数据交给 input handler')}</text>
      {:else}
        <path d="M150 166 V186" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 1 ? 1 : 0.25} />
        <path d="M150 371 V391" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 5 ? 1 : 0.25} />
        <path d="M150 491 V511" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 6 ? 1 : 0.25} />
        <rect x="15" y="66" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="90" class="rowlabel">1 · {t('PARSE', '解析')} · DataRef(A)</text>
        <text x="150" y="121" text-anchor="middle" class="mono">SHM · buffer.info</text>
        <text x="150" y="148" text-anchor="middle" class="tag">{t('choose the relay', '选择 relay')}</text>

        <g opacity={phase >= 1 ? 1 : 0.25}>
          <rect x="15" y="186" width="270" height="185" rx="10" fill="var(--bg)" stroke={phase >= 1 && phase <= 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 1 && phase <= 4 ? 2 : 1} />
          <text x="30" y="210" class="rowlabel">2 · GET · get_async</text>
          <text x="150" y="233" text-anchor="middle" class="mono">→ ShmGetOperation</text>
          <rect x="40" y="244" width="220" height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="265" text-anchor="middle" class="mono">uint8[length]</text>
          <text x="150" y="294" text-anchor="middle" class="tag strong">{phase < 2 ? t('empty', '等待复制') : phase === 2 ? t('copying…', '正在复制…') : t('copy ✓', '复制完成 ✓')}</text>
          <text x="150" y="318" text-anchor="middle" class="tag" opacity={phase >= 2 ? 1 : 0.25}>await wait_for_completion</text>
          <text x="150" y="340" text-anchor="middle" class="tag" opacity={phase >= 3 ? 1 : 0.25}>{t('finally: close + unlink', 'finally：close + unlink')}</text>
          <text x="150" y="361" text-anchor="middle" class="tag strong">{phase >= 4 ? t('name unlinked · buffer returns ✓', '名字已移除 · 接收空间返回 ✓') : phase >= 3 ? t('handle closed · name unlinked ✓', '句柄已关 · 名字已移除 ✓') : t('handle open · name linked', '句柄未关 · 名字仍在')}</text>
        </g>

        <g opacity={phase >= 5 ? 1 : 0.25}>
          <rect x="15" y="391" width="270" height="100" rx="10" fill="var(--bg)" stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2 : 1} />
          <text x="30" y="415" class="rowlabel">3 · {t('REBUILD', '还原')} · TensorMeta</text>
          <text x="150" y="446" text-anchor="middle" class="tag">shape · dtype · device · offset</text>
          <text x="150" y="473" text-anchor="middle" class="mono strong">{t('payload A · from copied bytes', '数据 A · 用副本还原')}</text>
        </g>

        <g opacity={phase >= 6 ? 1 : 0.25}>
          <rect x="15" y="511" width="270" height="115" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
          <text x="30" y="535" class="rowlabel">4 · ACK · object_id = A</text>
          <text x="150" y="566" text-anchor="middle" class="mono">{phase >= 6 ? 'success = true' : 'success · waiting'}</text>
          <text x="150" y="594" text-anchor="middle" class="tag strong">{phase >= 6 ? t('read finished ✓', '读取完成 ✓') : t('not acknowledged yet', '尚未回 ACK')}</text>
          <text x="150" y="616" text-anchor="middle" class="tag">{phase >= 6 ? t('then → scheduler', '然后 → scheduler') : t('scheduler waits', 'scheduler 等待')}</text>
        </g>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Rebuilding uses the copy, not the unlinked name.', '还原用副本，不再读已移除的名字。') : t('Reconstruction reads the copied buffer, not the unlinked block name.', '还原读取复制后的接收空间，不再读已移除的共享块名字。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: return a sender write permit, then clear pending.', '下一步：发送方归还写入名额，再删除 pending。') : t('Next: the sender returns a write permit, then removes pending[A].', '下一步：发送方归还写入名额，再删除 pending[A]。')}</text>
      {:else}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{phone ? t('ACK → finish SHM put → return permit → clear pending', 'ACK → SHM put 收尾 → 归还名额 → 删除 pending') : t('Normal SHM sender path: ACK → finish put → return permit → clear pending', 'SHM 发送方正常路径：ACK → put 收尾 → 归还名额 → 删除 pending')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{t('sem = SHM write permits · each put takes one', 'sem = SHM 写入名额 · 每次 put 拿走一个')}</text>
      {#if !phone}
        <path d="M225 180 H252" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.25} />
        <path d="M462 180 H490" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 5 ? 1 : 0.25} />
        <rect x="20" y="80" width="205" height="220" rx="12" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="35" y="108" class="rowlabel">1 · {t('MATCH', '匹配')} · ack_transfer</text>
        <text x="122" y="142" text-anchor="middle" class="mono strong">DataAck(A)</text>
        <text x="122" y="174" text-anchor="middle" class="mono">success = true</text>
        <path d="M122 191 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="43" y="222" width="159" height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="122" y="250" text-anchor="middle" class="mono">pending[A] found</text>
        <text x="122" y="290" text-anchor="middle" class="mono">{phase >= 1 ? 'pending.ack.set_result ✓' : 'pending.ack · waiting'}</text>

        <g opacity={phase >= 2 ? 1 : 0.25}>
          <rect x="257" y="80" width="205" height="220" rx="12" fill="var(--bg)" stroke={phase >= 2 && phase <= 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 2 && phase <= 4 ? 2 : 1} />
          <text x="272" y="108" class="rowlabel">2 · {t('FINISH', '收尾')}</text>
          <text x="360" y="132" text-anchor="middle" class="mono strong">watch_pending</text>
          <rect x="279" y="142" width="161" height="36" rx="7" fill="white" stroke="var(--accent)" opacity={phase >= 2 ? 1 : 0.25} />
          <text x="360" y="165" text-anchor="middle" class="mono" opacity={phase >= 2 ? 1 : 0.25}>mark_receiver_done</text>
          <path d="M360 178 V190" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 3 ? 1 : 0.25} />
          <rect x="279" y="194" width="161" height="96" rx="7" fill="white" stroke="var(--accent)" opacity={phase >= 3 ? 1 : 0.25} />
          <text x="360" y="217" text-anchor="middle" class="mono" opacity={phase >= 3 ? 1 : 0.25}>wait_for_completion</text>
          <rect x="289" y="228" width="141" height="52" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" opacity={phase >= 4 ? 1 : 0.2} />
          <text x="360" y="250" text-anchor="middle" class="mono strong" opacity={phase >= 4 ? 1 : 0.2}>{phase >= 4 ? 'finally: sem.release' : 'waiting…'}</text>
          <text x="360" y="272" text-anchor="middle" class="tag" opacity={phase >= 4 ? 1 : 0.2}>{t('return 1 write permit', '归还 1 个写入名额')}</text>
        </g>

        <g opacity={phase >= 5 ? 1 : 0.25}>
          <rect x="495" y="80" width="205" height="220" rx="12" fill="var(--bg)" stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2 : 1} />
          <text x="510" y="108" class="rowlabel">3 · {t('CLEAR', '清除记录')}</text>
          <rect x="518" y="127" width="159" height="52" rx="7" fill="white" stroke="var(--faint)" stroke-dasharray={phase >= 5 ? '4 3' : '0'} />
          <text x="597" y="158" text-anchor="middle" class="mono">{phase >= 5 ? 'pending: no A' : 'pending[A] · waiting'}</text>
          <text x="597" y="211" text-anchor="middle" class="mono strong">{phase >= 5 ? 'pending.pop(A) ✓' : 'pending.pop · waiting'}</text>
          <text x="597" y="250" text-anchor="middle" class="tag">{t('only the record is removed', '这里只删除记录')}</text>
        </g>

        <rect x="20" y="320" width="680" height="30" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="340" text-anchor="middle" class="tag strong">wait_for_completion · finally: sem.release → pending.pop(A)</text>
      {:else}
        <path d="M150 190 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 2 ? 1 : 0.25} />
        <path d="M150 375 V395" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" opacity={phase >= 5 ? 1 : 0.25} />
        <rect x="15" y="70" width="270" height="120" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="30" y="94" class="rowlabel">1 · {t('MATCH', '匹配')} · ack_transfer</text>
        <text x="150" y="120" text-anchor="middle" class="mono">DataAck(A) · success = true</text>
        <rect x="40" y="130" width="220" height="30" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="150" y="150" text-anchor="middle" class="mono">pending[A] found</text>
        <text x="150" y="181" text-anchor="middle" class="mono">{phase >= 1 ? 'pending.ack.set_result ✓' : 'pending.ack · waiting'}</text>

        <g opacity={phase >= 2 ? 1 : 0.25}>
          <rect x="15" y="220" width="270" height="155" rx="10" fill="var(--bg)" stroke={phase >= 2 && phase <= 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 2 && phase <= 4 ? 2 : 1} />
          <text x="30" y="244" class="rowlabel">2 · {t('FINISH', '收尾')} · watch_pending</text>
          <text x="150" y="270" text-anchor="middle" class="mono" opacity={phase >= 2 ? 1 : 0.25}>mark_receiver_done</text>
          <rect x="40" y="281" width="220" height="82" rx="6" fill="white" stroke="var(--accent)" opacity={phase >= 3 ? 1 : 0.25} />
          <text x="150" y="301" text-anchor="middle" class="mono" opacity={phase >= 3 ? 1 : 0.25}>wait_for_completion</text>
          <rect x="50" y="309" width="200" height="44" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" opacity={phase >= 4 ? 1 : 0.2} />
          <text x="150" y="327" text-anchor="middle" class="mono strong" opacity={phase >= 4 ? 1 : 0.2}>{phase >= 4 ? 'finally: sem.release' : 'waiting…'}</text>
          <text x="150" y="347" text-anchor="middle" class="tag strong" opacity={phase >= 4 ? 1 : 0.2}>{t('return 1 write permit', '归还 1 个写入名额')}</text>
        </g>

        <g opacity={phase >= 5 ? 1 : 0.25}>
          <rect x="15" y="395" width="270" height="100" rx="10" fill="var(--bg)" stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2 : 1} />
          <text x="30" y="419" class="rowlabel">3 · {t('CLEAR', '清除记录')}</text>
          <rect x="40" y="437" width="220" height="32" rx="6" fill="white" stroke="var(--faint)" stroke-dasharray={phase >= 5 ? '4 3' : '0'} />
          <text x="150" y="458" text-anchor="middle" class="mono">{phase >= 5 ? 'pending: no A' : 'pending[A] · waiting'}</text>
          <text x="150" y="487" text-anchor="middle" class="mono strong">{phase >= 5 ? 'pending.pop(A) ✓' : 'pending.pop · waiting'}</text>
        </g>

        <rect x="15" y="515" width="270" height="55" rx="7" fill="white" stroke="var(--line)" />
        <text x="150" y="539" text-anchor="middle" class="tag strong">finally: sem.release → pending.pop(A)</text>
        <text x="150" y="560" text-anchor="middle" class="tag">{t('inside wait_for_completion', '在 wait_for_completion 内部')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('SHM normal path; other relays use their own operations.', 'SHM 正常路径；其他 relay 用自己的 operation。') : t('This is SHM completion; other relays keep their own resource semantics.', '本图是 SHM 完成路径；其他 relay 保留各自的资源语义。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: queues and backpressure between stages.', '下一章：队列和背压怎样连接快慢不同的 stage。') : t('Next chapter: how queues and backpressure connect stages at different speeds.', '下一章：队列和背压怎样连接快慢不同的 stage。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
