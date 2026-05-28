---
title: LongPollListener
---

# Class: LongPollListener

Defined in:
[packages/collab-client/src/index.ts:146](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L146)

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
[packages/collab-client/src/index.ts:153](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L153)

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
[packages/collab-client/src/index.ts:168](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L168)

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
[packages/collab-client/src/index.ts:164](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L164)

Update the headers sent with long polling requests.

#### Parameters

##### headers

`HeadersInit`

#### Returns

`void`
