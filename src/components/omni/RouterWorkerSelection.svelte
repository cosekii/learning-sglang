<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Two workers share one URL, but only B accepts this image. The router must check compatibility before taking turns.',
    captionZh: '两个 worker 共用一个网址，但只有 B 接收这张图片。router 轮流选择前，必须先检查是否兼容。',
  }, {
    caption: 'Same worker contracts can skip body classification. Otherwise the router reads routing facts before choosing a worker.',
    captionZh: 'worker 契约相同时，可以跳过请求体分类。契约不同时，router 先读路由事实，再选择 worker。',
  }, {
    caption: 'One profile row must satisfy the whole request. A cannot combine M from row 1 with image support from row 2.',
    captionZh: '同一个 profile 行必须满足整个请求。A 不能把第 1 行的 M 和第 2 行的图片能力拼起来。',
  }, {
    caption: 'Only healthy workers can be selected. Two probe successes mark healthy; three failures mark unhealthy.',
    captionZh: '只有 healthy worker 能被选中。默认连续 2 次探测成功转为 healthy，连续 3 次失败转为 unhealthy。',
  }, {
    caption: 'Round robin rotates through compatible healthy workers. It does not compare their active request counts.',
    captionZh: 'round robin 在兼容且 healthy 的 worker 之间轮换。它不比较活跃请求数。',
  }, {
    caption: 'Least requests picks the smallest active count. Ties use the same rotating order.',
    captionZh: 'least requests 选择活跃数最少的 worker。并列最少时，沿用同一个轮换顺序。',
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
    return ROUTER_LEAST_SELECTIONS.map((selected) => {
      const before = [...loads];
      loads[selected] += 1;
      return { before, selected, after: [...loads] };
    });
  })();
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [650, 750, 830, 800, 680, 730][step] : [520, 560, 600, 600, 570, 600][step]);
</script>

