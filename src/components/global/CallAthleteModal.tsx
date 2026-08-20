import { Users, X, Search } from "lucide-react";
import { Athlete, DistanceConfig } from "../../types";
import { 
  getCleanVscNumber, 
  getCleanBibNumber, 
  isAthleteEliminated, 
  isAthleteEliminatedInPrevStage,
  isNoTeam
} from "../../utils/athleteUtils";

interface CallAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  competitionMode: "individual" | "team";
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  shotsCount: number;
  teamShotsCount: number;
  athletes: Athlete[];
  teamAthletes: Athlete[];
  leaderboardAthletes: Athlete[];
  leaderboardTeamAthletes: Athlete[];
  commandCenterState: any;
  scoreEvents: any[];
  refereeSelectedLane: number | null;
  selectedCallIds: string[];
  setSelectedCallIds: React.Dispatch<React.SetStateAction<string[]>>;
  callSearchTerm: string;
  setCallSearchTerm: (term: string) => void;
  callLaneAssignments: Record<string, number>;
  setCallLaneAssignments: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleUpdateWorkspaces: (workspaces: any[]) => Promise<void>;
  laneLimit: number;
}

export function CallAthleteModal({
  isOpen,
  onClose,
  currentUser,
  competitionMode,
  distances,
  teamDistances,
  shotsCount,
  teamShotsCount,
  athletes,
  teamAthletes,
  leaderboardAthletes,
  leaderboardTeamAthletes,
  commandCenterState,
  scoreEvents,
  refereeSelectedLane,
  selectedCallIds,
  setSelectedCallIds,
  callSearchTerm,
  setCallSearchTerm,
  callLaneAssignments,
  setCallLaneAssignments,
  handleUpdateWorkspaces,
  laneLimit,
}: CallAthleteModalProps) {
  if (!isOpen) return null;

  const workspaces = commandCenterState?.refereeWorkspaces || [];
  const refereeId = currentUser?.email || "anonymous";
  const sourceAthletes = leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes;
  const sourceTeamAthletes = leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes;
  const isCurrentModeTeam = (competitionMode === "team" || commandCenterState?.workflowStage === "team_competition");
  const allAths = (isCurrentModeTeam
    ? (sourceTeamAthletes && sourceTeamAthletes.length > 0
        ? sourceTeamAthletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName))
        : sourceAthletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName)))
    : sourceAthletes) || [];

  // Find which referee owns which athlete
  const ownerMap: Record<string, string> = {};
  const occupiedLanes = new Set<number>();

  workspaces.forEach((ws: any) => {
    if (ws.athletes) {
      ws.athletes.forEach((a: any) => {
        if (a.status === "scoring") {
          ownerMap[a.athleteId] = ws.refereeName || ws.refereeId.split("@")[0];
          if (a.laneNumber) {
            occupiedLanes.add(Number(a.laneNumber));
          }
        }
      });
    }
  });

  if (commandCenterState?.laneStatus) {
    Object.entries(commandCenterState.laneStatus).forEach(([lNumStr, lVal]: [string, any]) => {
      if (lVal?.athleteId && lVal?.status !== "completed") {
        occupiedLanes.add(Number(lNumStr));
      }
    });
  }

  // Filter current participants list
  const targetStages = isCurrentModeTeam ? teamDistances : distances;
  const activeHeatObj = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
  const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
  const activeDistanceId = isSoloHeat && activeHeatObj?.stageId ? activeHeatObj.stageId : (targetStages[commandCenterState?.currentDistanceIndex || 0]?.id);
  const currentDistIdx = targetStages.findIndex(s => s.id === activeDistanceId) >= 0 ? targetStages.findIndex(s => s.id === activeDistanceId) : (commandCenterState?.currentDistanceIndex || 0);

  const filtered = allAths.filter((a) => {
    if (!a) return false;

    // Bypass standard filters for Solo candidates in active Solo heats to ensure they can always be called
    const isThisAthSolo = isSoloHeat && (
      (commandCenterState?.soloQueue || []).includes(a.id) ||
      (activeHeatObj?.lanes || []).some((l: any) => l.participantId === a.id)
    );

    if (isThisAthSolo) {
      if (!callSearchTerm.trim()) return true;
      const term = callSearchTerm.toLowerCase();
      const nameStr = a.name || "";
      const idStr = a.id || "";
      const vscStr = a.vscNumber || "";
      const bibStr = a.bibNumber || "";
      const teamStr = a.team || "";
      return nameStr.toLowerCase().includes(term) || 
             idStr.toLowerCase().includes(term) || 
             vscStr.toLowerCase().includes(term) ||
             bibStr.toLowerCase().includes(term) ||
             teamStr.toLowerCase().includes(term);
    }

    if (isCurrentModeTeam && (!a.isPrimaryTeam || isNoTeam(a.team || a.clubName))) return false;

    const statusLower = (a.status || "").toString().toLowerCase();
    const qStatus = (a.qualificationStatus || "").toString();
    const isMarkedElim = statusLower === "bị loại" || statusLower === "eliminated" || qStatus === "eliminated" || qStatus === "not_qualified" || qStatus.startsWith("eliminated_");

    if (isMarkedElim) {
      // Check if they have scores in the current stage (in case they were manually restored/allowed)
      const currentDistScores = a.scores?.[activeDistanceId];
      const hasScores = currentDistScores && (Array.isArray(currentDistScores) ? currentDistScores.some((v: any) => v !== null && v !== undefined) : Boolean((currentDistScores as any).roundScore || (currentDistScores as any).roundHits));
      if (!hasScores) {
        return false; // Under no circumstances show them in Call Modal if they are eliminated and have no scores in this stage
      }
    }

    // Exclude athletes who are overall eliminated or eliminated in current stage
    if (isAthleteEliminated(a, activeDistanceId, targetStages)) {
      return false;
    }
    // Exclude athletes who are eliminated in previous stages
    if (activeDistanceId && isAthleteEliminatedInPrevStage(a, activeDistanceId, targetStages)) {
      return false;
    }

    if (statusLower === "bỏ thi" || statusLower === "dns" || statusLower === "withdrawn") {
      return false;
    }

    if (!callSearchTerm.trim()) return true;
    const term = callSearchTerm.toLowerCase();
    const nameStr = a.name || "";
    const idStr = a.id || "";
    const vscStr = a.vscNumber || "";
    const bibStr = a.bibNumber || "";
    const teamStr = a.team || "";
    return nameStr.toLowerCase().includes(term) || 
           idStr.toLowerCase().includes(term) || 
           vscStr.toLowerCase().includes(term) ||
           bibStr.toLowerCase().includes(term) ||
           teamStr.toLowerCase().includes(term);
  });

  // Sort filtered list: Solo candidates first, then standard order
  filtered.sort((a, b) => {
    const currentDistId = activeDistanceId || "";
    const currentHeatObj = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
    const hNum = Number(commandCenterState?.currentHeat || 0);
    let sri = 1;
    if (hNum > 10000) {
      const base = Math.floor(hNum / 100);
      sri = base % 100;
    } else {
      sri = hNum % 100;
    }
    const targetSoloRoundIdx = Math.max(0, sri - 1);

    const getIsSolo = (ath: Athlete) => {
      const isCurrentSoloHeat = Boolean(currentHeatObj && (currentHeatObj.heatType === "solo" || currentHeatObj.heatType === "resolo"));
      if (!isCurrentSoloHeat) return false;
      const isSoloQueue = (commandCenterState?.soloQueue || []).includes(ath.id) || ath.qualificationStatus === `pending_solo_${currentDistId}`;
      const isInHeat = Boolean(
        (currentHeatObj?.lanes || []).some((l: any) => l.participantId === ath.id) ||
        (currentHeatObj?.athletes || []).some((x: any) => x.id === ath.id || x.athleteId === ath.id) ||
        (currentHeatObj?.participantIds || []).includes(ath.id)
      );
      const athRounds = ath.soloRounds?.[currentDistId] || [];
      const athDetails = ath.soloShotDetails?.[currentDistId] || [];
      const done = (athRounds.length > targetSoloRoundIdx) && Boolean(athDetails[targetSoloRoundIdx] && athDetails[targetSoloRoundIdx].some((s: any) => s !== null && s !== undefined));
      return (isSoloQueue || isInHeat) && !done;
    };

    const aSolo = getIsSolo(a);
    const bSolo = getIsSolo(b);
    if (aSolo && !bSolo) return -1;
    if (!aSolo && bSolo) return 1;
    return 0;
  });

  const handleClose = () => {
    onClose();
    setSelectedCallIds([]);
    setCallLaneAssignments({});
  };

  const handleCallSelected = async () => {
    const refIdLower = refereeId.toLowerCase();
    const refereeName = currentUser?.displayName || refIdLower.split("@")[0];

    const maxShots = isCurrentModeTeam ? teamShotsCount : shotsCount;

    // Add called athletes with their individually configured lanes to our referee workspace
    const currentWorkspaces = [...(commandCenterState?.refereeWorkspaces || [])];
    let myWsIndex = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refIdLower);

    const currentDistId = targetStages[commandCenterState?.currentDistanceIndex || 0]?.id;
    const newAthletesToCall = selectedCallIds.map((athId) => {
      const athObj = allAths.find((a) => a.id === athId);
      const assignedLane = refereeSelectedLane || callLaneAssignments[athId] || 1;
      const activeHeatObj = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
      const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
      const isSoloQueueForThisDist = isSoloHeat && Boolean(
        (commandCenterState?.soloQueue || []).includes(athId) ||
        athObj?.qualificationStatus === `pending_solo_${currentDistId}` ||
        (athObj?.qualificationStatus === "pending_solo" && isSoloHeat)
      );
      const isAthleteInSoloHeat = isSoloHeat && Boolean(
        (activeHeatObj?.lanes || []).some((l: any) => l.participantId === athId) ||
        (activeHeatObj?.athletes || []).some((a: any) => a.id === athId || a.athleteId === athId) ||
        (activeHeatObj?.participantIds || []).includes(athId)
      );

      const hNum = Number(commandCenterState?.currentHeat || 0);
      let sri = 1;
      if (hNum > 10000) {
        const base = Math.floor(hNum / 100);
        sri = base % 100;
      } else {
        sri = hNum % 100;
      }
      const targetSoloRoundIdx = Math.max(0, sri - 1);

      const athSoloRounds = athObj?.soloRounds?.[currentDistId] || [];
      const athSoloDetails = athObj?.soloShotDetails?.[currentDistId] || [];
      const hasCompletedCurrentSoloRound =
        (athSoloRounds[targetSoloRoundIdx] !== undefined && athSoloRounds[targetSoloRoundIdx] !== null) ||
        Boolean(athSoloDetails[targetSoloRoundIdx] && athSoloDetails[targetSoloRoundIdx].some((s: any) => s !== null && s !== undefined));

      const isSoloCandidate = isSoloHeat && (isSoloQueueForThisDist || isAthleteInSoloHeat || Boolean(athObj?.qualificationStatus?.includes("solo"))) && !hasCompletedCurrentSoloRound;

      return {
        athleteId: athId,
        athleteName: athObj ? athObj.name : "Vận động viên",
        scores: Array(maxShots).fill(null),
        status: "scoring" as const,
        lockedAt: new Date().toISOString(),
        laneNumber: assignedLane,
        isSolo: isSoloCandidate
      };
    });

    if (myWsIndex === -1) {
      currentWorkspaces.push({
        refereeId: refIdLower,
        refereeName,
        athletes: newAthletesToCall
      });
    } else {
      currentWorkspaces[myWsIndex] = {
        ...currentWorkspaces[myWsIndex],
        athletes: [
          ...(currentWorkspaces[myWsIndex].athletes || []),
          ...newAthletesToCall
        ]
      };
    }

    await handleUpdateWorkspaces(currentWorkspaces);
    onClose();
    setSelectedCallIds([]);
    setCallLaneAssignments({});
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl relative text-left flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-sans">
              📞 Gọi vận động viên (Call Athlete)
            </h3>
            <p className="text-[10px] text-gray-450 font-medium">Chọn một hoặc nhiều vận động viên để đưa vào không gian chấm điểm của bạn</p>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search filter */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên hoặc Số báo danh (BIB)..."
            value={callSearchTerm}
            onChange={(e) => setCallSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* List of Athletes */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 mb-3 max-h-[35vh]">
          {(() => {
            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">
                    Không tìm thấy vận động viên phù hợp.
                  </p>
                </div>
              );
            }

            const currentDistId = targetStages[commandCenterState?.currentDistanceIndex || 0]?.id;

            return filtered.map((ath, athIdx) => {
              const isSelected = selectedCallIds.includes(ath.id);
              const isOwnedBySomeoneElse = ownerMap[ath.id] && ownerMap[ath.id] !== refereeId.split("@")[0];
              
              // Compute rank in current round
              const allAthsWithTotal = allAths.map(a => {
                const scoresArray = a.scores?.[currentDistId] || [];
                const totalPoints = scoresArray.reduce((acc: number, val: any) => {
                  if (typeof val === 'number') return acc + val;
                  if (val === true) return acc + 10;
                  return acc;
                }, 0);
                return { id: a.id, total: totalPoints as number };
              });
              allAthsWithTotal.sort((x, y) => (y.total as number) - (x.total as number));
              const athRankIdx = allAthsWithTotal.findIndex(x => x.id === ath.id);
              const rankDisplay = athRankIdx !== -1 ? `${athRankIdx + 1}` : "-";

              // Find assigned heat, lane and shooting order from AssignmentEngine
              let assignedHeat = "-";
              let assignedLane = "-";
              let shootingOrderIdx = "-";
              if (commandCenterState?.heats) {
                commandCenterState.heats.forEach((h: any, hIdx: number) => {
                  const isCurrentStageHeat = !h.stageId || !currentDistId || h.stageId === currentDistId;
                  if (!isCurrentStageHeat) return;

                  const foundLane = h.lanes?.find((l: any) => l.participantId === ath.id);
                  if (foundLane) {
                    assignedHeat = h.heatName || (isCurrentModeTeam ? `Lượt ĐỒNG ĐỘI ${h.heatNumber || hIdx + 1}` : `Lượt ${h.heatNumber || hIdx + 1}`);
                    assignedLane = `Bệ ${foundLane.laneNumber}`;
                    if (isCurrentModeTeam && ath.team) {
                      const teamMembers = allAths
                        .filter((a) => a && a.team === ath.team)
                        .sort((a, b) => {
                          const idA = a.id || a.participantId || "";
                          const idB = b.id || b.participantId || "";
                          return idA.localeCompare(idB);
                        });
                      const memberIdx = teamMembers.findIndex((a) => a.id === ath.id);
                      if (memberIdx !== -1) {
                        shootingOrderIdx = `#${memberIdx + 1}`;
                      } else if (foundLane.shootingOrder !== undefined) {
                        shootingOrderIdx = `#${foundLane.shootingOrder}`;
                      } else {
                        shootingOrderIdx = `#${foundLane.laneNumber}`;
                      }
                    } else if (foundLane.shootingOrder !== undefined) {
                      shootingOrderIdx = `#${foundLane.shootingOrder}`;
                    } else {
                      shootingOrderIdx = `#${(hIdx * 10) + foundLane.laneNumber}`;
                    }
                  }
                });
              }

              // Determine detailed status and styling
              let statusLabel = "Chưa bắn";
              let statusColor = "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
              let isClickable = true;

              const hasCompleted = (commandCenterState?.scoreEvents || scoreEvents || []).some(
                (evt: any) => evt.athleteId === ath.id && evt.distanceId === currentDistId && !evt.deleted
              ) || (() => {
                const mainScores = ath.scores?.[currentDistId];
                return mainScores && mainScores.some((s: any) => s !== null && s !== undefined);
              })();

              const isSoloQueueForThisDist = isSoloHeat && Boolean(
                (commandCenterState?.soloQueue || []).includes(ath.id) ||
                ath.qualificationStatus === `pending_solo_${currentDistId}` ||
                (ath.qualificationStatus === "pending_solo" && isSoloHeat)
              );
              const isAthleteInSoloHeat = isSoloHeat && Boolean(
                (activeHeatObj?.lanes || []).some((l: any) => l.participantId === ath.id) ||
                (activeHeatObj?.athletes || []).some((x: any) => x.id === ath.id || x.athleteId === ath.id) ||
                (activeHeatObj?.participantIds || []).includes(ath.id)
              );

              const hNum = Number(commandCenterState?.currentHeat || 0);
              let sri = 1;
              if (hNum > 10000) {
                const base = Math.floor(hNum / 100);
                sri = base % 100;
              } else {
                sri = hNum % 100;
              }
              const targetSoloRoundIdx = Math.max(0, sri - 1);

              const athSoloRounds = ath.soloRounds?.[currentDistId] || [];
              const athSoloDetails = ath.soloShotDetails?.[currentDistId] || [];
              const hasCompletedCurrentSoloRound =
                (athSoloRounds[targetSoloRoundIdx] !== undefined && athSoloRounds[targetSoloRoundIdx] !== null) ||
                Boolean(athSoloDetails[targetSoloRoundIdx] && athSoloDetails[targetSoloRoundIdx].some((s: any) => s !== null && s !== undefined));

              const isSoloCandidate = isSoloHeat && (isSoloQueueForThisDist || isAthleteInSoloHeat) && !hasCompletedCurrentSoloRound;

              const correspondingIndividualAth = (athletes || []).find(a => a && (
                a.id === ath.id || 
                (a.participantId && ath.id && a.participantId === ath.id) || 
                (a.id && ath.participantId && a.id === ath.participantId) ||
                (a.participantId && ath.participantId && a.participantId === ath.participantId) ||
                (a.vscNumber && ath.vscNumber && a.vscNumber === ath.vscNumber) || 
                (a.bibNumber && ath.bibNumber && a.bibNumber === ath.bibNumber)
              ));
              const isCheckedIn = ath.status === "checked_in" || 
                                  ath.status === "Thi đấu" ||
                                  ath.checkInStatus === "checked_in" ||
                                  (correspondingIndividualAth && (
                                    correspondingIndividualAth.status === "checked_in" || 
                                    correspondingIndividualAth.status === "Thi đấu" ||
                                    correspondingIndividualAth.checkInStatus === "checked_in"
                                  ));

              if (isSoloCandidate) {
                statusLabel = "⚡ CẦN THI ĐẤU SOLO";
                statusColor = "bg-amber-500 text-white font-black border-amber-600 shadow-md animate-pulse";
                isClickable = true;
              } else if (ath.status === "Bỏ thi" || ath.status === "DNS" || ath.checkInStatus === "DNS") {
                statusLabel = "DNS / Bỏ thi";
                statusColor = "bg-amber-50 text-amber-750 border-amber-200 dark:bg-amber-955/20 dark:text-amber-300 dark:border-amber-900/35";
                isClickable = false;
              } else if (ath.status === "DQ") {
                statusLabel = "Bị loại (DQ)";
                statusColor = "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-955/30 dark:text-rose-300 dark:border-rose-900/35";
                isClickable = false;
              } else if (ath.status === "Withdraw") {
                statusLabel = "Rút lui";
                statusColor = "bg-slate-100 text-slate-755 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800";
                isClickable = false;
              } else if (isOwnedBySomeoneElse) {
                statusLabel = `Đang chấm bởi: ${ownerMap[ath.id]}`;
                statusColor = "bg-amber-500 text-white border-amber-600 shadow-sm";
                isClickable = false;
              } else if (hasCompleted) {
                statusLabel = "Đã hoàn thành";
                statusColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/25 dark:text-blue-300 dark:border-blue-900/35";
                isClickable = false;
              } else if (isSelected) {
                statusLabel = `Đã chọn (Bệ #${callLaneAssignments[ath.id] || 1})`;
                statusColor = "bg-indigo-600 text-white border-indigo-700 shadow-sm";
              } else if (isCheckedIn) {
                statusLabel = "Sẵn sàng";
                statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-300 dark:border-emerald-900/35";
              } else {
                statusLabel = "Chưa điểm danh";
                statusColor = "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800";
                isClickable = false;
              }

              const handleCardClick = () => {
                if (isOwnedBySomeoneElse) {
                  alert(`Không thể gọi: VĐV này đang được trọng tài ${ownerMap[ath.id]} chấm điểm.`);
                  return;
                }
                if (!isClickable && !isSelected) {
                  alert(`Không thể gọi VĐV ở trạng thái: ${statusLabel}`);
                  return;
                }

                if (isSelected) {
                  setSelectedCallIds(prev => prev.filter(id => id !== ath.id));
                  setCallLaneAssignments(prev => {
                    const updated = { ...prev };
                    delete updated[ath.id];
                    return updated;
                  });
                } else {
                  // Auto-detect preferred lane from heats
                  let preferredLane = 1;
                  if (commandCenterState?.heats) {
                    commandCenterState.heats.forEach((h: any) => {
                      const foundLane = h.lanes?.find((l: any) => l.participantId === ath.id);
                      if (foundLane) {
                        preferredLane = foundLane.laneNumber;
                      }
                    });
                  }

                  // Check if preferredLane is free, otherwise find next free
                  let nextFreeLane = preferredLane;
                  const isLaneOccupied = occupiedLanes.has(preferredLane) || Object.values(callLaneAssignments).includes(preferredLane);
                  if (isLaneOccupied) {
                    for (let l = 1; l <= laneLimit; l++) {
                      const isLaneInOccupied = occupiedLanes.has(l);
                      const isLaneInAssignments = Object.values(callLaneAssignments).includes(l);
                      if (!isLaneInOccupied && !isLaneInAssignments) {
                        nextFreeLane = l;
                        break;
                      }
                    }
                  }

                  setSelectedCallIds(prev => [...prev, ath.id]);
                  setCallLaneAssignments(prev => ({
                    ...prev,
                    [ath.id]: nextFreeLane
                  }));
                }
              };

              return (
                <div 
                  key={`${ath.id || 'ath'}-${athIdx}`}
                  onClick={handleCardClick}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2.5 transition cursor-pointer ${
                    isSelected 
                      ? "bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-500 text-indigo-900 dark:text-indigo-200" 
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? "bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}>
                        {ath.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black">{ath.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                          VSC: {getCleanVscNumber(ath.vscNumber, ath.id)} {ath.bibNumber && `• BIB: ${getCleanBibNumber(ath.bibNumber, ath.id)}`} • {ath.team || "Tự Do"}
                        </span>
                      </div>
                    </div>

                    <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border rounded-lg ${statusColor}`}>
                      {statusLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/80 pt-2 text-[9px] text-slate-450 font-bold font-sans">
                    <div>
                      <span className="text-slate-400 block font-normal">Hạng Vòng:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">#{rankDisplay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal">Shooting Order:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">{shootingOrderIdx}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal">Lượt Bắn (Heat):</span>
                      <span className="text-slate-700 dark:text-slate-300">{assignedHeat}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal">Bệ Bắn (Lane):</span>
                      <span className="text-slate-700 dark:text-slate-300">{assignedLane}</span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Individual Target Lane Configuration */}
        {selectedCallIds.length > 0 && (() => {
          return (
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 max-h-[22vh] overflow-y-auto">
              <span className="text-xs font-black block text-slate-850 dark:text-slate-200 mb-2">Phân chia bệ bắn (Bệ #1 - #{laneLimit}):</span>
              <div className="flex flex-col gap-2">
                {selectedCallIds.map((athId) => {
                  const athObj = allAths.find(a => a.id === athId);
                  if (!athObj) return null;
                  return (
                    <div key={athId} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-150 dark:border-slate-800">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{athObj.name}</p>
                        <span className="text-[9px] text-gray-400 font-mono">
                          VSC: {getCleanVscNumber(athObj.vscNumber, athObj.id)} {athObj.bibNumber && `| BIB: ${getCleanBibNumber(athObj.bibNumber, athObj.id)}`}
                        </span>
                      </div>
                      {refereeSelectedLane ? (
                        <span className="text-xs font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 px-3 py-1.5 rounded-xl font-sans shrink-0">
                          Bệ #{refereeSelectedLane} (Định sẵn)
                        </span>
                      ) : (
                        <select
                          value={callLaneAssignments[athId] || 1}
                          onChange={(e) => {
                            const newLane = Number(e.target.value);
                            setCallLaneAssignments(prev => ({
                              ...prev,
                              [athId]: newLane
                            }));
                          }}
                          className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs font-extrabold rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          {Array.from({ length: laneLimit }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>Bệ #{i + 1}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Footer buttons */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer text-center"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={selectedCallIds.length === 0}
            onClick={handleCallSelected}
            className={`flex-1 px-4 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition text-center shadow-md ${
              selectedCallIds.length === 0 
                ? "bg-indigo-300 dark:bg-indigo-800/50 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
            }`}
          >
            Gọi {selectedCallIds.length} vận động viên
          </button>
        </div>
      </div>
    </div>
  );
}
