import { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  collab,
  Commit,
  CollabClient,
  receiveCommitTransaction,
} from "@pitter-patter/collab-client";
import {
  presence,
  PresenceClient,
  receivePresenceTransaction,
} from "@pitter-patter/presence-client";

import { COLLAB_SERVER_URL } from "./config.js";
import { MOBY_DICK_EXCERPT } from "./mobyDickExcerpt.js";
import { schema } from "./schema.js";
import { WebSocketConnection } from "./socket.js";

/**
 * collab & presence client that posts commits typing moby dick chapter 1
 * one character at a time
 */
export function useTypingFriend(docId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const stateRef = useRef<EditorState | null>(null);
  const socketRef = useRef<WebSocketConnection | null>(null);
  const collabClientRef = useRef<CollabClient | null>(null);
  const presenceClientRef = useRef<PresenceClient | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seenCommitRefs = useRef(new Set<string>());
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    clearTimeout(timeoutRef.current);
    socketRef.current?.disconnect();
    socketRef.current = null;
    stateRef.current = null;
    collabClientRef.current = null;
    presenceClientRef.current = null;
    setIsTyping(false);
  }, []);

  const start = useCallback(async () => {
    if (isTyping) return;
    cancelledRef.current = false;

    const response = await fetch(`${COLLAB_SERVER_URL}/${docId}/doc`);
    const { docJSON, version } = await response.json();
    if (cancelledRef.current) return;

    const state = EditorState.create({
      doc: Node.fromJSON(schema, docJSON),
      plugins: [collab({ version }), presence()],
    });
    stateRef.current = state;

    const url = new URL(`${COLLAB_SERVER_URL}/${docId}/socket`);
    url.protocol = url.protocol.replace("http", "ws");

    const socket = new WebSocketConnection(url, {
      onCommits: (commitJSONs) => {
        const newCommits = commitJSONs
          .filter((json) => !seenCommitRefs.current.has(json.ref))
          .map((json) => Commit.FromJSON(schema, json));
        newCommits.forEach((commit) => seenCommitRefs.current.add(commit.ref));

        const current = stateRef.current ?? state;
        stateRef.current = newCommits.reduce(
          (acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)),
          current,
        );
      },
      onPresence: (indicators) => {
        const current = stateRef.current ?? state;
        stateRef.current = current.apply(receivePresenceTransaction(current, indicators));
      },
    });

    const collabClient = new CollabClient({
      sendCommit: async (commit) => {
        await socket.sendCommit(commit.toJSON());
      },
      listener: { async *listen() {} },
      receiveCommits: () => {},
    });

    const presenceClient = new PresenceClient({
      userId: "Typing Buddy",
      sendIndicator: async (_clientId, indicator) => {
        await socket.sendIndicator(indicator);
      },
      receiveIndicators: () => {},
      listener: { async *listen() {} },
    });

    socket.connect(version);

    socketRef.current = socket;
    collabClientRef.current = collabClient;
    presenceClientRef.current = presenceClient;

    setIsTyping(true);

    let charIndex = 0;
    const typeOneChar = () => {
      const currentState = stateRef.current;
      const client = collabClientRef.current;
      if (!currentState || !client || charIndex >= MOBY_DICK_EXCERPT.length) {
        stop();
        return;
      }

      let nextState = currentState;
      const firstChild = nextState.doc.firstChild;
      if (!firstChild || firstChild.type.name !== "paragraph") {
        nextState = nextState.apply(nextState.tr.insert(0, schema.nodes.paragraph.create()));
      }
      const pos = nextState.doc.firstChild!.nodeSize - 1;

      const char = MOBY_DICK_EXCERPT[charIndex]!;
      const tr = nextState.tr.insertText(char, pos);
      tr.setSelection(TextSelection.create(tr.doc, pos + char.length));
      nextState = nextState.apply(tr);
      stateRef.current = nextState;
      charIndex++;

      collabClient.send(nextState).catch((e) => console.error(e));
      presenceClient.send(nextState).catch((e) => console.error(e));

      timeoutRef.current = setTimeout(typeOneChar, 70);
    };

    typeOneChar();
  }, [docId, isTyping, stop]);

  useEffect(() => stop, [stop]);

  return { isTyping, start, stop };
}
