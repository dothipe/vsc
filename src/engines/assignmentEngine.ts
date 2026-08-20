/**
 * VSC Platform V3 - Production Assignment Engine
 * Handlers dynamic lane allocation, heats, referee assignments, and shooting orders.
 * Supports Sequential, Ranking, Snake, Random, and Seeded distribution strategies.
 */

import { TournamentParticipantV3, MasterReferee, HeatV3 } from "../types";

export type AssignmentStrategyV3 = "sequential" | "ranking" | "snake" | "random" | "seeded" | "ranking_asc";

export interface AssignmentConfigV3 {
  lanesCount: number; // e.g. 5 or 10 active lanes on the range
  refereeIds: string[]; // List of available referee user IDs
  strategy: AssignmentStrategyV3;
  clubSeparation?: boolean; // If true, avoid placing athletes from the same club in adjacent lanes
  seedScores?: Record<string, number>; // Mapping participantId -> score for ranking/seeded strategies
  tournamentId?: string; // Optional context for HeatV3
  stageId?: string; // Optional context for HeatV3
  roundId?: string; // Optional context for HeatV3
  stageIndex?: number; // Optional context for stage index (0-based)
}

export interface LaneAssignmentV3 {
  assignmentId: string;
  laneNumber: number;
  participantId: string;
  fullName: string;
  bibNumber: string;
  clubId?: string;
  refereeId?: string;
  heatNumber: number;
  shootingOrder: number; // Global index in shooting queue
}

export interface AssignmentGenerationResultV3 {
  assignments: LaneAssignmentV3[];
  heats: HeatV3[]; // Fully integrated first-class Heat models
  totalHeats: number;
  unassignedParticipantIds: string[];
}

