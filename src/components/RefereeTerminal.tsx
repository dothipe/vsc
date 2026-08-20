import { useState } from "react";
import { Search, Sparkles, Play, Save, RotateCcw, AlertTriangle, Users, Plus, QrCode } from "lucide-react";
import { DistanceConfig, Athlete } from "../types";
import { getCleanVscNumber, getCleanBibNumber, isAthleteEliminated, isAthleteEliminatedInPrevStage, isNoTeam } from "../utils/athleteUtils";
import { getStageDisplayName } from "../utils/generalUtils";

interface RefereeTerminalProps {
  currentUser: any;
  userRole: any;
  matchName: string;
  commandCenterState: any;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  competitionMode: "individual" | "team";
  athletes: Athlete[];
  teamAthletes: Athlete[];
  leaderboardAthletes: Athlete[];
  leaderboardTeamAthletes: Athlete[];
  currentTournamentDoc: any;
  scoreEvents: any[];
  refereeSelectedLane: number | null;
  setRefereeSelectedLane: (lane: number | null) => void;
  setShowRefereeLaneModal: (show: boolean) => void;
  setShowQrScanner: (show: boolean) => void;
  setSelectedCallIds: (ids: string[]) => void;
  setCallSearchTerm: (term: string) => void;
  setShowCallAthleteModal: (show: boolean) => void;
  handleUpdateWorkspaces: (newWorkspaces: any[]) => Promise<void>;
  handleSaveAthleteWorkspaceScore: (athId: string) => Promise<void>;
  handleResetAthleteScore: (athId: string, distId: string) => void;
}

