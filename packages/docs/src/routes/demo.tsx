import {
  ProseMirror,
  ProseMirrorDoc,
  useEditorEventListener,
} from "@handlewithcare/react-prosemirror";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Check, GripVertical, ImageIcon, Keyboard, Link2, Pilcrow, Square } from "lucide-react";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Node } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  collab,
  CollabClient,
  CollabClientConfig,
  receiveCommitTransaction,
} from "@pitter-patter/collab-client";
import {
  PresenceClient,
  receivePresenceTransaction,
  PresenceClientConfig,
} from "@pitter-patter/presence-client";
import { presence } from "@pitter-patter/presence-client/react";
import { randomRef } from "@pitter-patter/refs";
import {
  DragHandle,
  DragHandleProps,
  DragHandles,
  ResizeHandles,
  shuffle,
  ShuffleSkeleton,
} from "@pitter-patter/shuffle";

import { WebSocketListener as CollabListener } from "@/demo/adapters/collab.js";
import { WebSocketListener as PresenceListener } from "@/demo/adapters/presence.js";
import { COLLAB_SERVER_URL } from "@/demo/config.js";
import { schema } from "@/demo/schema.js";
import { WebSocketConnection } from "@/demo/socket.js";
import { useTypingFriend } from "@/demo/useTypingFriend.js";
import { baseOptions } from "@/lib/layout.shared";

import "@/demo/demo.css";
import "@pitter-patter/presence-client/styles.css";
import "@pitter-patter/shuffle/style/shuffle.css";
import "prosemirror-view/style/prosemirror.css";

export const Route = createFileRoute("/demo")({
  component: DemoRoute,
  validateSearch: parseDemoSearch,
});

const SHARE_LINK_PROMPT = "Copy this link to share the demo";

const DOC_ID = /^[0-9a-z]{1,32}$/;

type DemoSearch = { ref?: string };

function parseDemoSearch({ ref }: Record<string, unknown>): DemoSearch {
  return typeof ref === "string" && DOC_ID.test(ref) ? { ref } : {};
}

function DemoRoute() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (ref) return;
    void navigate({ to: "/demo", search: { ref: randomRef() }, replace: true });
  }, [ref, navigate]);

  return (
    <HomeLayout {...baseOptions()}>
      {ref ? <Demo key={ref} docId={ref} /> : <DemoStarting />}
    </HomeLayout>
  );
}

function DemoStarting() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-8">
      <p className="text-lg text-fd-muted-foreground/80">Starting a new demo…</p>
    </main>
  );
}

const COLLABORATORS = {
  Ishmael: "#e8711f",
  Queequeg: "#16a34a",
  "Typing Buddy": "#7c5cbf",
} as const;

type CollaboratorName = keyof typeof COLLABORATORS;

function getPresenceColor(userId: string) {
  return COLLABORATORS[userId as CollaboratorName] ?? "#7e6f62";
}

