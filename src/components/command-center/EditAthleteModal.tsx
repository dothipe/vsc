import React from "react";
import { createPortal } from "react-dom";
import { Edit3, X } from "lucide-react";
import { Athlete, COMPETITION_CATEGORIES } from "../../types";

interface EditAthleteFields {
  id: string;
  participantId?: string;
  fullName: string;
  bibNumber: string;
  vscNumber: string;
  dob: string;
  gender: string;
  province: string;
  clubName: string;
  competitionCategory: string;
  notes: string;
  isPrimaryTeam?: boolean;
  status?: string;
  metadata?: string;
}

interface EditAthleteModalProps {
  editingAthlete: any;
  editAthleteFields: EditAthleteFields | null;
  setEditingAthlete: (val: any) => void;
  setEditAthleteFields: (val: EditAthleteFields | null) => void;
  activeAthletesList: Athlete[];
  activeSetterAndCloud: (updatedList: Athlete[]) => Promise<void>;
  showToast: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
}

export const EditAthleteModal: React.FC<EditAthleteModalProps> = ({
  editingAthlete,
  editAthleteFields,
  setEditingAthlete,
  setEditAthleteFields,
  activeAthletesList,
  activeSetterAndCloud,
  showToast,
}) => {
  if (!editingAthlete || !editAthleteFields) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xl w-full relative max-h-[90vh] flex flex-col my-auto overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setEditingAthlete(null);
            setEditAthleteFields(null);
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-left">
          <Edit3 className="w-5 h-5 text-indigo-650" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Cập Nhật Thông Tin Vận Động Viên</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên VĐV *</label>
              <input
                type="text"
                value={editAthleteFields.fullName}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, fullName: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Số BIB (Báo danh)</label>
              <input
                type="text"
                value={editAthleteFields.bibNumber}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, bibNumber: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. BIB-101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Số thẻ VSC (Hội viên)</label>
              <input
                type="text"
                value={editAthleteFields.vscNumber}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, vscNumber: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. VSC-1234"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Ngày sinh (DOB)</label>
              <input
                type="date"
                value={editAthleteFields.dob}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, dob: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Giới tính</label>
              <select
                value={editAthleteFields.gender}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, gender: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tỉnh Thành</label>
              <input
                type="text"
                value={editAthleteFields.province}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, province: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Hà Nội"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Câu Lạc Bộ (CLB)</label>
              <input
                type="text"
                value={editAthleteFields.clubName}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, clubName: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. CLB Hà Nội"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hạng Mục Thi Đấu</label>
              <select
                value={editAthleteFields.competitionCategory}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, competitionCategory: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                {COMPETITION_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng Thái Điểm Danh VĐV</label>
              <select
                value={editAthleteFields.status || "registered"}
                onChange={(e) => setEditAthleteFields({ ...editAthleteFields, status: e.target.value })}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="registered">Chờ Báo Danh (Registered)</option>
                <option value="checked_in">✓ Đã Điểm Danh (Checked In)</option>
                <option value="dns">⚠ DNS (Vắng Mặt)</option>
                <option value="withdrawn">✘ Rút Lui (Withdrawn)</option>
                <option value="dq">✖ Bị Loại (DQ / Disqualified)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 rounded-xl text-xs font-bold">
                <input
                  type="checkbox"
                  checked={editAthleteFields.isPrimaryTeam || false}
                  onChange={(e) => setEditAthleteFields({ ...editAthleteFields, isPrimaryTeam: e.target.checked })}
                  className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-950 dark:text-white">Thành viên Bắn Chính</span>
                  <span className="text-[9px] text-slate-400 font-normal">Tính điểm đồng đội</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú vận động viên</label>
            <textarea
              value={editAthleteFields.notes}
              onChange={(e) => setEditAthleteFields({ ...editAthleteFields, notes: e.target.value })}
              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
              placeholder="Ghi chú về VĐV..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Siêu Dữ Liệu Tùy Biến (JSON Metadata)</label>
            <textarea
              value={editAthleteFields.metadata || ""}
              onChange={(e) => setEditAthleteFields({ ...editAthleteFields, metadata: e.target.value })}
              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
              placeholder='{"weight": 70, "equipment": "custom slingshot"}'
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setEditingAthlete(null);
              setEditAthleteFields(null);
            }}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!editAthleteFields.fullName.trim()) {
                alert("Vui lòng nhập họ tên vận động viên!");
                return;
              }
              
              const enteredBib = editAthleteFields.bibNumber.trim();
              if (enteredBib !== "") {
                const isBibDup = activeAthletesList.some(
                  a => a.bibNumber === enteredBib && (a.id !== editAthleteFields.id && a.participantId !== editAthleteFields.participantId)
                );
                if (isBibDup) {
                  alert(`⚠️ Mã số BIB ${enteredBib} đã tồn tại trong giải đấu này!`);
                  return;
                }
              }

              const updatedList = activeAthletesList.map(a => {
                const matchId = a.id || a.participantId;
                if (matchId === editAthleteFields.id || matchId === editAthleteFields.participantId) {
                  return {
                    ...a,
                    vscNumber: editAthleteFields.vscNumber,
                    bibNumber: enteredBib,
                    idCard: enteredBib || a.idCard,
                    fullName: editAthleteFields.fullName.trim(),
                    name: editAthleteFields.fullName.trim(),
                    dob: editAthleteFields.dob,
                    gender: editAthleteFields.gender,
                    province: editAthleteFields.province,
                    clubName: editAthleteFields.clubName,
                    team: editAthleteFields.clubName,
                    competitionCategory: editAthleteFields.competitionCategory,
                    notes: editAthleteFields.notes,
                    isPrimaryTeam: editAthleteFields.isPrimaryTeam ?? false,
                    status: editAthleteFields.status,
                    metadata: editAthleteFields.metadata,
                    checkInStatus: editAthleteFields.status === "checked_in" ? "checked_in" : "pending"
                  };
                }
                return a;
              });

              // Close the modal and show toast instantly for ultra-responsive UI
              const listToSync = [...updatedList];
              setEditingAthlete(null);
              setEditAthleteFields(null);
              showToast("success", "Cập nhật", `Đã lưu thay đổi cho VĐV: ${editAthleteFields.fullName}`);
              activeSetterAndCloud(listToSync).catch(err => {
                console.error("Failed to sync athlete changes:", err);
                showToast("error", "Lỗi đồng bộ", "Không thể lưu thay đổi lên đám mây.");
              });
            }}
            className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
