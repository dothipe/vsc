import React, { useState, useEffect } from "react";
import { MasterReferee } from "../types";
import { 
  saveVscSystemReferees, 
  subscribeToVscSystemReferees 
} from "../lib/firebaseService";
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Shield, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";

interface RefereeManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function RefereeManagement({ currentUser, userRole }: RefereeManagementProps) {
  const [referees, setReferees] = useState<MasterReferee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirmReferee, setDeleteConfirmReferee] = useState<string | null>(null);
  
  // Modals & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<MasterReferee>>({});

  const isAdmin = userRole === "system_owner" || userRole === "admin" || currentUser?.email === "nahnatofficial@gmail.com";

  useEffect(() => {
    const unsub = subscribeToVscSystemReferees((data) => {
      setReferees(data || []);
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
      id: `ref-${Date.now()}`,
      fullName: "",
      licenseLevel: "national",
      badgeNumber: "",
      status: "active"
    });
    setShowModal(true);
  };

  const handleStartEdit = (referee: MasterReferee) => {
    setEditingId(referee.id);
    setFormFields({ ...referee });
    setShowModal(true);
  };

  const handleDelete = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      setDeleteConfirmReferee(id);
      return;
    }
    try {
      const filtered = referees.filter((r) => r.id !== id);
      setReferees(filtered);
      await saveVscSystemReferees(filtered);
      showToast("Đã xóa trọng tài thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xóa trọng tài", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.id || !formFields.fullName) {
      alert("Họ tên trọng tài là bắt buộc!");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const record: MasterReferee = {
        id: formFields.id,
        fullName: formFields.fullName,
        licenseLevel: formFields.licenseLevel || "national",
        badgeNumber: formFields.badgeNumber || "",
        status: formFields.status || "active",
        certifiedAt: formFields.certifiedAt || timestamp
      };

      let updatedList: MasterReferee[] = [];
      if (!editingId) {
        updatedList = [...referees, record];
      } else {
        updatedList = referees.map((r) => (r.id === editingId ? record : r));
      }

      setReferees(updatedList);
      await saveVscSystemReferees(updatedList);
      setShowModal(false);
      showToast("Lưu thông tin trọng tài thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu thông tin", "error");
    }
  };

  const handleExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(referees);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Referees");
      XLSX.writeFile(workbook, "VSC_System_Referees.xlsx");
      showToast(`Đã xuất ${referees.length} trọng tài sang Excel!`);
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

        const merged = [...referees];
        jsonData.forEach((row: any) => {
          const keyId = String(row.id || `ref-${Date.now()}-${Math.random()}`).trim();
          const item: MasterReferee = {
            id: keyId,
            fullName: String(row.fullName || row["Họ Tên"] || ""),
            licenseLevel: String(row.licenseLevel || "national") as any,
            badgeNumber: String(row.badgeNumber || ""),
            status: String(row.status || "active") as any,
            certifiedAt: String(row.certifiedAt || new Date().toISOString())
          };
          const idx = merged.findIndex((m) => m.id === keyId);
          if (idx >= 0) merged[idx] = item;
          else merged.push(item);
        });

        setReferees(merged);
        await saveVscSystemReferees(merged);
        showToast(`Đã nhập thành công ${jsonData.length} trọng tài từ Excel!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi nhập tệp Excel", "error");
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const filtered = referees.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.fullName || "").toLowerCase().includes(q) ||
      (r.badgeNumber || "").toLowerCase().includes(q) ||
      (r.licenseLevel || "").toLowerCase().includes(q)
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
            <Shield className="w-6 h-6 text-indigo-500" /> Ban Trọng Tài Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách, số hiệu thẻ và cấp độ bằng trọng tài quốc gia độc lập.
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
                <UserPlus className="w-4 h-4" /> Thêm Trọng Tài
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
              placeholder="Tìm kiếm trọng tài theo tên, mã thẻ, cấp độ..."
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
                <th className="p-3.5 pl-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mã Hệ Thống</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Họ Tên</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Cấp Độ Bằng</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Số Thẻ (Badge)</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Trạng Thái</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right pr-6">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy trọng tài nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-all">
                    <td className="p-3.5 pl-6 font-mono font-bold text-slate-500 dark:text-slate-400">{item.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.fullName}</td>
                    <td className="p-3.5">
                      <span className={`p-1 px-2 rounded-md font-bold text-[10px] ${
                        item.licenseLevel === "national" 
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                          : item.licenseLevel === "regional"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {item.licenseLevel === "national" ? "Quốc Gia" : item.licenseLevel === "regional" ? "Khu Vực" : "Nội Bộ CLB"}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{item.badgeNumber || "Chưa cấp"}</td>
                    <td className="p-3.5">
                      <span className={`p-1 px-2 rounded-md font-bold text-[10px] ${
                        item.status === "active" 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {item.status === "active" ? "Đang hoạt động" : "Tạm ngưng"}
                      </span>
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
                              title="Xóa trọng tài"
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
                <Shield className="w-4 h-4 text-indigo-500" />
                {editingId ? "Cập Nhật Trọng Tài" : "Thêm Trọng Tài Hệ Thống"}
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
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Họ Tên Trọng Tài</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formFields.fullName || ""}
                  onChange={(e) => setFormFields({ ...formFields, fullName: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cấp Độ Bằng</label>
                  <select
                    value={formFields.licenseLevel || "national"}
                    onChange={(e) => setFormFields({ ...formFields, licenseLevel: e.target.value as any })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="national">National (Quốc gia)</option>
                    <option value="regional">Regional (Khu vực)</option>
                    <option value="club">Club (Nội bộ CLB)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Số Hiệu Badge</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: VSC-REF-10"
                    value={formFields.badgeNumber || ""}
                    onChange={(e) => setFormFields({ ...formFields, badgeNumber: e.target.value })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Trạng Thái</label>
                <select
                  value={formFields.status || "active"}
                  onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Đang hoạt động)</option>
                  <option value="inactive">Inactive (Tạm ngưng)</option>
                </select>
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

      {/* MODAL: DELETE REFEREE CONFIRMATION */}
      {deleteConfirmReferee && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Xác Nhận Xóa Trọng Tài</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa trọng tài này khỏi hệ thống không? Hành động này sẽ loại bỏ hoàn toàn thông tin trọng tài và không thể khôi phục.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmReferee(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmReferee;
                  setDeleteConfirmReferee(null);
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
