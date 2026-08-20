import React, { useState } from "react";
import { RefreshCw, Lock, ArrowRight, Search, Grid, Users, Edit3, Trash2 } from "lucide-react";
import { Athlete } from "../../types";
import { getCleanBibNumber, getCleanVscNumber } from "../../utils/athleteUtils";

interface CheckInStageProps {
  deduplicatedAthletes: Athlete[];
  athletes: Athlete[];
  activeAthletesList: Athlete[];
  syncAthletesToCloud: (updatedList: Athlete[]) => Promise<void>;
  showToast: (type: string, title: string, message: string) => void;
  handleRandomizeAndAssign: () => void;
  handleTransitionTo: (nextStage: any) => void;
  isChecklistValid: boolean;
  checklistState: {
    athleteCheckedIn: boolean;
    laneAssigned: boolean;
    refereeReady: boolean;
    distanceConfigured: boolean;
    environmentReady: boolean;
    networkReady: boolean;
  };
  setManualChecklist: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  computedAthleteCheckedIn: boolean;
  computedLaneAssigned: boolean;
  computedRefereeReady: boolean;
  computedDistanceConfigured: boolean;
  computedEnvironmentReady: boolean;
  computedNetworkReady: boolean;
  resolvedHeats: any[];
  teamAssignmentVersions: any[];
  setEditingAthlete: (athlete: any) => void;
  setEditAthleteFields: (fields: any) => void;
}

