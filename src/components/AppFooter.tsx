import { Youtube, Facebook } from "lucide-react";

interface AppFooterProps {
  currentTime: Date;
  formatICTTime: (date: Date) => string;
  formatICTDate: (date: Date) => string;
  isGlobalAdmin: boolean;
  systemAdminRoleOverride: "system_owner" | "admin" | "referee" | "spectator" | null;
  setSystemAdminRoleOverride: (r: "system_owner" | "admin" | "referee" | "spectator" | null) => void;
}

export function AppFooter({
  currentTime,
  formatICTTime,
  formatICTDate,
  isGlobalAdmin,
  systemAdminRoleOverride,
  setSystemAdminRoleOverride,
}: AppFooterProps) {
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-slate-800 pt-8 pb-12 text-gray-400 max-w-7xl mx-auto px-4" id="app-footer">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-left border-b border-gray-100 dark:border-slate-900 pb-8">
        
        {/* Social connections */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Kênh Truyền Thông & Nhóm Đăng Ký
          </h4>
          <div className="flex flex-wrap gap-3">
            <a 
              href="https://youtube.com/@vsc.vietnamslingshot?sub_confirmation=1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-red-105 dark:border-red-900/30"
            >
              <Youtube className="w-4 h-4 fill-current" />
              <span>vsc.vietnamslingshot</span>
            </a>

            <a 
              href="https://www.facebook.com/groups/vietnamslingshotchampionship" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-blue-105 dark:border-blue-900/30"
            >
              <Facebook className="w-4 h-4 fill-current" />
              <span>Vietnam Slingshot Championship</span>
            </a>

            <a 
              href="http://tiktok.com/@vsc.vietnamslingshot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-slate-200 dark:border-slate-800"
            >
              <svg className="w-4 h-4 text-current shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
              <span>@vsc.vietnamslingshot</span>
            </a>
          </div>
        </div>

        {/* Sponsors & Clubs */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Đơn Vị Đồng Hành & Câu Lạc Bộ Tài Trợ
          </h4>
          <div className="flex flex-wrap gap-2.5">
            <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm">
              🏆 36 Slingshot Club
            </span>
            <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm">
              🎯 CLB ná cao su thể thao TNU Thái Nguyên
            </span>
          </div>
        </div>

      </div>

      <div className="text-center">
        <p className="font-semibold text-gray-600 dark:text-gray-400 text-xs">
          Hệ thống tính điểm mục tiêu bộ môn thể thao Ná Cao Su &copy; {new Date().getFullYear()} bởi #HiepNAT
        </p>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Dữ liệu được lưu trữ tự động vào trình lưu trữ cục bộ của bạn (LocalStorage). Bạn có thể sao lưu thủ công bất cứ lúc nào qua tab &quot;Cấu Hình&quot;.
        </p>
      </div>

      {/* Timezone Clock & Global Admin Overrides relocated to Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 font-sans">
        {/* Timezone Clock & Date */}
        <div className="flex items-center gap-3 font-mono">
          <span className="flex items-center gap-1.5 text-indigo-550 dark:text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Múi giờ ICT (Việt Nam):</span>
          </span>
          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{formatICTTime(currentTime)}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400">{formatICTDate(currentTime)} (GMT+7)</span>
        </div>

        {/* System Admin Role Override (visible only to global admin) */}
        {isGlobalAdmin && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-xs">
            <span className="text-amber-600 dark:text-amber-500 font-black uppercase tracking-wider text-[10px]">👑 Quyền Admin Hệ Thống:</span>
            <div className="flex gap-1.5">
              {(["system_owner", "admin", "referee", "spectator"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSystemAdminRoleOverride(r)}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                    (systemAdminRoleOverride === r || (systemAdminRoleOverride === null && r === "system_owner"))
                      ? "bg-indigo-600 text-white font-extrabold shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {r === "system_owner" ? "Owner" : r === "admin" ? "Admin" : r === "referee" ? "Trọng tài" : "Khán giả"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
