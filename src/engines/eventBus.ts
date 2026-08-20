/**
 * VSC Platform V3 - Lightweight Type-Safe Event Bus
 * Facilitates decoupling of business engines from UI controllers and side-effect processors.
 */

export type VscEventType =
  | "SCORE_SAVED"
  | "ROUND_FINISHED"
  | "TOURNAMENT_STARTED"
  | "SOLO_STARTED"
  | "SOLO_FINISHED"
  | "RANKING_UPDATED"
  | "QUALIFICATION_UPDATED"
  | "TEAM_UPDATED"
  | "STATISTICS_UPDATED";

export interface VscEventPayloads {
  SCORE_SAVED: { tournamentId: string; athleteId: string; distanceId: string; scores: (boolean | number | null)[] };
  ROUND_FINISHED: { tournamentId: string; roundId: string };
  TOURNAMENT_STARTED: { tournamentId: string };
  SOLO_STARTED: { tournamentId: string; athleteIds: string[]; distanceId: string };
  SOLO_FINISHED: { tournamentId: string; winnerId: string; distanceId: string };
  RANKING_UPDATED: { tournamentId: string; rankings: any[] };
  QUALIFICATION_UPDATED: { tournamentId: string; qualifiedIds: string[]; cutoffScore: number };
  TEAM_UPDATED: { tournamentId: string; teamRankings: any[] };
  STATISTICS_UPDATED: { tournamentId: string; statsSummary: any };
}

type EventCallback<T extends VscEventType> = (payload: VscEventPayloads[T]) => void;

class VscEventBus {
  private listeners: { [K in VscEventType]?: EventCallback<K>[] } = {};

  /**
   * Subscribe to a specific VSC event. Returns an unsubscribe function.
   */
  public subscribe<T extends VscEventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);

    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe a specific listener callback from an event.
   */
  public unsubscribe<T extends VscEventType>(event: T, callback: EventCallback<T>): void {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter((cb) => cb !== callback) as any;
  }

  /**
   * Publish an event to all subscribed listeners.
   */
  public publish<T extends VscEventType>(event: T, payload: VscEventPayloads[T]): void {
    const list = this.listeners[event];
    if (!list) return;
    list.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`[EventBus] Error executing handler for ${event}:`, err);
      }
    });
  }

  /**
   * Clear all subscribers (useful for testing and workspace cleanup).
   */
  public clear(): void {
    this.listeners = {};
  }
}

export const eventBus = new VscEventBus();
