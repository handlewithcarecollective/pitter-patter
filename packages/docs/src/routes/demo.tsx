import { ProseMirror, ProseMirrorDoc } from "@handlewithcare/react-prosemirror";
import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Node } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import {
  collab,
  CollabClient,
  CollabClientConfig,
  LongPollListener as CollabLongPollListener,
  receiveCommitTransaction,
} from "@pitter-patter/collab-client";
import { shuffle } from "@pitter-patter/shuffle";

import { schema } from "@/demo/schema.js";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/demo")({
  component: Demo,
});

function Demo() {
  const docId = useId();
  const [initialState, setInitialState] = useState<null | EditorState>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      const response = await fetch(`http://localhost:8787/${docId}/doc`, {
        signal: controller.signal,
      });
      const json = await response.json();
      const doc = json["docJSON"];
      const version = json["version"];
      setInitialState(
        EditorState.create({
          doc: Node.fromJSON(schema, doc),
          plugins: [collab({ version }), shuffle()],
        }),
      );
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [docId]);
  return (
    <HomeLayout {...baseOptions()}>
      {initialState && <DemoEditor docId={docId} initialState={initialState} />}
    </HomeLayout>
  );
}

function DemoEditor({ docId, initialState }: { docId: string; initialState: EditorState }) {
  const [state, setState] = useState<EditorState>(initialState);
  const [listener] = useState(
    () => new CollabLongPollListener(new URL(`http://localhost:8787/${docId}/commits`)),
  );
  const collabConfig = useMemo<CollabClientConfig>(
    () => ({
      sendCommit: async (commit) => {
        await fetch(`http://localhost:8787/${docId}/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commitJSON: commit.toJSON() }),
        });
      },
      listener,
      receiveCommits: (commits) => {
        setState((prev) =>
          commits.reduce(
            (acc, commit) => acc?.apply(receiveCommitTransaction(acc, commit)) ?? null,
            prev,
          ),
        );
      },
    }),
    [docId, listener],
  );

  const [collabClient] = useState(() => new CollabClient(collabConfig));

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev?.apply(tr) ?? null);
  }, []);

  useEffect(() => {
    if (!state) return;
    collabClient.send(state).catch(console.error);
  }, [collabClient, state]);

  useEffect(() => {
    const abortController = new AbortController();
    collabClient?.listen(initialState, abortController.signal).catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [collabClient, initialState]);

  return (
    <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
      <ProseMirrorDoc />
    </ProseMirror>
  );
}
