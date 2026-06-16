---
title: IndicatorListener
---

# Interface: IndicatorListener

Defined in:
[config.ts:3](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L3)

## Properties

### listen

```ts
listen: (
  clientId: string,
  options?: {
    signal?: AbortSignal;
  },
) => AsyncIterableIterator<Record<string, PresenceIndicator>>;
```

Defined in:
[config.ts:4](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/config.ts#L4)

#### Parameters

##### clientId

`string`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/index/interfaces/PresenceIndicator)\>\>
