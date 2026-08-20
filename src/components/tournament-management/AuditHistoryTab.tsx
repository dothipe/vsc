import React from "react";

interface AuditHistoryTabProps {
  versionHistory: any[];
}

export const AuditHistoryTab: React.FC<AuditHistoryTabProps> = ({ versionHistory }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Nhật Ký Phiên Bản (Audit Config History)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Danh sách lịch sử các thao tác cập nhật quy chế và thông số giải đấu lưu trên Firestore.
        </p>
      </div>

      {versionHistory.length === 0 ? (
        <p className="text-xs text-slate-400 font-semibold">Không có nhật ký chỉnh sửa nào cho giải đấu này.</p>
      ) : (
        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-xs font-semibold">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-2 text-left">Thời gian</th>
                <th className="px-4 py-2 text-left">Người thao tác</th>
                <th className="px-4 py-2 text-left">Thao tác</th>
                <th className="px-4 py-2 text-left">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {versionHistory.map((hist) => (
                <tr key={hist.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                  <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{new Date(hist.timestamp).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2 truncate max-w-xs text-slate-800 dark:text-slate-200">{hist.userEmail}</td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 rounded text-[9.5px] font-bold">
                      {hist.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 max-w-sm truncate">{hist.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
