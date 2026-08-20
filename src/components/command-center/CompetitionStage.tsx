import React, { useMemo } from "react";
import { 
  User, 
  Users, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Target, 
  ArrowRight, 
  Check, 
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import { Athlete, DistanceConfig, HeatV3 } from "../../types";
import { getCleanBibNumber, getCleanVscNumber, isAthleteEliminatedInPrevStage, isNoTeam } from "../../utils/athleteUtils";
import { AssignmentEngine } from "../../engines/assignmentEngine";
import { getSoloRoundsFromDist } from "../../engines/rankingEngine";

const normalizeScoresToArr = (rawScores: any, length: number): any[] => {
  if (!rawScores) return Array(length).fill(null);
  if (Array.isArray(rawScores)) {
    const arr = [...rawScores];
    while (arr.length < length) arr.push(null);
    return arr.slice(0, length);
  }
  if (typeof rawScores === "object") {
    const arr = Array(length).fill(null);
    Object.keys(rawScores).forEach((k) => {
      const idx = Number(k);
      if (!isNaN(idx) && idx >= 0 && idx < length) {
        arr[idx] = rawScores[k];
      }
    });
    return arr;
  }
  return Array(length).fill(null);
};

interface CompetitionStageProps {
  activeTournamentFormat: "individual" | "team" | "mixed";
  localState: any;
  setLocalState: React.Dispatch<React.SetStateAction<any>>;
  competitionMode: "individual" | "team";
  setCompetitionMode?: React.Dispatch<React.SetStateAction<"individual" | "team">>;
  userRole: string;
  addAuditLog: (action: string, description: string) => void;
  showToast: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
  distances: DistanceConfig[];
  teamDistances?: DistanceConfig[];
  currentTournamentDoc: any;
  resolvedHeats: HeatV3[];
  teamAssignmentVersions: any[];
  setEditingAthlete: (athlete: any) => void;
  setEditAthleteFields: (fields: any) => void;
  activeShotsCountLimit: number;
  activeDistance: DistanceConfig | null;
  activeDistanceRankings: any[];
  activeSoloColumns: number[];
  activeDistanceQualification: any;
  leaderboardAthletes?: Athlete[];
  leaderboardTeamAthletes?: Athlete[];
  athletes: Athlete[];
  teamAthletes: Athlete[];
  hasAthleteShotInDist: (athleteId: string, distanceId: string) => boolean;
  onResetAthleteScore?: (athleteId: string, distanceId: string) => void;
  handleTransitionTo: (nextStage: any) => void;
  globalTimer?: any;
  dynamicSubStages: any[];
  activeAthletesList: Athlete[];
  getSoloIdxForHeat: (heatNumber: number) => number;
  handleRunQualification: () => void;
  nextSoloHeatInfo: { heatName: string };
  shotsCountLimit: number;
  getDisplayHeatLabel: (heatNumber: number, fallbackPrefix?: string) => string;
  getAthletesForHeat: (heatNum: number) => (Athlete | null)[];
}

export const CompetitionStage: React.FC<CompetitionStageProps> = ({
  activeTournamentFormat,
  localState,
  setLocalState,
  competitionMode,
  setCompetitionMode,
  userRole,
  addAuditLog,
  showToast,
  distances,
  teamDistances,
  currentTournamentDoc,
  resolvedHeats,
  teamAssignmentVersions,
  setEditingAthlete,
  setEditAthleteFields,
  activeShotsCountLimit,
  activeDistance,
  activeDistanceRankings,
  activeSoloColumns,
  activeDistanceQualification,
  leaderboardAthletes,
  leaderboardTeamAthletes,
  athletes,
  teamAthletes,
  hasAthleteShotInDist,
  onResetAthleteScore,
  handleTransitionTo,
  globalTimer,
  dynamicSubStages,
  activeAthletesList,
  getSoloIdxForHeat,
  handleRunQualification,
  nextSoloHeatInfo,
  shotsCountLimit,
  getDisplayHeatLabel,
  getAthletesForHeat,
}) => {
  const teamCutoffInfo = useMemo(() => {
    if (!activeDistance) return { isTeamBoundaryTied: false, teamPendingSolo: [], teamQualified: [], teamFinalEliminated: [], sortedTeams: [] };

    // 1. Calculate live team rankings
    const teamScores: Record<string, { teamName: string; totalScore: number; members: any[]; teamSoloScores: number[] }> = {};
    const activeTeamAthletes = activeAthletesList.filter(a => a && a.isPrimaryTeam === true && !isNoTeam(a.team || a.clubName || ""));
    
    activeTeamAthletes.forEach(ath => {
      if (ath.status === "Bỏ thi") return;
      const teamName = ath.team || "Không rõ Đội";
      
      let calculationDistances = [activeDistance];
      const isCumulativeActive = activeDistance?.isCumulative === true || String(activeDistance?.isCumulative) === "true";
      if (isCumulativeActive && teamDistances) {
        const targetStageIndex = localState.currentDistanceIndex;
        calculationDistances = teamDistances.slice(0, targetStageIndex + 1);
      }
      
      let totalPoints = 0;
      calculationDistances.forEach(dist => {
        if (!dist) return;
        const scoresObj = (ath.scores?.[dist.id] || {}) as any;
        const shotsList = Array.isArray(scoresObj) ? scoresObj : (scoresObj?.shots || []);
        shotsList.forEach((shot: any) => {
          if (shot === true || shot === 1 || String(shot) === "true") {
            totalPoints += (dist.multiplier || 1);
          } else if (typeof shot === "number") {
            totalPoints += shot * (dist.multiplier || 1);
          }
        });
      });

      // Get athlete's solo scores
      const soloRoundsArr = (() => {
        const targetDistConfig = (distances || []).find(d => d.id === activeDistance?.id) || 
                                  (teamDistances || []).find(d => d.id === activeDistance?.id) || 
                                  activeDistance;

        if (!ath || !targetDistConfig) return [];
        const rounds = getSoloRoundsFromDist(ath, targetDistConfig);
        if (rounds && rounds.length > 0) return rounds;

        const targetDistId = targetDistConfig.id || "";
        const directHitsVal = ath.soloHits?.[targetDistId];
        if (directHitsVal !== undefined && directHitsVal !== null) {
          return [Number(directHitsVal)];
        }

        return [];
      })();

      if (!teamScores[teamName]) {
        teamScores[teamName] = { teamName, totalScore: 0, members: [], teamSoloScores: [] };
      }
      teamScores[teamName].members.push({
        id: ath.id,
        name: ath.name,
        score: totalPoints,
        soloScores: soloRoundsArr
      });
    });

    Object.keys(teamScores).forEach(k => {
      const team = teamScores[k];
      team.totalScore = team.members.reduce((acc, m) => acc + m.score, 0);
      
      const clubSoloScores: number[] = [];
      activeSoloColumns.forEach(sIdx => {
        const sumSoloForColumn = team.members.reduce((acc, m) => {
          const val = m.soloScores[sIdx];
          return acc + (typeof val === "number" ? val : 0);
        }, 0);
        clubSoloScores.push(sumSoloForColumn);
      });
      team.teamSoloScores = clubSoloScores;
    });

    const sortedTeams = Object.values(teamScores).sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      for (let i = 0; i < activeSoloColumns.length; i++) {
        const scoreA = a.teamSoloScores[i] || 0;
        const scoreB = b.teamSoloScores[i] || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
      return 0;
    });

    const isTeamElim = activeDistance?.isElimination === true || String(activeDistance?.isElimination) === "true";
    let teamAdvancingCount = sortedTeams.length;

    if (isTeamElim) {
      const elimType = String(activeDistance.eliminationType).trim().toLowerCase();
      const elimVal = Number(activeDistance.eliminationValue);
      if (elimType === "count") {
        teamAdvancingCount = elimVal || 4;
      } else if (elimType === "percent" || elimType === "percentage") {
        const pct = elimVal || 50;
        teamAdvancingCount = Math.max(1, Math.round((sortedTeams.length * pct) / 100));
      }
    }

    const teamRuleObj = (currentTournamentDoc as any)?.ruleEngineSettings?.[activeDistance?.id] || (localState as any)?.ruleEngineSettings?.[activeDistance?.id];
    if (teamRuleObj) {
      if (teamRuleObj.cutoffType === "top_n") {
        teamAdvancingCount = Number(teamRuleObj.cutoffValue) || teamAdvancingCount;
      } else if (teamRuleObj.cutoffType === "percentage") {
        const pct = Number(teamRuleObj.cutoffValue) || 100;
        teamAdvancingCount = Math.max(1, Math.round((sortedTeams.length * pct) / 100));
      }
    }

    const teamBoundaryIndex = Math.min(teamAdvancingCount - 1, sortedTeams.length - 1);
    const boundaryTeam = sortedTeams[teamBoundaryIndex];

    const areTeamsTied = (a: any, b: any) => {
      if (!a || !b) return false;
      if (a.totalScore !== b.totalScore) return false;
      for (let i = 0; i < activeSoloColumns.length; i++) {
        if ((a.teamSoloScores?.[i] || 0) !== (b.teamSoloScores?.[i] || 0)) {
          return false;
        }
      }
      return true;
    };

    const teamSures = sortedTeams.filter((t, idx) => idx < teamBoundaryIndex && !areTeamsTied(t, boundaryTeam));
    const teamContenders = sortedTeams.filter(t => areTeamsTied(t, boundaryTeam));
    const teamEliminated = sortedTeams.filter((t, idx) => idx > teamBoundaryIndex && !areTeamsTied(t, boundaryTeam));

    const isTeamBoundaryTied = isTeamElim && (teamSures.length < teamAdvancingCount) && (teamSures.length + teamContenders.length > teamAdvancingCount);

    const teamQualified = isTeamBoundaryTied ? teamSures : [...teamSures, ...teamContenders];
    const teamPendingSolo = isTeamBoundaryTied ? teamContenders : [];
    const teamFinalEliminated = isTeamBoundaryTied ? [...teamEliminated, ...teamContenders] : teamEliminated;

    return {
      isTeamBoundaryTied,
      teamPendingSolo,
      teamQualified,
      teamFinalEliminated,
      sortedTeams
    };
  }, [activeAthletesList, activeDistance, teamDistances, distances, localState, currentTournamentDoc, activeSoloColumns]);

  return (
    <div className="space-y-6 animate-fadeIn" id="cc-competition-stage">
      {/* TABS HEADER & LOCK BANNER */}
      {activeTournamentFormat === "mixed" && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-1.5 shadow-inner">
          <button
            onClick={() => {
              setLocalState(prev => ({
                ...prev,
                competitionActiveTab: "individual"
              }));
              if (setCompetitionMode) setCompetitionMode("individual");
              addAuditLog("SWITCH_COMPETITION_TAB", "Chuyển sang tab Thi Đấu Cá Nhân.");
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              localState.competitionActiveTab === "individual" || !localState.competitionActiveTab
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-2 ring-indigo-400/50 scale-[1.01]"
                : "text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <User className="w-4 h-4" />
            🎯 THI ĐẤU CÁ NHÂN
            {localState.individualLocked ? (
              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-rose-500 text-white rounded-md text-[9px] font-black shadow-sm">
                <Lock className="w-2.5 h-2.5" /> KHÓA
              </span>
            ) : (
              <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm ${
                localState.competitionActiveTab === "individual" || !localState.competitionActiveTab
                  ? "bg-emerald-400 text-slate-950 font-black"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              }`}>
                <Unlock className="w-2.5 h-2.5" /> HOẠT ĐỘNG
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setLocalState(prev => ({
                ...prev,
                competitionActiveTab: "team"
              }));
              if (setCompetitionMode) setCompetitionMode("team");
              addAuditLog("SWITCH_COMPETITION_TAB", "Chuyển sang tab Thi Đấu Đồng Đội.");
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              localState.competitionActiveTab === "team"
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-2 ring-indigo-400/50 scale-[1.01]"
                : "text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Users className="w-4 h-4" />
            👥 THI ĐẤU ĐỒNG ĐỘI
            {localState.teamLocked ? (
              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-rose-500 text-white rounded-md text-[9px] font-black shadow-sm">
                <Lock className="w-2.5 h-2.5" /> KHÓA
              </span>
            ) : (
              <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm ${
                localState.competitionActiveTab === "team"
                  ? "bg-emerald-400 text-slate-950 font-black"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              }`}>
                <Unlock className="w-2.5 h-2.5" /> HOẠT ĐỘNG
              </span>
            )}
          </button>
        </div>
      )}

      {activeTournamentFormat !== "mixed" && (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {activeTournamentFormat === "individual" ? (
              <>
                <User className="w-4 h-4" />
                <span>🎯 THỂ THỨC THI ĐẤU: CHỈ CÁ NHÂN</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>👥 THỂ THỨC THI ĐẤU: CHỈ ĐỒNG ĐỘI</span>
              </>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {activeTournamentFormat === "individual" 
              ? "Giải đấu được cấu hình thi đấu cá nhân duy nhất." 
              : "Giải đấu được cấu hình thi đấu đồng đội duy nhất."}
          </span>
        </div>
      )}

      {/* LOCK CONTROLLER BANNER */}
      {(() => {
        const isActiveTeam = activeTournamentFormat === "team" || (activeTournamentFormat === "mixed" && localState.competitionActiveTab === "team");
        const isLocked = isActiveTeam ? (localState.teamLocked ?? true) : (localState.individualLocked ?? true);
        const tabName = isActiveTeam ? "Đồng Đội" : "Cá Nhân";

        if (isLocked) {
          return (
            <div className="bg-rose-50 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-950 dark:text-rose-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">PHÂN HỆ {tabName.toUpperCase()} ĐANG BỊ KHÓA</h4>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Phân hệ này đang khóa để đảm bảo an toàn. Vui lòng bấm "MỞ KHÓA PHÂN HỆ" để được quyền thao tác và điều hành bệ bắn.</p>
                </div>
              </div>
              {userRole === "admin" && (
                <button
                  onClick={() => {
                    if (activeTournamentFormat === "individual") {
                      setLocalState(prev => ({
                        ...prev,
                        individualLocked: false,
                        teamLocked: true,
                        competitionActiveTab: "individual"
                      }));
                      if (setCompetitionMode) setCompetitionMode("individual");
                      showToast("success", "Mở khóa phân hệ", "Đã mở khóa phân hệ Thi đấu Cá Nhân!");
                      addAuditLog("UNLOCK_COMPETITION_TAB", "BTC đã mở khóa phân hệ Thi đấu Cá Nhân.");
                    } else if (activeTournamentFormat === "team") {
                      setLocalState(prev => ({
                        ...prev,
                        individualLocked: true,
                        teamLocked: false,
                        competitionActiveTab: "team"
                      }));
                      if (setCompetitionMode) setCompetitionMode("team");
                      showToast("success", "Mở khóa phân hệ", "Đã mở khóa phân hệ Thi đấu Đồng Đội!");
                      addAuditLog("UNLOCK_COMPETITION_TAB", "BTC đã mở khóa phân hệ Thi đấu Đồng Đội.");
                    } else {
                      setLocalState(prev => ({
                        ...prev,
                        individualLocked: isActiveTeam ? true : false,
                        teamLocked: isActiveTeam ? false : true,
                        competitionActiveTab: isActiveTeam ? "team" : "individual"
                      }));
                      if (setCompetitionMode) setCompetitionMode(isActiveTeam ? "team" : "individual");
                      showToast("success", "Mở khóa phân hệ", `Đã mở khóa phân hệ Thi đấu ${tabName} và khóa phân hệ còn lại!`);
                      addAuditLog("UNLOCK_COMPETITION_TAB", `BTC đã mở khóa phân hệ Thi đấu ${tabName}.`);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-lg text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" /> MỞ KHÓA PHÂN HỆ
                </button>
              )}
            </div>
          );
        } else {
          return (
            <div className="bg-emerald-50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-350 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">PHÂN HỆ {tabName.toUpperCase()} ĐANG HOẠT ĐỘNG</h4>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-450 mt-0.5">Bạn đang mở khóa phân hệ này. Toàn bộ các lượt bắn, bệ bắn và bảng điểm thuộc {tabName} đã sẵn sàng điều hành.</p>
                </div>
              </div>
              {userRole === "admin" && (
                <button
                  onClick={() => {
                    setLocalState(prev => ({
                      ...prev,
                      individualLocked: true,
                      teamLocked: true
                    }));
                    showToast("success", "Khóa phân hệ", `Đã khóa phân hệ Thi đấu ${tabName}!`);
                    addAuditLog("LOCK_COMPETITION_TAB", `BTC đã khóa thủ công phân hệ Thi đấu ${tabName}.`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> KHÓA LẠI
                </button>
              )}
            </div>
          );
        }
      })()}

      {/* 1. INDIVIDUAL COMPETITION CONTENT */}
      {activeTournamentFormat !== "team" && (localState.competitionActiveTab === "individual" || !localState.competitionActiveTab || activeTournamentFormat === "individual") && (
        <div className={`space-y-4 ${localState.individualLocked ? "pointer-events-none opacity-50 select-none" : ""}`}>
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Chọn Vòng Thi Đấu Cá Nhân (Sub-stages)</h4>
            <p className="text-[11px] text-slate-400 mb-3">Tích chọn hoặc click trực tiếp vào vòng thi mong muốn để điều phối ghi điểm. Các vòng trước đó sẽ bị khóa.</p>
            
                <div className="flex flex-wrap gap-2 items-center">
                  {dynamicSubStages.map((st, sIdx) => {
                    const isActive = localState.activeSubStage === st.id;
                    const activeSubStageIdx = dynamicSubStages.findIndex(s => s.id === localState.activeSubStage);
                    const isPast = activeSubStageIdx !== -1 && sIdx < activeSubStageIdx;
                    const canClick = userRole === "admin" || !isPast;
                    
                    return (
                      <button
                        key={st.id}
                        onClick={() => {
                          if (!canClick) {
                            showToast("error", "Vòng đấu đã khóa", "Vòng đấu này đã kết thúc và bị khóa đối với trọng tài.");
                            return;
                          }

                          setLocalState(prev => {
                            const updatedCapturedRounds = { ...(prev.capturedRounds || {}) };
                            
                            // Save current state into previous active sub-stage's capturedRounds
                            const currentActiveId = prev.activeSubStage;
                            if (currentActiveId) {
                              const baseCurrentActiveId = currentActiveId.replace("-solo", "").replace("-resolo", "");
                              const snapshotData = {
                                athletesSnapshot: JSON.parse(JSON.stringify(activeAthletesList)),
                                heatsSnapshot: JSON.parse(JSON.stringify(prev.heats || [])),
                                laneStatusSnapshot: JSON.parse(JSON.stringify(prev.laneStatus || {})),
                                rankingsSnapshot: updatedCapturedRounds[currentActiveId]?.rankingsSnapshot || updatedCapturedRounds[baseCurrentActiveId]?.rankingsSnapshot || [],
                                qualificationSnapshot: updatedCapturedRounds[currentActiveId]?.qualificationSnapshot || updatedCapturedRounds[baseCurrentActiveId]?.qualificationSnapshot || null,
                                isFinalized: updatedCapturedRounds[currentActiveId]?.isFinalized || updatedCapturedRounds[baseCurrentActiveId]?.isFinalized || false,
                                timestamp: new Date().toISOString()
                              };
                              updatedCapturedRounds[baseCurrentActiveId] = snapshotData;
                              updatedCapturedRounds[currentActiveId] = snapshotData;
                            }

                            const targetBaseId = st.distanceId ? st.distanceId.replace("-solo", "").replace("-resolo", "") : st.id;
                            const captured = updatedCapturedRounds[st.id] || updatedCapturedRounds[st.distanceId] || updatedCapturedRounds[targetBaseId];
                            if (captured) {
                              const firstHeat = captured.heatsSnapshot?.[0]?.heatNumber || (st.distanceIndex + 1) * 100 + 1;
                              return {
                                ...prev,
                                capturedRounds: updatedCapturedRounds,
                                activeSubStage: st.id,
                                currentDistanceIndex: st.distanceIndex,
                                currentHeat: firstHeat,
                                heats: captured.heatsSnapshot || [],
                                laneStatus: captured.laneStatusSnapshot || {}
                              };
                            }

                            const savedVersions = prev.assignmentVersions || [];
                            const isTeamMode = (prev.workflowStage === "team_competition" || competitionMode === "team");
                            const matchingVer = savedVersions.find((v: any) => {
                              const isVerTeam = v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
                              return v.stageId === st.distanceId && (isTeamMode ? isVerTeam : !isVerTeam);
                            });

                            let stageHeats = matchingVer?.heats || [];
                            const targetStages = isTeamMode ? (teamDistances || []) : (distances || []);
                            const targetStageIndex = st.distanceIndex;
                            const activeDistanceId = st.distanceId;

                            // CRITICAL: Filter out lanes of eliminated athletes from pre-generated heats
                            if (stageHeats.length > 0) {
                              stageHeats = stageHeats.map((h: any) => {
                                if (!Array.isArray(h.lanes)) return h;
                                const cleanLanes = h.lanes.map((l: any) => {
                                  if (!l || !l.participantId) return l;
                                  const athObj = activeAthletesList.find(a => a && (a.id === l.participantId || a.participantId === l.participantId));
                                  if (athObj && isAthleteEliminatedInPrevStage(athObj, activeDistanceId, targetStages)) {
                                    return {
                                      ...l,
                                      participantId: null,
                                      fullName: null,
                                      name: null,
                                      bibNumber: null,
                                      clubId: null,
                                      team: null
                                    };
                                  }
                                  return l;
                                });
                                return { ...h, lanes: cleanLanes };
                              });
                            }

                            if (stageHeats.length === 0) {
                              const eligibleAthletes = activeAthletesList.filter(a => {
                                if (!a) return false;
                                return !isAthleteEliminatedInPrevStage(a, activeDistanceId, targetStages);
                              });

                              if (eligibleAthletes.length > 0) {
                                const seedScores: Record<string, number> = {};
                                eligibleAthletes.forEach(ath => {
                                  let cumulativeScore = 0;
                                  for (let i = 0; i < targetStageIndex; i++) {
                                    const prevStage = targetStages[i];
                                    if (prevStage) {
                                      const scoresObj = ath.scores?.[prevStage.id];
                                      let stageScore = 0;
                                      if (scoresObj) {
                                        if (Array.isArray(scoresObj)) {
                                          stageScore = (scoresObj as any[]).reduce((acc: number, s: any) => acc + (typeof s === "number" ? s : 0), 0) as number;
                                        } else if (typeof scoresObj === "object") {
                                          stageScore = (Object.values(scoresObj) as any[]).reduce((acc: number, s: any) => acc + (typeof s === "number" ? s : 0), 0) as number;
                                        }
                                      }
                                      cumulativeScore += stageScore;
                                    }
                                  }
                                  seedScores[ath.id] = cumulativeScore;
                                });

                                const participants = eligibleAthletes.map(ath => ({
                                  participantId: ath.id,
                                  fullName: ath.name,
                                  bibNumber: getCleanBibNumber(ath.bibNumber || ath.idCard, ath.id),
                                  clubId: ath.team,
                                  status: "checked_in"
                                }));

                                const currentStrategy = matchingVer?.strategy || "bib_order";

                                try {
                                  if (isTeamMode) {
                                    const teamModeMode = prev.teamAssignmentMode || "parallel";
                                    const teamStrategy = currentStrategy.startsWith("team_") ? currentStrategy : `team_${teamModeMode}`;
                                    const genResult = AssignmentEngine.generateTeamAssignments(participants as any[], {
                                      lanesCount: prev.laneCount || 8,
                                      refereeIds: ["referee_01", "referee_02", "referee_03"],
                                      strategy: teamStrategy,
                                      tournamentId: currentTournamentDoc?.id || "tour-temp",
                                      stageId: activeDistanceId,
                                      roundId: `r${targetStageIndex + 1}`
                                    });
                                    stageHeats = genResult.heats || [];
                                  } else {
                                    const genResult = AssignmentEngine.generateAssignments(participants as any[], {
                                      lanesCount: prev.laneCount || 8,
                                      refereeIds: ["referee_01", "referee_02", "referee_03"],
                                      strategy: currentStrategy as any,
                                      clubSeparation: true,
                                      seedScores,
                                      tournamentId: currentTournamentDoc?.id || "tour-temp",
                                      stageId: activeDistanceId,
                                      roundId: `r${targetStageIndex + 1}`
                                    });
                                    stageHeats = genResult.heats || [];
                                  }
                                } catch (err) {
                                  console.error("Dynamic click fallback assignment failed:", err);
                                }
                              }
                            }

                            if (stageHeats.length === 0) {
                              stageHeats = prev.heats || [];
                            }

                            const matchingHeat = st.heatNumber
                              ? stageHeats.find((h: any) => h.heatNumber === st.heatNumber)
                              : stageHeats.find((h: any) => h.stageId === st.distanceId && (!h.heatType || h.heatType === st.type)) || stageHeats[0];

                            const targetHeatNum = matchingHeat ? matchingHeat.heatNumber : (st.type === "solo" ? (st.distanceIndex + 1) * 100 + 1 : st.type === "resolo" ? (st.distanceIndex + 1) * 100 + 2 : 1);
                            
                            let nextLanes = prev.laneStatus;
                            if (matchingHeat && Array.isArray(matchingHeat.lanes)) {
                              const newLanes: Record<number, any> = {};
                              const laneLimit = prev.laneCount || matchingVer?.lanesCount || 8;
                              for (let i = 1; i <= laneLimit; i++) {
                                const assignedLane = matchingHeat.lanes.find((l: any) => l.laneNumber === i);
                                const existingLane = prev.laneStatus?.[i];

                                const athleteId = assignedLane?.participantId || null;
                                const athlete = athleteId ? activeAthletesList.find(a => a && (a.id === athleteId || a.participantId === athleteId)) : null;
                                let savedScores = athlete && targetBaseId ? athlete.scores?.[targetBaseId] : null;
                                const isSoloHeat = matchingHeat.heatType === "solo" || matchingHeat.heatType === "resolo";
                                if (isSoloHeat) {
                                  if (athlete && targetBaseId) {
                                    const soloIdx = getSoloIdxForHeat(matchingHeat.heatNumber);
                                    const details = athlete.soloShotDetails?.[targetBaseId]?.[soloIdx];
                                    if (details !== undefined) {
                                      savedScores = details;
                                    } else {
                                      savedScores = null;
                                    }
                                  } else {
                                    savedScores = null;
                                  }
                                }

                                const targetShotsCount = shotsCountLimit;
                                const preservedScores = (existingLane && existingLane.athleteId === assignedLane?.participantId && existingLane.scores)
                                  ? existingLane.scores
                                  : normalizeScoresToArr(savedScores, targetShotsCount);

                                newLanes[i] = {
                                  athleteId: assignedLane?.participantId || null,
                                  athleteName: assignedLane?.fullName || assignedLane?.name || null,
                                  bibNumber: assignedLane?.bibNumber || null,
                                  refereeId: assignedLane?.refereeId || "Trọng tài bàn",
                                  status: assignedLane ? "preparing" : "active",
                                  scores: preservedScores
                                };
                              }
                              nextLanes = newLanes;
                            }

                            // Override laneStatus with the captured snapshot if it exists!
                            const capturedLaneStatus = localState?.capturedRounds?.[st.distanceId]?.laneStatusSnapshot || localState?.capturedRounds?.[st.id]?.laneStatusSnapshot;
                            const finalLaneStatus = capturedLaneStatus || nextLanes;

                            return {
                              ...prev,
                              capturedRounds: updatedCapturedRounds,
                              activeSubStage: st.id,
                              currentDistanceIndex: st.distanceIndex,
                              currentHeat: targetHeatNum,
                              heats: stageHeats,
                              laneStatus: finalLaneStatus
                            };
                          });
                          showToast("success", "Chuyển vòng", `Đã chuyển sang vòng thi đấu cá nhân ${st.label}!`);
                          addAuditLog("SWITCH_SUB_STAGE", `Chuyển vòng thi đấu cá nhân hoạt động sang: ${st.label}.`);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border relative flex items-center gap-1.5 ${
                          isActive
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                            : isPast
                              ? `${userRole === "admin" ? "bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 cursor-pointer hover:bg-slate-150" : "bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500 cursor-not-allowed"} opacity-75`
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {isActive && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>}
                        {isPast && <Lock className="w-3 h-3 text-slate-400" />}
                        {st.label}
                        {st.hasSolo && (
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 shadow-sm animate-pulse ml-1">
                            ⚡ SOLO{st.latestSoloHeatNum ? ` #${st.latestSoloHeatNum}` : ""}
                          </span>
                        )}
                        {isPast && <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-1 py-0.2 rounded uppercase ml-1">Đã Khóa</span>}
                        {isActive && <span className="text-[8px] font-bold text-emerald-250 bg-emerald-950/40 px-1 py-0.2 rounded uppercase ml-1 animate-pulse">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TIẾN ĐỘ & BỘ LỌC VÒNG ĐẤU (ROUND PROGRESS & ADVANCEMENT FILTER) */}
              {activeDistance && (
                <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                        Tiến độ & Bộ lọc cự ly: {activeDistance.distance}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Phân hạng và tự động vượt cắt cho riêng vòng đấu này theo quy chế giải đấu.
                      </p>
                    </div>
                  </div>

                  {/* BẢNG QUY CHẾ GIẢI ĐẤU CHI TIẾT (FULL RULE CONFIGURATION GRID) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="text-left space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Cự ly thi đấu</span>
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-indigo-500" />
                        {activeDistance.distance}
                      </div>
                    </div>
                    <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Hệ số cự ly</span>
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        x{activeDistance.multiplier || 1}
                      </div>
                    </div>
                    <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Cộng dồn điểm</span>
                      <div className="text-xs font-extrabold">
                        {activeDistance.isCumulative ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Có (Tích lũy)</span>
                        ) : (
                          <span className="text-slate-500">Không (Độc lập)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Quy chế cắt loại</span>
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                        {activeDistance.isElimination ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            Top {activeDistance.eliminationValue}{activeDistance.eliminationType === "count" ? " VĐV" : "%"}
                          </span>
                        ) : (
                          <span className="text-slate-450">Không cắt loại</span>
                        )}
                      </div>
                    </div>
                    <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Bắn phụ (Solo Shootout)</span>
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex flex-wrap gap-1">
                        <span className={activeDistance.isSolo ? "text-amber-600 dark:text-amber-400" : "text-slate-450"}>
                          {activeDistance.isSolo ? "Solo: Bật" : "Solo: Tắt"}
                        </span>
                      </div>
                    </div>
                    <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Cấu hình lượt bắn</span>
                      <div className="text-[11px] font-semibold text-slate-650 dark:text-slate-300">
                        <div>Lượt: <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{currentTournamentDoc?.shotsCount || 10} viên</span></div>
                        <div>Tối đa: <span className="font-extrabold text-slate-700 dark:text-slate-250">{currentTournamentDoc?.directMaxShots || "Không giới hạn"}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Grid for Active Distance Rankings & Action Controller */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left columns: Small active rankings table */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Xếp hạng tạm thời vòng này</span>
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">
                          {activeDistanceRankings.length} VĐV tham dự
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-[220px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] text-slate-400 font-bold uppercase">
                              <th className="py-2 px-3">Hạng</th>
                              <th className="py-2 px-3 font-mono">VSC ID</th>
                              <th className="py-2 px-3 font-mono">BIB</th>
                              <th className="py-2 px-3">VĐV</th>
                              <th className="py-2 px-3">CLB / Đơn vị</th>
                              <th className="py-2 px-3 text-right">Điểm cự ly</th>
                              {activeSoloColumns.map(sIdx => (
                                <th key={sIdx} className="py-2 px-2 text-center text-amber-600 dark:text-amber-400 font-extrabold font-mono" title={sIdx === 0 ? "Điểm Lượt Solo #1" : `Điểm Lượt Re-Solo #${sIdx + 1}`}>
                                  S{sIdx + 1}
                                </th>
                              ))}
                              <th className="py-2 px-3 text-center">Dự báo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDistanceRankings.map((r, idx) => {
                              const isQualified = activeDistanceQualification?.qualified.some((q: any) => q.athleteId === r.athleteId);
                              const isPending = activeDistanceQualification?.pendingSoloShootout.some((q: any) => q.athleteId === r.athleteId);
                              const athleteObj = r.athleteId ? activeAthletesList.find(a => a && (a.id === r.athleteId || (a.participantId && a.participantId === r.athleteId))) : null;
                              const displayBib = getCleanBibNumber(athleteObj?.bibNumber, athleteObj?.id || r.athleteId);
                              const displayVscId = getCleanVscNumber(athleteObj?.vscNumber || athleteObj?.idCard, athleteObj?.id || r.athleteId);
                              const athleteHasShot = activeDistance ? hasAthleteShotInDist(r.athleteId, activeDistance.id) : false;
                              const soloRoundsArr = (() => {
                                const targetAthlete = [
                                  ...(leaderboardAthletes || []),
                                  ...(leaderboardTeamAthletes || []),
                                  ...(athletes || []),
                                  ...(teamAthletes || [])
                                ].find(a => a && (a.id === r.athleteId || (a.participantId && a.participantId === r.athleteId)));

                                const targetDistConfig = (distances || []).find(d => d.id === activeDistance?.id) || 
                                                          (teamDistances || []).find(d => d.id === activeDistance?.id) || 
                                                          activeDistance;

                                if (!targetAthlete || !targetDistConfig) return [];
                                const rounds = getSoloRoundsFromDist(targetAthlete, targetDistConfig);
                                if (rounds && rounds.length > 0) return rounds;

                                const targetDistId = targetDistConfig.id || "";
                                const directHitsVal = targetAthlete.soloHits?.[targetDistId];
                                if (directHitsVal !== undefined && directHitsVal !== null) {
                                  return [Number(directHitsVal)];
                                }

                                return [];
                              })();

                              return (
                                <tr key={`${r.athleteId || 'rank'}-${idx}`} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/30">
                                  <td className="py-2 px-3 font-extrabold text-indigo-600 dark:text-indigo-400">{r.rank}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">{displayVscId}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{displayBib}</td>
                                  <td className="py-2 px-3 font-semibold">{r.name}</td>
                                  <td className="py-2 px-3 text-slate-400 text-[11px]">{r.team}</td>
                                  <td className="py-2 px-3 text-right font-black">
                                    <span>{Number(r.totalScore.toFixed(8))}</span>
                                  </td>
                                  {activeSoloColumns.map(sIdx => {
                                    const sVal = soloRoundsArr[sIdx];
                                    const hasVal = typeof sVal === "number";
                                    return (
                                      <td key={sIdx} className="py-2 px-2 text-center font-mono font-black text-xs">
                                        {hasVal ? (
                                          <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30" title={`Điểm Lượt ${sIdx === 0 ? "Solo #1" : `Re-Solo #${sIdx + 1}`}: +${sVal}`}>
                                            +{sVal}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="py-2 px-3 text-center">
                                    {!athleteHasShot ? (
                                      <span className="inline-block text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                                        Chưa thi đấu
                                      </span>
                                    ) : isPending ? (
                                      <span className="inline-block text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-black animate-pulse border border-amber-200 dark:border-amber-900/30">
                                        Hòa (Cần Solo)
                                      </span>
                                    ) : isQualified ? (
                                      <span className="inline-block text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                        Đi tiếp
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[9px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                                        Bị loại
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {activeDistanceRankings.length === 0 && (
                              <tr>
                                <td colSpan={7 + activeSoloColumns.length} className="py-6 text-center text-slate-400 font-medium">
                                  Chưa có dữ liệu ghi nhận điểm cho vòng này.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right column: Action controller */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Bộ điều khiển vượt cắt</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Chạy bộ lọc để xác định danh sách đi tiếp và bị loại. Nếu hòa điểm tại ranh giới cutoff và bật loạt Solo, hệ thống sẽ yêu cầu đấu Playoff (Sudden Death) để giải quyết trước khi chốt kết quả vòng này.
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-850 mt-3">
                        {activeDistanceQualification?.pendingSoloShootout && activeDistanceQualification.pendingSoloShootout.length > 0 ? (
                          <button
                            onClick={handleRunQualification}
                            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                          >
                            ⚡ Khởi Tạo {nextSoloHeatInfo.heatName} ({activeDistanceQualification.pendingSoloShootout.length} VĐV)
                          </button>
                        ) : (
                          <button
                            onClick={handleRunQualification}
                            disabled={activeDistanceRankings.length === 0}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                              activeDistanceRankings.length > 0
                                ? "bg-indigo-600 hover:bg-indigo-550 text-white shadow-md shadow-indigo-100 dark:shadow-none cursor-pointer"
                                : "bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            Chốt Vòng Đấu & Lọc VĐV
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-900 mt-2">
                <div className="text-left">
                  <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">ĐIỀU HÀNH BỆ & LƯỢT BẮN (HEAT CONTROLLER)</h5>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Kích hoạt bệ bắn, điều hướng lượt đấu cá nhân.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLocalState((prev: any) => {
                        const newLanes = { ...prev.laneStatus };
                        Object.keys(newLanes).forEach(laneNum => {
                          if (newLanes[Number(laneNum)]?.athleteId) {
                            newLanes[Number(laneNum)].status = "active";
                          }
                        });
                        return { ...prev, laneStatus: newLanes };
                      });
                      addAuditLog("ACTIVATE_ALL_LANES", "Khai hỏa lượt đấu. Kích hoạt toàn bộ bệ bắn có vận động viên.");
                      showToast("success", "Khai hỏa", "Đã kích hoạt toàn bộ bệ bắn!");
                      if (globalTimer) globalTimer.handleStart();
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-rose-100 dark:shadow-none"
                  >
                    🔥 KHAI HỎA LOẠT BẮN
                  </button>
                  <button
                    onClick={() => handleTransitionTo("ranking")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    Chuyển Sang Tổng Kết & Vượt Cắt (Step 04) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* 2. TEAM COMPETITION TAB */}
      {localState.competitionActiveTab === "team" && activeTournamentFormat !== "individual" && (
        <div className="space-y-4">
          <div className={localState.teamLocked ? "pointer-events-none opacity-50 select-none space-y-4" : "space-y-4"}>
            <div className="bg-emerald-50 dark:bg-emerald-950/15 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-350">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-850">
                <Users className="w-4 h-4 text-emerald-500" /> GIAO DIỆN ĐIỀU PHỐI THI ĐẤU ĐỒNG ĐỘI (MISSION CONTROL - STEP 6)
              </h4>
              <p className="text-xs mt-1 leading-relaxed">
                Hệ thống hỗ trợ quản lý lượt thi đấu đồng đội chuyên biệt. Bạn có thể thiết lập bệ bắn cho 3 vận động viên bắn chính của câu lạc bộ thi đấu đồng thời (Parallel) hoặc tuần tự nối tiếp trên cùng một bệ (Sequential).
              </p>
            </div>

            {/* CHỌN VÒNG THI ĐẤU ĐỒNG ĐỘI (SUB-STAGES SELECTION) */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Chọn Vòng Thi Đấu Đồng Đội (Sub-stages)</h4>
              <p className="text-[11px] text-slate-400 mb-3">Tích chọn hoặc click trực tiếp vào vòng thi mong muốn để điều phối ghi điểm đồng đội. Các vòng trước đó sẽ bị khóa.</p>
              
              <div className="flex flex-wrap gap-2 items-center">
                {dynamicSubStages.map((st, sIdx) => {
                  const isActive = localState.activeSubStage === st.id;
                  const activeSubStageIdx = dynamicSubStages.findIndex(s => s.id === localState.activeSubStage);
                  const isPast = activeSubStageIdx !== -1 && sIdx < activeSubStageIdx;
                  const canClick = userRole === "admin" || !isPast;
                  
                  return (
                    <button
                      key={st.id}
                      onClick={() => {
                        if (!canClick) {
                          showToast("error", "Vòng đấu đã khóa", "Vòng đấu này đã kết thúc và bị khóa đối với trọng tài.");
                          return;
                        }
                        setLocalState((prev: any) => {
                          const updatedCapturedRounds = { ...(prev.capturedRounds || {}) };
                          
                          // Save current state into previous active sub-stage's capturedRounds
                          const currentActiveId = prev.activeSubStage;
                          if (currentActiveId) {
                            const baseCurrentActiveId = currentActiveId.replace("-solo", "").replace("-resolo", "");
                            const snapshotData = {
                              athletesSnapshot: JSON.parse(JSON.stringify(activeAthletesList)),
                              heatsSnapshot: JSON.parse(JSON.stringify(prev.heats || [])),
                              laneStatusSnapshot: JSON.parse(JSON.stringify(prev.laneStatus || {})),
                              rankingsSnapshot: updatedCapturedRounds[currentActiveId]?.rankingsSnapshot || updatedCapturedRounds[baseCurrentActiveId]?.rankingsSnapshot || [],
                              qualificationSnapshot: updatedCapturedRounds[currentActiveId]?.qualificationSnapshot || updatedCapturedRounds[baseCurrentActiveId]?.qualificationSnapshot || null,
                              isFinalized: updatedCapturedRounds[currentActiveId]?.isFinalized || updatedCapturedRounds[baseCurrentActiveId]?.isFinalized || false,
                              timestamp: new Date().toISOString()
                            };
                            updatedCapturedRounds[baseCurrentActiveId] = snapshotData;
                            updatedCapturedRounds[currentActiveId] = snapshotData;
                          }

                          const targetBaseId = st.distanceId ? st.distanceId.replace("-solo", "").replace("-resolo", "") : st.id;
                          const captured = updatedCapturedRounds[st.id] || updatedCapturedRounds[st.distanceId] || updatedCapturedRounds[targetBaseId];
                          if (captured) {
                            const firstHeat = captured.heatsSnapshot?.[0]?.heatNumber || (st.distanceIndex + 1) * 100 + 1;
                            return {
                              ...prev,
                              capturedRounds: updatedCapturedRounds,
                              activeSubStage: st.id,
                              currentDistanceIndex: st.distanceIndex,
                              currentHeat: firstHeat,
                              heats: captured.heatsSnapshot || [],
                              laneStatus: captured.laneStatusSnapshot || {}
                            };
                          }

                          const savedVersions = prev.assignmentVersions || [];
                          const matchingVer = savedVersions.find((v: any) => {
                            const isVerTeam = v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
                            return v.stageId === st.distanceId && isVerTeam;
                          });

                          const stageHeats = matchingVer?.heats || prev.heats || [];
                          const matchingHeat = st.heatNumber
                            ? stageHeats.find((h: any) => h.heatNumber === st.heatNumber)
                            : stageHeats.find((h: any) => h.stageId === st.distanceId && (!h.heatType || h.heatType === st.type)) || stageHeats[0];

                          const targetHeatNum = matchingHeat ? matchingHeat.heatNumber : (st.type === "solo" ? (st.distanceIndex + 1) * 100 + 1 : st.type === "resolo" ? (st.distanceIndex + 1) * 100 + 2 : 1);
                          
                          let nextLanes = prev.laneStatus;
                          if (matchingHeat && Array.isArray(matchingHeat.lanes)) {
                            const newLanes: Record<number, any> = {};
                            const laneLimit = prev.laneCount || matchingVer?.lanesCount || 8;
                            for (let i = 1; i <= laneLimit; i++) {
                              const assignedLane = matchingHeat.lanes.find((l: any) => l.laneNumber === i);
                              const existingLane = prev.laneStatus?.[i];

                              const athleteId = assignedLane?.participantId || null;
                              const athlete = athleteId ? activeAthletesList.find(a => a && (a.id === athleteId || a.participantId === athleteId)) : null;
                              let savedScores = athlete && targetBaseId ? athlete.scores?.[targetBaseId] : null;
                              const isSoloHeat = matchingHeat.heatType === "solo" || matchingHeat.heatType === "resolo";
                              if (isSoloHeat) {
                                  if (athlete && targetBaseId) {
                                    const soloIdx = getSoloIdxForHeat(matchingHeat.heatNumber);
                                    const details = athlete.soloShotDetails?.[targetBaseId]?.[soloIdx];
                                    if (details !== undefined) {
                                      savedScores = details;
                                    } else {
                                      savedScores = null;
                                    }
                                  } else {
                                    savedScores = null;
                                  }
                              }

                              const targetShotsCount = shotsCountLimit;
                              const preservedScores = (existingLane && existingLane.athleteId === assignedLane?.participantId && existingLane.scores)
                                ? existingLane.scores
                                : normalizeScoresToArr(savedScores, targetShotsCount);

                              newLanes[i] = {
                                athleteId: assignedLane?.participantId || null,
                                athleteName: assignedLane?.fullName || assignedLane?.name || null,
                                bibNumber: assignedLane?.bibNumber || null,
                                refereeId: assignedLane?.refereeId || "Trọng tài bàn",
                                status: assignedLane ? "preparing" : "active",
                                scores: preservedScores
                              };
                            }
                            nextLanes = newLanes;
                          }

                          // Override laneStatus with the captured snapshot if it exists!
                          const capturedLaneStatus = localState?.capturedRounds?.[st.distanceId]?.laneStatusSnapshot || localState?.capturedRounds?.[st.id]?.laneStatusSnapshot;
                          const finalLaneStatus = capturedLaneStatus || nextLanes;

                          return {
                            ...prev,
                            capturedRounds: updatedCapturedRounds,
                            activeSubStage: st.id,
                            currentDistanceIndex: st.distanceIndex,
                            currentHeat: targetHeatNum,
                            heats: stageHeats.length > 0 ? stageHeats : prev.heats,
                            laneStatus: finalLaneStatus
                          };
                        });
                        showToast("success", "Chuyển vòng", `Đã chuyển sang vòng thi đấu đồng đội ${st.label}!`);
                        addAuditLog("SWITCH_SUB_STAGE", `Chuyển vòng thi đấu đồng đội hoạt động sang: ${st.label}.`);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border relative flex items-center gap-1.5 ${
                        isActive
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-md"
                          : isPast
                            ? `${userRole === "admin" ? "bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 cursor-pointer hover:bg-slate-150" : "bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500 cursor-not-allowed"} opacity-75`
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>}
                      {isPast && <Lock className="w-3 h-3 text-slate-400" />}
                      {st.label}
                      {st.hasSolo && (
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 shadow-sm animate-pulse ml-1">
                          ⚡ SOLO{st.latestSoloHeatNum ? ` #${st.latestSoloHeatNum}` : ""}
                        </span>
                      )}
                      {isPast && <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-1 py-0.2 rounded uppercase ml-1">Đã Khóa</span>}
                      {isActive && <span className="text-[8px] font-bold text-emerald-250 bg-emerald-950/40 px-1 py-0.2 rounded uppercase ml-1 animate-pulse">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIẾN ĐỘ & BỘ LỌC CỰ LY ĐỒNG ĐỘI (ROUND PROGRESS & ADVANCEMENT FILTER) */}
            {activeDistance && (
              <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                      Tiến độ & Bộ lọc cự ly Đồng Đội: {activeDistance.distance}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Xem quy chế, theo dõi điểm số, bốc thăm xếp lượt thi đấu chuyên dụng cho đồng đội.
                    </p>
                  </div>
                </div>

                {/* BẢNG QUY CHẾ GIẢI ĐẤU ĐỒNG ĐỘI CHI TIẾT */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <div className="text-left space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Cự ly đồng đội</span>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-500" />
                      {activeDistance.distance}
                    </div>
                  </div>
                  <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Hệ số cự ly</span>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      x{activeDistance.multiplier || 1}
                    </div>
                  </div>
                  <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Cộng dồn điểm</span>
                    <div className="text-xs font-extrabold">
                      {(activeDistance.isCumulative === true || String(activeDistance.isCumulative) === "true") ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Có (Tích lũy)</span>
                      ) : (
                        <span className="text-slate-500">Không (Độc lập)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Quy chế cắt loại</span>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      {activeDistance.isElimination ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          Top {activeDistance.eliminationValue}{activeDistance.eliminationType === "count" ? " Đội" : "%"}
                        </span>
                      ) : (
                        <span className="text-slate-450">Không cắt loại</span>
                      )}
                    </div>
                  </div>
                  <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Bắn phụ (Solo Shootout)</span>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      <span className="text-slate-455">Mặc định theo đội chính thức</span>
                    </div>
                  </div>
                  <div className="text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Loạt bắn / Bệ bắn</span>
                    <div className="text-[11px] font-semibold text-slate-650 dark:text-slate-300">
                      <div>Lượt: <span className="font-extrabold text-emerald-650 dark:text-emerald-400">{currentTournamentDoc?.teamShotsCount || 10} viên</span></div>
                      <div>Tối đa: <span className="font-extrabold text-slate-700 dark:text-slate-250">{currentTournamentDoc?.teamDirectMaxShots || "Không giới hạn"}</span></div>
                    </div>
                  </div>
                </div>

                {/* SƠ ĐỒ ĐẤU & LƯỢT BẮN ĐỒNG ĐỘI (MOVED UP, SCALE 100%) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[350px] w-full mt-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      Sơ Đồ Đấu & Lượt Bắn Đồng Đội
                    </span>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">
                      {teamAssignmentVersions.length} sơ đồ
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {teamAssignmentVersions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                        Chưa có sơ đồ đấu đồng đội nào được lập. Hãy sang phần <strong>Quản Lý Vận Hành &rarr; Tab Assignments</strong> để tạo chiến thuật chia làn cho Đồng Đội.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {teamAssignmentVersions.map((version: any) => (
                          <div key={version.id} className="border border-slate-150 dark:border-slate-800 rounded-xl p-3 space-y-3 bg-slate-50/30 dark:bg-slate-950/10">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                              <div>
                                <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 block uppercase">
                                  {version.name}
                                </span>
                                <span className="text-[9px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">
                                  Chiến thuật: {
                                    version.strategy === "team_parallel" ? "Song song (Luân phiên)" :
                                    version.strategy === "team_sequential" ? "Nối tiếp" : "Đồng Đội"
                                  }
                                </span>
                              </div>
                              <span className="text-[9px] font-bold bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                {version.heats?.length || 0} Lượt đấu
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(version.heats || []).map((heat: any) => (
                                <div key={heat.heatId} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3 space-y-2">
                                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <span className="text-[11px] font-black text-slate-750 dark:text-slate-300 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {heat.heatName || `Lượt ${heat.heatNumber}`}
                                    </span>
                                    <span className="text-[9px] text-slate-450 font-bold">
                                      {heat.lanes?.length || 0} bệ
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-[11px]">
                                    {(heat.lanes || []).map((lane: any) => (
                                      <div key={lane.laneNumber} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-100/60 dark:border-slate-850">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0">
                                            {lane.laneNumber}
                                          </span>
                                          {(() => {
                                            const athObj = activeAthletesList.find(a => a && (
                                              a.id === lane.participantId || 
                                              a.participantId === lane.participantId ||
                                              (a.name && lane.fullName && a.name.trim().toLowerCase() === lane.fullName.trim().toLowerCase())
                                            ));
                                            const cleanVsc = athObj ? getCleanVscNumber(athObj.vscNumber || athObj.idCard, athObj.id) : null;
                                            const displayBib = getCleanBibNumber(lane.bibNumber || athObj?.bibNumber, athObj?.id || lane.participantId);
                                            return (
                                              <>
                                                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                                  {lane.fullName || lane.name}
                                                </span>
                                                <span className="font-mono text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0">
                                                  BIB: {displayBib}
                                                </span>
                                                {cleanVsc && (
                                                  <span className="font-mono text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0">
                                                    VSC: {cleanVsc}
                                                  </span>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                        <span className="text-[9px] text-slate-450 font-bold max-w-[100px] truncate text-right">
                                          {lane.clubName || lane.clubId || "Tự Do"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* DUAL COLUMN: XẾP HẠNG ĐỒNG ĐỘI & BỘ ĐIỀU KHIỂN VƯỢT CẮT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
                  {/* CỘT 2: TEAM RANKINGS */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[350px] max-h-[500px]">
                    <div className="p-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Xếp hạng đồng đội tạm thời vòng này
                      </span>
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">
                        Cộng tổng VĐV bắn chính
                      </span>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 z-10">
                          <tr className="bg-slate-50/90 dark:bg-slate-900/90 text-[10px] text-slate-400 font-bold uppercase">
                            <th className="py-2.5 px-3">Hạng</th>
                            <th className="py-2.5 px-3">CLB / Đội tuyển</th>
                            <th className="py-2.5 px-3 text-center">Số thành viên</th>
                            <th className="py-2.5 px-3">Chi tiết thành viên</th>
                            <th className="py-2.5 px-3 text-right">Tổng điểm CLB</th>
                            {activeSoloColumns.map(sIdx => (
                              <th key={sIdx} className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400 font-extrabold font-mono" title={sIdx === 0 ? "Tổng điểm Lượt Solo #1" : `Tổng điểm Lượt Re-Solo #${sIdx + 1}`}>
                                S{sIdx + 1}
                              </th>
                            ))}
                            <th className="py-2.5 px-3 text-center">Dự báo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Calculate live team rankings
                            const teamScores: Record<string, { teamName: string; totalScore: number; members: any[]; teamSoloScores: number[] }> = {};
                            teamAthletes.forEach(ath => {
                              if (!ath.isPrimaryTeam || ath.status === "Bỏ thi" || isNoTeam(ath.team || ath.clubName)) return;
                              const teamName = ath.team || "Không rõ Đội";
                              
                              let calculationDistances: DistanceConfig[] = [activeDistance];
                              const isCumulativeActive = activeDistance.isCumulative === true || String(activeDistance.isCumulative) === "true";
                              if (isCumulativeActive) {
                                calculationDistances = distances.slice(0, localState.currentDistanceIndex + 1);
                              }
                              
                              let totalPoints = 0;
                              calculationDistances.forEach(dist => {
                                const scoresObj = (ath.scores?.[dist.id] || {}) as any;
                                const shotsList = Array.isArray(scoresObj) ? scoresObj : (scoresObj?.shots || []);
                                shotsList.forEach((shot: any) => {
                                  if (shot === true || shot === 1 || String(shot) === "true") {
                                    totalPoints += (dist.multiplier || 1);
                                  } else if (typeof shot === "number") {
                                    totalPoints += shot * (dist.multiplier || 1);
                                  }
                                });
                              });

                              const soloRoundsArr = (() => {
                                const targetDistConfig = (distances || []).find(d => d.id === activeDistance?.id) || 
                                                          (teamDistances || []).find(d => d.id === activeDistance?.id) || 
                                                          activeDistance;

                                if (!ath || !targetDistConfig) return [];
                                const rounds = getSoloRoundsFromDist(ath, targetDistConfig);
                                if (rounds && rounds.length > 0) return rounds;

                                const targetDistId = targetDistConfig.id || "";
                                const directHitsVal = ath.soloHits?.[targetDistId];
                                if (directHitsVal !== undefined && directHitsVal !== null) {
                                  return [Number(directHitsVal)];
                                }

                                return [];
                              })();

                              if (!teamScores[teamName]) {
                                teamScores[teamName] = { teamName, totalScore: 0, members: [], teamSoloScores: [] };
                              }
                              teamScores[teamName].members.push({
                                id: ath.id,
                                name: ath.name,
                                bib: getCleanBibNumber(ath.bibNumber, ath.id),
                                score: totalPoints,
                                soloScores: soloRoundsArr
                              });
                            });

                            Object.keys(teamScores).forEach(k => {
                              const team = teamScores[k];
                              team.totalScore = team.members.reduce((acc, m) => acc + m.score, 0);
                              
                              const clubSoloScores: number[] = [];
                              activeSoloColumns.forEach(sIdx => {
                                const sumSoloForColumn = team.members.reduce((acc, m) => {
                                  const val = m.soloScores[sIdx];
                                  return acc + (typeof val === "number" ? val : 0);
                                }, 0);
                                clubSoloScores.push(sumSoloForColumn);
                              });
                              team.teamSoloScores = clubSoloScores;
                            });

                            const sortedTeams = Object.values(teamScores).sort((a, b) => {
                              if (b.totalScore !== a.totalScore) {
                                return b.totalScore - a.totalScore;
                              }
                              for (let i = 0; i < activeSoloColumns.length; i++) {
                                const scoreA = a.teamSoloScores[i] || 0;
                                const scoreB = b.teamSoloScores[i] || 0;
                                if (scoreB !== scoreA) {
                                  return scoreB - scoreA;
                                }
                              }
                              return 0;
                            });

                            return sortedTeams.map((t, tIdx) => (
                              <tr key={`${t.teamName}-${tIdx}`} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                                <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">{tIdx + 1}</td>
                                <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wide">{t.teamName}</td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-550 dark:text-slate-400">{t.members.length} VĐV</td>
                                <td className="py-3 px-3 max-w-[200px] xl:max-w-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {t.members.map((m, mIdx) => (
                                      <span key={mIdx} className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-650 dark:text-slate-350">
                                        <strong className="text-slate-500 font-mono">{m.bib}</strong> {m.name} ({m.score}đ{m.soloScores.length > 0 ? `, Solo: +${m.soloScores.join('+')}` : ''})
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right font-black text-emerald-655 dark:text-emerald-400 text-sm">{t.totalScore}</td>
                                {activeSoloColumns.map(sIdx => {
                                  const sVal = t.teamSoloScores[sIdx];
                                  const isAnyMemberHasSolo = t.members.some(m => typeof m.soloScores[sIdx] === "number");
                                  return (
                                    <td key={sIdx} className="py-3 px-2 text-center font-mono font-black text-xs">
                                      {isAnyMemberHasSolo ? (
                                        <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30" title={`Tổng điểm Solo Lượt ${sIdx === 0 ? "Solo #1" : `Re-Solo #${sIdx + 1}`}: +${sVal}`}>
                                          +{sVal}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="py-3 px-3 text-center">
                                  {(() => {
                                    const isAnyMemberShot = t.members.some(m => hasAthleteShotInDist(m.id, activeDistance.id));
                                    const isPending = teamCutoffInfo.teamPendingSolo.some(ps => ps.teamName === t.teamName);
                                    const isQualified = teamCutoffInfo.teamQualified.some(q => q.teamName === t.teamName);
                                    
                                    if (!isAnyMemberShot) {
                                      return (
                                        <span className="inline-block text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                                          Chưa thi đấu
                                        </span>
                                      );
                                    }
                                    if (isPending) {
                                      return (
                                        <span className="inline-block text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-black animate-pulse border border-amber-200/50 dark:border-amber-900/30">
                                          Hòa (Cần Solo)
                                        </span>
                                      );
                                    }
                                    if (isQualified) {
                                      return (
                                        <span className="inline-block text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                          Đi tiếp
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="inline-block text-[9px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                                        Bị loại
                                      </span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CỘT 3: BỘ ĐIỀU KHIỂN VƯỢT CẮT ĐỒNG ĐỘI */}
                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Bộ điều khiển vượt cắt Đồng Đội</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Chạy bộ lọc để xác định danh sách các đội đi tiếp và bị loại. Nếu hòa điểm tại ranh giới cutoff, hệ thống sẽ tự động bốc thăm chia làn đấu playoff Sudden Death (Solo/Re-Solo) cho toàn bộ thành viên chính thức của các đội hòa điểm.
                      </p>

                      {teamCutoffInfo.isTeamBoundaryTied && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-[11px] space-y-1.5 text-amber-800 dark:text-amber-300 mt-2">
                          <strong className="block text-xs font-black uppercase">⚠️ PHÁT HIỆN HÒA ĐIỂM TRANH CHẤP:</strong>
                          <p>Có {teamCutoffInfo.teamPendingSolo.length} đội hòa điểm tại ranh giới cutoff:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {teamCutoffInfo.teamPendingSolo.map((t, idx) => (
                              <span key={idx} className="bg-amber-100 dark:bg-amber-950/55 px-2 py-0.5 rounded text-[10px] font-bold">
                                {t.teamName} ({t.totalScore}đ)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-850 mt-3">
                      {teamCutoffInfo.isTeamBoundaryTied && teamCutoffInfo.teamPendingSolo.length > 0 ? (
                        <button
                          onClick={handleRunQualification}
                          className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          ⚡ Khởi Tạo {nextSoloHeatInfo.heatName} ({teamCutoffInfo.teamPendingSolo.length} Đội)
                        </button>
                      ) : (
                        <button
                          onClick={handleRunQualification}
                          disabled={teamCutoffInfo.sortedTeams.length === 0}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            teamCutoffInfo.sortedTeams.length > 0
                              ? "bg-emerald-600 hover:bg-emerald-550 text-white shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
                              : "bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          Chốt Vòng Đấu & Lọc TEAM
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HEAT CONTROLLER ACTION BANNER FOR TEAM */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 mt-2">
              <div className="text-left">
                <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">ĐIỀU HÀNH BỆ & LƯỢT BẮN ĐỒNG ĐỘI (HEAT CONTROLLER)</h5>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Kích hoạt bệ bắn đồng đội, điều hành tiến trình đấu giải.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLocalState((prev: any) => {
                      const newLanes = { ...prev.laneStatus };
                      Object.keys(newLanes).forEach(laneNum => {
                        if (newLanes[Number(laneNum)]?.athleteId) {
                          newLanes[Number(laneNum)].status = "active";
                        }
                      });
                      return { ...prev, laneStatus: newLanes };
                    });
                    addAuditLog("ACTIVATE_ALL_LANES_TEAM", "Khai hỏa lượt đấu đồng đội. Kích hoạt toàn bộ bệ bắn.");
                    showToast("success", "Khai hỏa đồng đội", "Đã kích hoạt toàn bộ bệ bắn đồng đội!");
                    if (globalTimer) globalTimer.handleStart();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-rose-100 dark:shadow-none"
                >
                  🔥 KHAI HỎA LOẠT BẮN
                </button>
                <button
                  onClick={() => handleTransitionTo("ranking")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  Chuyển Sang Tổng Kết & Vượt Cắt (Step 04) &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
