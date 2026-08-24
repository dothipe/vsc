import React, { useState, useMemo, useEffect } from "react";
import { Athlete, DistanceConfig } from "../types";
import { VSCLogo, SlingshotIcon } from "./VSCLogo";
import { Trophy, Medal, Award, Star, Users, Target, Zap, Shield, TrendingUp, Share2, Tv, Clock } from "lucide-react";
import { AVATAR_MALE, AVATAR_FEMALE } from "./AthleteRegistry";
import { calculateRounds, getHitCount } from "../utils/qualification";
import { getCleanVscNumber, getCleanBibNumber, isNoTeam } from "../utils/athleteUtils";
import { subscribeToVscSystemAthletes } from "../lib/firebaseService";

interface MainDashboardProps {
  athletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
  matchName: string;
  masterAthletes?: Athlete[];
  teamAthletes?: Athlete[];
  teamDistances?: DistanceConfig[];
  teamShotsCount?: number;
  leaderboardTeamAthletes?: Athlete[];
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  sponsors?: any[];
  systemClubs?: any[];
  onExportClick?: () => void;
  onLiveBoardClick?: () => void;
  onTimerClick?: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ 
  athletes, 
  distances, 
  shotsCount, 
  matchName, 
  masterAthletes,
  teamAthletes,
  teamDistances,
  teamShotsCount,
  leaderboardTeamAthletes,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  sponsors,
  systemClubs,
  onExportClick,
  onLiveBoardClick,
  onTimerClick
}) => {
  const [systemAthletes, setSystemAthletes] = useState<Athlete[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((data) => {
      setSystemAthletes(data || []);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

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

  const getClubLogo = (tName: string) => {
    if (!systemClubs || !tName) return null;
    const found = systemClubs.find(
      (c) =>
        c.clubName?.trim().toLowerCase() === tName.trim().toLowerCase() ||
        c.name?.trim().toLowerCase() === tName.trim().toLowerCase()
    );
    return found?.logoUrl || null;
  };

  const resolveAthleteAvatar = (vdv: any) => {
    if (!vdv) return AVATAR_MALE;
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    // 1. Match by masterAthleteId
    if (!avatarUrl && vdv.masterAthleteId) {
      const foundLocal = masterAthletes?.find((a: any) => a.id === vdv.masterAthleteId) as any;
      if (foundLocal && (foundLocal.avatarUrl || foundLocal.avatar)) {
        avatarUrl = foundLocal.avatarUrl || foundLocal.avatar;
      } else {
        const foundSystem = systemAthletes?.find((a: any) => a.id === vdv.masterAthleteId) as any;
        if (foundSystem && (foundSystem.avatarUrl || foundSystem.avatar)) {
          avatarUrl = foundSystem.avatarUrl || foundSystem.avatar;
        }
      }
    }
    
    // 2. Match by clean name
    if (!avatarUrl) {
      const targetName = vdv.fullName || vdv.name;
      if (targetName) {
        const foundLocal = matchByName(masterAthletes || [], targetName);
        if (foundLocal && (foundLocal.avatarUrl || foundLocal.avatar)) {
          avatarUrl = foundLocal.avatarUrl || foundLocal.avatar;
        } else {
          const foundSystem = matchByName(systemAthletes || [], targetName);
          if (foundSystem && (foundSystem.avatarUrl || foundSystem.avatar)) {
            avatarUrl = foundSystem.avatarUrl || foundSystem.avatar;
          }
        }
      }
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  const isDirectMode = shotsCount === 1;
  const isTeamDirectMode = teamShotsCount === 1;

  const getPointsSum = (hits: any[], isDirect: boolean): number => {
    if (!hits || !Array.isArray(hits) || hits.length === 0) return 0;
    if (isDirect) {
      let sum = 0;
      for (const item of hits) {
        if (item === null || item === undefined || item === "") continue;
        let norm = item;
        if (norm === "true" || norm === "1") norm = true;
        if (norm === "false" || norm === "0") norm = false;
        if (typeof norm === "string") {
          const parsed = Number(norm);
          if (!isNaN(parsed)) norm = parsed;
        }
        if (typeof norm === "number") {
          sum += norm;
        } else if (norm === true) {
          sum += 1;
        }
      }
      return sum;
    } else {
      return getHitCount(hits);
    }
  };

  const getMainDashboardIndividualHitCount = (hits: any[]) => {
    if (isDirectMode && hits[0] !== null && hits[0] !== undefined) {
      const parsed = Number(hits[0]);
      return isNaN(parsed) ? 0 : parsed;
    }
    return getHitCount(hits);
  };

  const getMainDashboardTeamHitCount = (hits: any[]) => {
    if (isTeamDirectMode && hits[0] !== null && hits[0] !== undefined) {
      const parsed = Number(hits[0]);
      return isNaN(parsed) ? 0 : parsed;
    }
    return getHitCount(hits);
  };

  const effectiveShotsCount = isDirectMode ? (directMaxShots || 10) : shotsCount;
  const effectiveTeamShotsCount = isTeamDirectMode ? (teamDirectMaxShots || 10) : (teamShotsCount !== undefined ? teamShotsCount : shotsCount);

  const hasMaxRoundScoreConf = useMemo(() => (distances || []).some(d => d.isMaxRoundScore), [distances]);

  const [topXCount, setTopXCount] = useState<number>(10);
  const [dashboardTab, setDashboardTab] = useState<"survival" | "allRound">("survival");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset current page on display tab or Top X count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dashboardTab, topXCount]);

  // Keep overall preprocessed stats for highlight counts
  const processedAthletes = useMemo(() => {
    const hasMaxRoundScoreConf = distances.some(d => d.isMaxRoundScore);

    return athletes.map((athlete) => {
      let totalScore = 0;
      let totalHits = 0;
      let maxScore = -1;

      distances.forEach((dist) => {
        const hits = athlete.scores[dist.id] || [];
        const pointsSum = getPointsSum(hits, isDirectMode);
        const hitCount = getMainDashboardIndividualHitCount(hits);
        const score = pointsSum * dist.multiplier;
        totalScore += score;
        totalHits += hitCount;
        if (score > maxScore) {
          maxScore = score;
        }
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

      const totalPossShots = countShotRounds * effectiveShotsCount;
      let accuracy = 0;
      if (isDirectMode && directMaxPoints !== undefined && directMaxPoints > 0) {
        const totalPossiblePoints = directMaxPoints * totalMultiplierOfShotRounds;
        accuracy = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
      } else {
        accuracy = totalPossShots > 0 ? (totalHits / totalPossShots) * 100 : 0;
      }

      const finalScore = hasMaxRoundScoreConf ? (maxScore >= 0 ? maxScore : 0) : totalScore;
      const finalPossibleShots = isDirectMode && directMaxPoints !== undefined && directMaxPoints > 0
        ? directMaxPoints * totalMultiplierOfShotRounds
        : totalPossShots;

      return {
        ...athlete,
        totalScore: finalScore,
        totalHits,
        totalPossibleShots: finalPossibleShots,
        accuracy,
      };
    });
  }, [athletes, distances, effectiveShotsCount]);

  const teamStats = useMemo(() => {
    const teamsMap: Record<string, {
      teamName: string;
      totalScore: number;
      totalHits: number;
      totalShots: number;
      memberCount: number;
    }> = {};

    processedAthletes.forEach((athlete) => {
      const rawTeam = athlete.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do" : rawTeam;

      if (!teamsMap[teamName]) {
        teamsMap[teamName] = {
          teamName,
          totalScore: 0,
          totalHits: 0,
          totalShots: 0,
          memberCount: 0,
        };
      }

      teamsMap[teamName].totalScore += athlete.totalScore;
      teamsMap[teamName].totalHits += athlete.totalHits;
      teamsMap[teamName].totalShots += athlete.totalPossibleShots;
      teamsMap[teamName].memberCount += 1;
    });

    const list = Object.values(teamsMap);
    return list.sort((a, b) => b.totalScore - a.totalScore);
  }, [processedAthletes]);

  // Compute round by round results to establish survival indices
  const athleteSurvivalInfo = useMemo(() => {
    const roundResults = calculateRounds(athletes, distances, effectiveShotsCount, directMaxPoints, directMaxShots);
    
    return athletes.map((athlete) => {
      let eliminatedInRoundIdx: number | null = null;
      for (let i = 0; i < roundResults.length; i++) {
        if (roundResults[i].eliminatedIds.includes(athlete.id)) {
          let hasSubsequentParticipation = false;
          for (let j = i + 1; j < roundResults.length; j++) {
            if (roundResults[j].qualifiedIds.includes(athlete.id)) {
              hasSubsequentParticipation = true;
              break;
            }
          }
          if (!hasSubsequentParticipation) {
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
      let survivalRoundScore = 0;
      let survivalCumulativeScore = 0;

      const hasMaxRoundScoreConf = distances.some(d => d.isMaxRoundScore);

      if (distances.length > 0 && lastActiveRoundIdx >= 0) {
        if (hasMaxRoundScoreConf) {
          let maxScore = -1;
          let maxHits = 0;
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
              const pointsSum = getPointsSum(hits, isDirectMode);
              const hitCount = getMainDashboardIndividualHitCount(hits);
              const score = pointsSum * dist.multiplier;

              const wasShot = hits.length > 0 && hits.some(v => v !== null && v !== undefined);
              if (wasShot) {
                cumulativeHitsSumInShotRounds += hitCount;
                cumulativeScoreSumInShotRounds += score;
                cumulativeMultiplierSumInShotRounds += dist.multiplier;
                cumulativeCountInShotRounds++;
              }

              const soloHits = dist.isSolo ? (athlete.soloHits?.[dist.id] || 0) : 0;

              if (score > maxScore) {
                maxScore = score;
                maxHits = hitCount;
                maxSoloHits = soloHits;
              }
            }
          }

          survivalScore = maxScore >= 0 ? maxScore : 0;
          survivalHits = cumulativeHitsSumInShotRounds;
          survivalRoundScore = maxScore >= 0 ? maxScore : 0;
          survivalCumulativeScore = cumulativeScoreSumInShotRounds;

          if (isDirectMode && directMaxPoints !== undefined && directMaxPoints > 0) {
            if (cumulativeMultiplierSumInShotRounds === 0 && distances[lastActiveRoundIdx]) {
              cumulativeMultiplierSumInShotRounds = distances[lastActiveRoundIdx].multiplier;
            }
            const totalPossPoints = directMaxPoints * cumulativeMultiplierSumInShotRounds;
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
            survivalRoundScore = statsAtLastRound.roundScore;
            survivalCumulativeScore = statsAtLastRound.cumulativeScore;
          }
          const lastActiveDist = distances[lastActiveRoundIdx];
          if (lastActiveDist && lastActiveDist.isSolo) {
            survivalSoloHits = athlete.soloHits?.[lastActiveDist.id] || 0;
          }
        }
      }

      let totalScore = 0;
      let totalHits = 0;
      distances.forEach((dist) => {
        const hits = athlete.scores[dist.id] || [];
        const pointsSum = getPointsSum(hits, isDirectMode);
        const hitCount = getMainDashboardIndividualHitCount(hits);
        totalScore += pointsSum * dist.multiplier;
        totalHits += hitCount;
      });

      let accuracy = 0;
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
      if (isDirectMode && directMaxPoints !== undefined && directMaxPoints > 0) {
        const totalPossiblePoints = directMaxPoints * totalMultiplierOfShotRounds;
        accuracy = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
      } else {
        const totalPossShots = countShotRounds * effectiveShotsCount;
        accuracy = totalPossShots > 0 ? (totalHits / totalPossShots) * 100 : 0;
      }

      return {
        ...athlete,
        survivalVal,
        survivalScore,
        survivalScoreWithSolo,
        survivalHits,
        survivalAccuracy,
        survivalSoloHits,
        survivalRoundScore,
        survivalCumulativeScore,
        totalScore,
        totalHits,
        accuracy,
        eliminatedInRoundIdx,
      };
    });
  }, [athletes, distances, effectiveShotsCount]);

  // Sort by survival length first, then score, then shootout soloHits, then accuracy
  const sortedSurvivalAthletes = useMemo(() => {
    return [...athleteSurvivalInfo].sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";
      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;

      // 1. Who survived more rounds
      if (b.survivalVal !== a.survivalVal) {
        return b.survivalVal - a.survivalVal;
      }
      // 2. Cumulative score with solo
      if (b.survivalScoreWithSolo !== a.survivalScoreWithSolo) {
        return b.survivalScoreWithSolo - a.survivalScoreWithSolo;
      }
      // 3. Cumulative score up to their last active round
      if (b.survivalScore !== a.survivalScore) {
        return b.survivalScore - a.survivalScore;
      }
      // 4. Shootout soloHits in their last active round
      if (b.survivalSoloHits !== a.survivalSoloHits) {
        return b.survivalSoloHits - a.survivalSoloHits;
      }
      // 5. Accuracy up to their last active round
      if (b.survivalAccuracy !== a.survivalAccuracy) {
        return b.survivalAccuracy - a.survivalAccuracy;
      }
      return a.name.localeCompare(b.name, "vi");
    });
  }, [athleteSurvivalInfo]);

  // Sort strictly by cumulative score, then accuracy
  const sortedAllRoundAthletes = useMemo(() => {
    return [...athleteSurvivalInfo].sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";
      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;

      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.accuracy - a.accuracy;
    });
  }, [athleteSurvivalInfo]);

  // Assign joint ranks for survival list
  const rankedSurvivalAthletes = useMemo(() => {
    return sortedSurvivalAthletes.map((athlete, idx) => {
      let betterCount = 0;
      for (let j = 0; j < idx; j++) {
        const other = sortedSurvivalAthletes[j];
        if (other.status === "Bỏ thi") continue;
        if (athlete.status === "Bỏ thi") continue;

        // Compare by same criteria as the sort: survivalVal, survivalScoreWithSolo, survivalScore, survivalSoloHits, survivalAccuracy
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
      return { ...athlete, dashboardRank: betterCount + 1 };
    });
  }, [sortedSurvivalAthletes]);

  // Assign joint ranks for all-round list
  const rankedAllRoundAthletes = useMemo(() => {
    return sortedAllRoundAthletes.map((athlete, idx) => {
      let betterCount = 0;
      for (let j = 0; j < idx; j++) {
        const other = sortedAllRoundAthletes[j];
        if (other.status === "Bỏ thi") continue;
        if (athlete.status === "Bỏ thi") continue;

        if (other.totalScore !== athlete.totalScore) {
          if (other.totalScore > athlete.totalScore) betterCount++;
        } else if (other.accuracy !== athlete.accuracy) {
          if (other.accuracy > athlete.accuracy) betterCount++;
        }
      }
      return { ...athlete, dashboardRank: betterCount + 1 };
    });
  }, [sortedAllRoundAthletes]);

  // Top 3 Survival individual list (matching Bảng Vàng Danh Dự Liveboard logic exactly)
  const top3SurvivalAthletes = useMemo(() => {
    const list = rankedSurvivalAthletes.filter(a => a.status !== "Bỏ thi");
    const matched: any[] = [];

    for (let i = 0; i < 3; i++) {
      const item = list[i];
      matched.push(item ? { ...item, displayScore: item.survivalScore, displayAccuracy: item.survivalAccuracy } : {
        id: `empty-${i}`,
        name: "Chưa Có VĐV",
        team: "Tự Do",
        scores: {},
        avatarUrl: "",
        gender: "male" as const,
        note: "",
        registeredForCup: false,
        isPrimaryTeam: false,
        totalScore: 0,
        totalHits: 0,
        accuracy: 0,
        displayScore: 0,
        displayAccuracy: 0,
        dashboardRank: i + 1,
      });
    }

    return matched;
  }, [rankedSurvivalAthletes]);

  // Top 3 All-round individual list
  const top3AllRoundAthletes = useMemo(() => {
    const list = rankedAllRoundAthletes.filter(a => a.status !== "Bỏ thi");
    const matched: any[] = [];

    for (let i = 0; i < 3; i++) {
      const item = list[i];
      matched.push(item ? { ...item, displayScore: item.totalScore, displayAccuracy: item.accuracy } : {
        id: `empty-${i}`,
        name: "Chưa Có VĐV",
        team: "Tự Do",
        scores: {},
        avatarUrl: "",
        gender: "male" as const,
        note: "",
        registeredForCup: false,
        isPrimaryTeam: false,
        totalScore: 0,
        totalHits: 0,
        accuracy: 0,
        displayScore: 0,
        displayAccuracy: 0,
        dashboardRank: i + 1,
      });
    }

    return matched;
  }, [rankedAllRoundAthletes]);

  // 1. Resolve source athletes for team calculation based on team environment props
  const resolvedTeamAthletes = useMemo(() => {
    const source = leaderboardTeamAthletes || teamAthletes || athletes;
    return source.filter((a) => a.isPrimaryTeam);
  }, [leaderboardTeamAthletes, teamAthletes, athletes]);

  const activeTeamDistances = teamDistances || distances;
  const activeTeamShotsCount = effectiveTeamShotsCount;

  // 2. Compute qualifications and rounds results matching the Team competition mode
  const teamRoundResults = useMemo(() => {
    const results: any[] = [];
    const teamCumulativeScores: Record<string, number> = {};
    const teamCumulativeHits: Record<string, number> = {};

    const activeTeams = Array.from(new Set(resolvedTeamAthletes.map((a) => {
      const raw = a.team.trim();
      return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
    }))) as string[];

    for (let r = 0; r < activeTeamDistances.length; r++) {
      const dist = activeTeamDistances[r];
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

      const currentRoundTeams = Array.from(new Set(resolvedTeamAthletes.map((a) => {
        const raw = a.team.trim();
        return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
      }))).filter((tName) => activeTeams.includes(tName as string)) as string[];

      currentRoundTeams.forEach((teamName: string) => {
        const members = resolvedTeamAthletes.filter((a) => {
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
        let roundPoints = 0;
        let totalSoloHits = 0;
        let hasAnySoloEntered = false;

        activeMembers.forEach((memb) => {
          const hits = memb.scores[dist.id] || [];
          roundPoints += getPointsSum(hits, isTeamDirectMode);
          roundHits += getMainDashboardTeamHitCount(hits);
          const soloVal = memb.soloHits?.[dist.id];
          if (soloVal !== undefined && soloVal !== null) {
            totalSoloHits += soloVal;
            hasAnySoloEntered = true;
          }
        });

        const roundScore = roundPoints * dist.multiplier;
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
        if (isTeamDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
          let totalMultiplier = 0;
          if (isCum) {
            for (let i = 0; i <= r; i++) {
              totalMultiplier += activeTeamDistances[i].multiplier;
            }
          } else {
            totalMultiplier = dist.multiplier;
          }
          const totalPossPoints = activeMembers.length * teamDirectMaxPoints * totalMultiplier;
          accuracy = totalPossPoints > 0 ? (displayScore / totalPossPoints) * 100 : 0;
        } else {
          const totalPossShots = activeMembers.length * (isCum ? (r + 1) * activeTeamShotsCount : activeTeamShotsCount);
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

      activeTeams.length = 0;
      activeTeams.push(...nextRoundTeams);
    }

    return results;
  }, [resolvedTeamAthletes, activeTeamDistances, activeTeamShotsCount]);

  // 3. Compute active team scores matching direct qualifiers round results
  const activeTeamScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    if (hasMaxRoundScoreConf) {
      const teamsList = Array.from(new Set(resolvedTeamAthletes.map((a) => {
        const raw = a.team.trim();
        return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
      }))) as string[];

      teamsList.forEach((teamName) => {
        const members = resolvedTeamAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName && a.isPrimaryTeam && a.status !== "Bỏ thi";
        });

        let teamScoreSum = 0;
        let teamSoloSum = 0;

        members.forEach((athlete) => {
          let maxScore = -1;
          let maxSoloHits = 0;

          activeTeamDistances.forEach((distance, rIdx) => {
            const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
            if (isQualified) {
              const hits = athlete.scores[distance.id] || [];
              const pointsSum = getPointsSum(hits, isTeamDirectMode);
              const score = pointsSum * distance.multiplier;
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
      resolvedTeamAthletes.forEach((athlete) => {
        const rawTeam = athlete.team.trim();
        const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

        let personalScore = 0;
        let personalSolo = 0;
        activeTeamDistances.forEach((distance, rIdx) => {
          const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
          if (isQualified) {
            const hits = athlete.scores[distance.id] || [];
            const pointsSum = getPointsSum(hits, isTeamDirectMode);
            personalScore += pointsSum * distance.multiplier;

            const soloVal = athlete.soloHits?.[distance.id];
            const soloHitsNum = (soloVal === null || soloVal === undefined) ? 0 : soloVal;
            personalSolo += soloHitsNum;
          }
        });

        scores[teamName] = (scores[teamName] || 0) + personalScore + (personalSolo * 0.001);
      });
    }
    return scores;
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults]);

  // 4. Compute exact team survival rankings matching TeamLeaderboard.tsx
  const teamRanks = useMemo(() => {
    const teamStats: Record<string, { survivalVal: number; score: number }> = {};
    resolvedTeamAthletes.forEach((ath) => {
      const rawTeam = ath.team.trim();
      if (isNoTeam(rawTeam)) return;
      const teamName = rawTeam;
      if (!teamStats[teamName]) {
        let eliminatedInRoundIdx: number | null = null;
        for (let i = 0; i < teamRoundResults.length; i++) {
          if (teamRoundResults[i].eliminatedTeams.includes(teamName)) {
            eliminatedInRoundIdx = i;
            break;
          }
        }
        const sVal = eliminatedInRoundIdx === null ? activeTeamDistances.length : eliminatedInRoundIdx;
        teamStats[teamName] = {
          survivalVal: sVal,
          score: activeTeamScores[teamName] || 0,
        };
      }
    });

    const teamNames = Object.keys(teamStats);
    const ranks: Record<string, number> = {};
    teamNames.forEach((tName) => {
      const tStats = teamStats[tName];
      let betterTeamsCount = 0;
      teamNames.forEach((otherName) => {
        if (otherName === tName) return;
        const otherStats = teamStats[otherName];
        let isOtherBetter = false;
        if (otherStats.survivalVal !== tStats.survivalVal) {
          isOtherBetter = otherStats.survivalVal > tStats.survivalVal;
        } else {
          isOtherBetter = otherStats.score > tStats.score;
        }
        if (isOtherBetter) {
          betterTeamsCount++;
        }
      });
      ranks[tName] = betterTeamsCount + 1;
    });
    return ranks;
  }, [resolvedTeamAthletes, teamRoundResults, activeTeamScores, activeTeamDistances.length]);

  // 5. Compute exact team cumulative (all round) rankings matching TeamLeaderboard.tsx
  const teamRanksAllRound = useMemo(() => {
    const teamStats: Record<string, { score: number }> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    resolvedTeamAthletes.forEach((ath) => {
      const rawTeam = ath.team.trim();
      if (isNoTeam(rawTeam)) return;
      const teamName = rawTeam;
      if (!teamStats[teamName]) {
        let totalScoreAll = 0;
        const members = resolvedTeamAthletes.filter((a) => {
          const r = a.team.trim();
          return !isNoTeam(r) && r === teamName && a.isPrimaryTeam && a.status !== "Bỏ thi";
        });

        if (hasMaxRoundScoreConf) {
          let teamScoreSum = 0;
          members.forEach((memb) => {
            let memberMaxScore = -1;
            activeTeamDistances.forEach((dist, rIdx) => {
              const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
              if (isQualified) {
                const hits = memb.scores[dist.id] || [];
                const pointsSum = getPointsSum(hits, isTeamDirectMode);
                const score = pointsSum * dist.multiplier;
                if (score > memberMaxScore) {
                  memberMaxScore = score;
                }
              }
            });
            teamScoreSum += memberMaxScore >= 0 ? memberMaxScore : 0;
          });
          totalScoreAll = teamScoreSum;
        } else {
          members.forEach((memb) => {
            activeTeamDistances.forEach((dist) => {
              const hits = memb.scores[dist.id] || [];
              const pointsSum = getPointsSum(hits, isTeamDirectMode);
              totalScoreAll += pointsSum * dist.multiplier;
            });
          });
        }
        teamStats[teamName] = { score: totalScoreAll };
      }
    });

    const teamNames = Object.keys(teamStats);
    const ranks: Record<string, number> = {};
    teamNames.forEach((tName) => {
      const tStats = teamStats[tName];
      let betterTeamsCount = 0;
      teamNames.forEach((otherName) => {
        if (otherName === tName) return;
        const otherStats = teamStats[otherName];
        if (otherStats.score > tStats.score) {
          betterTeamsCount++;
        }
      });
      ranks[tName] = betterTeamsCount + 1;
    });
    return ranks;
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults]);

  // 6. Aggregate survival stats matching the exact scoring layout
  const teamLeaderboardSurvivalData = useMemo(() => {
    const groups: Record<string, { totalScore: number; memberCount: number }> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    resolvedTeamAthletes.forEach((athlete) => {
      const rawTeam = athlete.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

      if (!groups[teamName]) {
        groups[teamName] = { totalScore: 0, memberCount: 0 };
      }
      groups[teamName].memberCount += 1;
    });

    const list = Object.entries(groups).map(([teamName, item]) => {
      let score = 0;
      if (hasMaxRoundScoreConf) {
        score = Math.floor(activeTeamScores[teamName] || 0);
      } else {
        const members = resolvedTeamAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName && a.status !== "Bỏ thi";
        });
        members.forEach((memb) => {
          let eliminatedInRoundIdx: number | null = null;
          for (let i = 0; i < teamRoundResults.length; i++) {
            if (teamRoundResults[i].eliminatedTeams.includes(teamName)) {
              eliminatedInRoundIdx = i;
              break;
            }
          }
          const lastActiveRoundIdx = eliminatedInRoundIdx === null ? (activeTeamDistances.length - 1) : eliminatedInRoundIdx;
          if (activeTeamDistances.length > 0 && lastActiveRoundIdx >= 0) {
            for (let r = 0; r <= lastActiveRoundIdx; r++) {
              const d = activeTeamDistances[r];
              const hits = memb.scores[d.id] || [];
              const pointsSum = getPointsSum(hits, isTeamDirectMode);
              score += pointsSum * d.multiplier;
            }
          }
        });
      }

      return {
        teamName,
        totalScore: score,
        memberCount: item.memberCount,
      };
    });

    return list.sort((a, b) => {
      const rankA = teamRanks[a.teamName] || 999;
      const rankB = teamRanks[b.teamName] || 999;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.teamName.localeCompare(b.teamName, "vi");
    });
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults, teamRanks, activeTeamScores]);

  // 7. Aggregate cumulative stats matching the exact scoring layout
  const teamLeaderboardAllRoundData = useMemo(() => {
    const groups: Record<string, { totalScore: number; memberCount: number }> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    resolvedTeamAthletes.forEach((athlete) => {
      const rawTeam = athlete.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

      if (!groups[teamName]) {
        groups[teamName] = { totalScore: 0, memberCount: 0 };
      }
      groups[teamName].memberCount += 1;
    });

    const list = Object.entries(groups).map(([teamName, item]) => {
      let score = 0;
      if (hasMaxRoundScoreConf) {
        const members = resolvedTeamAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName && a.isPrimaryTeam && a.status !== "Bỏ thi";
        });

        let teamScoreSum = 0;
        members.forEach((memb) => {
          let memberMaxScore = -1;
          activeTeamDistances.forEach((dist, rIdx) => {
            const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
            if (isQualified) {
              const hits = memb.scores[dist.id] || [];
              const pointsSum = getPointsSum(hits, isTeamDirectMode);
              const scoreVal = pointsSum * dist.multiplier;
              if (scoreVal > memberMaxScore) {
                memberMaxScore = scoreVal;
              }
            }
          });
          teamScoreSum += memberMaxScore >= 0 ? memberMaxScore : 0;
        });
        score = teamScoreSum;
      } else {
        const members = resolvedTeamAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName;
        });
        members.forEach((memb) => {
          activeTeamDistances.forEach((d) => {
            const hits = memb.scores[d.id] || [];
            const pointsSum = getPointsSum(hits, isTeamDirectMode);
            score += pointsSum * d.multiplier;
          });
        });
      }

      return {
        teamName,
        totalScore: score,
        memberCount: item.memberCount,
      };
    });

    return list.sort((a, b) => {
      const rankA = teamRanksAllRound[a.teamName] || 999;
      const rankB = teamRanksAllRound[b.teamName] || 999;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.teamName.localeCompare(b.teamName, "vi");
    });
  }, [resolvedTeamAthletes, activeTeamDistances, teamRanksAllRound, teamRoundResults]);

  const top3SurvivalTeams = useMemo(() => {
    const list = [...teamLeaderboardSurvivalData];
    while (list.length < 3) {
      list.push({
        teamName: "Chưa Có Đội",
        totalScore: 0,
        memberCount: 0,
      });
    }
    return list.slice(0, 3);
  }, [teamLeaderboardSurvivalData]);

  const top3AllRoundTeams = useMemo(() => {
    const list = [...teamLeaderboardAllRoundData];
    while (list.length < 3) {
      list.push({
        teamName: "Chưa Có Đội",
        totalScore: 0,
        memberCount: 0,
      });
    }
    return list.slice(0, 3);
  }, [teamLeaderboardAllRoundData]);

  const getTeamRank = (teamName?: string) => {
    if (!teamName || teamName === "Chưa Có Đội") return undefined;
    return dashboardTab === "survival" ? teamRanks[teamName] : teamRanksAllRound[teamName];
  };

  const formatRankLabel = (rank?: number) => {
    if (!rank) return "";
    if (rank === 1) return "Quán Quân";
    if (rank === 2) return "Hạng Nhì";
    if (rank === 3) return "Hạng Ba";
    return `Hạng ${rank}`;
  };

  // Dynamically resolve target data based on actual select
  const currentTop3Athletes = dashboardTab === "survival" ? top3SurvivalAthletes : top3AllRoundAthletes;
  const currentTop3Teams = dashboardTab === "survival" ? top3SurvivalTeams : top3AllRoundTeams;

  const currentRankedList = dashboardTab === "survival" ? rankedSurvivalAthletes : rankedAllRoundAthletes;

  const slicedTopAthletes = useMemo(() => {
    const rawList = currentRankedList.slice(0, topXCount);
    return rawList.map(ath => ({
      ...ath,
      displayScore: dashboardTab === "survival" ? ath.survivalScore : ath.totalScore,
      displayAccuracy: dashboardTab === "survival" ? ath.survivalAccuracy : ath.accuracy,
    }));
  }, [currentRankedList, topXCount, dashboardTab]);

  const pagedAthletes = useMemo(() => {
    if (topXCount <= 25) {
      return slicedTopAthletes;
    }
    const startIdx = (currentPage - 1) * 25;
    return slicedTopAthletes.slice(startIdx, startIdx + 25);
  }, [slicedTopAthletes, currentPage, topXCount]);

  const totalPages = topXCount <= 25 ? 1 : Math.ceil(slicedTopAthletes.length / 25);

  // General Highlights
  const dashboardHighlights = useMemo(() => {
    const totals = processedAthletes.reduce(
      (acc, curr) => {
        acc.score += curr.totalScore;
        acc.hits += curr.totalHits;
        acc.shots += curr.totalPossibleShots;
        return acc;
      },
      { score: 0, hits: 0, shots: 0 }
    );

    const winner = processedAthletes.length > 0 
      ? [...processedAthletes].sort((a, b) => b.totalScore - a.totalScore)[0]
      : null;

    const avgAccuracy = totals.shots > 0 ? (totals.hits / totals.shots) * 100 : 0;

    return {
      totalMatchScore: totals.score,
      totalHits: totals.hits,
      avgAccuracy,
      highestScorer: winner && winner.totalScore > 0 ? winner : null,
      activeClubsCount: teamStats.filter((t) => t.teamName !== "VĐV Tự Do" && t.totalScore > 0).length,
    };
  }, [processedAthletes, teamStats]);

  // Calculate unique clubs count registered in Danh sách VĐV
  const registeredClubsCount = useMemo(() => {
    const list = masterAthletes || [];
    if (list.length === 0) {
      return teamStats.filter((t) => t.teamName !== "VĐV Tự Do" && t.teamName !== "VĐV Tự Do (Không Đội)").length;
    }
    const uniqueClubs = new Set<string>();
    list.forEach((m) => {
      const rawTeam = (m.team || "").trim();
      if (
        rawTeam !== "" && 
        rawTeam.toLowerCase() !== "tự do" && 
        rawTeam.toLowerCase() !== "vdv tự do" && 
        rawTeam.toLowerCase() !== "vđv tự do (không đội)"
      ) {
        uniqueClubs.add(rawTeam);
      }
    });
    return uniqueClubs.size;
  }, [masterAthletes, teamStats]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn" id="vsc-main-dashboard">
      
      {/* Overview Stats highlight bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Item 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-xl">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Kỷ Lục Điểm</span>
            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block">
              {dashboardHighlights.highestScorer ? `${dashboardHighlights.highestScorer.totalScore}đ` : "0đ"}
            </span>
            <span className="text-[10px] text-slate-500 truncate block max-w-[120px]">
              {dashboardHighlights.highestScorer ? dashboardHighlights.highestScorer.name : "Chưa lập"}
            </span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="bg-indigo-100 dark:bg-indigo-950/40 p-2.5 rounded-xl">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Cơ Sở CLB</span>
            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block">
              {registeredClubsCount} CLB
            </span>
            <span className="text-[10px] text-slate-500 block">Tham gia giải đấu</span>
          </div>
        </div>

        {/* Item 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="bg-emerald-100 dark:bg-emerald-950/40 p-2.5 rounded-xl">
            <Target className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Độ Chính Xác</span>
            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block">
              {dashboardHighlights.avgAccuracy.toFixed(1)}% Acc
            </span>
            <span className="text-[10px] text-slate-500 block">Toàn giải thi đấu</span>
          </div>
        </div>

        {/* Item 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="bg-rose-100 dark:bg-rose-950/40 p-2.5 rounded-xl">
            <Users className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Sĩ Số Đấu Thủ</span>
            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block">
              {masterAthletes && masterAthletes.length > 0 ? masterAthletes.length : athletes.length} VĐV
            </span>
            <span className="text-[10px] text-slate-500 block">Đã đăng ký thi đấu</span>
          </div>
        </div>
      </div>

      {/* Tab Selector Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl">
        <span className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider px-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-100" />
          Khu Vực Bảng Vàng Danh Dự:
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onExportClick && (
            <button
              type="button"
              onClick={onExportClick}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-750 hover:to-indigo-750 text-white text-xs sm:text-sm font-black uppercase rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-indigo-700/10"
              id="btn-export-poster-dashboard"
            >
              <Share2 className="w-4 h-4" />
              Xuất Ảnh
            </button>
          )}
          {onLiveBoardClick && (
            <button
              type="button"
              onClick={onLiveBoardClick}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-650 to-teal-700 hover:from-emerald-755 hover:to-teal-805 text-white text-xs sm:text-sm font-black uppercase rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-teal-700/10"
              id="btn-liveboard-dashboard"
            >
              <Tv className="w-4 h-4" />
              LIVE BOARD
            </button>
          )}
          {onTimerClick && (
            <button
              type="button"
              onClick={onTimerClick}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs sm:text-sm font-black uppercase rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-amber-600/20"
              id="btn-timer-dashboard"
            >
              <Clock className="w-4 h-4" />
              THỜI GIAN
            </button>
          )}
          <button
            type="button"
            onClick={() => setDashboardTab("survival")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-xs ${
              dashboardTab === "survival"
                ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-indigo-700 shadow-md transform scale-102"
                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-50"
            }`}
          >
            <Shield className="w-4 h-4" />
            Bảng Xếp Hạng Hiện Tại
          </button>
          <button
            type="button"
            onClick={() => setDashboardTab("allRound")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-xs ${
              dashboardTab === "allRound"
                ? "bg-gradient-to-r from-amber-500 to-amber-655 text-white border-amber-600 shadow-md transform scale-102"
                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-50"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Toàn Giải (Cộng dồn)
          </button>
        </div>
      </div>

      {/* Podiums Side-by-side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        
        {/* Left Card: Bảng Vàng Cá Nhân (Top 3 Individuals Podium) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-100 animate-pulse" />
              {dashboardTab === "survival" 
                ? "Bảng Vàng Cá Nhân - Trụ Lại Cuối Cùng" 
                : "Bảng Vàng Cá Nhân - Toàn Giải"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {dashboardTab === "survival"
                ? "Top 3 VĐV còn trụ lại lâu nhất qua các vòng thi đấu loại của giải."
                : "Top 3 danh thủ sở hữu tổng điểm gộp cao nhất của cả giải đấu."}
            </p>
          </div>

          {/* 3D Athlete Podium UI representation */}
          <div className="mt-8 flex items-end justify-center select-none pt-6 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-950/10 rounded-2xl pb-2 px-2 border border-dashed border-gray-100/50 min-h-[280px]">
            {/* 2nd PLACE INDIVIDUAL - SILVER PODIUM (LEFT) */}
            <div className="flex flex-col items-center flex-1 max-w-[130px] z-10">
              {/* Profile & Avatar */}
              <div className="text-center mb-1.5 px-1 flex flex-col items-center w-full">
                <div className="relative">
                  <img
                    src={resolveAthleteAvatar(currentTop3Athletes[1])}
                    alt={currentTop3Athletes[1].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-300 shadow-sm bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -top-1.5 -right-1.5 bg-slate-200 text-slate-800 rounded-full w-5 h-5 flex items-center justify-center border border-white text-[10px] font-black font-sans shadow-sm">
                    {currentTop3Athletes[1].dashboardRank}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate leading-tight mt-1.5 w-full text-center" title={currentTop3Athletes[1].name}>
                  {currentTop3Athletes[1].name}
                </span>
                <span className="text-[10px] text-gray-400 block truncate leading-none mt-0.5 max-w-[100px] text-center" title={currentTop3Athletes[1].team}>
                  {currentTop3Athletes[1].team || "Tự Do"}
                </span>
                <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 block mt-1">
                  {currentTop3Athletes[1].displayScore} đ
                </span>
              </div>
              {/* Podium Column Box */}
              <div className="w-full bg-gradient-to-t from-slate-250 via-slate-150 to-slate-100/90 dark:from-slate-800 dark:to-slate-700/80 border-t-2 border-slate-300 h-24 rounded-t-xl shadow-lg flex items-center justify-center relative">
                <span className="font-black text-5xl font-mono text-slate-400/30">{currentTop3Athletes[1].dashboardRank}</span>
                <span className="absolute bottom-2 text-[10px] font-black uppercase text-slate-500">{formatRankLabel(currentTop3Athletes[1].dashboardRank)}</span>
              </div>
            </div>

            {/* 1st PLACE INDIVIDUAL - GOLD PODIUM (CENTER, TALLEST) */}
            <div className="flex flex-col items-center flex-1 max-w-[155px] z-20 -mx-1">
              {/* Profile & Avatar */}
              <div className="text-center mb-3 px-1 flex flex-col items-center w-full">
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-500 drop-shadow-sm scale-110">👑</div>
                  <img
                    src={resolveAthleteAvatar(currentTop3Athletes[0])}
                    alt={currentTop3Athletes[0].name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-amber-400 shadow-md bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 rounded-full w-6 h-6 flex items-center justify-center border border-white text-xs font-black font-sans shadow-md">
                    {currentTop3Athletes[0].dashboardRank}
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 block truncate leading-tight tracking-tight mt-2 w-full text-center" title={currentTop3Athletes[0].name}>
                  {currentTop3Athletes[0].name}
                </span>
                <span className="text-[10px] text-gray-400 block truncate leading-none mt-0.5 max-w-[120px] text-center" title={currentTop3Athletes[0].team}>
                  {currentTop3Athletes[0].team || "Tự Do"}
                </span>
                <span className="font-mono text-sm font-extrabold text-amber-600 block leading-tight mt-1">
                  {currentTop3Athletes[0].displayScore} đ
                </span>
              </div>
              {/* Podium Column Box */}
              <div className="w-full bg-gradient-to-t from-amber-400/90 via-amber-300/85 to-amber-200/90 border-t-4 border-amber-400 h-36 rounded-t-2xl shadow-xl flex items-center justify-center relative ring-4 ring-amber-500/10">
                <span className="font-black text-6xl font-mono text-amber-600/40">{currentTop3Athletes[0].dashboardRank}</span>
                <span className="absolute bottom-2 text-[10px] sm:text-xs font-black uppercase text-amber-700 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" /> {formatRankLabel(currentTop3Athletes[0].dashboardRank)} <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                </span>
              </div>
            </div>

            {/* 3rd PLACE INDIVIDUAL - BRONZE PODIUM (RIGHT, SHORTEST) */}
            <div className="flex flex-col items-center flex-1 max-w-[130px] z-10">
              {/* Profile & Avatar */}
              <div className="text-center mb-1 px-1 flex flex-col items-center w-full">
                <div className="relative">
                  <img
                    src={resolveAthleteAvatar(currentTop3Athletes[2])}
                    alt={currentTop3Athletes[2].name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-amber-700/50 shadow-sm bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -top-1.5 -right-1.5 bg-amber-700 text-white rounded-full w-5 h-5 flex items-center justify-center border border-white text-[10px] font-black font-sans shadow-sm">
                    {currentTop3Athletes[2].dashboardRank}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate leading-tight mt-1.5 w-full text-center" title={currentTop3Athletes[2].name}>
                  {currentTop3Athletes[2].name}
                </span>
                <span className="text-[10px] text-gray-400 block truncate leading-none mt-0.5 max-w-[100px] text-center" title={currentTop3Athletes[2].team}>
                  {currentTop3Athletes[2].team || "Tự Do"}
                </span>
                <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 block mt-1">
                  {currentTop3Athletes[2].displayScore} đ
                </span>
              </div>
              {/* Podium Column Box */}
              <div className="w-full bg-gradient-to-t from-amber-800/15 via-amber-700/10 to-amber-600/10 dark:from-slate-850 dark:to-slate-800/80 border-t-2 border-amber-700/30 h-16 rounded-t-xl shadow-lg flex items-center justify-center relative">
                <span className="font-black text-4xl font-mono text-amber-700/20">{currentTop3Athletes[2].dashboardRank}</span>
                <span className="absolute bottom-2 text-[10px] font-black uppercase text-amber-800/60 font-sans">{formatRankLabel(currentTop3Athletes[2].dashboardRank)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-[10px] text-gray-400 italic block">
              {dashboardTab === "survival"
                ? "Danh hiệu cá nhân vinh danh các tuyển thủ kiên trì đồng hành qua các vòng đấu tiếp theo."
                : "Danh hiệu cá nhân tôn vinh tuyển thủ có tổng điểm thành tích cao nhất xuyên suốt các vòng đấu."}
            </span>
          </div>
        </div>

        {/* Right Card: Bảng Vàng Đồng Đội (Top 3 Teams Podium) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              {dashboardTab === "survival" 
                ? "Bảng Vàng Đồng Đội - Trụ Lại Cuối Cùng" 
                : "Bảng Vàng Đồng Đội - Toàn Giải"}
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              {dashboardTab === "survival"
                ? "Top 3 đại diện Tập Thể dựa trên thành tích Trụ Lại Cuối Cùng của đội hình Bắn chính."
                : "Top 3 đại diện Tập Thể sở hữu tổng điểm gộp cao nhất của cả giải đấu."}
            </p>
          </div>

          {/* 3D Physical Podium UI representation */}
          {(() => {
            const firstLogo = getClubLogo(currentTop3Teams[0]?.teamName);
            const secondLogo = getClubLogo(currentTop3Teams[1]?.teamName);
            const thirdLogo = getClubLogo(currentTop3Teams[2]?.teamName);

            const firstRank = getTeamRank(currentTop3Teams[0]?.teamName) || 1;
            const secondRank = getTeamRank(currentTop3Teams[1]?.teamName) || 2;
            const thirdRank = getTeamRank(currentTop3Teams[2]?.teamName) || 3;

            return (
              <div className="mt-8 flex items-end justify-center select-none pt-4 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-950/10 rounded-2xl pb-2 px-2 border border-dashed border-gray-100/50 min-h-[280px]">
                {/* 2nd PLACE TEAM - SILVER PODIUM (LEFT) */}
                <div className="flex flex-col items-center flex-1 max-w-[130px] z-10">
                  {/* Cup & Team details */}
                  <div className="text-center mb-1.5 px-1 w-full flex flex-col items-center">
                    {secondLogo ? (
                      <div className="relative mb-1">
                        <img
                          src={secondLogo}
                          alt={currentTop3Teams[1].teamName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-300 ring-2 ring-slate-200 dark:ring-slate-800 shadow-sm mx-auto transition-transform duration-300 hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-slate-200 border border-slate-300 rounded-full w-5 h-5 flex items-center justify-center shadow-xs">
                          <Medal className="w-3 h-3 text-slate-650 fill-slate-100" />
                        </div>
                      </div>
                    ) : (
                      <Medal className="w-7 h-7 text-slate-300 fill-slate-100 mx-auto drop-shadow-sm animate-bounce duration-1000" />
                    )}
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate leading-tight mt-1.5 w-full text-center" title={currentTop3Teams[1].teamName}>
                      {currentTop3Teams[1].teamName}
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block leading-tight mt-1">
                      {currentTop3Teams[1].totalScore} đ
                    </span>
                  </div>
                  {/* Podium Column Box */}
                  <div className="w-full bg-gradient-to-t from-slate-200 via-slate-150 to-slate-100/90 dark:from-slate-800 dark:to-slate-700/80 border-t-2 border-slate-300 h-24 rounded-t-xl shadow-lg flex items-center justify-center relative">
                    <span className="font-black text-5xl font-mono text-slate-400/30">{secondRank}</span>
                    <span className="absolute bottom-2 text-[10px] font-black uppercase text-slate-500">{formatRankLabel(secondRank)}</span>
                  </div>
                </div>

                {/* 1st PLACE TEAM - GOLD PODIUM (CENTER, TALLEST) */}
                <div className="flex flex-col items-center flex-1 max-w-[150px] z-20 -mx-1">
                  {/* Cup & Team details */}
                  <div className="text-center mb-3 px-1 w-full flex flex-col items-center">
                    {firstLogo ? (
                      <div className="relative mb-1">
                        <img
                          src={firstLogo}
                          alt={currentTop3Teams[0].teamName}
                          className="w-16 h-16 rounded-full object-cover border-4 border-amber-400 ring-4 ring-amber-300/30 shadow-md mx-auto transition-transform duration-300 hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-amber-400 border border-amber-500 rounded-full w-6 h-6 flex items-center justify-center shadow-xs animate-pulse">
                          <Trophy className="w-3.5 h-3.5 text-amber-950 fill-amber-100" />
                        </div>
                      </div>
                    ) : (
                      <Trophy className="w-10 h-10 text-amber-500 fill-amber-100 mx-auto drop-shadow-md animate-bounce" />
                    )}
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 block truncate leading-tight tracking-tight mt-1.5 w-full text-center" title={currentTop3Teams[0].teamName}>
                      {currentTop3Teams[0].teamName}
                    </span>
                    <span className="font-mono text-sm font-extrabold text-amber-600 block leading-tight mt-1">
                      {currentTop3Teams[0].totalScore} đ
                    </span>
                  </div>
                  {/* Podium Column Box */}
                  <div className="w-full bg-gradient-to-t from-amber-400/90 via-amber-300/85 to-amber-200/90 border-t-4 border-amber-400 h-36 rounded-t-2.5xl shadow-xl flex items-center justify-center relative ring-4 ring-amber-500/10">
                    <span className="font-black text-6xl font-mono text-amber-600/40">{firstRank}</span>
                    <span className="absolute bottom-2 text-xs font-black uppercase text-amber-700 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" /> {formatRankLabel(firstRank)} <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                    </span>
                  </div>
                </div>

                {/* 3rd PLACE TEAM - BRONZE PODIUM (RIGHT, SHORTEST) */}
                <div className="flex flex-col items-center flex-1 max-w-[130px] z-10">
                  {/* Cup & Team details */}
                  <div className="text-center mb-1 px-1 w-full flex flex-col items-center">
                    {thirdLogo ? (
                      <div className="relative mb-1">
                        <img
                          src={thirdLogo}
                          alt={currentTop3Teams[2].teamName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-amber-700/50 ring-2 ring-amber-600/20 shadow-sm mx-auto transition-transform duration-300 hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-amber-700/80 border border-amber-800/80 rounded-full w-5 h-5 flex items-center justify-center shadow-xs">
                          <Award className="w-3 h-3 text-orange-100 fill-orange-200" />
                        </div>
                      </div>
                    ) : (
                      <Award className="w-6 h-6 text-amber-700/80 fill-orange-50 mx-auto drop-shadow-sm animate-bounce duration-1500" />
                    )}
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate leading-tight mt-1.5 w-full text-center" title={currentTop3Teams[2].teamName}>
                      {currentTop3Teams[2].teamName}
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block leading-tight mt-1">
                      {currentTop3Teams[2].totalScore} đ
                    </span>
                  </div>
                  {/* Podium Column Box */}
                  <div className="w-full bg-gradient-to-t from-amber-800/15 via-amber-700/10 to-amber-600/10 dark:from-slate-850 dark:to-slate-800/80 border-t-2 border-amber-700/30 h-16 rounded-t-xl shadow-lg flex items-center justify-center relative">
                    <span className="font-black text-4xl font-mono text-amber-700/20">{thirdRank}</span>
                    <span className="absolute bottom-2 text-[10px] font-black uppercase text-amber-800/60 font-sans">{formatRankLabel(thirdRank)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mt-4 text-center">
            <span className="text-[10px] text-gray-400 italic block">
              {dashboardTab === "survival"
                ? "Thành tích chỉ cộng tích luỹ điểm từ các đấu thủ được tick bắn chính thức thuộc mỗi đội hình Trụ Lại Cuối Cùng."
                : "Thành tích chỉ cộng tích luỹ điểm từ các đấu thủ thuộc mỗi đội hình Toàn Giải."}
            </span>
          </div>
        </div>

      </div>

      {/* Roster Container: DANH SÁCH TOP X */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col mt-6">
          
        {/* Header controls select TOP X */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b border-gray-100 dark:border-slate-800 gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Star className="w-5 h-5 text-amber-500 fill-amber-100" />
              Danh Sách TOP {topXCount} - {dashboardTab === "survival" ? "Trụ Lại Cuối Cùng" : "Toàn Giải"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {dashboardTab === "survival" 
                ? "Xếp hạng dựa trên thành tích kiên cường trụ lại và tồn tại cao nhất qua các vòng loại." 
                : "Xếp hạng dựa trên tổng điểm luỹ kế tích luỹ từ đầu giải đấu đến hiện tại."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              {[3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTopXCount(num)}
                  className={`px-3 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                    topXCount === num
                      ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  TOP {num}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Tự nhập:</span>
              <input
                type="number"
                min="1"
                max="500"
                value={topXCount === 0 ? "" : topXCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    setTopXCount(val);
                  } else if (e.target.value === "") {
                    setTopXCount(0);
                  }
                }}
                onBlur={() => {
                  if (topXCount <= 0) {
                    setTopXCount(10);
                  }
                }}
                className="w-12 text-center text-xs font-black bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded p-0.5 text-blue-600 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Roster list */}
        <div className="flex-1 mt-4 flex flex-col gap-2.5">
            {pagedAthletes.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border border-dashed border-gray-150 rounded-2xl">
                Không tìm thấy xạ thủ nào đang tranh giải.
              </div>
            ) : (
              pagedAthletes.map((athlete, index) => {
                const rank = athlete.status === "Bỏ thi" ? "-" : (athlete as any).dashboardRank || ((currentPage - 1) * 10 + index + 1);
                const hasScore = athlete.displayScore > 0;
                
                return (
                  <div 
                    key={`${athlete.id || 'ath'}-${index}`}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white hover:bg-slate-50/50 transition-colors shadow-sm gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank indicators */}
                      <span className={`w-6 h-6 text-xs font-black font-sans rounded-full flex items-center justify-center shrink-0 ${
                        rank === 1 && hasScore
                          ? "bg-amber-500 text-white"
                          : rank === 2 && hasScore
                            ? "bg-slate-300 text-slate-800"
                            : rank === 3 && hasScore
                              ? "bg-amber-700 text-white"
                              : "bg-slate-100 text-slate-500"
                      }`}>
                        {rank}
                      </span>

                      {/* Avatar */}
                      <img
                        src={resolveAthleteAvatar(athlete)}
                        alt={athlete.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />

                      {/* Info */}
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 block truncate leading-tight">
                          {athlete.name}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-400 mt-0.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-650">
                            VSC: {getCleanVscNumber(athlete.vscNumber, athlete.id)} {athlete.bibNumber && `| BIB: ${getCleanBibNumber(athlete.bibNumber, athlete.id)}`}
                          </span>
                          {athlete.team && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold max-w-[100px] truncate" title={athlete.team}>{athlete.team}</span>
                          )}
                          {athlete.isPrimaryTeam && (
                            <span className="px-1 text-[8.5px] font-extrabold uppercase bg-emerald-50 text-emerald-700 rounded border border-emerald-200 shadow-xs shrink-0 select-none">
                              Bắn chính
                            </span>
                          )}
                          {dashboardTab === "survival" && (
                            <span className="px-1 text-[8.5px] font-extrabold uppercase bg-indigo-50 text-indigo-700 rounded border border-indigo-200 shrink-0">
                              Vòng sống sót: {athlete.survivalVal === distances.length ? "Toàn bộ" : `${athlete.survivalVal}`} {athlete.survivalVal < distances.length && distances[athlete.survivalVal] ? `(Loại ở ${distances[athlete.survivalVal].distance}m)` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score detail block */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 font-bold block leading-none font-sans uppercase">Độ Trúng</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 block leading-tight">
                          {athlete.displayAccuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100/50 text-right min-w-[70px]">
                        <span className="text-[8px] text-blue-500 font-black block leading-none font-sans uppercase tracking-wider">
                          {hasMaxRoundScoreConf ? "ĐIỂM CAO NHẤT" : "Điểm Hiện Tại"}
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-blue-700 dark:text-blue-400 block leading-none mt-1">
                          {athlete.displayScore}
                        </span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-100/50 text-right min-w-[70px]">
                        <span className="text-[8px] text-amber-600 dark:text-amber-500 font-black block leading-none font-sans uppercase tracking-wider">Tổng Cộng</span>
                        <span className="text-sm sm:text-base font-black font-mono text-amber-700 dark:text-amber-400 block leading-none mt-1">
                          {athlete.totalScore}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all border border-slate-250 dark:border-slate-700 cursor-pointer"
            >
              Trước
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const isFirst = page === 1;
              const isLast = page === totalPages;
              const isNear = Math.abs(page - currentPage) <= 1;
              
              if (!isFirst && !isLast && !isNear) {
                if (page === 2 || page === totalPages - 1) {
                  return <span key={`dots-${page}`} className="px-1 text-xs text-gray-400 font-bold select-none">...</span>;
                }
                return null;
              }
              
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-blue-600 dark:bg-blue-700 text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all border border-slate-250 dark:border-slate-700 cursor-pointer"
            >
              Tiếp
            </button>
          </div>
        )}

        {/* Active Tournament Sponsors Banner */}
        {sponsors && sponsors.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-150 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-mono">
                NHÀ TÀI TRỢ CHÍNH THỨC ĐỒNG HÀNH CÙNG GIẢI ĐẤU
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                VSC Official Tournament Sponsors
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 py-2">
              {sponsors.map((sp) => (
                <a
                  key={sp.id}
                  href={sp.website || "#"}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 bg-slate-50 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 px-4 py-2.5 rounded-2xl transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-slate-800 p-0.5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
                    {sp.logo ? (
                      <img
                        src={sp.logo}
                        alt={sp.name}
                        className="w-full h-full object-contain filter dark:brightness-95"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Trophy className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-[10px] text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-none mb-0.5">
                      {sp.name}
                    </span>
                    <span className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                      Nhà Tài Trợ {sp.tier === "gold" ? "Vàng" : sp.tier === "silver" ? "Bạc" : "Đồng"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-bold block text-center uppercase tracking-wide">
          CÂU LẠC BỘ BẮN NÁ CAO SU VIỆT NAM (VSC / Vietnam.Slingshot)
        </div>

      </div>

      </div>
    );
  };
