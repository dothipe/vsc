import React from "react";
import { Save, Edit3, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cleanStageName, isNoTeam } from "../../utils/athleteUtils";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";

interface AssignmentsTabProps {
  assignmentMode: "individual" | "team";
  setAssignmentMode: (val: "individual" | "team") => void;
  assignmentStageId: string;
  setAssignmentStageId: (val: string) => void;
  distances: any[];
  teamDistances: any[];
  isSelectedStageFirstStage: boolean;
  assignmentStrategy: "random" | "sequential" | "snake" | "ranking" | "ranking_asc" | "seeded";
  setAssignmentStrategy: (val: "random" | "sequential" | "snake" | "ranking" | "ranking_asc" | "seeded") => void;
  laneCapacity: number;
  setLaneCapacity: (val: number) => void;
  assignmentClubSeparation: boolean;
  setAssignmentClubSeparation: (val: boolean) => void;
  editingVersionId: string | null;
  setEditingVersionId: (val: string | null) => void;
  canUpdate: boolean;
  athletesList: any[];
  assignmentVersions: any[];
  setAssignmentVersions: (val: any[]) => void;
  setGeneratedHeats: (val: any[]) => void;
  setIsDirty: (val: boolean) => void;
  triggerAutoSaveAssignments: (versions: any[], heats: any[]) => void;
  teamAssignmentMode: "parallel" | "sequential";
  setTeamAssignmentMode: (val: "parallel" | "sequential") => void;
  teamShuffleTeams: boolean;
  setTeamShuffleTeams: (val: boolean) => void;
  editTourId: string | null;
  sortedAssignmentVersions: any[];
  expandedVersionIds: Record<string, boolean>;
  setExpandedVersionIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  generatedHeats: any[];
  globalMasterAthletes?: any[];
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  assignmentMode,
  setAssignmentMode,
  assignmentStageId,
  setAssignmentStageId,
  distances,
  teamDistances,
  isSelectedStageFirstStage,
  assignmentStrategy,
  setAssignmentStrategy,
  laneCapacity,
  setLaneCapacity,
  assignmentClubSeparation,
  setAssignmentClubSeparation,
  editingVersionId,
  setEditingVersionId,
  canUpdate,
  athletesList,
  assignmentVersions,
  setAssignmentVersions,
  setGeneratedHeats,
  setIsDirty,
  triggerAutoSaveAssignments,
  teamAssignmentMode,
  setTeamAssignmentMode,
  teamShuffleTeams,
  setTeamShuffleTeams,
  editTourId,
  sortedAssignmentVersions,
  expandedVersionIds,
  setExpandedVersionIds,
  generatedHeats,
  globalMasterAthletes = [],
}) => {
  const getLaneAvatar = (lane: any) => {
    // Look up in athletesList first
    const athlete = athletesList.find(
      (a) =>
        a.id === lane.participantId ||
        a.participantId === lane.participantId ||
        a.fullName === lane.fullName ||
        a.name === lane.fullName
    );
    
    let avatarUrl = lane.avatarUrl || (athlete ? (athlete.avatarUrl || athlete.avatar) : null);
    
    // Fallback to globalMasterAthletes if not found in athletesList or stripped
    if (!avatarUrl || avatarUrl.startsWith("data:image") === false) {
      const targetId = athlete?.masterAthleteId || athlete?.athleteId || athlete?.participantId || athlete?.id || lane.participantId;
      if (targetId) {
        const found = globalMasterAthletes.find((a) => a.id === targetId || a.athleteId === targetId);
        if (found) {
          avatarUrl = found.avatarUrl || found.avatar || avatarUrl;
        }
      }
    }
    
    let gender = athlete ? athlete.gender : "Nam";
    return avatarUrl || (gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  const getCleanedStageName = (name: string): string => {
    if (!name) return "Sơ đồ chưa đặt tên";
    let cleaned = name
      .replace(/undefined/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/:\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned || cleaned === ":" || cleaned === "(Đồng Đội)") {
      return "Sơ đồ chưa đặt tên";
    }
    return cleaned;
  };

  const renderAssignmentsList = (mode: "individual" | "team") => {
    const listVersions = sortedAssignmentVersions.filter(ver => {
      const isTeam = ver.strategy?.startsWith("team_") || ver.name?.includes("(Đồng Đội)");
      const matchesStage = assignmentStageId ? ver.stageId === assignmentStageId : true;
      return (mode === "team" ? isTeam : !isTeam) && matchesStage;
    });

    return (
      <div className="space-y-4 pt-4 border-t border-slate-150 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block font-mono">
            Danh Sách Sơ Đồ Đấu {mode === "team" ? "Đồng Đội" : "Cá Nhân"} ({listVersions.length})
          </h3>
        </div>

        {listVersions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold">
            Chưa có sơ đồ đấu {mode === "team" ? "Đồng Đội" : "Cá Nhân"} nào được lưu cho giải đấu này. Hãy cấu hình phía trên và bấm phát sinh bệ bắn.
          </div>
        ) : (
          <div className="space-y-3">
            {listVersions.map((ver, idx) => {
              const isExpanded = !!expandedVersionIds[ver.id];
              const displayName = getCleanedStageName(ver.name);
              return (
                <div key={ver.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
                  {/* Header Card */}
                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-950 dark:text-white text-sm">{displayName}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                          Vị trí {idx + 1}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-400 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Chiến thuật: {
                          ver.strategy === "random" ? "Random (Ngẫu nhiên)" :
                          ver.strategy === "sequential" ? "Tuần tự theo BIB" :
                          ver.strategy === "snake" ? "Snake (Dạng Rắn)" :
                          ver.strategy === "ranking" ? "Ranking (Hạt giống)" :
                          ver.strategy === "ranking_asc" ? "Ranking Asc (Hạt giống tăng dần)" :
                          ver.strategy === "seeded" ? "Seeded (Trải đều)" : 
                          ver.strategy === "team_parallel" ? "Đồng Đội (Song song)" :
                          ver.strategy === "team_sequential" ? "Đồng Đội (Nối tiếp)" : ver.strategy
                        }</span>
                        <span>•</span>
                        <span>Số bệ: {ver.lanesCount || ver.heats?.[0]?.lanes?.length || 8}</span>
                        <span>•</span>
                        <span>Tách CLB: {ver.clubSeparation ? "Bật" : "Tắt"}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{new Date(ver.timestamp).toLocaleTimeString("vi-VN")}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVersionId(ver.id);
                          setAssignmentStageId(ver.stageId || "");
                          if (ver.strategy?.startsWith("team_")) {
                            setAssignmentMode("team");
                            setTeamAssignmentMode(ver.strategy === "team_sequential" ? "sequential" : "parallel");
                          } else {
                            setAssignmentMode("individual");
                            setAssignmentStrategy((ver.strategy || "random") as any);
                          }
                          setLaneCapacity(ver.lanesCount || ver.heats?.[0]?.lanes?.length || 10);
                          setAssignmentClubSeparation(!!ver.clubSeparation);
                        }}
                        className="p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                        title="Sửa sơ đồ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa sơ đồ vòng "${ver.name}"?`)) {
                            const updatedVersions = assignmentVersions.filter(v => v.id !== ver.id);
                            setAssignmentVersions(updatedVersions);
                            setIsDirty(true);
                            triggerAutoSaveAssignments(updatedVersions, generatedHeats);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        title="Xóa sơ đồ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle view */}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedVersionIds(prev => ({
                            ...prev,
                            [ver.id]: !prev[ver.id]
                          }));
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> Thu Gọn
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> Xem Heats
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Heats Details content */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/20 dark:bg-slate-950/10 space-y-4 animate-fadeIn border-t border-slate-100 dark:border-slate-850">
                      <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest">
                        <span>BẢNG CHI TIẾT BỆ BẮN ({ver.heats?.length || 0} Heats)</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(ver.heats || []).map((heat: any) => (
                          <div key={heat.heatId || heat.heatNumber} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                            <div className="bg-indigo-650/5 dark:bg-slate-800 px-3 py-2 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs font-black">
                              <span className="text-indigo-700 dark:text-indigo-400 font-bold">LƯỢT BẮN #{heat.heatNumber}</span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold px-2 py-0.5 rounded">
                                Trọng tài: {heat.refereeId || "Chưa chỉ định"}
                              </span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(heat.lanes || []).map((lane: any) => (
                                <div key={lane.laneNumber} className="px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-750 dark:text-slate-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 font-mono shrink-0">BIA {lane.laneNumber}</span>
                                    <img 
                                      src={getLaneAvatar(lane)} 
                                      alt="Avatar" 
                                      className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="font-extrabold text-slate-900 dark:text-white">{lane.fullName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9.5px] text-slate-400 font-mono">BIB: {lane.bibNumber}</span>
                                    <span className="text-[9px] bg-slate-50 dark:bg-slate-850 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                      {lane.clubName || lane.clubId || "Tự Do"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Assignments (Sắp Xếp Bệ Bắn & Lượt Bắn Heats)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Tính toán sơ đồ bệ bắn, chia heats tự động và gán trọng tài bãi bắn bằng Động cơ Phân bệ (AssignmentEngine) cho cả Cá Nhân và Đồng Đội.
        </p>
      </div>

      {/* Mode Selector for Individual vs Team */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setAssignmentMode("individual")}
          className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            assignmentMode === "individual"
              ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Cá Nhân (Individual)
        </button>
        <button
          type="button"
          onClick={() => setAssignmentMode("team")}
          className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            assignmentMode === "team"
              ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Đồng Đội (Team Assignment)
        </button>
      </div>

      {assignmentMode === "individual" ? (
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
          <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Thiết Lập Động Cơ Phân Bệ Cá Nhân</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Cự ly */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Cự ly / Vòng thi đấu *</label>
              <select
                value={assignmentStageId}
                onChange={(e) => setAssignmentStageId(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none font-semibold"
              >
                <option value="">-- Chọn vòng cự ly --</option>
                {distances.map((d, index) => (
                  <option key={d.id} value={d.id}>
                    Vòng {index + 1}: {d.name || d.distance} {d.name && d.distance && d.name !== d.distance ? `(${d.distance})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Chiến thuật chia làn */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Chiến thuật chia làn *</label>
              <select
                value={isSelectedStageFirstStage ? "sequential" : assignmentStrategy}
                disabled={isSelectedStageFirstStage}
                onChange={(e) => setAssignmentStrategy(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-900"
              >
                <option value="random">Random (Phân ngẫu nhiên)</option>
                <option value="sequential">Sequential (Tuần tự theo BIB)</option>
                <option value="snake">Snake (Phân dạng Rắn)</option>
                <option value="ranking">Ranking Based (Theo hạt giống lớn đến nhỏ)</option>
                <option value="ranking_asc">Ranking Ascending (Hạt giống từ nhỏ đến lớn)</option>
                <option value="seeded">Seeded Distribution (Trải đều hạt giống)</option>
              </select>
              {isSelectedStageFirstStage && (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 max-w-[200px] leading-tight">
                  * Vòng 1 bắt buộc xếp bệ tuần tự theo số BIB (không tách CLB)
                </span>
              )}
            </div>

            {/* Số lượng bệ bắn */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Số lượng bệ bắn (Lanes count)</label>
              <input
                type="number"
                min={2}
                max={50}
                value={laneCapacity}
                onChange={(e) => setLaneCapacity(Number(e.target.value))}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>

            {/* Tách biệt CLB */}
            <div className="flex flex-col gap-1 justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold mt-4 disabled:opacity-50">
                <input
                  type="checkbox"
                  checked={isSelectedStageFirstStage ? false : assignmentClubSeparation}
                  disabled={isSelectedStageFirstStage}
                  onChange={(e) => setAssignmentClubSeparation(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-50"
                />
                <span className={isSelectedStageFirstStage ? "text-slate-400 dark:text-slate-500 line-through" : ""}>Tách biệt CLB đồng đội</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 gap-2">
            {editingVersionId && (
              <button
                type="button"
                onClick={() => {
                  setEditingVersionId(null);
                  setAssignmentStageId("");
                  setAssignmentStrategy("random");
                  setLaneCapacity(10);
                  setAssignmentClubSeparation(true);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Hủy Chỉnh Sửa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!assignmentStageId) {
                  alert("Vui lòng chọn Cự ly / Vòng thi đấu trước!");
                  return;
                }

                const targetStageIndex = distances.findIndex(d => d.id === assignmentStageId);
                const isFirstStage = targetStageIndex <= 0;

                const activeAthletes = athletesList.filter(a => {
                  const isActive = a.status !== "Bỏ thi" && a.status !== "dns" && a.status !== "withdrawn";
                  if (!isActive) return false;

                  if (isFirstStage) {
                    return true;
                  } else {
                    const prevStage = !isFirstStage ? distances[targetStageIndex - 1] : null;
                    const hasPrevStageEliminations = prevStage ? athletesList.some(a => a.qualificationStatus === `eliminated_${prevStage.id}`) : false;
                    const hasPrevStageScores = prevStage ? athletesList.some(a => {
                      const s = a.scores?.[prevStage.id];
                      return Array.isArray(s) && s.some(score => score !== null);
                    }) : false;
                    const isPrevStageFinalized = isFirstStage || hasPrevStageEliminations || hasPrevStageScores;

                    if (!isPrevStageFinalized) {
                      return false;
                    }

                    const previousStages = distances.slice(0, targetStageIndex);
                    const isEliminatedInPrev = previousStages.some(stage => 
                      a.qualificationStatus === `eliminated_${stage.id}`
                    );
                    return !isEliminatedInPrev;
                  }
                });

                const lanesCount = laneCapacity || 8;
                const finalStrategy = isFirstStage ? "sequential" : assignmentStrategy;
                const doClubSeparation = isFirstStage ? false : assignmentClubSeparation;

                const generatedHeatsList: any[] = [];
                if (activeAthletes.length > 0) {
                  let sortedList = [...activeAthletes];

                  if (finalStrategy === "sequential") {
                    sortedList.sort((a, b) => {
                      const bibA = parseInt((a.bibNumber || "").replace(/\D/g, "")) || 0;
                      const bibB = parseInt((b.bibNumber || "").replace(/\D/g, "")) || 0;
                      return bibA - bibB;
                    });
                  } else if (finalStrategy === "random") {
                    sortedList.sort(() => Math.random() - 0.5);
                  } else if (finalStrategy === "snake") {
                    sortedList.sort((a, b) => {
                      const scoreA: number = (Object.values(a.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      const scoreB: number = (Object.values(b.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      return scoreB - scoreA;
                    });
                  } else if (finalStrategy === "ranking") {
                    sortedList.sort((a, b) => {
                      const scoreA: number = (Object.values(a.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      const scoreB: number = (Object.values(b.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      return scoreB - scoreA;
                    });
                  } else if (finalStrategy === "ranking_asc") {
                    sortedList.sort((a, b) => {
                      const scoreA: number = (Object.values(a.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      const scoreB: number = (Object.values(b.scores || {}) as any[]).reduce((sum: number, r: any): number => {
                        if (Array.isArray(r)) {
                          return sum + r.reduce((s: number, val) => s + (Number(val) || 0), 0);
                        }
                        return sum;
                      }, 0);
                      return scoreA - scoreB;
                    });
                  } else if (finalStrategy === "seeded") {
                    sortedList.sort(() => Math.random() - 0.5);
                  }

                  if (doClubSeparation && finalStrategy !== "sequential") {
                    const separated: typeof sortedList = [];
                    const clubMap: Record<string, typeof sortedList> = {};
                    sortedList.forEach(ath => {
                      const club = ath.clubName || ath.team || "Tự Do";
                      if (!clubMap[club]) clubMap[club] = [];
                      clubMap[club].push(ath);
                    });

                    let hasItems = true;
                    while (hasItems) {
                      hasItems = false;
                      Object.keys(clubMap).forEach(club => {
                        if (clubMap[club].length > 0) {
                          separated.push(clubMap[club].shift()!);
                          hasItems = true;
                        }
                      });
                    }
                    sortedList = separated;
                  }

                  const totalAthletes = sortedList.length;
                  const totalHeats = Math.ceil(totalAthletes / lanesCount);

                  for (let heatNum = 1; heatNum <= totalHeats; heatNum++) {
                    const heatId = `heat-${heatNum}-${Date.now()}`;
                    const lanesList: any[] = [];

                    for (let l = 1; l <= lanesCount; l++) {
                      const athIndex = (heatNum - 1) * lanesCount + (l - 1);
                      if (athIndex >= totalAthletes) break;

                      const athlete = sortedList[athIndex];
                      lanesList.push({
                        laneNumber: l,
                        participantId: athlete.participantId || athlete.id,
                        fullName: athlete.fullName || athlete.name,
                        bibNumber: athlete.bibNumber || `BIB-${athlete.id}`,
                        clubName: athlete.clubName || athlete.team || "Tự Do",
                        clubId: athlete.clubId || "CLB",
                        refereeId: `referee_${(l - 1) % 3 + 1}`,
                        shootingOrder: 1,
                        avatarUrl: athlete.avatarUrl || ""
                      });
                    }

                    generatedHeatsList.push({
                      heatId,
                      heatNumber: heatNum,
                      tournamentId: editTourId || "tour-temp",
                      stageId: assignmentStageId,
                      roundId: "r1",
                      status: "pending",
                      heatName: `Lượt bắn ${heatNum}`,
                      lanes: lanesList
                    });
                  }
                }

                if (activeAthletes.length > 0 && generatedHeatsList.length === 0) {
                  alert("Không tạo được lượt đấu nào!");
                  return;
                }

                const distanceObj = distances.find(d => d.id === assignmentStageId);
                const distanceIndex = distances.findIndex(d => d.id === assignmentStageId);
                const prefix = distanceIndex !== -1 ? `Vòng ${distanceIndex + 1}: ` : "";
                const distName = distanceObj
                  ? (distanceObj.name && distanceObj.distance && distanceObj.name !== distanceObj.distance
                      ? `${distanceObj.name} (${distanceObj.distance})`
                      : (distanceObj.name || distanceObj.distance))
                  : "Chưa rõ cự ly";
                const stageName = cleanStageName(`${prefix}${distName}`);

                let updatedVersions: any[] = [];
                if (editingVersionId) {
                  updatedVersions = assignmentVersions.map(v => v.id === editingVersionId ? {
                    ...v,
                    name: stageName,
                    stageId: assignmentStageId,
                    timestamp: new Date().toISOString(),
                    strategy: finalStrategy,
                    lanesCount: lanesCount,
                    clubSeparation: doClubSeparation,
                    heats: generatedHeatsList
                  } : v);
                  setAssignmentVersions(updatedVersions);
                  setEditingVersionId(null);
                  if (activeAthletes.length === 0) {
                    alert(`✓ Đã cập nhật cấu hình chiến thuật chia làn thành công cho cự ly "${stageName}"!`);
                  } else {
                    alert(`✓ Đã cập nhật thành công sơ đồ đấu cho cự ly "${stageName}"!`);
                  }
                } else {
                  const newVer = {
                    id: `ver-${Date.now()}`,
                    name: stageName,
                    stageId: assignmentStageId,
                    timestamp: new Date().toISOString(),
                    strategy: finalStrategy,
                    lanesCount: lanesCount,
                    clubSeparation: doClubSeparation,
                    heats: generatedHeatsList
                  };
                  updatedVersions = [newVer, ...assignmentVersions];
                  setAssignmentVersions(updatedVersions);
                  if (activeAthletes.length === 0) {
                    alert(`✓ Đã cấu hình trước chiến thuật chia làn chờ phát sinh thành công cho cự ly "${stageName}"! Sơ đồ bệ bắn sẽ tự động phát sinh khi vòng đấu trước kết thúc và bạn bấm lọc VĐV ở Mission Control.`);
                  } else {
                    alert(`✓ Đã phát sinh và lưu thành công sơ đồ đấu cho cự ly "${stageName}"!`);
                  }
                }

                setGeneratedHeats(generatedHeatsList);
                setIsDirty(true);
                triggerAutoSaveAssignments(updatedVersions, generatedHeatsList);
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-indigo-100"
            >
              <Save className="w-4 h-4 text-indigo-100" /> {editingVersionId ? "CẬP NHẬT SƠ ĐỒ ĐẤU" : "TẠO & LƯU SƠ ĐỒ ĐẤU"}
            </button>
          </div>

          {/* Individual Assignments List */}
          {renderAssignmentsList("individual")}
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-450 uppercase tracking-wider block">Thiết Lập Động Cơ Phân Bệ Đồng Đội</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Cự ly đồng đội */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Vòng thi đấu Đồng Đội *</label>
              <select
                value={assignmentStageId}
                onChange={(e) => setAssignmentStageId(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none font-semibold"
              >
                <option value="">-- Chọn vòng đồng đội --</option>
                {teamDistances.map((d, index) => (
                  <option key={d.id} value={d.id}>
                    Vòng {index + 1}: {d.name || d.distance}
                  </option>
                ))}
              </select>
            </div>

            {/* Chế độ bắn đồng đội */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Chế độ bắn đồng đội *</label>
              <select
                value={teamAssignmentMode}
                onChange={(e) => setTeamAssignmentMode(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="parallel">Parallel Shooting (Các đội bắn song song)</option>
                <option value="sequential">Sequential Shooting (Bắn nối tiếp đồng đội)</option>
              </select>
            </div>

            {/* Số lượng bệ bắn */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Số lượng bệ bắn (Lanes count)</label>
              <input
                type="number"
                min={2}
                max={50}
                value={laneCapacity}
                onChange={(e) => setLaneCapacity(Number(e.target.value))}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>

            {/* Bốc thăm ngẫu nhiên */}
            <div className="flex items-center h-full">
              <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-3 py-2 rounded-xl select-none w-full shadow-xs">
                <input
                  type="checkbox"
                  checked={teamShuffleTeams}
                  onChange={(e) => setTeamShuffleTeams(e.target.checked)}
                  className="accent-emerald-600 rounded w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-450">Bốc thăm ngẫu nhiên</span>
                  <span className="text-[9px] text-slate-400 font-medium">Bốc thăm thứ tự đội</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 gap-2">
            {editingVersionId && (
              <button
                type="button"
                onClick={() => {
                  setEditingVersionId(null);
                  setAssignmentStageId("");
                  setLaneCapacity(10);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Hủy Chỉnh Sửa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!assignmentStageId) {
                  alert("Vui lòng chọn Cự ly / Vòng thi đấu Đồng Đội trước!");
                  return;
                }

                const targetTeamStageIndex = (teamDistances || []).findIndex(d => d.id === assignmentStageId);
                const isFirstTeamStage = targetTeamStageIndex <= 0;

                const activeTeamAthletes = athletesList.filter(a => {
                  if (!a.isPrimaryTeam) return false;
                  const isActive = a.status !== "Bỏ thi" && a.status !== "dns" && a.status !== "withdrawn";
                  if (!isActive) return false;
                  if (isNoTeam(a.team || a.clubName)) return false;

                  if (isFirstTeamStage) {
                    return true;
                  } else {
                    const prevTeamStage = !isFirstTeamStage ? (teamDistances || [])[targetTeamStageIndex - 1] : null;
                    const hasPrevTeamStageEliminations = prevTeamStage ? athletesList.some(a => a.qualificationStatus === `eliminated_${prevTeamStage.id}`) : false;
                    const hasPrevTeamStageScores = prevTeamStage ? athletesList.some(a => {
                      const s = a.scores?.[prevTeamStage.id];
                      return Array.isArray(s) && s.some(score => score !== null);
                    }) : false;
                    const isPrevTeamStageFinalized = isFirstTeamStage || hasPrevTeamStageEliminations || hasPrevTeamStageScores;

                    if (!isPrevTeamStageFinalized) {
                      return false;
                    }
                    const previousStages = (teamDistances || []).slice(0, targetTeamStageIndex);
                    const isEliminatedInPrev = previousStages.some(stage => 
                      a.qualificationStatus === `eliminated_${stage.id}`
                    );
                    return !isEliminatedInPrev;
                  }
                });

                const lanesCount = laneCapacity || 8;
                const generatedHeatsList: any[] = [];

                if (activeTeamAthletes.length > 0) {
                  const teamsMap: Record<string, typeof activeTeamAthletes> = {};
                  activeTeamAthletes.forEach(ath => {
                    const teamName = ath.team || ath.clubName || "Không có Đội";
                    if (!teamsMap[teamName]) {
                      teamsMap[teamName] = [];
                    }
                    teamsMap[teamName].push(ath);
                  });

                  let teamNames = Object.keys(teamsMap);
                  if (teamShuffleTeams) {
                    teamNames = [...teamNames].sort(() => Math.random() - 0.5);
                  }

                  if (teamAssignmentMode === "parallel") {
                    let currentHeatNum = 1;
                    let currentLaneNum = 1;
                    let currentLanesList: any[] = [];

                    teamNames.forEach((teamName) => {
                      const members = teamsMap[teamName] || [];
                      if (members.length === 0) return;

                      // Check if this team fits in the current heat
                      if (currentLaneNum + members.length - 1 > lanesCount) {
                        if (currentLanesList.length > 0) {
                          generatedHeatsList.push({
                            heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                            heatNumber: currentHeatNum,
                            tournamentId: editTourId || "tour-temp",
                            stageId: assignmentStageId,
                            roundId: "r1",
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
                      members.forEach((athlete) => {
                        currentLanesList.push({
                          laneNumber: currentLaneNum,
                          participantId: athlete.participantId || athlete.id,
                          fullName: athlete.fullName || athlete.name,
                          bibNumber: athlete.bibNumber || `BIB-${athlete.id}`,
                          clubName: athlete.team || athlete.clubName || "Không có Đội",
                          clubId: athlete.clubId || "CLB",
                          refereeId: `referee_${(currentLaneNum - 1) % 3 + 1}`,
                          shootingOrder: 1,
                          avatarUrl: athlete.avatarUrl || ""
                        });
                        currentLaneNum++;
                      });
                    });

                    // Push last heat
                    if (currentLanesList.length > 0) {
                      generatedHeatsList.push({
                        heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        heatNumber: currentHeatNum,
                        tournamentId: editTourId || "tour-temp",
                        stageId: assignmentStageId,
                        roundId: "r1",
                        status: "pending",
                        heatName: `Lượt bắn Đồng Đội ${currentHeatNum} (Song song)`,
                        lanes: currentLanesList
                      });
                    }
                  } else {
                    let blockCounter = 0;
                    const maxTeamSize = Math.max(...teamNames.map(name => (teamsMap[name] || []).length), 1);
                    let seqHeatNum = 1;

                    for (let i = 0; i < teamNames.length; i += lanesCount) {
                      const blockTeams = teamNames.slice(i, i + lanesCount);
                      blockCounter++;

                      for (let shooterIdx = 0; shooterIdx < maxTeamSize; shooterIdx++) {
                        const lanesList: any[] = [];

                        blockTeams.forEach((teamName, laneIdx) => {
                          const laneNum = laneIdx + 1;
                          const members = teamsMap[teamName] || [];
                          const athlete = members[shooterIdx];

                          if (athlete) {
                            lanesList.push({
                              laneNumber: laneNum,
                              participantId: athlete.participantId || athlete.id,
                              fullName: athlete.fullName || athlete.name,
                              bibNumber: athlete.bibNumber || `BIB-${athlete.id}`,
                              clubName: athlete.team || athlete.clubName || "Không có Đội",
                              clubId: athlete.clubId || "CLB",
                              refereeId: `referee_${(laneNum - 1) % 3 + 1}`,
                              shootingOrder: shooterIdx + 1,
                              avatarUrl: athlete.avatarUrl || ""
                            });
                          }
                        });

                        if (lanesList.length > 0) {
                          const currentHeatNumber = seqHeatNum++;
                          const heatId = `heat-team-s-${currentHeatNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                          generatedHeatsList.push({
                            heatId,
                            heatNumber: currentHeatNumber,
                            tournamentId: editTourId || "tour-temp",
                            stageId: assignmentStageId,
                            roundId: "r1",
                            status: "pending",
                            heatName: `Loạt bắn Đồng Đội ${currentHeatNumber} (Nối tiếp - VĐV ${shooterIdx + 1})`,
                            lanes: lanesList
                          });
                        }
                      }
                    }
                  }
                }

                if (activeTeamAthletes.length > 0 && generatedHeatsList.length === 0) {
                  alert("Không tạo được lượt đấu đồng đội nào!");
                  return;
                }

                const distanceObj = (teamDistances || []).find(d => d.id === assignmentStageId);
                const distanceIndex = (teamDistances || []).findIndex(d => d.id === assignmentStageId);
                const prefix = distanceIndex !== -1 ? `Vòng ${distanceIndex + 1}: ` : "";
                const distName = distanceObj
                  ? (distanceObj.name && distanceObj.distance && distanceObj.name !== distanceObj.distance
                      ? `${distanceObj.name} (${distanceObj.distance})`
                      : (distanceObj.name || distanceObj.distance))
                  : "Chưa rõ cự ly đồng đội";
                const stageName = cleanStageName(`${prefix}${distName} (Đồng Đội)`);

                let updatedVersions: any[] = [];
                if (editingVersionId) {
                  updatedVersions = assignmentVersions.map(v => v.id === editingVersionId ? {
                    ...v,
                    name: stageName,
                    stageId: assignmentStageId,
                    timestamp: new Date().toISOString(),
                    strategy: `team_${teamAssignmentMode}`,
                    lanesCount: lanesCount,
                    heats: generatedHeatsList
                  } : v);
                  setAssignmentVersions(updatedVersions);
                  setEditingVersionId(null);
                  if (activeTeamAthletes.length === 0) {
                    alert(`✓ Đã cập nhật thành công cấu hình chiến thuật chia làn chờ phát sinh cho vòng đồng đội "${stageName}"!`);
                  } else {
                    alert(`✓ Đã cập nhật thành công sơ đồ đấu cho vòng đồng đội "${stageName}"!`);
                  }
                } else {
                  const newVer = {
                    id: `ver-${Date.now()}`,
                    name: stageName,
                    stageId: assignmentStageId,
                    timestamp: new Date().toISOString(),
                    strategy: `team_${teamAssignmentMode}`,
                    lanesCount: lanesCount,
                    heats: generatedHeatsList
                  };
                  updatedVersions = [newVer, ...assignmentVersions];
                  setAssignmentVersions(updatedVersions);
                  if (activeTeamAthletes.length === 0) {
                    alert(`✓ Đã cấu hình trước chiến thuật chia làn chờ phát sinh cho vòng đồng đội "${stageName}" thành công! Sơ đồ đấu đồng đội sẽ được tự động phát sinh khi vòng đấu trước kết thúc và bạn bấm lọc VĐV ở Mission Control.`);
                  } else {
                    alert(`✓ Đã phát sinh và lưu thành công sơ đồ đấu cho vòng đồng đội "${stageName}"!`);
                  }
                }

                setGeneratedHeats(generatedHeatsList);
                setIsDirty(true);
                triggerAutoSaveAssignments(updatedVersions, generatedHeatsList);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4 text-emerald-100" /> {editingVersionId ? "CẬP NHẬT SƠ ĐỒ ĐỒNG ĐỘI" : "TẠO & LƯU SƠ ĐỒ ĐẤU ĐỒNG ĐỘI"}
            </button>
          </div>

          {/* Team Assignments List */}
          {renderAssignmentsList("team")}
        </div>
      )}
    </div>
  );
};
