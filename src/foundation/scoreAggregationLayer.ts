import { Athlete, DistanceConfig } from "../types";
import { ensureArray } from "../lib/firebaseService";
import { getSoloRoundsFromDist } from "../engines/rankingEngine";

export interface NormalizedShot {
  shotIndex: number;
  rawValue: boolean | number | null;
  points: number; // Normalized points: true -> 10, false -> 0, number -> itself, null -> 0
  isHit: boolean; // Normalized hit indicator: true if true, or number > 0
}

export interface NormalizedDistanceScore {
  distanceId: string;
  distanceName: string;
  multiplier: number;
  shots: NormalizedShot[];
  totalHits: number;
  totalPoints: number; // Raw points before multiplier
  weightedPoints: number; // Points * multiplier
  shotsCount: number;
  completedShotsCount: number;
  isCompleted: boolean;
  soloHits: number;
  soloRounds: number[];
}

export interface UnifiedScorePackage {
  athleteId: string;
  athleteName: string;
  teamName: string;
  isPrimaryTeam: boolean;
  status: string; // registered | checked_in | pending | dns | withdrawn | dq
  isDisqualified: boolean;
  isDns: boolean;
  isWithdrawn: boolean;
  isCompleted: boolean;
  grandTotalPoints: number; // Sum of weightedPoints
  grandTotalHits: number;   // Sum of totalHits
  overallAccuracy: number;  // percentage (0-100)
  distances: Record<string, NormalizedDistanceScore>;
}

export class ScoreAggregationLayer {
  /**
   * Normalize an athlete's complete scoring data into a single, unified UnifiedScorePackage.
   */
  public static normalize(athlete: Athlete, distances: DistanceConfig[]): UnifiedScorePackage {
    const distancesMap: Record<string, NormalizedDistanceScore> = {};
    let grandTotalPoints = 0;
    let grandTotalHits = 0;
    let totalShotsFired = 0;
    let totalShotsCountExpected = 0;

    // Athlete status attributes
    const statusLower = (athlete.status || "").toLowerCase().trim();
    const checkInLower = (athlete.checkInStatus || "").toLowerCase().trim();

    const isDisqualified = statusLower === "dq" || checkInLower === "disqualified";
    const isDns = statusLower === "dns" || checkInLower === "dns";
    const isWithdrawn = statusLower === "withdrawn" || checkInLower === "withdrawn";

    distances.forEach((dist) => {
      const rawShots = (athlete.scores || {})[dist.id];
      const shotsList = ensureArray<any>(rawShots);
      const normalizedShots: NormalizedShot[] = [];
      let totalHits = 0;
      let totalPoints = 0;
      let completedShotsCount = 0;

      shotsList.forEach((shot, index) => {
        let points = 0;
        let isHit = false;

        const rawShot = shot as any;
        let normalizedShot = shot;
        if (rawShot === "true" || rawShot === "1") normalizedShot = true;
        if (rawShot === "false" || rawShot === "0") normalizedShot = false;
        if (typeof rawShot === "string" && rawShot !== "true" && rawShot !== "false" && rawShot !== "") {
          const parsed = Number(rawShot);
          if (!isNaN(parsed)) {
            normalizedShot = parsed;
          }
        }

        if (typeof normalizedShot === "number") {
          points = normalizedShot;
          isHit = normalizedShot > 0;
          completedShotsCount++;
        } else if (normalizedShot === true) {
          points = 1; // Standardize boolean knockdown hit as 1 point
          isHit = true;
          completedShotsCount++;
        } else if (normalizedShot === false) {
          points = 0;
          isHit = false;
          completedShotsCount++;
        }

        normalizedShots.push({
          shotIndex: index,
          rawValue: shot,
          points,
          isHit,
        });

        if (isHit) {
          totalHits++;
        }
        totalPoints += points;
      });

      const weightedPoints = totalPoints * (dist.multiplier || 1);
      const shotsCountExpected = normalizedShots.length;

      grandTotalPoints += weightedPoints;
      grandTotalHits += totalHits;
      totalShotsFired += completedShotsCount;
      totalShotsCountExpected += shotsCountExpected;

      const soloRounds = getSoloRoundsFromDist(athlete, dist);
      const soloHits = soloRounds.length > 0 ? soloRounds.reduce((a, b) => a + (b || 0), 0) : (athlete.soloHits?.[dist.id] ?? 0);

      distancesMap[dist.id] = {
        distanceId: dist.id,
        distanceName: dist.distance,
        multiplier: dist.multiplier || 1,
        shots: normalizedShots,
        totalHits,
        totalPoints,
        weightedPoints,
        shotsCount: shotsCountExpected,
        completedShotsCount,
        isCompleted: completedShotsCount >= shotsCountExpected && shotsCountExpected > 0,
        soloHits,
        soloRounds,
      };
    });

    const overallAccuracy = totalShotsFired > 0 ? (grandTotalHits / totalShotsFired) * 100 : 0;
    const isCompleted = distances.every(
      (d) => distancesMap[d.id]?.isCompleted || false
    );

    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      teamName: athlete.team || "",
      isPrimaryTeam: athlete.isPrimaryTeam || false,
      status: athlete.status || "registered",
      isDisqualified,
      isDns,
      isWithdrawn,
      isCompleted,
      grandTotalPoints: isDisqualified ? 0 : grandTotalPoints,
      grandTotalHits: isDisqualified ? 0 : grandTotalHits,
      overallAccuracy: isDisqualified ? 0 : overallAccuracy,
      distances: distancesMap,
    };
  }

  /**
   * Helper to normalize a list of athletes under the active distance layout.
   */
  public static normalizeAll(athletes: Athlete[], distances: DistanceConfig[]): UnifiedScorePackage[] {
    return athletes.map((ath) => this.normalize(ath, distances));
  }
}
