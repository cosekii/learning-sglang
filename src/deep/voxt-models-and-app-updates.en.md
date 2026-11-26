## Step 1 · Three things, not one

> **In one line:** Model files live on disk, model processes run in memory, and the app bundle is the program itself; the model arrives after install and is about nine times the 0.1.0-beta.1 app.

### On the stage

- Left blue panel: **model files**, 2.47 GB, nine files in the model library, on disk under Application Support, downloaded after install.
- Middle amber panel: **speech server**, one ASR process, loads a model into memory, stays after use, and exits after ten idle minutes in Automatic mode. Step 4 shows the Silero VAD server beside it.
- Right blue panel: **Voxt.app**, 280 MB for the documented 0.1.0-beta.1 bundle, the program the user opens, installed separately from models.
- The top arithmetic is 2,467,856,503 ÷ 280,000,000 ≈ 8.8, shown as about 9×. The bottom arithmetic adds the largest file and the other eight.
- The legend says blue = a file on disk, amber = a running program.
- Three lines below: the model arrives later, Automatic stops an idle server and its files stay, an app update replaces the bundle and not the model folder.

### Formula

$$ \text{model bytes} = \sum_{f \in \text{files}} \text{size}(f), \qquad \text{ratio} = \frac{\text{model bytes}}{\text{app bytes}} $$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| $f$ | one file of the default speech model | 9 files | `catalog.go:204-214` |
| $\text{size}(f)$ | that file's size | bytes | the catalogue's `File.Size` |
| model bytes | all nine files together | 2,467,856,503 B | this step's sum |
| app bytes | the documented 0.1.0-beta.1 app bundle | 280 MB | `docs/release.md` |
| ratio | the model against the app | 8.8 | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| other eight files | $1{,}161 + 7{,}188 + 142 + 1{,}671{,}853 + 78{,}968 + 330 + 12{,}487 + 2{,}776{,}833$ | 4,548,962 B |
| model bytes | $2{,}463{,}307{,}541 + 4{,}548{,}962$ | 2,467,856,503 B = 2.47 GB |
| ratio | $2{,}467{,}856{,}503 \div 280{,}000{,}000$ | 8.8, shown as 9× |

### Why they are separate

The app ships the code that runs a model: the Go app, the Swift helper and the omni runtime binaries (`docs/release.md`). The omni runtime runs a downloaded model as a separate local server, and Voxt talks to that server (`internal/omni/doc.go:1-5`, `31-35`). The app does not ship the model weights. When the user chooses a speech model, Voxt downloads it into the model library, which defaults to `~/Library/Application Support/SGLang Omni/models` (`hub.go:106-119`). Other ActNow apps can share that library. The 280 MB measurement belongs to the documented 0.1.0-beta.1 build, not to every release.

That gives three different lifetimes. The files stay until someone deletes them. A server process outlives each use by its configured idle interval. An in-app update replaces the app bundle. Mixing them up leads to wrong expectations, such as "updating the app will download the new model" or "deleting a model uninstalls the app".

### Next

Step 2 looks at what exactly is stored: one pinned commit and a file list with hashes.

## Step 2 · A pinned snapshot

> **In one line:** The catalogue names a repository, one commit and each file's size and fingerprint; LFS uses SHA-256, other files use git blob IDs, and the snapshot folder uses the full commit.

### On the stage

- Left blue card: the model's online home, repo `mlx-community/Qwen3-ASR-1.7B-8bit`, and the abbreviated commit label `a8379a2`. A pinned snapshot is one exact version.
- Right file panel: nine files, with the 2.47 GB total summed in Step 1. `model.safetensors` is 2.46 GB, and SHA-256 `bf304b…` is a fingerprint made from its bytes; `vocab.json` is 2.78 MB, and its git blob ID is git's byte fingerprint; seven more files follow.
- Below: the on-disk path `models--mlx-community--Qwen3-ASR-1.7B-8bit` / `snapshots/a8379a2e2f9e313c9292cdf1af4055ab56d50d55`. The folder uses the full commit, not the short label.
- Two lines: a repo can change, so the commit fixes the tested files; a fingerprint catches a changed or broken file.

### Formula

$$ \text{snapshot} = \frac{\$HUB}{\texttt{models--}\langle owner\rangle\texttt{--}\langle name\rangle} \Big/ \texttt{snapshots} \big/ \langle commit\rangle $$

