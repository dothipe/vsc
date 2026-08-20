import React, { useState, useMemo } from "react";
import { Athlete, DistanceConfig } from "../../types";
import { Trophy, Medal, Award, Star, CheckCircle, Lock, Building, Users, Sparkles, RefreshCw } from "lucide-react";
import { getCleanBibNumber, isNoTeam } from "../../utils/athleteUtils";
import { calculateRounds, getHitCount } from "../../utils/qualification";

interface SummaryPublishStageProps {
  athletes: Athlete[];
  teamAthletes: Athlete[];
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  currentTournamentDoc: any;
  competitionMode: "individual" | "team";
  userRole: string;
  workflowStage: string;
  handlePublishResults: (customIndPodium?: any[], customTeamPodium?: any[]) => void;
  handleArchiveTournament: (customIndPodium?: any[], customTeamPodium?: any[]) => void;
  handleTransitionTo: (stage: any) => void;
  addAuditLog: (action: string, details: string) => void;
}

export const SummaryPublishStage: React.FC<SummaryPublishStageProps> = ({
  athletes,
  teamAthletes,
  distances,
  teamDistances,
  currentTournamentDoc,
  competitionMode,
  userRole,
  workflowStage,
  handlePublishResults,
  handleArchiveTournament,
  handleTransitionTo,
  addAuditLog,
}) => {
  const [activeRankingTab, setActiveRankingTab] = useState<"survival" | "allRound">("survival");

  // -------------------------------------------------------------
  // EXACT COPIED LOGIC FROM MainDashboard.tsx TO GUARANTEE 100% MATCH
  // -------------------------------------------------------------
  const shotsCount = currentTournamentDoc?.shotsCount || 10;
  const directMaxPoints = currentTournamentDoc?.directMaxPoints;
  const directMaxShots = currentTournamentDoc?.directMaxShots;

  const teamShotsCount = currentTournamentDoc?.teamShotsCount !== undefined ? currentTournamentDoc.teamShotsCount : shotsCount;
  const teamDirectMaxPoints = currentTournamentDoc?.teamDirectMaxPoints;
  const teamDirectMaxShots = currentTournamentDoc?.teamDirectMaxShots;

  const isDirectMode = shotsCount === 1;
  const isTeamDirectMode = teamShotsCount === 1;

  const effectiveShotsCount = isDirectMode ? (directMaxShots || 10) : shotsCount;
  const effectiveTeamShotsCount = isTeamDirectMode ? (teamDirectMaxShots || 10) : teamShotsCount;

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

  // -------------------------------------------------------------
  // INDIVIDUAL ATHLETE SURVIVAL MATH MATCHING OVERVIEW TAB EXACTLY
  // -------------------------------------------------------------
  const athleteSurvivalInfo = useMemo(() => {
    const roundResults = calculateRounds(athletes || [], distances || [], effectiveShotsCount, directMaxPoints, directMaxShots);
    
    return (athletes || []).map((athlete) => {
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

      const hasMaxRoundScoreConf = (distances || []).some(d => d.isMaxRoundScore);

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
  }, [athletes, distances, effectiveShotsCount, isDirectMode, directMaxPoints, directMaxShots]);

  const sortedSurvivalAthletes = useMemo(() => {
    return [...athleteSurvivalInfo].sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";
      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;

      if (b.survivalVal !== a.survivalVal) {
        return b.survivalVal - a.survivalVal;
      }
      if (b.survivalScoreWithSolo !== a.survivalScoreWithSolo) {
        return b.survivalScoreWithSolo - a.survivalScoreWithSolo;
      }
      if (b.survivalScore !== a.survivalScore) {
        return b.survivalScore - a.survivalScore;
      }
      if (b.survivalSoloHits !== a.survivalSoloHits) {
        return b.survivalSoloHits - a.survivalSoloHits;
      }
      if (b.survivalAccuracy !== a.survivalAccuracy) {
        return b.survivalAccuracy - a.survivalAccuracy;
      }
      return a.name.localeCompare(b.name, "vi");
    });
  }, [athleteSurvivalInfo]);

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

  const rankedSurvivalAthletes = useMemo(() => {
    return sortedSurvivalAthletes.map((athlete, idx) => {
      let betterCount = 0;
      for (let j = 0; j < idx; j++) {
        const other = sortedSurvivalAthletes[j];
        if (other.status === "Bỏ thi") continue;
        if (athlete.status === "Bỏ thi") continue;

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


  // -------------------------------------------------------------
  // TEAM LEADERBOARD MATH MATCHING OVERVIEW TAB EXACTLY
  // -------------------------------------------------------------
  const resolvedTeamAthletes = useMemo(() => {
    const source = teamAthletes || athletes;
    return (source || []).filter((a) => a.isPrimaryTeam);
  }, [teamAthletes, athletes]);

  const activeTeamDistances = teamDistances || distances;
  const activeTeamShotsCount = effectiveTeamShotsCount;

  const teamRoundResults = useMemo(() => {
    const results: any[] = [];
    const teamCumulativeScores: Record<string, number> = {};
    const teamCumulativeHits: Record<string, number> = {};

    const activeTeams = Array.from(new Set((resolvedTeamAthletes || []).map((a) => {
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

      const currentRoundTeams = Array.from(new Set((resolvedTeamAthletes || []).map((a) => {
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
  }, [resolvedTeamAthletes, activeTeamDistances, activeTeamShotsCount, isTeamDirectMode, teamDirectMaxPoints, teamDirectMaxShots]);

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
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults, isTeamDirectMode, teamDirectMaxPoints, teamDirectMaxShots]);

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
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults, isTeamDirectMode, teamDirectMaxPoints, teamDirectMaxShots]);

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
  }, [resolvedTeamAthletes, activeTeamDistances, teamRanksAllRound, teamRoundResults, isTeamDirectMode, teamDirectMaxPoints, teamDirectMaxShots]);

  // -------------------------------------------------------------
  // MAP DATA ACCORDING TO USER-SELECTED SCORING MODE (SURVIVAL VS ALL-ROUND)
  // -------------------------------------------------------------
  const individualRankings = useMemo(() => {
    const list = activeRankingTab === "survival" ? rankedSurvivalAthletes : rankedAllRoundAthletes;
    return list.map((ath) => ({
      id: ath.id,
      name: ath.name,
      team: ath.team,
      bibNumber: ath.bibNumber,
      totalScore: activeRankingTab === "survival" ? ath.survivalScore : ath.totalScore,
      allRoundTotalScore: ath.totalScore,
      accuracy: activeRankingTab === "survival" ? ath.survivalAccuracy : ath.accuracy,
      rank: ath.dashboardRank || 1,
    }));
  }, [activeRankingTab, rankedSurvivalAthletes, rankedAllRoundAthletes]);

  const teamRankings = useMemo(() => {
    const list = activeRankingTab === "survival" ? teamLeaderboardSurvivalData : teamLeaderboardAllRoundData;
    return list.map((t, idx) => ({
      athleteId: `team-${idx}`,
      name: t.teamName,
      team: t.teamName,
      totalScore: t.totalScore,
      rank: idx + 1,
      athletesCount: t.memberCount,
    }));
  }, [activeRankingTab, teamLeaderboardSurvivalData, teamLeaderboardAllRoundData]);

  // Extract Top 3 for Individual Podium - STRICTLY SURVIVAL (TRỤ LẠI CUỐI CÙNG)
  const indPodium = useMemo(() => {
    return rankedSurvivalAthletes.slice(0, 3).map((ath, idx) => ({
      id: ath.id,
      athleteId: ath.id,
      name: ath.name,
      team: ath.team || "Tự Do",
      bibNumber: ath.bibNumber,
      totalScore: ath.survivalScore || 0,
      survivalScore: ath.survivalScore || 0,
      allRoundTotalScore: ath.totalScore || 0,
      accuracy: ath.survivalAccuracy || 0,
      scoresByDistance: ath.scores || {},
      rank: ath.dashboardRank || (idx + 1),
      originalAthlete: (ath as any).originalAthlete ? {
        id: (ath as any).originalAthlete.id,
        name: (ath as any).originalAthlete.name,
        team: (ath as any).originalAthlete.team,
        province: (ath as any).originalAthlete.province || "",
        avatarUrl: (ath as any).originalAthlete.avatarUrl || "",
        status: (ath as any).originalAthlete.status || "",
        masterAthleteId: (ath as any).originalAthlete.masterAthleteId || "",
        gender: (ath as any).originalAthlete.gender || "",
        birthYear: (ath as any).originalAthlete.birthYear || ""
      } : null
    }));
  }, [rankedSurvivalAthletes]);

  // Extract Top 3 for Team Podium - STRICTLY SURVIVAL (TRỤ LẠI CUỐI CÙNG)
  const teamPodium = useMemo(() => {
    return teamLeaderboardSurvivalData.slice(0, 3).map((t, idx) => ({
      athleteId: `team-${idx}`,
      name: t.teamName,
      team: t.teamName,
      totalScore: t.totalScore || 0,
      survivalScore: t.totalScore || 0,
      allRoundTotalScore: t.totalScore || 0,
      accuracy: 100,
      scoresByDistance: {},
      rank: idx + 1,
      athletesCount: t.memberCount,
      originalAthlete: null
    }));
  }, [teamLeaderboardSurvivalData]);

  // Extract Top 25 for Table Display
  const top25Athletes = useMemo(() => {
    return individualRankings.slice(0, 25);
  }, [individualRankings]);

  const getPodiumBg = (rank: number) => {
    switch (rank) {
      case 1: return "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800";
      case 2: return "bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700";
      case 3: return "bg-orange-50/70 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900";
      default: return "bg-slate-50 dark:bg-slate-900 border-slate-200";
    }
  };

  const getPodiumBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center bg-amber-500 text-white rounded-full p-2 shadow-sm w-10 h-10">
            <Trophy className="w-5 h-5" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center bg-slate-400 text-white rounded-full p-2 shadow-sm w-10 h-10">
            <Medal className="w-5 h-5" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center bg-amber-700 text-white rounded-full p-2 shadow-sm w-10 h-10">
            <Award className="w-5 h-5" />
          </div>
        );
      default:
        return null;
    }
  };

  const getPodiumTitle = (rank: number) => {
    switch (rank) {
      case 1: return "VÔ ĐỊCH (GOLD)";
      case 2: return "Á QUÂN I (SILVER)";
      case 3: return "Á QUÂN II (BRONZE)";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="summary-publish-stage">
      {/* 0. Header with exact scoring mode switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> BẢNG VÀNG TỔNG KẾT & CÔNG BỐ
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">
            Dữ liệu tính điểm được đồng bộ 100% với tab Tổng Quan (Overview) của giải đấu.
          </p>
        </div>
        <div className="flex bg-slate-200/60 dark:bg-slate-850 p-1 rounded-xl border border-slate-250 dark:border-slate-750 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveRankingTab("survival")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all cursor-pointer ${
              activeRankingTab === "survival"
                ? "bg-white dark:bg-slate-750 text-indigo-650 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-750"
            }`}
          >
            Trụ Lại (Survival)
          </button>
          <button
            onClick={() => setActiveRankingTab("allRound")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all cursor-pointer ${
              activeRankingTab === "allRound"
                ? "bg-white dark:bg-slate-750 text-indigo-650 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-750"
            }`}
          >
            Toàn Giải (All-Round)
          </button>
        </div>
      </div>

      {/* 1. Vinh Danh Podium Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Individual Podium */}
        <div className="bg-slate-50 dark:bg-slate-950/20 rounded-2xl p-5 border border-slate-150 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> bục vinh danh cá nhân (Trụ Lại Cuối Cùng - Survival)
            </h3>
            <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 px-2 py-0.5 rounded-full">
              Top 3 Xạ Thủ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {indPodium.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-xs text-slate-400 font-semibold">
                Chưa có kết quả cá nhân
              </div>
            ) : (
              indPodium.map((ath, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={ath.id || idx}
                    className={`rounded-xl border p-4 flex flex-col items-center text-center justify-between min-h-[160px] ${getPodiumBg(rank)}`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      {getPodiumBadge(rank)}
                      <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1">
                        {getPodiumTitle(rank)}
                      </span>
                    </div>

                    <div className="my-2">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                        {ath.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] mx-auto">
                        {ath.team || "Tự Do"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg px-2 py-1 w-full text-center">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {ath.totalScore} pts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Club / Team Podium */}
        <div className="bg-slate-50 dark:bg-slate-950/20 rounded-2xl p-5 border border-slate-150 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-500" /> bục vinh danh đồng đội / clb (Trụ Lại Cuối Cùng - Survival)
            </h3>
            <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 px-2 py-0.5 rounded-full">
              Top 3 Đơn Vị
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {teamPodium.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-xs text-slate-400 font-semibold">
                Chưa có kết quả đồng đội
              </div>
            ) : (
              teamPodium.map((team, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={team.athleteId || idx}
                    className={`rounded-xl border p-4 flex flex-col items-center text-center justify-between min-h-[160px] ${getPodiumBg(rank)}`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      {getPodiumBadge(rank)}
                      <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1">
                        {getPodiumTitle(rank)}
                      </span>
                    </div>

                    <div className="my-2">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                        {team.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {team.athletesCount ? `${team.athletesCount} VĐV` : "Đồng Đội"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg px-2 py-1 w-full text-center">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {team.totalScore} pts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Top 25 Leaders List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Star className="w-4 h-4 text-indigo-500" /> bảng vàng top 25 vđv toàn giải ({activeRankingTab === "survival" ? "survival" : "all-round"})
          </h3>
          <span className="text-[10px] text-slate-450 font-bold font-mono">
            Hiển thị tối đa 25 xạ thủ cao nhất
          </span>
        </div>

        <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/10 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-150 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">Hạng</th>
                  <th className="px-4 py-3">BIB</th>
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3">Câu Lạc Bộ</th>
                  <th className="px-4 py-3 text-right">Tổng Điểm</th>
                  <th className="px-4 py-3 text-right">Tổng Cộng</th>
                  <th className="px-4 py-3 text-center">Độ Chính Xác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {top25Athletes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      Chưa có dữ liệu xếp hạng tổng kết.
                    </td>
                  </tr>
                ) : (
                  top25Athletes.map((vdv, idx) => {
                    const rank = vdv.rank;
                    return (
                      <tr
                        key={vdv.id || idx}
                        className={`hover:bg-slate-50/55 dark:hover:bg-slate-850/50 transition-colors ${
                          rank <= 3 ? "bg-indigo-50/10 dark:bg-indigo-950/5 font-medium" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          {rank <= 3 ? (
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[10px] ${
                              rank === 1 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400" :
                              rank === 2 ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300" :
                              "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400"
                            }`}>
                              {rank}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-450 dark:text-slate-500 font-bold">
                              #{rank}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-450 font-bold">
                          {getCleanBibNumber(vdv.bibNumber, vdv.id)}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-slate-200">
                          {vdv.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                          {vdv.team || "Tự Do"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                          {vdv.totalScore || 0} pt
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          {vdv.allRoundTotalScore !== undefined ? Math.floor(vdv.allRoundTotalScore) : 0} pt
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(vdv.accuracy || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. BTC Operations Banner */}
      {userRole === "admin" && (
        <div className={`rounded-2xl p-5 border flex flex-col md:flex-row justify-between items-center gap-4 text-left ${
          workflowStage === "archived" 
            ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40" 
            : workflowStage === "published"
              ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40"
              : "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/40"
        }`}>
          <div className="space-y-1">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              workflowStage === "archived" 
                ? "text-rose-900 dark:text-rose-300" 
                : workflowStage === "published"
                  ? "text-emerald-900 dark:text-emerald-300"
                  : "text-indigo-900 dark:text-indigo-300"
            }`}>
              <Lock className="w-4.5 h-4.5 text-indigo-500 animate-pulse" /> 
              {workflowStage === "archived" 
                ? "GIẢI ĐẤU ĐÃ LƯU TRỮ VÀ ĐÓNG BĂNG VĨNH VIỄN" 
                : workflowStage === "published"
                  ? "BẢNG VÀNG KẾT QUẢ ĐÃ CÔNG BỐ"
                  : "QUẢN TRỊ TỔNG KẾT & CÔNG BỐ (ADMIN CONTROL)"}
            </h4>
            <p className="text-[11px] text-slate-650 dark:text-slate-400 max-w-2xl">
              {workflowStage === "archived" 
                ? "Toàn bộ dữ liệu của giải đấu hiện tại đã được khóa và lưu trữ bảo tàng lịch sử. Mọi quyền chỉnh sửa hoặc cập nhật điểm số đều đã bị đóng băng vĩnh viễn."
                : workflowStage === "published"
                  ? "Đã đồng bộ kết quả lên hệ thống Đại Sảnh Danh Vọng quốc gia và cập nhật hồ sơ thành tích cá nhân của các xạ thủ. Bạn vẫn có thể thực hiện lưu trữ đóng băng vĩnh viễn."
                  : "Xác nhận công bố kết quả chính thức hoặc thực hiện lưu trữ giải đấu vĩnh viễn vào Đại Sảnh Danh Vọng. Các xạ thủ đạt bục cá nhân sẽ tự động được ghi danh lịch sử."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto justify-end">
            {workflowStage !== "archived" && (
              <>
                <button
                  onClick={() => handleTransitionTo("competition")}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Trở Lại Thi Đấu
                </button>

                <button
                  onClick={() => handlePublishResults(indPodium, teamPodium)}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> {workflowStage === "published" ? "Cập Nhật Công Bố" : "Công Bố Kết Quả"}
                </button>

                <button
                  onClick={() => handleArchiveTournament(indPodium, teamPodium)}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-transparent dark:border-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Lưu Trữ Giải Đấu
                </button>
              </>
            )}

            {workflowStage === "archived" && (
              <span className="px-5 py-2.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-250 dark:border-rose-900 rounded-xl text-xs font-black flex items-center gap-1.5 select-none">
                <Lock className="w-3.5 h-3.5" /> ĐÃ ĐÓNG BĂNG DỮ LIỆU
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
