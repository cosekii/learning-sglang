## Step 1 · Three things to account for

> **In one line:** This constructed request sends prepared text, one model name and one API key to the service selected by its address.

### On the stage

- The blue card holds Chapter 4's raw text, “Good morning.” Blue means text content throughout this chapter.
- The middle card holds `demo-model`, a constructed model ID. The model name selects a model at the service; Voxt does not upload model weights in this request.
- The orange card holds a masked teaching API key. An API key is a secret that identifies or authorizes this client to the configured service. The real request uses the complete key, not the masked display.
- The three arrows meet at one configured service. They are parts of one request, not three separate requests.
- `api.example.com` is a constructed external host. The subtitle states this example's consequence: the words and secret leave this Mac. The example supposes that this setup has a key; some local and custom services allow an empty key.

### Formula

$$
N=T+M+K
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $N$ | Kinds of request content counted here | Calculated in this step |
| $T$ | Prepared text content | One constructed input |
| $M$ | Model name | One constructed `demo-model` |
| $K$ | API key | One configured key in this example |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Request items to account for | $1+1+1$ | 3 |

This is a count of content kinds, not bytes, cost or latency. The endpoint determines the destination; it is not a fourth item inside the request.

### Request boundary

`partRequest` gives the backend a message list. `OpenAI.body` writes that list and the model into the JSON body. `OpenAI.send` puts a non-empty key into the HTTP `Authorization` header. The next steps unpack those parts.

The chapter follows the ordinary OpenAI-compatible Chat Completions route. Voxt also supports a Responses API and a signed-in ChatGPT route; their different fields are outside this opening example.

### Next

Three things have one destination. Next, compare an address on this Mac with an address on another computer.

### Sources

Public baseline: `sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`; paths are relative to that repository.

- Session messages passed to the language model: `Voxt/internal/session/headstart.go:349-352`.
- Model and messages in the request body: `Voxt/internal/llm/openai.go:73-85,103-104`.
- Request destination and authorization header: `Voxt/internal/llm/openai.go:177-211`; `Voxt/internal/llm/openai_http.go:22-25,38-66`.
- Key retrieval when a session opens a provider: `Voxt/remote_link.go:189-200`.
- Key-optional presets, including custom and local services: `Voxt/internal/llm/presets.json:6-7,14,20`.

## Step 2 · The address picks the destination

> **In one line:** Changing only the request address can keep the same three parts on this Mac or send them to another computer.

### On the stage

- The top card repeats Step 1's text, model name and key. Only the address changes in the two panels.
- A host is the computer named in an address. The panels show only host portions so this step can focus on the destination.
- Address A shows `127.0.0.1`, a loopback address: it refers to this same machine. The public Ollama preset is `http://localhost:11434/v1`, also a local address. This constructed panel uses `127.0.0.1` and omits the scheme, port and path.
- Address B shows `api.example.com`, a constructed host on another computer. Both services are assumed reachable.
- The arrows are alternatives. One setup selects one address, so the request has one destination; Voxt does not send both copies.
- Both examples carry a key to keep the comparison unchanged. A key-optional local service can instead send no key.

### The numbers on the stage

| Quantity | Where it comes from | Result |
|---|---|---:|
| Candidate addresses | Two constructed panels | 2 |
| Destinations for one setup | One selected address | 1 |

These counts describe the drawing, not a Voxt limit. Voxt can store more setups.

### Address boundaries

An external address means that the text and any configured key leave this Mac. A loopback address keeps the HTTP exchange on this Mac; it does not mean the model runs inside Voxt's process. The local model server is a separate program.

Voxt also distinguishes internet destinations from private-network and local-name destinations. That classification does not perform a DNS lookup. Those extra address classes are outside this two-panel comparison. A private-network address can still leave this Mac.

### Next

The address chooses the destination. Next, open one setup and see where Voxt gets its full key.

### Sources

Public baseline: `sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`; paths are relative to that repository.

- Address resolution and allowed URL forms: `Voxt/internal/llm/presets.go:92-138`.
- Loopback, private-network and local-name classification without DNS lookup: `Voxt/internal/providers/providers.go:92-117`.
- The resolved address used for the chat request: `Voxt/internal/llm/openai.go:177-211`.
- The HTTP request sent to that URL: `Voxt/internal/llm/openai_http.go:22-38,63-71`.
- Ollama's public local preset and optional key: `Voxt/internal/llm/presets.json:6`.

## Step 3 · Settings and Keychain

> **In one line:** Voxt saves the setup's address and model separately from its complete API key.

### On the stage

- `demo` is a constructed setup ID. Its saved settings contain the constructed address and model name, but no API key.
- Keychain is the Mac's password store. Voxt uses a generic-password item in the login Keychain, under service `VoxtNew`.
- The item's account name is `llm.demo`. Here `llm` identifies a language-model setup and `demo` is its ID. The real item holds the complete key; only the teaching display masks it.
- The final lines state the access boundary: any process running as this user can read the key without another prompt. This item is not restricted to Voxt alone.

### Item-name derivation

For a language-model setup, Voxt joins the kind and ID with a dot:

`Account(LLM, "demo") = "llm." + "demo" = "llm.demo"`

Speech-recognition setups use `asr.<id>` instead. They are outside this chapter's request.

### Where the settings live

The settings are a versioned JSON document under `settings:app` in the store's `documents` table, not a separate `settings.json` file. A provider entry has `id`, optional `endpoint`, optional `model` and generation settings. Its API key is not a field in that entry.

When the dialog saves a newly typed key, Voxt writes the Keychain item first and then updates the setup. `Set` sends the secret to `/usr/bin/security` on standard input, not in the process arguments.

### Read and access boundaries

Opening a language-model connection reads `llm.<id>` in the background and passes the complete key to the provider client. A missing item reads as an empty key. A later step follows that key into the request.

The Keychain item has no application access list. The `/usr/bin/security` tool and other processes of the same user can read it without a prompt. Keychain storage therefore does not protect the key from another process already running as this user.

### Next

The saved setup supplies the address and model, and the Keychain supplies the key. Next, put the text and model into the request body.

### Sources

Public baseline: `sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`; paths are relative to that repository.

- Settings document and storage boundary: `Voxt/internal/settings/settings.go:1-5`; `Voxt/internal/settings/service.go:16`.
- Provider fields and excluded key: `Voxt/internal/settings/providers.go:17-28,39-43`.
- Keychain account naming: `Voxt/internal/providers/providers.go:35-37`.
- Keychain service, access boundary and background-call requirement: `Voxt/internal/secrets/secrets.go:1-19,34-49`.
- Key retrieval and saving through standard input: `Voxt/internal/secrets/secrets.go:85-117`.
- Save order and setup update: `Voxt/remote_dialog_controller.go:229-274`.
- Session-time key retrieval: `Voxt/remote_link.go:189-200`.
