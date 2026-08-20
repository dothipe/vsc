import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Search, Edit3, Trash2, ArrowRight } from "lucide-react";
import { Athlete, COMPETITION_CATEGORIES } from "../../types";
import { getCleanBibNumber, getCleanVscNumber } from "../../utils/athleteUtils";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs } from "../../lib/firebaseService";

interface RegistrationStageProps {
  userRole: string;
  deduplicatedAthletes: Athlete[];
  athletes: Athlete[];
  syncAthletesToCloud: (updatedList: Athlete[]) => Promise<void>;
  activeSetterAndCloud: (updatedList: Athlete[]) => Promise<void>;
  handleTransitionTo: (nextStage: any) => void;
  showToast: (type: string, title: string, message: string) => void;
  setEditingAthlete: (athlete: any) => void;
  setEditAthleteFields: (fields: any) => void;
}

export const RegistrationStage: React.FC<RegistrationStageProps> = ({
  userRole,
  deduplicatedAthletes,
  athletes,
  syncAthletesToCloud,
  activeSetterAndCloud,
  handleTransitionTo,
  showToast,
  setEditingAthlete,
  setEditAthleteFields,
}) => {
  // Master athlete & club state for registration
  const [globalMasterAthletes, setGlobalMasterAthletes] = useState<any[]>([]);
  const [globalMasterClubs, setGlobalMasterClubs] = useState<any[]>([]);
  const [addParticipantType, setAddParticipantType] = useState<"master" | "local">("master");
  const [selectedMasterId, setSelectedMasterId] = useState<string>("");
  const [newAthleteName, setNewAthleteName] = useState<string>("");
  const [newAthleteTeam, setNewAthleteTeam] = useState<string>("");
  const [newAthleteVsc, setNewAthleteVsc] = useState<string>("");
  const [newAthleteDob, setNewAthleteDob] = useState<string>("1995-01-01");
  const [newAthleteGender, setNewAthleteGender] = useState<string>("Nam");
  const [newAthleteProvince, setNewAthleteProvince] = useState<string>("Hà Nội");
  const [newAthleteBib, setNewAthleteBib] = useState<string>("");
  const [newAthleteCategory, setNewAthleteCategory] = useState<string>("Amateur");
  const [newAthleteNotes, setNewAthleteNotes] = useState<string>("");
  const [newAthleteMetadata, setNewAthleteMetadata] = useState<string>("");
  const [newAthleteIsPrimary, setNewAthleteIsPrimary] = useState<boolean>(false);
  const [regSearchQuery, setRegSearchQuery] = useState<string>("");
  const [deleteConfirmAthlete, setDeleteConfirmAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      setGlobalMasterAthletes(data || []);
    });
    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setGlobalMasterClubs(data || []);
    });
    return () => {
      unsubAthletes();
      unsubClubs();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn" id="cc-registration-stage">
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-950/5 p-5 rounded-2xl border border-indigo-150/80 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 text-left">
          <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider font-mono">BƯỚC 1: TIẾP NHẬN & GHI DANH VẬN ĐỘNG VIÊN</h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            Hệ thống đang mở cổng tiếp nhận hồ sơ. Bạn có thể ghi danh trực tiếp VĐV từ danh sách hệ thống hoặc thêm VĐV địa phương mới dưới đây.
          </p>
        </div>
        <button
          onClick={() => {
            handleTransitionTo("check_in");
            showToast("info", "Mission Control", "Đã chuyển sang giai đoạn Điểm Danh VĐV");
          }}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          Tiến Sang Điểm Danh (Step 2) <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Ghi Danh nhanh */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block text-left">GHI DANH VĐV MỚI</span>
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
                  setNewAthleteCategory("Amateur");
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
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">Chọn VĐV từ Master Registry *</label>
                  <select
                    value={selectedMasterId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMasterId(val);
                      const found = globalMasterAthletes.find(a => a.id === val);
                      if (found) {
                        setNewAthleteName(found.fullName || found.name || "");
                        setNewAthleteTeam(found.clubName || found.team || "Tự Do");
                        setNewAthleteVsc(found.vscNumber || "");
                        setNewAthleteDob(found.dob || "1995-01-01");
                        setNewAthleteGender(found.gender || "Nam");
                        setNewAthleteProvince(found.province || "Hà Nội");
                        setNewAthleteBib("");
                        setNewAthleteCategory(found.competitionCategory || "Amateur");
                      }
                    }}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Click chọn vận động viên hệ thống --</option>
                    {globalMasterAthletes
                      .filter(ma => !deduplicatedAthletes.some(a => a.vscNumber === ma.vscNumber))
                      .map(ma => (
                        <option key={ma.id} value={ma.id}>
                          {ma.fullName || ma.name} ({ma.vscNumber || "Không số"}) - {ma.clubName || ma.team || "Không CLB"}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Vai trò đội hình</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2.5 py-1.5 rounded-xl text-xs h-[34px] w-full justify-center">
                      <input
                        type="checkbox"
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

              <button
                type="button"
                onClick={async () => {
                  if (!selectedMasterId) {
                    alert("Vui lòng chọn VĐV hệ thống!");
                    return;
                  }
                  const newAthlete: Athlete = {
                    id: `vdv-${Date.now()}`,
                    participantId: `vdv-${Date.now()}`,
                    isMasterAthlete: true,
                    masterAthleteId: selectedMasterId,
                    vscNumber: newAthleteVsc || `VSC-M-${Date.now()}`,
                    bibNumber: "",
                    fullName: newAthleteName.trim(),
                    name: newAthleteName.trim(),
                    dob: newAthleteDob,
                    gender: newAthleteGender,
                    province: newAthleteProvince,
                    clubName: newAthleteTeam || "Tự Do",
                    team: newAthleteTeam || "Tự Do",
                    isPrimaryTeam: newAthleteIsPrimary,
                    competitionCategory: newAthleteCategory || "Amateur",
                    notes: newAthleteNotes.trim(),
                    metadata: newAthleteMetadata.trim(),
                    status: "checked_in",
                    checkInStatus: "checked_in",
                    qualificationStatus: "pending",
                    currentStageIndex: 0,
                    registeredAt: new Date().toISOString(),
                    scores: {}
                  };
                  // Run sync in background and clear inputs instantly
                  showToast("success", "Ghi danh", `Đã ghi danh VĐV hệ thống: ${newAthleteName}`);
                  setSelectedMasterId("");
                  setNewAthleteName("");
                  setNewAthleteTeam("");
                  
                  activeSetterAndCloud([...deduplicatedAthletes, newAthlete]).catch(err => {
                    console.error("Failed to sync system athlete addition:", err);
                    showToast("error", "Lỗi đồng bộ", "Không thể lưu VĐV mới lên đám mây.");
                  });
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Ghi Danh Vào Giải Đấu (Checked-In mặc định)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
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
                    onChange={(e) => setNewAthleteGender(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Vai trò đội hình</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2.5 py-1.5 rounded-xl text-xs h-[34px] w-full justify-center">
                      <input
                        type="checkbox"
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

              <button
                type="button"
                onClick={async () => {
                  if (!newAthleteName.trim()) {
                    alert("Vui lòng cung cấp họ tên vận động viên!");
                    return;
                  }
                  const newAthlete: Athlete = {
                    id: `vdv-${Date.now()}`,
                    participantId: `vdv-${Date.now()}`,
                    isMasterAthlete: false,
                    masterAthleteId: "",
                    vscNumber: newAthleteVsc || `VSC-LOCAL-${Date.now()}`,
                    bibNumber: "",
                    fullName: newAthleteName.trim(),
                    name: newAthleteName.trim(),
                    dob: newAthleteDob,
                    gender: newAthleteGender,
                    province: newAthleteProvince,
                    clubName: newAthleteTeam.trim() || "Tự Do",
                    team: newAthleteTeam.trim() || "Tự Do",
                    isPrimaryTeam: newAthleteIsPrimary,
                    competitionCategory: newAthleteCategory || "Amateur",
                    notes: newAthleteNotes.trim(),
                    metadata: newAthleteMetadata.trim(),
                    status: "checked_in",
                    checkInStatus: "checked_in",
                    qualificationStatus: "pending",
                    currentStageIndex: 0,
                    registeredAt: new Date().toISOString(),
                    scores: {}
                  };
                  // Run sync in background and clear inputs instantly
                  showToast("success", "Thêm mới", `Đã thêm VĐV địa phương: ${newAthleteName}`);
                  setNewAthleteName("");
                  setNewAthleteTeam("");
                  setNewAthleteVsc(`VSC-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`);
                  setNewAthleteBib("");
                  
                  activeSetterAndCloud([...deduplicatedAthletes, newAthlete]).catch(err => {
                    console.error("Failed to sync manual athlete addition:", err);
                    showToast("error", "Lỗi đồng bộ", "Không thể lưu VĐV mới lên đám mây.");
                  });
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Ghi Danh Vào Giải Đấu (Checked-In mặc định)</span>
              </button>
            </div>
          )}
        </div>

        {/* Danh sách đã ghi danh */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Danh Sách VĐV Ghi Danh</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {deduplicatedAthletes.length} VĐV
                </span>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={regSearchQuery}
                  onChange={(e) => setRegSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-medium text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-150 dark:border-slate-800">
                    <th className="px-3 py-2 font-mono">BIB</th>
                    <th className="px-3 py-2 font-mono">VSC ID</th>
                    <th className="px-3 py-2">Họ và Tên</th>
                    <th className="px-3 py-2">Đơn vị / CLB</th>
                    <th className="px-3 py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                  {deduplicatedAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-semibold italic">
                        Chưa có VĐV nào được ghi danh trong giải đấu này.
                      </td>
                    </tr>
                  ) : (() => {
                    const filtered = deduplicatedAthletes.filter(a => {
                      const searchLower = regSearchQuery.toLowerCase();
                      return (
                        a.fullName?.toLowerCase().includes(searchLower) ||
                        a.name?.toLowerCase().includes(searchLower) ||
                        a.clubName?.toLowerCase().includes(searchLower) ||
                        a.team?.toLowerCase().includes(searchLower) ||
                        a.bibNumber?.toLowerCase().includes(searchLower) ||
                        a.vscNumber?.toLowerCase().includes(searchLower)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400 font-semibold">
                            Không tìm thấy VĐV nào khớp từ khóa.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((a, idx) => (
                      <tr key={`${a.id || a.participantId || 'ath'}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-450">{getCleanBibNumber(a.bibNumber, a.id)}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-indigo-650 dark:text-indigo-400">{getCleanVscNumber(a.vscNumber || a.idCard, a.id)}</td>
                        <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-white text-left">
                          {a.fullName || a.name}
                          {a.isMasterAthlete && (
                            <span className="ml-1 text-[8px] bg-indigo-50 text-indigo-650 px-1.5 py-0.2 rounded uppercase font-black tracking-wide">Sys</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-550 dark:text-slate-400 font-medium text-left">{a.clubName || a.team || "Tự Do"}</td>
                        <td className="px-3 py-2.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAthlete(a);
                              setEditAthleteFields({
                                id: a.id || a.participantId,
                                participantId: a.participantId || a.id,
                                fullName: a.fullName || a.name || "",
                                bibNumber: a.bibNumber || "",
                                vscNumber: a.vscNumber || "",
                                dob: a.dob || "",
                                gender: a.gender || "Nam",
                                province: a.province || "",
                                clubName: a.clubName || a.team || "",
                                competitionCategory: a.competitionCategory || "Amateur",
                                notes: a.notes || "",
                                isPrimaryTeam: a.isPrimaryTeam || false,
                                status: a.status || "registered",
                                metadata: a.metadata || "",
                              });
                            }}
                            className="p-1.5 bg-indigo-50 text-indigo-650 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa thông tin VĐV"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmAthlete(a)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                            title="Hủy Ghi Danh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: DELETE ATHLETE CONFIRMATION (VIEWPORT CENTERED) */}
      {deleteConfirmAthlete && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4 my-auto">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Xác Nhận Hủy Ghi Danh?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn hủy ghi danh VĐV{" "}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  "{deleteConfirmAthlete.fullName || deleteConfirmAthlete.name}"
                </strong>{" "}
                khỏi giải đấu? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAthlete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteConfirmAthlete.id || deleteConfirmAthlete.participantId;
                  const updatedAthletes = athletes.filter(athlete => (athlete.id !== targetId && athlete.participantId !== targetId));
                  
                  // Close the modal and show toast instantly for ultra-responsive UI
                  setDeleteConfirmAthlete(null);
                  showToast("info", "Hủy ghi danh", `Đã hủy ghi danh: ${deleteConfirmAthlete.fullName || deleteConfirmAthlete.name}`);
                  
                  syncAthletesToCloud(updatedAthletes).catch(err => {
                    console.error("Failed to sync athlete deletion:", err);
                    showToast("error", "Lỗi đồng bộ", "Không thể lưu thay đổi xóa lên đám mây.");
                  });
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm shadow-rose-600/10"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
