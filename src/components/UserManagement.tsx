import React, { useState, useEffect } from "react";
import { MasterUser, MasterAthlete } from "../types";
import { 
  saveVscSystemUsers, 
  saveVscSystemUserSingle,
  deleteVscSystemUser,
  subscribeToVscSystemUsers,
  subscribeToVscSystemAthletes
} from "../lib/firebaseService";
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  User, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  Link
} from "lucide-react";
import * as XLSX from "xlsx";

interface UserManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function UserManagement({ currentUser, userRole }: UserManagementProps) {
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [athletes, setAthletes] = useState<MasterAthlete[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Modals & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<MasterUser>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = userRole === "system_owner" || userRole === "admin" || currentUser?.email === "nahnatofficial@gmail.com";

  useEffect(() => {
    // Subscribe to users
    const unsubUsers = subscribeToVscSystemUsers((data) => {
      setUsers(data || []);
    });

    // Subscribe to athletes to populate linking dropdown
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      const mapped = data.map((ath: any) => ({
        id: ath.id || ath.athleteId,
        vscNumber: ath.vscNumber || ath.idCard || `VSC-${ath.id}`,
        fullName: ath.fullName || ath.name || "",
        province: ath.province || "Hà Nội"
      } as MasterAthlete));
      setAthletes(mapped);
    });

    return () => {
      unsubUsers();
      unsubAthletes();
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setFormFields({
      id: `user-${Date.now()}`,
      displayName: "",
      email: "",
      role: "athlete",
      masterAthleteId: "",
      avatarUrl: ""
    });
    setShowModal(true);
  };

  const handleStartEdit = (user: MasterUser) => {
    setEditingId(user.id);
    setFormFields({ ...user });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const filtered = users.filter((u) => u.id !== id);
      setUsers(filtered);
      await deleteVscSystemUser(id);
      showToast("Đã xóa tài khoản thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xóa tài khoản", "error");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.id || !formFields.email || !formFields.displayName) {
      alert("Họ tên hiển thị và email là bắt buộc!");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const record: MasterUser = {
        id: formFields.id,
        email: formFields.email.trim().toLowerCase(),
        displayName: formFields.displayName,
        role: formFields.role || "athlete",
        avatarUrl: formFields.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        masterAthleteId: formFields.masterAthleteId || "",
        createdAt: formFields.createdAt || timestamp,
        updatedAt: timestamp
      };

      let updatedList: MasterUser[] = [];
      if (!editingId) {
        updatedList = [...users, record];
      } else {
        updatedList = users.map((u) => (u.id === editingId ? record : u));
      }

      setUsers(updatedList);
      await saveVscSystemUserSingle(record);
      setShowModal(false);
      showToast("Lưu tài khoản thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu tài khoản", "error");
    }
  };

  const handleExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(users);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
      XLSX.writeFile(workbook, "VSC_System_Users.xlsx");
      showToast(`Đã xuất ${users.length} tài khoản sang Excel!`);
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

        const merged = [...users];
        jsonData.forEach((row: any) => {
          const keyId = String(row.id || `user-${Date.now()}-${Math.random()}`).trim();
          const item: MasterUser = {
            id: keyId,
            email: String(row.email || "").trim().toLowerCase(),
            displayName: String(row.displayName || row["Họ Tên"] || ""),
            role: (row.role || "athlete") as any,
            avatarUrl: String(row.avatarUrl || ""),
            masterAthleteId: String(row.masterAthleteId || ""),
            createdAt: String(row.createdAt || new Date().toISOString()),
            updatedAt: String(row.updatedAt || new Date().toISOString())
          };
          const idx = merged.findIndex((m) => m.id === keyId);
          if (idx >= 0) merged[idx] = item;
          else merged.push(item);
        });

        setUsers(merged);
        await saveVscSystemUsers(merged);
        showToast(`Đã nhập thành công ${jsonData.length} tài khoản từ Excel!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi nhập tệp Excel", "error");
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const getLinkedAthleteName = (athleteId: string) => {
    if (!athleteId) return "";
    const athlete = athletes.find((a) => a.id === athleteId);
    return athlete ? `${athlete.fullName} (${athlete.vscNumber})` : `Mã VĐV: ${athleteId}`;
  };

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q) ||
      (u.masterAthleteId || "").toLowerCase().includes(q)
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
            <User className="w-6 h-6 text-amber-500" /> Quản Trị Tài Khoản & Phân Quyền
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị phân quyền tài khoản đăng nhập hệ thống, liên kết tài khoản người dùng với hồ sơ vận động viên gốc.
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
                <UserPlus className="w-4 h-4" /> Thêm Tài Khoản
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
              placeholder="Tìm kiếm tài khoản theo tên, email, vai trò..."
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
                <th className="p-3.5 pl-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tên Tài Khoản</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Vai Trò Hệ Thống</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Liên Kết VĐV gốc</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right pr-6">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy tài khoản người dùng nào.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-all">
                    <td className="p-3.5 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <img src={item.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"} className="w-7 h-7 rounded-full border border-slate-200" alt="" />
                      {item.displayName}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{item.email}</td>
                    <td className="p-3.5">
                      <span className={`p-1 px-2 rounded-md font-bold text-[10px] uppercase ${
                        item.role === "super_admin" || item.role === "admin"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                          : item.role === "referee"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                          : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {item.role === "super_admin" ? "Super Admin" : item.role === "admin" ? "Admin" : item.role === "referee" ? "Trọng tài" : "Vận động viên"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {item.masterAthleteId ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <Link className="w-3 h-3 text-emerald-500" />
                          {getLinkedAthleteName(item.masterAthleteId)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa liên kết</span>
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
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                              title="Xóa tài khoản"
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
                <User className="w-4 h-4 text-amber-500" />
                {editingId ? "Cập Nhật Tài Khoản" : "Thêm Tài Khoản Hệ Thống"}
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
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Họ Tên Hiển Thị</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formFields.displayName || ""}
                  onChange={(e) => setFormFields({ ...formFields, displayName: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Email liên hệ/đăng nhập</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formFields.email || ""}
                  onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                  className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Vai trò phân quyền</label>
                  <select
                    value={formFields.role || "athlete"}
                    onChange={(e) => setFormFields({ ...formFields, role: e.target.value as any })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Administrator</option>
                    <option value="referee">Trọng Tài</option>
                    <option value="athlete">Vận Động Viên</option>
                    <option value="viewer">Viewer (Khán giả)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Liên kết VĐV gốc</label>
                  <select
                    value={formFields.masterAthleteId || ""}
                    onChange={(e) => setFormFields({ ...formFields, masterAthleteId: e.target.value })}
                    className="p-2 border.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Không liên kết --</option>
                    {athletes.map((ath, idx) => (
                      <option key={`${ath.id || 'ath'}-${idx}`} value={ath.id}>
                        {ath.fullName} ({ath.vscNumber})
                      </option>
                    ))}
                  </select>
                </div>
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
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4 scale-in">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Xác Nhận Xóa Tài Khoản?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  "{users.find(u => u.id === deleteConfirmId)?.displayName || "người dùng này"}"
                </strong>{" "}
                và thu hồi toàn bộ phân quyền trên hệ thống? Thao tác không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm shadow-rose-600/10"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
