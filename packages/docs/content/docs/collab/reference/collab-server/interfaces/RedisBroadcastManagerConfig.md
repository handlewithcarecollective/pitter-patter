---
title: RedisBroadcastManagerConfig
---

# Interface: RedisBroadcastManagerConfig

Defined in: [packages/collab-server/src/index.ts:231](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L231)

## Properties

### redisUrl

```ts
redisUrl: string;
```

Defined in: [packages/collab-server/src/index.ts:235](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L235)

the url for your Redis cluster

***

### timeout?

```ts
optional timeout?: number;
```

Defined in: [packages/collab-server/src/index.ts:240](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L240)

the maximum time the broadcast manager should listen for changes
to a document before returning an empty result
