import React, { useState } from "react";
import { 
  ShieldAlert, 
  Clock, 
  Video, 
  FileText, 
  Copy, 
  CheckCircle, 
  Users, 
  Grid, 
  Settings, 
  Maximize2, 
  X, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Tv
} from "lucide-react";
import { Athlete, DistanceConfig } from "../../types";
import { getCleanVscNumber, getCleanBibNumber } from "../../utils/athleteUtils";
import { CountdownClock } from "./CountdownClock";

const normalizeScoresToArr = (rawScores: any, length: number): any[] => {
  const arr = Array(length).fill(null);
  if (!rawScores) return arr;
  if (Array.isArray(rawScores)) {
    for (let i = 0; i < length; i++) {
      if (rawScores[i] !== undefined) {
        arr[i] = rawScores[i];
      }
    }
  } else if (typeof rawScores === "object") {
    Object.entries(rawScores).forEach(([k, v]) => {
      const idx = Number(k);
      if (!isNaN(idx) && idx >= 0 && idx < length) {
        arr[idx] = v;
      }
    });
  }
  return arr;
};

const getSoloIdxForHeatHelper = (heatNumber: number): number => {
  if (!heatNumber) return 0;
  let sri = 1;
  if (heatNumber > 10000) {
    const base = Math.floor(heatNumber / 100);
    sri = base % 100;
  } else {
    sri = heatNumber % 100;
  }
  const idx = sri - 1;
  return idx >= 0 ? idx : 0;
};

interface LiveOperationPanelsProps {
  isLiveOperationStage: boolean;
  localState: any;
  setLocalState: React.Dispatch<React.SetStateAction<any>>;
  userRole: string;
  activeShotsCountLimit: number;
  activeDistance: DistanceConfig | null;
  resolvedHeats: any[];
  getDisplayHeatLabel: (heatNum: number | null | undefined) => string;
  getAthletesForHeat: (heatNum: number) => Athlete[];
  activeTournamentFormat: string;
  competitionMode: "individual" | "team";
  addAuditLog: (action: string, description: string) => void;
  showToast: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
  globalTimer?: any;
  stagesList: any[];
  activeAthletesList: Athlete[];
  copyObsUrl: (overlayType: "leaderboard" | "current_lane" | "lower_third") => void;
  distances: DistanceConfig[];
  teamDistances?: DistanceConfig[];
  onOpenLiveBoard?: () => void;
  onOpenTimer?: () => void;
  canControlTimer?: boolean;
  getLiveStatsForLane: (laneNumber: number, athlete: any) => {
    firedShots: number;
    hitsCount: number;
    missCount: number;
    totalPoints: number;
    mult: number;
    isDirect: boolean;
  };
  totalHeatsCount: number;
  currentHeatIndex: number;
  stageHeats: any[];
}