export function RefereeTerminal({
  currentUser,
  userRole,
  matchName,
  commandCenterState,
  distances,
  teamDistances,
  competitionMode,
  athletes,
  teamAthletes,
  leaderboardAthletes,
  leaderboardTeamAthletes,
  currentTournamentDoc,
  scoreEvents,
  refereeSelectedLane,
  setRefereeSelectedLane,
  setShowRefereeLaneModal,
  setShowQrScanner,
  setSelectedCallIds,
  setCallSearchTerm,
  setShowCallAthleteModal,
  handleUpdateWorkspaces,
  handleSaveAthleteWorkspaceScore,
  handleResetAthleteScore
}: RefereeTerminalProps) {
  const refereeId = (currentUser?.email || "anonymous").toLowerCase();
  const refereeName = currentUser?.displayName || refereeId.split("@")[0];
  const workspaces = commandCenterState?.refereeWorkspaces || [];
  const myWorkspace = workspaces.find((ws: any) => ws.refereeId?.toLowerCase() === refereeId) || {
    refereeId,
    refereeName,
    athletes: []
  };

  const myAthletes = (myWorkspace.athletes || []).filter((a: any) => {
    if (refereeSelectedLane !== null && a.laneNumber) {
      return Number(a.laneNumber) === Number(refereeSelectedLane);
    }
    return true;
  });

  const sourceAthletes = leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes;
  const sourceTeamAthletes = leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes;
  const isCurrentModeTeam = (competitionMode === "team" || commandCenterState?.workflowStage === "team_competition");
  const allAths = (isCurrentModeTeam
    ? (sourceTeamAthletes && sourceTeamAthletes.length > 0
        ? sourceTeamAthletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName))
        : sourceAthletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName)))
    : sourceAthletes) || [];

  const currentActiveHeat = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
  const isSoloHeat = Boolean(currentActiveHeat && (currentActiveHeat.heatType === "solo" || currentActiveHeat.heatType === "resolo"));

  const getActiveLaneLimit = () => {
    return currentTournamentDoc?.laneCapacity || commandCenterState?.laneCount || 13;
  };

  // Suggester for Next Athlete (Strictly aligned with AssignmentEngine lane queue)
  const nextSuggestedAthlete = (() => {
    if (isSoloHeat) return null; // Disable auto-suggestion during SOLO shootouts per referee rule
    const activeDistanceId = (isCurrentModeTeam ? teamDistances : distances)[commandCenterState?.currentDistanceIndex || 0]?.id;
    if (!activeDistanceId) return null;

    // 1. Get all athlete IDs currently owned by any referee
    const ownedIds = new Set<string>();
    workspaces.forEach((ws: any) => {
      if (ws.athletes) {
        ws.athletes.forEach((ath: any) => {
          if (ath.status === "scoring") {
            ownedIds.add(ath.athleteId);
          }
        });
      }
    });

    // Helper to check if athlete completed shooting
    const isAthCompleted = (athId: string) => {
      const hasEvent = (commandCenterState?.scoreEvents || scoreEvents || []).some(
        (evt: any) => evt.athleteId === athId && evt.distanceId === activeDistanceId && !evt.deleted
      );
      if (hasEvent) return true;
      const athObj = allAths.find(a => a.id === athId);
      if (athObj) {
        const mainScores = athObj.scores?.[activeDistanceId];
        if (mainScores && mainScores.some((s: any) => s !== null && s !== undefined)) {
          return true;
        }
      }
      return false;
    };

    // 2. Identify the referee's lane number
    let refereeLaneNum = 1;
    if (myWorkspace.athletes && myWorkspace.athletes.length > 0) {
      refereeLaneNum = myWorkspace.athletes[0].laneNumber || 1;
    } else {
      const myEvents = (commandCenterState?.scoreEvents || scoreEvents || [])
        .filter((e: any) => e.operator === refereeId && !e.deleted);
      if (myEvents.length > 0) {
        const sorted = [...myEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        refereeLaneNum = sorted[0].lane || 1;
      }
    }

    // 3. Search heats for the next unshot athlete in the SAME lane
    if (commandCenterState?.heats && commandCenterState.heats.length > 0) {
      // Sort heats by heatNumber
      const sortedHeats = [...commandCenterState.heats].sort((a, b) => a.heatNumber - b.heatNumber);
      
      // Look for athletes on refereeLaneNum
      for (const h of sortedHeats) {
        const laneAss = h.lanes?.find((l: any) => l.laneNumber === refereeLaneNum);
        if (laneAss && laneAss.participantId) {
          const pId = laneAss.participantId;
          const athObj = allAths.find(a => a.id === pId);
          const targetStages = isCurrentModeTeam ? teamDistances : distances;
          if (athObj && !isAthCompleted(pId) && !ownedIds.has(pId) && athObj.status !== "Bỏ thi" && !isAthleteEliminated(athObj, activeDistanceId, targetStages) && !isAthleteEliminatedInPrevStage(athObj, activeDistanceId, targetStages)) {
            return athObj;
          }
        }
      }
    }

    // Fallback: If no athlete is found on the same lane, find any checked-in athlete who is not owned and has not shot yet
    return allAths.find((a) => {
      const targetStages = isCurrentModeTeam ? teamDistances : distances;
      const correspondingIndividualAth = (athletes || []).find(ia => ia && (
        ia.id === a.id || 
        (ia.participantId && a.id && ia.participantId === a.id) || 
        (ia.id && a.participantId && ia.id === a.participantId) ||
        (ia.participantId && a.participantId && ia.participantId === a.participantId) ||
        (ia.vscNumber && a.vscNumber && ia.vscNumber === a.vscNumber) || 
        (ia.bibNumber && a.bibNumber && ia.bibNumber === a.bibNumber)
      ));
      const isCheckedIn = a.status === "checked_in" || 
                          a.status === "Thi đấu" ||
                          a.checkInStatus === "checked_in" ||
                          (correspondingIndividualAth && (
                            correspondingIndividualAth.status === "checked_in" || 
                            correspondingIndividualAth.status === "Thi đấu" ||
                            correspondingIndividualAth.checkInStatus === "checked_in"
                          ));
      return !isAthCompleted(a.id) && !ownedIds.has(a.id) && isCheckedIn && !isAthleteEliminated(a, activeDistanceId, targetStages) && !isAthleteEliminatedInPrevStage(a, activeDistanceId, targetStages);
    });
  })();

  const activeDistanceConfig = (isCurrentModeTeam ? teamDistances : distances)[commandCenterState?.currentDistanceIndex || 0];
  const activeDistanceId = activeDistanceConfig?.id;

  const effectiveShotsCount = activeDistanceConfig?.shotsCount !== undefined && activeDistanceConfig?.shotsCount !== null && activeDistanceConfig?.shotsCount > 0
    ? activeDistanceConfig.shotsCount
    : (isCurrentModeTeam
      ? (currentTournamentDoc?.teamShotsCount ?? commandCenterState?.teamShotsCount ?? 10)
      : (currentTournamentDoc?.shotsCount ?? commandCenterState?.shotsCount ?? 10));

  const isDirectMode = effectiveShotsCount === 1;
  const maxShots = effectiveShotsCount;

  return (
    <div className="flex flex-col gap-6" id="referee-terminal">
      {/* Header Info Bar */}
      {commandCenterState ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                Bàn Trọng Tài Tác Chiến (Live Referee Terminal)
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-sans text-white tracking-tight">
                {matchName || "Giải đấu Slingshot VSC"}
              </h2>
              {(() => {
                const activeHeatObj = (commandCenterState?.heats || currentTournamentDoc?.commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
                const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
                if (isSoloHeat) {
                  return (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg animate-pulse font-sans">
                      <span>⚡ ĐANG THI ĐẤU {activeHeatObj.heatType === "resolo" ? "RE-SOLO" : "SOLO"} PHÂN ĐỊNH (SUDDEN DEATH PLAYOFF - #{activeHeatObj.heatNumber})</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-700">
              <div className="text-left">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cự ly / Vòng thi</div>
                <div className="text-xs sm:text-sm font-extrabold text-indigo-400">
                  {getStageDisplayName(
                    commandCenterState.currentDistanceIndex || 0,
                    (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex || 0]
                  )}
                  {(() => {
                    const activeHeatObj = (commandCenterState?.heats || currentTournamentDoc?.commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
                    const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
                    if (isSoloHeat) {
                      const heatName = activeHeatObj.heatName || (activeHeatObj.heatType === "resolo" ? `Re-Solo #${activeHeatObj.heatNumber}` : `Solo #${activeHeatObj.heatNumber}`);
                      return ` - VÒNG BẮN ${heatName.toUpperCase()}`;
                    }
                    return "";
                  })()}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lượt bắn</div>
                <div className="text-xs sm:text-sm font-black text-rose-400 font-mono">
                  {(() => {
                    const activeHeatObj = (commandCenterState?.heats || currentTournamentDoc?.commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
                    const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
                    if (isSoloHeat) {
                      return `${activeHeatObj.heatType === "resolo" ? "RE-SOLO" : "SOLO"} #${activeHeatObj.heatNumber}`;
                    }
                    return `Lượt #${commandCenterState.currentHeat || 1}`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/50 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <span className="font-bold block mb-1 font-sans">Sẵn sàng chạy giải đấu chính thức:</span>
            <p className="text-[11px] leading-relaxed">
              Để kích hoạt **Bàn Trọng Tài Tác Chiến** chính thức theo sơ đồ bệ bắn, vui lòng chuyển sang tab **Command Center (Bảng Điều Khiển)** để mở lượt thi đấu mới. 
              Hiện tại bạn vẫn có thể sử dụng bảng nhập điểm tạm thời dưới đây để lưu nháp kết quả.
            </p>
          </div>
        </div>
      )}

      {/* Real-time Lanes Grid */}
      {commandCenterState && (
        <div className="flex flex-col gap-6">
          {/* Workspace Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Không gian Trọng tài: <strong className="text-slate-800 dark:text-slate-100">{refereeName}</strong>
                </span>
              </div>
              {refereeSelectedLane !== null ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-[#ae1d1e] dark:text-rose-300 text-[11px] font-black rounded-xl px-2.5 py-1 font-sans">
                  🎯 Bệ giám sát: #{refereeSelectedLane}
                  <button
                    onClick={() => setShowRefereeLaneModal(true)}
                    className="ml-1 text-[9px] uppercase font-bold tracking-wider hover:underline text-rose-700 dark:text-rose-400 cursor-pointer bg-transparent border-0"
                  >
                    (Đổi bệ)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRefereeLaneModal(true)}
                  className="bg-[#ae1d1e] text-white text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-xl hover:bg-red-700 active:scale-95 transition cursor-pointer font-sans shrink-0 border-0"
                >
                  🎯 Chọn bệ bắn
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {nextSuggestedAthlete && (
                <button
                  onClick={async () => {
                    if (refereeSelectedLane === null) {
                      setShowRefereeLaneModal(true);
                      return;
                    }
                    // Automatically call next suggested athlete
                    const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
                    let myWsIndex = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId);
                    
                    // Find occupied lanes to allocate next free lane (1-13)
                    const occupiedLanes = new Set<number>();
                    currentWorkspaces.forEach((ws: any) => {
                      if (ws.athletes) {
                        ws.athletes.forEach((a: any) => {
                          if (a.status === "scoring" && a.laneNumber) {
                            occupiedLanes.add(Number(a.laneNumber));
                          }
                        });
                      }
                    });
                    if (commandCenterState?.laneStatus) {
                      Object.entries(commandCenterState.laneStatus).forEach(([lStr, lVal]: [string, any]) => {
                        if (lVal?.athleteId && lVal?.status !== "completed") {
                          occupiedLanes.add(Number(lStr));
                        }
                      });
                    }

                    let nextFreeLane = 1;
                    const laneLimit = getActiveLaneLimit();
                    for (let l = 1; l <= laneLimit; l++) {
                      if (!occupiedLanes.has(l)) {
                        nextFreeLane = l;
                        break;
                      }
                    }

                    const activeLane = (() => {
                      if (!commandCenterState?.laneStatus) return null;
                      const laneKey = Object.keys(commandCenterState.laneStatus).find(
                        (key) => commandCenterState.laneStatus[Number(key)]?.athleteId === nextSuggestedAthlete.id
                      );
                      return laneKey ? Number(laneKey) : null;
                    })();

                    const newAth = {
                      athleteId: nextSuggestedAthlete.id,
                      athleteName: nextSuggestedAthlete.name,
                      scores: Array(maxShots).fill(null),
                      status: "scoring" as const,
                      lockedAt: new Date().toISOString(),
                      laneNumber: refereeSelectedLane || activeLane || nextFreeLane
                    };

                    if (myWsIndex === -1) {
                      currentWorkspaces.push({
                        refereeId,
                        refereeName,
                        athletes: [newAth]
                      });
                    } else {
                      currentWorkspaces[myWsIndex] = {
                        ...currentWorkspaces[myWsIndex],
                        athletes: [
                          ...(currentWorkspaces[myWsIndex].athletes || []),
                          newAth
                        ]
                      };
                    }
                    await handleUpdateWorkspaces(currentWorkspaces);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer font-sans border-0"
                >
                  <Plus className="w-4 h-4" /> Gọi Tiếp ({nextSuggestedAthlete.name})
                </button>
              )}

              <button
                onClick={() => {
                  if (refereeSelectedLane === null) {
                    setShowRefereeLaneModal(true);
                    return;
                  }
                  setShowQrScanner(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer font-sans border-0"
              >
                <QrCode className="w-4 h-4" /> Quét mã QR (Scan QR)
              </button>

              <button
                onClick={() => {
                  if (refereeSelectedLane === null) {
                    setShowRefereeLaneModal(true);
                    return;
                  }
                  // Reset selected ids first
                  setSelectedCallIds([]);
                  setCallSearchTerm("");
                  setShowCallAthleteModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer font-sans border-0"
              >
                <Plus className="w-4 h-4" /> Gọi vận động viên (Call Athlete)
              </button>
            </div>
          </div>

          {/* Active Scoring Athletes Grid */}
          {myAthletes.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-xs p-6">
              <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 font-sans">Không có vận động viên trong bệ</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto font-sans">
                Vui lòng bấm nút <strong>Gọi vận động viên</strong> ở trên hoặc nút <strong>Gọi Tiếp</strong> để bắt đầu ghi điểm!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {myAthletes.map((workspaceAthlete: any, athIdx: number) => {
                const athId = workspaceAthlete.athleteId;
                const athlete = allAths.find((a) => a.id === athId);

                // Resolve lane number dynamically
                const activeLane = (() => {
                  if (!commandCenterState?.laneStatus) return null;
                  const laneKey = Object.keys(commandCenterState.laneStatus).find(
                    (key) => commandCenterState.laneStatus[Number(key)]?.athleteId === athId
                  );
                  return laneKey ? Number(laneKey) : null;
                })() || workspaceAthlete.laneNumber || 1;

                const laneScores = workspaceAthlete.scores || [];

                // Compute hit count & points for live display
                const effectiveDirect = isDirectMode || ((!isCurrentModeTeam ? (commandCenterState?.directMaxPoints || 0) : (commandCenterState?.teamDirectMaxPoints || 0)) || 0) > 0;
                const hitCount = laneScores.filter((s: any) => s === true || s === "true" || s === "1" || (typeof s === "number" && s > 0)).length;
                const hasNumeric = laneScores.some((s: any) => typeof s === "number" && s > 1);
                const points = (effectiveDirect || hasNumeric)
                  ? ((laneScores || []) as any[]).reduce((acc: number, s: any) => {
                      if (typeof s === "number") return acc + s;
                      if (s === "X" || s === "x") return acc + 10;
                      const num = Number(s);
                      return acc + (!isNaN(num) ? num : (s === true ? 1 : 0));
                    }, 0) * ((!isCurrentModeTeam ? distances : teamDistances)[commandCenterState?.currentDistanceIndex || 0]?.multiplier || 1)
                  : hitCount * ((!isCurrentModeTeam ? distances : teamDistances)[commandCenterState?.currentDistanceIndex || 0]?.multiplier || 1);

                return (
                  <div 
                    key={`${athId || 'ath'}-${athIdx}`}
                    className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-5 shadow-xs transition-all duration-205 relative border-rose-500`}
                  >
                    {/* Card Header with Lane Selector */}
                    <div className="flex justify-between items-center mb-4 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 font-sans">Bệ bắn:</span>
                        <select
                          value={activeLane}
                          onChange={async (e) => {
                            const newLane = Number(e.target.value);
                            
                            // Check if this lane is currently used by another active scoring athlete in ANY referee's workspace
                            const otherRefereesWorkspaces = (commandCenterState?.refereeWorkspaces || []).filter((ws: any) => ws.refereeId?.toLowerCase() !== refereeId.toLowerCase());
                            const isLaneConflicting = otherRefereesWorkspaces.some((ws: any) => 
                              (ws.athletes || []).some((a: any) => a.status === "scoring" && Number(a.laneNumber) === newLane)
                            ) || (() => {
                              if (!commandCenterState?.laneStatus) return false;
                              return Object.entries(commandCenterState.laneStatus).some(([lStr, lVal]: [string, any]) => {
                                return Number(lStr) === newLane && lVal?.athleteId && lVal?.athleteId !== athId && lVal?.status !== "completed";
                              });
                            })();

                            if (isLaneConflicting) {
                              alert(`Bệ bắn số ${newLane} đang được sử dụng bởi trọng tài khác. Vui lòng chọn lại bệ bắn!`);
                              return;
                            }

                            // Update the workspace athlete's lane number and sync to Firestore
                            const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
                            const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId.toLowerCase());
                            if (myWsIdx !== -1) {
                              currentWorkspaces[myWsIdx] = {
                                ...currentWorkspaces[myWsIdx],
                                athletes: (currentWorkspaces[myWsIdx].athletes || []).map((a: any) => 
                                  a.athleteId === athId 
                                    ? { ...a, laneNumber: newLane } 
                                    : a
                                )
                              };
                              await handleUpdateWorkspaces(currentWorkspaces);
                            }
                          }}
                          className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black rounded-lg px-2 py-1 focus:outline-none dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300 font-sans cursor-pointer"
                        >
                          {Array.from({ length: getActiveLaneLimit() }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>Bệ #{i + 1}</option>
                          ))}
                        </select>
                      </div>
                      <span className="text-[10px] font-mono font-bold truncate text-indigo-650 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 animate-pulse">
                        🔒 Đang chấm điểm
                      </span>
                    </div>

                    {/* Athlete Details */}
                    {athlete ? (
                      <div className="flex items-center gap-3 mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                        {athlete.avatarUrl && !athlete.avatarUrl.startsWith("local-avatar:") ? (
                          <img 
                            src={athlete.avatarUrl} 
                            alt={athlete.name} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500 shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                            {athlete.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate font-sans">
                            {athlete.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 truncate flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="font-extrabold text-indigo-650 font-mono">
                              VSC: {getCleanVscNumber(athlete.vscNumber, athlete.id)} {athlete.bibNumber && `| BIB: ${getCleanBibNumber(athlete.bibNumber, athlete.id)}`}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-gray-450">{athlete.team || "Tự Do"}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-2xl text-gray-400 dark:text-slate-600 text-xs font-medium mb-4">
                        Không tìm thấy thông tin VĐV (ID: {athId})
                      </div>
                    )}

                    {/* Interactive Score Inputs */}
                    <div className="flex flex-col gap-4">
                      {Boolean(workspaceAthlete?.isSolo) && (
                        <div className="bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm animate-pulse font-sans">
                          <span>⚡ Đang Chấm Điểm Solo Phân Định (Sudden Death)</span>
                          <span className="font-mono bg-amber-600 px-2 py-0.5 rounded text-[9px]">SOLO</span>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex justify-between font-sans">
                          <span>{isDirectMode ? "Kết quả lượt bắn:" : `Kết quả tạm thời (${maxShots} phát):`}</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">
                            Tổng: {points}đ ({hitCount} Trúng)
                          </span>
                        </div>

                        {isDirectMode ? (
                          /* Direct Points Single Input Box */
                          <div className="flex flex-col items-center justify-center py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold font-mono text-slate-500 uppercase">Điểm số lượt bắn:</span>
                              <input
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                placeholder="0"
                                value={laneScores[0] !== null && laneScores[0] !== undefined ? laneScores[0] : ""}
                                onChange={async (e) => {
                                  const raw = e.target.value.trim();
                                  if (raw !== "" && !/^\d+$/.test(raw)) return;
                                  const val = raw === "" ? null : parseInt(raw, 10);
                                  
                                  // Update score locally & sync to Firestore
                                  const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
                                  const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId.toLowerCase());
                                  if (myWsIdx !== -1) {
                                    currentWorkspaces[myWsIdx] = {
                                      ...currentWorkspaces[myWsIdx],
                                      athletes: (currentWorkspaces[myWsIdx].athletes || []).map((a: any) => 
                                        a.athleteId === athId 
                                          ? { ...a, scores: [val] } 
                                          : a
                                      )
                                    };
                                    await handleUpdateWorkspaces(currentWorkspaces);
                                  }
                                }}
                                className="w-24 h-11 text-center text-lg font-black font-mono border-2 border-indigo-300 dark:border-indigo-700 rounded-xl bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-rose-500 shadow-sm"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Hit or Miss Circle Buttons */
                          <div className="flex flex-wrap gap-1.5 justify-center py-1">
                            {Array.from({ length: maxShots }).map((_, shotIdx) => {
                              const val = laneScores[shotIdx];
                              return (
                                <button
                                  key={shotIdx}
                                  onClick={async () => {
                                    let newVal: boolean | null = null;
                                    if (val === null || val === undefined) {
                                      newVal = true;
                                    } else if (val === true) {
                                      newVal = false;
                                    } else {
                                      newVal = null;
                                    }

                                    // Update scores and immediate live sync
                                    const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
                                    const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId.toLowerCase());
                                    if (myWsIdx !== -1) {
                                      currentWorkspaces[myWsIdx] = {
                                        ...currentWorkspaces[myWsIdx],
                                        athletes: (currentWorkspaces[myWsIdx].athletes || []).map((a: any) => {
                                          if (a.athleteId !== athId) return a;
                                          const currentScores = Array.isArray(a.scores) ? [...a.scores] : [];
                                          while (currentScores.length < maxShots) {
                                            currentScores.push(null);
                                          }
                                          currentScores[shotIdx] = newVal;
                                          return { ...a, scores: currentScores };
                                        })
                                      };
                                      await handleUpdateWorkspaces(currentWorkspaces);
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-xl font-mono text-xs font-black border transition-all duration-100 flex flex-col items-center justify-center hover:scale-105 active:scale-95 cursor-pointer ${
                                    val === true
                                      ? "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                                      : val === false
                                        ? "bg-rose-500 border-rose-600 text-white shadow-sm"
                                        : "bg-white border-slate-300 text-slate-400 dark:bg-slate-950 dark:border-slate-800"
                                  }`}
                                  title="Bấm để chuyển: Trống -> Trúng (✓) -> Trượt (✗) -> Trống"
                                >
                                  <span className="text-[7.5px] font-bold block leading-none text-slate-300 dark:text-slate-600 mb-0.5">{shotIdx + 1}</span>
                                  <span className="text-[10px] leading-none mt-px">{val === true ? "✓" : val === false ? "✗" : "-"}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Active Card Actions */}
                      <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                        <button
                          onClick={async () => {
                            if (confirm(`Bạn có chắc chắn muốn hủy và giải phóng vận động viên này khỏi bệ bắn?`)) {
                              const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
                              const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId.toLowerCase());
                              if (myWsIdx !== -1) {
                                currentWorkspaces[myWsIdx] = {
                                  ...currentWorkspaces[myWsIdx],
                                  athletes: (currentWorkspaces[myWsIdx].athletes || []).filter((a: any) => a.athleteId !== athId)
                                };
                                await handleUpdateWorkspaces(currentWorkspaces);
                              }
                            }
                          }}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-550 font-extrabold text-xs uppercase px-2.5 py-2.5 rounded-2xl flex items-center justify-center gap-1 hover:text-rose-600 transition active:scale-95 cursor-pointer font-sans bg-transparent"
                          title="Hủy & Giải phóng"
                        >
                          Hủy bỏ
                        </button>

                        <button
                          onClick={() => handleSaveAthleteWorkspaceScore(athId)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wide py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer border-0 font-sans"
                        >
                          <Save className="w-3.5 h-3.5" /> Ghi Nhận
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
