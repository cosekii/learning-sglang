<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_DICT_TERM, VOXT_DICT_ALIAS, VOXT_DICT_SECOND_TERM, VOXT_DICT_TERM_COUNT,
    VOXT_DICT_HINT_COUNT, VOXT_DICT_GLOSSARY_ALL_UP_TO, VOXT_DICT_GLOSSARY_MAX_TERMS, VOXT_DICT_GLOSSARY_MAX_CHARS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Recognition wrote Preeya. You meant Priya; one dictionary row pairs them.',
    captionZh: '识别写成了 Preeya。你要的是 Priya，词典里一行把两者配起来。',
  }, {
    caption: 'One row has a term, aliases and a note. They go to four different places.',
    captionZh: '一行里有词条、别名和备注。它们分别去四个地方。',
  }, {
    caption: 'Only the enabled term goes to the speech model as a hint. An alias stays out.',
    captionZh: '发给语音模型的提示只含启用的词条。别名不进去。',
  }, {
    caption: 'Aliases become the term before cleanup. This works without the language model.',
    captionZh: '别名在清理之前就换成词条。没有语言模型也照样换。',
  }, {
    caption: 'The language model gets the term and how it is heard. This needs the model.',
    captionZh: '语言模型收到词条和它可能被听成的样子。这一步需要模型。',
  }, {
    caption: 'Your note is free text for the language model. It never reaches the recognizer.',
    captionZh: '备注是写给语言模型的自由文字。它不会到识别器那里。',
  }, {
    caption: 'Hints and alias replacement work without the model; the glossary and note do not. How long does Voxt keep the recording?',
    captionZh: '提示和别名替换不需要模型；术语表和备注需要。Voxt 把录音留多久？',
  }];
  const ariaLabels = [{
    en: 'One spoken sentence goes through the speech model and comes out as call Preeya, the wrong name. You meant call Priya. A dictionary row fixes this once: a term with its aliases, and an optional note.',
    zh: '一句话经过语音模型，出来是 call Preeya，名字错了。你要的是 call Priya。词典里一行就能一次修好：一个词条、它的别名，和可选的备注。',
  }, {
    en: 'One dictionary row has three parts. The term is the spelling you want. Aliases are what recognition tends to write instead. The note is free text you write once. The four destinations are the speech model (a hint list from the term), the transcript (alias replacement), the language model glossary (term and aliases), and the language model prompt (the note).',
    zh: '一行词典有三部分。词条是你想要的写法。别名是识别常写成的样子。备注是你写一次的自由文字。四个去处是：语音模型（来自词条的提示表）、文字稿（替换别名）、语言模型术语表（词条和别名）、语言模型提示（备注）。',
  }, {
    en: 'The enabled terms alone are sent to the speech model as hints, the most recently changed first. The alias is not sent, because it is exactly what recognition gets wrong. The dictionary settings must have both the dictionary and the speech hints on.',
    zh: '只有启用的词条会作为提示发给语音模型，最近改过的排前面。别名不发，因为别名正是识别会写错的样子。词典设置里要同时打开词典和语音提示。',
  }, {
    en: 'After recognition, enabled aliases are replaced by their term in the text, before any language-model cleanup. Latin aliases match whole words ignoring case; Chinese, Japanese and Korean aliases match anywhere; the longest match wins. A term already written correctly is left alone, so this works with the language model off or failing.',
    zh: '识别之后、语言模型清理之前，启用的别名会在文字里换回词条。拉丁别名按整词匹配、不分大小写；中日韩别名可以在任意位置匹配；最长的那次胜出。已经写对的词条保持原样，所以语言模型关掉或失败时这一步照样有效。',
  }, {
    en: 'The same enabled terms and aliases go to the language model as a glossary line such as Priya, heard as Preeya. A dictionary of up to 30 terms goes in whole. A larger one sends only the terms the text mentions, capped at 60 lines and 2000 characters. This needs the language model; the glossary switch must be on.',
    zh: '同一批启用的词条和别名会作为术语表一行交给语言模型，例如 Priya 可能被听成 Preeya。词典不超过 30 个词条就整份放进去。更大的词典只发文字里提到的词条，最多 60 行、2000 字符。这一步需要语言模型；术语表开关要打开。',
  }, {
    en: 'The note is free text you write once. It goes into the language model system prompt as its own layer, before this request input, and never to the speech model or the transcript. The notes-off switch keeps it out of the prompt even when the dictionary is on.',
    zh: '备注是你写一次的一段文字。它作为单独一层进入语言模型的 system 提示，排在这次请求的输入之前，从不去语音模型或文字稿。即使词典开着，关掉备注的开关也能让它不进提示。',
  }, {
    en: 'With the language model off or failing, the speech hints and the alias replacement still work. The glossary and the note do not, because both ride in the language-model prompt. The next chapter asks how long Voxt keeps the recording and its history.',
    zh: '语言模型关掉或失败时，语音提示和别名替换仍然有效。术语表和备注不行，因为两者都搭在语言模型的提示里。下一章看 Voxt 把录音和历史留多久。',
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
  const H = $derived((phone ? [640, 720, 640, 700, 660, 620, 620] : [470, 520, 430, 450, 470, 430, 480])[step]);
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
          <text x="34" y="108" class="tag">“send it to Preeya”</text>
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
          <text x="34" y="120" class="tag">“send it to Preeya”</text>
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
        <text x="20" y="22" class="tag strong">{t('ONE ROW · FOUR DESTINATIONS', '一行 · 四个去处')}</text>
        <text x="20" y="46" class="tag">{t('its three parts travel, but not together.', '三个部分都出发，但不一起走。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="132" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('term', '词条')} <tspan class="mono" fill="var(--accent)">{VOXT_DICT_TERM}</tspan></text>
          <text x="34" y="116" class="rowlabel">{t('alias', '别名')} <tspan class="mono" fill="var(--gen)">{VOXT_DICT_ALIAS}</tspan></text>
          <text x="34" y="146" class="rowlabel">{t('note', '备注')} <tspan class="detail">{t('free text', '自由文字')}</tspan></text>
          <text x="34" y="176" class="detail">{t('the row you typed once', '你写一次的那行')}</text>
          <path d="M150 194 V214" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          {#each [
            { y: 222, name: t('1 · SPEECH MODEL', '1 · 语音模型'), part: t('term → hint', '词条 → 提示'), note: t('needs dictionary + speech hints', '需要词典 + 语音提示') },
            { y: 320, name: t('2 · TRANSCRIPT', '2 · 文字稿'), part: t('alias → term', '别名 → 词条'), note: t('needs dictionary', '需要词典') },
            { y: 418, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + alias', '词条 + 别名'), note: t('needs dictionary + glossary', '需要词典 + 术语表') },
            { y: 516, name: t('4 · LANGUAGE MODEL · note', '4 · 语言模型 · 备注'), part: t('note', '备注'), note: t('needs dictionary, notes not off', '需要词典，备注未关') },
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
          <text x="34" y="260" class="tag strong">{t('note', '备注')}</text>
          <text x="34" y="282" class="detail">{t('free text you write', '你写的自由文字')}</text>
          <text x="34" y="348" class="detail">{t('typed once, reused every dictation', '写一次，每次听写都用')}</text>
          {#each [
            { y: 66, name: t('1 · SPEECH MODEL · hints', '1 · 语音模型 · 提示'), part: t('term only', '只发词条'), note: t('dictionary + speech hints', '词典 + 语音提示') },
            { y: 156, name: t('2 · TRANSCRIPT · replace', '2 · 文字稿 · 替换'), part: t('alias → term', '别名 → 词条'), note: t('dictionary on', '词典开着') },
            { y: 246, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + aliases', '词条 + 别名'), note: t('dictionary + glossary', '词典 + 术语表') },
            { y: 336, name: t('4 · LANGUAGE MODEL · note', '4 · 语言模型 · 备注'), part: t('the note as written', '原样的备注'), note: t('dictionary on, notes not off', '词典开着，备注未关') },
          ] as d, i}
            <rect x="300" y={d.y} width="400" height="72" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="314" y={d.y + 26} class="tag strong">{d.name}</text>
            <text x="314" y={d.y + 50} class="detail">{d.part} · {d.note}</text>
            <line x1="244" y1={[146, 208, 222, 282][i]} x2="292" y2={d.y + 36} stroke="var(--muted)" stroke-width="1.5" marker-end="url(#dict-arrow)" />
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
          <text x="20" y="458" class="tag">{t('fewer slots: terms are cut from the end', '槽位更少：从末尾开始删')}</text>
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
          <text x="20" y="390" class="tag">{t('A service with room for fewer hints takes them from the end of the list.', '槽位更少的服务，从列表末尾开始取。')}</text>
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
        <text x="20" y="22" class="tag strong">{t('3 OF 4 · TERM + ALIASES → GLOSSARY', '第 3/4 个 · 词条 + 别名 → 术语表')}</text>
        <text x="20" y="46" class="tag">{t('A line in the language-model prompt.', '语言模型提示里的一行。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="196" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="86" class="rowlabel">{t('system prompt', 'system 提示')}</text>
          <text x="34" y="116" class="mono">{t('role · task · output', '角色 · 任务 · 输出')}</text>
          <rect x="34" y="132" width="232" height="76" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="156" class="detail">{t('glossary', '术语表')}</text>
          <text x="46" y="180" class="mono">- {VOXT_DICT_TERM}</text>
          <text x="46" y="198" class="detail">({t('heard as', '可能被听成')}: {VOXT_DICT_ALIAS})</text>
          <text x="34" y="236" class="detail">{t('the model reads it before the text', '模型先读它，再读文字')}</text>
          <text x="20" y="292" class="tag strong">{t('dictionary size decides', '词典大小决定发多少')}</text>
          <text x="20" y="318" class="tag">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} {t('terms → all sent', '个词条 → 全部发')}</text>
          <text x="20" y="342" class="tag">&gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} → {t('only terms the text mentions', '只发文字里提到的')}</text>
          <text x="20" y="366" class="tag">{t('cap', '上限')}: {VOXT_DICT_GLOSSARY_MAX_TERMS} {t('lines', '行')} / {VOXT_DICT_GLOSSARY_MAX_CHARS} {t('chars', '字符')}</text>
          <text x="20" y="404" class="tag strong" fill="var(--gen)">{t('needs the language model', '需要语言模型')}</text>
        {:else}
          <rect x="20" y="72" width="360" height="200" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="98" class="rowlabel">{t('system prompt', 'system 提示')}</text>
          <text x="34" y="126" class="detail">{t('role · task · output rules', '角色 · 任务 · 输出约定')}</text>
          <rect x="34" y="142" width="332" height="112" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="48" y="166" class="detail">{t('glossary layer', '术语表一层')}</text>
          <text x="48" y="194" class="mono">- {VOXT_DICT_TERM}</text>
          <text x="48" y="220" class="detail">({t('heard as', '可能被听成')}: {VOXT_DICT_ALIAS})</text>
          <text x="48" y="244" class="detail">{t('the model writes these terms as listed', '模型照这里列的写法输出')}</text>
          <path d="M380 170 H408" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="420" y="96" width="280" height="152" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="434" y="122" class="rowlabel">{t('user message', 'user 消息')}</text>
          <text x="434" y="150" class="tag">“send it to {VOXT_DICT_ALIAS}”</text>
          <text x="434" y="178" class="detail">{t('this request’s dictation', '这次请求的听写')}</text>
          <text x="434" y="212" class="detail">{t('system stays the same', 'system 保持不变')}</text>
          <text x="434" y="234" class="detail">{t('the prompt cache keeps it', 'prompt 缓存能留住它')}</text>
          <text x="20" y="312" class="tag strong">{t('A small dictionary goes in whole; a large one only sends the terms the text mentions.', '小词典整份放进去；大词典只发文字里提到的词条。')}</text>
          <text x="20" y="338" class="tag">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} {t('terms', '个词条')} → {t('all', '全部')} · &gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} → {t('mentioned only', '只发提到的')} · {VOXT_DICT_GLOSSARY_MAX_TERMS} {t('lines', '行')} / {VOXT_DICT_GLOSSARY_MAX_CHARS} {t('chars', '字符')}</text>
          <text x="20" y="372" class="tag strong" fill="var(--gen)">{t('needs the language model', '这一步需要语言模型')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('compose.Glossary · limits 30 / 60 / 2000', 'compose.Glossary · 上限 30 / 60 / 2000') : t('Source: compose.Glossary() · GlossaryAllUpTo 30 · 60 lines · 2000 chars', '出处：compose.Glossary() · GlossaryAllUpTo 30 · 60 行 · 2000 字符')}</text>

      {:else if step === 5}
        <text x="20" y="22" class="tag strong">{t('4 OF 4 · NOTE → MODEL PROMPT', '第 4/4 个 · 备注 → 模型提示')}</text>
        <text x="20" y="46" class="tag">{t('Free text, not a table.', '自由文字，不是表格。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="120" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('your note', '你的备注')}</text>
          <text x="34" y="112" class="detail">{t('free text you write once', '你写一次的一段文字')}</text>
          <text x="34" y="136" class="detail">{t('e.g. “Priya is on the design team;', '例如 “Priya 在设计团队；')}</text>
          <text x="34" y="158" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <path d="M150 182 V204" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="212" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="236" class="rowlabel">{t('system prompt · own layer', 'system 提示 · 单独一层')}</text>
          <text x="34" y="262" class="mono">{t('note → before input', '备注 → 输入之前')}</text>
          <text x="34" y="288" class="detail">{t('the same on every request', '每次请求都一样')}</text>
          <text x="20" y="340" class="tag strong">{t('never sent to', '从不发到')}</text>
          <text x="20" y="366" class="tag" fill="var(--gen)">✗ {t('speech model', '语音模型')}</text>
          <text x="20" y="390" class="tag" fill="var(--gen)">✗ {t('transcript replacement', '文字稿替换')}</text>
          <text x="20" y="428" class="tag">{t('notes-off keeps it out', '关掉备注就不进提示')}</text>
          <text x="20" y="452" class="tag">{t('even while the dictionary is on', '词典开着也一样')}</text>
        {:else}
          <rect x="20" y="72" width="240" height="140" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="98" class="rowlabel">{t('your note', '你的备注')}</text>
          <text x="34" y="126" class="detail">{t('free text you write once', '你写一次的一段文字')}</text>
          <text x="34" y="152" class="detail">{t('“Priya is on the design team;', '“Priya 在设计团队；')}</text>
          <text x="34" y="174" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <text x="34" y="198" class="detail">{t('any notes that help', '任何有用的说明都行')}</text>
          <path d="M260 142 H312" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="324" y="72" width="376" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="338" y="98" class="rowlabel">{t('system prompt · its own layer', 'system 提示 · 单独一层')}</text>
          <text x="338" y="128" class="detail">{t('role · task rules · dictionary · this request', '角色 · 任务规则 · 词典 · 本次请求')}</text>
          <text x="338" y="156" class="mono">{t('note sits before the input', '备注排在输入之前')}</text>
          <text x="338" y="186" class="detail">{t('the same on every request', '每次请求都一样')}</text>
          <rect x="20" y="240" width="680" height="90" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="266" class="tag strong" fill="var(--gen)">{t('never sent to', '从不发到')}</text>
          <text x="34" y="294" class="tag">✗ {t('speech model (hints come from the term)', '语音模型（提示只来自词条）')}</text>
          <text x="34" y="318" class="tag">✗ {t('the transcript (replacement reads aliases)', '文字稿（替换只读别名）')}</text>
          <text x="20" y="368" class="tag">{t('Notes-off keeps the note out of the prompt even while the dictionary is on.', '即使词典开着，关掉备注也能让它不进提示。')}</text>
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
            { y: 320, name: t('note', '备注'), without: false, note: t('inside the prompt', '在提示里') },
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
            { y: 298, name: t('note', '备注'), without: false, note: t('inside the prompt', '在提示里') },
          ] as r}
            <rect x="20" y={r.y} width="510" height="58" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={r.y + 24} class="tag strong">{r.name}</text>
            <text x="34" y={r.y + 45} class="detail">{r.note}</text>
            <rect x="548" y={r.y} width="152" height="58" rx="8" fill={r.without ? 'var(--gen-soft)' : 'var(--faint)'} stroke={r.without ? 'var(--gen)' : 'var(--line)'} />
            <text x="624" y={r.y + 36} text-anchor="middle" class="tag strong" fill={r.without ? 'var(--gen)' : 'var(--muted)'}>{r.without ? '✓' : '✗'}</text>
          {/each}
          <text x="20" y="390" class="tag">{t('Hints and alias replacement run outside the language model, so they survive its failure.', '提示和别名替换在语言模型之外运行，所以模型失败也还在。')}</text>
          <text x="20" y="414" class="tag">{t('The master dictionary switch turns all four off.', '词典总开关一关，四个都不走。')}</text>
          <rect x="20" y="436" width="680" height="0" />
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('recording → history: next chapter', '录音 → 历史：下一章') : t('The recording and its history are next. Source: session/cleanup.go spoken()', '接下来看录音和历史。出处：session/cleanup.go spoken()')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
