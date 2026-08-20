import React from "react";

interface QuickScoreModalProps {
  editingLane: number | null;
  editingScores: (number | boolean | null)[];
  setEditingScores: React.Dispatch<React.SetStateAction<(number | boolean | null)[]>>;
  setEditingLane: (val: number | null) => void;
  handleSaveQuickScore: () => void;
}

export const QuickScoreModal: React.FC<QuickScoreModalProps> = ({
  editingLane,
  editingScores,
  setEditingScores,
  setEditingLane,
  handleSaveQuickScore,
}) => {
  if (editingLane === null) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3.5">
          Ghi điểm nhanh bệ bắn #{editingLane}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Nhập điểm trực tiếp cho các phát bắn của vận động viên. Nhập "X" hoặc số từ 0 - 10 đối với tính điểm bia đổ.
        </p>

        <div className="grid grid-cols-5 gap-2.5">
          {editingScores.map((score, idx) => (
            <div key={idx} className="flex flex-col gap-1 text-left">
              <span className="text-[9px] font-bold text-slate-400">Phát #{idx + 1}</span>
              <input
                type="text"
                value={score === null ? "" : score === true ? "1" : score === false ? "0" : String(score)}
                onChange={(e) => {
                  const val = e.target.value.trim().toUpperCase();
                  const newScores = [...editingScores];
                  if (val === "") {
                    newScores[idx] = null;
                  } else if (val === "X") {
                    newScores[idx] = "X" as any;
                  } else {
                    const parsedNum = Number(val);
                    if (!isNaN(parsedNum)) {
                      newScores[idx] = parsedNum;
                    }
                  }
                  setEditingScores(newScores);
                }}
                className="w-full text-center py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white rounded-lg text-sm font-black focus:ring-1 focus:indigo-500"
                maxLength={3}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setEditingLane(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveQuickScore}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all"
          >
            Lưu điểm
          </button>
        </div>
      </div>
    </div>
  );
};
