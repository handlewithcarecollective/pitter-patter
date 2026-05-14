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
    version: number,
    options?: { signal?: AbortSignal },
  ) => AsyncIterableIterator<CommitJSON[]>;
  updateVersion: (
    version: number
  );
}

export interface CollabClientConfig {
  sendCommit: (commit: Commit) => Promise<void>;
  listener: CommitsListener;
  receiveCommits: (commits: Commit[]) => void;
}

export class CollabClient {
  private sending: null | string = null;
  private version: number | undefined = undefined;
  private seen = new Set<string>();
  private controller = new AbortController();

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
    this.version = getVersion(editorState);

    if (this.version === undefined) {
      throw new Error("EditorState is missing the collab plugin, unable to listen for changes");
    }

    const getCommitsSignal = AbortSignal.any([...(signal ? [signal] : []), this.controller.signal]);

    this.listener.updateVersion(this.version)
    for await (const commitJSONs of this.listener.listen(this.version, {
      signal: getCommitsSignal,
    })) {
      if (getCommitsSignal.aborted) break;
      const commits = commitJSONs.map((json) => Commit.FromJSON(editorState.schema, json));

      // Ensure that we don't process the same commit multiple times
      const newCommits = commits.filter((commit) => !this.seen.has(commit.ref));
      const lastCommit = newCommits[newCommits.length - 1];
      if (!lastCommit) continue;
      this.version = lastCommit.version;
      this.listener.updateVersion(this.version)
      newCommits.forEach((commit) => this.seen.add(commit.ref));

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
  private version: number;

  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.version = 0;
  }

  update(headers: HeadersInit) {
    this.headers = headers;
  }

  async *listen(options: { signal?: AbortSignal } = {}) {
    while (!options?.signal || !options.signal.aborted) {
      const url = new URL(this.url);
      url.searchParams.append("version", this.version.toString());

      try {
        const response = await this.fetch(url, {
          headers: this.headers,
          ...(options?.signal && { signal: options.signal }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get commits. ${response.status}: ${response.statusText}`);
        }

        const commitJSONs = (await response.json()) as CommitJSON[];
        yield commitJSONs;
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

  updateVersion(version: number) {
    this.version = version;
  }
}
