---
title: PresenceClientConfig
---

# Interface: PresenceClientConfig

Defined in: [config.ts:5](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/config.ts#L5)

## Properties

### listener

```ts
listener: IndicatorListener;
```

Defined in: [config.ts:20](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/config.ts#L20)

***

### receiveIndicators

```ts
receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
```

Defined in: [config.ts:19](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/config.ts#L19)

Receives an array of indicators and merges them into your local editor state. This function should
use [receivePresenceTransaction](https://pitter-patter.dev/docs/presence/reference/presence-client/functions/receivePresenceTransaction)
to merge the indicators into the local editor state.

#### Parameters

##### indicators

`Record`\<`string`, [`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>

#### Returns

`void`

***

### sendIndicator

```ts
sendIndicator: (clientId: string, indicator: PresenceIndicator) => Promise<void>;
```

Defined in: [config.ts:13](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/config.ts#L13)

Sends local indicator state to a remote server to be merged into the remote presence state.
The endpoint this function hits is defined by you, and should call the 
PresenceAuthority's [updatePresence](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#updatepresence) 
function.

#### Parameters

##### clientId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>

***

### userId

```ts
userId: string;
```

Defined in: [config.ts:6](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/config.ts#L6)
