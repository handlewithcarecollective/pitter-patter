---
title: PresenceAuthority
---

# Class: PresenceAuthority

Defined in: [index.ts:60](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L60)

The PresenceAuthority manages most of Pitter Patter's server side presence operations.

You create endpoints that call the appropriate PresenceAuthority functions to integrate with
a PresenceClient.

A PresenceAuthority is designed to be stateless, so you can create a new one on every server,
lambda, or cloud function instance.

## Constructors

### Constructor

```ts
new PresenceAuthority(config: PresenceAuthorityConfig): PresenceAuthority;
```

Defined in: [index.ts:64](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L64)

#### Parameters

##### config

[`PresenceAuthorityConfig`](/docs/presence/reference/presence-server/interfaces/PresenceAuthorityConfig)

#### Returns

`PresenceAuthority`

## Methods

### listenForPresence()

```ts
listenForPresence(
   docId: string, 
   excludeClientId: string, 
   refs?: Record<string, string>): Promise<{
[k: string]: PresenceIndicator;
}>;
```

Defined in: [index.ts:81](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L81)

Listens for remote changes to a document's presence state and returns when changes
are found or after a timeout specified in the PresenceAuthority's `broadcastManager`.

#### Parameters

##### docId

`string`

##### excludeClientId

`string`

##### refs?

`Record`\<`string`, `string`\> = `{}`

#### Returns

`Promise`\<\{
\[`k`: `string`\]: [`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator);
\}\>

***

### updatePresence()

```ts
updatePresence(docId: string, indicator: PresenceIndicator): Promise<void>;
```

Defined in: [index.ts:72](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-server/src/index.ts#L72)

saves new presence state for a client and notifies and listners of the update.

#### Parameters

##### docId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>
