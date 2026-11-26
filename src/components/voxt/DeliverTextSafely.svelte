<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_DELIVER_VERIFY_MS, VOXT_RESTORE_AFTER_INSERT_MS, VOXT_RESTORE_DEFAULT_MS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'You press the shortcut in one app, then switch. The text goes where the focus is now, not back to the start app.',
    captionZh: '你在一个 app 按快捷键，之后可能切走。文字去此刻的焦点，不回按快捷键的那个 app。',
  }, {
    caption: 'First check: is the focused field a password field? If it is, nothing is typed.',
    captionZh: '先检查焦点是不是密码框。是的话，一个字都不贴。',
  }, {
    caption: 'Next check: can that focused element take text? If not, the answer goes to the card.',
    captionZh: '再检查焦点能不能收文字。不能就退回答案卡。',
  }, {
    caption: 'After pasting, read the field again. If it did not change, the text did not land.',
    captionZh: '贴完再读一次焦点。没变化，就说明没贴进去。',
  }, {
    caption: 'Save the old clipboard and put it back after the paste. A reader may still need what was there.',
    captionZh: '贴之前记住剪贴板，贴完把原来的放回去。里面可能有读者还要用的东西。',
  }];
  const ariaLabels = [{
    en: 'Two windows: the start app where the shortcut was pressed, and the front app now. The prepared text travels to the front app, because the focused element there is where typing would go.',
    zh: '两个窗口：按快捷键时的 start app，和此刻在前面的 front app。准备好的文字去 front app，因为那里有焦点的元素才是打字会去的地方。',
  }, {
    en: 'The front app has a focused password field, marked AXSecureTextField. A password field stops the delivery, so nothing is pasted and the answer card is shown instead.',
    zh: 'front app 里有一个获得焦点的密码框，标记是 AXSecureTextField。密码框会挡住投递，什么也不贴，改为显示答案卡。',
  }, {
    en: 'Three ways to decide whether the focused element takes text. In the start app, an unknown element gets the benefit of the doubt. In another app, it must say it is editable. A selection or Voxt own window needs an editable element. A button or a list never takes text, so the answer goes to the card.',
    zh: '三种判断焦点能不能收文字。在 start app 里，读不出的元素按可以收处理。在别的 app 里，元素必须说自己是可编辑的。要替换选中的文字，或在 Voxt 自己的窗口里，元素必须可编辑。按钮或列表从不收文字，答案就去卡片。',
  }, {
    en: 'The paste is checked. The helper reads the focused element before Command-V and after it. If the value length, value digest, selection or text marker changed, the text landed. If everything reads the same, the text did not land; the clipboard keeps it and the card opens. The check waits up to one thousand milliseconds.',
    zh: '贴完要核对。helper 在 Command-V 之前和之后各读一次焦点。值的长度、值的摘要、选区或文本标记有任何变化，就算贴进去了。全都一样，就没贴进去；剪贴板留着文字，卡片打开。核对最多等一千毫秒。',
  }, {
    en: 'The clipboard is snapshotted before Command-V and the prepared text is written over it. After a confirmed paste the old clipboard returns after one hundred fifty milliseconds; when the result is unknown it returns after the default five hundred. If another program wrote to the clipboard meanwhile, Voxt does not put the old one back. The fallback card offers Insert and Copy and keeps the text on the clipboard.',
    zh: 'Command-V 之前先给剪贴板拍快照，再写入准备好的文字。确认贴进去后，一百五十毫秒把原来的剪贴板放回；结果不确定时按默认五百毫秒放回。如果这中间别的程序写了剪贴板，Voxt 不会用旧的覆盖它。退回的卡片提供 Insert 和 Copy，文字留在剪贴板上。',
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
  const H = $derived((phone ? [560, 560, 640, 640, 660] : [440, 440, 500, 500, 500])[step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="deliver-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="deliver-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('start app ≠ front app', 'start app ≠ front app')}</text>
        <text x="20" y="46" class="tag">{t('start app: the app in front when you pressed the shortcut.', 'start app：按快捷键那一刻在前面的 app。')}</text>
        <text x="20" y="68" class="tag">{t('front app now: the app in front when the text is ready.', 'front app now：文字准备好那一刻在前面的 app。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 260} height="140" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">start app</text>
        <rect x="34" y="136" width={phone ? 232 : 232} height="52" rx="7" fill="var(--faint)" />
        <text x="42" y="166" class="tag">{t('you press the shortcut here', '你在这里按快捷键')}</text>
        <rect x={phone ? 20 : 400} y={phone ? 300 : 96} width={phone ? 260 : 280} height="140" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 34 : 414} y={phone ? 326 : 122} class="rowlabel">front app</text>
        <rect x={phone ? 34 : 414} y={phone ? 340 : 136} width={phone ? 232 : 252} height="52" rx="7" fill="white" stroke="var(--accent)" />
        <text x={phone ? 42 : 422} y={phone ? 370 : 166} class="tag strong">{t('text lands in this focused field', '文字贴进这个有焦点的框')}</text>
        {#if phone}
          <path d="M150 250 V292" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="160" y="276" class="tag">{t('you switch', '你切了 app')}</text>
        {:else}
          <path d="M296 166 H392" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <text x="300" y="158" class="tag">{t('you switch', '你切了 app')}</text>
        {/if}
        <text x="20" y={phone ? 480 : 300} class="tag strong">{t('The start app is remembered, but it is not the destination.', 'start app 会被记住，但它不是目的地。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: Voxt/internal/deliver/deliver.go, package comment', '出处：Voxt/internal/deliver/deliver.go 包注释')}</text>
      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('gate 1 · password field', '第一道门 · 密码框')}</text>
        <text x="20" y="46" class="tag">{t('Read the focused field before typing anything.', '动键盘之前，先读焦点是什么。')}</text>
        <rect x="20" y="96" width={W - 40} height="150" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">front app · {t('focused field', '有焦点的框')}</text>
        <rect x="34" y="136" width={phone ? 232 : 300} height="52" rx="7" fill="white" stroke="var(--gen)" stroke-width="2" />
        <text x="44" y="167" class="mono strong">••••••••</text>
        <text x={phone ? 34 : 360} y={phone ? 166 : 167} class="tag strong" fill="var(--gen)">AXSecureTextField</text>
        <text x="34" y="216" class="tag">{phone ? t('Password field: keys may be blocked.', '密码框：按键可能被挡住。') : t('A password field: the system may hold posted keys back.', '密码框：系统可能挡住投递的按键。')}</text>
        <rect x="20" y={phone ? 290 : 280} width={W - 40} height={phone ? 150 : 88} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="34" y={phone ? 318 : 308} class="tag strong">{t('STOP · nothing is typed', '停下 · 一个字也不贴')}</text>
        <text x="34" y={phone ? 346 : 332} class="tag">{t('The card opens instead.', '改为打开答案卡。')}</text>
        <text x={W / 2} y={phone ? 500 : 408} text-anchor="middle" class="tag strong">{t('Reason: secure', '原因：secure')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go · secure field check', 'deliver.go · 密码框检查') : t('Source: deliver.go · Secure(); f.Subrole == AXSecureTextField', '出处：deliver.go · Secure()；f.Subrole == AXSecureTextField')}</text>
      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('gate 2 · can the focus take text?', '第二道门 · 焦点能收文字吗？')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Rule 1: start app: unknown counts as writable.', '规则 1：start app 读不出也算能写。') : t('Rule 1: in the start app, an unknown element counts as writable.', '规则 1：在 start app 里，读不出的元素按能写处理。')}</text>
        <text x="20" y="68" class="tag">{t('Rule 2: in another app, the element must say it is editable.', '规则 2：在别的 app 里，元素必须说自己是可编辑的。')}</text>
        {#each [
          { y: 104, title: t('same as start app', '和 start app 一样'), sub: t('unknown → benefit of the doubt', '读不出 → 按能写处理'), tag: 'Writable' },
          { y: 186, title: t('another app', '另一个 app'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
          { y: 268, title: t('replace a selection, or Voxt window', '替换选区，或 Voxt 自己窗口'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
        ] as rule}
          <rect x="20" y={rule.y} width={phone ? 260 : 680} height={phone ? 66 : 60} rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y={rule.y + 24} class="tag strong">{rule.title}</text>
          <text x="34" y={rule.y + 46} class="tag">{rule.sub}</text>
          {#if !phone}
            <text x="620" y={rule.y + 37} text-anchor="end" class="mono">{rule.tag}</text>
          {/if}
        {/each}
        <text x="20" y={phone ? 400 : 360} class="tag">{t('Not text: button, list, table, a web page being read.', '不算能写：按钮、列表、表格、正在阅读的网页。')}</text>
        <text x={W / 2} y={phone ? 480 : 404} text-anchor="middle" class="tag strong">{phone ? t('No → the card opens', '不能 → 打开答案卡') : t('If it cannot take text, the answer goes to the card.', '不能收文字时，答案去卡片。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: deliver.go · Writable(), check()', '出处：deliver.go · Writable()、check()')}</text>
      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('after ⌘V · read the field again', '贴完 ⌘V · 再读一次焦点')}</text>
        <text x="20" y="46" class="tag">{t('The helper reads the element before and after the paste.', 'helper 在贴之前和贴之后各读一次这个元素。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 220} height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">{t('before', '贴之前')}</text>
        <text x="34" y="150" class="mono">{t('length, digest,', '长度、摘要、')}</text>
        <text x="34" y="172" class="mono">{t('selection, marker', '选区、标记')}</text>
        <rect x={phone ? 20 : 270} y={phone ? 260 : 96} width={phone ? 260 : 220} height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x={phone ? 34 : 284} y={phone ? 286 : 122} class="rowlabel">{t('after', '贴之后')}</text>
        <text x={phone ? 34 : 284} y={phone ? 314 : 150} class="mono">{t('length, digest,', '长度、摘要、')}</text>
        <text x={phone ? 34 : 284} y={phone ? 336 : 172} class="mono">{t('selection, marker', '选区、标记')}</text>
        {#if phone}
          <path d="M150 224 V252" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="160" y="242" class="tag">⌘V</text>
        {:else}
          <path d="M240 156 H262" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="244" y="148" class="tag">⌘V</text>
        {/if}
        <rect x={phone ? 20 : 520} y={phone ? 420 : 96} width={phone ? 260 : 180} height={phone ? 96 : 120} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 34 : 534} y={phone ? 448 : 122} class="rowlabel">{t('compare', '比较')}</text>
        <text x={phone ? 34 : 534} y={phone ? 476 : 150} class="tag strong">{t('changed → inserted', '变了 → 贴进去')}</text>
        <text x={phone ? 34 : 534} y={phone ? 498 : 174} class="tag">{t('same → unconfirmed', '一样 → 没确认')}</text>
        <text x={W / 2} y={phone ? 560 : 320} text-anchor="middle" class="mono">{t('check waits up to', '最多等')} {VOXT_DELIVER_VERIFY_MS} ms</text>
        <text x={W / 2} y={phone ? 590 : 356} text-anchor="middle" class="tag strong">{t('Same reading: keep the text on the clipboard, open the card.', '一样：文字留在剪贴板，打开卡片。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go DefaultVerifyMS · PasteCheck.compare', 'deliver.go DefaultVerifyMS · PasteCheck.compare') : t('Source: deliver.go DefaultVerifyMS = 1000 · PasteCheck.compare compares length, digest, selection, marker', '出处：deliver.go DefaultVerifyMS = 1000 · PasteCheck.compare 比较长度、摘要、选区、标记')}</text>
      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('clipboard · snapshot, then put it back', '剪贴板 · 先记住，再放回')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Blue: old clipboard · orange: text', '蓝：旧剪贴板 · 橙：文字') : t('Blue: the old clipboard · orange: the prepared text on it for a moment.', '蓝色：原来的剪贴板 · 橙色：文字短暂占用它。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 210} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="34" y="122" class="rowlabel">{t('snapshot', '快照')}</text>
        <text x="34" y="150" class="tag strong">{t('old clipboard kept', '记住旧剪贴板')}</text>
        <rect x={phone ? 20 : 270} y={phone ? 210 : 96} width={phone ? 260 : 210} height="84" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={phone ? 34 : 284} y={phone ? 236 : 122} class="rowlabel">{t('paste', '贴')}</text>
        <text x={phone ? 34 : 284} y={phone ? 264 : 150} class="tag strong">{t('text on clipboard', '文字占剪贴板')}</text>
        <rect x={phone ? 20 : 520} y={phone ? 324 : 96} width={phone ? 260 : 180} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 34 : 534} y={phone ? 350 : 122} class="rowlabel">{t('restore', '放回')}</text>
        <text x={phone ? 34 : 534} y={phone ? 378 : 150} class="tag strong">{t('old clipboard back', '旧剪贴板回来')}</text>
        {#if phone}
          <path d="M150 188 V202" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <path d="M150 302 V316" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
        {:else}
          <path d="M240 138 H262" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <path d="M490 138 H512" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
        {/if}
        <text x={phone ? 20 : 20} y={phone ? 452 : 226} class="mono">{t('inserted:', '贴进去：')} {VOXT_RESTORE_AFTER_INSERT_MS} ms · {t('unknown:', '不确定：')} {VOXT_RESTORE_DEFAULT_MS} ms</text>
        <text x="20" y={phone ? 478 : 252} class="tag">{t('If another app wrote meanwhile, skip the restore.', '这中间别的 app 写过了，就不覆盖。')}</text>
        <text x={W / 2} y={phone ? 540 : 320} text-anchor="middle" class="tag strong">{phone ? t('No paste: card offers Insert and Copy.', '没贴进去：卡片给 Insert 和 Copy。') : t('No paste: the card offers Insert and Copy; the text stays on the clipboard.', '没贴进去：卡片提供 Insert 和 Copy，文字留在剪贴板。')}</text>
        <text x={W / 2} y={phone ? 580 : 380} text-anchor="middle" class="tag strong" fill="var(--accent)">{t('Next: names and terms used as references.', '下一章：人名和术语作为参考。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('helper TextIO.swift · next: dictionary', 'helper TextIO.swift · 下一章：词典') : t('Source: helper TextIO.swift · restore 150 ms after a confirmed paste, else 500 ms', '出处：helper TextIO.swift · 确认贴入后 150 ms 放回，否则 500 ms')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
