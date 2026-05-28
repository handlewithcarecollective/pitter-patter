---
title: IndicatorListener
---

# Interface: IndicatorListener

Defined in:
[index.ts:13](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L13)

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
[index.ts:14](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L14)

#### Parameters

##### clientId

`string`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>\>
