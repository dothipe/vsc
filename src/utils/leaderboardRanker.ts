import { Athlete, DistanceConfig } from "../types";
import { calculateRounds } from "./qualification";

// Helper to calculate hit count exactly like Leaderboard.tsx
export function getLeaderboardHitCount(hits: any[]): number {
  if (!hits || !Array.isArray(hits) || hits.length === 0) return 0;
  let count = 0;
  for (const item of hits) {
    if (item === null || item === undefined || item === "") continue;
    let norm = item;
    if (norm === "true" || norm === "1") norm = true;
    if (norm === "false" || norm === "0") norm = false;
    if (typeof norm === "string") {
      const parsed = Number(norm);
      if (!isNaN(parsed)) norm = parsed;
    }
    if (typeof norm === "number" && norm > 0) {
      count++;
    } else if (norm === true) {
      count++;
    }
  }
  return count;
}

// Highly precise individual ranking algorithm (extracted directly from Leaderboard.tsx)
export function getIndividualLeaderboardRankings(
  athletes: Athlete[],
  distances: DistanceConfig[],
  shotsCount: number,
  directMaxShots?: number,
  directMaxPoints?: number
): any[] {
  if (!athletes || athletes.length === 0) return [];

  const isDirectMode = shotsCount === 1;
  const effectiveShotsCount = isDirectMode ? (directMaxShots || 10) : shotsCount;
  const effectiveDirectMaxPoints = directMaxPoints;
  const isPointModeActive = isDirectMode && effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0;

  // Calculate dynamic qualification & round progression
  const roundResults = calculateRounds(
    athletes,
    distances,
    effectiveShotsCount,
    effectiveDirectMaxPoints,
    directMaxShots
  );
  const hasMaxRoundScoreConf = distances.some(d => d.isMaxRoundScore);

  // 1. Process active athletes with survival and round-by-round status
  const athletesWithSurvival = athletes.map((athlete) => {
    let eliminatedInRoundIdx: number | null = null;
    let isSoloPendingGlobal = false;
    let isResoloPendingGlobal = false;

    for (let i = 0; i < roundResults.length; i++) {
      let hasSubsequentParticipation = false;
      for (let j = i + 1; j < roundResults.length; j++) {
        if (roundResults[j].qualifiedIds.includes(athlete.id)) {
          hasSubsequentParticipation = true;
          break;
        }
      }
      if (hasSubsequentParticipation) {
        continue;
      }

      if (roundResults[i].pendingSoloIds?.includes(athlete.id)) {
        isSoloPendingGlobal = true;
        break;
      }
      if (roundResults[i].pendingResoloIds?.includes(athlete.id)) {
        isResoloPendingGlobal = true;
        break;
      }
      if (roundResults[i].eliminatedIds.includes(athlete.id)) {
        eliminatedInRoundIdx = i;
        break;
      }
    }

    const survivalVal = eliminatedInRoundIdx === null ? distances.length : eliminatedInRoundIdx;
    const lastActiveRoundIdx = eliminatedInRoundIdx === null ? (distances.length - 1) : eliminatedInRoundIdx;

    let survivalScore = 0;
    let survivalHits = 0;
    let survivalAccuracy = 0;
    let survivalSoloHits = 0;
    let survivalScoreWithSolo = 0;

    if (distances.length > 0 && lastActiveRoundIdx >= 0) {
      if (hasMaxRoundScoreConf) {
        let maxScore = -1;
        let maxHits = 0;
        let maxAccuracy = 0;
        let maxSoloHits = 0;

        let cumulativeHitsSumInShotRounds = 0;
        let cumulativeScoreSumInShotRounds = 0;
        let cumulativeMultiplierSumInShotRounds = 0;
        let cumulativeCountInShotRounds = 0;

        for (let i = 0; i <= lastActiveRoundIdx; i++) {
          const isQualifiedForRound = i === 0 || roundResults[i]?.qualifiedIds.includes(athlete.id);

          if (isQualifiedForRound) {
            const dist = distances[i];
            const hits = athlete.scores[dist.id] || [];
            const hitCount = getLeaderboardHitCount(hits);
            const score = hitCount * dist.multiplier;

            const wasShot = hits.length > 0 && hits.some(v => v !== null && v !== undefined);
            if (wasShot) {
              cumulativeHitsSumInShotRounds += hitCount;
              cumulativeScoreSumInShotRounds += score;
              cumulativeMultiplierSumInShotRounds += dist.multiplier;
              cumulativeCountInShotRounds++;
            }

            let accuracy = 0;
            if (isPointModeActive && effectiveDirectMaxPoints !== undefined) {
              const totalPossPoints = effectiveDirectMaxPoints * dist.multiplier;
              accuracy = totalPossPoints > 0 ? (score / totalPossPoints) * 100 : 0;
            } else {
              accuracy = effectiveShotsCount > 0 ? (hitCount / effectiveShotsCount) * 100 : 0;
            }

            const soloHits = dist.isSolo ? (athlete.soloHits?.[dist.id] || 0) : 0;

            if (score > maxScore) {
              maxScore = score;
              maxHits = hitCount;
              maxAccuracy = accuracy;
              maxSoloHits = soloHits;
            }
          }
        }

        survivalScore = maxScore >= 0 ? maxScore : 0;
        survivalHits = maxHits;
        if (isPointModeActive && effectiveDirectMaxPoints !== undefined) {
          if (cumulativeMultiplierSumInShotRounds === 0 && distances[lastActiveRoundIdx]) {
            cumulativeMultiplierSumInShotRounds = distances[lastActiveRoundIdx].multiplier;
          }
          const totalPossPoints = effectiveDirectMaxPoints * cumulativeMultiplierSumInShotRounds;
          survivalAccuracy = totalPossPoints > 0 ? (cumulativeScoreSumInShotRounds / totalPossPoints) * 100 : 0;
        } else {
          if (cumulativeCountInShotRounds === 0) {
            cumulativeCountInShotRounds = 1;
          }
          const totalPossShots = cumulativeCountInShotRounds * effectiveShotsCount;
          survivalAccuracy = totalPossShots > 0 ? (cumulativeHitsSumInShotRounds / totalPossShots) * 100 : 0;
        }
        survivalSoloHits = maxSoloHits;
        survivalScoreWithSolo = survivalScore + (maxSoloHits * 0.001);
      } else {
        const statsAtLastRound = roundResults[lastActiveRoundIdx]?.scores[athlete.id];
        if (statsAtLastRound) {
          survivalScore = statsAtLastRound.displayScore;
          survivalHits = statsAtLastRound.displayHits;
          survivalScoreWithSolo = statsAtLastRound.displayScoreWithSolo !== undefined ? statsAtLastRound.displayScoreWithSolo : statsAtLastRound.displayScore;
          survivalAccuracy = statsAtLastRound.accuracy;
          const lastActiveDist = distances[lastActiveRoundIdx];
          if (lastActiveDist && lastActiveDist.isSolo) {
            survivalSoloHits = athlete.soloHits?.[lastActiveDist.id] || 0;
          }
        }
      }
    }

    return {
      athlete,
      eliminatedInRoundIdx,
      isSoloPendingGlobal,
      isResoloPendingGlobal,
      survivalVal,
      survivalScore,
      survivalScoreWithSolo,
      survivalHits,
      survivalAccuracy,
      survivalSoloHits,
    };
  });

  // 2. Map standard overall properties
  const baseRanked = athletesWithSurvival.map(({ athlete, eliminatedInRoundIdx, isSoloPendingGlobal, isResoloPendingGlobal, survivalVal, survivalScore, survivalScoreWithSolo, survivalHits, survivalAccuracy, survivalSoloHits }) => {
    let totalScore = 0;
    let totalHits = 0;

    const breakdown = distances.map((distance, rIdx) => {
      const isQualified = rIdx === 0 || roundResults[rIdx]?.qualifiedIds.includes(athlete.id);
      const hits = isQualified ? (athlete.scores[distance.id] || []) : [];
      const hitCount = getLeaderboardHitCount(hits);
      const score = hitCount * distance.multiplier;
      
      totalScore += score;
      totalHits += hitCount;

      return {
        distanceName: distance.distance,
        distanceId: distance.id,
        multiplier: distance.multiplier,
        hitCount,
        maxHits: isPointModeActive && effectiveDirectMaxPoints !== undefined ? effectiveDirectMaxPoints : effectiveShotsCount,
        score,
        isQualified,
      };
    });

    let totalMultiplierOfShotRounds = 0;
    let countShotRounds = 0;
    distances.forEach((d) => {
      const wasShot = athlete.scores[d.id] && athlete.scores[d.id].length > 0 && athlete.scores[d.id].some(v => v !== null && v !== undefined);
      if (wasShot) {
        totalMultiplierOfShotRounds += d.multiplier;
        countShotRounds++;
      }
    });

    if (countShotRounds === 0 && distances.length > 0) {
      totalMultiplierOfShotRounds = distances[0].multiplier;
      countShotRounds = 1;
    }

    const totalPossibleShots = isPointModeActive && effectiveDirectMaxPoints !== undefined
      ? effectiveDirectMaxPoints * totalMultiplierOfShotRounds
      : countShotRounds * effectiveShotsCount;
    const calculatedAccuracy = isPointModeActive && effectiveDirectMaxPoints !== undefined
      ? (totalPossibleShots > 0 ? (totalScore / totalPossibleShots) * 100 : 0)
      : (totalPossibleShots > 0 ? (totalHits / totalPossibleShots) * 100 : 0);

    const totalScoreValue = hasMaxRoundScoreConf ? survivalScore : totalScore;
    const totalHitsValue = totalHits;
    const accuracyValue = calculatedAccuracy;

    return {
      ...athlete,
      athleteId: athlete.id, // Ensure athleteId is present for output mapping consistency
      totalScore: totalScoreValue,
      totalScoreWithSolo: totalScoreValue,
      totalHits: totalHitsValue,
      totalPossibleShots,
      accuracy: accuracyValue,
      breakdown,
      isQualifiedNow: eliminatedInRoundIdx === null,
      eliminatedInRoundIdx,
      wasEliminatedEarlier: false,
      isEliminatedThisRound: false,
      isSoloPending: isSoloPendingGlobal,
      isResoloPending: isResoloPendingGlobal,
      survivalVal,
      survivalScore,
      survivalScoreWithSolo,
      survivalHits,
      survivalAccuracy,
      survivalSoloHits,
    };
  });

  // 3. Sort baseRanked athletes by score and survival criteria
  baseRanked.sort((a, b) => {
    const isABỏThi = a.status === "Bỏ thi";
    const isBBỏThi = b.status === "Bỏ thi";
    if (isABỏThi && !isBBỏThi) return 1;
    if (!isABỏThi && isBBỏThi) return -1;

    // 1. Who survived more rounds
    if (b.survivalVal !== a.survivalVal) {
      return b.survivalVal - a.survivalVal;
    }
    // 2. Score with solo in last active round
    if (b.survivalScoreWithSolo !== a.survivalScoreWithSolo) {
      return b.survivalScoreWithSolo - a.survivalScoreWithSolo;
    }
    // 3. Score without solo in last active round
    if (b.survivalScore !== a.survivalScore) {
      return b.survivalScore - a.survivalScore;
    }
    // 4. Solo hits in last active round
    if (b.survivalSoloHits !== a.survivalSoloHits) {
      return b.survivalSoloHits - a.survivalSoloHits;
    }
    // 5. Accuracy in last active round
    if (b.survivalAccuracy !== a.survivalAccuracy) {
      return b.survivalAccuracy - a.survivalAccuracy;
    }
    return a.name.localeCompare(b.name, "vi");
  });

  // 4. Assign standard ranks (joint ranking support)
  const withRank = baseRanked.map((athlete, idx) => {
    if (athlete.status === "Bỏ thi") {
      return { ...athlete, baseRank: 999 };
    }

    let betterCount = 0;
    for (let j = 0; j < idx; j++) {
      const other = baseRanked[j];
      if (other.status === "Bỏ thi") continue;

      if (other.survivalVal !== athlete.survivalVal) {
        if (other.survivalVal > athlete.survivalVal) betterCount++;
      } else if (other.survivalScoreWithSolo !== athlete.survivalScoreWithSolo) {
        if (other.survivalScoreWithSolo > athlete.survivalScoreWithSolo) betterCount++;
      } else if (other.survivalScore !== athlete.survivalScore) {
        if (other.survivalScore > athlete.survivalScore) betterCount++;
      } else if (other.survivalSoloHits !== athlete.survivalSoloHits) {
        if (other.survivalSoloHits > athlete.survivalSoloHits) betterCount++;
      } else if (other.survivalAccuracy !== athlete.survivalAccuracy) {
        if (other.survivalAccuracy > athlete.survivalAccuracy) betterCount++;
      }
    }

    return { ...athlete, baseRank: betterCount + 1 };
  });

  return withRank;
}
