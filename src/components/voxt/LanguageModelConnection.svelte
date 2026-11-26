<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    caption: 'An address on 127.0.0.1 keeps the request on this Mac. Another host receives it elsewhere.',
    captionZh: '地址用 127.0.0.1 时，请求留在本机。换成别的主机，请求就发到别处。',
  }, {
    caption: 'The address and model stay in saved settings. The full key stays in the Mac Keychain.',
    captionZh: '地址和模型名留在设置里。完整钥匙留在 Mac 钥匙串。',
  }, {
    caption: 'The body names the model. Its messages contain the text.',
    captionZh: '正文指定模型名。messages 里装着文字。',
  }];
  const ariaLabels = [{
    en: 'A constructed request has three things to account for: the raw text Good morning, the model name demo-model, and a masked API key. All three go to one configured external service. The address chooses the service.',
    zh: '一个构造的请求有三样东西要分清：原话 Good morning、模型名 demo-model 和打码的 API key。它们都发往同一个配置的外部服务，地址决定是哪一家。',
  }, {
    en: 'The same request has two alternative destinations. The host 127.0.0.1 points to this Mac, so the text, model name and key stay here. The host api.example.com points to another computer, so all three leave this Mac. One selected address has one destination.',
    zh: '同一个请求有两个候选目的地。主机名 127.0.0.1 指向这台 Mac，文字、模型名和钥匙都留在这里。主机名 api.example.com 指向另一台电脑，三者都离开这台 Mac。一个选定的地址只有一个目的地。',
  }, {
    en: 'One constructed setup named demo is split into two storage places. Saved settings hold its address api.example.com and model name demo-model, but no API key. The Mac Keychain, its password store, holds item llm.demo with the complete key, masked here. The item name joins llm and demo. Any program running as this user can read the key without another prompt.',
    zh: '一个名为 demo 的构造配置分在两个存放处。保存的设置里有地址 api.example.com 和模型名 demo-model，但没有 API key。Mac 钥匙串是密码存放处，其中的 llm.demo 项目保存完整钥匙，图上打码。项目名由 llm 和 demo 组成。以这个用户身份运行的任何程序都能读取钥匙，不会再弹窗询问。',
  }, {
    en: 'The model name and raw text move into one request body, the main content of a request. The model field contains demo-model. The messages field contains Good morning among other omitted message content. The API key is not in this body. The body is constructed and abbreviated, and other request settings are omitted.',
    zh: '模型名和原话进入同一个请求正文，也就是请求的主要内容。model 字段是 demo-model。messages 字段里有 Good morning，其他消息内容省略。API key 不在这个正文里。正文是构造的简略形式，其他请求设置也省略了。',
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
  const H = $derived((phone ? [570, 640, 620, 590] : [430, 440, 430, 440])[step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="llm-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
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
          <rect x={x} y={y} width={phone ? 230 : 210} height={phone ? 88 : 135} rx="10" fill={item.soft} stroke={item.color} stroke-width="2" />
          <text x={cx} y={y + 24} text-anchor="middle" class="label" fill={item.color}>{t(item.label, item.labelZh)}</text>
          <text x={cx} y={y + (phone ? 52 : 66)} text-anchor="middle" class="value">{item.value}</text>
          <text x={cx} y={y + (phone ? 74 : 105)} text-anchor="middle" class="detail">{t(item.note, item.noteZh)}</text>
          {#if !phone}<line x1={cx} y1="223" x2={W / 2} y2="273" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />{/if}
        {/each}
        {#if phone}<text x={W / 2} y="397" text-anchor="middle" class="cut">↓ {t('ALL GO TO ONE PLACE', '都发往同一个地方')}</text>{/if}
        <rect x={phone ? 25 : 180} y={phone ? 415 : 280} width={phone ? 250 : 360} height="75" rx="11" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text x={W / 2} y={phone ? 442 : 307} text-anchor="middle" class="label">{t('ONE CONFIGURED SERVICE', '同一个配置的服务')}</text>
        <text x={W / 2} y={phone ? 471 : 339} text-anchor="middle" class="mono">api.example.com</text>
        <text x={W / 2} y={phone ? 520 : 390} text-anchor="middle" class="cut">1 + 1 + 1 = {VOXT_LLM_REQUEST_ITEM_COUNT} · {t('PARTS OF ONE REQUEST', '一次请求的三部分')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed values · the teaching key is masked.', '构造的值 · 教学钥匙已打码。')}</text>
      {:else if step === 1}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE REQUEST · TWO ADDRESS CHOICES', '一个请求 · 两个候选地址')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('host = the computer named in the address', '主机名 = 地址里点名的电脑')}</text>
        <rect x={phone ? 35 : 210} y="70" width={phone ? 230 : 300} height="58" rx="9" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="94" text-anchor="middle" class="label">{t('THE SAME TEXT + MODEL + KEY', '同样的文字 + 模型 + 钥匙')}</text>
        <text x={W / 2} y="117" text-anchor="middle" class="detail">{t('only the address changes below', '下面只换地址')}</text>
        {#if !phone}
          <line x1="330" y1="130" x2="185" y2="151" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
          <line x1="390" y1="130" x2="535" y2="151" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
        {:else}
          <text x={W / 2} y="145" text-anchor="middle" class="detail">{t('CHOOSE ONE ADDRESS', '选定一个地址')}</text>
        {/if}
        {#each [
          { name: 'ADDRESS A', nameZh: '地址 A', host: '127.0.0.1', result: 'THIS MAC', resultZh: '这台 Mac', note: 'text + model + key stay here', noteZh: '文字 + 模型 + 钥匙留在这里' },
          { name: 'ADDRESS B', nameZh: '地址 B', host: 'api.example.com', result: 'ANOTHER COMPUTER', resultZh: '另一台电脑', note: 'text + model + key leave this Mac', noteZh: '文字 + 模型 + 钥匙离开这台 Mac' },
        ] as option, i}
          {@const x = phone ? 25 : 35 + i * 350}
          {@const y = phone ? 155 + i * 200 : 155}
          {@const cx = x + (phone ? 125 : 150)}
          <rect x={x} y={y} width={phone ? 250 : 300} height={phone ? 160 : 180} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
          <text x={cx} y={y + 25} text-anchor="middle" class="label">{t(option.name, option.nameZh)}</text>
          <text x={cx} y={y + 56} text-anchor="middle" class="mono">{option.host}</text>
          <text x={cx} y={y + 100} text-anchor="middle" class="value">{t(option.result, option.resultZh)}</text>
          <text x={cx} y={y + 133} text-anchor="middle" class="detail">{t(option.note, option.noteZh)}</text>
        {/each}
        {#if !phone}<text x="360" y="250" text-anchor="middle" class="detail">{t('OR', '或')}</text>{/if}
        <text x={W / 2} y={phone ? 560 : 380} text-anchor="middle" class="cut">{VOXT_LLM_ADDRESS_OPTION_COUNT} {t('ADDRESSES', '个候选地址')} · {VOXT_LLM_DESTINATION_COUNT} {t('SELECTED DESTINATION', '个选定的目的地')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Host portions shown · constructed services.', '只画主机名 · 构造的服务。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Both assumed reachable.', '假设两个都能连通。')}</text>
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE SETUP · TWO STORAGE PLACES', '一套配置 · 两个存放处')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('Keychain = the Mac’s password store', '钥匙串 = Mac 的密码存放处')}</text>
        <rect x={phone ? 25 : 45} y={phone ? 75 : 85} width={phone ? 250 : 290} height={phone ? 190 : 220} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
        <text x={phone ? 150 : 190} y={phone ? 101 : 112} text-anchor="middle" class="label">{t('SAVED SETUP', '保存的配置')}</text>
        <text x={phone ? 150 : 190} y={phone ? 135 : 148} text-anchor="middle" class="value">demo</text>
        <text x={phone ? 150 : 190} y={phone ? 157 : 171} text-anchor="middle" class="detail">{t('this setup’s name', '这套配置的名字')}</text>
        <text x={phone ? 150 : 190} y={phone ? 188 : 207} text-anchor="middle" class="mono">api.example.com</text>
        <text x={phone ? 150 : 190} y={phone ? 211 : 232} text-anchor="middle" class="mono">demo-model</text>
        <text x={phone ? 150 : 190} y={phone ? 232 : 254} text-anchor="middle" class="detail">{t('address + model name', '地址 + 模型名')}</text>
        <text x={phone ? 150 : 190} y={phone ? 253 : 289} text-anchor="middle" class="label">{t('NO API KEY HERE', '这里没有 API key')}</text>

        <rect x={phone ? 25 : 385} y={phone ? 285 : 85} width={phone ? 250 : 290} height={phone ? 190 : 220} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
        <text x={phone ? 150 : 530} y={phone ? 311 : 112} text-anchor="middle" class="label" fill="var(--gen)">{t('KEYCHAIN ITEM', '钥匙串项目')}</text>
        <text x={phone ? 150 : 530} y={phone ? 345 : 148} text-anchor="middle" class="value">llm.demo</text>
        <text x={phone ? 150 : 530} y={phone ? 367 : 171} text-anchor="middle" class="detail">{t('item name · llm = language model', '项目名 · llm = 语言模型')}</text>
        <text x={phone ? 150 : 530} y={phone ? 408 : 216} text-anchor="middle" class="value" fill="var(--gen)">sk-demo…1234</text>
        <text x={phone ? 150 : 530} y={phone ? 433 : 241} text-anchor="middle" class="detail">{t('full key · masked on this stage', '完整钥匙 · 图上打码')}</text>

        <text x={W / 2} y={phone ? 510 : 340} text-anchor="middle" class="cut">llm. + demo = llm.demo</text>
        {#if phone}
          <text x={W / 2} y="545" text-anchor="middle" class="detail">{t('Programs running as you', '以你身份运行的程序都能读它')}</text>
          <text x={W / 2} y="565" text-anchor="middle" class="detail">{t('can read this key without another prompt.', '不会再弹窗询问。')}</text>
        {:else}
          <text x={W / 2} y="385" text-anchor="middle" class="detail">{t('Programs running as you can read this key without another prompt.', '以你身份运行的程序都能读它，不会再弹窗询问。')}</text>
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

        {#if phone}
          <line x1="82.5" y1="183" x2="105" y2="216" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
          <line x1="217.5" y1="183" x2="195" y2="216" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
        {:else}
          <line x1="250" y1="151" x2="320" y2="171" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
          <line x1="250" y1="270" x2="320" y2="270" stroke="var(--muted)" stroke-width="2" marker-end="url(#llm-arrow)" />
        {/if}
        <rect x={phone ? 25 : 330} y={phone ? 225 : 85} width={phone ? 250 : 350} height={phone ? 230 : 260} rx="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text x={phone ? 150 : 505} y={phone ? 251 : 112} text-anchor="middle" class="label">{t('REQUEST BODY', '请求正文')}</text>
        <text x={phone ? 48 : 355} y={phone ? 282 : 153} class="mono">model</text>
        <text x={phone ? 48 : 355} y={phone ? 308 : 181} class="value">“demo-model”</text>
        <text x={phone ? 48 : 355} y={phone ? 329 : 204} class="detail">{t('which model to use', '指定用哪个模型')}</text>
        <text x={phone ? 48 : 355} y={phone ? 361 : 241} class="mono">messages</text>
        <text x={phone ? 48 : 355} y={phone ? 389 : 270} class="value">[ … “Good morning.” … ]</text>
        <text x={phone ? 48 : 355} y={phone ? 412 : 293} class="detail">{t('the text to work on', '要加工的文字')}</text>

        <text x={W / 2} y={phone ? 500 : 385} text-anchor="middle" class="label" fill="var(--gen)">{t('API KEY · NOT IN THIS BODY', 'API key · 不在这个正文里')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed, abbreviated body.', '构造的简略正文。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Other request settings omitted.', '其他请求设置省略。')}</text>
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
