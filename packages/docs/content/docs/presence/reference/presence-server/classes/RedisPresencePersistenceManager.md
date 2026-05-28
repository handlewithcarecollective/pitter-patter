---
title: RedisPresencePersistenceManager
---

# Class: RedisPresencePersistenceManager

Defined in:
[index.ts:103](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L103)

Stores and retrieves presence state in the specified redis cluster

## Constructors

### Constructor

```ts
new RedisPresencePersistenceManager(config: RedisPresencePersistenceManagerConfig): RedisPresencePersistenceManager;
```

Defined in:
[index.ts:106](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L106)

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

Defined in:
[index.ts:112](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L112)

#### Returns

`Promise`\<`void`\>

---

### getIndicators()

```ts
getIndicators(docId: string): Promise<{
[k: string]: any;
}>;
```

Defined in:
[index.ts:125](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L125)

#### Parameters

##### docId

`string`

#### Returns

`Promise`\<\{ \[`k`: `string`\]: `any`; \}\>

---

### saveIndicator()

```ts
saveIndicator(docId: string, indicator: PresenceIndicator): Promise<void>;
```

Defined in:
[index.ts:116](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L116)

#### Parameters

##### docId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>
