<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    REQUEST_BINDING_PROCESS_NAME,
    REQUEST_BINDING_REQUEST_IDS,
    REQUEST_BINDING_ASSIGNMENTS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Two copies take turns: A and C use copy 0, and B uses copy 1. A\'s work is in copy 0, so its saved binding sends it there again.',
    captionZh: '两个副本轮流接：A、C 去第 0 份，B 去第 1 份。A 的记录在第 0 份；下次照绑定，仍去那里。',
  }, {
    caption: 'Finishing A removes its work record, but its result-wait record stays. Collecting the result clears that record and frees A\'s name.',
    captionZh: 'A 做完后，工作记录删掉，等结果的记录还在。结果取走后，这张记录也删掉，名字 A 才能给新请求用。',
  }, {
    caption: 'Both copies remember A, so late old work cannot be mistaken for a new A. Use a fresh id.',
    captionZh: '两份都记着 A，旧活晚到也不会算给新 A。要换新 id。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 940 : step === 1 ? 720 : 900) : (step === 0 ? 560 : step === 1 ? 450 : 500));
  const panels = $derived(REQUEST_BINDING_REQUEST_IDS.map((id, i) => phone
    ? { id, copy: REQUEST_BINDING_ASSIGNMENTS[i], x: 15, y: 85 + i * 175, w: 270, h: 160 }
    : { id, copy: REQUEST_BINDING_ASSIGNMENTS[i], x: 20 + i * 235, y: 85, w: 215, h: 260 }));
  const laterPanels = $derived(phone
    ? [{ x: 15, y: 640, w: 270, copy: 0 }, { x: 15, y: 765, w: 270, copy: 1 }]
    : [{ x: 20, y: 395, w: 325, copy: 0 }, { x: 375, y: 395, w: 325, copy: 1 }]);
  const arrival = (i: number) => t(`${i + 1}${['st', 'nd', 'rd'][i]} ARRIVAL`, `第 ${i + 1} 个到达`);
  const releaseId = REQUEST_BINDING_REQUEST_IDS[0];
  const releasePanels = $derived([
    { title: t('1 · WORKING', '1 · 正在算'), work: releaseId, waiting: releaseId, status: t(`name ${releaseId}: taken`, `名字 ${releaseId}：被占用`) },
    { title: t('2 · RESULT READY', '2 · 结果已出'), work: '—', waiting: releaseId, status: t(`name ${releaseId}: still taken`, `名字 ${releaseId}：仍被占用`) },
    { title: t('3 · RESULT COLLECTED', '3 · 结果取走'), work: '—', waiting: '—', status: t(`name ${releaseId}: free`, `名字 ${releaseId}：可以给新请求用`) },
  ].map((panel, i) => phone
    ? { ...panel, x: 15, y: 100 + i * 190, w: 270, h: 165 }
    : { ...panel, x: 20 + i * 240, y: 110, w: 200, h: 230 }));
  const abortPanels = $derived([
    { title: t('1 · WORKING', '1 · 正在算'), work: releaseId, copy0: '—', copy1: '—', note: t('A’s work is in copy 0', 'A 的记录在第 0 份'), status: t('A is running', 'A 正在算') },
    { title: t('2 · AFTER BOTH HANDLE', '2 · 两份处理后'), work: '—', copy0: releaseId, copy1: releaseId, note: t('stop message → both copies', '停止消息 → 两个副本'), status: t('both block old/new mixups', '两份都不让旧活算给新 A') },
    { title: t('3 · SAME ID AGAIN', '3 · 同名再用'), work: '—', copy0: releaseId, copy1: releaseId, note: t('A rejected · D passes name check', 'A 被拒 · D 通过名字检查'), status: t('use a fresh id', '要换新 id') },
  ].map((panel, i) => phone
    ? { ...panel, x: 15, y: 100 + i * 250, w: 270, h: 220 }
    : { ...panel, x: 20 + i * 240, y: 100, w: 200, h: 310 }));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? t('Requests A, B and C arrive in order. The two talker_ar copies take turns: A and C bind to copy 0, B binds to copy 1. A has work in copy 0. Following its saved binding finds that work; switching to copy 1 would not.', '请求 A、B、C 依次到达。两个 talker_ar 副本轮流接收：A、C 绑定第 0 份，B 绑定第 1 份。A 的计算记录在第 0 份。照绑定去第 0 份能找到记录，改去第 1 份则没有。') : step === 1 ? t('Request A has a work record and a result-wait record. Finishing removes only the work record, so the name A stays taken. Collecting the result clears the remaining record and frees the name.', '请求 A 有工作记录和等结果的记录。做完只删工作记录，名字 A 仍被占用。结果取走后，剩下的记录也清空，这个名字才能给新请求用。') : t('After both copies handle A’s abort, its work record clears and both keep an abort marker. This prevents late old work from being confused with a new A. A is rejected; D passes the name check.', '两个副本处理 A 的取消后，工作记录清空，两份都留着取消标记，旧活晚到也不会算给新 A。A 被拒绝，D 通过名字检查。')}>
      {#if step === 0}
      <defs>
        <marker id="binding-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={phone ? 5 : 20} y="20" class="pt">·</text>
      <text x={phone ? 15 : 30} y="20" class="tag strong">binding = {t('the copy choice saved for one request', '一个请求记住的副本选择')}</text>
      <text x={phone ? 5 : 20} y="42" class="pt">·</text>
      <text x={phone ? 15 : 30} y="42" class="tag">{t('An arrow shows which copy receives the request.', '箭头表示请求去了哪一份。')}</text>
      <text x={phone ? 5 : 20} y="64" class="pt">·</text>
      <text x={phone ? 15 : 30} y="64" class="tag">{t('The counter starts at 0; the two copies take turns.', '计数从 0 开始，两个副本轮流接。')}</text>

      {#each panels as panel, i}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 15} y={panel.y + 22} class="rowlabel">{arrival(i)}</text>
        {#if phone}
          <rect x={panel.x + 15} y={panel.y + 37} width="78" height="42" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 54} y={panel.y + 62} text-anchor="middle" class="legend strong">{t('request', '请求')} {panel.id}</text>
          <line x1={panel.x + 96} y1={panel.y + 58} x2={panel.x + 151} y2={panel.y + 58} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
          <text x={panel.x + 124} y={panel.y + 45} text-anchor="middle" class="tag">{t('goes to', '分到')}</text>
          <rect x={panel.x + 158} y={panel.y + 32} width="97" height="54" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 206} y={panel.y + 53} text-anchor="middle" class="mono strong">{REQUEST_BINDING_PROCESS_NAME}</text>
          <text x={panel.x + 206} y={panel.y + 73} text-anchor="middle" class="tag strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
          <rect x={panel.x + 15} y={panel.y + 103} width="240" height="40" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 135} y={panel.y + 128} text-anchor="middle" class="legend strong">{panel.id} → {REQUEST_BINDING_PROCESS_NAME}: {panel.copy} · {t('saved', '已记住')}</text>
        {:else}
          <rect x={panel.x + 57} y={panel.y + 40} width="100" height="40" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 65} text-anchor="middle" class="legend strong">{t('request', '请求')} {panel.id}</text>
          <line x1={panel.x + 107} y1={panel.y + 84} x2={panel.x + 107} y2={panel.y + 119} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
          <text x={panel.x + 120} y={panel.y + 105} class="tag">{t('goes to', '分到')}</text>
          <rect x={panel.x + 35} y={panel.y + 128} width="145" height="55" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 150} text-anchor="middle" class="mono strong">{REQUEST_BINDING_PROCESS_NAME}</text>
          <text x={panel.x + 107} y={panel.y + 172} text-anchor="middle" class="tag strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
          <rect x={panel.x + 20} y={panel.y + 202} width="175" height="42" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 220} text-anchor="middle" class="tag">{t('binding saved', '记住绑定')}</text>
          <text x={panel.x + 107} y={panel.y + 237} text-anchor="middle" class="mono strong">{panel.id} → {REQUEST_BINDING_PROCESS_NAME}: {panel.copy}</text>
        {/if}
      {/each}

      <text x={phone ? 15 : 30} y={phone ? 620 : 375} class="rowlabel">{t('REQUEST A SENDS AGAIN · ITS WORK IS IN COPY 0', '请求 A 再发消息 · 算到一半的记录在第 0 份')}</text>
      {#each laterPanels as panel}
        {@const saved = panel.copy === REQUEST_BINDING_ASSIGNMENTS[0]}
        <rect x={panel.x} y={panel.y} width={panel.w} height="110" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 15} y={panel.y + 22} class="rowlabel">{saved ? t('USE SAVED BINDING', '照记住的绑定') : t('IF IT SWITCHED', '假如改去另一份')}</text>
        <rect x={panel.x + 15} y={panel.y + 38} width={phone ? 55 : 70} height="52" rx="8" fill="white" stroke="var(--line)" />
        <text x={panel.x + (phone ? 42 : 50)} y={panel.y + 69} text-anchor="middle" class="legend strong">A</text>
        <line x1={panel.x + (phone ? 73 : 90)} y1={panel.y + 64} x2={panel.x + (phone ? 101 : 121)} y2={panel.y + 64} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
        <rect x={panel.x + (phone ? 110 : 130)} y={panel.y + 38} width={phone ? 145 : 180} height="52" rx="8" fill="white" stroke="var(--line)" />
        <text x={panel.x + (phone ? 182 : 220)} y={panel.y + 58} text-anchor="middle" class="legend strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
        <text x={panel.x + (phone ? 182 : 220)} y={panel.y + 79} text-anchor="middle" class="tag strong">{saved ? t('A\'s record is here', '有 A 的记录') : t('no record for A', '没有 A 的记录')}</text>
      {/each}
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('This step covers binding, not completion or abort.', '本步只讲绑定，不讲完成或取消。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: when can another request use the name A?', '下一步：名字 A 什么时候能给新请求用？')}</text>
      {:else if step === 1}
      <defs>
        <marker id="release-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={phone ? 15 : 30} y="20" class="tag strong">request id = {t(`the request's name; ${releaseId} in this example`, `请求的名字；本例叫 ${releaseId}`)}</text>
      <text x={phone ? 15 : 30} y="48" class="tag">{t('Each row is a record under A’s name. — means cleared.', '每一行都是以 A 的名字登记的一条记录；— 表示已清空。')}</text>

      {#each releasePanels as panel, i}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <rect x={panel.x + 12} y={panel.y + (phone ? 40 : 62)} width={panel.w - 24} height={phone ? 38 : 48} rx="7" fill="white" stroke={panel.work === '—' ? 'var(--line)' : 'var(--accent)'} stroke-dasharray={panel.work === '—' ? '4 3' : '0'} />
        <text x={panel.x + 22} y={panel.y + (phone ? 64 : 91)} class="tag">{t('work record', '工作记录')}</text>
        <text x={panel.x + panel.w - 22} y={panel.y + (phone ? 64 : 91)} text-anchor="end" class="legend strong">{panel.work}</text>
        <rect x={panel.x + 12} y={panel.y + (phone ? 84 : 122)} width={panel.w - 24} height={phone ? 38 : 48} rx="7" fill="white" stroke={panel.waiting === '—' ? 'var(--line)' : 'var(--accent)'} stroke-dasharray={panel.waiting === '—' ? '4 3' : '0'} />
        <text x={panel.x + 22} y={panel.y + (phone ? 108 : 151)} class="tag">{t('result-wait record', '等结果记录')}</text>
        <text x={panel.x + panel.w - 22} y={panel.y + (phone ? 108 : 151)} text-anchor="end" class="legend strong">{panel.waiting}</text>
        <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 146 : 204)} text-anchor="middle" class="legend strong">{panel.status}</text>
        {#if i < releasePanels.length - 1}
          <line x1={phone ? panel.x + panel.w / 2 : panel.x + panel.w + 7} y1={phone ? panel.y + panel.h + 5 : panel.y + 115} x2={phone ? panel.x + panel.w / 2 : panel.x + panel.w + 33} y2={phone ? panel.y + panel.h + 20 : panel.y + 115} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#release-arrow)" />
        {/if}
      {/each}
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Normal completion only; memory cleanup is not drawn.', '只讲正常做完；不画显存清理。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: what changes if A is cancelled?', '下一步：如果 A 没做完就被取消，会怎样？')}</text>
      {:else}
      <defs>
        <marker id="abort-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={phone ? 5 : 20} y="20" class="pt">·</text>
      <text x={phone ? 15 : 30} y="20" class="tag strong">abort marker = {t('a stage’s record that this id was cancelled', 'stage 记下这个名字已取消')}</text>
      <text x={phone ? 5 : 20} y="48" class="pt">·</text>
      <text x={phone ? 15 : 30} y="48" class="tag">{t('Blue border = record remains.', '蓝框 = 记录还在。')}</text>
      <text x={phone ? 15 : 30} y="70" class="tag">{t('— = no record now: not created yet, or cleared.', '— = 现在没记录：还没建立，或已经清掉。')}</text>

      {#each abortPanels as panel, i}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 14} y={panel.y + 25} class="rowlabel">{panel.title}</text>
        <rect x={panel.x + 12} y={panel.y + (phone ? 38 : 55)} width={panel.w - 24} height={phone ? 34 : 42} rx="7" fill="white" stroke={panel.work === '—' ? 'var(--line)' : 'var(--accent)'} stroke-dasharray={panel.work === '—' ? '4 3' : '0'} />
        <text x={panel.x + 22} y={panel.y + (phone ? 60 : 82)} class="tag">{t('work record', '工作记录')}</text>
        <text x={panel.x + panel.w - 22} y={panel.y + (phone ? 60 : 82)} text-anchor="end" class="legend strong">{panel.work}</text>
        <rect x={panel.x + 12} y={panel.y + (phone ? 80 : 111)} width={panel.w - 24} height={phone ? 34 : 42} rx="7" fill="white" stroke={panel.copy0 === '—' ? 'var(--line)' : 'var(--accent)'} stroke-dasharray={panel.copy0 === '—' ? '4 3' : '0'} />
        <text x={panel.x + 22} y={panel.y + (phone ? 102 : 138)} class="tag">{t('copy 0 · abort marker', '第 0 份 · 取消标记')}</text>
        <text x={panel.x + panel.w - 22} y={panel.y + (phone ? 102 : 138)} text-anchor="end" class="legend strong">{panel.copy0}</text>
        <rect x={panel.x + 12} y={panel.y + (phone ? 122 : 167)} width={panel.w - 24} height={phone ? 34 : 42} rx="7" fill="white" stroke={panel.copy1 === '—' ? 'var(--line)' : 'var(--accent)'} stroke-dasharray={panel.copy1 === '—' ? '4 3' : '0'} />
        <text x={panel.x + 22} y={panel.y + (phone ? 144 : 194)} class="tag">{t('copy 1 · abort marker', '第 1 份 · 取消标记')}</text>
        <text x={panel.x + panel.w - 22} y={panel.y + (phone ? 144 : 194)} text-anchor="end" class="legend strong">{panel.copy1}</text>
        <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 174 : 242)} text-anchor="middle" class="tag">{panel.note}</text>
        <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 202 : 282)} text-anchor="middle" class="legend strong">{panel.status}</text>
        {#if i < abortPanels.length - 1}
          <line x1={phone ? panel.x + panel.w / 2 : panel.x + panel.w + 7} y1={phone ? panel.y + panel.h + 5 : panel.y + 155} x2={phone ? panel.x + panel.w / 2 : panel.x + panel.w + 33} y2={phone ? panel.y + panel.h + 25 : panel.y + 155} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#abort-arrow)" />
        {/if}
      {/each}
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Work and abort markers only; GPU cleanup is not drawn.', '只画工作记录和取消标记，不画显存清理。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: when may the bound copy start computing?', '下一章：绑定后，下游什么时候才能开始算？')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
