/**
 * VSC Platform V3 - Official Result Engine
 * Pure computation and state coordinator for producing canonical competition outcomes.
 * Consumes Frozen Rankings and spits out immutable legal standings.
 */

import { OfficialResult, OfficialResultAudit, OfficialResultVersion } from "../types";
import { RankedAthleteOutput } from "./rankingEngine";

export interface OfficialResultInput {
  tournamentId: string;
  frozenRankings: RankedAthleteOutput[];
  qualificationResults?: Record<string, "qualified" | "eliminated" | "tie_at_cutoff" | "solo_required" | "re_solo_required">;
  soloResults?: Record<string, { rankAdjusted?: number; completed?: boolean }>;
  reSoloResults?: Record<string, { rankAdjusted?: number; completed?: boolean }>;
  penalties?: Record<string, { deduction: number; reason: string }>;
  statusOverrides?: Record<string, "active" | "withdrawn" | "disqualified" | "dns">;
  adminRankOverrides?: Record<string, number>;
  operator: string;
}

export class OfficialResultEngine {
  /**
   * Generates the official result package based on frozen rankings and external tournament engines.
   */
  public static generate(input: OfficialResultInput, currentVersion: number = 1): OfficialResult[] {
    const {
      tournamentId,
      frozenRankings,
      qualificationResults = {},
      soloResults = {},
      reSoloResults = {},
      penalties = {},
      statusOverrides = {},
      adminRankOverrides = {},
      operator
    } = input;

    const timestamp = new Date().toISOString();

    return frozenRankings.map((ranked) => {
      const athleteId = ranked.athleteId;
      
      // Determine final status
      const officialStatus = statusOverrides[athleteId] || "active";

      // Final Rank computation (with admin and tie breaker overrides)
      let finalRank = ranked.rank;
      if (adminRankOverrides[athleteId] !== undefined) {
        finalRank = adminRankOverrides[athleteId];
      } else if (reSoloResults[athleteId]?.rankAdjusted !== undefined) {
        finalRank = reSoloResults[athleteId].rankAdjusted!;
      } else if (soloResults[athleteId]?.rankAdjusted !== undefined) {
        finalRank = soloResults[athleteId].rankAdjusted!;
      }

      // Medals are determined strictly from Official Results
      let finalMedal: "gold" | "silver" | "bronze" | "top_10" | "none" = "none";
      if (officialStatus === "active") {
        if (finalRank === 1) finalMedal = "gold";
        else if (finalRank === 2) finalMedal = "silver";
        else if (finalRank === 3) finalMedal = "bronze";
        else if (finalRank <= 10) finalMedal = "top_10";
      }

      // Standing label
      let officialStanding = "Participant";
      if (officialStatus === "disqualified") {
        officialStanding = "Disqualified (DQ)";
      } else if (officialStatus === "withdrawn") {
        officialStanding = "Withdrawn (WD)";
      } else if (officialStatus === "dns") {
        officialStanding = "Did Not Start (DNS)";
      } else {
        if (finalRank === 1) officialStanding = "Champion";
        else if (finalRank === 2) officialStanding = "Runner-Up";
        else if (finalRank === 3) officialStanding = "Third Place";
        else if (finalRank <= 10) officialStanding = `Top ${finalRank}`;
        else officialStanding = `Rank ${finalRank}`;
      }

      // Qualification
      const finalQualification = qualificationResults[athleteId] || 
        (finalRank <= 16 ? "qualified" : "eliminated");

      // Points calculation formula: 1st = 100, 2nd = 80, 3rd = 60, 4th = 50, 5th = 45, etc.
      let seasonPoints = 0;
      if (officialStatus === "active") {
        if (finalRank === 1) seasonPoints = 100;
        else if (finalRank === 2) seasonPoints = 80;
        else if (finalRank === 3) seasonPoints = 60;
        else if (finalRank === 4) seasonPoints = 50;
        else if (finalRank === 5) seasonPoints = 45;
        else if (finalRank === 6) seasonPoints = 40;
        else if (finalRank === 7) seasonPoints = 36;
        else if (finalRank === 8) seasonPoints = 32;
        else if (finalRank === 9) seasonPoints = 28;
        else if (finalRank === 10) seasonPoints = 24;
        else if (finalRank <= 16) seasonPoints = 15;
        else if (finalRank <= 32) seasonPoints = 5;
        else seasonPoints = 1;
      }

      return {
        id: `res_${tournamentId}_${athleteId}`,
        tournamentId,
        athleteId,
        vscNumber: ranked.athleteId.substring(0, 10).toUpperCase(), // fallback representation of vsc registry
        fullName: ranked.name,
        finalRank,
        finalMedal,
        finalQualification,
        officialStanding,
        awardEligibility: officialStatus === "active" && finalRank <= 3,
        seasonPoints,
        historicalRecord: officialStatus === "active",
        officialStatus,
        version: currentVersion,
        updatedAt: timestamp,
        updatedBy: operator
      };
    });
  }

  /**
   * Corrects an official result package by applying changes, raising the version, and writing audit logs.
   */
  public static correct(
    previousVersion: OfficialResultVersion,
    input: OfficialResultInput,
    reason: string,
    approvalChain: string[]
  ): {
    newVersion: OfficialResultVersion;
    audits: OfficialResultAudit[];
  } {
    const nextVersionNumber = previousVersion.versionNumber + 1;
    const newResults = this.generate(input, nextVersionNumber);
    const timestamp = new Date().toISOString();

    const audits: OfficialResultAudit[] = [];

    newResults.forEach((newRes) => {
      const prevRes = previousVersion.results.find((r) => r.athleteId === newRes.athleteId) || null;
      
      // Determine if a change actually occurred
      const changed = !prevRes || 
        prevRes.finalRank !== newRes.finalRank ||
        prevRes.finalMedal !== newRes.finalMedal ||
        prevRes.officialStatus !== newRes.officialStatus;

      if (changed) {
        audits.push({
          id: `audit_${newRes.id}_v${nextVersionNumber}`,
          resultId: newRes.id,
          previousResult: prevRes,
          newResult: newRes,
          reason,
          operator: input.operator,
          approvalChain,
          timestamp
        });
      }
    });

    const newVersion: OfficialResultVersion = {
      versionNumber: nextVersionNumber,
      timestamp,
      operator: input.operator,
      reason,
      changeSummary: `Corrected ${audits.length} athlete records after administrator review.`,
      auditReference: audits.map((a) => a.id).join(", "),
      results: newResults
    };

    return { newVersion, audits };
  }
}
