import { Plus } from "lucide-react";

interface ExitAndCreateConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitAndCreateConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: ExitAndCreateConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
          ⚠️ Xác nhận Thoát để Tạo Giải Mới
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-semibold">
          Bạn có chắc chắn muốn thoát khỏi giải đấu hiện tại để tiến hành tạo một giải đấu trực tuyến mới không?
        </p>
        
        <div className="flex flex-col gap-2.5 mt-5 font-sans">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Xác nhận thoát & Tạo giải mới
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 rounded-xl text-xs font-bold transition-all text-center mt-1 cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
