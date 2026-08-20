/**
 * VSC Platform V3 - Qualification & Cutoff Engine
 * Pure computation module that calculates cutoff thresholds, advances athletes,
 * and identifies athletes flagged for solo/re-solo shootouts at boundaries.
 */

import { RankedAthleteOutput } from "./rankingEngine";

export interface QualificationRuleInput {
  rankedAthletes: RankedAthleteOutput[];
  advancingCount: number; // e.g., Top 16 advance
  allowTiesAtBoundary: boolean; // if false, ties at border must trigger shootoffs
}

export interface QualificationResult {
  qualified: RankedAthleteOutput[];
  eliminated: RankedAthleteOutput[];
  pendingSoloShootout: RankedAthleteOutput[]; // Athletes tied exactly at the advancing cutoff boundary
  cutoffScore: number;
}

export class QualificationEngine {
  /**
   * Evaluate who qualifies, who is eliminated, and who must enter a shootout.
   */
  public static evaluate(input: QualificationRuleInput): QualificationResult {
    const { rankedAthletes, advancingCount, allowTiesAtBoundary } = input;

    if (rankedAthletes.length === 0) {
      return { qualified: [], eliminated: [], pendingSoloShootout: [], cutoffScore: 0 };
    }

    // Filter non-withdrawn valid athletes and withdrawn ones
    const validAthletes = rankedAthletes.filter(a => !a.isWithdrawn && a.rank !== 999);
    const withdrawnAthletes = rankedAthletes.filter(a => a.isWithdrawn || a.rank === 999);

    if (validAthletes.length <= advancingCount) {
      if (allowTiesAtBoundary) {
        return {
          qualified: [...validAthletes],
          eliminated: [...withdrawnAthletes],
          pendingSoloShootout: [],
          cutoffScore: validAthletes[validAthletes.length - 1]?.totalScore || 0
        };
      }
      // Otherwise, if Solo shootout is active (allowTiesAtBoundary is false), we fall through
      // to check if there is a tie at the boundary (last place) that needs to be broken!
    }

    // Cutoff rank boundary: the athlete at index (advancingCount - 1) among sorted validAthletes
    const boundaryIndex = Math.min(advancingCount - 1, validAthletes.length - 1);
    const boundaryAthlete = validAthletes[boundaryIndex];
    if (!boundaryAthlete) {
      return {
        qualified: [...validAthletes],
        eliminated: [...withdrawnAthletes],
        pendingSoloShootout: [],
        cutoffScore: 0
      };
    }

    const boundaryRank = boundaryAthlete.rank;
    const cutoffScore = boundaryAthlete.totalScore;

    // Identify all athletes who share the exact same rank as the boundary athlete
    const athletesWithBoundaryRank = validAthletes.filter(a => a.rank === boundaryRank);

    // Is there a tie at the boundary rank?
    // A tie exists at the boundary rank if multiple athletes share boundaryRank OR if boundaryAthlete is marked as isTied
    const isBoundaryTied = athletesWithBoundaryRank.length > 1 || boundaryAthlete.isTied;

    // Athletes with rank strictly better than boundary rank (e.g. rank < boundaryRank)
    const clearQualified = validAthletes.filter(a => a.rank < boundaryRank);

    // Athletes with rank strictly worse than boundary rank (e.g. rank > boundaryRank)
    const clearEliminated = [
      ...validAthletes.filter(a => a.rank > boundaryRank),
      ...withdrawnAthletes
    ];

    const qualified: RankedAthleteOutput[] = [];
    const eliminated: RankedAthleteOutput[] = [];
    const pendingSoloShootout: RankedAthleteOutput[] = [];

    if (!isBoundaryTied) {
      // No tie at the cutoff rank boundary!
      // All athletes with rank <= boundaryRank qualify cleanly!
      const cleanlyAdvancing = validAthletes.filter(a => a.rank <= boundaryRank);
      qualified.push(...cleanlyAdvancing);
      eliminated.push(...clearEliminated);
    } else {
      // There IS a tie at boundaryRank!
      const availableSlots = advancingCount - clearQualified.length;

      if (athletesWithBoundaryRank.length <= availableSlots) {
        // Even if allowTiesAtBoundary is false, since ALL of them fit inside the available slots,
        // they can all qualify cleanly without crossing the boundary!
        qualified.push(...clearQualified, ...athletesWithBoundaryRank);
        eliminated.push(...clearEliminated);
      } else if (allowTiesAtBoundary) {
        // Allow ties: everyone at boundaryRank advances as well
        qualified.push(...clearQualified, ...athletesWithBoundaryRank);
        eliminated.push(...clearEliminated);
      } else {
        // Ties NOT allowed at boundary (Solo Shootout enabled)
        if (availableSlots <= 0) {
          // All advancing slots taken by higher-ranked athletes -> boundary tied candidates eliminated!
          qualified.push(...clearQualified);
          eliminated.push(...athletesWithBoundaryRank, ...clearEliminated);
        } else {
          // Shootout is required to break ties at the boundary rank!
          qualified.push(...clearQualified);
          pendingSoloShootout.push(...athletesWithBoundaryRank);
          eliminated.push(...clearEliminated);
        }
      }
    }

    return {
      qualified,
      eliminated,
      pendingSoloShootout,
      cutoffScore
    };
  }
}
