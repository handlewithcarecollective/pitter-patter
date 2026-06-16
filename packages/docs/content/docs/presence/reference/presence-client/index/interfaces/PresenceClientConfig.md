---
title: PresenceClientConfig
---

# Interface: PresenceClientConfig

Defined in:
[config.ts:10](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L10)

## Properties

### listener

```ts
listener: IndicatorListener;
```

Defined in:
[config.ts:25](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L25)

---

### receiveIndicators

```ts
receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
```

Defined in:
[config.ts:24](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L24)

Receives an array of indicators and merges them into your local editor state. This function should
use
[receivePresenceTransaction](https://pitter-patter.dev/docs/presence/reference/presence-client/functions/receivePresenceTransaction)
to merge the indicators into the local editor state.

#### Parameters

##### indicators

`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/index/interfaces/PresenceIndicator)\>

#### Returns

`void`

---

### sendIndicator

```ts
sendIndicator: (clientId: string, indicator: PresenceIndicator) => Promise<void>;
```

Defined in:
[config.ts:18](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L18)

Sends local indicator state to a remote server to be merged into the remote presence state. The
endpoint this function hits is defined by you, and should call the PresenceAuthority's
[updatePresence](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#updatepresence)
function.

#### Parameters

##### clientId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-client/index/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>

---

### userId

```ts
userId: string;
```

Defined in:
[config.ts:11](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L11)
