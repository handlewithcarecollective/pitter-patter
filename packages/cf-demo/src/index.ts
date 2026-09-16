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
} from "./adapters/presence.tsx";
import { schema } from "./schema.ts";

interface StoredDoc {
  docJSON: ProseMirrorJsonNode;
  version: number;
  lastUpdatedTimestamp: number;
}

export class PitterPatterAuthority extends DurableObject<Env> {
  private collabAuthority: CollabAuthority<null>;
  private presenceAuthority: PresenceAuthority;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.presenceAuthority = new PresenceAuthority({
      persistenceManager: new DurableObjectPersistenceManager(this.ctx.storage),
      broadcastManager: new PresenceBroadcastManager({}),
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
      getCommits: async (_tr, _docId, version) => {
        const commits = (await this.ctx.storage.get<CommitJSON[]>("commits")) ?? [];
        return commits.filter((c) => c.version > version);
      },
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
      broadcastManager: new CollabBroadcastManager({}),
    });
  }

  async getDoc(): Promise<StoredDoc> {
    return (
      (await this.ctx.storage.get<StoredDoc>("doc")) ?? {
        docJSON: schema.nodes.doc.create().toJSON(),
        version: 0,
        lastUpdatedTimestamp: Date.now(),
      }
    );
  }

  async getCommits(version: number): Promise<CommitJSON[]> {
    return this.collabAuthority.listenForCommit("", version);
  }

  async createCommit(commitJSON: CommitJSON): Promise<void> {
    await this.collabAuthority.receiveCommit("", commitJSON);
  }

  async getPresence(
    clientId: string,
    refs: Record<string, string>,
  ): Promise<Record<string, PresenceIndicator>> {
    return this.presenceAuthority.listenForPresence("", clientId, refs);
  }

  async updatePresence(indicator: PresenceIndicator): Promise<void> {
    await this.presenceAuthority.updatePresence("", indicator);
  }
}

type CreateCommit = {
  commitJSON: CommitJSON;
};

type GetPresence = {
  clientId: string;
  refs: Record<string, string>;
};

type UpdatePresence = {
  indicator: PresenceIndicator;
};

export interface Env {
  PITTER_PATTER_AUTHORITY: DurableObjectNamespace<PitterPatterAuthority>;
}

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    };
    const [, docId, endpoint, clientId] = path.split("/");
    if (!docId) return new Response(null, { status: 404, headers });
    const stub = env.PITTER_PATTER_AUTHORITY.getByName(docId);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    if (request.method === "GET") {
      switch (endpoint) {
        case "doc": {
          // oxlint-disable-next-line typescript/await-thenable
          return new Response(JSON.stringify(await stub.getDoc()), { headers });
        }
        case "commits": {
          const version = url.searchParams.get("version") ?? "0";
          // oxlint-disable-next-line typescript/await-thenable
          return new Response(JSON.stringify(await stub.getCommits(parseInt(version, 10))), {
            headers,
          });
        }
        default: {
          return new Response(null, { status: 404, headers });
        }
      }
    } else if (request.method === "POST") {
      const body = await request.json();
      switch (endpoint) {
        case "commits": {
          await stub.createCommit((body as CreateCommit).commitJSON);
          return new Response(null, { status: 204, headers });
        }
        case "presence": {
          if (clientId) {
            const [, clientId] = path.split("/");
            if (!clientId) throw new Error("Missing clientId");

            await stub.updatePresence((body as UpdatePresence).indicator);
            return new Response(null, { status: 204, headers });
          }
          return new Response(
            JSON.stringify(
              await stub.getPresence((body as GetPresence).clientId, (body as GetPresence).refs),
            ),
            { headers },
          );
        }
        default: {
          return new Response(null, { status: 404, headers });
        }
      }
    }

    return new Response(null, { status: 405, headers });
  },
} satisfies ExportedHandler<Env>;