export const CheckInStage: React.FC<CheckInStageProps> = ({
  deduplicatedAthletes,
  athletes,
  activeAthletesList,
  syncAthletesToCloud,
  showToast,
  handleRandomizeAndAssign,
  handleTransitionTo,
  isChecklistValid,
  checklistState,
  setManualChecklist,
  computedAthleteCheckedIn,
  computedLaneAssigned,
  computedRefereeReady,
  computedDistanceConfigured,
  computedEnvironmentReady,
  computedNetworkReady,
  resolvedHeats,
  teamAssignmentVersions,
  setEditingAthlete,
  setEditAthleteFields,
}) => {
  const [checkInSearchQuery, setCheckInSearchQuery] = useState<string>("");
  const [checkInFilter, setCheckInFilter] = useState<"all" | "pending" | "checked_in" | "dns" | "withdrawn" | "dq">("all");

  const totalCount = deduplicatedAthletes.length;
  const checkedInCount = deduplicatedAthletes.filter(a => a.status === "checked_in" || a.status === "Thi đấu").length;
  const pendingCount = deduplicatedAthletes.filter(a => !a.status || a.status === "registered" || a.status === "Chờ Báo Danh").length;
  const pct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn" id="cc-check-in-stage">
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 dark:from-emerald-950/10 dark:to-emerald-950/5 p-5 rounded-2xl border border-emerald-150/80 dark:border-emerald-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 text-left">
          <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            BƯỚC 2: TRẠM ĐIỂM DANH & PHÊ DUYỆT THI ĐẤU
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            Hãy xác thực sự hiện diện thực tế của vận động viên tại bãi bắn trước khi đóng băng sơ đồ, phân bệ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-auto">
          <button
            onClick={handleRandomizeAndAssign}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-100 dark:shadow-none flex items-center gap-1.5 cursor-pointer font-sans"
            title="Hệ thống tự động xáo trộn VĐV, cấp số hiệu BIB và xếp bệ/lượt bắn ngay lập tức"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Bốc Thăm & Cấp BIB Ngẫu Nhiên
          </button>
          <button
            onClick={() => {
              handleTransitionTo("competition");
              showToast("success", "Vòng đấu cá nhân", "Đã chốt điểm danh & xếp bệ, chuyển sang Vòng đấu cá nhân!");
            }}
            disabled={!isChecklistValid}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 font-sans ${
              isChecklistValid
                ? "bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-100 dark:shadow-none"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
            }`}
            title={isChecklistValid ? "Bắt đầu thi đấu cá nhân (Go Live)" : "Vui lòng hoàn thành toàn bộ Checklist trước khi Go Live"}
          >
            {!isChecklistValid && <Lock className="w-3.5 h-3.5" />}
            Chốt & Go Live Thi Đấu <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bento counters row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider font-mono">TỔNG GHI DANH</span>
          <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalCount} VĐV</span>
        </div>
        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block tracking-wider font-mono">ĐÃ BÁO DANH (CHECKED IN)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{checkedInCount} VĐV</span>
            <span className="text-xs text-emerald-650 font-bold font-mono">({pct}%)</span>
          </div>
        </div>
        <div className="bg-amber-50/30 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs">
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase block tracking-wider font-mono">CHƯA BÁO DANH (PENDING)</span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block">{pendingCount} VĐV</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs">
          <span className="text-[9px] text-slate-450 dark:text-slate-400 font-bold uppercase block tracking-wider font-mono">VẮNG/RÚT LUI (DNS/WD)</span>
          <span className="text-xl font-black text-slate-700 dark:text-slate-350 mt-1 block">
            {deduplicatedAthletes.filter(a => a.status === "dns" || a.status === "withdrawn" || a.status === "dq").length} VĐV
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-100 dark:bg-slate-800 h-2 w-full rounded-full overflow-hidden">
        <div 
          className="bg-emerald-550 h-full rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Check-in control station */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCheckInFilter("all")}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                checkInFilter === "all"
                  ? "bg-indigo-650 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
              }`}
            >
              Tất Cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setCheckInFilter("checked_in")}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                checkInFilter === "checked_in"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
              }`}
            >
              Đã Điểm Danh ({checkedInCount})
            </button>
            <button
              type="button"
              onClick={() => setCheckInFilter("pending")}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                checkInFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
              }`}
            >
              Chưa Điểm Danh ({pendingCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Tên, BIB, hoặc Câu lạc bộ..."
              value={checkInSearchQuery}
              onChange={(e) => setCheckInSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-medium text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-150 dark:border-slate-800">
                <th className="px-4 py-3 font-mono">BIB</th>
                <th className="px-4 py-3 font-mono">VSC ID</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Đơn vị / CLB</th>
                <th className="px-4 py-3">Hạng mục</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Điều hành nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {(() => {
                const filtered = deduplicatedAthletes.filter(a => {
                  const matchesSearch = !checkInSearchQuery
                    ? true
                    : (a.fullName?.toLowerCase().includes(checkInSearchQuery.toLowerCase()) ||
                       a.name?.toLowerCase().includes(checkInSearchQuery.toLowerCase()) ||
                       a.bibNumber?.toLowerCase().includes(checkInSearchQuery.toLowerCase()) ||
                       a.clubName?.toLowerCase().includes(checkInSearchQuery.toLowerCase()) ||
                       a.team?.toLowerCase().includes(checkInSearchQuery.toLowerCase()));
                  
                  const matchesFilter = checkInFilter === "all"
                    ? true
                    : checkInFilter === "checked_in"
                      ? (a.status === "checked_in" || a.status === "Thi đấu")
                      : checkInFilter === "pending"
                        ? (!a.status || a.status === "registered" || a.status === "Chờ Báo Danh")
                        : false;

                  return matchesSearch && matchesFilter;
                });

                // Sort the filtered list ascending by clean BIB number (either drawn or temporary)
                const sorted = [...filtered].sort((a, b) => {
                  const bibA = getCleanBibNumber(a.bibNumber, a.id || a.participantId);
                  const bibB = getCleanBibNumber(b.bibNumber, b.id || b.participantId);
                  
                  const numA = parseInt(bibA.replace(/\D/g, ""), 10);
                  const numB = parseInt(bibB.replace(/\D/g, ""), 10);
                  
                  if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                  }
                  return bibA.localeCompare(bibB, undefined, { numeric: true, sensitivity: 'base' });
                });

                if (sorted.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                        Không tìm thấy vận động viên nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  );
                }

                return sorted.map((a, idx) => {
                  let currentStatus = a.status || "registered";
                  if (currentStatus === "Thi đấu") {
                    currentStatus = "checked_in";
                  } else if (currentStatus === "Bỏ thi") {
                    currentStatus = "dns";
                  }
                  return (
                    <tr key={`${a.id || a.participantId || 'ath'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                      <td className="px-4 py-3 font-mono font-bold text-slate-450">{getCleanBibNumber(a.bibNumber, a.id)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-650 dark:text-indigo-400">
                        {getCleanVscNumber(a.vscNumber || a.idCard, a.id)}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white text-left">
                        {a.fullName || a.name}
                      </td>
                      <td className="px-4 py-3 text-slate-550 dark:text-slate-450 font-medium text-left">{a.clubName || a.team || "Tự Do"}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 text-left">{a.competitionCategory || "Amateur"}</td>
                      <td className="px-4 py-3 text-left">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          currentStatus === "checked_in"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : currentStatus === "dns"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                              : currentStatus === "withdrawn"
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-indigo-100 text-indigo-850 dark:bg-indigo-950 dark:text-indigo-400"
                        }`}>
                          {currentStatus === "checked_in" && "✓ Điểm Danh"}
                          {currentStatus === "registered" && "● Chờ Báo Danh"}
                          {currentStatus === "dns" && "⚠ DNS (Vắng)"}
                          {currentStatus === "withdrawn" && "✘ Rút Lui"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {currentStatus !== "checked_in" ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = deduplicatedAthletes.map(ath => 
                                (ath.id === a.id || (ath.participantId && a.participantId && ath.participantId === a.participantId))
                                  ? { ...ath, status: "checked_in", checkInStatus: "checked_in" }
                                  : ath
                              );
                              await syncAthletesToCloud(updated);
                              showToast("success", "Điểm danh", `Đã điểm danh: ${a.fullName || a.name}`);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                          >
                            Điểm Danh
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = deduplicatedAthletes.map(ath => 
                                (ath.id === a.id || (ath.participantId && a.participantId && ath.participantId === a.participantId))
                                  ? { ...ath, status: "registered", checkInStatus: "pending" }
                                  : ath
                              );
                              await syncAthletesToCloud(updated);
                              showToast("info", "Điểm danh", `Đã hủy điểm danh: ${a.fullName || a.name}`);
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            Hủy Điểm Danh
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const nextSt = currentStatus === "dns" ? "registered" : "dns";
                            const updated = deduplicatedAthletes.map(ath => 
                              (ath.id === a.id || (ath.participantId && a.participantId && ath.participantId === a.participantId))
                                ? { ...ath, status: nextSt, checkInStatus: nextSt === "dns" ? "pending" : "pending" }
                                : ath
                            );
                            await syncAthletesToCloud(updated);
                            showToast("info", "Trạng thái VĐV", nextSt === "dns" ? `Đã đặt trạng thái DNS cho VĐV: ${a.fullName || a.name}` : `Đã mở lại trạng thái cho VĐV: ${a.fullName || a.name}`);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            currentStatus === "dns"
                              ? "bg-amber-500 text-white"
                              : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
                          }`}
                        >
                          DNS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAthlete(a);
                            setEditAthleteFields({
                              id: a.id || a.participantId,
                              participantId: a.participantId || a.id,
                              fullName: a.fullName || a.name || "",
                              bibNumber: a.bibNumber || "",
                              vscNumber: a.vscNumber || "",
                              dob: a.dob || "",
                              gender: a.gender || "Nam",
                              province: a.province || "",
                              clubName: a.clubName || a.team || "",
                              competitionCategory: a.competitionCategory || "Amateur",
                              notes: a.notes || "",
                              isPrimaryTeam: a.isPrimaryTeam || false,
                              status: a.status || "registered",
                              metadata: a.metadata || "",
                            });
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black transition-all"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ready Checklist Board */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isChecklistValid ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Bản Đánh Giá Sẵn Sàng (VSC Ready Checklist Engine)
            </h4>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isChecklistValid ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
            {isChecklistValid ? "✓ SẴN SÀNG" : "CHƯA HOÀN THÀNH"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          {/* Item 1: Athlete Checked-in */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.athleteCheckedIn 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.athleteCheckedIn}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, athleteCheckedIn: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Athlete Checked-in</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedAthleteCheckedIn ? "Hệ thống: Đã điểm danh VĐV" : "Hệ thống: Chưa phát hiện VĐV điểm danh"}
              </span>
            </div>
          </label>

          {/* Item 2: Lane Assigned */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.laneAssigned 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.laneAssigned}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, laneAssigned: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Lane Assigned</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedLaneAssigned ? "Hệ thống: Đã phân chia bệ bắn & lượt đấu" : "Hệ thống: Chưa xếp bệ bắn"}
              </span>
            </div>
          </label>

          {/* Item 3: Referee Ready */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.refereeReady 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.refereeReady}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, refereeReady: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Referee Ready</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedRefereeReady ? "Hệ thống: Trọng tài bệ bắn đã sẵn sàng" : "Hệ thống: Chưa thiết lập trọng tài"}
              </span>
            </div>
          </label>

          {/* Item 4: Distance Configured */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.distanceConfigured 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.distanceConfigured}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, distanceConfigured: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Distance Configured</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedDistanceConfigured ? "Hệ thống: Đã cấu hình cự ly thi đấu" : "Hệ thống: Chưa cấu hình cự ly"}
              </span>
            </div>
          </label>

          {/* Item 5: Competition Environment */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.environmentReady 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.environmentReady}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, environmentReady: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Competition Environment</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedEnvironmentReady ? "Hệ thống: Thể thức thi đấu hợp lệ" : "Hệ thống: Chưa có thể thức"}
              </span>
            </div>
          </label>

          {/* Item 6: Network Ready */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
            checklistState.networkReady 
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100" 
              : "bg-rose-950/15 border-rose-950/40 text-rose-200"
          }`}>
            <input 
              type="checkbox"
              checked={checklistState.networkReady}
              onChange={(e) => setManualChecklist(prev => ({ ...prev, networkReady: e.target.checked }))}
              className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span className="text-xs font-bold block">✓ Network Ready</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {computedNetworkReady ? "Hệ thống: Kết nối mạng ổn định" : "Hệ thống: Chạy ngoại tuyến (Local)"}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* DANH SÁCH SƠ ĐỒ ĐẤU CÁ NHÂN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Danh Sách Sơ Đồ Đấu Cá Nhân ({
                (resolvedHeats || []).filter((h: any) => !h.heatName?.includes("Đồng Đội")).length
              } Heats)
            </h4>
          </div>
          <button
            onClick={handleRandomizeAndAssign}
            className="px-3 py-1.5 bg-indigo-55 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Gỡ bỏ & Sắp xếp lại Cá Nhân
          </button>
        </div>

        {(() => {
          const individualHeatsList = (resolvedHeats || []).filter((h: any) => !h.heatName?.includes("Đồng Đội"));
          if (individualHeatsList.length === 0) {
            return (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                Chưa có sơ đồ đấu cá nhân nào được tạo. Nhấp "Bốc Thăm & Cấp BIB Ngẫu Nhiên" ở dưới để sắp xếp tự động.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
              {individualHeatsList.map((heat: any) => (
                <div key={heat.heatId} className="bg-slate-50 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/55 pb-1.5">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      {heat.heatName || `Lượt ${heat.heatNumber}`}
                    </span>
                    <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                      {heat.lanes?.length || 0} Bệ bắn
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {(heat.lanes || []).map((lane: any) => {
                      const athObj = activeAthletesList.find(a => a && (
                        a.id === lane.participantId || 
                        a.participantId === lane.participantId ||
                        (a.name && lane.fullName && a.name.trim().toLowerCase() === lane.fullName.trim().toLowerCase())
                      ));
                      const cleanVsc = athObj ? getCleanVscNumber(athObj.vscNumber || athObj.idCard, athObj.id) : null;
                      const displayBib = getCleanBibNumber(lane.bibNumber || athObj?.bibNumber, athObj?.id || lane.participantId);
                      const clubName = athObj?.clubName || athObj?.team || lane.clubName || lane.clubId || "Tự Do";
                      
                      return (
                        <div key={lane.laneNumber} className="flex justify-between items-center bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-850">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0">
                              {lane.laneNumber}
                            </span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-200">
                              {lane.fullName || lane.name || "N/A"}
                            </span>
                            <span className="font-mono text-[8px] bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0">
                              BIB: {displayBib}
                            </span>
                            {cleanVsc && (
                              <span className="font-mono text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0">
                                VSC: {cleanVsc}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-450 font-bold max-w-[120px] truncate text-right ml-2 shrink-0">
                            {clubName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* DANH SÁCH SƠ ĐỒ ĐẤU ĐỒNG ĐỘI */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-emerald-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
              Sơ Đồ Đấu & Lượt Bắn Đồng Đội ({teamAssignmentVersions.length} sơ đồ)
            </h4>
          </div>
          <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-1 leading-normal">
            Sơ đồ phân bệ bắn và lượt đấu Đồng Đội giúp vận hành viên và MC theo dõi, phát loa thông báo cho các đội chuẩn bị.
          </p>
        </div>

        {teamAssignmentVersions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
            Chưa có sơ đồ đấu đồng đội nào được lập. Hãy sang phần <strong>Quản Lý Vận Hành &rarr; Tab Assignments</strong> để tạo chiến thuật chia làn cho Đồng Đội.
          </div>
        ) : (
          <div className="space-y-6">
            {teamAssignmentVersions.map((version: any) => (
              <div key={version.id} className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="text-left">
                    <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 block uppercase">
                      {version.name}
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">
                      Chiến thuật: {
                        version.strategy === "team_parallel" ? "Song song (Bắn luân phiên)" :
                        version.strategy === "team_sequential" ? "Nối tiếp (Mỗi lượt 1 VĐV của đội)" : "Đồng Đội"
                      }
                    </span>
                  </div>
                  <span className="text-[9px] font-bold bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                    {version.heats?.length || 0} Lượt đấu
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {(version.heats || []).map((heat: any) => (
                    <div key={heat.heatId} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="text-[11px] font-black text-slate-750 dark:text-slate-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {heat.heatName || `Lượt ${heat.heatNumber}`}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {heat.lanes?.length || 0} bệ
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        {(heat.lanes || []).map((lane: any) => (
                          <div key={lane.laneNumber} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-100/60 dark:border-slate-850">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 w-5 h-5 rounded-md flex items-center justify-center text-[10px]">
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
                                    <span className="font-mono text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
                                      BIB: {displayBib}
                                    </span>
                                    {cleanVsc && (
                                      <span className="font-mono text-[8px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                        {cleanVsc}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <span className="text-[9px] text-slate-450 font-bold max-w-[120px] truncate">
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
  );
};
