import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  MasterClub, 
  MasterAthlete, 
  ClubRequest,
  ClubHistoryItem
} from "../types";
import { 
  subscribeToVscSystemClubs, 
  saveVscSystemClubs,
  subscribeToVscSystemAthletes,
  saveVscSystemAthletes,
  saveVscSystemAthleteSingle,
  deleteVscSystemAthleteSingle,
  subscribeToVscClubRequests,
  saveVscClubRequests,
  addVscAuditLog,
  subscribeToTournamentsList
} from "../lib/firebaseService";
import { calculateAthleteCareerStats } from "../utils/careerCalculator";
import { compressLogo, compressBanner } from "../utils/imageCompressor";
import { 
  Building, 
  Users, 
  Calendar, 
  MapPin, 
  Award, 
  Check, 
  X, 
  Search, 
  Plus, 
  PlusCircle,
  Edit3, 
  Trash2, 
  ArrowLeft, 
  UserPlus, 
  Crown, 
  ShieldAlert, 
  CheckCircle, 
  XCircle,
  FileSpreadsheet, 
  Save, 
  Upload, 
  User, 
  IdCard, 
  QrCode, 
  History, 
  Shield, 
  MessageSquare,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Trophy,
  Globe,
  Phone,
  Facebook
} from "lucide-react";
import * as XLSX from "xlsx";
import { AVATAR_MALE, AVATAR_FEMALE } from "./AthleteRegistry";

export const DEFAULT_CLUB_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e0e7ff'/><path d='M30 30h40v40H30z' fill='%234f46e5'/><path d='M40 40h20v20H40z' fill='%23ffffff'/></svg>";
export const DEFAULT_CLUB_BANNER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 200'><rect width='800' height='200' fill='%231e1b4b'/><circle cx='400' cy='100' r='80' fill='%23312e81'/><text x='400' y='110' fill='%23818cf8' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>VSC CLUB SPACE</text></svg>";

interface ClubManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function ClubManagement({ currentUser, userRole }: ClubManagementProps) {
  const [masterClubs, setMasterClubs] = useState<MasterClub[]>([]);
  const [masterAthletes, setMasterAthletes] = useState<MasterAthlete[]>([]);
  const [clubRequests, setClubRequests] = useState<ClubRequest[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");

  // Selected view states
  const [activeClub, setActiveClub] = useState<MasterClub | null>(null);
  const [viewingAthlete, setViewingAthlete] = useState<MasterAthlete | null>(null);
  const [showAthleteCard, setShowAthleteCard] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [modalSubTab, setModalSubTab] = useState<"general" | "performance" | "matches" | "achievements">("general");
  const [tournaments, setTournaments] = useState<any[]>([]);

  // Subscribe to live tournaments list
  useEffect(() => {
    const unsubscribe = subscribeToTournamentsList((data) => {
      setTournaments(data);
    });
    return () => unsubscribe();
  }, []);

  // Calculate career stats for viewingAthlete
  const viewingAthleteCareerStats = useMemo(() => {
    if (!viewingAthlete) return null;
    return calculateAthleteCareerStats(viewingAthlete.id, viewingAthlete.fullName, tournaments);
  }, [viewingAthlete, tournaments]);

  // Calculate profile completeness percentage for the viewingAthlete
  const activeCompletionPercentage = useMemo(() => {
    if (!viewingAthlete) return 0;
    let fields = 0;
    let filled = 0;
    const checkList = ["fullName", "vscNumber", "gender", "dob", "province", "clubName", "phone", "facebook", "zalo", "biography", "slingshotType", "bandSpec", "ammoSize", "shootingStance"];
    checkList.forEach((f) => {
      fields++;
      if ((viewingAthlete as any)[f]) filled++;
    });
    return Math.round((filled / fields) * 100);
  }, [viewingAthlete]);

  // Modal forms
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<MasterClub>>({});
  const [showAssignPresidentModal, setShowAssignPresidentModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedAddMemberId, setSelectedAddMemberId] = useState("");

  const [deleteClubConfirm, setDeleteClubConfirm] = useState<{ id: string, name: string } | null>(null);
  const [kickMemberConfirm, setKickMemberConfirm] = useState<{ athlete: any, isSelf: boolean, reason: string } | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showPermissionsTable, setShowPermissionsTable] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "system_owner";

  // Check if current user is president of selected club
  const linkedAthlete = currentUser ? masterAthletes.find(a => a.linkedUserId === currentUser.uid) : null;
  const isClubPresident = activeClub && linkedAthlete && activeClub.leaderAthleteId === linkedAthlete.id;

  const getCurrentRoleLabel = (clubContext?: MasterClub | null) => {
    if (isAdmin) return "Quản trị viên Hệ thống";
    if (userRole === "referee") return "Trọng tài hệ thống";
    
    const target = clubContext || activeClub;
    if (target && linkedAthlete && target.leaderAthleteId === linkedAthlete.id) {
      return `Chủ tịch CLB: ${target.clubName}`;
    }
    if (linkedAthlete && linkedAthlete.clubId && linkedAthlete.clubId !== "free" && linkedAthlete.clubId !== "Free") {
      const athleteClub = masterClubs.find(c => c.id === linkedAthlete.clubId);
      return `Thành viên CLB: ${athleteClub ? athleteClub.clubName : linkedAthlete.clubName}`;
    }
    if (linkedAthlete) {
      return "Vận động viên tự do";
    }
    if (currentUser) {
      return "Tài khoản thành viên";
    }
    return "Khách vãng lai / Khán giả";
  };

  const hasClubPermission = (
    action: "CREATE" | "EDIT" | "DELETE" | "ASSIGN_PRESIDENT" | "MANAGE_REQUESTS" | "KICK_MEMBER" | "ADD_ACHIEVEMENT" | "EXPORT" | "LEAVE" | "JOIN",
    targetClub?: MasterClub | null
  ) => {
    if (isAdmin) return true;
    if (!currentUser) return false;

    const activeTarget = targetClub || activeClub;
    const isPresidentOfTarget = activeTarget && linkedAthlete && activeTarget.leaderAthleteId === linkedAthlete.id;

    switch (action) {
      case "CREATE":
      case "DELETE":
      case "ASSIGN_PRESIDENT":
        return false;
      
      case "EDIT":
      case "MANAGE_REQUESTS":
      case "KICK_MEMBER":
      case "ADD_ACHIEVEMENT":
        return !!isPresidentOfTarget;

      case "EXPORT":
        return userRole === "referee" || !!isPresidentOfTarget;

      case "LEAVE":
        if (!linkedAthlete || !activeTarget) return false;
        if (linkedAthlete.clubId !== activeTarget.id) return false;
        return !isPresidentOfTarget;

      case "JOIN":
        // A logged in user with linked athlete can join if they don't have a club already
        return true;

      default:
        return false;
    }
  };

  useEffect(() => {
    // Sync Clubs
    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setMasterClubs(data || []);
    });

