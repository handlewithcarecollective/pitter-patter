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

const docId = "doc1";

export function Editor() {
  const [state, setState] = useState(() =>
    EditorState.create({ schema, plugins: [collab()] }),
  );

  const [initialState] = useState(state);

  const [listener] = useState(() =>
    typeof window === "undefined"
      ? null
      : new LongPollListener(
          new URL(`/api/docs/${docId}/commits`, window.location.href),
        ),
  );

  const collabConfig = useMemo<CollabClientConfig | null>(
    () =>
      listener && {
        sendCommit: async (commit) => {
          console.log("commit", commit);
          await fetch(`/api/docs/${docId}/commits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(commit.toJSON()),
          });
        },
        getCommits: listener.getCommits,
        receiveCommits: (commits) => {
          console.log("Receiving commits", commits);
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

  const [client] = useState(
    () => collabConfig && new CollabClient(collabConfig),
  );

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev.apply(tr));
  }, []);

  useEffect(() => {
    client?.send(state);
  }, [client, state]);

  useEffect(() => {
    const abortController = new AbortController();
    client?.listen(initialState, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [client, initialState]);

  return (
    <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
      <ProseMirrorDoc />
    </ProseMirror>
  );
}
