<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_LLM_ADDRESS_OPTION_COUNT,
    VOXT_LLM_DESTINATION_COUNT,
    VOXT_LLM_REQUEST_ITEM_COUNT,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'One request sends text, a model name and a key to one service. The address decides which service.',
    captionZh: '一次请求发出文字、模型名和钥匙。地址决定它们去哪一家服务。',
  }, {
    caption: '127.0.0.1 keeps the request on this Mac; another host receives it elsewhere. A setup selects one address.',
    captionZh: '地址用 127.0.0.1 时，请求留在本机；换成别的主机，请求就发到别处。一套配置选定一个地址。',
  }, {
    caption: 'The address and model stay in saved settings. The full key stays in the Mac Keychain.',
    captionZh: '地址和模型名留在设置里。完整钥匙留在 Mac 钥匙串。',
  }, {
    caption: 'The model name enters the body as model. The text enters messages.',
    captionZh: '模型名进入正文的 model。文字进入 messages。',
  }, {
    caption: 'The key follows Bearer in the Authorization header. It stays out of the body.',
    captionZh: '钥匙跟在 Bearer 后面，放进 Authorization 请求头。正文里没有钥匙。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: the empty service box appears first, then the text card Good morning arrives, then the model-name card demo-model, then the masked API key card, and finally arrows draw all three into the one configured service with the count one plus one plus one equals three.',
    zh: '画面按顺序形成：先出现空的服务框，随后文字卡 Good morning 到达，再是模型名卡 demo-model，再是打码的 API key 卡，最后箭头把三者画进同一个配置的服务，并出现 1 加 1 加 1 等于 3。',
  }, {
    en: 'The picture builds in order: the top card with the same text, model and key appears, two address panels arrive with their hosts, each panel shows its destination result, address B api.example.com becomes selected while A is not selected, and the count two addresses, one selected destination appears.',
    zh: '画面按顺序形成：先出现装着同样文字、模型名和钥匙的顶卡，两个地址面板带着主机名到达，每个面板显示各自的目的地结果，地址 B api.example.com 被选定而 A 未选定，最后出现 2 个候选地址、1 个选定目的地。',
  }, {
    en: 'The picture builds in order: two empty boxes appear, saved setup and Keychain item. The setup name demo, then the address, then the model name fill the settings box, and a no-key line appears. Then the Keychain item gains its name llm.demo and the full masked key, with the name derivation and access boundary.',
    zh: '画面按顺序形成：先出现两个空框，保存的配置和钥匙串项目。配置名 demo、地址、模型名依次进入设置框，并出现没有钥匙的一行。随后钥匙串项目得到名字 llm.demo 和打码的完整钥匙，并出现名字推导和访问边界。',
  }, {
    en: 'The picture builds in order: the model-name card and text card stand on the left, an empty request body appears on the right. The model name enters the body as the model field, then the text enters as the messages field, and a line appears stating the API key is not in this body.',
    zh: '画面按顺序形成：左边是模型名卡和文字卡，右边出现空的请求正文。模型名先进入正文的 model 字段，文字再进入 messages 字段，最后出现一行说明 API key 不在这个正文里。',
  }, {
    en: 'The picture builds in order: the Keychain item llm.demo with its full masked key stands on the left, a request with its finished body stands on the right with an empty Authorization slot. The Authorization label appears, then the word Bearer, then the key flies from the Keychain into the header after Bearer, and a line appears stating the key is in the header, not the body.',
    zh: '画面按顺序形成：左边是装着完整打码钥匙的钥匙串项目 llm.demo，右边是正文已完成、Authorization 空着的一次请求。先出现 Authorization 标签，再出现 Bearer 一词，随后钥匙从钥匙串飞进请求头跟在 Bearer 后面，最后出现一行说明钥匙在请求头而不在正文。',
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
  const H = $derived((phone ? [570, 640, 620, 590, 640] : [430, 440, 430, 440, 450])[step]);
  // Every step builds its state instead of highlighting finished boxes:
  // Step 1: service box, then text, model name and key cards, then the arrows
  //   and the 1+1+1 count.
  // Step 2: the shared top card, both address panels, their results, the
  //   selection of address B, then the 2/1 count.
  // Step 3: two empty boxes, then setup name, address and model fill settings,
  //   the no-key line, then the Keychain item gains its name and the full key.
  // Step 4: the two source cards and an empty body, then the model field, then
  //   the messages field, then the no-key line. The body never holds a key.
  // Step 5: the Keychain item and a request whose body is done and whose
  //   Authorization slot is empty; the label, then Bearer, then the key flies
  //   in after Bearer. The body never holds a key in any phase.
  const ANIMATED = [true, true, true, true, true];
  const PHASE_COUNTS = [5, 5, 6, 4, 5];
  // Phone LoopProgress spots per step, kept clear of titles, boxes and footnotes.
  const LP_PHONE: [number, number][] = [[228, 496], [228, 530], [228, 490], [228, 520], [228, 540]];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ANIMATED[s] || reduced) { phase = PHASE_COUNTS[s] - 1; return; }
    phase = 0;
    const count = PHASE_COUNTS[s];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  // The key's flight from the Keychain card into the Authorization header.
  const keyFly = $derived(phone ? { x: 2, y: -195, duration: 700 } : { x: -365, y: 37, duration: 700 });
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="llm-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={LP_PHONE[step][0]} y={LP_PHONE[step][1]} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}
      {#if step === 0}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE REQUEST · TEXT, MODEL NAME AND KEY', '一次请求 · 文字、模型名和钥匙')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('external example · words and a secret leave this Mac', '外部服务示例 · 文字和秘密离开这台 Mac')}</text>
        {#each [
          { label: '1 · TEXT', labelZh: '1 · 文字', value: '“Good morning.”', note: 'raw text from Ch. 4 Step 7', noteZh: '第 4 章第 7 步交出的原话', color: 'var(--accent)', soft: 'var(--accent-soft)' },
          { label: '2 · MODEL NAME', labelZh: '2 · 模型名', value: 'demo-model', note: 'which model to use', noteZh: '指定用哪个模型', color: 'var(--fg)', soft: 'var(--bg)' },
          { label: '3 · API KEY', labelZh: '3 · API key', value: 'sk-demo…1234', note: 'a password for the service', noteZh: '访问服务的密码', color: 'var(--gen)', soft: 'var(--gen-soft)' },
        ] as item, i}
          {@const x = phone ? 35 : 25 + i * 235}
          {@const y = phone ? 70 + i * 105 : 82}
          {@const cx = x + (phone ? 115 : 105)}
          {#if phase >= i + 1}
            <g in:fly={{ y: 50, duration: 500 }}>
              <rect x={x} y={y} width={phone ? 230 : 210} height={phone ? 88 : 135} rx="10" fill={item.soft} stroke={item.color} stroke-width="2" />
              <text x={cx} y={y + 24} text-anchor="middle" class="label" fill={item.color}>{t(item.label, item.labelZh)}</text>
              <text x={cx} y={y + (phone ? 52 : 66)} text-anchor="middle" class="value">{item.value}</text>
              <text x={cx} y={y + (phone ? 74 : 105)} text-anchor="middle" class="detail">{t(item.note, item.noteZh)}</text>
            </g>
          {/if}
          {#if !phone && phase >= 4}
            <line x1={cx} y1="223" x2={W / 2} y2="273" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" transition:fade />
          {/if}
        {/each}
        <rect x={phone ? 25 : 180} y={phone ? 415 : 280} width={phone ? 250 : 360} height="75" rx="11" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text x={W / 2} y={phone ? 442 : 307} text-anchor="middle" class="label">{t('ONE CONFIGURED SERVICE', '同一个配置的服务')}</text>
        <text x={W / 2} y={phone ? 471 : 339} text-anchor="middle" class="mono">api.example.com</text>
        {#if phase >= 4}
          <g transition:fade>
            {#if phone}<text x={W / 2} y="397" text-anchor="middle" class="cut">↓ {t('ALL GO TO ONE PLACE', '都发往同一个地方')}</text>{/if}
            <text x={W / 2} y={phone ? 520 : 390} text-anchor="middle" class="cut">1 + 1 + 1 = {VOXT_LLM_REQUEST_ITEM_COUNT} · {t('PARTS OF ONE REQUEST', '一次请求的三部分')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed values · the teaching key is masked.', '构造的值 · 教学钥匙已打码。')}</text>
      {:else if step === 1}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE REQUEST · TWO ADDRESS CHOICES', '一个请求 · 两个候选地址')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('host = the computer named in the address', '主机名 = 地址里点名的电脑')}</text>
        <rect x={phone ? 35 : 210} y="70" width={phone ? 230 : 300} height="58" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="94" text-anchor="middle" class="label">{t('THE SAME TEXT + MODEL + KEY', '同样的文字 + 模型 + 钥匙')}</text>
        <text x={W / 2} y="117" text-anchor="middle" class="detail">{t('only the address changes below', '下面只换地址')}</text>
        {#if phase >= 1}
          <g transition:fade>
            {#if !phone}
              <line x1="330" y1="130" x2="185" y2="151" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
              <line x1="390" y1="130" x2="535" y2="151" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {:else}
              <text x={W / 2} y="145" text-anchor="middle" class="detail">{t('CHOOSE ONE ADDRESS', '选定一个地址')}</text>
            {/if}
          </g>
        {/if}
        {#each [
          { name: 'ADDRESS A', nameZh: '地址 A', host: '127.0.0.1', result: 'THIS MAC', resultZh: '这台 Mac', note: 'text + model + key stay here', noteZh: '文字 + 模型 + 钥匙留在这里' },
          { name: 'ADDRESS B', nameZh: '地址 B', host: 'api.example.com', result: 'ANOTHER COMPUTER', resultZh: '另一台电脑', note: 'text + model + key leave this Mac', noteZh: '文字 + 模型 + 钥匙离开这台 Mac' },
        ] as option, i}
          {@const x = phone ? 25 : 35 + i * 350}
          {@const y = phone ? 155 + i * 200 : 155}
          {@const cx = x + (phone ? 125 : 150)}
          {@const selected = i === 1 && phase >= 3}
          {#if phase >= 1}
            <g in:fly={{ y: 40, duration: 500 }}>
              <rect x={x} y={y} width={phone ? 250 : 300} height={phone ? 160 : 180} rx="10" fill="var(--bg)" stroke={selected ? 'var(--accent)' : 'var(--fg)'} stroke-width={selected ? 2.5 : 1.5} />
              <text x={cx} y={y + 25} text-anchor="middle" class="label">{t(option.name, option.nameZh)}</text>
              <text x={cx} y={y + 56} text-anchor="middle" class="mono">{option.host}</text>
              {#if phase >= 2}
                <text x={cx} y={y + 100} text-anchor="middle" class="value" transition:fade>{t(option.result, option.resultZh)}</text>
                <text x={cx} y={y + 133} text-anchor="middle" class="detail" transition:fade>{t(option.note, option.noteZh)}</text>
              {/if}
              {#if phase >= 3}
                <text x={cx} y={y + (phone ? 152 : 165)} text-anchor="middle" class="label" fill={selected ? 'var(--accent)' : 'var(--muted)'} transition:fade>
                  {selected ? t('SELECTED · THE ONE DESTINATION', '选定 · 唯一目的地') : t('NOT SELECTED', '未选定')}
                </text>
              {/if}
            </g>
          {/if}
        {/each}
        {#if !phone && phase >= 1}<text x="360" y="250" text-anchor="middle" class="detail" transition:fade>{t('OR', '或')}</text>{/if}
        {#if phase >= 4}
          <text x={W / 2} y={phone ? 560 : 380} text-anchor="middle" class="cut" transition:fade>{VOXT_LLM_ADDRESS_OPTION_COUNT} {t('ADDRESSES', '个候选地址')} · {VOXT_LLM_DESTINATION_COUNT} {t('SELECTED DESTINATION', '个选定的目的地')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Host portions shown · constructed services.', '只画主机名 · 构造的服务。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Both assumed reachable.', '假设两个都能连通。')}</text>
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE SETUP · TWO STORAGE PLACES', '一套配置 · 两个存放处')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('Keychain = the Mac’s password store', '钥匙串 = Mac 的密码存放处')}</text>
        <rect x={phone ? 25 : 45} y={phone ? 75 : 85} width={phone ? 250 : 290} height={phone ? 190 : 220} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
        <text x={phone ? 150 : 190} y={phone ? 101 : 112} text-anchor="middle" class="label">{t('SAVED SETUP', '保存的配置')}</text>
        {#if phase >= 1}
          <text x={phone ? 150 : 190} y={phone ? 135 : 148} text-anchor="middle" class="value" in:fly={{ y: -18, duration: 400 }}>demo</text>
          <text x={phone ? 150 : 190} y={phone ? 157 : 171} text-anchor="middle" class="detail" transition:fade>{t('this setup’s name', '这套配置的名字')}</text>
        {/if}
        {#if phase >= 2}
          <text x={phone ? 150 : 190} y={phone ? 188 : 207} text-anchor="middle" class="mono" in:fly={{ y: -18, duration: 400 }}>api.example.com</text>
        {/if}
        {#if phase >= 3}
          <text x={phone ? 150 : 190} y={phone ? 211 : 232} text-anchor="middle" class="mono" in:fly={{ y: -18, duration: 400 }}>demo-model</text>
          <text x={phone ? 150 : 190} y={phone ? 232 : 254} text-anchor="middle" class="detail" transition:fade>{t('address + model name', '地址 + 模型名')}</text>
        {/if}
        {#if phase >= 4}
          <text x={phone ? 150 : 190} y={phone ? 253 : 289} text-anchor="middle" class="label" transition:fade>{t('NO API KEY HERE', '这里没有 API key')}</text>
        {/if}

        <rect x={phone ? 25 : 385} y={phone ? 285 : 85} width={phone ? 250 : 290} height={phone ? 190 : 220} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
        <text x={phone ? 150 : 530} y={phone ? 311 : 112} text-anchor="middle" class="label" fill="var(--gen)">{t('KEYCHAIN ITEM', '钥匙串项目')}</text>
        {#if phase >= 5}
          <text x={phone ? 150 : 530} y={phone ? 345 : 148} text-anchor="middle" class="value" in:fly={{ y: -18, duration: 400 }}>llm.demo</text>
          <text x={phone ? 150 : 530} y={phone ? 367 : 171} text-anchor="middle" class="detail" transition:fade>{t('item name · llm = language model', '项目名 · llm = 语言模型')}</text>
          <text x={phone ? 150 : 530} y={phone ? 408 : 216} text-anchor="middle" class="value" fill="var(--gen)" in:fly={{ y: 30, duration: 500 }}>sk-demo…1234</text>
          <text x={phone ? 150 : 530} y={phone ? 433 : 241} text-anchor="middle" class="detail" transition:fade>{t('full key · masked on this stage', '完整钥匙 · 图上打码')}</text>

          <text x={W / 2} y={phone ? 510 : 340} text-anchor="middle" class="cut" transition:fade>llm. + demo = llm.demo</text>
          {#if phone}
            <text x={W / 2} y="545" text-anchor="middle" class="detail" transition:fade>{t('Programs running as you', '以你身份运行的程序都能读它')}</text>
            <text x={W / 2} y="565" text-anchor="middle" class="detail" transition:fade>{t('can read this key without another prompt.', '不会再弹窗询问。')}</text>
          {:else}
            <text x={W / 2} y="385" text-anchor="middle" class="detail" transition:fade>{t('Programs running as you can read this key without another prompt.', '以你身份运行的程序都能读它，不会再弹窗询问。')}</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed setup · no real key stored.', '构造的配置 · 没有保存真实钥匙。')}</text>
      {:else if step === 3}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TEXT + MODEL → REQUEST BODY', '文字 + 模型名 → 请求正文')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('body = the request’s main content', '正文 = 请求的主要内容')}</text>

        <rect x={phone ? 20 : 35} y={phone ? 80 : 105} width={phone ? 125 : 210} height={phone ? 100 : 90} rx="9" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
        <text x={phone ? 82.5 : 140} y={phone ? 106 : 131} text-anchor="middle" class="label">{t('MODEL NAME', '模型名')}</text>
        <text x={phone ? 82.5 : 140} y={phone ? 147 : 165} text-anchor="middle" class="value">demo-model</text>
        <rect x={phone ? 155 : 35} y={phone ? 80 : 225} width={phone ? 125 : 210} height={phone ? 100 : 90} rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
        <text x={phone ? 217.5 : 140} y={phone ? 106 : 251} text-anchor="middle" class="label" fill="var(--accent)">{t('TEXT', '文字')}</text>
        <text x={phone ? 217.5 : 140} y={phone ? 147 : 285} text-anchor="middle" class="value">“Good morning.”</text>

        <rect x={phone ? 25 : 330} y={phone ? 225 : 85} width={phone ? 250 : 350} height={phone ? 230 : 260} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text x={phone ? 150 : 505} y={phone ? 251 : 112} text-anchor="middle" class="label">{t('REQUEST BODY', '请求正文')}</text>
        {#if phase >= 1}
          <g transition:fade>
            {#if phone}
              <line x1="82.5" y1="183" x2="105" y2="216" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {:else}
              <line x1="250" y1="151" x2="320" y2="171" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {/if}
          </g>
          <text x={phone ? 48 : 355} y={phone ? 282 : 153} class="mono" in:fly={{ x: -30, duration: 400 }}>model</text>
          <text x={phone ? 48 : 355} y={phone ? 308 : 181} class="value" in:fly={{ x: -30, duration: 400 }}>“demo-model”</text>
          <text x={phone ? 48 : 355} y={phone ? 329 : 204} class="detail" transition:fade>{t('which model to use', '指定用哪个模型')}</text>
        {/if}
        {#if phase >= 2}
          <g transition:fade>
            {#if phone}
              <line x1="217.5" y1="183" x2="195" y2="216" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {:else}
              <line x1="250" y1="270" x2="320" y2="270" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {/if}
          </g>
          <text x={phone ? 48 : 355} y={phone ? 361 : 241} class="mono" in:fly={{ x: -30, duration: 400 }}>messages</text>
          <text x={phone ? 48 : 355} y={phone ? 389 : 270} class="value" in:fly={{ x: -30, duration: 400 }}>[ … “Good morning.” … ]</text>
          <text x={phone ? 48 : 355} y={phone ? 412 : 293} class="detail" transition:fade>{t('the text to work on', '要加工的文字')}</text>
        {/if}

        {#if phase >= 3}
          <text x={W / 2} y={phone ? 500 : 385} text-anchor="middle" class="label" fill="var(--gen)" transition:fade>{t('API KEY · NOT IN THIS BODY', 'API key · 不在这个正文里')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed, abbreviated body.', '构造的简略正文。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Other request settings omitted.', '其他请求设置省略。')}</text>
      {:else if step === 4}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('KEYCHAIN KEY → AUTHORIZATION HEADER', '钥匙串钥匙 → Authorization 请求头')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('header = request information beside the body', '请求头 = 正文旁边的请求信息')}</text>

        <rect x={phone ? 25 : 35} y={phone ? 75 : 130} width={phone ? 250 : 220} height={phone ? 140 : 170} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
        <text x={phone ? 150 : 145} y={phone ? 101 : 156} text-anchor="middle" class="label" fill="var(--gen)">{t('KEYCHAIN ITEM', '钥匙串项目')}</text>
        <text x={phone ? 150 : 145} y={phone ? 132 : 195} text-anchor="middle" class="value">llm.demo</text>
        <text x={phone ? 150 : 145} y={phone ? 166 : 235} text-anchor="middle" class="value" fill="var(--gen)">sk-demo…1234</text>
        <text x={phone ? 150 : 145} y={phone ? 193 : 267} text-anchor="middle" class="detail">{t('full key · masked here', '完整钥匙 · 图上打码')}</text>

        <rect x={phone ? 25 : 330} y={phone ? 255 : 85} width={phone ? 250 : 355} height={phone ? 275 : 280} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text x={phone ? 150 : 507.5} y={phone ? 281 : 112} text-anchor="middle" class="label">{t('ONE REQUEST', '一次请求')}</text>
        <rect x={phone ? 40 : 350} y={phone ? 300 : 135} width={phone ? 220 : 315} height="105" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
        {#if phase >= 1}
          <text x={phone ? 55 : 370} y={phone ? 326 : 162} class="mono" transition:fade>Authorization</text>
        {/if}
        {#if phase >= 2}
          <text x={phone ? 143 : 505} y={phone ? 361 : 198} class="value" fill="var(--gen)" text-anchor="end" transition:fade>Bearer</text>
        {/if}
        {#if phase >= 3}
          <g transition:fade>
            {#if phone}
              <line x1="150" y1="220" x2="150" y2="246" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {:else}
              <line x1="260" y1="215" x2="320" y2="215" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
            {/if}
          </g>
          <text x={phone ? 148 : 510} y={phone ? 361 : 198} class="value" fill="var(--gen)" in:fly={keyFly}>sk-demo…1234</text>
          {#if phone}
            <text x="150" y="381" text-anchor="middle" class="detail" transition:fade>{t('Bearer = a key label', 'Bearer = 钥匙标签')}</text>
            <text x="150" y="398" text-anchor="middle" class="detail" transition:fade>{t('one space + full key', '一个空格 + 完整钥匙')}</text>
          {:else}
            <text x="507.5" y="224" text-anchor="middle" class="detail" transition:fade>{t('Bearer = a key label · one space · full key', 'Bearer = 钥匙标签 · 一个空格 + 完整钥匙')}</text>
          {/if}
        {/if}
        <rect x={phone ? 40 : 350} y={phone ? 425 : 260} width={phone ? 220 : 315} height="75" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5" />
        <text x={phone ? 150 : 507.5} y={phone ? 451 : 287} text-anchor="middle" class="label">{t('REQUEST BODY', '请求正文')}</text>
        <text x={phone ? 150 : 507.5} y={phone ? 478 : 315} text-anchor="middle" class="detail">{t('model + messages · no key', '模型名 + 消息 · 没有钥匙')}</text>

        {#if phase >= 4}
          <text x={W / 2} y={phone ? 565 : 400} text-anchor="middle" class="label" fill="var(--gen)" transition:fade>{t('KEY IN HEADER · NOT IN BODY', '钥匙在请求头 · 不在正文')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed request · key masked here.', '构造的请求 · 钥匙在图上打码。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('The real request uses the complete key.', '真实请求使用完整钥匙。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 13px; font-weight: 600; fill: var(--accent); }
  .label { font-size: 12px; font-weight: 700; }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .value { font-size: 17px; font-weight: 650; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .mono, .footnote { font-size: 11px; }
    .value { font-size: 15px; }
  }
</style>
