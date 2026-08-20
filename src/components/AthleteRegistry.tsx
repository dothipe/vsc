import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { db, doc, getDoc } from "../firebase";
import { 
  MasterAthlete, 
  MasterClub, 
  ClubHistoryItem,
  MasterUser
} from "../types";
import { 
  subscribeToVscSystemAthletes, 
  saveVscSystemAthletes,
  saveVscSystemAthleteSingle,
  deleteVscSystemAthleteSingle,
  subscribeToVscSystemClubs,
  subscribeToVscSystemUsers,
  saveVscSystemUsers,
  addVscAuditLog,
  subscribeToTournamentsList
} from "../lib/firebaseService";
import { calculateAthleteCareerStats } from "../utils/careerCalculator";
import { 
  User, 
  Users, 
  MapPin, 
  Calendar, 
  Phone, 
  Facebook, 
  Link, 
  CheckCircle, 
  XCircle, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  QrCode, 
  IdCard, 
  History, 
  Plus, 
  Save, 
  Check, 
  X, 
  Upload, 
  Globe, 
  Sliders, 
  Briefcase,
  AlertCircle,
  Award,
  Clock,
  Trophy
} from "lucide-react";
import * as XLSX from "xlsx";
import { VIETNAM_PROVINCES, WORLD_COUNTRIES } from "../utils/geography";
import { usePermission } from "../providers/PermissionProvider";

export const AVATAR_MALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e2e8f0'/><circle cx='50' cy='38' r='20' fill='%23475569'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23475569'/></svg>";
export const AVATAR_FEMALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fce7f3'/><circle cx='50' cy='38' r='20' fill='%23db2777'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23db2777'/></svg>";

export const compressAvatarImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Highly optimized target size for fast avatar uploading and loading: 120x120
        const size = 120;
        canvas.width = size;
        canvas.height = size;

        // Draw cropped to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        // Output highly compressed, optimized JPEG for lightning-fast database writes & reads
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Lỗi tải ảnh"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lỗi đọc tệp"));
    reader.readAsDataURL(file);
  });
};

interface AthleteRegistryProps {
  currentUser?: any;
  userRole?: string;
}

