---
title: LongPollListenerOptions
---

# Interface: LongPollListenerOptions

Defined in: [index.ts:103](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L103)

## Properties

### fetch?

```ts
optional fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Defined in: [index.ts:113](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L113)

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
optional headers?: Record<string, string>;
```

Defined in: [index.ts:109](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L109)

Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty object.
