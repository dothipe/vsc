import React from "react";
import { CheckCircle, Lock } from "lucide-react";

interface WorkflowBannersProps {
  workflowStage: string;
  userRole: string;
  handleFreezeRanking: () => void;
  handleGenerateOfficialResults: () => void;
  handlePublishResults: () => void;
  handleArchiveTournament: () => void;
  handleTransitionTo: (nextStage: any) => void;
}

export const WorkflowBanners: React.FC<WorkflowBannersProps> = ({
  workflowStage,
  userRole,
  handleFreezeRanking,
  handleGenerateOfficialResults,
  handlePublishResults,
  handleArchiveTournament,
  handleTransitionTo,
}) => {
  if (workflowStage === "ranking") {
    return (
      <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4 text-left">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Tổng Hợp & Khóa Bảng Điểm Giải Đấu (Step 4)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mt-1">
              Khóa điểm số toàn diện của toàn bộ giải đấu để chuẩn bị lập biên bản trao giải chính thức.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFreezeRanking}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
            >
              Xác Nhận Khóa Điểm Giải Đấu
            </button>
            <button
              onClick={() => handleTransitionTo("official_result")}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Tiến Sang Phê Duyệt (Step 5) &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (workflowStage === "official_result") {
    return (
      <div className="space-y-4 text-left">
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Ký duyệt biên bản kết quả pháp lý</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            OfficialResultEngine sẽ kết xuất biên bản kết quả chính thức có chữ ký xác nhận pháp lý từ Hội đồng trọng tài chính và Ban tổ chức giải.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateOfficialResults}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-indigo-100 dark:shadow-none"
          >
            Thành Lập Biên Bản Pháp Lý
          </button>
          <button
            onClick={() => handleTransitionTo("published")}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all"
          >
            Tiến Sang Công Bố (Step 6) &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (workflowStage === "published") {
    return (
      <div className="space-y-4 text-left">
        <div className="bg-emerald-50 dark:bg-emerald-950/15 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-350">
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Bảng vàng kết quả đã được công bố rộng rãi
          </h4>
          <p className="text-xs mt-1 leading-relaxed">
            Đã cập nhật hồ sơ sự nghiệp của các vận động viên và đồng bộ hóa kết quả lên Bảng Vàng toàn quốc phục vụ tra cứu công cộng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePublishResults}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-indigo-100 dark:shadow-none"
          >
            Đồng Bộ Công Bố Lại Kết Quả
          </button>
          <button
            onClick={() => handleTransitionTo("archived")}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-black transition-all"
          >
            Tiến Sang Lưu Trữ (Step 7) &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (workflowStage === "archived") {
    return (
      <div className="space-y-4 text-left">
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
            <Lock className="w-4 h-4 text-indigo-500" /> Giải đấu đã được Lưu Trữ & Đóng băng vĩnh viễn
          </h4>
          <p className="text-xs mt-1 leading-relaxed text-slate-400">
            Toàn bộ dữ liệu của giải đấu hiện tại đã được khóa và lưu trữ bảo tàng lịch sử. Không thể chỉnh sửa hay thay đổi thêm điểm số.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleArchiveTournament}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-indigo-100 dark:shadow-none"
          >
            Thực Hiện Lưu Trữ Lần Cuối
          </button>
        </div>
      </div>
    );
  }

  return null;
};
