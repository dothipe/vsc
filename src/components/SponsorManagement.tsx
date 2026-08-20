import React, { useState, useEffect } from "react";
import { MasterSponsor } from "../types";
import { 
  saveVscSystemSponsors, 
  subscribeToVscSystemSponsors 
} from "../lib/firebaseService";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Trophy, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  Globe
} from "lucide-react";
import * as XLSX from "xlsx";

interface SponsorManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function SponsorManagement({ currentUser, userRole }: SponsorManagementProps) {
  const [sponsors, setSponsors] = useState<MasterSponsor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirmSponsor, setDeleteConfirmSponsor] = useState<string | null>(null);
  
  // Modals & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<MasterSponsor>>({});

  const isAdmin = userRole === "system_owner" || userRole === "admin" || currentUser?.email === "nahnatofficial@gmail.com";

  useEffect(() => {
    const unsub = subscribeToVscSystemSponsors((data) => {
      setSponsors(data || []);
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
      id: `spon-${Date.now()}`,
      name: "",
      logoUrl: "",
      websiteUrl: "",
      description: ""
    });
    setShowModal(true);
  };

  const handleStartEdit = (sponsor: MasterSponsor) => {
    setEditingId(sponsor.id);
    setFormFields({ ...sponsor });
    setShowModal(true);
  };

  const handleDelete = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      setDeleteConfirmSponsor(id);
      return;
    }
    try {
      const filtered = sponsors.filter((s) => s.id !== id);
      setSponsors(filtered);
      await saveVscSystemSponsors(filtered);
      showToast("Đã xóa nhà tài trợ thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xóa nhà tài trợ", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.id || !formFields.name) {
      alert("Tên nhà tài trợ là bắt buộc!");
      return;
    }

    try {
      const record: MasterSponsor = {
        id: formFields.id,
        name: formFields.name,
        logoUrl: formFields.logoUrl || "",
        websiteUrl: formFields.websiteUrl || "",
        description: formFields.description || ""
      };

      let updatedList: MasterSponsor[] = [];
      if (!editingId) {
        updatedList = [...sponsors, record];
      } else {
        updatedList = sponsors.map((s) => (s.id === editingId ? record : s));
      }

      setSponsors(updatedList);
      await saveVscSystemSponsors(updatedList);
      setShowModal(false);
      showToast("Lưu thông tin nhà tài trợ thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu thông tin", "error");
    }
  };

  const handleExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(sponsors);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sponsors");
      XLSX.writeFile(workbook, "VSC_System_Sponsors.xlsx");
      showToast(`Đã xuất ${sponsors.length} nhà tài trợ sang Excel!`);
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

        const merged = [...sponsors];
        jsonData.forEach((row: any) => {
          const keyId = String(row.id || `spon-${Date.now()}-${Math.random()}`).trim();
          const item: MasterSponsor = {
            id: keyId,
            name: String(row.name || row["Tên"] || ""),
            logoUrl: String(row.logoUrl || ""),
            websiteUrl: String(row.websiteUrl || ""),
            description: String(row.description || "")
          };
          const idx = merged.findIndex((m) => m.id === keyId);
          if (idx >= 0) merged[idx] = item;
          else merged.push(item);
        });

        setSponsors(merged);
        await saveVscSystemSponsors(merged);
        showToast(`Đã nhập thành công ${jsonData.length} nhà tài trợ từ Excel!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi nhập tệp Excel", "error");
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const filtered = sponsors.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      (s.websiteUrl || "").toLowerCase().includes(q)
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
            <Trophy className="w-6 h-6 text-yellow-500" /> Nhà Tài Trợ Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý thông tin đối tác, thương hiệu và nhà tài trợ đồng hành cùng hệ sinh thái bắn súng VSC.
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
                <Plus className="w-4 h-4" /> Thêm Nhà Tài Trợ
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
              placeholder="Tìm kiếm đối tác nhà tài trợ..."
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
                <th className="p-3.5 pl-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mã Số</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tên Doanh Nghiệp</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Website URL</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mô Tả Đối Tác</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right pr-6">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy nhà tài trợ nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-all">
                    <td className="p-3.5 pl-6 font-mono font-bold text-slate-500 dark:text-slate-400">{item.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} className="w-6 h-6 object-contain rounded border bg-slate-50" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded border bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">VSC</div>
                      )}
                      {item.name}
                    </td>
                    <td className="p-3.5 font-mono">
                      {item.websiteUrl ? (
                        <a 
                          href={item.websiteUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-500 hover:underline flex items-center gap-1 font-bold text-[11px]"
                        >
                          <Globe className="w-3.5 h-3.5" /> Web Link
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{item.description || "Chưa có mô tả"}</td>
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
                              title="Xóa nhà tài trợ"
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
                <Trophy className="w-4 h-4 text-yellow-500" />
                {editingId ? "Cập Nhật Nhà Tài Trợ" : "Thêm Nhà Tài Trợ Mới"}
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
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tên Doanh Nghiệp</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Công ty Cổ phần VSC"
                  value={formFields.name || ""}
                  onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Logo URL (Opt)</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={formFields.logoUrl || ""}
                  onChange={(e) => setFormFields({ ...formFields, logoUrl: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Website URL (Opt)</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={formFields.websiteUrl || ""}
                  onChange={(e) => setFormFields({ ...formFields, websiteUrl: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Mô Tả Tóm Tắt</label>
                <textarea
                  placeholder="Nhập mô tả ngắn về đối tác tài trợ..."
                  value={formFields.description || ""}
                  onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 h-20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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

      {/* MODAL: DELETE SPONSOR CONFIRMATION */}
      {deleteConfirmSponsor && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Xác Nhận Xóa Nhà Tài Trợ</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa đối tác nhà tài trợ này khỏi hệ thống không? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSponsor(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmSponsor;
                  setDeleteConfirmSponsor(null);
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
