import {
  collab,
  receiveCommitTransaction,
  Commit,
  CommitJSON,
  getVersion,
  sendableCommit,
} from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { EditorState } from "prosemirror-state";

export { collab, receiveCommitTransaction };

export { Commit, type CommitJSON };

export interface CollabClientConfig {
  sendCommit: (commit: Commit) => Promise<void>;
  getCommits: (version: number) => Promise<CommitJSON[]>;
  receiveCommits: (commits: Commit[]) => void;
}

export class CollabClient {
  private sending: null | string = null;
  private version: number | undefined = undefined;
  private seen = new Set<string>();

  private sendCommit: CollabClientConfig["sendCommit"];
  private getCommits: CollabClientConfig["getCommits"];
  private receiveCommits: CollabClientConfig["receiveCommits"];

  constructor(config: CollabClientConfig) {
    this.sendCommit = config.sendCommit;
    this.receiveCommits = config.receiveCommits;
    this.getCommits = config.getCommits;
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

  async listen(editorState: EditorState, signal: AbortSignal) {
    this.version = getVersion(editorState);

    if (this.version === undefined) {
      throw new Error(
        "EditorState is missing the collab plugin, unable to listen for changes",
      );
    }

    while (!signal.aborted) {
      try {
        const commitJSONs = await this.getCommits(this.version);
        const commits = commitJSONs.map((json) =>
          Commit.FromJSON(editorState.schema, json),
        );

        // Ensure that we don't process the same commit multiple times
        const newCommits = commits.filter(
          (commit) => !this.seen.has(commit.ref),
        );
        const lastCommit = newCommits[newCommits.length - 1];
        if (!lastCommit) continue;
        this.version = lastCommit.version;
        newCommits.forEach((commit) => this.seen.add(commit.ref));

        this.receiveCommits(newCommits);
      } catch (e) {
        // TODO: Implement a backoff strategy
        console.error(e);
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3_000);
        });
      }
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
  // private timeout: number;

  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    // this.timeout = options.timeout ?? 5_000;

    this.getCommits = this.getCommits.bind(this);
  }

  async getCommits(version: number) {
    const url = new URL(this.url);
    url.searchParams.append("version", version.toString());

    const response = await this.fetch(url, {
      // signal: AbortSignal.timeout(this.timeout),
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get commits. ${response.status}: ${response.statusText}`,
      );
    }

    const commitJSONs = (await response.json()) as CommitJSON[];
    return commitJSONs;
  }
}
