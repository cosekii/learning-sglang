## Step 1 · A text request and an omni request side by side

> **In one line:** the engine is unchanged; text has a converter on each side of it, and the omni request needs one on each side too, drawn as `?`.

### On the stage

- The tall box in the middle, "the engine": one model, one loop, shared by both rows.
- The top row, "text · chapters 1–15": `The capital of France is` → blue tokenizer (Ch. 1 Step 2) → token ids → engine → token ids → blue detokenizer (Ch. 1 Step 11) → `Paris`.
- The bottom row, "omni · this part": a photo (a 6 × 6 mosaic standing for it) and the waveform of a spoken question on the left, the waveform of a spoken answer on the right.
- Two dashed `?` boxes, one on each side: converters not yet known.
- The footnote: what a sample is, and where the rates come from.

### Formula

Each input and output is counted as "how many per unit × how many units":

$$
V_{\text{photo}} = L^2 \times 3,\qquad
V_q = T_q \times r_{\text{in}},\qquad
V_a = T_a \times r_{\text{out}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $L$ | pixels along one side of the photo | 896 | this step, `PHOTO` in the component |
| 3 | red, green and blue per pixel | | this step |
| $T_q$ | length of the spoken question | 10 s | this step |
| $T_a$ | length of the spoken answer | 20 s | this step |
| $r_{\text{in}}$ | sample rate of the sound the model reads | 16,000 a second | `SPEECH_IN_HZ` in `src/numbers.ts` |
| $r_{\text{out}}$ | sample rate of the sound the model writes | 24,000 a second | `SPEECH_OUT_HZ` in `src/numbers.ts` |
| $V_{\text{photo}}, V_q, V_a$ | how many values the photo, the question and the answer hold | | this step |

A **sample** is one reading of the sound wave's height, one number. The sample rate is how many readings a second.

### The numbers on the stage

| Quantity | Arithmetic | On the stage |
|---|---|---|
| photo | 896 × 896 × 3 | 2,408,448 values |
| question | 10 s × 16,000 | 160,000 samples |
| answer | 20 s × 24,000 | 480,000 samples |

### Why new converters are needed

- Neither converter in the text row is a neural network: the tokenizer splits the string by the vocabulary fixed at training time and looks up the ids (Ch. 1 Step 2); the detokenizer looks them back up. Both finish on the CPU.
- A photo and a sound are not text. No vocabulary turns 2.4 million pixel values or 160,000 samples into token ids. The answer has the same problem the other way: the engine writes tokens and a speaker needs samples.
- The engine itself does not change, so the only open question is what goes in each `?`.

### Next

Step 2 opens the left `?`, step 3 the right one.

## Step 2 · The left ?: an encoder per input

> **In one line:** a vision encoder turns the photo into 784 prompt positions and an audio encoder turns the question into 130; they join the prompt, and the engine prefills it in one pass as before.

### On the stage

- Top left: the photo's mosaic, with one square outlined as **one position** and enlarged beside it as 2 × 2 patches.
- Bottom left: the question's waveform, with a row of ticks standing for feature frames.
- Two blue boxes in the middle: the vision encoder and the audio encoder, each labelled "a model, on the GPU".
- Right: a long blue bar of 784 embeddings and a short orange bar of 130.
- Bottom right: the assembled prompt, a few grey template tokens followed by the blue and orange bars, labelled "prefilled in one pass, as in Ch. 4 Step 3".
- Two dotted lines: how an encoder differs from a tokenizer, and that SGLang already does this.

### What an encoder hands over

An **encoder** is a model that runs on the GPU and outputs **embeddings**: one vector per prompt position. It is the same kind of vector a token id becomes when the engine looks it up, Ch. 2 Step 2's $x_j$. In Qwen3-Omni's engine one such vector is 2,048 numbers (`OMNI_HIDDEN` in `src/numbers.ts`; chapter 2's Llama-3-8B uses 4,096).

Once inside the engine, a position computes the same way through the layers whether it came from a text token or from an encoder.

### Formula

$$
N_{\text{side}} = \frac{L}{p \cdot g},\qquad
N_{\text{img}} = N_{\text{side}}^2,\qquad
N_{\text{aud}} = \frac{T_q \cdot f_{\text{aud}}}{100} \times a
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $L$ | pixels along one side of the photo | 896 | step 1 |
| $p$ | pixels along one side of a patch | 16 | `VISION_PATCH` in `src/numbers.ts` |
| $g$ | each $g \times g$ group of patches becomes one position | 2 | `VISION_MERGE` in `src/numbers.ts` |
| $N_{\text{side}}$ | positions along one side of the photo | | this step |
| $N_{\text{img}}$ | positions for the photo | | this step |
| $T_q$ | length of the question | 10 s | step 1 |
| $f_{\text{aud}}$ | feature frames the audio encoder reads a second | 100 | `AUDIO_FRAMES_PER_SEC` in `src/numbers.ts` |
| $a$ | positions per 100 feature frames | 13 | `AUDIO_POS_PER_100` in `src/numbers.ts` |
| $N_{\text{aud}}$ | positions for the question | | this step |

A **patch** is a small square cut from the photo; the vision encoder reads the image patch by patch. A **feature frame** is a group of numbers the audio encoder takes from the samples every 10 ms.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| one position's side | $p \cdot g$ = 16 × 2 | 32 pixels (the outlined square) |
| $N_{\text{side}}$ | 896 ÷ 32 | 28 |
| $N_{\text{img}}$ | 28 × 28 | **784** |
| feature frames | 10 s × 100 | 1,000 |
| $N_{\text{aud}}$ | 1,000 ÷ 100 × 13 = 10 × 13 | **130** |
| prompt | template tokens + 784 + 130 | template tokens + 914 positions |

Step 1's 2.4 million pixel values become 784 positions, and its 160,000 samples become 130.

### What SGLang already does

- The encoders run inside the prefill step: the model's forward first computes the image and audio embeddings, puts them in place of the placeholder positions in the prompt, then runs the layers.
- A photo seen before is not encoded again: SGLang caches encoder outputs by a hash of the image data and takes them from the cache when the same image comes back.

So SGLang already fills the left `?`.

### Next

Step 3 opens the right `?`: how the tokens the engine writes become sound.

## Step 3 · The right ?: talker, code predictor, code2wav

> **In one line:** each token also goes to the talker; the talker writes a frame's code 0, the code predictor its codes 1–15, then the next frame; every 10 frames, code2wav turns them into 800 ms of sound.

### On the stage

- The engine on the left, sending tokens two ways.
- Upper path: the blue detokenizer, "a table, on the CPU", producing the answer as text, as in chapters 1–15.
- Lower path, three models inside the dashed "speech" box:
  - The blue talker, "1 step a frame", writing code 0 (the grid's top row, blue).
  - The orange code predictor, "15 steps a frame", writing codes 1–15 (the grid's lower 15 rows, orange).
  - The grid: one column per frame, one row per code, 16 rows by 10 columns.
  - code2wav under the grid: it waits for 10 frames and turns them into a waveform.
- The animation: whichever model is writing has its box thickened and filled; the grid fills cell by cell, then code2wav puts out sound, and the lap starts again.
- Right: the range of one code, and the step counts for the whole 20 s answer.

### Formula

$$
t_{\text{frame}} = \frac{S_{\text{frame}}}{r_{\text{out}}},\qquad
n_{\text{frame}} = \frac{T_a}{t_{\text{frame}}}
$$

$$
n_{\text{cp}} = n_{\text{frame}} \times (n_{\text{code}} - 1),\qquad
n_{\text{c2w}} = \frac{n_{\text{frame}}}{n_{\text{chunk}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $S_{\text{frame}}$ | samples the codec writes per frame | 1,920 | `SAMPLES_PER_FRAME` in `src/numbers.ts` |
| $r_{\text{out}}$ | sample rate written | 24,000 a second | step 1 |
| $t_{\text{frame}}$ | length of one frame | | this step |
| $T_a$ | length of the answer | 20 s | step 1 |
| $n_{\text{frame}}$ | frames in the answer, which is also the talker's step count | | this step |
| $n_{\text{code}}$ | codes per frame | 16 | `CODES_PER_FRAME` in `src/numbers.ts` |
| $n_{\text{cp}}$ | code-predictor steps in total | | this step |
| $n_{\text{chunk}}$ | frames code2wav takes per pass | 10 | SGLang-Omni's Qwen3-Omni config, `codec_coalesce_frames=10` |
| $n_{\text{c2w}}$ | code2wav passes | | this step |

A **frame** is a short stretch of sound; a **code** is one integer describing it, one of 2,048 values (`CODE_VALUES`), picked from probabilities the way the engine picks a token id in Ch. 1 Step 4. The **codec** is the encoding that maps codes to sound and back; code2wav is its decoding side.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $t_{\text{frame}}$ | 1,920 ÷ 24,000 | 0.08 s = **80 ms** |
| sound per code2wav pass | 10 × 80 ms | **800 ms** |
| $n_{\text{frame}}$ (talker steps) | 20 s ÷ 80 ms | **250** |
| $n_{\text{cp}}$ | 250 × 15 | **3,750** |
| $n_{\text{c2w}}$ | 250 ÷ 10 | **25** passes |

### Why one frame at a time

- Each talker step reads two things: the engine's next token and the frame just written (the footnote). So the next frame waits until all 16 codes of this one are written.
- The code predictor's 15 steps also run one after another: code $i$ looks at codes $0 \dots i-1$.
- SGLang-Omni runs the code predictor inside the talker's own step, so the frame is complete when a talker step ends.
- The stage leaves one thing out: besides its 10 new frames, each code2wav pass rereads up to 25 earlier frames (`left_context_size=25` in SGLang-Omni's code2wav scheduler) so the seams between chunks stay smooth. Chapter 20 explains why.

### Next

Step 4 puts the six models of steps 2 and 3 in one picture, sorted into one pass and loops.

## Step 4 · Six models, two kinds

> **In one line:** three models read their input and are done; three are loops, where each step waits for what the step before it wrote.

### On the stage

- White boxes (one pass): vision encoder "1 pass", audio encoder "1 pass", code2wav "25 passes".
- Blue-filled boxes (loops): the engine "prefill: 1 pass, then a step per text token", the talker "250 steps", the code predictor "3,750 steps".
- Labels on the arrows: 784 and 130 (positions into the engine), tokens (engine to talker), code 0 and "the frame" (back and forth between talker and code predictor), 10 frames (into code2wav), "800 ms of sound each".
- Two legend lines: what a white box and a blue-filled box mean.
- The footnote: the counts come from step 2's and 3's photo, question and answer.

### The two kinds

| | One pass | A loop |
|---|---|---|
| What it does | reads its whole input, writes its output, done | Ch. 1 Step 11's forward, pick, append, until it stops |
| Relation to the run before | does not need the previous run's output | needs what the previous step wrote |
| Can its runs go side by side | yes | not for one request's steps |
| In this request | vision encoder, audio encoder, code2wav | engine, talker, code predictor |

code2wav runs 25 passes but is still one pass: each takes 10 new frames and returns 800 ms of sound, and never reads the sound the previous pass returned. The up-to-25 earlier frames it rereads are codes the talker already wrote, not the previous pass's output.

### The numbers on the stage

| Model | Kind | Work | From |
|---|---|---|---|
| vision encoder | one pass | 1 pass, 784 embeddings out | step 2 |
| audio encoder | one pass | 1 pass, 130 embeddings out | step 2 |
| engine | loop | 1 prefill pass, then 1 step per text token | Ch. 4 Step 3 |
| talker | loop | 250 steps | step 3, 20 s ÷ 80 ms |
| code predictor | loop | 250 × 15 = 3,750 steps | step 3 |
| code2wav | one pass | 250 ÷ 10 = 25 passes | step 3 |

### The loops are chained

- The talker needs the engine's tokens.
- The code predictor needs the talker's code 0.
- The talker's next step needs the frame the code predictor finished (step 3).

SGLang in chapters 1–15 serves one loop; this request has three, each waiting on another.

### Next

Step 5 looks at the loosest link: the talker waiting for the engine's tokens.

## Step 5 · The talker waits for each token the engine writes

> **In one line:** the talker's step for token $k$ has to wait until the engine writes $k$; while the engine is busy with other requests, the talker can only wait.

### On the stage

- The axis: iterations 1 to 15; one column is one iteration of the engine's loop, and column 0, "arrives", holds the prompt.
- The engine row (orange): `P` is its prefill, a number is the token that step writes; a grey dashed "busy" box is an iteration spent on other requests.
- The talker row (blue): `P` is the talker's prefill, a number is the token that step reads; a red dashed "wait" box is an iteration with no input to read.
- The animation: columns appear one at a time, hold at column 15, and start again.
- The blue "needed:" pill: the two missing pieces.
- Two footnotes: what "busy" means, and that SGLang-Omni does this wait in `talker_scheduler.py`.

### Formula

$$
c_{\text{talker}}(k) = \max\big(c_{\text{talker}}(k-1) + 1,\; c_{\text{engine}}(k) + 1\big)
$$

| Symbol | What it is | From |
|---|---|---|
| $k$ | token number, 1, 2, 3, … | this step |
| $c_{\text{engine}}(k)$ | the iteration in which the engine writes token $k$ | the engine row |
| $c_{\text{talker}}(k)$ | the iteration in which the talker reads token $k$ | this step |
| $c_{\text{talker}}(0)$ | the talker's prefill, in iteration 2 | `P` in the talker row |

Each term does one job: the talker takes one step per iteration (the first term), and a token can be read only in the iteration after it is written (the second). Any iteration no $c_{\text{talker}}(k)$ lands on is a "wait".

### The numbers on the stage

The engine's prefill in iteration 1 also writes token 1 (Ch. 1 Step 4: the last position of a forward gives the next token).

| $k$ | $c_{\text{engine}}(k)$ | $c_{\text{talker}}(k-1)+1$ | $c_{\text{engine}}(k)+1$ | $c_{\text{talker}}(k)$ |
|---|---|---|---|---|
| 1 | 1 | 3 | 2 | 3 |
| 2 | 2 | 4 | 3 | 4 |
| 3 | 3 | 5 | 4 | 5 |
| 4 | 7 | 6 | 8 | **8** |
| 5 | 8 | 9 | 9 | 9 |
| 6 | 9 | 10 | 10 | 10 |
| 7 | 12 | 11 | 13 | **13** |
| 8 | 13 | 14 | 14 | 14 |
| 9 | 14 | 15 | 15 | 15 |

- The engine is "busy" in iterations 4–6 and 10–11: its scheduler spends them on other requests, for example a prefill (Ch. 6 Step 4, prefill first).
- Iterations 6 and 7 are "wait" for the talker: token 4 is written only in iteration 7, so it is read in 8.
- Iterations 11 and 12 are "wait": token 7 is written only in 12.
- Token 10 is written in iteration 15; the talker would read it in 16, past the edge of the stage.

Where "busy" and "wait" fall is an illustration, not a measurement; how often the talker waits depends on how busy the engine is.

### Where the check lives

- SGLang's scheduler never makes this check: its requests read only their own prompt and the tokens they wrote, never another model's output.
- SGLang-Omni's talker scheduler adds it: after picking the next decode batch, it checks that every request in it has its next input (the engine's token and the previous frame's codes); if any is missing, it holds the whole batch (`is_batch_ready_to_run`).

### Next

The "needed:" pill names the two missing pieces: each token handed over as soon as it is written, and a talker loop that checks the token has arrived before it steps. SGLang runs one loop per process, so chapter 17 answers where the talker's loop runs and chapter 18 how each token reaches it.
