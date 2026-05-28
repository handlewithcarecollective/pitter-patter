---
title: LongPollListener
---

# Class: LongPollListener

Defined in: [packages/collab-client/src/index.ts:145](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L145)

A CommitsListener that polls an endpoint for remote updates to a document. Intended to be used
with an remote long polling endpoint that calls a Collab Authority's [listenForCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#listenforcommit)
function to efficiently listen for updates.

## Constructors

### Constructor

```ts
new LongPollListener(url: URL, options?: LongPollListenerOptions): LongPollListener;
```

Defined in: [packages/collab-client/src/index.ts:152](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L152)

#### Parameters

##### url

`URL`

the url that polling requests will be sent to

##### options?

[`LongPollListenerOptions`](/docs/collab/reference/collab-client/interfaces/LongPollListenerOptions) = `{}`

#### Returns

`LongPollListener`

## Methods

### listen()

```ts
listen(editorState: EditorState, options?: {
  signal?: AbortSignal;
}): AsyncGenerator<Commit[], void, unknown>;
```

Defined in: [packages/collab-client/src/index.ts:167](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L167)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncGenerator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[], `void`, `unknown`\>

***

### update()

```ts
update(headers: HeadersInit): void;
```

Defined in: [packages/collab-client/src/index.ts:163](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L163)

Update the headers sent with long polling requests.

#### Parameters

##### headers

`HeadersInit`

#### Returns

`void`
