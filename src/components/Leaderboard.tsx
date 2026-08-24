import React, { useState, useMemo, useEffect } from "react";
import { Athlete, DistanceConfig } from "../types";
import { Trophy, Medal, Award, Search, ArrowUpDown, Building, Info, Zap, Flag, ShieldCheck, History, TrendingUp, Sparkles, Star } from "lucide-react";
import { db, collection, getDocs, onSnapshot, query, where, orderBy } from "../firebase";
import { AVATAR_MALE, AVATAR_FEMALE } from "./AthleteRegistry";
import { calculateRounds } from "../utils/qualification";
import { getCleanVscNumber, getCleanBibNumber, isNoTeam } from "../utils/athleteUtils";
import { ensureArray, subscribeToVscSystemAthletes } from "../lib/firebaseService";
import { getSoloRoundsFromDist } from "../engines/rankingEngine";
import { useTournamentState } from "../providers/TournamentStateProvider";

interface LeaderboardProps {
  athletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
  competitionMode?: "individual" | "team";
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  activeDistanceIndex?: number;
}

type SortField = "rank" | "name" | "team" | "accuracy" | "teamScore";

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  athletes, 
  distances, 
  shotsCount, 
  competitionMode,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  activeDistanceIndex,
}) => {
  const { vscSystemClubs } = useTournamentState();

  const getClubLogo = (tName: string) => {
    if (!vscSystemClubs || !tName) return null;
    const found = vscSystemClubs.find(
      (c: any) =>
        c.clubName?.trim().toLowerCase() === tName.trim().toLowerCase() ||
        c.name?.trim().toLowerCase() === tName.trim().toLowerCase()
    );
    return found?.logoUrl || null;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(false);
  const [showTopXOnly, setShowTopXOnly] = useState(false);
  const [topXLimit, setTopXLimit] = useState<number>(10);
  const [selectedRoundTab, setSelectedRoundTab] = useState<number | "all">(
    typeof activeDistanceIndex === "number" && activeDistanceIndex >= 0 && activeDistanceIndex < distances.length
      ? activeDistanceIndex
      : "all"
  );

  const hasMaxRoundScoreConfGlobal = useMemo(() => (distances || []).some(d => d.isMaxRoundScore), [distances]);

  // Sync selectedRoundTab when Mission Control active round changes
  useEffect(() => {
    if (typeof activeDistanceIndex === "number" && activeDistanceIndex >= 0 && activeDistanceIndex < distances.length) {
      setSelectedRoundTab(activeDistanceIndex);
    }
  }, [activeDistanceIndex, distances.length]);

  // V3 Multi-Dimensional Rankings & Snapshots state
  const [rankingSubTab, setRankingSubTab] = useState<"live" | "season" | "club" | "province" | "stats" | "laotuong" | "treem">("live");
  const [seasonRankings, setSeasonRankings] = useState<any[]>([]);
  const [statsSnapshots, setStatsSnapshots] = useState<any[]>([]);
  const [globalMasterAthletes, setGlobalMasterAthletes] = useState<any[]>([]);

  // Subscribe to system master athletes for avatar resolving
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((data) => {
      setGlobalMasterAthletes(data || []);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Fetch Season Rankings, Statistics and Hall of Fame from V3 Firestore snapshots on subtab switches
  useEffect(() => {
    if (rankingSubTab === "season") {
      const q = query(collection(db, "ranking_snapshots"), where("round", "==", "season"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const rankings: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.rankings)) {
            rankings.push(...data.rankings);
          }
        });
        setSeasonRankings(rankings);
      }, (err) => console.error("Error subscribing to season snapshots:", err));
      return () => unsubscribe();
    }

    if (rankingSubTab === "stats") {
      const q = query(collection(db, "statistics_snapshots"), orderBy("updatedAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setStatsSnapshots(list);
      }, (err) => console.error("Error subscribing to stats snapshots:", err));
      return () => unsubscribe();
    }
  }, [rankingSubTab]);

  const isDirectMode = shotsCount === 1;

  const effectiveShotsCount = isDirectMode
    ? (competitionMode === "team" ? (teamDirectMaxShots || 10) : (directMaxShots || 10))
    : shotsCount;

  const effectiveDirectMaxPoints = competitionMode === "team" ? teamDirectMaxPoints : directMaxPoints;
  const isPointModeActive = isDirectMode && effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0;

  const getLeaderboardHitCount = (hits: any[]) => {
    if (isDirectMode && hits[0] !== null && hits[0] !== undefined) {
      const parsed = Number(hits[0]);
      return isNaN(parsed) ? 0 : parsed;
    }
    return hits.filter(Boolean).length;
  };

  const cleanName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase().replace(/[\s\.\-_]+/g, "").trim();
  };

  const matchByName = (list: any[], targetName: string) => {
    if (!list || !targetName) return null;
    const cleanedTarget = cleanName(targetName);
    return list.find((a: any) => {
      const aName = a.fullName || a.name || "";
      return cleanName(aName) === cleanedTarget;
    });
  };

  const resolveAthleteAvatar = (vdv: any) => {
    if (!vdv) return AVATAR_MALE;
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    // 1. Match by masterAthleteId
    if (!avatarUrl && vdv.masterAthleteId) {
      const found = globalMasterAthletes?.find((a: any) => a.id === vdv.masterAthleteId) as any;
      if (found && (found.avatarUrl || found.avatar)) {
        avatarUrl = found.avatarUrl || found.avatar;
      }
    }
    
    // 2. Match by clean name
    if (!avatarUrl) {
      const targetName = vdv.fullName || vdv.name;
      if (targetName) {
        const found = matchByName(globalMasterAthletes || [], targetName);
        if (found && (found.avatarUrl || found.avatar)) {
          avatarUrl = found.avatarUrl || found.avatar;
        }
      }
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  // All active athletes: in team mode, only include those who are primary team players (bắn chính) and exclude free athletes
  const activeAthletes = useMemo(() => {
    let base = athletes;
    if (rankingSubTab === "laotuong") {
      base = athletes.filter(a => (a.competitionCategory || "Amateur") === "Lão tướng");
    } else if (rankingSubTab === "treem") {
      base = athletes.filter(a => (a.competitionCategory || "Amateur") === "Trẻ em");
    }
    if (competitionMode === "team") {
      return base.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName));
    }
    return base;
  }, [athletes, competitionMode, rankingSubTab]);

  // All unique teams
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    activeAthletes.forEach((athlete) => {
      if (athlete.team.trim()) {
        teams.add(athlete.team.trim());
      }
    });
    return Array.from(teams);
  }, [activeAthletes]);

  // Compute qualifications and rounds results
  const roundResults = useMemo(() => {
    const effectiveDirectMaxPoints = competitionMode === "team" ? teamDirectMaxPoints : directMaxPoints;
    const effectiveDirectMaxShots = competitionMode === "team" ? teamDirectMaxShots : directMaxShots;
    return calculateRounds(activeAthletes, distances, effectiveShotsCount, effectiveDirectMaxPoints, effectiveDirectMaxShots);
  }, [activeAthletes, distances, effectiveShotsCount, competitionMode, directMaxPoints, teamDirectMaxPoints, directMaxShots, teamDirectMaxShots]);

  // Group and compute round-by-round team progression in team competition mode
  const teamRoundResults = useMemo(() => {
    if (competitionMode !== "team") return [] as any[];

    const results: any[] = [];
    const teamCumulativeScores: Record<string, number> = {};
    const teamCumulativeHits: Record<string, number> = {};

    const activeTeams = Array.from(new Set(activeAthletes.map((a) => {
      const raw = a.team.trim();
      return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
    }))) as string[];

    for (let r = 0; r < distances.length; r++) {
      const dist = distances[r];
      const teamRoundScores: Record<string, {
        roundHits: number;
        roundScore: number;
        cumulativeHits: number;
        cumulativeScore: number;
        displayScore: number;
        accuracy: number;
        displayScoreWithSolo: number;
        hasUnshotMember: boolean;
        hasAnySoloEntered: boolean;
        teamSoloHits: number;
      }> = {};

      const currentRoundTeams = Array.from(new Set(activeAthletes.map((a) => {
        const raw = a.team.trim();
        return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
      }))).filter((tName) => activeTeams.includes(tName as string)) as string[];

      currentRoundTeams.forEach((teamName: string) => {
        const members = activeAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName;
        });

        const activeMembers = members.filter(memb => memb.status !== "Bỏ thi");

        // Check if any active sibling has not shot in this round at all
        const hasUnshotMember = activeMembers.some((memb) => {
          const hits = memb.scores[dist.id] || [];
          return !hits || hits.length === 0 || hits.every((v) => v === null || v === undefined);
        });

        let roundHits = 0;
        let totalSoloHits = 0;
        let hasAnySoloEntered = false;

        activeMembers.forEach((memb) => {
          const hits = memb.scores[dist.id] || [];
          roundHits += getLeaderboardHitCount(hits);
          const soloVal = memb.soloHits?.[dist.id];
          if (soloVal !== undefined && soloVal !== null) {
            totalSoloHits += soloVal;
            hasAnySoloEntered = true;
          }
        });

        const roundScore = roundHits * dist.multiplier;
        const prevScore = teamCumulativeScores[teamName] || 0;
        const prevHits = teamCumulativeHits[teamName] || 0;

        const currCumulativeScore = prevScore + roundScore;
        const currCumulativeHits = prevHits + roundHits;

        teamCumulativeScores[teamName] = currCumulativeScore;
        teamCumulativeHits[teamName] = currCumulativeHits;

        const isCum = dist.isCumulative === true || String(dist.isCumulative) === "true";
        const displayScore = isCum ? currCumulativeScore : roundScore;
        const displayHits = isCum ? currCumulativeHits : roundHits;

        let accuracy = 0;
        if (isDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
          let totalMultiplier = 0;
          if (isCum) {
            for (let i = 0; i <= r; i++) {
              totalMultiplier += distances[i].multiplier;
            }
          } else {
            totalMultiplier = dist.multiplier;
          }
          const totalPossPoints = activeMembers.length * teamDirectMaxPoints * totalMultiplier;
          accuracy = totalPossPoints > 0 ? (displayScore / totalPossPoints) * 100 : 0;
        } else {
          const totalPossShots = activeMembers.length * (isCum ? (r + 1) * effectiveShotsCount : effectiveShotsCount);
          accuracy = totalPossShots > 0 ? (displayHits / totalPossShots) * 100 : 0;
        }

        const displayScoreWithSolo = displayScore + (totalSoloHits * 0.001);

        teamRoundScores[teamName] = {
          roundHits,
          roundScore,
          cumulativeHits: currCumulativeHits,
          cumulativeScore: currCumulativeScore,
          displayScore,
          accuracy,
          displayScoreWithSolo,
          hasUnshotMember,
          hasAnySoloEntered,
          teamSoloHits: totalSoloHits,
        };
      });

      let nextRoundTeams: string[] = [];
      let currentRoundEliminatedTeams: string[] = [];
      let roundPendingSoloTeams: string[] = [];
      let roundResoloTeams: string[] = [];

      if (dist.isElimination) {
        const sortedTeams = [...currentRoundTeams].sort((tA: string, tB: string) => {
          const scoreA = teamRoundScores[tA]?.displayScoreWithSolo || 0;
          const scoreB = teamRoundScores[tB]?.displayScoreWithSolo || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          const accA = teamRoundScores[tA]?.accuracy || 0;
          const accB = teamRoundScores[tB]?.accuracy || 0;
          return accB - accA;
        });

        let N = sortedTeams.length;
        const elimVal = dist.eliminationValue || 0;

        if (dist.eliminationType === "count") {
          N = Math.min(sortedTeams.length, elimVal);
        } else {
          N = Math.max(1, Math.round(sortedTeams.length * (elimVal / 100)));
        }

        if (sortedTeams.length <= N) {
          nextRoundTeams = [...sortedTeams];
          currentRoundEliminatedTeams = [];
        } else {
          const cutoffBaseScore = teamRoundScores[sortedTeams[N - 1]]?.displayScore || 0;

          const sures = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) > cutoffBaseScore);
          const contenders = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) === cutoffBaseScore);
          const purelyEliminated = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) < cutoffBaseScore);

          const slotsLeft = N - sures.length;

          // Check if any team in the round is not finished shooting yet (or specifically contenders/purely eliminated)
          const anyTeamUnfinished = currentRoundTeams.some((t) => teamRoundScores[t]?.hasUnshotMember);

          if (anyTeamUnfinished) {
            nextRoundTeams = [...currentRoundTeams];
            currentRoundEliminatedTeams = [];
          } else {
            if (dist.isSolo && slotsLeft > 0 && slotsLeft < contenders.length) {
              const finishedContendersWithNoSolo = contenders.filter((t) => !teamRoundScores[t]?.hasAnySoloEntered);
              roundPendingSoloTeams = [...finishedContendersWithNoSolo];

              if (finishedContendersWithNoSolo.length > 0) {
                nextRoundTeams = [...sures, ...contenders];
                currentRoundEliminatedTeams = [];
              } else {
                const contendersWithSolo = contenders.map((t) => ({
                  id: t,
                  soloHits: teamRoundScores[t]?.teamSoloHits || 0,
                }));

                contendersWithSolo.sort((a, b) => b.soloHits - a.soloHits);

                const winnerScoreBoundary = contendersWithSolo[slotsLeft - 1].soloHits;
                const loserScoreBoundary = contendersWithSolo[slotsLeft].soloHits;

                if (winnerScoreBoundary === loserScoreBoundary) {
                  const resoloCandidates = contendersWithSolo.filter((c) => c.soloHits === winnerScoreBoundary).map((c) => c.id);
                  roundResoloTeams = resoloCandidates;

                  const surelySoloPassed = contendersWithSolo.filter((c) => c.soloHits > winnerScoreBoundary).map((c) => c.id);
                  const surelySoloFailed = contendersWithSolo.filter((c) => c.soloHits < winnerScoreBoundary).map((c) => c.id);

                  nextRoundTeams = [...sures, ...surelySoloPassed, ...resoloCandidates];
                  currentRoundEliminatedTeams = [...surelySoloFailed, ...purelyEliminated];
                } else {
                  const soloPassed = contendersWithSolo.slice(0, slotsLeft).map((c) => c.id);
                  const soloFailed = contendersWithSolo.slice(slotsLeft).map((c) => c.id);

                  nextRoundTeams = [...sures, ...soloPassed];
                  currentRoundEliminatedTeams = [...soloFailed, ...purelyEliminated];
                }
              }
            } else {
              nextRoundTeams = [...sures, ...contenders];
              currentRoundEliminatedTeams = [...purelyEliminated];
            }
          }
        }
      } else {
        nextRoundTeams = [...currentRoundTeams];
        currentRoundEliminatedTeams = [];
      }

      results.push({
        distance: dist,
        roundIndex: r,
        qualifiedTeams: [...currentRoundTeams],
        eliminatedTeams: currentRoundEliminatedTeams,
        pendingSoloTeams: roundPendingSoloTeams,
        pendingResoloTeams: roundResoloTeams,
        scores: teamRoundScores,
      });

      // Update activeTeams for next round
      activeTeams.length = 0;
      activeTeams.push(...nextRoundTeams);
    }

    return results;
  }, [activeAthletes, distances, shotsCount, competitionMode]);

  // Group and compute active team scores in team competition mode
  const activeTeamScores = useMemo(() => {
    if (competitionMode !== "team") return {} as Record<string, number>;
    const scores: Record<string, number> = {};
    const hasMaxRoundScoreConf = distances.some(d => d.isMaxRoundScore);

    if (selectedRoundTab === "all" && hasMaxRoundScoreConf) {
      // Sum each athlete's individual maximum score
      const teamsList = Array.from(new Set(activeAthletes.map((a) => {
        const raw = a.team.trim();
        return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
      }))) as string[];

      teamsList.forEach((teamName) => {
        const members = activeAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName && a.isPrimaryTeam && a.status !== "Bỏ thi";
        });

        let teamScoreSum = 0;
        let teamSoloSum = 0;

        members.forEach((athlete) => {
          let maxScore = -1;
          let maxSoloHits = 0;

          distances.forEach((distance, rIdx) => {
            const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
            if (isQualified) {
              const hits = athlete.scores[distance.id] || [];
              const hitCount = getLeaderboardHitCount(hits);
              const score = hitCount * distance.multiplier;
              const soloVal = athlete.soloHits?.[distance.id];
              const soloHitsAmt = (soloVal === null || soloVal === undefined) ? 0 : soloVal;

              if (score > maxScore) {
                maxScore = score;
                maxSoloHits = soloHitsAmt;
              }
            }
          });

          teamScoreSum += maxScore >= 0 ? maxScore : 0;
          teamSoloSum += maxSoloHits;
        });

        scores[teamName] = teamScoreSum + (teamSoloSum * 0.001);
      });
    } else {
      activeAthletes.forEach((athlete) => {
        // In team mode, only primary team members contribute to team score
        if (!athlete.isPrimaryTeam) return;

        const rawTeam = athlete.team.trim();
        const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

        let personalScore = 0;
        let personalSolo = 0;
        if (selectedRoundTab === "all") {
          distances.forEach((distance, rIdx) => {
            const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
            if (isQualified) {
              const hits = athlete.scores[distance.id] || [];
              const hitCount = getLeaderboardHitCount(hits);
              personalScore += hitCount * distance.multiplier;

              const soloVal = athlete.soloHits?.[distance.id];
              const soloHitsNum = (soloVal === null || soloVal === undefined) ? 0 : soloVal;
              personalSolo += soloHitsNum;
            }
          });
        } else {
          const isQualified = selectedRoundTab === 0 || (teamRoundResults[selectedRoundTab]?.qualifiedTeams.includes(teamName));
          if (isQualified) {
            const roundRes = roundResults[selectedRoundTab];
            if (roundRes) {
              const stats = roundRes.scores[athlete.id];
              personalScore = stats ? stats.displayScore : 0;
            }
            const currentRoundDist = distances[selectedRoundTab];
            const soloVal = currentRoundDist ? athlete.soloHits?.[currentRoundDist.id] : undefined;
            const soloHitsNum = (soloVal === null || soloVal === undefined) ? 0 : soloVal;
            personalSolo += soloHitsNum;
          }
        }

        scores[teamName] = (scores[teamName] || 0) + personalScore + (personalSolo * 0.001);
      });
    }

    return scores;
  }, [activeAthletes, distances, selectedRoundTab, roundResults, teamRoundResults, competitionMode]);

  // Compute calculated statistics for all athletes based on active round/view selection
  const rankedAthletes = useMemo(() => {
    const hasMaxRoundScoreConf = distances.some(d => d.isMaxRoundScore);
    // Process common properties for all athletes including survival metrics
    const athletesWithSurvival = activeAthletes.map((athlete) => {
      // Find which round they were eliminated in (if any) or if they have a pending solo/resolo
      let eliminatedInRoundIdx: number | null = null;
      let isSoloPendingGlobal = false;
      let isResoloPendingGlobal = false;

      if (competitionMode === "team") {
        const raw = athlete.team.trim();
        const teamName = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
        for (let i = 0; i < teamRoundResults.length; i++) {
          if (teamRoundResults[i].eliminatedTeams.includes(teamName)) {
            eliminatedInRoundIdx = i;
            break;
          }
        }

        for (let i = 0; i < teamRoundResults.length; i++) {
          if (teamRoundResults[i].pendingSoloTeams?.includes(teamName)) {
            isSoloPendingGlobal = true;
            break;
          }
          if (teamRoundResults[i].pendingResoloTeams?.includes(teamName)) {
            isResoloPendingGlobal = true;
            break;
          }
        }
      } else {
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
            const isQualifiedForRound = competitionMode === "team"
              ? (i === 0 || teamRoundResults[i]?.qualifiedTeams.includes(athlete.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : athlete.team.trim()))
              : (i === 0 || roundResults[i]?.qualifiedIds.includes(athlete.id));

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

      let isUnshot = false;
      for (let r = 0; r < distances.length; r++) {
        const isQualifiedForRound = competitionMode === "team"
          ? (r === 0 || teamRoundResults[r]?.qualifiedTeams.includes(athlete.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : athlete.team.trim()))
          : (r === 0 || roundResults[r]?.qualifiedIds.includes(athlete.id));
        if (isQualifiedForRound) {
          const rDist = distances[r];
          const rScores = rDist ? athlete.scores[rDist.id] : undefined;
          const isUnshotInThisRound = !rScores || rScores.length === 0 || rScores.every((val: any) => val === null);
          if (isUnshotInThisRound) {
            isUnshot = true;
            break;
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
        isUnshot,
      };
    });

    if (selectedRoundTab === "all") {
      // Standard multi-round calculation
      return athletesWithSurvival.map(({ athlete, eliminatedInRoundIdx, isSoloPendingGlobal, isResoloPendingGlobal, survivalVal, survivalScore, survivalScoreWithSolo, survivalHits, survivalAccuracy, survivalSoloHits }) => {
        let totalScore = 0;
        let totalHits = 0;
        
        const breakdown = distances.map((distance, rIdx) => {
          const isQualified = rIdx === 0 || (
            competitionMode === "team"
              ? teamRoundResults[rIdx]?.qualifiedTeams.includes(athlete.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : athlete.team.trim())
              : roundResults[rIdx]?.qualifiedIds.includes(athlete.id)
          );
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

        let finalPossibleShots = totalPossibleShots;

        // An athlete is unshot overall if they have not shot any arrow/scores in any of the distances
        const isUnshotOverall = distances.every((dist) => {
          const rScores = athlete.scores[dist.id];
          return !rScores || rScores.length === 0 || rScores.every((val: any) => val === null);
        });

        return {
          ...athlete,
          totalScore: totalScoreValue,
          totalScoreWithSolo: totalScoreValue, // No solo shootout in cumulative summary
          totalHits: totalHitsValue,
          totalPossibleShots: finalPossibleShots,
          accuracy: accuracyValue,
          breakdown,
          isQualifiedNow: eliminatedInRoundIdx === null,
          eliminatedInRoundIdx,
          wasEliminatedEarlier: false,
          isEliminatedThisRound: false,
          isSoloPending: isSoloPendingGlobal,
          isResoloPending: isResoloPendingGlobal,
          isUnshot: isUnshotOverall,
          survivalVal,
          survivalScore,
          survivalScoreWithSolo,
          survivalHits,
          survivalAccuracy,
          survivalSoloHits,
        };
      });
    } else {
      // Single Round leaderboard!
      const roundRes = roundResults[selectedRoundTab];
      const teamRes = teamRoundResults[selectedRoundTab];
      const roundConfig = distances[selectedRoundTab];

      return athletesWithSurvival.map(({ athlete, eliminatedInRoundIdx, isSoloPendingGlobal, isResoloPendingGlobal, survivalVal, survivalScore, survivalScoreWithSolo, survivalHits, survivalAccuracy, survivalSoloHits }) => {
        const teamName = athlete.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : athlete.team.trim();

        const isQualified = competitionMode === "team"
          ? (teamRes ? teamRes.qualifiedTeams.includes(teamName) : true)
          : (roundRes ? roundRes.qualifiedIds.includes(athlete.id) : true);

        const isEliminatedThisRound = competitionMode === "team"
          ? (teamRes ? teamRes.eliminatedTeams.includes(teamName) : false)
          : (roundRes ? roundRes.eliminatedIds.includes(athlete.id) : false);

        const stats = (roundRes && roundRes.scores[athlete.id]) || {
          roundHits: 0,
          roundScore: 0,
          cumulativeHits: 0,
          cumulativeScore: 0,
          displayScore: 0,
          displayHits: 0,
          accuracy: 0,
          displayScoreWithSolo: 0,
        };

        const breakdown = distances.slice(0, selectedRoundTab + 1).map((dist, idx) => {
          const wasQual = competitionMode === "team"
            ? (teamRoundResults[idx]?.qualifiedTeams.includes(teamName))
            : (roundResults[idx]?.qualifiedIds.includes(athlete.id));

          const hits = wasQual ? (athlete.scores[dist.id] || []) : [];
          const hitCount = getLeaderboardHitCount(hits);
          const score = hitCount * dist.multiplier;
          return {
            distanceName: dist.distance,
            distanceId: dist.id,
            multiplier: dist.multiplier,
            hitCount,
            maxHits: isPointModeActive && effectiveDirectMaxPoints !== undefined ? effectiveDirectMaxPoints : effectiveShotsCount,
            score,
            isQualified: wasQual,
          };
        });

        const totalScoreWithSolo = stats.displayScoreWithSolo !== undefined ? stats.displayScoreWithSolo : stats.displayScore;

        const isSoloPending = competitionMode === "team"
          ? (teamRes?.pendingSoloTeams?.includes(teamName) || false)
          : (roundRes?.pendingSoloIds?.includes(athlete.id) || false);

        const isResoloPending = competitionMode === "team"
          ? (teamRes?.pendingResoloTeams?.includes(teamName) || false)
          : (roundRes?.pendingResoloIds?.includes(athlete.id) || false);

        // Check if unshot specifically in this active round
        const currentRoundDist = typeof selectedRoundTab === "number" ? distances[selectedRoundTab] : undefined;
        const rScores = currentRoundDist ? athlete.scores[currentRoundDist.id] : undefined;
        const isUnshotInThisRound = !rScores || rScores.length === 0 || rScores.every((val: any) => val === null);

        let calculatedPossShots = 0;
        if (isPointModeActive && effectiveDirectMaxPoints !== undefined && roundConfig) {
          if (roundConfig.isCumulative) {
            let totalMultiplier = 0;
            for (let i = 0; i <= (selectedRoundTab as number); i++) {
              const distI = distances[i];
              const wasShot = athlete.scores[distI.id] && athlete.scores[distI.id].length > 0 && athlete.scores[distI.id].some(v => v !== null && v !== undefined);
              if (wasShot) {
                totalMultiplier += distI.multiplier;
              }
            }
            if (totalMultiplier === 0) {
              totalMultiplier = roundConfig.multiplier;
            }
            calculatedPossShots = effectiveDirectMaxPoints * totalMultiplier;
          } else {
            calculatedPossShots = effectiveDirectMaxPoints * roundConfig.multiplier;
          }
        } else {
          if (roundConfig?.isCumulative) {
            let shotRoundsCount = 0;
            for (let i = 0; i <= (selectedRoundTab as number); i++) {
              const distI = distances[i];
              const wasShot = athlete.scores[distI.id] && athlete.scores[distI.id].length > 0 && athlete.scores[distI.id].some(v => v !== null && v !== undefined);
              if (wasShot) {
                shotRoundsCount++;
              }
            }
            if (shotRoundsCount === 0) {
              shotRoundsCount = 1;
            }
            calculatedPossShots = shotRoundsCount * effectiveShotsCount;
          } else {
            calculatedPossShots = effectiveShotsCount;
          }
        }

        return {
          ...athlete,
          totalScore: stats.displayScore, // Either cumulative or raw depending on isCumulative (displayed officially)
          totalScoreWithSolo, // Hidden sorting score with solo hits included
          totalHits: stats.displayHits,
          totalPossibleShots: calculatedPossShots,
          accuracy: stats.accuracy,
          breakdown,
          isQualifiedNow: isQualified && !isEliminatedThisRound,
          isEliminatedThisRound,
          wasEliminatedEarlier: !isQualified,
          eliminatedInRoundIdx,
          isSoloPending,
          isResoloPending,
          isUnshot: isUnshotInThisRound,
          survivalVal,
          survivalScore,
          survivalScoreWithSolo,
          survivalHits,
          survivalAccuracy,
          survivalSoloHits,
        };
      });
    }
  }, [activeAthletes, distances, shotsCount, selectedRoundTab, roundResults, teamRoundResults, competitionMode]);

  // Sort athletes based on totalScoreWithSolo and tie-breakers (accuracy)
  const sortedAthletes = useMemo(() => {
    // We sort rankedAthletes by score descending initially to establish absolute standard rank
    const baseRanked = [...rankedAthletes].sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";
      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;

      if (competitionMode === "team") {
        const teamNameA = a.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : a.team.trim();
        const teamNameB = b.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : b.team.trim();
        const scoreA = activeTeamScores[teamNameA] || 0;
        const scoreB = activeTeamScores[teamNameB] || 0;

        // 1. Compare team survival / active status
        if (selectedRoundTab === "all") {
          if (b.survivalVal !== a.survivalVal) {
            return b.survivalVal - a.survivalVal;
          }
        } else {
          // If in a specific round, check who was eliminated earlier
          if (a.wasEliminatedEarlier && !b.wasEliminatedEarlier) return 1;
          if (!a.wasEliminatedEarlier && b.wasEliminatedEarlier) return -1;

          if (a.wasEliminatedEarlier) {
            if (b.survivalVal !== a.survivalVal) {
              return b.survivalVal - a.survivalVal;
            }
          }
        }

        // 2. Compare team scores
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        // Group teams with equal scores/survival together: compare their team names alphabetically
        const teamNameComp = teamNameA.localeCompare(teamNameB, "vi");
        if (teamNameComp !== 0) {
          return teamNameComp;
        }

        // Tie-breakers: Within same team, sort by individual total score
        if (b.totalScoreWithSolo !== a.totalScoreWithSolo) {
          return b.totalScoreWithSolo - a.totalScoreWithSolo;
        }
        return b.accuracy - a.accuracy;
      }

      if (selectedRoundTab === "all") {
        // 1. Who survived more rounds (further round reached)
        if (b.survivalVal !== a.survivalVal) {
          return b.survivalVal - a.survivalVal;
        }
        // 2. Score in their last active round including solo shootout hits
        if (b.survivalScoreWithSolo !== a.survivalScoreWithSolo) {
          return b.survivalScoreWithSolo - a.survivalScoreWithSolo;
        }
        // 3. Score without solo in their last active round
        if (b.survivalScore !== a.survivalScore) {
          return b.survivalScore - a.survivalScore;
        }
        // 4. Shootout soloHits in their last active round
        if (b.survivalSoloHits !== a.survivalSoloHits) {
          return b.survivalSoloHits - a.survivalSoloHits;
        }
        // 5. Accuracy in their last active round
        if (b.survivalAccuracy !== a.survivalAccuracy) {
          return b.survivalAccuracy - a.survivalAccuracy;
        }
        return a.name.localeCompare(b.name, "vi");
      } else {
        // Put earlier-eliminated at the bottom
        if (a.wasEliminatedEarlier && !b.wasEliminatedEarlier) return 1;
        if (!a.wasEliminatedEarlier && b.wasEliminatedEarlier) return -1;

        if (a.wasEliminatedEarlier) {
          // Both are earlier-eliminated cohort: sort by survival properties
          if (a.survivalVal !== b.survivalVal) {
            return b.survivalVal - a.survivalVal;
          }
          if (b.survivalScore !== a.survivalScore) {
            return b.survivalScore - a.survivalScore;
          }
          if (b.survivalSoloHits !== a.survivalSoloHits) {
            return b.survivalSoloHits - a.survivalSoloHits;
          }
          return b.survivalAccuracy - a.survivalAccuracy;
        }

        // Sort by hidden score which includes solo shootout if active
        if (b.totalScoreWithSolo !== a.totalScoreWithSolo) {
          return b.totalScoreWithSolo - a.totalScoreWithSolo;
        }

        return b.accuracy - a.accuracy; // tie-breaker is accuracy
      }
    });

    // Compute team ranks for all unique teams in Team Mode
    const teamStats: Record<string, { survivalVal: number; score: number }> = {};
    if (competitionMode === "team") {
      rankedAthletes.forEach((ath) => {
        const rawTeam = ath.team.trim();
        const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;
        if (!teamStats[teamName]) {
          teamStats[teamName] = {
            survivalVal: ath.survivalVal,
            score: activeTeamScores[teamName] || 0,
          };
        }
      });
    }

    const teamNames = Object.keys(teamStats);
    const teamRanks: Record<string, number> = {};
    if (competitionMode === "team") {
      teamNames.forEach((tName) => {
        const tStats = teamStats[tName];
        let betterTeamsCount = 0;
        
        teamNames.forEach((otherName) => {
          if (otherName === tName) return;
          const otherStats = teamStats[otherName];
          
          let isOtherBetter = false;
          if (selectedRoundTab === "all") {
            if (otherStats.survivalVal !== tStats.survivalVal) {
              isOtherBetter = otherStats.survivalVal > tStats.survivalVal;
            } else {
              isOtherBetter = otherStats.score > tStats.score;
            }
          } else {
            const roundIdx = typeof selectedRoundTab === "number" ? selectedRoundTab : 0;
            const selfActive = tStats.survivalVal >= roundIdx;
            const otherActive = otherStats.survivalVal >= roundIdx;
            
            if (otherActive && !selfActive) {
              isOtherBetter = true;
            } else if (!otherActive && selfActive) {
              isOtherBetter = false;
            } else if (!otherActive && !selfActive) {
              if (otherStats.survivalVal !== tStats.survivalVal) {
                isOtherBetter = otherStats.survivalVal > tStats.survivalVal;
              } else {
                isOtherBetter = otherStats.score > tStats.score;
              }
            } else {
              isOtherBetter = otherStats.score > tStats.score;
            }
          }
          
          if (isOtherBetter) {
            betterTeamsCount++;
          }
        });
        
        teamRanks[tName] = betterTeamsCount + 1;
      });
    }

    // Assign rank ranks with joint ranking support
    const withRank = baseRanked.map((athlete, idx) => {
      let betterCount = 0;
      if (athlete.status === "Bỏ thi") {
        return { ...athlete, baseRank: 999 };
      }

      if (competitionMode === "team") {
        const rawTeam = athlete.team.trim();
        const teamNameSelf = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;
        const rankValue = teamRanks[teamNameSelf] || 1;
        return { ...athlete, baseRank: rankValue };
      }

      for (let j = 0; j < idx; j++) {
        const other = baseRanked[j];
        if (other.status === "Bỏ thi") continue;

        if (selectedRoundTab === "all") {
          // Compare exactly by the same sort criteria to assign tie/joint ranks
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
        } else {
          if (other.wasEliminatedEarlier !== athlete.wasEliminatedEarlier) {
            if (!athlete.wasEliminatedEarlier && other.wasEliminatedEarlier) continue;
            if (athlete.wasEliminatedEarlier && !other.wasEliminatedEarlier) {
              if (other.status !== "Bỏ thi") {
                betterCount++;
              }
              continue;
            }
          }

          // Both are active, or both are eliminated
          if (other.status === "Bỏ thi") continue;

          if (!athlete.wasEliminatedEarlier) {
            if (other.totalScoreWithSolo > athlete.totalScoreWithSolo) {
              betterCount++;
            } else if (other.totalScoreWithSolo === athlete.totalScoreWithSolo) {
              // fallback to accuracy
              if (other.accuracy > athlete.accuracy) {
                betterCount++;
              }
            }
          } else {
            // Both earlier-eliminated: sort by survival properties
            if (other.survivalVal !== athlete.survivalVal) {
              if (other.survivalVal > athlete.survivalVal) betterCount++;
            } else if (other.survivalScore !== athlete.survivalScore) {
              if (other.survivalScore > athlete.survivalScore) betterCount++;
            } else if (other.survivalSoloHits !== athlete.survivalSoloHits) {
              if (other.survivalSoloHits > athlete.survivalSoloHits) betterCount++;
            } else if (other.survivalAccuracy !== athlete.survivalAccuracy) {
              if (other.survivalAccuracy > athlete.survivalAccuracy) betterCount++;
            }
          }
        }
      }
      return { ...athlete, baseRank: betterCount + 1 };
    });

    // Apply filters (search, team, top X)
    const filtered = withRank.filter((ath) => {
      // Starting from Round 2 onwards (selectedRoundTab >= 1), hide athletes who were eliminated earlier or dropped out
      if (selectedRoundTab !== "all" && typeof selectedRoundTab === "number" && selectedRoundTab >= 1) {
        if (ath.status === "Bỏ thi") {
          return false;
        }

        const isLastRound = selectedRoundTab === distances.length - 1;
        const activeCount = withRank.filter(a => !a.wasEliminatedEarlier && a.status !== "Bỏ thi").length;

        if (isLastRound && activeCount < 3) {
          if (!ath.wasEliminatedEarlier) {
            // Keep active
          } else {
            const earlierEliminated = withRank.filter(a => a.wasEliminatedEarlier && a.status !== "Bỏ thi");
            const toInclude = earlierEliminated.slice(0, 3 - activeCount);
            
            const isToInclude = toInclude.some(p => p.id === ath.id);
            if (!isToInclude) {
              return false;
            }
          }
        } else {
          if (ath.wasEliminatedEarlier) {
            return false;
          }
        }
      }

      const matchSearch = 
        ath.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ath.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ath.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTeam = selectedTeam === "all" || ath.team.trim() === selectedTeam.trim();
      const matchTopLimit = !showTopXOnly || ath.baseRank <= topXLimit;
      return matchSearch && matchTeam && matchTopLimit;
    });

    // Apply custom sort order if sorting is clicked
    return filtered.sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";

      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;
      if (isABỏThi && isBBỏThi) {
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      }

      if (competitionMode === "team") {
        const teamNameA = a.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : a.team.trim();
        const teamNameB = b.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : b.team.trim();

        // 1. Group by team: compare the teams first to keep players of the same team contiguous
        let teamComparison = 0;
        if (sortField === "team") {
          teamComparison = teamNameA.localeCompare(teamNameB, "vi");
        } else {
          const rankA = teamRanks[teamNameA] || 999;
          const rankB = teamRanks[teamNameB] || 999;
          if (rankA !== rankB) {
            teamComparison = rankA - rankB;
          } else {
            // Equal team ranks: group teams together by name alphabetically to prevent interleaving
            teamComparison = teamNameA.localeCompare(teamNameB, "vi");
          }
        }

        // Apply sortAsc for team-level sorting (so clicking ascending/descending works on team headers)
        if (sortField === "team" || sortField === "teamScore" || sortField === "rank") {
          if (sortAsc) {
            teamComparison = -teamComparison;
          }
        }

        if (teamComparison !== 0) {
          return teamComparison;
        }

        // 2. Same team: sort individual athletes within the team block
        let indComparison = 0;
        if (sortField === "name") {
          indComparison = a.name.localeCompare(b.name);
        } else if (sortField === "accuracy") {
          indComparison = b.accuracy - a.accuracy;
        } else {
          // Default: inside same team, sort by individual score
          indComparison = b.totalScoreWithSolo - a.totalScoreWithSolo;
        }

        if (sortField === "name" || sortField === "accuracy") {
          if (sortAsc) {
            indComparison = -indComparison;
          }
        }

        return indComparison;
      }

      let comparison = 0;
      if (sortField === "rank") {
        comparison = a.baseRank - b.baseRank;
      } else if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "team") {
        comparison = a.team.localeCompare(b.team);
      } else if (sortField === "teamScore") {
        const teamNameA = a.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : a.team.trim();
        const teamNameB = b.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : b.team.trim();
        const scoreA = activeTeamScores[teamNameA] || 0;
        const scoreB = activeTeamScores[teamNameB] || 0;
        comparison = scoreB - scoreA;
      } else if (sortField === "accuracy") {
        comparison = b.accuracy - a.accuracy;
      }

      return sortAsc ? -comparison : comparison;
    });
  }, [rankedAthletes, searchTerm, selectedTeam, showTopXOnly, topXLimit, sortField, sortAsc, competitionMode, activeTeamScores]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for metrics
    }
  };

  const getOnlyRankBadge = (rank: number, hasScore: boolean, athlete: any) => {
    if (athlete.status === "Bỏ thi") {
      return (
        <span className="font-mono text-xs text-gray-400 font-extrabold">-</span>
      );
    }
    if (!hasScore) {
      return (
        <span className="font-mono text-sm font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          #{rank}
        </span>
      );
    }
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center gap-1 bg-amber-500 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-full shadow-sm shadow-amber-300">
            <Trophy className="w-3.5 h-3.5 shrink-0" /> Vàng
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center gap-1 bg-slate-300 text-slate-800 font-mono font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
            <Medal className="w-3.5 h-3.5 text-slate-700 shrink-0" /> Bạc
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center gap-1 bg-amber-100 text-amber-900 font-mono font-bold text-xs px-2.5 py-1 rounded-full shadow-sm border border-amber-200">
            <Award className="w-3.5 h-3.5 text-amber-800 shrink-0" /> Đồng
          </div>
        );
      default:
        return (
          <span className="font-mono text-sm font-bold text-gray-550 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            #{rank}
          </span>
        );
    }
  };

  const getStatusBadge = (athlete: any) => {
    if (athlete.status === "Bỏ thi") {
      return (
        <span className="font-mono text-[10px] font-extrabold text-rose-605 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded border border-rose-200 uppercase whitespace-nowrap">
          Bỏ thi
        </span>
      );
    }
    if (athlete.isSoloPending) {
      return (
        <span className="font-mono text-[9px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-200 uppercase whitespace-nowrap animate-pulse">
          SOLO
        </span>
      );
    }
    if (athlete.isResoloPending) {
      return (
        <span className="font-mono text-[9px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-955/25 px-1.5 py-0.5 rounded border border-amber-200 uppercase whitespace-nowrap animate-pulse">
          SOLO LẠI
        </span>
      );
    }
    if (selectedRoundTab === "all") {
      if (athlete.eliminatedInRoundIdx !== null && athlete.eliminatedInRoundIdx !== undefined) {
        return (
          <span className="font-mono text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 px-1.5 py-0.5 rounded whitespace-nowrap uppercase" title={`Bị loại lúc kết thúc Vòng ${athlete.eliminatedInRoundIdx + 1}`}>
            Loại V.{athlete.eliminatedInRoundIdx + 1}
          </span>
        );
      }
      if (athlete.isUnshot) {
        return (
          <span className="font-mono text-[9px] font-extrabold text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 uppercase whitespace-nowrap">
            Chưa bắn
          </span>
        );
      }
    } else {
      if (athlete.wasEliminatedEarlier) {
        return (
          <span className="font-mono text-[9px] font-extrabold text-red-500 bg-red-50 dark:bg-red-950/25 px-1.5 py-0.5 rounded border border-red-200 uppercase whitespace-nowrap">
            Đã bị loại
          </span>
        );
      }
      if (athlete.isUnshot) {
        return (
          <span className="font-mono text-[9px] font-extrabold text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 uppercase whitespace-nowrap">
            Chưa bắn
          </span>
        );
      }
      if (athlete.isEliminatedThisRound) {
        return (
          <span className="font-mono text-[9px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-955/25 px-1.5 py-0.5 rounded border border-amber-200 uppercase whitespace-nowrap">
            Bị loại V. này
          </span>
        );
      }
    }

    let isCompletedInRound = false;
    if (selectedRoundTab !== "all") {
      const currentRoundDist = distances[selectedRoundTab];
      const rScores = currentRoundDist ? athlete.scores[currentRoundDist.id] : undefined;
      isCompletedInRound = !!rScores && rScores.length === shotsCount && rScores.every((val: any) => val !== null && val !== undefined);
    } else {
      let activeRoundIdx = 0;
      for (let r = 0; r < distances.length; r++) {
        const dist = distances[r];
        const hasScores = activeAthletes.some((a) => {
          const s = a.scores[dist.id];
          return s && s.some((v: any) => v !== null && v !== undefined);
        });
        if (hasScores) {
          activeRoundIdx = r;
        }
      }
      const activeRoundDist = distances[activeRoundIdx];
      const rScores = activeRoundDist ? athlete.scores[activeRoundDist.id] : undefined;
      isCompletedInRound = !!rScores && rScores.length === shotsCount && rScores.every((val: any) => val !== null && val !== undefined);
    }

    if (isCompletedInRound) {
      return (
        <span className="font-mono text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded border border-blue-200 uppercase whitespace-nowrap">
          Đã bắn
        </span>
      );
    }

    return (
      <span className="font-mono text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap">
        Đang đấu
      </span>
    );
  };

  const isSingleShot = shotsCount === 1;
  const columnWidthClass = isSingleShot ? "min-w-[240px] w-[240px]" : "min-w-[420px] w-[420px]";
  const leftSectionWidthClass = isSingleShot ? "w-[110px]" : "w-[120px]";
  const middleSectionWidthClass = isSingleShot ? "w-[40px]" : "w-[198px]";
  const rightSectionWidthClass = isSingleShot ? "w-[60px]" : "w-[80px]";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
      {/* V3 Architectural Multi-Dimensional Ranking Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <button
          onClick={() => setRankingSubTab("live")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "live"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
              : "bg-gray-50 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          Giải đấu (Live)
        </button>
        <button
          onClick={() => setRankingSubTab("laotuong")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "laotuong"
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-100 dark:shadow-none"
              : "bg-gray-55 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <Award className="w-4 h-4 text-yellow-500" />
          Xếp hạng Lão tướng
        </button>
        <button
          onClick={() => setRankingSubTab("treem")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "treem"
              ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-100 dark:shadow-none"
              : "bg-gray-55 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <Award className="w-4 h-4 text-pink-400" />
          Xếp hạng Trẻ em
        </button>
        <button
          onClick={() => setRankingSubTab("club")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "club"
              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-100 dark:shadow-none"
              : "bg-gray-55 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <Building className="w-4 h-4 text-emerald-400" />
          Xếp hạng Câu lạc bộ
        </button>
        <button
          onClick={() => setRankingSubTab("province")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "province"
              ? "bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-md shadow-rose-100 dark:shadow-none"
              : "bg-gray-55 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <Flag className="w-4 h-4 text-rose-500" />
          Xếp hạng Tỉnh thành
        </button>
        <button
          onClick={() => setRankingSubTab("stats")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingSubTab === "stats"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-100 dark:shadow-none"
              : "bg-gray-55 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Chỉ số & Kỷ lục VĐV
        </button>
      </div>

      {(rankingSubTab === "live" || rankingSubTab === "laotuong" || rankingSubTab === "treem") && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5.5 h-5.5 text-amber-500" />
            {rankingSubTab === "laotuong"
              ? "Bảng Xếp Hạng Lão Tướng"
              : rankingSubTab === "treem"
                ? "Bảng Xếp Hạng Trẻ Em"
                : "Bảng Xếp Hạng Thực Tế (Live Leaderboard)"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Xếp hạng dựa trên {selectedRoundTab === "all" ? "Tổng Điểm giải đấu" : "Điểm Vòng đấu"}, ưu tiên tỉ lệ trúng mục tiêu làm chỉ số phụ.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Checkbox Top X */}
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm font-bold text-amber-800 transition-colors">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTopXOnly}
                onChange={(e) => setShowTopXOnly(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>Chỉ hiện TOP</span>
            </label>
            <input
              type="number"
              min={1}
              value={topXLimit}
              disabled={!showTopXOnly}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setTopXLimit(isNaN(val) ? 10 : Math.max(1, val));
              }}
              className="w-12 text-center h-7 text-xs bg-white disabled:bg-amber-100/50 disabled:text-amber-600 border border-amber-300 rounded font-black focus:outline-none focus:ring-1 focus:ring-amber-500 text-amber-900"
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm VĐV, Câu lạc bộ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full sm:w-[220px] text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 flex-1 sm:flex-initial">
            <Building className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm focus:outline-none text-gray-700 min-w-[120px]"
            >
              <option value="all">Tất cả Câu Lạc Bộ</option>
              {uniqueTeams.map((team, index) => (
                <option key={index} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Round/Vòng đấu Tabs Selector */}
      <div className="flex items-center gap-1.5 border-b border-gray-150 dark:border-slate-800 pb-2.5 mb-5 overflow-x-auto select-none">
        <button
          onClick={() => setSelectedRoundTab("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedRoundTab === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          🏆 Tổng hợp giải đấu
        </button>
        {distances.map((dist, idx) => (
          <button
            key={dist.id}
            onClick={() => setSelectedRoundTab(idx)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedRoundTab === idx
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            🎯 Vòng {idx + 1} ({dist.distance})
            {activeDistanceIndex === idx && (
              <span className="bg-rose-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full animate-pulse shadow-xs">
                🔴 Đang thi đấu
              </span>
            )}
            {dist.isElimination && (
              <span className="bg-amber-400 text-amber-950 font-black text-[8px] px-1 rounded-sm shrink-0">Cut</span>
            )}
          </button>
        ))}
      </div>

      {/* Round Configuration Details */}
      {selectedRoundTab === "all" ? (
        <div className="bg-blue-50/40 dark:bg-slate-900/30 border border-blue-150 rounded-xl p-3 mb-5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-0.5">Thông tin cấu hình: Tổng hợp giải đấu</div>
            <div className="text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              Xếp hạng dựa trên toàn bộ quá trình thi đấu của giải. Tổng điểm tích lũy của vận động viên qua tất cả các vòng đấu, ưu tiên tỉ lệ bắn trúng mục tiêu (%). Trong trường hợp bằng điểm và bằng tỉ lệ trúng, hệ thống sẽ tự động đối chiếu các chỉ số phụ của vòng đấu cuối cùng.
            </div>
          </div>
        </div>
      ) : (
        (() => {
          const dist = distances[selectedRoundTab];
          if (!dist) return null;
          return (
            <div className="bg-indigo-50/40 dark:bg-slate-900/30 border border-indigo-150 rounded-xl p-3 mb-5 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <div className="font-bold mb-1">Cấu hình luật thi đấu: Vòng {selectedRoundTab + 1} ({dist.distance})</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-650 dark:text-slate-300 mt-1.5">
                    <div className="bg-white/60 dark:bg-slate-900/40 px-2.5 py-1.5 rounded border border-indigo-100/60 flex flex-col">
                      <span className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Cự ly bắn</span>
                      <span className="font-extrabold text-sm text-slate-850 dark:text-white">{dist.distance}</span>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/40 px-2.5 py-1.5 rounded border border-indigo-100/60 flex flex-col">
                      <span className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Điểm số mỗi lượt trúng</span>
                      <span className="font-extrabold text-sm text-slate-850 dark:text-white">x{dist.multiplier} điểm</span>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/40 px-2.5 py-1.5 rounded border border-indigo-100/60 flex flex-col">
                      <span className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Cách thức tính điểm</span>
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                        {dist.isCumulative ? "Cộng dồn với các vòng trước" : "Tính độc lập theo vòng này"}
                      </span>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/40 px-2.5 py-1.5 rounded border border-indigo-100/60 flex flex-col">
                      <span className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Quy tắc loại trực tiếp</span>
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                        {dist.isElimination ? (
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                            Giữ lại Top {dist.eliminationType === "percent" ? `${dist.eliminationValue}%` : `${dist.eliminationValue} VĐV`}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Không loại (Tất cả đi tiếp)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {dist.isElimination && (
                    <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-450 font-medium flex items-center gap-1 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1 rounded border border-amber-100/40">
                      ⚠️ <strong>Lưu ý loại trực tiếp:</strong> Vận động viên có thứ hạng thấp hơn ngưỡng loại sau vòng này sẽ dừng bước tại các vòng tiếp theo. {dist.isSolo && "Trong trường hợp bằng điểm tại ranh giới loại, VĐV sẽ phân định bằng Đấu súng Solo."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {sortedAthletes.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          Chưa tìm thấy vận động viên nào thỏa mãn bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 animate-fadeIn">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-semibold select-none">
                <th className="p-3 w-[100px] text-center cursor-pointer hover:bg-gray-200/50" onClick={() => handleSort("rank")}>
                  <div className="flex items-center justify-center gap-1">
                    Thứ hạng <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200/50" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    Vận động viên <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200/50" onClick={() => handleSort("team")}>
                  <div className="flex items-center gap-1">
                    Đội / Đơn vị <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                {competitionMode === "team" && (
                  <th className="p-3 text-center cursor-pointer hover:bg-gray-200/50 bg-indigo-50/50 text-indigo-900 font-bold" onClick={() => handleSort("teamScore")}>
                    <div className="flex items-center justify-center gap-1">
                      Tổng điểm đội <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                )}
                <th className="p-3 text-center font-bold text-blue-800 bg-blue-50/50 w-[120px]">
                  {hasMaxRoundScoreConfGlobal ? "Điểm Cao Nhất" : "Điểm số"}
                </th>
                <th className="p-3 text-center w-[130px]">Trạng thái</th>
                <th className={`p-3 text-center ${columnWidthClass}`}>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {isPointModeActive ? "Chi tiết cự ly (Điểm / Tối đa)" : "Chi tiết cự ly (Trúng / Lượt)"}
                  </div>
                  {!isSingleShot && (
                    <div className="flex items-center gap-2.5 px-1.5 mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider justify-start">
                      {/* Left Spacer - aligned with distance label */}
                      <div className={`${leftSectionWidthClass} text-right pr-2 shrink-0`}>
                        VIÊN:
                      </div>
                      {/* Middle - Shot labels */}
                      <div className={`flex gap-[2px] ${middleSectionWidthClass} shrink-0`}>
                        {Array.from({ length: Math.min(10, effectiveShotsCount) }).map((_, i) => (
                          <div key={i} className="w-[18px] text-center bg-slate-100 dark:bg-slate-800 rounded-sm py-0.5 border border-slate-200 dark:border-slate-700 select-none">
                            V{i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Right Spacer */}
                      <div className={rightSectionWidthClass}></div>
                    </div>
                  )}
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-200/50" onClick={() => handleSort("accuracy")}>
                  <div className="flex items-center justify-center gap-1">
                    {isPointModeActive ? "Hiệu suất điểm" : "Tỉ lệ trúng"} <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
               {sortedAthletes.map((athlete, index) => {
                const rank = athlete.baseRank;
                const teamName = athlete.team ? athlete.team.trim() : "Không Có";
                const teamNameNormalized = teamName === "" ? "VĐV Tự Do (Không Đội)" : teamName;
                const teamScore = activeTeamScores[teamNameNormalized] || 0;

                const hasScore = competitionMode === "team"
                  ? teamScore > 0
                  : (athlete.totalScore > 0 || athlete.wasEliminatedEarlier);

                const isEliminatedCumulatively = selectedRoundTab === "all" && athlete.eliminatedInRoundIdx !== null;
                const isTop1 = rank === 1 && hasScore;
                const isTop2 = rank === 2 && hasScore;
                const isTop3 = rank === 3 && hasScore;
                
                // Row and border styling
                let rowBgClass = "hover:bg-gray-50/80 transition-all dark:hover:bg-slate-850/30";
                let rowBorderClass = "border-b border-gray-100 dark:border-slate-800";
                let rowTopBorderClass = "border-t border-gray-100 dark:border-slate-800";
                let cellPaddingClass = "p-3";
                let nameFontClass = "font-bold text-slate-950 text-sm dark:text-slate-100";
                let scoreBgClass = "p-3 text-center font-mono text-lg font-extrabold text-blue-700 bg-blue-50/20";
                
                const isDimmed = selectedRoundTab !== "all" && (athlete.wasEliminatedEarlier || isEliminatedCumulatively) && !isTop1 && !isTop2 && !isTop3;

                if (isTop1) {
                  rowBgClass = "bg-amber-500/[0.04] transition-all bg-gradient-to-r from-amber-500/[0.015] to-transparent hover:bg-amber-500/[0.07]";
                  rowBorderClass = "border-b border-amber-500/20";
                  rowTopBorderClass = "border-t border-amber-500/20";
                  cellPaddingClass = "p-4.5 sm:py-5 sm:px-4";
                  nameFontClass = "font-black text-amber-950 text-base leading-tight tracking-tight dark:text-amber-200";
                  scoreBgClass = "p-4.5 sm:py-5 sm:px-4 text-center font-mono text-xl font-black text-amber-700 bg-amber-500/10 border-l border-amber-500/10";
                } else if (isTop2) {
                  rowBgClass = "bg-slate-400/[0.04] transition-all bg-gradient-to-r from-slate-400/[0.015] to-transparent hover:bg-slate-400/[0.07]";
                  rowBorderClass = "border-b border-slate-400/20";
                  rowTopBorderClass = "border-t border-slate-400/20";
                  cellPaddingClass = "p-4 sm:py-4.5 sm:px-4";
                  nameFontClass = "font-extrabold text-slate-800 text-[15px] leading-tight dark:text-slate-200";
                  scoreBgClass = "p-4 sm:py-4.5 sm:px-4 text-center font-mono text-lg font-black text-slate-700 bg-slate-400/10 border-l border-slate-400/15";
                } else if (isTop3) {
                  rowBgClass = "bg-amber-700/[0.04] transition-all bg-gradient-to-r from-amber-700/[0.015] to-transparent hover:bg-amber-700/[0.07]";
                  rowBorderClass = "border-b border-amber-600/20";
                  rowTopBorderClass = "border-t border-amber-600/20";
                  cellPaddingClass = "p-3.5 sm:py-3.5 sm:px-4";
                  nameFontClass = "font-bold text-amber-900 text-sm leading-tight dark:text-amber-300";
                  scoreBgClass = "p-3.5 sm:py-3.5 sm:px-4 text-center font-mono text-[17px] font-bold text-amber-800 bg-amber-700/10 border-l border-amber-600/10";
                } else if (isDimmed) {
                  rowBgClass = "bg-gray-50/40 dark:bg-slate-950/20 opacity-60 text-gray-400";
                  rowBorderClass = "border-b border-gray-100 dark:border-slate-800";
                  rowTopBorderClass = "border-t border-gray-100 dark:border-slate-800";
                } else if (selectedRoundTab !== "all" && athlete.isEliminatedThisRound && !athlete.isResoloPending) {
                  rowBgClass = "bg-rose-50/[0.15] dark:bg-rose-950/10 text-gray-500 hover:bg-rose-50/[0.25]";
                  rowBorderClass = "border-b border-rose-100";
                  rowTopBorderClass = "border-t border-rose-100";
                  nameFontClass = "font-semibold text-rose-950 text-sm dark:text-rose-300";
                  scoreBgClass = "p-3 text-center font-mono text-lg font-extrabold text-rose-700 bg-rose-50/10";
                }

                // Determine row span variables for Team Competition Mode
                let isFirstOfTeam = true;
                let teamRowSpan = 1;
                
                if (competitionMode === "team") {
                  if (index > 0 && (sortedAthletes[index - 1].team?.trim() || "Không Có") === teamName) {
                    isFirstOfTeam = false;
                  } else {
                    let tempIndex = index + 1;
                    while (tempIndex < sortedAthletes.length && (sortedAthletes[tempIndex].team?.trim() || "Không Có") === teamName) {
                      teamRowSpan++;
                      tempIndex++;
                    }
                  }
                }

                // If in team mode and NOT the last athlete of their team block, do not draw a bottom border to prevent separating lines inside spanned/merged cells
                let isLastOfTeam = true;
                if (competitionMode === "team") {
                  if (index + 1 < sortedAthletes.length && (sortedAthletes[index + 1].team?.trim() || "Không Có") === teamName) {
                    isLastOfTeam = false;
                  }
                }

                // Split border handling to align with user styling request:
                // If in team mode and NOT the last of their team block, there should be NO bottom borders (border-b-0) on all cells
                // in order to avoid drawing browser-collapsed horizontal lines across spanned cells.
                // This cleanly fuses teammates into a single solid team block.
                // The outer boundaries of the team block are drawn correctly by using rowBorderClass on spanned cells and the last teammate's cells.
                let mergedCellBorderClass = rowBorderClass;
                let individualCellBorderClass = rowBorderClass;

                if (competitionMode === "team") {
                  if (!isLastOfTeam) {
                    mergedCellBorderClass = rowBorderClass;
                    individualCellBorderClass = "border-b-transparent";
                  }
                }

                // Determine styling and font size for "Tổng điểm đội", color-coded by team's rank (isTop1, isTop2, isTop3)
                let teamScoreCellClass = "text-center align-middle font-mono font-black text-lg text-indigo-750 bg-indigo-50/20";
                if (isTop1) {
                  teamScoreCellClass = "text-center align-middle font-mono font-black text-[23px] sm:text-[25px] text-amber-800 dark:text-amber-200 bg-amber-500/[0.12]";
                } else if (isTop2) {
                  teamScoreCellClass = "text-center align-middle font-mono font-black text-[21px] sm:text-[23px] text-slate-800 dark:text-slate-200 bg-slate-400/[0.12]";
                } else if (isTop3) {
                  teamScoreCellClass = "text-center align-middle font-mono font-black text-[20px] sm:text-[22px] text-amber-700 dark:text-amber-300 bg-amber-700/[0.12]";
                }

                return (
                  <tr 
                    key={`${athlete.id || 'ath'}-${index}`} 
                    className={rowBgClass}
                  >
                    {/* Position medal / rank */}
                    {(!competitionMode || competitionMode !== "team" || isFirstOfTeam) && (
                      <td 
                        className={`${cellPaddingClass} text-center align-middle ${mergedCellBorderClass}`}
                        rowSpan={competitionMode === "team" ? teamRowSpan : undefined}
                      >
                        <div className="flex justify-center">
                          {getOnlyRankBadge(athlete.baseRank, hasScore, athlete)}
                        </div>
                      </td>
                    )}

                    {/* Name with Avatar on the Left (Right of third column rank) */}
                    <td className={`${cellPaddingClass} ${individualCellBorderClass}`}>
                      <div className="flex items-center gap-3">
                        <img 
                          src={resolveAthleteAvatar(athlete)} 
                          alt={athlete.name} 
                          className={`rounded-full object-cover border shadow-sm shrink-0 ${
                            isTop1 
                              ? "w-11 h-11 border-amber-300 ring-2 ring-amber-200" 
                              : isTop2 
                                ? "w-10 h-10 border-slate-300 ring-1 ring-slate-200"
                                : isTop3
                                  ? "w-9.5 h-9.5 border-amber-500/30 ring-1 ring-amber-100/50"
                                  : "w-9 h-9 border-slate-200"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={nameFontClass}>{athlete.name}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            VSC: {getCleanVscNumber(athlete.vscNumber, athlete.id)} {athlete.bibNumber && `| BIB: ${getCleanBibNumber(athlete.bibNumber, athlete.id)}`}
                          </div>
                        </div>
                      </div>
                    </td>
  
                    {/* Team */}
                    {(!competitionMode || competitionMode !== "team" || isFirstOfTeam) && (
                      <td 
                        className={`${cellPaddingClass} align-middle ${mergedCellBorderClass}`}
                        rowSpan={competitionMode === "team" ? teamRowSpan : undefined}
                      >
                      {athlete.team ? (
                        <span className={`text-[13px] sm:text-xs md:text-sm font-bold px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 w-fit select-none shadow-sm/5 transition-all ${
                          isTop1 
                            ? "bg-amber-500/[0.08] text-amber-900 border-amber-500/25 dark:text-amber-200"
                            : isTop2
                              ? "bg-slate-400/[0.08] text-slate-800 border-slate-400/25 dark:text-slate-200"
                              : isTop3
                                ? "bg-amber-700/[0.08] text-amber-800 border-amber-600/25 dark:text-amber-300"
                                : "bg-blue-50/80 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40"
                        }`}>
                          {getClubLogo(athlete.team) && (
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-250 bg-white shrink-0 relative flex items-center justify-center">
                              <img 
                                src={getClubLogo(athlete.team)!} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <span>{athlete.team}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Không có</span>
                      )}
                      </td>
                    )}

                    {competitionMode === "team" && isFirstOfTeam && (
                      <td 
                        className={`${cellPaddingClass} ${teamScoreCellClass} ${mergedCellBorderClass}`}
                        rowSpan={teamRowSpan}
                      >
                        {(() => {
                          const tName = athlete.team.trim() === "" ? "VĐV Tự Do (Không Đội)" : athlete.team.trim();
                          const val = activeTeamScores[tName] || 0;
                          return (
                            <span className="flex items-center justify-center gap-1">
                              <span>{Math.floor(val)}</span>
                              <span className="text-xs font-semibold opacity-70">đ</span>
                            </span>
                          );
                        })()}
                      </td>
                    )}

                    {/* Big Total score */}
                    <td className={`${scoreBgClass} ${individualCellBorderClass}`}>
                      {athlete.wasEliminatedEarlier ? "-" : athlete.totalScore}
                    </td>

                    {/* Status Badge */}
                    <td className={`${cellPaddingClass} text-center ${individualCellBorderClass}`}>
                      <div className="flex justify-center">
                        {getStatusBadge(athlete)}
                      </div>
                    </td>
  
                    {/* Detailed points per distance */}
                    <td className={`${cellPaddingClass} ${individualCellBorderClass} ${columnWidthClass}`}>
                      <div className="flex flex-col gap-1.5 w-full">
                        {(() => {
                          const shotQualifiedRows = athlete.breakdown.filter((row) => {
                            if (!row.isQualified) return false;
                            const rScores = ensureArray(athlete.scores[row.distanceId]);
                            const wasNormalShot = rScores.length > 0 && rScores.some((val: any) => val !== null && val !== undefined);
                            const wasSoloShot = (() => {
                              const sRounds = ensureArray(athlete.soloRounds?.[row.distanceId]);
                              if (sRounds.length > 0 && sRounds.some((v: any) => v !== null && v !== undefined)) return true;
                              const sHit = athlete.soloHits?.[row.distanceId];
                              return sHit !== undefined && sHit !== null;
                            })();
                            return (wasNormalShot || wasSoloShot);
                          });

                          const firstUnqualifiedRow = athlete.breakdown.find(row => !row.isQualified);
                          const shownBreakdown = [...shotQualifiedRows];
                          if (firstUnqualifiedRow) {
                            shownBreakdown.push(firstUnqualifiedRow);
                          }

                          if (shownBreakdown.length === 0) {
                            return (
                              <span className="text-gray-400 dark:text-slate-500 italic text-xs py-0.5 select-none font-medium text-center block">
                                chưa có dữ liệu
                              </span>
                            );
                          }

                          return shownBreakdown.map((row, index) => {
                            const distConfig = distances.find(d => d.id === row.distanceId) || distances.find(d => d.distance === row.distanceName);
                            const rIdx = distConfig ? distances.findIndex(d => d.id === distConfig.id) : -1;
                            const vPrefix = rIdx !== -1 ? `V${rIdx + 1}` : "";
                            const soloVal = distConfig && athlete.soloHits?.[distConfig.id];
                            const rScores = ensureArray(athlete.scores[row.distanceId]);
                            const maxShotsForDist = effectiveShotsCount;

                            return (
                              <div 
                                key={row.distanceId || row.distanceName || index}
                                className={`flex items-center justify-start gap-2.5 text-xs p-1.5 rounded font-mono border ${
                                  !row.isQualified 
                                    ? "bg-red-50/50 text-red-500 border-red-200/50 opacity-70 line-through"
                                    : isTop1
                                      ? "bg-amber-500/[0.02] border-amber-300/30 text-slate-850"
                                      : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/40 text-slate-800"
                                }`}
                                title={!row.isQualified ? "Bị loại, không có quyền tham gia cự ly này" : `Hệ số: x${row.multiplier}`}
                              >
                                {/* Left Section - Distance Name & Brief summary */}
                                <div className={`flex items-center justify-between ${leftSectionWidthClass} shrink-0 pr-1`}>
                                  <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[11px] truncate">
                                    {vPrefix} ({row.distanceName}):
                                  </span>
                                  {!row.isQualified ? (
                                    <span className="text-[9px] font-bold uppercase text-red-500 bg-red-100/80 px-1 rounded">Out</span>
                                  ) : (
                                    <span className="font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-1 rounded text-[10px] shrink-0">
                                      {row.hitCount}/{row.maxHits}{isPointModeActive ? "đ" : "v"}
                                    </span>
                                  )}
                                </div>

                                {/* Middle Section - Detailed individual shots checkmarks / values */}
                                {row.isQualified && (
                                  isSingleShot ? (
                                    <div className={`flex items-center justify-center ${middleSectionWidthClass}`}>
                                      {(() => {
                                        const scoreVal = getLeaderboardHitCount(rScores);
                                        return (
                                          <div 
                                            className="w-[26px] h-[26px] rounded-sm flex items-center justify-center text-[11px] font-black border bg-emerald-500 border-emerald-600 text-white select-none shadow-sm"
                                            title="Điểm số đạt được"
                                          >
                                            {scoreVal}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <div className={`flex flex-wrap gap-[2px] ${middleSectionWidthClass} py-0.5 shrink-0`}>
                                      {Array.from({ length: maxShotsForDist }).map((_, shotIdx) => {
                                        const scoreVal = rScores[shotIdx];
                                        let parsedVal: boolean | number | null = null;
                                        
                                        if (scoreVal !== null && scoreVal !== undefined && scoreVal !== "") {
                                          let norm = scoreVal;
                                          if (norm === "true" || norm === "1") norm = true;
                                          if (norm === "false" || norm === "0") norm = false;
                                          if (typeof norm === "string") {
                                            const parsed = Number(norm);
                                            if (!isNaN(parsed)) norm = parsed;
                                          }
                                          if (typeof norm === "number") {
                                            parsedVal = norm;
                                          } else if (norm === true) {
                                            parsedVal = true;
                                          } else if (norm === false) {
                                            parsedVal = false;
                                          }
                                        }

                                        let isHit = false;
                                        let isMiss = false;
                                        if (parsedVal === true || (typeof parsedVal === "number" && parsedVal > 0)) {
                                          isHit = true;
                                        } else if (parsedVal === false || (typeof parsedVal === "number" && parsedVal === 0)) {
                                          isMiss = true;
                                        }

                                        let cellBgClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500";
                                        let cellText = "-";
                                        if (isHit) {
                                          cellBgClass = "bg-emerald-500 border-emerald-600 text-white font-black";
                                          cellText = "V";
                                        } else if (isMiss) {
                                          cellBgClass = "bg-rose-500 border-rose-600 text-white font-black";
                                          cellText = "X";
                                        }

                                        return (
                                          <div 
                                            key={shotIdx}
                                            className={`w-[18px] h-[18px] rounded-sm flex flex-col items-center justify-center text-[9px] border shrink-0 select-none ${cellBgClass}`}
                                            title={`Viên ${shotIdx + 1}: ${isHit ? 'Trúng (V)' : isMiss ? 'Trượt (X)' : 'Chưa bắn'}`}
                                          >
                                            <span className="font-sans font-extrabold leading-none">
                                              {cellText}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )
                                )}

                                {/* Right Section - Multiplier Score / Solo details */}
                                {row.isQualified && (
                                  <div className={`flex items-center gap-1 ${rightSectionWidthClass} justify-end shrink-0`}>
                                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 whitespace-nowrap">
                                      +{row.score}đ
                                    </span>
                                    {(() => {
                                      if (!distConfig || !distConfig.isSolo) {
                                        return null;
                                      }
                                      const rounds = getSoloRoundsFromDist(athlete, distConfig);
                                      if (rounds.length > 0) {
                                        return rounds.map((rVal, idx) => {
                                          const displayVal = rVal === null || rVal === undefined ? "-" : rVal;
                                          return (
                                            <span 
                                              key={idx} 
                                              className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded text-[9px] font-black border border-purple-200 dark:border-purple-900/40 whitespace-nowrap" 
                                              title={`Điểm Solo Lần ${idx + 1}`}
                                            >
                                              🎯S{idx + 1}:{displayVal}
                                            </span>
                                          );
                                        });
                                      } else if (soloVal !== undefined && soloVal !== null) {
                                        return (
                                          <span 
                                            className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded text-[9px] font-black border border-purple-200 dark:border-purple-900/40 whitespace-nowrap" 
                                            title="Điểm Solo Shootout"
                                          >
                                            🎯S:{soloVal}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </td>
  
                    {/* Total accuracy */}
                    <td className={`${cellPaddingClass} font-mono text-center ${individualCellBorderClass}`}>
                      {athlete.wasEliminatedEarlier ? (
                        <div className="font-bold text-gray-400 font-mono text-sm">-</div>
                      ) : (
                        <>
                          <div className="font-bold text-gray-800 text-xs sm:text-sm">
                            {athlete.totalHits}/{athlete.totalPossibleShots} {isPointModeActive ? "điểm" : "viên"}
                          </div>
                          <div className="text-xs text-emerald-600 font-bold">
                            {athlete.accuracy.toFixed(1)}%
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )}

      {/* V3 Multi-Dimensional Rankings & Snapshots */}
      {rankingSubTab === "season" && (
        <div className="animate-fadeIn">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Bảng xếp hạng Tích lũy Season 2026
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Tổng hợp điểm tích lũy và hiệu suất từ tất cả các giải đấu chính thức trong cùng mùa giải.
            </p>
          </div>
          {seasonRankings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-gray-400 font-semibold text-xs leading-relaxed">
              Chưa có dữ liệu snapshot cho Season hiện tại. Dữ liệu sẽ xuất hiện sau khi hoàn thành giải đấu đầu tiên.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/55 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-800">
                    <th className="p-3.5 w-[100px] text-center">Thứ hạng</th>
                    <th className="p-3.5">Vận động viên</th>
                    <th className="p-3.5">Đơn vị / Đội</th>
                    <th className="p-3.5 text-center">Số giải tham gia</th>
                    <th className="p-3.5 text-center bg-purple-50/50 dark:bg-purple-950/10 text-purple-900 dark:text-purple-300 font-bold">Tổng điểm tích lũy</th>
                    <th className="p-3.5 text-center font-bold text-indigo-700 dark:text-indigo-400">Điểm số (Ledger)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {seasonRankings.map((row: any, idx) => (
                    <tr key={`${row.athleteId || 'row'}-${idx}`} className="hover:bg-gray-55/40 dark:hover:bg-slate-800/20 transition-all">
                      <td className="p-3.5 text-center font-mono font-bold">
                        {idx + 1 === 1 ? (
                          <span className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">#1 Vàng</span>
                        ) : idx + 1 === 2 ? (
                          <span className="bg-slate-300 text-slate-800 font-bold text-xs px-2.5 py-0.5 rounded-full">#2 Bạc</span>
                        ) : idx + 1 === 3 ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-2.5 py-0.5 rounded-full">#3 Đồng</span>
                        ) : (
                          <span>#{idx + 1}</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">{row.name}</td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-400 font-medium">{row.team || "VĐV Tự do"}</td>
                      <td className="p-3.5 text-center font-mono">{row.tournamentsParticipated || 1}</td>
                      <td className="p-3.5 text-center font-mono font-black bg-purple-50/40 dark:bg-purple-950/5 text-purple-900 dark:text-purple-300">{row.seasonPointsSum}đ</td>
                      <td className="p-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-450">{row.totalScoreSum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {rankingSubTab === "club" && (
        <div className="animate-fadeIn">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-500" />
              Bảng xếp hạng Câu Lạc Bộ (Clubs Championship)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Xếp hạng dựa trên tổng điểm thi đấu của tất cả các vận động viên đăng ký dưới màu áo câu lạc bộ tại giải đấu hiện tại.
            </p>
          </div>
          {(() => {
            const clubMap: Record<string, { totalScore: number; athletesCount: number }> = {};
            athletes.forEach((ath) => {
              if (ath.team && ath.team.trim()) {
                const teamName = ath.team.trim();
                
                // Exclude free/Tự do teams
                if (
                  isNoTeam(teamName) ||
                  teamName.toLowerCase() === "tự do" ||
                  teamName.toLowerCase() === "tự do (không đội)" ||
                  teamName.toLowerCase() === "không có" ||
                  teamName.toLowerCase() === "free" ||
                  teamName.toLowerCase() === "vđv tự do"
                ) {
                  return;
                }

                const totalScore = distances.reduce((sum, dist) => {
                  const hits = ath.scores[dist.id] || [];
                  const hitCount = isDirectMode ? (Number(hits[0]) || 0) : hits.filter(Boolean).length;
                  return sum + (hitCount * dist.multiplier);
                }, 0);
                if (!clubMap[teamName]) {
                  clubMap[teamName] = { totalScore: 0, athletesCount: 0 };
                }
                clubMap[teamName].totalScore += totalScore;
                clubMap[teamName].athletesCount += 1;
              }
            });
            const sortedClubs = Object.entries(clubMap)
              .map(([name, info]) => ({ name, ...info }))
              .sort((a, b) => b.totalScore - a.totalScore);

            if (sortedClubs.length === 0) {
              return (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-gray-400">
                  Chưa có câu lạc bộ nào có điểm số được ghi nhận.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/55 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-800">
                      <th className="p-3.5 w-[100px] text-center">Thứ hạng</th>
                      <th className="p-3.5">Câu lạc bộ / Đơn vị</th>
                      <th className="p-3.5 text-center">Số lượng VĐV thi đấu</th>
                      <th className="p-3.5 text-center bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-300 font-bold">Tổng điểm thành tích</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {sortedClubs.map((club, idx) => (
                      <tr key={club.name} className="hover:bg-gray-55/40 dark:hover:bg-slate-800/20 transition-all">
                        <td className="p-3.5 text-center font-mono font-bold">#{idx + 1}</td>
                        <td className="p-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          {club.name}
                        </td>
                        <td className="p-3.5 text-center font-mono">{club.athletesCount}</td>
                        <td className="p-3.5 text-center font-mono font-black bg-emerald-50/40 dark:bg-emerald-950/5 text-emerald-900 dark:text-emerald-300">{club.totalScore}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {rankingSubTab === "province" && (
        <div className="animate-fadeIn">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-rose-500" />
              Bảng xếp hạng Tỉnh Thành (Provinces Standings)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Xếp hạng dựa trên tổng điểm thi đấu của tất cả các vận động viên trực thuộc đơn vị hành chính tỉnh thành tại giải đấu hiện tại.
            </p>
          </div>
          {(() => {
            const provinceMap: Record<string, { totalScore: number; athletesCount: number }> = {};
            athletes.forEach((ath) => {
              if (ath.province && ath.province.trim()) {
                const provName = ath.province.trim();
                const totalScore = distances.reduce((sum, dist) => {
                  const hits = ath.scores[dist.id] || [];
                  const hitCount = isDirectMode ? (Number(hits[0]) || 0) : hits.filter(Boolean).length;
                  return sum + (hitCount * dist.multiplier);
                }, 0);
                if (!provinceMap[provName]) {
                  provinceMap[provName] = { totalScore: 0, athletesCount: 0 };
                }
                provinceMap[provName].totalScore += totalScore;
                provinceMap[provName].athletesCount += 1;
              }
            });
            const sortedProvinces = Object.entries(provinceMap)
              .map(([name, info]) => ({ name, ...info }))
              .sort((a, b) => b.totalScore - a.totalScore);

            if (sortedProvinces.length === 0) {
              return (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-gray-400">
                  Chưa có tỉnh thành nào có dữ liệu thành tích được cập nhật.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/55 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-800">
                      <th className="p-3.5 w-[100px] text-center">Thứ hạng</th>
                      <th className="p-3.5">Tỉnh thành</th>
                      <th className="p-3.5 text-center">Số lượng VĐV thi đấu</th>
                      <th className="p-3.5 text-center bg-rose-50/50 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300 font-bold">Tổng điểm thành tích</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {sortedProvinces.map((prov, idx) => (
                      <tr key={prov.name} className="hover:bg-gray-55/40 dark:hover:bg-slate-800/20 transition-all">
                        <td className="p-3.5 text-center font-mono font-bold">#{idx + 1}</td>
                        <td className="p-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Flag className="w-4 h-4 text-rose-400" />
                          {prov.name}
                        </td>
                        <td className="p-3.5 text-center font-mono">{prov.athletesCount}</td>
                        <td className="p-3.5 text-center font-mono font-black bg-rose-50/40 dark:bg-rose-950/5 text-rose-900 dark:text-rose-300">{prov.totalScore}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {rankingSubTab === "stats" && (
        <div className="animate-fadeIn">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
              Thống kê Hiệu Suất & Kỷ lục Vận động viên
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Phân tích chuyên sâu về tỉ lệ bắn trúng, độ ổn định và các chuỗi bắn trúng liên tục (Hit Streaks).
            </p>
          </div>
          {(() => {
            const statsList = athletes.map((ath) => {
              let longestHitStreak = 0;
              let currentHitStreak = 0;
              let totalShots = 0;
              let totalHits = 0;

              distances.forEach((dist) => {
                const rawShots = ath.scores[dist.id] || [];
                rawShots.forEach((shot) => {
                  totalShots++;
                  const isHit = shot === true || (typeof shot === "number" && shot > 0);
                  if (isHit) {
                    totalHits++;
                    currentHitStreak++;
                    if (currentHitStreak > longestHitStreak) {
                      longestHitStreak = currentHitStreak;
                    }
                  } else {
                    currentHitStreak = 0;
                  }
                });
              });

              const accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
              return {
                id: ath.id,
                name: ath.name,
                team: ath.team,
                accuracy,
                longestHitStreak,
                totalShots,
                totalHits
              };
            }).sort((a, b) => b.accuracy - a.accuracy);

            if (statsList.length === 0) {
              return <div className="text-center py-12 text-gray-400 font-semibold">Chưa có dữ liệu thống kê.</div>;
            }

            const topAcc = statsList[0];
            const topStreak = [...statsList].sort((a, b) => b.longestHitStreak - a.longestHitStreak)[0];

            return (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topAcc && (
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-850/30 dark:to-blue-950/25 p-4 rounded-xl border border-cyan-150/45 shadow-sm">
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Xạ thủ chính xác nhất</span>
                      <div className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">{topAcc.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{topAcc.team || "VĐV Tự do"}</div>
                      <div className="font-black text-2xl text-cyan-600 mt-2">{topAcc.accuracy.toFixed(1)}% <span className="text-xs font-semibold text-gray-500">tỉ lệ trúng</span></div>
                    </div>
                  )}
                  {topStreak && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-850/30 dark:to-orange-950/25 p-4 rounded-xl border border-amber-150/45 shadow-sm">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Chuỗi trúng mục tiêu dài nhất</span>
                      <div className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">{topStreak.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{topStreak.team || "VĐV Tự do"}</div>
                      <div className="font-black text-2xl text-amber-600 mt-2">{topStreak.longestHitStreak} lượt <span className="text-xs font-semibold text-gray-500">bắn trúng liên tiếp</span></div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-800/55 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-800">
                        <th className="p-3.5">Vận động viên</th>
                        <th className="p-3.5">Đơn vị</th>
                        <th className="p-3.5 text-center">Tỉ lệ chính xác</th>
                        <th className="p-3.5 text-center">Chuỗi trúng dài nhất</th>
                        <th className="p-3.5 text-center">Tổng lượt bắn</th>
                        <th className="p-3.5 text-center">Tổng lượt trúng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {statsList.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-55/40 dark:hover:bg-slate-800/20 transition-all">
                          <td className="p-3.5 font-bold text-gray-900 dark:text-white">{row.name}</td>
                          <td className="p-3.5 text-gray-600 dark:text-gray-400 font-medium">{row.team || "VĐV Tự do"}</td>
                          <td className="p-3.5 text-center font-mono font-black text-cyan-600">{row.accuracy.toFixed(1)}%</td>
                          <td className="p-3.5 text-center font-mono font-bold text-amber-600">{row.longestHitStreak}</td>
                          <td className="p-3.5 text-center font-mono">{row.totalShots}</td>
                          <td className="p-3.5 text-center font-mono text-emerald-600">{row.totalHits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}


    </div>
  );
};
