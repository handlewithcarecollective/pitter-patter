import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Decoration } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { collab, collabKey, Commit, receiveCommitTransaction } from "@pitter-patter/collab-client";

import { createPresence, presenceKey, receivePresenceTransaction } from "../src/basePlugin.ts";
import { type PresenceIndicator } from "../src/PresenceIndicator.ts";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph" },
    paragraph: { content: "text*", group: "block" },
    text: {},
  },
});

const editor = (text: string) =>
  EditorState.create({
    doc: schema.node("doc", null, [
      schema.node("paragraph", null, text ? [schema.text(text)] : []),
    ]),
    plugins: [
      collab({ version: 0 }),
      createPresence((pos) => Decoration.widget(pos, () => undefined as never))(),
    ],
  });

const indicatorAnchors = (state: EditorState) =>
  [
    ...new Set(
      presenceKey
        .getState(state)!
        .decorations.find()
        .map(({ from }) => from),
    ),
  ].sort((a, b) => a - b);

const remoteUser = (version: number, anchor: number): PresenceIndicator => ({
  ref: `remote-user-at-${version}`,
  clientId: "remoteUser",
  userId: "remoteUser",
  version,
  anchor,
  head: anchor,
});

describe("presence indicators", () => {
  it("draws an indicator at the received position", () => {
    let state = editor("Hello");

    state = state.apply(receivePresenceTransaction(state, { remoteUser: remoteUser(0, 3) }));

    expect(indicatorAnchors(state)).toEqual([3]);
  });

  it("should remain stable when a remote commit is confirmed", () => {
    let state = editor("Hello");
    state = state.apply(receivePresenceTransaction(state, { remoteUser: remoteUser(0, 3) }));

    // we type before remoteUser's cursor, but the server has not confirmed it yet
    state = state.apply(state.tr.insertText("x", 2));
    expect(indicatorAnchors(state)).toEqual([4]);

    const { version, ref, steps } = collabKey.getState(state)!.getCommit()!;
    const commit = new Commit(version + 1, ref, steps);

    // step is confirmed, presence indicator should not move
    state = state.apply(receiveCommitTransaction(state, commit));

    expect(state.doc.textContent).toBe("Hxello");
    expect(indicatorAnchors(state)).toEqual([4]);
  });

  it("maps an indicator through an unconfirmed step once", () => {
    let state = editor("Hello");

    const commit = new Commit(1, `remoteUser-1`, state.tr.insertText("a", 1).steps);

    state = state.apply(receiveCommitTransaction(state, commit));
    state = state.apply(state.tr.insertText("b", 1));

    // we receive an old remote cursor, from before the above changes, which
    // needs to be mapped
    state = state.apply(receivePresenceTransaction(state, { remoteUser: remoteUser(0, 6) }));

    expect(state.doc.textContent).toBe("baHello");
    expect(indicatorAnchors(state)).toEqual([8]);
  });

  it("maps an indicator through confirmed local steps once", () => {
    let state = editor("Hello");
    state = state.apply(receivePresenceTransaction(state, { remoteUser: remoteUser(0, 6) }));

    for (const text of ["a", "b"]) {
      state = state.apply(state.tr.insertText(text, 1));

      const { version, ref, steps } = collabKey.getState(state)!.getCommit()!;
      const commit = new Commit(version + 1, ref, steps);

      state = state.apply(receiveCommitTransaction(state, commit));
    }

    expect(state.doc.textContent).toBe("baHello");
    expect(indicatorAnchors(state)).toEqual([8]);
  });
});
