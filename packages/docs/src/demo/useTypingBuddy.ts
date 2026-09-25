import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  collab,
  CollabClient,
  LongPollListener as CollabLongPollListener,
  receiveCommitTransaction,
} from "@pitter-patter/collab-client";
import {
  presence,
  PresenceClient,
  receivePresenceTransaction,
  LongPollListener as PresenceLongPollListener,
} from "@pitter-patter/presence-client";

import { COLLAB_SERVER_URL } from "./config.js";
import { MOBY_DICK_EXCERPT } from "./mobyDickExcerpt.js";
import { schema } from "./schema.js";

/**
 * collab & presence client that posts commits typing moby dick chapter 1
 * one character at a time
 */
export function useTypingBuddy(docId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const stateRef = useRef<EditorState | null>(null);
  const collabClientRef = useRef<CollabClient | null>(null);
  const presenceClientRef = useRef<PresenceClient | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    clearTimeout(timeoutRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
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

    let state = EditorState.create({
      doc: Node.fromJSON(schema, docJSON),
      plugins: [collab({ version }), presence()],
    });

    const collabClient = new CollabClient({
      sendCommit: async (commit) => {
        await fetch(`${COLLAB_SERVER_URL}/${docId}/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commitJSON: commit.toJSON() }),
        });
      },
      listener: new CollabLongPollListener(new URL(`${COLLAB_SERVER_URL}/${docId}/commits`)),
      receiveCommits: (commits) => {
        const current = stateRef.current ?? state;
        stateRef.current = commits.reduce(
          (acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)),
          current,
        );
      },
    });

    const presenceClient = new PresenceClient({
      userId: "Typing Buddy",
      sendIndicator: async (clientId, indicator) => {
        await fetch(`${COLLAB_SERVER_URL}/${docId}/presence/${clientId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ indicator }),
        });
      },
      receiveIndicators: (indicators) => {
        const current = stateRef.current ?? state;
        stateRef.current = current.apply(receivePresenceTransaction(current, indicators));
      },
      listener: new PresenceLongPollListener(new URL(`${COLLAB_SERVER_URL}/${docId}/presence`)),
    });

    stateRef.current = state;
    collabClientRef.current = collabClient;
    presenceClientRef.current = presenceClient;

    const abortController = new AbortController();
    abortRef.current = abortController;
    collabClient.listen(state, abortController.signal).catch((e) => console.error(e));
    presenceClient.listen(abortController.signal).catch((e) => console.error(e));

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
      const lastChild = nextState.doc.lastChild;
      if (!lastChild || lastChild.type.name !== "paragraph") {
        nextState = nextState.apply(
          nextState.tr.insert(nextState.doc.content.size, schema.nodes.paragraph.create()),
        );
      }
      const pos = nextState.doc.content.size - 1;

      const char = MOBY_DICK_EXCERPT[charIndex]!;
      nextState = nextState.apply(nextState.tr.insertText(char, pos));
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
