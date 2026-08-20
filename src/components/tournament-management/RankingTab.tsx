import React from "react";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";

interface RankingTabProps {
  athletesList: any[];
  globalMasterAthletes?: any[];
}

export const RankingTab: React.FC<RankingTabProps> = ({ athletesList, globalMasterAthletes = [] }) => {
  const resolveAthleteAvatar = (vdv: any) => {
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    if (!avatarUrl && vdv.isMasterAthlete && vdv.masterAthleteId) {
      const found = globalMasterAthletes.find((a) => a.id === vdv.masterAthleteId);
      if (found) {
        avatarUrl = found.avatarUrl || found.avatar || null;
      }
    }
    
    if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("local-avatar:")) {
      const id = avatarUrl.split(":")[1] || vdv.id || vdv.participantId || vdv.masterAthleteId;
      try {
        const stored = localStorage.getItem(`vsc-avatar-${id}`);
        if (stored) return stored;
      } catch (e) {
        console.warn("Failed to get local avatar in RankingTab", e);
      }
      return vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Ranking Engine Preview (Hạng Thể Thức)</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Chuẩn bị bảng tổng kết thành tích giải đấu phục vụ Ranking Engine (Module 002).
          </p>
        </div>
      </div>

      <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3 w-16">Hạng</th>
              <th className="px-4 py-3">BIB</th>
              <th className="px-4 py-3">Họ và Tên</th>
              <th className="px-4 py-3">Đơn vị / CLB</th>
              <th className="px-4 py-3 text-right">Tổng điểm</th>
              <th className="px-4 py-3 text-center">X-count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
            {athletesList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                  Chưa có dữ liệu vận động viên thi đấu.
                </td>
              </tr>
            ) : (
              [...athletesList]
                .sort((a, b) => {
                  const scoreA = Object.values(a.scores || {}).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;
                  const scoreB = Object.values(b.scores || {}).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;
                  return scoreB - scoreA;
                })
                .map((vdv, idx) => {
                  const totalScore = Object.values(vdv.scores || {}).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;
                  return (
                    <tr key={`${vdv.id || vdv.participantId || 'vdv'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {vdv.bibNumber || "BIB-000"}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveAthleteAvatar(vdv)}
                            alt="Avatar"
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span>{vdv.fullName || vdv.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-650 dark:text-slate-350">
                        {vdv.clubName || vdv.team || "Tự Do"}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                        {totalScore || 0} pt
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">
                        {vdv.xCount || 0}
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
