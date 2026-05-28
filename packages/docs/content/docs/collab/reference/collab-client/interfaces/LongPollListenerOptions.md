---
title: LongPollListenerOptions
---

# Interface: LongPollListenerOptions

Defined in: [packages/collab-client/src/index.ts:128](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L128)

## Properties

### fetch?

```ts
optional fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Defined in: [packages/collab-client/src/index.ts:138](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L138)

The fetch method to use when making requests. Defaults to the global fetch method.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

##### input

`URL` \| `RequestInfo`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

***

### headers?

```ts
optional headers?: HeadersInit;
```

Defined in: [packages/collab-client/src/index.ts:134](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L134)

Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty object.
