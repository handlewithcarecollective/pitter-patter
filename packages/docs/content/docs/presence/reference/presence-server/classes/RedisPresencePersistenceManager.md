---
title: RedisPresencePersistenceManager
---

# Class: RedisPresencePersistenceManager

Defined in: [index.ts:116](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L116)

Stores and retrieves presence state in the specified redis cluster

## Constructors

### Constructor

```ts
new RedisPresencePersistenceManager(config: RedisPresencePersistenceManagerConfig): RedisPresencePersistenceManager;
```

Defined in: [index.ts:119](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L119)

#### Parameters

##### config

[`RedisPresencePersistenceManagerConfig`](/docs/presence/reference/presence-server/interfaces/RedisPresencePersistenceManagerConfig)

#### Returns

`RedisPresencePersistenceManager`

## Methods

### connect()

```ts
connect(): Promise<void>;
```

Defined in: [index.ts:125](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L125)

#### Returns

`Promise`\<`void`\>

***

### getIndicators()

```ts
getIndicators(docId: string): Promise<{
[k: string]: any;
}>;
```

Defined in: [index.ts:142](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L142)

#### Parameters

##### docId

`string`

#### Returns

`Promise`\<\{
\[`k`: `string`\]: `any`;
\}\>

***

### saveIndicator()

```ts
saveIndicator(docId: string, indicator: PresenceIndicator): Promise<void>;
```

Defined in: [index.ts:129](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L129)

#### Parameters

##### docId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>
