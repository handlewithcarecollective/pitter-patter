import { NodeJSON, CommitJSON } from "@pitter-patter/collab-client";

interface Doc {
  id: string;
  content: NodeJSON;
  version: number;
}

interface Commit {
  id: string;
  docId: string;
  ref: string;
  version: number;
  steps: CommitJSON["steps"];
}

export interface DB {
  doc: Doc;
  commit: Commit;
}
