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

export { collab, collabKey } from "./plugin.ts";

export interface CommitsListener {
  listen: (
    editorState: EditorState,
    options?: { signal?: AbortSignal | undefined },
  ) => AsyncIterableIterator<Commit[]>;
}

export interface CollabClientConfig {
  /**
   * Sends local commits to a remote server to be merged into the remote document state.
   * The endpoint this function hits is defined by you, and should call the
   * CollabAuthority's {@link https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#receivecommit | receiveCommit}
   * function.
   *
   * @param commit - the latest prosemirror commit made by the local user
   */
  sendCommit: (commit: Commit) => Promise<void>;
  /**
   * A listener for remote commits.
   *
   * Currently the only built-in option is the {@link LongPollListener}.
   */
  listener: CommitsListener;
  // Todo: The example in this doc rely's on some react context, how to show it otherwise
  //       It feels useful to show that you use receiveCommitTransaction to merge the editor
  //       state, but that might just be because I wouldn't know how to do it otherwise.
  //       See the doc in the Presence client config's receiveIndicators for an alternative approach.
  /**
   * Receives an array of commits and merges them into your local editor state.
   *
   * @example
   * ```
   * import receiveCommitTransaction from "@stepwisehq/prosemirror-collab-commit/collab-commit";
   *
   * receiveCommits: (commits) => {
   *   view.dispatch(
   *     view.state.apply(
   *       commits.reduce((acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)), prev)
   *     )
   *   )
   * },
   * ```
   */
  receiveCommits: (commits: Commit[]) => void;
}

/**
 * The client that manages sending local editor state changes to the remote server and merging
 * remote changes into local editor state.
 */
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

  /**
   * Send local editor state changes to the remote server.
   */
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

  /**
   * Updates the desired portion of the client's `CollabClientConfig`. For example, this can
   * be used to update the auth headers used by `sendCommit`.
   */
  update(config: Partial<Omit<CollabClientConfig, "listener">>) {
    if (config.sendCommit) this.sendCommit = config.sendCommit;
    if (config.receiveCommits) this.receiveCommits = config.receiveCommits;
  }

  /**
   * Start listening for remote commits. This function should only be called once.
   */
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
  // Todo: the timeout option is not currently used in the LongPollListner. Add support for it.
  // timeout?: number;
  /**
   * Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty object.
   */
  headers?: HeadersInit;
  /**
   * The fetch method to use when making requests. Defaults to the global fetch method.
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * A CommitsListener that polls an endpoint for remote updates to a document. Intended to be used
 * with an remote long polling endpoint that calls a Collab Authority's {@link https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#listenforcommit | listenForCommit}
 * function to efficiently listen for updates.
 */
export class LongPollListener {
  private headers: HeadersInit;
  private fetch: typeof globalThis.fetch;

  /**
   * @param url - the url that polling requests will be sent to
   */
  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Update the headers sent with long polling requests.
   */
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
