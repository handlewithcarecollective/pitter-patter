import { type PresenceIndicator } from "./PresenceIndicator";
import { PresenceListener } from ".";

export interface PresenceClientConfig {
  userId: string;
  sendIndicator: (
    clientId: string,
    indicator: PresenceIndicator,
  ) => Promise<void>;
  receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
  listener: PresenceListener;
}
