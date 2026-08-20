import { TournamentData } from "../lib/firebaseService";
import { Athlete, MasterAthlete, DistanceConfigV3 } from "../types";
import { RankingEngine } from "../engines/rankingEngine";
import { StatisticsEngine } from "../engines/statisticsEngine";

export interface AthleteCareerStats {
  totalTournaments: number;
  totalMatches: number;
  careerRanking: number;
  careerRating: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  championshipTitles: number;
  soloWins: number;
  soloLosses: number;
  reSoloWins: number;
  accuracy: number;
  bullseyesCount: number;
  bestScore10m: number;
  bestScore12m: number;
  bestScore15m: number;
  distancesPerformance: {
    distance: string;
    accuracy: number;
    averageScore: number;
    shots: number;
  }[];
  clubHistory: string[];
  performanceTimeline: {
    date: string;
    tournamentName: string;
    accuracy: number;
    rank: number;
    score: number;
  }[];
  personalBests: {
    singleMatchMaxScore: number;
    singleDistanceMaxAccuracy: number;
  };
  tournamentHistory: {
    tournamentId: string;
    tournamentName: string;
    date: string;
    rank: number;
    score: number;
    accuracy: number;
    clubName: string;
  }[];
}

/**
 * Dynamically aggregates the Athlete Career Profile (ACP) from tournament history
 * without duplicating any storage representation. Keep calculations single-source-of-truth.
 */