function Demo({ docId }: { docId: string }) {
  const [initialState, setInitialState] = useState<null | EditorState>(null);
  const typingFriend = useTypingFriend(docId);
  const [offline, setOffline] = useState<Record<string, boolean>>({});
  const toggleOffline = useCallback((name: string) => {
    setOffline((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      const response = await fetch(`${COLLAB_SERVER_URL}/${docId}/doc`, {
        signal: controller.signal,
      });
      const json = await response.json();
      const doc = json["docJSON"];
      const version = json["version"];
      setInitialState(
        EditorState.create({
          doc: Node.fromJSON(schema, doc),
          plugins: [
            collab({ version }),
            shuffle(),
            presence({ getPresenceColor }),
            keymap(baseKeymap),
          ],
        }),
      );
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [docId]);
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 md:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="font-handle text-sm font-extralight uppercase tracking-wider">Live demo</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Full-stack collaborative editing
        </h1>
        <p className="text-lg text-fd-muted-foreground/80">
          Ishmael and Queequeg are editing the same document. Type in either editor to watch edits
          and cursors sync, drag blocks around to rearrange them, or take an editor offline and see
          its changes merge when it reconnects.
        </p>
        <p className="text-lg text-fd-muted-foreground/80">
          This page is connected to a Cloudflare Durable Object (with document ID{" "}
          <code className="font-handle font-extralight uppercase tracking-wider">{docId}</code>)
          with websockets. The editors are actually communicating over the network through the
          durable object!
        </p>
      </header>
      <Toolbar typingFriend={typingFriend} offline={offline} />
      {initialState && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DemoEditor
            name="Ishmael"
            docId={docId}
            initialState={initialState}
            isOffline={!!offline["Ishmael"]}
            onToggleOffline={toggleOffline}
          />
          <DemoEditor
            name="Queequeg"
            docId={docId}
            initialState={initialState}
            isOffline={!!offline["Queequeg"]}
            onToggleOffline={toggleOffline}
          />
        </div>
      )}
    </main>
  );
}

function Toolbar({
  typingFriend,
  offline,
}: {
  typingFriend: ReturnType<typeof useTypingFriend>;
  offline: Record<string, boolean>;
}) {
  return (
    <div className="z-20 md:sticky md:top-(--fd-nav-height,0px) flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-fd-card/90 p-3 shadow-sm backdrop-blur">
      <InflatableMenu />
      <div className="ml-auto flex md:flex-wrap justify-between md:w-auto w-full md:justify-start items-center gap-x-6 gap-y-3">
        <Collaborators isTyping={typingFriend.isTyping} offline={offline} />
        <div className="md:contents flex flex-col gap-2">
          <ShareButton />
          <button
            onClick={typingFriend.isTyping ? typingFriend.stop : typingFriend.start}
            title="Simulate a remote collaborator typing Moby-Dick into the top of the document"
            className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              typingFriend.isTyping
                ? "border hover:bg-fd-muted"
                : "bg-fd-primary text-fd-primary-foreground hover:brightness-105"
            }`}
          >
            {typingFriend.isTyping ? (
              <>
                <Square className="size-3.5 fill-current hidden md:block" />
                Stop Typing Buddy
              </>
            ) : (
              <>
                <Keyboard className="size-4 hidden md:block" />
                Invite Typing Buddy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  function copy() {
    const url = window.location.href;
    if (!navigator.clipboard) {
      window.prompt(SHARE_LINK_PROMPT, url);
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
      },
      () => {
        window.prompt(SHARE_LINK_PROMPT, url);
      },
    );
  }

  return (
    <button
      onClick={copy}
      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-fd-muted"
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Link copied" : "Share demo"}
    </button>
  );
}

function Collaborators({
  isTyping,
  offline,
}: {
  isTyping: boolean;
  offline: Record<string, boolean>;
}) {
  const present: { name: CollaboratorName; isOffline: boolean }[] = [
    { name: "Ishmael", isOffline: !!offline["Ishmael"] },
    { name: "Queequeg", isOffline: !!offline["Queequeg"] },
  ];
  if (isTyping) present.push({ name: "Typing Buddy", isOffline: false });

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-fd-muted-foreground/70">In this doc</span>
      <div className="flex -space-x-1.5">
        {present.map(({ name, isOffline }) => (
          <Avatar key={name} name={name} isOffline={isOffline} ringed />
        ))}
      </div>
    </div>
  );
}

function Avatar({
  name,
  isOffline = false,
  ringed = false,
}: {
  name: CollaboratorName;
  isOffline?: boolean;
  ringed?: boolean;
}) {
  return (
    <span
      title={isOffline ? `${name} (offline)` : name}
      className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white transition ${
        ringed ? "ring-2 ring-fd-card" : ""
      } ${isOffline ? "opacity-40 grayscale" : ""}`}
      style={{ backgroundColor: COLLABORATORS[name] }}
    >
      {name === "Typing Buddy" ? <Keyboard className="size-4" /> : name[0]}
      {name === "Typing Buddy" && (
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 animate-pulse rounded-full bg-green-500 ring-2 ring-fd-card" />
      )}
    </span>
  );
}

function InflatableMenu() {
  return (
    <div className="flex md:flex-wrap justify-between md:w-auto w-full md:justify-start items-center gap-2 text-sm">
      <span className="text-fd-muted-foreground/70">Drag in a block</span>
      <div className="flex flex-col gap-2 md:contents">
        <Inflatable
          node={schema.nodes.paragraph.create(null, schema.text("A brand new paragraph!"))}
          icon={<Pilcrow className="size-4" />}
        >
          Paragraph
        </Inflatable>
        <Inflatable
          node={schema.nodes.image.create({ src: "/images/shuffle-dance.jpg" })}
          icon={<ImageIcon className="size-4" />}
        >
          Image
        </Inflatable>
      </div>
    </div>
  );
}

function Inflatable({
  node,
  icon,
  children,
}: {
  node: Node;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-shuffle-inflatable={JSON.stringify(node.toJSON())}
      className="flex cursor-grab touch-none items-center gap-1.5 rounded-lg [&_svg]:pointer-events-none border bg-fd-background py-1.5 pr-3 pl-1.5 shadow-xs transition select-none hover:border-fd-primary hover:shadow-sm active:cursor-grabbing"
    >
      <GripVertical className="size-4 opacity-40" />
      {icon}
      {children}
    </div>
  );
}

