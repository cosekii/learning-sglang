<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_DICT_TERM, VOXT_DICT_ALIAS, VOXT_DICT_SECOND_TERM, VOXT_DICT_TERM_COUNT,
    VOXT_DICT_HINT_COUNT, VOXT_DICT_GLOSSARY_ALL_UP_TO, VOXT_DICT_GLOSSARY_MAX_TERMS, VOXT_DICT_GLOSSARY_MAX_BYTES,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Recognition wrote Preeya. You meant Priya; one dictionary row pairs them.',
    captionZh: '识别写成了 Preeya。你要的是 Priya，词典里一行把两者配起来。',
  }, {
    caption: 'One row helps three ways. Dictionary-wide notes are the fourth.',
    captionZh: '一行词条有三个去处。整部词典的备注是第四个。',
  }, {
    caption: 'Only the enabled term goes to the speech model as a hint. An alias stays out.',
    captionZh: '发给语音模型的提示只含启用的词条。别名不进去。',
  }, {
    caption: 'Aliases become the term before cleanup. This works without the language model.',
    captionZh: '别名在清理之前就换成词条。没有语言模型也照样换。',
  }, {
    caption: "Small dictionaries put the glossary in system. Large ones put selected terms at the user's start.",
    captionZh: '小词典把术语表放进 system。大词典把选中的词条放在 user 开头。',
  }, {
    caption: 'Dictionary-wide notes are free text for the language model. They never reach the recognizer.',
    captionZh: '全词典备注是写给语言模型的自由文字，不会到识别器。',
  }, {
    caption: 'Hints and alias replacement work without the model; the glossary and dictionary notes do not. How long does Voxt keep the recording?',
    captionZh: '提示和别名替换不需要模型；术语表和全词典备注需要。Voxt 把录音留多久？',
  }];
  const ariaLabels = [{
    en: 'Your voice says call Priya, but the speech model writes call Preeya, the wrong name. A dictionary row fixes this once: a term with its aliases, and an optional private note.',
    zh: '你的声音说 call Priya，语音模型却写成 call Preeya，名字错了。词典里一行就能一次修好：一个词条、它的别名，和可选的私有备注。',
  }, {
    en: 'One dictionary row has three parts. The term is the spelling you want. Aliases are what recognition tends to write instead. The row note is private and is not sent anywhere. The row helps in three places: speech hints from the term, alias replacement in the transcript, and a language-model glossary made only from the term and aliases. The fourth destination is separate: dictionary-wide settings.Dictionary.Notes goes to the language-model prompt when notes are enabled.',
    zh: '一行词典有三部分。词条是你想要的写法，别名是识别常写成的样子，行内备注是私有的，不发送到任何地方。这行有三个去处：词条去语音模型当提示，别名在文字稿里换回词条，只有词条和别名组成语言模型术语表。第四个去处来自另一处设置：整部词典的 settings.Dictionary.Notes 在备注开启时进入语言模型提示。',
  }, {
    en: 'The enabled terms alone are sent to the speech model as hints, the most recently changed first. The alias is not sent, because it is exactly what recognition gets wrong. The dictionary settings must have both the dictionary and the speech hints on.',
    zh: '只有启用的词条会作为提示发给语音模型，最近改过的排前面。别名不发，因为别名正是识别会写错的样子。词典设置里要同时打开词典和语音提示。',
  }, {
    en: 'After recognition, enabled aliases are replaced by their term in the text, before any language-model cleanup. Latin aliases match whole words ignoring case; Chinese, Japanese and Korean aliases match anywhere; the longest match wins. A term already written correctly is left alone, so this works with the language model off or failing.',
    zh: '识别之后、语言模型清理之前，启用的别名会在文字里换回词条。拉丁别名按整词匹配、不分大小写；中日韩别名可以在任意位置匹配；最长的那次胜出。已经写对的词条保持原样，所以语言模型关掉或失败时这一步照样有效。',
  }, {
    en: 'With 30 or fewer distinct enabled terms, all terms become candidates and the glossary sits in the system message. With more than 30, only terms mentioned by the replaced text become candidates; system keeps generic rules, and the selected glossary opens the user message. Both cases take the longest prefix that fits 60 lines and 2000 bytes, stopping at the first line that does not fit. The request input is call Priya after alias replacement. An unchanged system prefix may let the provider reuse its prompt cache, but saves no guaranteed time or tokens.',
    zh: '不超过 30 个不同的启用词条时，全部成为候选，术语表放在 system 消息里。超过 30 个时，只把替换后的文字提到的词条作为候选；system 只留通用规则，选中的 <glossary> 放在 user 开头。两种情况都取同时满足 60 行和 2000 字节的最长前缀，遇到首个放不下的行就停。这次请求的输入是别名替换后的 call Priya。provider 可能复用未变的 system 前缀，但不保证省时或省 token。',
  }, {
    en: 'Dictionary-wide settings.Dictionary.Notes is free text, separate from a row’s private store.Term.Note. When enabled, it joins the language model system layers and never goes to the speech model or transcript replacement. Final messages are system, then history, then user; this request input sits only in user. Notes-off keeps the dictionary notes out of the prompt even while the dictionary is on.',
    zh: '整部词典的 settings.Dictionary.Notes 是自由文字，和行内私有的 store.Term.Note 不同。开启时，它作为单独一层进入语言模型的 system，从不去语音模型或文字稿替换。最终消息顺序是 system、history、user，这次请求的输入只在 user 里。即使词典开着，关掉备注也能让全词典备注不进提示。',
  }, {
    en: 'With the language model off or failing, the speech hints and the alias replacement still work. The glossary and dictionary-wide notes do not, because both ride in the language-model messages. The next chapter asks how long Voxt keeps the recording and its history.',
    zh: '语言模型关掉或失败时，语音提示和别名替换仍然有效。术语表和全词典备注不行，因为两者都随语言模型消息发送。下一章看 Voxt 把录音和历史留多久。',
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
  const H = $derived((phone ? [640, 720, 640, 700, 760, 620, 620] : [470, 520, 430, 450, 500, 430, 560])[step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="dict-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="dict-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="dict-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('RECOGNITION HEARD IT WRONG', '识别听错了')}</text>
        <text x="20" y="46" class="tag">{t('One spoken sentence, one wrong word.', '一句话，一个词听错。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="58" rx="8" fill="var(--faint)" />
          <text x="34" y="86" class="rowlabel">{t('your voice', '你的声音')}</text>
          <text x="34" y="108" class="tag">“call Priya”</text>
          <path d="M150 120 V140" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="146" width="260" height="58" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="170" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="34" y="192" class="tag">{t('writes words', '写出文字')}</text>
          <path d="M150 204 V224" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="230" width="260" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="254" class="rowlabel">{t('recognized text', '识别文字')}</text>
          <text x="34" y="276" class="tag strong">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <text x="20" y="316" class="tag">{t('you meant: ', '你想要的：')}<tspan fill="var(--accent)" font-weight="600">call {VOXT_DICT_TERM}.</tspan></text>
          <text x="20" y="348" class="tag strong">{t('the dictionary is one small table', '词典就是一张小表')}</text>
        {:else}
          <rect x="20" y="66" width="150" height="82" rx="8" fill="var(--faint)" />
          <text x="34" y="92" class="rowlabel">{t('your voice', '你的声音')}</text>
          <text x="34" y="120" class="tag">“call Priya”</text>
          <path d="M170 107 H192" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="204" y="66" width="150" height="82" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="218" y="92" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="218" y="120" class="tag">{t('writes words', '写出文字')}</text>
          <path d="M354 107 H376" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="388" y="66" width="312" height="82" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="402" y="92" class="rowlabel">{t('recognized text', '识别文字')}</text>
          <text x="402" y="122" class="tag strong">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <text x="402" y="138" class="tag">{t('the wrong name lands as written', '错的名字就这样落下')}</text>
          <text x="20" y="184" class="tag">{t('you meant: ', '你想要的：')}<tspan fill="var(--accent)" font-weight="600">call {VOXT_DICT_TERM}.</tspan></text>
          <text x="20" y="208" class="tag strong">{t('you fix it by hand every time', '每次都要手动改')}</text>
        {/if}
        {#if phone}
          <rect x="20" y="368" width="260" height="196" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="394" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="34" y="422" class="tag">{t('term', '词条')}</text>
          <text x="266" y="422" text-anchor="end" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="34" y="452" class="tag">{t('alias', '别名')}</text>
          <text x="266" y="452" text-anchor="end" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="34" y="482" class="tag">{t('note', '备注')}</text>
          <text x="266" y="482" text-anchor="end" class="detail">{t('on the design team', '在设计团队里')}</text>
          <text x="34" y="520" class="tag">{t('the alias is what recognition writes.', '别名就是识别会写的样子。')}</text>
          <text x="34" y="544" class="tag">{t('the term is what you want instead.', '词条是你要换成的写法。')}</text>
        {:else}
          <rect x="20" y="262" width="680" height="150" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="288" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="40" y="326" class="tag strong">{t('term', '词条')}</text>
          <text x="40" y="352" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="230" y="326" class="tag strong">{t('aliases', '别名')}</text>
          <text x="230" y="352" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="420" y="326" class="tag strong">{t('note', '备注')}</text>
          <text x="420" y="352" class="detail">{t('on the design team', '在设计团队里')}</text>
          <text x="34" y="388" class="tag">{t('the alias is what recognition writes; the term is what you want; the note is free text.', '别名是识别会写的样子；词条是你要的写法；备注是自由文字。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('source: dict.go · Term, Aliases', '出处：dict.go · Term、Aliases') : t('Source: Voxt/internal/dict/dict.go · a term carries aliases and a note', '出处：Voxt/internal/dict/dict.go · 一个词条带别名和备注')}</text>

      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('THREE ROW ROUTES + ONE SETTINGS ROUTE', '词条三个去处 + 设置一个去处')}</text>
        <text x="20" y="46" class="tag">{t('the row’s own note stays private.', '行内备注只留在这里。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="132" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('term', '词条')} <tspan class="mono" fill="var(--accent)">{VOXT_DICT_TERM}</tspan></text>
          <text x="34" y="116" class="rowlabel">{t('alias', '别名')} <tspan class="mono" fill="var(--gen)">{VOXT_DICT_ALIAS}</tspan></text>
          <text x="34" y="146" class="rowlabel">{t('row note', '行内备注')} <tspan class="detail">{t('private · not sent', '私有 · 不发送')}</tspan></text>
          <text x="34" y="176" class="detail">{t('the row you typed once', '你写一次的那行')}</text>
          <path d="M150 194 V214" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          {#each [
            { y: 222, name: t('1 · SPEECH MODEL', '1 · 语音模型'), part: t('term → hint', '词条 → 提示'), note: t('needs dictionary + speech hints', '需要词典 + 语音提示') },
            { y: 320, name: t('2 · TRANSCRIPT', '2 · 文字稿'), part: t('alias → term', '别名 → 词条'), note: t('needs dictionary', '需要词典') },
            { y: 418, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + alias', '词条 + 别名'), note: t('needs dictionary + glossary', '需要词典 + 术语表') },
            { y: 516, name: t('4 · LANGUAGE MODEL · dictionary notes', '4 · 语言模型 · 全词典备注'), part: t('settings.Dictionary.Notes', 'settings.Dictionary.Notes'), note: t('needs dictionary, notes not off', '需要词典，备注未关') },
          ] as d}
            <rect x="20" y={d.y} width="260" height="86" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={d.y + 24} class="tag strong">{d.name}</text>
            <text x="34" y={d.y + 50} class="detail">{d.part}</text>
            <text x="34" y={d.y + 72} class="detail">{d.note}</text>
          {/each}
        {:else}
          <rect x="20" y="78" width="220" height="300" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="104" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="34" y="140" class="tag strong">{t('term', '词条')}</text>
          <text x="34" y="162" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="34" y="200" class="tag strong">{t('aliases', '别名')}</text>
          <text x="34" y="222" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="34" y="260" class="tag strong">{t('row note', '行内备注')}</text>
          <text x="34" y="282" class="detail">{t('private · not sent anywhere', '私有 · 不发送到任何地方')}</text>
          <text x="34" y="348" class="detail">{t('typed once, reused every dictation', '写一次，每次听写都用')}</text>
          {#each [
            { y: 66, name: t('1 · SPEECH MODEL · hints', '1 · 语音模型 · 提示'), part: t('term only', '只发词条'), note: t('dictionary + speech hints', '词典 + 语音提示') },
            { y: 156, name: t('2 · TRANSCRIPT · replace', '2 · 文字稿 · 替换'), part: t('alias → term', '别名 → 词条'), note: t('dictionary on', '词典开着') },
            { y: 246, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + aliases', '词条 + 别名'), note: t('dictionary + glossary', '词典 + 术语表') },
            { y: 336, name: t('4 · LANGUAGE MODEL · dictionary notes', '4 · 语言模型 · 全词典备注'), part: t('settings.Dictionary.Notes', 'settings.Dictionary.Notes'), note: t('dictionary + notes on', '词典 + 备注开启') },
          ] as d, i}
            <rect x="300" y={d.y} width="400" height="72" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="314" y={d.y + 26} class="tag strong">{d.name}</text>
            <text x="314" y={d.y + 50} class="detail">{d.part} · {d.note}</text>
            {#if i < 3}
              <line x1="244" y1={[146, 208, 222][i]} x2="292" y2={d.y + 36} stroke="var(--muted)" stroke-width="1.5" marker-end="url(#dict-arrow)" />
            {/if}
          {/each}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('switches: dictionary, hints, glossary, notes off', '开关：词典、提示、术语表、关闭备注') : t('Switches: dictionary on/off · speech hints · glossary · notes off', '开关：词典开/关 · 语音提示 · 术语表 · 关闭备注')}</text>

      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('1 OF 4 · TERM → SPEECH HINTS', '第 1/4 个 · 词条 → 语音提示')}</text>
        <text x="20" y="46" class="tag">{t('A word list you give the recognizer.', '发给识别器的一份词表。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="150" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('enabled terms', '启用的词条')}</text>
          <text x="34" y="114" class="mono strong">{VOXT_DICT_TERM}</text>
          <text x="34" y="140" class="mono strong">{VOXT_DICT_SECOND_TERM}</text>
          <text x="34" y="176" class="detail">{t('newest change first', '最近改的排前面')}</text>
          <path d="M150 212 V236" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="244" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="268" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="34" y="296" class="mono">{VOXT_DICT_TERM} · {VOXT_DICT_SECOND_TERM}</text>
          <text x="34" y="320" class="detail">{VOXT_DICT_HINT_COUNT} {t('hints', '条提示')}</text>
          <text x="20" y="370" class="tag strong" fill="var(--gen)">{VOXT_DICT_ALIAS} ✗</text>
          <text x="20" y="394" class="tag">{t('an alias is not a hint', '别名不当提示')}</text>
          <text x="20" y="418" class="tag">{t('it is what recognition gets wrong', '它正是识别会写错的')}</text>
          <text x="20" y="458" class="tag">{t('fewer slots: drop the tail; keep the front', '槽位更少：从末尾删，前面的新词条留下')}</text>
        {:else}
          <rect x="20" y="72" width="300" height="190" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="98" class="rowlabel">{t('enabled terms', '启用的词条')}</text>
          <text x="34" y="132" class="mono strong">{VOXT_DICT_TERM}</text>
          <text x="34" y="162" class="mono strong">{VOXT_DICT_SECOND_TERM}</text>
          <text x="34" y="200" class="detail">{t('most recently changed first', '最近改过的排前面')}</text>
          <text x="34" y="226" class="detail">{VOXT_DICT_TERM_COUNT} {t('terms →', '个词条 →')} {VOXT_DICT_HINT_COUNT} {t('hints', '条提示')}</text>
          <path d="M320 160 H372" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="384" y="96" width="316" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="398" y="122" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="398" y="154" class="mono">{VOXT_DICT_TERM}</text>
          <text x="398" y="180" class="mono">{VOXT_DICT_SECOND_TERM}</text>
          <text x="398" y="212" class="detail">{t('only the words, not their aliases', '只有词条，没有别名')}</text>
          <rect x="20" y="286" width="680" height="72" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="312" class="tag strong" fill="var(--gen)">{VOXT_DICT_ALIAS} ✗</text>
          <text x="34" y="338" class="detail">{t('An alias is not sent: it is what recognition gets wrong.', '别名不发：它正是识别会写错的样子。')}</text>
          <text x="20" y="390" class="tag">{t('A service with fewer slots drops hints from the end, keeping the newest-first prefix.', '槽位更少的服务从末尾删，保留列表前面的新词条。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('dict.Hints · enabled terms, newest first', 'dict.Hints · 启用的词条，最近优先') : t('Source: dict.Hints() · enabled terms, each once, newest change first', '出处：dict.Hints() · 启用的词条各一次，最近改过优先')}</text>

      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('2 OF 4 · ALIAS → TRANSCRIPT', '第 2/4 个 · 别名 → 文字稿')}</text>
        <text x="20" y="46" class="tag">{t('Swapped before cleanup, while it is still plain text.', '在清理之前换掉，此时还是纯文字。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="86" class="rowlabel">{t('recognized', '识别结果')}</text>
          <text x="34" y="108" class="tag">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <path d="M150 120 V140" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="146" width="260" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="170" class="rowlabel">{t('replaced', '替换后')}</text>
          <text x="34" y="192" class="tag">call <tspan fill="var(--accent)" font-weight="600">{VOXT_DICT_TERM}</tspan>.</text>
          <path d="M150 204 V224" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="230" width="260" height="52" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="262" text-anchor="middle" class="tag">{t('language-model cleanup', '语言模型清理')}</text>
          <text x="20" y="312" class="tag strong">{t('matching rules', '匹配规则')}</text>
          <text x="20" y="338" class="tag">{t('Latin: whole words, any case', '拉丁：整词，不分大小写')}</text>
          <text x="20" y="362" class="tag">{t('Chinese / Japanese / Korean: anywhere', '中日韩：任意位置')}</text>
          <text x="20" y="386" class="tag">{t('longest match wins', '最长的那次胜出')}</text>
          <text x="20" y="410" class="tag">{t('a correct term is left alone', '已经对的词条不动')}</text>
          <rect x="20" y="432" width="260" height="70" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="456" class="tag strong">{t('model off or failed?', '模型关了或失败？')}</text>
          <text x="34" y="482" class="tag">{t('still “call Priya”', '仍是 “call Priya”')}</text>
        {:else}
          <rect x="20" y="76" width="150" height="66" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="100" class="rowlabel">{t('recognized', '识别结果')}</text>
          <text x="34" y="126" class="tag">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <path d="M170 109 H192" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="204" y="76" width="176" height="66" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="218" y="100" class="rowlabel">{t('replaced', '替换后')}</text>
          <text x="218" y="126" class="tag">call <tspan fill="var(--accent)" font-weight="600">{VOXT_DICT_TERM}</tspan>.</text>
          <path d="M380 109 H402" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="414" y="76" width="286" height="66" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="428" y="100" class="rowlabel">{t('language-model cleanup', '语言模型清理')}</text>
          <text x="428" y="126" class="detail">{t('the text it receives is already right', '它收到的文字已经对了')}</text>
          <rect x="20" y="164" width="370" height="150" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="190" class="rowlabel">{t('matching rules', '匹配规则')}</text>
          <text x="34" y="218" class="tag">{t('Latin: whole words, ignoring case', '拉丁：整词匹配，不分大小写')}</text>
          <text x="34" y="242" class="tag">{t('Chinese / Japanese / Korean: anywhere', '中日韩：任意位置都能匹配')}</text>
          <text x="34" y="266" class="tag">{t('at each place the longest match wins', '每个位置最长的那次胜出')}</text>
          <text x="34" y="290" class="tag">{t('a term already written stays', '已经写对的词条保持原样')}</text>
          <rect x="410" y="164" width="290" height="150" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="424" y="190" class="rowlabel">{t('with the model off or failing', '模型关掉或失败时')}</text>
          <text x="424" y="222" class="tag strong">call <tspan fill="var(--accent)">{VOXT_DICT_TERM}</tspan>.</text>
          <text x="424" y="252" class="tag">{t('the swap runs before cleanup', '替换在清理之前跑')}</text>
          <text x="424" y="276" class="tag">{t('so it does not need the model', '所以不靠语言模型')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('dict.Replace · spoken() before transcribe()', 'dict.Replace · transcribe() 前的 spoken()') : t('Source: dict.Replace() · session.cleanup.go spoken() runs before transcribe()', '出处：dict.Replace() · session.cleanup.go 的 spoken() 在 transcribe() 之前')}</text>

      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('3 OF 4 · GLOSSARY → MODEL MESSAGES', '第 3/4 个 · 术语表 → 模型消息')}</text>
        <text x="20" y="46" class="tag">{t('its place depends on the dictionary size.', '位置由词典大小决定。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="230" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="86" class="rowlabel">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN SYSTEM', '术语表在 SYSTEM')}</text>
          <rect x="34" y="100" width="232" height="92" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="122" class="detail">system</text>
          <text x="46" y="144" class="detail">{t('general rules', '通用规则')}</text>
          <text x="46" y="172" class="mono">- {VOXT_DICT_TERM} ({VOXT_DICT_ALIAS})</text>
          <rect x="34" y="204" width="232" height="64" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="46" y="226" class="detail">user</text>
          <text x="46" y="254" class="tag">call {VOXT_DICT_TERM}.</text>

          <rect x="20" y="308" width="260" height="272" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="332" class="rowlabel">&gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN USER', '术语表在 USER')}</text>
          <rect x="34" y="346" width="232" height="68" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="46" y="368" class="detail">system</text>
          <text x="46" y="392" class="detail">{t('generic rules only', '只有通用规则')}</text>
          <rect x="34" y="426" width="232" height="132" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="448" class="detail">user</text>
          <text x="46" y="474" class="mono">{t('<glossary>', '<glossary>')}</text>
          <text x="46" y="498" class="detail">{t('mentioned terms only', '只放文字提到的词条')}</text>
          <text x="46" y="522" class="mono">{t('</glossary>', '</glossary>')}</text>
          <text x="46" y="548" class="tag">call {VOXT_DICT_TERM}.</text>

          <text x="20" y="612" class="tag">{t('candidates: ≤30 all · >30 mentioned', '候选：≤30 全部 · >30 只挑提到的')}</text>
          <text x="20" y="640" class="tag">{t('longest prefix: ≤60 lines + ≤2000 bytes', '最长前缀：≤60 行 + ≤2000 字节')}</text>
          <text x="20" y="668" class="tag">{t('stop at the first line that does not fit', '首个放不下的行就停')}</text>
          <text x="20" y="696" class="tag">{t('provider may reuse system · no saving promised', 'provider 可能复用 system，不保证省时省 token')}</text>
        {:else}
          <rect x="20" y="72" width="340" height="250" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="96" class="rowlabel">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN SYSTEM', '术语表在 SYSTEM')}</text>
          <rect x="34" y="108" width="312" height="104" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="48" y="130" class="detail">system</text>
          <text x="48" y="152" class="detail">{t('general rules', '通用规则')}</text>
          <text x="48" y="180" class="mono">- {VOXT_DICT_TERM} ({t('heard as', '可能被听成')}: {VOXT_DICT_ALIAS})</text>
          <text x="48" y="202" class="detail">{t('all distinct terms are candidates', '全部不同词条先成为候选')}</text>
          <rect x="34" y="224" width="312" height="70" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="246" class="detail">user</text>
          <text x="48" y="274" class="tag">call {VOXT_DICT_TERM}.</text>

          <rect x="380" y="72" width="320" height="250" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="394" y="96" class="rowlabel">&gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN USER', '术语表在 USER')}</text>
          <rect x="394" y="108" width="292" height="72" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="408" y="130" class="detail">system</text>
          <text x="408" y="156" class="detail">{t('generic rules only', '只有通用规则')}</text>
          <rect x="394" y="192" width="292" height="130" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="408" y="214" class="detail">user</text>
          <text x="408" y="240" class="mono">{t('<glossary>', '<glossary>')}</text>
          <text x="408" y="264" class="detail">{t('mentioned terms only', '只放文字提到的词条')}</text>
          <text x="408" y="288" class="mono">{t('</glossary>', '</glossary>')}</text>
          <text x="408" y="312" class="tag">call {VOXT_DICT_TERM}.</text>

          <text x="20" y="352" class="tag">{t('candidates: ≤30 all distinct · >30 mentioned only', '候选：≤30 全部不同词条 · >30 只挑文字提到的')}</text>
          <text x="20" y="380" class="tag">{t('take the longest prefix that fits 60 lines and 2000 bytes', '取同时满足 60 行和 2000 字节的最长前缀')}</text>
          <text x="20" y="408" class="tag">{t('stop at the first line that does not fit; never cut a line in half', '首个超预算的行就停，不把一行截半')}</text>
          <text x="20" y="436" class="tag">{t('provider may reuse unchanged system · no guaranteed time or token savings', 'provider 可能复用未变的 system 前缀，不保证省时省 token')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('compose.Build · 60 lines · 2000 bytes', 'compose.Build · 60 行 · 2000 字节') : t('Source: compose.Build · GlossaryAllUpTo 30 · 60 lines · 2000 bytes', '出处：compose.Build · GlossaryAllUpTo 30 · 60 行 · 2000 字节')}</text>

      {:else if step === 5}
        <text x="20" y="22" class="tag strong">{t('4 OF 4 · DICTIONARY NOTES → SYSTEM', '第 4/4 个 · 全词典备注 → SYSTEM')}</text>
        <text x="20" y="46" class="tag">{t('separate from the row’s private note.', '和行内私有备注不是一回事。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="120" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('dictionary-wide notes', '全词典备注')}</text>
          <text x="34" y="112" class="detail">settings.Dictionary.Notes</text>
          <text x="34" y="136" class="detail">{t('e.g. “Priya is on the design team;', '例如 “Priya 在设计团队；')}</text>
          <text x="34" y="158" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <path d="M150 182 V204" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="212" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="236" class="rowlabel">{t('system prompt · notes layer', 'system 提示 · 备注一层')}</text>
          <text x="34" y="262" class="mono">{t('notes join the system layers', '备注加入 system 各层')}</text>
          <text x="34" y="288" class="detail">{t('no request input here', '这次请求的输入不在这里')}</text>
          <text x="20" y="340" class="tag strong">{t('never sent to', '从不发到')}</text>
          <text x="20" y="366" class="tag" fill="var(--gen)">✗ {t('speech model', '语音模型')}</text>
          <text x="20" y="390" class="tag" fill="var(--gen)">✗ {t('transcript replacement', '文字稿替换')}</text>
          <text x="20" y="428" class="tag">{t('messages: system → history → user', '消息：system → history → user')}</text>
          <text x="20" y="452" class="tag">{t('this request is in user', '这次请求的输入在 user')}</text>
          <text x="20" y="490" class="tag">{t('notes-off keeps them out', '关掉备注就不进提示')}</text>
          <text x="20" y="514" class="tag">{t('even while the dictionary is on', '词典开着也一样')}</text>
        {:else}
          <rect x="20" y="72" width="240" height="140" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="98" class="rowlabel">{t('dictionary-wide notes', '全词典备注')}</text>
          <text x="34" y="126" class="detail">settings.Dictionary.Notes</text>
          <text x="34" y="152" class="detail">{t('“Priya is on the design team;', '“Priya 在设计团队；')}</text>
          <text x="34" y="174" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <text x="34" y="198" class="detail">{t('any notes that help', '任何有用的说明都行')}</text>
          <path d="M260 142 H312" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="324" y="72" width="376" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="338" y="98" class="rowlabel">{t('system prompt · notes layer', 'system 提示 · 备注一层')}</text>
          <text x="338" y="128" class="detail">{t('role · task rules · dictionary notes', '角色 · 任务规则 · 全词典备注')}</text>
          <text x="338" y="156" class="mono">{t('notes join the system layers', '备注加入 system 各层')}</text>
          <text x="338" y="186" class="detail">{t('no request input here', '这次请求的输入不在这里')}</text>
          <rect x="20" y="240" width="680" height="90" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="266" class="tag strong" fill="var(--gen)">{t('never sent to', '从不发到')}</text>
          <text x="34" y="294" class="tag">✗ {t('speech model (hints come from the term)', '语音模型（提示只来自词条）')}</text>
          <text x="34" y="318" class="tag">✗ {t('the transcript (replacement reads aliases)', '文字稿（替换只读别名）')}</text>
          <text x="20" y="356" class="tag">{t('messages: system → history → user · this request is in user', '消息：system → history → user · 这次请求的输入在 user')}</text>
          <text x="20" y="384" class="tag">{t('Notes-off keeps the notes out of the prompt even while the dictionary is on.', '即使词典开着，关掉备注也能让全词典备注不进提示。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('PromptDictionary · compose addDictionary', 'PromptDictionary · compose addDictionary') : t('Source: session/text.go PromptDictionary() · compose/dictionary.go addDictionary()', '出处：session/text.go PromptDictionary() · compose/dictionary.go addDictionary()')}</text>

      {:else if step === 6}
        <text x="20" y="22" class="tag strong">{t('WHAT SURVIVES WITHOUT THE MODEL', '没有语言模型时还剩什么')}</text>
        <text x="20" y="46" class="tag">{t('The dictionary has two kinds of help.', '词典有两种帮忙方式。')}</text>
        {#if phone}
          <text x="266" y="70" text-anchor="end" class="detail">{t('model off', '模型关掉')}</text>
          {#each [
            { y: 80, name: t('speech hints', '语音提示'), without: true, note: t('from the term', '来自词条') },
            { y: 160, name: t('alias → term', '别名 → 词条'), without: true, note: t('before cleanup', '清理之前') },
            { y: 240, name: t('glossary', '术语表'), without: false, note: t('inside the prompt', '在提示里') },
            { y: 320, name: t('dictionary notes', '全词典备注'), without: false, note: t('inside the prompt', '在提示里') },
          ] as r}
            <rect x="20" y={r.y} width="260" height="66" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={r.y + 26} class="tag strong">{r.name}</text>
            <text x="34" y={r.y + 50} class="detail">{r.note}</text>
            <text x="266" y={r.y + 36} text-anchor="end" class="tag strong" fill={r.without ? 'var(--gen)' : 'var(--muted)'}>{r.without ? '✓' : '✗'}</text>
          {/each}
          <text x="20" y="418" class="tag">{t('✓ still works · ✗ needs the language model.', '✓ 仍然有效 · ✗ 需要语言模型。')}</text>
          <text x="20" y="446" class="tag">{t('the master switch turns all four off', '总开关一关，四个都不走')}</text>
          <rect x="20" y="470" width="260" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="34" y="496" class="rowlabel">{t('the recording → history', '录音 → 历史')}</text>
          <text x="34" y="526" class="tag strong">{t('kept for how long?', '留多久？')}</text>
        {:else}
          <text x="624" y="72" text-anchor="middle" class="detail">{t('model off', '模型关掉')}</text>
          {#each [
            { y: 82, name: t('speech hints', '语音提示'), without: true, note: t('from the term', '来自词条') },
            { y: 154, name: t('alias → term', '别名 → 词条'), without: true, note: t('before cleanup', '清理之前') },
            { y: 226, name: t('glossary', '术语表'), without: false, note: t('inside the prompt', '在提示里') },
            { y: 298, name: t('dictionary notes', '全词典备注'), without: false, note: t('inside the prompt', '在提示里') },
          ] as r}
            <rect x="20" y={r.y} width="510" height="58" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={r.y + 24} class="tag strong">{r.name}</text>
            <text x="34" y={r.y + 45} class="detail">{r.note}</text>
            <rect x="548" y={r.y} width="152" height="58" rx="8" fill={r.without ? 'var(--gen-soft)' : 'var(--faint)'} stroke={r.without ? 'var(--gen)' : 'var(--line)'} />
            <text x="624" y={r.y + 36} text-anchor="middle" class="tag strong" fill={r.without ? 'var(--gen)' : 'var(--muted)'}>{r.without ? '✓' : '✗'}</text>
          {/each}
          <text x="20" y="390" class="tag">{t('Hints and alias replacement run outside the language model, so they survive its failure.', '提示和别名替换在语言模型之外运行，所以模型失败也还在。')}</text>
          <text x="20" y="414" class="tag">{t('The master dictionary switch turns all four off.', '词典总开关一关，四个都不走。')}</text>
          <rect x="20" y="436" width="680" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="34" y="462" class="rowlabel">{t('the recording → history', '录音 → 历史')}</text>
          <text x="34" y="492" class="tag strong">{t('kept for how long?', '留多久？')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('recording → history: next chapter', '录音 → 历史：下一章') : t('The recording and its history are next. Source: session/cleanup.go spoken()', '接下来看录音和历史。出处：session/cleanup.go spoken()')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