$$ \text{LFS file: }\ \mathrm{SHA256}(\text{file}) = \text{listed hash}, \qquad \text{other file: git blob ID matches} $$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| $\$HUB$ | the model library folder | — | `hub.go:106-119` |
| snapshot | the folder holding one commit's files | — | `hub.go:89-104` |
| file | one listed model file being checked | bytes | the catalogue |
| $\langle owner\rangle$ | the Hub owner | `mlx-community` | the catalogue's `Repo` |
| $\langle name\rangle$ | the Hub repo name | `Qwen3-ASR-1.7B-8bit` | the catalogue's `Repo` |
| $\langle commit\rangle$ | the pinned revision | `a8379a2e…` | `catalog.go:203` |
| hash | an LFS file's SHA-256 fingerprint | 64 hex digits | the catalogue's `File.SHA256` |
| git blob ID | a non-LFS file's content ID | git's blob ID | `hub.go:28-44` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| files | the catalogue lists them | 9 |
| weights | `model.safetensors` | 2,463,307,541 B = 2.46 GB |
| total | Step 1's nine-file sum | 2,467,856,503 B = 2.47 GB |

### Why a commit, not a name

A Hugging Face repo can gain files or change them after a tag moves. The catalogue stores the commit ID, so the app asks for exactly the files it was tested with (`internal/models/catalog.go:105-114`). `Accept` adds other commits the runtimes were checked with: one of them on disk is used instead of downloading the pinned one (`catalog.go:108-111`).

The integrity check is the second half. For a large weight file the Hub keeps the blob in Git Large File Storage (LFS), and its name is the SHA-256 (`catalog.go:84-94`). `Entry` copies the catalogue's SHA-256 only for an LFS file; the download checks that fingerprint, so a truncated or corrupted file produces an error instead of loading. Non-LFS files leave that SHA-256 field empty in the download entry and are checked by their git blob ID (`hub.go:28-44`, `internal/models/models_test.go:235-250`). A hash is only a content fingerprint: matching bytes produce the same ID.

### Next

Step 3 follows one download: what it carries, when it can stop, and what it checks.

## Step 3 · The download job

> **In one line:** One job downloads the model and the models it needs, keeps the bytes when the user cancels, checks each file, and leaves 2 GB free on the disk.

### On the stage

- Top panel: a download bar with the part already here. The red line is the cancel point; the text says the next start continues from there. The total is 2.47 GB.
- Three cards: **room** 2 GB must stay free; **check** every file, using SHA-256 for LFS and git blob IDs for the others, with an error on a mismatch; **needs** the 1.24 MB Silero VAD, a small model that finds speech, in the same job.
- Formula: 2,467,856,503 B + 1,238,323 B = 2,469,094,826 B; 1,238,323 ÷ 2,469,094,826 × 100 ≈ 0.05%.
- **Needs** says the model requires the VAD; cancelling keeps the partial files.

### Formula

$$ \text{job bytes} = \sum_{m \in \text{job}} \sum_{f \in m} \text{size}(f), \qquad \text{VAD share} = \frac{\text{VAD bytes}}{\text{job bytes}} $$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| job | the model plus the models it needs | 2 models | `manager.go:269-281` |
| $m$ | one model in the job | — | the catalogue |
| $f$ | one file of $m$ | — | the catalogue |
| $\text{size}(f)$ | that file's byte count | bytes | the catalogue's `File.Size` |
| VAD bytes | Silero VAD's two files | 1,238,323 B | `catalog.go:352-354` |
| job bytes | everything the job fetches | 2,469,094,826 B | this step |
| VAD share | VAD bytes divided by job bytes | 0.05% | this step's arithmetic |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| model | nine files | 2,467,856,503 B |
| VAD | $463 + 1{,}237{,}860$ | 1,238,323 B |
| job | $2{,}467{,}856{,}503 + 1{,}238{,}323$ | 2,469,094,826 B = 2.47 GB |
| VAD share | $1{,}238{,}323 \div 2{,}469{,}094{,}826$ | 0.050% |

### What cancel keeps

`Manager.Download` builds one job for the model and its missing needs, then starts that job on one goroutine. `run` fetches the models in sequence, not one goroutine per model (`manager.go:254-291`, `319-339`). `Cancel` stops the job while the bytes already written stay in the library (`manager.go:293-303`). A later download sees the partial blobs and continues instead of starting over (`internal/models/manager_test.go:458-482`). A stopped download's `Done` is what it kept (`manager.go:60-63`). A content mismatch is an error; the chapter does not claim an automatic second fetch.

Before it starts, the job leaves free space. `Options.ReserveBytes` is that room; zero means hfhub's 2 GB (`manager.go:33-35`). A full disk fails the download before it fills the last bytes.

The job also carries the models the entry needs. The default speech model lists Silero VAD in `Needs`, so a fresh install downloads both (`catalog.go:201`, `manager.go:269-281`). After the first speech model, the VAD is already on disk and the next job skips it (`manager.go:270-272`). Silero is a small model that finds speech. It takes over the detection job from the energy detector in Ch. 3 Step 6, which found speech from loudness and remains the fallback (`internal/omni/doc.go:77-83`). Step 4 shows Silero's separate server.

### Next

Step 4 turns from the files to the process that reads them.

## Step 4 · The speech server

