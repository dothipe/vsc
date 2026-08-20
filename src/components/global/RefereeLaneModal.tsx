import { Target, X, AlertCircle } from "lucide-react";
import { getStageDisplayName } from "../../utils/generalUtils";
import { DistanceConfig } from "../../types";

interface RefereeLaneModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  competitionMode: "individual" | "team";
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  commandCenterState: any;
  currentTournamentDoc: any;
  refereeSelectedLane: number | null;
  setRefereeSelectedLane: (lane: number | null) => void;
  laneLimit: number;
}

export function RefereeLaneModal({
  isOpen,
  onClose,
  currentUser,
  competitionMode,
  distances,
  teamDistances,
  commandCenterState,
  currentTournamentDoc,
  refereeSelectedLane,
  setRefereeSelectedLane,
  laneLimit,
}: RefereeLaneModalProps) {
  if (!isOpen) return null;

  const targetStages = competitionMode === "individual" ? distances : teamDistances;
  const currentDistIdx = commandCenterState?.currentDistanceIndex || 0;
  const currentStageObj = targetStages[currentDistIdx];
  const stageDisplay = getStageDisplayName(currentDistIdx, currentStageObj);
  const heatNum = commandCenterState?.currentHeat || 1;

  const activeHeatObj = (
    commandCenterState?.heats ||
    currentTournamentDoc?.commandCenterState?.heats ||
    []
  ).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
  const isSoloHeat = Boolean(activeHeatObj && (activeHeatObj.heatType === "solo" || activeHeatObj.heatType === "resolo"));
  const heatName = activeHeatObj
    ? activeHeatObj.heatName || (activeHeatObj.heatType === "resolo" ? `Re-Solo #${activeHeatObj.heatNumber}` : `Solo #${activeHeatObj.heatNumber}`)
    : `Solo #${heatNum}`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[10007] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl relative text-left flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2 font-sans">
              <Target className="w-5 h-5 text-[#ae1d1e]" /> Chọn Bệ Bắn Chấm Điểm
            </h3>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              Chọn bệ bắn (Lane) mà bạn đang giám sát để hệ thống đồng bộ danh sách vận động viên chính xác.
            </p>
          </div>
          {refereeSelectedLane !== null && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="my-4">
          {commandCenterState && (
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl mb-4 flex items-center justify-between border border-slate-800 shadow-md font-sans">
              <div className="flex-1 border-r border-slate-800 pr-3 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">VÒNG BẮN</span>
                <span className="text-xs sm:text-sm font-black text-indigo-400 tracking-tight block">
                  {stageDisplay}
                  {isSoloHeat ? ` - ${heatName.toUpperCase()}` : ""}
                </span>
              </div>
              <div className="flex-1 pl-3 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">LƯỢT BẮN</span>
                <span className="text-xs sm:text-sm font-black text-rose-400 font-mono tracking-tight block">
                  {isSoloHeat ? heatName.toUpperCase() : `LƯỢT #${heatNum}`}
                </span>
              </div>
            </div>
          )}

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-sans">
            Sơ đồ {laneLimit} bệ bắn:
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: laneLimit }).map((_, i) => {
              const laneNum = i + 1;
              const refereeId = (currentUser?.email || "anonymous").toLowerCase();
              const isOccupiedByOther = (() => {
                if (!commandCenterState?.refereeWorkspaces) return false;
                return commandCenterState.refereeWorkspaces.some(
                  (ws: any) =>
                    ws.refereeId?.toLowerCase() !== refereeId &&
                    (ws.athletes || []).some(
                      (ath: any) => ath.status === "scoring" && Number(ath.laneNumber) === laneNum
                    )
                );
              })();
              const isCurrent = refereeSelectedLane === laneNum;

              return (
                <button
                  key={laneNum}
                  type="button"
                  onClick={() => {
                    setRefereeSelectedLane(laneNum);
                    onClose();
                  }}
                  className={`h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer relative ${
                    isCurrent
                      ? "bg-gradient-to-br from-rose-50 to-rose-100 border-[#ae1d1e] text-[#ae1d1e] dark:from-rose-950/20 dark:to-rose-900/10"
                      : isOccupiedByOther
                      ? "bg-amber-50/50 border-amber-300 text-amber-700 dark:bg-amber-955/10 dark:border-amber-900/50 dark:text-amber-400"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="text-xs font-mono text-slate-400">BỆ</span>
                  <span className="text-lg font-black font-sans leading-none mt-0.5">#{laneNum}</span>
                  {isCurrent && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ae1d1e] animate-ping" />
                  )}
                  {isOccupiedByOther && (
                    <span className="absolute bottom-1 text-[8px] px-1 bg-amber-500 text-white rounded font-bold font-sans">
                      BẬN
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          {refereeSelectedLane !== null && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer text-center"
            >
              Bỏ qua
            </button>
          )}
          {refereeSelectedLane === null && (
            <div className="text-center w-full text-xs text-rose-500 font-extrabold flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4" /> Vui lòng chọn một bệ bắn để tiếp tục!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
