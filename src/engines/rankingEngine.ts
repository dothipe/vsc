/**
 * VSC Platform V3 - Ranking Engine
 * Pure computation module that orders athletes based on normalized score packages.
 */

import { Athlete, DistanceConfigV3, DistanceConfig } from "../types";
import { UnifiedScorePackage, ScoreAggregationLayer } from "../foundation/scoreAggregationLayer";
import { calculateRounds, compareSoloRounds, computeSoloFraction } from "../utils/qualification";

// Helper to safely extract solo rounds/hits array strictly for a specific distance or created round ID
export function getSoloRoundsFromDist(ath: Athlete | undefined | null, distObj?: DistanceConfigV3 | DistanceConfig | any): number[] {
  if (!ath || !distObj) return [];

  const rawDistId = distObj.id ? String(distObj.id).trim().toLowerCase() : "";
  const stageId = distObj.stageId ? String(distObj.stageId).trim().toLowerCase() : "";
  const distanceId = distObj.distanceId ? String(distObj.distanceId).trim().toLowerCase() : "";
  const code = distObj.code ? String(distObj.code).trim().toLowerCase() : "";
  const distVal = distObj.distance !== undefined && distObj.distance !== null ? String(distObj.distance).trim().toLowerCase() : "";
  const distName = distObj.name ? String(distObj.name).trim().toLowerCase() : "";

  // Extract all numeric stage indicators from distObj
  const allTexts = [rawDistId, stageId, distanceId, code, distName, distVal].filter(Boolean);
  const stageNumMatch = (rawDistId || stageId || distName || code || distVal).match(/stage[_\-]?(\d+)|vòng[_\-]?\s*(\d+)|v[_\-]?(\d+)|dist[_\-]?(\d+)|^(\d+)$/i);
  const stageNum = stageNumMatch ? (stageNumMatch[1] || stageNumMatch[2] || stageNumMatch[3] || stageNumMatch[4] || stageNumMatch[5]) : null;

  // Direct keys to check first
  const directKeys = [rawDistId, distObj.id, distObj.distance, distObj.name, stageId, distanceId, code]
    .filter(Boolean)
    .map(k => String(k).trim().toLowerCase());

  // Build candidate set of key strings for this distance
  const candidateKeys = new Set<string>(directKeys);
  allTexts.forEach(t => {
    candidateKeys.add(t);
    candidateKeys.add(`${t}-solo`);
    candidateKeys.add(`${t}_solo`);
    candidateKeys.add(`dist-${t}`);
    candidateKeys.add(`stage-${t}`);
    candidateKeys.add(`vong-${t}`);
    candidateKeys.add(`v-${t}`);
  });

  if (stageNum) {
    candidateKeys.add(stageNum);
    candidateKeys.add(`${stageNum}-solo`);
    candidateKeys.add(`${stageNum}_solo`);
    candidateKeys.add(`dist-${stageNum}`);
    candidateKeys.add(`stage-${stageNum}`);
    candidateKeys.add(`vong-${stageNum}`);
    candidateKeys.add(`v-${stageNum}`);
  }

  const isKeyMatch = (key: string): boolean => {
    if (!key) return false;
    const kLower = String(key).trim().toLowerCase();

    // Guard: If key explicitly references a stage number that differs from stageNum, reject!
    if (stageNum) {
      const keyStageMatch = kLower.match(/stage[_\-]?(\d+)|vòng[_\-]?\s*(\d+)|v[_\-]?(\d+)|dist[_\-]?(\d+)|^(\d+)$/i);
      if (keyStageMatch) {
        const kStageNum = keyStageMatch[1] || keyStageMatch[2] || keyStageMatch[3] || keyStageMatch[4] || keyStageMatch[5];
        if (kStageNum && kStageNum.length < 5 && kStageNum !== stageNum) {
          return false;
        }
      }
    }

    if (candidateKeys.has(kLower)) return true;

    // Try stripping prefixes/suffixes
    const stripped = kLower
      .replace(/[-_]solo$/i, "")
      .replace(/^(dist|stage|vong|v)[-_\s]?/i, "");

    if (candidateKeys.has(stripped)) return true;
    if (stageNum && stripped === stageNum) return true;

    return false;
  };

  const parseValue = (val: any): number[] | null => {
    if (val === null || val === undefined) return null;
    if (Array.isArray(val) && val.length > 0) {
      if (Array.isArray(val[0])) {
        return val.map((roundShots: any) => {
          if (!Array.isArray(roundShots)) return 0;
          return roundShots.reduce((sum: number, s: any) => {
            if (typeof s === "number") return sum + s;
            if (s === true) return sum + 1;
            return sum;
          }, 0);
        });
      }
      return val.map(r => (typeof r === "number" ? r : (r === true ? 1 : Number(r) || 0)));
    }
    if (typeof val === "number" && !isNaN(val)) {
      return [val];
    }
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) {
      return [Number(val)];
    }
    if (val === true) {
      return [1];
    }
    return null;
  };

  const extractFromDict = (dict: any): number[] | null => {
    if (!dict || typeof dict !== "object" || Array.isArray(dict)) return null;

    // Create a lowercase lookup dictionary to support case-insensitive exact direct key match
    const lowercaseDict: Record<string, any> = {};
    Object.keys(dict).forEach((k) => {
      lowercaseDict[k.toLowerCase().trim()] = dict[k];
    });

    // 1. Direct exact key match (case-insensitive) first!
    for (const dk of directKeys) {
      if (lowercaseDict[dk] !== undefined) {
        const parsed = parseValue(lowercaseDict[dk]);
        if (parsed) return parsed;
      }
    }

    // 2. Candidate key match using isKeyMatch
    for (const k of Object.keys(dict)) {
      if (isKeyMatch(k)) {
        const parsed = parseValue(dict[k]);
        if (parsed) return parsed;
      }
    }

    return null;
  };

  // 1. Check ath.soloRounds
  const rounds = extractFromDict(ath.soloRounds);
  if (rounds && rounds.length > 0) return rounds;

  // 2. Check ath.soloShotDetails
  const details = extractFromDict(ath.soloShotDetails);
  if (details && details.length > 0) return details;

  // 3. Check ath.soloHits
  const hits = extractFromDict(ath.soloHits);
  if (hits && hits.length > 0) return hits;

  return [];
}

