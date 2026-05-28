---
title: IndicatorListener
---

# Interface: IndicatorListener

Defined in:
[index.ts:13](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-client/src/index.ts#L13)

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
[index.ts:14](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-client/src/index.ts#L14)

#### Parameters

##### clientId

`string`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>\>
