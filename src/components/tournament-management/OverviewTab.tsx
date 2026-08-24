import React from "react";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";

interface OverviewTabProps {
  tournamentFormat: "individual" | "mixed";
  distances: any[];
  teamDistances: any[];
  athletesList: any[];
  prizePool: number;
  headReferee: string;
  sponsorsList: any[];
  status: string;
  getStatusBadgeClass: (status: string) => string;
  getStatusLabel: (status: string) => string;
  globalMasterAthletes?: any[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  tournamentFormat,
  distances,
  teamDistances,
  athletesList,
  prizePool,
  headReferee,
  sponsorsList,
  status,
  getStatusBadgeClass,
  getStatusLabel,
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
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Tổng Quan Giải Đấu (Overview Dashboard)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Bảng bento thông số hoạt động của giải đấu trong Workspace.</p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Quy chế thi đấu</span>
          <span className="text-sm font-extrabold block text-indigo-650 dark:text-indigo-400 mt-1 truncate">
            {tournamentFormat === "mixed" ? "Thi Cá Nhân & Đồng Đội" : "Thi Cá Nhân"}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Cự ly cá nhân</span>
          <span className="text-lg font-black block text-slate-800 dark:text-white mt-1">{distances.length} cự ly</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Cự ly đồng đội</span>
          <span className="text-lg font-black block text-slate-800 dark:text-white mt-1">{teamDistances.length} cự ly</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">VĐV Đăng Ký</span>
          <span className="text-lg font-black block text-slate-800 dark:text-white mt-1">{athletesList.length} VĐV</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Cơ cấu giải thưởng</span>
          <span className="text-sm font-black block text-amber-600 mt-1">{(prizePool || 0).toLocaleString("vi-VN")} VNĐ</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Ban trọng tài</span>
          <span className="text-xs font-bold block text-slate-700 dark:text-slate-300 mt-1 truncate">
            {headReferee ? `Chính: ${headReferee}` : "Chưa phân trọng tài"}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span className="text-[10px] text-slate-450 uppercase font-black block tracking-wider font-mono">Nhà tài trợ</span>
          <span className="text-sm font-bold block text-emerald-600 mt-1">{sponsorsList.length} đơn vị</span>
        </div>
      </div>

      {/* Information Banner directing to Mission Control */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-950/5 p-6 rounded-3xl border border-indigo-150/80 dark:border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider font-mono">ĐỒNG BỘ TIẾN TRÌNH & ĐIỀU HÀNH TÁC CHIẾN</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
            Mọi nghiệp vụ của giải đấu (Mở đăng ký, Điểm danh, Cấp BIB, Xếp bệ lượt bắn, Chạy thi đấu thời gian thực, Phê duyệt & Công bố kết quả...) hiện được chỉ huy tập trung tại <strong>Bảng tác chiến Mission Control (Tác Chiến)</strong> để tránh chồng chéo thông tin.
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex px-3.5 py-2 bg-indigo-650 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-wide shadow-sm shadow-indigo-200 dark:shadow-none">
            Quản lý bằng Mission Control
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Checklist Khởi Tạo Giải:</span>
        <div className="text-xs space-y-1.5 font-medium text-slate-650 dark:text-slate-400">
          <p>✓ [Thông tin chung] Nhập tên, thời gian, địa điểm giải đấu</p>
          <p>✓ [Cấu hình quy chế] Thiết lập các cự ly cá nhân và đồng đội độc lập</p>
          <p>✓ [Ban trọng tài] Chỉ định trọng tài chính và danh sách trọng tài phụ</p>
          <p>✓ [Vận động viên] Đăng ký VĐV, bốc thăm phân chia sơ đồ làn bãi bắn</p>
        </div>
      </div>

      {/* Registered Athletes List with Avatars */}
      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider block">Danh sách VĐV đăng ký ({athletesList.length})</span>
        </div>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-450 uppercase font-black tracking-wider border-b border-slate-200 dark:border-slate-800 font-mono">
                  <th className="px-3 py-2">Mã VSC</th>
                  <th className="px-3 py-2">BIB</th>
                  <th className="px-3 py-2">Họ và Tên</th>
                  <th className="px-3 py-2">Giới tính</th>
                  <th className="px-3 py-2">Đơn vị / CLB</th>
                  <th className="px-3 py-2">Cự ly đăng ký</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {athletesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400 font-semibold">
                      Chưa có vận động viên đăng ký tham gia.
                    </td>
                  </tr>
                ) : (
                  athletesList.map((vdv, idx) => (
                    <tr key={`${vdv.id || vdv.participantId || 'overview-vdv'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                      <td className="px-3 py-2 font-mono font-bold text-indigo-650 dark:text-indigo-400">
                        {vdv.vscNumber || vdv.idCard || "N/A"}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-500">
                        {vdv.bibNumber || "CHƯA CẤP"}
                      </td>
                      <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveAthleteAvatar(vdv)}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span>{vdv.fullName || vdv.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-550 dark:text-slate-400">
                        {vdv.gender || "Nam"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-350">
                        {vdv.clubName || vdv.team || "Tự Do"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 rounded font-black text-slate-700 dark:text-slate-300">
                          {vdv.category || "Cá nhân"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
