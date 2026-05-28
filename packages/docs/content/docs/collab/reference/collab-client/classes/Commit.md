---
title: Commit
---

# Class: Commit

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:14

## Constructors

### Constructor

```ts
new Commit(
   version: number, 
   ref: string, 
   steps: Step[]): Commit;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:18

#### Parameters

##### version

`number`

##### ref

`string`

##### steps

`Step`[]

#### Returns

`Commit`

## Properties

### ref

```ts
readonly ref: string;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:16

***

### steps

```ts
readonly steps: Step[];
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:17

***

### version

```ts
readonly version: number;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:15

## Methods

### toJSON()

```ts
toJSON(): CommitJSON;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:19

#### Returns

[`CommitJSON`](/docs/collab/reference/collab-client/interfaces/CommitJSON)

***

### toSchema()

```ts
toSchema(schema: Schema): Commit;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:21

Return a new commit with the steps linked to the supplied schema.

#### Parameters

##### schema

`Schema`

#### Returns

`Commit`

***

### FromJSON()

```ts
static FromJSON(schema: Schema, spec: CommitJSON): Commit;
```

Defined in: node\_modules/.store/@stepwisehq-prosemirror-collab-commit-virtual-03dc2b656d/package/dist/collab-commit.d.ts:23

Return a commit based on the supplied JSON and schema.

#### Parameters

##### schema

`Schema`

##### spec

[`CommitJSON`](/docs/collab/reference/collab-client/interfaces/CommitJSON)

#### Returns

`Commit`
