/**
 * VSC Platform V3 - Solo Shootout Engine
 * Handles tie-breaker shootoff scoring rules when athletes are tied at critical boundaries.
 */

export interface SoloShootoutAthlete {
  athleteId: string;
  shots: (boolean | number | null)[]; // Shootout round shots
}

export interface SoloShootoutInput {
  athletes: SoloShootoutAthlete[];
  isDirectPointMode: boolean;
}

export interface SoloShootoutResult {
  isResolved: boolean;
  winnerId: string | null;
  tiedIds: string[];
  standings: { athleteId: string; totalScore: number; rank: number }[];
}

export class SoloEngine {
  /**
   * Determine results of a standard single-round Solo shoot-off.
   */
  public static evaluate(input: SoloShootoutInput): SoloShootoutResult {
    const { athletes, isDirectPointMode } = input;

    const standings = athletes.map((ath) => {
      let totalScore = 0;
      for (const shot of ath.shots) {
        if (shot === null || shot === undefined) continue;
        if (isDirectPointMode && typeof shot === "number") {
          totalScore += shot;
        } else if (!isDirectPointMode && shot === true) {
          totalScore += 1;
        }
      }
      return {
        athleteId: ath.athleteId,
        totalScore
      };
    });

    // Sort standings descending
    standings.sort((a, b) => b.totalScore - a.totalScore);

    if (standings.length === 0) {
      return { isResolved: false, winnerId: null, tiedIds: [], standings: [] };
    }

    const maxScore = standings[0].totalScore;
    const tiedAtTop = standings.filter((s) => s.totalScore === maxScore);

    const rankedStandings = standings.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    if (tiedAtTop.length === 1) {
      // Tie successfully resolved!
      return {
        isResolved: true,
        winnerId: tiedAtTop[0].athleteId,
        tiedIds: [],
        standings: rankedStandings
      };
    } else {
      // Still tied at the top, requires Re-Solo
      return {
        isResolved: false,
        winnerId: null,
        tiedIds: tiedAtTop.map((s) => s.athleteId),
        standings: rankedStandings
      };
    }
  }
}
