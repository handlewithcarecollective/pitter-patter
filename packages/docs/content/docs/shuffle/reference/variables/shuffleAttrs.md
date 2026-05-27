---
title: shuffleAttrs
---

# Variable: shuffleAttrs

```ts
const shuffleAttrs: {
  shuffleEnd: {
    default: number;
    validate: boolean;
  };
  shuffleStart: {
    default: number;
    validate: boolean;
  };
  zIndex: {
    default: number;
    validate: string;
  };
};
```

Defined in:
[schema.ts:9](https://github.com/handlewithcarecollective/pitter-patter/blob/5f9831b289582242a2f8b7c6f9c1d64b034de5a9/packages/shuffle/src/schema.ts#L9)

The default node attribute spec for Shuffle. Provides attribute specs for `shuffleStart` and
`shuffleEnd`, which represent the start and end column for a block. The minimum is 0 and the maximum
is 13. You may wish to override the default values, which are 4 and 9 for `shuffleStart` and
`shuffleEnd`, respectively.

## Type Declaration

### shuffleEnd

```ts
shuffleEnd: {
  default: number;
  validate: boolean;
};
```

#### shuffleEnd.default

```ts
default: number = 9;
```

#### shuffleEnd.validate()

```ts
validate(value: any): boolean;
```

##### Parameters

###### value

`any`

##### Returns

`boolean`

### shuffleStart

```ts
shuffleStart: {
  default: number;
  validate: boolean;
};
```

#### shuffleStart.default

```ts
default: number = 4;
```

#### shuffleStart.validate()

```ts
validate(value: any): boolean;
```

##### Parameters

###### value

`any`

##### Returns

`boolean`

### zIndex

```ts
zIndex: {
  default: number;
  validate: string;
};
```

#### zIndex.default

```ts
default: number = 0;
```

#### zIndex.validate

```ts
validate: string = "number";
```
