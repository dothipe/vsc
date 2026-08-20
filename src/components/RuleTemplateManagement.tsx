import React, { useState, useEffect } from "react";
import { RuleTemplate } from "../types";
import { 
  saveVscSystemTemplates, 
  subscribeToVscSystemTemplates 
} from "../lib/firebaseService";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Layers, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";

interface RuleTemplateManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function RuleTemplateManagement({ currentUser, userRole }: RuleTemplateManagementProps) {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<string | null>(null);
  
  // Modals & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<RuleTemplate>>({});

  const isAdmin = userRole === "system_owner" || userRole === "admin" || currentUser?.email === "nahnatofficial@gmail.com";

  useEffect(() => {
    const unsub = subscribeToVscSystemTemplates((data) => {
      setTemplates(data || []);
    });
    return unsub;
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setFormFields({
      id: `temp-${Date.now()}`,
      name: "",
      shotsCount: 10,
      teamShotsCount: 10,
      directMaxShots: 10,
      teamDirectMaxShots: 10,
      directMaxPoints: 10,
      teamDirectMaxPoints: 10,
      isDefault: false
    });
    setShowModal(true);
  };

  const handleStartEdit = (template: RuleTemplate) => {
    setEditingId(template.id);
    setFormFields({ ...template });
    setShowModal(true);
  };

  const handleDelete = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      setDeleteConfirmTemplate(id);
      return;
    }
    try {
      const filtered = templates.filter((t) => t.id !== id);
      setTemplates(filtered);
      await saveVscSystemTemplates(filtered);
      showToast("Đã xóa bản mẫu quy chế thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xóa bản mẫu", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.id || !formFields.name) {
      alert("Tên bản mẫu quy chế là bắt buộc!");
      return;
    }

    try {
      const record: RuleTemplate = {
        id: formFields.id,
        name: formFields.name,
        distances: formFields.distances || [],
        teamDistances: formFields.teamDistances || [],
        shotsCount: Number(formFields.shotsCount) || 10,
        teamShotsCount: Number(formFields.teamShotsCount) || 10,
        directMaxShots: Number(formFields.directMaxShots) || 10,
        teamDirectMaxShots: Number(formFields.teamDirectMaxShots) || 10,
        directMaxPoints: Number(formFields.directMaxPoints) || 10,
        teamDirectMaxPoints: Number(formFields.teamDirectMaxPoints) || 10,
        isDefault: !!formFields.isDefault
      };

      // If isDefault is true, un-default other templates
      let updatedList = [...templates];
      if (record.isDefault) {
        updatedList = updatedList.map(t => ({ ...t, isDefault: false }));
      }

      if (!editingId) {
        updatedList = [...updatedList, record];
      } else {
        updatedList = updatedList.map((t) => (t.id === editingId ? record : t));
      }

      setTemplates(updatedList);
      await saveVscSystemTemplates(updatedList);
      setShowModal(false);
      showToast("Lưu bản mẫu quy chế thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu bản mẫu", "error");
    }
  };

