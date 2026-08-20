import React from "react";
import { Trash } from "lucide-react";

interface RefereesTabProps {
  canUpdate: boolean;
  headReferee: string;
  setHeadReferee: (val: string) => void;
  assistantReferees: string[];
  setAssistantReferees: (val: string[]) => void;
  newAssistant: string;
  setNewAssistant: (val: string) => void;
}

export const RefereesTab: React.FC<RefereesTabProps> = ({
  canUpdate,
  headReferee,
  setHeadReferee,
  assistantReferees,
  setAssistantReferees,
  newAssistant,
  setNewAssistant,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Ban Trọng Tài Điều Hành (Referees Board)</h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
          Chỉ định Trọng tài chính điều hành chung và các trọng tài phụ trực tiếp chấm điểm tại bia bắn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-left">
          <label className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1">Trọng Tài Chính (Head Referee)</label>
          <p className="text-[10px] text-slate-400 mb-2">Người đại diện giải quyết mọi khiếu nại kỹ thuật và biểu quyết tiebreaker.</p>
          <input
            type="email"
            disabled={!canUpdate}
            value={headReferee}
            onChange={(e) => setHeadReferee(e.target.value)}
            className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            placeholder="email-trongtai@vscs.asia"
          />
        </div>

        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-left">
          <label className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1">Thành viên Trọng tài phụ ({assistantReferees.length})</label>
          
          {canUpdate && (
            <div className="flex gap-2">
              <input
                type="email"
                value={newAssistant}
                onChange={(e) => setNewAssistant(e.target.value)}
                className="flex-1 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                placeholder="nhap-email-trong-tai-phu@vscs.asia"
              />
              <button
                type="button"
                onClick={() => {
                  if (newAssistant.trim() && !assistantReferees.includes(newAssistant.trim())) {
                    setAssistantReferees([...assistantReferees, newAssistant.trim()]);
                    setNewAssistant("");
                  }
                }}
                className="px-3 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Thêm
              </button>
            </div>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto mt-2">
            {assistantReferees.map((refEmail, index) => (
              <div key={index} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                <span className="truncate text-slate-750 dark:text-slate-250">{refEmail}</span>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => setAssistantReferees(assistantReferees.filter(email => email !== refEmail))}
                    className="text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