export interface RankingInput {
  athletes: Athlete[];
  distances: DistanceConfigV3[];
  tieBreakRule: "highest_distance_multiplier" | "cumulative_accuracy" | "last_shot_rule";
  shotsCount?: number;
  directMaxPoints?: number;
  directMaxShots?: number;
}

export interface RankedAthleteOutput {
  athleteId: string;
  name: string;
  team: string;
  totalScore: number;
  accuracy: number;
  scoresByDistance: Record<string, number>;
  rank: number;
  isTied: boolean;
  tieBreakMetadata?: any;
  survivalVal?: number;
  survivalScore?: number;
  survivalHits?: number;
  survivalAccuracy?: number;
  survivalSoloHits?: number;
  soloHits?: number;
  qualificationStatus?: string;
  status?: string;
  isWithdrawn?: boolean;
  originalAthlete?: Athlete;
}

export interface NormalizedRankingInput {
  normalizedScores: UnifiedScorePackage[];
  tieBreakRule: "highest_distance_multiplier" | "cumulative_accuracy" | "last_shot_rule";
  distances: { id: string; multiplier: number }[];
}

export class RankingEngine {
  /**
   * Sort and rank athletes strictly using unified normalized score packages.
   * This decoupled version fulfills the core architectural contract.
   */
  public static calculateFromNormalized(input: NormalizedRankingInput): RankedAthleteOutput[] {
    const { normalizedScores, tieBreakRule, distances } = input;

    // Map to intermediate sorting models
    const sortedList = [...normalizedScores].map((scorePkg) => {
      const scoresByDistance: Record<string, number> = {};
      
      // Calculate distances mapping for ranking consumption
      Object.keys(scorePkg.distances).forEach((distId) => {
        scoresByDistance[distId] = scorePkg.distances[distId].weightedPoints;
      });

      return {
        athleteId: scorePkg.athleteId,
        name: scorePkg.athleteName,
        team: scorePkg.teamName,
        totalScore: scorePkg.grandTotalPoints,
        accuracy: scorePkg.overallAccuracy,
        scoresByDistance,
        originalPackage: scorePkg
      };
    });

    // Sort based on tie break rules
    sortedList.sort((a, b) => {
      // 1. Compare total points first
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      // 2. Apply chosen tie-breaker rule
      if (tieBreakRule === "cumulative_accuracy") {
        return b.accuracy - a.accuracy;
      }

      if (tieBreakRule === "highest_distance_multiplier") {
        // Sort distances from highest multiplier down
        const sortedDists = [...distances].sort((dx, dy) => (dy.multiplier || 0) - (dx.multiplier || 0));
        for (const dist of sortedDists) {
          const scoreA = a.scoresByDistance[dist.id] || 0;
          const scoreB = b.scoresByDistance[dist.id] || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
      }

      if (tieBreakRule === "last_shot_rule") {
        // Compare shots backwards
        const lastShotCompare = this.compareLastShotsFromPackage(a.originalPackage, b.originalPackage, distances);
        if (lastShotCompare !== 0) return lastShotCompare;
      }

      // Default non-competitive alphabetical fallback
      return a.athleteId.localeCompare(b.athleteId);
    });

    // Map to outputs and flag ties
    const outputs: RankedAthleteOutput[] = sortedList.map((item, idx) => ({
      athleteId: item.athleteId,
      name: item.name,
      team: item.team,
      totalScore: item.totalScore,
      accuracy: item.accuracy,
      scoresByDistance: item.scoresByDistance,
      rank: idx + 1,
      isTied: false
    }));

    // Detect true ties (same points & accuracy)
    for (let i = 0; i < outputs.length; i++) {
      const current = outputs[i];
      const previous = outputs[i - 1];
      const next = outputs[i + 1];

      let tied = false;
      if (previous && previous.totalScore === current.totalScore && previous.accuracy === current.accuracy) {
        tied = true;
      }
      if (next && next.totalScore === current.totalScore && next.accuracy === current.accuracy) {
        tied = true;
      }
      current.isTied = tied;
    }

    return outputs;
  }

  /**
   * Main calculation entry point that takes raw athlete and distance records,
   * calculates round progression/survival, qualification status from Mission Control,
   * and ranks athletes strictly adhering to tournament rules.
   */
  public static calculate(input: RankingInput): RankedAthleteOutput[] {
    const { athletes, distances, tieBreakRule, shotsCount = 10, directMaxPoints, directMaxShots } = input;

    if (!athletes || athletes.length === 0) return [];
    if (!distances || distances.length === 0) return [];

    // 1. Calculate round-by-round progression/elimination
    const roundResults = calculateRounds(
      athletes as Athlete[],
      distances as any[],
      shotsCount,
      directMaxPoints,
      directMaxShots
    );

    // 2. Map athletes with survival and qualification metrics
    const mapped = athletes.map((ath) => {
      const isWithdrawn = ath.status === "Bỏ thi" || ath.status === "dns" || ath.status === "withdrawn";

      // Determine eliminated round index (0-based)
      let eliminatedInRoundIdx: number | null = null;

      // First check explicit qualificationStatus set by Mission Control (e.g. "eliminated_distanceId" or "eliminated")
      for (let i = 0; i < distances.length; i++) {
        const distId = distances[i].id;
        if (ath.qualificationStatus === `eliminated_${distId}`) {
          eliminatedInRoundIdx = i;
          break;
        }
      }

      // If not explicitly found from status, check roundResults
      if (eliminatedInRoundIdx === null) {
        for (let i = 0; i < roundResults.length; i++) {
          if (roundResults[i].eliminatedIds.includes(ath.id) || (ath.status === "Bị loại" && i === roundResults.length - 1)) {
            eliminatedInRoundIdx = i;
            break;
          }
        }
      }

      // Survival value: number of rounds survived/reached (1-indexed)
      const survivalVal = eliminatedInRoundIdx === null ? distances.length : eliminatedInRoundIdx;
      const lastActiveRoundIdx = eliminatedInRoundIdx === null ? (distances.length - 1) : eliminatedInRoundIdx;

      // Extract stats for last active round
      const statsAtLastRound = roundResults[lastActiveRoundIdx]?.scores[ath.id] || {
        roundHits: 0,
        roundScore: 0,
        cumulativeHits: 0,
        cumulativeScore: 0,
        displayScore: 0,
        displayHits: 0,
        accuracy: 0,
        displayScoreWithSolo: 0,
      };

      const survivalScore = statsAtLastRound.cumulativeScore;
      const survivalHits = statsAtLastRound.cumulativeHits;
      const survivalAccuracy = statsAtLastRound.accuracy;

      // Solo hits in last active round if applicable using lexicographical weighting
      const lastDist = distances[lastActiveRoundIdx];
      const soloRoundsArr = getSoloRoundsFromDist(ath, lastDist);
      const fallbackSoloHits = soloRoundsArr.length > 0 ? soloRoundsArr.reduce((sum, r) => sum + (r || 0), 0) : undefined;

      const soloFraction = computeSoloFraction(soloRoundsArr, fallbackSoloHits);
      
      const totalSoloHits = soloRoundsArr.length > 0 ? soloRoundsArr.reduce((sum, r) => sum + (r || 0), 0) : (fallbackSoloHits ?? 0);
      const survivalSoloHits = totalSoloHits;

      // Compute total score across all distance scores using ScoreAggregationLayer for standardized precision
      const normPkg = ScoreAggregationLayer.normalize(ath, distances);
      const scoresByDistance: Record<string, number> = {};

      distances.forEach((d) => {
        scoresByDistance[d.id] = normPkg.distances[d.id]?.weightedPoints || 0;
      });

      const totalScore = normPkg.grandTotalPoints;

      const totalScoreWithSolo = Number((totalScore + soloFraction).toFixed(8));
      const survivalScoreWithSolo = Number((survivalScore + soloFraction).toFixed(8));

      return {
        athleteId: ath.id,
        name: ath.name || "",
        team: ath.team || "",
        status: ath.status,
        qualificationStatus: ath.qualificationStatus,
        isWithdrawn,
        survivalVal,
        survivalScore: survivalScoreWithSolo,
        survivalHits,
        survivalAccuracy,
        survivalSoloHits,
        totalScore: totalScoreWithSolo,
        accuracy: survivalAccuracy,
        scoresByDistance,
        originalAthlete: ath,
      };
    });

    // 3. Sort athletes by tournament logic
    mapped.sort((a, b) => {
      // Rule A: Non-withdrawn before withdrawn (Bỏ thi)
      if (a.isWithdrawn && !b.isWithdrawn) return 1;
      if (!a.isWithdrawn && b.isWithdrawn) return -1;
      if (a.isWithdrawn && b.isWithdrawn) return a.name.localeCompare(b.name, "vi");

      if (distances.length > 1) {
        // Rule B: Higher round survival (progressed further in tournament rounds)
        if (b.survivalVal !== a.survivalVal) {
          return b.survivalVal - a.survivalVal;
        }

        // Rule C: Cumulative score up to their last active round (includes lexicographical solo fraction)
        if (b.survivalScore !== a.survivalScore) {
          return b.survivalScore - a.survivalScore;
        }

        // Rule D: Lexicographical Solo shootout comparison (Solo #1 first, then Re-Solo #2, etc.)
        const lastDistObjMulti = distances[a.survivalVal - 1];
        if (lastDistObjMulti) {
          const roundsA = getSoloRoundsFromDist(a.originalAthlete, lastDistObjMulti);
          const roundsB = getSoloRoundsFromDist(b.originalAthlete, lastDistObjMulti);
          const compSolo = compareSoloRounds(roundsA, roundsB);
          if (compSolo !== 0) {
            return -compSolo;
          }
        }

        // Rule E: Accuracy up to last active round
        if (b.survivalAccuracy !== a.survivalAccuracy) {
          return b.survivalAccuracy - a.survivalAccuracy;
        }
      } else {
        // Single distance / round
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        const singleDistObj = distances[0];
        if (singleDistObj) {
          const roundsA = getSoloRoundsFromDist(a.originalAthlete, singleDistObj);
          const roundsB = getSoloRoundsFromDist(b.originalAthlete, singleDistObj);
          const compSolo = compareSoloRounds(roundsA, roundsB);
          if (compSolo !== 0) {
            return -compSolo;
          }
        }
      }

      // Rule F: Custom tie break rule
      if (tieBreakRule === "cumulative_accuracy") {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      } else if (tieBreakRule === "highest_distance_multiplier") {
        const sortedDists = [...distances].sort((dx, dy) => (dy.multiplier || 0) - (dx.multiplier || 0));
        for (const dist of sortedDists) {
          const scoreA = a.scoresByDistance[dist.id] || 0;
          const scoreB = b.scoresByDistance[dist.id] || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
      }

      // Fallback: Name alphabetical
      return a.name.localeCompare(b.name, "vi");
    });

    // 4. Assign ranks & detect ties
    const outputs: RankedAthleteOutput[] = mapped.map((item, idx) => ({
      athleteId: item.athleteId,
      name: item.name,
      team: item.team,
      totalScore: Number((distances.length > 1 ? item.survivalScore : item.totalScore).toFixed(8)),
      accuracy: item.accuracy,
      scoresByDistance: item.scoresByDistance,
      rank: item.isWithdrawn ? 999 : idx + 1,
      isTied: false,
      survivalVal: item.survivalVal,
      survivalSoloHits: item.survivalSoloHits,
      soloHits: item.survivalSoloHits,
      qualificationStatus: item.qualificationStatus,
      status: item.status,
      isWithdrawn: item.isWithdrawn,
      originalAthlete: item.originalAthlete,
    }));

    // Adjust joint ranks for non-withdrawn athletes with exact same survival & score
    let currentRank = 1;
    for (let i = 0; i < outputs.length; i++) {
      if (outputs[i].rank === 999) continue;
      if (i > 0 && outputs[i - 1].rank !== 999) {
        const prev = mapped[i - 1];
        const curr = mapped[i];

        const lastDistObjTie = distances[curr.survivalVal - 1] || distances[0];
        const roundsA = getSoloRoundsFromDist(curr.originalAthlete, lastDistObjTie);
        const roundsB = getSoloRoundsFromDist(prev.originalAthlete, lastDistObjTie);
        const maxSoloLen = Math.max(roundsA.length, roundsB.length);
        let soloRoundsEqual = true;
        for (let sIdx = 0; sIdx < maxSoloLen; sIdx++) {
          if ((roundsA[sIdx] ?? 0) !== (roundsB[sIdx] ?? 0)) {
            soloRoundsEqual = false;
            break;
          }
        }

        const scoreA = distances.length > 1 ? curr.survivalScore : curr.totalScore;
        const scoreB = distances.length > 1 ? prev.survivalScore : prev.totalScore;

        const samePerformance =
          curr.survivalVal === prev.survivalVal &&
          scoreA === scoreB &&
          curr.survivalSoloHits === prev.survivalSoloHits &&
          soloRoundsEqual;

        if (samePerformance) {
          outputs[i].rank = outputs[i - 1].rank;
          outputs[i].isTied = true;
          outputs[i - 1].isTied = true;
        } else {
          outputs[i].rank = i + 1;
        }
      } else {
        outputs[i].rank = 1;
      }
    }

    return outputs;
  }

  /**
   * Decoupled helper to evaluate shots backwards from the highest multiplier down
   */
  private static compareLastShotsFromPackage(
    a: UnifiedScorePackage,
    b: UnifiedScorePackage,
    distances: { id: string; multiplier: number }[]
  ): number {
    const sortedDists = [...distances].sort((dx, dy) => (dy.multiplier || 0) - (dx.multiplier || 0));

    for (const dist of sortedDists) {
      const distA = a.distances[dist.id];
      const distB = b.distances[dist.id];
      if (!distA || !distB) continue;

      const shotsA = distA.shots;
      const shotsB = distB.shots;

      const maxLen = Math.max(shotsA.length, shotsB.length);
      for (let i = maxLen - 1; i >= 0; i--) {
        const shotA = shotsA[i];
        const shotB = shotsB[i];

        const scoreA = shotA ? shotA.points : 0;
        const scoreB = shotB ? shotB.points : 0;

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
    }
    return 0;
  }
}

