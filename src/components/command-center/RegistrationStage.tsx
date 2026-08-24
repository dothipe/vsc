import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, QrCode, CheckCircle, RefreshCw, Wifi, Zap, X, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Athlete, COMPETITION_CATEGORIES } from "../../types";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs } from "../../lib/firebaseService";
import { ParticipantsTab } from "../tournament-management/ParticipantsTab";

interface RegistrationStageProps {
  userRole: string;
  deduplicatedAthletes: Athlete[];
  athletes: Athlete[];
  syncAthletesToCloud: (updatedList: Athlete[]) => Promise<void>;
  activeSetterAndCloud: (updatedList: Athlete[], isDeletion?: boolean) => Promise<void>;
  handleTransitionTo: (nextStage: any) => void;
  showToast: (type: string, title: string, message: string) => void;
  setEditingAthlete: (athlete: any) => void;
  setEditAthleteFields: (fields: any) => void;
  currentTournamentDoc?: any;
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
  currentTournamentDoc,
}) => {
  // Master athlete & club state for registration
  const [globalMasterAthletes, setGlobalMasterAthletes] = useState<any[]>([]);
  const [globalMasterClubs, setGlobalMasterClubs] = useState<any[]>([]);
  
  const [isParticipantListUnlockedManually, setIsParticipantListUnlockedManually] = useState(false);
  const [deleteConfirmAthleteTournament, setDeleteConfirmAthleteTournament] = useState<any | null>(null);
  const [addParticipantType, setAddParticipantType] = useState<"master" | "local">("master");
  const [selectedMasterId, setSelectedMasterId] = useState<string>("");
  const [newAthleteName, setNewAthleteName] = useState<string>("");
  const [newAthleteTeam, setNewAthleteTeam] = useState<string>("");
  const [newAthleteVsc, setNewAthleteVsc] = useState<string>("");
  const [newAthleteDob, setNewAthleteDob] = useState<string>("1995-01-01");
  const [newAthleteGender, setNewAthleteGender] = useState<"Nam" | "Nữ" | "Khác">("Nam");
  const [newAthleteProvince, setNewAthleteProvince] = useState<string>("Hà Nội");
  const [newAthleteBib, setNewAthleteBib] = useState<string>("");
  const [newAthleteCategory, setNewAthleteCategory] = useState<string>("Amateur");
  const [newAthleteNotes, setNewAthleteNotes] = useState<string>("");
  const [newAthleteMetadata, setNewAthleteMetadata] = useState<string>("");
  const [newAthleteIsPrimary, setNewAthleteIsPrimary] = useState<boolean>(false);

  // PayOS & VietQR state
  const [activePaymentVdv, setActivePaymentVdv] = useState<any | null>(null);
  const [paymentSimulationStep, setPaymentSimulationStep] = useState<string>("ready");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);

  // Resolved Bank fields from tournament document
  const bankName = currentTournamentDoc?.bankName || "MB Bank";
  const bankAccountNumber = currentTournamentDoc?.bankAccountNumber || "0904000300";
  const bankAccountName = currentTournamentDoc?.bankAccountName || "VSCS";
  const registrationFee = currentTournamentDoc?.registrationFee || 200000;

  // Subscribe to system master lists
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

  // Sync / Set wrapper for ParticipantsTab that keeps athletes & teamAthletes synchronized
  const handleSetAthletesList = useCallback(async (updatedList: any[]) => {
    // Determine if an athlete was deleted
    const isDeletion = updatedList.length < deduplicatedAthletes.length;
    
    if (isDeletion) {
      const updatedIds = new Set(updatedList.map(a => a.id || a.participantId));
      const deletedItem = deduplicatedAthletes.find(a => !updatedIds.has(a.id || a.participantId));
      if (deletedItem) {
        const deleteId = deletedItem.id || deletedItem.participantId;
        
        // Clean both individual and team lists
        const cleanAthletes = athletes.filter(a => a.id !== deleteId && a.participantId !== deleteId);
        
        // Update both cloud lists to prevent the deleted athlete from reappearing (passing isDeletion=true)
        if (activeSetterAndCloud) {
          await activeSetterAndCloud(cleanAthletes, true);
        } else {
          await syncAthletesToCloud(cleanAthletes);
        }
        
        showToast("info", "Hủy ghi danh", `Đã hủy ghi danh VĐV: ${deletedItem.fullName || deletedItem.name}`);
      }
    } else {
      // Add or Edit action
      await activeSetterAndCloud(updatedList);
    }
  }, [deduplicatedAthletes, athletes, syncAthletesToCloud, activeSetterAndCloud, showToast]);

  // Map to CommandCenter editing modal
  const handleSetEditingParticipant = useCallback((vdv: any) => {
    setEditingAthlete(vdv);
    setEditAthleteFields({
      id: vdv.id || vdv.participantId,
      participantId: vdv.participantId || vdv.id,
      fullName: vdv.fullName || vdv.name || "",
      bibNumber: vdv.bibNumber || "",
      vscNumber: vdv.vscNumber || "",
      dob: vdv.dob || "",
      gender: vdv.gender || "Nam",
      province: vdv.province || "",
      clubName: vdv.clubName || vdv.team || "",
      competitionCategory: vdv.competitionCategory || "Amateur",
      notes: vdv.notes || "",
      isPrimaryTeam: vdv.isPrimaryTeam || false,
      status: vdv.status || "registered",
      metadata: vdv.metadata || "",
    });
  }, [setEditingAthlete, setEditAthleteFields]);

  // Wrapper for Deletion Confirmation Modal
  const handleSetDeleteConfirmAthleteTournament = useCallback((vdv: any) => {
    setDeleteConfirmAthleteTournament(vdv);
  }, []);

  // Dynamic payment description for activePaymentVdv
  const activePaymentInfo = useMemo(() => {
    if (!activePaymentVdv) return "";
    const athleteVscId = (activePaymentVdv.vscNumber || activePaymentVdv.id || "VSC-TEMP").trim().toUpperCase();
    const tourId = (currentTournamentDoc?.id || "TEMP_TOUR").trim().toUpperCase();
    return `${athleteVscId} REG ${tourId}`.trim().toUpperCase();
  }, [activePaymentVdv, currentTournamentDoc?.id]);

  // Simulate payment completion and update check-in + payment status
  const handleSimulatePaymentSuccess = async (vdv: any) => {
    setIsSimulatingPayment(true);
    setPaymentSimulationStep("scanning");
    
    // Simulate connection steps
    await new Promise(resolve => setTimeout(resolve, 800));
    setPaymentSimulationStep("verifying");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update state
    const updatedAthletes = deduplicatedAthletes.map(a => {
      if (a.id === vdv.id || (a.participantId && vdv.participantId && a.participantId === vdv.participantId)) {
        return { 
          ...a, 
          paymentStatus: "paid", 
          status: "checked_in", 
          checkInStatus: "checked_in",
          paidAt: new Date().toISOString(),
          paymentAmount: registrationFee,
          paymentMethod: "VietQR-PayOS"
        };
      }
      return a;
    });
    
    await activeSetterAndCloud(updatedAthletes);
    setPaymentSimulationStep("success");
    setIsSimulatingPayment(false);
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "draft": return "Bản Nháp (Draft)";
      case "registration": return "Mở Đăng Ký (Registration)";
      case "ready": return "Sẵn Sàng (Ready)";
      case "live": return "Trực Tiếp (Live scoring)";
      case "completed": return "Hoàn Thành (Completed)";
      case "archived": return "Lưu Trữ (Archived)";
      default: return s;
    }
  };

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

      <div className="bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xs">
        <ParticipantsTab
          status={currentTournamentDoc?.status || "registration"}
          isParticipantListUnlockedManually={isParticipantListUnlockedManually}
          setIsParticipantListUnlockedManually={setIsParticipantListUnlockedManually}
          role={userRole}
          canUpdate={userRole === "admin"}
          addParticipantType={addParticipantType}
          setAddParticipantType={setAddParticipantType}
          selectedMasterId={selectedMasterId}
          setSelectedMasterId={setSelectedMasterId}
          newAthleteName={newAthleteName}
          setNewAthleteName={setNewAthleteName}
          newAthleteTeam={newAthleteTeam}
          setNewAthleteTeam={setNewAthleteTeam}
          newAthleteIsPrimary={newAthleteIsPrimary}
          setNewAthleteIsPrimary={setNewAthleteIsPrimary}
          newAthleteVsc={newAthleteVsc}
          setNewAthleteVsc={setNewAthleteVsc}
          newAthleteDob={newAthleteDob}
          setNewAthleteDob={setNewAthleteDob}
          newAthleteGender={newAthleteGender}
          setNewAthleteGender={setNewAthleteGender}
          newAthleteProvince={newAthleteProvince}
          setNewAthleteProvince={setNewAthleteProvince}
          newAthleteBib={newAthleteBib}
          setNewAthleteBib={setNewAthleteBib}
          newAthleteCategory={newAthleteCategory}
          setNewAthleteCategory={setNewAthleteCategory}
          newAthleteNotes={newAthleteNotes}
          setNewAthleteNotes={setNewAthleteNotes}
          newAthleteMetadata={newAthleteMetadata}
          setNewAthleteMetadata={setNewAthleteMetadata}
          globalMasterAthletes={globalMasterAthletes}
          athletesList={deduplicatedAthletes}
          setAthletesList={handleSetAthletesList}
          registrationFee={registrationFee}
          setEditingParticipant={handleSetEditingParticipant}
          setDeleteConfirmAthleteTournament={handleSetDeleteConfirmAthleteTournament}
          setActivePaymentVdv={setActivePaymentVdv}
          setPaymentSimulationStep={setPaymentSimulationStep}
          getStatusLabel={getStatusLabel}
        />
      </div>

      {/* PayOS & VietQR Instant Registration Fee Portal Modal */}
      <AnimatePresence>
        {activePaymentVdv && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800 dark:text-slate-100">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-indigo-600 dark:bg-indigo-950 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <QrCode className="w-5 h-5 text-indigo-100" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm uppercase tracking-wide">Cổng Thanh Toán Napas VietQR (PayOS)</h3>
                    <p className="text-[10px] text-indigo-100">Cổng đăng ký lệ phí tự động giải đấu slingshot</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSimulatingPayment}
                  onClick={() => setActivePaymentVdv(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 max-h-[80vh] text-left">
                {paymentSimulationStep === "success" ? (
                  <div className="text-center py-8 space-y-4 animate-scaleUp">
                    <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-450 border-2 border-emerald-500/20">
                      <CheckCircle className="w-10 h-10 animate-bounce" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Thanh Toán Thành Công!</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400">
                        Hệ thống đã nhận đủ <strong>{registrationFee.toLocaleString("vi-VN")} VND</strong> lệ phí từ <strong>{activePaymentVdv.fullName || activePaymentVdv.name}</strong>.
                      </p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 p-4 rounded-2xl text-left max-w-md mx-auto space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-450">VĐV đăng ký:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{activePaymentVdv.fullName || activePaymentVdv.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Số BIB:</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{activePaymentVdv.bibNumber || "BIB-N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Mã VSC:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{activePaymentVdv.vscNumber || "Không số VSC"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Trạng thái điểm danh:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-450 flex items-center gap-1">✓ Đã Báo Danh (Checked-In)</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200/40 dark:border-emerald-800/40 pt-2 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                        <span>Mã giao dịch PayOS:</span>
                        <span>POS-{(activePaymentVdv.id || activePaymentVdv.participantId).substring(0,8).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActivePaymentVdv(null)}
                        className="px-6 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
                      >
                        Hoàn tất & Đóng cổng
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left Panel: Payment details */}
                    <div className="space-y-4 text-left">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vận động viên đăng ký</span>
                        <h4 className="text-base font-extrabold text-slate-950 dark:text-white mt-0.5">{activePaymentVdv.fullName || activePaymentVdv.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            BIB: {activePaymentVdv.bibNumber || "N/A"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            VSC: {activePaymentVdv.vscNumber || "Không số VSC"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2.5 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-450">Tài khoản thụ hưởng:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{bankName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-450">Số tài khoản:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{bankAccountNumber}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(bankAccountNumber);
                                alert("Đã sao chép số tài khoản!");
                              }}
                              className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline text-[10px] cursor-pointer"
                            >
                              [Copy]
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-450">Chủ tài khoản:</span>
                          <span className="font-bold text-slate-900 dark:text-white uppercase">{bankAccountName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                          <span className="text-slate-450">Số tiền nộp (Lệ phí):</span>
                          <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                            {registrationFee.toLocaleString("vi-VN")} VND
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 pt-1">
                          <span className="text-slate-450 block">Nội dung chuyển khoản chính xác:</span>
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 p-2 rounded-lg font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-center text-[11px] relative flex items-center justify-between">
                            <span>{activePaymentInfo}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(activePaymentInfo);
                                alert("Đã sao chép nội dung chuyển khoản!");
                              }}
                              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              SAO CHÉP
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/60 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-[11px] font-bold">
                          <Info className="w-3.5 h-3.5" /> Hướng dẫn chuyển khoản
                        </div>
                        <p className="text-[10px] text-slate-550 dark:text-slate-450 leading-relaxed">
                          VĐV quét mã QR bằng ứng dụng ngân hàng bất kỳ (MB, Vietcombank, Techcombank...) hoặc nhập tay chính xác số tài khoản và <strong>NỘI DUNG CHUYỂN KHOẢN</strong> phía trên để được tự động duyệt tham gia.
                        </p>
                      </div>
                    </div>

                    {/* Right Panel: QR Code and Simulation */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                      {/* VietQR Generated Box */}
                      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-3xl border border-slate-150 dark:border-slate-800 flex flex-col items-center shadow-inner relative overflow-hidden group">
                        <img 
                          src={`https://img.vietqr.io/image/${bankName.toLowerCase().replace(/\s+/g, '')}-${bankAccountNumber.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}-compact.png?amount=${registrationFee}&addInfo=${encodeURIComponent(activePaymentInfo)}&accountName=${encodeURIComponent(bankAccountName)}`}
                          alt="VietQR Payment Code"
                          referrerPolicy="no-referrer"
                          className="w-48 h-48 rounded-xl object-contain bg-white p-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                        <div className="mt-3 flex flex-col items-center">
                          <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">Napas 247 VietQR</span>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">Quét để nộp lệ phí</span>
                        </div>
                      </div>

                      {/* Connection status */}
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {paymentSimulationStep === "scanning" ? (
                          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang nhận diện giao dịch...
                          </span>
                        ) : paymentSimulationStep === "verifying" ? (
                          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Xác thực chữ ký checksum...
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <Wifi className="w-3.5 h-3.5" /> Lắng nghe tín hiệu PayOS Webhook
                          </span>
                        )}
                      </div>

                      {/* Simulated Payment Webhook Action Area */}
                      <div className="w-full pt-2 border-t border-slate-150 dark:border-slate-800/80 space-y-2">
                        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 block text-center tracking-wider uppercase">Vùng Giả Lập & Kiểm Thử Cổng PayOS</span>
                        <button
                          type="button"
                          disabled={isSimulatingPayment}
                          onClick={() => handleSimulatePaymentSuccess(activePaymentVdv)}
                          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isSimulatingPayment ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đối soát giao dịch...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 animate-pulse text-amber-300" /> Quét giả lập: Báo thanh toán thành công
                            </>
                          )}
                        </button>
                        <p className="text-[9px] text-slate-450 text-center leading-normal">
                          Nhấn nút giả lập để gửi tín hiệu thanh toán thành công từ ngân hàng qua PayOS Webhook về hệ thống.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Portal Modal */}
      {deleteConfirmAthleteTournament && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp text-center">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/50 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Xác Nhận Xóa VĐV Khỏi Giải?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa VĐV{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  "{deleteConfirmAthleteTournament.fullName || deleteConfirmAthleteTournament.name}"
                </strong>{" "}
                khỏi danh sách tham gia giải đấu này? Thao tác không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAthleteTournament(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteConfirmAthleteTournament.id || deleteConfirmAthleteTournament.participantId;
                  const updated = deduplicatedAthletes.filter(v => v.id !== targetId && v.participantId !== targetId);
                  handleSetAthletesList(updated).catch(err => {
                    console.error("Failed to delete athlete:", err);
                    showToast("error", "Lỗi đồng bộ", "Không thể lưu thay đổi xóa.");
                  });
                  setDeleteConfirmAthleteTournament(null);
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
