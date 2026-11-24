// Mechanical part of EVAL.md §0: caption length and first-use terminology.
// Reads generated transcripts in chapter order. R1/R3/R5/R6 still need the screenshot cold-read.
// usage: npm run readability                 audit every ready chapter
//        ONLY=2 STEP=1 npm run readability   gate one changed first-book step
//        BOOK=omni ONLY=1 STEP=1 npm run readability   gate one Omni step
// Regenerate a chapter first with ONLY=N npm run transcript so its Chinese captions are present.
import { readdirSync, readFileSync } from 'node:fs';

const only = process.env.ONLY ? Number(process.env.ONLY) : null;
const onlyStep = process.env.STEP ? Number(process.env.STEP) : null;
const plainWords = new Set(['prompt', 'token', 'model', 'GPU', 'CPU', 'Python', 'string', 'integer', 'id']);
const terms = [
  ['forward pass', /\bforward pass\b|前向传播/i],
  ['transformer', /\btransformer\b/i],
  ['vocabulary', /\bvocab(?:ulary)?\b|词表/i],
  ['softmax', /\bsoftmax\b/i],
  ['probability', /\bprobabilit(?:y|ies)\b|概率/i],
  ['autoregressive', /\bautoregressive\b|自回归/i],
  ['attention', /\battention\b|注意力/i],
  ['vector', /\bvectors?\b|向量/i],
  ['matrix', /\bmatri(?:x|ces)\b|矩阵/i],
  ['query', /\bquer(?:y|ies)\b/i],
  ['key', /\bkeys?\b/i],
  ['value', /\bvalues?\b/i],
  ['dot product', /\bdot(?:ted| product)?\b|点积/i],
  ['decode', /\bdecode\b/i],
  ['KV cache', /\bKV cache\b/i],
  ['prefill', /\bprefill\b/i],
  ['batch', /\bbatch(?:ing)?\b/i],
  ['scheduler', /\bscheduler\b|调度器/i],
  ['page', /\bpages?\b/i],
  ['radix tree', /\bradix tree\b/i],
  ['CUDA graph', /\bCUDA graphs?\b/i],
  ['kernel', /\bkernels?\b/i],
  ['tensor', /\btensors?\b|张量/i],
  ['HBM', /\bHBM\b/],
  ['SRAM', /\bSRAM\b/],
  ['MLA', /\bMLA\b/],
  ['GQA', /\bGQA\b/],
  ['MHA', /\bMHA\b/],
  ['RoPE', /\bRoPE\b/],
  ['logits', /\blogits\b/i],
  ['embedding', /\bembeddings?\b/i],
  ['MLP', /\bMLP\b/],
  ['quantization', /\bquantization\b|量化/i],
  ['tensor parallel', /\btensor parallel\b|张量并行/i],
  ['pipeline parallel', /\bpipeline parallel\b|流水线并行/i],
  ['expert parallel', /\bexpert parallel\b|专家并行/i],
  ['disaggregation', /\bdisaggregation\b|分离/i],
];

const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
const sentences = (s, zh = false) => clean(s).split(zh ? /(?<=[。！？!?])/ : /(?<=[.!?])(?:["']?)\s+/).map((s) => s.trim()).filter(Boolean);
const enWords = (s) => clean(s).match(/[A-Za-z0-9]+(?:['’_-][A-Za-z0-9]+)*/g) ?? [];
const zhChars = (s) => clean(s).match(/[\u3400-\u9fff]|[A-Za-z]+(?:['’_-][A-Za-z]+)*|\d+(?:\.\d+)?/g) ?? [];
const files = readdirSync('transcript', { recursive: true }).map(String)
  .filter((f) => /(^|\/)\d\d-.*\.md$/.test(f))
  .sort((a, b) => Number(a.includes('/')) - Number(b.includes('/')) || a.localeCompare(b));
const book = process.env.BOOK || (only === null ? 'all' : 'sglang');
const seen = new Set(plainWords);
let failures = 0;
let checked = 0;

for (const file of files) {
  const chapter = Number(file.match(/(?:^|\/)(\d\d)-/)?.[1]);
  const fileBook = file.startsWith('omni/') ? 'omni' : file.startsWith('ml-sys/') ? 'ml-sys' : 'sglang';
  const text = readFileSync(`transcript/${file}`, 'utf8');
  const blocks = text.split(/^## Step /m).slice(1);
  for (const block of blocks) {
    const step = Number(block.match(/^(\d+)/)?.[1]);
    const selected = (book === 'all' || book === fileBook) && (only === null || chapter === only) && (onlyStep === null || step === onlyStep);
    const caption = clean(block.match(/^\*\*Caption(?:\s*\([^)]*\))?\.\*\*\s*(.+)$/m)?.[1] ?? '');
    const zh = clean(block.match(/^\*\*Caption \(zh\)\.\*\*\s*(.+)$/m)?.[1] ?? '');
    const stage = block.split(/^## Prose/m)[0];
    const found = terms.filter(([, re]) => re.test(stage));
    const fresh = found.filter(([name]) => !seen.has(name));
    for (const [name] of found) seen.add(name);
    if (!selected) continue;
    checked++;
    const problems = [];
    if (!caption) problems.push('R4 missing English caption');
    if (!zh) problems.push('R4 missing Chinese caption; regenerate transcript');
    if (fresh.length > 1) problems.push(`R2 ${fresh.length} new terms: ${fresh.map(([name]) => name).join(', ')}`);
    for (const [i, sentence] of sentences(caption).entries()) {
      const n = enWords(sentence).length;
      if (n > 15) problems.push(`R4 English sentence ${i + 1}: ${n} words`);
    }
    for (const [i, sentence] of sentences(zh, true).entries()) {
      const n = zhChars(sentence).length;
      if (n > 25) problems.push(`R4 Chinese sentence ${i + 1}: ${n} characters`);
    }
    if (sentences(caption).length > 2 || sentences(zh, true).length > 2) problems.push('R4 more than two sentences');
    if (/因为.*因为|所以.*所以/i.test(zh) || /because.*because|\bso\b.*\bso\b/i.test(caption)) problems.push('R4 repeated causal connector');
    const notes = fresh.length ? ` · new: ${fresh.map(([name]) => name).join(', ')}` : '';
    if (problems.length) {
      failures += problems.length;
      console.log(`FAIL ${file} step ${step}\n  ${problems.join('\n  ')}${notes}`);
    } else console.log(`ok   ${file} step ${step}${notes}`);
  }
}
if (!checked) { console.error('no transcript steps matched'); process.exit(1); }
console.log(`${checked} step(s) checked · ${failures} mechanical problem(s)`);
process.exit(failures ? 1 : 0);
