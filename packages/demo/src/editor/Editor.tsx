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
import { DB } from "../database/schema";
import { Node } from "prosemirror-model";

interface Props {
  doc: DB["doc"];
}

export function Editor({ doc }: Props) {
  const [state, setState] = useState(() =>
    EditorState.create({
      doc: Node.fromJSON(schema, doc.content),
      plugins: [collab({ version: doc.version })],
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
