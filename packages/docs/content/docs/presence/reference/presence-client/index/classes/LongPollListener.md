---
title: LongPollListener
---

# Class: LongPollListener

Defined in:
[index.ts:116](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L116)

An [IndicatorListener](/docs/presence/reference/presence-client/index/interfaces/IndicatorListener)
that polls an endpoint for remote updates to a document's presence state. Intended to be used with
an remote long polling endpoint that call a Presence Authority's
[listenForPresence](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#listenforpresence)
function to efficiently listen for updates.

## Constructors

### Constructor

```ts
new LongPollListener(url: URL, options?: LongPollListenerOptions): LongPollListener;
```

Defined in:
[index.ts:123](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L123)

#### Parameters

##### url

`URL`

the url that polling requests will be sent to

##### options?

[`LongPollListenerOptions`](/docs/presence/reference/presence-client/index/interfaces/LongPollListenerOptions)
= `{}`

#### Returns

`LongPollListener`

## Methods

### listen()

```ts
listen(clientId: string, options?: {
  signal?: AbortSignal;
}): AsyncGenerator<Record<string, PresenceIndicator>, void, unknown>;
```

Defined in:
[index.ts:138](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L138)

#### Parameters

##### clientId

`string`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncGenerator`\<`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/index/interfaces/PresenceIndicator)\>,
`void`, `unknown`\>

---

### update()

```ts
update(headers: Record<string, string>): void;
```

Defined in:
[index.ts:134](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L134)

Update the headers sent with long polling requests.

#### Parameters

##### headers

`Record`\<`string`, `string`\>

#### Returns

`void`
