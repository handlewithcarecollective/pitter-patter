import { CommitJSON } from "@pitter-patter/collab-client";
import { PresenceIndicator } from "@pitter-patter/presence-client";

type ServerMessage =
  | { type: "commits"; commits: CommitJSON[] }
  | { type: "presence"; indicators: Record<string, PresenceIndicator> };

interface WebSocketHandlers {
  onCommits?: (commits: CommitJSON[]) => void;
  onPresence?: (indicators: Record<string, PresenceIndicator>) => void;
}

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private openPromise: Promise<void> = Promise.resolve();
  public handlers: WebSocketHandlers = {};

  private commitsPromise: { promise: Promise<void>; resolve: () => void } | null = null;
  private bufferedCommits: CommitJSON[][] = [];
  private presencePromise: { promise: Promise<void>; resolve: () => void } | null = null;
  private bufferedPresence: Record<string, PresenceIndicator> | null = null;

  constructor(private url: URL) {}

  connect(): void {
    this.disconnect();

    const ws = new WebSocket(this.url);
    this.ws = ws;

    this.openPromise = new Promise((resolve) => {
      ws.addEventListener(
        "open",
        () => {
          resolve();
        },
        { once: true },
      );
    });

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string) as ServerMessage;
      if (data.type === "commits") {
        this.bufferedCommits.push(data.commits);
        this.commitsPromise?.resolve();
        this.commitsPromise = null;
      }
      if (data.type === "presence") {
        this.bufferedPresence = data.indicators;
        this.presencePromise?.resolve();
        this.presencePromise = null;
      }
    });
  }

  async *commits() {
    while (true) {
      if (!this.commitsPromise && this.bufferedCommits.length === 0) {
        let resolve!: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });
        this.commitsPromise = {
          promise,
          resolve,
        };
      }
      if (this.commitsPromise) {
        await this.commitsPromise.promise;
      }

      yield this.bufferedCommits.shift();
    }
  }

  async getCommits(sinceVersion: number) {
    await this.openPromise;
    if (
      !this.ws ||
      this.ws.readyState === this.ws.CLOSING ||
      this.ws.readyState === this.ws.CLOSED
    ) {
      throw new Error("Websocket closed");
    }
    this.ws.send(JSON.stringify({ type: "getCommits", version: sinceVersion }));
  }

  async *presence() {
    while (true) {
      if (!this.presencePromise && !this.bufferedPresence) {
        let resolve!: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });
        this.presencePromise = {
          promise,
          resolve,
        };
      }

      if (this.presencePromise) {
        await this.presencePromise.promise;
      }

      const presence = this.bufferedPresence;
      this.bufferedPresence = null;
      yield presence ?? undefined;
    }
  }

  async getPresence(clientId: string, refs: Record<string, string>) {
    await this.openPromise;
    if (
      !this.ws ||
      this.ws.readyState === this.ws.CLOSING ||
      this.ws.readyState === this.ws.CLOSED
    ) {
      throw new Error("Websocket closed");
    }
    this.ws.send(JSON.stringify({ type: "getPresence", clientId, refs }));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  async sendCommit(commitJSON: CommitJSON): Promise<void> {
    await this.openPromise;
    this.ws?.send(JSON.stringify({ type: "commit", commitJSON }));
  }

  async sendIndicator(indicator: PresenceIndicator): Promise<void> {
    await this.openPromise;
    this.ws?.send(JSON.stringify({ type: "presence", indicator }));
  }
}
