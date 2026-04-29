import { type NodeJSON } from "@pitter-patter/collab-client";
import { randomRef } from "@pitter-patter/refs";

export { comments, commentsKey, createCommentThreadMark, removeCommentThreadMarks } from "./plugin";

export { comment } from "./schema";

export interface Comment {
  userId: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  ref: string;
  commentJSON: NodeJSON;
}

export interface NewComment {
  commentJSON: NodeJSON;
}

export interface CommentsClientConfig {
  sendComment: (comment: NewComment & { ref: string }) => Promise<void>;
  getComments: (version: number | null, options?: { signal?: AbortSignal }) => Promise<Comment[]>;
  receiveComments: (comments: Comment[]) => void;
}

export class CommentsClient {
  private sending = new Set<string>();
  private seen = new Set<string>();
  private version: number | null = null;

  private sendComment: CommentsClientConfig["sendComment"];
  private getComments: CommentsClientConfig["getComments"];
  private receiveComments: CommentsClientConfig["receiveComments"];

  constructor(config: CommentsClientConfig) {
    this.sendComment = config.sendComment;
    this.getComments = config.getComments;
    this.receiveComments = config.receiveComments;
  }

  async send(comment: NewComment) {
    const ref = randomRef();
    this.sending.add(ref);
    try {
      await this.sendComment({ ...comment, ref });
    } catch (e) {
      this.sending.delete(ref);
      throw e;
    }
  }

  async listen(version: number | null, signal: AbortSignal) {
    this.version = version;

    while (!signal.aborted) {
      try {
        const comments = await this.getComments(this.version, { signal });
        const newComments = comments.filter((comment) => !this.seen.has(comment.ref));
        const lastComment = newComments[newComments.length - 1];
        if (!lastComment) continue;
        this.version = lastComment.version;
        newComments.forEach((comment) => this.seen.add(comment.ref));

        this.receiveComments(newComments);
      } catch (e) {
        console.error(e);
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3_000);
        });
      }
    }
  }
}

export interface LongPollListenerOptions {
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
    this.headers = options.headers ?? [];
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.getComments = this.getComments.bind(this);
  }

  async getComments(version: number | null) {
    const url = new URL(this.url);
    if (version !== null) {
      url.searchParams.append("version", version.toString());
    }

    const response = await this.fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get comments. ${response.status}: ${response.statusText}`);
    }

    const comments = (await response.json()) as Comment[];
    return comments;
  }
}
