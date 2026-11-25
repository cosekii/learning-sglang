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
