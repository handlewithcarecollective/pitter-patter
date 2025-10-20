"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";

import { ProseMirror, ProseMirrorDoc } from "@handlewithcare/react-prosemirror";

import {
  LongPollListener,
  CollabClient,
  CollabClientConfig,
  receiveCommitTransaction,
  collab,
} from "@pitter-patter/collab-client";
import {
  presence,
  PresenceClient,
  receivePresenceTransaction,
  LongPollListener as PresenceListener,
  PresenceClientConfig,
} from "@pitter-patter/presence-client";
import { DB } from "../database/schema";
import { Node } from "prosemirror-model";

import "prosemirror-view/style/prosemirror.css";
import "@pitter-patter/presence-client/styles.css";

interface Props {
  doc: DB["doc"];
}

function randomRef() {
  try {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return bytes.reduce((str, byte) => str + byte.toString(36), "");
  } catch {
    return Math.floor(Math.random() * 0xffffffffffff).toString(36);
  }
}

const userId = randomRef();

export function Editor({ doc }: Props) {
  const [state, setState] = useState(() =>
    EditorState.create({
      doc: Node.fromJSON(schema, doc.content),
      plugins: [collab({ version: doc.version }), presence()],
    }),
  );

  const [initialState] = useState(state);

  const [listener] = useState(() =>
    typeof window === "undefined"
      ? null
      : new LongPollListener(
          new URL(`/api/docs/${doc.id}/commits`, window.location.href),
        ),
  );

  const collabConfig = useMemo<CollabClientConfig | null>(
    () =>
      listener && {
        sendCommit: async (commit) => {
          await fetch(`/api/docs/${doc.id}/commits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(commit.toJSON()),
          });
        },
        getCommits: listener.getCommits,
        receiveCommits: (commits) => {
          setState((prev) =>
            commits.reduce(
              (acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)),
              prev,
            ),
          );
        },
      },
    [listener],
  );

  const [presenceListener] = useState(() =>
    typeof window === "undefined"
      ? null
      : new PresenceListener(
          new URL(`/api/docs/${doc.id}/presence`, window.location.href),
        ),
  );

  const presenceConfig = useMemo<PresenceClientConfig | null>(
    () =>
      presenceListener && {
        userId,
        sendIndicator: async (clientId, indicator) => {
          await fetch(`/api/docs/${doc.id}/presence/${clientId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(indicator),
          });
        },
        getIndicators: presenceListener.getIndicators,
        receiveIndicators: (indicators) => {
          setState((prev) =>
            prev.apply(receivePresenceTransaction(prev, indicators)),
          );
        },
      },
    [presenceListener],
  );

  const [presenceClient] = useState(
    () => presenceConfig && new PresenceClient(presenceConfig),
  );

  const [collabClient] = useState(
    () => collabConfig && new CollabClient(collabConfig),
  );

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev.apply(tr));
  }, []);

  useEffect(() => {
    collabClient?.send(state);
  }, [collabClient, state]);

  useEffect(() => {
    presenceClient?.send(state);
  }, [presenceClient, state]);

  useEffect(() => {
    const abortController = new AbortController();
    collabClient?.listen(initialState, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [collabClient, initialState]);

  useEffect(() => {
    const abortController = new AbortController();
    presenceClient?.listen(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [presenceClient, initialState]);

  return (
    <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
      <ProseMirrorDoc />
    </ProseMirror>
  );
}
