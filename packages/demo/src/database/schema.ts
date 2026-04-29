import { Generated } from "kysely";

import { NodeJSON, CommitJSON } from "@pitter-patter/collab-client";

interface Doc {
  id: string;
  content: NodeJSON;
  version: number;
  createdAt: Generated<string>;
  updatedAt: Generated<string>;
}

interface Commit {
  id: string;
  docId: string;
  ref: string;
  version: number;
  steps: CommitJSON["steps"];
  createdAt: Generated<string>;
  updatedAt: Generated<string>;
}

interface Commit {
  id: string;
  docId: string;
  ref: string;
  version: number;
  comment: NodeJSON;
  createdAt: Generated<string>;
  updatedAt: Generated<string>;
}

interface Snapshot {
  id: string;
  docId: string;
  version: number;
  content: NodeJSON;
  createdAt: Generated<string>;
  updatedAt: Generated<string>;
}

export interface DB {
  doc: Doc;
  commit: Commit;
  snapshot: Snapshot;
}
