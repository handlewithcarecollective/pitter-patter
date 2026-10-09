import { ProseMirrorJsonNode } from "@handlewithcare/prosemirror-json";
import { DurableObject } from "cloudflare:workers";

import {
  CollabAuthority,
  CollabAuthorityConfig,
  type CommitJSON,
} from "@pitter-patter/collab-server";
import { PresenceAuthority, type PresenceIndicator } from "@pitter-patter/presence-server";

import { DurableObjectBroadcastManager as CollabBroadcastManager } from "./adapters/collab.ts";
import {
  DurableObjectBroadcastManager as PresenceBroadcastManager,
  DurableObjectPersistenceManager,
  getIndicators,
} from "./adapters/presence.tsx";
import { schema } from "./schema.ts";

interface StoredDoc {
  docJSON: ProseMirrorJsonNode;
  version: number;
  lastUpdatedTimestamp: number;
}

type ClientMessage =
  | { type: "subscribe"; version: number }
  | { type: "commit"; commitJSON: CommitJSON }
  | { type: "presence"; indicator: PresenceIndicator };

export class PitterPatterAuthority extends DurableObject<Env> {
  private collabAuthority: CollabAuthority<null>;
  private presenceAuthority: PresenceAuthority;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.presenceAuthority = new PresenceAuthority({
      persistenceManager: new DurableObjectPersistenceManager(this.ctx.storage),
      broadcastManager: new PresenceBroadcastManager({ ctx: this.ctx }),
    });
    this.collabAuthority = new CollabAuthority({
      schema,
      runWithTransaction: (cb) => cb(null),
      getDoc: async () =>
        (await this.getDoc()) as unknown as ReturnType<CollabAuthorityConfig<null>["getDoc"]>,
      getCommit: async (_tr, _docId, commitRef) => {
        const commits = (await this.ctx.storage.get<CommitJSON[]>("commits")) ?? [];
        return commits.find((c) => c.ref === commitRef) ?? null;
      },
      getCommits: async (_tr, _docId, version) => this.getStoredCommitsAfter(version),
      saveDoc: async (_tr, _docId, docJSON, version) => {
        await this.ctx.storage.put("doc", { docJSON, version, lastUpdatedTimestamp: Date.now() });
      },
      saveCommit: async (_tr, _docId, commitRef, commitVersion, commitSteps) => {
        const commits = (await this.ctx.storage.get<CommitJSON[]>("commits")) ?? [];
        await this.ctx.storage.put(
          "commits",
          commits.concat({ ref: commitRef, version: commitVersion, steps: commitSteps }),
        );
      },
      broadcastManager: new CollabBroadcastManager({ ctx: this.ctx }),
    });
  }

  override fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;

    const data = JSON.parse(message) as ClientMessage;
    switch (data.type) {
      case "subscribe": {
        const commits = await this.getStoredCommitsAfter(data.version);
        ws.send(JSON.stringify({ type: "commits", commits }));
        ws.send(JSON.stringify({ type: "presence", indicators: getIndicators(this.ctx, ws) }));
        break;
      }
      case "commit": {
        await this.createCommit(data.commitJSON);
        break;
      }
      case "presence": {
        // ws.serializeAttachment({ clientId: data.indicator.clientId });
        ws.serializeAttachment({ clientId: data.indicator.clientId, indicator: data.indicator });
        await this.updatePresence(data.indicator);
        break;
      }
    }
  }

  private async getStoredCommitsAfter(version: number): Promise<CommitJSON[]> {
    const commits = (await this.ctx.storage.get<CommitJSON[]>("commits")) ?? [];
    return commits.filter((c) => c.version > version);
  }

  async getDoc(): Promise<StoredDoc> {
    return (
      (await this.ctx.storage.get<StoredDoc>("doc")) ?? {
        // docJSON: schema.nodes.doc.create().toJSON(),
        docJSON: { type: "doc", content: [{ type: "paragraph" }] },
        version: 0,
        lastUpdatedTimestamp: Date.now(),
      }
    );
  }

  async createCommit(commitJSON: CommitJSON): Promise<void> {
    await this.collabAuthority.receiveCommit("", commitJSON);
  }

  async updatePresence(indicator: PresenceIndicator): Promise<void> {
    await this.presenceAuthority.updatePresence("", indicator);
  }
}

export interface Env {
  PITTER_PATTER_AUTHORITY: DurableObjectNamespace<PitterPatterAuthority>;
}

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker.
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const [, docId, endpoint] = url.pathname.split("/");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (!docId) return new Response(null, { status: 404, headers });
    const stub = env.PITTER_PATTER_AUTHORITY.getByName(docId);

    if (request.headers.get("Upgrade") === "websocket") {
      return stub.fetch(request);
    }

    if (request.method === "GET" && endpoint === "doc") {
      // oxlint-disable-next-line typescript/await-thenable
      return new Response(JSON.stringify(await stub.getDoc()), { headers });
    }

    return new Response(null, { status: 405, headers });
  },
} satisfies ExportedHandler<Env>;
