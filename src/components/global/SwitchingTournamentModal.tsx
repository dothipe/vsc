interface SwitchingTournamentModalProps {
  isOpen: boolean;
  matchName: string;
  switchingTournamentName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SwitchingTournamentModal({
  isOpen,
  matchName,
  switchingTournamentName,
  onCancel,
  onConfirm,
}: SwitchingTournamentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl relative text-left">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
          ⚠️ Xác nhận Chuyển Giải
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed font-semibold">
          Bạn đang tham gia giải đấu <strong className="text-indigo-650 dark:text-indigo-400">"{matchName || "Giải đấu hiện tại"}"</strong>. Bạn có chắc chắn muốn thoát giải đấu này để chuyển sang giải đấu <strong className="text-emerald-605 dark:text-emerald-400">"{switchingTournamentName}"</strong> không?
        </p>
        
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 text-center"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md text-center"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
