---
title: LongPollListenerOptions
---

# Interface: LongPollListenerOptions

Defined in:
[packages/collab-client/src/index.ts:122](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L122)

## Properties

### fetch?

```ts
optional fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Defined in:
[packages/collab-client/src/index.ts:132](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L132)

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
optional headers?: HeadersInit;
```

Defined in:
[packages/collab-client/src/index.ts:128](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L128)

Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty
object.
