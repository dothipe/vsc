import { Lock, Shield } from "lucide-react";
import { createPortal } from "react-dom";

interface UnlockScoreModalProps {
  isOpen: boolean;
  pendingAddAthlete: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UnlockScoreModal({
  isOpen,
  pendingAddAthlete,
  onCancel,
  onConfirm,
}: UnlockScoreModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn text-slate-800 dark:text-slate-100">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                {pendingAddAthlete ? "Mở khóa để thêm VĐV?" : "Xác nhận ghi / sửa điểm?"}
              </h3>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Lớp bảo vệ tránh bấm nhầm</p>
            </div>
          </div>
          
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 space-y-2">
            {pendingAddAthlete ? (
              <p>
                Hệ thống đang ở Chế độ Xem để bảo vệ dữ liệu. Để <strong>thêm vận động viên mới hoặc đăng ký thi đấu</strong>, vui lòng xác nhận mở khóa Chế độ Ghi Điểm.
              </p>
            ) : (
              <p>
                Hệ thống phát hiện Thầy/Cô vừa chạm vào ô ghi điểm của vận động viên. Để tránh việc <strong>vô tình chạm làm sai lệch tỉ số</strong>, vui lòng xác nhận ghi điểm.
              </p>
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] flex flex-col gap-1.5 border border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> Cách hoạt động:
              </span>
              <span className="text-gray-500 font-medium">• <strong>Xác nhận xong</strong>: Chế độ Ghi Điểm sẽ được mở khóa, Thầy/Cô có thể tự do ghi điểm, thêm hoặc sửa VĐV mà không gặp lại bảng này.</span>
              <span className="text-gray-500 font-medium">• <strong>Khóa lại</strong>: Thầy/Cô có thể chủ động bấm Khóa ở đầu trang Ghi Điểm bất kỳ lúc nào để quay lại chế độ bảo vệ.</span>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-750 dark:text-slate-300 transition-all cursor-pointer"
            >
              Hủy (Giữ Chế độ Xem)
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              Xác nhận mở khóa
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
