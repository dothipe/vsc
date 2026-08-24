import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, Calendar, MapPin, Users, Award, Shield, FileText, ArrowUp, ArrowDown, 
  Plus, Trash2, Copy, Edit3, Archive, Save, RefreshCw, AlertTriangle, CheckCircle, 
  Info, Clock, UserCheck, Image as ImageIcon, DollarSign, ChevronRight, ChevronDown, X, Layers,
  Sliders, History, Sparkles, Target, Star, Search, PlusCircle, Trash, ClipboardCheck, BarChart2, Zap,
  QrCode, Wifi, Eye, EyeOff
} from "lucide-react";
import { usePermission } from "../providers/PermissionProvider";
import { auth } from "../firebase";
import { VSCLogo } from "./VSCLogo";
import { tournamentRepository } from "../repositories/tournament.repository";
import { TournamentV3, DistanceConfigV3, TournamentHistoryV3, DistanceConfig, Athlete, TournamentParticipantV3, HeatV3, TournamentWorkflowState, COMPETITION_CATEGORIES } from "../types";
import { TournamentWorkflowEngine, WORKFLOW_STATES_ORDER, WORKFLOW_STATE_METADATA } from "../engines/workflowEngine";
import { RuleEngine } from "./RuleEngine";
import { DEFAULT_ATHLETES } from "../initialData";
import { motion, AnimatePresence } from "motion/react";
import { AssignmentEngine } from "../engines/assignmentEngine";
import { RankingEngine } from "../engines/rankingEngine";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs, saveVscSystemAthletes, subscribeToVscSystemSeasons } from "../lib/firebaseService";
import { calculateRounds } from "../utils/qualification";
import { getCleanVscNumber, getCleanBibNumber } from "../utils/athleteUtils";
import { OverviewTab } from "./tournament-management/OverviewTab";
import { TournamentConfigTab } from "./tournament-management/TournamentConfigTab";
import { ParticipantsTab } from "./tournament-management/ParticipantsTab";
import { CheckInTab } from "./tournament-management/CheckInTab";
import { AssignmentsTab } from "./tournament-management/AssignmentsTab";
import { RefereesTab } from "./tournament-management/RefereesTab";
import { CompetitionTab } from "./tournament-management/CompetitionTab";
import { RankingTab } from "./tournament-management/RankingTab";
import { StatisticsTab } from "./tournament-management/StatisticsTab";
import { AuditHistoryTab } from "./tournament-management/AuditHistoryTab";
import { AVATAR_MALE, AVATAR_FEMALE } from "./AthleteRegistry";
import { compressLogo, compressBanner } from "../utils/imageCompressor";

/**
 * Merges and deduplicates athletes with the same VSC Number or Master Athlete ID.
 * If one row is paid ("paid") or checked in ("checked_in"), the merged athlete will be marked paid/checked in.
 */
export function getDeduplicatedAthletes(list: any[]): any[] {
  if (!list || !Array.isArray(list)) return [];
  const mergedMap = new Map<string, any>();
  const freeAthletes: any[] = [];

  list.forEach(item => {
    const vsc = item.vscNumber ? String(item.vscNumber).trim().toUpperCase() : "";
    const masterId = item.masterAthleteId ? String(item.masterAthleteId).trim() : "";
    
    // Determine unique key if they are a system athlete
    const uniqueKey = vsc && !vsc.startsWith("VSC-TEMP") ? vsc : masterId;

    if (!uniqueKey) {
      // Local or free athletes: match by Name and DOB to merge duplicates
      const nameKey = `${String(item.fullName || item.name || "").trim().toLowerCase()}_${item.dob || ""}`;
      const existingIdx = freeAthletes.findIndex(f => {
        const fNameKey = `${String(f.fullName || f.name || "").trim().toLowerCase()}_${f.dob || ""}`;
        return fNameKey === nameKey;
      });
      if (existingIdx > -1) {
        const existing = freeAthletes[existingIdx];
        freeAthletes[existingIdx] = {
          ...existing,
          ...item,
          // Merge statuses
          paymentStatus: (existing.paymentStatus === "paid" || item.paymentStatus === "paid") ? "paid" : "pending",
          status: (existing.status === "checked_in" || item.status === "checked_in") ? "checked_in" : (existing.status || item.status),
          checkInStatus: (existing.checkInStatus === "checked_in" || item.checkInStatus === "checked_in") ? "checked_in" : (existing.checkInStatus || item.checkInStatus),
          bibNumber: existing.bibNumber || item.bibNumber,
          competitionCategory: existing.competitionCategory || item.competitionCategory,
          scores: { ...(existing.scores || {}), ...(item.scores || {}) },
          soloHits: { ...(existing.soloHits || {}), ...(item.soloHits || {}) },
          soloRounds: { ...(existing.soloRounds || {}), ...(item.soloRounds || {}) },
          soloShotDetails: { ...(existing.soloShotDetails || {}), ...(item.soloShotDetails || {}) }
        };
      } else {
        freeAthletes.push({ ...item });
      }
    } else {
      if (mergedMap.has(uniqueKey)) {
        const existing = mergedMap.get(uniqueKey);
        mergedMap.set(uniqueKey, {
          ...existing,
          ...item,
          // Merge statuses
          paymentStatus: (existing.paymentStatus === "paid" || item.paymentStatus === "paid") ? "paid" : "pending",
          status: (existing.status === "checked_in" || item.status === "checked_in") ? "checked_in" : (existing.status || item.status),
          checkInStatus: (existing.checkInStatus === "checked_in" || item.checkInStatus === "checked_in") ? "checked_in" : (existing.checkInStatus || item.checkInStatus),
          bibNumber: existing.bibNumber || item.bibNumber,
          competitionCategory: existing.competitionCategory || item.competitionCategory,
          scores: { ...(existing.scores || {}), ...(item.scores || {}) },
          soloHits: { ...(existing.soloHits || {}), ...(item.soloHits || {}) },
          soloRounds: { ...(existing.soloRounds || {}), ...(item.soloRounds || {}) },
          soloShotDetails: { ...(existing.soloShotDetails || {}), ...(item.soloShotDetails || {}) }
        });
      } else {
        mergedMap.set(uniqueKey, { ...item });
      }
    }
  });

  return [...Array.from(mergedMap.values()), ...freeAthletes];
}

export function cleanStageName(name: string): string {
  if (!name) return "Sơ đồ chưa đặt tên";
  let cleaned = name
    .replace(/undefined/gi, "")
    .replace(/\(\s*\)/g, "") // remove empty parentheses
    .replace(/:\s*$/g, "") // remove trailing colon
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
  
  if (!cleaned || cleaned === ":" || cleaned === "(Đồng Đội)") {
    return "Sơ đồ chưa đặt tên";
  }
  return cleaned;
}

interface TournamentManagementProps {
  onSelectTournament?: (id: string, tournament: TournamentV3) => void;
  activeHistoryId?: string | null;
  isCreateOpen?: boolean;
  onExitCreate?: () => void;
}

