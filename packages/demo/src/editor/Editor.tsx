"use client";

import { ProseMirror, ProseMirrorDoc } from "@handlewithcare/react-prosemirror";
import { Selectable } from "kysely";
import { Node } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { EditorState, Transaction } from "prosemirror-state";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LongPollListener as CollabLongPollListner,
  CollabClient,
  CollabClientConfig,
  receiveCommitTransaction,
  collab,
} from "@pitter-patter/collab-client";
import {
  presence,
  PresenceClient,
  receivePresenceTransaction,
  LongPollListener as PresenceLongPollListener,
  PresenceClientConfig,
} from "@pitter-patter/presence-client";
import {
  Snapshot,
  VersionHistoryClient,
  VersionHistoryClientConfig,
} from "@pitter-patter/version-history-client";

import { DB } from "../database/schema";

import "@pitter-patter/presence-client/styles.css";
import "prosemirror-view/style/prosemirror.css";

interface Props {
  doc: Selectable<DB["doc"]>;
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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const [state, setState] = useState(() =>
    EditorState.create({
      doc: Node.fromJSON(schema, doc.content),
      plugins: [collab({ version: doc.version }), presence()],
    }),
  );

  const [initialState] = useState(state);

  const [listener] = useState(
    () =>
      new CollabLongPollListner(
        new URL(
          `/api/docs/${doc.id}/commits`,
          typeof window !== "undefined"
            ? window.location.href
            : "http://localhost:3000",
        ),
      ),
  );

  const collabConfig = useMemo<CollabClientConfig>(
    () => ({
      sendCommit: async (commit) => {
        await fetch(`/api/docs/${doc.id}/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commit.toJSON()),
        });
      },
      listener,
      receiveCommits: (commits) => {
        setState((prev) =>
          commits.reduce(
            (acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)),
            prev,
          ),
        );
      },
    }),
    [listener, doc.id],
  );

  const [presenceListener] = useState(
    () =>
      new PresenceLongPollListener(
        new URL(
          `/api/docs/${doc.id}/presence`,
          typeof window !== "undefined"
            ? window.location.href
            : "http://localhost:3000",
        ),
      ),
  );

  const presenceConfig = useMemo<PresenceClientConfig>(
    () => ({
      userId,
      sendIndicator: async (clientId, indicator) => {
        await fetch(`/api/docs/${doc.id}/presence/${clientId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(indicator),
        });
      },
      receiveIndicators: (indicators) => {
        setState((prev) =>
          prev.apply(receivePresenceTransaction(prev, indicators)),
        );
      },
      listener: presenceListener,
    }),
    [presenceListener, doc.id],
  );

  const versionHistoryConfig = useMemo<VersionHistoryClientConfig>(
    () => ({
      getSnapshots: async (version?: number) => {
        const url = new URL(
          `/api/docs/${doc.id}/snapshots`,
          window.location.href,
        );
        if (version !== undefined) {
          url.searchParams.append("version", version.toString());
        }
        const response = await fetch(url);
        const snapshots: Snapshot[] = await response.json();
        return snapshots;
      },
      receiveSnapshots: (snapshots) => {
        setSnapshots((prev) => [...prev, ...snapshots]);
      },
      pollDuration: 5 * 1_000,
    }),
    [doc.id],
  );

  const [versionHistoryClient] = useState(
    () => new VersionHistoryClient(versionHistoryConfig),
  );

  const [presenceClient] = useState(() => new PresenceClient(presenceConfig));

  const [collabClient] = useState(() => new CollabClient(collabConfig));

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev.apply(tr));
  }, []);

  useEffect(() => {
    collabClient.send(state).catch((e) => console.error(e));
  }, [collabClient, state]);

  useEffect(() => {
    presenceClient.send(state).catch((e) => console.error(e));
  }, [presenceClient, state]);

  useEffect(() => {
    const abortController = new AbortController();
    collabClient
      ?.listen(initialState, abortController.signal)
      .catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [collabClient, initialState]);

  useEffect(() => {
    const abortController = new AbortController();
    presenceClient
      .listen(abortController.signal)
      .catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [presenceClient, initialState]);

  useEffect(() => {
    const abortController = new AbortController();
    versionHistoryClient
      .poll(abortController.signal)
      .catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [versionHistoryClient]);

  return (
    <div>
      <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
        <ProseMirrorDoc />
      </ProseMirror>
      <h2>Version history</h2>
      {snapshots.map((snapshot) => (
        <div key={snapshot.snapshotId}>
          <p>{new Date(snapshot.createdAt).toISOString()}</p>
          <ProseMirror
            defaultState={EditorState.create({
              doc: Node.fromJSON(schema, snapshot.snapshotJSON),
            })}
            dispatchTransaction={() => {}}
            editable={() => false}
          >
            <ProseMirrorDoc />
          </ProseMirror>
        </div>
      ))}
    </div>
  );
}
