import React, { useState, useEffect, useMemo } from "react";
import { Athlete, TournamentV3, COMPETITION_CATEGORIES } from "../types";
import { tournamentRepository } from "../repositories/tournament.repository";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs, getUserProfile, coordinateLinkAthlete } from "../lib/firebaseService";
import { usePermission } from "../providers/PermissionProvider";
import { 
  Trophy, 
  UserPlus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  QrCode, 
  ArrowRight, 
  Sparkles, 
  Building, 
  MapPin, 
  Calendar, 
  HelpCircle, 
  Users, 
  Check, 
  Wallet, 
  RefreshCw,
  Clock,
  UserCheck,
  ChevronRight,
  ClipboardList,
  Trash2,
  Dices,
  Printer,
  Fingerprint
} from "lucide-react";

interface PublicRegistrationProps {
  activeHistoryId: string | null;
  currentTournamentDoc: any;
  currentUser: any;
}

export const PublicRegistration: React.FC<PublicRegistrationProps> = ({
  activeHistoryId,
  currentTournamentDoc,
  currentUser
}) => {
  const { hasPermissionV3 } = usePermission();

  // Master databases
  const [masterAthletes, setMasterAthletes] = useState<Athlete[]>([]);
  const [masterClubs, setMasterClubs] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // User Profile linking state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form states
  const [regMode, setRegMode] = useState<"system" | "free">("system");
  const [isRegisteringForSomeoneElse, setIsRegisteringForSomeoneElse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<Athlete | null>(null);

  // Free registration fields
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ" | "Khác">("Nam");
  const [dob, setDob] = useState("");
  const [province, setProvince] = useState("Hà Nội");
  const [clubName, setClubName] = useState("Tự Do");
  const [competitionCategory, setCompetitionCategory] = useState("Amateur");
  const [vscNumber, setVscNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRegId, setRecentRegId] = useState<string | null>(null);
  const [sessionMyRegs, setSessionMyRegs] = useState<string[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Payment simulation state
  const [isVerifying, setIsVerifying] = useState(false);

  // BIB drawing states
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnBibResult, setDrawnBibResult] = useState<string | null>(null);

  // Fetch user profile from users collection
  useEffect(() => {
    if (currentUser?.uid) {
      setLoadingProfile(true);
      getUserProfile(currentUser.uid).then((prof) => {
        setUserProfile(prof);
        setLoadingProfile(false);
      }).catch((err) => {
        console.error("Error loading user profile:", err);
        setLoadingProfile(false);
      });
    } else {
      setUserProfile(null);
    }
  }, [currentUser]);

  // Find if this user is already verified-linked to a system athlete
  const linkedSystemAthlete = useMemo(() => {
    if (!currentUser) return null;
    
    // 1. Try by masterAthleteId from profile
    if (userProfile?.masterAthleteId) {
      const found = masterAthletes.find(a => (a.id || (a as any).athleteId) === userProfile.masterAthleteId);
      if (found) return found;
    }
    
    // 2. Fallback: check masterAthletes list for verified link with current UID
    const foundByUid = masterAthletes.find(a => a.linkedUserId === currentUser.uid && a.claimStatus === "verified");
    if (foundByUid) return foundByUid;

    return null;
  }, [currentUser, userProfile, masterAthletes]);

  // Check if they have a pending claim
  const pendingSystemAthlete = useMemo(() => {
    if (!currentUser) return null;
    return masterAthletes.find(a => a.linkedUserId === currentUser.uid && a.claimStatus === "pending_review");
  }, [currentUser, masterAthletes]);

  // Automatically populate form if linkedSystemAthlete or pendingSystemAthlete is active
  useEffect(() => {
    const activeSysAthlete = (!isRegisteringForSomeoneElse && (linkedSystemAthlete || pendingSystemAthlete)) ? (linkedSystemAthlete || pendingSystemAthlete) : null;
    if (activeSysAthlete) {
      setFullName(activeSysAthlete.fullName || activeSysAthlete.name || "");
      setGender((activeSysAthlete.gender as any) || "Nam");
      setDob(activeSysAthlete.dob || "");
      setProvince(activeSysAthlete.province || "Hà Nội");
      setClubName(activeSysAthlete.clubName || activeSysAthlete.team || "Tự Do");
      setVscNumber(activeSysAthlete.vscNumber || "");
    } else if (selectedMaster) {
      setFullName(selectedMaster.fullName || selectedMaster.name || "");
      setGender((selectedMaster.gender as any) || "Nam");
      setDob(selectedMaster.dob || "");
      setProvince(selectedMaster.province || "Hà Nội");
      setClubName(selectedMaster.clubName || selectedMaster.team || "Tự Do");
      setVscNumber(selectedMaster.vscNumber || "");
    } else if (regMode === "system") {
      // Clear fields if switching and not selected
      setFullName("");
      setGender("Nam");
      setDob("");
      setProvince("Hà Nội");
      setClubName("Tự Do");
      setVscNumber("");
    }
  }, [linkedSystemAthlete, pendingSystemAthlete, regMode, selectedMaster, isRegisteringForSomeoneElse]);

  // Load master data
  useEffect(() => {
    setLoadingMaster(true);
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      setMasterAthletes(data);
      setLoadingMaster(false);
    });
    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setMasterClubs(data);
    });
    return () => {
      unsubAthletes();
      unsubClubs();
    };
  }, []);

  // Retrieve previous registration for this specific tournament if exists
  useEffect(() => {
    if (activeHistoryId) {
      setRecentRegId(null);
      // Start with a clean registration form so they can register more athletes,
      // they can still click "Xem Vé / QR" from the bottom table anytime.
      setActiveTicketId(null);
    }
  }, [activeHistoryId]);

  const athletesList = currentTournamentDoc?.athletes || [];

  const myRegisteredAthletes = useMemo(() => {
    if (!activeHistoryId) return [];

    return athletesList.filter((a: any) => {
      const isLocal = sessionMyRegs.includes(a.id) || sessionMyRegs.includes(a.participantId || "");
      const isUserUid = currentUser?.uid && (a as any).registeredByUid === currentUser.uid;
      const isUserEmail = currentUser?.email && (
        a.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase() ||
        (a as any).registeredByEmail?.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      );
      return isLocal || isUserUid || isUserEmail;
    });
  }, [athletesList, currentUser, activeHistoryId, sessionMyRegs]);

  // Find if this user's linked athlete is already registered in this tournament
  const ownRegisteredAthlete = useMemo(() => {
    if (!linkedSystemAthlete) return null;
    return athletesList.find((a: any) => 
      a.masterAthleteId === linkedSystemAthlete.id || 
      (a.vscNumber && a.vscNumber === linkedSystemAthlete.vscNumber)
    );
  }, [linkedSystemAthlete, athletesList]);

  // Find if this user's pending linked athlete is already registered in this tournament
  const pendingRegisteredAthlete = useMemo(() => {
    if (!pendingSystemAthlete) return null;
    return athletesList.find((a: any) => 
      a.masterAthleteId === pendingSystemAthlete.id || 
      (a.vscNumber && a.vscNumber === pendingSystemAthlete.vscNumber)
    );
  }, [pendingSystemAthlete, athletesList]);

  // Find the exact athlete profile matching the logged-in user (MUST be linked to their verified or pending system athlete account, or matching their registrations)
  const userAthleteProfile = useMemo(() => {
    if (!currentUser) return null;
    return ownRegisteredAthlete || pendingRegisteredAthlete || (myRegisteredAthletes && myRegisteredAthletes.length > 0 ? myRegisteredAthletes[0] : null);
  }, [currentUser, ownRegisteredAthlete, pendingRegisteredAthlete, myRegisteredAthletes]);

  // Stage checks for BIB draw permissions:
  // Step 1: Registration (registration / registration_open) -> VĐV đăng ký, chưa mở bốc thăm BIB
  // Step 2: Check-in (check_in / checkin) -> MỞ tính năng VĐV tự bốc thăm số hiệu BIB
  // Step 3+: Competition & onwards -> ĐÓNG tính năng VĐV tự bốc thăm số BIB
  const currentStatus = currentTournamentDoc?.status || "draft";
  const activeWorkflowStage = currentTournamentDoc?.commandCenterState?.workflowStage || "registration";
  const activeWorkflowState = currentTournamentDoc?.workflowState || "registration_open";
  const isStep2BibDrawActive = activeWorkflowStage === "check_in" || activeWorkflowState === "checkin";
  const isStep3OrLater = !isStep2BibDrawActive && (
    ["competition", "team_competition", "ranking", "qualification", "official_result", "published", "archived"].includes(activeWorkflowStage) ||
    ["live", "ranking_locked", "verification", "award", "completed", "archived"].includes(activeWorkflowState) ||
    (currentStatus !== "registration" && currentStatus !== "draft" && currentStatus !== "ready")
  );
  const isPortalClosed = isStep2BibDrawActive || isStep3OrLater || (currentStatus !== "registration" && currentStatus !== "draft");
  const isStep2OrLater = isPortalClosed;

  const [selectedAthleteForDraw, setSelectedAthleteForDraw] = useState<any | null>(null);

  const handleOpenDrawModal = (athleteToDraw?: any) => {
    if (!isStep2BibDrawActive) {
      if (isStep3OrLater) {
        alert("⚠️ Tính năng tự bốc thăm số BIB đã đóng lại khi giải đấu chuyển sang Giai đoạn 3 (Thi đấu)!");
      } else {
        alert("⚠️ Tính năng tự bốc thăm số BIB chỉ mở khi Ban tổ chức chuyển sang Giai đoạn 2 (Điểm danh)!");
      }
      return;
    }
    setSelectedAthleteForDraw(athleteToDraw || userAthleteProfile || (myRegisteredAthletes && myRegisteredAthletes.length > 0 ? myRegisteredAthletes[0] : null));
    setIsDrawModalOpen(true);
  };

  // Auto-cleanup pending registrations older than 24 hours
  useEffect(() => {
    if (!activeHistoryId || !athletesList || athletesList.length === 0) return;

    // Only attempt cleanup if current user is authorized to update the tournament
    try {
      const hasUpdatePerm = hasPermissionV3("Tournament", "Update", currentTournamentDoc);
      if (!hasUpdatePerm) return;
    } catch (e) {
      return;
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const toKeep = athletesList.filter((a: any) => {
      if (a.paymentStatus !== "paid" && a.registeredAt) {
        const regTime = new Date(a.registeredAt).getTime();
        if (now - regTime > oneDayMs) {
          return false; // Remove this athlete
        }
      }
      return true; // Keep this athlete
    });

    if (toKeep.length < athletesList.length) {
      const removedCount = athletesList.length - toKeep.length;
      console.log(`Auto-cleaning ${removedCount} pending registrations older than 24 hours.`);
      
      tournamentRepository.updateTournament(
        activeHistoryId,
        { athletes: toKeep },
        "system_cron",
        "system@vscs.asia",
        "system",
        "Hệ thống tự động dọn dẹp",
        `Tự động hủy ${removedCount} hồ sơ đăng ký chưa đóng lệ phí quá 24h.`
      ).catch(err => {
        console.error("Failed to auto-clean old registrations:", err);
      });
    }
  }, [activeHistoryId, athletesList, currentTournamentDoc, hasPermissionV3]);

  if (!activeHistoryId || !currentTournamentDoc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl min-h-[400px]">
        <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-700 animate-pulse mb-4" />
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Chưa chọn giải đấu</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md">Vui lòng chọn một giải đấu hoạt động từ danh sách để truy cập cổng đăng ký thành viên.</p>
      </div>
    );
  }

  // Extract tournament configurations with real fallbacks
  const tStatus = currentTournamentDoc.status || "draft";
  const tName = currentTournamentDoc.tournamentName || "Giải đấu Slingshot";
  const tLocation = currentTournamentDoc.location || "Chưa thiết lập";
  const tStart = currentTournamentDoc.startDate || "";
  const tEnd = currentTournamentDoc.endDate || "";
  const tBanner = currentTournamentDoc.banner || "";
  
  // Bank settings from tournament configuration with exact user's defaults
  const registrationFee = currentTournamentDoc.registrationFee !== undefined ? currentTournamentDoc.registrationFee : 200000;
  const bankName = currentTournamentDoc.bankName || "MB"; // MB Bank
  const bankAccountNumber = currentTournamentDoc.bankAccountNumber || "0968210586";
  const bankAccountName = currentTournamentDoc.bankAccountName || "NGUYEN HUU HIEP";

  // Helper: Retrieve or dynamically calculate Heat & Lane assignment
  const getHeatAndLaneForAthlete = (athlete: any) => {
    if (!athlete) return { heat: null, lane: null };
    const ccs = currentTournamentDoc?.commandCenterState;
    let assignedHeatNum: number | null = null;
    let assignedLaneNum: number | null = null;

    // 1. Try to find in scheduled heats (if admin already run them)
    if (ccs && ccs.heats) {
      const athId = athlete.id || athlete.participantId;
      for (const heat of ccs.heats) {
        const foundLane = (heat.lanes || []).find((l: any) => l.participantId === athId || l.athleteId === athId);
        if (foundLane) {
          assignedHeatNum = heat.heatNumber;
          assignedLaneNum = foundLane.laneNumber;
          break;
        }
      }
    }

    // 2. Fallback: Sequential calculation by BIB
    if (assignedHeatNum === null && athlete.bibNumber) {
      const bibStr = athlete.bibNumber;
      const match = bibStr.match(/\d+/);
      if (match) {
        const bibNumValue = parseInt(match[0], 10);
        const idx = bibNumValue - 1;
        const L = currentTournamentDoc.laneCapacity || ccs?.laneCount || 8;
        assignedHeatNum = Math.floor(idx / L) + 1;
        assignedLaneNum = (idx % L) + 1;
      }
    }

    return { heat: assignedHeatNum, lane: assignedLaneNum };
  };

  // Helper: Generate consistent athletic themes based on tournament name so each tournament looks different
  const getBadgeTheme = (tourName: string) => {
    const nameStr = tourName || "";
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % 4;
    
    const themes = [
      {
        primaryBg: "from-amber-500 to-orange-600",
        badgeBg: "bg-orange-500",
        bgLight: "bg-orange-50/50 dark:bg-orange-950/10",
        border: "border-orange-200 dark:border-orange-900/30",
        accentText: "text-orange-600 dark:text-orange-400",
        cellBg: "bg-orange-50/30 dark:bg-orange-950/20",
        glow: "shadow-orange-500/10",
        textColor: "text-orange-850 dark:text-orange-200",
        gradientText: "from-orange-600 to-amber-500"
      },
      {
        primaryBg: "from-indigo-600 to-violet-700",
        badgeBg: "bg-indigo-650",
        bgLight: "bg-indigo-50/50 dark:bg-indigo-950/10",
        border: "border-indigo-200 dark:border-indigo-900/30",
        accentText: "text-indigo-600 dark:text-indigo-400",
        cellBg: "bg-indigo-50/30 dark:bg-indigo-950/20",
        glow: "shadow-indigo-500/10",
        textColor: "text-indigo-850 dark:text-indigo-200",
        gradientText: "from-indigo-600 to-violet-500"
      },
      {
        primaryBg: "from-emerald-600 to-teal-700",
        badgeBg: "bg-emerald-600",
        bgLight: "bg-emerald-50/50 dark:bg-emerald-950/10",
        border: "border-emerald-200 dark:border-emerald-900/30",
        accentText: "text-emerald-600 dark:text-emerald-400",
        cellBg: "bg-emerald-50/30 dark:bg-emerald-950/20",
        glow: "shadow-emerald-500/10",
        textColor: "text-emerald-850 dark:text-emerald-200",
        gradientText: "from-emerald-600 to-teal-500"
      },
      {
        primaryBg: "from-rose-600 to-red-700",
        badgeBg: "bg-rose-600",
        bgLight: "bg-rose-50/50 dark:bg-rose-950/10",
        border: "border-rose-200 dark:border-rose-900/30",
        accentText: "text-rose-600 dark:text-rose-400",
        cellBg: "bg-rose-50/30 dark:bg-rose-950/20",
        glow: "shadow-rose-500/10",
        textColor: "text-rose-850 dark:text-rose-200",
        gradientText: "from-rose-600 to-red-500"
      }
    ];
    return themes[idx];
  };

  // Helper: Open a popup window with specific printer styling to output a perfect 4x6 athlete badge card
  const handlePrintCard = (athlete: any, elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50000,top=50000,width=0,height=0');
    if (!printWindow) {
      alert("⚠️ Vui lòng cho phép popup để tiến hành in thẻ vận động viên!");
      return;
    }
    
    const styles = Array.from(document.querySelectorAll('style, link'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>Thẻ VĐV - ${athlete.fullName || athlete.name}</title>
          ${styles}
          <style>
            @media print {
              body {
                background: white;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
              #${elementId} {
                box-shadow: none !important;
                border: 2px solid #ccc !important;
                border-radius: 24px !important;
                width: 380px !important;
                height: 570px !important;
                padding: 24px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body style="margin:0; padding:10px; display:flex; justify-content:center; align-items:center; background:#f3f4f6;">
          <div>
            ${printContent.outerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // A beautiful 4x6 bento-style athlete pass/badge component
  const renderAthleteBentoBadge = (athlete: any, containerId: string) => {
    const { heat, lane } = getHeatAndLaneForAthlete(athlete);
    const theme = getBadgeTheme(tName);
    const bibStr = athlete.bibNumber || "BIB-???";
    const vscId = (athlete.vscNumber || athlete.id?.substring(0, 10) || "VSC-TEMP").toUpperCase();
    const qrData = athlete.id;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;
    
    // Resolve avatarUrl, if it is not present on the registration object, look it up in masterAthletes or user profile!
    let avatarUrl = athlete.avatarUrl || "";
    if (!avatarUrl) {
      if (athlete.masterAthleteId) {
        const master = masterAthletes.find(m => m.id === athlete.masterAthleteId);
        if (master) {
          avatarUrl = master.avatarUrl || "";
        }
      } else if (athlete.vscNumber) {
        const master = masterAthletes.find(m => m.vscNumber === athlete.vscNumber);
        if (master) {
          avatarUrl = master.avatarUrl || "";
        }
      }
    }
    if (!avatarUrl && userProfile?.masterAthleteId && (athlete.masterAthleteId === userProfile.masterAthleteId || athlete.vscNumber === userProfile.vscNumber)) {
      avatarUrl = userProfile.customAvatarUrl || userProfile.avatarUrl || "";
    }
    
    return (
      <div className="flex flex-col items-center space-y-4">
        {/* Printable Card Frame (Ratio approximately 4x6) */}
        <div 
          id={containerId}
          className={`w-[340px] h-[510px] bg-white dark:bg-slate-900 border-2 border-red-500 dark:border-red-600 rounded-[28px] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none`}
        >
          {/* Subtle Watermark Circular Target background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] dark:opacity-[0.05]">
            <div className="w-[450px] h-[450px] rounded-full border-[12px] border-red-500" />
            <div className="absolute w-[350px] h-[350px] rounded-full border-[10px] border-red-500" />
            <div className="absolute w-[250px] h-[250px] rounded-full border-[8px] border-red-500" />
          </div>

          {/* Realistic lanyard slot at top center */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-700/50" />

          {/* 1. VSC OFFICIAL ATHLETE & ID VSC Header */}
          <div className="text-center pt-2 space-y-1 z-10">
            <span className="inline-block px-3 py-0.5 bg-gradient-to-r from-red-600 to-rose-650 text-white text-[9px] font-black rounded-full uppercase tracking-widest">
              VSC OFFICIAL ATHLETE
            </span>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono mt-1">
              ID VSC: <span className="font-bold text-red-600 dark:text-red-400">{vscId}</span>
            </div>
          </div>

          {/* 2. TÊN VĐV (Size lớn, bôi đậm, dễ nhìn) */}
          <div className="text-center my-0.5 z-10 px-2">
            <span className="text-[8px] text-red-500 dark:text-red-400 uppercase font-mono tracking-wider block mb-0.5">VẬN ĐỘNG VIÊN</span>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-tight line-clamp-1">
              {athlete.fullName || athlete.name}
            </h2>
          </div>

          {/* 3. Số BIB | Tên CLB */}
          <div className="bg-red-50/20 dark:bg-red-950/5 border border-red-500 dark:border-red-600 rounded-2xl p-3 text-center z-10 space-y-1">
            <div className="flex justify-around items-center gap-2">
              <div className="text-center flex-1">
                <span className="text-[8px] text-slate-450 dark:text-slate-550 uppercase block font-mono font-bold">SỐ BIB (SBD)</span>
                <span className="text-xl font-extrabold text-red-600 dark:text-red-500 tracking-tight font-mono">
                  {bibStr}
                </span>
              </div>
              <div className="h-6 w-[1px] bg-red-500 dark:bg-red-600" />
              <div className="text-center flex-1">
                <span className="text-[8px] text-slate-450 dark:text-slate-550 uppercase block font-mono font-bold">CÂU LẠC BỘ</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate block mt-0.5 px-1">
                  {athlete.clubName || athlete.team || "Tự Do"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Lượt bắn | Lane bắn - Chuyển sang nền đỏ rất nhạt (10% opacity) và viền đỏ */}
          <div className="bg-red-500/10 dark:bg-red-950/20 border border-red-500 dark:border-red-600 rounded-2xl p-3 flex justify-around items-center z-10">
            <div className="text-center">
              <span className="text-[8px] text-red-500 dark:text-red-400 uppercase block font-mono font-bold">LƯỢT BẮN</span>
              <span className="text-xs font-extrabold tracking-tight text-red-700 dark:text-red-400 uppercase">
                {heat !== null ? `LƯỢT ${heat}` : "CHỜ XẾP LƯỢT"}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-red-500" />
            <div className="text-center">
              <span className="text-[8px] text-red-500 dark:text-red-400 uppercase block font-mono font-bold">BỆ BẮN (LANE)</span>
              <span className="text-xs font-extrabold tracking-tight text-red-700 dark:text-red-400 uppercase">
                {lane !== null ? `BỆ SỐ ${lane}` : "CHỜ XẾP BỆ"}
              </span>
            </div>
          </div>

          {/* 5. Avatar & QR Code Section */}
          <div className="flex items-center justify-center gap-3 z-10">
            {/* Avatar on the Left */}
            <div className="flex flex-col items-center justify-center bg-white border border-red-500 dark:border-red-600 rounded-2xl p-1.5 w-[115px] h-[115px] shadow-xs">
              <img 
                src={avatarUrl || (athlete.gender === "Nữ" ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fce7f3'/><circle cx='50' cy='38' r='20' fill='%23db2777'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23db2777'/></svg>" : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e2e8f0'/><circle cx='50' cy='38' r='20' fill='%23475569'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23475569'/></svg>")} 
                alt={`Avatar Athlete ${athlete.id}`}
                className="w-20 h-20 object-cover rounded-xl border border-slate-100"
                referrerPolicy="no-referrer"
              />
              <span className="text-[7px] text-red-650 font-mono font-bold tracking-wider mt-1 uppercase block text-center">
                ẢNH ĐẠI DIỆN
              </span>
            </div>

            {/* QR Code on the Right */}
            <div className="flex flex-col items-center justify-center bg-white border border-red-500 dark:border-red-600 rounded-2xl p-1.5 w-[115px] h-[115px] shadow-xs">
              <img 
                src={qrUrl} 
                alt={`QR Code Athlete ${athlete.id}`}
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-[7px] text-red-650 font-mono font-bold tracking-wider mt-1 uppercase block text-center">
                QUÉT GHI ĐIỂM
              </span>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="text-center text-[8px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase z-10 border-t border-red-100 dark:border-red-950/30 pt-2">
            VSC-{vscId}-{bibStr}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handlePrintCard(athlete, containerId)}
          className="no-print w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-red-100 dark:shadow-none hover:scale-[1.01]"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>IN THẺ ĐEO VĐV (KHỔ 4x6)</span>
        </button>
      </div>
    );
  };

  const renderRegisteredAthletesList = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-red-650" />
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Danh Sách VĐV Bạn Đã Ghi Danh ({myRegisteredAthletes.length})</span>
          </div>
        </div>
        
        {myRegisteredAthletes.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-6">Chưa có vận động viên nào được ghi danh bởi tài khoản này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="py-2.5">Họ và Tên</th>
                  <th className="py-2.5">Số hiệu (BIB)</th>
                  <th className="py-2.5">Câu lạc bộ</th>
                  <th className="py-2.5">Hạng Mục</th>
                  <th className="py-2.5 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {myRegisteredAthletes.map((reg: any, idx: number) => (
                  <tr key={reg.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="py-3">
                      <span className="font-extrabold text-slate-800 dark:text-white block">{reg.fullName || reg.name}</span>
                      <span className="text-[10px] text-slate-500">{reg.province || "Hà Nội"}</span>
                    </td>
                    <td className="py-3 font-mono font-bold">
                      {reg.bibNumber ? (
                        <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/50 text-[11px] font-mono">
                          {reg.bibNumber}
                        </span>
                      ) : isStep2BibDrawActive ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDrawModal(reg)}
                          className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-[10px] font-extrabold uppercase shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Dices className="w-3 h-3" />
                          <span>Bốc thăm BIB</span>
                        </button>
                      ) : isStep3OrLater ? (
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Chưa có BIB
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-750 text-[10px] font-mono font-bold">
                          Chờ cấp (Step 2)
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">
                      {reg.clubName || reg.team || "Tự Do"}
                    </td>
                    <td className="py-3 font-medium capitalize text-slate-600 dark:text-slate-400">
                      {reg.competitionCategory || "Amateur"}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                        reg.paymentStatus === "paid" 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                      }`}>
                        {reg.paymentStatus === "paid" ? "Đã xác nhận" : "Đang chờ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // BIB drawing logic
  const handleDrawBib = async () => {
    if (!isStep2BibDrawActive) {
      alert("⚠️ Chức năng tự bốc thăm số BIB chỉ áp dụng khi Ban tổ chức chuyển sang Step 2 (Điểm danh) và đã đóng khi sang Step 3 thi đấu!");
      setIsDrawModalOpen(false);
      return;
    }

    const targetAth = selectedAthleteForDraw || userAthleteProfile || (myRegisteredAthletes && myRegisteredAthletes.length > 0 ? myRegisteredAthletes[0] : null);
    if (!currentUser || !targetAth || !activeHistoryId) return;
    
    setIsDrawing(true);
    try {
      // Find all taken BIBs in the tournament
      const takenBibs = new Set(
        athletesList
          .map((a: any) => a.bibNumber)
          .filter(Boolean)
      );

      // Generate a list of available BIBs where the maximum BIB number equals the total number of registered athletes (N = athletesList.length)
      const maxBibNumber = Math.max(athletesList.length, 1);
      const availableBibs: string[] = [];
      const pad = (num: number, size: number) => num.toString().padStart(size, '0');

      for (let i = 1; i <= maxBibNumber; i++) {
        const formatted = `BIB-${pad(i, 3)}`;
        if (!takenBibs.has(formatted)) {
          availableBibs.push(formatted);
        }
      }

      // If for some reason there are no free BIBs within the 1..N range (due to overlaps/manual assigns), 
      // search upwards beyond maxBibNumber as a safe fallback
      if (availableBibs.length === 0) {
        let fallbackCounter = maxBibNumber + 1;
        while (availableBibs.length < 5) {
          const formatted = `BIB-${pad(fallbackCounter, 3)}`;
          if (!takenBibs.has(formatted)) {
            availableBibs.push(formatted);
          }
          fallbackCounter++;
          if (fallbackCounter > 9999) break;
        }
      }

      if (availableBibs.length === 0) {
        throw new Error("Không còn số BIB trống trong hệ thống!");
      }

      // Draw a random BIB
      const randomBib = availableBibs[Math.floor(Math.random() * availableBibs.length)];
      const targetId = targetAth.id || targetAth.participantId;

      const updatedAthletesList = athletesList.map((ath: any) => {
        if (ath.id === targetId || ath.participantId === targetId) {
          return {
            ...ath,
            bibNumber: randomBib,
            idCard: randomBib // Compatibility fallback
          };
        }
        return ath;
      });

      const updateData: any = { athletes: updatedAthletesList };
      if (currentTournamentDoc?.teamAthletes && currentTournamentDoc.teamAthletes.length > 0) {
        updateData.teamAthletes = currentTournamentDoc.teamAthletes.map((ath: any) => {
          if (ath.id === targetId || ath.participantId === targetId) {
            return {
              ...ath,
              bibNumber: randomBib,
              idCard: randomBib
            };
          }
          return ath;
        });
      }

      await tournamentRepository.updateTournament(
        activeHistoryId,
        updateData,
        currentUser.uid,
        currentUser.email || "",
        "athlete",
        "Tự bốc thăm số BIB",
        `VĐV ${targetAth.fullName || targetAth.name} tự bốc thăm số hiệu BIB thành công: ${randomBib}`
      );

      setDrawnBibResult(randomBib);
      setIsDrawModalOpen(false);
      setSelectedAthleteForDraw(null);
      alert(`🎉 Chúc mừng! Bạn đã bốc thăm thành công số hiệu BIB: ${randomBib}`);
    } catch (err: any) {
      console.error("Lỗi bốc thăm BIB:", err);
      alert(`⚠️ Không thể bốc thăm số BIB: ${err.message}`);
    } finally {
      setIsDrawing(false);
    }
  };

  // Manually delete a pending registration
  const handleDeletePendingRegistration = async (athlete: Athlete) => {
    if (!activeHistoryId) return;
    if (athlete.paymentStatus === "paid") {
      alert("⚠️ Không thể xóa vận động viên đã đóng lệ phí.");
      return;
    }
    const confirmDelete = window.confirm(
      `⚠️ Bạn có chắc chắn muốn hủy đăng ký và xóa vận động viên "${athlete.fullName || athlete.name}" khỏi danh sách không?`
    );
    if (!confirmDelete) return;

    try {
      const updatedAthletes = athletesList.filter(a => a.id !== athlete.id);
      
      const updateData: any = { athletes: updatedAthletes };
      if (currentTournamentDoc?.teamAthletes && currentTournamentDoc.teamAthletes.length > 0) {
        updateData.teamAthletes = updatedAthletes;
      }

      await tournamentRepository.updateTournament(
        activeHistoryId,
        updateData,
        currentUser?.uid || "guest",
        currentUser?.email || "guest@vscs.asia",
        "spectator",
        "Hủy đăng ký",
        `Hủy đăng ký thi đấu của VĐV ${athlete.fullName || athlete.name} do người đăng ký yêu cầu.`
      );

      setSessionMyRegs(prev => prev.filter(id => id !== athlete.id && id !== athlete.participantId));

      alert("✅ Đã hủy đăng ký thành công.");
    } catch (err: any) {
      console.error("Failed to delete pending registration:", err);
      alert(`⚠️ Lỗi khi hủy đăng ký: ${err?.message || err}`);
    }
  };

  // Check if there is an active ticket selected to display
  const findActiveTicketAthlete = () => {
    if (activeTicketId) {
      const found = athletesList.find(a => a.id === activeTicketId || a.participantId === activeTicketId);
      if (found) return found;
    }
    return null;
  };

  const activeTicketAthlete = findActiveTicketAthlete();

  // Search filter for system athletes
  const filteredMasterAthletes = masterAthletes.filter(athlete => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    const nameMatch = (athlete.fullName || athlete.name || "").toLowerCase().includes(q);
    const vscMatch = (athlete.vscNumber || "").toLowerCase().includes(q);
    const idMatch = (athlete.id || "").toLowerCase().includes(q);
    return nameMatch || vscMatch || idMatch;
  });

  // Handle master selection
  const handleSelectMaster = (athlete: Athlete) => {
    setSelectedMaster(athlete);
    setFullName(athlete.fullName || athlete.name || "");
    setGender((athlete.gender as any) || "Nam");
    setDob(athlete.dob || "");
    setProvince(athlete.province || "Hà Nội");
    setClubName(athlete.clubName || athlete.team || "Tự Do");
    setVscNumber(athlete.vscNumber || "");
    setSearchQuery("");
  };

  // Handle registration action
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("⚠️ Vui lòng nhập đầy đủ họ và tên!");
      return;
    }

    setIsSubmitting(true);
    try {
      const currentActiveSysAthlete = isRegisteringForSomeoneElse ? selectedMaster : (linkedSystemAthlete || pendingSystemAthlete || selectedMaster);

      // If user registers as a System Athlete, and is logged in, but not yet linked: trigger permanent link request!
      if (regMode === "system" && selectedMaster && currentUser && !linkedSystemAthlete && !pendingSystemAthlete && !isRegisteringForSomeoneElse) {
        try {
          const linkRes = await coordinateLinkAthlete(
            currentUser.uid,
            currentUser.email || "",
            selectedMaster.id,
            false
          );
          if (linkRes.success) {
            console.log("Auto account claim/link submitted:", linkRes.message);
          } else {
            console.warn("Auto account claim/link status:", linkRes.message);
          }
        } catch (linkErr) {
          console.error("Failed to automatically link user profile:", linkErr);
        }
      }

      let nextAthletes = [...athletesList];
      const existingAthleteIdx = athletesList.findIndex(a => {
        const matchMasterId = regMode === "system" && currentActiveSysAthlete && a.masterAthleteId === currentActiveSysAthlete.id;
        const matchVsc = regMode === "system" && vscNumber && a.vscNumber === vscNumber;
        const matchNameAndDob = fullName.trim().toLowerCase() === (a.fullName || a.name || "").trim().toLowerCase() && dob && a.dob === dob;
        return matchMasterId || matchVsc || matchNameAndDob;
      });

      let registeredId = "";
      if (existingAthleteIdx > -1) {
        // Merge & update existing
        const existing = athletesList[existingAthleteIdx];
        registeredId = existing.id;
        const updatedAthlete: Athlete = {
          ...existing,
          name: fullName,
          fullName: fullName,
          team: clubName,
          clubName: clubName,
          gender,
          dob,
          province,
          vscNumber: regMode === "system" ? vscNumber : (existing.vscNumber || ""),
          competitionCategory,
          notes: notes || existing.notes || "",
          email: currentUser?.email || existing.email || "",
          registeredByUid: currentUser?.uid || (existing as any).registeredByUid || "guest",
          registeredByEmail: currentUser?.email || (existing as any).registeredByEmail || "guest@vscs.asia",
          // Keep existing paymentStatus if it was already paid, otherwise update it
          paymentStatus: existing.paymentStatus === "paid" ? "paid" : (registrationFee > 0 ? "pending" : "paid"),
          status: existing.status || "registered",
          isMasterAthlete: regMode === "system",
          masterAthleteId: regMode === "system" && currentActiveSysAthlete ? currentActiveSysAthlete.id : existing.masterAthleteId,
          avatarUrl: (regMode === "system" && currentActiveSysAthlete ? currentActiveSysAthlete.avatarUrl : existing.avatarUrl) || ""
        } as any;
        nextAthletes[existingAthleteIdx] = updatedAthlete;
      } else {
        // Create brand new
        const newId = `reg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        registeredId = newId;
        const newAthlete: Athlete = {
          id: newId,
          participantId: newId,
          name: fullName,
          fullName: fullName,
          team: clubName,
          clubName: clubName,
          gender,
          dob,
          province,
          vscNumber: regMode === "system" ? vscNumber : "",
          competitionCategory,
          notes,
          email: currentUser?.email || "",
          registeredByUid: currentUser?.uid || "guest",
          registeredByEmail: currentUser?.email || "guest@vscs.asia",
          status: "registered",
          checkInStatus: "pending",
          paymentStatus: registrationFee > 0 ? "pending" : "paid",
          isPrimaryTeam: true,
          registeredAt: new Date().toISOString(),
          scores: {},
          isMasterAthlete: regMode === "system",
          masterAthleteId: regMode === "system" && currentActiveSysAthlete ? currentActiveSysAthlete.id : undefined,
          avatarUrl: regMode === "system" && currentActiveSysAthlete ? currentActiveSysAthlete.avatarUrl || "" : ""
        } as any;
        nextAthletes.push(newAthlete);
      }

      const updateData: any = { athletes: nextAthletes };
      if (currentTournamentDoc?.teamAthletes && currentTournamentDoc.teamAthletes.length > 0) {
        updateData.teamAthletes = nextAthletes;
      }

      await tournamentRepository.updateTournament(
        activeHistoryId,
        updateData,
        currentUser?.uid || "guest",
        currentUser?.email || "guest@vscs.asia",
        "spectator",
        "Đăng ký trực tuyến",
        `VĐV ${fullName} đăng ký ghi danh vào giải đấu qua cổng trực tuyến.`
      );

      setRecentRegId(registeredId);
      setActiveTicketId(registeredId);

      // Append to list of registrations for this browser session in-memory state
      setSessionMyRegs(prev => prev.includes(registeredId) ? prev : [...prev, registeredId]);
      
      if (registrationFee === 0) {
        alert("🎉 Đăng ký tham gia giải đấu thành công! Giải đấu này miễn phí lệ phí thi đấu.");
      } else {
        alert("🎉 Thông tin đăng ký đã được tiếp nhận! Hãy hoàn tất nộp lệ phí để chính thức được duyệt tham gia.");
      }
    } catch (err: any) {
      console.error("Online registration error:", err);
      alert(`⚠️ Lỗi khi đăng ký: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulated Payment Confirmation
  const handleSimulatePayment = async () => {
    if (!activeTicketAthlete) return;
    setIsVerifying(true);

    // Dynamic fake delay for premium UX feel
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const updatedAthletes = athletesList.map(a => {
        if (a.id === activeTicketAthlete.id || (a.participantId && activeTicketAthlete.participantId && a.participantId === activeTicketAthlete.participantId)) {
          return {
            ...a,
            paymentStatus: "paid",
            status: "checked_in", // Checked in on immediate payment success
            checkInStatus: "checked_in",
            paidAt: new Date().toISOString(),
            paymentAmount: registrationFee,
            paymentMethod: "VietQR-PayOS"
          };
        }
        return a;
      });

      await tournamentRepository.updateTournament(
        activeHistoryId,
        { athletes: updatedAthletes },
        currentUser?.uid || "guest",
        currentUser?.email || "guest@vscs.asia",
        "spectator",
        "Thanh toán trực tuyến",
        `Xác nhận thanh toán lệ phí thành công cho VĐV ${activeTicketAthlete.fullName || activeTicketAthlete.name} qua VietQR.`
      );

      setShowPaymentSuccess(true);
      alert("✅ Giao dịch thành công! Bạn đã được hệ thống tự động ghi danh và điểm danh thành công.");
    } catch (err: any) {
      console.error("Payment confirmation failed:", err);
      alert(`⚠️ Lỗi xác nhận thanh toán: ${err?.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper copy to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép ${label}: ${text}`);
  };

  // Format money
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // If already registered, show registration ticket & payment status
  if (activeTicketAthlete) {
    const isPaid = activeTicketAthlete.paymentStatus === "paid";
    
    // Dynamic QR generation link using standard VietQR Open API
    const athleteVscId = (activeTicketAthlete.vscNumber || activeTicketAthlete.id || "VSC-TEMP").trim().toUpperCase();
    const paymentInfo = `${athleteVscId} REG ${activeHistoryId || "TEMP_TOUR"}`.trim().toUpperCase();
    let cleanBankId = bankName.toLowerCase().replace(/\s+/g, "");
    if (cleanBankId === "mbbank") {
      cleanBankId = "mb";
    }
    const cleanAccountNumber = bankAccountNumber.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
    const vietQrUrl = `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNumber}-compact.png?amount=${registrationFee}&addInfo=${encodeURIComponent(paymentInfo)}&accountName=${encodeURIComponent(bankAccountName)}`;

    return (
      <div className="space-y-6 animate-fadeIn text-left max-w-4xl mx-auto">
        
        {/* BACK TO REGISTRATION NAVIGATION */}
        <div className="flex justify-between items-center bg-indigo-50/45 dark:bg-slate-850 p-4 rounded-3xl border border-indigo-100/50 dark:border-slate-800">
          <div className="text-xs">
            <span className="font-black text-slate-800 dark:text-white block">BẠN ĐANG XEM VÉ ĐĂNG KÝ THI ĐẤU</span>
            <span className="text-[10px] text-slate-500">VĐV: <strong>{activeTicketAthlete.fullName || activeTicketAthlete.name}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTicketId(null)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ĐĂNG KÝ TIẾP CHO VĐV KHÁC</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch gap-6">
          
          {/* TICKET CARD */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-950/20 rounded-bl-full -z-0 pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">VÉ ĐĂNG KÝ THI ĐẤU</span>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                  isPaid 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" 
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                }`}>
                  {isPaid ? "Đã Ghi Danh & Paid" : "Chờ nộp lệ phí"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase tracking-widest font-mono">Giải Đấu</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{tName}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{tLocation}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-dashed border-slate-200 dark:border-slate-800 py-4">
                <div>
                  <span className="text-[9px] text-slate-450 uppercase block font-mono">Vận Động Viên</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">{activeTicketAthlete.fullName || activeTicketAthlete.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-450 uppercase block font-mono">Số thẻ VSC</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">{activeTicketAthlete.vscNumber || "Thành viên Tự Do"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-450 uppercase block font-mono">Hạng Mục Đăng Ký</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5 capitalize">{activeTicketAthlete.competitionCategory || "Amateur"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-450 uppercase block font-mono">Số BIB của bạn</span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 block mt-0.5">
                    {activeTicketAthlete.bibNumber || "Chờ Admin cấp"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                {isPaid ? (
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-white block">
                    {isPaid ? "Ghi danh & điểm danh thành công" : "Đang chờ khớp lệnh ngân hàng"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isPaid 
                      ? "Bạn đã hoàn tất mọi thủ tục và sẵn sàng bốc thăm phân bệ thi đấu." 
                      : "Vui lòng hoàn thành chuyển khoản lệ phí theo hướng dẫn bên cạnh để được duyệt tự động."}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400">
              <span>Đăng ký lúc: {activeTicketAthlete.registeredAt ? new Date(activeTicketAthlete.registeredAt).toLocaleString("vi-VN") : "Hôm nay"}</span>
              <span className="font-mono">Mã số: {activeTicketAthlete.id.substring(4, 12).toUpperCase()}</span>
            </div>
          </div>

          {/* PAYMENT DETAILS QR CARD */}
          {!isPaid && (
            <div className="lg:w-[380px] bg-indigo-950 text-white rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between space-y-4">
              <div className="text-center w-full">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block font-mono">Thanh Toán Quét Mã VietQR</span>
                <span className="text-lg font-black block mt-1">{formatVND(registrationFee)}</span>
                <p className="text-[10px] text-indigo-200 mt-1">Cổng thanh toán tự động liên kết tài khoản PayOS của Ban tổ chức</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl shadow-inner relative group">
                <img 
                  src={vietQrUrl} 
                  alt="VietQR PayOS" 
                  className="w-44 h-44 object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex flex-col items-center justify-center p-3 text-center text-[10px] text-white">
                  <QrCode className="w-6 h-6 mb-1 text-indigo-400" />
                  <span>Quét mã QR bằng ứng dụng ngân hàng của bạn</span>
                </div>
              </div>

              <div className="w-full bg-indigo-900/40 border border-indigo-800/40 p-3 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-300">Ngân hàng:</span>
                  <span className="font-extrabold flex items-center gap-1 text-white">
                    <span>{bankName}</span>
                    <Copy className="w-3 h-3 text-indigo-400 cursor-pointer hover:text-white" onClick={() => handleCopyText(bankName, "Ngân hàng")} />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-300">Số tài khoản:</span>
                  <span className="font-extrabold flex items-center gap-1 text-white">
                    <span>{bankAccountNumber}</span>
                    <Copy className="w-3 h-3 text-indigo-400 cursor-pointer hover:text-white" onClick={() => handleCopyText(bankAccountNumber, "Số tài khoản")} />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-300">Chủ tài khoản:</span>
                  <span className="font-bold text-white text-[10px] uppercase">{bankAccountName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-indigo-850 pt-2 mt-1">
                  <span className="text-indigo-300">Nội dung chuyển khoản:</span>
                  <span className="font-mono font-extrabold flex items-center gap-1 text-yellow-400">
                    <span>{paymentInfo}</span>
                    <Copy className="w-3 h-3 text-indigo-400 cursor-pointer hover:text-white" onClick={() => handleCopyText(paymentInfo, "Nội dung chuyển khoản")} />
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isVerifying}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>ĐANG KHỚP SỐ DƯ BANCO...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 text-white" />
                    <span>XÁC NHẬN ĐÃ CHUYỂN KHOẢN (TEST)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Bento-style Athlete Badge for paid tickets */}
          {isPaid && (
            <div className="lg:w-[380px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block text-center">
                THẺ VẬN ĐỘNG VIÊN CHÍNH THỨC
              </span>
              {renderAthleteBentoBadge(activeTicketAthlete, "vsc-athlete-badge-ticket")}
            </div>
          )}
        </div>

        {/* GUIDES AND NOTES FOR ATHLETES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
            <HelpCircle className="w-4.5 h-4.5 text-indigo-500" />
            <span>Quy trình nộp lệ phí & Xác nhận tự động</span>
          </h4>
          <ul className="text-[11px] text-slate-550 dark:text-slate-400 list-disc list-inside space-y-1.5">
            <li><strong>Chuyển khoản chính xác nội dung:</strong> Hệ thống sử dụng bộ quét đối chiếu giao dịch ngân hàng thời gian thực qua mã lệnh <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-red-500 font-bold">{paymentInfo}</code>.</li>
            <li><strong>Thời gian duyệt:</strong> Sau khi bạn quét QR và hoàn tất giao dịch trên App ngân hàng, hệ thống sẽ tự động duyệt trong 10-30 giây.</li>
            <li><strong>Kiểm tra bệ bắn:</strong> Khi trạng thái vé chuyển sang <span className="text-emerald-600 font-bold">ĐÃ PAID</span>, bạn sẽ lập tức xuất hiện trong danh sách điểm danh và được gán bệ lượt bắn bởi Trọng tài.</li>
          </ul>
        </div>

        {renderRegisteredAthletesList()}
      </div>
    );
  }

  // 1. GUEST USER OR CLOSED SPECTATOR VIEW FOR PUBLIC REGISTRATION
  if (!currentUser || (isPortalClosed && !userAthleteProfile)) {
    return (
      <div className="space-y-6 animate-fadeIn text-left max-w-4xl mx-auto">
        {/* HEADER HERO BANNER OF THE TOURNAMENT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/45 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Thông tin giải đấu</span>
            </div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              {tName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{tLocation}</span>
              </span>
              {tStart && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{new Date(tStart).toLocaleDateString("vi-VN")} - {tEnd ? new Date(tEnd).toLocaleDateString("vi-VN") : ""}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 shrink-0">
            <Wallet className="w-5 h-5 text-red-650" />
            <div>
              <span className="text-[9px] text-slate-450 uppercase block font-mono">Lệ phí thi đấu</span>
              <span className="text-sm font-extrabold text-red-700 dark:text-red-400 block mt-0.5">{formatVND(registrationFee)}</span>
            </div>
          </div>
        </div>

        {/* STATUS BANNER */}
        {(tStatus === "registration" || tStatus === "draft") ? (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/15 border border-red-200 dark:border-red-900/50 p-6 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 animate-pulse text-red-650" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-black text-red-700 dark:text-red-400 uppercase">HÃY ĐĂNG NHẬP ĐỂ ĐĂNG KÝ THI ĐẤU</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Cổng đăng ký trực tuyến giải đấu <strong>{tName}</strong> đang mở rộng cửa! Vui lòng đăng nhập bằng tài khoản của bạn để liên kết hồ sơ VĐV VSC hoặc ghi danh tham gia thi đấu chính thức.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-3xl text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-black text-amber-800 dark:text-amber-400 uppercase">GIẢI ĐẤU ĐÃ KHÓA ĐĂNG KÝ HOẶC ĐÃ KẾT THÚC</h3>
              <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed">
                Cổng đăng ký đã đóng. Giải đấu hiện đang ở trạng thái <strong className="capitalize text-amber-600">"{tStatus}"</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PORTAL IS CLOSED / STEP 2+ MESSAGE FOR REGISTERED ATHLETES
  if (isStep2OrLater) {
    // If the user is logged in and is a registered athlete in this tournament, let them bốc thăm BIB and view their card!
    if (currentUser && userAthleteProfile) {
      // Find Heat & Lane assignment
      const ccs = currentTournamentDoc?.commandCenterState;
      let assignedHeatNum: number | null = null;
      let assignedLaneNum: number | null = null;

      if (ccs && ccs.heats) {
        const athId = userAthleteProfile.id || userAthleteProfile.participantId;
        for (const heat of ccs.heats) {
          const foundLane = (heat.lanes || []).find((l: any) => l.participantId === athId || l.athleteId === athId);
          if (foundLane) {
            assignedHeatNum = heat.heatNumber;
            assignedLaneNum = foundLane.laneNumber;
            break;
          }
        }
      }

      return (
        <div className="space-y-8 animate-fadeIn text-left max-w-4xl mx-auto">
          {/* Closed Portal & Athlete Status Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/45 border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-[9px] font-black rounded-md uppercase tracking-wider mb-1.5">
                  Cổng Đăng Ký Đã Đóng
                </div>
                <h3 className="text-base font-black text-slate-950 dark:text-white uppercase leading-none mt-1">XÁC NHẬN THAM GIA THÀNH CÔNG</h3>
                <p className="text-xs text-slate-500 mt-1.5">
                  Cổng ghi danh đã chính thức khép lại. Hồ sơ thi đấu của bạn đã được lưu giữ chính thức trên Hệ Thống VSC.
                </p>
              </div>
            </div>

            {/* Athlete quick info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Họ Tên VĐV</span>
                <span className="font-extrabold text-slate-800 dark:text-white uppercase">{userAthleteProfile.fullName || userAthleteProfile.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Hạng Mục</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{userAthleteProfile.competitionCategory || "Amateur"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Số thẻ VSC</span>
                <span className="font-extrabold text-slate-850 dark:text-slate-200">{userAthleteProfile.vscNumber || "Không có"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">Câu lạc bộ</span>
                <span className="font-extrabold text-slate-850 dark:text-slate-200">{userAthleteProfile.clubName || userAthleteProfile.team || "Tự Do"}</span>
              </div>
            </div>
          </div>

          {/* BIB DRAW AREA OR THE TOURNAMENT MATCH CARD */}
          {isStep2BibDrawActive ? (
            !userAthleteProfile.bibNumber ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/60 dark:to-slate-900/40 border border-indigo-100 dark:border-slate-800 rounded-3xl p-6 shadow-md text-center space-y-6">
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 mb-2">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase">GIAI ĐOẠN 2: TỰ BỐC THĂM SỐ BIB THI ĐẤU</h4>
                  <p className="text-xs text-indigo-600/70 dark:text-slate-400 leading-relaxed">
                    Ban tổ chức đã mở Giai đoạn 2 (Điểm danh & Bốc thăm). Hãy nhấn nút bên dưới để bốc thăm ngẫu nhiên số hiệu báo danh (BIB) của bạn. Bạn chỉ được phép bốc thăm <strong>duy nhất 1 lần</strong>.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawModalOpen(true)}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 cursor-pointer inline-flex items-center gap-2.5"
                  >
                    <Dices className="w-5 h-5 text-white" />
                    <span>BẮT ĐẦU BỐC THĂM SỐ BIB</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">THẺ VẬN ĐỘNG VIÊN CHÍNH THỨC</span>
                  <p className="text-[10px] text-slate-500 italic mt-0.5">Mỗi vận động viên có một thẻ thi đấu được in ra bởi Ban tổ chức.</p>
                </div>

                {renderAthleteBentoBadge(userAthleteProfile, "vsc-athlete-badge-closed")}
              </div>
            )
          ) : (
            // Step 3 or later: Thi đấu / Kết thúc -> ĐÓNG tính năng bốc thăm BIB
            <div className="space-y-6">
              {!userAthleteProfile.bibNumber && (
                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 shadow-xs text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-1">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase">ĐÃ ĐÓNG TỰ BỐC THĂM SỐ BIB (GIAI ĐOẠN THI ĐẤU)</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Giải đấu đã chuyển sang Giai đoạn 3 (Thi Đấu). Chức năng tự bốc thăm số hiệu BIB trực tuyến đã khép lại. Nếu bạn chưa có số BIB, vui lòng liên hệ trực tiếp <strong>Tổ Trọng Tài / Ban Tổ Chức</strong> tại bàn kỹ thuật.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">THẺ VẬN ĐỘNG VIÊN CHÍNH THỨC</span>
                <p className="text-[10px] text-slate-500 italic mt-0.5">Mỗi vận động viên có một thẻ thi đấu được in ra bởi Ban tổ chức.</p>
              </div>

              {renderAthleteBentoBadge(userAthleteProfile, "vsc-athlete-badge-closed")}
            </div>
          )}

          {/* CONFIRMATION MODAL */}
          {isDrawModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 text-center">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 animate-bounce" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-950 dark:text-white uppercase">XÁC NHẬN BỐC THĂM</h4>
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    Hãy xác nhận, bạn chỉ được bốc thăm <strong>1 lần duy nhất</strong>. Khi hệ thống đã gán số BIB cho hồ sơ của bạn, bạn sẽ không thể thay đổi.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawModalOpen(false)}
                    disabled={isDrawing}
                    className="flex-1 py-2.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] rounded-xl transition cursor-pointer"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="button"
                    onClick={handleDrawBib}
                    disabled={isDrawing}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 dark:shadow-none"
                  >
                    {isDrawing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>ĐANG BỐC...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                        <span>XÁC NHẬN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {renderRegisteredAthletesList()}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl min-h-[400px]">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">CỔNG ĐĂNG KÝ ĐÃ ĐÓNG</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          Giải đấu {tName} hiện đang ở trạng thái <strong className="text-indigo-600 dark:text-indigo-400 capitalize">"{tStatus}"</strong>. Cổng đăng ký vận động viên trực tuyến chỉ mở khi giải đấu đang ở trạng thái <strong>"Mở Đăng Ký (Registration)"</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left max-w-4xl mx-auto">
      
      {/* HEADER HERO BANNER OF THE TOURNAMENT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cổng đăng ký trực tuyến mở</span>
          </div>
          <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
            {tName}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{tLocation}</span>
            </span>
            {tStart && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{new Date(tStart).toLocaleDateString("vi-VN")} - {tEnd ? new Date(tEnd).toLocaleDateString("vi-VN") : ""}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 shrink-0">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <div>
            <span className="text-[9px] text-slate-450 uppercase block font-mono">Lệ phí thi đấu</span>
            <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 block mt-0.5">{formatVND(registrationFee)}</span>
          </div>
        </div>
      </div>

      {/* REGISTRATION FORM */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase">Thông Tin Ghi Danh Vận Động Viên</span>
          </div>
          
          {/* REGISTRATION TYPE - FORCED TO SYSTEM */}
          <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase tracking-wider shrink-0">
            Hệ Thống Thành Viên VSC
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleRegister} className="space-y-6">

            {/* SECTOR 1: MAIN REGISTER / VIEW PROFILE AREA */}
            {!isRegisteringForSomeoneElse && (
              <div className="space-y-6 animate-fadeIn">
                {regMode === "system" && linkedSystemAthlete && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">HỒ SƠ ĐÃ LIÊN KẾT CHÍNH THỨC</span>
                        <span className="text-[10px] text-slate-500">Tài khoản của bạn đã được xác minh liên kết vĩnh viễn với vận động viên hệ thống.</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Họ & Tên VĐV</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{linkedSystemAthlete.fullName || linkedSystemAthlete.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Số thẻ VSC</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono uppercase">{linkedSystemAthlete.vscNumber || "Không có"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Câu lạc bộ</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{linkedSystemAthlete.clubName || linkedSystemAthlete.team || "Tự Do"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Tỉnh thành</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{linkedSystemAthlete.province || "Chưa rõ"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Ngày sinh</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{linkedSystemAthlete.dob || "Chưa cập nhật"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Giới tính</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{linkedSystemAthlete.gender || "Nam"}</span>
                      </div>
                    </div>

                    {/* DYNAMIC REGISTRATION STATUS FOR OWN REGISTERED ATHLETE */}
                    {ownRegisteredAthlete && (
                      <div className="space-y-3">
                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${ownRegisteredAthlete.paymentStatus === "paid" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                                BẠN ĐÃ ĐĂNG KÝ THI ĐẤU THÀNH CÔNG GIẢI NÀY
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Hạng mục: <strong>{ownRegisteredAthlete.competitionCategory || "Amateur"}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                              ownRegisteredAthlete.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-900/50"
                                : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-900/50"
                            }`}>
                              {ownRegisteredAthlete.paymentStatus === "paid" ? "ĐÃ ĐÓNG" : "CHỜ NỘP LỆ PHÍ"}
                            </span>
                          </div>
                        </div>

                        {/* SELF BIB DRAW OR BADGE */}
                        {!ownRegisteredAthlete.bibNumber ? (
                          isStep2BibDrawActive ? (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/60 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4.5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <Sparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase">GIAI ĐOẠN 2: TỰ BỐC THĂM SỐ BIB THI ĐẤU</h4>
                                  <p className="text-[11px] text-indigo-600/80 dark:text-slate-400">
                                    Ban tổ chức đã mở Giai đoạn 2. Hãy bốc thăm số hiệu báo danh (BIB) của bạn.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenDrawModal(ownRegisteredAthlete)}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                              >
                                <Dices className="w-4 h-4 text-white" />
                                <span>BỐC THĂM SỐ BIB</span>
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">SỐ HIỆU BIB (CHỜ BỐC THĂM TẠI STEP 2)</h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Hồ sơ thi đấu đã được ghi nhận. Tính năng <strong>tự bốc thăm số hiệu BIB</strong> sẽ mở khi Ban tổ chức chuyển sang <strong>Giai đoạn 2 (Điểm danh & Bốc thăm)</strong>.
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase rounded-lg border border-indigo-150 dark:border-indigo-900/40 shrink-0">
                                Mở tại Step 2
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="pt-2">
                            {renderAthleteBentoBadge(ownRegisteredAthlete, "vsc-athlete-badge-own")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* IF PENDING LINKED CLAIM */}
                {regMode === "system" && !linkedSystemAthlete && pendingSystemAthlete && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">YÊU CẦU LIÊN KẾT ĐANG CHỜ PHÊ DUYỆT</span>
                        <span className="text-[10px] text-slate-500">Ban tổ chức đang xác minh yêu cầu liên kết tài khoản của bạn với hồ sơ VĐV hệ thống bên dưới.</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-100 dark:border-amber-950 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Họ & Tên VĐV</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pendingSystemAthlete.fullName || pendingSystemAthlete.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Số thẻ VSC</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono uppercase">{pendingSystemAthlete.vscNumber || "Không có"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Câu lạc bộ</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pendingSystemAthlete.clubName || pendingSystemAthlete.team || "Tự Do"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Tỉnh thành</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pendingSystemAthlete.province || "Chưa rõ"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Ngày sinh</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pendingSystemAthlete.dob || "Chưa cập nhật"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Giới tính</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pendingSystemAthlete.gender || "Nam"}</span>
                      </div>
                    </div>

                    {/* DYNAMIC REGISTRATION STATUS FOR PENDING CLAIM REGISTERED ATHLETE */}
                    {pendingRegisteredAthlete && (
                      <div className="space-y-3">
                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${pendingRegisteredAthlete.paymentStatus === "paid" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                                BẠN ĐÃ ĐĂNG KÝ THI ĐẤU THÀNH CÔNG GIẢI NÀY
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Hạng mục: <strong>{pendingRegisteredAthlete.competitionCategory || "Amateur"}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                              pendingRegisteredAthlete.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-900/50"
                                : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-900/50"
                            }`}>
                              {pendingRegisteredAthlete.paymentStatus === "paid" ? "ĐÃ ĐÓNG" : "CHỜ NỘP LỆ PHÍ"}
                            </span>
                          </div>
                        </div>

                        {/* SELF BIB DRAW OR BADGE */}
                        {!pendingRegisteredAthlete.bibNumber ? (
                          isStep2BibDrawActive ? (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/60 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4.5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <Sparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase">GIAI ĐOẠN 2: TỰ BỐC THĂM SỐ BIB THI ĐẤU</h4>
                                  <p className="text-[11px] text-indigo-600/80 dark:text-slate-400">
                                    Ban tổ chức đã mở Giai đoạn 2. Hãy bốc thăm số hiệu báo danh (BIB) của bạn.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenDrawModal(pendingRegisteredAthlete)}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                              >
                                <Dices className="w-4 h-4 text-white" />
                                <span>BỐC THĂM SỐ BIB</span>
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">SỐ HIỆU BIB (CHỜ BỐC THĂM TẠI STEP 2)</h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Hồ sơ thi đấu đã được ghi nhận. Tính năng <strong>tự bốc thăm số hiệu BIB</strong> sẽ mở khi Ban tổ chức chuyển sang <strong>Giai đoạn 2 (Điểm danh & Bốc thăm)</strong>.
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase rounded-lg border border-indigo-150 dark:border-indigo-900/40 shrink-0">
                                Mở tại Step 2
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="pt-2">
                            {renderAthleteBentoBadge(pendingRegisteredAthlete, "vsc-athlete-badge-pending")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* NO PROFILE LINKED YET: SEARCH AND SELECT PROFILE */}
                {regMode === "system" && !linkedSystemAthlete && !pendingSystemAthlete && !selectedMaster && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 p-4.5 rounded-2xl space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-indigo-300 block">
                      Tìm kiếm hồ sơ của bạn trên Hệ Thống VSC để liên kết và đăng ký:
                    </span>
                    <div className="relative">
                      <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nhập Tên, Số thẻ VSC, hoặc Mã vận động viên..."
                        className="w-full pl-10 pr-3 py-2.5 h-11 text-xs bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    {loadingMaster ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải danh sách VĐV hệ thống...</span>
                      </div>
                    ) : filteredMasterAthletes.length > 0 ? (
                      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                        {filteredMasterAthletes.map((athlete, idx) => (
                          <button
                            key={`master-self-${athlete.id || 'ath'}-${idx}`}
                            type="button"
                            onClick={() => handleSelectMaster(athlete)}
                            className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-extrabold text-slate-800 dark:text-white block">{athlete.fullName || athlete.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {athlete.clubName || athlete.team || "Tự Do"} • {athlete.province || "Hà Nội"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-mono text-[9px] font-black uppercase">
                                {athlete.vscNumber || "Mã: " + athlete.id.substring(0,6)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 inline-block ml-1.5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <p className="text-[10px] text-slate-500 italic font-medium">Không tìm thấy vận động viên nào khớp với từ khóa tìm kiếm.</p>
                    ) : null}
                  </div>
                )}

                {/* SEARCH SELECTION SUCCESS BANNER */}
                {regMode === "system" && !linkedSystemAthlete && !pendingSystemAthlete && selectedMaster && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase block">
                          Hồ sơ sẽ liên kết khi đăng ký!
                        </span>
                        <span className="text-[10px] text-slate-500">
                          VĐV: <strong>{selectedMaster.fullName || selectedMaster.name}</strong> • VSC: {selectedMaster.vscNumber || "Thành viên Tự Do"} 
                          {" (Sẽ được liên kết vĩnh viễn với tài khoản của bạn sau khi gửi đăng ký này)."}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMaster(null)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg transition"
                    >
                      Chọn Lại
                    </button>
                  </div>
                )}

                {/* CATEGORY & NOTES INPUT FIELDS FOR NEW REGISTRATION (ONLY IF THEY ARE SELECTING OR NOT REGISTERED YET) */}
                {((selectedMaster) || (!linkedSystemAthlete && !pendingSystemAthlete) || (linkedSystemAthlete && !ownRegisteredAthlete) || (pendingSystemAthlete && !pendingRegisteredAthlete)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Hạng Mục Đăng Ký</label>
                      <select
                        value={competitionCategory}
                        onChange={(e) => setCompetitionCategory(e.target.value)}
                        className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold"
                      >
                        {COMPETITION_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Ghi chú thêm</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Yêu cầu bệ bắn, thời gian di chuyển, v.v..."
                        className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* SUBMIT BUTTON OR VIEW TICKET ACTION AREA */}
                <div className="border-t border-slate-150 dark:border-slate-800 pt-5 text-right">
                  {/* IF ALREADY REGISTERED: SHOW 'XEM VÉ / QR' BUTTON */}
                  {(linkedSystemAthlete && ownRegisteredAthlete) || (pendingSystemAthlete && pendingRegisteredAthlete) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = ownRegisteredAthlete?.id || pendingRegisteredAthlete?.id;
                        if (targetId) {
                          setActiveTicketId(targetId);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4 text-white" />
                      <span>XEM VÉ / QR</span>
                    </button>
                  ) : (
                    /* IF NOT REGISTERED YET AND PROFILE READY: SHOW 'XÁC NHẬN ĐĂNG KÝ & THANH TOÁN' BUTTON */
                    (selectedMaster || linkedSystemAthlete || pendingSystemAthlete) && (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>ĐANG TIẾP NHẬN ĐĂNG KÝ...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 text-white" />
                            <span>XÁC NHẬN ĐĂNG KÝ & THANH TOÁN</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* SECTOR 2: REGISTER FOR SOMEONE ELSE AREA (IF OPTION CHECKED) */}
            {isRegisteringForSomeoneElse && (
              <div className="space-y-6 animate-fadeIn">
                {/* SEARCH BOX FOR SYSTEM ATHLETES (ONLY WHEN NOT SELECTED YET) */}
                {!selectedMaster ? (
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 p-4.5 rounded-2xl space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-indigo-300 block">
                      Tìm kiếm hồ sơ vận động viên trên Hệ Thống VSC để đăng ký hộ:
                    </span>
                    <div className="relative">
                      <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nhập Tên, Số thẻ VSC, hoặc Mã vận động viên..."
                        className="w-full pl-10 pr-3 py-2.5 h-11 text-xs bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    {loadingMaster ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải danh sách VĐV hệ thống...</span>
                      </div>
                    ) : filteredMasterAthletes.length > 0 ? (
                      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                        {filteredMasterAthletes.map((athlete, idx) => (
                          <button
                            key={`master-other-${athlete.id || 'ath'}-${idx}`}
                            type="button"
                            onClick={() => handleSelectMaster(athlete)}
                            className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-extrabold text-slate-800 dark:text-white block">{athlete.fullName || athlete.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {athlete.clubName || athlete.team || "Tự Do"} • {athlete.province || "Hà Nội"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-mono text-[9px] font-black uppercase">
                                {athlete.vscNumber || "Mã: " + athlete.id.substring(0,6)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 inline-block ml-1.5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <p className="text-[10px] text-slate-500 italic font-medium">Không tìm thấy vận động viên nào khớp với từ khóa tìm kiếm.</p>
                    ) : null}
                  </div>
                ) : (
                  /* SELECTION SUCCESS BANNER FOR REGISTERING ON BEHALF */
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase block">
                          Đăng ký thi đấu hộ thành công!
                        </span>
                        <span className="text-[10px] text-slate-500">
                          VĐV: <strong>{selectedMaster.fullName || selectedMaster.name}</strong> • VSC: {selectedMaster.vscNumber || "Thành viên Tự Do"} 
                          {" (Hồ sơ này sẽ KHÔNG liên kết với tài khoản của bạn)."}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMaster(null)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg transition"
                    >
                      Chọn Lại
                    </button>
                  </div>
                )}

                {/* CATEGORY & NOTES INPUT FIELDS FOR REGISTERING ON BEHALF */}
                {selectedMaster && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Hạng Mục Đăng Ký</label>
                        <select
                          value={competitionCategory}
                          onChange={(e) => setCompetitionCategory(e.target.value)}
                          className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold"
                        >
                          {COMPETITION_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Ghi chú thêm</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Yêu cầu bệ bắn, thời gian di chuyển, v.v..."
                          className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-150 dark:border-slate-800 pt-5 text-right">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>ĐANG TIẾP NHẬN ĐĂNG KÝ...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 text-white" />
                            <span>XÁC NHẬN ĐĂNG KÝ & THANH TOÁN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BASIC FORM FIELDS FOR FREE REGISTRATION MODE */}
            {regMode === "free" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Họ và Tên</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Hữu Hiệp"
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Ngày sinh</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Giới tính</label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Tỉnh thành</label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Ví dụ: Lâm Đồng"
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Câu lạc bộ / Đội bắn</label>
                    <input
                      type="text"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      placeholder="Ví dụ: CLB Slingshot Bảo Lộc"
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* HẠNG MỤC THI ĐẤU - USER SELECTS */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Hạng Mục Đăng Ký</label>
                    <select
                      value={competitionCategory}
                      onChange={(e) => setCompetitionCategory(e.target.value)}
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold"
                    >
                      {COMPETITION_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left md:col-span-2">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Ghi chú thêm</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Yêu cầu bệ bắn, thời gian di chuyển, v.v..."
                      className="w-full px-3 py-2 h-10 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                </div>

                <div className="border-t border-slate-150 dark:border-slate-800 pt-5 text-right">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>ĐANG TIẾP NHẬN ĐĂNG KÝ...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-white" />
                        <span>XÁC NHẬN ĐĂNG KÝ & THANH TOÁN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SECTOR 3: CHECKBOX "Tôi muốn đăng ký thi đấu hộ cho VĐV hệ thống khác" (PLACED AFTER THE PRIMARY SECTION) */}
            {regMode === "system" && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 mt-4">
                <input
                  id="onBehalfCheckbox"
                  type="checkbox"
                  checked={isRegisteringForSomeoneElse}
                  onChange={(e) => {
                    setIsRegisteringForSomeoneElse(e.target.checked);
                    setSelectedMaster(null);
                    setFullName("");
                    setVscNumber("");
                  }}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="onBehalfCheckbox" className="text-xs font-black text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                  Tôi muốn đăng ký thi đấu hộ cho VĐV hệ thống khác (Không liên kết tài khoản)
                </label>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* MY REGISTRATIONS TABLE */}
      {(() => {
        const myRegs = athletesList.filter(a => {
          const isLocal = sessionMyRegs.includes(a.id) || sessionMyRegs.includes(a.participantId || "");
          const isUserUid = currentUser?.uid && (a as any).registeredByUid === currentUser.uid;
          const isUserEmail = currentUser?.email && (
            a.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase() ||
            (a as any).registeredByEmail?.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
          );
          return isLocal || isUserUid || isUserEmail;
        });

        if (myRegs.length === 0) return null;

        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Danh Sách VĐV Bạn Đã Ghi Danh ({myRegs.length})</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <th className="py-2.5">Họ và Tên</th>
                    <th className="py-2.5">Số thẻ VSC / ID</th>
                    <th className="py-2.5">Phân khúc / Hạng Mục</th>
                    <th className="py-2.5">Lệ phí</th>
                    <th className="py-2.5 text-right">Mã Vé / Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {myRegs.map(reg => {
                    const isPaid = reg.paymentStatus === "paid";
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-all">
                        <td className="py-3">
                          <span className="font-extrabold text-slate-800 dark:text-white block">{reg.fullName || reg.name}</span>
                          <span className="text-[10px] text-slate-500">{reg.clubName || reg.team || "Tự Do"}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{reg.vscNumber || "Không có/Tự Do"}</span>
                        </td>
                        <td className="py-3 font-medium capitalize">
                          {reg.competitionCategory || "Amateur"}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black rounded uppercase ${
                            isPaid 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" 
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                          }`}>
                            {isPaid ? "Đã Đóng" : "Chờ nộp lệ phí"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleDeletePendingRegistration(reg)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all uppercase flex items-center gap-1"
                                title="Xóa đăng ký"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTicketId(reg.id);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all uppercase flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Xem Vé / QR</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {/* GLOBAL CONFIRMATION MODAL FOR BIB DRAW */}
      {isDrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-base font-black text-slate-950 dark:text-white uppercase">XÁC NHẬN BỐC THĂM</h4>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                Hãy xác nhận, bạn chỉ được bốc thăm <strong>1 lần duy nhất</strong>. Khi hệ thống đã gán số BIB cho hồ sơ của bạn, bạn sẽ không thể thay đổi.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDrawModalOpen(false)}
                disabled={isDrawing}
                className="flex-1 py-2.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] rounded-xl transition cursor-pointer"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                onClick={handleDrawBib}
                disabled={isDrawing}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 dark:shadow-none"
              >
                {isDrawing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ĐANG BỐC...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                    <span>XÁC NHẬN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
