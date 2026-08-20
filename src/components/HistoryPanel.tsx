import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchHistoryItem } from "../types";
import { Calendar, Trash2, RotateCcw, Award, FileSpreadsheet, Trophy, Users, FileDown, FileUp } from "lucide-react";
import { getHitCount } from "../utils/qualification";

interface HistoryPanelProps {
  history: MatchHistoryItem[];
  onRestoreHistoryItem: (itemId: string) => void;
  onDeleteHistoryItem: (itemId: string) => void;
  currentMasterCount?: number;
  onExportBackup: () => void;
  onImportBackup: (data: string) => boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onRestoreHistoryItem,
  onDeleteHistoryItem,
  currentMasterCount = 0,
  onExportBackup,
  onImportBackup,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  
  const fileInputRefFull = useRef<HTMLInputElement>(null);
  const fileInputRefRestore = useRef<HTMLInputElement>(null);

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm text-center flex flex-col gap-5 items-center justify-center">
        <div>
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">Chưa có lịch sử lưu trữ</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Điểm số hiện tại của bạn sẽ được tự động lưu vào trình duyệt. Để lưu trữ vĩnh viễn các trận đấu cũ, hãy nhấn nút &quot;Lưu lại&quot; ở phần Cấu hình.
          </p>
        </div>
        
