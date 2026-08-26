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
        await this.ctx.storage.put({ docJSON, version, lastUpdatedTimestamp: Date.now() });
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

type GetDoc = {
  method: "getDoc";
  payload: {};
};

type GetCommits = {
  method: "getCommits";
  payload: {
    version: number;
  };
};

type CreateCommit = {
  method: "createCommit";
  payload: {
    commitJSON: CommitJSON;
  };
};

type GetPresence = {
  method: "getPresence";
  payload: {
    clientId: string;
    refs: Record<string, string>;
  };
};

type UpdatePresence = {
  method: "updatePresence";
  payload: {
    indicator: PresenceIndicator;
  };
};

type Body = { docId: string } & (GetDoc | GetCommits | CreateCommit | GetPresence | UpdatePresence);

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
    const body: Body = await request.json();
    const stub = env.PITTER_PATTER_AUTHORITY.getByName(body.docId);

    switch (body.method) {
      case "getDoc": {
        // oxlint-disable-next-line typescript/await-thenable
        return new Response(JSON.stringify(await stub.getDoc()));
      }
      case "getCommits": {
        // oxlint-disable-next-line typescript/await-thenable
        return new Response(JSON.stringify(await stub.getCommits(body.payload.version)));
      }
      case "createCommit": {
        await stub.createCommit(body.payload.commitJSON);
        return new Response(null, { status: 204 });
      }
      case "getPresence": {
        return new Response(
          JSON.stringify(await stub.getPresence(body.payload.clientId, body.payload.refs)),
        );
      }
      case "updatePresence": {
        await stub.updatePresence(body.payload.indicator);
        return new Response(null, { status: 204 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