export const LiveOperationPanels: React.FC<LiveOperationPanelsProps> = ({
  isLiveOperationStage,
  localState,
  setLocalState,
  userRole,
  activeShotsCountLimit,
  activeDistance,
  resolvedHeats,
  getDisplayHeatLabel,
  getAthletesForHeat,
  activeTournamentFormat,
  competitionMode,
  addAuditLog,
  showToast,
  globalTimer,
  stagesList,
  activeAthletesList,
  copyObsUrl,
  distances,
  teamDistances = [],
  onOpenLiveBoard,
  onOpenTimer,
  canControlTimer = true,
  getLiveStatsForLane,
  totalHeatsCount,
  currentHeatIndex,
  stageHeats
}) => {
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const showLiveHeatInfo = localState?.workflowStage === "competition" || localState?.workflowStage === "team_competition";

  return (
    <>
      {/* 3. THREE-COLUMN COMMAND CENTER LAYOUT */}
      <div className={isLiveOperationStage ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6 max-w-xl mx-auto w-full"}>
        
        {/* LEFT PANEL: TOURNAMENT STATUS CARD & HEAT MONITOR CARD */}
        <div className={isLiveOperationStage ? "lg:col-span-1 space-y-6 flex flex-col" : "w-full"}>
          
          {/* COLUMN 1: LIVE LANE STATUS & HEAT INFORMATION */}
          {showLiveHeatInfo && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" /> THÔNG TIN LƯỢT LIVE
                  </h4>
                  {(() => {
                    const currentHeatObj = resolvedHeats?.find((h: any) => h.heatNumber === localState.currentHeat);
                    const isSolo = currentHeatObj?.heatType === "solo";
                    const isReSolo = currentHeatObj?.heatType === "resolo";
                    
                    if (isReSolo) {
                      return (
                        <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 text-[10px] font-black uppercase rounded-md tracking-wider animate-pulse">
                          SUDDEN DEATH RESOLO
                        </span>
                      );
                    } else if (isSolo) {
                      return (
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase rounded-md tracking-wider animate-pulse">
                          PLAYOFF SOLO
                        </span>
                      );
                    } else {
                      return (
                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase rounded-md tracking-wider">
                          NORMAL HEAT
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Đang bắn lượt</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                        {getDisplayHeatLabel(localState.currentHeat)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Số phát bắn</span>
                      <span className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5 block">
                        {activeShotsCountLimit} viên
                      </span>
                    </div>
                  </div>

                  {/* Lane grid monitor */}
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-[220px] overflow-y-auto pr-1">
                    {(() => {
                      const currentHeatNum = localState.currentHeat;
                      const athletesForHeat = getAthletesForHeat(currentHeatNum);
                      const activeHeatObj = (resolvedHeats || localState?.heats || []).find((h: any) => h.heatNumber === currentHeatNum);
                      
                      const laneLimit = localState.laneCount || 10;
                      const effectiveLaneStatus: Record<number, any> = {};

                      for (let laneNum = 1; laneNum <= laneLimit; laneNum++) {
                        const athlete = athletesForHeat[laneNum - 1];
                        const existing = (localState?.laneStatus?.[laneNum] || {}) as any;
                        const targetLength = activeShotsCountLimit;

                        if (athlete) {
                          const isMatch = existing && (existing.athleteId === athlete.id || existing.athleteId === athlete.participantId);
                          const dbScores = athlete && activeDistance ? athlete.scores?.[activeDistance.id] : null;
                          
                          let savedScores = dbScores;
                          const isSoloHeat = activeHeatObj?.heatType === "solo" || activeHeatObj?.heatType === "resolo" || (currentHeatNum && currentHeatNum >= 10000);
                          if (isSoloHeat) {
                            const soloIdx = getSoloIdxForHeatHelper(currentHeatNum);
                            const details = athlete.soloShotDetails?.[activeDistance?.id || ""]?.[soloIdx];
                            if (details !== undefined) {
                              savedScores = details;
                            } else {
                              savedScores = null;
                            }
                          }

                          const hasLaneScores = isMatch && Array.isArray(existing.scores) && existing.scores.some((s: any) => s !== null && s !== undefined && s !== "");
                          const rawScores = hasLaneScores ? existing.scores : savedScores;
                          const status = isMatch ? (existing.status || "preparing") : "preparing";

                          effectiveLaneStatus[laneNum] = {
                            ...existing,
                            athleteId: athlete.id || athlete.participantId,
                            athleteName: athlete.name || athlete.fullName || existing.athleteName,
                            refereeId: existing.refereeId || "Trọng tài bàn",
                            status: status,
                            scores: normalizeScoresToArr(rawScores, targetLength)
                          };
                        } else {
                          effectiveLaneStatus[laneNum] = {
                            athleteId: null,
                            athleteName: null,
                            refereeId: "Trọng tài bàn",
                            status: "idle",
                            scores: Array(targetLength).fill(null)
                          };
                        }
                      }

                      return Object.entries(effectiveLaneStatus).map(([laneStr, laneVal]: [string, any]) => {
                        const laneNum = Number(laneStr);
                        const ath = activeAthletesList.find(a => a && (
                          a.id === laneVal.athleteId || 
                          (a.participantId && a.participantId === laneVal.athleteId) ||
                          (a.vscNumber && laneVal.athleteId && a.vscNumber === laneVal.athleteId)
                        ));
                        const targetShotsCount = activeShotsCountLimit;
                        const scoresList = normalizeScoresToArr(laneVal.scores, targetShotsCount);
                        const shotsFilled = scoresList.filter((s: any) => s !== null && s !== undefined && s !== "").length;
                        const isCompleted = laneVal.status === "completed" || shotsFilled >= targetShotsCount;
                        
                        const mult = Number(activeDistance?.multiplier) || 10;
                        const isDirect = activeDistance?.scoringType === "direct" || ((activeDistance as any)?.directMaxPoints > 0);
                        const hasNumericScores = scoresList.some((s: any) => typeof s === "number" && s > 1);

                        let hitsCount = 0;
                        let missCount = 0;
                        let rawSum = 0;
                        scoresList.forEach((s: any) => {
                          if (s !== null && s !== undefined && s !== "") {
                            if (typeof s === "number") {
                              if (s > 0) {
                                hitsCount++;
                              } else {
                                missCount++;
                              }
                              rawSum += s;
                            } else if (s === true || s === "1" || s === "X" || s === "x" || s === "V" || s === "v") {
                              hitsCount++;
                              rawSum += 1;
                            } else if (s === false || s === "0" || s === "o" || s === "O") {
                              missCount++;
                            }
                          }
                        });

                        const isDirectModeFinal = isDirect || hasNumericScores;
                        const totalPoints = isDirectModeFinal
                          ? (rawSum * (Number(activeDistance?.multiplier) || 1))
                          : (hitsCount * mult);

                        return (
                          <div 
                            key={laneNum} 
                            className={`p-2 border rounded-xl flex flex-col justify-between text-left transition-all ${
                              laneVal.athleteId 
                                ? isCompleted
                                  ? "bg-emerald-50/45 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30"
                                  : "bg-indigo-50/30 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/30"
                                : "bg-slate-50/50 border-slate-200 dark:bg-slate-950/5 dark:border-slate-800/40 opacity-60"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400">Bệ #{laneNum}</span>
                              {laneVal.athleteId && (
                                <span className={`w-2 h-2 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-indigo-500 animate-ping"}`} />
                              )}
                            </div>
                            
                            {laneVal.athleteId ? (
                              <div className="mt-1 flex flex-col gap-0.5 min-w-0">
                                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate block">
                                  {ath?.name || laneVal.athleteName || laneVal.fullName || "N/A"}
                                </span>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold px-1 rounded shrink-0 uppercase">
                                    VSC: {getCleanVscNumber(ath?.vscNumber || ath?.idCard, ath?.id || "N/A")}
                                  </span>
                                  {(() => {
                                    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === localState.currentHeat);
                                    const assignedLane = savedHeat?.lanes?.find((l: any) => l.laneNumber === laneNum || l.participantId === ath?.id);
                                    const activeBib = assignedLane?.bibNumber || ath?.bibNumber;
                                    const isTempBib = assignedLane?.bibNumber && assignedLane.bibNumber !== (ath?.bibNumber || ath?.idCard);
                                    return (
                                      <>
                                        <span className="text-[8px] bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400 font-bold px-1 rounded shrink-0 uppercase">
                                          BIB: {getCleanBibNumber(activeBib, ath?.id)}
                                        </span>
                                        {isTempBib && (
                                          <span className="text-[8px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1 rounded shrink-0 uppercase" title="Số BIB đăng ký ban đầu">
                                            Gốc: {getCleanBibNumber(ath?.bibNumber, ath?.id)}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Visual Shot-by-Shot Indicators */}
                                <div className="flex gap-1 mt-1.5 mb-1 flex-wrap">
                                  {scoresList.map((s: any, sIdx: number) => {
                                    const isHit = s === true || s === 1 || s === "1" || s === "X" || s === "x" || s === "V" || s === "v" || s === "✓";
                                    const isMiss = s === false || s === 0 || s === "0" || s === "o" || s === "O" || s === "✗" || s === "✕";
                                    const isFired = s !== null && s !== undefined && s !== "";
                                    
                                    let bgClass = "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600";
                                    let text = String(sIdx + 1);
                                    
                                    if (isFired) {
                                      if (isHit) {
                                        bgClass = "bg-emerald-500 text-white font-extrabold";
                                        text = "✓";
                                      } else if (isMiss) {
                                        bgClass = "bg-rose-500 text-white font-extrabold";
                                        text = "✗";
                                      } else {
                                        bgClass = "bg-indigo-600 text-white font-extrabold";
                                        text = String(s);
                                      }
                                    }

                                    return (
                                      <span 
                                        key={sIdx} 
                                        className={`w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-mono leading-none ${bgClass}`}
                                        title={`Phát bắn #${sIdx + 1}: ${isFired ? (isHit ? "Trúng (✓)" : isMiss ? "Trượt (✗)" : `${s} điểm`) : "Chưa bắn"}`}
                                      >
                                        {text}
                                      </span >
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between mt-1 text-[9px] font-mono font-black gap-1.5 flex-wrap">
                                  <span className="text-indigo-600 dark:text-indigo-400">
                                    {isDirectModeFinal 
                                      ? `Bắn: ${shotsFilled}/${targetShotsCount} viên` 
                                      : `V (Trúng): ${hitsCount} | X (Trượt): ${missCount} (${shotsFilled}/${targetShotsCount} viên)`}
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-450 font-bold">
                                    {totalPoints} đ
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 mt-2 block italic">Trống</span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COLUMN 2: HEAT MONITOR */}
          {isLiveOperationStage && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-indigo-500" /> THÔNG TIN LƯỢT BẮN (HEAT)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md">
                      Active
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenLiveBoard) {
                          onOpenLiveBoard();
                        } else {
                          window.dispatchEvent(new CustomEvent('openLiveBoard'));
                        }
                      }}
                      title="Trình LiveBoard"
                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center justify-center active:scale-95 border border-emerald-500/20"
                      id="btn-open-liveboard-heat-header"
                    >
                      <Tv className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SYSTEM COUNTDOWN TIMER LINKED CARD */}
                <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                        THỜI GIAN
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {globalTimer?.timerState === "playing_voice" && (
                        <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-black rounded-md animate-pulse">
                          📢 CHUẨN BỊ...
                        </span>
                      )}
                      {globalTimer?.timerState === "playing_horn" && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black rounded-md animate-bounce">
                          🎺 KHAI HỎA!
                        </span>
                      )}
                      {globalTimer?.timerState === "counting" && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black rounded-md flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          ĐANG ĐẾM
                        </span>
                      )}
                      {globalTimer?.timerState === "paused" && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px] font-black rounded-md">
                          ⏸️ TẠM DỪNG
                        </span>
                      )}
                      {globalTimer?.timerState === "finished" && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black rounded-md">
                          🏁 HẾT GIỜ
                        </span>
                      )}
                      {(!globalTimer?.timerState || globalTimer?.timerState === "idle") && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-bold rounded-md">
                          ⚡ SẮN SÀNG
                        </span>
                      )}

                      {canControlTimer && (
                        <button
                          onClick={() => setShowTimerSettings(!showTimerSettings)}
                          className={`p-1 rounded-md transition-all cursor-pointer ${
                            showTimerSettings
                              ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                          title="Cài đặt thời gian"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onOpenTimer && (
                        <button
                          onClick={onOpenTimer}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-all cursor-pointer"
                          title="Mở Bảng Toàn Màn Hình"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Large Clock Display */}
                  <CountdownClock timer={globalTimer} />

                  {/* Collapsible Setting Panel */}
                  {canControlTimer && showTimerSettings && (
                    <div className="my-2 p-2.5 bg-slate-950/95 rounded-xl border border-amber-500/40 space-y-2 animate-in fade-in duration-150 shadow-inner">
                      <div className="flex justify-between items-center text-[10px] font-black text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                        <span>⚙️ CÀI ĐẶT THỜI GIAN THI ĐẤU</span>
                        <button
                          onClick={() => setShowTimerSettings(false)}
                          className="text-slate-400 hover:text-white p-0.5 rounded-sm hover:bg-slate-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Preset time buttons */}
                      <div className="flex flex-wrap gap-1 justify-center">
                        {[
                          { label: "1P", sec: 60 },
                          { label: "2P", sec: 120 },
                          { label: "2'30", sec: 150 },
                          { label: "3P", sec: 180 },
                          { label: "5P", sec: 300 }
                        ].map((preset) => (
                          <button
                            key={preset.sec}
                            onClick={() => globalTimer?.handleSetTime(preset.sec)}
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                              globalTimer?.initialSeconds === preset.sec
                                ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Adjust buttons */}
                      <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-800/80">
                        <button
                          onClick={() => globalTimer?.handleAdjustSeconds(-60)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold cursor-pointer"
                          title="-1 Phút"
                        >
                          -1P
                        </button>
                        <button
                          onClick={() => globalTimer?.handleAdjustSeconds(-10)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold cursor-pointer"
                          title="-10 Giây"
                        >
                          -10s
                        </button>
                        <button
                          onClick={() => globalTimer?.handleAdjustSeconds(10)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold cursor-pointer"
                          title="+10 Giây"
                        >
                          +10s
                        </button>
                        <button
                          onClick={() => globalTimer?.handleAdjustSeconds(60)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold cursor-pointer"
                          title="+1 Phút"
                        >
                          +1P
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Controls (Only for BTC/Referees/Admins) */}
                  {canControlTimer ? (
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
                      <button
                        onClick={() => globalTimer?.handleStart()}
                        disabled={globalTimer?.timerState === "counting" || globalTimer?.timerState === "playing_voice" || globalTimer?.timerState === "playing_horn"}
                        className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                          globalTimer?.timerState === "counting" || globalTimer?.timerState === "playing_voice" || globalTimer?.timerState === "playing_horn"
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/30"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </button>

                      <button
                        onClick={() => globalTimer?.handlePause()}
                        disabled={globalTimer?.timerState !== "counting"}
                        className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md ${
                          globalTimer?.timerState !== "counting"
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                            : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                        }`}
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </button>

                      <button
                        onClick={() => globalTimer?.handleStop()}
                        className="py-2 px-3 bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 border border-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                        title="Stop / Đặt lại"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop</span>
                      </button>

                      <button
                        onClick={() => globalTimer?.testAudio()}
                        className="py-2 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                        title="Phát thử còi thi đấu"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Thử loa</span>
                      </button>

                      <button
                        onClick={() => globalTimer?.setIsMuted(!globalTimer.isMuted)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          globalTimer?.isMuted
                            ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                        }`}
                        title={globalTimer?.isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                      >
                        {globalTimer?.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-[10px] font-extrabold text-sky-400 bg-sky-950/50 p-2 rounded-xl border border-sky-800/50 tracking-wide flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>🔒 ĐỒNG BỘ REALTIME (Ban tổ chức & Trọng tài điều khiển)</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                    <span className="text-xs text-slate-500 font-bold">Lượt Bắn Hiện Tại</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {getDisplayHeatLabel(localState.currentHeat)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                    <span className="text-xs text-slate-500 font-bold">Lượt Bắn Tiếp Theo</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                      {currentHeatIndex >= 0 && currentHeatIndex < stageHeats.length - 1
                        ? (stageHeats[currentHeatIndex + 1].heatName || `Heat ${stageHeats[currentHeatIndex + 1].heatNumber}`)
                        : "Hết lượt bắn"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                    <span className="text-xs text-slate-500 font-bold">Sức chứa tối đa bệ bắn</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{localState.laneCount} bệ</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-1">
                  <button
                    disabled={currentHeatIndex >= 0 ? currentHeatIndex <= 0 : localState.currentHeat <= 1}
                    onClick={() => {
                      if (currentHeatIndex >= 0) {
                        if (currentHeatIndex <= 0) return;
                        const prevHeatObj = stageHeats[currentHeatIndex - 1];
                        setLocalState(prev => ({ ...prev, currentHeat: prevHeatObj.heatNumber }));
                      } else {
                        if (localState.currentHeat <= 1) return;
                        setLocalState(prev => ({ ...prev, currentHeat: Math.max(1, prev.currentHeat - 1) }));
                      }
                      addAuditLog("HEAT_DECREASE", "Quay lại lượt bắn cũ.");
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      (currentHeatIndex >= 0 ? currentHeatIndex <= 0 : localState.currentHeat <= 1)
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed opacity-50"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                    }`}
                  >
                    Lượt cũ
                  </button>
                  <button
                    disabled={currentHeatIndex >= 0 ? currentHeatIndex >= stageHeats.length - 1 : localState.currentHeat >= totalHeatsCount}
                    onClick={() => {
                      if (currentHeatIndex >= 0) {
                        if (currentHeatIndex >= stageHeats.length - 1) {
                          showToast("error", "Hết lượt bắn", "Không còn lượt bắn tiếp theo cho vòng đấu này!");
                          return;
                        }
                        const nextHeatObj = stageHeats[currentHeatIndex + 1];
                        setLocalState(prev => ({ ...prev, currentHeat: nextHeatObj.heatNumber }));
                      } else {
                        if (localState.currentHeat >= totalHeatsCount) {
                          showToast("error", "Hết lượt bắn", "Không còn lượt bắn tiếp theo cho vòng đấu này!");
                          return;
                        }
                        setLocalState(prev => ({ ...prev, currentHeat: prev.currentHeat + 1 }));
                      }
                      addAuditLog("HEAT_INCREASE", "Chuyển sang lượt bắn kế tiếp.");
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      (currentHeatIndex >= 0 ? currentHeatIndex >= stageHeats.length - 1 : localState.currentHeat >= totalHeatsCount)
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed opacity-50"
                        : "bg-indigo-600 hover:bg-indigo-550 text-white cursor-pointer"
                    }`}
                  >
                    Lượt kế
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 mt-4 italic text-center">
                * Assignment Engine tự động xếp nhóm VĐV từ cùng 1 CLB ra các bệ xa nhau.
              </p>
            </div>
          )}

        </div>

        {/* COLUMN 3: LANE MONITOR */}
        {isLiveOperationStage && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-indigo-500" /> GIÁM SÁT BỆ BẮN TRỰC TIẾP (LANE STATUS MONITOR)
                </h4>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                  MC & Ban Tổ Chức
                </span>
              </div>

              {/* Three columns: Current, Next, Practice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                
                {/* 1. Lượt bắn hiện tại */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/40 rounded-2xl p-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      Lượt hiện tại
                    </span>
                    <span className="bg-indigo-500/10 text-indigo-600 border border-indigo-200/50 dark:border-indigo-900/50 text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse animate-duration-1000"></span>
                      {getDisplayHeatLabel(localState.currentHeat)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {(() => {
                      const activeHeatObj = (resolvedHeats || localState?.heats || []).find((h: any) => h.heatNumber === localState.currentHeat);
                      const isSoloType = activeHeatObj?.heatType === "solo" || activeHeatObj?.heatType === "resolo" || (localState.currentHeat && localState.currentHeat >= 10000);
                      return getAthletesForHeat(localState.currentHeat).map((athlete, idx) => {
                        const laneNum = idx + 1;
                        if (!athlete) {
                          return (
                            <div key={`current-empty-${laneNum}`} className="flex items-center p-2 bg-slate-50/40 dark:bg-slate-950/10 border border-dashed border-slate-200/60 dark:border-slate-850 rounded-xl gap-2 text-slate-300 dark:text-slate-700 min-h-[52px]">
                              <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black flex items-center justify-center shrink-0">
                                {laneNum}
                              </span>
                              <span className="text-[10px] font-bold italic text-slate-400 dark:text-slate-600">Trống</span>
                            </div>
                          );
                        }

                        const { firedShots, hitsCount, missCount, totalPoints, mult, isDirect } = getLiveStatsForLane(laneNum, athlete);

                        return (
                          <div key={`current-${athlete.id}-${laneNum}`} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs gap-2 min-h-[52px] py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                {laneNum}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white truncate">
                                    {athlete.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold px-1 rounded shrink-0 uppercase">
                                    VSC: {getCleanVscNumber(athlete.vscNumber || athlete.idCard, athlete.id)}
                                  </span>
                                  {(() => {
                                    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === localState.currentHeat);
                                    const assignedLane = savedHeat?.lanes?.find((l: any) => l.participantId === athlete.id || l.participantId === athlete.participantId || l.laneNumber === laneNum);
                                    const activeBib = assignedLane?.bibNumber || athlete.bibNumber;
                                    const isTempBib = assignedLane?.bibNumber && assignedLane.bibNumber !== (athlete.bibNumber || athlete.idCard);
                                    return (
                                      <>
                                        <span className="text-[8px] bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400 font-bold px-1 rounded shrink-0 uppercase">
                                          BIB: {getCleanBibNumber(activeBib, athlete.id)}
                                        </span>
                                        {isTempBib && (
                                          <span className="text-[8px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1 rounded shrink-0 uppercase" title="Số BIB đăng ký ban đầu">
                                            Gốc: {getCleanBibNumber(athlete.bibNumber, athlete.id)}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <span className="text-[8px] text-slate-400 block truncate leading-tight mt-0.5">
                                  {athlete.team || athlete.province || "N/A"}
                                </span>

                                {/* Visual Shot-by-Shot Indicators */}
                                {(() => {
                                  const laneScores = (localState?.laneStatus?.[laneNum]?.athleteId === athlete.id || localState?.laneStatus?.[laneNum]?.athleteId === athlete.participantId)
                                    ? localState.laneStatus[laneNum].scores
                                    : null;
                                  const targetLength = activeShotsCountLimit;
                                  
                                  let savedScores = athlete && activeDistance ? athlete.scores?.[activeDistance.id] : null;
                                  if (isSoloType) {
                                    if (athlete && activeDistance) {
                                      const soloIdx = getSoloIdxForHeatHelper(localState.currentHeat);
                                      const details = athlete.soloShotDetails?.[activeDistance.id]?.[soloIdx];
                                      if (details !== undefined) {
                                        savedScores = details;
                                      } else {
                                        savedScores = null;
                                      }
                                    } else {
                                      savedScores = null;
                                    }
                                  }

                                  const hasLaneScores = laneScores && Array.isArray(laneScores) && laneScores.some((s: any) => s !== null && s !== undefined && s !== "");
                                  const scoresList = normalizeScoresToArr(hasLaneScores ? laneScores : savedScores, targetLength);

                                  return (
                                    <div className="flex gap-0.5 mt-1 mb-0.5 flex-wrap">
                                      {scoresList.map((s: any, sIdx: number) => {
                                        const isHit = s === true || s === 1 || s === "1" || s === "X" || s === "x" || s === "V" || s === "v" || s === "✓";
                                        const isMiss = s === false || s === 0 || s === "0" || s === "o" || s === "O" || s === "✗" || s === "✕";
                                        const isFired = s !== null && s !== undefined && s !== "";
                                        
                                        let bgClass = "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600";
                                        let text = String(sIdx + 1);
                                        
                                        if (isFired) {
                                          if (isHit) {
                                            bgClass = "bg-emerald-500 text-white font-extrabold";
                                            text = "✓";
                                          } else if (isMiss) {
                                            bgClass = "bg-rose-500 text-white font-extrabold";
                                            text = "✗";
                                          } else {
                                            bgClass = "bg-indigo-600 text-white font-extrabold";
                                            text = String(s);
                                          }
                                        }

                                        return (
                                          <span 
                                            key={sIdx} 
                                            className={`w-3 h-3 rounded-full text-[7px] flex items-center justify-center font-mono leading-none ${bgClass}`}
                                            title={`Phát bắn #${sIdx + 1}: ${isFired ? (isHit ? "Trúng (✓)" : isMiss ? "Trượt (✗)" : `${s} điểm`) : "Chưa bắn"}`}
                                          >
                                            {text}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 block font-mono leading-none">
                                {totalPoints} đ
                              </span>
                              <span className="text-[8.5px] text-slate-500 dark:text-slate-400 block font-mono leading-none mt-1">
                                {isDirect 
                                  ? `Bắn ${firedShots}/${activeShotsCountLimit}` 
                                  : `V:${hitsCount} | X:${missCount} (${firedShots}/${activeShotsCountLimit})`}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 2. Lượt bắn tiếp theo */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/40 rounded-2xl p-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Lượt tiếp theo
                    </span>
                    <span className="bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      {currentHeatIndex >= 0 && currentHeatIndex < stageHeats.length - 1
                        ? (stageHeats[currentHeatIndex + 1].heatName || `Lượt ${stageHeats[currentHeatIndex + 1].heatNumber}`)
                        : `Lượt ${localState.currentHeat + 1}`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const nextHeatNum = currentHeatIndex >= 0 && currentHeatIndex < stageHeats.length - 1
                        ? stageHeats[currentHeatIndex + 1].heatNumber
                        : localState.currentHeat + 1;
                      return getAthletesForHeat(nextHeatNum).map((athlete, idx) => {
                        const laneNum = idx + 1;
                        if (!athlete) {
                          return (
                            <div key={`next-empty-${laneNum}`} className="flex items-center p-2 bg-slate-50/40 dark:bg-slate-950/10 border border-dashed border-slate-200/60 dark:border-slate-850 rounded-xl gap-2 text-slate-300 dark:text-slate-700 min-h-[52px]">
                              <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black flex items-center justify-center shrink-0">
                                { laneNum }
                              </span>
                              <span className="text-[10px] font-bold italic text-slate-400 dark:text-slate-600">Trống</span>
                            </div>
                          );
                        }

                        return (
                          <div key={`next-${athlete.id}-${laneNum}`} className="flex items-center p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs gap-2 min-h-[52px] py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-slate-700 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                {laneNum}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white truncate">
                                    {athlete.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold px-1 rounded shrink-0 uppercase">
                                    VSC: {getCleanVscNumber(athlete.vscNumber || athlete.idCard, athlete.id)}
                                  </span>
                                  {(() => {
                                    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === nextHeatNum);
                                    const assignedLane = savedHeat?.lanes?.find((l: any) => l.participantId === athlete.id || l.participantId === athlete.participantId || l.laneNumber === laneNum);
                                    const activeBib = assignedLane?.bibNumber || athlete.bibNumber;
                                    const isTempBib = assignedLane?.bibNumber && assignedLane.bibNumber !== (athlete.bibNumber || athlete.idCard);
                                    return (
                                      <>
                                        <span className="text-[8px] bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400 font-bold px-1 rounded shrink-0 uppercase">
                                          BIB: {getCleanBibNumber(activeBib, athlete.id)}
                                        </span>
                                        {isTempBib && (
                                          <span className="text-[8px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1 rounded shrink-0 uppercase" title="Số BIB đăng ký ban đầu">
                                            Gốc: {getCleanBibNumber(athlete.bibNumber, athlete.id)}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <span className="text-[8px] text-slate-400 block truncate leading-tight mt-0.5">
                                  {athlete.team || athlete.province || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3. Lượt Bắn Thử (Warming) */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/40 rounded-2xl p-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                      Lượt Bắn Thử
                    </span>
                    <span className="bg-violet-500/10 text-violet-600 border border-violet-200/50 dark:border-violet-900/50 text-[9px] font-bold px-1.5 py-0.5 rounded-lg">
                      {currentHeatIndex >= 0 && currentHeatIndex < stageHeats.length - 2
                        ? (stageHeats[currentHeatIndex + 2].heatName || `Lượt ${stageHeats[currentHeatIndex + 2].heatNumber}`)
                        : `Lượt ${localState.currentHeat + 2}`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const practiceHeatNum = currentHeatIndex >= 0 && currentHeatIndex < stageHeats.length - 2
                        ? stageHeats[currentHeatIndex + 2].heatNumber
                        : localState.currentHeat + 2;
                      return getAthletesForHeat(practiceHeatNum).map((athlete, idx) => {
                        const laneNum = idx + 1;
                        if (!athlete) {
                          return (
                            <div key={`practice-empty-${laneNum}`} className="flex items-center p-2 bg-slate-50/40 dark:bg-slate-950/10 border border-dashed border-slate-200/60 dark:border-slate-850 rounded-xl gap-2 text-slate-300 dark:text-slate-700 min-h-[52px]">
                              <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black flex items-center justify-center shrink-0">
                                {laneNum}
                              </span>
                              <span className="text-[10px] font-bold italic text-slate-400 dark:text-slate-600">Trống</span>
                            </div>
                          );
                        }

                        return (
                          <div key={`practice-${athlete.id}-${laneNum}`} className="flex items-center p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs gap-2 min-h-[52px] py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-slate-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                {laneNum}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white truncate">
                                    {athlete.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[8px] bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400 font-bold px-1 rounded shrink-0 uppercase">
                                    BIB: {getCleanBibNumber(athlete.bibNumber || athlete.idCard, athlete.id)}
                                  </span>
                                  {(() => {
                                    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === practiceHeatNum);
                                    const assignedLane = savedHeat?.lanes?.find((l: any) => l.participantId === athlete.id || l.participantId === athlete.participantId || l.laneNumber === laneNum);
                                    const activeBib = assignedLane?.bibNumber || athlete.bibNumber;
                                    const isTempBib = assignedLane?.bibNumber && assignedLane.bibNumber !== (athlete.bibNumber || athlete.idCard);
                                    return (
                                      <>
                                        <span className="text-[8px] bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400 font-bold px-1 rounded shrink-0 uppercase">
                                          BIB: {getCleanBibNumber(activeBib, athlete.id)}
                                        </span>
                                        {isTempBib && (
                                          <span className="text-[8px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1 rounded shrink-0 uppercase" title="Số BIB đăng ký ban đầu">
                                            Gốc: {getCleanBibNumber(athlete.bibNumber, athlete.id)}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <span className="text-[8px] text-slate-400 block truncate leading-tight mt-0.5">
                                  {athlete.team || athlete.province || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (!window.confirm("KÍCH HOẠT đồng loạt toàn bộ bệ bắn đang chuẩn bị?")) return;
                  setLocalState((prev: any) => {
                    const updated = { ...prev.laneStatus };
                    Object.keys(updated).forEach(k => {
                      const num = Number(k);
                      if (updated[num].athleteId) updated[num].status = "active";
                    });
                    return { ...prev, laneStatus: updated };
                  });
                  addAuditLog("BULK_LANE_ACTIVATE", "Kích hoạt đồng loạt toàn bộ bệ bắn.");
                  showToast("success", "Khai hỏa", "Bắt đầu loạt bắn! Toàn bộ bệ đã kích hoạt.");
                  if (globalTimer) globalTimer.handleStart();
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                KÍCH HOẠT TOÀN BỘ BỆ
              </button>
              <button
                onClick={() => {
                  if (!window.confirm("Đặt lại toàn bộ bệ bắn về trạng thái IDLE?")) return;
                  setLocalState((prev: any) => {
                    const updated = { ...prev.laneStatus };
                    Object.keys(updated).forEach(k => {
                      const num = Number(k);
                      updated[num].status = "idle";
                      updated[num].athleteId = null;
                      updated[num].scores = Array(10).fill(null);
                    });
                    return { ...prev, laneStatus: updated };
                  });
                  addAuditLog("BULK_LANE_RESET", "Xóa dọn dẹp bệ bắn.");
                  showToast("success", "Đặt lại bệ", "Đã đặt lại toàn bộ bệ bắn!");
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-black transition-all border border-rose-100 cursor-pointer"
              >
                Reset bệ
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. ALERT CENTER & REAL-TIME QUEUE */}
      {isLiveOperationStage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
          {/* GIÁM SÁT TIẾN ĐỘ CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" /> GIÁM SÁT TIẾN ĐỘ
                </h4>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>

              <div className="mt-4 space-y-3.5">
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GIAI ĐOẠN HIỆN TẠI</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white block mt-1 uppercase">
                    {stagesList.find(s => s.stage === localState.workflowStage)?.label}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CỰ LY/BẢN ĐỒ</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white block mt-1">
                    {activeDistance ? `${activeDistance.distance}m - ${activeDistance.isSolo ? "Solo Shootout" : "Bia đổ"}` : "Chưa chọn"}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VĐV KHẢ DỤNG</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white block mt-1">
                    {activeAthletesList.filter(a => a.status !== "Bỏ thi").length} VĐV thi đấu
                  </span>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">TIẾN ĐỘ THI ĐẤU</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (activeAthletesList.filter(a => a && a.scores && Object.keys(a.scores).length > 0).length / Math.max(1, activeAthletesList.length)) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                      {activeAthletesList.filter(a => a && a.scores && Object.keys(a.scores).length > 0).length}/{activeAthletesList.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>Server sync status:</span>
              <span className="font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> SECURED
              </span>
            </div>
          </div>

          {/* Live Broadcast / OBS Overlay Control Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Video className="w-4 h-4 text-indigo-500" /> KÊNH TRUYỀN THÔNG & OBS OVERLAYS
              </h4>
              <span className="text-[10px] text-slate-400">Stream overlay setup</span>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Sao chép các đường dẫn dưới đây vào Browser Source của phần mềm OBS Studio để hiển thị bảng điểm, bảng thành tích tự động thời gian thực siêu mượt cho buổi livestream.
            </p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-xl flex justify-between items-center">
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-white">Leaderboard Overlay</h5>
                  <span className="text-[9px] text-slate-400">Bảng vàng xếp hạng thời gian thực</span>
                </div>
                <button
                  onClick={() => copyObsUrl("leaderboard")}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all cursor-pointer"
                  title="Sao chép URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-xl flex justify-between items-center">
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-white">Active Lane Statistics</h5>
                  <span className="text-[9px] text-slate-400">Thông số bệ bắn của VĐV dẫn đầu</span>
                </div>
                <button
                  onClick={() => copyObsUrl("current_lane")}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all cursor-pointer"
                  title="Sao chép URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-xl flex justify-between items-center">
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-white">Lower Third Profile</h5>
                  <span className="text-[9px] text-slate-400">Chỉ số hồ sơ/Thẻ tên góc dưới</span>
                </div>
                <button
                  onClick={() => copyObsUrl("lower_third")}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all cursor-pointer"
                  title="Sao chép URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs & Action Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" /> NHẬT KÝ TÁC CHIẾN (AUDIT LOGS)
              </h4>
              <span className="text-[10px] text-slate-400">Lịch sử tác vụ</span>
            </div>

            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto">
              {(localState?.auditLogs || []).map((log: any) => (
                <div key={log.id} className="text-left pb-2 border-b border-slate-50 dark:border-slate-900 last:border-0">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-extrabold uppercase text-indigo-600 dark:text-indigo-400">{log.action}</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-300 mt-1">{log.description}</p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Thực hiện bởi: {log.operator}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  );
};
