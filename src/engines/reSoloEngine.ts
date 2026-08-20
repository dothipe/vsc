/**
 * VSC Platform V3 - Re-Solo (Sudden Death) Engine
 * Manages rapid single-shot shootout progressions to break persistent ties.
 */

export interface ReSoloAthlete {
  athleteId: string;
  suddenDeathShots: (boolean | number)[]; // Single sudden death shots in sequence
}

export interface ReSoloInput {
  athletes: ReSoloAthlete[];
  isDirectPointMode: boolean;
}

export interface ReSoloResult {
  isResolved: boolean;
  winnerId: string | null;
  currentShotRound: number; // Which shot index finally resolved it
  tiedIds: string[];
}

export class ReSoloEngine {
  /**
   * Evaluates sudden-death single shot logs step-by-step.
   */
  public static evaluate(input: ReSoloInput): ReSoloResult {
    const { athletes, isDirectPointMode } = input;
    if (athletes.length === 0) {
      return { isResolved: false, winnerId: null, currentShotRound: 0, tiedIds: [] };
    }

    // Determine the maximum number of sudden death shots taken by anyone
    const maxShots = Math.max(...athletes.map((a) => a.suddenDeathShots.length));

    let activeTiedIds = athletes.map((a) => a.athleteId);

    // Evaluate shot by shot (sudden death style)
    for (let roundIdx = 0; roundIdx < maxShots; roundIdx++) {
      const roundScores = athletes
        .filter((a) => activeTiedIds.includes(a.athleteId))
        .map((a) => {
          const shotVal = a.suddenDeathShots[roundIdx];
          let score = 0;
          if (shotVal !== undefined && shotVal !== null) {
            if (isDirectPointMode && typeof shotVal === "number") {
              score = shotVal;
            } else if (!isDirectPointMode && shotVal === true) {
              score = 1;
            }
          }
          return { athleteId: a.athleteId, score };
        });

      if (roundScores.length === 0) break;

      // Find highest score in this individual round
      const maxRoundScore = Math.max(...roundScores.map((r) => r.score));
      const winnersOfRound = roundScores.filter((r) => r.score === maxRoundScore);

      // If one athlete scored higher in this sudden death shot, they win!
      if (winnersOfRound.length === 1) {
        return {
          isResolved: true,
          winnerId: winnersOfRound[0].athleteId,
          currentShotRound: roundIdx + 1,
          tiedIds: []
        };
      }

      // If multiple people tied with the maximum score, they move to the next shot, everyone else is eliminated
      activeTiedIds = winnersOfRound.map((w) => w.athleteId);
    }

    // Still unresolved after all available shots
    return {
      isResolved: false,
      winnerId: null,
      currentShotRound: maxShots,
      tiedIds: activeTiedIds
    };
  }
}
