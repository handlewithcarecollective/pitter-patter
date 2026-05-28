---
title: RedisBroadcastManagerConfig
---

# Interface: RedisBroadcastManagerConfig

Defined in:
[packages/collab-server/src/index.ts:210](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L210)

## Properties

### redisUrl

```ts
redisUrl: string;
```

Defined in:
[packages/collab-server/src/index.ts:214](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L214)

the url for your Redis cluster

---

### timeout?

```ts
optional timeout?: number;
```

Defined in:
[packages/collab-server/src/index.ts:219](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L219)

the maximum time the broadcast manager should listen for changes to a document before returning an
empty result