export const TournamentManagement: React.FC<TournamentManagementProps> = ({
  onSelectTournament,
  activeHistoryId,
  isCreateOpen,
  onExitCreate
}) => {
  const { role, hasPermission } = usePermission();
  const currentUser = auth.currentUser;

  // List States
  const [tournaments, setTournaments] = useState<TournamentV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");

  // Editing/Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editTourId, setEditTourId] = useState<string | null>(null); // null means creating
  const [deleteConfirmTourId, setDeleteConfirmTourId] = useState<string | null>(null);
  
  // 10 Unified Workspace Tabs
  const [activeFormTab, setActiveFormTab] = useState<
    "overview" | "tournament_config" | "participants" | "check_in" | "assignments" |
    "referees" | "competition" | "ranking" | "statistics" | "audit_history"
  >("overview");

  const [configSubTab, setConfigSubTab] = useState<"general" | "rules">("general");

  // Global system master data synced lists (for registration snapshotted additions)
  const [globalMasterAthletes, setGlobalMasterAthletes] = useState<any[]>([]);
  const [globalMasterClubs, setGlobalMasterClubs] = useState<any[]>([]);

  const resolveAthleteAvatar = (vdv: any) => {
    if (!vdv) return AVATAR_MALE;
    let avatarUrl = vdv.avatarUrl || vdv.avatar || null;
    
    if (!avatarUrl || avatarUrl.startsWith("data:image") === false) {
      const targetId = vdv.masterAthleteId || vdv.athleteId || vdv.participantId || vdv.id;
      if (targetId) {
        const found = globalMasterAthletes.find((a) => a.id === targetId || a.athleteId === targetId);
        if (found) {
          avatarUrl = found.avatarUrl || found.avatar || avatarUrl;
        }
      }
    }
    
    return avatarUrl || (vdv.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE);
  };

  // Dynamic Assignment Engine Config & Outputs
  const [assignmentStrategy, setAssignmentStrategy] = useState<"sequential" | "ranking" | "snake" | "random" | "seeded" | "ranking_asc">("random");
  const [assignmentClubSeparation, setAssignmentClubSeparation] = useState(true);
  const [generatedHeats, setGeneratedHeats] = useState<HeatV3[]>([]);
  const [assignmentStageId, setAssignmentStageId] = useState<string>("");
  const [assignmentMode, setAssignmentMode] = useState<"individual" | "team">("individual");
  const [teamAssignmentMode, setTeamAssignmentMode] = useState<"parallel" | "sequential">("parallel");
  const [teamShuffleTeams, setTeamShuffleTeams] = useState(true);

  // Form Fields
  const [tournamentName, setTournamentName] = useState("");
  const [season, setSeason] = useState("VSC 2026");
  const [availableSeasons, setAvailableSeasons] = useState<any[]>([]);

  // Reset stage selection when changing assignment scope/mode
  useEffect(() => {
    setAssignmentStageId("");
  }, [assignmentMode]);

  // Load available seasons
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemSeasons((seasonsList) => {
      if (seasonsList && seasonsList.length > 0) {
        setAvailableSeasons(seasonsList);
        if (!season) {
          const activeSeason = seasonsList.find(s => s.status === "active") || seasonsList[0];
          setSeason(activeSeason.name || activeSeason.seasonId);
        }
      } else {
        setAvailableSeasons([
          { seasonId: "season_2026", name: "VSC Season 2026", year: 2026 },
          { seasonId: "season_2025", name: "VSC Season 2025", year: 2025 }
        ]);
      }
    });
    return () => unsubscribe();
  }, [season]);

  const [organizer, setOrganizer] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [prizePool, setPrizePool] = useState<number>(0);
  const [tournamentFormat, setTournamentFormat] = useState<"individual" | "mixed">("individual");
  const [status, setStatus] = useState<"draft" | "registration" | "ready" | "live" | "completed" | "archived">("draft");
  const [workflowState, setWorkflowState] = useState<TournamentWorkflowState>("draft");
  const [headReferee, setHeadReferee] = useState("");
  const [assistantReferees, setAssistantReferees] = useState<string[]>([]);
  const [newAssistant, setNewAssistant] = useState("");
  const [notes, setNotes] = useState("");
  const [distances, setDistances] = useState<any[]>([]);
  const [teamDistances, setTeamDistances] = useState<DistanceConfig[]>([]);

  const isSelectedStageFirstStage = useMemo(() => {
    if (!assignmentStageId) return false;
    const stages = assignmentMode === "team" ? teamDistances : distances;
    const idx = stages.findIndex(d => d.id === assignmentStageId);
    return idx === 0;
  }, [assignmentStageId, assignmentMode, distances, teamDistances]);
  const [shotsCount, setShotsCount] = useState<number>(10);
  const [teamShotsCount, setTeamShotsCount] = useState<number>(10);
  const [directMaxShots, setDirectMaxShots] = useState<number>(10);
  const [teamDirectMaxShots, setTeamDirectMaxShots] = useState<number>(10);
  const [directMaxPoints, setDirectMaxPoints] = useState<number | undefined>(undefined);
  const [teamDirectMaxPoints, setTeamDirectMaxPoints] = useState<number | undefined>(undefined);

  // Payment & Registration Fee States
  const [registrationFee, setRegistrationFee] = useState<number>(200000);
  const [bankAccountNumber, setBankAccountNumber] = useState("0968210586");
  const [bankAccountName, setBankAccountName] = useState("NGUYEN HUU HIEP");
  const [bankName, setBankName] = useState("MB Bank");
  const [payosClientId, setPayosClientId] = useState("");
  const [payosApiKey, setPayosApiKey] = useState("");
  const [payosChecksumKey, setPayosChecksumKey] = useState("");
  const [payosAutoApprove, setPayosAutoApprove] = useState(true);

  // Modal / simulation states
  const [activePaymentVdv, setActivePaymentVdv] = useState<any | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [paymentSimulationStep, setPaymentSimulationStep] = useState<"ready" | "scanning" | "verifying" | "success">("ready");

  // Expanded Workspace states
  const [laneCapacity, setLaneCapacity] = useState<number>(10);
  const [athletesListInternal, setAthletesListInternal] = useState<any[]>([]);
  const setAthletesList = (newListOrFn: any[] | ((prev: any[]) => any[])) => {
    setAthletesListInternal((prev) => {
      const newList = typeof newListOrFn === "function" ? newListOrFn(prev) : newListOrFn;
      const deduplicated = getDeduplicatedAthletes(newList);
      
      const dbStr = JSON.stringify(getDeduplicatedAthletes(dbAthletesRef.current || []));
      const newStr = JSON.stringify(deduplicated);
      
      if (editTourId && dbStr !== newStr) {
        const currentTour = tournaments.find(t => t.id === editTourId);
        if (currentTour) {
          const userEmail = currentUser?.email || "unknown@vscs.asia";
          const userId = currentUser?.uid || "system";
          
          tournamentRepository.updateTournament(
            editTourId,
            { athletes: deduplicated },
            userId,
            userEmail,
            role,
            "Cập nhật danh sách vận động viên",
            "Tự động đồng bộ hóa danh sách và trạng thái vận động viên lên đám mây."
          ).then(() => {
            dbAthletesRef.current = deduplicated;
            lastLoadedAthletesRef.current = deduplicated;
          }).catch(err => {
            console.error("Auto-sync athletes to Firestore failed:", err);
          });
        }
      }
      return deduplicated;
    });
  };
  const athletesList = athletesListInternal;
  const lastLoadedAthletesRef = useRef<any[]>([]);
  const dbAthletesRef = useRef<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [scheduleList, setScheduleList] = useState<{ id: string; time: string; activity: string; location: string }[]>([]);
  const [prizeStructure, setPrizeStructure] = useState<string>("");
  const [sponsorsList, setSponsorsList] = useState<{ id: string; name: string; tier: "gold" | "silver" | "bronze"; logo?: string }[]>([]);

  // Sub-forms local temporary fields
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteTeam, setNewAthleteTeam] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamProvince, setNewTeamProvince] = useState("");
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleActivity, setNewScheduleActivity] = useState("");
  const [newScheduleLoc, setNewScheduleLoc] = useState("");
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorTier, setNewSponsorTier] = useState<"gold" | "silver" | "bronze">("gold");

  // Sprint 02 State Variables
  const [isParticipantListUnlockedManually, setIsParticipantListUnlockedManually] = useState(false);
  const [showCustomSortModal, setShowCustomSortModal] = useState(false);
  const [customSortedAthletes, setCustomSortedAthletes] = useState<any[]>([]);
  const [assignmentVersions, setAssignmentVersions] = useState<{ id: string, name: string, timestamp: string, strategy: string, stageId?: string, lanesCount?: number, clubSeparation?: boolean, heats: any[] }[]>([]);
  const sortedAssignmentVersions = useMemo(() => {
    return [...assignmentVersions].sort((a, b) => {
      // First, try to extract round number from the name, e.g. "Vòng 1: ..." -> 1, "Vòng 2: ..." -> 2
      const matchA = a.name?.match(/Vòng\s*(\d+)/i);
      const matchB = b.name?.match(/Vòng\s*(\d+)/i);
      
      const roundA = matchA ? parseInt(matchA[1], 10) : null;
      const roundB = matchB ? parseInt(matchB[1], 10) : null;
      
      if (roundA !== null && roundB !== null) {
        if (roundA !== roundB) {
          return roundA - roundB;
        }
      } else if (roundA !== null) {
        return -1; // round-numbered versions go first
      } else if (roundB !== null) {
        return 1;
      }
      
      // Fallback to stageId index
      const getStageIndex = (stageId?: string) => {
        if (!stageId) return 9999;
        const indIdx = distances.findIndex(d => d.id === stageId);
        if (indIdx !== -1) return indIdx;
        const tmIdx = (teamDistances || []).findIndex(d => d.id === stageId);
        if (tmIdx !== -1) return tmIdx + 1000;
        return 9999;
      };
      
      const idxA = getStageIndex(a.stageId);
      const idxB = getStageIndex(b.stageId);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      
      // Fallback to timestamp
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });
  }, [assignmentVersions, distances, teamDistances]);
  const filteredVersions = useMemo(() => {
    return sortedAssignmentVersions.filter(ver => {
      const isTeam = ver.strategy?.startsWith("team_") || ver.name?.includes("(Đồng Đội)");
      return assignmentMode === "team" ? isTeam : !isTeam;
    });
  }, [sortedAssignmentVersions, assignmentMode]);

  const triggerAutoSaveAssignments = async (
    newVersions: any[],
    newHeats: any[]
  ) => {
    if (!editTourId) return;
    try {
      const currentTour = tournaments.find(t => t.id === editTourId);
      const existingCommandCenterState = currentTour?.commandCenterState || {};
      const activeStageId = existingCommandCenterState.activeSubStage;
      const shouldUpdateActiveHeats = !activeStageId || activeStageId === assignmentStageId;

      const updatedCommandCenterState = {
        ...existingCommandCenterState,
        heats: shouldUpdateActiveHeats ? newHeats : (existingCommandCenterState.heats || []),
        assignmentVersions: newVersions,
        assignmentStrategy: assignmentStrategy,
        assignmentStageId: assignmentStageId,
        assignmentClubSeparation: assignmentClubSeparation,
      };

      const userEmail = currentUser?.email || "unknown@vscs.asia";
      const userId = currentUser?.uid || "system";

      await tournamentRepository.updateTournament(
        editTourId,
        {
          commandCenterState: updatedCommandCenterState
        },
        userId,
        userEmail,
        role,
        "Cập nhật sơ đồ đấu",
        "Tự động cập nhật sơ đồ đấu/bệ bắn mới."
      );
    } catch (err) {
      console.error("Auto save assignments failed:", err);
    }
  };

  const renderAssignmentsList = (mode: "individual" | "team") => {
    const listVersions = sortedAssignmentVersions.filter(ver => {
      const isTeam = ver.strategy?.startsWith("team_") || ver.name?.includes("(Đồng Đội)");
      const matchesStage = assignmentStageId ? ver.stageId === assignmentStageId : true;
      return (mode === "team" ? isTeam : !isTeam) && matchesStage;
    });

    return (
      <div className="space-y-4 pt-4 border-t border-slate-150 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block font-mono">
            Danh Sách Sơ Đồ Đấu {mode === "team" ? "Đồng Đội" : "Cá Nhân"} ({listVersions.length})
          </h3>
        </div>

        {listVersions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold">
            Chưa có sơ đồ đấu {mode === "team" ? "Đồng Đội" : "Cá Nhân"} nào được lưu cho giải đấu này. Hãy cấu hình phía trên và bấm phát sinh bệ bắn.
          </div>
        ) : (
          <div className="space-y-3">
            {listVersions.map((ver, idx) => {
              const isExpanded = !!expandedVersionIds[ver.id];
              const displayName = cleanStageName(ver.name);
              return (
                <div key={ver.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
                  {/* Header Card */}
                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-950 dark:text-white text-sm">{displayName}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                          Vị trí {idx + 1}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-400 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Chiến thuật: {
                          ver.strategy === "random" ? "Random (Ngẫu nhiên)" :
                          ver.strategy === "sequential" ? "Tuần tự theo BIB" :
                          ver.strategy === "snake" ? "Snake (Dạng Rắn)" :
                          ver.strategy === "ranking" ? "Ranking (Hạt giống)" :
                          ver.strategy === "ranking_asc" ? "Ranking Asc (Hạt giống tăng dần)" :
                          ver.strategy === "seeded" ? "Seeded (Trải đều)" : 
                          ver.strategy === "team_parallel" ? "Đồng Đội (Song song)" :
                          ver.strategy === "team_sequential" ? "Đồng Đội (Nối tiếp)" : ver.strategy
                        }</span>
                        <span>•</span>
                        <span>Số bệ: {ver.lanesCount || ver.heats?.[0]?.lanes?.length || 8}</span>
                        <span>•</span>
                        <span>Tách CLB: {ver.clubSeparation ? "Bật" : "Tắt"}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{new Date(ver.timestamp).toLocaleTimeString("vi-VN")}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVersionId(ver.id);
                          setAssignmentStageId(ver.stageId || "");
                          if (ver.strategy?.startsWith("team_")) {
                            setAssignmentMode("team");
                            setTeamAssignmentMode(ver.strategy === "team_sequential" ? "sequential" : "parallel");
                          } else {
                            setAssignmentMode("individual");
                            setAssignmentStrategy((ver.strategy || "random") as any);
                          }
                          setLaneCapacity(ver.lanesCount || ver.heats?.[0]?.lanes?.length || 10);
                          setAssignmentClubSeparation(!!ver.clubSeparation);
                        }}
                        className="p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                        title="Sửa sơ đồ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa sơ đồ vòng "${ver.name}"?`)) {
                            const updatedVersions = assignmentVersions.filter(v => v.id !== ver.id);
                            setAssignmentVersions(updatedVersions);
                            setIsDirty(true);
                            triggerAutoSaveAssignments(updatedVersions, generatedHeats);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        title="Xóa sơ đồ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [expandedVersionIds, setExpandedVersionIds] = useState<Record<string, boolean>>({});
  const [assignmentVersionName, setAssignmentVersionName] = useState("");
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionTargetState, setTransitionTargetState] = useState<TournamentWorkflowState | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<any | null>(null);
  const [deleteConfirmAthleteTournament, setDeleteConfirmAthleteTournament] = useState<any | null>(null);
  const [editFields, setEditFields] = useState<any | null>(null);
  const [addParticipantType, setAddParticipantType] = useState<"master" | "local">("master");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [newAthleteVsc, setNewAthleteVsc] = useState("");
  const [newAthleteDob, setNewAthleteDob] = useState("");
  const [newAthleteGender, setNewAthleteGender] = useState<"Nam" | "Nữ" | "Khác">("Nam");
  const [newAthleteProvince, setNewAthleteProvince] = useState("Hà Nội");
  const [newAthleteBib, setNewAthleteBib] = useState("");
  const [newAthleteCategory, setNewAthleteCategory] = useState("");
  const [newAthleteNotes, setNewAthleteNotes] = useState("");
  const [newAthleteMetadata, setNewAthleteMetadata] = useState("");
  const [newAthleteIsPrimary, setNewAthleteIsPrimary] = useState(false);

  // Version History list of edited doc
  const [versionHistory, setVersionHistory] = useState<TournamentHistoryV3[]>([]);

  // Auto save & warnings
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [autoSaveRecoveryAvailable, setAutoSaveRecoveryAvailable] = useState(false);

  // Validation warnings (inline)
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Timer reference for autosave
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check permissions
  const canCreate = hasPermission("CREATE") || role === "system_owner" || role === "admin";
  const canUpdate = hasPermission("UPDATE") || role === "system_owner" || role === "admin";
  const canDelete = hasPermission("DELETE") || role === "system_owner" || role === "admin";

  // Subscribe to tournaments list in real-time
  useEffect(() => {
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      setGlobalMasterAthletes(data);
    });
    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setGlobalMasterClubs(data);
    });
    return () => {
      unsubAthletes();
      unsubClubs();
    };
  }, []);

  // Synchronize editFields with editingParticipant using primitive dependencies
  useEffect(() => {
    if (editingParticipant) {
      setEditFields({
        id: editingParticipant.id || editingParticipant.participantId,
        participantId: editingParticipant.participantId || editingParticipant.id,
        vscNumber: editingParticipant.vscNumber || "",
        bibNumber: editingParticipant.bibNumber || "",
        fullName: editingParticipant.fullName || editingParticipant.name || "",
        dob: editingParticipant.dob || "",
        gender: editingParticipant.gender || "Nam",
        province: editingParticipant.province || "Hà Nội",
        clubName: editingParticipant.clubName || editingParticipant.team || "Tự Do",
        team: editingParticipant.team || editingParticipant.clubName || "Tự Do",
        competitionCategory: editingParticipant.competitionCategory || "Amateur",
        notes: editingParticipant.notes || "",
        metadata: editingParticipant.metadata || "",
        status: editingParticipant.status || "registered",
        checkInStatus: editingParticipant.checkInStatus || "pending",
        isMasterAthlete: editingParticipant.isMasterAthlete ?? false,
        masterAthleteId: editingParticipant.masterAthleteId || "",
        isPrimaryTeam: editingParticipant.isPrimaryTeam ?? false
      });
    } else {
      setEditFields(null);
    }
  }, [editingParticipant?.id, editingParticipant?.participantId]);

  // Handle activeHistoryId tournament binding
  useEffect(() => {
    if (activeHistoryId && editTourId !== activeHistoryId) {
      const activeTour = tournaments.find(t => t.id === activeHistoryId);
      if (activeTour) {
        setEditTourId(activeTour.id);
        setTournamentName(activeTour.tournamentName);
        setSeason(activeTour.season || "VSC 2026");
        setOrganizer(activeTour.organizer || "");
        setLocation(activeTour.location || "");
        setStartDate(activeTour.startDate || "");
        setEndDate(activeTour.endDate || "");
        setDescription(activeTour.description || "");
        setLogo(activeTour.logo || "");
        setBanner(activeTour.banner || "");
        setPrizePool(activeTour.prizePool || 0);
        setTournamentFormat(activeTour.tournamentFormat === "team" ? "mixed" : (activeTour.tournamentFormat || "individual"));
        setStatus(activeTour.status || "draft");
        setWorkflowState(activeTour.workflowState || TournamentWorkflowEngine.mapStatusToWorkflowState(activeTour.status || "draft"));
        setHeadReferee(activeTour.headReferee || "");
        setAssistantReferees(activeTour.assistantReferees || []);
        setNotes(activeTour.notes || "");
        setDistances(activeTour.distances || []);
        setTeamDistances(activeTour.teamDistances || []);
        setShotsCount(activeTour.shotsCount || 10);
        setTeamShotsCount(activeTour.teamShotsCount || 10);
        setDirectMaxShots(activeTour.directMaxShots || 10);
        setTeamDirectMaxShots(activeTour.teamDirectMaxShots || 10);
        setDirectMaxPoints(activeTour.directMaxPoints);
        setTeamDirectMaxPoints(activeTour.teamDirectMaxPoints);
        setVersionHistory(activeTour.versionHistory || []);

        setLaneCapacity(activeTour.laneCapacity || 10);
        setAthletesList(activeTour.athletes || []);
        lastLoadedAthletesRef.current = activeTour.athletes || [];
        dbAthletesRef.current = activeTour.athletes || [];
        setTeamsList(activeTour.teams || []);
        setScheduleList(activeTour.schedule || []);
        setPrizeStructure(activeTour.prizeStructure || "");
        setSponsorsList(activeTour.sponsors || []);

        // Load assignments from commandCenterState if available
        setGeneratedHeats(activeTour.commandCenterState?.heats || []);
        setAssignmentVersions(activeTour.commandCenterState?.assignmentVersions || []);
        setAssignmentStrategy(activeTour.commandCenterState?.assignmentStrategy || "random");
        setAssignmentStageId(activeTour.commandCenterState?.assignmentStageId || "");
        setAssignmentClubSeparation(activeTour.commandCenterState?.assignmentClubSeparation !== false);

        // Load payment fields
        setRegistrationFee(activeTour.registrationFee !== undefined ? activeTour.registrationFee : 200000);
        setBankAccountNumber(activeTour.bankAccountNumber || "0968210586");
        setBankAccountName(activeTour.bankAccountName || "NGUYEN HUU HIEP");
        setBankName(activeTour.bankName || "MB Bank");
        setPayosClientId(activeTour.payosClientId || "");
        setPayosApiKey(activeTour.payosApiKey || "");
        setPayosChecksumKey(activeTour.payosChecksumKey || "");
        setPayosAutoApprove(activeTour.payosAutoApprove !== false);

        setIsEditing(true);
      }
    }
  }, [activeHistoryId, tournaments, editTourId]);

  // Real-time synchronization of status, workflowState and athletes list from active tournament
  useEffect(() => {
    if (activeHistoryId && editTourId === activeHistoryId) {
      const activeTour = tournaments.find(t => t.id === activeHistoryId);
      if (activeTour) {
        if (activeTour.status && activeTour.status !== status) {
          setStatus(activeTour.status);
        }
        if (activeTour.workflowState && activeTour.workflowState !== workflowState) {
          setWorkflowState(activeTour.workflowState);
        }

        // Only respond to REAL external database changes for athletes
        const dbAthletes = activeTour.athletes || [];
        const dbAthletesStr = JSON.stringify(getDeduplicatedAthletes(dbAthletes));
        const lastKnownDbAthletesStr = JSON.stringify(getDeduplicatedAthletes(dbAthletesRef.current || []));

        if (dbAthletesStr !== lastKnownDbAthletesStr) {
          // Update ref to the latest DB value
          dbAthletesRef.current = dbAthletes;

          // Check if the user has made local modifications
          // Using deduplicated lists for comparing state to prevent duplicate-triggered mismatches
          const deduplicatedLastLoaded = getDeduplicatedAthletes(lastLoadedAthletesRef.current || []);
          const hasLocalModifications = JSON.stringify(deduplicatedLastLoaded) !== JSON.stringify(athletesList);

          // Sync athletesList from DB in real-time if there are no local modifications,
          // to prevent background updates or local additions/removals from being instantly reverted.
          if (!hasLocalModifications) {
            const deduplicatedActiveTourAthletes = getDeduplicatedAthletes(dbAthletes);
            const currentAthletesStr = JSON.stringify(athletesList);
            if (JSON.stringify(deduplicatedActiveTourAthletes) !== currentAthletesStr) {
              setAthletesList(deduplicatedActiveTourAthletes);
              lastLoadedAthletesRef.current = deduplicatedActiveTourAthletes;
            }
          }
        }
      }
    }
  }, [activeHistoryId, tournaments, editTourId, status, workflowState, athletesList]);

  // Auto-cleanup pending registrations older than 24 hours in management mode
  useEffect(() => {
    if (!editTourId || !athletesList || athletesList.length === 0) return;

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
      console.log(`[Admin] Auto-cleaning ${removedCount} pending registrations older than 24 hours.`);
      
      // Update local state first to prevent flickering
      setAthletesList(toKeep);
      lastLoadedAthletesRef.current = toKeep;

      // Update Firestore
      tournamentRepository.updateTournament(
        editTourId,
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
  }, [editTourId, athletesList]);

  // Handle external Create trigger
  useEffect(() => {
    if (isCreateOpen) {
      handleOpenCreate();
    }
  }, [isCreateOpen]);

  // Subscribe to tournaments list in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = tournamentRepository.subscribeList([], (list) => {
      setTournaments(list);
      setLoading(false);
    }, (err) => {
      console.error("Realtime subscription failed:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Validation hook
  useEffect(() => {
    const errors: string[] = [];
    if (!tournamentName.trim()) errors.push("Tên giải đấu không được để trống");
    if (!season.trim()) errors.push("Mùa giải không được để trống");
    if (!organizer.trim()) errors.push("Đơn vị tổ chức không được để trống");
    if (!location.trim()) errors.push("Địa điểm thi đấu không được để trống");
    if (!startDate) errors.push("Yêu cầu ngày bắt đầu");
    if (!endDate) errors.push("Yêu cầu ngày kết thúc");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.push("Ngày bắt đầu không được lớn hơn ngày kết thúc");
    }

    if (tournamentFormat === "individual" || tournamentFormat === "mixed") {
      if (distances.length === 0) {
        errors.push("Bạn phải tạo ít nhất một cự ly cá nhân cho cấu hình");
      }
    }
    if (tournamentFormat === "mixed") {
      if (teamDistances.length === 0) {
        errors.push("Bạn phải tạo ít nhất một cự ly đồng đội cho cấu hình");
      }
    }

    setValidationErrors(errors);
  }, [tournamentName, season, organizer, location, startDate, endDate, tournamentFormat, distances, teamDistances]);

  // Track modification flags via comparison with the database activeTour
  const activeTour = useMemo(() => {
    return tournaments.find(t => t.id === (editTourId || activeHistoryId));
  }, [tournaments, editTourId, activeHistoryId]);

  const calculatedIsDirty = useMemo(() => {
    if (!activeTour) return false;
    if (!isEditing) return false;
    
    if (tournamentName !== (activeTour.tournamentName || "")) return true;
    if (season !== (activeTour.season || "VSC 2026")) return true;
    if (organizer !== (activeTour.organizer || "")) return true;
    if (location !== (activeTour.location || "")) return true;
    if (startDate !== (activeTour.startDate || "")) return true;
    if (endDate !== (activeTour.endDate || "")) return true;
    if (description !== (activeTour.description || "")) return true;
    if (logo !== (activeTour.logo || "")) return true;
    if (banner !== (activeTour.banner || "")) return true;
    if (prizePool !== (activeTour.prizePool || 0)) return true;
    if (tournamentFormat !== (activeTour.tournamentFormat || "individual")) return true;
    if (status !== (activeTour.status || "draft")) return true;
    if (workflowState !== (activeTour.workflowState || "draft")) return true;
    if (headReferee !== (activeTour.headReferee || "")) return true;
    if (JSON.stringify(assistantReferees) !== JSON.stringify(activeTour.assistantReferees || [])) return true;
    if (notes !== (activeTour.notes || "")) return true;
    if (JSON.stringify(distances) !== JSON.stringify(activeTour.distances || [])) return true;
    if (JSON.stringify(teamDistances) !== JSON.stringify(activeTour.teamDistances || [])) return true;
    if (shotsCount !== (activeTour.shotsCount || 10)) return true;
    if (teamShotsCount !== (activeTour.teamShotsCount || 10)) return true;
    if (directMaxShots !== (activeTour.directMaxShots || 10)) return true;
    if (teamDirectMaxShots !== (activeTour.teamDirectMaxShots || 10)) return true;
    if (directMaxPoints !== activeTour.directMaxPoints) return true;
    if (teamDirectMaxPoints !== activeTour.teamDirectMaxPoints) return true;
    if (laneCapacity !== (activeTour.laneCapacity || 10)) return true;
    if (JSON.stringify(athletesList) !== JSON.stringify(activeTour.athletes || [])) return true;
    if (JSON.stringify(teamsList) !== JSON.stringify(activeTour.teams || [])) return true;
    if (JSON.stringify(scheduleList) !== JSON.stringify(activeTour.schedule || [])) return true;
    if (prizeStructure !== (activeTour.prizeStructure || "")) return true;
    if (JSON.stringify(sponsorsList) !== JSON.stringify(activeTour.sponsors || [])) return true;
    
    // Check assignments
    if (JSON.stringify(generatedHeats) !== JSON.stringify(activeTour.commandCenterState?.heats || [])) return true;
    if (JSON.stringify(assignmentVersions) !== JSON.stringify(activeTour.commandCenterState?.assignmentVersions || [])) return true;
    if (assignmentStrategy !== (activeTour.commandCenterState?.assignmentStrategy || "random")) return true;
    if (assignmentStageId !== (activeTour.commandCenterState?.assignmentStageId || "")) return true;
    if (assignmentClubSeparation !== (activeTour.commandCenterState?.assignmentClubSeparation !== false)) return true;

    // Check payment fields
    if (registrationFee !== (activeTour.registrationFee !== undefined ? activeTour.registrationFee : 200000)) return true;
    if (bankAccountNumber !== (activeTour.bankAccountNumber || "0968210586")) return true;
    if (bankAccountName !== (activeTour.bankAccountName || "NGUYEN HUU HIEP")) return true;
    if (bankName !== (activeTour.bankName || "MB Bank")) return true;
    if (payosClientId !== (activeTour.payosClientId || "")) return true;
    if (payosApiKey !== (activeTour.payosApiKey || "")) return true;
    if (payosChecksumKey !== (activeTour.payosChecksumKey || "")) return true;
    if (payosAutoApprove !== (activeTour.payosAutoApprove !== false)) return true;

    return false;
  }, [
    activeTour, isEditing, tournamentName, season, organizer, location, startDate, endDate, description,
    logo, banner, prizePool, tournamentFormat, status, workflowState, headReferee, assistantReferees,
    notes, distances, teamDistances, shotsCount, teamShotsCount, directMaxShots,
    teamDirectMaxShots, directMaxPoints, teamDirectMaxPoints, laneCapacity, athletesList,
    teamsList, scheduleList, prizeStructure, sponsorsList, registrationFee, bankAccountNumber,
    bankAccountName, bankName, payosClientId, payosApiKey, payosChecksumKey, payosAutoApprove,
    generatedHeats, assignmentVersions, assignmentStrategy, assignmentStageId, assignmentClubSeparation
  ]);

  useEffect(() => {
    setIsDirty(calculatedIsDirty);
  }, [calculatedIsDirty]);

  // Periodic Auto-save effect (No-op to respect strict store-only requirements)
  useEffect(() => {
    setAutoSaveRecoveryAvailable(false);
  }, []);

  // Handle local draft recovery (Disabled to respect strict cloud-only requirements)
  const handleRecoverDraft = () => {
    return;
  };

  // Image uploader with ultra-compact compression for online cloud storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (target === "logo") {
        const compressed = await compressLogo(file);
        setLogo(compressed);
      } else {
        const compressed = await compressBanner(file);
        setBanner(compressed);
      }
      setIsDirty(true);
    } catch (err) {
      console.error("Lỗi nén ảnh giải đấu:", err);
    }
  };

  // Reset fields to default empty
  const handleOpenCreate = () => {
    setEditTourId(null);
    setTournamentName("");
    setSeason("VSC 2026");
    setOrganizer("Vietnam Slingshot Committee (VSC)");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setLogo("");
    setBanner("");
    setPrizePool(0);
    setTournamentFormat("individual");
    setStatus("registration");
    setWorkflowState("registration_open");
    setHeadReferee("");
    setAssistantReferees([]);
    setNotes("");
    setDistances([
      { id: `ind-d-${Date.now()}-1`, distance: "10 Met", multiplier: 10, isCumulative: true },
      { id: `ind-d-${Date.now()}-2`, distance: "15 Met", multiplier: 15, isCumulative: true }
    ]);
    setTeamDistances([
      { id: `tm-d-${Date.now()}-1`, distance: "10 Met (Đồng Đội)", multiplier: 10, isCumulative: true }
    ]);
    setShotsCount(10);
    setTeamShotsCount(10);
    setDirectMaxShots(10);
    setTeamDirectMaxShots(10);
    setDirectMaxPoints(undefined);
    setTeamDirectMaxPoints(undefined);
    setVersionHistory([]);

    // Payment init
    setRegistrationFee(200000);
    setBankAccountNumber("0968210586");
    setBankAccountName("NGUYEN HUU HIEP");
    setBankName("MB Bank");
    setPayosClientId("");
    setPayosApiKey("");
    setPayosChecksumKey("");
    setPayosAutoApprove(true);

    setLaneCapacity(10);
    setAthletesList([]);
    lastLoadedAthletesRef.current = [];
    setTeamsList([]);
    setScheduleList([]);
    setPrizeStructure("");
    setSponsorsList([]);
    setGeneratedHeats([]);
    setAssignmentVersions([]);
    setAssignmentStrategy("random");
    setAssignmentStageId("");
    setAssignmentClubSeparation(true);

    setActiveFormTab("overview");
    setIsEditing(true);
    setIsDirty(false);
    setLastAutoSaved(null);
    setAutoSaveRecoveryAvailable(false);
  };

  const handleOpenEdit = async (tour: TournamentV3) => {
    setEditTourId(tour.id);
    setTournamentName(tour.tournamentName);
    setSeason(tour.season);
    setOrganizer(tour.organizer);
    setLocation(tour.location);
    setStartDate(tour.startDate);
    setEndDate(tour.endDate);
    setDescription(tour.description);
    setLogo(tour.logo || "");
    setBanner(tour.banner || "");
    setPrizePool(tour.prizePool);
    setTournamentFormat(tour.tournamentFormat === "team" ? "mixed" : (tour.tournamentFormat || "individual"));
    setStatus(tour.status);
    setWorkflowState(tour.workflowState || TournamentWorkflowEngine.mapStatusToWorkflowState(tour.status));
    setHeadReferee(tour.headReferee);
    setAssistantReferees(tour.assistantReferees || []);
    setNotes(tour.notes || "");
    setDistances(tour.distances || []);
    setTeamDistances(tour.teamDistances || []);
    setShotsCount(tour.shotsCount || 10);
    setTeamShotsCount(tour.teamShotsCount || 10);
    setDirectMaxShots(tour.directMaxShots || 10);
    setTeamDirectMaxShots(tour.teamDirectMaxShots || 10);
    setDirectMaxPoints(tour.directMaxPoints);
    setTeamDirectMaxPoints(tour.teamDirectMaxPoints);
    setVersionHistory(tour.versionHistory || []);

    // Load payment fields
    setRegistrationFee(tour.registrationFee !== undefined ? tour.registrationFee : 200000);
    setBankAccountNumber(tour.bankAccountNumber || "0968210586");
    setBankAccountName(tour.bankAccountName || "NGUYEN HUU HIEP");
    setBankName(tour.bankName || "MB Bank");
    setPayosClientId(tour.payosClientId || "");
    setPayosApiKey(tour.payosApiKey || "");
    setPayosChecksumKey(tour.payosChecksumKey || "");
    setPayosAutoApprove(tour.payosAutoApprove !== false);

    setLaneCapacity(tour.laneCapacity || 10);
    setAthletesList(tour.athletes || []);
    lastLoadedAthletesRef.current = tour.athletes || [];
    setTeamsList(tour.teams || []);
    setScheduleList(tour.schedule || []);
    setPrizeStructure(tour.prizeStructure || "");
    setSponsorsList(tour.sponsors || []);
    
    // Load assignments from commandCenterState if available
    setGeneratedHeats(tour.commandCenterState?.heats || []);
    setAssignmentVersions(tour.commandCenterState?.assignmentVersions || []);
    setAssignmentStrategy(tour.commandCenterState?.assignmentStrategy || "random");
    setAssignmentStageId(tour.commandCenterState?.assignmentStageId || "");
    setAssignmentClubSeparation(tour.commandCenterState?.assignmentClubSeparation !== false);

    setActiveFormTab("overview");
    setIsEditing(true);
    setIsDirty(false);
    setLastAutoSaved(null);
    
    setAutoSaveRecoveryAvailable(false);
  };

  // Save changes manually
  const handleSave = async () => {
    if (validationErrors.length > 0) {
      alert(`Không thể lưu cấu hình do có lỗi xác thực sau đây:\n- ${validationErrors.join("\n- ")}`);
      return;
    }

    try {
      const currentTour = tournaments.find(t => t.id === editTourId);
      const existingCommandCenterState = currentTour?.commandCenterState || {};
      const updatedCommandCenterState = {
        ...existingCommandCenterState,
        heats: generatedHeats,
        assignmentVersions: assignmentVersions,
        assignmentStrategy: assignmentStrategy,
        assignmentStageId: assignmentStageId,
        assignmentClubSeparation: assignmentClubSeparation,
      };

      const metadataPayload = {
        tournamentName,
        season,
        organizer,
        location,
        startDate,
        endDate,
        description,
        logo,
        banner,
        prizePool,
        tournamentFormat,
        status: !editTourId ? "registration" : status,
        workflowState: !editTourId ? "registration_open" : workflowState,
        headReferee,
        assistantReferees,
        notes,
        distances,
        teamDistances,
        shotsCount,
        teamShotsCount,
        directMaxShots,
        teamDirectMaxShots,
        directMaxPoints,
        teamDirectMaxPoints,
        laneCapacity,
        athletes: athletesList,
        teams: teamsList,
        schedule: scheduleList,
        prizeStructure,
        sponsors: sponsorsList,
        registrationFee,
        bankAccountNumber,
        bankAccountName,
        bankName,
        payosClientId,
        payosApiKey,
        payosChecksumKey,
        payosAutoApprove,
        commandCenterState: !editTourId
          ? {
              ...updatedCommandCenterState,
              workflowStage: "registration",
              activeStep: 1,
              isPaused: false,
            }
          : updatedCommandCenterState
      };

      const userEmail = currentUser?.email || "unknown@vscs.asia";
      const userId = currentUser?.uid || "system";

      if (editTourId) {
        // Edit existing
        await tournamentRepository.updateTournament(
          editTourId,
          metadataPayload,
          userId,
          userEmail,
          role,
          "Hiệu chỉnh cấu hình",
          `Cập nhật toàn bộ thông tin giải đấu. Vòng bắn: ${distances.length} vòng.`
        );
        lastLoadedAthletesRef.current = athletesList;
      } else {
        // Create new - Default to Step 01 (Registration) & Đang Đăng Ký
        setStatus("registration");
        setWorkflowState("registration_open");
        await tournamentRepository.createTournament(
          metadataPayload,
          userId,
          userEmail,
          role
        );
      }

      setIsDirty(false);
      alert("Đã lưu thành công cấu hình giải đấu!");
      if (activeHistoryId) {
        // Keep inside the tournament workspace
      } else if (onExitCreate) {
        onExitCreate();
      } else {
        setIsEditing(false);
        setEditTourId(null);
      }
    } catch (e: any) {
      console.error("Save tournament failed:", e);
      alert(`Lỗi: Không thể lưu được cấu hình giải đấu. Chi tiết: ${e?.message || e}`);
    }
  };

  // Archive a tournament
  const handleArchive = async (id: string) => {
    if (!canUpdate) return;
    try {
      await tournamentRepository.updateTournament(
        id,
        { status: "archived" },
        currentUser?.uid || "system",
        currentUser?.email || "unknown@vscs.asia",
        role,
        "Lưu trữ giải đấu",
        "Chuyển trạng thái sang Lưu Trữ."
      );
    } catch (e) {
      console.error("Archive tournament failed:", e);
    }
  };

  // Duplicate tournament
  const handleDuplicate = async (tour: TournamentV3) => {
    if (!canCreate) return;
    try {
      const copyPayload = {
        ...tour,
        id: "", // clear to let repository assign new ID
        tournamentName: `${tour.tournamentName} (Bản sao)`,
        status: "draft" as const,
        createdAt: "",
        updatedAt: "",
        versionHistory: [
          {
            id: `hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.uid || "system",
            userEmail: currentUser?.email || "unknown@vscs.asia",
            action: "Khởi tạo bản sao",
            summary: `Nhân bản giải đấu từ gốc: ${tour.tournamentName}`
          }
        ]
      };
      await tournamentRepository.createTournament(
        copyPayload,
        currentUser?.uid || "system",
        currentUser?.email || "unknown@vscs.asia",
        role
      );
    } catch (e) {
      console.error("Duplicate tournament failed:", e);
    }
  };

  // Delete tournament
  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await tournamentRepository.delete(id, currentUser?.uid || "system", role);
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleteConfirmTourId(null);
    }
  };

  // Simulate payment completion and trigger instant registration status update
  const handleSimulatePaymentSuccess = async (vdv: any) => {
    setIsSimulatingPayment(true);
    setPaymentSimulationStep("scanning");
    
    // Simulate connection steps
    await new Promise(resolve => setTimeout(resolve, 800));
    setPaymentSimulationStep("verifying");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update state
    const updatedAthletes = athletesList.map(a => {
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
    
    setAthletesList(updatedAthletes);
    setPaymentSimulationStep("success");
    setIsSimulatingPayment(false);

    // Save to repository immediately if editTourId exists
    if (editTourId) {
      try {
        const currentTour = tournaments.find(t => t.id === editTourId);
        if (currentTour) {
          await tournamentRepository.updateTournament(
            editTourId,
            {
              ...currentTour,
              athletes: updatedAthletes
            },
            currentUser?.uid || "system",
            currentUser?.email || "unknown@vscs.asia",
            role,
            "Xác nhận thanh toán",
            `Thanh toán lệ phí thành công cho VĐV ${vdv.fullName || vdv.name} qua cổng PayOS.`
          );
        }
      } catch (err) {
        console.error("Lỗi khi lưu trạng thái thanh toán giải đấu:", err);
      }
    }
  };

  // Status mapping
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

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
      case "registration": return "bg-blue-50 text-blue-700 border-blue-200";
      case "ready": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "live": return "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse";
      case "completed": return "bg-amber-50 text-amber-700 border-amber-200";
      case "archived": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  // Get Previous Lifecycle State helper
  const getPrevLifecycleState = (current: string) => {
    switch (current) {
      case "registration":
        return { prev: "draft", label: "Bản Nháp" };
      case "ready":
        return { prev: "registration", label: "Đăng Ký" };
      case "live":
        return { prev: "ready", label: "Chuẩn Bị" };
      case "completed":
        return { prev: "live", label: "Trực Tiếp" };
      default:
        return null;
    }
  };

  // Get Next Lifecycle State helper
  const getNextLifecycleState = (current: string) => {
    switch (current) {
      case "draft":
        return { next: "registration", label: "Mở Đăng Ký", desc: "Mở cổng tiếp nhận hồ sơ đăng ký thi đấu của các VĐV." };
      case "registration":
        return { next: "ready", label: "Sẵn Sàng", desc: "Đóng đăng ký, chốt danh sách VĐV, bốc thăm phân làn bãi bắn." };
      case "ready":
        return { next: "live", label: "Bắt Đầu Giải", desc: "Kích hoạt chế độ thi đấu trực tiếp (Read-only)." };
      case "live":
        return { next: "completed", label: "Hoàn Thành", desc: "Kết thúc mọi lượt bắn, ghi nhận kết quả." };
      case "completed":
        return { next: "archived", label: "Lưu Trữ", desc: "Đóng giải đấu và chuyển vào lịch sử lưu trữ." };
      default:
        return null;
    }
  };

  const validatePrerequisitesForState = (targetState: string): string | null => {
    // If system_owner, bypass all constraints so they have full override control
    if (role === "system_owner" || role === "admin") {
      return null;
    }

    const checkedInCount = athletesList.filter(a => a.status === "checked_in").length;
    
    if (targetState === "live" || targetState === "ready") {
      if (checkedInCount === 0) {
        return "Vui lòng điểm danh ít nhất một vận động viên trước khi thiết lập bệ bắn hoặc bắt đầu giải đấu.";
      }
    }
    
    if (targetState === "live") {
      // Check if assignments are generated (meaning there's at least one heat saved or generated)
      const heatsExist = generatedHeats && generatedHeats.length > 0;
      if (!heatsExist) {
        return "Bệ bắn và Lượt bắn (Assignments) chưa được phát sinh hoặc chưa được áp dụng/lưu.";
      }
    }
    
    return null;
  };

  const handleLifecycleTransition = async (nextState: TournamentWorkflowState | null) => {
    if (!nextState) return;
    if (!editTourId || !canUpdate) {
      alert("⚠️ Bạn không có quyền chỉnh sửa hoặc chưa chọn giải đấu!");
      return;
    }
    
    const currentTour = tournaments.find(t => t.id === editTourId);
    const transitionError = TournamentWorkflowEngine.validateTransition(
      workflowState,
      nextState,
      role,
      {
        ...currentTour,
        athletes: athletesList,
        headReferee
      }
    );
    if (transitionError) {
      alert(`⚠️ Không thể chuyển trạng thái:\n${transitionError}`);
      return;
    }

    try {
      setWorkflowState(nextState);
      const legacyStatus = TournamentWorkflowEngine.mapWorkflowStateToStatus(nextState);
      setStatus(legacyStatus);
      
      const payload: Partial<TournamentV3> = { 
        status: legacyStatus,
        workflowState: nextState
      };

      // Create persistent snapshot when moving to live (Competition mode)
      if (nextState === "live") {
        payload.commandCenterState = {
          ...(currentTour?.commandCenterState || {}),
          snapshot: {
            timestamp: new Date().toISOString(),
            athletes: athletesList.map(a => ({
              id: a.id || a.participantId,
              vscNumber: a.vscNumber || "",
              fullName: a.fullName || a.name || "",
              dob: a.dob || "",
              gender: a.gender || "Nam",
              province: a.province || "",
              clubName: a.clubName || a.team || "Tự Do",
              bibNumber: a.bibNumber || "",
              competitionCategory: a.competitionCategory || "",
              notes: a.notes || "",
              metadata: a.metadata || ""
            })),
            rules: {
              distances,
              teamDistances,
              shotsCount,
              teamShotsCount,
              directMaxShots,
              teamDirectMaxShots,
              directMaxPoints,
              teamDirectMaxPoints,
              laneCapacity
            }
          }
        };
      }

      await tournamentRepository.updateTournament(
        editTourId,
        payload,
        currentUser?.uid || "system",
        currentUser?.email || "unknown@vscs.asia",
        role,
        "Chuyển trạng thái vòng đời V3",
        `Chuyển đổi trạng thái giải đấu từ [${WORKFLOW_STATE_METADATA[workflowState]?.label || workflowState}] sang [${WORKFLOW_STATE_METADATA[nextState]?.label || nextState}]`
      );
      
      setIsDirty(false);
      setShowTransitionModal(false);
      setTransitionTargetState(null);
      alert(`🎉 Đã chuyển đổi thành công trạng thái giải đấu sang: ${WORKFLOW_STATE_METADATA[nextState]?.label || nextState}!`);
    } catch (e: any) {
      console.error("Transition failed:", e);
      alert(`❌ Chuyển trạng thái thất bại: ${e?.message || e}`);
    }
  };

  // Filter tournaments list
  const filteredTournaments = tournaments.filter((tour) => {
    const matchesSearch = tour.tournamentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tour.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tour.season.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tour.status === statusFilter;
    const matchesFormat = formatFilter === "all" || tour.tournamentFormat === formatFilter;
    return matchesSearch && matchesStatus && matchesFormat;
  });

  // Sidebar Tabs Config (10 Unified Workspace Sections)
  const innerTabs = [
    { id: "overview", label: "Overview (Tổng quan)", icon: Trophy },
    { id: "tournament_config", label: "Tournament Configuration (Cấu hình)", icon: Sliders },
    { id: "participants", label: "Participants (VĐV đăng ký)", icon: Users },
    { id: "check_in", label: "Check-in (Điểm danh VĐV)", icon: ClipboardCheck },
    { id: "assignments", label: "Assignments (Bệ bắn & Heats)", icon: Layers },
    { id: "referees", label: "Referees (Ban trọng tài)", icon: UserCheck },
    { id: "competition", label: "Competition (Thi đấu)", icon: Target },
    { id: "ranking", label: "Ranking (Bảng xếp hạng)", icon: Award },
    { id: "statistics", label: "Statistics (Thống kê)", icon: BarChart2 },
    { id: "audit_history", label: "Audit History (Nhật ký)", icon: History }
  ] as const;

  // Dynamic payment description for activePaymentVdv
  const activePaymentInfo = useMemo(() => {
    if (!activePaymentVdv) return "";
    const athleteVscId = (activePaymentVdv.vscNumber || activePaymentVdv.id || "VSC-TEMP").trim().toUpperCase();
    const tourId = (editTourId || activeHistoryId || "TEMP_TOUR").trim().toUpperCase();
    return `${athleteVscId} REG ${tourId}`.trim().toUpperCase();
  }, [activePaymentVdv, editTourId, activeHistoryId]);

  return (
    <div className="w-full text-left font-sans">
      {!isEditing ? (
        // LIST OF TOURNAMENTS SCREEN
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <span>QUẢN LÝ CẤU HÌNH GIẢI ĐẤU</span>
              </h1>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                Thiết lập quy chế thi đấu độc lập, sơ đồ làn, thông tin trọng tài và danh sách vận động viên.
              </p>
            </div>

            {canCreate && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
                id="create-tournament-btn"
              >
                <Plus className="w-4 h-4" />
                <span>TẠO GIẢI ĐẤU MỚI</span>
              </button>
            )}
          </div>

          {/* Quick Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, địa điểm, mùa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full h-10 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                <option value="all">Tất cả trạng thái giải đấu</option>
                <option value="draft">Bản nháp (Draft)</option>
                <option value="registration">Đăng ký (Registration)</option>
                <option value="ready">Sẵn sàng (Ready)</option>
                <option value="live">Trực tiếp (Live)</option>
                <option value="completed">Hoàn thành (Completed)</option>
                <option value="archived">Lưu trữ (Archived)</option>
              </select>
            </div>

            <div>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                <option value="all">Tất cả thể thức thi đấu</option>
                <option value="individual">Cá Nhân (Individual Only)</option>
                <option value="mixed">Cá Nhân & Đồng Đội (Combined)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold text-slate-500">Đang tải danh sách giải đấu...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-slate-350 mb-3" />
              <p className="text-sm font-extrabold text-slate-700">Không tìm thấy giải đấu nào phù hợp</p>
              <p className="text-xs text-slate-450 mt-1">Hãy khởi tạo giải đấu mới để bắt đầu quy trình tổ chức.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredTournaments.map((tour) => (
                <div 
                  key={tour.id}
                  className="relative w-full flex flex-col rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 group font-sans justify-between min-h-[440px]"
                >
                  {/* Banner area: exactly 1/4 (25%) of the card height */}
                  <div className="relative h-[110px] w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-850 shrink-0">
                    {tour.banner ? (
                      <img 
                        src={tour.banner} 
                        alt={tour.tournamentName} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center opacity-95 transition-transform duration-500 group-hover:scale-105">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent)] opacity-60"></div>
                        <VSCLogo size={36} />
                      </div>
                    )}

                    {/* Floating Status Badge top-left */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2.5 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-850/60 rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${tour.status === "live" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                      <span className="text-slate-700 dark:text-slate-300">{getStatusLabel(tour.status)}</span>
                    </div>

                    {/* Floating Format Badge top-right */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs">
                      <span>
                        {tour.tournamentFormat === "mixed" 
                          ? "Thi Cá Nhân & Đồng Đội" 
                          : "Thi Cá Nhân"}
                      </span>
                    </div>
                  </div>

                  {/* Info Area with centered overlapping Logo */}
                  <div className="p-5 pt-0 flex flex-col justify-between flex-grow relative z-10 text-center">
                    {/* Overlapping Round Logo - scaled and aligned like the homepage */}
                    <div className="relative -mt-12 mb-3 mx-auto z-20 w-20 h-20 rounded-full bg-white dark:bg-slate-900 p-1 shadow-lg border-4 border-white dark:border-slate-900 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 shrink-0">
                      {tour.logo ? (
                        <img 
                          src={tour.logo} 
                          alt="Logo" 
                          className="w-full h-full rounded-full object-contain bg-white" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center p-1">
                          <VSCLogo size={32} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 flex-grow flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-center">
                          <span className="text-[9px] font-mono font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {tour.season}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tour.tournamentName}
                        </h3>

                        <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px] px-1">
                          {tour.description || "Chưa có mô tả chi tiết."}
                        </p>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-350 font-semibold text-left max-w-[210px] mx-auto w-full pt-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate" title={tour.location}>{tour.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{tour.startDate} ➔ {tour.endDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom controls & entry buttons */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <>
                            <button
                              onClick={() => {
                                if (onSelectTournament) {
                                  onSelectTournament(tour.id, tour);
                                } else {
                                  handleOpenEdit(tour);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Sửa cấu hình & thông tin giải đấu"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(tour)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Nhân bản cấu hình giải đấu"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirmTourId(tour.id)}
                            className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xóa giải đấu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (onSelectTournament) {
                            onSelectTournament(tour.id, tour);
                          } else {
                            handleOpenEdit(tour);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 hover:text-indigo-600 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // EDITING / DETAIL WORKSPACE SCREEN (SILEBAR MODE FOR 13 SECTIONS)
        <div className="space-y-6 animate-fadeIn text-slate-900 dark:text-white">
          
          {/* Breadcrumbs / Top nav */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase font-mono">
                {!activeHistoryId ? (
                  <span className="hover:text-indigo-600 cursor-pointer" onClick={() => {
                    if (onExitCreate) {
                      onExitCreate();
                    } else {
                      setIsEditing(false);
                    }
                  }}>DANH SÁCH GIẢI</span>
                ) : (
                  <span>DANH SÁCH GIẢI</span>
                )}
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 dark:text-slate-400">TOURNAMENT WORKSPACE</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-indigo-600">{editTourId ? "CHI TIẾT & SỬA" : "TẠO MỚI"}</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">
                {tournamentName || "Thiết lập giải đấu mới"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {!activeHistoryId && (
                <button
                  onClick={() => {
                    if (isDirty) {
                      setShowUnsavedWarning(true);
                    } else {
                      if (onExitCreate) {
                        onExitCreate();
                      } else {
                        setIsEditing(false);
                        setEditTourId(null);
                      }
                    }
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Thoát Workspace
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={validationErrors.length > 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu toàn bộ Workspace</span>
              </button>
            </div>
          </div>

          {/* Unsaved Changes Banner */}
          {isDirty && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-850 dark:text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Có cấu hình chưa được lưu. Hệ thống sẽ tự động đồng bộ hóa.</span>
              </div>
              <div className="flex items-center gap-2">
                {lastAutoSaved && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-mono">Lưu nháp: {lastAutoSaved}</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={validationErrors.length > 0}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Lưu Ngay
                </button>
              </div>
            </div>
          )}

          {/* Recovery Notification */}
          {autoSaveRecoveryAvailable && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 text-indigo-850 dark:text-indigo-400 text-xs font-semibold">
                <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Có bản lưu tự động nháp gần nhất chưa khôi phục.</span>
              </div>
              <button
                onClick={handleRecoverDraft}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Khôi phục bản nháp
              </button>
            </div>
          )}

          {/* Validation Warnings List */}
          {validationErrors.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 animate-fadeIn">
              <h3 className="text-rose-800 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>LỖI CẤU HÌNH CẦN KHẮC PHỤC TRƯỚC KHI LƯU:</span>
              </h3>
              <ul className="list-disc list-inside mt-2 text-xs text-rose-700 dark:text-rose-350 space-y-1 pl-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* WORKSPACE BENTO SIDEBAR LAYOUT */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col gap-1 shrink-0 h-fit">
              <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl mb-3">
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest block font-mono">Workspace Space</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 block truncate">{tournamentName || "Thiết lập mới"}</span>
              </div>

              {innerTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeFormTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      // Cannot move to "Assignments" or "Competition" without checking in participants (at least one checked_in participant)
                      if (tab.id === "assignments" || tab.id === "competition") {
                        const checkedInCount = athletesList.filter(a => a.status === "checked_in").length;
                        if (checkedInCount === 0 && role !== "system_owner" && role !== "admin") {
                          alert("⚠️ Không thể chuyển sang bốc thăm phân bệ (Assignments) hoặc thi đấu vì chưa có vận động viên nào được điểm danh (Checked In) trong hệ thống! Vui lòng điểm danh ít nhất một vận động viên tại tab Check-in.");
                          return;
                        }
                      }
                      setActiveFormTab(tab.id as any);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isActive 
                        ? "bg-indigo-600 text-white shadow-md font-extrabold ring-1 ring-indigo-400/50"
                        : "text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <TabIcon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* Simplified Status Display Widget in Sidebar */}
              {editTourId && (
                <div className="mt-4 border-t border-slate-150 dark:border-slate-800 pt-3 text-[10px] space-y-2">
                  <span className="font-bold text-slate-400 block uppercase font-mono tracking-wider">Trạng thái giải đấu</span>
                  <div className={`px-2.5 py-1.5 rounded-lg text-center font-bold border ${getStatusBadgeClass(status)}`}>
                    {getStatusLabel(status).toUpperCase()}
                  </div>
                  <p className="text-[9px] text-slate-450 dark:text-slate-400 leading-normal text-center mt-1">
                    Trạng thái giải đấu được điều hành & đồng bộ tự động thông qua <strong>Mission Control (Tác Chiến)</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              
              {/* TAB 1: OVERVIEW */}
              {activeFormTab === "overview" && (
                <OverviewTab
                  tournamentFormat={tournamentFormat}
                  distances={distances}
                  teamDistances={teamDistances}
                  athletesList={athletesList}
                  prizePool={prizePool}
                  headReferee={headReferee}
                  sponsorsList={sponsorsList}
                  status={status}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getStatusLabel={getStatusLabel}
                  globalMasterAthletes={globalMasterAthletes}
                />
              )}

              {/* TAB 2: TOURNAMENT CONFIGURATION (GENERAL + RULE ENGINE) */}
              {activeFormTab === "tournament_config" && (
                <TournamentConfigTab
                  canUpdate={canUpdate}
                  tournamentName={tournamentName}
                  setTournamentName={setTournamentName}
                  season={season}
                  setSeason={setSeason}
                  availableSeasons={availableSeasons}
                  organizer={organizer}
                  setOrganizer={setOrganizer}
                  location={location}
                  setLocation={setLocation}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  description={description}
                  setDescription={setDescription}
                  tournamentFormat={tournamentFormat}
                  setTournamentFormat={setTournamentFormat}
                  logo={logo}
                  banner={banner}
                  handleImageUpload={handleImageUpload}
                  registrationFee={registrationFee}
                  setRegistrationFee={setRegistrationFee}
                  bankName={bankName}
                  setBankName={setBankName}
                  bankAccountNumber={bankAccountNumber}
                  setBankAccountNumber={setBankAccountNumber}
                  bankAccountName={bankAccountName}
                  setBankAccountName={setBankAccountName}
                  payosClientId={payosClientId}
                  setPayosClientId={setPayosClientId}
                  payosApiKey={payosApiKey}
                  setPayosApiKey={setPayosApiKey}
                  payosChecksumKey={payosChecksumKey}
                  setPayosChecksumKey={setPayosChecksumKey}
                  payosAutoApprove={payosAutoApprove}
                  setPayosAutoApprove={setPayosAutoApprove}
                  configSubTab={configSubTab}
                  setConfigSubTab={setConfigSubTab}
                  distances={distances}
                  setDistances={setDistances}
                  shotsCount={shotsCount}
                  setShotsCount={setShotsCount}
                  directMaxShots={directMaxShots}
                  setDirectMaxShots={setDirectMaxShots}
                  directMaxPoints={directMaxPoints}
                  setDirectMaxPoints={setDirectMaxPoints}
                  teamDistances={teamDistances}
                  setTeamDistances={setTeamDistances}
                  teamShotsCount={teamShotsCount}
                  setTeamShotsCount={setTeamShotsCount}
                  teamDirectMaxShots={teamDirectMaxShots}
                  setTeamDirectMaxShots={setTeamDirectMaxShots}
                  teamDirectMaxPoints={teamDirectMaxPoints}
                  setTeamDirectMaxPoints={setTeamDirectMaxPoints}
                />
              )}

              {/* TAB 4: PARTICIPANTS (SNAPSHOT OF REGISTERED ATHLETES) */}
              {activeFormTab === "participants" && (
                <ParticipantsTab
                  status={status}
                  isParticipantListUnlockedManually={isParticipantListUnlockedManually}
                  setIsParticipantListUnlockedManually={setIsParticipantListUnlockedManually}
                  role={role}
                  canUpdate={canUpdate}
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
                  athletesList={athletesList}
                  setAthletesList={setAthletesList}
                  registrationFee={registrationFee}
                  setEditingParticipant={setEditingParticipant}
                  setDeleteConfirmAthleteTournament={setDeleteConfirmAthleteTournament}
                  setActivePaymentVdv={setActivePaymentVdv}
                  setPaymentSimulationStep={(val: any) => setPaymentSimulationStep(val)}
                  getStatusLabel={getStatusLabel}
                />
              )}

              {/* TAB 5: CHECK-IN & PARTICIPANT LIFECYCLE */}
              {activeFormTab === "check_in" && (
                <CheckInTab
                  athletesList={athletesList}
                  setAthletesList={setAthletesList}
                  registrationFee={registrationFee}
                  setActivePaymentVdv={setActivePaymentVdv}
                  setPaymentSimulationStep={(val: any) => setPaymentSimulationStep(val)}
                  canUpdate={canUpdate}
                  globalMasterAthletes={globalMasterAthletes}
                />
              )}

              {/* TAB 6: ASSIGNMENTS (PHÂN BỆ BẮN & HEATS) */}
              {activeFormTab === "assignments" && (
                <AssignmentsTab
                  assignmentMode={assignmentMode}
                  setAssignmentMode={setAssignmentMode}
                  assignmentStageId={assignmentStageId}
                  setAssignmentStageId={setAssignmentStageId}
                  distances={distances}
                  teamDistances={teamDistances}
                  isSelectedStageFirstStage={isSelectedStageFirstStage}
                  assignmentStrategy={assignmentStrategy}
                  setAssignmentStrategy={setAssignmentStrategy}
                  globalMasterAthletes={globalMasterAthletes}
                  laneCapacity={laneCapacity}
                  setLaneCapacity={setLaneCapacity}
                  assignmentClubSeparation={assignmentClubSeparation}
                  setAssignmentClubSeparation={setAssignmentClubSeparation}
                  editingVersionId={editingVersionId}
                  setEditingVersionId={setEditingVersionId}
                  canUpdate={canUpdate}
                  athletesList={athletesList}
                  assignmentVersions={assignmentVersions}
                  setAssignmentVersions={setAssignmentVersions}
                  setGeneratedHeats={setGeneratedHeats}
                  setIsDirty={setIsDirty}
                  triggerAutoSaveAssignments={triggerAutoSaveAssignments}
                  teamAssignmentMode={teamAssignmentMode}
                  setTeamAssignmentMode={setTeamAssignmentMode}
                  teamShuffleTeams={teamShuffleTeams}
                  setTeamShuffleTeams={setTeamShuffleTeams}
                  editTourId={editTourId}
                  sortedAssignmentVersions={sortedAssignmentVersions}
                  expandedVersionIds={expandedVersionIds}
                  setExpandedVersionIds={setExpandedVersionIds}
                  generatedHeats={generatedHeats}
                />
              )}

              {/* TAB 7: REFEREES MANAGER */}
              {activeFormTab === "referees" && (
                <RefereesTab
                  canUpdate={canUpdate}
                  headReferee={headReferee}
                  setHeadReferee={setHeadReferee}
                  assistantReferees={assistantReferees}
                  setAssistantReferees={setAssistantReferees}
                  newAssistant={newAssistant}
                  setNewAssistant={setNewAssistant}
                />
              )}

              {/* TAB 8: COMPETITION COCKPIT */}
              {activeFormTab === "competition" && (
                <CompetitionTab
                  laneCapacity={laneCapacity}
                  generatedHeats={generatedHeats}
                  athletesList={athletesList}
                  globalMasterAthletes={globalMasterAthletes}
                />
              )}

              {/* TAB 9: RANKING (BẢNG XẾP HẠNG GIẢI) */}
              {activeFormTab === "ranking" && (
                <RankingTab athletesList={athletesList} globalMasterAthletes={globalMasterAthletes} />
              )}

              {/* TAB 10: STATISTICS */}
              {activeFormTab === "statistics" && (
                <StatisticsTab
                  athletesList={athletesList}
                  distances={distances}
                />
              )}

              {/* TAB 13: AUDIT HISTORY */}
              {activeFormTab === "audit_history" && (
                <AuditHistoryTab versionHistory={versionHistory} />
              )}



              {/* MODAL 2: CUSTOM ATHLETES SORTING */}
              <AnimatePresence>
                {showCustomSortModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full relative max-h-[85vh] flex flex-col"
                    >
                      <button
                        type="button"
                        onClick={() => setShowCustomSortModal(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 mb-2 text-left">
                        <Sliders className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Sắp Xếp Thứ Tự Vận Động Viên (Custom Sort)</h3>
                      </div>
                      <p className="text-[11px] text-slate-450 mb-4 leading-relaxed text-left">
                        Thao tác này thay đổi vị trí của các VĐV trong danh sách đăng ký. Hãy dùng các nút di chuyển hoặc phím tắt để tinh chỉnh. Khi chia bệ bắn và lượt đấu, sơ đồ phân bổ bệ bắn sẽ ưu tiên tuân thủ chuẩn xác theo thứ tự sắp xếp thủ công này.
                      </p>

                      <div className="flex-1 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-2xl divide-y divide-slate-150 dark:divide-slate-800 max-h-[45vh] bg-slate-50/50 dark:bg-slate-950/20">
                        {customSortedAthletes.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                            Không có vận động viên nào trong danh sách để sắp xếp.
                          </div>
                        ) : (
                          customSortedAthletes.map((vdv, index) => (
                            <div key={`${vdv.id || vdv.participantId || 'vdv'}-${index}`} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition gap-4">
                              <div className="flex items-center gap-3 text-left">
                                <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">
                                  {index + 1}
                                </span>
                                <img 
                                  src={resolveAthleteAvatar(vdv)} 
                                  alt="Avatar" 
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <div className="font-extrabold text-slate-900 dark:text-white text-xs">{vdv.fullName || vdv.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                      (vdv.status === "checked_in" || vdv.checkInStatus === "checked_in")
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/10 dark:text-amber-400"
                                    }`}>
                                      {(vdv.status === "checked_in" || vdv.checkInStatus === "checked_in") ? "✓ Đã Điểm Danh" : "Chưa Điểm Danh"}
                                    </span>
                                    <span className="text-[9.5px] text-slate-400 font-mono">
                                      BIB: {vdv.bibNumber || "N/A"} | CLB: {vdv.clubName || vdv.team || "Tự Do"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...customSortedAthletes];
                                    if (index > 0) {
                                      [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
                                      setCustomSortedAthletes(newList);
                                    }
                                  }}
                                  disabled={index === 0}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  title="Di chuyển lên"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...customSortedAthletes];
                                    if (index < newList.length - 1) {
                                      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                                      setCustomSortedAthletes(newList);
                                    }
                                  }}
                                  disabled={index === customSortedAthletes.length - 1}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  title="Di chuyển xuống"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...customSortedAthletes];
                                    const item = newList.splice(index, 1)[0];
                                    newList.unshift(item);
                                    setCustomSortedAthletes(newList);
                                  }}
                                  disabled={index === 0}
                                  className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 text-[10px] text-slate-600 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-30"
                                >
                                  Lên Đầu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...customSortedAthletes];
                                    const item = newList.splice(index, 1)[0];
                                    newList.push(item);
                                    setCustomSortedAthletes(newList);
                                  }}
                                  disabled={index === customSortedAthletes.length - 1}
                                  className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 text-[10px] text-slate-600 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-30"
                                >
                                  Xuống Cuối
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-150 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Tổng cộng: {customSortedAthletes.length} vận động viên</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCustomSortModal(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAthletesList(customSortedAthletes);
                              setIsDirty(true);
                              setShowCustomSortModal(false);
                            }}
                            className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
                          >
                            Áp Dụng Thứ Tự
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* MODAL 3: PARTICIPANT DETAILED EDIT FORM */}
              {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                  {editingParticipant && editFields && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-xl w-full relative max-h-[85vh] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingParticipant(null);
                          setEditFields(null);
                        }}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2 mb-4 text-left">
                        <Edit3 className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Cập Nhật Thông Tin Vận Động Viên</h3>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên VĐV *</label>
                            <input
                              type="text"
                              value={editFields.fullName}
                              onChange={(e) => setEditFields({ ...editFields, fullName: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. Nguyễn Văn A"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Số BIB (Báo danh) *</label>
                            <input
                              type="text"
                              value={editFields.bibNumber}
                              onChange={(e) => setEditFields({ ...editFields, bibNumber: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. BIB-101"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Số thẻ VSC (Hội viên)</label>
                            <input
                              type="text"
                              value={editFields.vscNumber}
                              onChange={(e) => setEditFields({ ...editFields, vscNumber: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. VSC-1234"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Ngày sinh (DOB)</label>
                            <input
                              type="date"
                              value={editFields.dob}
                              onChange={(e) => setEditFields({ ...editFields, dob: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Giới tính</label>
                            <select
                              value={editFields.gender}
                              onChange={(e) => setEditFields({ ...editFields, gender: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                              <option value="Khác">Khác</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tỉnh Thành</label>
                            <input
                              type="text"
                              value={editFields.province}
                              onChange={(e) => setEditFields({ ...editFields, province: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. Hà Nội"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Câu Lạc Bộ (CLB)</label>
                            <input
                              type="text"
                              value={editFields.clubName}
                              onChange={(e) => setEditFields({ ...editFields, clubName: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. CLB Hà Nội"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Hạng Mục Thi Đấu</label>
                            <select
                              value={editFields.competitionCategory}
                              onChange={(e) => setEditFields({ ...editFields, competitionCategory: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            >
                              {COMPETITION_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng Thái Điểm Danh VĐV</label>
                            <select
                              value={editFields.status}
                              onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
                              className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            >
                              <option value="registered">Chờ Báo Danh (Registered)</option>
                              <option value="checked_in">✓ Đã Điểm Danh (Checked In)</option>
                              <option value="dns">⚠ DNS (Vắng Mặt)</option>
                              <option value="withdrawn">✘ Rút Lui (Withdrawn)</option>
                              <option value="dq">✖ Bị Loại (DQ / Disqualified)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1 justify-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 rounded-xl text-xs font-bold">
                              <input
                                type="checkbox"
                                checked={editFields.isPrimaryTeam || false}
                                onChange={(e) => setEditFields({ ...editFields, isPrimaryTeam: e.target.checked })}
                                className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-950 dark:text-white">Thành viên Bắn Chính</span>
                                <span className="text-[9px] text-slate-400 font-normal">Tính điểm đồng đội</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú vận động viên</label>
                          <textarea
                            value={editFields.notes}
                            onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                            className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
                            placeholder="Ghi chú về VĐV..."
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Siêu Dữ Liệu Tùy Biến (JSON Metadata)</label>
                          <textarea
                            value={editFields.metadata}
                            onChange={(e) => setEditFields({ ...editFields, metadata: e.target.value })}
                            className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 dark:text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
                            placeholder='{"weight": 70, "equipment": "custom slingshot"}'
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-150 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParticipant(null);
                            setEditFields(null);
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = athletesList.map(a => {
                              if (a.id === editFields.id || (a.participantId && editFields.participantId && a.participantId === editFields.participantId)) {
                                return {
                                  ...a,
                                  vscNumber: editFields.vscNumber,
                                  bibNumber: editFields.bibNumber,
                                  fullName: editFields.fullName,
                                  name: editFields.fullName,
                                  dob: editFields.dob,
                                  gender: editFields.gender,
                                  province: editFields.province,
                                  clubName: editFields.clubName,
                                  team: editFields.clubName,
                                  competitionCategory: editFields.competitionCategory,
                                  isPrimaryTeam: editFields.isPrimaryTeam ?? false,
                                  notes: editFields.notes,
                                  metadata: editFields.metadata,
                                  status: editFields.status,
                                  checkInStatus: editFields.status === "checked_in" ? "checked_in" : "pending"
                                };
                              }
                              return a;
                            });
                            setAthletesList(updated);
                            setIsDirty(true);
                            setEditingParticipant(null);
                            setEditFields(null);
                          }}
                          className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
                        >
                          Lưu Thay Đổi
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

              {/* MODAL: DELETE ATHLETE FROM TOURNAMENT CONFIRMATION */}
              {deleteConfirmAthleteTournament && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4 my-auto">
                    <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Trash2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
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
                          setAthletesList(athletesList.filter(v => v.id !== targetId && v.participantId !== targetId));
                          setIsDirty(true);
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
          </div>
        </div>
      )}

      {/* Delete Tournament Confirmation Modal */}
      {deleteConfirmTourId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4 scale-in">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Xác Nhận Xóa Giải Đấu?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn cấu hình giải đấu{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  "{tournaments.find(t => t.id === deleteConfirmTourId)?.tournamentName || "giải đấu này"}"
                </strong>{" "}
                không? Thao tác không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTourId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmTourId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm shadow-rose-600/10"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div>
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
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
                      >
                        Hoàn tất & Đóng cổng
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left Panel: Payment details */}
                    <div className="space-y-4">
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
                          * Nút này mô phỏng hành vi Ngân hàng MB Bank đẩy tín hiệu Biến động số dư về Webhook PayOS.vn để tự động cập nhật VĐV mà không cần nạp tiền thật.
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
    </div>
  );
};
