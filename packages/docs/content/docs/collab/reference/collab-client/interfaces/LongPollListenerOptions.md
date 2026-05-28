---
title: LongPollListenerOptions
---

# Interface: LongPollListenerOptions

Defined in: [packages/collab-client/src/index.ts:127](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L127)

## Properties

### fetch?

```ts
optional fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Defined in: [packages/collab-client/src/index.ts:137](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L137)

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

Defined in: [packages/collab-client/src/index.ts:133](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L133)

Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty object.