        <div className="border-t dark:border-slate-800 pt-4 w-full max-w-xs flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRefFull.current?.click()}
            className="py-2.5 px-4 text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center shadow-sm w-full"
          >
            <FileUp className="w-4 h-4" /> Khôi phục toàn bộ giải từ File (.json)
          </button>
          <input
            ref={fileInputRefFull}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportError("");
              setImportSuccess(false);

              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const text = event.target?.result as string;
                  const success = onImportBackup(text);
                  if (success) {
                    setImportSuccess(true);
                    setTimeout(() => setImportSuccess(false), 4500);
                  } else {
                    setImportError("Định dạng file backup .json không hợp lệ!");
                  }
                } catch (err) {
                  setImportError("Lỗi đọc file backup!");
                }
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          
          {importError && (
            <span className="text-[11px] text-red-600 font-bold block bg-red-50 p-2 rounded border border-red-200 animate-fadeIn text-center">{importError}</span>
          )}
          {importSuccess && (
            <span className="text-[11px] text-emerald-700 font-extrabold block bg-emerald-50 p-2 rounded border border-emerald-200 animate-fadeIn text-center">✓ Phục hồi thành công! Hãy chuyển tab xem điểm số.</span>
          )}
        </div>
      </div>
    );
  }

  // Format date readable
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Premium History-Specific Backup & Sync Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-left">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-600" />
            Sao Lưu & Phục Hồi Dữ Liệu Toàn Bộ Giải Đấu
          </h3>
          <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
            Tất cả các bản ghi lịch sử, cấu hình cự ly, và danh sách vận động viên sẽ được đóng gói đầy đủ trong file JSON của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onExportBackup}
            className="flex-1 md:flex-none py-1.5 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-98"
          >
            <FileDown className="w-4.5 h-4.5" /> Tải Sao Lưu (.json)
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRefRestore.current?.click()}
            className="flex-1 md:flex-none py-1.5 px-4 text-xs bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
          >
            <FileUp className="w-4.5 h-4.5" /> Phục Hồi Từ File (.json)
          </button>
          <input
            ref={fileInputRefRestore}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportError("");
              setImportSuccess(false);

              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const text = event.target?.result as string;
                  const success = onImportBackup(text);
                  if (success) {
                    setImportSuccess(true);
                    setTimeout(() => setImportSuccess(false), 4500);
                  } else {
                    setImportError("Định dạng file backup .json không hợp lệ!");
                  }
                } catch (err) {
                  setImportError("Lỗi đọc file .json phục hồi!");
                }
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
      </div>

      {importError && (
        <span className="text-[11px] text-red-650 font-bold block bg-red-50 p-3 rounded-xl border border-red-200 text-center animate-fadeIn">{importError}</span>
      )}
      {importSuccess && (
        <span className="text-[11px] text-emerald-700 font-extrabold block bg-emerald-50 p-3 rounded-xl border border-emerald-250 text-center animate-fadeIn animate-pulse">✓ Đã phục hồi toàn bộ dữ liệu lịch sử thành công!</span>
      )}

      {/* Grid of tournament archives */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {history.map((item) => {
          // Calculate champion
          let championName = "Chưa có";
          let championTeam = "";
          let maxScore = -1;

          item.athletes.forEach((athlete) => {
            let athleteScore = 0;
            item.distances.forEach((dist) => {
              const hits = athlete.scores[dist.id] || [];
              athleteScore += getHitCount(hits) * dist.multiplier;
            });

            if (athleteScore > maxScore) {
              maxScore = athleteScore;
              championName = athlete.name;
              championTeam = athlete.team;
            }
          });

          return (
            <div 
              key={item.id} 
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative"
            >
              {/* Header info */}
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(item.date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(item.id);
                    }}
                    className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Xóa bản ghi lịch sử"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-2 line-clamp-1">
                  {item.matchName}
                </h4>
              </div>

              {/* Quick specifications breakdown */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-100 text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 block mb-0.5 uppercase font-semibold">Cự ly</span>
                  <span className="font-semibold text-gray-700">{item.distances.length} dòng</span>
                </div>
                <div className="text-center border-x border-gray-100">
                  <span className="text-[10px] text-gray-400 block mb-0.5 uppercase font-semibold">Số lượt bắn</span>
                  <span className="font-semibold text-gray-700 font-mono">{item.shotCount} phát</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 block mb-0.5 uppercase font-semibold">VĐV (Thi/ĐK)</span>
                  <span className="font-semibold text-gray-700 font-mono flex items-center justify-center gap-0.5" title="Số vận động viên trong bảng Ghi Điểm / Số vận động viên đăng ký trong giải đấu">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> {item.athletes.length}/{item.masterCount || item.athletes.length}
                  </span>
                </div>
              </div>

              {/* Champion showcase */}
              {maxScore >= 0 && (
                <div className="bg-amber-50/50 border border-amber-100/50 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="bg-amber-100 p-1.5 rounded-full text-amber-600">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wide block">Nhà Vô Địch (Đầu bảng)</span>
                    <span className="font-bold text-gray-800">{championName}</span>{" "}
                    {championTeam && (
                      <span className="text-gray-500 font-medium">({championTeam})</span>
                    )}
                    <span className="text-amber-700 font-mono font-bold block">
                      {maxScore} điểm
                    </span>
                  </div>
                </div>
              )}

              {/* List distances tags */}
              <div className="flex flex-wrap gap-1 mt-1">
                {item.distances.map((dist) => (
                  <span key={dist.id} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                    {dist.distance} (x{dist.multiplier})
                  </span>
                ))}
              </div>

              {/* Restore and detail buttons */}
              <div className="mt-auto pt-2 flex gap-2">
                {confirmRestoreId === item.id ? (
                  <div className="w-full bg-amber-50 dark:bg-amber-955 border border-amber-250 dark:border-amber-900/50 p-2 rounded-xl flex flex-col gap-1.5 text-xs text-amber-900 animate-fadeIn font-extrabold justify-center items-center">
                    <span className="uppercase text-[9px] text-amber-805 dark:text-amber-400 block text-center tracking-wide">
                      ⚠️ Ghi đè điểm hiện tại?
                    </span>
                    <div className="flex gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreHistoryItem(item.id);
                          setConfirmRestoreId(null);
                        }}
                        className="flex-1 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-black text-[10.5px] cursor-pointer"
                      >
                        Có, đổi bảng
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(null)}
                        className="py-1 px-3 bg-gray-200 hover:bg-gray-300 text-slate-755 rounded font-bold text-[10.5px] cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRestoreId(item.id);
                    }}
                    className="w-full py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Khôi phục bảng điểm này
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MATCH RECORD DELETION CONFIRMATION DIALOG */}
      {confirmDeleteId && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-101"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800 animate-scaleUp p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 dark:bg-rose-955/30 rounded-full">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-101 uppercase tracking-wide font-sans">Xóa Giải Đấu?</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa bản ghi của giải đấu <strong>{history.find(h => h.id === confirmDeleteId)?.matchName || "này"}</strong>? Toàn bộ hồ sơ danh sách VĐV và điểm số đã lưu trữ sẽ bị xóa sạch hoàn toàn và không thể khôi phục.
            </p>

            <div className="flex gap-2 justify-end font-sans mt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteHistoryItem(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