> **In one line:** Files stay on disk; using a model starts a separate server process, Automatic mode stops it after ten idle minutes, and Settings can change that lifetime.

### On the stage

- Left blue panel: **on disk**, the snapshot folder `Qwen3-ASR-1.7B-8bit`, 2.47 GB, stays after the server exits.
- Right amber panel: **in memory**, `qwen3_asr_server`, loads one ASR model from the folder, and Silero VAD has its own small server. Automatic mode uses ten idle minutes; the next use restarts a stopped server.
- Lower panel: **delete model files** requests unload and then file removal. It does not wait for process exit. A busy server stops after its uses end.
- Footnote: Settings offers 5, 15, 30 or 60 minutes, or keep until quit.

### Formula

$$ t_{\text{exit}} = t_{\text{last use}} + T_{\text{idle}} \quad (T_{\text{idle}} \ge 0), \qquad T_{\text{idle}} < 0 \Rightarrow \text{no idle exit} $$

$$ \text{unable to accept recognition after } 180\ \text{s} \Rightarrow \text{start fails and the process stops} $$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| $t_{\text{last use}}$ | when the last use of the server ends | — | `server.go:60-64`, `215-229` |
| $T_{\text{idle}}$ | the configured unused interval; a negative value disables idle unloading | 10 min in Automatic | `settings/models.go:105-135`, `server.go:231-251` |
| $t_{\text{exit}}$ | when an unused server stops | $t_{\text{last use}} + T_{\text{idle}}$ | `DefaultIdleTimeout`, `runtime.go:31` |
| 180 s | the readiness timeout, not a promised loading time | seconds | `DefaultStartTimeout`, `runtime.go:30`, `44-46` |

### The numbers on the stage

| Setting or event | What the code does |
|---|---|
| Automatic | $T_{\text{idle}} = 10$ min |
| Settings | 5, 15, 30 or 60 min; keep until quit disables the idle timer |
| Next use after a stop | start the server again |
| Unable to accept recognition 180 s = 3 min after starting | fail the start and stop the process |

### Why a process at all

The runtime binaries live inside the app bundle, but a loaded model is not the app. `Runtime` starts a server when a model is acquired and supervises it (`runtime.go:122-143`, `191-228`). The server reads the model from its snapshot folder; that is why the files must stay while the process runs. Silero VAD has its own `silero_vad_server`, started on first use beside the ASR server (`internal/omni/models.go:60-63`, `internal/omni/vad.go:23-44`).

Only one speech model runs at a time. Taking a speech model retires the other speech models' servers, and they stop once their uses end (`runtime.go:191-228`). Automatic leaves the runtime's ten-minute default. Settings passes `KeepLoaded` to `SetIdleTimeout`: 5, 15, 30 or 60 minutes, or a negative duration for keep until quit (`models_controller.go:280-306`, `settings/models.go:105-135`). The first load can compile Metal kernels; the 180-second timeout kills a server that never becomes ready (`runtime.go:29-30`, `44-46`).

Deleting a model is not only a disk operation. `Library.Delete` calls `Unload`, then immediately requests `models.Manager.Delete`; it does not wait on the server's `stopped` channel (`internal/local/library.go:70-82`, `runtime.go:249-266`). `Unload` retires the server. An idle process stops asynchronously, while a busy process stops after its uses end (`server.go:215-229`, `253-287`). `unloadOmni` also retires a speech model whose draft is deleted (`models_omni.go:293-316`). The delete request then goes through external actnowkit; this chapter does not claim whether deletion of a busy model succeeds or leaves files behind (`internal/models/claims.go:40-54`).

### Next

Step 5 turns to the third thing: the app bundle and its updater.

## Step 5 · The app updates on its own track

> **In one line:** With Voxt's signed update feed, the updater replaces the app and a restart finishes; feedless releases offer an external installer, and neither path touches the model folder.

### On the stage

- Left panel: the in-app route with an update list. The constructed example has `Voxt 2.0` running and `Voxt 2.1` on disk, and the updater replaces the bundle.
- Right panel: the installer route without an update list. The `Voxt installer` is downloaded to disk and installed by the user; the app does not replace itself.
- Middle strip: **the model folder**, `SGLang Omni/models`, 2.47 GB, untouched by both update routes.
- Bottom flow, **until restart**: the old version keeps running → the helper on disk is already the new one → the app's helper manager refuses it because its version does not match the running app.

### Formula

$$ \text{in-app update done} \iff \text{bundle replaced} \land \text{app restarted} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| in-app update done | the new version can take over | this step's completion condition |
| bundle replaced | `Voxt 2.1` has replaced `Voxt 2.0` on disk | the constructed example on the stage |
| app restarted | the new process has replaced the running old process | `updates.go:245-253` |

### The numbers on the stage

