import React from "react";
import { QrCode } from "lucide-react";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";

interface CheckInTabProps {
  athletesList: any[];
  setAthletesList: (val: any[]) => void;
  registrationFee: number;
  setActivePaymentVdv: (val: any) => void;
  setPaymentSimulationStep: (val: string) => void;
  canUpdate: boolean;
  globalMasterAthletes?: any[];
}

export const CheckInTab: React.FC<CheckInTabProps> = ({
  athletesList,
  setAthletesList,
  registrationFee,
  setActivePaymentVdv,
  setPaymentSimulationStep,
  canUpdate,
  globalMasterAthletes = [],
}) => {
  const resolveAthleteAvatar = (vdv: any) => {
    if (!vdv) return AVATAR_MALE;
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    if (!avatarUrl || avatarUrl.startsWith("data:image") === false) {
      const targetId = vdv.masterAthleteId || vdv.athleteId || vdv.participantId || vdv.id;
      if (targetId) {
        const found = globalMasterAthletes.find((a) => a.id === targetId || a.athleteId === targetId);
        if (found) {
          avatarUrl = found.avatarUrl || found.avatar || avatarUrl;
        }
      }
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Check-In (Điểm Danh VĐV)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Điểm danh VĐV bãi bắn và quản lý trạng thái thi đấu thực tế (DNS, DQ, Withdraw).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-left">
          <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">Đăng Ký</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{athletesList.length}</span>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900 text-left">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black tracking-wider uppercase block">Đã Điểm Danh</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            {athletesList.filter(a => a.status === "checked_in").length}
          </span>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900 text-left">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black tracking-wider uppercase block">Vắng Mặt (DNS/Rút lui)</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
            {athletesList.filter(a => a.status === "dns" || a.status === "withdrawn").length}
          </span>
        </div>
        <div className="bg-rose-50/50 dark:bg-rose-950/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900 text-left">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black tracking-wider uppercase block">Vi Phạm (DQ)</span>
          <span className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1 block">
            {athletesList.filter(a => a.status === "dq").length}
          </span>
        </div>
      </div>

      <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3">BIB</th>
              <th className="px-4 py-3">Họ và Tên</th>
              <th className="px-4 py-3">CLB</th>
              <th className="px-4 py-3">Lệ phí</th>
              <th className="px-4 py-3">Trạng thái hiện tại</th>
              <th className="px-4 py-3 text-right">Thao tác chuyển trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
            {athletesList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                  Không có VĐV nào khả dụng để điểm danh. Hãy đăng ký ở tab Participants trước!
                </td>
              </tr>
            ) : (
              athletesList.map((vdv, idx) => {
                const currentStatus = vdv.status || "registered";
                return (
                  <tr key={`${vdv.id || vdv.participantId || 'vdv'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{vdv.bibNumber || "BIB-999"}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={resolveAthleteAvatar(vdv)} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <span>{vdv.fullName || vdv.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{vdv.clubName || vdv.team || "Tự Do"}</td>
                    <td className="px-4 py-3">
                      {registrationFee && registrationFee > 0 ? (
                        vdv.paymentStatus === "paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/60 font-mono">
                            ✓ Đã đóng
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-450 border border-amber-200/50 dark:border-amber-900/40 font-mono">
                              Chưa đóng
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePaymentVdv(vdv);
                                setPaymentSimulationStep("ready");
                              }}
                              className="p-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-0.5 font-bold text-[9px] cursor-pointer"
                            >
                              <QrCode className="w-3 h-3" /> QR
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">Miễn phí</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        currentStatus === "checked_in"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-450"
                          : currentStatus === "dns"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-450"
                            : currentStatus === "withdrawn"
                              ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                              : currentStatus === "dq"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400"
                      }`}>
                        {currentStatus === "checked_in" && "✓ Điểm Danh"}
                        {currentStatus === "registered" && "● Chờ Báo Danh"}
                        {currentStatus === "dns" && "⚠ DNS (Vắng)"}
                        {currentStatus === "withdrawn" && "✘ Rút Lui"}
                        {currentStatus === "dq" && "✖ DQ (Loại)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {canUpdate && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(a => 
                                (a.id === vdv.id || (a.participantId && vdv.participantId && a.participantId === vdv.participantId)) 
                                  ? { ...a, status: "checked_in", checkInStatus: "checked_in" }
                                  : a
                              );
                              setAthletesList(updated);
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-extrabold hover:bg-emerald-700 transition"
                          >
                            Điểm Danh
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(a => 
                                (a.id === vdv.id || (a.participantId && vdv.participantId && a.participantId === vdv.participantId)) 
                                  ? { ...a, status: "dns", checkInStatus: "pending" }
                                  : a
                              );
                              setAthletesList(updated);
                            }}
                            className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-extrabold hover:bg-amber-600 transition"
                          >
                            DNS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(a => 
                                (a.id === vdv.id || (a.participantId && vdv.participantId && a.participantId === vdv.participantId)) 
                                  ? { ...a, status: "withdrawn", checkInStatus: "withdrawn" }
                                  : a
                              );
                              setAthletesList(updated);
                            }}
                            className="px-2 py-1 bg-slate-500 text-white rounded text-[10px] font-extrabold hover:bg-slate-600 transition"
                          >
                            Rút Lui
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(a => 
                                (a.id === vdv.id || (a.participantId && vdv.participantId && a.participantId === vdv.participantId)) 
                                  ? { ...a, status: "dq", checkInStatus: "disqualified" }
                                  : a
                              );
                              setAthletesList(updated);
                            }}
                            className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-extrabold hover:bg-rose-700 transition"
                          >
                            DQ
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
