import { ProseMirror, ProseMirrorDoc } from "@handlewithcare/react-prosemirror";
import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
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
import {
  presence,
  PresenceClient,
  receivePresenceTransaction,
  LongPollListener as PresenceLongPollListener,
  PresenceClientConfig,
} from "@pitter-patter/presence-client";
import {
  DragHandle,
  DragHandleProps,
  DragHandles,
  ResizeHandles,
  shuffle,
  ShuffleSkeleton,
} from "@pitter-patter/shuffle";

import { schema } from "@/demo/schema.js";
import { baseOptions } from "@/lib/layout.shared";

import "@pitter-patter/presence-client/styles.css";
import "@pitter-patter/shuffle/style/shuffle.css";
import "prosemirror-view/style/prosemirror.css";

export const Route = createFileRoute("/demo")({
  component: Demo,
});

function randomRef() {
  try {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return bytes.reduce((str, byte) => str + byte.toString(36), "");
  } catch {
    return Math.floor(Math.random() * 0xffffffffffff).toString(36);
  }
}

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
          plugins: [collab({ version }), shuffle(), presence(), keymap(baseKeymap)],
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
      {initialState && (
        <div className="flex flex-col gap-4 p-10">
          <h1 className="text-3xl font-semibold">Pitter Patter Demo!</h1>
          <p>
            Try typing in the editors below, and see the edits and presence indicators update in the
            other editor! You can also drag one of the menu items below to insert a node of that
            type into either editor.
          </p>
          <InflatableMenu />
          <div className="flex gap-6 flex-col md:flex-row py-6">
            <DemoEditor docId={docId} initialState={initialState} />
            <DemoEditor docId={docId} initialState={initialState} />
          </div>
        </div>
      )}
    </HomeLayout>
  );
}

function InflatableMenu() {
  return (
    <div className="flex gap-2 sticky top-0 z-10">
      <div
        data-shuffle-inflatable={JSON.stringify(
          schema.nodes.paragraph.create(null, schema.text("A brand new paragraph!")).toJSON(),
        )}
        className="border-gray border rounded-md px-3 py-2 cursor-grab touch-none select-none"
      >
        Paragraph
      </div>
      <div
        data-shuffle-inflatable={JSON.stringify(
          schema.nodes.image.create({ src: "/images/shuffle-dance.jpg" }).toJSON(),
        )}
        className="border-gray border rounded-md px-3 py-2 cursor-grab touch-none select-none"
      >
        Image
      </div>
    </div>
  );
}

function DemoEditor({ docId, initialState }: { docId: string; initialState: EditorState }) {
  const [state, setState] = useState<EditorState>(initialState);
  const [listener] = useState(
    () => new CollabLongPollListener(new URL(`http://localhost:8787/${docId}/commits`)),
  );
  const userId = randomRef();

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

  const [presenceListener] = useState(
    () => new PresenceLongPollListener(new URL(`http://localhost:8787/${docId}/presence`)),
  );

  const presenceConfig = useMemo<PresenceClientConfig>(
    () => ({
      userId,
      sendIndicator: async (clientId, indicator) => {
        await fetch(`http://localhost:8787/${docId}/presence/${clientId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ indicator }),
        });
      },
      receiveIndicators: (indicators) => {
        setState((prev) => prev.apply(receivePresenceTransaction(prev, indicators)));
      },
      listener: presenceListener,
    }),
    [presenceListener, docId, userId],
  );

  const [collabClient] = useState(() => new CollabClient(collabConfig));

  const [presenceClient] = useState(() => new PresenceClient(presenceConfig));

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev?.apply(tr) ?? null);
  }, []);

  useEffect(() => {
    if (!state) return;
    collabClient.send(state).catch(console.error);
  }, [collabClient, state]);

  useEffect(() => {
    presenceClient.send(state).catch((e) => console.error(e));
  }, [presenceClient, state]);

  useEffect(() => {
    const abortController = new AbortController();
    collabClient?.listen(initialState, abortController.signal).catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [collabClient, initialState]);

  useEffect(() => {
    const abortController = new AbortController();
    presenceClient.listen(abortController.signal).catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [presenceClient, initialState]);

  return (
    <div className="flex-1 min-w-0">
      <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
        <ShuffleSkeleton>
          <ProseMirrorDoc className="border-gray border rounded-md min-h-[350px] p-2" />
          <ResizeHandles />
          <DragHandles handleComponent={CustomHandle} />
        </ShuffleSkeleton>
      </ProseMirror>
    </div>
  );
}

function CustomHandle(props: DragHandleProps) {
  if (["image", "card", "card_deck"].includes(props.node.type.name)) {
    return null;
  }
  return <DragHandle {...props} />;
}