  const handleExport = () => {
    try {
      const exportable = templates.map(t => ({
        id: t.id,
        name: t.name,
        shotsCount: t.shotsCount,
        directMaxPoints: t.directMaxPoints,
        isDefault: t.isDefault ? "Có" : "Không"
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportable);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RuleTemplates");
      XLSX.writeFile(workbook, "VSC_System_RuleTemplates.xlsx");
      showToast(`Đã xuất ${templates.length} bản mẫu quy chế sang Excel!`);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xuất dữ liệu", "error");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          alert("Tệp Excel trống!");
          return;
        }

        const merged = [...templates];
        jsonData.forEach((row: any) => {
          const keyId = String(row.id || `temp-${Date.now()}-${Math.random()}`).trim();
          const item: RuleTemplate = {
            id: keyId,
            name: String(row.name || row["Tên"] || ""),
            distances: [],
            teamDistances: [],
            shotsCount: Number(row.shotsCount || 10),
            teamShotsCount: Number(row.teamShotsCount || 10),
            directMaxShots: Number(row.directMaxShots || 10),
            teamDirectMaxShots: Number(row.teamDirectMaxShots || 10),
            directMaxPoints: Number(row.directMaxPoints || row.directMaxShots || 10),
            teamDirectMaxPoints: Number(row.teamDirectMaxPoints || row.teamDirectMaxShots || 10),
            isDefault: row.isDefault === "Có" || row.isDefault === true
          };
          const idx = merged.findIndex((m) => m.id === keyId);
          if (idx >= 0) merged[idx] = item;
          else merged.push(item);
        });

        setTemplates(merged);
        await saveVscSystemTemplates(merged);
        showToast(`Đã nhập thành công ${jsonData.length} bản mẫu từ Excel!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi nhập tệp Excel", "error");
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const filtered = templates.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 transition-all ${
          notification.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/95 dark:border-emerald-800 dark:text-emerald-300"
            : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/95 dark:border-rose-800 dark:text-rose-300"
        }`}>
          {notification.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-500" /> Bản Mẫu Quy Chế Giải Đấu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý và tinh chỉnh các bản mẫu quy chế mặc định (lượt bắn, cự ly, vòng loại) làm nền tảng cho việc khởi tạo các giải đấu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <label className="p-2 px-3 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" /> Nhập Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
              </label>
              
              <button
                type="button"
                onClick={handleExport}
                className="p-2 px-3 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Excel
              </button>

              <button
                type="button"
                onClick={handleStartAdd}
                className="p-2 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Bản Mẫu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Table Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm bản mẫu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <th className="p-3.5 pl-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mã Bản Mẫu</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tên Bản Mẫu Quy Chế</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Lượt Bắn Quy Định</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Điểm Tối Đa</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mặc định</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right pr-6">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy bản mẫu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-all">
                    <td className="p-3.5 pl-6 font-mono font-bold text-slate-500 dark:text-slate-400">{item.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.name}</td>
                    <td className="p-3.5 font-mono">{item.shotsCount} Shots</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.directMaxPoints || 10}</td>
                    <td className="p-3.5">
                      {item.isDefault ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                          <CheckCircle className="w-4 h-4 text-emerald-500" /> Có, Mặc định
                        </span>
                      ) : (
                        <span className="text-slate-400">Không</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                              title="Sửa thông tin"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                              title="Xóa bản mẫu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Đọc dữ liệu</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden scale-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                {editingId ? "Cập Nhật Bản Mẫu" : "Thêm Bản Mẫu Quy Chế Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tên Bản Mẫu Quy Chế</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy chế 10m Standard VSC"
                  value={formFields.name || ""}
                  onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Số phát bắn quy định</label>
                  <input
                    type="number"
                    required
                    value={formFields.shotsCount || 10}
                    onChange={(e) => setFormFields({ ...formFields, shotsCount: Number(e.target.value) })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Số điểm tối đa 1 phát</label>
                  <input
                    type="number"
                    required
                    value={formFields.directMaxPoints || 10}
                    onChange={(e) => setFormFields({ ...formFields, directMaxPoints: Number(e.target.value) })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isDefaultTemplate"
                  checked={!!formFields.isDefault}
                  onChange={(e) => setFormFields({ ...formFields, isDefault: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isDefaultTemplate" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Đặt làm cấu hình mặc định cho các giải đấu mới
                </label>
              </div>

              <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 px-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="p-2 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-all shadow-sm shadow-indigo-600/10 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE TEMPLATE CONFIRMATION */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Xác Nhận Xóa Bản Mẫu Quy Chế</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa bản mẫu quy chế này khỏi hệ thống không? Tất cả các giải đấu đang dùng cấu hình này sẽ không bị ảnh hưởng, nhưng bạn không thể chọn bản mẫu này cho giải đấu mới.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmTemplate;
                  setDeleteConfirmTemplate(null);
                  await handleDelete(id, true);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/10"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
