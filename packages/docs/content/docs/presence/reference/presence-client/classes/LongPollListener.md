---
title: LongPollListener
---

# Class: LongPollListener

Defined in: [index.ts:121](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L121)

An [IndicatorListener](/docs/presence/reference/presence-client/interfaces/IndicatorListener) that polls an endpoint for remote updates to a document's presence state. Intended to be used
with an remote long polling endpoint that call a Presence Authority's [listenForPresence](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#listenforpresence) 
function to efficiently listen for updates.

## Constructors

### Constructor

```ts
new LongPollListener(url: URL, options?: LongPollListenerOptions): LongPollListener;
```

Defined in: [index.ts:128](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L128)

#### Parameters

##### url

`URL`

the url that polling requests will be sent to

##### options?

[`LongPollListenerOptions`](/docs/presence/reference/presence-client/interfaces/LongPollListenerOptions) = `{}`

#### Returns

`LongPollListener`

## Methods

### listen()

```ts
listen(clientId: string, options?: {
  signal?: AbortSignal;
}): AsyncGenerator<Record<string, PresenceIndicator>, void, unknown>;
```

Defined in: [index.ts:143](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L143)

#### Parameters

##### clientId

`string`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncGenerator`\<`Record`\<`string`, [`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>, `void`, `unknown`\>

***

### update()

```ts
update(headers: Record<string, string>): void;
```

Defined in: [index.ts:139](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L139)

Update the headers sent with long polling requests.

#### Parameters

##### headers

`Record`\<`string`, `string`\>

#### Returns

`void`