export class AssignmentEngine {
  /**
   * Generates dynamic lane, heat, and referee allocations based on the configured strategy.
   * Pure function, no side effects.
   */
  public static generateAssignments(
    participants: TournamentParticipantV3[],
    config: AssignmentConfigV3
  ): AssignmentGenerationResultV3 {
    const { lanesCount, refereeIds, strategy, clubSeparation = false, seedScores = {} } = config;

    if (lanesCount <= 0) {
      throw new Error("Số lượng bệ bắn (lanesCount) phải lớn hơn 0.");
    }

    // Filter to only active, non-eliminated participants
    let eligibleParticipants = participants.filter((p) => {
      const pStatus = (p.status || "").toString().toLowerCase();
      const pQStatus = (p.qualificationStatus || "").toString().toLowerCase();

      const isEliminated =
        pStatus === "eliminated" ||
        pStatus === "bị loại" ||
        pQStatus === "eliminated" ||
        pQStatus === "not_qualified" ||
        pQStatus.startsWith("eliminated_");

      const isWithdrawn =
        pStatus === "withdrawn" ||
        pStatus === "bỏ thi" ||
        pStatus === "dns";

      if (isEliminated || isWithdrawn) return false;

      return true;
    });

    if (eligibleParticipants.length === 0) {
      return {
        assignments: [],
        heats: [],
        totalHeats: 0,
        unassignedParticipantIds: participants.map((p) => p.participantId)
      };
    }

    // 1. Sort or shuffle the participants based on the chosen strategy
    let orderedParticipants = [...eligibleParticipants];

    switch (strategy) {
      case "random":
        // Pure random shuffle
        orderedParticipants.sort(() => Math.random() - 0.5);
        break;

      case "ranking":
        // Sort from highest seed score to lowest
        orderedParticipants.sort((a, b) => {
          const scoreA = seedScores[a.participantId] ?? 0;
          const scoreB = seedScores[b.participantId] ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA; // Descending
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          return bibA.localeCompare(bibB, undefined, { numeric: true });
        });
        break;

      case "ranking_asc":
        // Sort from lowest seed score to highest (ranking từ nhỏ đến lớn)
        orderedParticipants.sort((a, b) => {
          const scoreA = seedScores[a.participantId] ?? 0;
          const scoreB = seedScores[b.participantId] ?? 0;
          if (scoreA !== scoreB) return scoreA - scoreB; // Ascending
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          return bibA.localeCompare(bibB, undefined, { numeric: true });
        });
        break;

      case "seeded":
        // Seeded groups top, middle, bottom evenly across heats
        orderedParticipants.sort((a, b) => {
          const scoreA = seedScores[a.participantId] ?? 0;
          const scoreB = seedScores[b.participantId] ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA; // Descending
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          return bibA.localeCompare(bibB, undefined, { numeric: true });
        });
        break;

      case "snake":
        // Sorted first to enable snake routing across rows
        orderedParticipants.sort((a, b) => {
          const scoreA = seedScores[a.participantId] ?? 0;
          const scoreB = seedScores[b.participantId] ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          return bibA.localeCompare(bibB, undefined, { numeric: true });
        });
        break;

      case "sequential":
        // Sort from lowest BIB to highest BIB (natural sort, e.g. BIB-1 < BIB-2 < BIB-10)
        orderedParticipants.sort((a, b) => {
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          
          // Try to clean/extract numeric parts for perfect numeric sorting
          const numA = parseInt((bibA.match(/\d+/) || [])[0], 10);
          const numB = parseInt((bibB.match(/\d+/) || [])[0], 10);
          
          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) {
              return numA - numB;
            }
          } else if (!isNaN(numA)) {
            return -1;
          } else if (!isNaN(numB)) {
            return 1;
          }

          return bibA.localeCompare(bibB, undefined, { numeric: true, sensitivity: "base" });
        });
        break;
    }

    // Preserve original athlete BIB numbers across all stages
    const bibMap: Record<string, string> = {};

    orderedParticipants.forEach((p, idx) => {
      bibMap[p.participantId] = p.bibNumber || `BIB-${String(idx + 1).padStart(3, '0')}`;
    });

    if (clubSeparation && strategy !== "sequential") {
      orderedParticipants = this.applyClubSeparation(orderedParticipants);
    }

    const assignments: LaneAssignmentV3[] = [];
    const totalParticipants = orderedParticipants.length;
    const totalHeats = Math.ceil(totalParticipants / lanesCount);

    // 2. Map participants to Heats and Lanes
    if (strategy === "snake") {
      // Snake pattern: Heat 1 (L1 -> LN), Heat 2 (LN -> L1), Heat 3 (L1 -> LN)...
      let globalIndex = 0;
      for (let heat = 1; heat <= totalHeats; heat++) {
        const isReverse = heat % 2 === 0;
        const heatLanes: number[] = [];
        for (let l = 1; l <= lanesCount; l++) {
          heatLanes.push(l);
        }
        if (isReverse) {
          heatLanes.reverse();
        }

        for (let lIndex = 0; lIndex < lanesCount; lIndex++) {
          if (globalIndex >= totalParticipants) break;
          const participant = orderedParticipants[globalIndex];
          const lane = heatLanes[lIndex];
          const assignedRefereeId = refereeIds.length > 0 ? refereeIds[(lane - 1) % refereeIds.length] : undefined;

          const finalBib = bibMap[participant.participantId];

          assignments.push({
            assignmentId: `assign-${participant.participantId}-${heat}-${lane}`,
            laneNumber: lane,
            participantId: participant.participantId,
            fullName: participant.fullName,
            bibNumber: finalBib,
            clubId: participant.clubId,
            refereeId: assignedRefereeId,
            heatNumber: heat,
            shootingOrder: globalIndex + 1
          });

          globalIndex++;
        }
      }
    } else if (strategy === "seeded") {
      // Seeded strategy distributes seed ranks across heats so top seeds don't cluster on same heat/lanes
      const heatGrid: (TournamentParticipantV3 | null)[][] = Array.from({ length: totalHeats }, () =>
        Array(lanesCount).fill(null)
      );

      let pIndex = 0;
      // Round-robin distribution to distribute top seeds evenly across different heats
      for (let lane = 0; lane < lanesCount; lane++) {
        for (let heat = 0; heat < totalHeats; heat++) {
          if (pIndex < totalParticipants) {
            heatGrid[heat][lane] = orderedParticipants[pIndex];
            pIndex++;
          }
        }
      }

      // Flatten grid into final assignments
      let order = 1;
      for (let h = 0; h < totalHeats; h++) {
        for (let l = 0; l < lanesCount; l++) {
          const participant = heatGrid[h][l];
          if (participant) {
            const laneNum = l + 1;
            const assignedRefereeId = refereeIds.length > 0 ? refereeIds[l % refereeIds.length] : undefined;

            const finalBib = bibMap[participant.participantId];

            assignments.push({
              assignmentId: `assign-${participant.participantId}-${h + 1}-${laneNum}`,
              laneNumber: laneNum,
              participantId: participant.participantId,
              fullName: participant.fullName,
              bibNumber: finalBib,
              clubId: participant.clubId,
              refereeId: assignedRefereeId,
              heatNumber: h + 1,
              shootingOrder: order++
            });
          }
        }
      }
    } else {
      // Standard sequential / random / ranking linear assignment
      for (let i = 0; i < totalParticipants; i++) {
        const participant = orderedParticipants[i];
        const heat = Math.floor(i / lanesCount) + 1;
        const lane = (i % lanesCount) + 1;
        const assignedRefereeId = refereeIds.length > 0 ? refereeIds[(lane - 1) % refereeIds.length] : undefined;

        const finalBib = bibMap[participant.participantId];

        assignments.push({
          assignmentId: `assign-${participant.participantId}-${heat}-${lane}`,
          laneNumber: lane,
          participantId: participant.participantId,
          fullName: participant.fullName,
          bibNumber: finalBib,
          clubId: participant.clubId,
          refereeId: assignedRefereeId,
          heatNumber: heat,
          shootingOrder: i + 1
        });
      }
    }

    // 3. Construct Operational HeatV3 Models
    const heats: HeatV3[] = [];
    const assignmentsByHeat: Record<number, LaneAssignmentV3[]> = {};
    for (const assign of assignments) {
      if (!assignmentsByHeat[assign.heatNumber]) {
        assignmentsByHeat[assign.heatNumber] = [];
      }
      assignmentsByHeat[assign.heatNumber].push(assign);
    }

    const tId = config.tournamentId || "tour-default";
    const sId = config.stageId || "stage-default";
    const rId = config.roundId || "round-default";

    for (let hNum = 1; hNum <= totalHeats; hNum++) {
      const heatAssigns = assignmentsByHeat[hNum] || [];
      const heatReferee = refereeIds.length > 0 ? refereeIds[(hNum - 1) % refereeIds.length] : undefined;

      heats.push({
        heatId: `heat-${tId}-${sId}-${hNum}`,
        heatNumber: hNum,
        tournamentId: tId,
        stageId: sId,
        roundId: rId,
        status: "pending",
        refereeId: heatReferee,
        heatType: "normal",
        heatName: `Lượt bắn ${hNum}`,
        lanes: heatAssigns.map((assign) => ({
          laneNumber: assign.laneNumber,
          participantId: assign.participantId,
          fullName: assign.fullName,
          bibNumber: assign.bibNumber,
          clubId: assign.clubId,
          refereeId: assign.refereeId,
          shootingOrder: assign.shootingOrder
        }))
      });
    }

    // Determine if any participants could not be assigned
    const assignedIds = new Set(assignments.map((a) => a.participantId));
    const unassigned = participants
      .filter((p) => !assignedIds.has(p.participantId))
      .map((p) => p.participantId);

    return {
      assignments,
      heats,
      totalHeats,
      unassignedParticipantIds: unassigned
    };
  }

  /**
   * Generates a Solo shoot-off heat for the given tied participants.
   */
  public static generateSoloHeat(
    tiedParticipants: TournamentParticipantV3[],
    config: {
      lanesCount: number;
      refereeIds: string[];
      tournamentId: string;
      stageId: string;
      roundId: string;
      soloIndex: number;
      soloRoundIndex?: number;
      roundNumber?: number;
      isTeamMode?: boolean;
    }
  ): HeatV3 {
    const { lanesCount, refereeIds, tournamentId, stageId, roundId, soloIndex, soloRoundIndex = 1, roundNumber, isTeamMode = false } = config;
    const rNum = roundNumber && roundNumber > 0 ? roundNumber : 1;
    const baseSoloRoundNum = isTeamMode ? (rNum * 1100 + soloRoundIndex) : (rNum * 100 + soloRoundIndex); // E.g., 1101, 1102 or 301, 302
    const heatNumber = baseSoloRoundNum * 100 + soloIndex; // E.g., 110101, 110102 or 30101, 30102
    const isResolo = soloRoundIndex > 1;
    const heatType = isResolo ? "resolo" : "solo";
    const heatName = isResolo 
      ? `Lượt ${soloIndex} - Vòng Re-Solo ${baseSoloRoundNum}` 
      : `Lượt ${soloIndex} - Vòng Solo ${baseSoloRoundNum}`;

    const lanes = tiedParticipants.map((p, idx) => {
      const laneNum = idx + 1;
      const refereeId = refereeIds.length > 0 ? refereeIds[idx % refereeIds.length] : undefined;
      return {
        laneNumber: laneNum,
        participantId: p.participantId,
        fullName: p.fullName,
        bibNumber: p.bibNumber,
        clubId: p.clubId,
        refereeId,
        shootingOrder: idx + 1
      };
    });

    return {
      heatId: isTeamMode ? `heat-team-solo-${tournamentId}-${stageId}-${soloRoundIndex}-${soloIndex}` : `heat-solo-${tournamentId}-${stageId}-${soloRoundIndex}-${soloIndex}`,
      heatNumber,
      tournamentId,
      stageId,
      roundId,
      status: "pending",
      heatType,
      heatName,
      lanes
    };
  }

  /**
   * Generates a ReSolo sudden death heat for the given tied participants.
   */
  public static generateReSoloHeat(
    tiedParticipants: TournamentParticipantV3[],
    config: {
      lanesCount: number;
      refereeIds: string[];
      tournamentId: string;
      stageId: string;
      roundId: string;
      reSoloIndex: number;
    }
  ): HeatV3 {
    const { lanesCount, refereeIds, tournamentId, stageId, roundId, reSoloIndex } = config;
    const heatNumber = 200 + reSoloIndex;
    const lanes = tiedParticipants.map((p, idx) => {
      const laneNum = idx + 1;
      const refereeId = refereeIds.length > 0 ? refereeIds[idx % refereeIds.length] : undefined;
      return {
        laneNumber: laneNum,
        participantId: p.participantId,
        fullName: p.fullName,
        bibNumber: p.bibNumber,
        clubId: p.clubId,
        refereeId,
        shootingOrder: idx + 1
      };
    });

    return {
      heatId: `heat-resolo-${tournamentId}-${stageId}-${reSoloIndex}`,
      heatNumber,
      tournamentId,
      stageId,
      roundId,
      status: "pending",
      heatType: "resolo",
      heatName: `ReSolo Sudden Death - ${reSoloIndex.toString().padStart(2, "0")}`,
      lanes
    };
  }

  /**
   * Helper utility to rearrange participants to minimize consecutive lanes from the same club.
   */
  private static applyClubSeparation(participants: TournamentParticipantV3[]): TournamentParticipantV3[] {
    if (participants.length <= 2) return participants;

    const result: TournamentParticipantV3[] = [];
    const pool = [...participants];

    // Greedy placement
    result.push(pool.shift()!);

    while (pool.length > 0) {
      const lastPlaced = result[result.length - 1];
      let foundIndex = -1;

      // Find first participant from a different club
      for (let i = 0; i < pool.length; i++) {
        if (!lastPlaced.clubId || pool[i].clubId !== lastPlaced.clubId) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        result.push(pool.splice(foundIndex, 1)[0]);
      } else {
        // Fallback: take next available even if club is the same
        result.push(pool.shift()!);
      }
    }

    return result;
  }

  /**
   * Generates a Team Assignment layout (Parallel or Sequential) for Team Competition.
   */
  public static generateTeamAssignments(
    participants: any[],
    config: {
      lanesCount: number;
      refereeIds: string[];
      strategy: "team_parallel" | "team_sequential" | string;
      tournamentId: string;
      stageId: string;
      roundId: string;
    }
  ): { heats: HeatV3[]; totalHeats: number } {
    const { lanesCount, refereeIds, strategy, tournamentId, stageId, roundId } = config;
    const isParallel = strategy === "team_parallel" || strategy.includes("parallel");
    const generatedHeats: HeatV3[] = [];

    // Filter to only active, non-eliminated participants
    const eligible = participants.filter((p) => {
      const pStatus = (p.status || "").toString().toLowerCase();
      const pQStatus = (p.qualificationStatus || "").toString().toLowerCase();
      const isEliminated =
        pStatus === "eliminated" ||
        pStatus === "bị loại" ||
        pQStatus === "eliminated" ||
        pQStatus === "not_qualified" ||
        pQStatus.startsWith("eliminated_");
      const isWithdrawn =
        pStatus === "withdrawn" ||
        pStatus === "bỏ thi" ||
        pStatus === "dns";
      return !isEliminated && !isWithdrawn;
    });

    if (eligible.length === 0) {
      return { heats: [], totalHeats: 0 };
    }

    // Group by team/club name
    const teamsMap: Record<string, any[]> = {};
    eligible.forEach((p) => {
      const teamName = p.clubId || p.clubName || p.team || "Không có Đội";
      if (!teamsMap[teamName]) {
        teamsMap[teamName] = [];
      }
      teamsMap[teamName].push(p);
    });

    const teamNames = Object.keys(teamsMap);

    if (isParallel) {
      let currentHeatNum = 1;
      let currentLaneNum = 1;
      let currentLanesList: any[] = [];

      teamNames.forEach((teamName) => {
        const members = teamsMap[teamName] || [];
        if (members.length === 0) return;

        // Check if this team fits in the current heat
        if (currentLaneNum + members.length - 1 > lanesCount) {
          if (currentLanesList.length > 0) {
            generatedHeats.push({
              heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              heatNumber: currentHeatNum,
              tournamentId,
              stageId,
              roundId,
              status: "pending",
              heatName: `Lượt bắn Đồng Đội ${currentHeatNum} (Song song)`,
              lanes: currentLanesList
            });
            currentHeatNum++;
          }
          currentLaneNum = 1;
          currentLanesList = [];
        }

        // Place members on consecutive/adjacent lanes
        members.forEach((p) => {
          currentLanesList.push({
            laneNumber: currentLaneNum,
            participantId: p.participantId || p.id,
            fullName: p.fullName || p.name,
            bibNumber: p.bibNumber || `BIB-${p.participantId || p.id}`,
            clubId: p.clubId || p.team || "CLB",
            clubName: teamName,
            refereeId: refereeIds.length > 0 ? refereeIds[(currentLaneNum - 1) % refereeIds.length] : `referee_${(currentLaneNum - 1) % 3 + 1}`,
            shootingOrder: 1
          });
          currentLaneNum++;
        });
      });

      // Push last heat
      if (currentLanesList.length > 0) {
        generatedHeats.push({
          heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          heatNumber: currentHeatNum,
          tournamentId,
          stageId,
          roundId,
          status: "pending",
          heatName: `Lượt bắn Đồng Đội ${currentHeatNum} (Song song)`,
          lanes: currentLanesList
        });
      }
    } else {
      // Sequential mode
      const maxTeamSize = Math.max(...teamNames.map(name => (teamsMap[name] || []).length), 1);
      let seqHeatNum = 1;

      for (let i = 0; i < teamNames.length; i += lanesCount) {
        const blockTeams = teamNames.slice(i, i + lanesCount);

        for (let shooterIdx = 0; shooterIdx < maxTeamSize; shooterIdx++) {
          const lanesList: any[] = [];

          blockTeams.forEach((teamName, laneIdx) => {
            const laneNum = laneIdx + 1;
            const members = teamsMap[teamName] || [];
            const p = members[shooterIdx];

            if (p) {
              lanesList.push({
                laneNumber: laneNum,
                participantId: p.participantId || p.id,
                fullName: p.fullName || p.name,
                bibNumber: p.bibNumber || `BIB-${p.participantId || p.id}`,
                clubId: p.clubId || p.team || "CLB",
                clubName: teamName,
                refereeId: refereeIds.length > 0 ? refereeIds[(laneNum - 1) % refereeIds.length] : `referee_${(laneNum - 1) % 3 + 1}`,
                shootingOrder: shooterIdx + 1
              });
            }
          });

          if (lanesList.length > 0) {
            const currentHeatNumber = seqHeatNum++;
            const heatId = `heat-team-s-${currentHeatNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
            generatedHeats.push({
              heatId,
              heatNumber: currentHeatNumber,
              tournamentId,
              stageId,
              roundId,
              status: "pending",
              heatName: `Loạt bắn Đồng Đội ${currentHeatNumber} (Nối tiếp - VĐV ${shooterIdx + 1})`,
              lanes: lanesList
            });
          }
        }
      }
    }

    return { heats: generatedHeats, totalHeats: generatedHeats.length };
  }
}
