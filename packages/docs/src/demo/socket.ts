import { CommitJSON } from "@pitter-patter/collab-client";
import { PresenceIndicator } from "@pitter-patter/presence-client";

type ServerMessage =
  | { type: "commits"; commits: CommitJSON[] }
  | { type: "presence"; indicators: Record<string, PresenceIndicator> };

interface WebSocketHandlers {
  onCommits: (commits: CommitJSON[]) => void;
  onPresence: (indicators: Record<string, PresenceIndicator>) => void;
}

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private openPromise: Promise<void> = Promise.resolve();

  constructor(
    private url: URL,
    private handlers: WebSocketHandlers,
  ) {}

  connect(sinceVersion: number): void {
    this.disconnect();

    const ws = new WebSocket(this.url);
    this.ws = ws;

    this.openPromise = new Promise((resolve) => {
      ws.addEventListener(
        "open",
        () => {
          ws.send(JSON.stringify({ type: "subscribe", version: sinceVersion }));
          resolve();
        },
        { once: true },
      );
    });

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string) as ServerMessage;
      if (data.type === "commits" && data.commits.length) this.handlers.onCommits(data.commits);
      if (data.type === "presence") this.handlers.onPresence(data.indicators);
    });
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
