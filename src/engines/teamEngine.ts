/**
 * VSC Platform V3 - Team Score Calculation & Ranking Engine
 * Calculates club-wide scores, handles matching distances list, and outputs team standings.
 */

import { Athlete, ClubV2 } from "../types";

export interface TeamScoreConfig {
  distanceIds: string[];
  athletesPerTeam: number; // e.g. Top 3 athletes count towards the team score
}

export interface TeamScoreInput {
  clubId: string;
  clubName: string;
  athletes: Athlete[];
  config: TeamScoreConfig;
}

export interface CalculatedTeamStandings {
  clubId: string;
  clubName: string;
  totalScore: number;
  contributingAthletes: { athleteId: string; name: string; score: number }[];
  rank: number;
}

export class TeamEngine {
  /**
   * Calculate aggregated team standings based on top athlete performances.
   */
  public static calculateStandings(
    teamsData: TeamScoreInput[],
    limitToTopContrib: number = 3
  ): CalculatedTeamStandings[] {
    const list: CalculatedTeamStandings[] = teamsData.map((team) => {
      // 1. Calculate each athlete's total score across relevant team distance IDs
      const athleteScores = team.athletes.map((athlete) => {
        let total = 0;
        for (const distId of team.config.distanceIds) {
          const shots = athlete.scores[distId] || [];
          for (const shot of shots) {
            if (typeof shot === "number") {
              total += shot;
            } else if (shot === true) {
              total += 1;
            }
          }
        }
        return {
          athleteId: athlete.id,
          name: athlete.name,
          score: total
        };
      });

      // 2. Sort athletes descending by score
      athleteScores.sort((a, b) => b.score - a.score);

      // 3. Take the top contributing athletes
      const contributingAthletes = athleteScores.slice(0, limitToTopContrib);

      // 4. Sum their scores for the final team score
      const totalScore = contributingAthletes.reduce((sum, current) => sum + current.score, 0);

      return {
        clubId: team.clubId,
        clubName: team.clubName,
        totalScore,
        contributingAthletes,
        rank: 0 // Will assign during sort below
      };
    });

    // Sort teams by total score descending
    list.sort((a, b) => b.totalScore - a.totalScore);

    // Assign rank
    return list.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }
}
