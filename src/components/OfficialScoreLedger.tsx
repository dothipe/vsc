import React, { useState, useMemo } from "react";
import { 
  FileText, Search, Clock, ChevronDown, ChevronUp, Lock, Unlock, 
  Check, X, History, AlertTriangle, HelpCircle, Award, Plus, RotateCcw
} from "lucide-react";
import { Athlete, DistanceConfig } from "../types";
import { getCleanVscNumber, getCleanBibNumber, isNoTeam } from "../utils/athleteUtils";
import { normalize2DArray, ensureArray, ensure2DArray } from "../lib/firebaseService";

export function parseShotValue(shotVal: any): { isHit: boolean; points: number; isFilled: boolean } {
  if (shotVal === null || shotVal === undefined || shotVal === "") {
    return { isHit: false, points: 0, isFilled: false };
  }
  if (shotVal === true || shotVal === "true" || shotVal === "1") {
    return { isHit: true, points: 1, isFilled: true };
  }
  if (shotVal === false || shotVal === "false" || shotVal === "0") {
    return { isHit: false, points: 0, isFilled: true };
  }
  if (typeof shotVal === "number") {
    return { isHit: shotVal > 0, points: shotVal, isFilled: true };
  }
  if (typeof shotVal === "string") {
    if (shotVal.trim().toUpperCase() === "X") {
      return { isHit: true, points: 10, isFilled: true };
    }
    const num = Number(shotVal);
    if (!isNaN(num)) {
      return { isHit: num > 0, points: num, isFilled: true };
    }
  }
  return { isHit: Boolean(shotVal), points: Boolean(shotVal) ? 1 : 0, isFilled: true };
}

interface OfficialScoreLedgerProps {
  athletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
  competitionMode: "individual" | "team";
  userRole: "admin" | "referee" | "spectator";
  scoreEvents: any[];
  onToggleScore: (athleteId: string, distanceId: string, shotIndex: number) => void;
  onUpdateDirectScore?: (athleteId: string, distanceId: string, value: number | null, shotIndex?: number) => void;
  onUpdateSoloHits?: (athleteId: string, distanceId: string, rounds: (number | null)[], shotDetails?: (boolean | number | null)[][]) => void;
  onResetAthleteScore?: (athleteId: string, distanceId: string) => void;
  directMaxPoints?: number;
  isDistanceLocked?: (distId: string) => boolean;
  isScoringEditAuthorized?: boolean;
  onRequireUnlock?: () => void;
  onToggleScoringEditAuthorization?: () => void;
}

interface OfficialScoreRowProps {
  athlete: Athlete;
  isExpanded: boolean;
  toggleExpand: (id: string) => void;
  totalScore: number;
  athleteAuditLogs: any[];
  distances: DistanceConfig[];
  isDistanceLocked?: (distId: string) => boolean;
  isAdmin: boolean;
  isDirectMode: boolean;
  editingDirectCell: { athleteId: string; distanceId: string; shotIdx: number } | null;
  directEditValue: string;
  setEditingDirectCell: (cell: { athleteId: string; distanceId: string; shotIdx: number } | null) => void;
  setDirectEditValue: (val: string) => void;
  onToggleScore: (athleteId: string, distanceId: string, shotIndex: number) => void;
  onUpdateDirectScore?: (athleteId: string, distanceId: string, value: number | null, shotIndex?: number) => void;
  onUpdateSoloHits?: (athleteId: string, distanceId: string, rounds: (number | null)[], shotDetails?: (boolean | number | null)[][]) => void;
  onResetAthleteScore?: (athleteId: string, distanceId: string) => void;
  shotsCount: number;
  isScoringEditAuthorized?: boolean;
  onRequireUnlock?: () => void;
}