export function AthleteRegistry({ currentUser, userRole }: AthleteRegistryProps) {
  const [masterAthletes, setMasterAthletes] = useState<MasterAthlete[]>([]);
  const [masterClubs, setMasterClubs] = useState<MasterClub[]>([]);
  const [systemUsers, setSystemUsers] = useState<MasterUser[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [claimFilter, setClaimFilter] = useState<string>("all");

  // Selected athlete for viewing portal or card
  const [activeAthlete, setActiveAthlete] = useState<MasterAthlete | null>(null);
  const [modalSubTab, setModalSubTab] = useState<"general" | "performance" | "matches" | "achievements">("general");
  const [showDigitalCard, setShowDigitalCard] = useState<boolean>(false);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Modals & form state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Partial<MasterAthlete>>({});
  const [deleteConfirmAthlete, setDeleteConfirmAthlete] = useState<MasterAthlete | null>(null);
  
  // New club history entry form
  const [showAddHistoryRow, setShowAddHistoryRow] = useState(false);
  const [newHistoryItem, setNewHistoryItem] = useState<Partial<ClubHistoryItem>>({
    clubId: "",
    clubName: "",
    joinDate: new Date().toISOString().split("T")[0],
    leaveDate: "",
    reason: ""
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { role, userProfile } = usePermission();
  
  const isAdmin = useMemo(() => {
    if (userRole === "spectator") {
      return false;
    }
    if (currentUser?.email === "nahnatofficial@gmail.com") return true;
    
    const hasClubManager = userProfile?.role === "club_manager";
    const hasAdminProfile = userProfile?.role === "admin" || userProfile?.role === "system_owner";
    const isGlobalAdminOrOwner = role === "system_owner" || role === "admin";
    
    return isGlobalAdminOrOwner || hasClubManager || hasAdminProfile;
  }, [role, userRole, userProfile, currentUser]);

  useEffect(() => {
    if (showAddEditModal || deleteConfirmAthlete) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showAddEditModal, deleteConfirmAthlete]);

  useEffect(() => {
    // Sub to athletes
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      // Data from Firestore vsc_system_athletes might be in legacy format or full format
      const mapped = data.map((ath: any) => {
        return {
          id: ath.id || ath.athleteId,
          vscNumber: ath.idCard || ath.vscNumber || `VSC-${ath.id}`,
          fullName: ath.fullName || ath.name || "",
          email: ath.email || "",
          nickname: ath.nickname || "",
          gender: ath.gender || "Nam",
          dob: ath.dob || ath.birthday || "",
          avatarUrl: ath.avatarUrl || ath.avatar || (ath.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE),
          province: ath.province || "Hà Nội",
          country: ath.country || "Việt Nam",
          clubId: ath.clubId || ath.currentClubId || ath.team || "",
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
        } as MasterAthlete;
      });
      setMasterAthletes(mapped);
    });

    // Sub to clubs
    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setMasterClubs(data || []);
    });

    // Sub to users
    const unsubUsers = subscribeToVscSystemUsers((data) => {
      setSystemUsers(data || []);
    });

    // Sub to tournaments for calculating career profiles
    const unsubTournaments = subscribeToTournamentsList((data) => {
      setTournaments(data || []);
    });

    return () => {
      unsubAthletes();
      unsubClubs();
      unsubUsers();
      unsubTournaments();
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Dynamic Athlete Career Profile (ACP) stats for the active selected athlete
  const activeAthleteCareerStats = useMemo(() => {
    if (!activeAthlete) return null;
    return calculateAthleteCareerStats(activeAthlete.id, activeAthlete.fullName, tournaments);
  }, [activeAthlete, tournaments]);

  // Dynamic Athlete Career Profile (ACP) stats for the athlete currently being edited/added in the modal
  const modalAthleteCareerStats = useMemo(() => {
    if (!formFields.id && !formFields.fullName) return null;
    return calculateAthleteCareerStats(formFields.id || "", formFields.fullName || "", tournaments);
  }, [formFields.id, formFields.fullName, tournaments]);

  // Calculate profile completeness percentage for the active athlete
  const activeCompletionPercentage = useMemo(() => {
    if (!activeAthlete) return 0;
    let fields = 0;
    let filled = 0;
    const checkList = ["fullName", "vscNumber", "gender", "dob", "province", "clubName", "phone", "facebook", "zalo", "biography", "slingshotType", "bandSpec", "ammoSize", "shootingStance"];
    checkList.forEach((f) => {
      fields++;
      if ((activeAthlete as any)[f]) filled++;
    });
    return Math.round((filled / fields) * 100);
  }, [activeAthlete]);

  // Convert MasterAthletes to legacy form and save
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
        email: a.email || "",
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
        qrCode: a.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${a.vscNumber || a.id}`,
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

    // Legacy mapping keeps it safe for tournaments & other v2/v3 components
    const legacyAthletes = list.map((a) => ({
      id: a.id,
      name: a.fullName,
      fullName: a.fullName,
      email: a.email || "",
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
      qrCode: a.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${a.vscNumber || a.id}`,
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

  // Start edit or add
  const handleStartAdd = () => {
    setEditingId(null);
    const ids = masterAthletes.map(a => {
      const idNum = parseInt(a.id) || 0;
      const vscMatch = (a.vscNumber || "").match(/\d+/);
      const vscNum = vscMatch ? parseInt(vscMatch[0]) : 0;
      return Math.max(idNum, vscNum);
    });
    const maxVal = Math.max(...ids, 0);
    const nextId = (maxVal + 1).toString().padStart(4, "0");
    setFormFields({
      id: nextId,
      vscNumber: `VSC-${nextId}`,
      fullName: "",
      email: "",
      gender: "Nam",
      dob: "1995-01-01",
      avatarUrl: AVATAR_MALE,
      province: "Hà Nội",
      country: "Việt Nam",
      clubId: "",
      clubName: "",
      registeredClubId: "",
      registeredClubName: "",
      clubHistory: [],
      status: "active",
      claimStatus: "unclaimed",
      phone: "",
      facebook: "",
      zalo: "",
      biography: ""
    });
    setShowAddHistoryRow(false);
    setShowAddEditModal(true);
  };

  const handleStartEdit = (athlete: MasterAthlete) => {
    setEditingId(athlete.id);
    setFormFields({ ...athlete });
    setShowAddHistoryRow(false);
    setShowAddEditModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.fullName || !formFields.fullName.trim()) {
      showToast("Vui lòng điền họ và tên vận động viên!", "error");
      return;
    }

    const athleteId = formFields.id || `ath-${Date.now()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${formFields.vscNumber || athleteId}`;

    const existingAthlete = masterAthletes.find(a => a.id === editingId);

    const updatedAthlete: MasterAthlete = {
      ...(formFields as MasterAthlete),
      id: athleteId,
      // Strictly preserve active club properties. They cannot be auto-assigned/edited from this form.
      clubId: existingAthlete ? (existingAthlete.clubId || "") : "",
      clubName: existingAthlete ? (existingAthlete.clubName || "") : "",
      clubHistory: existingAthlete ? (existingAthlete.clubHistory || []) : [],
      qrCode: qrCodeUrl,
      // Career stats are computed dynamically from actual tournaments
      totalTournaments: modalAthleteCareerStats ? modalAthleteCareerStats.totalTournaments : 0,
      goldMedals: modalAthleteCareerStats ? modalAthleteCareerStats.goldMedals : 0,
      silverMedals: modalAthleteCareerStats ? modalAthleteCareerStats.silverMedals : 0,
      bronzeMedals: modalAthleteCareerStats ? modalAthleteCareerStats.bronzeMedals : 0,
      bestScore10m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore10m : 0,
      bestScore12m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore12m : 0,
      bestScore15m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore15m : 0,
      // Admin form equipment is read-only, so preserve existing if editing, or default to empty/existing
      slingshotType: existingAthlete ? (existingAthlete.slingshotType || "") : (formFields.slingshotType || ""),
      bandSpec: existingAthlete ? (existingAthlete.bandSpec || "") : (formFields.bandSpec || ""),
      ammoSize: existingAthlete ? (existingAthlete.ammoSize || "") : (formFields.ammoSize || ""),
      shootingStance: existingAthlete ? (existingAthlete.shootingStance || "") : (formFields.shootingStance || ""),
      updatedAt: new Date().toISOString()
    };

    let updatedList = [...masterAthletes];
    if (editingId) {
      updatedList = updatedList.map((item) => item.id === editingId ? updatedAthlete : item);
      showToast("Đã cập nhật thông tin vận động viên!");
    } else {
      updatedList.push({
        ...updatedAthlete,
        createdAt: new Date().toISOString()
      });
      showToast("Đã thêm mới vận động viên vào hệ thống!");
    }

    setMasterAthletes(updatedList);
    saveAthletesList(updatedList);
    setShowAddEditModal(false);

    // Refresh active view if selected
    if (activeAthlete && activeAthlete.id === athleteId) {
      setActiveAthlete(updatedAthlete);
    }
  };

  const handleDeleteAthlete = async (athlete: MasterAthlete) => {
    const id = athlete.id;
    const name = athlete.fullName;
    setDeleteConfirmAthlete(null); // Close modal immediately for optimal responsiveness!
    
    const updated = masterAthletes.filter((item) => item.id !== id);
    setMasterAthletes(updated);
    
    if (activeAthlete?.id === id) {
      setActiveAthlete(null);
    }
    
    try {
      saveAthletesList(updated);
      showToast(`Đã xóa vận động viên ${name}!`);
    } catch (error) {
      console.error("Failed to delete athlete:", error);
      showToast("Có lỗi xảy ra khi xóa dữ liệu trên hệ thống!", "error");
    }
  };

  const handleToggleLock = async (athlete: MasterAthlete) => {
    const nextStatus = athlete.status === "active" ? "suspended" : "active";
    const updatedList = masterAthletes.map(item => {
      if (item.id === athlete.id) {
        return { ...item, status: nextStatus, updatedAt: new Date().toISOString() } as MasterAthlete;
      }
      return item;
    });

    setMasterAthletes(updatedList);
    saveAthletesList(updatedList);
    showToast(`Đã ${nextStatus === "active" ? "mở khóa" : "khóa"} vận động viên ${athlete.fullName}!`);
    if (activeAthlete?.id === athlete.id) {
      setActiveAthlete({ ...activeAthlete, status: nextStatus } as MasterAthlete);
    }
  };

  // Profile claims workflow
  const handleClaimProfile = async (athlete: MasterAthlete) => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để gửi yêu cầu liên kết!", "error");
      return;
    }

    // Check if user is already linked somewhere
    const alreadyLinked = masterAthletes.find(a => a.linkedUserId === currentUser.uid);
    if (alreadyLinked) {
      showToast(`Tài khoản của bạn đã được liên kết với vận động viên ${alreadyLinked.fullName}!`, "error");
      return;
    }

    const updatedList = masterAthletes.map(item => {
      if (item.id === athlete.id) {
        return { 
          ...item, 
          claimStatus: "pending_review", 
          linkedUserId: currentUser.uid, 
          updatedAt: new Date().toISOString() 
        } as MasterAthlete;
      }
      return item;
    });

    setMasterAthletes(updatedList);
    saveAthletesList(updatedList);
    showToast("Gửi yêu cầu liên kết thành công! Chờ Admin phê duyệt.");
    
    // Audit log
    await addVscAuditLog({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      action: "LINK_ACCOUNT",
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      details: `Yêu cầu liên kết tài khoản ${currentUser.email} với VĐV ${athlete.fullName} (${athlete.vscNumber})`,
      timestamp: new Date().toISOString()
    });

    if (activeAthlete?.id === athlete.id) {
      setActiveAthlete({ ...activeAthlete, claimStatus: "pending_review", linkedUserId: currentUser.uid } as MasterAthlete);
    }
  };

  const handleApproveClaim = async (athlete: MasterAthlete, approve: boolean) => {
    let extraFields: Partial<MasterAthlete> = {};

    if (approve && athlete.linkedUserId) {
      try {
        const userDocRef = doc(db, "users", athlete.linkedUserId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          extraFields = {
            email: uData.email || "",
            phone: uData.phone || athlete.phone || "",
            facebook: uData.facebook || athlete.facebook || "",
            zalo: uData.zalo || athlete.zalo || "",
            biography: uData.biography || athlete.biography || "",
            emergencyContact: uData.emergencyContact || athlete.emergencyContact || "",
            personalNotes: uData.personalNotes || athlete.personalNotes || "",
            gender: uData.gender || athlete.gender || "Nam",
            dob: uData.birthDate || athlete.dob || "",
            province: uData.province || athlete.province || "",
            avatarUrl: uData.customAvatarUrl || uData.avatarUrl || uData.photoURL || athlete.avatarUrl || ""
          };

          const { updateUserProfile } = await import("../lib/firebaseService");
          await updateUserProfile(athlete.linkedUserId, {
            masterAthleteId: athlete.id,
            claimStatus: "verified"
          });
        }
      } catch (err) {
        console.error("Error fetching linked user profile:", err);
      }
    }

    const updatedList = masterAthletes.map(item => {
      if (item.id === athlete.id) {
        return { 
          ...item, 
          claimStatus: approve ? "verified" : "unclaimed", 
          linkedUserId: approve ? item.linkedUserId : "",
          ...extraFields,
          updatedAt: new Date().toISOString() 
        } as MasterAthlete;
      }
      return item;
    });

    setMasterAthletes(updatedList);
    saveAthletesList(updatedList);
    showToast(approve ? "Đã phê duyệt liên kết và đồng bộ thông tin thành công!" : "Đã từ chối và hủy yêu cầu liên kết.");

    await addVscAuditLog({
      userId: currentUser?.uid || "admin",
      userEmail: currentUser?.email || "admin@vscs.asia",
      action: approve ? "LINK_ACCOUNT" : "UNLINK_ACCOUNT",
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      details: approve 
        ? `Phê duyệt liên kết tài khoản cho VĐV ${athlete.fullName} (${athlete.vscNumber})` 
        : `Hủy/Từ chối liên kết tài khoản cho VĐV ${athlete.fullName} (${athlete.vscNumber})`,
      timestamp: new Date().toISOString()
    });

    if (activeAthlete?.id === athlete.id) {
      setActiveAthlete({ 
        ...activeAthlete, 
        claimStatus: approve ? "verified" : "unclaimed", 
        linkedUserId: approve ? activeAthlete.linkedUserId : "",
        ...extraFields
      } as MasterAthlete);
    }
  };

  // Athlete edits their own contact info/biography
  const handleSelfUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAthlete) return;

    const updatedList = masterAthletes.map(item => {
      if (item.id === activeAthlete.id) {
        return {
          ...item,
          avatarUrl: formFields.avatarUrl !== undefined ? formFields.avatarUrl : item.avatarUrl,
          phone: formFields.phone || "",
          facebook: formFields.facebook || "",
          zalo: formFields.zalo || "",
          biography: formFields.biography || "",
          emergencyContact: formFields.emergencyContact || "",
          personalNotes: formFields.personalNotes || "",
          slingshotType: formFields.slingshotType || "",
          bandSpec: formFields.bandSpec || "",
          ammoSize: formFields.ammoSize || "",
          shootingStance: formFields.shootingStance || "",
          achievements: formFields.achievements || "",
          bestScore10m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore10m : 0,
          bestScore12m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore12m : 0,
          bestScore15m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore15m : 0,
          totalTournaments: modalAthleteCareerStats ? modalAthleteCareerStats.totalTournaments : 0,
          goldMedals: modalAthleteCareerStats ? modalAthleteCareerStats.goldMedals : 0,
          silverMedals: modalAthleteCareerStats ? modalAthleteCareerStats.silverMedals : 0,
          bronzeMedals: modalAthleteCareerStats ? modalAthleteCareerStats.bronzeMedals : 0,
          updatedAt: new Date().toISOString()
        } as MasterAthlete;
      }
      return item;
    });

    setMasterAthletes(updatedList);
    saveAthletesList(updatedList);
    showToast("Hồ sơ cá nhân đã được lưu thành công!");
    setActiveAthlete({
      ...activeAthlete,
      avatarUrl: formFields.avatarUrl !== undefined ? formFields.avatarUrl : activeAthlete.avatarUrl,
      phone: formFields.phone || "",
      facebook: formFields.facebook || "",
      zalo: formFields.zalo || "",
      biography: formFields.biography || "",
      emergencyContact: formFields.emergencyContact || "",
      personalNotes: formFields.personalNotes || "",
      slingshotType: formFields.slingshotType || "",
      bandSpec: formFields.bandSpec || "",
      ammoSize: formFields.ammoSize || "",
      shootingStance: formFields.shootingStance || "",
      achievements: formFields.achievements || "",
      bestScore10m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore10m : 0,
      bestScore12m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore12m : 0,
      bestScore15m: modalAthleteCareerStats ? modalAthleteCareerStats.bestScore15m : 0,
      totalTournaments: modalAthleteCareerStats ? modalAthleteCareerStats.totalTournaments : 0,
      goldMedals: modalAthleteCareerStats ? modalAthleteCareerStats.goldMedals : 0,
      silverMedals: modalAthleteCareerStats ? modalAthleteCareerStats.silverMedals : 0,
      bronzeMedals: modalAthleteCareerStats ? modalAthleteCareerStats.bronzeMedals : 0,
    } as MasterAthlete);
    setShowAddEditModal(false);
  };

  // Add Club history item
  const handleAddHistoryItem = () => {
    if (!newHistoryItem.clubId) {
      showToast("Vui lòng chọn Câu lạc bộ!", "error");
      return;
    }
    const selectedClub = masterClubs.find(c => c.id === newHistoryItem.clubId);
    if (!selectedClub) return;

    const newItem: ClubHistoryItem = {
      clubId: selectedClub.id,
      clubName: selectedClub.clubName,
      joinDate: newHistoryItem.joinDate || new Date().toISOString().split("T")[0],
      leaveDate: newHistoryItem.leaveDate || undefined,
      reason: newHistoryItem.reason || undefined
    };

    const currentHistory = formFields.clubHistory || [];
    const updatedHistory = [...currentHistory, newItem];

    // Set the current clubId of athlete to this newly joined club if it's the active one
    const isCurrentClub = !newItem.leaveDate;
    
    setFormFields({
      ...formFields,
      clubHistory: updatedHistory,
      clubId: isCurrentClub ? newItem.clubId : formFields.clubId,
      clubName: isCurrentClub ? newItem.clubName : formFields.clubName
    });

    setNewHistoryItem({
      clubId: "",
      clubName: "",
      joinDate: new Date().toISOString().split("T")[0],
      leaveDate: "",
      reason: ""
    });
    setShowAddHistoryRow(false);
  };

  const handleRemoveHistoryItem = (index: number) => {
    const currentHistory = formFields.clubHistory || [];
    const updatedHistory = currentHistory.filter((_, i) => i !== index);
    setFormFields({
      ...formFields,
      clubHistory: updatedHistory
    });
  };

  // Excel Import
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          showToast("Tệp Excel trống hoặc không đúng cấu trúc!", "error");
          return;
        }

        const merged = [...masterAthletes];
        jsonData.forEach((row: any) => {
          // Identify raw IDs and VSC number
          const rawId = row.id || row.ID || row.Id || row["Mã Định Danh"] || row["Mã định danh"] || "";
          const keyId = String(rawId).trim() || `import-${Date.now()}-${Math.random().toString().substring(2, 6)}`;
          
          const vscNum = String(row.vscNumber || row["Số Thẻ VSC"] || row["Số thẻ VSC"] || row.vsc || row.ID || keyId).trim();
          const fName = String(row.fullName || row["Họ Và Tên"] || row["Họ và tên"] || row["Họ tên"] || row["Họ Tên"] || row.name || "").trim();
          
          // Only import if we have a valid name
          if (!fName) return;

          const nName = String(row.nickname || row["Tên Thường Gọi"] || row["Tên thường gọi"] || "").trim();
          
          let gdr: "Nam" | "Nữ" | "Khác" = "Nam";
          const rawGender = String(row.gender || row["Giới Tính"] || row["Giới tính"] || "Nam").trim();
          if (rawGender === "Nữ") gdr = "Nữ";
          else if (rawGender === "Khác") gdr = "Khác";

          const dobVal = String(row.dob || row["Ngày Sinh"] || row["Ngày sinh"] || "1995-01-01").trim();
          const provVal = String(row.province || row["Tỉnh/Thành"] || row["Tỉnh / Thành"] || row["Tỉnh thành"] || "Hà Nội").trim();
          const countryVal = String(row.country || row["Quốc Gia"] || row["Quốc gia"] || "Việt Nam").trim();
          const cId = String(row.clubId || row["Mã Câu Lạc Bộ"] || row["Mã câu lạc bộ"] || "").trim();
          const cName = String(row.clubName || row["Tên Câu Lạc Bộ"] || row["Tên câu lạc bộ"] || "").trim();

          const regCId = String(row.registeredClubId || row["Mã CLB Đăng Ký"] || row["Mã CLB đăng ký"] || "").trim();
          const regCName = String(row.registeredClubName || row["Tên CLB Đăng Ký"] || row["Tên CLB đăng ký"] || "").trim();

          const emailVal = String(row.email || row["Email Liên Kết"] || row["Email liên kết"] || "").trim();
          const phoneVal = String(row.phone || row["Số Điện Thoại"] || row["Số điện thoại"] || "").trim();
          const fbVal = String(row.facebook || row["Facebook"] || "").trim();
          const zaloVal = String(row.zalo || row["Zalo"] || "").trim();
          const bioVal = String(row.biography || row["Tiểu Sử"] || row["Tiểu sử"] || "").trim();
          const emerVal = String(row.emergencyContact || row["Liên Hệ Khẩn Cấp"] || row["Liên hệ khẩn cấp"] || "").trim();
          const noteVal = String(row.personalNotes || row["Ghi Chú Cá Nhân"] || row["Ghi chú cá nhân"] || "").trim();
          const avUrl = String(row.avatarUrl || row["Ảnh Đại Diện (URL)"] || row["Ảnh đại diện (URL)"] || (gdr === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)).trim();

          let statVal: "active" | "suspended" | "retired" = "active";
          const rawStatus = String(row.status || row["Trạng Thái"] || row["Trạng thái"] || "active").trim().toLowerCase();
          if (rawStatus.includes("khóa") || rawStatus.includes("suspended") || rawStatus.includes("tạm")) {
            statVal = "suspended";
          } else if (rawStatus.includes("nghệ") || rawStatus.includes("retired") || rawStatus.includes("giải")) {
            statVal = "retired";
          }

          let claimS: "unclaimed" | "pending_review" | "claimed" | "verified" = "unclaimed";
          const rawClaim = String(row.claimStatus || row["Trạng Thái Liên Kết"] || row["Trạng thái liên kết"] || "unclaimed").trim().toLowerCase();
          if (rawClaim.includes("đã liên kết") || rawClaim.includes("verified") || rawClaim.includes("claimed")) {
            claimS = "verified";
          } else if (rawClaim.includes("chờ") || rawClaim.includes("pending")) {
            claimS = "pending_review";
          }

          const item: MasterAthlete = {
            id: keyId,
            vscNumber: vscNum,
            fullName: fName,
            nickname: nName || undefined,
            gender: gdr,
            dob: dobVal,
            avatarUrl: avUrl,
            province: provVal,
            country: countryVal,
            clubId: cId || undefined,
            clubName: cName || undefined,
            registeredClubId: regCId || undefined,
            registeredClubName: regCName || undefined,
            clubHistory: [],
            email: emailVal || undefined,
            phone: phoneVal || undefined,
            facebook: fbVal || undefined,
            zalo: zaloVal || undefined,
            biography: bioVal || undefined,
            emergencyContact: emerVal || undefined,
            personalNotes: noteVal || undefined,
            status: statVal,
            claimStatus: claimS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const idx = merged.findIndex((m) => m.id === keyId || m.vscNumber === item.vscNumber);
          if (idx >= 0) {
            // Merge fields safely without wiping existing properties
            merged[idx] = {
              ...merged[idx],
              vscNumber: item.vscNumber || merged[idx].vscNumber,
              fullName: item.fullName || merged[idx].fullName,
              nickname: item.nickname !== undefined ? item.nickname : merged[idx].nickname,
              gender: item.gender || merged[idx].gender,
              dob: item.dob || merged[idx].dob,
              avatarUrl: item.avatarUrl || merged[idx].avatarUrl,
              province: item.province || merged[idx].province,
              country: item.country || merged[idx].country,
              clubId: item.clubId !== undefined ? item.clubId : merged[idx].clubId,
              clubName: item.clubName !== undefined ? item.clubName : merged[idx].clubName,
              registeredClubId: item.registeredClubId !== undefined ? item.registeredClubId : merged[idx].registeredClubId,
              registeredClubName: item.registeredClubName !== undefined ? item.registeredClubName : merged[idx].registeredClubName,
              email: item.email !== undefined ? item.email : merged[idx].email,
              phone: item.phone !== undefined ? item.phone : merged[idx].phone,
              facebook: item.facebook !== undefined ? item.facebook : merged[idx].facebook,
              zalo: item.zalo !== undefined ? item.zalo : merged[idx].zalo,
              biography: item.biography !== undefined ? item.biography : merged[idx].biography,
              emergencyContact: item.emergencyContact !== undefined ? item.emergencyContact : merged[idx].emergencyContact,
              personalNotes: item.personalNotes !== undefined ? item.personalNotes : merged[idx].personalNotes,
              status: item.status || merged[idx].status,
              claimStatus: item.claimStatus || merged[idx].claimStatus,
              updatedAt: new Date().toISOString()
            };
          } else {
            merged.push(item);
          }
        });

        setMasterAthletes(merged);
        await saveAthletesList(merged);
        showToast(`Nhập thành công ${jsonData.length} vận động viên từ Excel!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi đọc tệp Excel. Vui lòng kiểm tra lại cấu trúc.", "error");
      }
    };
    fileReader.readAsArrayBuffer(file);
    e.target.value = ""; // Clear file input
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAthletes.map(a => ({
        "ID": a.id,
        "Số Thẻ VSC": a.vscNumber,
        "Họ Và Tên": a.fullName,
        "Tên Thường Gọi": a.nickname || "",
        "Giới Tính": a.gender,
        "Ngày Sinh": a.dob || "",
        "Tỉnh/Thành": a.province,
        "Quốc Gia": a.country,
        "Mã Câu Lạc Bộ": a.clubId || "",
        "Tên Câu Lạc Bộ": a.clubName || "",
        "Mã CLB Đăng Ký": a.registeredClubId || "",
        "Tên CLB Đăng Ký": a.registeredClubName || "",
        "Email Liên Kết": a.email || "",
        "Số Điện Thoại": a.phone || "",
        "Facebook": a.facebook || "",
        "Zalo": a.zalo || "",
        "Tiểu Sử": a.biography || "",
        "Liên Hệ Khẩn Cấp": a.emergencyContact || "",
        "Ghi Chú Cá Nhân": a.personalNotes || "",
        "Ảnh Đại Diện (URL)": a.avatarUrl || "",
        "Trạng Thái": a.status === "active" ? "Thi đấu" : a.status === "suspended" ? "Tạm khóa" : "Giải nghệ",
        "Trạng Thái Liên Kết": a.claimStatus === "verified" || a.claimStatus === "claimed" ? "Đã liên kết" : a.claimStatus === "pending_review" ? "Đang chờ duyệt" : "Chưa liên kết"
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vận Động Viên");
      XLSX.writeFile(workbook, "Danh_Sach_Van_Dong_Vien_VSC.xlsx");
      showToast("Xuất tệp Excel thành công!");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi xuất tệp dữ liệu.", "error");
    }
  };

  // Filter athletes
  const filteredAthletes = masterAthletes.filter((a) => {
    const matchesSearch = 
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.vscNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.clubName || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGender = genderFilter === "all" || a.gender === genderFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesClub = clubFilter === "all" || a.clubId === clubFilter;
    const matchesClaim = 
      claimFilter === "all" || 
      (claimFilter === "claimed" && a.claimStatus === "verified") ||
      (claimFilter === "pending" && a.claimStatus === "pending_review") ||
      (claimFilter === "unclaimed" && a.claimStatus === "unclaimed");

    return matchesSearch && matchesGender && matchesStatus && matchesClub && matchesClaim;
  });

  // Check if current logged-in user is linked to any profile
  const linkedAthleteProfile = currentUser ? masterAthletes.find(a => a.linkedUserId === currentUser.uid) : null;

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

      {/* Alert Banner for pending approvals */}
      {isAdmin && masterAthletes.filter(a => a.claimStatus === "pending_review").length > 0 && (
        <div id="vsc-pending-approvals-alert" className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex gap-3.5 items-start">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-amber-300 uppercase">
                Yêu cầu liên kết thẻ VĐV đang chờ duyệt
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                Hiện đang có <strong className="text-amber-600 dark:text-amber-400 font-mono">{masterAthletes.filter(a => a.claimStatus === "pending_review").length}</strong> hồ sơ vận động viên đang gửi yêu cầu xác minh làm thành viên chính thức. Vui lòng phê duyệt để cấp quyền thi đấu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClaimFilter("pending")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            Duyệt ngay
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full">
                VSC National Registry
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-400" />
              Athlete (Vận động viên)
            </h1>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Cơ sở dữ liệu trung tâm quản lý thẻ thi đấu, liên kết tài khoản định danh, lịch sử đầu quân câu lạc bộ toàn quốc.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={handleStartAdd}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Thêm VĐV Hệ Thống
                </button>
                <label className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Nhập Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>
              </>
            )}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Athlete Dashboard Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Linking Card */}
        {currentUser && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm md:col-span-2">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <IdCard className="w-4 h-4 text-indigo-500" />
              Định Danh VĐV Của Bạn
            </h3>
            {linkedAthleteProfile ? (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <img
                    src={linkedAthleteProfile.avatarUrl || (linkedAthleteProfile.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                    alt={linkedAthleteProfile.fullName}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {linkedAthleteProfile.fullName}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                      Thẻ VSC: {linkedAthleteProfile.vscNumber}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      CLB: {linkedAthleteProfile.clubName && linkedAthleteProfile.clubName !== "free" && linkedAthleteProfile.clubName !== "Free" && linkedAthleteProfile.clubName !== "Tự Do" ? linkedAthleteProfile.clubName : "Tự do"} • Tỉnh: {linkedAthleteProfile.province}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveAthlete(linkedAthleteProfile);
                      setShowDigitalCard(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                  >
                    Xem Hồ Sơ
                  </button>
                  <button
                    onClick={() => {
                      setFormFields({ ...linkedAthleteProfile });
                      setEditingId(linkedAthleteProfile.id);
                      setShowAddEditModal(true);
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                  >
                    Sửa Thông Tin
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Bạn chưa liên kết tài khoản Google này với bất kỳ thẻ thi đấu VSC nào trong hệ thống.
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-3 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Tìm hồ sơ của bạn dưới danh sách và bấm "Liên kết tài khoản" để kích hoạt thẻ điện tử.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Global Statistics */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Tổng số vận động viên
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {masterAthletes.length}
            </span>
            <span className="text-xs text-slate-500">thành viên quốc gia</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 text-xs">
            <div>
              <span className="text-slate-500">Nam: </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {masterAthletes.filter(a => a.gender === "Nam").length}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Nữ: </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {masterAthletes.filter(a => a.gender === "Nữ").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="space-y-4">
        {/* Full width: List & Search Filters */}
        <div className="space-y-4">
          {/* Filters card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên VĐV, Số Thẻ VSC, tỉnh thành hoặc CLB..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            {/* Select options dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Giới tính</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Tất cả</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Thi đấu</option>
                  <option value="suspended">Khóa/Ngưng</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Câu lạc bộ</label>
                <select
                  value={clubFilter}
                  onChange={(e) => setClubFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  <option value="all">Tất cả CLB</option>
                  {masterClubs.map(c => (
                    <option key={c.id} value={c.id}>{c.clubName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Định danh</label>
                <select
                  value={claimFilter}
                  onChange={(e) => setClaimFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Tất cả</option>
                  <option value="claimed">Đã liên kết</option>
                  <option value="pending">Chờ phê duyệt</option>
                  <option value="unclaimed">Chưa liên kết</option>
                </select>
              </div>
            </div>
          </div>

          {/* List display */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/55 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Hiển thị {filteredAthletes.length} / {masterAthletes.length} vận động viên
              </span>
            </div>

            {filteredAthletes.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-sm">Không tìm thấy vận động viên nào phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm khác</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredAthletes.map((ath, idx) => {
                  const isLinkedToThisUser = currentUser && ath.linkedUserId === currentUser.uid;
                  return (
                    <div 
                      key={`${ath.id || 'ath'}-${idx}`}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-indigo-50/10 dark:hover:bg-slate-850/20 transition-all cursor-pointer ${
                        activeAthlete?.id === ath.id ? "bg-indigo-50/30 dark:bg-slate-850/40 border-l-4 border-indigo-600" : ""
                      }`}
                      onClick={() => {
                        setActiveAthlete(ath);
                        setShowDigitalCard(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={ath.avatarUrl || (ath.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                          alt={ath.fullName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {ath.fullName}
                            </h3>
                            {ath.nickname && (
                              <span className="text-xs text-slate-500 font-medium">({ath.nickname})</span>
                            )}
                            
                            {/* Claim/Verification tags */}
                            {ath.claimStatus === "verified" ? (
                              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Định danh VSC
                              </span>
                            ) : ath.claimStatus === "pending_review" ? (
                              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 animate-pulse">
                                Chờ duyệt
                              </span>
                            ) : null}

                            {ath.status === "suspended" && (
                              <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                Bị Khóa
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{ath.vscNumber}</span>
                            <span>•</span>
                            <span>{ath.gender}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {ath.province}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              CLB: {ath.clubName && ath.clubName !== "free" && ath.clubName !== "Free" && ath.clubName !== "Tự Do" ? ath.clubName : "VĐV Tự do"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action trigger buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveAthlete(ath);
                            setShowDigitalCard(false);
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg"
                          title="Xem chi tiết hồ sơ"
                        >
                          <User className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveAthlete(ath);
                            setShowDigitalCard(true);
                            setIsCardFlipped(false);
                          }}
                          className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-lg"
                          title="Xem thẻ VĐV điện tử"
                        >
                          <IdCard className="w-4 h-4" />
                        </button>

                        {/* Account linkage request buttons */}
                        {currentUser && ath.claimStatus === "unclaimed" && !isLinkedToThisUser && (
                          <button
                            onClick={() => handleClaimProfile(ath)}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-lg"
                          >
                            Yêu cầu Liên kết
                          </button>
                        )}

                        {/* Admin verification button */}
                        {isAdmin && ath.claimStatus === "pending_review" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApproveClaim(ath, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-lg"
                              title="Duyệt liên kết"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleApproveClaim(ath, false)}
                              className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-lg"
                              title="Từ chối liên kết"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Admin settings controls */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleStartEdit(ath)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg"
                              title="Sửa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleLock(ath)}
                              className={`p-1.5 rounded-lg ${
                                ath.status === "active" 
                                  ? "text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400" 
                                  : "text-amber-600 hover:text-slate-600 dark:text-amber-400 dark:hover:text-slate-400"
                              }`}
                              title={ath.status === "active" ? "Khóa hồ sơ" : "Mở khóa hồ sơ"}
                            >
                              {ath.status === "active" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmAthlete(ath)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ATHLETE PROFILE VIEW MODAL */}
      {activeAthlete && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 font-sans">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setShowDigitalCard(false)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    !showDigitalCard 
                      ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Hồ Sơ VĐV
                </button>
                <button
                  onClick={() => setShowDigitalCard(true)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    showDigitalCard 
                      ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Thẻ Điện Tử
                </button>
              </div>

              <button
                onClick={() => setActiveAthlete(null)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-5 overflow-y-auto max-h-[75vh]">
              {/* RENDER DIGITAL CARD VIEW */}
              {showDigitalCard ? (
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
                            src={activeAthlete.avatarUrl || (activeAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                            alt={activeAthlete.fullName}
                            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500/50 shadow-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-1 right-2 bg-indigo-600 border border-indigo-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            VĐV
                          </div>
                        </div>

                        <h2 className="text-xl font-extrabold text-white text-center tracking-tight leading-tight">
                          {activeAthlete.fullName}
                        </h2>
                        {activeAthlete.nickname && (
                          <p className="text-xs text-indigo-300 font-medium text-center italic mt-0.5">
                            "{activeAthlete.nickname}"
                          </p>
                        )}
                        
                        <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg px-4 py-1.5 mt-3 text-center">
                          <span className="text-[10px] uppercase text-indigo-300 tracking-widest font-black block">
                            MÃ SỐ VĐV QUỐC GIA
                          </span>
                          <span className="text-base font-mono font-black tracking-widest text-amber-400">
                            {activeAthlete.vscNumber}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Details */}
                      <div className="border-t border-indigo-500/20 pt-3 grid grid-cols-2 text-xs gap-2">
                        <div>
                          <p className="text-[9px] text-indigo-400 uppercase font-bold">Câu lạc bộ</p>
                          <p className="font-extrabold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                            {activeAthlete.clubName && activeAthlete.clubName !== "free" && activeAthlete.clubName !== "Free" && activeAthlete.clubName !== "Tự Do" ? activeAthlete.clubName : "Tự Do"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-indigo-400 uppercase font-bold">Địa phương</p>
                          <p className="font-extrabold text-white">
                            {activeAthlete.province}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CARD BACK SIDE */}
                    <div className="absolute inset-0 w-full h-full rotate-y-180 backface-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-inner">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-bold text-slate-400">THÔNG TIN XÁC THỰC THẺ</span>
                        <span className="text-[9px] text-amber-500 font-mono">STATUS: {activeAthlete.status === "active" ? "ACTIVE" : "LOCKED"}</span>
                      </div>

                      {/* QR Code central container */}
                      <div className="flex flex-col items-center justify-center py-4 my-auto space-y-3">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-700 shadow-xl">
                          <img
                            src={activeAthlete.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeAthlete.vscNumber)}`}
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
                        <p>ID: {activeAthlete.id}</p>
                        <p>Xác thực: {activeAthlete.claimStatus === "verified" ? "Đã xác minh" : "Chưa xác minh"}</p>
                        <p>Ngày cấp: {new Date(activeAthlete.createdAt).toLocaleDateString("vi-VN")}</p>
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
                      src={activeAthlete.avatarUrl || (activeAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                      alt={activeAthlete.fullName}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {activeAthlete.fullName}
                      </h3>
                      <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Thẻ VSC: {activeAthlete.vscNumber}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {activeAthlete.status === "active" ? (
                          <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Tạm ngưng
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{activeAthlete.gender}</span>
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
                      {activeAthleteCareerStats && (
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
                              {activeAthlete.claimStatus === "verified" || activeAthlete.claimStatus === "claimed" ? (
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
                                    src={activeAthlete.avatarUrl || (activeAthlete.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
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
                                    {activeAthlete.fullName}
                                  </h4>
                                  <span className="text-[9px] font-mono text-indigo-300 font-black tracking-wider">
                                    {activeAthlete.vscNumber}
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate max-w-[150px] mt-0.5">
                                    📍 Tỉnh/TP: {activeAthlete.province || "Chưa rõ"}
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate max-w-[150px]">
                                    🛡️ CLB: {activeAthlete.clubName && activeAthlete.clubName !== "free" && activeAthlete.clubName !== "Free" && activeAthlete.clubName !== "Tự Do" ? activeAthlete.clubName : "Tự Do"}
                                  </span>
                                </div>
                              </div>

                              {/* QR Code */}
                              <div className="flex flex-col items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-xs">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&color=4f46e5&data=${encodeURIComponent('https://vscs.asia/athlete/' + (activeAthlete.vscNumber || 'unlinked'))}`}
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
                                  <span className="text-[11px] font-black text-amber-400">#{activeAthleteCareerStats.careerRanking}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">ELO VSC</span>
                                  <span className="text-[11px] font-black text-indigo-400">{activeAthleteCareerStats.careerRating.toLocaleString()}</span>
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

                          {/* Quick Stats Grid & Medal collection */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Giải đã đấu</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.totalTournaments}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Lượt bắn</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.totalMatches}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Độ chính xác</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Biography (Self-editable or admin) */}
                      {activeAthlete.biography ? (
                        <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tiểu sử</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{activeAthlete.biography}"
                          </p>
                        </div>
                      ) : (
                        currentUser && activeAthlete.linkedUserId === currentUser.uid && (
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900 text-center">
                            <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-1 font-medium">
                              Chưa có tiểu sử tóm tắt.
                            </p>
                            <button
                              onClick={() => {
                                setFormFields({ ...activeAthlete });
                                setEditingId(activeAthlete.id);
                                setShowAddEditModal(true);
                              }}
                              className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded transition-all"
                            >
                              Cập nhật tiểu sử
                            </button>
                          </div>
                        )
                      )}

                      {/* Demographic and official data */}
                      <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Ngày sinh:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {activeAthlete.dob ? new Date(activeAthlete.dob).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Quốc tịch / Địa phương:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-indigo-500" /> {activeAthlete.province}, {activeAthlete.country}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-500">Câu lạc bộ hiện tại:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {activeAthlete.clubName && activeAthlete.clubName !== "free" && activeAthlete.clubName !== "Free" && activeAthlete.clubName !== "Tự Do" ? activeAthlete.clubName : "VĐV Tự Do"}
                          </span>
                        </div>
                        {activeAthlete.phone && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Số điện thoại:</span>
                            <span className="font-semibold text-slate-850 dark:text-slate-250 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {activeAthlete.phone}
                            </span>
                          </div>
                        )}
                        {activeAthlete.facebook && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Facebook:</span>
                            <a 
                              href={activeAthlete.facebook} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Facebook className="w-3.5 h-3.5" /> Liên kết Facebook
                            </a>
                          </div>
                        )}
                        {activeAthlete.emergencyContact && (
                          <div className="py-2.5 flex justify-between">
                            <span className="text-slate-500">Liên hệ khẩn cấp:</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">{activeAthlete.emergencyContact}</span>
                          </div>
                        )}
                        {activeAthlete.personalNotes && currentUser && activeAthlete.linkedUserId === currentUser.uid && (
                          <div className="py-2.5">
                            <span className="text-slate-500 block mb-1">Ghi chú cá nhân (chỉ bạn thấy):</span>
                            <span className="text-slate-700 dark:text-slate-300 block bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">{activeAthlete.personalNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Equipment specs */}
                      <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">🎯 Thông Số Trang Bị Thi Đấu</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                            <span className="text-slate-400">Loại Ná:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{activeAthlete.slingshotType || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 pl-2">
                            <span className="text-slate-400">Loại Dây:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{activeAthlete.bandSpec || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between pt-0.5">
                            <span className="text-slate-400">Cỡ Đạn:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{activeAthlete.ammoSize || "Chưa cập nhật"}</span>
                          </div>
                          <div className="flex justify-between pt-0.5 pl-2">
                            <span className="text-slate-400">Thế Bắn:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]" title={activeAthlete.shootingStance}>{activeAthlete.shootingStance || "Chưa cập nhật"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Club Career History Log (The record list) */}
                      <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-4 h-4 text-indigo-500" />
                          Lịch Sử Đầu Quân CLB
                        </h4>
                        
                        {!activeAthlete.clubHistory || activeAthlete.clubHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Chưa có lịch sử chuyển nhượng câu lạc bộ.</p>
                        ) : (
                          <div className="relative pl-4 border-l border-indigo-200 dark:border-indigo-900 space-y-3.5 my-2">
                            {activeAthlete.clubHistory.map((item, index) => (
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

                  {/* SUB-TAB 2: PERFORMANCE (ELO, MEDALS, TIMELINE) */}
                  {modalSubTab === "performance" && activeAthleteCareerStats && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {/* Rating / Ranking Bento cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-805 p-3.5 rounded-2xl flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">ĐIỂM XẾP HẠNG (ELO)</span>
                          <div className="mt-1.5">
                            <span className="text-lg sm:text-xl font-black text-indigo-650 dark:text-indigo-400">{activeAthleteCareerStats.careerRating.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 ml-1">pts</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-805 p-3.5 rounded-2xl flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">HẠNG HỆ THỐNG</span>
                          <div className="mt-1.5">
                            <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">#{activeAthleteCareerStats.careerRanking}</span>
                            <span className="text-[10px] text-slate-500 ml-1">Toàn quốc</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Giải đấu</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.totalTournaments}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Lượt bắn</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.totalMatches}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Chính xác</span>
                          <span className="text-sm font-black text-slate-700 dark:text-white">{activeAthleteCareerStats.accuracy}%</span>
                        </div>
                      </div>

                      {/* Medal podium visual */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Bộ sưu tập Huy chương</h4>
                        <div className="flex justify-around items-end pt-2">
                          {/* Silver */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-slate-500">{activeAthleteCareerStats.silverMedals}</span>
                            <div className="w-10 bg-slate-300 dark:bg-slate-700 h-10 rounded-t-lg flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs">
                              II
                            </div>
                            <span className="text-[8px] text-slate-500">Bạc</span>
                          </div>
                          {/* Gold */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black text-amber-500">{activeAthleteCareerStats.goldMedals}</span>
                            <div className="w-12 bg-amber-400 dark:bg-amber-500 h-14 rounded-t-lg flex items-center justify-center text-white dark:text-slate-900 font-black text-sm shadow-md">
                              I
                            </div>
                            <span className="text-[8px] text-amber-500 font-bold">Vô Địch</span>
                          </div>
                          {/* Bronze */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-amber-700">{activeAthleteCareerStats.bronzeMedals}</span>
                            <div className="w-10 bg-amber-600 dark:bg-amber-800 h-8 rounded-t-lg flex items-center justify-center text-amber-100 font-bold text-xs shadow-xs">
                              III
                            </div>
                            <span className="text-[8px] text-slate-500">Đồng</span>
                          </div>
                        </div>
                      </div>

                      {/* Shootout metrics (Temporarily hidden for future PK Solo implementation) */}

                      {/* Dynamic SVG chart for performance trends over time */}
                      {activeAthleteCareerStats.performanceTimeline && activeAthleteCareerStats.performanceTimeline.length > 0 ? (
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
                                points={activeAthleteCareerStats.performanceTimeline.map((item: any, idx: number) => {
                                  const count = activeAthleteCareerStats.performanceTimeline.length;
                                  const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
                                  const y = 80 - (item.accuracy / 100) * 70;
                                  return `${x}%,${y}`;
                                }).join(" ")}
                                className="transition-all duration-700"
                              />
                              {activeAthleteCareerStats.performanceTimeline.map((item: any, idx: number) => {
                                const count = activeAthleteCareerStats.performanceTimeline.length;
                                const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
                                const y = 80 - (item.accuracy / 100) * 70;
                                return (
                                  <g key={`timeline-${idx}-${item.tournamentName}`} className="group cursor-pointer">
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
                            <span>{activeAthleteCareerStats.performanceTimeline[0].date}</span>
                            <span>Tiến trình giải đấu ({activeAthleteCareerStats.performanceTimeline.length})</span>
                            <span>{activeAthleteCareerStats.performanceTimeline[activeAthleteCareerStats.performanceTimeline.length - 1].date}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                          Chưa có đủ dữ liệu giải đấu để dựng tiến trình phong độ.
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 3: MATCH HISTORY & DISTANCES */}
                  {modalSubTab === "matches" && activeAthleteCareerStats && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {/* Bullseyes Count & Personal Bests */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Tổng điểm 10 (Hồng tâm):</span>
                          <span className="text-sm font-black text-indigo-605 dark:text-indigo-400 mt-1">{activeAthleteCareerStats.bullseyesCount} hồng tâm</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Kỷ lục Giải / Cự ly:</span>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                            <span>{activeAthleteCareerStats.personalBests.singleMatchMaxScore}đ</span>
                            <span>{activeAthleteCareerStats.personalBests.singleDistanceMaxAccuracy}% Acc</span>
                          </div>
                        </div>
                      </div>

                      {/* Distance breakdown */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Hiệu suất theo Cự ly:</span>
                        {activeAthleteCareerStats.distancesPerformance.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-4 italic">Chưa có thông số cự ly.</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5">
                            {activeAthleteCareerStats.distancesPerformance.map((d: any, i: number) => (
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
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Lịch sử đấu trường chính thức:</span>
                        {activeAthleteCareerStats.tournamentHistory.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-2xl">
                            Chưa ghi nhận tham gia giải đấu chính thức nào.
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-2.5">
                            {activeAthleteCareerStats.tournamentHistory.map((item: any, idx: number) => (
                              <div key={item.tournamentId || `tour-hist-${idx}`} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-1">
                                  <h5 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 line-clamp-1">{item.tournamentName}</h5>
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

                  {/* SUB-TAB 4: HONORARY ACHIEVEMENTS / BADGES */}
                  {modalSubTab === "achievements" && activeAthleteCareerStats && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="text-[10px] font-black uppercase text-slate-505 tracking-wider">Danh hiệu hệ thống & Kiểm duyệt:</span>
                      <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                        {activeAthleteCareerStats.goldMedals > 0 && (
                          <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 p-3 rounded-2xl flex gap-3 items-center">
                            <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-amber-850 dark:text-amber-400">VÔ ĐỊCH ĐẤU TRƯỜNG</h5>
                              <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Sở hữu ít nhất một chức vô địch giải đấu chính thức trên hệ thống.</p>
                            </div>
                          </div>
                        )}

                        {activeAthleteCareerStats.accuracy >= 80 && (
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

                        {activeAthleteCareerStats.bullseyesCount > 5 && (
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

                        {activeAthleteCareerStats.totalTournaments >= 3 && (
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
                        {activeAthlete.achievements && (
                          <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/10 dark:to-purple-950/10 p-3 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/40">
                            <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider mb-1">🏅 Thành Tích Cá Nhân Do VĐV Khai Báo:</span>
                            <p className="text-xs text-slate-750 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic">
                              "{activeAthlete.achievements}"
                            </p>
                          </div>
                        )}

                        {/* If no stats yet */}
                        {(!activeAthleteCareerStats || (activeAthleteCareerStats.goldMedals === 0 && activeAthleteCareerStats.accuracy < 80 && activeAthleteCareerStats.bullseyesCount <= 5 && activeAthleteCareerStats.totalTournaments < 3)) && !activeAthlete.achievements && (
                          <div className="text-center py-8 text-xs text-slate-450 italic">
                            Chưa đạt đủ cột mốc để ghi nhận Danh hiệu danh dự. Hãy tham gia giải đấu nhiều hơn để nâng hạng!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profile claiming info */}
                  {currentUser && activeAthlete.claimStatus !== "verified" && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      {activeAthlete.claimStatus === "pending_review" ? (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-2.5 rounded-xl text-xs text-amber-800 dark:text-amber-400">
                          <p className="font-semibold">Đang chờ Admin phê duyệt liên kết định danh...</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimProfile(activeAthlete)}
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

      {/* RENDER ADD / EDIT ATHLETE MODAL (ADMIN ONLY OR ATHELTE SELF EDIT) */}
      {showAddEditModal && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 shrink-0">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                {isAdmin 
                  ? editingId ? "Sửa Vận Động Viên Hệ Thống" : "Thêm Vận Động Viên Mới" 
                  : "Cập Nhật Hồ Sơ Định Danh Cá Nhân"
                }
              </h3>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={isAdmin ? handleSaveForm : handleSelfUpdateProfile} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {isAdmin ? (
                /* ADMIN SYSTEM-WIDE FIELD FORM */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        MÃ ĐỊNH DANH (ID) *
                      </label>
                      <input
                        type="text"
                        disabled={true}
                        value={formFields.id || ""}
                        className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        SỐ THẺ VSC QUỐC GIA *
                      </label>
                      <input
                        type="text"
                        disabled={true}
                        value={formFields.vscNumber || ""}
                        className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        HỌ VÀ TÊN *
                      </label>
                      <input
                        type="text"
                        value={formFields.fullName || ""}
                        onChange={(e) => setFormFields({ ...formFields, fullName: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        TÊN THƯỜNG GỌI / NICKNAME
                      </label>
                      <input
                        type="text"
                        value={formFields.nickname || ""}
                        onChange={(e) => setFormFields({ ...formFields, nickname: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        GIỚI TÍNH
                      </label>
                      <select
                        value={formFields.gender || "Nam"}
                        onChange={(e) => {
                          const val = e.target.value as "Nam" | "Nữ" | "Khác";
                          const defAvatar = val === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
                          setFormFields({ ...formFields, gender: val, avatarUrl: formFields.avatarUrl === AVATAR_MALE || formFields.avatarUrl === AVATAR_FEMALE ? defAvatar : formFields.avatarUrl });
                        }}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-medium"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        NGÀY SINH *
                      </label>
                      <input
                        type="date"
                        value={formFields.dob || "1995-01-01"}
                        onChange={(e) => setFormFields({ ...formFields, dob: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        TRẠNG THÁI HOẠT ĐỘNG
                      </label>
                      <select
                        value={formFields.status || "active"}
                        onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-medium"
                      >
                        <option value="active">Thi Đấu (Active)</option>
                        <option value="suspended">Tạm Khóa (Suspended)</option>
                        <option value="retired">Giải Nghệ (Retired)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        QUỐC GIA
                      </label>
                      <select
                        value={formFields.country || "Việt Nam"}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          const isVN = newCountry === "Việt Nam";
                          let newProv = formFields.province || "Hà Nội";
                          if (isVN && !VIETNAM_PROVINCES.includes(newProv)) {
                            newProv = "Hà Nội";
                          }
                          setFormFields({
                            ...formFields,
                            country: newCountry,
                            province: newProv
                          });
                        }}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-medium focus:outline-none"
                      >
                        {WORLD_COUNTRIES.map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        TỈNH / THÀNH PHỐ
                      </label>
                      {(formFields.country || "Việt Nam") === "Việt Nam" ? (
                        <select
                          value={formFields.province || "Hà Nội"}
                          onChange={(e) => {
                            setFormFields({
                              ...formFields,
                              province: e.target.value,
                              country: "Việt Nam"
                            });
                          }}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-medium focus:outline-none"
                        >
                          {VIETNAM_PROVINCES.map((pv) => (
                            <option key={pv} value={pv}>
                              {pv}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nhập tỉnh/thành hoặc bỏ trống"
                          value={formFields.province || ""}
                          onChange={(e) => {
                            const typedProv = e.target.value;
                            const match = VIETNAM_PROVINCES.find(pv => pv.trim().toLowerCase() === typedProv.trim().toLowerCase());
                            if (match) {
                              setFormFields({
                                ...formFields,
                                province: match,
                                country: "Việt Nam"
                              });
                            } else {
                              setFormFields({
                                ...formFields,
                                province: typedProv
                              });
                            }
                          }}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                      EMAIL TÀI KHOẢN LIÊN KẾT
                    </label>
                    <input
                      type="email"
                      value={formFields.email || ""}
                      onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                      placeholder="e.g. nahnatofficial@gmail.com"
                      className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  {/* Club Assign */}
                  <div className="p-3 bg-indigo-50/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase mb-1">
                          CÂU LẠC BỘ CHÍNH THỨC (Đã Duyệt)
                        </label>
                        <input
                          type="text"
                          disabled
                          value={formFields.clubName && formFields.clubName !== "free" && formFields.clubName !== "Free" && formFields.clubName !== "Tự Do" ? `${formFields.clubName}` : "VĐV Tự Do (Không trực thuộc CLB)"}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 dark:text-slate-400 font-bold opacity-80"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Chỉ thay đổi qua yêu cầu gia nhập hoặc do Admin thêm trực tiếp trong Cổng CLB.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase mb-1">
                          CÂU LẠC BỘ KHAI BÁO / MONG MUỐN
                        </label>
                        <select
                          value={formFields.registeredClubId || ""}
                          onChange={(e) => {
                            const selectedClub = masterClubs.find(c => c.id === e.target.value);
                            setFormFields({ 
                              ...formFields, 
                              registeredClubId: e.target.value, 
                              registeredClubName: selectedClub ? selectedClub.clubName : "" 
                            });
                          }}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-medium"
                        >
                          <option value="">VĐV Tự Do (Chưa chọn CLB đăng ký)</option>
                          {masterClubs.map(c => (
                            <option key={c.id} value={c.id}>{c.clubName}</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          VĐV tự chọn CLB của mình. Không tự động trở thành thành viên trong tab CLB.
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-950 space-y-3">
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase">
                        ẢNH ĐẠI DIỆN (AVATAR)
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850">
                        <div className="shrink-0 relative group">
                          <img
                            src={formFields.avatarUrl || (formFields.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                            alt="Avatar Preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex flex-wrap gap-2">
                            <label className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              Tải lên ảnh mới
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressAvatarImage(file);
                                      setFormFields({ ...formFields, avatarUrl: compressed });
                                      showToast("Đã tải lên và nén ảnh đại diện thành công!");
                                    } catch (err) {
                                      showToast("Lỗi nén/tải ảnh đại diện", "error");
                                    }
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            {formFields.avatarUrl && formFields.avatarUrl !== AVATAR_MALE && formFields.avatarUrl !== AVATAR_FEMALE && (
                              <button
                                type="button"
                                onClick={() => {
                                  const def = formFields.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
                                  setFormFields({ ...formFields, avatarUrl: def });
                                  showToast("Đã khôi phục ảnh đại diện mặc định!");
                                }}
                                className="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                              >
                                Xóa ảnh
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Hỗ trợ tệp ảnh (JPEG, PNG). Ảnh sẽ được tự động cắt vuông và nén tối ưu dung lượng hệ thống.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-450 block uppercase">Hoặc đường dẫn URL ảnh</span>
                        <input
                          type="text"
                          value={formFields.avatarUrl || ""}
                          onChange={(e) => setFormFields({ ...formFields, avatarUrl: e.target.value })}
                          placeholder="e.g. https://domain.com/my-photo.jpg"
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Manage Club history trail */}
                    <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-950 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <History className="w-3.5 h-3.5 text-indigo-500" />
                          QUẢN LÝ LỊCH SỬ CLB ({formFields.clubHistory?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddHistoryRow(!showAddHistoryRow)}
                          className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Thêm lịch sử chuyển nhượng
                        </button>
                      </div>

                      {/* Expandable row for adding record */}
                      {showAddHistoryRow && (
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-indigo-200 dark:border-indigo-900 text-xs space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Chọn CLB</label>
                              <select
                                value={newHistoryItem.clubId || ""}
                                onChange={(e) => {
                                  const selectedClub = masterClubs.find(c => c.id === e.target.value);
                                  setNewHistoryItem({ 
                                    ...newHistoryItem, 
                                    clubId: e.target.value,
                                    clubName: selectedClub ? selectedClub.clubName : ""
                                  });
                                }}
                                className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200"
                              >
                                <option value="">-- Chọn câu lạc bộ --</option>
                                {masterClubs.map(c => (
                                  <option key={c.id} value={c.id}>{c.clubName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Ngày gia nhập</label>
                              <input
                                type="date"
                                value={newHistoryItem.joinDate || ""}
                                onChange={(e) => setNewHistoryItem({ ...newHistoryItem, joinDate: e.target.value })}
                                className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Ngày rời CLB (bỏ trống nếu đang ở)</label>
                              <input
                                type="date"
                                value={newHistoryItem.leaveDate || ""}
                                onChange={(e) => setNewHistoryItem({ ...newHistoryItem, leaveDate: e.target.value })}
                                className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Lý do rời CLB / Chú thích</label>
                            <input
                              type="text"
                              value={newHistoryItem.reason || ""}
                              onChange={(e) => setNewHistoryItem({ ...newHistoryItem, reason: e.target.value })}
                              placeholder="e.g. Chuyển nhượng tự do, hết hạn hợp đồng..."
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddHistoryRow(false)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleAddHistoryItem}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold"
                            >
                              Lưu Record
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display history records with Delete */}
                      {formFields.clubHistory && formFields.clubHistory.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto border border-indigo-100/40 dark:border-indigo-950/40 rounded-lg p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {formFields.clubHistory.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-1.5">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.clubName}</span>
                                <span className="text-[10px] text-slate-500 ml-2">
                                  ({new Date(item.joinDate).toLocaleDateString("vi-VN")}
                                  {item.leaveDate ? ` - ${new Date(item.leaveDate).toLocaleDateString("vi-VN")}` : " - Hiện tại"})
                                </span>
                                {item.reason && <p className="text-[11px] text-slate-400 italic">Lý do: {item.reason}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveHistoryItem(index)}
                                className="text-rose-600 hover:bg-rose-50 p-1 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center p-2 bg-white dark:bg-slate-950 rounded border border-dashed">Chưa có lịch sử chuyển nhượng được lưu.</p>
                      )}
                    </div>
                  </div>

                  {/* HỒ SƠ SỰ NGHIỆP VÀ TRANG BỊ VĐV */}
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Hồ Sơ Sự Nghiệp & Trang Bị Thi Đấu (Từ thi đấu & VĐV tự khai báo)
                    </h4>

                    <div className="p-3 bg-amber-50 dark:bg-slate-950/40 border border-amber-100 dark:border-slate-900 text-amber-800 dark:text-amber-400 rounded-xl space-y-1">
                      <p className="font-bold">⚠️ Thông số đồng bộ từ hệ thống:</p>
                      <p className="text-[11px] leading-relaxed opacity-90">Hồ sơ sự nghiệp (số giải đấu, huy chương, kỷ lục cự ly) được đồng bộ hoàn toàn tự động từ kết quả thi đấu thực tế tại các giải đấu. Trang bị thi đấu do VĐV tự kê khai khi cập nhật hồ sơ cá nhân của họ. Admin không thể can thiệp thủ công các giá trị này.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          SỐ GIẢI ĐÃ ĐẤU
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.totalTournaments : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-amber-500 uppercase mb-1">
                          🥇 HC VÀNG
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.goldMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                          🥈 HC BẠC
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.silverMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-amber-700 uppercase mb-1">
                          🥉 HC ĐỒNG
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bronzeMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 10M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore10m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 12M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore12m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 15M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore15m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        THÀNH TÍCH NỔI BẬT (QUỐC GIA, PHONG TRÀO, v.v.)
                      </label>
                      <textarea
                        disabled={true}
                        value={formFields.achievements || ""}
                        placeholder="Chưa cập nhật thành tích nổi bật..."
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          LOẠI NÁ SỬ DỤNG
                        </label>
                        <input
                          type="text"
                          disabled={true}
                          value={formFields.slingshotType || ""}
                          placeholder="Chưa cập nhật..."
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          LOẠI DÂY SỬ DỤNG
                        </label>
                        <input
                          type="text"
                          disabled={true}
                          value={formFields.bandSpec || ""}
                          placeholder="Chưa cập nhật..."
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KÍCH THƯỚC BI (ĐẠN)
                        </label>
                        <input
                          type="text"
                          disabled={true}
                          value={formFields.ammoSize || ""}
                          placeholder="Chưa cập nhật..."
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          TƯ THẾ BẮN SỞ TRƯỜNG
                        </label>
                        <input
                          type="text"
                          disabled={true}
                          value={formFields.shootingStance || ""}
                          placeholder="Chưa cập nhật..."
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* SELF PROFILE UPDATE (BIOGRAPHY, SOCIAL LINKS, etc) */
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-indigo-50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Họ và tên: {activeAthlete?.fullName}</p>
                    <p className="text-slate-500 font-mono mt-0.5">Số thẻ VSC: {activeAthlete?.vscNumber}</p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      💡 Bạn đang sửa thông tin cá nhân. Để thay đổi các thông tin thi đấu chính thức (Tên, ngày sinh, giới tính, mã số, CLB chính), vui lòng liên hệ trực tiếp với Ban tổ chức (Admin).
                    </p>
                  </div>

                  <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-100 dark:border-slate-850">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase">
                      ẢNH ĐẠI DIỆN CỦA BẠN (AVATAR)
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="shrink-0 relative group">
                        <img
                          src={formFields.avatarUrl || (activeAthlete?.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)}
                          alt="Avatar Preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5 w-full">
                        <div className="flex flex-wrap gap-2">
                          <label className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            Tải lên ảnh mới
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressAvatarImage(file);
                                    setFormFields({ ...formFields, avatarUrl: compressed });
                                    showToast("Đã tải lên và nén ảnh đại diện thành công!");
                                  } catch (err) {
                                    showToast("Lỗi nén/tải ảnh đại diện", "error");
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          {formFields.avatarUrl && formFields.avatarUrl !== AVATAR_MALE && formFields.avatarUrl !== AVATAR_FEMALE && (
                            <button
                              type="button"
                              onClick={() => {
                                const def = activeAthlete?.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
                                setFormFields({ ...formFields, avatarUrl: def });
                                showToast("Đã khôi phục ảnh đại diện mặc định!");
                              }}
                              className="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Xóa ảnh
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Ảnh đại diện sẽ hiển thị trên thẻ thi đấu điện tử của bạn và bảng xếp hạng quốc gia.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                      TIỂU SỬ CÁ NHÂN / BIOGRAPHY (HIỂN THỊ CÔNG KHAI)
                    </label>
                    <textarea
                      value={formFields.biography || ""}
                      onChange={(e) => setFormFields({ ...formFields, biography: e.target.value })}
                      placeholder="e.g. Bắt đầu bắn súng cao su chuyên nghiệp từ năm 2021. Đạt nhiều giải thưởng miền Bắc..."
                      rows={3}
                      className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        SỐ ĐIỆN THOẠI CÁ NHÂN
                      </label>
                      <input
                        type="text"
                        value={formFields.phone || ""}
                        onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                        placeholder="e.g. 0912345678"
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        LIÊN KẾT FACEBOOK CÁ NHÂN
                      </label>
                      <input
                        type="text"
                        value={formFields.facebook || ""}
                        onChange={(e) => setFormFields({ ...formFields, facebook: e.target.value })}
                        placeholder="e.g. https://facebook.com/username"
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        ZALO CÁ NHÂN (HOẶC SỐ ĐIỆN THOẠI ZALO)
                      </label>
                      <input
                        type="text"
                        value={formFields.zalo || ""}
                        onChange={(e) => setFormFields({ ...formFields, zalo: e.target.value })}
                        placeholder="e.g. 0912345678"
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        LIÊN HỆ KHẨN CẤP (TÊN + SỐ ĐT)
                      </label>
                      <input
                        type="text"
                        value={formFields.emergencyContact || ""}
                        onChange={(e) => setFormFields({ ...formFields, emergencyContact: e.target.value })}
                        placeholder="e.g. Chị Hoa (Vợ) - 0987654321"
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                      GHI CHÚ / GHI NHỚ CÁ NHÂN (CHỈ RIÊNG BẠN NHÌN THẤY)
                    </label>
                    <textarea
                      value={formFields.personalNotes || ""}
                      onChange={(e) => setFormFields({ ...formFields, personalNotes: e.target.value })}
                      placeholder="e.g. Lưu ý điều chỉnh khoảng cách ngắm bắn ở cự ly 15m..."
                      rows={2}
                      className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  {/* HỒ SƠ SỰ NGHIỆP VÀ TRANG BỊ VĐV */}
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Hồ Sơ Sự Nghiệp & Trang Bị Thi Đấu Của Bạn
                    </h4>

                    <div className="p-3 bg-amber-50 dark:bg-slate-950/40 border border-amber-100 dark:border-slate-900 text-amber-800 dark:text-amber-400 rounded-xl space-y-1">
                      <p className="font-bold">📊 Hồ sơ sự nghiệp tự động:</p>
                      <p className="text-[11px] leading-relaxed opacity-90">Hồ sơ sự nghiệp (số giải đấu, huy chương, kỷ lục cự ly) được tính toán tự động dựa trên kết quả thi đấu thực tế của bạn tại các giải đấu hệ thống. Bạn có thể tự điền thành tích nổi bật khác và thông số trang bị thi đấu ở dưới.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          SỐ GIẢI ĐÃ ĐẤU
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.totalTournaments : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-amber-500 uppercase mb-1">
                          🥇 HC VÀNG
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.goldMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                          🥈 HC BẠC
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.silverMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-amber-700 uppercase mb-1">
                          🥉 HC ĐỒNG
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bronzeMedals : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 10M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore10m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 12M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore12m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KỶ LỤC CÁ NHÂN 15M (ĐIỂM)
                        </label>
                        <input
                          type="number"
                          disabled={true}
                          value={modalAthleteCareerStats ? modalAthleteCareerStats.bestScore15m : 0}
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                        THÀNH TÍCH NỔI BẬT CỦA BẠN
                      </label>
                      <textarea
                        value={formFields.achievements || ""}
                        onChange={(e) => setFormFields({ ...formFields, achievements: e.target.value })}
                        placeholder="e.g. Vô địch Quốc gia VSC 2024, Hạng nhất giải trẻ 2025, kỷ lục vô tiền khoáng hậu..."
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          LOẠI NÁ SỬ DỤNG
                        </label>
                        <input
                          type="text"
                          value={formFields.slingshotType || ""}
                          onChange={(e) => setFormFields({ ...formFields, slingshotType: e.target.value })}
                          placeholder="e.g. Ná dẹt chạc 7.5 CNC hợp kim"
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          LOẠI DÂY SỬ DỤNG
                        </label>
                        <input
                          type="text"
                          value={formFields.bandSpec || ""}
                          onChange={(e) => setFormFields({ ...formFields, bandSpec: e.target.value })}
                          placeholder="e.g. Precise thun dẹt 0.55mm"
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          KÍCH THƯỚC BI (ĐẠN)
                        </label>
                        <input
                          type="text"
                          value={formFields.ammoSize || ""}
                          onChange={(e) => setFormFields({ ...formFields, ammoSize: e.target.value })}
                          placeholder="e.g. Bi sắt 7.0mm / 8.0mm"
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1">
                          TƯ THẾ BẮN SỞ TRƯỜNG
                        </label>
                        <input
                          type="text"
                          value={formFields.shootingStance || ""}
                          onChange={(e) => setFormFields({ ...formFields, shootingStance: e.target.value })}
                          placeholder="e.g. Bắn đứng chạc nghiêng 90 độ"
                          className="w-full p-2.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Action Buttons Pinned at bottom */}
              <div className="p-4 sm:p-5 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Delete Athlete Confirmation Modal */}
      {deleteConfirmAthlete && createPortal(
        <div className="viewport-center-overlay">
          <div className="viewport-center-content my-auto bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Xác Nhận Xóa Vận Động Viên?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn vận động viên{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  "{deleteConfirmAthlete.fullName}"
                </strong>{" "}
                khỏi hệ thống? Mọi kết quả thi đấu, liên kết tài khoản và lịch sử sẽ bị ảnh hưởng. Thao tác không thể hoàn tác.
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
                onClick={() => handleDeleteAthlete(deleteConfirmAthlete)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm shadow-rose-600/10"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
