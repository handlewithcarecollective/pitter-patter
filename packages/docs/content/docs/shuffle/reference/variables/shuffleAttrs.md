---
title: shuffleAttrs
---

# Variable: shuffleAttrs

```ts
const shuffleAttrs: NodeSpec["attrs"];
```

Defined in:
[schema.ts:9](https://github.com/handlewithcarecollective/pitter-patter/blob/77847a6e5f056de116cf628557786668e90c3b4e/packages/shuffle/src/schema.ts#L9)

The default node attribute spec for Shuffle. Provides attribute specs for `shuffleStart` and
`shuffleEnd`, which represent the start and end column for a block. The minimum is 0 and the maximum
is 13. You may wish to override the default values, which are 4 and 9 for `shuffleStart` and
`shuffleEnd`, respectively.
