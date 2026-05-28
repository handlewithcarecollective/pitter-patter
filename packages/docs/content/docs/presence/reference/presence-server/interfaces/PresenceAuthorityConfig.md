---
title: PresenceAuthorityConfig
---

# Interface: PresenceAuthorityConfig

Defined in:
[index.ts:22](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L22)

## Properties

### broadcastManager

```ts
broadcastManager: {
  broadcastIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
  listenForPresence: (docId: string, clientId: string, refs: Record<string, string>) =>
    Promise<void>;
}
```

Defined in:
[index.ts:33](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L33)

Creates listeners for updates to presence state and sends notifications to listeners when presence
state is updated. See
[RedisPresenceBroadcastManager](/docs/presence/reference/presence-server/classes/RedisPresenceBroadcastManager)

#### broadcastIndicator

```ts
broadcastIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
```

##### Parameters

###### docId

`string`

###### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

##### Returns

`Promise`\<`void`\>

#### listenForPresence

```ts
listenForPresence: (docId: string, clientId: string, refs: Record<string, string>) => Promise<void>;
```

##### Parameters

###### docId

`string`

###### clientId

`string`

###### refs

`Record`\<`string`, `string`\>

##### Returns

`Promise`\<`void`\>

---

### persistenceManager

```ts
persistenceManager: {
  getIndicators: (docId: string) => Promise<Record<string, PresenceIndicator>>;
  saveIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
}
```

Defined in:
[index.ts:26](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L26)

Saves and retrieves presence state. For example, see the
[RedisPresencePersistenceManager](/docs/presence/reference/presence-server/classes/RedisPresencePersistenceManager)

#### getIndicators

```ts
getIndicators: (docId: string) => Promise<Record<string, PresenceIndicator>>;
```

##### Parameters

###### docId

`string`

##### Returns

`Promise`\<`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)\>\>

#### saveIndicator

```ts
saveIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
```

##### Parameters

###### docId

`string`

###### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

##### Returns

`Promise`\<`void`\>
