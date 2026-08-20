import { Lock } from "lucide-react";
import { updateOnlineTournament } from "../lib/firebaseService";
import { DistanceConfig } from "../types";

interface TournamentWorkspaceBannerProps {
  activeHistoryId: string | null;
  currentTournamentDoc: any;
  matchName: string;
  commandCenterState: any;
  competitionMode: "individual" | "team";
  setCompetitionMode: (mode: "individual" | "team") => void;
  userRole: string;
  isSpectatorModeOverridden: boolean;
  setIsSpectatorModeOverridden: (overridden: boolean) => void;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  networkStatus: "online" | "offline" | null;
}

export function TournamentWorkspaceBanner({
  activeHistoryId,
  currentTournamentDoc,
  matchName,
  commandCenterState,
  competitionMode,
  setCompetitionMode,
  userRole,
  isSpectatorModeOverridden,
  setIsSpectatorModeOverridden,
  distances,
  teamDistances,
  networkStatus,
}: TournamentWorkspaceBannerProps) {
  if (!activeHistoryId) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl transition-all flex flex-col gap-4">
      {/* Top Row: Title, Season, Status, and Exit Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 flex-1 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">
              TOURNAMENT WORKSPACE
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-indigo-400 px-2 py-0.5 rounded-md border border-slate-700">
              Mùa giải: {currentTournamentDoc?.season || "VSC 2026"}
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
              currentTournamentDoc?.status === "live" 
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" 
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              Trạng thái: {
                currentTournamentDoc?.status === "draft" ? "Bản Nháp" :
                currentTournamentDoc?.status === "registration" ? "Đang Đăng Ký" :
                currentTournamentDoc?.status === "ready" ? "Sẵn Sàng" :
                currentTournamentDoc?.status === "live" ? "Đang Diễn Ra (LIVE)" :
                currentTournamentDoc?.status === "completed" ? "Đã Kết Thúc" :
                currentTournamentDoc?.status === "archived" ? "Lưu Trữ" : (currentTournamentDoc?.status || "Bản Nháp")
              }
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between w-full">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {matchName}
            </h2>
            <div className="flex flex-col gap-1 shrink-0">
              {(!currentTournamentDoc?.tournamentFormat || currentTournamentDoc?.tournamentFormat === "mixed") && (
                <div className="flex bg-black/30 border border-white/10 rounded-lg p-0.5 w-[250px]">
                  <button
                    type="button"
                    disabled={commandCenterState?.individualLocked === true}
                    onClick={() => {
                      if (commandCenterState?.individualLocked === true) {
                        alert("Hình thức thi đấu Cá nhân đang bị khóa trong Mission Control.");
                        return;
                      }
                      setCompetitionMode("individual");
                      if (activeHistoryId !== null && userRole !== "admin") {
                        setIsSpectatorModeOverridden(true);
                      }
                      if (activeHistoryId && activeHistoryId.startsWith("tour-") && userRole === "admin") {
                        updateOnlineTournament(activeHistoryId, { competitionMode: "individual" })
                          .catch(err => console.error("Cloud update mode failed:", err));
                      }
                    }}
                    className={`flex-1 text-center py-1.5 px-2 text-[10px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      commandCenterState?.individualLocked === true
                        ? "opacity-40 cursor-not-allowed text-zinc-500"
                        : competitionMode === "individual"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/35 font-extrabold scale-102"
                        : "text-indigo-200 hover:text-white"
                    }`}
                    title={
                      commandCenterState?.individualLocked === true
                        ? "Hình thức thi đấu Cá nhân đang bị khóa trong Mission Control"
                        : activeHistoryId !== null && userRole !== "admin"
                        ? "Xem hình thức Cá Nhân trên thiết bị của bạn"
                        : ""
                    }
                  >
                    {commandCenterState?.individualLocked === true && <Lock className="w-2.5 h-2.5 shrink-0" />}
                    Cá Nhân
                  </button>
                  <button
                    type="button"
                    disabled={commandCenterState?.teamLocked === true}
                    onClick={() => {
                      if (commandCenterState?.teamLocked === true) {
                        alert("Hình thức thi đấu Đồng đội đang bị khóa trong Mission Control.");
                        return;
                      }
                      setCompetitionMode("team");
                      if (activeHistoryId !== null && userRole !== "admin") {
                        setIsSpectatorModeOverridden(true);
                      }
                      if (activeHistoryId && activeHistoryId.startsWith("tour-") && userRole === "admin") {
                        updateOnlineTournament(activeHistoryId, { competitionMode: "team" })
                          .catch(err => console.error("Cloud update mode failed:", err));
                      }
                    }}
                    className={`flex-1 text-center py-1.5 px-2 text-[10px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      commandCenterState?.teamLocked === true
                        ? "opacity-40 cursor-not-allowed text-zinc-500"
                        : competitionMode === "team"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/35 font-extrabold scale-102"
                        : "text-indigo-200 hover:text-white"
                    }`}
                    title={
                      commandCenterState?.teamLocked === true
                        ? "Hình thức thi đấu Đồng đội đang bị khóa trong Mission Control"
                        : activeHistoryId !== null && userRole !== "admin"
                        ? "Xem hình thức Đồng Đội trên thiết bị của bạn"
                        : ""
                    }
                  >
                    {commandCenterState?.teamLocked === true && <Lock className="w-2.5 h-2.5 shrink-0" />}
                    Đồng Đội
                  </button>
                </div>
              )}
              {activeHistoryId !== null && userRole !== "admin" && isSpectatorModeOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSpectatorModeOverridden(false);
                    if (currentTournamentDoc && currentTournamentDoc.competitionMode) {
                      setCompetitionMode(currentTournamentDoc.competitionMode);
                    }
                  }}
                  className="text-[9px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit"
                  title="Nhấn để đồng bộ lại hình thức thi đấu theo Ban Tổ Chức"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  Chế độ tự chọn (Đồng bộ lại)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Metadata grid of operational settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
        <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl text-left">
          <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Hình thức thi đấu</span>
          <span className="text-xs font-extrabold text-white mt-0.5 block">
            {competitionMode === "individual" ? "🎯 CÁ NHÂN" : "👥 ĐỒNG ĐỘI"}
          </span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl text-left">
          <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Vai trò tác chiến</span>
          <span className="text-xs font-extrabold text-indigo-400 mt-0.5 block">
            {userRole === "admin" ? "👑 BAN TỔ CHỨC" : userRole === "referee" ? "⚖️ TRỌNG TÀI" : "👀 KHÁN GIẢ (VIEW)"}
          </span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl text-left">
          <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Vòng / Cự ly</span>
          <span className="text-xs font-extrabold text-amber-400 mt-0.5 block truncate font-sans">
            {commandCenterState 
              ? ((competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex]?.distance || "Mặc định") 
              : "Chưa Bắt Đầu"}
          </span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl text-left font-sans">
          <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Kết nối đám mây</span>
          <span className="text-xs font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${networkStatus === "offline" ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
            {networkStatus === "offline" ? "MẤT KẾT NỐI (Local)" : "ONLINE (Realtime)"}
          </span>
        </div>
      </div>
    </div>
  );
}