    // Sync Athletes
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      const mapped = data.map((ath: any) => ({
        id: ath.id || ath.athleteId,
        vscNumber: ath.vscNumber || ath.idCard || `VSC-${ath.id}`,
        fullName: ath.fullName || ath.name || "",
        nickname: ath.nickname || "",
        gender: ath.gender || "Nam",
        dob: ath.dob || "",
        avatarUrl: ath.avatarUrl || (ath.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE),
        province: ath.province || "Hà Nội",
        country: ath.country || "Việt Nam",
        clubId: ath.clubId || ath.team || "",
        clubName: ath.clubName || ath.teamName || "",
        registeredClubId: ath.registeredClubId || "",
        registeredClubName: ath.registeredClubName || "",
        clubHistory: ath.clubHistory || [],
        qrCode: ath.qrCode || "",
        phone: ath.phone || "",
        facebook: ath.facebook || "",
        zalo: ath.zalo || "",
        biography: ath.biography || "",
        emergencyContact: ath.emergencyContact || "",
        personalNotes: ath.personalNotes || "",
        status: ath.status || "active",
        linkedUserId: ath.linkedUserId || "",
        claimStatus: ath.claimStatus || "unclaimed",
        createdAt: ath.createdAt || new Date().toISOString(),
        updatedAt: ath.updatedAt || new Date().toISOString()
      } as MasterAthlete));
      setMasterAthletes(mapped);
    });

    // Sync Club join requests
    const unsubRequests = subscribeToVscClubRequests((data) => {
      setClubRequests(data || []);
    });

    return () => {
      unsubClubs();
      unsubAthletes();
      unsubRequests();
    };
  }, []);

  // Sync active club details when master list updates
  useEffect(() => {
    if (activeClub) {
      const updated = masterClubs.find((c) => c.id === activeClub.id);
      if (updated) {
        const logo1 = updated.logoUrl || "";
        const logo2 = activeClub.logoUrl || "";
        const banner1 = updated.bannerUrl || "";
        const banner2 = activeClub.bannerUrl || "";
        const name1 = updated.clubName || "";
        const name2 = activeClub.clubName || "";
        const desc1 = updated.description || "";
        const desc2 = activeClub.description || "";
        const leader1 = updated.leaderAthleteId || "";
        const leader2 = activeClub.leaderAthleteId || "";
        const count1 = updated.memberCount || 0;
        const count2 = activeClub.memberCount || 0;
        const achievements1 = JSON.stringify(updated.achievements || []);
        const achievements2 = JSON.stringify(activeClub.achievements || []);

        if (
          logo1 !== logo2 ||
          banner1 !== banner2 ||
          name1 !== name2 ||
          desc1 !== desc2 ||
          leader1 !== leader2 ||
          count1 !== count2 ||
          achievements1 !== achievements2
        ) {
          setActiveClub(updated);
        }
      }
    }
  }, [masterClubs, activeClub]);

  // Self-heal any clubs with empty clubCode by assigning sequential codes starting from CLB-0001
  useEffect(() => {
    if (masterClubs.length === 0) return;

    let hasEmpty = false;
    const taken = new Set<number>();

    // Collect all valid numbers
    masterClubs.forEach((c) => {
      if (c.clubCode && c.clubCode.trim() !== "") {
        const match = c.clubCode.match(/CLB-(\d+)/i);
        if (match) {
          taken.add(parseInt(match[1], 10));
        }
      } else {
        hasEmpty = true;
      }
    });

    if (hasEmpty) {
      let currentSeq = 1;
      const updatedClubs = masterClubs.map((c) => {
        if (!c.clubCode || c.clubCode.trim() === "") {
          while (taken.has(currentSeq)) {
            currentSeq++;
          }
          const assignedCode = `CLB-${currentSeq.toString().padStart(4, "0")}`;
          taken.add(currentSeq);
          return { ...c, clubCode: assignedCode };
        }
        return c;
      });

      // Update local state first to prevent infinite loop
      setMasterClubs(updatedClubs);
      // Persist the healed list back to Firestore
      saveClubsList(updatedClubs);
    }
  }, [masterClubs]);

  // Scroll lock when any modal is open
  useEffect(() => {
    const isAnyModalOpen = !!(
      viewingAthlete || 
      showAssignPresidentModal || 
      showAddEditModal || 
      showAddMemberModal || 
      deleteClubConfirm || 
      kickMemberConfirm
    );
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    viewingAthlete, 
    showAssignPresidentModal, 
    showAddEditModal, 
    showAddMemberModal, 
    deleteClubConfirm, 
    kickMemberConfirm
  ]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleClaimProfile = async (athlete: MasterAthlete) => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để gửi yêu cầu liên kết!", "error");
      return;
    }

    const alreadyLinked = masterAthletes.find(a => a.linkedUserId === currentUser.uid);
    if (alreadyLinked) {
      showToast(`Tài khoản của bạn đã được liên kết với vận động viên ${alreadyLinked.fullName}!`, "error");
      return;
    }

    const updatedList = masterAthletes.map(item => {
      if (item.id === athlete.id) {
        return { 
          ...item, 
          claimStatus: "pending_review" as const, 
          linkedUserId: currentUser.uid 
        };
      }
      return item;
    });

    setMasterAthletes(updatedList);
    await saveAthletesList(updatedList);
    await addVscAuditLog({
      userId: currentUser?.uid || "system",
      userEmail: currentUser?.email || "anonymous",
      action: "LINK_ACCOUNT_REQUEST",
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      details: "Yêu cầu liên kết tài khoản vận động viên: " + athlete.fullName,
      timestamp: new Date().toISOString()
    });
    showToast("Đã gửi yêu cầu xác thực liên kết đến ban quản trị!");
  };

  const saveClubsList = async (list: MasterClub[]) => {
    await saveVscSystemClubs(list);
  };

  const saveAthletesList = async (list: MasterAthlete[]) => {
    // 1. Identify deleted items:
    const deletedItems = masterAthletes.filter(old => !list.some(item => item.id === old.id));
    if (deletedItems.length === 1) {
      await deleteVscSystemAthleteSingle(deletedItems[0].id);
      return;
    }
    
    // 2. Identify added/modified items:
    const changedItems = list.filter(item => {
      const oldItem = masterAthletes.find(old => old.id === item.id);
      if (!oldItem) return true; // Added
      return oldItem.avatarUrl !== item.avatarUrl || 
             oldItem.fullName !== item.fullName || 
             oldItem.status !== item.status || 
             oldItem.claimStatus !== item.claimStatus || 
             oldItem.phone !== item.phone || 
             oldItem.facebook !== item.facebook || 
             oldItem.zalo !== item.zalo || 
             oldItem.biography !== item.biography ||
             oldItem.emergencyContact !== item.emergencyContact ||
             oldItem.personalNotes !== item.personalNotes ||
             oldItem.slingshotType !== item.slingshotType ||
             oldItem.bandSpec !== item.bandSpec ||
             oldItem.ammoSize !== item.ammoSize ||
             oldItem.shootingStance !== item.shootingStance ||
             oldItem.clubId !== item.clubId ||
             oldItem.clubName !== item.clubName ||
             oldItem.achievements !== item.achievements;
    });

    if (changedItems.length === 1) {
      const a = changedItems[0];
      const legacy = {
        id: a.id,
        name: a.fullName,
        fullName: a.fullName,
        team: a.clubId,
        clubId: a.clubId,
        clubName: a.clubName,
        registeredClubId: a.registeredClubId || "",
        registeredClubName: a.registeredClubName || "",
        gender: a.gender,
        avatarUrl: a.avatarUrl,
        idCard: a.vscNumber,
        vscNumber: a.vscNumber,
        dob: a.dob,
        province: a.province,
        country: a.country,
        status: a.status,
        clubHistory: a.clubHistory || [],
        qrCode: a.qrCode || "",
        phone: a.phone || "",
        facebook: a.facebook || "",
        zalo: a.zalo || "",
        biography: a.biography || "",
        emergencyContact: a.emergencyContact || "",
        personalNotes: a.personalNotes || "",
        linkedUserId: a.linkedUserId || "",
        claimStatus: a.claimStatus || "unclaimed",
        createdAt: a.createdAt,
        updatedAt: new Date().toISOString(),
        scores: {}
      };
      await saveVscSystemAthleteSingle(legacy);
      return;
    }

    const legacyAthletes = list.map((a) => ({
      id: a.id,
      name: a.fullName,
      fullName: a.fullName,
      team: a.clubId,
      clubId: a.clubId,
      clubName: a.clubName,
      registeredClubId: a.registeredClubId || "",
      registeredClubName: a.registeredClubName || "",
      gender: a.gender,
      avatarUrl: a.avatarUrl,
      idCard: a.vscNumber,
      vscNumber: a.vscNumber,
      dob: a.dob,
      province: a.province,
      country: a.country,
      status: a.status,
      clubHistory: a.clubHistory || [],
      qrCode: a.qrCode || "",
      phone: a.phone || "",
      facebook: a.facebook || "",
      zalo: a.zalo || "",
      biography: a.biography || "",
      emergencyContact: a.emergencyContact || "",
      personalNotes: a.personalNotes || "",
      linkedUserId: a.linkedUserId || "",
      claimStatus: a.claimStatus || "unclaimed",
      createdAt: a.createdAt,
      updatedAt: new Date().toISOString(),
      scores: {}
    }));
    await saveVscSystemAthletes(legacyAthletes);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressLogo(file);
      setFormFields((prev) => ({ ...prev, logoUrl: compressed, logo: compressed }));
    } catch (err) {
      console.error("Lỗi nén logo CLB:", err);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressBanner(file);
      setFormFields((prev) => ({ ...prev, bannerUrl: compressed, banner: compressed }));
    } catch (err) {
      console.error("Lỗi nén banner CLB:", err);
    }
  };

  // Club Create / Edit
  const handleStartAddClub = () => {
    const numbers = masterClubs
      .map((c) => {
        const match = (c.clubCode || "").match(/CLB-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    const nextClubCode = `CLB-${nextNum.toString().padStart(4, "0")}`;

    setEditingId(null);
    setFormFields({
      id: `club-${Date.now()}`,
      clubCode: nextClubCode,
      clubName: "",
      shortName: "",
      province: "Hà Nội",
      country: "Việt Nam",
      logoUrl: DEFAULT_CLUB_LOGO,
      bannerUrl: DEFAULT_CLUB_BANNER,
      description: "",
      foundedDate: new Date().toISOString().split("T")[0],
      memberCount: 0,
      achievements: []
    });
    setShowAddEditModal(true);
  };

  const handleStartEditClub = (club: MasterClub) => {
    setEditingId(club.id);
    setFormFields({ ...club });
    setShowAddEditModal(true);
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.clubName || !formFields.clubName.trim()) {
      showToast("Vui lòng điền tên câu lạc bộ!", "error");
      return;
    }

    if (editingId) {
      if (!hasClubPermission("EDIT")) {
        showToast("Bạn không có quyền chỉnh sửa câu lạc bộ này!", "error");
        return;
      }
    } else {
      if (!hasClubPermission("CREATE")) {
        showToast("Bạn không có quyền tạo câu lạc bộ mới!", "error");
        return;
      }
    }

    const clubId = formFields.id || `club-${Date.now()}`;
    const newClub: MasterClub = {
      ...(formFields as MasterClub),
      id: clubId,
      memberCount: masterAthletes.filter(a => a.clubId === clubId).length,
      updatedAt: new Date().toISOString()
    };

    let updatedList = [...masterClubs];
    if (editingId) {
      updatedList = updatedList.map((item) => item.id === editingId ? newClub : item);
      showToast("Đã cập nhật thông tin câu lạc bộ!");
    } else {
      newClub.createdAt = new Date().toISOString();
      updatedList.push(newClub);
      showToast("Đã tạo mới câu lạc bộ trên hệ thống!");
    }

    setMasterClubs(updatedList);
    saveClubsList(updatedList);
    setShowAddEditModal(false);

    if (activeClub && activeClub.id === clubId) {
      setActiveClub(newClub);
    }
  };

  const handleDeleteClub = async (id: string, name: string, bypassConfirm = false) => {
    if (!hasClubPermission("DELETE")) {
      showToast("Bạn không có quyền xóa câu lạc bộ!", "error");
      return;
    }

    if (!bypassConfirm) {
      setDeleteClubConfirm({ id, name });
      return;
    }

    // Reset club affiliations for athletes in this club
    const athletesInClub = masterAthletes.filter(a => a.clubId === id);
    if (athletesInClub.length > 0) {
      const updatedAthletes = masterAthletes.map(a => {
        if (a.clubId === id) {
          const newHist: ClubHistoryItem = {
            clubId: id,
            clubName: name,
            joinDate: a.createdAt,
            leaveDate: new Date().toISOString().split("T")[0],
            reason: "Giải thể câu lạc bộ"
          };
          return {
            ...a,
            clubId: "",
            clubName: "",
            clubHistory: [...(a.clubHistory || []), newHist],
            updatedAt: new Date().toISOString()
          } as MasterAthlete;
        }
        return a;
      });
      setMasterAthletes(updatedAthletes);
      saveAthletesList(updatedAthletes);
    }

    const updated = masterClubs.filter(c => c.id !== id);
    setMasterClubs(updated);
    saveClubsList(updated);
    showToast(`Đã xóa câu lạc bộ ${name}!`);

    if (activeClub?.id === id) {
      setActiveClub(null);
    }
  };

  // Club Presidents Assignment (Admin Only)
  const handleAssignPresident = async (athleteId: string) => {
    if (!hasClubPermission("ASSIGN_PRESIDENT")) {
      showToast("Bạn không có quyền bổ nhiệm chủ tịch!", "error");
      return;
    }
    if (!activeClub) return;

    const selectedAthlete = masterAthletes.find(a => a.id === athleteId);
    if (!selectedAthlete) return;

    const updatedClubs = masterClubs.map(c => {
      if (c.id === activeClub.id) {
        return {
          ...c,
          leaderAthleteId: selectedAthlete.id,
          leaderAthleteName: selectedAthlete.fullName,
          updatedAt: new Date().toISOString()
        } as MasterClub;
      }
      return c;
    });

    setMasterClubs(updatedClubs);
    saveClubsList(updatedClubs);
    setActiveClub({
      ...activeClub,
      leaderAthleteId: selectedAthlete.id,
      leaderAthleteName: selectedAthlete.fullName
    });
    setShowAssignPresidentModal(false);
    showToast(`Đã bổ nhiệm ${selectedAthlete.fullName} làm Chủ tịch CLB ${activeClub.clubName}!`);

    await addVscAuditLog({
      userId: currentUser?.uid || "admin",
      userEmail: currentUser?.email || "admin@vscs.asia",
      action: "UPDATE_ATHLETE_PROFILE",
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.fullName,
      details: `Ban tổ chức bổ nhiệm VĐV làm Chủ tịch CLB ${activeClub.clubName}.`,
      timestamp: new Date().toISOString()
    });
  };

  // Club Direct Add Member (Admin Only)
  const handleAddClubMemberDirect = async () => {
    if (!isAdmin) {
      showToast("Bạn không có quyền thực hiện chức năng này!", "error");
      return;
    }
    if (!activeClub) return;
    if (!selectedAddMemberId) {
      showToast("Vui lòng chọn một vận động viên!", "error");
      return;
    }

    const targetAthlete = masterAthletes.find(a => a.id === selectedAddMemberId);
    if (!targetAthlete) return;

    const oldClubId = targetAthlete.clubId;

    // 1. Prepare history item
    const newHistory: ClubHistoryItem = {
      clubId: activeClub.id,
      clubName: activeClub.clubName,
      joinDate: new Date().toISOString().split("T")[0]
    };

    // 2. Update athlete list
    const updatedAthletes = masterAthletes.map(a => {
      if (a.id === targetAthlete.id) {
        return {
          ...a,
          clubId: activeClub.id,
          clubName: activeClub.clubName,
          clubHistory: [...(a.clubHistory || []), newHistory],
          updatedAt: new Date().toISOString()
        } as MasterAthlete;
      }
      return a;
    });

    // 3. Update club member counts
    const updatedClubs = masterClubs.map(c => {
      if (c.id === activeClub.id) {
        return {
          ...c,
          memberCount: (c.memberCount || 0) + 1,
          updatedAt: new Date().toISOString()
        } as MasterClub;
      }
      if (oldClubId && c.id === oldClubId) {
        return {
          ...c,
          memberCount: Math.max(0, (c.memberCount || 0) - 1),
          updatedAt: new Date().toISOString()
        } as MasterClub;
      }
      return c;
    });

    setMasterAthletes(updatedAthletes);
    saveAthletesList(updatedAthletes);

    setMasterClubs(updatedClubs);
    saveClubsList(updatedClubs);

    // 4. Reset & Close modal
    setShowAddMemberModal(false);
    setSelectedAddMemberId("");
    setAddMemberSearch("");
    showToast(`Đã thêm thành viên ${targetAthlete.fullName} vào CLB ${activeClub.clubName} thành công!`);

    // 5. Add audit log
    await addVscAuditLog({
      userId: currentUser?.uid || "admin",
      userEmail: currentUser?.email || "admin@vscs.asia",
      action: "UPDATE_ATHLETE_PROFILE",
      athleteId: targetAthlete.id,
      athleteName: targetAthlete.fullName,
      details: `Ban tổ chức thêm trực tiếp VĐV làm thành viên CLB ${activeClub.clubName}.`,
      timestamp: new Date().toISOString()
    });
  };

  // Kick member / leave club workflow
  const handleRemoveMember = async (athlete: MasterAthlete, reason: string = "Rời câu lạc bộ", bypassConfirm = false) => {
    if (!activeClub) return;

    const isSelf = linkedAthlete && linkedAthlete.id === athlete.id;
    if (isSelf) {
      if (!hasClubPermission("LEAVE")) {
        showToast("Bạn không thể tự ý rời câu lạc bộ (Chủ tịch CLB cần chuyển giao quyền trước)!", "error");
        return;
      }
    } else {
      if (!hasClubPermission("KICK_MEMBER")) {
        showToast("Bạn không có quyền loại thành viên khỏi câu lạc bộ!", "error");
        return;
      }
    }

    if (!bypassConfirm) {
      setKickMemberConfirm({ athlete, isSelf, reason });
      return;
    }

    // Add Leave record to Club History
    const lastHistoryItem = athlete.clubHistory?.[athlete.clubHistory.length - 1];
    const newHist: ClubHistoryItem = {
      clubId: activeClub.id,
      clubName: activeClub.clubName,
      joinDate: lastHistoryItem?.joinDate || athlete.createdAt || new Date().toISOString().split("T")[0],
      leaveDate: new Date().toISOString().split("T")[0],
      reason: reason
    };

    const updatedAthletes = masterAthletes.map(a => {
      if (a.id === athlete.id) {
        return {
          ...a,
          clubId: "",
          clubName: "",
          clubHistory: [...(a.clubHistory || []), newHist],
          updatedAt: new Date().toISOString()
        } as MasterAthlete;
      }
      return a;
    });

    setMasterAthletes(updatedAthletes);
    saveAthletesList(updatedAthletes);

    // Update club member count
    const updatedClubs = masterClubs.map(c => {
      if (c.id === activeClub.id) {
        return {
          ...c,
          memberCount: Math.max(0, c.memberCount - 1),
          updatedAt: new Date().toISOString()
        } as MasterClub;
      }
      return c;
    });
    setMasterClubs(updatedClubs);
    saveClubsList(updatedClubs);
    setActiveClub({ ...activeClub, memberCount: Math.max(0, activeClub.memberCount - 1) });

    showToast(`Đã trục xuất thành viên ${athlete.fullName} khỏi CLB.`);

    await addVscAuditLog({
      userId: currentUser?.uid || "president",
      userEmail: currentUser?.email || "president@clb.vn",
      action: "UPDATE_ATHLETE_PROFILE",
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      details: `VĐV ${athlete.fullName} rời câu lạc bộ ${activeClub.clubName}. Lý do: ${reason}`,
      timestamp: new Date().toISOString()
    });
  };

  // Join request submission
  const handleRequestToJoin = async () => {
    if (!hasClubPermission("JOIN")) {
      showToast("Bạn không có quyền gửi yêu cầu gia nhập câu lạc bộ!", "error");
      return;
    }
    if (!currentUser) {
      showToast("Vui lòng đăng nhập trước khi gia nhập câu lạc bộ!", "error");
      return;
    }
    if (!linkedAthlete) {
      showToast("Tài khoản của bạn chưa được liên kết với một Hồ sơ VĐV thi đấu nào. Hãy vào tab 'Athlete' để định danh trước!", "error");
      return;
    }
    if (linkedAthlete.clubId && linkedAthlete.clubId !== "free" && linkedAthlete.clubId !== "Free") {
      showToast(`Bạn đang sinh hoạt tại Câu lạc bộ ${linkedAthlete.clubName}. Vui lòng xin rời CLB cũ trước khi xin nhập CLB mới!`, "error");
      return;
    }
    if (!activeClub) return;

    // Check if request is already pending
    const alreadyPending = clubRequests.find(r => r.athleteId === linkedAthlete.id && r.clubId === activeClub.id && r.status === "pending");
    if (alreadyPending) {
      showToast("Bạn đã gửi yêu cầu xin gia nhập câu lạc bộ này và đang chờ xét duyệt!", "error");
      return;
    }

    const newRequest: ClubRequest = {
      id: `req-${Date.now()}`,
      clubId: activeClub.id,
      clubName: activeClub.clubName,
      athleteId: linkedAthlete.id,
      athleteName: linkedAthlete.fullName,
      athleteVsc: linkedAthlete.vscNumber,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      status: "pending",
      requestedAt: new Date().toISOString()
    };

    const updatedRequests = [...clubRequests, newRequest];
    setClubRequests(updatedRequests);
    await saveVscClubRequests(updatedRequests);
    showToast("Gửi yêu cầu gia nhập CLB thành công! Chờ Trưởng CLB hoặc Admin phê duyệt.");
  };

  // Approve / Reject requests
  const handleProcessRequest = async (request: ClubRequest, approve: boolean) => {
    if (!hasClubPermission("MANAGE_REQUESTS")) {
      showToast("Bạn không có quyền duyệt yêu cầu gia nhập câu lạc bộ!", "error");
      return;
    }
    if (!activeClub) return;

    // 1. Update Request status
    const updatedRequests = clubRequests.map(r => {
      if (r.id === request.id) {
        return {
          ...r,
          status: approve ? "approved" : "rejected",
          processedAt: new Date().toISOString(),
          processedBy: currentUser?.uid || "admin"
        } as ClubRequest;
      }
      return r;
    });

    setClubRequests(updatedRequests);
    saveVscClubRequests(updatedRequests);

    if (approve) {
      // 2. Update Athlete profile (add clubId, clubName and append ClubHistoryItem)
      const targetAthlete = masterAthletes.find(a => a.id === request.athleteId);
      if (targetAthlete) {
        const newHistory: ClubHistoryItem = {
          clubId: activeClub.id,
          clubName: activeClub.clubName,
          joinDate: new Date().toISOString().split("T")[0]
        };

        const updatedAthletes = masterAthletes.map(a => {
          if (a.id === targetAthlete.id) {
            return {
              ...a,
              clubId: activeClub.id,
              clubName: activeClub.clubName,
              clubHistory: [...(a.clubHistory || []), newHistory],
              updatedAt: new Date().toISOString()
            } as MasterAthlete;
          }
          return a;
        });

        setMasterAthletes(updatedAthletes);
        saveAthletesList(updatedAthletes);
      }

      // 3. Update Club Member Count
      const updatedClubs = masterClubs.map(c => {
        if (c.id === activeClub.id) {
          return {
            ...c,
            memberCount: c.memberCount + 1,
            updatedAt: new Date().toISOString()
          } as MasterClub;
        }
        return c;
      });
      setMasterClubs(updatedClubs);
      saveClubsList(updatedClubs);
      setActiveClub({ ...activeClub, memberCount: activeClub.memberCount + 1 });

      showToast(`Đã duyệt yêu cầu! Chào mừng VĐV ${request.athleteName} tham gia CLB.`);

      await addVscAuditLog({
        userId: currentUser?.uid || "president",
        userEmail: currentUser?.email || "president@clb.vn",
        action: "UPDATE_ATHLETE_PROFILE",
        athleteId: request.athleteId,
        athleteName: request.athleteName,
        details: `Duyệt gia nhập CLB ${activeClub.clubName} cho VĐV ${request.athleteName}.`,
        timestamp: new Date().toISOString()
      });
    } else {
      showToast("Đã từ chối yêu cầu gia nhập.");
    }
  };

  // Club achievements and info management
  const handleAddAchievement = async () => {
    if (!hasClubPermission("ADD_ACHIEVEMENT")) {
      showToast("Bạn không có quyền đăng tuyển thành tích cho câu lạc bộ này!", "error");
      return;
    }
    if (!activeClub) return;
    const achInput = window.prompt("Nhập thành tích / Giải thưởng mới của câu lạc bộ:");
    if (!achInput || !achInput.trim()) return;

    const currentAchs = activeClub.achievements || [];
    const updatedAchs = [...currentAchs, achInput.trim()];

    const updatedClubs = masterClubs.map(c => {
      if (c.id === activeClub.id) {
        return {
          ...c,
          achievements: updatedAchs,
          updatedAt: new Date().toISOString()
        } as MasterClub;
      }
      return c;
    });

    setMasterClubs(updatedClubs);
    saveClubsList(updatedClubs);
    setActiveClub({ ...activeClub, achievements: updatedAchs });
    showToast("Đã lưu thêm thành tích câu lạc bộ!");
  };

  // Filter clubs
  const filteredClubs = masterClubs.filter((c) => {
    const matchesSearch = 
      c.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clubCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.leaderAthleteName || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvince = provinceFilter === "all" || c.province === provinceFilter;

    return matchesSearch && matchesProvince;
  });

  const clubMembers = activeClub 
    ? masterAthletes.filter(a => a.clubId === activeClub.id) 
    : [];

  const pendingRequestsForActiveClub = activeClub
    ? clubRequests.filter(r => r.clubId === activeClub.id && r.status === "pending")
    : [];

  // Excel template Export
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredClubs.map(c => ({
        "ID": c.id,
        "Mã CLB": c.clubCode,
        "Tên Câu Lạc Bộ": c.clubName,
        "Tên Ngắn Gọn": c.shortName,
        "Tỉnh/Thành Phố": c.province,
        "Quốc Gia": c.country,
        "Ngày Thành Lập": c.foundedDate || "",
        "Thành Tích": (c.achievements || []).join("; ")
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clubs");
      XLSX.writeFile(workbook, "Danh_Sach_Cau_Lac_Bo_VSC.xlsx");
      showToast("Xuất Excel câu lạc bộ thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xuất tệp dữ liệu.", "error");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce ${
          notification.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* RENDER ACTIVE CLUB PORTAL OR PORTAL GRID */}
      {activeClub ? (
        /* ==================== CLUB DETAIL PORTAL VIEW ==================== */
        <div className="space-y-6 animate-in fade-in duration-350">
          {/* Back to List row */}
          <button
            onClick={() => setActiveClub(null)}
            className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-indigo-600 font-bold transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Danh Sách Câu Lạc Bộ
          </button>

          {/* Club Banner Header */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {/* Banner block */}
            <div className="h-44 sm:h-56 overflow-hidden">
              <img
                src={activeClub.bannerUrl || DEFAULT_CLUB_BANNER}
                alt="Club Banner"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Logo and metadata overlay row */}
            <div className="p-6 relative pt-0">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-16 sm:-mt-20">
                <img
                  src={activeClub.logoUrl || DEFAULT_CLUB_LOGO}
                  alt={activeClub.clubName}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover bg-white border-4 border-white dark:border-slate-900 shadow-md relative z-10"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {activeClub.clubName}
                    </h1>
                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-md font-bold font-mono">
                      {activeClub.clubCode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-0.5 font-bold text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {activeClub.province}, {activeClub.country}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5" /> Thành lập: {activeClub.foundedDate ? new Date(activeClub.foundedDate).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 self-stretch sm:self-auto">
                  {/* Thêm thành viên button (Only Admin sees, positioned to the left of Join Club button) */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedAddMemberId("");
                        setAddMemberSearch("");
                        setShowAddMemberModal(true);
                      }}
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Thêm thành viên
                    </button>
                  )}

                  {/* Joining Request Button */}
                  {currentUser && !clubMembers.some(m => m.id === linkedAthlete?.id) && (
                    <button
                      onClick={handleRequestToJoin}
                      className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      Gia Nhập Câu Lạc Bộ
                    </button>
                  )}

                  {/* Club President badge info */}
                  {isClubPresident && (
                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-xs px-3 py-2.5 rounded-xl font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-900">
                      <Crown className="w-4 h-4" /> Bạn là Chủ tịch CLB
                    </span>
                  )}

                  {/* Edit capabilities for Admin or President of this club */}
                  {hasClubPermission("EDIT") && (
                    <button
                      onClick={() => handleStartEditClub(activeClub)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" /> Sửa thông tin CLB
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {activeClub.description && (
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                  {activeClub.description}
                </p>
              )}
            </div>
          </div>

          {/* Grid of details: Portal view split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 cols: Member List & Activity Records */}
            <div className="lg:col-span-2 space-y-6">
              {/* Member Registry Card */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Thành viên câu lạc bộ ({clubMembers.length})
                  </h3>
                </div>

                {clubMembers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="font-bold text-sm">Câu lạc bộ chưa có thành viên nào</p>
                    <p className="text-xs text-slate-400 mt-1">Gửi yêu cầu hoặc thêm vận động viên thi đấu vào CLB</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {clubMembers.map((member, idx) => {
                      const isLeader = activeClub.leaderAthleteId === member.id;
                      return (
                        <div
                          key={`${member.id || 'mem'}-${idx}`}
                          onClick={() => {
                            setViewingAthlete(member);
                            setShowAthleteCard(false);
                          }}
                          className="p-4 flex items-center justify-between hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatarUrl || AVATAR_MALE}
                              alt={member.fullName}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {member.fullName}
                                </span>
                                {isLeader && (
                                  <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> Chủ tịch CLB
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-slate-400 mt-0.5">{member.vscNumber} • {member.gender} • {member.province}</p>
                            </div>
                          </div>

                          {/* Member action buttons */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setViewingAthlete(member);
                                setShowAthleteCard(true);
                                setIsCardFlipped(false);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-500 rounded-md"
                              title="Xem Thẻ VĐV"
                            >
                              <IdCard className="w-4 h-4" />
                            </button>

                            {/* President/Admin remove member capability, or Athlete self-leave */}
                            {((isAdmin || isClubPresident) && !isLeader) || (linkedAthlete && linkedAthlete.id === member.id && !isLeader) ? (
                              <button
                                onClick={() => handleRemoveMember(member, linkedAthlete?.id === member.id ? "Tự nguyện rời câu lạc bộ" : "Rời câu lạc bộ")}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                                title={linkedAthlete?.id === member.id ? "Rời Câu Lạc Bộ" : "Trục xuất khỏi CLB"}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column sidebar: Admin/Leader workspace, Achievements */}
            <div className="lg:col-span-1 space-y-6">
              {/* PRESIDENT JOIN REQUESTS WORKSPACE */}
              {(isAdmin || isClubPresident) && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Duyệt Gia Nhập CLB ({pendingRequestsForActiveClub.length})
                  </h3>

                  {pendingRequestsForActiveClub.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có yêu cầu gia nhập nào mới.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequestsForActiveClub.map((req) => {
                        const ath = masterAthletes.find(a => a.id === req.athleteId || a.vscNumber === req.athleteVsc);
                        const isExpanded = expandedRequestId === req.id;
                        return (
                          <div key={req.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 text-xs flex flex-col gap-2">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                  <img
                                    src={ath?.avatarUrl || (ath?.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    {req.athleteName}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                                      className="text-slate-400 hover:text-indigo-500 cursor-pointer p-0.5"
                                      title="Xem chi tiết VĐV"
                                    >
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono">Thẻ VSC: {req.athleteVsc}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleProcessRequest(req, true)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-lg cursor-pointer transition-all active:scale-95"
                                  title="Đồng ý nhận vào CLB"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessRequest(req, false)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-lg cursor-pointer transition-all active:scale-95"
                                  title="Từ chối"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Expandable Details */}
                            {isExpanded && ath && (
                              <div className="mt-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-2 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 font-sans">
                                <div>
                                  <span className="text-slate-400">Giới tính:</span> <strong className="text-slate-700 dark:text-slate-300 font-bold">{ath.gender || "Chưa rõ"}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Ngày sinh:</span> <strong className="text-slate-700 dark:text-slate-300 font-bold">{ath.dob || "Chưa rõ"}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Tỉnh thành:</span> <strong className="text-slate-700 dark:text-slate-300 font-bold">{ath.province || "Chưa rõ"}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Điện thoại:</span> <strong className="text-slate-700 dark:text-slate-300 font-bold">{ath.phone || "Chưa có"}</strong>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400">Định danh:</span> <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${ath.claimStatus === "verified" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"}`}>{ath.claimStatus === "verified" ? "Đã liên kết" : "Chưa liên kết"}</span>
                                </div>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 flex justify-between items-center w-full px-1">
                              <span>Yêu cầu: {new Date(req.requestedAt).toLocaleDateString("vi-VN")}</span>
                              {!isExpanded && ath && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRequestId(req.id)}
                                  className="text-[9px] text-indigo-500 hover:underline font-bold"
                                >
                                  Xem chi tiết VĐV
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Designated leader assign (Admin Only) */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowAssignPresidentModal(true)}
                      className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-all"
                    >
                      Bổ Nhiệm Chủ Tịch CLB
                    </button>
                  )}
                </div>
              )}

              {/* Achievements widget */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-500" />
                    Thành Tích & Danh Hiệu CLB
                  </h3>
                  {(isAdmin || isClubPresident) && (
                    <button
                      onClick={handleAddAchievement}
                      className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-950 p-1 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {!activeClub.achievements || activeClub.achievements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa đăng thành tích nào cho CLB.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {activeClub.achievements.map((ach, i) => (
                      <li key={i} className="flex gap-2 items-start bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 text-amber-900 dark:text-amber-400 font-medium">
                        <Award className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== CLUBS REGISTER / LIST VIEW ==================== */
        <div className="space-y-4 animate-in fade-in duration-350">
          {/* Dashboard Banner Info */}
          <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-900/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="bg-indigo-500 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full">
                  VSC Club Space
                </span>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 mt-1">
                  <Building className="w-7 h-7 text-indigo-400" />
                  Club (Câu lạc bộ)
                </h1>
                <p className="text-slate-300 text-xs mt-1">
                  Khám phá các câu lạc bộ bắn súng cao su cả nước, theo dõi bảng danh sách thành viên và gửi yêu cầu gia nhập sinh hoạt chuyên nghiệp.
                </p>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={handleStartAddClub}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tạo Câu Lạc Bộ Mới
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search bar & filters */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm CLB theo tên, mã viết tắt, trưởng clb, địa phương..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            <div className="flex gap-2 items-center">
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="all">Tất cả tỉnh thành</option>
                {Array.from(new Set(masterClubs.map(c => c.province))).map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
              <button
                onClick={handleExportExcel}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold"
              >
                Xuất Excel
              </button>
            </div>
          </div>

          {/* User Active Role & Permissions Guide */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Vai trò của bạn:</span>
                <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border border-indigo-200/50 dark:border-indigo-900/50 shadow-sm">
                  {getCurrentRoleLabel(null)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionsTable(!showPermissionsTable)}
                className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1 cursor-pointer bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 px-3 py-1.5 rounded-xl transition-all"
              >
                <Shield className="w-4 h-4 text-indigo-500" />
                {showPermissionsTable ? "Ẩn Bảng Phân Quyền" : "Xem Bảng Phân Quyền CLB"}
              </button>
            </div>

            {showPermissionsTable && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                      <th className="p-3 font-extrabold text-slate-700 dark:text-slate-300">Hoạt Động / Quyền Hạn</th>
                      <th className="p-3 font-extrabold text-indigo-700 dark:text-indigo-400 text-center">Quản Trị Viên (Admin)</th>
                      <th className="p-3 font-extrabold text-amber-700 dark:text-amber-400 text-center">Trưởng CLB (President)</th>
                      <th className="p-3 font-extrabold text-emerald-700 dark:text-emerald-400 text-center">Trọng Tài (Referee)</th>
                      <th className="p-3 font-extrabold text-slate-600 dark:text-slate-450 text-center">VĐV (Athlete)</th>
                      <th className="p-3 font-extrabold text-slate-400 text-center">Khán Giả (Viewer)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Tạo Câu Lạc Bộ Mới</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Sửa đổi thông tin CLB</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Chỉ CLB của mình</span></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Xóa Câu Lạc Bộ</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Bổ nhiệm Chủ tịch CLB</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Duyệt yêu cầu gia nhập</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Chỉ CLB của mình</span></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Trục xuất thành viên / Kick</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Chỉ CLB của mình</span></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Đăng tuyển thành tích CLB</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Chỉ CLB của mình</span></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Tự nguyện rời câu lạc bộ</td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /> <span className="text-[9px] text-slate-400 block mt-0.5">(Cần nhường chức vụ)</span></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Xuất danh sách Excel</td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="p-3 text-center"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CLB Grid Display */}
          {filteredClubs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-12 rounded-3xl text-center text-slate-500 shadow-sm">
              <Building className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-sm">Chưa có câu lạc bộ nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Đổi từ khóa tìm kiếm hoặc bấm Tạo Câu Lạc Bộ để bắt đầu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredClubs.map((club) => {
                const isLeader = linkedAthlete && club.leaderAthleteId === linkedAthlete.id;
                return (
                  <div
                    key={club.id}
                    onClick={() => setActiveClub(club)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    {/* Banner and Logo wrap */}
                    <div>
                      <div className="h-28 relative overflow-hidden bg-slate-100">
                        <img
                          src={club.bannerUrl || DEFAULT_CLUB_BANNER}
                          alt={club.clubName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                        <span className="absolute bottom-2 right-2 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-indigo-400 font-mono font-bold uppercase">
                          {club.clubCode}
                        </span>
                      </div>

                      <div className="px-5 pb-4 relative">
                        {/* Logo overhanging */}
                        <img
                          src={club.logoUrl || DEFAULT_CLUB_LOGO}
                          alt={club.clubName}
                          className="w-14 h-14 rounded-xl object-cover bg-white border-2 border-white dark:border-slate-900 shadow -mt-7 relative z-10"
                        />

                        {/* Title and stats */}
                        <div className="mt-2.5">
                          <h3 className="font-black text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {club.clubName}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold mt-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            {club.province}, {club.country}
                          </p>
                        </div>

                        {/* Pres & stats summary */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 text-xs text-slate-500">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Trưởng CLB</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-0.5 mt-0.5">
                              {club.leaderAthleteId ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : null}
                              {club.leaderAthleteName || "Chưa có"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Thành viên</p>
                            <p className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm mt-0.5">
                              {masterAthletes.filter(a => a.clubId === club.id).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action drawer */}
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex justify-between items-center">
                      <span className="text-[11px] text-slate-500">
                        Gia nhập: {club.foundedDate ? new Date(club.foundedDate).getFullYear() : "N/A"}
                      </span>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleStartEditClub(club)}
                              className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-md"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClub(club.id, club.clubName)}
                              className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setActiveClub(club)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-0.5 group-hover:underline"
                        >
                          Cổng CLB &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER ATHLETE PORTAL MODAL VIEW */}
      {viewingAthlete && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 font-sans">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setShowAthleteCard(false)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    !showAthleteCard 
                      ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Hồ Sơ VĐV
                </button>
                <button
                  onClick={() => setShowAthleteCard(true)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    showAthleteCard 
                      ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Thẻ Điện Tử
                </button>
              </div>

              <button
                onClick={() => setViewingAthlete(null)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-5 overflow-y-auto max-h-[75vh]">
              {/* RENDER DIGITAL CARD VIEW */}
              {showAthleteCard ? (
                <div className="perspective-1000 flex flex-col items-center py-6">
                  {/* Digital Athlete Card Frame */}
                  <div 
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className={`relative w-80 h-112 cursor-pointer transition-all duration-700 transform-style-3d shadow-2xl rounded-2xl overflow-hidden ${
                      isCardFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* CARD FRONT SIDE */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 border border-indigo-500/40 rounded-2xl flex flex-col justify-between shadow-inner">
                      {/* Gold Badge accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rotate-45 transform origin-top-right"></div>
                      
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-6 h-6 text-amber-500" />
                          <div>
                            <p className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                              VIETNAM SLINGSHOT
                            </p>
                            <p className="text-[9px] text-slate-300 tracking-wider">
                              ATHLETE DIGITAL LICENSE
                            </p>
                          </div>
                        </div>
                        <div className="bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/20">
                          <span className="text-[8px] font-mono text-indigo-300">VSC V3</span>
                        </div>
                      </div>

                      {/* Card Profile Picture & Details Grid */}
                      <div className="my-auto flex flex-col items-center">
                        <div className="relative mb-4">
                          <img
                            src={viewingAthlete.avatarUrl || (viewingAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                            alt={viewingAthlete.fullName}
                            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500/50 shadow-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-1 right-2 bg-indigo-600 border border-indigo-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            VĐV
                          </div>
                        </div>

                        <h2 className="text-xl font-extrabold text-white text-center tracking-tight leading-tight">
                          {viewingAthlete.fullName}
                        </h2>
                        {viewingAthlete.nickname && (
                          <p className="text-xs text-indigo-300 font-medium text-center italic mt-0.5">
                            "{viewingAthlete.nickname}"
                          </p>
                        )}
                        
                        <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg px-4 py-1.5 mt-3 text-center">
                          <span className="text-[10px] uppercase text-indigo-300 tracking-widest font-black block">
                            MÃ SỐ VĐV QUỐC GIA
                          </span>
                          <span className="text-base font-mono font-black tracking-widest text-amber-400">
                            {viewingAthlete.vscNumber}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Details */}
                      <div className="border-t border-indigo-500/20 pt-3 grid grid-cols-2 text-xs gap-2">
                        <div>
                          <p className="text-[9px] text-indigo-400 uppercase font-bold">Câu lạc bộ</p>
                          <p className="font-extrabold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                            {viewingAthlete.clubName && viewingAthlete.clubName !== "free" && viewingAthlete.clubName !== "Free" && viewingAthlete.clubName !== "Tự Do" ? viewingAthlete.clubName : "Tự Do"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-indigo-400 uppercase font-bold">Địa phương</p>
                          <p className="font-extrabold text-white">
                            {viewingAthlete.province}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CARD BACK SIDE */}
                    <div className="absolute inset-0 w-full h-full rotate-y-180 backface-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-inner">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-bold text-slate-400">THÔNG TIN XÁC THỰC THẺ</span>
                        <span className="text-[9px] text-amber-500 font-mono">STATUS: {viewingAthlete.status === "active" ? "ACTIVE" : "LOCKED"}</span>
                      </div>

                      {/* QR Code central container */}
                      <div className="flex flex-col items-center justify-center py-4 my-auto space-y-3">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-700 shadow-xl">
                          <img
                            src={viewingAthlete.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingAthlete.vscNumber)}`}
                            alt="Athlete QR code verification"
                            className="w-36 h-36"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 text-center max-w-[200px]">
                          Quét mã QR bằng ứng dụng VSC để xác thực tư cách thi đấu, cập nhật hồ sơ trực tuyến.
                        </p>
                      </div>

                      {/* Verification metadata and notes */}
                      <div className="text-[9px] text-slate-500 border-t border-slate-800 pt-2 space-y-1 font-mono">
                        <p>ID: {viewingAthlete.id}</p>
                        <p>Xác thực: {viewingAthlete.claimStatus === "verified" ? "Đã xác minh" : "Chưa xác minh"}</p>
                        <p>Ngày cấp: {new Date(viewingAthlete.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Flip trigger instructions */}
                  <span className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                    <QrCode className="w-4 h-4 text-indigo-500" />
                    Nhấp vào thẻ để lật mặt sau chứa mã QR
                  </span>
                </div>
              ) : (
                /* RENDER DETAILED PORTAL VIEW */
                <div className="space-y-4 text-slate-800 dark:text-slate-100">
                  {/* Header profile block */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <img
                      src={viewingAthlete.avatarUrl || (viewingAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                      alt={viewingAthlete.fullName}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {viewingAthlete.fullName}
                      </h3>
                      <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Thẻ VSC: {viewingAthlete.vscNumber}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {viewingAthlete.status === "active" ? (
                          <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Tạm ngưng
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{viewingAthlete.gender}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Sub-Tabs */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-105 dark:bg-slate-950 p-1 rounded-xl border border-slate-205/50 dark:border-slate-800/60 text-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalSubTab("general")}
                      className={`py-1.5 px-0.5 rounded-lg text-[9px] sm:text-xs font-black tracking-tight transition-all cursor-pointer ${
                        modalSubTab === "general"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Hồ Sơ Cơ Bản
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSubTab("performance")}
                      className={`py-1.5 px-0.5 rounded-lg text-[9px] sm:text-xs font-black tracking-tight transition-all cursor-pointer ${
                        modalSubTab === "performance"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Phong Độ (ELO)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSubTab("matches")}
                      className={`py-1.5 px-0.5 rounded-lg text-[9px] sm:text-xs font-black tracking-tight transition-all cursor-pointer ${
                        modalSubTab === "matches"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Lịch Sử Đấu
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSubTab("achievements")}
                      className={`py-1.5 px-0.5 rounded-lg text-[9px] sm:text-xs font-black tracking-tight transition-all cursor-pointer ${
                        modalSubTab === "achievements"
                          ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Danh Hiệu VĐV
                    </button>
                  </div>

                  {/* SUB-TAB 1: GENERAL INFO */}
                  {modalSubTab === "general" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      
                      {/* ACP DETAILED DIGITAL CARD & RATING BENTO */}
                      {viewingAthleteCareerStats && (
                        <div className="space-y-4">
                          {/* DIGITAL ATHLETE CARD */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-3xl p-5 text-white shadow-lg flex flex-col justify-between min-h-[200px] w-full transition-all hover:shadow-indigo-500/10">
                            {/* Card Background Overlay effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                            
                            {/* Top row */}
                            <div className="flex justify-between items-start z-10">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black tracking-widest text-indigo-400 uppercase">VIETNAM SLINGSHOT FEDERATION</span>
                                <span className="text-[7px] text-slate-400 uppercase tracking-wider">OFFICIAL SPORTING CREDENTIAL</span>
                              </div>
                              {viewingAthlete.claimStatus === "verified" || viewingAthlete.claimStatus === "claimed" ? (
                                <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đã Xác Minh
                                </span>
                              ) : (
                                <span className="text-[8px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Thẻ Tự Do
                                </span>
                              )}
                            </div>

                            {/* Center Row: Profile Info & QR Code */}
                            <div className="flex justify-between items-center my-3 z-10 gap-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img 
                                    src={viewingAthlete.avatarUrl || (viewingAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                                    alt="Avatar VĐV" 
                                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md bg-slate-800"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-indigo-600 rounded-full flex items-center justify-center border border-slate-900">
                                    <Trophy className="w-2.5 h-2.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <h4 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate max-w-[150px]">
                                    {viewingAthlete.fullName}
                                  </h4>
                                  <span className="text-[9px] font-mono text-indigo-300 font-black tracking-wider">
                                    {viewingAthlete.vscNumber}
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate max-w-[150px] mt-0.5">
                                    📍 Tỉnh/TP: {viewingAthlete.province || "Chưa rõ"}
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate max-w-[150px]">
                                    🛡️ CLB: {viewingAthlete.clubName && viewingAthlete.clubName !== "free" && viewingAthlete.clubName !== "Free" && viewingAthlete.clubName !== "Tự Do" ? viewingAthlete.clubName : "Tự Do"}
                                  </span>
                                </div>
                              </div>

                              {/* QR Code */}
                              <div className="flex flex-col items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-xs">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&color=4f46e5&data=${encodeURIComponent('https://vscs.asia/athlete/' + (viewingAthlete.vscNumber || 'unlinked'))}`}
                                  alt="QR Code"
                                  className="w-11 h-11 rounded-md bg-white p-0.5"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">SCAN REGISTER</span>
                              </div>
                            </div>

                            {/* Bottom Row: Rating, Rank */}
                            <div className="flex justify-between items-center border-t border-white/5 pt-2 z-10">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">Hạng</span>
                                  <span className="text-[11px] font-black text-amber-400">#{viewingAthleteCareerStats.careerRanking}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">ELO VSC</span>
                                  <span className="text-[11px] font-black text-indigo-400">{viewingAthleteCareerStats.careerRating.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">Hoàn thiện</span>
                                  <span className="text-[11px] font-black text-emerald-400">
                                    {activeCompletionPercentage}%
                                  </span>
                                </div>
                              </div>
                              <span className="text-[7px] font-black tracking-widest text-white/35 font-mono uppercase">VSC PLATFORM V3</span>
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Giải đã đấu</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.totalTournaments}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Lượt bắn</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.totalMatches}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Độ chính xác</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Biography */}
                      {viewingAthlete.biography && (
                        <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tiểu sử</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{viewingAthlete.biography}"
                          </p>
                        </div>
                      )}

                      {/* Demographic and official data */}
                      <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Ngày sinh:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {viewingAthlete.dob ? new Date(viewingAthlete.dob).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Quốc tịch / Địa phương:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-indigo-500" /> {viewingAthlete.province || "Chưa rõ"}, {viewingAthlete.country || "Việt Nam"}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Câu lạc bộ hiện tại:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {viewingAthlete.clubName && viewingAthlete.clubName !== "free" && viewingAthlete.clubName !== "Free" && viewingAthlete.clubName !== "Tự Do" ? viewingAthlete.clubName : "VĐV Tự Do"}
                          </span>
                        </div>
                        {viewingAthlete.phone && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Số điện thoại:</span>
                            <span className="font-semibold text-slate-855 dark:text-slate-250 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {viewingAthlete.phone}
                            </span>
                          </div>
                        )}
                        {viewingAthlete.facebook && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Facebook:</span>
                            <a 
                              href={viewingAthlete.facebook} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Facebook className="w-3.5 h-3.5" /> Liên kết Facebook
                            </a>
                          </div>
                        )}
                        {viewingAthlete.emergencyContact && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Liên hệ khẩn cấp:</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">{viewingAthlete.emergencyContact}</span>
                          </div>
                        )}
                      </div>

                      {/* Equipment specs */}
                      <div className="bg-slate-50 dark:bg-slate-955/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850/60 space-y-2">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">🎯 Thông Số Trang Bị Thi Đấu</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                            <span className="text-slate-400">Loại Ná:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingAthlete.slingshotType || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 pl-2">
                            <span className="text-slate-400">Loại Dây:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingAthlete.bandSpec || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between pt-0.5">
                            <span className="text-slate-400">Cỡ Đạn:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingAthlete.ammoSize || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between pt-0.5 pl-2">
                            <span className="text-slate-400">Thế Bắn:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]" title={viewingAthlete.shootingStance}>{viewingAthlete.shootingStance || "Chưa cập nhật"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Club Career History Log */}
                      <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-4 h-4 text-indigo-500" />
                          Lịch Sử Đầu Quân CLB
                        </h4>
                        
                        {!viewingAthlete.clubHistory || viewingAthlete.clubHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Chưa có lịch sử chuyển nhượng câu lạc bộ.</p>
                        ) : (
                          <div className="relative pl-4 border-l border-indigo-200 dark:border-indigo-900 space-y-3.5 my-2">
                            {viewingAthlete.clubHistory.map((item, index) => (
                              <div key={index} className="relative text-xs">
                                {/* Dot indicator */}
                                <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900"></div>
                                
                                <div className="font-bold text-slate-900 dark:text-white flex justify-between">
                                  <span>{item.clubName}</span>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                                    {new Date(item.joinDate).toLocaleDateString("vi-VN")}
                                    {item.leaveDate ? ` - ${new Date(item.leaveDate).toLocaleDateString("vi-VN")}` : " (Hiện tại)"}
                                  </span>
                                </div>
                                {item.reason && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">Lý do: {item.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: PERFORMANCE */}
                  {modalSubTab === "performance" && viewingAthleteCareerStats && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-805 p-3.5 rounded-2xl flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">ĐIỂM XẾP HẠNG (ELO)</span>
                          <div className="mt-1.5">
                            <span className="text-lg sm:text-xl font-black text-indigo-650 dark:text-indigo-400">{viewingAthleteCareerStats.careerRating.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 ml-1">pts</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-805 p-3.5 rounded-2xl flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">HẠNG HỆ THỐNG</span>
                          <div className="mt-1.5">
                            <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">#{viewingAthleteCareerStats.careerRanking}</span>
                            <span className="text-[10px] text-slate-500 ml-1">Toàn quốc</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Giải đấu</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.totalTournaments}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Lượt bắn</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.totalMatches}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Chính xác</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{viewingAthleteCareerStats.accuracy}%</span>
                        </div>
                      </div>

                      {/* Medal collection */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Bộ sưu tập Huy chương</h4>
                        <div className="flex justify-around items-end pt-2">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-slate-500">{viewingAthleteCareerStats.silverMedals}</span>
                            <div className="w-10 bg-slate-300 dark:bg-slate-700 h-10 rounded-t-lg flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs">
                              II
                            </div>
                            <span className="text-[8px] text-slate-500">Bạc</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black text-amber-500">{viewingAthleteCareerStats.goldMedals}</span>
                            <div className="w-12 bg-amber-400 dark:bg-amber-500 h-14 rounded-t-lg flex items-center justify-center text-white dark:text-slate-900 font-black text-sm shadow-md">
                              I
                            </div>
                            <span className="text-[8px] text-amber-500 font-bold">Vô Địch</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-amber-700">{viewingAthleteCareerStats.bronzeMedals}</span>
                            <div className="w-10 bg-amber-600 dark:bg-amber-800 h-8 rounded-t-lg flex items-center justify-center text-amber-100 font-bold text-xs shadow-xs">
                              III
                            </div>
                            <span className="text-[8px] text-slate-500">Đồng</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Timeline SVG Chart */}
                      {viewingAthleteCareerStats.performanceTimeline && viewingAthleteCareerStats.performanceTimeline.length > 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                            <span>Biểu đồ phong độ (% Acc)</span>
                            <span className="text-indigo-650 font-bold">Lịch sử tiến trình</span>
                          </h4>
                          
                          <div className="h-28 w-full mt-2 flex items-end relative">
                            <svg className="w-full h-24 overflow-visible">
                              <polyline
                                fill="none"
                                stroke="#4f46e5"
                                strokeWidth="3"
                                points={viewingAthleteCareerStats.performanceTimeline.map((item: any, idx: number) => {
                                  const count = viewingAthleteCareerStats.performanceTimeline.length;
                                  const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
                                  const y = 80 - (item.accuracy / 100) * 70;
                                  return `${x}%,${y}`;
                                }).join(" ")}
                                className="transition-all duration-700"
                              />
                              {viewingAthleteCareerStats.performanceTimeline.map((item: any, idx: number) => {
                                const count = viewingAthleteCareerStats.performanceTimeline.length;
                                const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
                                const y = 80 - (item.accuracy / 100) * 70;
                                return (
                                  <g key={`timeline-view-${idx}-${item.tournamentName}`} className="group cursor-pointer">
                                    <circle
                                      cx={`${x}%`}
                                      cy={y}
                                      r="4"
                                      fill="#4f46e5"
                                      className="hover:r-6 transition-all"
                                    />
                                    <title>{`${item.tournamentName}: ${item.accuracy}%`}</title>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-400 mt-1.5 font-mono">
                            <span>{viewingAthleteCareerStats.performanceTimeline[0].date}</span>
                            <span>Tiến trình giải đấu ({viewingAthleteCareerStats.performanceTimeline.length})</span>
                            <span>{viewingAthleteCareerStats.performanceTimeline[viewingAthleteCareerStats.performanceTimeline.length - 1].date}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                          Chưa có đủ dữ liệu giải đấu để dựng tiến trình phong độ.
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 3: LỊCH SỬ ĐẤU */}
                  {modalSubTab === "matches" && viewingAthleteCareerStats && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-955/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Tổng điểm 10 (Hồng tâm):</span>
                          <span className="text-sm font-black text-indigo-605 dark:text-indigo-400 mt-1">{viewingAthleteCareerStats.bullseyesCount} hồng tâm</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-955/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Kỷ lục Giải / Cự ly:</span>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                            <span>{viewingAthleteCareerStats.personalBests.singleMatchMaxScore}đ</span>
                            <span>{viewingAthleteCareerStats.personalBests.singleDistanceMaxAccuracy}% Acc</span>
                          </div>
                        </div>
                      </div>

                      {/* Distance breakdown */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Hiệu suất theo Cự ly:</span>
                        {viewingAthleteCareerStats.distancesPerformance.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-4 italic">Chưa có thông số cự ly.</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5">
                            {viewingAthleteCareerStats.distancesPerformance.map((d: any, i: number) => (
                              <div key={d.distance || `dist-perf-${i}`} className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-bold text-slate-750 dark:text-slate-300">
                                  <span>🎯 Cự ly {d.distance}m</span>
                                  <span>{d.accuracy}% Acc</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${d.accuracy}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-500">
                                  <span>Số phát bắn: {d.shots} phát</span>
                                  <span>Trung bình: {d.averageScore} điểm/phát</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Official tournament logs */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-505 tracking-wider">Lịch sử đấu trường chính thức:</span>
                        {viewingAthleteCareerStats.tournamentHistory.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-2xl">
                            Chưa ghi nhận tham gia giải đấu chính thức nào.
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-2.5">
                            {viewingAthleteCareerStats.tournamentHistory.map((item: any, idx: number) => (
                              <div key={item.tournamentId || `tour-hist-${idx}`} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-1">
                                  <h5 className="text-[11px] font-extrabold text-slate-855 dark:text-slate-200 line-clamp-1">{item.tournamentName}</h5>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    item.rank === 1 ? "bg-amber-500 text-white" :
                                    item.rank === 2 ? "bg-slate-300 text-slate-800" :
                                    item.rank === 3 ? "bg-amber-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                  }`}>
                                    Hạng {item.rank}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                                  <span>📅 {item.date}</span>
                                  <span className="font-bold text-indigo-655 dark:text-indigo-400">{item.score} điểm ({item.accuracy}% Acc)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 4: danh hiệu */}
                  {modalSubTab === "achievements" && viewingAthleteCareerStats && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="text-[10px] font-black uppercase text-slate-505 tracking-wider">Danh hiệu hệ thống & Kiểm duyệt:</span>
                      <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                        {viewingAthleteCareerStats.goldMedals > 0 && (
                          <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 p-3 rounded-2xl flex gap-3 items-center">
                            <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-amber-855 dark:text-amber-400">VÔ ĐỊCH ĐẤU TRƯỜNG</h5>
                              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Sở hữu ít nhất một chức vô địch giải đấu chính thức trên hệ thống.</p>
                            </div>
                          </div>
                        )}

                        {viewingAthleteCareerStats.accuracy >= 80 && (
                          <div className="bg-indigo-500/10 border border-indigo-300 dark:border-indigo-800/60 p-3 rounded-2xl flex gap-3 items-center">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-indigo-750 dark:text-indigo-400">THIỆN XẠ ĐỈNH CAO (SHARPSHOOTER)</h5>
                              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Đạt độ chính xác (Accuracy %) trung bình trọn đời từ 80% trở lên.</p>
                            </div>
                          </div>
                        )}

                        {viewingAthleteCareerStats.bullseyesCount > 5 && (
                          <div className="bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 p-3 rounded-2xl flex gap-3 items-center">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-emerald-800 dark:text-emerald-400">CHÚA TỂ HỒNG TÂM (BULLSEYE KING)</h5>
                              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Bắn trúng hồng tâm (vòng X 10 điểm) từ 5 lần trở lên tại các giải chính thức.</p>
                            </div>
                          </div>
                        )}

                        {viewingAthleteCareerStats.totalTournaments >= 3 && (
                          <div className="bg-purple-500/10 border border-purple-300 dark:border-purple-800/60 p-3 rounded-2xl flex gap-3 items-center">
                            <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                              <History className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-purple-855 dark:text-purple-400">LÃO LÀNG ĐẤU TRƯỜNG</h5>
                              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Góp mặt và ghi nhận điểm số tại tối thiểu 3 giải đấu chính thức.</p>
                            </div>
                          </div>
                        )}

                        {/* Custom Outstanding achievements textbox */}
                        {viewingAthlete.achievements && (
                          <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/10 dark:to-purple-950/10 p-3 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/40">
                            <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider mb-1">🏅 Thành Tích Cá Nhân Do VĐV Khai Báo:</span>
                            <p className="text-xs text-slate-750 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic">
                              "{viewingAthlete.achievements}"
                            </p>
                          </div>
                        )}

                        {/* If no stats yet */}
                        {(!viewingAthleteCareerStats || (viewingAthleteCareerStats.goldMedals === 0 && viewingAthleteCareerStats.accuracy < 80 && viewingAthleteCareerStats.bullseyesCount <= 5 && viewingAthleteCareerStats.totalTournaments < 3)) && !viewingAthlete.achievements && (
                          <div className="text-center py-8 text-xs text-slate-450 italic">
                            Chưa đạt đủ cột mốc để ghi nhận Danh hiệu danh dự. Hãy tham gia giải đấu nhiều hơn để nâng hạng!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profile claiming info */}
                  {currentUser && viewingAthlete.claimStatus !== "verified" && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      {viewingAthlete.claimStatus === "pending_review" ? (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-2.5 rounded-xl text-xs text-amber-800 dark:text-amber-400">
                          <p className="font-semibold">Đang chờ Admin phê duyệt liên kết định danh...</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimProfile(viewingAthlete)}
                          className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2 rounded-xl transition-all"
                        >
                          Xác Nhận Định Danh VĐV Này Là Tôi
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* RENDER ASSIGN PRESIDENT MODAL (ADMIN ONLY) */}
      {showAssignPresidentModal && activeClub && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-slate-800 overflow-hidden font-sans">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" /> Bổ nhiệm Chủ tịch CLB
              </h3>
              <button onClick={() => setShowAssignPresidentModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-500">
                Chọn một vận động viên thi đấu thuộc câu lạc bộ <strong>{activeClub.clubName}</strong> để bổ nhiệm làm Chủ tịch điều hành.
              </p>

              {clubMembers.length === 0 ? (
                <p className="text-xs text-rose-500 italic text-center p-4">Câu lạc bộ chưa có thành viên nào để bổ nhiệm.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl">
                  {clubMembers.map((member, idx) => (
                    <div
                      key={`${member.id || 'mem'}-${idx}`}
                      onClick={() => handleAssignPresident(member.id)}
                      className="p-3 hover:bg-indigo-50/25 dark:hover:bg-slate-850/40 cursor-pointer flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <img
                        src={member.avatarUrl || AVATAR_MALE}
                        alt={member.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <p className="font-bold">{member.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{member.vscNumber}</p>
                      </div>
                      <Crown className="w-3.5 h-3.5 text-slate-300 hover:text-amber-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* RENDER ADD / EDIT CLUB MODAL (ADMIN ONLY) */}
      {showAddEditModal && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800 overflow-hidden font-sans">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-500" />
                {editingId ? "Sửa Câu Lạc Bộ Hệ Thống" : "Tạo Mới Câu Lạc Bộ"}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClub} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Mã Câu Lạc Bộ *
                  </label>
                  <input
                    type="text"
                    value={formFields.clubCode || ""}
                    disabled={true}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 dark:text-slate-400 font-mono cursor-not-allowed opacity-75"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Tên Viết Tắt / ShortName *
                  </label>
                  <input
                    type="text"
                    value={formFields.shortName || ""}
                    onChange={(e) => setFormFields({ ...formFields, shortName: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Tên Đầy Đủ Câu Lạc Bộ *
                </label>
                <input
                  type="text"
                  value={formFields.clubName || ""}
                  onChange={(e) => setFormFields({ ...formFields, clubName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Tỉnh / Thành phố *
                  </label>
                  <input
                    type="text"
                    value={formFields.province || "Hà Nội"}
                    onChange={(e) => setFormFields({ ...formFields, province: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Ngày thành lập
                  </label>
                  <input
                    type="date"
                    value={formFields.foundedDate || ""}
                    onChange={(e) => setFormFields({ ...formFields, foundedDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Mô Tả Hoạt Động / Giới Thiệu
                </label>
                <textarea
                  value={formFields.description || ""}
                  onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                  rows={3}
                  placeholder="Giới thiệu mục tiêu hoạt động, sân tập, thời gian sinh hoạt của câu lạc bộ..."
                  className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Polish interactive logo / banner upload panel */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-250 dark:border-slate-800">
                {/* LOGO UPLOAD BLOCK */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                    Logo câu lạc bộ (Ảnh đại diện)
                  </span>
                  <div className="flex items-center gap-4">
                    <img
                      src={formFields.logoUrl || DEFAULT_CLUB_LOGO}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-white"
                    />
                    <div className="flex-1 space-y-1">
                      <label className="relative cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        Tải Ảnh Logo Lên
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Hoặc dán URL ảnh Logo vào đây..."
                        value={formFields.logoUrl || ""}
                        onChange={(e) => setFormFields({ ...formFields, logoUrl: e.target.value })}
                        className="w-full p-2 text-[10px] rounded border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* BANNER UPLOAD BLOCK */}
                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                    Ảnh bìa Câu lạc bộ (Banner)
                  </span>
                  <div className="space-y-2">
                    <img
                      src={formFields.bannerUrl || DEFAULT_CLUB_BANNER}
                      alt="Banner preview"
                      className="w-full h-24 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shadow-sm bg-white"
                    />
                    <div className="flex gap-2 items-center">
                      <label className="relative cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all shrink-0">
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        Tải Ảnh Bìa Lên
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Hoặc dán URL ảnh Banner..."
                        value={formFields.bannerUrl || ""}
                        onChange={(e) => setFormFields({ ...formFields, bannerUrl: e.target.value })}
                        className="w-full p-2 text-[10px] rounded border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* RENDER DIRECT ADD MEMBER MODAL (ADMIN ONLY) */}
      {showAddMemberModal && activeClub && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800 overflow-hidden font-sans">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-500" /> Thêm thành viên trực tiếp
              </h3>
              <button 
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedAddMemberId("");
                  setAddMemberSearch("");
                }} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-500">
                Tìm kiếm và thêm trực tiếp vận động viên vào câu lạc bộ <strong>{activeClub.clubName}</strong>.
              </p>

              {/* Search input inside modal */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Nhập tên, mã số VSC..."
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filtered athletes list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                {(() => {
                  const query = addMemberSearch.trim().toLowerCase();
                  const candidates = masterAthletes.filter(athlete => {
                    // Exclude athletes who are already members of this club
                    if (athlete.clubId === activeClub.id) return false;

                    // Filter by search query
                    const nameMatch = athlete.fullName.toLowerCase().includes(query);
                    const vscMatch = athlete.vscNumber.toLowerCase().includes(query);
                    return nameMatch || vscMatch;
                  });

                  if (candidates.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic text-center p-4">
                        {addMemberSearch ? "Không tìm thấy VĐV phù hợp." : "Hãy nhập từ khóa để tìm kiếm."}
                      </p>
                    );
                  }

                  return candidates.map((athlete, idx) => {
                    const isSelected = selectedAddMemberId === athlete.id;
                    return (
                      <div
                        key={`${athlete.id || 'ath'}-${idx}`}
                        onClick={() => setSelectedAddMemberId(athlete.id)}
                        className={`p-2.5 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors ${
                          isSelected ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-l-2 border-emerald-500" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={athlete.avatarUrl || (athlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                            alt={athlete.fullName}
                            className="w-7 h-7 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{athlete.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{athlete.vscNumber} • {athlete.province}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {athlete.clubId && athlete.clubId !== "free" && athlete.clubId !== "Free" ? (
                            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              CLB cũ: {athlete.clubName}
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] px-1.5 py-0.5 rounded">
                              VĐV Tự Do
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Confirm & Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedAddMemberId("");
                    setAddMemberSearch("");
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleAddClubMemberDirect}
                  disabled={!selectedAddMemberId}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* MODAL: DELETE CLUB CONFIRMATION */}
      {deleteClubConfirm && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Xác Nhận Xóa Câu Lạc Bộ</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa câu lạc bộ <strong className="text-slate-900 dark:text-white font-black">"{deleteClubConfirm.name}"</strong>? 
              <br />
              Hành động này <span className="text-rose-500 font-extrabold">không thể hoàn tác</span>. Toàn bộ thông tin, lịch sử và liên kết thành viên của câu lạc bộ sẽ bị hủy bỏ.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteClubConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { id, name } = deleteClubConfirm;
                  setDeleteClubConfirm(null);
                  await handleDeleteClub(id, name, true);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/10"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* MODAL: KICK MEMBER CONFIRMATION */}
      {kickMemberConfirm && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">
                {kickMemberConfirm.isSelf ? "Xác Nhận Rời Câu Lạc Bộ" : "Xác Nhận Loại Thành Viên"}
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {kickMemberConfirm.isSelf ? (
                <span>Bạn có chắc chắn muốn rời khỏi câu lạc bộ <strong className="text-slate-900 dark:text-white font-black">{activeClub?.clubName}</strong>?</span>
              ) : (
                <span>
                  Bạn có chắc chắn muốn loại vận động viên <strong className="text-slate-900 dark:text-white font-black">"{kickMemberConfirm.athlete?.fullName}"</strong> ra khỏi câu lạc bộ <strong className="text-slate-900 dark:text-white font-black">{activeClub?.clubName}</strong>?
                </span>
              )}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKickMemberConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { athlete, reason } = kickMemberConfirm;
                  setKickMemberConfirm(null);
                  await handleRemoveMember(athlete, reason, true);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/10"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
