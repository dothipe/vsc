/**
 * VSC Platform V3 - Statistics Engine
 * Generates purely analytical metrics (averages, accuracies, bullseyes, trends, streaks)
 * from direct scores and shot history logs.
 */

import { Athlete, ShotLogV2 } from "../types";

export interface AthletePerformanceMetrics {
  athleteId: string;
  totalShots: number;
  totalHits: number;
  accuracy: number;
  averageScore: number;
  bullseyesCount: number; // 10s or center-ring hits
  highestStreak: number;
  currentStreak: number;
}

export interface DistanceAnalyticsSummary {
  distanceId: string;
  averageAccuracy: number;
  highestScore: number;
  lowestScore: number;
  totalShotsFired: number;
}

export class StatisticsEngine {
  /**
   * Compute standard athlete statistics from direct scores map.
   */
  public static calculateAthleteMetrics(athlete: Athlete): AthletePerformanceMetrics {
    let totalShots = 0;
    let totalHits = 0;
    let totalPoints = 0;
    let bullseyesCount = 0;
    let currentStreak = 0;
    let highestStreak = 0;

    // Loop through each distance scores list
    for (const distanceId of Object.keys(athlete.scores)) {
      const shots = athlete.scores[distanceId] || [];
      for (const val of shots) {
        if (val === null || val === undefined) continue;

        totalShots++;

        let isHit = false;
        let scoreVal = 0;

        if (typeof val === "number") {
          scoreVal = val;
          isHit = val > 0;
          if (val === 10) {
            bullseyesCount++;
          }
        } else if (val === true) {
          isHit = true;
          scoreVal = 1;
        }

        if (isHit) {
          totalHits++;
          currentStreak++;
          if (currentStreak > highestStreak) {
            highestStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }

        totalPoints += scoreVal;
      }
    }

    const accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
    const averageScore = totalShots > 0 ? totalPoints / totalShots : 0;

    return {
      athleteId: athlete.id,
      totalShots,
      totalHits,
      accuracy,
      averageScore,
      bullseyesCount,
      highestStreak,
      currentStreak
    };
  }

  /**
   * Generate analytical performance trend summary grouped by shot logs.
   */
  public static generateTrends(logs: ShotLogV2[]): { timestamp: number; accuracy: number }[] {
    if (logs.length === 0) return [];

    // Sort logs by timestamp ascending
    const sortedLogs = [...logs].sort((a, b) => {
      const tA = a.timestamp?.seconds || Number(a.timestamp) || 0;
      const tB = b.timestamp?.seconds || Number(b.timestamp) || 0;
      return tA - tB;
    });

    const trends: { timestamp: number; accuracy: number }[] = [];
    let movingHits = 0;
    let movingShots = 0;

    for (const log of sortedLogs) {
      movingShots++;
      if (log.result === "hit") {
        movingHits++;
      }

      const ts = log.timestamp?.seconds * 1000 || Number(log.timestamp) || Date.now();
      trends.push({
        timestamp: ts,
        accuracy: (movingHits / movingShots) * 100
      });
    }

    return trends;
  }
}
