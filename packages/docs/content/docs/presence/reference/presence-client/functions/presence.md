---
title: presence
---

# Function: presence()

```ts
function presence(config?: {
  getPresenceColor?: (userId: string) => string;
}): Plugin<PresenceState>;
```

Defined in:
[plugin.ts:30](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/plugin.ts#L30)

## Parameters

### config?

#### getPresenceColor?

(`userId`: `string`) => `string`

## Returns

`Plugin`\<`PresenceState`\>
