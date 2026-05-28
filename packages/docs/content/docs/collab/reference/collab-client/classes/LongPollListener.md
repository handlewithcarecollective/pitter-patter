---
title: LongPollListener
---

# Class: LongPollListener

Defined in:
[packages/collab-client/src/index.ts:140](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L140)

A CommitsListener that polls an endpoint for remote updates to a document. Intended to be used with
an remote long polling endpoint that calls a Collab Authority's
[listenForCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#listenforcommit)
function to efficiently listen for updates.

## Constructors

### Constructor

```ts
new LongPollListener(url: URL, options?: LongPollListenerOptions): LongPollListener;
```

Defined in:
[packages/collab-client/src/index.ts:147](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L147)

#### Parameters

##### url

`URL`

the url that polling requests will be sent to

##### options?

[`LongPollListenerOptions`](/docs/collab/reference/collab-client/interfaces/LongPollListenerOptions)
= `{}`

#### Returns

`LongPollListener`

## Methods

### listen()

```ts
listen(editorState: EditorState, options?: {
  signal?: AbortSignal;
}): AsyncGenerator<Commit[], void, unknown>;
```

Defined in:
[packages/collab-client/src/index.ts:162](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L162)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncGenerator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[], `void`,
`unknown`\>

---

### update()

```ts
update(headers: HeadersInit): void;
```

Defined in:
[packages/collab-client/src/index.ts:158](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L158)

Update the headers sent with long polling requests.

#### Parameters

##### headers

`HeadersInit`

#### Returns

`void`
