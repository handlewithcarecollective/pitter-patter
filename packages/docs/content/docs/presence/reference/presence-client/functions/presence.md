---
title: presence
---

# Function: presence()

```ts
function presence(config?: {
  getPresenceColor?: (userId: string) => string;
}): Plugin<PresenceState>;
```

Defined in: [plugin.ts:30](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-client/src/plugin.ts#L30)

## Parameters

### config?

#### getPresenceColor?

(`userId`: `string`) => `string`

## Returns

`Plugin`\<`PresenceState`\>
