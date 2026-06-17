---
title: What is Pitter Patter?
description:
  Pitter Patter is an open source collaborative rich text editing toolkit, built with React and
  ProseMirror.
---

## Who builds it?

That would be us, [Handle with Care](https://handlewithcare.dev/). We’re a cooperatively owned
product development collective, comprised of software engineers and product managers. We are all
equal owners and have equal decision-making power deciding what we work on.

We’re funded in two ways:

1. Companies pay us to help them with their collaborative rich text editors, or other complex
   software.
2. Sponsors contribute money to directly support the development of Pitter Patter and our other open
   source software.

## What is it?

Pitter Patter is a suite of open source libraries for building collaborative rich text editors with
React and ProseMirror. We see it as our job to provide turnkey solutions for the hard parts of rich
text editing — like collaboration, presence, and version history — so that you can focus on building
the editor experience that your users need.

## Why does it exist?

We spend a lot of time thinking about and working on rich text editors. In particular, we spend a
lot of time helping companies solve the same problems over and over again. There are usually great
primitives available for these common building blocks
([`prosemirror-collab-commit`](https://github.com/stepwisehq/prosemirror-collab-commit) for
collaboration, [unified.js](https://github.com/unifiedjs/unified) for Markdown, etc.), but putting
them together correctly to build a functioning text editor can be challenging.

There are other solutions, like [Tiptap](https://tiptap.dev/) and
[Remirror](https://www.remirror.io/), but we think that they’ve made some suboptimal choices that
force product developers to make unnecessary compromises.

1. Both attempt to use React portals and effect hooks to integrate with ProseMirror, which
   [lead to irreconcilable state tearing](https://handlewithcare.dev/blog/why_i_rebuilt_prosemirror_view/),
   due to fundamental differences in how React and ProseMirror View handle view reconciliation.
2. Both attempt to use [Yjs](https://github.com/yjs/yjs) via
   [`y-prosemirror`](https://github.com/yjs/y-prosemirror) for collaboration. We think that Yjs’s
   CRDT implementation is
   [ill-suited for rich text editing](https://www.moment.dev/blog/lies-i-was-told-pt-2).
3. Both attempt to hide ProseMirror’s underlying APIs, under the guise of simplicity and
   abstraction. We think that ProseMirror, low-level though it is, is roughly the correct level of
   abstraction for a domain as complex as rich text editing. Attempts to abstract it away inevitably
   lead to _more_ complexity, as the abstractions leak frequently and require constant manual
   integration with the lower level solutions.

We think we can do better. And more importantly perhaps, we think that you _deserve_ better!

## Philosophy

### Don’t hide ProseMirror

ProseMirror is an outstanding rich text editing framework. Nearly anything that you can imagine
doing with a rich text editor can be accomplished with ProseMirror. Rich text editing is also a very
complex domain, requiring a very large number of decisions to be made per feature.

We think that better primitives built with ProseMirror can take us farther than abstractions that
attempt to hide away ProseMirror’s internals.

### Collaboration should be simple to implement _and_ simple to debug

ProseMirror has first-party collaboration, in the form of
[`prosemirror-collab`](https://code.haverbeke.berlin/prosemirror/prosemirror-collab). Because it
just sends steps over the wire, and relies on a single, server-side ordering of operations for
conflict resolution, it is very simple to debug. But it is very challenging to implement correctly,
and there is very little in the way of guidance or documentation for doing so.

Yjs provides third-party collaboration, in the form of
[`y-prosemirror`](https://github.com/yjs/y-prosemirror). Because it is built on Yjs, which has many
robust adapters for various protocols and servers, it is very easy to implement. However, because it
operates on Yjs’s XML-based Y-doc format, it is very challenging to inspect and debug if something
goes wrong.

Pitter Patter’s collaboration, presence, and version history libraries are based on
[`prosemirror-collab-commit`](https://github.com/stepwisehq/prosemirror-collab-commit). Like
`prosemirror-collab`, `prosemirror-collab-commit` uses ProseMirror steps as the primary data
structure for conflict resolution. But Pitter Patter Collab provides actual guidance and
implementation that make it easy to set up a full-stack collaborative editing application, and hard
to shoot yourself in the foot.

### Correctness is worth it

After trying every other option over the course of several years, we eventually decided that the
only way to correctly integrate React and ProseMirror was to
[reimplement ProseMirror View’s renderer from scratch directly in React](https://handlewithcare.dev/blog/why_i_rebuilt_prosemirror_view/).
This was itself a massive effort, but the result, in the end, is a React/ProseMirror integration
that doesn’t suffer from state tearing and allows developers to use React idioms like context as
they normally would, without caveats or compromises. We don’t put side effects in React render
functions or ProseMirror plugin apply functions, we don’t use effects to synchronize state with
props. We want to enable you to build rich text editors that your users can trust, and that means
that we need to build libraries that _you_ can trust.
