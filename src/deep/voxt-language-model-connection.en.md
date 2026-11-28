## Step 1 · Three things to account for

> **In one line:** This constructed request sends prepared text, one model name and one API key to the service selected by its address.

### On the stage

- The picture builds in order: the empty service box appears first, then the three cards arrive one at a time, and the arrows and the `1 + 1 + 1` count appear last.
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

- The picture builds in order: the top card, then both address panels with their hosts, then each panel's destination result, then the selection of address B, and finally the `2 · 1` count.
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

- The picture builds in order: two empty boxes, then the setup name, address and model name fill the settings box one at a time, the `NO API KEY HERE` line appears, and finally the Keychain item gains its name and the full key.
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

## Step 4 · Text and model in the body

> **In one line:** The request body names the model and carries the text inside its message list.

### On the stage

- The picture builds in order: the two source cards and an empty body, then the model name enters as the `model` field, then the text enters as the `messages` field, and the no-key line appears last.
- The neutral model card and blue text card repeat Step 1's values. Their arrows point to the fields that receive them.
- The body is the request's main content. `model` contains `demo-model`; `messages` contains “Good morning.” within an abbreviated message list.
- The orange line excludes the API key from this body. The next step shows its separate location.
- The brackets and ellipses mark a constructed, abbreviated body, not complete JSON. Generation and other request settings are omitted.

### Request construction

`partRequest` supplies an already assembled `llm.Request.Messages` list. This chapter does not assemble that list; chapter 6 covers the roles, instructions and cleanup inputs inside it.

For the ordinary OpenAI-compatible Chat Completions route, `chat` uses the request's model or falls back to the setup's default. `body` copies each message's `role` and `content`, and writes `model` and `messages` into a map. Other request settings can add fields to the same map.

`send` serializes that map as JSON, uses HTTP `POST`, and sets `Content-Type: application/json`. The destination is the resolved base address plus `/chat/completions`. The API key is not part of this map.

### Scope

The picture follows Chat Completions only. Voxt's Responses API converts the body differently, and its signed-in route has additional rules. Those alternatives and all generation fields are outside this step.

### Next

The text and model now have their body fields. Next, attach the Keychain key without putting it in the message content.

### Sources

Public baseline: `sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`; paths are relative to that repository.

- Assembled messages supplied to the backend: `Voxt/internal/session/headstart.go:349-352`.
- Message roles and content, model fallback and body fields: `Voxt/internal/llm/openai.go:73-85,103-104,177-211`.
- Chat Completions path selection: `Voxt/internal/llm/responses.go:33-39`.
- JSON serialization, POST and content type: `Voxt/internal/llm/openai_http.go:22-50`.
- The key's separate header: `Voxt/internal/llm/openai_http.go:51-65`.

## Step 5 · The key enters the header

> **In one line:** Voxt puts the complete key after `Bearer` in the `Authorization` header, outside the request body.

### On the stage

- The picture builds in order: the Keychain item and a request whose body is already finished, then the `Authorization` label, the word `Bearer`, and finally the key flying from the Keychain into the header. The body never holds a key in any phase.
- The left card repeats Step 3's constructed Keychain item, `llm.demo`. Voxt reads the complete key from this item when it opens the language-model connection.
- `Authorization` is the header's name. `Bearer` identifies the authentication scheme. One space separates `Bearer` from the key.
- The teaching display masks the key. The real header value contains the complete key, not the ellipsis or a shortened key.
- The same request also has the body from Step 4. Its model and messages remain separate from this header. Both parts go to the one selected address from Step 2.

### Header construction and empty keys

Voxt constructs the value as `"Bearer " + token` and sets it with `req.Header.Set`. The saved key does not include the word `Bearer` or the separating space.

An empty key produces no `Authorization` header. A preset that requires a key rejects the request before transport. A preset with an optional key can send the request without this header. Signed-in token routes have extra rules outside this chapter.

### Transport and error boundaries

Keychain storage does not keep the key on this Mac after Voxt sends a request to an external service. The selected service receives the header, and the request's text travels in the body.

Voxt's public setup guide permits HTTP for API-key services but warns that HTTP sends the API key and text without encryption. Use HTTPS for an external service. Header placement and error redaction do not make HTTP confidential.

A server can quote a key in its error response. `Chat` calls `scrub`, which replaces known secrets in structured error parameters with `[key]`. This limits what the session history retains when Voxt records that error.

### Next: Chapter 6

The connection now has its destination, body and authorization. This chapter leaves the inside of `messages` assembled but unexplained. Chapter 6, **The text workshop**, explains the roles, instructions, cleanup inputs and output conventions inside that list.

### Sources

Public baseline: `sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`; paths are relative to that repository.

- Session-time key retrieval: `Voxt/remote_link.go:189-200`.
- Required and optional keys before transport: `Voxt/internal/llm/openai.go:177-190`.
- `Bearer` prefix, empty-key behavior and header placement: `Voxt/internal/llm/openai_http.go:22-25,51-66`.
- HTTP plaintext warning: `docs/get_started/voxt-tutorials/en/byok.md:17-19`; Chinese: `docs/get_started/voxt-tutorials/byok.md:17-19`.
- Error scrubbing: `Voxt/internal/llm/openai.go:154-174`; rejection, malformed-body and stream cases: `Voxt/internal/llm/openai_test.go:241-269`.
- Message assembly for Chapter 6: `Voxt/internal/session/headstart.go:349-352`.
