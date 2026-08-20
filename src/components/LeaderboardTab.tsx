import { Leaderboard } from "./Leaderboard";
import { TeamLeaderboard } from "./TeamLeaderboard";
import { DistanceConfig } from "../types";

interface LeaderboardTabProps {
  rankingMode: "individual" | "team";
  setRankingMode: (mode: "individual" | "team") => void;
  rankingEnvironment: "individual" | "team";
  leaderboardAthletes: any[];
  leaderboardTeamAthletes: any[];
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  shotsCount: number;
  teamShotsCount: number;
  directMaxShots: number;
  teamDirectMaxShots: number;
  directMaxPoints: number;
  teamDirectMaxPoints: number;
  commandCenterState: any;
}

export function LeaderboardTab({
  rankingMode,
  setRankingMode,
  rankingEnvironment,
  leaderboardAthletes,
  leaderboardTeamAthletes,
  distances,
  teamDistances,
  shotsCount,
  teamShotsCount,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  commandCenterState,
}: LeaderboardTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Ranking mode filter options 50-50 */}
      <div className="flex bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full gap-1">
        <button
          type="button"
          onClick={() => setRankingMode("individual")}
          className={`flex-1 text-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            rankingMode === "individual"
              ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-2 ring-indigo-400/50 scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          }`}
        >
          👤 Xếp Hạng Cá Nhân (VĐV)
        </button>
        <button
          type="button"
          onClick={() => setRankingMode("team")}
          className={`flex-1 text-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            rankingMode === "team"
              ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-2 ring-indigo-400/50 scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          }`}
        >
          🛡️ Xếp Hạng Đồng Đội (CLB)
        </button>
      </div>

      {rankingMode === "individual" ? (
        <Leaderboard 
          athletes={rankingEnvironment === "individual" ? leaderboardAthletes : leaderboardTeamAthletes} 
          distances={rankingEnvironment === "individual" ? distances : teamDistances} 
          shotsCount={rankingEnvironment === "individual" ? shotsCount : teamShotsCount} 
          competitionMode={rankingEnvironment}
          directMaxShots={directMaxShots}
          teamDirectMaxShots={teamDirectMaxShots}
          directMaxPoints={directMaxPoints}
          teamDirectMaxPoints={teamDirectMaxPoints}
          activeDistanceIndex={commandCenterState?.currentDistanceIndex}
        />
      ) : (
        <TeamLeaderboard
          athletes={rankingEnvironment === "individual" ? leaderboardAthletes : leaderboardTeamAthletes}
          distances={rankingEnvironment === "individual" ? distances : teamDistances}
          shotsCount={rankingEnvironment === "individual" ? shotsCount : teamShotsCount}
          competitionMode={rankingEnvironment}
          directMaxShots={directMaxShots}
          teamDirectMaxShots={teamDirectMaxShots}
          directMaxPoints={directMaxPoints}
          teamDirectMaxPoints={teamDirectMaxPoints}
          activeDistanceIndex={commandCenterState?.currentDistanceIndex}
        />
      )}
    </div>
  );
}