export function calculateAthleteCareerStats(
  athleteId: string,
  athleteName: string,
  allTournaments: TournamentData[]
): AthleteCareerStats {
  const stats: AthleteCareerStats = {
    totalTournaments: 0,
    totalMatches: 0,
    careerRanking: 99, // default rank in national registry
    careerRating: 0,
    goldMedals: 0,
    silverMedals: 0,
    bronzeMedals: 0,
    championshipTitles: 0,
    soloWins: 0,
    soloLosses: 0,
    reSoloWins: 0,
    accuracy: 0,
    bullseyesCount: 0,
    bestScore10m: 0,
    bestScore12m: 0,
    bestScore15m: 0,
    distancesPerformance: [],
    clubHistory: [],
    performanceTimeline: [],
    personalBests: {
      singleMatchMaxScore: 0,
      singleDistanceMaxAccuracy: 0,
    },
    tournamentHistory: []
  };

  if (!athleteId && !athleteName) return stats;

  const clubSet = new Set<string>();
  let totalCumulativeShots = 0;
  let totalCumulativeHits = 0;
  let totalCumulativePoints = 0;

  // Temp storage to group performance by distance
  const distanceStatsMap: Record<string, { totalShots: number; totalHits: number; totalPoints: number }> = {};

  for (const tour of allTournaments) {
    // 1. Locate this athlete in the tournament registry (either by global ID, nickname, or fullname fallback)
    const participantsList = tour.athletes || [];
    const tourAthlete = participantsList.find(
      (a) =>
        (a.id && a.id === athleteId) ||
        (a.idCard && a.idCard === athleteId) ||
        (a.name && a.name.toLowerCase().trim() === athleteName.toLowerCase().trim())
    );

    if (!tourAthlete) continue;

    stats.totalTournaments++;

    // 2. Map distances to V3 format for the ranking engine
    const mappedDistances: DistanceConfigV3[] = (tour.distances || []).map((d) => ({
      id: d.id,
      name: d.distance || "",
      distance: d.distance || "",
      multiplier: d.multiplier || 10,
      isCumulative: !!d.isCumulative,
      isHighestScore: !!d.isMaxRoundScore,
      isElimination: !!d.isElimination,
      isSolo: !!d.isSolo,
      isResolo: !!d.isResolo
    }));

    const rankedResults = RankingEngine.calculate({
      athletes: participantsList,
      distances: mappedDistances,
      tieBreakRule: "cumulative_accuracy"
    });

    const myRanked = rankedResults.find(r => r.athleteId === tourAthlete.id);
    const myRank = myRanked ? myRanked.rank : (rankedResults.findIndex(r => r.athleteId === tourAthlete.id) + 1 || 1);
    const totalScore = myRanked ? myRanked.totalScore : 0;
    const accuracy = myRanked ? myRanked.accuracy : 0;

    // 3. Increment Medal Counts
    if (myRank === 1) {
      stats.goldMedals++;
      stats.championshipTitles++;
    } else if (myRank === 2) {
      stats.silverMedals++;
    } else if (myRank === 3) {
      stats.bronzeMedals++;
    }

    // 4. Calculate individual match stats using StatisticsEngine
    const metrics = StatisticsEngine.calculateAthleteMetrics(tourAthlete);
    totalCumulativeShots += metrics.totalShots;
    totalCumulativeHits += metrics.totalHits;
    stats.bullseyesCount += metrics.bullseyesCount;

    // 5. Check Solo/Re-Solo shootouts
    if (tourAthlete.soloHits) {
      const hasSolo = Object.keys(tourAthlete.soloHits).length > 0;
      if (hasSolo) {
        // Evaluate solo wins/losses
        let totalHitsInSolo = 0;
        for (const dist of Object.keys(tourAthlete.soloHits)) {
          totalHitsInSolo += tourAthlete.soloHits[dist] || 0;
        }
        if (totalHitsInSolo > 2) {
          stats.soloWins++;
        } else {
          stats.soloLosses++;
        }
      }
    }
    if (tourAthlete.soloRounds && Object.keys(tourAthlete.soloRounds).length > 0) {
      stats.reSoloWins++;
    }

    // 6. Distance profiling aggregation
    for (const distConfig of tour.distances || []) {
      const shots = tourAthlete.scores[distConfig.id] || [];
      const nonNullShots = shots.filter(s => s !== null && s !== undefined);
      if (nonNullShots.length === 0) continue;

      stats.totalMatches++; // each active distance is a match round

      const dName = distConfig.distance || "Unknown";
      if (!distanceStatsMap[dName]) {
        distanceStatsMap[dName] = { totalShots: 0, totalHits: 0, totalPoints: 0 };
      }

      let dHits = 0;
      let dPoints = 0;
      for (const val of nonNullShots) {
        if (typeof val === "number") {
          dPoints += val;
          if (val > 0) dHits++;
        } else if (val === true) {
          dPoints += 1;
          dHits++;
        }
      }

      distanceStatsMap[dName].totalShots += nonNullShots.length;
      distanceStatsMap[dName].totalHits += dHits;
      distanceStatsMap[dName].totalPoints += dPoints;

      const dNameNormalized = dName.toLowerCase().replace(/\s/g, "");
      if (dNameNormalized.includes("10m") || dNameNormalized.includes("10mét") || dNameNormalized === "10") {
        if (dPoints > (stats.bestScore10m || 0)) {
          stats.bestScore10m = dPoints;
        }
      } else if (dNameNormalized.includes("12m") || dNameNormalized.includes("12mét") || dNameNormalized === "12") {
        if (dPoints > (stats.bestScore12m || 0)) {
          stats.bestScore12m = dPoints;
        }
      } else if (dNameNormalized.includes("15m") || dNameNormalized.includes("15mét") || dNameNormalized === "15") {
        if (dPoints > (stats.bestScore15m || 0)) {
          stats.bestScore15m = dPoints;
        }
      }

      // Update distance level personal best
      const dAccuracy = (dHits / nonNullShots.length) * 100;
      if (dAccuracy > stats.personalBests.singleDistanceMaxAccuracy) {
        stats.personalBests.singleDistanceMaxAccuracy = Math.round(dAccuracy);
      }
    }

    // 7. Track Club history
    const club = tourAthlete.team || "Tự Do";
    if (club && club.trim() !== "") {
      clubSet.add(club);
    }

    // 8. Personal Bests
    if (totalScore > stats.personalBests.singleMatchMaxScore) {
      stats.personalBests.singleMatchMaxScore = totalScore;
    }

    const tDate = tour.startDate || (tour.createdAt ? new Date(tour.createdAt.seconds * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);

    // 9. Append to tournament history
    stats.tournamentHistory.push({
      tournamentId: tour.id,
      tournamentName: tour.matchName,
      date: tDate,
      rank: myRank,
      score: totalScore,
      accuracy: Math.round(accuracy),
      clubName: club
    });

    // 10. Append to timeline
    stats.performanceTimeline.push({
      date: tDate,
      tournamentName: tour.matchName,
      accuracy: Math.round(accuracy),
      rank: myRank,
      score: totalScore
    });
  }

  // Finalize dynamic computations
  stats.clubHistory = Array.from(clubSet);
  stats.accuracy = totalCumulativeShots > 0 ? Math.round((totalCumulativeHits / totalCumulativeShots) * 100) : 0;

  // Compile distances performance list
  stats.distancesPerformance = Object.keys(distanceStatsMap).map((dName) => {
    const data = distanceStatsMap[dName];
    return {
      distance: dName,
      shots: data.totalShots,
      accuracy: data.totalShots > 0 ? Math.round((data.totalHits / data.totalShots) * 100) : 0,
      averageScore: data.totalShots > 0 ? parseFloat((data.totalPoints / data.totalShots).toFixed(2)) : 0
    };
  });

  // Calculate composite Career Rating: (Cumulative Accuracy * 50) + (Gold * 150 + Silver * 80 + Bronze * 40) + (Tournaments * 10)
  stats.careerRating = Math.round(
    stats.accuracy * 55 +
    stats.goldMedals * 200 +
    stats.silverMedals * 100 +
    stats.bronzeMedals * 50 +
    stats.totalTournaments * 25
  );

  // Dynamic system-wide virtual career ranking (simulated based on rating threshold)
  if (stats.careerRating > 8000) {
    stats.careerRanking = 1; // Rank Elite Master
  } else if (stats.careerRating > 5000) {
    stats.careerRanking = Math.max(2, 15 - Math.round(stats.careerRating / 1000));
  } else if (stats.careerRating > 2000) {
    stats.careerRanking = Math.max(16, 50 - Math.round(stats.careerRating / 500));
  } else if (stats.careerRating > 0) {
    stats.careerRanking = Math.max(51, 150 - Math.round(stats.careerRating / 100));
  } else {
    stats.careerRanking = 99; // Standard entry level
  }

  // Sort timeline by date ascending for charts
  stats.performanceTimeline.sort((a, b) => a.date.localeCompare(b.date));

  return stats;
}
