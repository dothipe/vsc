import React from "react";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";

interface CompetitionTabProps {
  laneCapacity: number;
  generatedHeats: any[];
  athletesList?: any[];
  globalMasterAthletes?: any[];
}

export const CompetitionTab: React.FC<CompetitionTabProps> = ({
  laneCapacity,
  generatedHeats,
  athletesList = [],
  globalMasterAthletes = [],
}) => {
  const getLaneAvatar = (lane: any) => {
    const athlete = athletesList.find(
      (a) =>
        a.id === lane.participantId ||
        a.participantId === lane.participantId ||
        a.fullName === lane.fullName ||
        a.name === lane.fullName
    );
    
    let avatarUrl = lane.avatarUrl || (athlete ? (athlete.avatarUrl || athlete.avatar) : null);
    
    if (!avatarUrl || avatarUrl.startsWith("data:image") === false) {
      const targetId = athlete?.masterAthleteId || athlete?.athleteId || athlete?.participantId || athlete?.id || lane.participantId;
      if (targetId) {
        const found = globalMasterAthletes.find((a) => a.id === targetId || a.athleteId === targetId);
        if (found) {
          avatarUrl = found.avatarUrl || found.avatar || avatarUrl;
        }
      }
    }
    
    let gender = athlete ? athlete.gender : "Nam";
    return avatarUrl || (gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Competition Cockpit (Bảng Bia Thi Đấu Live)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Theo dõi trạng thái bắn thực tế tại bãi bắn của các VĐV.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Array.from({ length: Math.min(laneCapacity, 15) }).map((_, idx) => {
          const athleteInLane = generatedHeats[0]?.lanes.find((l: any) => l.laneNumber === idx + 1);
          return (
            <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col items-center gap-2 text-center shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Bia {idx + 1}</span>
              <div className="relative flex items-center justify-center">
                {athleteInLane ? (
                  <img 
                    src={getLaneAvatar(athleteInLane)} 
                    alt="Avatar" 
                    className="w-12 h-12 rounded-full object-cover border-2 border-red-650 shadow-inner shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-red-600 flex items-center justify-center font-black text-white text-xs shadow-inner">
                    {idx + 1}
                  </div>
                )}
                {athleteInLane && (
                  <span className="absolute -bottom-1 -right-1 bg-red-650 text-white font-mono font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-sm">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="min-h-[2.5rem] flex flex-col justify-center">
                {athleteInLane ? (
                  <>
                    <span className="text-xs font-extrabold text-slate-950 dark:text-white line-clamp-1">{athleteInLane.fullName}</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{athleteInLane.bibNumber}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Trống (Idle)</span>
                )}
              </div>
              <span className={`inline-block text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                athleteInLane 
                  ? "bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 animate-pulse" 
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
              }`}>
                {athleteInLane ? "Thi Đấu" : "Sẵn Sàng"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