function DemoDoc() {
  useEditorEventListener("pointerenter", (view) => {
    if (!view.root.shuffleDragging) return;
    view.focus();
  });

  return <ProseMirrorDoc className="demo-editor" />;
}

function DemoEditor({
  name,
  docId,
  initialState,
  isOffline,
  onToggleOffline,
}: {
  name: CollaboratorName;
  docId: string;
  initialState: EditorState;
  isOffline: boolean;
  onToggleOffline: (name: string) => void;
}) {
  const [state, setState] = useState<EditorState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userId = name;
  const url = new URL(`${COLLAB_SERVER_URL}/${docId}/socket`);
  url.protocol = url.protocol.replace("http", "ws");

  const [socket] = useState(() => new WebSocketConnection(url));

  const collabConfig = useMemo<CollabClientConfig>(
    () => ({
      sendCommit: async (commit) => {
        await socket.sendCommit(commit.toJSON());
      },
      listener: new CollabListener(socket.getCommits.bind(socket), socket.commits()),
      receiveCommits: (commits) => {
        setState((prev) =>
          commits.reduce(
            (acc, commit) => acc?.apply(receiveCommitTransaction(acc, commit)) ?? null,
            prev,
          ),
        );
      },
    }),
    [socket],
  );

  const presenceConfig = useMemo<PresenceClientConfig>(
    () => ({
      userId,
      sendIndicator: async (_clientId, indicator) => {
        await socket.sendIndicator(indicator);
      },
      receiveIndicators: (indicators) => {
        setState((prev) => prev?.apply(receivePresenceTransaction(prev, indicators)) ?? null);
      },
      listener: new PresenceListener(socket.getPresence.bind(socket), socket.presence()),
    }),
    [socket, userId],
  );

  const [collabClient] = useState(() => new CollabClient(collabConfig));

  const [presenceClient] = useState(() => new PresenceClient(presenceConfig));

  const dispatchTransaction = useCallback((tr: Transaction) => {
    setState((prev) => prev?.apply(tr) ?? null);
  }, []);

  useEffect(() => {
    if (isOffline) {
      socket.disconnect();
      return;
    }

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [socket, isOffline]);

  useEffect(() => {
    if (!state || isOffline) return;
    collabClient.send(state).catch(console.error);
  }, [collabClient, state, isOffline]);

  useEffect(() => {
    if (isOffline) return;
    presenceClient.send(state).catch((e) => console.error(e));
  }, [presenceClient, state, isOffline]);

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
    <section
      className={`demo-editor-frame flex min-w-0 flex-col rounded-xl border bg-fd-card shadow-sm transition-colors ${
        isOffline ? "border-dashed" : "focus-within:border-fd-foreground/40"
      }`}
    >
      <header
        className="flex items-center gap-3 rounded-t-xl border-b px-4 py-2.5"
        style={
          isOffline
            ? {
                backgroundImage:
                  "repeating-linear-gradient(-45deg, transparent 0 10px, color-mix(in srgb, var(--color-fd-primary) 12%, transparent) 10px 20px)",
              }
            : undefined
        }
      >
        <Avatar name={name} />
        <div className="flex flex-col leading-tight">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-fd-muted-foreground/70">
            {isOffline ? "Edits are saved locally and will sync when back online" : "Syncing live"}
          </span>
        </div>
        <ConnectionSwitch
          isOnline={!isOffline}
          onToggle={() => {
            onToggleOffline(name);
          }}
        />
      </header>
      <div className="px-2 md:px-4">
        <ProseMirror state={state} dispatchTransaction={dispatchTransaction}>
          <ShuffleSkeleton>
            <DemoDoc />
            <ResizeHandles />
            <DragHandles handleComponent={CustomHandle} />
          </ShuffleSkeleton>
        </ProseMirror>
      </div>
    </section>
  );
}

function ConnectionSwitch({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={isOnline}
      onClick={onToggle}
      className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-fd-background py-1 pr-1 pl-3 text-xs font-medium"
    >
      {isOnline ? "Online" : "Offline"}
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
          isOnline ? "bg-green-600" : "bg-fd-foreground/25"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
            isOnline ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

function CustomHandle(props: DragHandleProps) {
  if (["image", "card", "card_deck"].includes(props.node.type.name)) {
    return null;
  }
  return <DragHandle {...props} />;
}
