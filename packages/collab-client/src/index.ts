import {
  receiveCommitTransaction,
  Commit,
  CommitJSON,
  getVersion,
  sendableCommit,
  NodeJSON,
} from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { EditorState } from "prosemirror-state";

export { receiveCommitTransaction, getVersion, Commit, type CommitJSON, type NodeJSON };

export { collab, collabKey } from "./plugin";

export interface CommitsListener {
  listen: (
    editorState: EditorState,
    options?: { signal?: AbortSignal | undefined },
  ) => AsyncIterableIterator<Commit[]>;
}

export interface CollabClientConfig {
  sendCommit: (commit: Commit) => Promise<void>;
  listener: CommitsListener;
  receiveCommits: (commits: Commit[]) => void;
}

export class CollabClient {
  private sending: null | string = null;

  private sendCommit: CollabClientConfig["sendCommit"];
  private listener: CollabClientConfig["listener"];
  private receiveCommits: CollabClientConfig["receiveCommits"];

  constructor(config: CollabClientConfig) {
    this.sendCommit = config.sendCommit;
    this.receiveCommits = config.receiveCommits;
    this.listener = config.listener;
  }

  async send(editorState: EditorState) {
    const commit = sendableCommit(editorState);
    if (!commit) return;
    // Avoid unnecessary network traffic by skipping commits
    // that we're already sending
    if (commit.ref === this.sending) return;

    this.sending = commit.ref;
    try {
      await this.sendCommit(commit);
    } catch {
      // If the send fails, then unset the
      // sending ref so that it's possible
      // to attempt to send this commit again
      // later.
      this.sending = null;
    }
  }

  update(config: Partial<Omit<CollabClientConfig, "listener">>) {
    if (config.sendCommit) this.sendCommit = config.sendCommit;
    if (config.receiveCommits) this.receiveCommits = config.receiveCommits;
  }

  async listen(editorState: EditorState, signal?: AbortSignal) {
    for await (const newCommits of this.listener.listen(editorState, {
      signal,
    })) {
      if (signal && signal.aborted) break;
      this.receiveCommits(newCommits);
    }
  }
}

export interface LongPollListenerOptions {
  timeout?: number;
  headers?: HeadersInit;
  fetch?: typeof globalThis.fetch;
}

export class LongPollListener {
  private headers: HeadersInit;
  private fetch: typeof globalThis.fetch;

  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  update(headers: HeadersInit) {
    this.headers = headers;
  }

  async *listen(editorState: EditorState, options: { signal?: AbortSignal | undefined } = {}) {
    const seen = new Set<string>();
    let version = getVersion(editorState);
    if (version === undefined) {
      throw new Error("EditorState is missing the collab plugin, unable to listen for changes");
    }

    while (!options?.signal || !options.signal.aborted) {
      const url = new URL(this.url);
      url.searchParams.append("version", version.toString());

      try {
        const response = await this.fetch(url, {
          headers: this.headers,
          ...(options?.signal && { signal: options.signal }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get commits. ${response.status}: ${response.statusText}`);
        }

        const commitJSONs = (await response.json()) as CommitJSON[];

        const commits = commitJSONs.map((json) => Commit.FromJSON(editorState.schema, json));

        // Ensure that we don't process the same commit multiple times
        const newCommits = commits.filter((commit) => !seen.has(commit.ref));
        const lastCommit = newCommits[newCommits.length - 1];
        if (!lastCommit) continue;
        version = lastCommit.version;
        newCommits.forEach((commit) => seen.add(commit.ref));

        yield newCommits;
      } catch (e) {
        console.error(e);

        if (options.signal?.aborted) return;

        // TODO: Implement a backoff strategy
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3_000);
        });
      }
    }
  }
}
