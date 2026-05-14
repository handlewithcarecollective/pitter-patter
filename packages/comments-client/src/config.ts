import { PresenceIndicator } from "./PresenceIndicator";

export interface PresenceClientConfig {
  userId: string;
  sendIndicator: (clientId: string, indicator: PresenceIndicator) => Promise<void>;
  listener: PresenceListener;
  receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
}
