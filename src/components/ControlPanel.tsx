import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  subscribeToTournamentsList, 
  deleteOnlineTournament,
  getUserProfile,
  updateUserProfile,
  TournamentData,
  subscribeToVscSystemAthletes,
  saveVscSystemAthletes,
  saveVscSystemAthleteSingle,
  deleteVscSystemAthleteSingle,
  coordinateLinkAthlete,
  coordinateUnlinkAthlete,
  calculateProfileCompletion,
  subscribeToVscSystemClubs,
  subscribeToVscClubRequests,
  saveVscClubRequests,
  saveVscSystemClubs,
  addVscAuditLog,
  getVscAuditLogs
} from "../lib/firebaseService";
import { calculateAthleteCareerStats } from "../utils/careerCalculator";
import { auth, db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { 
  Trophy, 
  Users, 
  Calendar, 
  Search, 
  User, 
  Award, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  LogIn,
  SlidersHorizontal,
  Inbox,
  AlertTriangle,
  UserCheck,
  CreditCard,
  MapPin,
  Building,
  Image as ImageIcon,
  Save,
  CheckCircle,
  HelpCircle,
  Clock,
  Activity,
  Phone,
  Facebook,
  MessageSquare,
  FileText,
  Link,
  Link2,
  UserPlus,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Bell
} from "lucide-react";
import { Athlete, DistanceConfig, MasterAthlete, MasterClub, ClubHistoryItem } from "../types";
import { getHitCount } from "../utils/qualification";
import { usePermission } from "../providers/PermissionProvider";
import { TestingHarnessComponent } from "./global/TestingHarness";
import { processAvatarImage, getAvatarPriority } from "../utils/avatarProcessor";
import { SettingsPanel } from "./SettingsPanel";
import { Settings as SettingsIcon } from "lucide-react";


interface ControlPanelProps {
  onSelectTournament: (id: string, tournament: TournamentData) => void;
  activeHistoryId: string | null;
  onOpenAuthModal: () => void;
  initialSubTab?: "profile" | "created" | "referee" | "settings" | "diagnostics" | "notifications";
  onSubTabChange?: (tab: "profile" | "created" | "referee" | "settings" | "diagnostics" | "notifications") => void;

  // Settings Panel props
  matchName?: string;
  setMatchName?: (val: string) => void;
  distances?: any[];
  setDistances?: (val: any[]) => void;
  shotsCount?: number;
  setShotsCount?: (val: number) => void;
  athletes?: any[];
  setAthletes?: (val: any[]) => void;
  masterAthletes?: any[];
  setMasterAthletes?: (val: any[]) => void;
  history?: any[];
  setHistory?: (val: any[]) => void;
  onSaveCurrentSessionToHistory?: () => void;
  onResetSession?: () => void;
  onImportBackup?: (data: string) => boolean;
  storedAthleteLists?: any;
  setStoredAthleteLists?: (val: any) => void;
  setActiveHistoryId?: (id: string | null) => void;
  startDate?: string;
  setStartDate?: (val: string) => void;
  endDate?: string;
  setEndDate?: (val: string) => void;

  teamDistances?: any[];
  setTeamDistances?: (val: any[]) => void;
  teamShotsCount?: number;
  setTeamShotsCount?: (val: number) => void;
  teamAthletes?: any[];
  setTeamAthletes?: (val: any[]) => void;
  directMaxShots?: number;
  setDirectMaxShots?: (val: number) => void;
  teamDirectMaxShots?: number;
  setTeamDirectMaxShots?: (val: number) => void;
  directMaxPoints?: number;
  setDirectMaxPoints?: (val: number | undefined) => void;
  teamDirectMaxPoints?: number;
  setTeamDirectMaxPoints?: (val: number | undefined) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onSelectTournament,
  activeHistoryId,
  onOpenAuthModal,
  initialSubTab,
  onSubTabChange,
  matchName = "",
  setMatchName = () => {},
  distances = [],
  setDistances = () => {},
  shotsCount = 10,
  setShotsCount = () => {},
  athletes = [],
  setAthletes = () => {},
  masterAthletes: masterAthletesProp = [],
  setMasterAthletes: setMasterAthletesProp = () => {},
  history = [],
  setHistory = () => {},
  onSaveCurrentSessionToHistory = () => {},
  onResetSession = () => {},
  onImportBackup = () => true,
  storedAthleteLists = {},
  setStoredAthleteLists = () => {},
  setActiveHistoryId = () => {},
  startDate = "",
  setStartDate = () => {},
  endDate = "",
  setEndDate = () => {},
  teamDistances = [],
  setTeamDistances = () => {},
  teamShotsCount = 10,
  setTeamShotsCount = () => {},
  teamAthletes = [],
  setTeamAthletes = () => {},
  directMaxShots = 10,
  setDirectMaxShots = () => {},
  teamDirectMaxShots = 10,
  setTeamDirectMaxShots = () => {},
  directMaxPoints = undefined,
  setDirectMaxPoints = () => {},
  teamDirectMaxPoints = undefined,
  setTeamDirectMaxPoints = () => {}
}) => {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  
  const { role } = usePermission();
  const isAdmin = role === "system_owner" || role === "admin";
  
  // Tab can be profile (hồ sơ của tôi), created (giải tôi tạo), referee (giải tôi trọng tài), settings (cấu hình hệ thống), diagnostics (kiểm thử), notifications (thông báo)
  const [localSubTab, setLocalSubTab] = useState<"profile" | "created" | "referee" | "settings" | "diagnostics" | "notifications">("profile");
  const subTab = initialSubTab || localSubTab;
  const setSubTab = (tab: "profile" | "created" | "referee" | "settings" | "diagnostics" | "notifications") => {
    setLocalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  useEffect(() => {
    if (initialSubTab) {
      setLocalSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Profile management state
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile fields state
  const [dispName, setDispName] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [clubName, setClubName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Refined Sporting Athlete state
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [zalo, setZalo] = useState("");
  const [biography, setBiography] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ" | "Khác">("Nam");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState("");

  // Master Athletes state & linking flow
  const [masterAthletes, setMasterAthletes] = useState<MasterAthlete[]>([]);
  const [masterClubs, setMasterClubs] = useState<any[]>([]);
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);
  const [linkingSearch, setLinkingSearch] = useState("");
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [selectedAthleteToLink, setSelectedAthleteToLink] = useState<MasterAthlete | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);

  // Athlete Career Profile (ACP) state V3
  const [acpTab, setAcpTab] = useState<"career" | "tournaments" | "statistics" | "achievements" | "club" | "equipment" | "verification" | "settings">("career");
  
  // Custom Equipment Profile State for Slingshot VSC
  const [slingshotType, setSlingshotType] = useState("Ná dẹt chạc 7.5 CNC");
  const [bandSpec, setBandSpec] = useState("Precise 0.55 - 19-13-150");
  const [ammoSize, setAmmoSize] = useState("Bi sắt 7mm");
  const [shootingStance, setShootingStance] = useState("Bắn đứng chạc nghiêng 90 độ");
  const [achievementsText, setAchievementsText] = useState("Vô địch VSC 2024, Á quân Miền Bắc 2025");

  // Profile visibility and preferences
  const [profileVisibility, setProfileVisibility] = useState<"public" | "club" | "private">("public");
  const [obsOverlayEnabled, setObsOverlayEnabled] = useState(true);
  const [liveTelemetryEnabled, setLiveTelemetryEnabled] = useState(true);

  const saveAthletesList = async (list: any[]) => {
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
        name: a.fullName || a.name || "",
        fullName: a.fullName || a.name || "",
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
      name: a.fullName || a.name || "",
      fullName: a.fullName || a.name || "",
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

  // Subscribe to system master athletes
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((data) => {
      const mapped = (data || []).map((ath: any) => ({
        id: ath.id || ath.athleteId,
        vscNumber: ath.vscNumber || ath.idCard || `VSC-${ath.id}`,
        fullName: ath.fullName || ath.name || "",
        nickname: ath.nickname || "",
        gender: ath.gender || "Nam",
        dob: ath.dob || "",
        avatarUrl: ath.avatarUrl || "",
        province: ath.province || "Hà Nội",
        country: ath.country || "Việt Nam",
        clubId: ath.clubId || ath.team || "",
        clubName: ath.clubName || ath.teamName || ath.team || "",
        clubHistory: ath.clubHistory || [],
        qrCode: ath.qrCode || "",
        phone: ath.phone || "",
        facebook: ath.facebook || "",
        zalo: ath.zalo || "",
        biography: ath.biography || "",
        emergencyContact: ath.emergencyContact || "",
        personalNotes: ath.personalNotes || "",
        status: ath.status || "active",
        linkedUserId: ath.linkedUserId || null,
        claimStatus: ath.claimStatus || "unclaimed",
        slingshotType: ath.slingshotType || "",
        bandSpec: ath.bandSpec || "",
        ammoSize: ath.ammoSize || "",
        shootingStance: ath.shootingStance || "",
        achievements: ath.achievements || ""
      } as MasterAthlete));
      setMasterAthletes(mapped);
    });
    return () => unsubscribe();
  }, []);

  // Compute reactive linked athlete profile
  const linkedAthlete = useMemo(() => {
    if (!profile?.masterAthleteId) return null;
    return masterAthletes.find(a => a.id === profile.masterAthleteId) || null;
  }, [profile?.masterAthleteId, masterAthletes]);

  // Compute reactive pending claim athlete
  const pendingAthlete = useMemo(() => {
    if (!currentUser) return null;
    return masterAthletes.find(a => a.linkedUserId === currentUser.uid && a.claimStatus === "pending_review") || null;
  }, [currentUser, masterAthletes]);

  // Track Auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch /users/{uid} document on load or user shifts
  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const fetched = await getUserProfile(currentUser.uid);
        if (fetched) {
          setProfile(fetched);
          setDispName(fetched.displayName || fetched.email?.split("@")[0] || "");
          setEmail(fetched.email || currentUser.email || "");
          setIdCard(fetched.cccd || "");
          setBirthDate(fetched.birthDate || "");
          setAddress(fetched.address || "");
          setProvince(fetched.province || "");
          setClubName(fetched.club || "");
          setPhone(fetched.phone || "");
          setFacebook(fetched.facebook || "");
          setZalo(fetched.zalo || "");
          setBiography(fetched.biography || "");
          setEmergencyContact(fetched.emergencyContact || "");
          setPersonalNotes(fetched.personalNotes || "");
          setGender(fetched.gender || "Nam");
          setCustomAvatarUrl(fetched.customAvatarUrl || "");
          setGoogleAvatarUrl(fetched.photoURL || currentUser.photoURL || "");
          setAvatarUrl(fetched.avatarUrl || fetched.photoURL || "");
          setSlingshotType(fetched.slingshotType || "Ná dẹt chạc 7.5 CNC");
          setBandSpec(fetched.bandSpec || "Precise 0.55 - 19-13-150");
          setAmmoSize(fetched.ammoSize || "Bi sắt 7mm");
          setShootingStance(fetched.shootingStance || "Bắn đứng chạc nghiêng 90 độ");
          setAchievementsText(fetched.achievements || "Vô địch VSC 2024, Á quân Miền Bắc 2025");
        } else {
          // Fallback init profile
          const defName = currentUser.email ? currentUser.email.split("@")[0] : "Người dùng";
          setDispName(defName);
          setEmail(currentUser.email || "");
          setGoogleAvatarUrl(currentUser.photoURL || "");
          setAvatarUrl(currentUser.photoURL || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [currentUser]);

  // Sync state values when linkedAthlete loads
  useEffect(() => {
    if (linkedAthlete) {
      setDispName(linkedAthlete.fullName || "");
      setIdCard(linkedAthlete.vscNumber || "");
      setClubName(linkedAthlete.clubName || "");
      setProvince(linkedAthlete.province || "");
      setBirthDate(linkedAthlete.dob || "");
      setGender(linkedAthlete.gender || "Nam");
      setPhone(linkedAthlete.phone || profile?.phone || "");
      setFacebook(linkedAthlete.facebook || profile?.facebook || "");
      setZalo(linkedAthlete.zalo || profile?.zalo || "");
      setBiography(linkedAthlete.biography || profile?.biography || "");
      setEmergencyContact(linkedAthlete.emergencyContact || profile?.emergencyContact || "");
      setPersonalNotes(linkedAthlete.personalNotes || profile?.personalNotes || "");
      setCustomAvatarUrl(linkedAthlete.avatarUrl || profile?.customAvatarUrl || "");
      setEmail(linkedAthlete.email || profile?.email || currentUser?.email || "");
      setSlingshotType(linkedAthlete.slingshotType || profile?.slingshotType || "Ná dẹt chạc 7.5 CNC");
      setBandSpec(linkedAthlete.bandSpec || profile?.bandSpec || "Precise 0.55 - 19-13-150");
      setAmmoSize(linkedAthlete.ammoSize || profile?.ammoSize || "Bi sắt 7mm");
      setShootingStance(linkedAthlete.shootingStance || profile?.shootingStance || "Bắn đứng chạc nghiêng 90 độ");
      setAchievementsText(linkedAthlete.achievements || profile?.achievements || "Vô địch VSC 2024, Á quân Miền Bắc 2025");
    }
  }, [linkedAthlete, profile, currentUser]);

  // Subscribe to system clubs
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemClubs((list) => {
      setMasterClubs(list);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to club join requests
  const [clubRequests, setClubRequests] = useState<any[]>([]);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVscClubRequests((data) => {
      setClubRequests(data || []);
    });
    return () => unsubscribe();
  }, []);

  // Compute reactive my managed clubs (where current user is president/leader)
  const myManagedClubs = useMemo(() => {
    if (!linkedAthlete) return [];
    return masterClubs.filter(club => club.leaderAthleteId === linkedAthlete.id);
  }, [masterClubs, linkedAthlete]);

  // Compute pending items counts
  const pendingClaimsCount = useMemo(() => {
    if (!isAdmin) return 0;
    return masterAthletes.filter(a => a.claimStatus === "pending_review").length;
  }, [isAdmin, masterAthletes]);

  const pendingClubRequestsCount = useMemo(() => {
    if (isAdmin) {
      return clubRequests.filter(r => r.status === "pending").length;
    }
    if (myManagedClubs.length > 0) {
      return clubRequests.filter(r => r.status === "pending" && myManagedClubs.some(c => c.id === r.clubId)).length;
    }
    return 0;
  }, [isAdmin, clubRequests, myManagedClubs]);

  const totalPendingCount = pendingClaimsCount + pendingClubRequestsCount;

  // State for audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    setLoadingAuditLogs(true);
    try {
      const logs = await getVscAuditLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (isAdmin && subTab === "notifications") {
      fetchAuditLogs();
    }
  }, [isAdmin, subTab]);

  const handleProcessClaimFromInbox = async (athlete: MasterAthlete, approve: boolean) => {
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

          await updateUserProfile(athlete.linkedUserId, {
            masterAthleteId: athlete.id,
            claimStatus: "verified"
          });
        }
      } catch (err) {
        console.error("Error fetching linked user profile:", err);
      }
    } else if (!approve && athlete.linkedUserId) {
      try {
        await updateUserProfile(athlete.linkedUserId, {
          masterAthleteId: "",
          claimStatus: "unclaimed"
        });
      } catch (err) {
        console.error("Error clearing linked user profile claimStatus:", err);
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
    await saveAthletesList(updatedList);
    alert(approve ? `Đã phê duyệt liên kết tài khoản cho VĐV ${athlete.fullName}!` : `Đã từ chối yêu cầu liên kết cho VĐV ${athlete.fullName}.`);

    await addVscAuditLog({
      userId: currentUser?.uid || "admin",
      userEmail: currentUser?.email || "admin@vscs.asia",
      action: approve ? "LINK_ACCOUNT" : "UNLINK_ACCOUNT",
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      details: approve 
        ? `Phê duyệt liên kết tài khoản cho VĐV ${athlete.fullName} (${athlete.vscNumber}) từ Hộp thư phê duyệt` 
        : `Từ chối liên kết tài khoản cho VĐV ${athlete.fullName} (${athlete.vscNumber}) từ Hộp thư phê duyệt`,
      timestamp: new Date().toISOString()
    });
    fetchAuditLogs();
  };

  const handleProcessClubRequestFromInbox = async (request: any, approve: boolean) => {
    // 1. Update Request status
    const updatedRequests = clubRequests.map(r => {
      if (r.id === request.id) {
        return {
          ...r,
          status: approve ? "approved" : "rejected",
          processedAt: new Date().toISOString(),
          processedBy: currentUser?.uid || "admin"
        };
      }
      return r;
    });

    setClubRequests(updatedRequests);
    await saveVscClubRequests(updatedRequests);

    const targetClub = masterClubs.find(c => c.id === request.clubId);

    if (approve && targetClub) {
      // 2. Update Athlete profile (add clubId, clubName and append ClubHistoryItem)
      const targetAthlete = masterAthletes.find(a => a.id === request.athleteId);
      if (targetAthlete) {
        const newHistory: ClubHistoryItem = {
          clubId: targetClub.id,
          clubName: targetClub.clubName,
          joinDate: new Date().toISOString().split("T")[0]
        };

        const updatedAthletes = masterAthletes.map(a => {
          if (a.id === targetAthlete.id) {
            return {
              ...a,
              clubId: targetClub.id,
              clubName: targetClub.clubName,
              clubHistory: [...(a.clubHistory || []), newHistory],
              updatedAt: new Date().toISOString()
            } as MasterAthlete;
          }
          return a;
        });

        setMasterAthletes(updatedAthletes);
        await saveAthletesList(updatedAthletes);
      }

      // 3. Update Club Member Count
      const updatedClubs = masterClubs.map(c => {
        if (c.id === targetClub.id) {
          return {
            ...c,
            memberCount: (c.memberCount || 0) + 1,
            updatedAt: new Date().toISOString()
          } as MasterClub;
        }
        return c;
      });
      setMasterClubs(updatedClubs);
      await saveVscSystemClubs(updatedClubs);
    }

    alert(approve ? `Đã đồng ý nhận VĐV ${request.athleteName} vào câu lạc bộ thành công!` : `Đã từ chối yêu cầu gia nhập của VĐV ${request.athleteName}.`);

    await addVscAuditLog({
      userId: currentUser?.uid || "admin",
      userEmail: currentUser?.email || "admin@vscs.asia",
      action: "UPDATE_ATHLETE_PROFILE",
      athleteId: request.athleteId,
      athleteName: request.athleteName,
      details: approve 
        ? `Phê duyệt yêu cầu gia nhập CLB ${targetClub?.clubName || request.clubId} cho VĐV ${request.athleteName}` 
        : `Từ chối yêu cầu gia nhập CLB ${targetClub?.clubName || request.clubId} cho VĐV ${request.athleteName}`,
      timestamp: new Date().toISOString()
    });
    fetchAuditLogs();
  };

  // Subscribe to tournaments live database
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTournamentsList((list) => {
      setTournaments(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter tournaments by search
  const filteredClubs = useMemo(() => {
    if (!clubName.trim()) return masterClubs;
    return masterClubs.filter(club => 
      club.clubName?.toLowerCase().includes(clubName.toLowerCase()) ||
      club.shortName?.toLowerCase().includes(clubName.toLowerCase())
    );
  }, [masterClubs, clubName]);

  const filteredTournaments = useMemo(() => {
    if (!search.trim()) return tournaments;
    const query = search.toLowerCase();
    return tournaments.filter(t => t.matchName.toLowerCase().includes(query));
  }, [tournaments, search]);

  // Created & co-administered tournaments
  const myCreatedTournaments = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.email === "nahnatofficial@gmail.com") return filteredTournaments;
    const email = currentUser.email?.toLowerCase().trim() || "";
    return filteredTournaments.filter(
      t => t.creatorId === currentUser.uid || 
           t.creatorEmail === currentUser.email ||
           (t.subAdmins && t.subAdmins.some(subEmail => subEmail.toLowerCase().trim() === email))
    );
  }, [filteredTournaments, currentUser]);

  // Referee tournaments
  const myRefereeTournaments = useMemo(() => {
    if (!currentUser || !currentUser.email) return [];
    const email = currentUser.email.toLowerCase().trim();
    return filteredTournaments.filter(
      t => t.referees && t.referees.some(refEmail => refEmail.toLowerCase().trim() === email)
    );
  }, [filteredTournaments, currentUser]);

  // Compute 30 days display name restriction countdown
  const nameCooldownInfo = useMemo(() => {
    if (!profile?.lastDisplayNameUpdate) {
      return { canChange: true, daysRemaining: 0 };
    }
    const lastUpdateDate = new Date(profile.lastDisplayNameUpdate);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdateDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      canChange: diffDays >= 30,
      daysRemaining: 30 - diffDays,
      lastDateStr: lastUpdateDate.toLocaleDateString("vi-VN")
    };
  }, [profile]);

  // Real scan tracking athlete achievements across all parsed Match lists
  const myAchievements = useMemo(() => {
    if (!currentUser || !currentUser.email) return [];
    const myEmail = currentUser.email.toLowerCase().trim();
    
    interface AchievementItem {
      tourId: string;
      matchName: string;
      mode: string;
      dateStr: string;
      rank: number;
      score: number;
      totalAthletes: number;
    }

    const resultsList: AchievementItem[] = [];

    // Filter cloud tournaments where this user email is registered as vđv
    tournaments.forEach(tour => {
      const isTeam = (tour.competitionMode || "individual") === "team";
      const athletesList = (isTeam ? tour.teamAthletes : tour.athletes) || [];
      const distancesList = (isTeam ? tour.teamDistances : tour.distances) || [];

      const foundMe = athletesList.find(a => a.email && a.email.toLowerCase().trim() === myEmail);
      if (foundMe) {
        const activeAthletes = athletesList.filter(a => a.status !== "Bỏ thi");
        const playersWithScores = activeAthletes.map(p => {
          let totalScore = 0;
          distancesList.forEach(dist => {
            const hits = p.scores?.[dist.id] || [];
            const hitCount = getHitCount(hits);
            totalScore += hitCount * dist.multiplier;
          });
          return { id: p.id, name: p.name, score: totalScore };
        });

        playersWithScores.sort((a, b) => b.score - a.score);
        
        let rank = 1;
        const myIdx = playersWithScores.findIndex(p => p.id === foundMe.id);
        if (myIdx !== -1) {
          rank = myIdx + 1;
        }

        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function"
          ? tour.createdAt.toDate().toLocaleDateString("vi-VN")
          : "Gần đây";

        resultsList.push({
          tourId: tour.id,
          matchName: tour.matchName,
          mode: isTeam ? "Đồng Đội" : "Cá Nhân",
          dateStr,
          rank,
          score: playersWithScores[myIdx]?.score || 0,
          totalAthletes: activeAthletes.length
        });
      }
    });

    return resultsList;
  }, [tournaments, currentUser]);

  // Dynamic profile completion percentage using Single Source of Truth
  const completionPercentage = useMemo(() => {
    return calculateProfileCompletion(linkedAthlete, profile);
  }, [linkedAthlete, profile]);

  // Dynamic Athlete Career Profile (ACP) stats aggregated from tournament databases
  const careerStats = useMemo(() => {
    const athleteId = linkedAthlete ? linkedAthlete.id : (profile?.masterAthleteId || "");
    const athleteName = linkedAthlete ? linkedAthlete.fullName : (dispName || "");
    return calculateAthleteCareerStats(athleteId, athleteName, tournaments);
  }, [linkedAthlete, profile, dispName, tournaments]);

  // Dynamic system notifications based on real user state, athlete verification, club membership, and tournament history
  const notifications = useMemo(() => {
    const list = [];
    
    // 1. Account Linkage & Verification Status
    if (linkedAthlete) {
      if (linkedAthlete.claimStatus === "verified" || linkedAthlete.claimStatus === "claimed") {
        list.push({
          id: "sys-notif-link-verified",
          title: "Liên kết hồ sơ thành công",
          content: `Hồ sơ vận động viên "${linkedAthlete.fullName}" (${linkedAthlete.vscNumber}) đã được xác thực chính thức trên hệ thống Slingshot VSC Platform.`,
          date: new Date(linkedAthlete.createdAt || Date.now()).toLocaleDateString("vi-VN"),
          read: false
        });
      } else if (linkedAthlete.claimStatus === "pending_review") {
        list.push({
          id: "sys-notif-link-pending",
          title: "Hồ sơ đang chờ duyệt",
          content: `Yêu cầu liên kết hồ sơ VĐV "${linkedAthlete.fullName}" đang được Hội đồng trọng tài VSC kiểm duyệt lý lịch thi đấu.`,
          date: new Date().toLocaleDateString("vi-VN"),
          read: false
        });
      }
    } else {
      list.push({
        id: "sys-notif-unlinked",
        title: "Chưa liên kết hồ sơ VĐV",
        content: "Tài khoản của bạn chưa liên kết với hồ sơ VĐV chính thức. Vui lòng vào tab Xác Minh để gửi yêu cầu liên kết hồ sơ.",
        date: new Date().toLocaleDateString("vi-VN"),
        read: false
      });
    }

    // 2. Club membership
    if (linkedAthlete) {
      const clubNameStr = linkedAthlete.clubName;
      if (clubNameStr && clubNameStr !== "free" && clubNameStr !== "Free" && clubNameStr !== "Tự Do") {
        list.push({
          id: "sys-notif-club-member",
          title: "Thành viên Câu Lạc Bộ",
          content: `Hệ thống ghi nhận bạn đang thi đấu chính thức cho câu lạc bộ "${clubNameStr}". Tất cả thành tích của bạn sẽ được đóng góp cho bảng tổng sắp CLB.`,
          date: linkedAthlete.clubHistory && linkedAthlete.clubHistory.length > 0 
            ? new Date(linkedAthlete.clubHistory[linkedAthlete.clubHistory.length - 1].joinDate).toLocaleDateString("vi-VN")
            : new Date().toLocaleDateString("vi-VN"),
          read: true
        });
      } else {
        list.push({
          id: "sys-notif-club-free",
          title: "VĐV Tự Do",
          content: "Bạn hiện đang thi đấu dưới danh nghĩa VĐV Tự Do. Hãy liên hệ với Ban chủ nhiệm các CLB thành viên để gia nhập CLB chính thức.",
          date: new Date().toLocaleDateString("vi-VN"),
          read: false
        });
      }
    }

    // 3. ELO & Ranking Updates
    if (linkedAthlete && careerStats && careerStats.totalTournaments > 0) {
      list.push({
        id: "sys-notif-elo-rank",
        title: "Cập nhật bảng xếp hạng ELO",
        content: `Điểm số của bạn đã được cập nhật thành công. ELO hiện tại: ${careerStats.careerRating.toLocaleString()}đ (Hạng #${careerStats.careerRanking} toàn quốc).`,
        date: new Date().toLocaleDateString("vi-VN"),
        read: false
      });
    }

    // 4. Default fallback if empty to keep it beautiful
    if (list.length === 0) {
      list.push({
        id: "sys-notif-default-1",
        title: "Chào mừng tới Hệ thống VSC",
        content: "Chào mừng bạn đến với Cổng quản lý vận động viên Slingshot quốc gia VSC Platform V3.",
        date: new Date().toLocaleDateString("vi-VN"),
        read: true
      });
    }

    return list;
  }, [linkedAthlete, careerStats]);

  // Helper score summaries
  const getTopAthletes = (athletesList: Athlete[], distancesList: DistanceConfig[]): { name: string; score: number }[] => {
    if (!athletesList || athletesList.length === 0) return [];
    const activeList = athletesList.filter(a => a.status !== "Bỏ thi");
    const computed = activeList.map(athlete => {
      let totalScore = 0;
      distancesList.forEach(dist => {
        const hits = athlete.scores?.[dist.id] || [];
        const hitCount = getHitCount(hits);
        totalScore += hitCount * dist.multiplier;
      });
      return { name: athlete.name, score: totalScore };
    });
    return computed.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedBase64 = await processAvatarImage(file, 200, 0.85);
        setCustomAvatarUrl(processedBase64);
        setAvatarUrl(processedBase64);
      } catch (err) {
        console.error("Lỗi xử lý ảnh đại diện:", err);
        alert("Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.");
      }
    }
  };

  const handleLinkAthlete = async (athlete: MasterAthlete) => {
    if (!currentUser) return;
    
    const alreadyLinked = athlete.linkedUserId && athlete.linkedUserId !== currentUser.uid;
    const isAdmin = role === "admin" || role === "system_owner";
    
    let confirmText = `Bạn có chắc chắn muốn liên kết tài khoản của mình với hồ sơ VĐV chính thức: ${athlete.vscNumber} - ${athlete.fullName}?`;
    if (alreadyLinked) {
      if (!isAdmin) {
        alert(`Hồ sơ VĐV này đã được liên kết với một tài khoản khác. Vui lòng liên hệ Quản trị viên hệ thống để giải quyết.`);
        return;
      } else {
        confirmText = `⚠️ CẢNH BÁO: Hồ sơ VĐV này đã được liên kết với một tài khoản khác (UID: ...${athlete.linkedUserId?.slice(-6)}). Là Quản trị viên, bạn có muốn GHI ĐÈ liên kết này sang tài khoản ${currentUser.email}? Hành động này sẽ được ghi nhận vào lịch sử kiểm toán.`;
      }
    }
    
    if (!window.confirm(confirmText)) {
      return;
    }
    
    try {
      setSavingProfile(true);
      
      const res = await coordinateLinkAthlete(
        currentUser.uid,
        currentUser.email || "",
        athlete.id,
        alreadyLinked && isAdmin
      );
      
      if (res.success) {
        setLinkingSearch(""); // Clear the search input to collapse results and show pending banner
        const updated = await getUserProfile(currentUser.uid);
        if (updated) {
          setProfile(updated);
        }
        alert(res.message);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi liên kết hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelLink = async (athlete: MasterAthlete) => {
    if (!currentUser) return;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu liên kết với hồ sơ VĐV: ${athlete.fullName} không?`)) {
      return;
    }
    try {
      setSavingProfile(true);
      const athleteRef = doc(db, "athletes", athlete.id);
      await updateDoc(athleteRef, {
        linkedUserId: "",
        claimStatus: "unclaimed"
      });
      
      // Also update user profile to unclaimed
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        claimStatus: "unclaimed"
      });
      
      const updated = await getUserProfile(currentUser.uid);
      if (updated) {
        setProfile(updated);
      }
      
      alert("Đã hủy yêu cầu liên kết hồ sơ thành công!");
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi hủy yêu cầu liên kết.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUnlinkAthlete = async () => {
    if (!currentUser || !profile?.masterAthleteId) return;
    
    const isAdmin = role === "admin" || role === "system_owner";
    if (!isAdmin) {
      alert("Chỉ Quản trị viên hệ thống mới có quyền hủy liên kết hồ sơ VĐV chính thức.");
      return;
    }
    
    const confirmText = `⚠️ Bạn có chắc chắn muốn HỦY LIÊN KẾT hồ sơ vận động viên chính thức này khỏi tài khoản? Hành động này sẽ xóa quan hệ sở hữu và được lưu vào Lịch sử kiểm toán.`;
    if (!window.confirm(confirmText)) {
      return;
    }
    
    try {
      setSavingProfile(true);
      const res = await coordinateUnlinkAthlete(
        currentUser.uid,
        currentUser.email || "",
        profile.masterAthleteId
      );
      
      if (res.success) {
        const updated = await getUserProfile(currentUser.uid);
        setProfile(updated);
        alert(res.message);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi hủy liên kết hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateNewMasterAthlete = async () => {
    if (!currentUser) return;
    if (!dispName.trim()) {
      alert("Họ tên là bắt buộc để khởi tạo hồ sơ VĐV mới!");
      return;
    }
    const confirmText = `Chọn 'OK' để khởi tạo hồ sơ VĐV chính thức mới dựa trên thông tin hiện tại của bạn trên VSC Cloud.`;
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      setSavingProfile(true);
      const nextId = "VSC-" + Date.now().toString().substring(6);
      
      const newAthlete: MasterAthlete = {
        id: nextId,
        vscNumber: nextId,
        fullName: dispName.trim(),
        gender: gender,
        dob: birthDate,
        province: province || "Hà Nội",
        country: "Việt Nam",
        clubName: clubName || "Tự Do",
        clubId: "free",
        phone: phone,
        facebook: facebook,
        zalo: zalo,
        biography: biography,
        emergencyContact: emergencyContact,
        personalNotes: personalNotes,
        status: "active",
        avatarUrl: customAvatarUrl || googleAvatarUrl || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedList = [...masterAthletes, newAthlete];

      // 1. Save to global master list
      await saveAthletesList(updatedList);

      // 2. Link local User Profile to this new MasterAthlete
      const payload = {
        masterAthleteId: nextId,
        gender,
        birthDate,
        cccd: idCard,
        address,
        province,
        club: clubName || "Tự Do",
        phone,
        facebook,
        zalo,
        biography,
        emergencyContact,
        personalNotes,
        customAvatarUrl,
        avatarUrl: customAvatarUrl || googleAvatarUrl || ""
      };
      await updateUserProfile(currentUser.uid, payload);

      setProfile((prev: any) => ({
        ...prev,
        ...payload
      }));

      alert(`Đã khởi tạo và liên kết thành công hồ sơ VĐV chính thức: ${dispName} (${nextId})!`);
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi khởi tạo hồ sơ VĐV.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSyncGoogleAvatar = () => {
    if (currentUser?.photoURL) {
      setCustomAvatarUrl(currentUser.photoURL);
      setAvatarUrl(currentUser.photoURL);
      alert("🎉 Đồng bộ ảnh đại diện từ tài khoản Google thành công! Nhấp 'CẬP NHẬT HỒ SƠ THÀ VIÊN' ở cuối trang để lưu thay đổi.");
    } else {
      alert("⚠️ Không tìm thấy ảnh đại diện liên kết với tài khoản Google này.");
    }
  };

  const handleSubmitProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!dispName.trim()) {
      alert("Họ và tên hiển thị không được để trống!");
      return;
    }
    const originalName = profile?.displayName || currentUser.email?.split("@")[0] || "";
    const isNameChanged = dispName.trim().toLowerCase() !== originalName.trim().toLowerCase();
    if (isNameChanged && !nameCooldownInfo.canChange) {
      alert(`Bạn/VĐV đổi tên gần đây vào ngày ${nameCooldownInfo.lastDateStr}. Hãy đợi thêm ${nameCooldownInfo.daysRemaining} ngày để đổi tên tiếp theo nhé!`);
      return;
    }
    setShowConfirmSaveModal(true);
  };

  const handleResetProfile = () => {
    if (!currentUser) return;
    const originalProfile = profile || {};
    
    setDispName(linkedAthlete?.fullName || originalProfile.displayName || currentUser.email?.split("@")[0] || "");
    setEmail(linkedAthlete?.email || originalProfile.email || currentUser.email || "");
    setIdCard(linkedAthlete?.vscNumber || originalProfile.cccd || "");
    setBirthDate(linkedAthlete?.dob || originalProfile.birthDate || "");
    setAddress(linkedAthlete?.address || originalProfile.address || "");
    setProvince(linkedAthlete?.province || originalProfile.province || "");
    setClubName(linkedAthlete?.clubName || originalProfile.club || "");
    setPhone(linkedAthlete?.phone || originalProfile.phone || "");
    setFacebook(linkedAthlete?.facebook || originalProfile.facebook || "");
    setZalo(linkedAthlete?.zalo || originalProfile.zalo || "");
    setBiography(linkedAthlete?.biography || originalProfile.biography || "");
    setEmergencyContact(linkedAthlete?.emergencyContact || originalProfile.emergencyContact || "");
    setPersonalNotes(linkedAthlete?.personalNotes || originalProfile.personalNotes || "");
    setGender(linkedAthlete?.gender || originalProfile.gender || "Nam");
    setCustomAvatarUrl(originalProfile.customAvatarUrl || "");
    setGoogleAvatarUrl(originalProfile.photoURL || currentUser.photoURL || "");
    setAvatarUrl(originalProfile.avatarUrl || originalProfile.photoURL || "");
    setShowConfirmSaveModal(false);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    setShowConfirmSaveModal(false);
    try {
      const originalName = profile?.displayName || currentUser.email?.split("@")[0] || "";
      const isNameChanged = dispName.trim().toLowerCase() !== originalName.trim().toLowerCase();

      // Determine active display name and avatar priority
      const activeAvatar = customAvatarUrl || googleAvatarUrl || "";

      const payload: any = {
        email: email.trim(),
        phone: phone.trim(),
        facebook: facebook.trim(),
        zalo: zalo.trim(),
        biography: biography.trim(),
        emergencyContact: emergencyContact.trim(),
        personalNotes: personalNotes.trim(),
        customAvatarUrl,
        avatarUrl: activeAvatar,
        cccd: linkedAthlete && !isAdmin ? linkedAthlete.vscNumber : idCard.trim(),
        birthDate: linkedAthlete && !isAdmin ? linkedAthlete.dob : birthDate,
        address: linkedAthlete && !isAdmin ? (linkedAthlete.address || "") : address.trim(),
        province: linkedAthlete && !isAdmin ? linkedAthlete.province : province.trim(),
        club: linkedAthlete && !isAdmin ? (linkedAthlete.clubName || "") : clubName.trim(),
        gender: linkedAthlete && !isAdmin ? linkedAthlete.gender : gender,
        slingshotType: slingshotType.trim(),
        bandSpec: bandSpec.trim(),
        ammoSize: ammoSize.trim(),
        shootingStance: shootingStance.trim(),
        achievements: achievementsText.trim(),
      };

      if (isNameChanged) {
        payload.displayName = dispName.trim();
        payload.lastDisplayNameUpdate = new Date().toISOString();
      }

      // 1. Update User Profile in Firestore (/users/{uid})
      await updateUserProfile(currentUser.uid, payload);
      
      // 2. If linked, update MasterAthlete fields in the global list to preserve single source of truth
      if (linkedAthlete) {
        const updatedList = masterAthletes.map((a) => {
          if (a.id === linkedAthlete.id) {
            return {
              ...a,
              fullName: isAdmin ? dispName.trim() : linkedAthlete.fullName,
              email: email.trim(),
              phone: phone.trim(),
              facebook: facebook.trim(),
              zalo: zalo.trim(),
              biography: biography.trim(),
              emergencyContact: emergencyContact.trim(),
              personalNotes: personalNotes.trim(),
              avatarUrl: activeAvatar,
              // Keep administrative fields in sync
              vscNumber: isAdmin ? idCard.trim() : linkedAthlete.vscNumber,
              dob: isAdmin ? birthDate : linkedAthlete.dob,
              gender: isAdmin ? (gender as any) : linkedAthlete.gender,
              province: isAdmin ? province.trim() : linkedAthlete.province,
              address: isAdmin ? address.trim() : (linkedAthlete.address || ""),
              clubName: isAdmin ? clubName.trim() : (linkedAthlete.clubName || ""),
              slingshotType: slingshotType.trim(),
              bandSpec: bandSpec.trim(),
              ammoSize: ammoSize.trim(),
              shootingStance: shootingStance.trim(),
              achievements: achievementsText.trim(),
              updatedAt: new Date().toISOString()
            } as MasterAthlete;
          }
          return a;
        });

        await saveAthletesList(updatedList);
      }

      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        ...payload,
        email: email.trim()
      }));

      alert("Cập nhật hồ sơ Vận động viên thành công!");
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi cập nhật cơ sở dữ liệu. Vui lòng kết nối lại!");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOnlineTournament(id);
      setShowConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      alert("Không thể xóa giải đấu này. Bạn không phải trưởng giải hoặc không có quyền!");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-205 dark:border-slate-800/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-indigo-650 dark:text-indigo-400" /> BẢNG ĐIỀU KHIỂN CÁ NHÂN (CONTROL PANEL)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            Nơi tập trung theo dõi các giải đấu trực tuyến do chính bạn kiến tạo, hoặc các giải đấu mà bạn làm Trọng tài phân công.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2.5 bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shrink-0 select-none">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="avatar" className="w-5 h-5 rounded-full pointer-events-none" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold uppercase pointer-events-none">
                {currentUser.email ? currentUser.email[0] : "U"}
              </div>
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{currentUser.email}</span>
          </div>
        )}
      </div>

      {!currentUser ? (
        /* Call to Action for Auth */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 p-8 text-center max-w-xl mx-auto flex flex-col items-center gap-5 my-8 shadow-sm">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl">
            <LogIn className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-905 dark:text-white">
              Yêu cầu đăng nhập tài khoản Cloud
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
              Vui lòng kết nối với tài khoản Google để sử dụng Bảng Điều Khiển này. Hệ thống sẽ tự động quét và lọc ra toàn bộ giải đấu do bạn khởi tạo hoặc được phân bổ làm trọng tài đám mây.
            </p>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer mt-1"
          >
            Đăng nhập bằng Google Account
          </button>
        </div>
      ) : (
        /* Connected user dashboard panel */
        <div className="flex flex-col gap-5">
          
          {/* Sub Navigation Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100/70 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 gap-3">
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setSubTab("profile")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "profile"
                    ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-1 ring-indigo-500"
                    : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Hồ Sơ VĐV của Tôi
              </button>
              <button
                onClick={() => setSubTab("notifications")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap relative ${
                  subTab === "notifications"
                    ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-1 ring-indigo-500"
                    : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Inbox className="w-4 h-4" />
                Thông báo & Nhiệm vụ
                {totalPendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-sm animate-pulse">
                    {totalPendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSubTab("created")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "created"
                    ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-1 ring-indigo-500"
                    : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Giải tôi tạo ({myCreatedTournaments.length})
              </button>
              <button
                onClick={() => setSubTab("referee")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "referee"
                    ? "bg-amber-550 text-white dark:bg-amber-600 dark:text-white shadow-md font-black ring-1 ring-amber-500"
                    : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Award className="w-4 h-4" />
                Giải tôi làm Trọng tài ({myRefereeTournaments.length})
              </button>
              {(role === "system_owner" || role === "admin" || role === "tournament_director") && (
                <>
                  <button
                    onClick={() => setSubTab("settings")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                      subTab === "settings"
                        ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-1 ring-indigo-500"
                        : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Cấu Hình Hệ Thống
                  </button>
                  <button
                    onClick={() => setSubTab("diagnostics")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                      subTab === "diagnostics"
                        ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-md font-black ring-1 ring-indigo-500"
                        : "text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Harness Diagnostics
                  </button>
                </>
              )}
            </div>

            {/* Quick search (Only show when viewing tournament lists) */}
            {subTab !== "profile" && subTab !== "diagnostics" && subTab !== "settings" && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Lọc tên giải đấu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* List display */}
          {loading ? (
            <div className="p-12 text-center flex flex-col justify-center items-center gap-2">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải dữ liệu Cloud...</span>
            </div>
          ) : (
            <>
              {subTab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  {/* Left Column: Form Profile */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* LINK STATUS BANNER */}
                    {linkedAthlete ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex gap-3.5 items-start">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                            ĐÃ LIÊN KẾT HỒ SƠ THI ĐẤU CHÍNH THỨC
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            Tài khoản của bạn đã được kết nối với vận động viên <strong className="text-slate-700 dark:text-slate-200">{linkedAthlete.fullName}</strong> ({linkedAthlete.vscNumber}).
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span className="text-[10px] font-bold uppercase bg-slate-200/50 dark:bg-slate-800/80 px-2 py-1 rounded text-slate-600 dark:text-slate-350">
                              VSC ID: {linkedAthlete.vscNumber}
                            </span>
                            <span className="text-[10px] font-bold uppercase bg-slate-200/50 dark:bg-slate-800/80 px-2 py-1 rounded text-slate-600 dark:text-slate-350">
                              CLB: {linkedAthlete.clubName || "Chưa có"}
                            </span>
                            <span className="text-[10px] font-bold uppercase bg-slate-200/50 dark:bg-slate-800/80 px-2 py-1 rounded text-slate-600 dark:text-slate-350">
                              Tỉnh/TP: {linkedAthlete.province}
                            </span>
                            {(role === "admin" || role === "system_owner") && (
                              <button
                                type="button"
                                onClick={handleUnlinkAthlete}
                                className="text-[10px] font-black uppercase text-red-600 hover:text-red-750 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-1 rounded-md ml-auto flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                ⚠️ Hủy liên kết (Admin)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : pendingAthlete ? (
                      <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex gap-3.5 items-start">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                            <Clock className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800 dark:text-amber-300">
                              YÊU CẦU LIÊN KẾT ĐANG CHỜ PHÊ DUYỆT
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                              Bạn đã gửi yêu cầu liên kết tài khoản này với hồ sơ vận động viên gốc dưới đây. Yêu cầu đang chờ Ban tổ chức phê duyệt để chính thức liên kết.
                            </p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-white">
                              <img
                                src={getAvatarPriority(pendingAthlete.avatarUrl, null, pendingAthlete.gender)}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                                {pendingAthlete.fullName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                VSC ID: {pendingAthlete.vscNumber} • Tỉnh: {pendingAthlete.province}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/40 px-2 py-1 rounded text-amber-700 dark:text-amber-400 flex items-center gap-1 font-sans">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Chờ phê duyệt thành viên chính thức
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => handleCancelLink(pendingAthlete)}
                              className="text-[10px] font-black uppercase text-red-600 hover:text-red-750 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-3 py-1 rounded-md ml-auto flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                            >
                              Hủy yêu cầu liên kết
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex gap-3.5 items-start">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800 dark:text-amber-300">
                              TÀI KHOẢN CHƯA LIÊN KẾT HỒ SƠ VĐV GỐC
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                              Để tích lũy lịch sử thi đấu chính thức, bảng xếp hạng VĐV quốc gia, và đồng bộ chứng chỉ Trọng tài, tài khoản đám mây của bạn cần được kết nối với một hồ sơ VĐV trong hệ thống Master Data.
                            </p>
                          </div>
                        </div>

                        {/* PROFILE LINKING ACCORDION */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xs">
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Hệ thống liên kết hồ sơ (VSC Profile Binder)</span>
                            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Tìm kiếm hồ sơ thi đấu gốc của bạn để liên kết:</h5>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Nhập tên VĐV hoặc mã hiệu VSC..."
                                value={linkingSearch}
                                onChange={(e) => setLinkingSearch(e.target.value)}
                                className="pl-9 pr-3 py-2 w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Search Results */}
                          {linkingSearch.trim() !== "" && (
                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 bg-slate-50 dark:bg-slate-950/40">
                              {masterAthletes
                                .filter(a => {
                                  const queryText = linkingSearch.toLowerCase().trim();
                                  return (
                                    a.fullName.toLowerCase().includes(queryText) ||
                                    a.vscNumber.toLowerCase().includes(queryText) ||
                                    (a.phone && a.phone.includes(queryText))
                                  );
                                })
                                .map((ath, idx) => (
                                  <div key={ath.id || `athlete-master-${idx}`} className="p-2.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-white">
                                        <img
                                          src={getAvatarPriority(ath.avatarUrl, null, ath.gender)}
                                          alt="avatar"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-250 block">
                                          {ath.fullName}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          VSC Number: {ath.vscNumber} • CLB: {ath.clubName || "Tự Do"} • Tỉnh: {ath.province}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleLinkAthlete(ath)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                    >
                                      <Link2 className="w-3 h-3" /> Liên kết hồ sơ này
                                    </button>
                                  </div>
                                ))}
                              {masterAthletes.filter(a => {
                                const queryText = linkingSearch.toLowerCase().trim();
                                return (
                                  a.fullName.toLowerCase().includes(queryText) ||
                                  a.vscNumber.toLowerCase().includes(queryText) ||
                                  (a.phone && a.phone.includes(queryText))
                                );
                              }).length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  Không tìm thấy hồ sơ nào khớp với từ khóa tìm kiếm.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE COMPLETION METER */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/70 p-4 flex flex-col gap-2 shadow-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-indigo-500" /> ĐỘ HOÀN THIỆN HỒ SƠ CÁ NHÂN (ACP)
                        </span>
                        <span className={`font-black text-sm ${completionPercentage === 100 ? "text-emerald-600" : "text-indigo-600"}`}>
                          {completionPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${completionPercentage === 100 ? "bg-emerald-500" : "bg-indigo-650"}`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Hãy bổ sung thông tin bao gồm: Ảnh đại diện WebP, Số điện thoại, Tỉnh thành, Câu lạc bộ, Bio cá nhân, Liên hệ khẩn cấp, Mạng xã hội để hoàn thiện 100% Hồ sơ Thể thao VĐV của bạn.
                      </p>
                    </div>

                    <form onSubmit={handleSubmitProfileForm} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-6 flex flex-col gap-5 shadow-xs">
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                        <User className="w-5 h-5 text-indigo-650 dark:text-indigo-400" /> 
                        {linkedAthlete ? "CẬP NHẬT THÔNG TIN HỒ SƠ THỂ THAO" : "ĐIỀN HỒ SƠ VĐV CLOUD CỦA TÔI"}
                      </h3>

                      {profileLoading ? (
                        <div className="py-20 text-center flex flex-col justify-center items-center gap-2">
                          <div className="w-7 h-7 rounded-full border-2 border-slate-250 border-t-indigo-550 animate-spin"></div>
                          <span className="text-xs text-slate-400">Đang đồng bộ hồ sơ đám mây...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-805 pb-5">
                            {/* Avatar preview and uploader with priority checks */}
                            <div className="flex flex-col items-center gap-2.5">
                              <div className="relative w-24 h-24 rounded-full border border-slate-200 dark:border-slate-850 shadow-inner overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                                <img
                                  src={getAvatarPriority(customAvatarUrl, googleAvatarUrl, gender)}
                                  alt="Avatar VĐV"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-all active:scale-95">
                                <ImageIcon className="w-3.5 h-3.5" /> Thay ảnh (WebP)
                                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                              </label>
                            </div>

                            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Display Name / Nickname */}
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                  <span className="flex items-center gap-1">Biệt danh hiển thị đại diện: <span className="text-red-500">*</span></span>
                                  {!nameCooldownInfo.canChange && (
                                    <span className="text-amber-600 font-bold normal-case flex items-center gap-0.5">
                                      <Clock className="w-3.5 h-3.5" /> Đổi tiếp sau {nameCooldownInfo.daysRemaining} ngày
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="text"
                                  value={dispName}
                                  onChange={(e) => setDispName(e.target.value)}
                                  disabled={!nameCooldownInfo.canChange}
                                  placeholder="Nguyễn Văn A (Hải Phòng)"
                                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 disabled:bg-slate-100/50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                  Biệt hiệu đại diện hiển thị trên bảng đấu công khai. <strong>Chỉ đổi được 30 ngày một lần</strong> để bảo lưu điểm số xếp hạng.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* BLOCK 1: ADMIN-MANAGED / SPORTING INTEGRITY FIELDS */}
                            <div className="sm:col-span-2">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 dark:border-slate-850 pb-1 mb-3">
                                🔒 Thông tin thi đấu chính thức (Do Admin/BTC quản lý)
                              </span>
                            </div>

                            {/* Full Name */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>Họ tên vận động viên:</span>
                                {linkedAthlete && <span className="text-emerald-600 font-bold normal-case">Đã xác minh</span>}
                              </label>
                              <input
                                type="text"
                                value={linkedAthlete && !isAdmin ? linkedAthlete.fullName : dispName}
                                onChange={(e) => setDispName(e.target.value)}
                                disabled={!!linkedAthlete && !isAdmin}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:cursor-not-allowed font-bold"
                              />
                            </div>

                            {/* VSC Number */}
                            {linkedAthlete && (
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                  <span>Mã Số VĐV (VSC Number):</span>
                                </label>
                                <input
                                  type="text"
                                  value={linkedAthlete && !isAdmin ? linkedAthlete.vscNumber : idCard}
                                  onChange={(e) => setIdCard(e.target.value)}
                                  disabled={!!linkedAthlete && !isAdmin}
                                  placeholder="Chưa liên kết"
                                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:font-mono disabled:cursor-not-allowed"
                                />
                              </div>
                            )}

                            {/* Official Club */}
                            <div className="relative">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>Câu lạc bộ (CLB) chính thức:</span>
                              </label>
                              <input
                                type="text"
                                value={linkedAthlete && !isAdmin ? (linkedAthlete.clubName || "Tự Do") : clubName}
                                onChange={(e) => {
                                  setClubName(e.target.value);
                                  setShowClubSuggestions(true);
                                }}
                                onFocus={() => {
                                  setShowClubSuggestions(true);
                                }}
                                disabled={!!linkedAthlete && !isAdmin}
                                placeholder="Nhập tên CLB hoặc chọn gợi ý..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:cursor-not-allowed font-bold"
                              />
                              
                              {/* Dropdown Suggestions */}
                              {showClubSuggestions && filteredClubs.length > 0 && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowClubSuggestions(false)}
                                  />
                                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-850">
                                    {filteredClubs.map((club, idx) => (
                                      <button
                                        key={club.id || `club-${idx}`}
                                        type="button"
                                        onClick={() => {
                                          setClubName(club.clubName);
                                          setShowClubSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 font-bold transition flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{club.clubName}</span>
                                        {club.shortName && (
                                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 font-mono">
                                            {club.shortName}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Province / Affiliation */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                Tỉnh / Thành phố đại diện:
                              </label>
                              <input
                                type="text"
                                value={linkedAthlete && !isAdmin ? linkedAthlete.province : province}
                                onChange={(e) => setProvince(e.target.value)}
                                disabled={!!linkedAthlete && !isAdmin}
                                placeholder="Hà Nội, Nam Định..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Gender */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                Giới tính:
                              </label>
                              <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as any)}
                                disabled={!!linkedAthlete && !isAdmin}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-800 dark:text-white"
                              >
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                              </select>
                            </div>

                            {/* Date of Birth */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                Ngày tháng năm sinh:
                              </label>
                              <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                disabled={!!linkedAthlete && !isAdmin}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none disabled:bg-slate-150/40 dark:disabled:bg-slate-950 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Email and Cloud Sync */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                Địa chỉ Email (Luôn khóa):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="email"
                                  value={email}
                                  disabled
                                  placeholder="Email đăng nhập của bạn..."
                                  className="flex-1 max-w-[280px] px-3 py-2 text-sm bg-slate-100 dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={handleSyncGoogleAvatar}
                                  className="px-3.5 py-2 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-950 dark:hover:bg-slate-850 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                >
                                  🔄 Đồng bộ Cloud
                                </button>
                              </div>
                            </div>

                            {/* BLOCK 2: ATHLETE EDITABLE CONTACTS AND SOCIALS */}
                            <div className="sm:col-span-2 mt-4">
                              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block border-b border-slate-100 dark:border-slate-850 pb-1 mb-3">
                                📱 Thông tin liên lạc & Mạng xã hội (Bạn có toàn quyền chỉnh sửa)
                              </span>
                            </div>

                            {/* Phone number */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-indigo-500" /> Số điện thoại liên hệ:
                              </label>
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="09xx.xxx.xxx"
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Emergency Contact */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Người liên hệ khẩn cấp:
                              </label>
                              <input
                                type="text"
                                value={emergencyContact}
                                onChange={(e) => setEmergencyContact(e.target.value)}
                                placeholder="Tên và SĐT liên hệ khẩn cấp..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Facebook */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook cá nhân (URL):
                              </label>
                              <input
                                type="url"
                                value={facebook}
                                onChange={(e) => setFacebook(e.target.value)}
                                placeholder="https://facebook.com/..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Zalo */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-sky-500" /> Số điện thoại / Link Zalo:
                              </label>
                              <input
                                type="text"
                                value={zalo}
                                onChange={(e) => setZalo(e.target.value)}
                                placeholder="SĐT Zalo hoặc Username..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Biography / Bio */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" /> Tiểu sử / Lời giới thiệu (Biography):
                              </label>
                              <textarea
                                value={biography}
                                onChange={(e) => setBiography(e.target.value)}
                                placeholder="Hãy viết một vài dòng ngắn giới thiệu về hành trình, thành tích và đam mê Slingshot của bạn..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Personal Notes */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Ghi chú cá nhân (Personal Notes):
                              </label>
                              <textarea
                                value={personalNotes}
                                onChange={(e) => setPersonalNotes(e.target.value)}
                                placeholder="Ghi chú về thiết bị thi đấu, thun, da, slingshot nâng cấp, chiến thuật, hoặc mục tiêu cá nhân..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Profile Submit Button */}
                          <div className="flex justify-end border-t border-slate-100 dark:border-slate-850 pt-4 mt-2">
                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-350 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-tight rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                            >
                              {savingProfile ? (
                                <>
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/35 border-t-white animate-spin"></div>
                                  Đang lưu...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" /> Lưu thông tin hồ sơ
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>

                  {/* Right Column: Athlete Career Dashboard (ACP) */}
                  <div className="flex flex-col gap-6">
                    {/* ACP Tab Navigation */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">HỒ SƠ SỰ NGHIỆP VĐV</h3>
                            <p className="text-[9px] text-slate-450 dark:text-slate-400">Athlete Career Profile (ACP)</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-150">
                          V3 SYSTEM
                        </span>
                      </div>

                      {/* Tab buttons grid */}
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-150 dark:border-slate-850/80">
                        {(["career", "tournaments", "statistics", "achievements", "club", "equipment", "verification", "settings"] as const).map((tab) => {
                          const isActive = acpTab === tab;
                          const tabLabels: Record<string, string> = {
                            career: "Tổng quan",
                            tournaments: "Giải đấu",
                            statistics: "Thống kê",
                            achievements: "Danh hiệu",
                            club: "Đoàn / CLB",
                            equipment: "Trang bị",
                            verification: "Xác minh",
                            settings: "Cài đặt"
                          };
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setAcpTab(tab)}
                              className={`py-1.5 px-1 rounded-lg text-[9px] font-extrabold text-center transition-all cursor-pointer truncate ${
                                isActive
                                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/40 dark:border-slate-700/40"
                                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                              }`}
                            >
                              {tabLabels[tab]}
                            </button>
                          );
                        })}
                      </div>

                      {/* --- TAB CONTENT AREA --- */}

                      {/* TAB 1: CAREER OVERVIEW */}
                      {acpTab === "career" && (
                        <div className="flex flex-col gap-4 animate-fade-in">
                          {/* DIGITAL ATHLETE CARD */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-3xl p-5 text-white shadow-lg flex flex-col justify-between min-h-[220px] w-full transition-all hover:shadow-indigo-500/10">
                            {/* Card Background Overlay effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                            
                            {/* Top row */}
                            <div className="flex justify-between items-start z-10">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">VIETNAM SLINGSHOT FEDERATION</span>
                                <span className="text-[7px] text-slate-400 uppercase tracking-wider">OFFICIAL SPORTING CREDENTIAL</span>
                              </div>
                              {linkedAthlete ? (
                                <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đã Xác Minh
                                </span>
                              ) : (
                                <span className="text-[8px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Chưa Liên Kết
                                </span>
                              )}
                            </div>

                            {/* Center Row: Profile Info & QR Code */}
                            <div className="flex justify-between items-center my-3.5 z-10 gap-3">
                              <div className="flex items-center gap-3">
                                {/* Avatar priority check */}
                                <div className="relative">
                                  <img 
                                    src={getAvatarPriority(customAvatarUrl, googleAvatarUrl, gender)}
                                    alt="Avatar VĐV" 
                                    className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md bg-slate-800"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border border-slate-900">
                                    <Trophy className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <h4 className="text-sm font-black tracking-tight uppercase truncate max-w-[150px]">
                                    {linkedAthlete ? linkedAthlete.fullName : (dispName || "Chưa Liên Kết")}
                                  </h4>
                                  {linkedAthlete && (
                                    <span className="text-[10px] font-mono text-indigo-300 font-black tracking-wider mt-0.5">
                                      {linkedAthlete.vscNumber}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-400 truncate max-w-[150px] mt-0.5">
                                    📍 Tỉnh/TP: {linkedAthlete ? linkedAthlete.province : (province || "Chưa rõ")}
                                  </span>
                                  <span className="text-[9px] text-slate-400 truncate max-w-[150px]">
                                    🛡️ CLB: {linkedAthlete ? (linkedAthlete.clubName || "Tự Do") : (clubName || "Tự Do")}
                                  </span>
                                </div>
                              </div>

                              {/* QR Code */}
                              <div className="flex flex-col items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&color=4f46e5&data=${encodeURIComponent('https://vscs.asia/athlete/' + (linkedAthlete?.vscNumber || 'unlinked'))}`}
                                  alt="QR Code"
                                  className="w-[52px] h-[52px] rounded-lg bg-white p-0.5"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">SCAN CARD</span>
                              </div>
                            </div>

                            {/* Bottom Row: Rating, Rank, Profile completed */}
                            <div className="flex justify-between items-center border-t border-white/5 pt-2.5 z-10">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">Hạng</span>
                                  <span className="text-xs font-black text-amber-400">#{careerStats.careerRanking}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">ELO VSC</span>
                                  <span className="text-xs font-black text-indigo-400">{careerStats.careerRating.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-slate-400 uppercase font-bold">Hoàn thiện</span>
                                  <span className="text-xs font-black text-emerald-400">{completionPercentage}%</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black tracking-widest text-white/35 font-mono uppercase">VSC PLATFORM V3</span>
                            </div>
                          </div>

                          {/* Rating / Ranking Bento cards */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-955 border border-slate-200/45 dark:border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">ĐIỂM XẾP HẠNG (ELO)</span>
                              <div className="mt-1.5">
                                <span className="text-lg sm:text-xl font-black text-indigo-650 dark:text-indigo-400">{careerStats.careerRating.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-450 ml-1">pts</span>
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955 border border-slate-200/45 dark:border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">HẠNG HỆ THỐNG</span>
                              <div className="mt-1.5">
                                <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">#{careerStats.careerRanking}</span>
                                <span className="text-[10px] text-slate-455 ml-1">Toàn quốc</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-50 dark:bg-slate-955 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Giải đấu</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{careerStats.totalTournaments}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Lượt bắn</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{careerStats.totalMatches}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-955 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold">Chính xác</span>
                              <span className="text-sm font-black text-slate-700 dark:text-white">{careerStats.accuracy}%</span>
                            </div>
                          </div>

                          {/* Medal podium visual */}
                          <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl p-3">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-405 mb-2">Bộ sưu tập Huy chương</h4>
                            <div className="flex justify-around items-end pt-2">
                              {/* Silver */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-slate-500">{careerStats.silverMedals}</span>
                                <div className="w-10 bg-slate-300 dark:bg-slate-700 h-10 rounded-t-lg flex items-center justify-center text-slate-705 dark:text-slate-200 font-bold text-xs shadow-xs">
                                  II
                                </div>
                                <span className="text-[8px] text-slate-450">Bạc</span>
                              </div>
                              {/* Gold */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-black text-amber-500">{careerStats.goldMedals}</span>
                                <div className="w-12 bg-amber-400 dark:bg-amber-500 h-14 rounded-t-lg flex items-center justify-center text-white dark:text-slate-900 font-black text-sm shadow-md">
                                  I
                                </div>
                                <span className="text-[8px] text-amber-500 font-bold">Vô Địch</span>
                              </div>
                              {/* Bronze */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-black text-amber-700">{careerStats.bronzeMedals}</span>
                                <div className="w-10 bg-amber-655 dark:bg-amber-750 h-8 rounded-t-lg flex items-center justify-center text-amber-100 font-bold text-xs shadow-xs">
                                  III
                                </div>
                                <span className="text-[8px] text-slate-450">Đồng</span>
                              </div>
                            </div>
                          </div>

                          {/* Shootout metrics (Temporarily hidden for future PK Solo implementation) */}

                          {/* Dynamic SVG chart for performance trends over time */}
                          {careerStats.performanceTimeline.length > 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-850 rounded-2xl p-3">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                                <span>Biểu đồ phong độ (% Acc)</span>
                                <span className="text-indigo-600 font-bold">Lịch sử tiến trình</span>
                              </h4>
                              
                              <div className="h-28 w-full mt-2 flex items-end relative">
                                <svg className="w-full h-24 overflow-visible">
                                  {/* Render Line connecting points */}
                                  <polyline
                                    fill="none"
                                    stroke="#4f46e5"
                                    strokeWidth="3"
                                    points={careerStats.performanceTimeline.map((item, idx) => {
                                      const count = careerStats.performanceTimeline.length;
                                      const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
                                      const y = 80 - (item.accuracy / 100) * 70;
                                      return `${x}%,${y}`;
                                    }).join(" ")}
                                    className="transition-all duration-700"
                                  />
                                  {/* Render points */}
                                  {careerStats.performanceTimeline.map((item, idx) => {
                                    const count = careerStats.performanceTimeline.length;
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
                                <span>{careerStats.performanceTimeline[0].date}</span>
                                <span>Tiến trình giải đấu ({careerStats.performanceTimeline.length})</span>
                                <span>{careerStats.performanceTimeline[careerStats.performanceTimeline.length - 1].date}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                              Chưa có đủ dữ liệu giải đấu để dựng tiến trình phong độ.
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: TOURNAMENTS RECORD */}
                      {acpTab === "tournaments" && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Lịch sử đấu trường chính thức</h4>
                          {careerStats.tournamentHistory.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400">
                              Chưa ghi nhận tham gia giải đấu chính thức nào.
                            </div>
                          ) : (
                            <div className="max-h-96 overflow-y-auto pr-1 flex flex-col gap-2.5">
                              {careerStats.tournamentHistory.map((item, idx) => (
                                <div key={item.tournamentId || `tour-hist-${idx}`} className="bg-slate-50 dark:bg-slate-955 border border-slate-200/40 p-3 rounded-2xl flex flex-col gap-2">
                                  <div className="flex justify-between items-start gap-1">
                                    <h5 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">{item.tournamentName}</h5>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      item.rank === 1 ? "bg-amber-500 text-white" :
                                      item.rank === 2 ? "bg-slate-300 text-slate-800" :
                                      item.rank === 3 ? "bg-amber-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                    }`}>
                                      Hạng {item.rank}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-450 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                                    <span>📅 {item.date}</span>
                                    <span className="font-bold text-indigo-650 dark:text-indigo-400">{item.score} điểm ({item.accuracy}% Acc)</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between">
                                    <span>Đại diện CLB:</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-300">{item.clubName}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: STATISTICS */}
                      {acpTab === "statistics" && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Phân tích cự ly bắn & Chỉ số phụ</h4>
                          
                          <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Tổng điểm 10 (Bullseyes X):</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{careerStats.bullseyesCount} hồng tâm</span>
                          </div>

                          <div className="flex flex-col gap-2.5 mt-1">
                            <span className="text-[9px] font-black uppercase text-slate-405">Hiệu suất theo Cự ly:</span>
                            {careerStats.distancesPerformance.length === 0 ? (
                              <div className="text-xs text-slate-404 text-center py-4">Chưa có thông số cự ly.</div>
                            ) : (
                              careerStats.distancesPerformance.map((d, i) => (
                                <div key={d.distance || `dist-perf-${i}`} className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col gap-1.5">
                                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span>🎯 Cự ly {d.distance}</span>
                                    <span>{d.accuracy}% Acc</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${d.accuracy}%` }}></div>
                                  </div>
                                  <div className="flex justify-between text-[8px] text-slate-450">
                                    <span>Số phát bắn: {d.shots} mũi</span>
                                    <span>Trung bình phát: {d.averageScore} điểm</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-2 mt-2">
                            <h5 className="text-[10px] font-black uppercase text-slate-405">Kỷ lục cá nhân (Personal Bests)</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-[8px] text-slate-400 block uppercase font-bold">Kỷ lục giải đấu</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-200">{careerStats.personalBests.singleMatchMaxScore} Điểm</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-[8px] text-slate-400 block uppercase font-bold">Kỷ lục cự ly</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-200">{careerStats.personalBests.singleDistanceMaxAccuracy}% Acc</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: ACHIEVEMENTS & AWARDS */}
                      {acpTab === "achievements" && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Danh hiệu kiểm duyệt & Hệ thống</h4>
                          
                          <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                            {/* Badges calculated dynamically */}
                            {careerStats.goldMedals > 0 && (
                              <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 p-3 rounded-2xl flex gap-3 items-center">
                                <div className="p-2.5 bg-amber-505 text-white rounded-xl">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-amber-800 dark:text-amber-400">VÔ ĐỊCH ĐẤU TRƯỜNG</h5>
                                  <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Sở hữu ít nhất một chức vô địch giải đấu chính thức trên VSC Cloud.</p>
                                </div>
                              </div>
                            )}

                            {careerStats.accuracy >= 80 && (
                              <div className="bg-indigo-500/10 border border-indigo-300 dark:border-indigo-800/60 p-3 rounded-2xl flex gap-3 items-center">
                                <div className="p-2.5 bg-indigo-650 text-white rounded-xl">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-indigo-700 dark:text-indigo-400">THẦN TIỄN BẮN TRÚNG</h5>
                                  <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Đạt độ chính xác tích lũy trên 80% xuyên suốt tất cả các cự ly sự nghiệp.</p>
                                </div>
                              </div>
                            )}

                            {careerStats.bullseyesCount > 5 && (
                              <div className="bg-rose-500/10 border border-rose-300 dark:border-rose-800/60 p-3 rounded-2xl flex gap-3 items-center">
                                <div className="p-2.5 bg-rose-605 text-white rounded-xl">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-rose-700 dark:text-rose-400">KÝ TỰ X CHUYÊN NGHIỆP</h5>
                                  <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">Đã ghi hơn 5 mũi tên đạt hồng tâm tuyệt đối 10 điểm.</p>
                                </div>
                              </div>
                            )}

                            {careerStats.totalTournaments >= 3 && (
                              <div className="bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 p-3 rounded-2xl flex gap-3 items-center">
                                <div className="p-2.5 bg-emerald-650 text-white rounded-xl">
                                  <SlidersHorizontal className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-emerald-700 dark:text-emerald-400">VẬN ĐỘNG VIÊN BỀN BỈ</h5>
                                  <p className="text-[9px] text-slate-505 leading-relaxed mt-0.5">Đã thi đấu bền bỉ tại 3 giải đấu chính thức trở lên trên hệ thống.</p>
                                </div>
                              </div>
                            )}

                            {/* Base entry badge if no other achieved */}
                            {careerStats.totalTournaments === 0 && (
                              <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                                <Award className="w-6 h-6 text-slate-300" />
                                <span>Thi đấu các giải VSC để tự động kích hoạt các Huy hiệu Danh hiệu Sự Nghiệp!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 5: CLUB HISTORY */}
                      {acpTab === "club" && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Lịch sử Câu lạc bộ & Đoàn đại diện</h4>
                          
                          {careerStats.clubHistory.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400">Chưa ghi nhận câu lạc bộ đại diện chính thức.</div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] text-slate-450 leading-relaxed mb-1">Các đoàn hoặc câu lạc bộ mà vận động viên đã đầu quân thi đấu chính thức:</p>
                              {careerStats.clubHistory.map((club, idx) => (
                                <div key={club || `club-hist-${idx}`} className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{club}</span>
                                  </div>
                                  <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono">Đại diện giải</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 6: EQUIPMENT PROFILE */}
                      {acpTab === "equipment" && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black uppercase text-slate-405">Hồ sơ trang thiết bị thi đấu Slingshot</h4>
                            <span className="text-[8px] bg-indigo-55 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">Cấu hình</span>
                          </div>
                          
                          <div className="flex flex-col gap-2.5 text-xs">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Loại ná sử dụng / Thiết bị:</label>
                              <input 
                                type="text" 
                                value={slingshotType} 
                                onChange={(e) => setSlingshotType(e.target.value)}
                                className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Thông số dây / Độ dày chun:</label>
                              <input 
                                type="text" 
                                value={bandSpec} 
                                onChange={(e) => setBandSpec(e.target.value)}
                                className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Kích thước đạn sử dụng (Bi sắt):</label>
                              <input 
                                type="text" 
                                value={ammoSize} 
                                onChange={(e) => setAmmoSize(e.target.value)}
                                className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Tư thế bắn / Thế ngắm sở trường:</label>
                              <input 
                                type="text" 
                                value={shootingStance} 
                                onChange={(e) => setShootingStance(e.target.value)}
                                className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Thành tích nổi bật / Danh hiệu:</label>
                              <input 
                                type="text" 
                                value={achievementsText} 
                                onChange={(e) => setAchievementsText(e.target.value)}
                                className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300" 
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveProfile}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all mt-1.5 cursor-pointer"
                            >
                              Lưu thông tin trang bị
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 7: VERIFICATION STATUS (STEPS) */}
                      {acpTab === "verification" && (
                        <div className="flex flex-col gap-3 animate-fade-in text-xs">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Trạng thái xác thực tài khoản</h4>
                          
                          {/* VISUAL CLAIM LIFECYCLE TRACK */}
                          <div className="bg-slate-50 dark:bg-slate-955 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850 my-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 block mb-2">Quy Trình Xác Thực & Sở Hữu (VSC Claim Lifecycle V1.1)</span>
                            <div className="flex items-center justify-between gap-1 text-[8px] font-bold text-center mt-1">
                              <div className="flex-1 flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-black ${linkedAthlete ? "bg-slate-200 border-slate-300 text-slate-500" : "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 animate-pulse"}`}>
                                  1
                                </div>
                                <span className="mt-1 font-extrabold text-slate-500">Unclaimed</span>
                              </div>
                              <div className="w-4 border-t border-dashed border-slate-300 dark:border-slate-800"></div>
                              
                              <div className="flex-1 flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-black ${linkedAthlete ? "bg-slate-200 border-slate-300 text-slate-500" : "bg-indigo-100 border-indigo-300 text-indigo-700"}`}>
                                  2
                                </div>
                                <span className="mt-1 font-extrabold text-slate-500">Search</span>
                              </div>
                              <div className="w-4 border-t border-dashed border-slate-300 dark:border-slate-800"></div>

                              <div className="flex-1 flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-black ${linkedAthlete ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-slate-100 border-slate-300 text-slate-400"}`}>
                                  3
                                </div>
                                <span className="mt-1 font-extrabold text-slate-500">Match</span>
                              </div>
                              <div className="w-4 border-t border-dashed border-slate-300 dark:border-slate-800"></div>

                              <div className="flex-1 flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-black ${linkedAthlete ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-300 text-slate-400"}`}>
                                  4
                                </div>
                                <span className="mt-1 font-extrabold text-emerald-600 dark:text-emerald-400">Verified</span>
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-450 mt-3 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2 rounded-xl">
                              Trạng thái hiện tại: <strong className={linkedAthlete ? "text-emerald-600" : "text-amber-600"}>{linkedAthlete ? "VĐV Đã Xác Minh (VERIFIED ATHLETE)" : "Tài Khoản Tự Do (UNCLAIMED / PENDING)"}</strong>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3.5 mt-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                            {/* Step 1 */}
                            <div className="relative">
                              <div className="absolute -left-[14px] top-0.5 w-2 h-2 rounded-full bg-emerald-500"></div>
                              <h5 className="font-bold text-emerald-600">1. Đăng ký & Tạo tài khoản (UNLINKED)</h5>
                              <p className="text-[9px] text-slate-400">Tài khoản Google được xác thực đám mây thành công.</p>
                            </div>
                            {/* Step 2 */}
                            <div className="relative">
                              <div className={`absolute -left-[14px] top-0.5 w-2 h-2 rounded-full ${linkedAthlete ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></div>
                              <h5 className={`font-bold ${linkedAthlete ? "text-emerald-600" : "text-amber-600"}`}>2. Tìm kiếm & Khớp hồ sơ (MATCH FOUND)</h5>
                              <p className="text-[9px] text-slate-400">Khớp mã số VSC Number từ hệ thống Master Registry.</p>
                            </div>
                            {/* Step 3 */}
                            <div className="relative">
                              <div className={`absolute -left-[14px] top-0.5 w-2 h-2 rounded-full ${linkedAthlete ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                              <h5 className={`font-bold ${linkedAthlete ? "text-emerald-600" : "text-slate-500"}`}>3. Liên kết xác minh (VERIFY & LINK)</h5>
                              <p className="text-[9px] text-slate-400">Liên kết nguyên tử, chống tranh chấp hồ sơ bằng claims.</p>
                            </div>
                            {/* Step 4 */}
                            <div className="relative">
                              <div className={`absolute -left-[14px] top-0.5 w-2 h-2 rounded-full ${linkedAthlete ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                              <h5 className={`font-bold ${linkedAthlete ? "text-emerald-600" : "text-slate-500"}`}>4. Hoạt động chính thức (ACTIVE)</h5>
                              <p className="text-[9px] text-slate-400">Lịch sử thi đấu và chứng chỉ trọng tài tự động đồng bộ.</p>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 mt-2">
                            <span className="text-[9px] font-bold text-slate-450 block uppercase">Kiểm toán Audit Trail:</span>
                            <span className="text-[9px] text-slate-550 leading-normal mt-1 block">Tất cả quá trình liên kết và ghi đè đều được tự động lưu vào Firestore Audit Trail bảo vệ chống chiếm quyền sở hữu tài khoản VĐV.</span>
                          </div>
                        </div>
                      )}

                      {/* TAB 8: PREFERENCES SETTINGS */}
                      {acpTab === "settings" && (
                        <div className="flex flex-col gap-3 animate-fade-in text-xs">
                          <h4 className="text-[10px] font-black uppercase text-slate-405">Cấu hình bảo mật & Tùy chọn hiển thị</h4>
                          
                          <div className="flex flex-col gap-3.5 mt-1">
                            {/* Privacy */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Quyền riêng tư hồ sơ VĐV:</span>
                              <div className="flex gap-2 mt-1">
                                {(["public", "club", "private"] as const).map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setProfileVisibility(mode)}
                                    className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold border transition-all cursor-pointer capitalize ${
                                      profileVisibility === mode
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300"
                                        : "bg-white dark:bg-slate-900 border-slate-200 text-slate-500"
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* OBS Switch */}
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2.5">
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 block">Kích hoạt OBS Overlay Live:</span>
                                <span className="text-[9px] text-slate-400">Cho phép các buổi livestream bắt luồng dữ liệu của bạn.</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={obsOverlayEnabled} 
                                onChange={(e) => setObsOverlayEnabled(e.target.checked)}
                                className="w-4 h-4 text-indigo-650 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" 
                              />
                            </div>

                            {/* Telemetry Switch */}
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2.5">
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 block">Đồng bộ Scores thời gian thực:</span>
                                <span className="text-[9px] text-slate-400">Tự động phát sóng điểm số trực tiếp lên live dashboard.</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={liveTelemetryEnabled} 
                                onChange={(e) => setLiveTelemetryEnabled(e.target.checked)}
                                className="w-4 h-4 text-indigo-655 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" 
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => alert("Đã lưu các tùy chọn cấu hình bảo mật thành công!")}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all mt-2 cursor-pointer"
                            >
                              Lưu thay đổi cài đặt
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SYSTEM NOTIFICATIONS PANEL */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-5 flex flex-col gap-3 shadow-xs">
                      <h4 className="text-[10px] font-black uppercase text-slate-405 tracking-wider flex items-center gap-1.5">
                        🔔 THÔNG BÁO HỆ THỐNG ({notifications.filter(n => !n.read).length})
                      </h4>
                      <div className="flex flex-col gap-2.5">
                        {notifications.map((notif, idx) => (
                          <div key={notif.id || `notif-${idx}`} className="p-2.5 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850 text-xs flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`font-black ${notif.read ? "text-slate-600 dark:text-slate-350" : "text-indigo-600 dark:text-indigo-450"}`}>
                                {notif.title}
                              </span>
                              <span className="text-[8px] text-slate-400">{notif.date}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal">{notif.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "notifications" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  {/* HEADER BANNER */}
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800/80">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-white/10 rounded-2xl text-indigo-300">
                        <Bell className="w-6 h-6 animate-swing" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black tracking-tight">HỘP THƯ PHÊ DUYỆT & NHIỆM VỤ HỆ THỐNG</h2>
                        <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                          Nơi tập trung các sự kiện khẩn cấp, yêu cầu liên kết hồ sơ của vận động viên tự do và phê duyệt gia nhập Câu lạc bộ.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE ACTION ITEMS GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* COLUMN 1: ATHLETE ACCOUNT CLAIMS */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Yêu cầu liên kết tài khoản VĐV ({pendingClaimsCount})
                          </h3>
                        </div>
                        {isAdmin && <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full">Yêu cầu xác minh</span>}
                      </div>

                      {masterAthletes.filter(a => a.claimStatus === "pending_review").length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Check className="w-8 h-8 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded-full" />
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Không có yêu cầu liên kết nào đang chờ duyệt</p>
                          <p className="text-[10px] text-slate-400">Tất cả hồ sơ vận động viên đều đang ở trạng thái an toàn.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                          {masterAthletes
                            .filter(a => a.claimStatus === "pending_review")
                            .map((athlete) => (
                              <div 
                                key={athlete.id}
                                className="p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                              >
                                <div className="flex gap-3 items-start">
                                  <img 
                                    src={athlete.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"}
                                    alt={athlete.fullName}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                      {athlete.fullName}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Thẻ VSC: {athlete.vscNumber}</p>
                                    <p className="text-[10px] text-slate-400">Tỉnh/TP: {athlete.province} • DOB: {athlete.dob}</p>
                                  </div>
                                </div>

                                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-400 flex flex-col gap-0.5 leading-normal">
                                  <span className="font-bold">📧 Tài khoản yêu cầu liên kết:</span>
                                  <span className="font-mono truncate">{athlete.email || "Không có email"}</span>
                                  <span className="text-[9px] text-slate-450 mt-1">Hệ thống sẽ đồng bộ thông tin đăng ký lên đám mây Cloud sau khi bạn phê duyệt.</span>
                                </div>

                                <div className="flex gap-2 justify-end pt-1 border-t border-slate-200/50 dark:border-slate-800/40">
                                  <button
                                    onClick={() => handleProcessClaimFromInbox(athlete, false)}
                                    className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 dark:border-rose-950 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    onClick={() => handleProcessClaimFromInbox(athlete, true)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  >
                                    <Check className="w-3 h-3" /> Phê duyệt
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* COLUMN 2: CLUB JOIN REQUESTS */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Yêu cầu gia nhập Câu Lạc Bộ ({pendingClubRequestsCount})
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full">CLB duyệt</span>
                      </div>

                      {clubRequests.filter(r => {
                        if (r.status !== "pending") return false;
                        if (isAdmin) return true;
                        return myManagedClubs.some(c => c.id === r.clubId);
                      }).length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Check className="w-8 h-8 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded-full" />
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Không có yêu cầu gia nhập CLB nào đang chờ duyệt</p>
                          <p className="text-[10px] text-slate-400">Các vận động viên đều đã yên vị tại Câu lạc bộ chủ quản.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                          {clubRequests
                            .filter(r => {
                              if (r.status !== "pending") return false;
                              if (isAdmin) return true;
                              return myManagedClubs.some(c => c.id === r.clubId);
                            })
                            .map((req) => {
                              const ath = masterAthletes.find(a => a.id === req.athleteId);
                              const targetClub = masterClubs.find(c => c.id === req.clubId);
                              const isExpanded = expandedRequestId === req.id;

                              return (
                                <div 
                                  key={req.id}
                                  className="p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex gap-2.5 items-center">
                                      <img 
                                        src={ath?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"}
                                        alt={req.athleteName}
                                        referrerPolicy="no-referrer"
                                        className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                                      />
                                      <div>
                                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                          {req.athleteName}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-semibold">Muốn gia nhập: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{targetClub?.clubName || req.clubName}</span></p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                                      className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded text-slate-500"
                                      title="Xem chi tiết VĐV"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </div>

                                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-b border-slate-200/40 dark:border-slate-800/40 py-1.5 font-mono">
                                    <span>Thẻ VSC: {req.athleteVsc || ath?.vscNumber || "Không rõ"}</span>
                                    <span>Gửi ngày: {new Date(req.requestedAt).toLocaleDateString("vi-VN")}</span>
                                  </div>

                                  {isExpanded && ath && (
                                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/40 text-[10px] text-slate-600 dark:text-slate-400 flex flex-col gap-1.5">
                                      <h5 className="font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-200/30 pb-1">Chi tiết thông tin VĐV:</h5>
                                      <p>• Họ và tên: <strong>{ath.fullName}</strong></p>
                                      <p>• Giới tính: <strong>{ath.gender}</strong> • Tỉnh/TP: <strong>{ath.province}</strong></p>
                                      <p>• Điện thoại: <strong>{ath.phone || "Chưa cung cấp"}</strong></p>
                                      <p>• Câu lạc bộ hiện tại: <strong>{ath.clubName || "Vận động viên tự do"}</strong></p>
                                    </div>
                                  )}

                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      onClick={() => handleProcessClubRequestFromInbox(req, false)}
                                      className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 dark:border-rose-950 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                                    >
                                      Từ chối
                                    </button>
                                    <button
                                      onClick={() => handleProcessClubRequestFromInbox(req, true)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                    >
                                      <Check className="w-3 h-3" /> Chấp nhận vào CLB
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: RECENT AUDIT TRAIL LOGS */}
                  {isAdmin && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Shield className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Nhật ký Hoạt động Kiểm toán Hệ thống (Audit Trail)
                          </h3>
                        </div>
                        <button
                          onClick={fetchAuditLogs}
                          disabled={loadingAuditLogs}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          {loadingAuditLogs ? "Đang tải..." : "Tải lại nhật ký"}
                        </button>
                      </div>

                      {loadingAuditLogs ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                          <span className="text-[11px] text-slate-500 font-medium">Đang tải lịch sử kiểm toán...</span>
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <p className="py-10 text-center text-xs font-bold text-slate-500 dark:text-slate-400">Không có nhật ký hệ thống gần đây</p>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-850">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-extrabold border-b border-slate-150 dark:border-slate-850">
                                <th className="p-3">Thời gian</th>
                                <th className="p-3">Hành động</th>
                                <th className="p-3">Người thực hiện</th>
                                <th className="p-3">Chi tiết nghiệp vụ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                              {auditLogs.slice(0, 15).map((log, idx) => {
                                const dateVal = log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "Không rõ";
                                return (
                                  <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955 transition-colors">
                                    <td className="p-3 whitespace-nowrap text-[10px] font-semibold text-slate-500 font-mono">{dateVal}</td>
                                    <td className="p-3 whitespace-nowrap">
                                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                        log.action === "LINK_ACCOUNT" || log.action === "CLUB_JOIN_APPROVE"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                          : log.action === "UNLINK_ACCOUNT" || log.action === "CLUB_JOIN_REJECT"
                                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 dark:text-slate-350">{log.athleteName || "Quản trị viên"}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">{log.userEmail || log.userId}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 leading-normal max-w-sm">{log.details}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {subTab === "created" && (
                <div>
                  {myCreatedTournaments.length === 0 ? (
                    <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                      <Inbox className="w-8 h-8 text-slate-400/80" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Chưa có giải đấu do bạn tạo</h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                          Bạn có thể ra <strong>Trang Chủ</strong> để đăng một giải đấu nội bộ hiện tại của mình lên đám mây Cloud để quản lý dễ dàng hơn.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {myCreatedTournaments.map((tour, idx) => {
                        const isTeam = (tour.competitionMode || "individual") === "team";
                        const activeAthletesList = isTeam ? (tour.teamAthletes || []) : (tour.athletes || []);
                        const activeDistancesList = isTeam ? (tour.teamDistances || []) : (tour.distances || []);
                        const topAthletes = getTopAthletes(activeAthletesList, activeDistancesList);
                        const isActive = activeHistoryId === tour.id;

                        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function" 
                          ? tour.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }) 
                          : "Gần đây";

                        return (
                          <div
                            key={tour.id || `tour-created-${idx}`}
                            className={`relative bg-white dark:bg-slate-900 rounded-3xl border p-5 flex flex-col gap-4 shadow-xs transition-all ${
                              isActive 
                                ? "border-indigo-500 ring-2 ring-indigo-500/15" 
                                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {dateStr}
                                </span>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                                  {tour.matchName}
                                </h3>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-md">
                                QR Trưởng Giải
                              </span>
                            </div>

                            {/* Summary info */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/20 text-xs flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Chế độ: <strong className="text-slate-700 dark:text-slate-300">{isTeam ? "Hỏa lực Đồng Đội" : "Hỏa lực Cá Nhân"}</strong></span>
                                <span>VĐV: <strong className="text-slate-700 dark:text-slate-300">{activeAthletesList.length}</strong></span>
                              </div>
                              <div className="flex justify-between items-center text-slate-500 border-t border-slate-200/40 dark:border-slate-800/40 pt-1.5">
                                <span>Trọng tài phụ trợ:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {tour.referees && tour.referees.length > 0 ? `${tour.referees.length} người` : "Chưa chỉ định"}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-end mt-1 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <button
                                onClick={() => {
                                  setShowConfirmDeleteId(tour.id);
                                }}
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-transparent dark:border-rose-950 dark:hover:bg-rose-900 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1"
                                title="Xóa giải này khỏi Cloud"
                              >
                                <Trash2 className="w-4 h-4" /> Xóa
                              </button>
                              
                              <button
                                onClick={() => onSelectTournament(tour.id, tour)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                Quản lý giải đấu <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subTab === "referee" && (
                <div>
                  {myRefereeTournaments.length === 0 ? (
                    <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                      <Award className="w-8 h-8 text-slate-400" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Chưa thấy giải được mời làm Trọng tài</h4>
                        <p className="text-[11px] text-slate-400 max-w-sm mt-1 leading-relaxed">
                          Để được phân quyền làm Trọng Tài phụ trợ nhập điểm trên mây: Hãy nhờ <strong>Trưởng giải</strong> truy cập vào tab <strong>"Cấu Hình"</strong> của giải đó &rarr; kéo xuống phần <strong>"Quản lý trọng tài (Cloud)"</strong> và thêm email <strong className="text-indigo-600 dark:text-indigo-400">{currentUser.email}</strong> của bạn vào đó nhé!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {myRefereeTournaments.map((tour, idx) => {
                        const isTeam = (tour.competitionMode || "individual") === "team";
                        const activeAthletesList = isTeam ? (tour.teamAthletes || []) : (tour.athletes || []);
                        const activeDistancesList = isTeam ? (tour.teamDistances || []) : (tour.distances || []);
                        const isActive = activeHistoryId === tour.id;

                        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function" 
                          ? tour.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }) 
                          : "Gần đây";

                        return (
                          <div
                            key={tour.id || `tour-referee-${idx}`}
                            className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 flex flex-col gap-4 shadow-xs transition-all ${
                              isActive 
                                ? "border-amber-500 ring-2 ring-amber-500/15" 
                                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {dateStr}
                                </span>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-101 line-clamp-1 mt-0.5">
                                  {tour.matchName}
                                </h3>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-550 text-white px-2 py-0.5 rounded-md bg-amber-500">
                                Trọng Tài
                              </span>
                            </div>

                            {/* Details with Creator */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/20 text-xs flex flex-col gap-2">
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Chế độ: <strong className="text-slate-700 dark:text-slate-300">{isTeam ? "Đồng đồng" : "Cá nhân"}</strong></span>
                                <span>Số cự ly: <strong className="text-slate-700 dark:text-slate-300">{activeDistancesList.length}</strong></span>
                              </div>
                              <div className="flex justify-wrap gap-1 items-center text-[10px] text-slate-400 border-t border-slate-200/40 dark:border-slate-800/40 pt-2 leading-relaxed">
                                <User className="w-3 h-3 text-indigo-505" />
                                <span>Trưởng giải tạo: <strong className="text-indigo-650 dark:text-indigo-400">{tour.creatorEmail}</strong></span>
                              </div>
                            </div>

                            <div className="flex justify-end mt-1 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <button
                                onClick={() => onSelectTournament(tour.id, tour)}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              >
                                <Award className="w-4 h-4" /> Vào ghi điểm / giám sát
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subTab === "settings" && (
                <div className="animate-fade-in space-y-4">
                  <SettingsPanel
                    matchName={matchName}
                    setMatchName={setMatchName}
                    distances={distances}
                    setDistances={setDistances}
                    shotsCount={shotsCount}
                    setShotsCount={setShotsCount}
                    athletes={athletes}
                    setAthletes={setAthletes}
                    masterAthletes={masterAthletesProp}
                    setMasterAthletes={setMasterAthletesProp}
                    history={history}
                    setHistory={setHistory}
                    onSaveCurrentSessionToHistory={onSaveCurrentSessionToHistory}
                    onResetSession={onResetSession}
                    onImportBackup={onImportBackup}
                    storedAthleteLists={storedAthleteLists}
                    setStoredAthleteLists={setStoredAthleteLists}
                    activeHistoryId={activeHistoryId}
                    setActiveHistoryId={setActiveHistoryId}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    teamDistances={teamDistances}
                    setTeamDistances={setTeamDistances}
                    teamShotsCount={teamShotsCount}
                    setTeamShotsCount={setTeamShotsCount}
                    teamAthletes={teamAthletes}
                    setTeamAthletes={setTeamAthletes}
                    directMaxShots={directMaxShots}
                    setDirectMaxShots={setDirectMaxShots}
                    teamDirectMaxShots={teamDirectMaxShots}
                    setTeamDirectMaxShots={setTeamDirectMaxShots}
                    directMaxPoints={directMaxPoints}
                    setDirectMaxPoints={setDirectMaxPoints}
                    teamDirectMaxPoints={teamDirectMaxPoints}
                    setTeamDirectMaxPoints={setTeamDirectMaxPoints}
                  />
                </div>
              )}

              {subTab === "diagnostics" && (
                <div className="animate-fade-in space-y-4">
                  <TestingHarnessComponent />
                </div>
              )}
            </>
          )}

        </div>
      )}

      {showConfirmDeleteId && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fadeIn text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full">
              <Trash2 className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Xóa giải đấu khỏi Cloud?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa vĩnh viễn giải đấu{" "}
              <strong className="text-rose-600 dark:text-rose-400">
                "{tournaments.find((t) => t.id === showConfirmDeleteId)?.matchName || "Trống"}"
              </strong>{" "}
              khỏi Cloud? Toàn bộ danh sách VĐV, trọng tài và bảng điểm trực tuyến sẽ biến mất vĩnh viễn.
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteId(null)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(showConfirmDeleteId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showConfirmSaveModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fadeIn text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-full">
              <Save className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Xác nhận Lưu Hồ Sơ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Bạn có chắc chắn muốn cập nhật toàn bộ các thông tin thay đổi vào hồ sơ của mình trên hệ thống Cloud không?
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={handleResetProfile}
                className="flex-1 py-2 border border-rose-200 dark:border-rose-900 text-[10px] font-bold rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              >
                Reset hủy đổi
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmSaveModal(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Sửa tiếp
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