| Bundle replaced | App restarted | Result |
|---|---|---|
| Yes, `Voxt 2.1` is on disk | No, `Voxt 2.0` is still running | Not done; a card asks for a restart |
| Yes | Yes | The in-app update is done |

### The update's parts

| Part | What happens | Where it comes from |
|---|---|---|
| check | every 24 hours by default; the user can disable automatic checks | `Voxt/updates.go:68-74`, `179-209`; `updates_github.go:361-387` |
| install | manual by default; optional automatic installation can install without asking | `updates.go:4-6`, `179-209`; `docs/release.md:406-410` |
| replace with a feed | the updater replaces `Voxt.app` while the old version runs, using a delta when available | `updates.go:12-16` |
| fallback without a feed | a release build cannot update itself; it offers the disk image or release page | `updates_github.go:3-18`, `361-387` |
| mismatch | the helper on disk is the new version's; the supervisor does not start it | `updates.go:12-16` |
| restart | a card offers Restart Voxt; a restart finishes an in-app update | `updates.go:245-253` |
| watch | the running app looks for an installed update every minute | `updates.go:114-116`, `213-228` |
| source | signed feed, GitHub fallback, or no updater | `internal/updates/updates.go:13-22`, `main.go:127-136` |

### Why the restart

With a signed feed, the updater replaces files on disk, but the running process keeps the code it started with. The helper is a separate program on disk, and after the swap it belongs to the new version. The supervisor is the app-side manager that starts the helper. It compares the helper with the running app and refuses to start a mismatched one (`updates.go:12-16`). That is why transcription can stop working, or a card appears, until the app restarts.

Only release builds have update support, so a development build does not replace itself. A feedless release uses the GitHub fallback and gives the user an external installer instead (`updates_github.go:3-18`). The beta channel is a switch in Settings, defaulting to on while the running version is itself a beta (`updates.go:18-24`, `187-203`). Release-built beta versions and stable versions can both use this channel logic.

The model folder plays no part here. An app update replaces or downloads `Voxt.app`; it does not download, delete or move the model files. The other direction is also true: deleting a model does not change the app. The `2.0 → 2.1` labels are a constructed example, not a measured release update.

### Next

Step 6 puts the three mechanisms into one table.

## Step 6 · Three things, three endings

> **In one line:** A download ends when the content checks pass, an unload ends when the process exits, and an in-app update ends after the app restarts; none of the three does another's job.

### On the stage

| Thing | Action | Done when |
|---|---|---|
| model files | download | every content check passes, files sit in the library |
| speech server | unload | the process exits, memory is freed |
| app bundle | in-app update | the bundle is replaced, the app restarts |

- Three boundary lines: updating the app downloads no model; stopping the server deletes no file; deleting a model updates no app.
- The closing panel shows a meeting with two candidate sound sources, the microphone and other apps, and asks which sounds Voxt records.

### Formula

$$ \text{download done} \iff \text{checks pass} \land \text{files in library} $$
$$ \text{unload done} \iff \text{server process exited} $$
$$ \text{in-app update done} \iff \text{bundle replaced} \land \text{app restarted} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| download done | the completion condition for usable model files | Step 3 |
| checks pass | every file matches its content fingerprint | Steps 2 and 3 |
| files in library | the files are in the model library on disk | Steps 1 and 2 |
| unload done | the completion condition for freeing the server's memory | Step 4 |
| server process exited | the program running the model has stopped | Step 4 |
| in-app update done | the new version can take over | Step 5 |
| bundle replaced | the new app bundle has replaced the old one on disk | Step 5 |
| app restarted | the new process has replaced the old process | Step 5 |

### The numbers on the stage

| Action | Completion condition used on the stage |
|---|---|
| download | the content checks pass, and the files are in the library |
| unload | the server process exits, which frees its memory |
| in-app update | `Voxt 2.1` has replaced `Voxt 2.0`, and the app has restarted |

### Why the boundaries matter

Each mechanism has its own trigger and success test. A download can fail from a bad network, a full disk or a content mismatch (`internal/models/manager.go:319-384`). An active use is not an unload failure: the server stops taking new work and waits for that use, with no fixed time bound (`runtime.go:249-266`, `server.go:215-229`). A feed-based update can leave a refused helper after the swap, which a restart fixes (`updates.go:12-16`). A feedless release takes the external-installer path instead.

Keeping them separate also explains the two expectations from Step 1. Updating the app cannot bring a new model, because the model is not in the bundle. Deleting a model cannot free the app's own disk space, because the app is not in the model library. The user sees different toasts and cards for these mechanisms.

This chapter covers the default local ASR snapshot, its Silero dependency and the two release-update paths. It does not measure download speed, run a real update or claim the 280 MB size for releases other than 0.1.0-beta.1.

### Next

The model, server and app now have separate lifetimes. Chapter 12 asks what Voxt records for a meeting.
