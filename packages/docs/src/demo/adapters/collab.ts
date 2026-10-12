import { EditorState } from "prosemirror-state";

import { Commit, CommitJSON, getVersion } from "@pitter-patter/collab-client";

export class WebSocketListener {
  constructor(
    private getCommits: (version: number) => Promise<void>,
    private commitsIterator: AsyncIterator<CommitJSON[] | undefined, void, unknown>,
  ) {}

  async *listen(editorState: EditorState, options: { signal?: AbortSignal | undefined } = {}) {
    const seen = new Set<string>();
    let version = getVersion(editorState);
    if (version === undefined) {
      throw new Error("EditorState is missing the collab plugin, unable to listen for changes");
    }

    while (!options.signal || !options.signal.aborted) {
      try {
        await this.getCommits(version);
        const { value: commitJSONs } = await this.commitsIterator.next();
        if (!commitJSONs) continue;

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
