## Step 1 · A later window repeats earlier work

**One sentence.** Qwen3-Omni's stateless later window reads 25 old frames and 10 new frames, but emits only the 10 new frames as the next sound chunk.

### On the stage

- A `vocoder` turns codec frames into sound. Chapter 9 Step 7 established this hand-off, and Learning SGLang Ch. 20 Steps 1–3 established the 10-frame, 800 ms chunk.
- The grey input box holds 25 frames that an earlier window already decoded. The blue box holds 10 frames that have not been decoded. This window reads all 35 frames.
- Only the 10 blue frames leave as the new chunk. The 25 old frames supply earlier context; they do not become a second copy of old sound.
- The three map entries preview the chapter: combine ready windows, retain earlier decoder work, and replay recorded kernels for an exact shape. They are separate mechanisms, not three names for one trick.
- Blue marks new frames and their sound. Grey marks old input. The map uses neutral outlines because this step has not removed the repeated work.

### Formula and symbols

$$I=c+n$$

| Symbol | Meaning | Source |
|---|---|---|
| $c$ | Earlier frames read again | Qwen3-Omni default left context, 25 |
| $n$ | New frames decoded and emitted | Default stream chunk, 10 |
| $I$ | Total frames read by this stateless later window | Calculated here |

### The numbers on the stage

$$I=25+10=35\ \text{frames}$$

The output contains 10 new frames, representing $10\times80=800$ ms of playback. Neither 35 nor 800 ms measures this window's compute time.

### Next

The first map entry changes how independent requests share a model call. The next step combines three ready first windows without merging their outputs.

Sources: `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:79-109,999-1011`; Learning SGLang Ch. 20 Steps 1–3.
