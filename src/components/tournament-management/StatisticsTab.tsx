import React from "react";

interface StatisticsTabProps {
  athletesList: any[];
  distances: any[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  athletesList,
  distances,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Tournament Analytics & Demographics</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Báo cáo phân tích tổng quan tỷ lệ đăng ký, độ bao phủ và hiệu suất điểm số.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 text-left">
          <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider block mb-4">Cơ cấu câu lạc bộ (Club Distribution)</span>
          <div className="space-y-3">
            {(() => {
              const clubCounts: Record<string, number> = {};
              athletesList.forEach(a => {
                const cName = a.clubName || a.team || "Tự Do";
                clubCounts[cName] = (clubCounts[cName] || 0) + 1;
              });
              const sortedClubs = Object.entries(clubCounts).sort((a, b) => b[1] - a[1]);
              const total = athletesList.length || 1;
              
              if (sortedClubs.length === 0) {
                return <p className="text-xs text-slate-400 font-semibold text-center py-4">Chưa có vận động viên để thống kê.</p>;
              }

              return sortedClubs.map(([club, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={club} className="space-y-1">
                    <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      <span>{club}</span>
                      <span>{count} VĐV ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-650 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 text-left flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider block mb-4">Chỉ số vận hành (Key Metrics)</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">Tỷ lệ Check-in</span>
                <span className="text-lg font-black text-indigo-650 mt-0.5 block font-mono">
                  {athletesList.length > 0 ? Math.round((athletesList.filter(a => a.status === "checked_in").length / athletesList.length) * 100) : 0}%
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">Cự ly áp dụng</span>
                <span className="text-lg font-black text-indigo-650 mt-0.5 block font-mono">
                  {distances.length} vòng
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-850 pt-4 mt-4">
            <span className="text-[10px] text-slate-400 font-bold block">Độ bao phủ địa phương</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-1">
              Giải đấu quy tụ thành viên từ nhiều câu lạc bộ ná cao su toàn quốc. Sẵn sàng tích hợp dữ liệu hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
