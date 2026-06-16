---
title: LongPollListenerOptions
---

# Interface: LongPollListenerOptions

Defined in:
[index.ts:98](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L98)

## Properties

### fetch?

```ts
optional fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Defined in:
[index.ts:108](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L108)

The fetch method to use when making requests. Defaults to the global fetch method.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

##### input

`URL` \| `RequestInfo`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

---

### headers?

```ts
optional headers?: Record<string, string>;
```

Defined in:
[index.ts:104](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L104)

Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty
object.
