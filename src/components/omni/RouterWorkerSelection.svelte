<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    ROUTER_WORKER_COUNT,
    ROUTER_COMPATIBLE_WORKER_COUNT,
    ROUTER_HEALTH_SUCCESS_THRESHOLD,
    ROUTER_HEALTH_FAILURE_THRESHOLD,
    ROUTER_ROUND_ROBIN_WORKERS,
    ROUTER_ROUND_ROBIN_SEQUENCE,
    ROUTER_LEAST_INITIAL_LOADS,
    ROUTER_LEAST_SELECTIONS,
    ROUTER_LEASE_ACTIVE_BEFORE,
    ROUTER_LEASE_ACTIVE_DURING,
    ROUTER_FINAL_LOADS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Two workers share one URL, but only B accepts this image. The router must check compatibility before taking turns.',
    captionZh: '两个 worker 共用一个网址，但只有 B 接收这张图片。router 轮流选择前，必须先检查是否兼容。',
  }, {
    caption: 'When workers accept the same requests, the router can skip body classification. Otherwise it reads routing facts before choosing.',
    captionZh: 'worker 接收的请求相同时，router 可以跳过请求体分类。请求不同时，先读路由事实再选择。',
  }, {
    caption: 'One profile row must satisfy the whole request. A cannot combine M from row 1 with image support from row 2.',
    captionZh: '同一个 profile 行必须满足整个请求。A 不能把第 1 行的 M 和第 2 行的图片能力拼起来。',
  }, {
    caption: 'Only healthy workers can be selected. Defaults: two consecutive successes mark healthy; three consecutive failures mark unhealthy.',
    captionZh: '只有 healthy worker 能被选中。默认连续 2 次探测成功转为 healthy，连续 3 次失败转为 unhealthy。',
  }, {
    caption: 'Round robin rotates through compatible healthy workers. It does not compare their active request counts.',
    captionZh: 'round robin 在兼容且 healthy 的 worker 之间轮换。它不比较活跃请求数。',
  }, {
    caption: 'Least requests picks the smallest active count. Ties use the same rotating order.',
    captionZh: 'least requests 选择活跃数最少的 worker。并列最少时，沿用同一个轮换顺序。',
  }, {
    caption: 'Selection adds one to the worker’s active count before sending the request. Response end, error, or cancellation releases it.',
    captionZh: '选择后、发送请求前，worker 活跃数先加一。响应结束、出错或取消时才收回。',
  }, {
    caption: 'C can fail after selection; the router does not retry that response on B. What does the client receive, and when can later requests avoid C?',
    captionZh: 'C 被选中后仍可能故障，router 不会把这个响应转到 B 重试。客户端会收到什么，后续请求何时不再选择 C？',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const leastSteps = (() => {
    const loads = [...ROUTER_LEAST_INITIAL_LOADS];
    let recency = ROUTER_ROUND_ROBIN_WORKERS.map((_, worker) => worker);
    return ROUTER_LEAST_SELECTIONS.map((expectedSelected) => {
      const before = [...loads], recencyBefore = [...recency];
      const minimum = Math.min(...before);
      const tied = recency.filter((worker) => before[worker] === minimum);
      const selected = tied[0];
      if (selected !== expectedSelected) throw new Error(`least-requests example expected ${expectedSelected}, got ${selected}`);
      loads[selected] += 1;
      recency = [...recency.filter((worker) => worker !== selected), selected];
      return { before, selected, after: [...loads], minimum, tied, recencyBefore, recencyAfter: [...recency] };
    });
  })();
  // A separate tie reuses row 3's loads with row 1's rotated order, so C wins rather than B.
  const rotatedTie = (() => {
    const before = [...leastSteps[2].before], recency = [...leastSteps[0].recencyAfter];
    const minimum = Math.min(...before);
    const tied = recency.filter((worker) => before[worker] === minimum);
    return { before, recency, minimum, tied, selected: tied[0] };
  })();
  const orderText = (order: number[]) => `[${order.map((worker) => ROUTER_ROUND_ROBIN_WORKERS[worker]).join(',')}]`;
  const LEAST_SEQUENCE_PHASE = leastSteps.length * 2 + 1;
  const LEAST_FINAL_PHASE = LEAST_SEQUENCE_PHASE + 1;
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [650, 750, 830, 840, 680, 790, 760, 880][step] : [520, 560, 600, 600, 570, 680, 560, 650][step]);

  // Each step reveals one routing event at a time, then holds the finished scene before looping.
  const PHASE_COUNTS = [4, 5, 4, 6, 7, LEAST_FINAL_PHASE + 1, 5, 6];
  const PHASE_MS = 1100, REST_MS = 2500;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase = count - 1; return; }
    const ms = count * PHASE_MS + REST_MS;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || now - t0 >= ms) { t0 = now; nextLap(ms); }
      phase = Math.min(count - 1, Math.floor((now - t0) / PHASE_MS));
      raf = requestAnimationFrame(tick);
    };
    phase = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="router-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="router-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One URL, two workers' : 'One URL, two different workers', phone ? '一个网址，两个 worker' : '一个网址，两个能力不同的 worker')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'worker = one Omni server' : 'worker = one Omni server the router can call', phone ? 'worker = 一个 Omni server' : 'worker = router 可以调用的一个 Omni server')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'router = the shared URL that chooses' : 'router = the shared URL that chooses a worker', phone ? 'router = 共用网址，负责选择' : 'router = 共用网址背后的选择者')}</text>
        <text x={W / 2} y="112" text-anchor="middle" class="result">{ROUTER_WORKER_COUNT} {t('workers', '个 worker')} · 1 {t(phone ? 'image' : 'image request', '个图片请求')} · {phase === 0 ? ROUTER_WORKER_COUNT : ROUTER_COMPATIBLE_WORKER_COUNT} {t(phase < 2 ? 'to check' : 'compatible', phase < 2 ? '个待检查' : '个兼容')}</text>
        <rect x={phone ? 50 : 260} y="140" width={phone ? 200 : 200} height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y="169" text-anchor="middle" class="small strong">POST · model M</text>
        <text x={W / 2} y="195" text-anchor="middle" class="small">1 {t('image as input', '张图片作为输入')}</text>
        {#if !phone}
          <line x1="310" y1="216" x2="190" y2="280" stroke="var(--faint)" stroke-width="2" stroke-dasharray="5 4" opacity={phase >= 1 ? 0.35 : 1} style="transition: opacity 350ms" />
          <line x1="410" y1="216" x2="530" y2="280" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 350ms" />
          {#each [
            { x: 50, name: 'worker A', ability: 'text input only', abilityZh: '只接收文字输入', ok: false },
            { x: 410, name: 'worker B', ability: 'image input → text', abilityZh: '图片输入 → 文字', ok: true },
          ] as worker}
            <rect x={worker.x} y="285" width="260" height="145" rx="12" fill={worker.ok && phase >= 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={!worker.ok && phase >= 1 ? 'var(--fg)' : worker.ok && phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={(!worker.ok && phase >= 1) || (worker.ok && phase >= 2) ? 3 : 1} style="transition: fill 350ms, stroke 350ms, stroke-width 350ms" />
            <text x={worker.x + 20} y="317" class="result">{worker.name}</text>
            <text x={worker.x + 20} y="351" class="small">{t(worker.ability, worker.abilityZh)}</text>
            <text x={worker.x + 20} y="397" class="small strong" style={worker.ok ? '' : 'fill:var(--muted)'}>{worker.ok ? t(phase >= 2 ? 'image input ✓ → accepted' : 'image input: not checked', phase >= 2 ? '图片输入 ✓ → 可以接收' : '图片输入：尚未检查') : t(phase >= 1 ? 'image input ✗ → removed' : 'image input: not checked', phase >= 1 ? '图片输入 ✗ → 排除' : '图片输入：尚未检查')}</text>
          {/each}
        {:else}
          <path d="M 250 195 H 290 V 405 H 280" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" opacity={phase >= 3 ? 1 : 0} style="transition: opacity 350ms" />
          <rect x="20" y="250" width="260" height="115" rx="11" fill="var(--bg)" stroke={phase >= 1 ? 'var(--fg)' : 'var(--line)'} stroke-width={phase >= 1 ? 3 : 1} style="transition: stroke 350ms, stroke-width 350ms" />
          <text x="36" y="280" class="result">worker A</text>
          <text x="36" y="309" class="small">{t('text input only', '只接收文字输入')}</text>
          <text x="36" y="341" class="small strong" style="fill:var(--muted)">{t(phase >= 1 ? 'image input ✗ → removed' : 'image input: not checked', phase >= 1 ? '图片输入 ✗ → 排除' : '图片输入：尚未检查')}</text>
          <rect x="20" y="385" width="260" height="115" rx="11" fill={phase >= 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase >= 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase >= 2 ? 3 : 1} style="transition: fill 350ms, stroke 350ms, stroke-width 350ms" />
          <text x="36" y="415" class="result">worker B</text>
          <text x="36" y="444" class="small">{t('image input → text', '图片输入 → 文字')}</text>
          <text x="36" y="476" class="small strong">{t(phase >= 2 ? 'image input ✓ → accepted' : 'image input: not checked', phase >= 2 ? '图片输入 ✓ → 可以接收' : '图片输入：尚未检查')}</text>
        {/if}
        <text x={W / 2} y={phone ? 545 : 470} text-anchor="middle" class="small strong">{t(phone ? 'Turns alone cannot find a compatible worker.' : 'Taking turns alone cannot answer who can accept it.', '只看轮流顺序，无法知道谁能接收这个请求。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed typed-image profiles.' : 'Constructed profiles from the router’s typed-image routing test.', phone ? '构造 typed-image 能力' : '构造能力行来自 router 的 typed-image 路由测试。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('How the router learns the request', 'router 怎样知道请求要做什么')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'classify = read routing facts from the body' : 'classify = read the body for model, input, output, format and stream mode', phone ? '分类 = 从请求体读路由事实' : 'classify = 读请求体里的模型、输入、输出、格式和流式模式')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('Both paths finish routing facts before selection.', '两条路都先确定路由事实，再选择 worker。')}</text>
        {#each [false, true] as classified}
          {@const x = phone ? 18 : classified ? 375 : 30}
          {@const y = phone ? classified ? 390 : 105 : 110}
          {@const pw = phone ? 264 : 315}
          {@const factsAt = classified ? 3 : 1}
          {@const selectAt = classified ? 4 : 2}
          <rect x={x} y={y} width={pw} height="250" rx="12" fill={classified ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={classified ? 'var(--gen)' : 'var(--accent)'} stroke-width={phase === factsAt || phase === selectAt ? 3 : 1} style="transition: stroke-width 250ms" />
          <text x={x + 16} y={y + 30} class="small strong">{classified ? 'CLASSIFIED' : 'DIRECT'}</text>
          <text x={x + 16} y={y + 59} class="small">{classified ? t('workers accept different requests', 'worker 接收不同请求') : t('same model + same request abilities', '相同模型 + 相同请求能力')}</text>
          <rect x={x + 16} y={y + 82} width={pw - 32} height="57" rx="8" fill="var(--bg)" stroke="var(--line)" opacity={phase >= factsAt ? 1 : 0.2} style="transition: opacity 350ms" />
          <text x={x + pw / 2} y={y + 116} text-anchor="middle" class="small" opacity={phase >= factsAt ? 1 : 0.2} style="transition: opacity 350ms">{classified ? t('read body once → routing facts', '请求体读一次 → 路由事实') : t('known shared contract', '已知的共同契约')}</text>
          <line x1={x + pw / 2} y1={y + 140} x2={x + pw / 2} y2={y + 164} stroke={classified ? 'var(--gen)' : 'var(--accent)'} stroke-width="2" marker-end={classified ? 'url(#router-arrow-gen)' : 'url(#router-arrow)'} opacity={phase >= selectAt ? 1 : 0.15} style="transition: opacity 350ms" />
          <rect x={x + 16} y={y + 171} width={pw - 32} height="57" rx="8" fill="var(--bg)" stroke="var(--line)" opacity={phase >= selectAt ? 1 : 0.2} style="transition: opacity 350ms" />
          <text x={x + pw / 2} y={y + 205} text-anchor="middle" class="small strong" opacity={phase >= selectAt ? 1 : 0.2} style="transition: opacity 350ms">{t('select a worker', '选择 worker')}</text>
        {/each}
        <text x={W / 2} y={phone ? 665 : 405} text-anchor="middle" class="small strong" opacity={phase >= 2 ? 1 : 0.15} style="transition: opacity 350ms">{t('Direct: select, then stream the body.', 'direct：先选择，再流式发送请求体。')}</text>
        <text x={W / 2} y={phone ? 692 : 440} text-anchor="middle" class="small strong" opacity={phase >= 4 ? 1 : 0.15} style="transition: opacity 350ms">{t(phone ? 'Classified: select → forward original bytes.' : 'Classified: forward the original bytes after selection.', 'classified：选择后转发原始字节。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Direct needs matching request abilities' : 'Direct requires one default model and equivalent request abilities across the worker group.', phone ? 'direct 要求请求能力一致' : 'direct 要求整组 worker 有同一默认模型和等价请求能力。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Match one whole profile row', '用一整行 profile 匹配请求')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'profile row = one complete capability set' : 'profile row = one supported combination of capabilities', 'profile 行 = worker 支持的一种完整能力组合')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = full match · grey = a miss' : 'blue = matches every fact · grey = misses at least one', '蓝 = 每项都匹配 · 灰 = 至少缺一项')}</text>
        <rect x={phone ? 18 : 30} y="100" width={phone ? 264 : 660} height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y="129" text-anchor="middle" class="small strong">REQUEST</text>
        <text x={W / 2} y="156" text-anchor="middle" class="code">model M · image → WAV · stream</text>
        {#if !phone}
          <rect x="30" y="205" width="315" height="285" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="235" class="result">worker A</text>
          <rect x="48" y="257" width="279" height="65" rx="8" fill="var(--bg)" stroke={phase === 1 ? 'var(--fg)' : 'var(--faint)'} stroke-width={phase === 1 ? 3 : 1} style="transition: stroke 250ms, stroke-width 250ms" />
          <text x="62" y="283" class="small">row 1 · model M</text>
          <text x="62" y="307" class="small">text → text · no stream</text>
          <rect x="48" y="338" width="279" height="65" rx="8" fill="var(--bg)" stroke={phase === 2 ? 'var(--fg)' : 'var(--faint)'} stroke-width={phase === 2 ? 3 : 1} style="transition: stroke 250ms, stroke-width 250ms" />
          <text x="62" y="364" class="small">row 2 · model N</text>
          <text x="62" y="388" class="small">image → WAV · stream</text>
          <text x="48" y="449" class="result" opacity={phase >= 2 ? 1 : 0.2} style="transition: opacity 350ms">0 + 0 = 0 {t('matching rows', '行匹配')}</text>
          <rect x="375" y="205" width="315" height="285" rx="12" fill={phase >= 3 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} style="transition: fill 350ms, stroke 350ms" />
          <text x="393" y="235" class="result">worker B</text>
          <rect x="393" y="257" width="279" height="92" rx="8" fill="var(--bg)" stroke={phase >= 3 ? 'var(--accent)' : 'var(--faint)'} style="transition: stroke 350ms" />
          <text x="407" y="283" class="small">row 1 · model M</text>
          <text x="407" y="309" class="small">image → WAV · stream</text>
          <text x="407" y="334" class="small strong" opacity={phase >= 3 ? 1 : 0.15} style="transition: opacity 350ms">{t('every fact matches', '每项都匹配')}</text>
          <text x="393" y="449" class="result" opacity={phase >= 3 ? 1 : 0.15} style="transition: opacity 350ms">1 {t('matching row', '行匹配')}</text>
        {:else}
          <rect x="18" y="200" width="264" height="260" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="230" class="result">worker A</text>
          <rect x="34" y="250" width="232" height="70" rx="8" fill="var(--bg)" stroke={phase === 1 ? 'var(--fg)' : 'var(--faint)'} stroke-width={phase === 1 ? 3 : 1} style="transition: stroke 250ms, stroke-width 250ms" />
          <text x="46" y="277" class="small">row 1 · model M</text>
          <text x="46" y="302" class="small">text → text · no stream</text>
          <rect x="34" y="335" width="232" height="70" rx="8" fill="var(--bg)" stroke={phase === 2 ? 'var(--fg)' : 'var(--faint)'} stroke-width={phase === 2 ? 3 : 1} style="transition: stroke 250ms, stroke-width 250ms" />
          <text x="46" y="362" class="small">row 2 · model N</text>
          <text x="46" y="387" class="small">image → WAV · stream</text>
          <text x="34" y="438" class="result" opacity={phase >= 2 ? 1 : 0.2} style="transition: opacity 350ms">0 + 0 = 0 {t('rows', '行')}</text>
          <rect x="18" y="485" width="264" height="200" rx="12" fill={phase >= 3 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase >= 3 ? 'var(--accent)' : 'var(--line)'} style="transition: fill 350ms, stroke 350ms" />
          <text x="34" y="515" class="result">worker B</text>
          <rect x="34" y="535" width="232" height="85" rx="8" fill="var(--bg)" stroke={phase >= 3 ? 'var(--accent)' : 'var(--faint)'} style="transition: stroke 350ms" />
          <text x="46" y="562" class="small">row 1 · model M</text>
          <text x="46" y="587" class="small">image → WAV · stream</text>
          <text x="46" y="611" class="small strong" opacity={phase >= 3 ? 1 : 0.15} style="transition: opacity 350ms">{t('all facts match', '每项都匹配')}</text>
          <text x="34" y="657" class="result" opacity={phase >= 3 ? 1 : 0.15} style="transition: opacity 350ms">1 {t('matching row', '行匹配')}</text>
        {/if}
        <text x={W / 2} y={phone ? 730 : 535} text-anchor="middle" class="small strong" opacity={phase >= 3 ? 1 : 0.15} style="transition: opacity 350ms">{t('No cross-row combinations.', '不能跨行拼出请求需要的能力。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed rows · model N is a different model', '构造行 · model N 是另一个模型')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Health filters compatible workers' : 'Health filters the compatible workers', 'health 再过滤兼容的 worker')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'probe = ask the worker health URL' : 'health probe = the router asks the worker’s health URL', phone ? 'probe = 询问 worker 健康网址' : 'health probe = router 请求 worker 的健康网址')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{phone ? t('2xx = HTTP status 200–299 = success', '2xx = HTTP 状态 200–299 = 成功') : t('2xx = HTTP status 200–299 = success · other status = failure', '2xx = HTTP 状态 200–299 = 成功 · 其他状态 = 失败')}</text>
        <text x={phone ? 18 : 30} y="99" class="label">{phone ? t('other status or timeout = failure', '其他状态或 timeout = 失败') : t('timeout = no reply by the probe deadline = failure', 'timeout = 超过探测期限仍无回应 = 失败')}</text>
        {#if phone}<text x="18" y="119" class="label">{t('timeout = no reply by the deadline', 'timeout = 超过探测期限仍无回应')}</text>{/if}
        {#each [false, true] as failing}
          {@const x = phone ? 18 : failing ? 375 : 30}
          {@const y = phone ? failing ? 465 : 145 : 130}
          {@const pw = phone ? 264 : 315}
          {@const results = failing ? ['503', 'timeout', '503'] : ['200', '200']}
          {@const reached = failing ? phase >= 5 : phase >= 2}
          <rect x={x} y={y} width={pw} height="285" rx="12" fill={reached ? failing ? 'var(--gen-soft)' : 'var(--accent-soft)' : 'var(--bg)'} stroke={reached ? failing ? 'var(--gen)' : 'var(--accent)' : 'var(--line)'} style="transition: fill 350ms, stroke 350ms" />
          <text x={x + 16} y={y + 30} class="small strong">{failing ? t('BECOMES UNHEALTHY', '转为 UNHEALTHY') : t('BECOMES HEALTHY', '转为 HEALTHY')}</text>
          <text x={x + 16} y={y + 58} class="small">{t('start: UNKNOWN · not selectable', '起点：UNKNOWN · 不可选择')}</text>
          {#each results as result, i}
            {@const at = failing ? i + 3 : i + 1}
            <g opacity={phase >= at ? 1 : 0.12} style="transition: opacity 350ms">
              <circle cx={x + 40} cy={y + 96 + i * 48} r="14" fill={failing ? 'var(--gen)' : 'var(--accent)'} />
              <text x={x + 66} y={y + 101 + i * 48} class="code">{result}</text>
              <text x={x + pw - 16} y={y + 101 + i * 48} text-anchor="end" class="small">{i + 1} {failing ? t(i === 0 ? 'failure' : 'failures', '次失败') : t(i === 0 ? 'success' : 'successes', '次成功')}</text>
            </g>
          {/each}
          <rect x={x + 16} y={y + 225} width={pw - 32} height="40" rx="7" fill="var(--bg)" stroke={failing ? 'var(--gen)' : 'var(--accent)'} opacity={reached ? 1 : 0.12} style="transition: opacity 350ms" />
          <text x={x + pw / 2} y={y + 251} text-anchor="middle" class="small strong" opacity={reached ? 1 : 0.12} style="transition: opacity 350ms">{failing ? t(`${ROUTER_HEALTH_FAILURE_THRESHOLD} failures → UNHEALTHY`, `连续 ${ROUTER_HEALTH_FAILURE_THRESHOLD} 次失败 → UNHEALTHY`) : t(`${ROUTER_HEALTH_SUCCESS_THRESHOLD} successes → HEALTHY`, `连续 ${ROUTER_HEALTH_SUCCESS_THRESHOLD} 次成功 → HEALTHY`)}</text>
        {/each}
        <text x={W / 2} y={phone ? 785 : 445} text-anchor="middle" class="small strong">{t(phone ? 'UNKNOWN and UNHEALTHY cannot be selected.' : 'UNKNOWN and UNHEALTHY stay outside selection.', 'UNKNOWN 和 UNHEALTHY 都不能进入选择。')}</text>
        <text x={W / 2} y={phone ? 812 : 480} text-anchor="middle" class="small">{t('A single later result does not flip the state.', '之后单独一次结果不会立刻翻转状态。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Shipped defaults · both thresholds are configurable', '随仓库发布的默认值 · 两个门槛都可配置')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Chosen worker goes to the back' : 'Round robin moves the chosen worker to the back', phone ? '选中的 worker 移到队尾' : 'round robin 把选中的 worker 移到队尾')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'all A, B, C are compatible and healthy' : 'A, B and C are all compatible and healthy', phone ? 'A、B、C 都兼容且 healthy' : 'A、B、C 都兼容且 healthy')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'Take first eligible; keep the others in order.' : 'Take the first eligible worker; leave the others in order.', '取队首的候选 worker，其他 worker 保持先后顺序。')}</text>
        {#each [
          { before: '[A, B, C]', after: '[B, C, A]', pick: 'A' },
          { before: '[B, C, A]', after: '[C, A, B]', pick: 'B' },
          { before: '[C, A, B]', after: '[A, B, C]', pick: 'C' },
        ] as row, i}
          {@const y = phone ? 118 + i * 66 : 120 + i * 66}
          {@const active = phase > 0 && phase <= 6 && (phase - 1) % 3 === i}
          <g opacity={phase === 0 || active ? 1 : 0.25} style="transition: opacity 350ms">
            <text x={phone ? 18 : 50} y={y + 25} class="code">{row.before}</text>
            <text x={phone ? 135 : 290} y={y + 25} class="result">→ {row.pick}</text>
            <text x={phone ? 190 : 430} y={y + 25} class="code">{row.after}</text>
          </g>
        {/each}
        <text x={phone ? 18 : 50} y={phone ? 330 : 340} class="small strong">{t('SIX REQUESTS · NONE HAS FINISHED', '六个请求 · 没有一个已结束')}</text>
        {#each ROUTER_ROUND_ROBIN_SEQUENCE as workerIndex, i}
          {@const x = phone ? 20 + (i % 3) * 90 : 50 + i * 105}
          {@const y = phone ? 355 + Math.floor(i / 3) * 105 : 375}
          <g opacity={phase === i + 1 ? 1 : phase > i + 1 ? 0.45 : 0.12} style="transition: opacity 350ms">
            <rect x={x} y={y} width={phone ? 80 : 90} height="78" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === i + 1 ? 3 : 1} />
            <text x={x + (phone ? 40 : 45)} y={y + 28} text-anchor="middle" class="small">{t('request', '请求')} {i + 1}</text>
            <text x={x + (phone ? 40 : 45)} y={y + 59} text-anchor="middle" class="result">{ROUTER_ROUND_ROBIN_WORKERS[workerIndex]}</text>
          </g>
        {/each}
        <text x={W / 2} y={phone ? 585 : 495} text-anchor="middle" class="result" opacity={phase >= 6 ? 1 : 0.12} style="transition: opacity 350ms">A → B → C → A → B → C</text>
        <text x={W / 2} y={phone ? 620 : 530} text-anchor="middle" class="small">{t('Unfinished requests do not change these turns.', '未结束的请求也不会改变轮换顺序。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'One order · skipped workers keep relative order' : 'One shared order across request types; skipped workers keep their relative order.', phone ? '一个顺序 · 跳过的 worker 保持相对顺序' : '不同请求类型共用一个顺序；跳过的 worker 保持相对顺序。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Least requests · active counts' : 'Least requests compares active work', 'least requests 比较活跃工作数')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'active = selected and not finished' : 'active requests = selected work whose response has not finished', phone ? '活跃 = 已选择但还没结束' : 'active requests = 已选择但响应还没结束的工作')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'New example · selected worker +1.' : 'New example · selected worker +1 before next row.', '新例子 · 每行选择后，被选 worker 加 1。')}</text>
        <text x={phone ? 18 : 50} y="104" class="small" opacity={phase === 0 ? 1 : 0.45} style="transition: opacity 350ms">{phone ? t(`recency = order ${orderText(leastSteps[0].recencyBefore)} · active [${leastSteps[0].before.join(',')}]`, `recency = 顺序 ${orderText(leastSteps[0].recencyBefore)} · 活跃数 [${leastSteps[0].before.join(',')}]`) : t(`start: recency = turn order ${orderText(leastSteps[0].recencyBefore)} · active [${leastSteps[0].before.join(',')}]`, `起点：recency = 轮换顺序 ${orderText(leastSteps[0].recencyBefore)} · 活跃数 [${leastSteps[0].before.join(',')}]`)}</text>
        {#if !phone}
          <text x="70" y="125" class="small strong">REQUEST</text>
          <text x="200" y="125" class="small strong">A</text>
          <text x="300" y="125" class="small strong">B</text>
          <text x="400" y="125" class="small strong">C</text>
          <text x="515" y="125" class="small strong">{t('MINIMUM → CHOICE', '最少 → 选择')}</text>
        {:else}
          <text x="28" y="125" class="small strong">#</text>
          <text x="67" y="125" class="small strong">A</text>
          <text x="112" y="125" class="small strong">B</text>
          <text x="157" y="125" class="small strong">C</text>
          <text x="202" y="125" class="small strong">{t('CHOICE', '选择')}</text>
        {/if}
        {#each leastSteps as row, i}
          {@const y = phone ? 145 + i * 112 : 145 + i * 90}
          {@const selectAt = i * 2 + 1}
          {@const updateAt = selectAt + 1}
          {@const shown = phase >= selectAt}
          {@const updated = phase >= updateAt}
          {@const current = phase === selectAt || phase === updateAt}
          {@const tied = row.tied.map((worker) => ROUTER_ROUND_ROBIN_WORKERS[worker]).join(',')}
          <g opacity={shown ? current ? 1 : 0.55 : 0.12} style="transition: opacity 350ms">
            <rect x={phone ? 18 : 50} y={y} width={phone ? 264 : 620} height={phone ? 100 : 78} rx="9" fill="var(--bg)" stroke={current ? phase === updateAt ? 'var(--accent)' : 'var(--fg)' : 'var(--line)'} stroke-width={current ? 3 : 1} style="transition: stroke 250ms, stroke-width 250ms" />
            <text x={phone ? 28 : 70} y={y + (phone ? 25 : 24)} class="small">{i + 1}</text>
            {#if shown}
              {#each row.before as load, worker}
                <text x={phone ? 67 + worker * 45 : 200 + worker * 100} y={y + (phone ? 25 : 24)} class="result" style={updated && worker === row.selected ? 'fill:var(--accent)' : ''}>{updated && worker === row.selected ? `${load}→${row.after[worker]}` : load}</text>
              {/each}
              <text x={phone ? 202 : 515} y={y + (phone ? 25 : 24)} class="result">{ROUTER_ROUND_ROBIN_WORKERS[row.selected]}</text>
              <text x={phone ? 28 : 200} y={y + (phone ? 52 : 46)} class="small">min = {row.minimum} · {tied} {row.tied.length > 1 ? t('tie', '并列') : t('only', '唯一最少')}</text>
              <text x={phone ? 28 : 200} y={y + (phone ? 78 : 68)} class="small">{updated ? t(`recency ${orderText(row.recencyBefore)} → ${orderText(row.recencyAfter)}`, `顺序 ${orderText(row.recencyBefore)} → ${orderText(row.recencyAfter)}`) : t(`recency scan ${orderText(row.recencyBefore)} → ${ROUTER_ROUND_ROBIN_WORKERS[row.selected]}`, `按顺序扫描 ${orderText(row.recencyBefore)} → ${ROUTER_ROUND_ROBIN_WORKERS[row.selected]}`)}</text>
            {/if}
          </g>
        {/each}
        <text x={W / 2} y={phone ? 615 : 525} text-anchor="middle" class="result" opacity={phase >= LEAST_SEQUENCE_PHASE ? 1 : 0.12} style="transition: opacity 350ms">B → C → B → C</text>
        {#if phone}
          <text x={W / 2} y="645" text-anchor="middle" class="small" opacity={phase >= LEAST_SEQUENCE_PHASE ? 1 : 0.12} style="transition: opacity 350ms">{t('Same [A,B,C], loads [2,0,0]', '同为 [A,B,C]，负载 [2,0,0]')}</text>
          <text x={W / 2} y="675" text-anchor="middle" class="small strong" opacity={phase >= LEAST_SEQUENCE_PHASE ? 1 : 0.12} style="transition: opacity 350ms">{t('round robin → A · least requests → B', 'round robin → A · least requests → B')}</text>
        {:else}
          <text x={W / 2} y="560" text-anchor="middle" class="small strong" opacity={phase >= LEAST_SEQUENCE_PHASE ? 1 : 0.12} style="transition: opacity 350ms">{t('Same [A,B,C], loads [2,0,0]: round robin → A · least requests → B', '同为 [A,B,C]，负载 [2,0,0]：round robin → A · least requests → B')}</text>
        {/if}
        <g opacity={phase >= LEAST_FINAL_PHASE ? 1 : 0} style="transition: opacity 350ms">
          <rect x={phone ? 18 : 50} y={phone ? 692 : 580} width={phone ? 264 : 620} height="66" rx="9" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
          <text x={phone ? 28 : 70} y={phone ? 716 : 604} class="small strong">{t(`SEPARATE ROTATED TIE · active [${rotatedTie.before.join(',')}]`, `独立轮换并列例 · 活跃数 [${rotatedTie.before.join(',')}]`)}</text>
          <text x={phone ? 28 : 70} y={phone ? 740 : 630} class="small">{`B=C=${rotatedTie.minimum} · ${t(`recency scan ${orderText(rotatedTie.recency)} → ${ROUTER_ROUND_ROBIN_WORKERS[rotatedTie.selected]}`, `按顺序扫描 ${orderText(rotatedTie.recency)} → ${ROUTER_ROUND_ROBIN_WORKERS[rotatedTie.selected]}`)}`}</text>
        </g>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Router-held work · not GPU usage' : 'Constructed ordinary requests; active counts are router-held work, not GPU usage or worker queues.', phone ? 'router 持有的工作 · 不是 GPU 利用率' : '构造的普通请求；活跃数是 router 持有的工作，不是 GPU 利用率或 worker 队列。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Fresh request · active +1' : 'Fresh request · RequestLease holds active +1', phone ? '新请求 · 活跃数 +1' : '新请求 · RequestLease 持有活跃数 +1')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{phone ? t('RequestLease = a token holding active +1', 'RequestLease = 持有活跃数 +1 的凭证') : t('RequestLease = a token holding active +1 until response end, error, or cancellation', 'RequestLease = 持有活跃数 +1 的凭证，响应结束、出错或取消时收回')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('blue = active +1 held · orange = lease release', '蓝 = 活跃数 +1 保持占用 · 橙 = 凭证收回')}</text>
        {#each [
          { title: 'SELECT', body: 'before dispatch', value: `${ROUTER_LEASE_ACTIVE_BEFORE} → ${ROUTER_LEASE_ACTIVE_DURING}`, titleZh: '选择', bodyZh: 'dispatch 前', terminal: false },
          { title: 'UPLOAD', body: 'request sent', value: `${ROUTER_LEASE_ACTIVE_DURING}`, titleZh: '上传', bodyZh: '发送请求', terminal: false },
          { title: 'HEADERS', body: 'response begins', value: `${ROUTER_LEASE_ACTIVE_DURING}`, titleZh: '响应头', bodyZh: '响应开始', terminal: false },
          { title: 'RELEASE', body: 'EOF · error · cancel', value: `${ROUTER_LEASE_ACTIVE_DURING} → ${ROUTER_LEASE_ACTIVE_BEFORE}`, titleZh: '收回', bodyZh: 'EOF · 出错 · 取消', terminal: true },
        ] as event, i}
          {@const x = phone ? 20 : 30 + i * 170}
          {@const y = phone ? 110 + i * 130 : 125}
          {@const pw = phone ? 260 : 150}
          <g opacity={phase === i + 1 ? 1 : phase > i + 1 ? 0.5 : 0.12} style="transition: opacity 350ms">
            <rect x={x} y={y} width={pw} height="105" rx="10" fill={event.terminal ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={event.terminal ? 'var(--gen)' : 'var(--accent)'} stroke-width={phase === i + 1 ? 3 : 1} />
            <text x={x + 14} y={y + 28} class="small strong">{t(event.title, event.titleZh)}</text>
            <text x={x + 14} y={y + 55} class="small">{t(event.body, event.bodyZh)}</text>
            <text x={x + 14} y={y + 86} class="result">active = {event.value}</text>
          </g>
          {#if i < 3}
            <line x1={phone ? x + pw / 2 : x + pw} y1={phone ? y + 106 : y + 52} x2={phone ? x + pw / 2 : x + pw + 20} y2={phone ? y + 127 : y + 52} stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" opacity={phase >= i + 2 ? 1 : 0.12} style="transition: opacity 350ms" />
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 650 : 310} text-anchor="middle" class="small strong" opacity={phase >= 3 ? 1 : 0.12} style="transition: opacity 350ms">{t('Response headers do not release the count.', '收到响应头不会释放计数。')}</text>
        <text x={W / 2} y={phone ? 680 : 345} text-anchor="middle" class="small strong" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('Each exit releases the lease once.', '每条退出路径都只收回一次凭证。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('dispatch = send to the worker · EOF = response end', 'dispatch = 发送请求给 worker · EOF = 响应结束')}</text>
      {:else if step === 7}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Selection is not a guarantee' : 'A selected worker can still fail', phone ? '选中不代表不会故障' : '选中的 worker 仍可能故障')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('New example · constructed loads', '新例子 · 构造的负载')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('blue = eligible workers · orange = failed response', '蓝 = 候选 worker · 橙 = 失败的响应')}</text>
        <g transform="translate(0 20)">
        {#if !phone}
          <rect x="30" y="90" width="315" height="365" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="120" class="small strong">{t('SELECTING THIS REQUEST · LEAST REQUESTS', '选择本请求 · LEAST REQUESTS')}</text>
          <rect x="48" y="145" width="279" height="65" rx="8" fill="var(--bg)" stroke="var(--faint)" />
          <text x="62" y="172" class="small">worker A · {t('wrong profile', 'profile 不匹配')}</text>
          <text x="62" y="196" class="small">{t('not a candidate', '不是候选')}</text>
          <rect x="48" y="226" width="279" height="65" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="62" y="253" class="small">worker B · HEALTHY</text>
          <text x="62" y="277" class="small">active = {ROUTER_FINAL_LOADS[0]}</text>
          <rect x="48" y="307" width="279" height="92" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === 1 ? 3 : 1} style="transition: stroke-width 250ms" />
          <text x="62" y="334" class="small">worker C · HEALTHY</text>
          <text x="62" y="358" class="small">active = {ROUTER_FINAL_LOADS[1]} · {t('minimum', '最少')}</text>
          <text x="62" y="384" class="small strong" opacity={phase >= 1 ? 1 : 0.12} style="transition: opacity 350ms">{t('select C → active 2', '选择 C → 活跃数 2')}</text>
          <text x="62" y="430" class="small strong" style="fill:var(--gen);transition: opacity 350ms" opacity={phase >= 5 ? 1 : 0.12}>{t('RESET: lease released · active 2 → 1', 'RESET：凭证收回 · 活跃数 2 → 1')}</text>
          <rect x="375" y="90" width="315" height="365" rx="12" fill={phase >= 3 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={phase >= 3 ? 'var(--gen)' : 'var(--line)'} style="transition: fill 350ms, stroke 350ms" />
          <text x="393" y="120" class="small strong">{t('AFTER SELECTION · WORKER C', '选择之后 · WORKER C')}</text>
          <g opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">
            <rect x="393" y="145" width="279" height="56" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="407" y="180" class="code">200 OK</text>
            <rect x="393" y="217" width="279" height="56" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="407" y="252" class="code">data: one</text>
          </g>
          <g opacity={phase >= 3 ? 1 : 0.12} style="transition: opacity 350ms">
            <rect x="393" y="289" width="279" height="65" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="407" y="329" class="code">RESET · {t('connection breaks', '连接断开')}</text>
          </g>
          <text x="393" y="390" class="small strong" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('no retry on healthy B', '不会转到 healthy B 重试')}</text>
          <text x="393" y="423" class="small" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('health changes need probe thresholds', 'health 变化仍需达到探测门槛')}</text>
        {:else}
          <rect x="18" y="85" width="264" height="350" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="115" class="small strong">{t('SELECTING · LEAST REQUESTS', '选择中 · LEAST REQUESTS')}</text>
          <text x="32" y="153" class="small">A · {t('wrong profile', 'profile 不匹配')}</text>
          <rect x="32" y="175" width="236" height="65" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="202" class="small">B · HEALTHY</text>
          <text x="46" y="226" class="small">active = {ROUTER_FINAL_LOADS[0]}</text>
          <rect x="32" y="256" width="236" height="90" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === 1 ? 3 : 1} style="transition: stroke-width 250ms" />
          <text x="46" y="283" class="small">C · HEALTHY · active = {ROUTER_FINAL_LOADS[1]}</text>
          <text x="46" y="309" class="small" opacity={phase >= 1 ? 1 : 0.12} style="transition: opacity 350ms">{t('minimum → select C', '最少 → 选择 C')}</text>
          <text x="46" y="334" class="small strong" opacity={phase >= 1 ? 1 : 0.12} style="transition: opacity 350ms">{t('active becomes 2', '活跃数变成 2')}</text>
          <text x="32" y="397" class="small strong">{t('C was healthy when selected.', '选择时 C 是 healthy。')}</text>
          <text x="32" y="423" class="small strong" style="fill:var(--gen);transition: opacity 350ms" opacity={phase >= 5 ? 1 : 0.12}>{t('RESET: lease released · active 2 → 1', 'RESET：凭证收回 · 活跃数 2 → 1')}</text>
          <rect x="18" y="460" width="264" height="230" rx="12" fill={phase >= 3 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={phase >= 3 ? 'var(--gen)' : 'var(--line)'} style="transition: fill 350ms, stroke 350ms" />
          <text x="32" y="490" class="small strong">{t('AFTER SELECTION · C', '选择之后 · C')}</text>
          <text x="32" y="530" class="code" opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">200 OK → data: one</text>
          <text x="32" y="573" class="code" opacity={phase >= 3 ? 1 : 0.12} style="transition: opacity 350ms">RESET · {t('connection breaks', '连接断开')}</text>
          <text x="32" y="619" class="small strong" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('no retry on healthy B', '不会转到 healthy B 重试')}</text>
          <text x="32" y="653" class="small" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('probe thresholds decide later health', '后续 health 仍看探测门槛')}</text>
        {/if}
        </g>
        <text x={W / 2} y={phone ? 735 : 495} text-anchor="middle" class="small strong" opacity={phase >= 4 ? 1 : 0.12} style="transition: opacity 350ms">{t('This response stops; B does not continue it.', '这个响应停止，B 不会接着发送。')}</text>
        <text x={W / 2} y={phone ? 778 : 545} text-anchor="middle" class="result" style="fill:var(--gen)">{t(phone ? 'What does the client receive?' : 'What does the client receive, and when do later requests avoid C?', phone ? '客户端会收到什么？' : '客户端会收到什么？后续请求何时不再选择 C？')}</text>
        {#if phone}
          <text x="150" y="815" text-anchor="middle" class="result" style="fill:var(--gen)">{t('When do later requests avoid C?', '后续请求何时不再选择 C？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next chapter: worker failure and graceful exit.', '下一章：worker 故障与退出。')}</text>
      {/if}
      <g class="router-loop">
        <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label={t('loops', '循环')} />
      </g>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .footnote { font-size: 13px; }
  .router-loop :global(.tag) { font-size: 13px; }
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
    .footnote { font-size: 10.5px; }
    .router-loop :global(.tag) { font-size: 10px; }
  }
</style>
