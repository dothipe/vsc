import React from "react";
import { Users, Shield, Sparkles, Plus, QrCode, Edit3, Trash2 } from "lucide-react";
import { getCleanBibNumber, getCleanVscNumber } from "../../utils/athleteUtils";
import { AVATAR_MALE, AVATAR_FEMALE } from "../AthleteRegistry";
import { COMPETITION_CATEGORIES } from "../../types";

interface ParticipantsTabProps {
  status: string;
  isParticipantListUnlockedManually: boolean;
  setIsParticipantListUnlockedManually: (val: boolean) => void;
  role: string;
  canUpdate: boolean;
  addParticipantType: "master" | "local";
  setAddParticipantType: (val: "master" | "local") => void;
  selectedMasterId: string;
  setSelectedMasterId: (val: string) => void;
  newAthleteName: string;
  setNewAthleteName: (val: string) => void;
  newAthleteTeam: string;
  setNewAthleteTeam: (val: string) => void;
  newAthleteIsPrimary: boolean;
  setNewAthleteIsPrimary: (val: boolean) => void;
  newAthleteVsc: string;
  setNewAthleteVsc: (val: string) => void;
  newAthleteDob: string;
  setNewAthleteDob: (val: string) => void;
  newAthleteGender: "Nam" | "Nữ" | "Khác";
  setNewAthleteGender: (val: "Nam" | "Nữ" | "Khác") => void;
  newAthleteProvince: string;
  setNewAthleteProvince: (val: string) => void;
  newAthleteBib: string;
  setNewAthleteBib: (val: string) => void;
  newAthleteCategory: string;
  setNewAthleteCategory: (val: string) => void;
  newAthleteNotes: string;
  setNewAthleteNotes: (val: string) => void;
  newAthleteMetadata: string;
  setNewAthleteMetadata: (val: string) => void;
  globalMasterAthletes: any[];
  athletesList: any[];
  setAthletesList: (val: any[]) => void;
  registrationFee: number;
  setEditingParticipant: (val: any) => void;
  setDeleteConfirmAthleteTournament: (val: any) => void;
  setActivePaymentVdv: (val: any) => void;
  setPaymentSimulationStep: (val: string) => void;
  getStatusLabel: (status: string) => string;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  status,
  isParticipantListUnlockedManually,
  setIsParticipantListUnlockedManually,
  role,
  canUpdate,
  addParticipantType,
  setAddParticipantType,
  selectedMasterId,
  setSelectedMasterId,
  newAthleteName,
  setNewAthleteName,
  newAthleteTeam,
  setNewAthleteTeam,
  newAthleteIsPrimary,
  setNewAthleteIsPrimary,
  newAthleteVsc,
  setNewAthleteVsc,
  newAthleteDob,
  setNewAthleteDob,
  newAthleteGender,
  setNewAthleteGender,
  newAthleteProvince,
  setNewAthleteProvince,
  newAthleteBib,
  setNewAthleteBib,
  newAthleteCategory,
  setNewAthleteCategory,
  newAthleteNotes,
  setNewAthleteNotes,
  newAthleteMetadata,
  setNewAthleteMetadata,
  globalMasterAthletes,
  athletesList,
  setAthletesList,
  registrationFee,
  setEditingParticipant,
  setDeleteConfirmAthleteTournament,
  setActivePaymentVdv,
  setPaymentSimulationStep,
  getStatusLabel,
}) => {
  const isListFrozen = (status === "live" || status === "completed" || status === "archived") && !isParticipantListUnlockedManually;
  const isAdmin = role === "system_owner" || role === "tournament_director";

  const [tabSearchQuery, setTabSearchQuery] = React.useState("");
  const [tabCategoryFilter, setTabCategoryFilter] = React.useState("All");

  const filteredAthletes = React.useMemo(() => {
    return athletesList.filter(vdv => {
      // Search filter
      const searchLower = tabSearchQuery.toLowerCase();
      const matchSearch = 
        !tabSearchQuery ||
        (vdv.name || vdv.fullName || "").toLowerCase().includes(searchLower) ||
        (vdv.bibNumber || "").toLowerCase().includes(searchLower) ||
        (vdv.vscNumber || "").toLowerCase().includes(searchLower) ||
        (vdv.clubName || vdv.team || "").toLowerCase().includes(searchLower);

      // Category filter
      const cat = vdv.competitionCategory || "Amateur";
      const matchCategory = tabCategoryFilter === "All" || cat === tabCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [athletesList, tabSearchQuery, tabCategoryFilter]);

  const resolveAthleteAvatar = (vdv: any) => {
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    if (!avatarUrl && vdv.isMasterAthlete && vdv.masterAthleteId) {
      const found = globalMasterAthletes.find((a) => a.id === vdv.masterAthleteId);
      if (found) {
        avatarUrl = found.avatarUrl || found.avatar || null;
      }
    }
    
    if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("local-avatar:")) {
      const id = avatarUrl.split(":")[1] || vdv.id || vdv.participantId || vdv.masterAthleteId;
      try {
        const stored = localStorage.getItem(`vsc-avatar-${id}`);
        if (stored) return stored;
      } catch (e) {
        console.warn("Failed to get local avatar in ParticipantsTab", e);
      }
      return vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Participants (Vận Động Viên Đăng Ký)</span>
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Danh sách VĐV đăng ký tham gia thi đấu thực tế trong giải đấu này.
          </p>
        </div>
      </div>

      {/* Freeze Status Banner */}
      {(status === "live" || status === "completed" || status === "archived") && (
        <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isListFrozen 
            ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50" 
            : "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50"
        }`}>
          <div className="flex items-center gap-3">
            {isListFrozen ? (
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase">
                {isListFrozen ? "Danh sách vận động viên đã khóa (Giải Đấu Đang Live)" : "Danh sách mở khóa tạm thời bởi Admin"}
              </span>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">
                {isListFrozen 
                  ? `Giải đấu đang ở trạng thái ${getStatusLabel(status).toUpperCase()}. Mọi hành động ghi danh, xóa, hoặc đổi hạng mục đều bị khóa.` 
                  : "Bạn đang ghi đè hệ thống để hiệu chỉnh vận động viên trực tiếp trong thời gian thực."}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsParticipantListUnlockedManually(!isParticipantListUnlockedManually)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                isListFrozen 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {isListFrozen ? "Mở Khóa (Ghi Đè Admin)" : "Tái Thiết Lập Khóa"}
            </button>
          )}
        </div>
      )}

      {/* Registration Section (Only visible if list is not frozen) */}
      {canUpdate && !isListFrozen && (
        <div className="bg-slate-50 dark:bg-slate-850/50 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Ghi Danh VĐV Mới</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddParticipantType("master");
                  setSelectedMasterId("");
                  setNewAthleteName("");
                  setNewAthleteTeam("");
                  setNewAthleteIsPrimary(false);
                }}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                  addParticipantType === "master"
                    ? "bg-indigo-650 text-white shadow-xs"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
                }`}
              >
                VĐV Hệ Thống (Master)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddParticipantType("local");
                  setSelectedMasterId("");
                  setNewAthleteName("");
                  setNewAthleteTeam("");
                  setNewAthleteVsc(`VSC-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`);
                  setNewAthleteDob("1995-01-01");
                  setNewAthleteGender("Nam");
                  setNewAthleteProvince("Hà Nội");
                  setNewAthleteBib("");
                  setNewAthleteCategory("");
                  setNewAthleteNotes("");
                  setNewAthleteMetadata("");
                  setNewAthleteIsPrimary(false);
                }}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                  addParticipantType === "local"
                    ? "bg-indigo-650 text-white shadow-xs"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
                }`}
              >
                VĐV Địa Phương (Local)
              </button>
            </div>
          </div>

          {addParticipantType === "master" ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500">Chọn VĐV từ Master Registry *</label>
                <select
                  value={selectedMasterId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setSelectedMasterId(selectedId);
                    const found = globalMasterAthletes.find(a => a.id === selectedId);
                    if (found) {
                      setNewAthleteName(found.fullName || found.name);
                      setNewAthleteTeam(found.clubName || found.clubId || "");
                      setNewAthleteVsc(found.vscNumber || "");
                      setNewAthleteDob(found.dob || "");
                      setNewAthleteGender(found.gender || "Nam");
                      setNewAthleteProvince(found.province || "");
                      setNewAthleteBib(found.bibNumber || "");
                    }
                  }}
                  className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Click chọn vận động viên hệ thống --</option>
                  {globalMasterAthletes
                    .filter(ma => !athletesList.some(al => al.vscNumber === ma.vscNumber))
                    .map(ma => (
                      <option key={ma.id} value={ma.id}>
                        {ma.fullName} ({ma.vscNumber || "Không số"}) - {ma.clubName || "Không CLB"}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Vai trò đội hình</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2.5 py-1.5 rounded-xl text-xs h-[34px] w-full justify-center">
                    <input
                      type="checkbox"
                      id="master-primary-checkbox"
                      checked={newAthleteIsPrimary}
                      onChange={(e) => setNewAthleteIsPrimary(e.target.checked)}
                      className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350 whitespace-nowrap">Thành viên Bắn Chính (Tính điểm đồng đội)</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Phân khúc thi đấu</label>
                <select
                  value={newAthleteCategory}
                  onChange={(e) => setNewAthleteCategory(e.target.value)}
                  className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {COMPETITION_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Họ và Tên VĐV *</label>
                  <input
                    type="text"
                    value={newAthleteName}
                    onChange={(e) => setNewAthleteName(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-650"
                    placeholder="Nhập tên đầy đủ"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Mã Số VSC (Cấp tự động hoặc nhập)</label>
                  <input
                    type="text"
                    value={newAthleteVsc}
                    onChange={(e) => setNewAthleteVsc(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Đoàn / Đội / Câu Lạc Bộ</label>
                  <input
                    type="text"
                    value={newAthleteTeam}
                    onChange={(e) => setNewAthleteTeam(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                    placeholder="Nhập CLB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Ngày sinh (DOB)</label>
                  <input
                    type="date"
                    value={newAthleteDob}
                    onChange={(e) => setNewAthleteDob(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Giới tính</label>
                  <select
                    value={newAthleteGender}
                    onChange={(e) => setNewAthleteGender(e.target.value as any)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Tỉnh thành</label>
                  <input
                    type="text"
                    value={newAthleteProvince}
                    onChange={(e) => setNewAthleteProvince(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Vai trò đội hình</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2.5 py-1.5 rounded-xl text-xs h-[34px] w-full justify-center">
                      <input
                        type="checkbox"
                        id="local-primary-checkbox"
                        checked={newAthleteIsPrimary}
                        onChange={(e) => setNewAthleteIsPrimary(e.target.checked)}
                        className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350 whitespace-nowrap">Thành viên Bắn Chính (Tính điểm đồng đội)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Phân khúc thi đấu (Category)</label>
                  <select
                    value={newAthleteCategory}
                    onChange={(e) => setNewAthleteCategory(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {COMPETITION_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Ghi chú & metadata</label>
                  <input
                    type="text"
                    value={newAthleteNotes}
                    onChange={(e) => setNewAthleteNotes(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                    placeholder="Thông số bổ sung"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (!newAthleteName.trim()) {
                  alert("Vui lòng cung cấp họ tên vận động viên!");
                  return;
                }
                const finalBib = newAthleteBib.trim() || "";
                const finalVsc = newAthleteVsc.trim() || `VSC-${athletesList.length + 101}`;
                const found = addParticipantType === "master" ? globalMasterAthletes.find(a => a.id === selectedMasterId) : null;
                
                const newVdv: any = {
                  id: `vdv-${Date.now()}`,
                  participantId: `vdv-${Date.now()}`,
                  isMasterAthlete: addParticipantType === "master",
                  masterAthleteId: addParticipantType === "master" ? selectedMasterId : "",
                  vscNumber: finalVsc,
                  bibNumber: "",
                  fullName: newAthleteName.trim(),
                  name: newAthleteName.trim(),
                  dob: newAthleteDob || "",
                  gender: newAthleteGender || "Nam",
                  province: newAthleteProvince || "",
                  clubName: newAthleteTeam.trim() || "Tự Do",
                  team: newAthleteTeam.trim() || "Tự Do",
                  isPrimaryTeam: newAthleteIsPrimary,
                  competitionCategory: newAthleteCategory.trim() || "Amateur",
                  notes: newAthleteNotes.trim(),
                  metadata: newAthleteMetadata.trim(),
                  status: "registered",
                  checkInStatus: "pending",
                  qualificationStatus: "pending",
                  currentStageIndex: 0,
                  registeredAt: new Date().toISOString(),
                  avatarUrl: found ? (found.avatarUrl || found.avatar || "") : "",
                  scores: {}
                };

                setAthletesList([...athletesList, newVdv]);
                
                // Reset states
                setSelectedMasterId("");
                setNewAthleteName("");
                setNewAthleteTeam("");
                setNewAthleteVsc("");
                setNewAthleteDob("");
                setNewAthleteBib("");
                setNewAthleteCategory("");
                setNewAthleteNotes("");
                setNewAthleteMetadata("");
                setNewAthleteIsPrimary(false);
              }}
              className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Ghi Danh Vào Giải Đấu (Checked-In mặc định)
            </button>
          </div>
        </div>
      )}

      {/* Participants List Table */}
      <div className="border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        
        {/* Search and Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/30 p-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <input
              type="text"
              value={tabSearchQuery}
              onChange={(e) => setTabSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, BIB, mã VSC..."
              className="w-full sm:max-w-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Hạng Mục:</span>
            <select
              value={tabCategoryFilter}
              onChange={(e) => setTabCategoryFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            >
              <option value="All">Tất Cả</option>
              {COMPETITION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3">Mã VSC / BIB</th>
              <th className="px-4 py-3">Họ và Tên</th>
              <th className="px-4 py-3">Hồ Sơ</th>
              <th className="px-4 py-3">Đơn vị / CLB</th>
              <th className="px-4 py-3">Hạng Mục</th>
              <th className="px-4 py-3">Điểm danh</th>
              <th className="px-4 py-3">Lệ phí</th>
              <th className="px-4 py-3 text-center w-24">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
            {athletesList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold">
                  Chưa có vận động viên nào ghi danh. Hãy chọn từ Master Data hoặc đăng ký ở form trên!
                </td>
              </tr>
            ) : filteredAthletes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold">
                  Không tìm thấy vận động viên nào khớp với điều kiện lọc.
                </td>
              </tr>
            ) : (
              filteredAthletes.map((vdv, idx) => (
                <tr key={`${vdv.id || vdv.participantId || 'vdv'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          {getCleanBibNumber(vdv.bibNumber, vdv.id)}
                        </span>
                        {vdv.isPrimaryTeam ? (
                          <span className="inline-block text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-450 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded tracking-wide">
                            ★ Bắn Chính
                          </span>
                        ) : (
                          <span className="inline-block text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded tracking-wide">
                            Dự Bị
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">VSC: {getCleanVscNumber(vdv.vscNumber, vdv.id)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={resolveAthleteAvatar(vdv)} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {vdv.fullName || vdv.name}
                        </div>
                        <div className="text-[10px] text-slate-450">{vdv.province || "Chưa rõ tỉnh thành"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                      vdv.isMasterAthlete 
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                        : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                    }`}>
                      {vdv.isMasterAthlete ? "Master" : "Local"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-650 dark:text-slate-300">
                    {vdv.clubName || vdv.team || "Tự Do"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                    {vdv.competitionCategory || "Amateur"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      vdv.status === "checked_in"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {vdv.status === "checked_in" ? "✓ Checked In" : "Mới Đăng Ký"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {registrationFee && registrationFee > 0 ? (
                      vdv.paymentStatus === "paid" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/60 font-mono">
                            ✓ Đã đóng
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(v => {
                                if (v.id === vdv.id || (v.participantId && vdv.participantId && v.participantId === vdv.participantId)) {
                                  return { ...v, paymentStatus: "pending" };
                                }
                                return v;
                              });
                              setAthletesList(updated);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-450 dark:hover:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900/50 flex items-center gap-0.5 font-bold text-[9px] cursor-pointer"
                            title="Đánh dấu Chưa đóng lệ phí"
                          >
                            Chưa đóng
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-450 border border-amber-200/50 dark:border-amber-900/40 font-mono">
                            Chưa đóng
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = athletesList.map(v => {
                                if (v.id === vdv.id || (v.participantId && vdv.participantId && v.participantId === vdv.participantId)) {
                                  return { ...v, paymentStatus: "paid" };
                                }
                                return v;
                              });
                              setAthletesList(updated);
                            }}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-450 dark:hover:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-0.5 font-bold text-[9px] cursor-pointer"
                            title="Xác nhận Đã đóng lệ phí"
                          >
                            Đã đóng
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePaymentVdv(vdv);
                              setPaymentSimulationStep("ready");
                            }}
                            className="p-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-0.5 font-bold text-[9px] cursor-pointer"
                            title="Hiển thị QR Thanh Toán"
                          >
                            <QrCode className="w-3 h-3" /> QR
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">Miễn phí</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingParticipant(vdv)}
                        className="text-indigo-600 hover:text-indigo-700 p-1 cursor-pointer bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                        title="Chỉnh sửa chi tiết"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {canUpdate && !isListFrozen && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmAthleteTournament(vdv)}
                          className="text-rose-600 hover:text-rose-700 cursor-pointer p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                          title="Xóa VĐV"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
  );
};
