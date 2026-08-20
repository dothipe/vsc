/**
 * VSC Platform V3 - Match Engine
 * Manages match-level and lane-level lifecycle states, shots progress counters,
 * referee credentials assignment, and lane releases.
 */

export interface LaneState {
  laneNumber: number;
  athleteId: string | null;
  refereeId: string | null;
  currentShotIndex: number;
  totalShotsRequired: number;
  scores: (boolean | number | null)[];
  status: "idle" | "preparing" | "active" | "completed";
}

export interface MatchAction {
  type: "ASSIGN" | "START_MATCH" | "RECORD_SHOT" | "CLEAR_SHOT" | "FINISH_MATCH" | "RESET";
  payload?: any;
}

export class MatchEngine {
  /**
   * Transition state of a single lane based on game actions.
   */
  public static reduce(state: LaneState, action: MatchAction): LaneState {
    switch (action.type) {
      case "ASSIGN": {
        const { athleteId, refereeId, totalShots } = action.payload;
        return {
          ...state,
          athleteId,
          refereeId,
          currentShotIndex: 0,
          totalShotsRequired: totalShots,
          scores: Array(totalShots).fill(null),
          status: "preparing"
        };
      }

      case "START_MATCH": {
        if (!state.athleteId) return state;
        return {
          ...state,
          status: "active",
          currentShotIndex: 0
        };
      }

      case "RECORD_SHOT": {
        if (state.status !== "active") return state;
        const { scoreValue } = action.payload;
        const newScores = [...state.scores];
        newScores[state.currentShotIndex] = scoreValue;

        const nextIndex = state.currentShotIndex + 1;
        const isFinished = nextIndex >= state.totalShotsRequired;

        return {
          ...state,
          scores: newScores,
          currentShotIndex: isFinished ? state.currentShotIndex : nextIndex,
          status: isFinished ? "completed" : "active"
        };
      }

      case "CLEAR_SHOT": {
        if (state.status !== "active" && state.status !== "completed") return state;
        const targetIndex = state.currentShotIndex === state.totalShotsRequired - 1 && state.scores[state.currentShotIndex] !== null
          ? state.currentShotIndex
          : Math.max(0, state.currentShotIndex - 1);

        const newScores = [...state.scores];
        newScores[targetIndex] = null;

        return {
          ...state,
          scores: newScores,
          currentShotIndex: targetIndex,
          status: "active" // Reverts to active upon backing up shot
        };
      }

      case "FINISH_MATCH": {
        return {
          ...state,
          status: "completed"
        };
      }

      case "RESET": {
        return {
          laneNumber: state.laneNumber,
          athleteId: null,
          refereeId: null,
          currentShotIndex: 0,
          totalShotsRequired: 0,
          scores: [],
          status: "idle"
        };
      }

      default:
        return state;
    }
  }
}
