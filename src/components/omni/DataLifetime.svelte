<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    caption: 'The receiver uses the DataRef to get and rebuild the payload. It acknowledges the finished read before scheduling the payload.',
    captionZh: '接收方照 DataRef 取回并还原数据。读完后先回 ACK，再把数据交给 scheduler。',
  }, {
    caption: 'The sender matches the ack by object id and finishes the operation. It removes the pending record so backend resources can be reclaimed.',
    captionZh: '发送方按 object id 找到等待记录，让写入操作收尾。随后删掉记录，后端资源才可回收。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 650 : 390);
  const panels = $derived([
    { title: t('REUSE NOW · WRONG READ', '现在覆盖 · 读错'), x: phone ? 15 : 20, y: phone ? 105 : 105, w: phone ? 270 : 325 },
    { title: t('WAIT FOR THE READER', '等读者读完'), x: phone ? 15 : 375, y: phone ? 365 : 105, w: phone ? 270 : 325 },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('A result remains available while its receiver reads. A DataRef locates the payload, and the sender tracks the acknowledgement and operation completion.', '结果在接收方读取期间保持可用。DataRef 用来找到数据，发送方跟踪回执和操作完成。')}>
      <defs>
        <marker id="lifetime-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{t('Example: one space, two results; talker_ar is still reading A', '示例：一格空间、两份结果；talker_ar 还在读 A')}</text>
      <rect x={phone ? 15 : 20} y="33" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 31 : 36} y="42" class="tag">{t('result being read', '正在读的结果')}</text>
      <rect x={phone ? 147 : 175} y="33" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 163 : 191} y="42" class="tag">{t('next result', '下一份结果')}</text>
      <text x={phone ? 15 : 20} y="68" class="tag">thinker → talker_ar · {LIFETIME_RESULT_IDS.length} {t('results', '份结果')} − {LIFETIME_SLOT_COUNT} {t('space', '格')} = {LIFETIME_WAITING_COUNT} {t('must wait', '份要等')}</text>
      <text x={phone ? 15 : 20} y="90" class="tag">{phone ? t('One space is an example, not a configured limit.', '一格只是教学例子，不是实际配置的上限。') : t('The one-space pool is a teaching example, not a configured limit.', '一格只是教学例子，不是实际配置的上限。')}</text>

      {#each panels as panel, i}
        {@const wrong = i === 0}
        <rect x={panel.x} y={panel.y} width={panel.w} height="220" rx="12" fill="var(--bg)" stroke={wrong ? 'var(--gen)' : 'var(--accent)'} stroke-width={wrong ? 1 : 2} />
        <text x={panel.x + 14} y={panel.y + 24} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 48} class="tag">thinker</text>
        <rect x={panel.x + 14} y={panel.y + 58} width="62" height="36" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray={wrong ? '4 3' : '0'} />
        <text x={panel.x + 45} y={panel.y + 81} text-anchor="middle" class="mono strong">A</text>
        <rect x={panel.x + 14} y={panel.y + 104} width="62" height="36" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={panel.x + 45} y={panel.y + 127} text-anchor="middle" class="mono strong">B</text>
        <text x={panel.x + 45} y={panel.y + 158} text-anchor="middle" class="tag">{wrong ? t('B takes the space', 'B 占了这一格') : t('B waits outside', 'B 在格外等')}</text>

        <text x={panel.x + 175} y={panel.y + 48} text-anchor="middle" class="tag">{t('one space', '一格空间')}</text>
        <rect x={panel.x + 120} y={panel.y + 58} width="110" height="58" rx="8" fill={wrong ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={wrong ? 'var(--gen)' : 'var(--accent)'} />
        <text x={panel.x + 175} y={panel.y + 93} text-anchor="middle" class="mono strong">{wrong ? 'B' : 'A'}</text>
        <text x={panel.x + 175} y={panel.y + 135} text-anchor="middle" class="tag">{wrong ? t('A was replaced', 'A 被盖掉') : t('A stays readable', 'A 保持可读')}</text>

        <rect x={panel.x + 94} y={panel.y + 169} width="162" height="38" rx="7" fill="white" stroke={wrong ? 'var(--gen)' : 'var(--accent)'} />
        <text x={panel.x + 175} y={panel.y + 185} text-anchor="middle" class="tag strong">talker_ar</text>
        <text x={panel.x + 175} y={panel.y + 200} text-anchor="middle" class="tag">{wrong ? t('wanted A · reads B', '要读 A · 却读到 B') : t('reads A · then B may enter', '读完 A · B 才能进')}</text>
      {/each}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Safe reuse only; no specific transport or pool size.', '本图只讲何时能安全复用，不限定传输方式或池子大小。') : t('The diagram covers safe reuse, not a particular transport or pool size.', '本图只讲何时能安全复用，不限定传输方式或池子大小。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: finding A and knowing the read finished.', '下一步：读者怎样找到 A，主人又怎样知道它读完了？') : t('Next: how does the reader find A, and how does the owner know it finished?', '下一步：读者怎样找到 A，主人又怎样知道它读完了？')}</text>
      {:else if step === 1}
      <text x={phone ? 15 : 20} y="20" class="tag strong">DataRef = {t('a small descriptor for finding a payload', '找数据的小卡片')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{phone ? t('Object A · SHM · payload stays in the backend', '示例：数据 A · SHM 传输 · 数据本体留在后端') : t('Example: object A · SHM transport · payload stays in the backend', '示例：数据 A · SHM 传输 · 数据本体留在后端')}</text>
      {#if !phone}
        <rect x="20" y="85" width="210" height="205" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="35" y="112" class="rowlabel">{t('SENDER BACKEND', '发送方后端')}</text>
        <rect x="45" y="140" width="160" height="82" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="125" y="174" text-anchor="middle" class="mono strong">{t('payload A', '数据 A')}</text>
        <text x="125" y="198" text-anchor="middle" class="tag">{t('tensor bytes', 'tensor 字节')}</text>
        <text x="125" y="255" text-anchor="middle" class="tag">{t('large data stays here', '大块数据留在这里')}</text>
        <path d="M230 185 H270" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />

        <rect x="275" y="65" width="195" height="250" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="292" y="94" class="mono strong">DataRef</text>
        <text x="292" y="126" class="mono">version = {LIFETIME_DATA_REF_WIRE_VERSION}</text>
        <text x="292" y="158" class="mono">object_id = {LIFETIME_RESULT_IDS[0]}</text>
        <text x="292" y="190" class="mono">transport = SHM</text>
        <text x="292" y="222" class="mono">buffer = info + length</text>
        <line x1="292" y1="241" x2="453" y2="241" stroke="var(--line)" />
        <text x="372" y="269" text-anchor="middle" class="tag strong">{t('descriptor only', '只有说明')}</text>
        <text x="372" y="292" text-anchor="middle" class="tag">{t('no tensor bytes here', '这里没有 tensor 字节')}</text>
        <path d="M470 185 H510" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />

        <rect x="515" y="85" width="185" height="205" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="532" y="112" class="rowlabel">talker_ar</text>
        <text x="607" y="158" text-anchor="middle" class="tag strong">{t('can find object A', '能找到数据 A')}</text>
        <text x="607" y="190" text-anchor="middle" class="tag">{t('choose SHM', '选择 SHM')}</text>
        <text x="607" y="218" text-anchor="middle" class="tag">{t('use buffer info', '使用 buffer 信息')}</text>
        <text x="607" y="255" text-anchor="middle" class="tag">{t('reading comes next', '读取在下一步')}</text>
      {:else}
        <rect x="35" y="68" width="230" height="98" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="50" y="92" class="rowlabel">{t('SENDER BACKEND', '发送方后端')}</text>
        <rect x="60" y="105" width="180" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="150" y="130" text-anchor="middle" class="mono strong">{t('payload A · stays here', '数据 A · 留在这里')}</text>
        <path d="M150 166 V194" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />

        <rect x="40" y="200" width="220" height="218" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="55" y="228" class="mono strong">DataRef</text>
        <text x="55" y="258" class="mono">version = {LIFETIME_DATA_REF_WIRE_VERSION}</text>
        <text x="55" y="288" class="mono">object_id = {LIFETIME_RESULT_IDS[0]}</text>
        <text x="55" y="318" class="mono">transport = SHM</text>
        <text x="55" y="348" class="mono">buffer = info + length</text>
        <line x1="55" y1="366" x2="245" y2="366" stroke="var(--line)" />
        <text x="150" y="395" text-anchor="middle" class="tag strong">{t('descriptor · no tensor bytes', '只有说明 · 没有 tensor 字节')}</text>
        <path d="M150 418 V448" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />

        <rect x="35" y="455" width="230" height="112" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="50" y="480" class="rowlabel">talker_ar</text>
        <text x="150" y="510" text-anchor="middle" class="tag strong">{t('find A · choose SHM', '找到 A · 选择 SHM')}</text>
        <text x="150" y="539" text-anchor="middle" class="tag">{t('use buffer info to fetch', '用 buffer 信息取数据')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('No reader count or ACK state; other fields rebuild data.', 'DataRef 没有读者计数或 ACK 状态；别的字段还原 tensor。') : t('DataRef has no reader count or ACK state; other fields reconstruct tensors.', 'DataRef 没有读者计数或 ACK 状态；其他字段用于还原 tensor。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: publishing adds a sender pending record.', '下一步：发布时，发送方另加一张等待回执的记录。') : t('Next: publishing adds a separate pending record on the sender.', '下一步：发布时，发送方另加一张等待回执的记录。')}</text>
      {:else if step === 2}
      <text x={phone ? 15 : 20} y="20" class="tag strong">pending = {t("sender's record waiting for an ACK", '发送方等待 ACK 的记录')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{t('Object A: write first, register pending, then send DataReady', '数据 A：先写入，再登记 pending，最后发 DataReady')}</text>
      {#if !phone}
        <path d="M225 180 H252" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M462 180 H490" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="20" y="80" width="205" height="210" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="35" y="108" class="rowlabel">1 · {t('WRITE', '写入')}</text>
        <text x="122" y="142" text-anchor="middle" class="mono strong">RelayOperation</text>
        <rect x="43" y="162" width="159" height="52" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="122" y="194" text-anchor="middle" class="mono">{t('payload A written', '数据 A 已写入')}</text>
        <text x="122" y="246" text-anchor="middle" class="tag">{t('operation still open', '操作仍未收尾')}</text>

        <rect x="257" y="80" width="205" height="210" rx="12" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="272" y="108" class="rowlabel">2 · {t('REMEMBER', '登记')}</text>
        <text x="360" y="142" text-anchor="middle" class="mono strong">pending[A]</text>
        <text x="282" y="178" class="mono">ops = [operation]</text>
        <text x="282" y="208" class="mono">ack = waiting</text>
        <text x="282" y="238" class="mono">key = object_id A</text>
        <text x="360" y="268" text-anchor="middle" class="tag">{t('sender keeps this record', '发送方保存这张记录')}</text>

        <rect x="495" y="80" width="205" height="210" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="510" y="108" class="rowlabel">3 · {t('NOTIFY', '通知')}</text>
        <rect x="518" y="127" width="159" height="64" rx="7" fill="white" stroke="var(--accent)" />
        <text x="597" y="153" text-anchor="middle" class="mono strong">DataReady</text>
        <text x="597" y="178" text-anchor="middle" class="mono">DataRef(A)</text>
        <text x="597" y="224" text-anchor="middle" class="tag">→ talker_ar</text>
        <text x="597" y="258" text-anchor="middle" class="tag">{t('notice sent', '通知已发出')}</text>

        <rect x="20" y="312" width="680" height="34" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="334" text-anchor="middle" class="tag strong">send_payload(): {t('write + notice complete · no read implied', '写入 + 通知完成 · 不表示已读取')}</text>
      {:else}
        <path d="M150 190 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M150 340 V365" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="15" y="70" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="94" class="rowlabel">1 · {t('WRITE', '写入')}</text>
        <text x="150" y="124" text-anchor="middle" class="mono strong">RelayOperation · {t('open', '未收尾')}</text>
        <rect x="40" y="139" width="220" height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="150" y="160" text-anchor="middle" class="mono">{t('payload A written', '数据 A 已写入')}</text>

        <rect x="15" y="220" width="270" height="120" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="30" y="244" class="rowlabel">2 · {t('REMEMBER', '登记')}</text>
        <text x="150" y="273" text-anchor="middle" class="mono strong">pending[A]</text>
        <text x="42" y="302" class="mono">ops = [operation]</text>
        <text x="42" y="326" class="mono">ack = waiting · key = A</text>

        <rect x="15" y="370" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="394" class="rowlabel">3 · {t('NOTIFY', '通知')}</text>
        <rect x="40" y="408" width="220" height="55" rx="6" fill="white" stroke="var(--accent)" />
        <text x="150" y="431" text-anchor="middle" class="mono strong">DataReady · DataRef(A)</text>
        <text x="150" y="453" text-anchor="middle" class="tag">→ talker_ar</text>

        <rect x="15" y="515" width="270" height="57" rx="7" fill="white" stroke="var(--line)" />
        <text x="150" y="539" text-anchor="middle" class="tag strong">send_payload(): {t('write + notice done', '写入 + 通知完成')}</text>
        <text x="150" y="560" text-anchor="middle" class="tag">{t('receiver read is not implied', '不表示接收方已读取')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('pending uses object_id; DataRef has no ACK state.', 'pending 用 object_id 对应数据；DataRef 里仍没有 ACK 状态。') : t('The pending key is object_id; the DataRef still has no ACK state.', 'pending 用 object_id 对应数据；DataRef 里仍没有 ACK 状态。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: read, rebuild and acknowledge.', '下一步：接收方取字节、还原数据，再回 ACK。') : t('Next: the receiver gets the bytes, rebuilds the payload and acknowledges.', '下一步：接收方取字节、还原数据，再回 ACK。')}</text>
      {:else if step === 3}
      <text x={phone ? 15 : 20} y="20" class="tag strong">ACK = {t('receipt: the data-plane read has finished', '回执：数据平面已经读完')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{phone ? t('Receiver: parse → GET → rebuild → ACK', '接收方：解析 → 读取 → 还原 → ACK') : t('Receiver: parse DataRef → GET and wait → rebuild → ACK → scheduler', '接收方：解析 DataRef → GET 并等待 → 还原 → ACK → scheduler')}</text>
      {#if !phone}
        <path d="M170 180 H192" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M345 180 H367" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M520 180 H542" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="20" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="32" y="108" class="rowlabel">1 · {t('PARSE', '解析')}</text>
        <text x="95" y="145" text-anchor="middle" class="mono strong">DataRef(A)</text>
        <text x="95" y="181" text-anchor="middle" class="mono">SHM</text>
        <text x="95" y="211" text-anchor="middle" class="mono">buffer.info</text>
        <text x="95" y="258" text-anchor="middle" class="tag">{t('choose the relay', '选择 relay')}</text>

        <rect x="195" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="207" y="108" class="rowlabel">2 · GET</text>
        <text x="270" y="145" text-anchor="middle" class="mono strong">get_async</text>
        <rect x="215" y="165" width="110" height="48" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="270" y="194" text-anchor="middle" class="mono">uint8[length]</text>
        <text x="270" y="246" text-anchor="middle" class="tag">{t('wait for completion', '等待读取完成')}</text>

        <rect x="370" y="80" width="150" height="220" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="382" y="108" class="rowlabel">3 · {t('REBUILD', '还原')}</text>
        <text x="445" y="145" text-anchor="middle" class="mono strong">TensorMeta</text>
        <text x="445" y="179" text-anchor="middle" class="tag">shape · dtype</text>
        <text x="445" y="205" text-anchor="middle" class="tag">device · offset</text>
        <rect x="390" y="229" width="110" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="445" y="254" text-anchor="middle" class="mono strong">{t('payload A', '数据 A')}</text>

        <rect x="545" y="80" width="155" height="220" rx="11" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="557" y="108" class="rowlabel">4 · ACK</text>
        <text x="622" y="143" text-anchor="middle" class="mono strong">object_id = A</text>
        <text x="622" y="175" text-anchor="middle" class="mono">success = true</text>
        <text x="622" y="211" text-anchor="middle" class="tag strong">{t('read finished ✓', '读取完成 ✓')}</text>
        <line x1="565" y1="229" x2="680" y2="229" stroke="var(--line)" />
        <text x="622" y="257" text-anchor="middle" class="tag">{t('then → scheduler', '然后 → scheduler')}</text>

        <rect x="20" y="318" width="680" height="30" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="338" text-anchor="middle" class="tag strong">{t('ACK goes to the sender · rebuilt payload goes to the input handler', 'ACK 回发送方 · 还原的数据交给 input handler')}</text>
      {:else}
        <path d="M150 166 V186" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M150 286 V306" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M150 406 V426" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="15" y="66" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="90" class="rowlabel">1 · {t('PARSE', '解析')} · DataRef(A)</text>
        <text x="150" y="121" text-anchor="middle" class="mono">SHM · buffer.info</text>
        <text x="150" y="148" text-anchor="middle" class="tag">{t('choose the relay', '选择 relay')}</text>

        <rect x="15" y="186" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="210" class="rowlabel">2 · GET · get_async</text>
        <text x="150" y="241" text-anchor="middle" class="mono">uint8[length]</text>
        <text x="150" y="268" text-anchor="middle" class="tag">{t('wait for completion', '等待读取完成')}</text>

        <rect x="15" y="306" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="330" class="rowlabel">3 · {t('REBUILD', '还原')} · TensorMeta</text>
        <text x="150" y="361" text-anchor="middle" class="tag">shape · dtype · device · offset</text>
        <text x="150" y="388" text-anchor="middle" class="mono strong">{t('payload A rebuilt', '数据 A 已还原')}</text>

        <rect x="15" y="426" width="270" height="115" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="30" y="450" class="rowlabel">4 · ACK · object_id = A</text>
        <text x="150" y="481" text-anchor="middle" class="mono">success = true</text>
        <text x="150" y="509" text-anchor="middle" class="tag strong">{t('read finished ✓', '读取完成 ✓')}</text>
        <text x="150" y="531" text-anchor="middle" class="tag">{t('then → scheduler', '然后 → scheduler')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('ACK ends the read, not downstream computation.', 'ACK 只表示读取结束，不表示下游计算完成。') : t('ACK means the read ended, not that downstream computation finished.', 'ACK 只表示读取结束，不表示下游计算完成。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: match ACK to pending[A] and finish.', '下一步：发送方用 ACK 找到 pending[A]，让操作收尾。') : t('Next: the sender matches this ACK to pending[A] and finishes the operation.', '下一步：发送方用 ACK 找到 pending[A]，让操作收尾。')}</text>
      {:else}
      <text x={phone ? 15 : 20} y="20" class="tag strong">{phone ? t('Match ACK → finish operation → remove pending', '发送方正常路径：匹配 ACK → 操作收尾 → 删除 pending') : t('Normal sender path: match ACK → finish operation → remove pending', '发送方正常路径：匹配 ACK → 操作收尾 → 删除 pending')}</text>
      <text x={phone ? 15 : 20} y="45" class="tag">{phone ? t('Each RelayOperation handles its backend resource', '每种 RelayOperation 自己处理后端的资源') : t('Each concrete RelayOperation handles its own backend resource', '每种 RelayOperation 自己处理后端的资源')}</text>
      {#if !phone}
        <path d="M225 180 H252" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M462 180 H490" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="20" y="80" width="205" height="220" rx="12" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="35" y="108" class="rowlabel">1 · {t('MATCH', '匹配')}</text>
        <text x="122" y="142" text-anchor="middle" class="mono strong">DataAck(A)</text>
        <text x="122" y="174" text-anchor="middle" class="mono">success = true</text>
        <path d="M122 191 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="43" y="222" width="159" height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="122" y="250" text-anchor="middle" class="mono">pending[A] found</text>

        <rect x="257" y="80" width="205" height="220" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="272" y="108" class="rowlabel">2 · {t('FINISH', '收尾')}</text>
        <text x="360" y="140" text-anchor="middle" class="mono strong">watch_pending</text>
        <rect x="279" y="157" width="161" height="43" rx="7" fill="white" stroke="var(--accent)" />
        <text x="360" y="184" text-anchor="middle" class="mono">mark_receiver_done</text>
        <path d="M360 200 V221" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="279" y="228" width="161" height="43" rx="7" fill="white" stroke="var(--accent)" />
        <text x="360" y="255" text-anchor="middle" class="mono">wait_for_completion</text>

        <rect x="495" y="80" width="205" height="220" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="510" y="108" class="rowlabel">3 · {t('CLEAR', '清除记录')}</text>
        <rect x="518" y="127" width="159" height="52" rx="7" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
        <text x="597" y="158" text-anchor="middle" class="mono">pending: no A</text>
        <text x="597" y="211" text-anchor="middle" class="tag strong">{t('record removed', '记录已删除')}</text>
        <rect x="518" y="232" width="159" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="597" y="257" text-anchor="middle" class="tag strong">{t('backend may reclaim', '后端可以回收')}</text>

        <rect x="20" y="320" width="680" height="30" rx="7" fill="white" stroke="var(--line)" />
        <text x="360" y="340" text-anchor="middle" class="tag strong">{t('A is complete only after its operations finish · no universal release() call', 'A 的 operations 完成后才收尾 · 通用层没有统一 release()')}</text>
      {:else}
        <path d="M150 190 V215" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <path d="M150 340 V365" stroke="var(--accent)" stroke-width="2" marker-end="url(#lifetime-arrow)" />
        <rect x="15" y="70" width="270" height="120" rx="10" fill="white" stroke="var(--accent)" stroke-width="2" />
        <text x="30" y="94" class="rowlabel">1 · {t('MATCH', '匹配')} · DataAck(A)</text>
        <text x="150" y="126" text-anchor="middle" class="mono">success = true</text>
        <rect x="40" y="141" width="220" height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="150" y="162" text-anchor="middle" class="mono">pending[A] found</text>

        <rect x="15" y="220" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="244" class="rowlabel">2 · {t('FINISH', '收尾')} · watch_pending</text>
        <text x="150" y="277" text-anchor="middle" class="mono">mark_receiver_done</text>
        <text x="150" y="309" text-anchor="middle" class="mono">wait_for_completion</text>

        <rect x="15" y="370" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="30" y="394" class="rowlabel">3 · {t('CLEAR', '清除记录')}</text>
        <rect x="40" y="408" width="220" height="32" rx="6" fill="white" stroke="var(--faint)" stroke-dasharray="4 3" />
        <text x="150" y="429" text-anchor="middle" class="mono">pending: no A</text>
        <text x="150" y="465" text-anchor="middle" class="tag strong">{t('backend may reclaim', '后端可以回收')}</text>

        <rect x="15" y="515" width="270" height="55" rx="7" fill="white" stroke="var(--line)" />
        <text x="150" y="539" text-anchor="middle" class="tag strong">{t('operations finish before completion', 'operations 完成后才收尾')}</text>
        <text x="150" y="560" text-anchor="middle" class="tag">{t('no universal release() call', '通用层没有统一 release()')}</text>
      {/if}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{phone ? t('Slow readers hold resources; backends control release.', '读者越慢，后端资源占用越久；具体回收方式由后端决定。') : t('A slow reader holds backend resources longer; reclamation is backend-specific.', '读者越慢，后端资源占用越久；具体回收方式由后端决定。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('Next: queues and backpressure between stages.', '下一章：队列和背压怎样连接快慢不同的 stage。') : t('Next chapter: how queues and backpressure connect stages at different speeds.', '下一章：队列和背压怎样连接快慢不同的 stage。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