const OfficialScoreRow = React.memo<OfficialScoreRowProps>(({
  athlete,
  isExpanded,
  toggleExpand,
  totalScore,
  athleteAuditLogs,
  distances,
  isDistanceLocked,
  isAdmin,
  isDirectMode,
  editingDirectCell,
  directEditValue,
  setEditingDirectCell,
  setDirectEditValue,
  onToggleScore,
  onUpdateDirectScore,
  onUpdateSoloHits,
  onResetAthleteScore,
  shotsCount,
  isScoringEditAuthorized,
  onRequireUnlock
}) => {
  const [resetTargetDist, setResetTargetDist] = useState<DistanceConfig | null>(null);

  return (
    <div 
      className={`bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xs transition-all duration-200 ${
        isExpanded 
          ? "border-indigo-500 dark:border-indigo-800" 
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Header Section (Collapsed state) */}
      <div 
        onClick={() => toggleExpand(athlete.id)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
            {athlete.name?.charAt(0) || "V"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                {athlete.name}
              </h4>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                VSC: {getCleanVscNumber(athlete.vscNumber, athlete.id)} | BIB: {getCleanBibNumber(athlete.bibNumber, athlete.id)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
              Đội: {athlete.team || "Tự Do"} • Trạng thái: <span className="text-emerald-600 font-bold">{athlete.status || "Thi đấu"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Tổng Điểm</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block font-mono">
              {totalScore} <span className="text-xs font-bold text-slate-400">đ</span>
            </span>
          </div>
          <div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col gap-6 animate-slideDown animate-duration-200">
          
          {/* 1. Core Rounds & Scores */}
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-500" /> Các vòng bắn chính thức
              </h5>
              {isAdmin && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> Trọng tài / BTC: Click ô điểm để điều chỉnh trực tiếp
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {distances.map((dist, distIdx) => {
                const distScores = athlete.scores[dist.id] || [];
                const isLocked = isDistanceLocked ? isDistanceLocked(dist.id) : false;
                
                // Subtotal
                let subtotal = 0;
                const hasNumericScores = distScores.some(s => typeof s === "number" && s > 1);
                if (isDirectMode || hasNumericScores) {
                  const pointsSum = distScores.reduce((acc: number, s: any): number => {
                    const p = parseShotValue(s);
                    return acc + (p.isFilled ? p.points : 0);
                  }, 0);
                  subtotal = Number(pointsSum) * Number(dist.multiplier || 1);
                } else {
                  const hitsCount = distScores.reduce((acc: number, s: any): number => {
                    const p = parseShotValue(s);
                    return acc + (p.isHit ? 1 : 0);
                  }, 0);
                  subtotal = Number(hitsCount) * Number(dist.multiplier || 1);
                }

                return (
                  <div 
                    key={dist.id}
                    className={`border rounded-2xl p-4 flex flex-col gap-4 ${
                      isLocked 
                        ? "bg-slate-100/40 dark:bg-slate-950/5 border-slate-200/40 dark:border-slate-850 opacity-80" 
                        : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/80"
                    }`}
                  >
                    {/* Main score info row */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                      {/* Round Meta */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            Vòng {distIdx + 1} {isLocked && <Lock className="w-3 h-3 text-rose-500 inline" />}
                          </span>
                          {onResetAthleteScore && !isLocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResetTargetDist(dist);
                              }}
                              className="px-2 py-0.5 text-[9px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Xóa/Reset điểm vòng này để gọi VĐV nhập điểm lại"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Reset điểm</span>
                            </button>
                          )}
                        </div>
                        <h6 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 font-sans mt-0.5">
                          {dist.distance} (Hệ số x{dist.multiplier})
                        </h6>
                      </div>

                      {/* Shots grid */}
                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from({ length: shotsCount }).map((_, shotIdx) => {
                          const shotVal = distScores[shotIdx];
                          const parsedShot = parseShotValue(shotVal);
                          const isHit = parsedShot.isHit;
                          const isEditingThisCell = editingDirectCell?.athleteId === athlete.id && 
                                                    editingDirectCell?.distanceId === dist.id && 
                                                    editingDirectCell?.shotIdx === shotIdx;

                          const handleCellClick = () => {
                            if (isLocked) {
                              alert("Vòng thi này đã bị khóa điểm (chỉ đọc)!");
                              return;
                            }
                            if (!isAdmin) return;
                            
                            if (!isScoringEditAuthorized) {
                              if (onRequireUnlock) {
                                onRequireUnlock();
                              } else {
                                alert("Bạn chưa mở khóa quyền chỉnh sửa điểm số! Vui lòng bấm Mở Khóa ở phía trên.");
                              }
                              return;
                            }

                            if (isDirectMode) {
                              setEditingDirectCell({ athleteId: athlete.id, distanceId: dist.id, shotIdx });
                              setDirectEditValue(shotVal !== null && shotVal !== undefined ? String(shotVal) : "");
                            } else {
                              onToggleScore(athlete.id, dist.id, shotIdx);
                            }
                          };

                          if (isEditingThisCell && !isLocked) {
                            return (
                              <div key={shotIdx} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg p-1">
                                <input
                                  type="text"
                                  placeholder="0-10"
                                  value={directEditValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^\d+$/.test(val)) {
                                      setDirectEditValue(val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const valNum = directEditValue === "" ? null : parseInt(directEditValue, 10);
                                      if (onUpdateDirectScore) {
                                        onUpdateDirectScore(athlete.id, dist.id, valNum, shotIdx);
                                      }
                                      setEditingDirectCell(null);
                                    } else if (e.key === "Escape") {
                                      setEditingDirectCell(null);
                                    }
                                  }}
                                  className="w-10 h-6 text-center text-xs font-black font-mono border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-white bg-transparent"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    const valNum = directEditValue === "" ? null : parseInt(directEditValue, 10);
                                    if (onUpdateDirectScore) {
                                      onUpdateDirectScore(athlete.id, dist.id, valNum, shotIdx);
                                    }
                                    setEditingDirectCell(null);
                                  }}
                                  className="p-0.5 bg-emerald-500 hover:bg-emerald-600 rounded text-white cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingDirectCell(null)}
                                  className="p-0.5 bg-rose-500 hover:bg-rose-600 rounded text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          }

                          const isClickable = isAdmin && !isLocked;

                          return (
                            <button
                              key={shotIdx}
                              onClick={handleCellClick}
                              disabled={!isClickable}
                              className={`w-8 h-8 rounded-xl font-mono text-[10px] font-black border transition flex flex-col items-center justify-center relative ${
                                isClickable ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default opacity-85"
                              } ${
                                shotVal === null || shotVal === undefined
                                  ? "bg-slate-100 border-slate-200 text-slate-300 dark:bg-slate-950 dark:border-slate-850"
                                  : isHit
                                    ? isLocked
                                      ? "bg-emerald-600/60 border-emerald-650/40 text-emerald-100"
                                      : "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                                    : isLocked
                                      ? "bg-rose-100/40 border-rose-200/35 text-rose-450 dark:bg-rose-950/10 dark:border-rose-900/10 dark:text-rose-500"
                                      : "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                              }`}
                              title={isLocked ? "Vòng thi đấu đã bị khóa điểm (chỉ đọc)" : isAdmin ? "Ban quản trị/Trọng tài: Nhấp để thay đổi điểm" : "Khóa điểm chính thức"}
                            >
                              <span className="text-[7px] text-slate-400 block leading-none mb-0.5">{shotIdx + 1}</span>
                              <span className="leading-none text-[10px]">
                                {typeof shotVal === "number" 
                                  ? shotVal 
                                  : (shotVal === true ? "✓" : (shotVal === false ? "✗" : "-"))
                                }
                              </span>
                              {(!isClickable) && (
                                <Lock className={`w-2 h-2 absolute bottom-0.5 right-0.5 opacity-40 ${isLocked ? "text-rose-500" : "text-slate-400"}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Round Subtotal */}
                      <div className="text-right border-l border-slate-200/60 dark:border-slate-800 pl-4 shrink-0 min-w-[70px]">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Vòng điểm</span>
                        <span className="text-sm font-extrabold text-slate-850 dark:text-slate-200 font-mono">
                          {subtotal}đ
                        </span>
                      </div>
                    </div>

                    {/* Solo Playoff Section */}
                    {(dist.isSolo !== false || Boolean(athlete.soloRounds?.[dist.id]?.length) || Boolean(athlete.soloHits?.[dist.id])) && (
                      <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        {/* Solo Playoff row */}
                        {(() => {
                          const rawRounds = athlete.soloRounds?.[dist.id];
                          const rawShotDetails = athlete.soloShotDetails?.[dist.id];
                          const rawHits = athlete.soloHits?.[dist.id];

                          let rounds: number[] = [];
                          let shotDetails: (boolean | number | null)[][] = [];

                          if (Array.isArray(rawRounds) && (!rawShotDetails || rawShotDetails.length === 0)) {
                            const roundsSum = rawRounds.reduce((acc: number, r: any) => acc + (typeof r === 'number' ? r : (r ? 1 : 0)), 0);
                            if (rawRounds.length > 1 && rawHits !== undefined && Number(rawHits) === roundsSum) {
                              // Old corrupted format: rawRounds was actually shot values for 1 solo round!
                              rounds = [roundsSum];
                              shotDetails = [rawRounds.map((s: any) => s ?? null)];
                            } else {
                              rounds = rawRounds.map((r: any) => Number(r) || 0);
                              shotDetails = [];
                            }
                          } else {
                            rounds = Array.isArray(rawRounds) 
                              ? rawRounds.map((r: any) => Number(r) || 0) 
                              : (rawHits !== undefined ? [Number(rawHits)] : []);
                            shotDetails = normalize2DArray(rawShotDetails);
                          }

                          const handleIncrementSolo = (rIdx: number) => {
                            if (isLocked || !onUpdateSoloHits) return;
                            const nextRounds = [...rounds];
                            const currentVal = nextRounds[rIdx] ?? 0;
                            nextRounds[rIdx] = currentVal + 1;
                            
                            const nextShotDetails = [...shotDetails];
                            while (nextShotDetails.length <= rIdx) {
                              nextShotDetails.push(Array(shotsCount).fill(null));
                            }
                            onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                          };

                          const handleDecrementSolo = (rIdx: number) => {
                            if (isLocked || !onUpdateSoloHits) return;
                            const nextRounds = [...rounds];
                            const currentVal = nextRounds[rIdx] ?? 0;
                            nextRounds[rIdx] = Math.max(0, currentVal - 1);
                            
                            const nextShotDetails = [...shotDetails];
                            while (nextShotDetails.length <= rIdx) {
                              nextShotDetails.push(Array(shotsCount).fill(null));
                            }
                            onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                          };

                          const handleAddSoloRound = () => {
                            if (isLocked || !onUpdateSoloHits) return;
                            const nextRounds = [...rounds, 0];
                            const nextShotDetails = [...shotDetails];
                            nextShotDetails[rounds.length] = Array(shotsCount).fill(null);
                            onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                          };

                          const handleRemoveSoloRound = (rIdx: number) => {
                            if (isLocked || !onUpdateSoloHits) return;
                            const nextRounds = rounds.filter((_, idx) => idx !== rIdx);
                            const nextShotDetails = shotDetails.filter((_, idx) => idx !== rIdx);
                            onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                          };

                          const handleInputChange = (rIdx: number, valStr: string) => {
                            if (isLocked || !onUpdateSoloHits) return;
                            const nextRounds = [...rounds];
                            const parsed = valStr === "" ? 0 : parseInt(valStr, 10);
                            nextRounds[rIdx] = isNaN(parsed) ? 0 : parsed;
                            
                            const nextShotDetails = [...shotDetails];
                            while (nextShotDetails.length <= rIdx) {
                              nextShotDetails.push(Array(shotsCount).fill(null));
                            }
                            onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                          };

                          return (
                            <div className="bg-amber-50/25 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-900/20 rounded-xl p-3.5 flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                                <div className="text-left flex items-center gap-2">
                                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                                  <div>
                                    <h6 className="text-xs font-black text-amber-850 dark:text-amber-300">Solo Playoff (Phân hạng /1000)</h6>
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Hòa điểm tranh hạng biên</span>
                                  </div>
                                </div>

                                {(isAdmin || isScoringEditAuthorized) && onUpdateSoloHits && !isLocked && (
                                  <button
                                    onClick={handleAddSoloRound}
                                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm lượt Solo
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-col gap-2.5 w-full">
                                {rounds.length === 0 ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs text-slate-400 italic">Chưa phát sinh lượt Solo</span>
                                    {(isAdmin || isScoringEditAuthorized) && onUpdateSoloHits && !isLocked && (
                                      <button
                                        onClick={handleAddSoloRound}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                      >
                                        Khởi tạo
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  rounds.map((rVal, rIdx) => {
                                    // 1. Direct Mode
                                    if (isDirectMode) {
                                      if ((isAdmin || isScoringEditAuthorized) && onUpdateSoloHits) {
                                        return (
                                          <div key={rIdx} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/85 rounded-lg p-1.5 flex items-center gap-1.5 shadow-xs w-fit">
                                            <div className="flex flex-col items-center">
                                              <span className="text-[7px] font-extrabold text-amber-600 uppercase tracking-wider mb-0.5">Lượt {rIdx + 1}</span>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => handleDecrementSolo(rIdx)}
                                                  disabled={isLocked}
                                                  className="w-5 h-5 bg-amber-100 hover:bg-amber-200 text-amber-700 disabled:opacity-50 font-black text-xs rounded flex items-center justify-center cursor-pointer select-none"
                                                >
                                                  -
                                                </button>
                                                <input
                                                  type="text"
                                                  value={rVal !== null ? String(rVal) : ""}
                                                  onChange={(e) => handleInputChange(rIdx, e.target.value)}
                                                  disabled={isLocked}
                                                  placeholder="0"
                                                  className="w-8 h-5 text-center text-xs font-black font-mono border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-white bg-transparent"
                                                />
                                                <button
                                                  onClick={() => handleIncrementSolo(rIdx)}
                                                  disabled={isLocked}
                                                  className="w-5 h-5 bg-amber-100 hover:bg-amber-200 text-amber-700 disabled:opacity-50 font-black text-xs rounded flex items-center justify-center cursor-pointer select-none"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                            {!isLocked && (
                                              <button
                                                onClick={() => handleRemoveSoloRound(rIdx)}
                                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded cursor-pointer transition self-end"
                                                title="Xóa lượt này"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      }

                                      return (
                                        <div key={rIdx} className="bg-amber-500 text-white font-black font-mono text-[10px] px-2.5 py-1 rounded-lg border border-amber-600 shadow-xs flex flex-col items-center w-fit">
                                          <span className="text-[7px] uppercase tracking-wider opacity-85 mb-0.5">Loạt {rIdx + 1}</span>
                                          <span>{rVal !== null ? `${rVal}đ` : "-"}</span>
                                        </div>
                                      );
                                    }

                                    // 2. Checkbox Mode (Same list tick mechanism as main round)
                                    const roundShots = ensureArray(shotDetails[rIdx]).length > 0 ? ensureArray(shotDetails[rIdx]) : Array(shotsCount).fill(null);
                                    const roundHitsCount = roundShots.reduce((acc: number, s: any) => {
                                      if (typeof s === "number") return acc + s;
                                      if (s === true) return acc + 1;
                                      return acc;
                                    }, 0);
                                    const displayRoundScore = roundShots.some((s: any) => s !== null && s !== undefined) ? roundHitsCount : (rVal ?? 0);
                                    const isClickable = (isAdmin || isScoringEditAuthorized) && !isLocked;

                                    return (
                                      <div key={rIdx} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full shadow-xs">
                                        {/* Round Header Label & Total score */}
                                        <div className="flex justify-between items-center w-full md:w-auto gap-4 shrink-0">
                                          <div>
                                            <span className="text-[7px] font-extrabold text-amber-600 uppercase tracking-wider block">Lượt {rIdx + 1}</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-sans">
                                              Lượt Solo {rIdx + 1}
                                            </span>
                                          </div>
                                          <div className="text-right pl-3 border-l border-slate-100 dark:border-slate-800">
                                            <span className="text-[7px] font-extrabold text-slate-400 uppercase tracking-wider block">Điểm lượt</span>
                                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                                              {displayRoundScore}đ
                                            </span>
                                          </div>
                                        </div>

                                        {/* Grid of Checkboxes matching shotsCount */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {Array.from({ length: shotsCount }).map((_, shotIdx) => {
                                            const shotVal = roundShots[shotIdx];
                                            const isHit = shotVal === true || (typeof shotVal === "number" && shotVal > 0);

                                            const handleToggleClick = () => {
                                              if (isLocked) {
                                                alert("Vòng thi đấu này đã bị khóa điểm (chỉ đọc)!");
                                                return;
                                              }
                                              if ((!isAdmin && !isScoringEditAuthorized) || !onUpdateSoloHits) return;

                                              const nextShotDetails = [...shotDetails];
                                              while (nextShotDetails.length <= rIdx) {
                                                nextShotDetails.push(Array(shotsCount).fill(null));
                                              }
                                              const currentRoundShots = [...(nextShotDetails[rIdx] ?? Array(shotsCount).fill(null))];
                                              while (currentRoundShots.length < shotsCount) {
                                                currentRoundShots.push(null);
                                              }

                                              // Cycle: null -> true -> false -> null
                                              if (shotVal === true || shotVal === 1) {
                                                currentRoundShots[shotIdx] = false;
                                              } else if (shotVal === false || shotVal === 0) {
                                                currentRoundShots[shotIdx] = null;
                                              } else {
                                                currentRoundShots[shotIdx] = true;
                                              }
                                              nextShotDetails[rIdx] = currentRoundShots;

                                              // Compute score of this round
                                              const roundScore = currentRoundShots.reduce<number>((acc, s) => {
                                                if (typeof s === "number") return acc + s;
                                                if (s === true) return acc + 1;
                                                return acc;
                                              }, 0);
                                              const nextRounds = [...rounds];
                                              nextRounds[rIdx] = roundScore;

                                              onUpdateSoloHits(athlete.id, dist.id, nextRounds, nextShotDetails);
                                            };

                                            return (
                                              <button
                                                key={shotIdx}
                                                onClick={handleToggleClick}
                                                disabled={!isClickable}
                                                className={`w-7 h-7 rounded-lg font-mono text-[9px] font-black border transition flex flex-col items-center justify-center relative ${
                                                  isClickable ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default opacity-85"
                                                } ${
                                                  shotVal === null || shotVal === undefined
                                                    ? "bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-950 dark:border-slate-850"
                                                    : isHit
                                                      ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                                                      : "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                                                }`}
                                                title={isLocked ? "Đã khóa" : (isAdmin || isScoringEditAuthorized) ? "Click để tích điểm Solo" : ""}
                                              >
                                                <span className="text-[6px] text-slate-400 block leading-none mb-0.5">{shotIdx + 1}</span>
                                                <span className="leading-none text-[8px]">
                                                  {typeof shotVal === "number"
                                                    ? (shotVal > 1 ? shotVal : (shotVal === 1 ? "✓" : "✗"))
                                                    : (shotVal === true ? "✓" : (shotVal === false ? "✗" : "-"))
                                                  }
                                                </span>
                                                {!isClickable && (
                                                  <Lock className={`w-1.5 h-1.5 absolute bottom-0.5 right-0.5 opacity-40 ${isLocked ? "text-rose-500" : "text-slate-400"}`} />
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>

                                        {/* Remove round button */}
                                        {!isLocked && (isAdmin || isScoringEditAuthorized) && onUpdateSoloHits && (
                                          <button
                                            onClick={() => handleRemoveSoloRound(rIdx)}
                                            className="px-2.5 py-1 text-xs hover:bg-rose-50 dark:hover:bg-rose-955 text-rose-500 rounded-lg cursor-pointer transition flex items-center gap-1 font-bold ml-auto md:ml-0 self-end md:self-auto"
                                            title="Xóa lượt Solo này"
                                          >
                                            <X className="w-3.5 h-3.5" /> Xóa
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ReSolo Sudden Death row */}
                        {(() => {
                          const resEvents = athleteAuditLogs.filter(
                            (evt) => (evt.isReSolo || evt.type === "resolo") && (evt.distanceId === dist.id || evt.distanceName === dist.distance)
                          );
                          if (resEvents.length === 0) return null;

                          return (
                            <div className="bg-rose-50/25 dark:bg-rose-955/10 border border-rose-200/30 dark:border-rose-900/20 p-3.5 rounded-xl flex flex-col gap-2.5">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">ReSolo Sudden Death (Lượt bắn sinh tử)</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {resEvents.map(evt => (
                                  <div key={evt.id} className="flex justify-between items-center py-1 border-b border-rose-100/20 dark:border-rose-900/10 last:border-0 pb-1 last:pb-0">
                                    <span className="text-xs font-semibold text-slate-750 dark:text-slate-300">
                                      Bệ: {evt.lane} • Loạt: #{evt.heat}
                                    </span>
                                    <div className="text-right flex items-center gap-2">
                                      <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                                        {evt.points}đ
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        ({new Date(evt.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Audit History Logs Timeline */}
          <div className="flex flex-col gap-3.5 text-left border-t border-slate-100 dark:border-slate-800 pt-5">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" /> Audit (Nhật ký sửa đổi & đồng bộ hóa)
            </h5>
            
            {athleteAuditLogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Chưa có bản ghi hoạt động nộp điểm đám mây.</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                {athleteAuditLogs.map((log, idx) => {
                  const isSoloLog = log.isSolo || log.type === "solo";
                  const isReSoloLog = log.isReSolo || log.type === "resolo";
                  return (
                    <div 
                      key={log.id || idx}
                      className="flex gap-3 text-[11px] leading-relaxed border-b border-slate-100/50 dark:border-slate-850 pb-2.5 last:border-0"
                    >
                      <span className="text-slate-400 font-mono shrink-0 min-w-[55px]">
                        {new Date(log.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex-1">
                        <span className="font-extrabold text-slate-750 dark:text-slate-300">
                          {log.operator?.split("@")[0] || "Trọng tài"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400"> nộp điểm cự ly </span>
                        <strong className="text-indigo-650 dark:text-indigo-400 font-bold">{log.distanceName || "N/A"}</strong>
                        <span className="text-slate-500"> (Lượt #{log.heat}, Bệ {log.lane})</span>
                        {isSoloLog && <span className="text-amber-600 font-black text-[9px] uppercase tracking-wider ml-1 px-1 py-0.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 rounded">Solo</span>}
                        {isReSoloLog && <span className="text-rose-600 font-black text-[9px] uppercase tracking-wider ml-1 px-1 py-0.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 rounded">ReSolo</span>}
                      </div>
                      <span className="font-black font-mono text-slate-800 dark:text-slate-200 shrink-0">
                        +{log.points}đ
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {resetTargetDist && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-black font-sans">Xác nhận Reset Điểm</h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-sans">
              Bạn có chắc chắn muốn <strong>RESET / XÓA TOÀN BỘ</strong> điểm của vòng <strong>"{resetTargetDist.distance}"</strong> của VĐV <strong>{athlete.name}</strong>?
            </p>
            
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl mb-6">
              <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold leading-normal font-sans">
                ⚠️ Hành động này không thể hoàn tác. Trọng tài có thể gọi lại VĐV để nhập điểm lại từ đầu.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end font-sans">
              <button
                type="button"
                onClick={() => setResetTargetDist(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer bg-transparent"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetAthleteScore) {
                    onResetAthleteScore(athlete.id, resetTargetDist.id);
                  }
                  setResetTargetDist(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-md border-0"
              >
                Xác nhận Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const OfficialScoreLedger: React.FC<OfficialScoreLedgerProps> = ({
  athletes,
  distances,
  shotsCount,
  competitionMode,
  userRole,
  scoreEvents,
  onToggleScore,
  onUpdateDirectScore,
  onUpdateSoloHits,
  onResetAthleteScore,
  directMaxPoints,
  isDistanceLocked,
  isScoringEditAuthorized,
  onRequireUnlock,
  onToggleScoringEditAuthorization
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  
  // Local state for direct score editing inputs
  const [editingDirectCell, setEditingDirectCell] = useState<{ athleteId: string; distanceId: string; shotIdx: number } | null>(null);
  const [directEditValue, setDirectEditValue] = useState<string>("");

  const isAdmin = userRole === "admin" || userRole === "referee";
  const isDirectMode = shotsCount === 1 || (directMaxPoints !== undefined && directMaxPoints !== null && directMaxPoints > 0);

  const activeScoreEvents = useMemo(() => {
    const distIds = new Set(distances.map(d => d.id));
    const athleteIds = new Set(athletes.map(a => a.id));
    return (scoreEvents || []).filter(evt => {
      if (!evt || evt.deleted) return false;
      
      const isEventTeam = evt.competitionMode === "team" || evt.tournamentFormat === "team";
      if (competitionMode === "team") {
        if (!isEventTeam) return false;
      } else {
        if (isEventTeam) return false;
      }
      
      return distIds.has(evt.distanceId) && athleteIds.has(evt.athleteId);
    });
  }, [scoreEvents, distances, athletes, competitionMode]);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    if (expandedAthleteId === id) {
      setExpandedAthleteId(null);
    } else {
      setExpandedAthleteId(id);
    }
  };

  // Extract unique teams for filtering
  const allTeams = Array.from(new Set(athletes.map(a => a.team).filter(Boolean)))
    .filter(t => !(competitionMode === "team" && isNoTeam(t))) as string[];

  // Filter athletes
  const filteredAthletes = athletes.filter(athlete => {
    if (competitionMode === "team" && isNoTeam(athlete.team)) {
      return false;
    }
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      athlete.name.toLowerCase().includes(query) || 
      athlete.id.toLowerCase().includes(query) ||
      (athlete.vscNumber && athlete.vscNumber.toLowerCase().includes(query)) ||
      (athlete.bibNumber && athlete.bibNumber.toLowerCase().includes(query));
    const matchesTeam = teamFilter === "all" || athlete.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  // Calculate total score helper for display in list
  const calculateAthleteTotalScore = (ath: Athlete) => {
    let total = 0;
    distances.forEach(d => {
      const scores = ath.scores?.[d.id] || [];
      const hasNumericScores = scores.some(s => typeof s === "number" && s > 1);
      if (isDirectMode || hasNumericScores) {
        const sum = scores.reduce((acc: number, s: any): number => {
          const p = parseShotValue(s);
          return acc + (p.isFilled ? p.points : 0);
        }, 0);
        total += Number(sum) * Number(d.multiplier || 1);
      } else {
        const hitsCount = scores.reduce((acc: number, s: any): number => {
          const p = parseShotValue(s);
          return acc + (p.isHit ? 1 : 0);
        }, 0);
        total += Number(hitsCount) * Number(d.multiplier || 1);
      }
    });
    return total;
  };

  // Sort list by TOTAL POINTS descending
  const sortedFilteredAthletes = [...filteredAthletes].sort((a, b) => {
    const scoreA = calculateAthleteTotalScore(a);
    const scoreB = calculateAthleteTotalScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return (a.name || "").localeCompare(b.name || "", "vi");
  });

  return (
    <div className="flex flex-col gap-6 animate-fadeIn" id="scoring-ledger-view">
      
      {/* Header Status & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="text-left">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> SỔ GHI ĐIỂM CHÍNH THỨC (OFFICIAL SCORE LEDGER)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bản lưu trữ lịch sử chấm điểm điện tử chính thức từ các bệ bắn. {isAdmin ? "Ban tổ chức (Admin) được phép điều chỉnh trực tiếp điểm số sai sót tại đây." : "Chế độ Chỉ đọc đối với Trọng tài và Khán giả."}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (isScoringEditAuthorized) {
                    if (onToggleScoringEditAuthorization) {
                      onToggleScoringEditAuthorization();
                    }
                  } else {
                    if (onRequireUnlock) {
                      onRequireUnlock();
                    } else if (onToggleScoringEditAuthorization) {
                      onToggleScoringEditAuthorization();
                    }
                  }
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer border ${
                  isScoringEditAuthorized
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                }`}
                title={isScoringEditAuthorized ? "Đang cho phép sửa điểm - Bấm để Khóa bảo vệ" : "Đang khóa bảo vệ - Bấm để Mở Khóa sửa điểm"}
              >
                {isScoringEditAuthorized ? (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-500" />
                    <span>ĐANG MỞ KHÓA SỬA ĐIỂM (Bấm để Khóa)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>ĐÃ KHÓA SỬA ĐIỂM (Bấm để Mở Khóa)</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Lượt nộp điểm: {activeScoreEvents.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm vận động viên theo Tên hoặc Số báo danh (BIB)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">Tất cả Câu lạc bộ / Đội tuyển</option>
              {allTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expandable Entries List */}
      <div className="flex flex-col gap-4">
        {sortedFilteredAthletes.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm p-6">
            <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">Không tìm thấy vận động viên nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc.
            </p>
          </div>
        ) : (
          sortedFilteredAthletes.map((athlete, idx) => {
            const isExpanded = expandedAthleteId === athlete.id;
            const totalScore = calculateAthleteTotalScore(athlete);
            
            // Filter audit logs for this specific athlete
            const athleteAuditLogs = activeScoreEvents
              .filter(evt => evt.athleteId === athlete.id)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return (
              <OfficialScoreRow
                key={`${athlete.id || 'ath'}-${idx}`}
                athlete={athlete}
                isExpanded={isExpanded}
                toggleExpand={toggleExpand}
                totalScore={totalScore}
                athleteAuditLogs={athleteAuditLogs}
                distances={distances}
                isDistanceLocked={isDistanceLocked}
                isAdmin={isAdmin}
                isDirectMode={isDirectMode}
                editingDirectCell={editingDirectCell}
                directEditValue={directEditValue}
                setEditingDirectCell={setEditingDirectCell}
                setDirectEditValue={setDirectEditValue}
                onToggleScore={onToggleScore}
                onUpdateDirectScore={onUpdateDirectScore}
                onUpdateSoloHits={onUpdateSoloHits}
                onResetAthleteScore={onResetAthleteScore}
                shotsCount={shotsCount}
                isScoringEditAuthorized={isScoringEditAuthorized}
                onRequireUnlock={onRequireUnlock}
              />
            );
          })
        )}
      </div>

    </div>
  );
};