<figure class="viz">
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
        <text x={W / 2} y="112" text-anchor="middle" class="result">{ROUTER_WORKER_COUNT} {t('workers', '个 worker')} · 1 {t('image request', '个图片请求')} · {ROUTER_COMPATIBLE_WORKER_COUNT} {t('compatible', '个兼容')}</text>
        <rect x={phone ? 50 : 260} y="140" width={phone ? 200 : 200} height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y="169" text-anchor="middle" class="small strong">POST · model M</text>
        <text x={W / 2} y="195" text-anchor="middle" class="small">1 {t('image as input', '张图片作为输入')}</text>
        {#if !phone}
          <line x1="310" y1="216" x2="190" y2="280" stroke="var(--faint)" stroke-width="2" stroke-dasharray="5 4" />
          <line x1="410" y1="216" x2="530" y2="280" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" />
          {#each [
            { x: 50, name: 'worker A', ability: 'text input only', abilityZh: '只接收文字输入', result: 'cannot accept this image', resultZh: '不能接收这张图片', ok: false },
            { x: 410, name: 'worker B', ability: 'image input → text', abilityZh: '图片输入 → 文字', result: 'accepts this request', resultZh: '可以接收这个请求', ok: true },
          ] as worker}
            <rect x={worker.x} y="285" width="260" height="145" rx="12" fill={worker.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={worker.ok ? 'var(--accent)' : 'var(--line)'} />
            <text x={worker.x + 20} y="317" class="result">{worker.name}</text>
            <text x={worker.x + 20} y="351" class="small">{t(worker.ability, worker.abilityZh)}</text>
            <text x={worker.x + 20} y="397" class="small strong" style={worker.ok ? '' : 'fill:var(--muted)'}>{t(worker.result, worker.resultZh)}</text>
          {/each}
        {:else}
          <line x1="150" y1="216" x2="150" y2="244" stroke="var(--accent)" stroke-width="2" marker-end="url(#router-arrow)" />
          <rect x="20" y="250" width="260" height="115" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="36" y="280" class="result">worker A</text>
          <text x="36" y="309" class="small">{t('text input only', '只接收文字输入')}</text>
          <text x="36" y="341" class="small" style="fill:var(--muted)">{t('cannot accept this image', '不能接收这张图片')}</text>
          <rect x="20" y="385" width="260" height="115" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="36" y="415" class="result">worker B</text>
          <text x="36" y="444" class="small">{t('image input → text', '图片输入 → 文字')}</text>
          <text x="36" y="476" class="small strong">{t('accepts this request', '可以接收这个请求')}</text>
        {/if}
        <text x={W / 2} y={phone ? 545 : 470} text-anchor="middle" class="small strong">{t('Taking turns alone cannot answer who can accept it.', '只看轮流顺序，无法知道谁能接收这个请求。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed profiles from the router’s typed-image routing test.', '构造能力行来自 router 的 typed-image 路由测试。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('How the router learns the request', 'router 怎样知道请求要做什么')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'classify = read routing facts from the body' : 'classify = read the body for model, input, output, format and stream mode', phone ? '分类 = 从请求体读路由事实' : 'classify = 读请求体里的模型、输入、输出、格式和流式模式')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('Both paths finish routing facts before selection.', '两条路都先确定路由事实，再选择 worker。')}</text>
        {#each [false, true] as classified}
          {@const x = phone ? 18 : classified ? 375 : 30}
          {@const y = phone ? classified ? 390 : 105 : 110}
          {@const pw = phone ? 264 : 315}
          <rect x={x} y={y} width={pw} height="250" rx="12" fill={classified ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={classified ? 'var(--gen)' : 'var(--accent)'} />
          <text x={x + 16} y={y + 30} class="small strong">{classified ? 'CLASSIFIED' : 'DIRECT'}</text>
          <text x={x + 16} y={y + 59} class="small">{classified ? t('worker contracts differ', 'worker 契约不同') : t('same default model + profiles', '相同默认模型 + 相同 profiles')}</text>
          <rect x={x + 16} y={y + 82} width={pw - 32} height="57" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + pw / 2} y={y + 116} text-anchor="middle" class="small">{classified ? t('read body once → routing facts', '请求体读一次 → 路由事实') : t('known shared contract', '已知的共同契约')}</text>
          <line x1={x + pw / 2} y1={y + 140} x2={x + pw / 2} y2={y + 164} stroke={classified ? 'var(--gen)' : 'var(--accent)'} stroke-width="2" marker-end={classified ? 'url(#router-arrow-gen)' : 'url(#router-arrow)'} />
          <rect x={x + 16} y={y + 171} width={pw - 32} height="57" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + pw / 2} y={y + 205} text-anchor="middle" class="small strong">{t('select a worker', '选择 worker')}</text>
        {/each}
        <text x={W / 2} y={phone ? 665 : 405} text-anchor="middle" class="small strong">{t('Direct: select, then stream the body.', 'direct：先选择，再流式发送请求体。')}</text>
        <text x={W / 2} y={phone ? 692 : 440} text-anchor="middle" class="small strong">{t('Classified: forward the original bytes after selection.', 'classified：选择后转发原始字节。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Direct needs identical worker contracts' : 'Direct requires the whole cohort to have one default model and equivalent profiles.', phone ? 'direct 要求 worker 契约一致' : 'direct 要求整组 worker 使用同一默认模型和等价 profiles。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Match one whole profile row', '用一整行 profile 匹配请求')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('profile row = one supported combination of capabilities', 'profile 行 = worker 支持的一种完整能力组合')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('blue = matches every fact · grey = misses at least one', '蓝 = 每项都匹配 · 灰 = 至少缺一项')}</text>
        <rect x={phone ? 18 : 30} y="100" width={phone ? 264 : 660} height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y="129" text-anchor="middle" class="small strong">REQUEST</text>
        <text x={W / 2} y="156" text-anchor="middle" class="code">model M · image → WAV · stream</text>
        {#if !phone}
          <rect x="30" y="205" width="315" height="285" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="235" class="result">worker A</text>
          <rect x="48" y="257" width="279" height="65" rx="8" fill="var(--bg)" stroke="var(--faint)" />
          <text x="62" y="283" class="small">row 1 · model M</text>
          <text x="62" y="307" class="small">text → text · no stream</text>
          <rect x="48" y="338" width="279" height="65" rx="8" fill="var(--bg)" stroke="var(--faint)" />
          <text x="62" y="364" class="small">row 2 · model N</text>
          <text x="62" y="388" class="small">image → WAV · stream</text>
          <text x="48" y="449" class="result">0 + 0 = 0 {t('matching rows', '行匹配')}</text>
          <rect x="375" y="205" width="315" height="285" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="393" y="235" class="result">worker B</text>
          <rect x="393" y="257" width="279" height="92" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x="407" y="283" class="small">row 1 · model M</text>
          <text x="407" y="309" class="small">image → WAV · stream</text>
          <text x="407" y="334" class="small strong">{t('every fact matches', '每项都匹配')}</text>
          <text x="393" y="449" class="result">1 {t('matching row', '行匹配')}</text>
        {:else}
          <rect x="18" y="200" width="264" height="260" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="230" class="result">worker A</text>
          <rect x="34" y="250" width="232" height="70" rx="8" fill="var(--bg)" stroke="var(--faint)" />
          <text x="46" y="277" class="small">row 1 · model M</text>
          <text x="46" y="302" class="small">text → text · no stream</text>
          <rect x="34" y="335" width="232" height="70" rx="8" fill="var(--bg)" stroke="var(--faint)" />
          <text x="46" y="362" class="small">row 2 · model N</text>
          <text x="46" y="387" class="small">image → WAV · stream</text>
          <text x="34" y="438" class="result">0 + 0 = 0 {t('rows', '行')}</text>
          <rect x="18" y="485" width="264" height="200" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="515" class="result">worker B</text>
          <rect x="34" y="535" width="232" height="85" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x="46" y="562" class="small">row 1 · model M</text>
          <text x="46" y="587" class="small">image → WAV · stream</text>
          <text x="46" y="611" class="small strong">{t('all facts match', '每项都匹配')}</text>
          <text x="34" y="657" class="result">1 {t('matching row', '行匹配')}</text>
        {/if}
        <text x={W / 2} y={phone ? 730 : 535} text-anchor="middle" class="small strong">{t('No cross-row combinations.', '不能跨行拼出请求需要的能力。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed rows · model N is a different model', '构造行 · model N 是另一个模型')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Health filters the compatible workers', 'health 再过滤兼容的 worker')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'probe = ask the worker health URL' : 'health probe = the router asks the worker’s health URL', phone ? 'probe = 询问 worker 健康网址' : 'health probe = router 请求 worker 的健康网址')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('2xx = success · other status or timeout = failure', '2xx = 成功 · 其他状态或超时 = 失败')}</text>
        {#each [false, true] as failing}
          {@const x = phone ? 18 : failing ? 375 : 30}
          {@const y = phone ? failing ? 420 : 105 : 110}
          {@const pw = phone ? 264 : 315}
          {@const results = failing ? ['503', 'timeout', '503'] : ['200', '200']}
          <rect x={x} y={y} width={pw} height="285" rx="12" fill={failing ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={failing ? 'var(--gen)' : 'var(--accent)'} />
          <text x={x + 16} y={y + 30} class="small strong">{failing ? t('BECOMES UNHEALTHY', '转为 UNHEALTHY') : t('BECOMES HEALTHY', '转为 HEALTHY')}</text>
          <text x={x + 16} y={y + 58} class="small">{t('start: UNKNOWN · not selectable', '起点：UNKNOWN · 不可选择')}</text>
          {#each results as result, i}
            <circle cx={x + 40} cy={y + 96 + i * 48} r="14" fill={failing ? 'var(--gen)' : 'var(--accent)'} />
            <text x={x + 66} y={y + 101 + i * 48} class="code">{result}</text>
            <text x={x + pw - 16} y={y + 101 + i * 48} text-anchor="end" class="small">{i + 1} {failing ? t('failure', '次失败') : t('success', '次成功')}</text>
          {/each}
          <rect x={x + 16} y={y + 225} width={pw - 32} height="40" rx="7" fill="var(--bg)" stroke={failing ? 'var(--gen)' : 'var(--accent)'} />
          <text x={x + pw / 2} y={y + 251} text-anchor="middle" class="small strong">{failing ? t(`${ROUTER_HEALTH_FAILURE_THRESHOLD} failures → UNHEALTHY`, `连续 ${ROUTER_HEALTH_FAILURE_THRESHOLD} 次失败 → UNHEALTHY`) : t(`${ROUTER_HEALTH_SUCCESS_THRESHOLD} successes → HEALTHY`, `连续 ${ROUTER_HEALTH_SUCCESS_THRESHOLD} 次成功 → HEALTHY`)}</text>
        {/each}
        <text x={W / 2} y={phone ? 745 : 445} text-anchor="middle" class="small strong">{t('UNKNOWN and UNHEALTHY stay outside selection.', 'UNKNOWN 和 UNHEALTHY 都不能进入选择。')}</text>
        <text x={W / 2} y={phone ? 772 : 480} text-anchor="middle" class="small">{t('A single later result does not flip the state.', '之后单独一次结果不会立刻翻转状态。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Shipped defaults · both thresholds are configurable', '随仓库发布的默认值 · 两个门槛都可配置')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Chosen worker goes to the back' : 'Round robin moves the chosen worker to the back', phone ? '选中的 worker 移到队尾' : 'round robin 把选中的 worker 移到队尾')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'all A, B, C are compatible and healthy' : 'A, B and C are all compatible and healthy', phone ? 'A、B、C 都兼容且 healthy' : 'A、B、C 都兼容且 healthy')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('Take the first eligible worker; leave the others in order.', '取队首的候选 worker，其他 worker 保持先后顺序。')}</text>
        {#each [
          { before: '[A, B, C]', after: '[B, C, A]', pick: 'A' },
          { before: '[B, C, A]', after: '[C, A, B]', pick: 'B' },
          { before: '[C, A, B]', after: '[A, B, C]', pick: 'C' },
        ] as row, i}
          {@const y = phone ? 118 + i * 66 : 120 + i * 66}
          <text x={phone ? 18 : 50} y={y + 25} class="code">{row.before}</text>
          <text x={phone ? 135 : 290} y={y + 25} class="result">→ {row.pick}</text>
          <text x={phone ? 190 : 430} y={y + 25} class="code">{row.after}</text>
        {/each}
        <text x={phone ? 18 : 50} y={phone ? 330 : 340} class="small strong">{t('SIX REQUESTS · EVERY LEASE STAYS HELD', '六个请求 · 每个租约都保持占用')}</text>
        {#each ROUTER_ROUND_ROBIN_SEQUENCE as workerIndex, i}
          {@const x = phone ? 20 + (i % 3) * 90 : 50 + i * 105}
          {@const y = phone ? 355 + Math.floor(i / 3) * 105 : 375}
          <rect x={x} y={y} width={phone ? 80 : 90} height="78" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + (phone ? 40 : 45)} y={y + 28} text-anchor="middle" class="small">{t('request', '请求')} {i + 1}</text>
          <text x={x + (phone ? 40 : 45)} y={y + 59} text-anchor="middle" class="result">{ROUTER_ROUND_ROBIN_WORKERS[workerIndex]}</text>
        {/each}
        <text x={W / 2} y={phone ? 585 : 495} text-anchor="middle" class="result">A → B → C → A → B → C</text>
        <text x={W / 2} y={phone ? 620 : 530} text-anchor="middle" class="small">{t('Held requests do not change these turns.', '请求保持占用也不会改变轮换顺序。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'One shared order · ineligible workers are skipped' : 'One shared order across services and candidate sets; ineligible workers keep their places.', phone ? '共用一个顺序 · 跳过不合格 worker' : '不同服务和候选集合共用一个顺序；不合格 worker 留在原位置。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Least requests compares active work', 'least requests 比较活跃工作数')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'active = selected and not finished' : 'active requests = selected work whose response has not finished', phone ? '活跃 = 已选择但还没结束' : 'active requests = 已选择但响应还没结束的工作')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('Each selected worker gains 1 before the next row.', '每行选择后，被选 worker 的活跃数先加 1。')}</text>
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
          {@const y = phone ? 145 + i * 105 : 145 + i * 86}
          {@const minimum = Math.min(...row.before)}
          {@const tied = row.before.map((load, worker) => load === minimum ? ROUTER_ROUND_ROBIN_WORKERS[worker] : null).filter(Boolean).join(',')}
          <rect x={phone ? 18 : 50} y={y} width={phone ? 264 : 620} height={phone ? 88 : 68} rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x={phone ? 28 : 70} y={y + 29} class="small">{i + 1}</text>
          {#each row.before as load, worker}
            <text x={phone ? 67 + worker * 45 : 200 + worker * 100} y={y + 29} class="result">{load}</text>
          {/each}
          <text x={phone ? 202 : 515} y={y + 29} class="result">{ROUTER_ROUND_ROBIN_WORKERS[row.selected]}</text>
          <text x={phone ? 28 : 200} y={y + 56} class="small">min = {minimum} · {tied} {tied.includes(',') ? t('tie', '并列') : t('only', '独占最少')}</text>
        {/each}
        <text x={W / 2} y={phone ? 590 : 515} text-anchor="middle" class="result">B → C → B → C</text>
        <text x={W / 2} y={phone ? 625 : 550} text-anchor="middle" class="small">{t('A never enters a minimum tie in these four rows.', '这四行里，A 从未进入最少并列组。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Router-held work · not GPU usage' : 'Constructed ordinary requests; active counts are router-held work, not GPU usage or worker queues.', phone ? 'router 持有的工作 · 不是 GPU 利用率' : '构造的普通请求；活跃数是 router 持有的工作，不是 GPU 利用率或 worker 队列。')}</text>
      {/if}
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
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
  }
</style>
