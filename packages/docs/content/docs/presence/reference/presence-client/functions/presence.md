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
[plugin.ts:30](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-client/src/plugin.ts#L30)

## Parameters

### config?

#### getPresenceColor?

(`userId`: `string`) => `string`

## Returns

`Plugin`\<`PresenceState`\>
