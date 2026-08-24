import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Trophy, 
  LayoutDashboard, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  Video, 
  Trash2, 
  UserPlus, 
  Plus, 
  Search, 
  ArrowRight, 
  Lock, 
  Unlock, 
  FileText, 
  Check, 
  RotateCcw, 
  HelpCircle,
  Eye,
  Sliders,
  Calendar,
  Grid,
  Users,
  User,
  Flag,
  UserCheck,
  Award,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Square,
  SlidersHorizontal,
  Edit3,
  Target,
  Settings,
  Tv,
  X
} from "lucide-react";
import { TournamentData, updateOnlineTournament, subscribeToVscSystemAthletes, subscribeToVscSystemClubs } from "../lib/firebaseService";
import { Athlete, DistanceConfig, HeatV3, OfficialResult, TournamentParticipantV3 } from "../types";
import { getCleanVscNumber, getCleanBibNumber, isAthleteEliminated, isAthleteEliminatedInPrevStage, isNoTeam } from "../utils/athleteUtils";
import { WorkflowEngine } from "../engines/workflowEngine";
import { AssignmentEngine } from "../engines/assignmentEngine";
import { RankingEngine, RankedAthleteOutput, getSoloRoundsFromDist } from "../engines/rankingEngine";
import { QualificationEngine, QualificationResult } from "../engines/qualificationEngine";
import { ScoreValidationEngine } from "../engines/scoreValidationEngine";
import { OfficialResultEngine } from "../engines/officialResultEngine";
import { usePermission } from "../providers/PermissionProvider";
import { useToast } from "../providers/ToastProvider";
import { getDeduplicatedAthletes } from "./TournamentManagement";
import { GlobalTimerState } from "../hooks/useGlobalTimer";
import { RegistrationStage } from "./command-center/RegistrationStage";
import { CheckInStage } from "./command-center/CheckInStage";
import { CompetitionStage } from "./command-center/CompetitionStage";
import { SummaryPublishStage } from "./command-center/SummaryPublishStage";
import { WorkflowBanners } from "./command-center/WorkflowBanners";
import { LiveOperationPanels } from "./command-center/LiveOperationPanels";
import { QuickScoreModal } from "./command-center/QuickScoreModal";
import { EditAthleteModal } from "./command-center/EditAthleteModal";

interface TournamentCommandCenterProps {
  activeHistoryId: string | null;
  matchName: string;
  distances: DistanceConfig[];
  teamDistances?: DistanceConfig[];
  athletes: Athlete[];
  setAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  teamAthletes: Athlete[];
  setTeamAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  competitionMode: "individual" | "team";
  setCompetitionMode?: React.Dispatch<React.SetStateAction<"individual" | "team" >>;
  userRole: string;
  currentUser: any;
  currentTournamentDoc: TournamentData | null;
  commandCenterState?: any;
  setCommandCenterState?: React.Dispatch<React.SetStateAction<any>>;
  onResetAthleteScore?: (athleteId: string, distanceId: string) => void;
  globalTimer?: GlobalTimerState;
  canControlTimer?: boolean;
  onOpenTimer?: () => void;
  onOpenLiveBoard?: () => void;
  leaderboardAthletes?: Athlete[];
  leaderboardTeamAthletes?: Athlete[];
}

import {
  TimelineStage,
  CommandCenterState,
  useCommandCenterState
} from "../hooks/useCommandCenterState";

export type { TimelineStage, CommandCenterState };

const isInactive = (ath: any): boolean => {
  if (!ath) return false;
  const s = (ath.status || "").toLowerCase().trim();
  return s === "bỏ thi" || s === "dns" || s === "withdrawn" || s === "dq" || s === "disqualified";
};

// Helper to safely parse scores stored in Firestore (which can be a sparse array or serialized as a map/object)
const normalizeScoresToArr = (rawScores: any, length: number): any[] => {
  if (!rawScores) return Array(length).fill(null);
  if (Array.isArray(rawScores)) {
    const arr = [...rawScores];
    while (arr.length < length) arr.push(null);
    return arr.slice(0, length);
  }
  if (typeof rawScores === 'object') {
    const arr = Array(length).fill(null);
    Object.entries(rawScores).forEach(([key, val]) => {
      const idx = Number(key);
      if (!isNaN(idx) && idx >= 0 && idx < length) {
        arr[idx] = val;
      }
    });
    return arr;
  }
  return Array(length).fill(null);
};

const getSoloIdxForHeatHelper = (heatNumber: number): number => {
  if (!heatNumber) return 0;
  let sri = 1;
  if (heatNumber > 10000) {
    const base = Math.floor(heatNumber / 100);
    sri = base % 100;
  } else {
    sri = heatNumber % 100;
  }
  const idx = sri - 1;
  return idx >= 0 ? idx : 0;
};

const formatDistanceString = (distStr: string | undefined): string => {
  if (!distStr) return "";
  const s = distStr.trim();
  const lower = s.toLowerCase();
  if (lower.endsWith("m") || lower.endsWith("met") || lower.endsWith("mét") || lower.endsWith("meter") || lower.endsWith("meters")) {
    return s;
  }
  return `${s}m`;
};

export const TournamentCommandCenter: React.FC<TournamentCommandCenterProps> = ({
  activeHistoryId,
  matchName,
  distances,
  teamDistances,
  athletes,
  setAthletes,
  teamAthletes,
  setTeamAthletes,
  competitionMode,
  setCompetitionMode,
  userRole,
  currentUser,
  currentTournamentDoc,
  commandCenterState,
  setCommandCenterState,
  onResetAthleteScore,
  globalTimer,
  canControlTimer = true,
  onOpenTimer,
  onOpenLiveBoard,
  leaderboardAthletes,
  leaderboardTeamAthletes
}) => {
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const operatorName = currentUser?.email || "Ban Tổ Chức";
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const syncAthletesToCloud = useCallback(async (updatedList: Athlete[]) => {
    setAthletes(updatedList);
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      try {
        await updateOnlineTournament(activeHistoryId, { athletes: updatedList });
      } catch (err) {
        console.error("Cloud synchronization failed for athletes:", err);
      }
    }
  }, [activeHistoryId, setAthletes]);

  const syncTeamAthletesToCloud = useCallback(async (updatedList: Athlete[]) => {
    setTeamAthletes(updatedList);
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      try {
        await updateOnlineTournament(activeHistoryId, { teamAthletes: updatedList });
      } catch (err) {
        console.error("Cloud synchronization failed for team athletes:", err);
      }
    }
  }, [activeHistoryId, setTeamAthletes]);

  const activeSetterAndCloud = useCallback(async (updatedList: Athlete[], isDeletion = false) => {
    if (isDeletion) {
      await syncAthletesToCloud(updatedList);
      if (competitionMode === "team" || (currentTournamentDoc && currentTournamentDoc.tournamentFormat === "mixed")) {
        await syncTeamAthletesToCloud(updatedList);
      }
      return;
    }

    // Merge updatedList back into the global athletes/teamAthletes list to prevent accidental deletions of athletes
    // who are not currently active in activeAthletesList (e.g. those eliminated in prior stages)
    const currentGlobalAthletes = athletes || [];
    const mergedAthletes = currentGlobalAthletes.map(globalAth => {
      const updatedAth = updatedList.find(ua => ua && (ua.id === globalAth.id || ua.participantId === globalAth.id));
      if (updatedAth) {
        return updatedAth;
      }
      return globalAth;
    });

    // Also handle any newly added athletes that might not be in currentGlobalAthletes yet
    const newlyAdded = updatedList.filter(ua => ua && !currentGlobalAthletes.some(ga => ga.id === ua.id || ga.participantId === ua.id));
    const finalAthletesList = [...mergedAthletes, ...newlyAdded];

    await syncAthletesToCloud(finalAthletesList);

    if (competitionMode === "team" || (currentTournamentDoc && currentTournamentDoc.tournamentFormat === "mixed")) {
      const currentGlobalTeamAthletes = teamAthletes || [];
      const mergedTeamAthletes = currentGlobalTeamAthletes.map(globalAth => {
        const updatedAth = updatedList.find(ua => ua && (ua.id === globalAth.id || ua.participantId === globalAth.id));
        if (updatedAth) {
          return updatedAth;
        }
        return globalAth;
      });
      const newlyAddedTeam = updatedList.filter(ua => ua && !currentGlobalTeamAthletes.some(ga => ga.id === ua.id || ga.participantId === ua.id));
      const finalTeamAthletesList = [...mergedTeamAthletes, ...newlyAddedTeam];

      await syncTeamAthletesToCloud(finalTeamAthletesList);
    }
  }, [competitionMode, currentTournamentDoc, syncAthletesToCloud, syncTeamAthletesToCloud, athletes, teamAthletes]);

  // Dynamic calculation of shotsCount limit from tournament data or fallback
  const shotsCountLimit = useMemo(() => {
    if (competitionMode === "team") {
      return currentTournamentDoc?.teamShotsCount || 10;
    }
    return currentTournamentDoc?.shotsCount || 10;
  }, [competitionMode, currentTournamentDoc]);

  // Call our new custom hook to manage state, synchronization, and operations
  const {
    localState,
    setLocalState,
    addAuditLog,
    handleTransitionTo,
    handleToggleCheckIn,
    handleSaveQuickScore,
    getSoloIdxForHeat,
  } = useCommandCenterState({
    commandCenterState,
    setCommandCenterState,
    currentTournamentDoc,
    competitionMode,
    setCompetitionMode,
    distances,
    teamDistances,
    shotsCountLimit,
    operatorName,
    userRole,
    showToast,
    getActiveAthletesList: () => activeAthletesList,
    activeSetterAndCloud,
    getActiveDistance: () => activeDistance,
    getActiveShotsCountLimit: () => activeShotsCountLimit,
    getResolvedHeats: () => resolvedHeats,
    getIsChecklistValid: () => isChecklistValid,
    activeHistoryId,
    matchName,
  });

  const activeAthletesList = useMemo(() => {
    // If there is a captured snapshot for the active stage, we MUST prefer the captured athletes!
    const targetDistances = (localState?.workflowStage === "team_competition" || competitionMode === "team")
      ? (teamDistances || currentTournamentDoc?.teamDistances || [])
      : (distances || []);
    const currentDist = targetDistances[localState?.currentDistanceIndex || 0] || targetDistances[0];
    const activeDistanceId = localState?.activeSubStage || currentDist?.id;
    const baseDistanceId = activeDistanceId?.replace("-solo", "").replace("-resolo", "");

    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    const capturedObj = capturedRounds?.[activeDistanceId] || capturedRounds?.[baseDistanceId] || (baseDistanceId ? capturedRounds?.[`${baseDistanceId}-main`] : null);
    const isRoundFinalized = capturedObj?.isFinalized === true || 
                             (localState.workflowStage === "official_result" || localState.workflowStage === "published" || localState.workflowStage === "archived");
    if (isRoundFinalized && capturedObj?.athletesSnapshot && Array.isArray(capturedObj.athletesSnapshot) && capturedObj.athletesSnapshot.length > 0) {
      const sourceAthletes = leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes;
      const sourceTeamAthletes = leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes;
      const rawList = (sourceAthletes && sourceAthletes.length > 0)
        ? (sourceTeamAthletes && sourceTeamAthletes.length > 0 ? [...sourceAthletes, ...sourceTeamAthletes] : sourceAthletes)
        : (sourceTeamAthletes || []);
      const deduplicated = getDeduplicatedAthletes(rawList);

      return capturedObj.athletesSnapshot.map((frozenAth: any) => {
        if (!frozenAth) return frozenAth;
        const liveAth = deduplicated.find(a => a && (a.id === frozenAth.id || a.participantId === frozenAth.id || a.id === frozenAth.participantId || a.participantId === frozenAth.participantId));
        if (liveAth) {
          return {
            ...frozenAth,
            status: liveAth.status,
            checkInStatus: liveAth.checkInStatus,
            qualificationStatus: liveAth.qualificationStatus,
            scores: liveAth.scores || frozenAth.scores || {},
            soloShotDetails: liveAth.soloShotDetails || frozenAth.soloShotDetails || {},
            soloRounds: liveAth.soloRounds || frozenAth.soloRounds || {},
            soloHits: liveAth.soloHits || frozenAth.soloHits || {}
          };
        }
        return frozenAth;
      });
    }

    const sourceAthletes = leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes;
    const sourceTeamAthletes = leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes;

    const rawList = (sourceAthletes && sourceAthletes.length > 0)
      ? (sourceTeamAthletes && sourceTeamAthletes.length > 0 ? [...sourceAthletes, ...sourceTeamAthletes] : sourceAthletes)
      : (sourceTeamAthletes || []);
    const deduplicated = getDeduplicatedAthletes(rawList);
    const isTeam = (localState?.workflowStage === "team_competition" || competitionMode === "team");
    const candidateList = isTeam
      ? deduplicated.filter(a => a && a.isPrimaryTeam === true && !isNoTeam(a.team || a.clubName || a.clubId || ""))
      : deduplicated;

    if (activeDistanceId && targetDistances && targetDistances.length > 0) {
      return candidateList.filter(ath => ath && !isAthleteEliminatedInPrevStage(ath, activeDistanceId, targetDistances));
    }

    return candidateList;
  }, [competitionMode, athletes, teamAthletes, leaderboardAthletes, leaderboardTeamAthletes, localState?.activeSubStage, localState?.currentDistanceIndex, localState?.workflowStage, distances, teamDistances, currentTournamentDoc?.teamDistances, localState?.capturedRounds, commandCenterState?.capturedRounds]);

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
  const [newAthleteIsPrimary, setNewAthleteIsPrimary] = useState<boolean>(true);
  
  // Athlete editing modal state
  const [editingAthlete, setEditingAthlete] = useState<any | null>(null);
  const [editAthleteFields, setEditAthleteFields] = useState<any | null>(null);
  
  const [regSearchQuery, setRegSearchQuery] = useState<string>("");
  const [checkInSearchQuery, setCheckInSearchQuery] = useState<string>("");
  const [checkInFilter, setCheckInFilter] = useState<"all" | "pending" | "checked_in" | "dns" | "withdrawn" | "dq">("all");
  const [teamAssignmentMode, setTeamAssignmentMode] = useState<"parallel" | "sequential">("parallel");

  const deduplicatedAthletes = useMemo(() => {
    const rawList = (athletes && athletes.length > 0)
      ? (teamAthletes && teamAthletes.length > 0 ? [...athletes, ...teamAthletes] : athletes)
      : (teamAthletes || []);
    return getDeduplicatedAthletes(rawList);
  }, [athletes, teamAthletes]);

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

  // Auto-sync localState (commandCenterState) back to Firestore is now centralized in App.tsx
  // to avoid concurrent/dual-write resource exhaustion issues.

  // Read active stage info
  const activeDistance = useMemo(() => {
    const targetDistances = (localState.workflowStage === "team_competition" || competitionMode === "team")
      ? (teamDistances || currentTournamentDoc?.teamDistances || [])
      : distances;
    if (targetDistances.length === 0) return null;
    return targetDistances[localState.currentDistanceIndex] || targetDistances[0];
  }, [distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode, localState.currentDistanceIndex]);

  // Synchronizing heats and laneStatus into capturedRounds for the active distance is now handled 
  // on demand when the user switches sub-stages to prevent continuous render cycle infinite loops.

  // Helper to compute a single athlete's score for a specific distance/stage ID
  const computeSingleScore = useCallback((v: any, customDist?: any): number => {
    const dist = customDist || activeDistance;
    const mult = Number(dist?.multiplier) || 10;
    const isDirect = dist?.scoringType === "direct" || (dist?.shotsCount === 1) || ((dist as any)?.directMaxPoints > 0);

    let shotsArr: any[] = [];
    if (v && typeof v === "object" && Array.isArray(v.shots)) {
      shotsArr = v.shots;
    } else if (Array.isArray(v)) {
      shotsArr = v;
    } else if (typeof v === "object" && v !== null) {
      shotsArr = Object.values(v);
    } else if (v !== null && v !== undefined) {
      shotsArr = [v];
    }

    if (shotsArr.length === 0) return 0;

    const hasNumericScores = shotsArr.some((s: any) => typeof s === "number" && s > 1);

    if (isDirect || hasNumericScores) {
      const rawSum = shotsArr.reduce((sum: number, item: any) => {
        if (typeof item === 'number') return sum + item;
        if (item === true) return sum + 10;
        return sum;
      }, 0);
      return rawSum * (Number(dist?.multiplier) || 1);
    } else {
      const hitsCount = shotsArr.reduce((sum: number, item: any) => {
        if (item === true || item === 1 || item === "1" || item === "X" || item === "x") return sum + 1;
        if (typeof item === 'number' && item > 0) return sum + 1;
        return sum;
      }, 0);
      return hitsCount * mult;
    }
  }, [activeDistance]);

  // Helper to compute an athlete's seed score from the previous stage
  const getAthleteSeedScore = useCallback((ath: any) => {
    if (!ath || !activeDistance) return 0;
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);
    
    // Find index of current activeDistance
    const currentIdx = targetStages.findIndex((d: any) => d.id === activeDistance.id);
    if (currentIdx <= 0) return 0; // First round/stage has no previous stage scores
    
    const prevStage = targetStages[currentIdx - 1];
    if (prevStage) {
      const scoresObj = ath.scores?.[prevStage.id];
      return computeSingleScore(scoresObj, prevStage);
    }
    return 0;
  }, [activeDistance, distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode, computeSingleScore]);

  // Helper to resolve strategy for any stage/distance ID
  const resolveStrategyForStage = useCallback((stageId: string, stageIndex: number) => {
    // 1. Stage Index 0 (Vòng 1) is STRICTLY sequential by BIB number
    if (stageIndex === 0) {
      return "sequential";
    }

    // 2. Check if there is an assignment version saved for this stage
    const sourceVersions = localState.assignmentVersions || commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    
    const matchingVersions = sourceVersions.filter((v: any) => {
      const isVerTeam = v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
      return v.stageId === stageId && (isTeam ? isVerTeam : !isVerTeam);
    });

    if (matchingVersions.length > 0) {
      // Find the latest version by timestamp or ID
      const sorted = [...matchingVersions].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      if (sorted[0]?.strategy) {
        return sorted[0].strategy;
      }
    }

    // 3. Check if configured in Operational Management (Quản Lý Vận Hành)
    const activeStageIdFromDb = localState.assignmentStageId || commandCenterState?.assignmentStageId || (currentTournamentDoc as any)?.commandCenterState?.assignmentStageId;
    if (activeStageIdFromDb === stageId) {
      const globalStrategy = localState.assignmentStrategy || commandCenterState?.assignmentStrategy || (currentTournamentDoc as any)?.commandCenterState?.assignmentStrategy;
      if (globalStrategy) {
        return globalStrategy;
      }
    }

    const fallbackGlobal = localState.assignmentStrategy || commandCenterState?.assignmentStrategy || (currentTournamentDoc as any)?.commandCenterState?.assignmentStrategy;
    return fallbackGlobal || "ranking_asc";
  }, [
    localState.assignmentVersions,
    localState.assignmentStrategy,
    localState.assignmentStageId,
    commandCenterState?.assignmentVersions,
    commandCenterState?.assignmentStrategy,
    commandCenterState?.assignmentStageId,
    (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions,
    (currentTournamentDoc as any)?.commandCenterState?.assignmentStrategy,
    (currentTournamentDoc as any)?.commandCenterState?.assignmentStageId,
    (currentTournamentDoc as any)?.assignmentVersions,
    localState.workflowStage,
    competitionMode
  ]);

  // Determine active strategy for current stage/distance
  const currentStageStrategy = useMemo(() => {
    if (!activeDistance) return "sequential";
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);
    const currentIdx = targetStages.findIndex((d: any) => d.id === activeDistance.id);
    return resolveStrategyForStage(activeDistance.id, currentIdx);
  }, [activeDistance, resolveStrategyForStage, distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode]);

  const competingAthletes = useMemo(() => {
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);

    const activeOnly = activeAthletesList.filter(a => {
      if (!a) return false;
      if (activeDistance) {
        if (isAthleteEliminatedInPrevStage(a, activeDistance.id, targetStages)) {
          return false;
        }
        const statusLower = (a.status || "").toString().toLowerCase();
        if (statusLower === "bỏ thi" || statusLower === "dns" || statusLower === "withdrawn") {
          return false;
        }
      } else {
        if (isAthleteEliminated(a)) return false;
      }
      return true;
    });

    const getCleanBib = (ath: any) => {
      return getCleanBibNumber(ath?.bibNumber, ath?.id || ath?.participantId);
    };

    return [...activeOnly].sort((a, b) => {
      if (currentStageStrategy === "ranking_asc") {
        const scoreA = getAthleteSeedScore(a);
        const scoreB = getAthleteSeedScore(b);
        if (scoreA !== scoreB) {
          return scoreA - scoreB; // Smallest to largest (ít điểm nhất lên đầu)
        }
        // Fallback to BIB sorting
        const bibA = getCleanBib(a);
        const bibB = getCleanBib(b);
        return bibA.localeCompare(bibB, undefined, { numeric: true, sensitivity: "base" });
      } else if (currentStageStrategy === "ranking" || currentStageStrategy === "snake" || currentStageStrategy === "seeded") {
        const scoreA = getAthleteSeedScore(a);
        const scoreB = getAthleteSeedScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Largest to smallest (hạt giống lớn đến nhỏ)
        }
        // Fallback to BIB sorting
        const bibA = getCleanBib(a);
        const bibB = getCleanBib(b);
        return bibA.localeCompare(bibB, undefined, { numeric: true, sensitivity: "base" });
      } else {
        // Default sequential or random fallback (stable sort by BIB)
        const bibA = getCleanBib(a);
        const bibB = getCleanBib(b);
        return bibA.localeCompare(bibB, undefined, { numeric: true, sensitivity: "base" });
      }
    });
  }, [activeAthletesList, activeDistance, distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode, currentStageStrategy, getAthleteSeedScore]);

  // Resolve active heats from saved assignmentVersions or fallback to localState.heats with dynamic, live alignment
  const resolvedHeats = useMemo(() => {
    if (!activeDistance) return [];

    const isCurrentModeTeam = (competitionMode === "team" || localState.workflowStage === "team_competition");

    // If we have local heats, prefer them first as they represent the active operating state
    if (Array.isArray(localState.heats) && localState.heats.length > 0) {
      const firstHeat = localState.heats[0];
      const isFirstHeatTeam = firstHeat && (
        (firstHeat.heatId && String(firstHeat.heatId).startsWith("heat-team-")) ||
        (firstHeat.heatName && String(firstHeat.heatName).includes("Đồng Đội")) ||
        (firstHeat.heatName && String(firstHeat.heatName).toLowerCase().includes("team"))
      );

      const isModeMatch = isCurrentModeTeam ? isFirstHeatTeam : !isFirstHeatTeam;

      const isMatchingStage = isModeMatch && firstHeat && (
        firstHeat.stageId === activeDistance.id ||
        (firstHeat as any).distanceId === activeDistance.id ||
        (!firstHeat.stageId && !(firstHeat as any).distanceId && activeDistance.id === (distances?.[0]?.id || teamDistances?.[0]?.id))
      );
      if (isMatchingStage) {
        return localState.heats;
      }
    }

    // If we have a captured snapshot for this stage, use it!
    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    if (capturedRounds?.[activeDistance.id]?.heatsSnapshot) {
      return capturedRounds[activeDistance.id].heatsSnapshot;
    }

    const targetStages = isCurrentModeTeam ? (teamDistances || []) : (distances || []);
    const targetStageIndex = targetStages.findIndex(d => d.id === activeDistance.id);
    const roundNumber = targetStageIndex >= 0 ? targetStageIndex + 1 : 1;

    // Retrieve active strategy, lanesCount and clubSeparation from the saved assignment versions
    const sourceVersions = localState.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
    const matches = sourceVersions.filter((v: any) => {
      const isVerTeam = v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
      return v.stageId === activeDistance.id && (isCurrentModeTeam ? isVerTeam : !isVerTeam);
    });

    const sortedMatches = [...matches].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    const bestMatch = sortedMatches[0] || null;

    let strategy = currentStageStrategy;
    let lanesCount = localState.laneCount || 8;
    let clubSeparation = true;

    if (bestMatch) {
      strategy = bestMatch.strategy || strategy;
      lanesCount = bestMatch.lanesCount || lanesCount;
      clubSeparation = bestMatch.clubSeparation !== false;
    }

    if (targetStageIndex === 0 && !isCurrentModeTeam) {
      strategy = "sequential";
      clubSeparation = false;
    }

    // Get current eligible athletes (excluding those eliminated in prior stages)
    const eligibleAthletes = activeAthletesList.filter(a => {
      if (!a) return false;
      return !isAthleteEliminatedInPrevStage(a, activeDistance.id, targetStages);
    });

    let rawHeatsList: any[] = [];
    if (bestMatch && Array.isArray(bestMatch.heats) && bestMatch.heats.length > 0 && (targetStageIndex > 0 || isCurrentModeTeam)) {
      // PREFER the exact configuration of lanes from the Assignments view in Operational Management!
      // This ensures Lane Status Monitor matches Quản lý Vận hành perfectly.
      rawHeatsList = bestMatch.heats.map((h: any) => {
        if (!Array.isArray(h.lanes)) return h;
        const cleanLanes = h.lanes.map((l: any) => {
          if (!l || !l.participantId) return l;
          const athObj = activeAthletesList.find(a => a && (a.id === l.participantId || a.participantId === l.participantId));
          if (athObj && isAthleteEliminatedInPrevStage(athObj, activeDistance.id, targetStages)) {
            return {
              ...l,
              participantId: null,
              fullName: null,
              name: null,
              bibNumber: null,
              clubId: null,
              team: null
            };
          }
          return l;
        });
        return { ...h, lanes: cleanLanes };
      });
    } else if (eligibleAthletes.length > 0) {
      const seedScores: Record<string, number> = {};
      let prevStageRankings: any[] = [];
      if (targetStageIndex > 0) {
        const prevStages = targetStages.slice(0, targetStageIndex);
        const lastPrevStage = prevStages[prevStages.length - 1];
        const isCumulativePrev = lastPrevStage.isCumulative === true || String(lastPrevStage.isCumulative) === "true";
        const calculationDistances = isCumulativePrev ? prevStages : [lastPrevStage];
        try {
          prevStageRankings = RankingEngine.calculate({
            athletes: activeAthletesList as Athlete[],
            distances: calculationDistances as any[],
            tieBreakRule: "highest_distance_multiplier"
          });
        } catch (err) {
          console.error("Error calculating dynamic seed scores:", err);
        }
      }

      eligibleAthletes.forEach(ath => {
        const pId = ath.id || ath.participantId;
        const rankRecord = prevStageRankings.find(r => r.athleteId === pId);
        if (rankRecord) {
          seedScores[ath.id] = rankRecord.totalScore;
        } else if (targetStageIndex > 0) {
          const prevStage = targetStages[targetStageIndex - 1];
          const scoresObj = ath.scores?.[prevStage.id];
          seedScores[ath.id] = computeSingleScore(scoresObj, prevStage);
        } else {
          seedScores[ath.id] = 0;
        }
      });

      const participants = eligibleAthletes.map(ath => ({
        participantId: ath.id,
        fullName: ath.name,
        bibNumber: getCleanBibNumber(ath.bibNumber, ath.id),
        clubId: ath.team,
        status: "checked_in"
      }));

      try {
        if (isCurrentModeTeam) {
          const teamModeMode = localState.teamAssignmentMode || "parallel";
          const teamStrategy = strategy?.startsWith("team_") ? strategy : `team_${teamModeMode}`;
          const genResult = AssignmentEngine.generateTeamAssignments(participants as any[], {
            lanesCount,
            refereeIds: ["referee_01", "referee_02", "referee_03"],
            strategy: teamStrategy,
            tournamentId: activeHistoryId || "tour-temp",
            stageId: activeDistance.id,
            roundId: `r${roundNumber}`
          });
          rawHeatsList = genResult.heats || [];
        } else {
          const genResult = AssignmentEngine.generateAssignments(participants as any[], {
            lanesCount,
            refereeIds: ["referee_01", "referee_02", "referee_03"],
            strategy: strategy as any,
            clubSeparation,
            seedScores,
            tournamentId: activeHistoryId || "tour-temp",
            stageId: activeDistance.id,
            roundId: `r${roundNumber}`
          });
          rawHeatsList = genResult.heats || [];
        }
      } catch (err) {
        console.error("Dynamic lane assignment generation failed:", err);
      }
    }

    if (!rawHeatsList) rawHeatsList = [];

    // Clone to avoid mutation of state
    let alignedHeats = JSON.parse(JSON.stringify(rawHeatsList));

    // MERGE any solo/resolo heats present in localState.heats or commandCenterState.heats
    const extraSoloHeatsSource = [
      ...(localState.heats || []),
      ...((commandCenterState as any)?.heats || [])
    ];
    const extraSoloMap = new Map<number, any>();
    extraSoloHeatsSource.forEach((h: any) => {
      if (!h || !h.heatNumber) return;
      const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
      if (isSoloType && h.stageId === activeDistance.id && !alignedHeats.some((ah: any) => ah.heatNumber === h.heatNumber)) {
        extraSoloMap.set(h.heatNumber, h);
      }
    });

    if (extraSoloMap.size > 0) {
      alignedHeats = [...alignedHeats, ...Array.from(extraSoloMap.values())];
    }

    if (alignedHeats.length === 0 && competingAthletes.length === 0) return [];

    // Clear out lanes containing athletes who were eliminated in previous stages, while preserving the lane structure
    alignedHeats = alignedHeats.map((h: any) => {
      if (!Array.isArray(h.lanes)) return h;
      const cleanLanes = h.lanes.map((l: any) => {
        if (!l || !l.participantId) return l;
        const athObj = activeAthletesList.find(a => a && (a.id === l.participantId || a.participantId === l.participantId));
        if (athObj && activeDistance && isAthleteEliminatedInPrevStage(athObj, activeDistance.id, targetStages)) {
          return {
            ...l,
            participantId: null,
            fullName: null,
            name: null,
            bibNumber: null,
            clubId: null,
            team: null
          };
        }
        return l;
      });
      return { ...h, lanes: cleanLanes };
    });

    // Find who is already assigned in these heats
    const assignedIds = new Set<string>();
    const assignedBibs = new Set<string>();
    const assignedNames = new Set<string>();

    alignedHeats.forEach((h: any) => {
      if (Array.isArray(h.lanes)) {
        h.lanes.forEach((l: any) => {
          if (l.participantId) assignedIds.add(l.participantId);
          if (l.bibNumber) assignedBibs.add(l.bibNumber);
          if (l.fullName) assignedNames.add(l.fullName.toLowerCase().trim());
        });
      }
    });

    // Find competingAthletes who are NOT assigned yet
    const unassignedAthletes = competingAthletes.filter((a: any) => {
      const id = a.id || a.participantId;
      if (assignedIds.has(id)) return false;
      if (a.vscNumber && assignedIds.has(a.vscNumber)) return false;
      if (a.bibNumber && assignedBibs.has(a.bibNumber)) return false;
      if (a.name && assignedNames.has(a.name.toLowerCase().trim())) return false;
      return true;
    });

    if (unassignedAthletes.length === 0 || isCurrentModeTeam) {
      return alignedHeats;
    }

    // We have unassigned athletes! Let's dynamically slot them in!
    let athleteIdx = 0;
    const laneLimit = localState.laneCount || 10;

    for (let hIdx = 0; hIdx < alignedHeats.length && athleteIdx < unassignedAthletes.length; hIdx++) {
      const heat = alignedHeats[hIdx];
      if (!Array.isArray(heat.lanes)) heat.lanes = [];

      // Look for any empty lanes from 1 to laneLimit
      for (let lNum = 1; lNum <= laneLimit && athleteIdx < unassignedAthletes.length; lNum++) {
        const existingLaneIdx = heat.lanes.findIndex((l: any) => l.laneNumber === lNum);
        const existingLane = existingLaneIdx !== -1 ? heat.lanes[existingLaneIdx] : null;

        if (!existingLane || !existingLane.participantId) {
          const newAth = unassignedAthletes[athleteIdx++];
          const newLaneObj = {
            laneNumber: lNum,
            participantId: newAth.id || newAth.participantId,
            fullName: newAth.fullName || newAth.name,
            bibNumber: newAth.bibNumber || `BIB-${newAth.id}`,
            clubId: newAth.clubName || newAth.team || "Tự Do",
            refereeId: "Trọng tài bàn"
          };

          if (existingLane) {
            heat.lanes[existingLaneIdx] = { ...existingLane, ...newLaneObj };
          } else {
            heat.lanes.push(newLaneObj);
          }
        }
      }
      // Re-sort lanes by laneNumber
      heat.lanes.sort((a: any, b: any) => a.laneNumber - b.laneNumber);
    }

    // If still have unassigned, create new heats!
    while (athleteIdx < unassignedAthletes.length) {
      const nextHeatNum = alignedHeats.length + 1;
      const newLanes = [];
      for (let lNum = 1; lNum <= laneLimit && athleteIdx < unassignedAthletes.length; lNum++) {
        const newAth = unassignedAthletes[athleteIdx++];
        newLanes.push({
          laneNumber: lNum,
          participantId: newAth.id || newAth.participantId,
          fullName: newAth.fullName || newAth.name,
          bibNumber: newAth.bibNumber || `BIB-${newAth.id}`,
          clubId: newAth.clubName || newAth.team || "Tự Do",
          refereeId: "Trọng tài bàn"
        });
      }
      alignedHeats.push({
        heatId: `dynamic-heat-${Date.now()}-${nextHeatNum}`,
        heatNumber: nextHeatNum,
        heatName: `Lượt ${nextHeatNum} (Bổ sung)`,
        lanes: newLanes
      });
    }

    return alignedHeats;
  }, [localState.heats, localState.assignmentVersions, activeDistance, competitionMode, localState.workflowStage, activeAthletesList, competingAthletes, localState.laneCount, currentTournamentDoc, commandCenterState?.capturedRounds, localState.capturedRounds]);

  const teamAssignmentVersions = useMemo(() => {
    if (localState.assignmentVersions) {
      return localState.assignmentVersions.filter((v: any) => {
        return v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
      });
    }
    return [];
  }, [localState.assignmentVersions]);

  // ----------------- READY CHECKLIST ENGINE -----------------
  const [manualChecklist, setManualChecklist] = useState<Record<string, boolean>>({});

  const computedAthleteCheckedIn = useMemo(() => {
    return athletes.some(a => a.status === "Thi đấu" || a.checkInStatus === "checked_in" || a.status === "checked_in");
  }, [athletes]);

  const computedLaneAssigned = useMemo(() => {
    return !!(resolvedHeats && resolvedHeats.length > 0);
  }, [resolvedHeats]);

  const computedRefereeReady = useMemo(() => {
    const hasRef = (resolvedHeats || []).some(h => (h.lanes || []).some(l => l.refereeId));
    return hasRef || !!(currentTournamentDoc as any)?.assistantReferees?.length || !!(currentTournamentDoc as any)?.headReferee;
  }, [resolvedHeats, currentTournamentDoc]);

  const computedDistanceConfigured = useMemo(() => {
    const targetDistances = (localState.workflowStage === "team_competition" || competitionMode === "team")
      ? (teamDistances || currentTournamentDoc?.teamDistances || [])
      : distances;
    return !!(targetDistances && targetDistances.length > 0);
  }, [distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode]);

  const computedEnvironmentReady = useMemo(() => {
    return !!competitionMode;
  }, [competitionMode]);

  const computedNetworkReady = useMemo(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }, []);

  const checklistState = useMemo(() => ({
    athleteCheckedIn: manualChecklist.athleteCheckedIn ?? computedAthleteCheckedIn,
    laneAssigned: manualChecklist.laneAssigned ?? computedLaneAssigned,
    refereeReady: manualChecklist.refereeReady ?? computedRefereeReady,
    distanceConfigured: manualChecklist.distanceConfigured ?? computedDistanceConfigured,
    environmentReady: manualChecklist.environmentReady ?? computedEnvironmentReady,
    networkReady: manualChecklist.networkReady ?? computedNetworkReady,
  }), [manualChecklist, computedAthleteCheckedIn, computedLaneAssigned, computedRefereeReady, computedDistanceConfigured, computedEnvironmentReady, computedNetworkReady]);

  const isChecklistValid = useMemo(() => {
    return Object.values(checklistState).every(Boolean);
  }, [checklistState]);
  // -----------------------------------------------------------

  const activeHeat = useMemo(() => {
    return resolvedHeats?.find((h: any) => h.heatNumber === localState.currentHeat);
  }, [resolvedHeats, localState.currentHeat]);

  const activeShotsCountLimit = useMemo(() => {
    if (activeDistance?.shotsCount !== undefined && activeDistance?.shotsCount !== null && activeDistance?.shotsCount > 0) {
      return activeDistance.shotsCount;
    }
    return shotsCountLimit;
  }, [activeDistance, shotsCountLimit]);

  const dynamicSubStages = useMemo(() => {
    const list: { id: string; label: string; type: "standard" | "solo" | "resolo"; distanceIndex: number; distanceId: string; hasSolo?: boolean; latestSoloHeatNum?: number; heatNumber?: number }[] = [];
    const isTeamMode = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetDistances = isTeamMode
      ? (teamDistances || currentTournamentDoc?.teamDistances || [])
      : distances;
    const allHeats = (resolvedHeats && resolvedHeats.length > 0) ? resolvedHeats : (localState.heats || []);

    targetDistances.forEach((dist, idx) => {
      // Check if this distance has active solo heats or solo scores
      const soloOrResoloHeats = allHeats
        .filter(h => {
          if (!h) return false;
          const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
          if (!isSoloType) return false;
          const isSameStage = h.stageId === dist.id || h.distanceId === dist.id ||
            (isTeamMode
              ? (h.heatNumber >= (idx + 1) * 1100 && h.heatNumber < (idx + 2) * 1100)
              : (h.heatNumber >= (idx + 1) * 100 && h.heatNumber < (idx + 2) * 100)
            );
          return isSameStage;
        })
        .sort((a, b) => (a.heatNumber || 0) - (b.heatNumber || 0));

      const hasSoloScores = (activeAthletesList || []).some(ath => {
        if (!ath) return false;
        return getSoloRoundsFromDist(ath, dist).length > 0;
      });

      const hasSolo = soloOrResoloHeats.length > 0 || hasSoloScores;
      const latestSoloHeatNum = soloOrResoloHeats.length > 0 ? soloOrResoloHeats[soloOrResoloHeats.length - 1].heatNumber : undefined;

      list.push({
        id: dist.id,
        label: `Vòng ${idx + 1} (${dist.distance})`,
        type: "standard",
        distanceIndex: idx,
        distanceId: dist.id,
        hasSolo,
        latestSoloHeatNum
      });
    });
    return list;
  }, [distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode, resolvedHeats, localState.heats, activeAthletesList]);

  const isDistanceLocked = useCallback((distId: string) => {
    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    if (capturedRounds?.[distId]) return true;
    if (localState.workflowStage === "archived" || localState.workflowStage === "published" || localState.workflowStage === "official_result") return true;
    if (localState.workflowStage === "competition" || localState.workflowStage === "team_competition") {
      const activeSubStageId = localState.activeSubStage;
      if (!activeSubStageId) return false;

      const activeIdx = dynamicSubStages.findIndex(s => s.id === activeSubStageId);
      if (activeIdx === -1) return false;

      const distanceIndices = dynamicSubStages
        .map((s, idx) => s.distanceId === distId ? idx : -1)
        .filter(idx => idx !== -1);
      if (distanceIndices.length === 0) return false;

      const maxDistIdx = Math.max(...distanceIndices);
      return maxDistIdx < activeIdx;
    }
    return false;
  }, [localState.workflowStage, localState.activeSubStage, dynamicSubStages, commandCenterState?.capturedRounds]);

  // Sync / validate activeSubStage when dynamicSubStages loads
  useEffect(() => {
    if (dynamicSubStages.length > 0) {
      const isValid = dynamicSubStages.some(s => s.id === localState.activeSubStage);
      if (!isValid) {
        setLocalState(prev => ({
          ...prev,
          activeSubStage: dynamicSubStages[0].id,
          currentDistanceIndex: dynamicSubStages[0].distanceIndex
        }));
      }
    }
  }, [dynamicSubStages, localState.activeSubStage]);

  // Keep competitionMode in sync with the current active workflowStage automatically
  useEffect(() => {
    const fmt = currentTournamentDoc?.tournamentFormat;

    if (userRole !== "admin") {
      // Non-admin view: completely passive. Just follow parent's competitionMode prop!
      if (competitionMode) {
        setLocalState(prev => {
          if (prev.competitionActiveTab !== competitionMode) {
            return { ...prev, competitionActiveTab: competitionMode as any };
          }
          return prev;
        });
      }
      return;
    }

    // Admin view: drives competitionMode
    if (fmt === "individual") {
      if (localState.competitionActiveTab !== "individual") {
        setLocalState(prev => ({ ...prev, competitionActiveTab: "individual" }));
      }
      if (competitionMode !== "individual" && setCompetitionMode) {
        setCompetitionMode("individual");
        if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, { competitionMode: "individual" })
            .catch(err => console.error("Cloud update mode failed:", err));
        }
      }
    } else if (fmt === "team") {
      if (localState.competitionActiveTab !== "team") {
        setLocalState(prev => ({ ...prev, competitionActiveTab: "team" }));
      }
      if (competitionMode !== "team" && setCompetitionMode) {
        setCompetitionMode("team");
        if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, { competitionMode: "team" })
            .catch(err => console.error("Cloud update mode failed:", err));
        }
      }
    } else {
      if (localState.workflowStage === "team_competition") {
        if (competitionMode !== "team" && setCompetitionMode) {
          setCompetitionMode("team");
          if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
            updateOnlineTournament(activeHistoryId, { competitionMode: "team" })
              .catch(err => console.error("Cloud update mode failed:", err));
          }
        }
      } else if (localState.workflowStage === "competition") {
        const targetMode = localState.competitionActiveTab || "individual";
        if (competitionMode !== targetMode && setCompetitionMode) {
          setCompetitionMode(targetMode);
          if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
            updateOnlineTournament(activeHistoryId, { competitionMode: targetMode })
              .catch(err => console.error("Cloud update mode failed:", err));
          }
        }
      }
    }
  }, [localState.workflowStage, localState.competitionActiveTab, competitionMode, setCompetitionMode, activeHistoryId, userRole, currentTournamentDoc?.tournamentFormat]);

  const totalHeatsCount = useMemo(() => {
    if (resolvedHeats && resolvedHeats.length > 0) {
      return resolvedHeats.length;
    }
    return Math.max(1, Math.ceil(competingAthletes.length / (localState.laneCount || 10)));
  }, [resolvedHeats, competingAthletes.length, localState.laneCount]);

  const stageHeats = useMemo(() => {
    const allHeats = [...(resolvedHeats || [])];
    const currentHeatObj = allHeats.find(h => h.heatNumber === localState.currentHeat);
    const isCurrentSolo = currentHeatObj?.heatType === "solo" || currentHeatObj?.heatType === "resolo";

    if (isCurrentSolo) {
      return allHeats
        .filter(h => h.heatType === "solo" || h.heatType === "resolo")
        .sort((a, b) => a.heatNumber - b.heatNumber);
    } else {
      return allHeats
        .filter(h => h.heatType !== "solo" && h.heatType !== "resolo")
        .sort((a, b) => a.heatNumber - b.heatNumber);
    }
  }, [resolvedHeats, localState.currentHeat]);

  const currentHeatIndex = useMemo(() => {
    return stageHeats.findIndex(h => h.heatNumber === localState.currentHeat);
  }, [stageHeats, localState.currentHeat]);

  // Synchronize laneCount and currentHeat safety bounds when active distance changes
  useEffect(() => {
    if (!activeDistance) return;
    const isCurrentModeTeam = (competitionMode === "team" || localState.workflowStage === "team_competition");
    const sourceVersions = localState.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
    const matches = sourceVersions.filter((v: any) => {
      const isVerTeam = v.strategy?.startsWith("team_") || v.name?.includes("(Đồng Đội)");
      return v.stageId === activeDistance.id && (isCurrentModeTeam ? isVerTeam : !isVerTeam);
    });

    const bestMatch = matches.length > 0 
      ? [...matches].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())[0] 
      : null;

    setLocalState(prev => {
      let changed = false;
      const nextState = { ...prev };

      // Sync laneCount
      const targetLaneCount = bestMatch?.lanesCount || prev.laneCount || 8;
      if (prev.laneCount !== targetLaneCount) {
        nextState.laneCount = targetLaneCount;
        changed = true;
      }

      // Reset out-of-bounds currentHeat
      if (prev.currentHeat < 100 && prev.currentHeat > totalHeatsCount) {
        nextState.currentHeat = 1;
        changed = true;
      }

      return changed ? nextState : prev;
    });
  }, [activeDistance, competitionMode, localState.workflowStage, localState.assignmentVersions, currentTournamentDoc, totalHeatsCount]);

  // Synchronize laneStatus automatically when currentHeat, heats, or active distance changes
  useEffect(() => {
    // CRITICAL: If this round has already been closed and has a captured snapshot, 
    // we MUST load the captured lane status directly and never overwrite it with computed/live lanes!
    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    if (activeDistance && capturedRounds?.[activeDistance.id]?.laneStatusSnapshot) {
      const snapshotLanes = capturedRounds[activeDistance.id].laneStatusSnapshot;
      setLocalState(prev => {
        if (JSON.stringify(prev.laneStatus) !== JSON.stringify(snapshotLanes)) {
          return {
            ...prev,
            laneStatus: snapshotLanes
          };
        }
        return prev;
      });
      return;
    }

    const heatNum = localState.currentHeat;
    const laneLimit = localState.laneCount || 10;
    const newLanes: Record<number, any> = {};

    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);

    // 1. If we have saved heats, find matching heat
    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === heatNum) || localState.heats?.find((h: any) => h.heatNumber === heatNum);
    if (savedHeat && Array.isArray(savedHeat.lanes)) {
      const matchedIds = new Set<string>();
      const isSoloType = savedHeat.heatType === "solo" || savedHeat.heatType === "resolo";
      const targetShotsCount = shotsCountLimit;

      for (let i = 1; i <= laneLimit; i++) {
        const assignedLane = savedHeat.lanes.find((l: any) => l.laneNumber === i);
        let athleteId = assignedLane?.participantId || null;
        let ath = athleteId ? activeAthletesList.find(a => {
          if (!a) return false;
          const aId = a.id || a.participantId;
          if (matchedIds.has(aId)) return false; // Avoid duplicating athletes in different lanes of the same heat!

          return (
            a.id === athleteId || 
            (a.participantId && a.participantId === athleteId) ||
            (a.vscNumber && a.vscNumber === athleteId) ||
            (a.bibNumber && assignedLane?.bibNumber && assignedLane.bibNumber !== "BIB-000" && assignedLane.bibNumber.trim() !== "" && a.bibNumber === assignedLane.bibNumber) ||
            (a.name && assignedLane?.fullName && assignedLane.fullName.trim() !== "" && a.name.trim().toLowerCase() === assignedLane.fullName.trim().toLowerCase())
          );
        }) : null;

        // CRITICAL: If the athlete was eliminated in previous stages, clear them from this lane
        if (ath && activeDistance && isAthleteEliminatedInPrevStage(ath, activeDistance.id, targetStages)) {
          ath = null;
          athleteId = null;
        }

        const realAthleteId = ath ? (ath.id || ath.participantId) : null;
        if (ath) {
          matchedIds.add(ath.id || ath.participantId);
        }

        let savedScores: any = null;
        if (isSoloType) {
          const soloIdx = getSoloIdxForHeatHelper(savedHeat.heatNumber);
          const details = ath?.soloShotDetails?.[activeDistance?.id]?.[soloIdx];
          if (details) {
            savedScores = details;
          }
        } else {
          savedScores = ath && activeDistance ? ath.scores?.[activeDistance.id] : null;
        }

        const onlineLane = commandCenterState?.laneStatus?.[i];
        const isMatchingAthlete = onlineLane && (
          onlineLane.athleteId === realAthleteId || 
          (ath && (onlineLane.athleteId === ath.id || onlineLane.athleteId === ath.participantId || onlineLane.athleteId === ath.vscNumber))
        );

        let liveStatus = realAthleteId ? "preparing" : "idle";
        if (isMatchingAthlete && onlineLane.status) {
          liveStatus = onlineLane.status;
        }

        let liveScores = normalizeScoresToArr(savedScores, targetShotsCount);
        if (isMatchingAthlete && Array.isArray(onlineLane.scores)) {
          liveScores = onlineLane.scores;
        }

        newLanes[i] = {
          athleteId: realAthleteId,
          athleteName: realAthleteId ? (assignedLane?.fullName || ath?.name) : null,
          bibNumber: realAthleteId ? (assignedLane?.bibNumber || ath?.bibNumber) : null,
          refereeId: onlineLane?.refereeId || assignedLane?.refereeId || "Trọng tài bàn",
          status: liveStatus,
          scores: liveScores
        };
      }
    } else {
      // 2. Fallback: Strategy 3 (deterministic slice by BIB order or seed order depending on current stage strategy)
      const startIdx = (heatNum - 1) * laneLimit;
      for (let i = 1; i <= laneLimit; i++) {
        const athlete = competingAthletes[startIdx + i - 1];
        const athleteId = athlete ? (athlete.id || athlete.participantId) : null;
        const savedScores = athlete && activeDistance ? athlete.scores?.[activeDistance.id] : null;

        const onlineLane = commandCenterState?.laneStatus?.[i];
        const isMatchingAthlete = onlineLane && (
          onlineLane.athleteId === athleteId || 
          (athlete && (onlineLane.athleteId === athlete.id || onlineLane.athleteId === athlete.participantId || onlineLane.athleteId === athlete.vscNumber))
        );

        let liveStatus = athlete ? "preparing" : "idle";
        if (isMatchingAthlete && onlineLane.status) {
          liveStatus = onlineLane.status;
        }

        let liveScores = normalizeScoresToArr(savedScores, shotsCountLimit);
        if (isMatchingAthlete && Array.isArray(onlineLane.scores)) {
          liveScores = onlineLane.scores;
        }

        newLanes[i] = {
          athleteId,
          athleteName: athlete ? athlete.fullName || athlete.name : null,
          bibNumber: athlete ? athlete.bibNumber || `BIB-${athlete.id}` : null,
          refereeId: onlineLane?.refereeId || "Trọng tài bàn",
          status: liveStatus,
          scores: liveScores
        };
      }
    }

    setLocalState(prev => {
      const oldKeys = Object.keys(prev.laneStatus || {});
      let changed = oldKeys.length !== Object.keys(newLanes).length;
      if (!changed) {
        for (let i = 1; i <= laneLimit; i++) {
          if (
            prev.laneStatus?.[i]?.athleteId !== newLanes[i].athleteId ||
            prev.laneStatus?.[i]?.athleteName !== newLanes[i].athleteName ||
            prev.laneStatus?.[i]?.bibNumber !== newLanes[i].bibNumber ||
            JSON.stringify(prev.laneStatus?.[i]?.scores) !== JSON.stringify(newLanes[i].scores)
          ) {
            changed = true;
            break;
          }
        }
      }
      if (changed) {
        return {
          ...prev,
          laneStatus: newLanes
        };
      }
      return prev;
    });
  }, [
    localState.currentHeat,
    resolvedHeats,
    localState.laneCount,
    competingAthletes,
    activeDistance,
    shotsCountLimit,
    activeAthletesList,
    localState.capturedRounds,
    commandCenterState?.capturedRounds,
    commandCenterState?.laneStatus
  ]);

  const getDisplayHeatLabel = useCallback((heatNumber: number, fallbackPrefix = "Lượt") => {
    if (!heatNumber) return "";
    const matchedHeat = (resolvedHeats || localState?.heats || []).find((h: any) => h.heatNumber === heatNumber);
    if (matchedHeat?.heatName) return matchedHeat.heatName;
    if (heatNumber > 10000) {
      const base = Math.floor(heatNumber / 100);
      const isResolo = (base % 100) > 1;
      const subHeat = heatNumber % 100;
      return `Lượt ${subHeat} - Vòng ${isResolo ? "Re-Solo" : "Solo"} ${base}`;
    }
    return `${fallbackPrefix} ${heatNumber}`;
  }, [resolvedHeats, localState?.heats]);

  const getAthletesForHeat = useCallback((heatNum: number) => {
    const laneLimit = localState.laneCount || 10;
    const result: (any | null)[] = Array(laneLimit).fill(null);

    // Strategy 1: check if we have a matching heat in resolvedHeats or localState.heats
    const savedHeat = resolvedHeats?.find((h: any) => h.heatNumber === heatNum) || localState.heats?.find((h: any) => h.heatNumber === heatNum);
    if (savedHeat && Array.isArray(savedHeat.lanes)) {
      const matchedIds = new Set<string>();
      savedHeat.lanes.forEach((l: any) => {
        const laneIdx = l.laneNumber - 1;
        if (laneIdx >= 0 && laneIdx < laneLimit) {
          const ath = activeAthletesList.find(a => {
            if (!a) return false;
            const aId = a.id || a.participantId;
            if (matchedIds.has(aId)) return false; // Avoid duplicating athletes in different lanes of the same heat!

            return (
              (l.participantId && (a.id === l.participantId || (a.participantId && a.participantId === l.participantId) || a.vscNumber === l.participantId)) ||
              (a.bibNumber && l.bibNumber && l.bibNumber !== "BIB-000" && l.bibNumber.trim() !== "" && a.bibNumber === l.bibNumber) ||
              (a.name && l.fullName && l.fullName.trim() !== "" && a.name.trim().toLowerCase() === l.fullName.trim().toLowerCase())
            );
          });
          if (ath) {
            result[laneIdx] = ath;
            matchedIds.add(ath.id || ath.participantId);
          } else if (l.fullName || l.participantId) {
            result[laneIdx] = {
              id: l.participantId || `lane-${l.laneNumber}`,
              name: l.fullName || l.athleteName || "VĐV",
              bibNumber: l.bibNumber || "BIB-000",
              vscNumber: l.bibNumber || l.participantId,
              team: l.clubId || "Tự Do",
              status: "checked_in",
              scores: {}
            };
          }
        }
      });
      return result;
    }

    // Strategy 2: check if we have live laneStatus for the current heat (and we are querying the current heat)
    if (heatNum === localState.currentHeat && localState.laneStatus) {
      Object.entries(localState.laneStatus).forEach(([lStr, lVal]: [string, any]) => {
        const laneNum = Number(lStr);
        if (laneNum >= 1 && laneNum <= laneLimit) {
          const ath = lVal.athleteId ? activeAthletesList.find(a => a && (
            a.id === lVal.athleteId || 
            (a.participantId && a.participantId === lVal.athleteId) ||
            (a.vscNumber && lVal.athleteId && a.vscNumber === lVal.athleteId)
          )) : null;
          if (ath) {
            result[laneNum - 1] = ath;
          }
        }
      });
      if (result.some(r => r !== null)) {
        return result;
      }
    }

    // Strategy 3: Deterministic slice by BIB order (fallback)
    const startIdx = (heatNum - 1) * laneLimit;
    for (let i = 0; i < laneLimit; i++) {
      const athlete = competingAthletes[startIdx + i];
      if (athlete) {
        result[i] = athlete;
      }
    }
    return result;
  }, [resolvedHeats, localState.heats, localState.currentHeat, localState.laneStatus, activeAthletesList, competingAthletes, localState.laneCount]);



  const getLiveStatsForLane = useCallback((laneNumber: number, athlete: any) => {
    let scoresArray: any[] = [];
    const lane = localState?.laneStatus?.[laneNumber];
    
    // Find if the current heat is solo/resolo
    const currentHeatNum = localState.currentHeat;
    const activeHeatObj = (resolvedHeats || localState?.heats || []).find((h: any) => h.heatNumber === currentHeatNum);
    const isSoloType = activeHeatObj?.heatType === "solo" || activeHeatObj?.heatType === "resolo" || (currentHeatNum && currentHeatNum >= 10000);
    
    const targetLength = activeShotsCountLimit || 10;
    
    const laneScores = lane ? normalizeScoresToArr(lane.scores, targetLength) : [];
    
    let savedScores = athlete && activeDistance ? athlete.scores?.[activeDistance.id] : null;
    if (isSoloType) {
      if (athlete && activeDistance) {
        const soloIdx = getSoloIdxForHeat(currentHeatNum);
        const details = athlete.soloShotDetails?.[activeDistance.id]?.[soloIdx];
        if (details !== undefined) {
          savedScores = details;
        } else {
          savedScores = null;
        }
      } else {
        savedScores = null;
      }
    }
    
    const athleteScores = normalizeScoresToArr(savedScores, targetLength);

    const hasLaneScores = lane && (lane.athleteId === athlete?.id || lane.athleteId === athlete?.participantId) && 
                          laneScores.some(s => s !== null && s !== undefined);
                          
    if (hasLaneScores) {
      scoresArray = laneScores;
    } else if (athlete && activeDistance && savedScores !== null && savedScores !== undefined) {
      scoresArray = athleteScores;
    } else if (lane && (lane.athleteId === athlete?.id || lane.athleteId === athlete?.participantId)) {
      scoresArray = laneScores;
    }

    const mult = Number(activeDistance?.multiplier) || 10;
    const isDirect = activeDistance?.scoringType === "direct" || ((activeDistance as any)?.directMaxPoints > 0);
    const hasNumericScores = scoresArray.some((s: any) => typeof s === "number" && s > 1);

    let hitsCount = 0;
    let rawSum = 0;
    let firedShots = 0;

    scoresArray.forEach((s: any) => {
      if (s !== null && s !== undefined && s !== "") {
        firedShots++;
        if (typeof s === "number") {
          if (s > 0) hitsCount++;
          rawSum += s;
        } else if (s === true || s === "1" || s === "X" || s === "x" || s === "V" || s === "v") {
          hitsCount++;
          rawSum += 1;
        }
      }
    });

    const isDirectModeFinal = isDirect || hasNumericScores;
    const totalPoints = isDirectModeFinal
      ? (rawSum * (Number(activeDistance?.multiplier) || 1))
      : (hitsCount * mult);

    const missCount = firedShots - hitsCount;

    return { firedShots, hitsCount, missCount, totalPoints, mult, isDirect: isDirectModeFinal };
  }, [localState.laneStatus, activeDistance, activeShotsCountLimit, localState.currentHeat, resolvedHeats, localState.heats, getSoloIdxForHeat]);

  const activeSetter = useMemo(() => {
    return competitionMode === "individual" ? setAthletes : setTeamAthletes;
  }, [competitionMode, setAthletes, setTeamAthletes]);

  // Computed live stats using core engines
  const liveRankings = useMemo(() => {
    if (activeAthletesList.length === 0 || distances.length === 0) return [];
    const currentShotsCount = competitionMode === "team" ? (currentTournamentDoc?.teamShotsCount || 10) : (currentTournamentDoc?.shotsCount || 10);
    const currentDirectMaxPoints = competitionMode === "team" ? currentTournamentDoc?.teamDirectMaxPoints : currentTournamentDoc?.directMaxPoints;
    const currentDirectMaxShots = competitionMode === "team" ? currentTournamentDoc?.teamDirectMaxShots : currentTournamentDoc?.directMaxShots;

    return RankingEngine.calculate({
      athletes: activeAthletesList,
      distances: distances as any[],
      tieBreakRule: "highest_distance_multiplier",
      shotsCount: currentShotsCount,
      directMaxPoints: currentDirectMaxPoints,
      directMaxShots: currentDirectMaxShots
    });
  }, [activeAthletesList, distances, competitionMode, currentTournamentDoc?.teamShotsCount, currentTournamentDoc?.shotsCount, currentTournamentDoc?.teamDirectMaxPoints, currentTournamentDoc?.directMaxPoints, currentTournamentDoc?.teamDirectMaxShots, currentTournamentDoc?.directMaxShots]);

  const liveQualification = useMemo(() => {
    if (liveRankings.length === 0) return null;
    return QualificationEngine.evaluate({
      rankedAthletes: liveRankings,
      advancingCount: 16, // Top 16 cutoff rule default
      allowTiesAtBoundary: false // Sudden death Solo shootout by default!
    });
  }, [liveRankings]);

  // Rankings and qualifications calculated on-the-fly per active distance
  const activeDistanceRankings = useMemo(() => {
    if (!activeDistance) return [];

    // If we have a captured snapshot for this stage, use it unless it truncated athletes from an old bug!
    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    const isRoundFinalized = capturedRounds?.[activeDistance.id]?.isFinalized === true || 
                             (localState.workflowStage === "official_result" || localState.workflowStage === "published" || localState.workflowStage === "archived");

    if (isRoundFinalized && capturedRounds?.[activeDistance.id]?.rankingsSnapshot && capturedRounds[activeDistance.id].rankingsSnapshot.length > 0) {
      const snap = capturedRounds[activeDistance.id].rankingsSnapshot;
      const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
      const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);
      const activeEligibleCount = activeAthletesList.filter(a => {
        if (!a) return false;
        if (isAthleteEliminatedInPrevStage(a, activeDistance.id, targetStages)) return false;
        const statusLower = (a.status || "").toString().toLowerCase();
        if (statusLower === "bỏ thi" || statusLower === "dns" || statusLower === "withdrawn") return false;
        return true;
      }).length;
      if (snap.length >= activeEligibleCount) {
        return snap;
      }
    }

    if (activeAthletesList.length === 0) return [];
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);

    // Only rank athletes who are participating in this stage (not eliminated in prior stages or withdrawn)
    const nonEliminated = activeAthletesList.filter(a => {
      if (!a) return false;
      if (isAthleteEliminatedInPrevStage(a, activeDistance.id, targetStages)) {
        return false;
      }
      const statusLower = (a.status || "").toString().toLowerCase();
      if (statusLower === "bỏ thi" || statusLower === "dns" || statusLower === "withdrawn") {
        return false;
      }
      return true;
    });

    // If the active distance is cumulative, we must calculate the rank/score based on all distances
    // from index 0 up to currentDistanceIndex. Otherwise, we only use the activeDistance.
    let calculationDistances: DistanceConfig[] = [activeDistance];
    const isCumulativeActive = activeDistance.isCumulative === true || String(activeDistance.isCumulative) === "true";
    if (isCumulativeActive) {
      const targetStageIndex = targetStages.findIndex(d => d.id === activeDistance.id);
      calculationDistances = targetStageIndex >= 0 ? targetStages.slice(0, targetStageIndex + 1) : [activeDistance];
    }

    const currentShotsCount = competitionMode === "team" ? (currentTournamentDoc?.teamShotsCount || 10) : (currentTournamentDoc?.shotsCount || 10);
    const currentDirectMaxPoints = competitionMode === "team" ? currentTournamentDoc?.teamDirectMaxPoints : currentTournamentDoc?.directMaxPoints;
    const currentDirectMaxShots = competitionMode === "team" ? currentTournamentDoc?.teamDirectMaxShots : currentTournamentDoc?.directMaxShots;

    return RankingEngine.calculate({
      athletes: nonEliminated,
      distances: calculationDistances as any[],
      tieBreakRule: "highest_distance_multiplier",
      shotsCount: currentShotsCount,
      directMaxPoints: currentDirectMaxPoints,
      directMaxShots: currentDirectMaxShots
    });
  }, [activeAthletesList, activeDistance, distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode, currentTournamentDoc?.teamShotsCount, currentTournamentDoc?.shotsCount, currentTournamentDoc?.teamDirectMaxPoints, currentTournamentDoc?.directMaxPoints, currentTournamentDoc?.teamDirectMaxShots, currentTournamentDoc?.directMaxShots, commandCenterState?.capturedRounds]);

  const hasAthleteShotInDist = useCallback((athId: string, distId: string) => {
    const athObj = activeAthletesList.find(a => a && (a.id === athId || a.participantId === athId));
    if (!athObj) return false;

    const distKeys = Array.from(new Set([
      distId,
      activeDistance?.id,
      activeDistance?.distance,
      activeDistance?.name,
      distId?.toLowerCase(),
      activeDistance?.distance?.toLowerCase()
    ].filter(Boolean))) as string[];

    // Check scoreEvents for recorded scores
    const scoreEventsList = (commandCenterState as any)?.scoreEvents || (localState as any)?.scoreEvents || [];
    const hasEvent = scoreEventsList.some((evt: any) => 
      (evt.athleteId === athId || evt.athleteId === athObj.id || evt.athleteBib === athId) && 
      distKeys.some(k => evt.distanceId === k || String(evt.distanceId).toLowerCase().trim() === k.toLowerCase().trim()) && 
      !evt.deleted
    );
    if (hasEvent) return true;

    for (const k of distKeys) {
      const scores = athObj.scores?.[k];
      if (scores !== null && scores !== undefined) {
        if (Array.isArray(scores)) {
          if (scores.length > 0 && scores.some(s => s !== null && s !== undefined)) return true;
        } else if (typeof scores === "object") {
          const sObj = scores as any;
          if (Array.isArray(sObj.shots) && sObj.shots.length > 0 && sObj.shots.some((s: any) => s !== null && s !== undefined)) {
            return true;
          }
          if ((sObj.roundScore !== undefined && sObj.roundScore !== null) || (sObj.roundHits !== undefined && sObj.roundHits !== null)) {
            return true;
          }
        } else {
          return true;
        }
      }
      const soloRounds = getSoloRoundsFromDist(athObj, activeDistance);
      if (soloRounds.length > 0) return true;
    }

    if (commandCenterState?.laneStatus) {
      const isCompletedInLane = Object.values(commandCenterState.laneStatus).some((l: any) => 
        (l?.athleteId === athId || l?.athleteId === athObj.id) && l?.status === "completed"
      );
      if (isCompletedInLane) return true;
    }

    return false;
  }, [activeAthletesList, activeDistance, (commandCenterState as any)?.scoreEvents, commandCenterState?.laneStatus, (localState as any)?.scoreEvents]);

  const hasActiveDistanceShots = useMemo(() => {
    if (!activeDistance) return false;
    const distId = activeDistance.id;
    return activeAthletesList.some(a => a && hasAthleteShotInDist(a.id, distId));
  }, [activeAthletesList, activeDistance, hasAthleteShotInDist]);

  const activeDistanceQualification = useMemo(() => {
    if (!activeDistance) return null;

    // If we have a captured snapshot for this stage, use it!
    const capturedRounds = localState?.capturedRounds || commandCenterState?.capturedRounds;
    const isRoundFinalized = capturedRounds?.[activeDistance.id]?.isFinalized === true || 
                             (localState.workflowStage === "official_result" || localState.workflowStage === "published" || localState.workflowStage === "archived");

    if (isRoundFinalized && capturedRounds?.[activeDistance.id]?.qualificationSnapshot) {
      return capturedRounds[activeDistance.id].qualificationSnapshot;
    }

    if (activeDistanceRankings.length === 0) return null;
    
    // If no athlete in the active distance has shot yet, do not evaluate shootout ties
    if (!hasActiveDistanceShots) {
      return {
        qualified: activeDistanceRankings,
        eliminated: [],
        pendingSoloShootout: [],
        cutoffScore: 0
      };
    }

    const isElim = activeDistance.isElimination === true || String(activeDistance.isElimination) === "true";
    let advancingCount = activeDistanceRankings.length;
    
    if (isElim) {
      const elimType = String(activeDistance.eliminationType).trim().toLowerCase();
      const elimVal = Number(activeDistance.eliminationValue);
      if (elimType === "count") {
        advancingCount = elimVal || 16;
      } else if (elimType === "percent" || elimType === "percentage") {
        const pct = elimVal || 50;
        advancingCount = Math.max(1, Math.round((activeDistanceRankings.length * pct) / 100));
      }
    }

    // Secondary fallback check for ruleEngineSettings
    const ruleObj = (currentTournamentDoc as any)?.ruleEngineSettings?.[activeDistance.id] || (localState as any)?.ruleEngineSettings?.[activeDistance.id];
    if (ruleObj) {
      if (ruleObj.cutoffType === "top_n") {
        advancingCount = Number(ruleObj.cutoffValue) || advancingCount;
      } else if (ruleObj.cutoffType === "percentage") {
        const pct = Number(ruleObj.cutoffValue) || 100;
        advancingCount = Math.max(1, Math.round((activeDistanceRankings.length * pct) / 100));
      }
    }

    const evalResult = QualificationEngine.evaluate({
      rankedAthletes: activeDistanceRankings,
      advancingCount,
      allowTiesAtBoundary: !activeDistance.isSolo
    });

    // Filter to ensure anyone who has not shot is excluded from qualified/pending and placed in eliminated (only if isElim is true)
    const finalQualified: any[] = [];
    const finalEliminated: any[] = [...evalResult.eliminated];
    const finalPendingSoloShootout: any[] = [];

    evalResult.qualified.forEach((ath) => {
      const athleteHasShot = hasAthleteShotInDist(ath.athleteId, activeDistance.id);
      if (athleteHasShot || !isElim) {
        finalQualified.push(ath);
      } else {
        finalEliminated.push(ath);
      }
    });

    evalResult.pendingSoloShootout.forEach((ath) => {
      const athleteHasShot = hasAthleteShotInDist(ath.athleteId, activeDistance.id);
      if (athleteHasShot || !isElim) {
        finalPendingSoloShootout.push(ath);
      } else {
        finalEliminated.push(ath);
      }
    });

    return {
      qualified: finalQualified,
      eliminated: finalEliminated,
      pendingSoloShootout: finalPendingSoloShootout,
      cutoffScore: evalResult.cutoffScore
    };
  }, [activeDistanceRankings, activeDistance, hasActiveDistanceShots, hasAthleteShotInDist, commandCenterState?.capturedRounds]);

  const activeSoloColumns = useMemo(() => {
    if (!activeDistance) return [];
    const distId = activeDistance.id;
    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);
    const distanceIdx = targetStages.findIndex(d => d.id === distId);

    const existingHeatsSource = [
      ...(localState.heats || []),
      ...(resolvedHeats || []),
      ...((commandCenterState as any)?.heats || []),
      ...((currentTournamentDoc as any)?.heats || [])
    ];

    const soloHeatMap = new Map<number, any>();
    existingHeatsSource.forEach(h => {
      if (!h || !h.heatNumber) return;
      const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
      const isSameStage = h.stageId === distId || h.distanceId === distId || h.stageId === activeDistance?.id || 
        (isTeam 
          ? (h.heatNumber >= (distanceIdx + 1) * 1100 && h.heatNumber < (distanceIdx + 2) * 1100)
          : (h.heatNumber >= (distanceIdx + 1) * 100 && h.heatNumber < (distanceIdx + 2) * 100)
        ) ||
        (!h.stageId && !h.distanceId && distanceIdx === 0);
      if (isSoloType && isSameStage) {
        soloHeatMap.set(h.heatNumber, h);
      }
    });

    const sortedSoloHeatsCount = soloHeatMap.size;

    let maxAthRounds = 0;
    const sourceAthletes = isTeam
      ? (leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes)
      : (leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes);

    const allAthletesPool = isTeam
      ? [
          ...activeAthletesList.filter(a => a && a.isPrimaryTeam),
          ...(sourceAthletes || []),
          ...((localState as any).teamAthletes || [])
        ]
      : [
          ...activeAthletesList,
          ...activeDistanceRankings.map(r => r.originalAthlete || r)
        ];

    const checkAth = (ath: any) => {
      if (!ath) return;
      const athleteId = ath.id || ath.athleteId || ath.participantId;
      const targetAthlete = (isTeam ? [
        ...(leaderboardTeamAthletes || []),
        ...(teamAthletes || [])
      ] : [
        ...(leaderboardAthletes || []),
        ...(athletes || [])
      ]).find(a => a && (a.id === athleteId || (a.participantId && a.participantId === athleteId))) || ath;

      const targetDistConfig = (distances || []).find(d => d.id === activeDistance?.id) || 
                                (teamDistances || []).find(d => d.id === activeDistance?.id) || 
                                activeDistance;

      const rounds = getSoloRoundsFromDist(targetAthlete, targetDistConfig as any);
      if (rounds && rounds.length > maxAthRounds) {
        maxAthRounds = rounds.length;
      }
      if (targetDistConfig?.id && targetAthlete.soloHits?.[targetDistConfig.id] !== undefined && targetAthlete.soloHits?.[targetDistConfig.id] !== null) {
        if (maxAthRounds < 1) maxAthRounds = 1;
      }
    };

    allAthletesPool.forEach(checkAth);

    activeDistanceRankings.forEach(r => {
      checkAth(r.originalAthlete);
      checkAth(r);
    });

    const hasPendingSolo = isTeam ? false : (activeDistanceQualification?.pendingSoloShootout && activeDistanceQualification.pendingSoloShootout.length > 0);
    const minCols = isTeam ? 0 : ((activeDistance?.isSolo || (activeDistance as any)?.isResolo || hasPendingSolo) ? 1 : 0);
    const totalColsCount = Math.max(minCols, sortedSoloHeatsCount, maxAthRounds);
    const cols = [];
    for (let i = 0; i < totalColsCount; i++) {
      cols.push(i);
    }
    return cols;
  }, [
    activeDistance,
    activeDistanceRankings,
    activeAthletesList,
    athletes,
    teamAthletes,
    leaderboardAthletes,
    leaderboardTeamAthletes,
    (localState as any).athletes,
    (localState as any).teamAthletes,
    localState.heats,
    resolvedHeats,
    commandCenterState?.heats,
    (currentTournamentDoc as any)?.heats,
    distances,
    teamDistances,
    (currentTournamentDoc as any)?.teamDistances,
    localState.workflowStage,
    competitionMode,
    activeDistanceQualification
  ]);

  const nextSoloHeatInfo = useMemo(() => {
    if (!activeDistance) return { heatNumber: 101, heatName: "Lượt Solo #101" };

    const targetIsTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetDistances = targetIsTeam
      ? (teamDistances || currentTournamentDoc?.teamDistances || distances)
      : distances;
    const distanceIdx = targetDistances.findIndex(d => d.id === activeDistance.id);
    const roundNumber = distanceIdx >= 0 ? distanceIdx + 1 : 1;

    const existingHeatsSource = [
      ...(localState.heats || []),
      ...(resolvedHeats || []),
      ...(commandCenterState?.heats || [])
    ];

    const heatMap = new Map<number, any>();
    existingHeatsSource.forEach(h => {
      if (!h || !h.heatNumber) return;
      const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
      const isSameStage = h.stageId === activeDistance.id || h.distanceId === activeDistance.id || 
        (targetIsTeam 
          ? (h.heatNumber >= (distanceIdx + 1) * 110000 && h.heatNumber < (distanceIdx + 2) * 110000)
          : (h.heatNumber >= (distanceIdx + 1) * 100 && h.heatNumber < (distanceIdx + 2) * 100)
        ) || (!h.stageId && !h.distanceId && distanceIdx === 0);
      if (isSoloType && isSameStage) {
        heatMap.set(h.heatNumber, h);
      }
    });

    const sortedSoloHeats = Array.from(heatMap.values()).sort((a, b) => (a.heatNumber || 0) - (b.heatNumber || 0));

    if (sortedSoloHeats.length === 0) {
      const heatNum = targetIsTeam ? (roundNumber * 1100 + 1) : (roundNumber * 100 + 1);
      return { heatNumber: heatNum, heatName: `Lượt Solo #${heatNum}` };
    }

    const latestHeat = sortedSoloHeats[sortedSoloHeats.length - 1];
    
    let currentSoloRoundIndex = 1;
    if (latestHeat && latestHeat.heatNumber) {
      if (latestHeat.heatNumber > 10000) {
        const base = Math.floor(latestHeat.heatNumber / 100);
        currentSoloRoundIndex = base % 100;
      } else {
        currentSoloRoundIndex = latestHeat.heatNumber % 100;
      }
    }

    const latestSoloRoundIdx = currentSoloRoundIndex - 1;

    const sourceAthletesForCheck1 = leaderboardAthletes && leaderboardAthletes.length > 0 ? leaderboardAthletes : athletes;
    const allAthletesToCheck = [...activeAthletesList, ...(sourceAthletesForCheck1 || [])];
    const hasAthScores = allAthletesToCheck.some(ath => {
      if (!ath) return false;
      const rounds = getSoloRoundsFromDist(ath, activeDistance);
      if (rounds && typeof rounds[latestSoloRoundIdx] === "number" && rounds[latestSoloRoundIdx] >= 0) {
        return true;
      }
      return false;
    });

    // Check if ANY of the heats for the current solo round have scores
    const targetRoundNumberBase = targetIsTeam ? (roundNumber * 1100 + currentSoloRoundIndex) : (roundNumber * 100 + currentSoloRoundIndex); // e.g. 1101 or 301
    const heatsInThisRound = sortedSoloHeats.filter(h => {
      if (h.heatNumber > 10000) {
        return Math.floor(h.heatNumber / 100) === targetRoundNumberBase;
      }
      return (h.heatNumber % 100) === currentSoloRoundIndex;
    });

    const hasLaneScores = heatsInThisRound.some(h => h.lanes && h.lanes.some((l: any) => Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined)));

    const hasLiveScores = heatsInThisRound.some(h => {
      if (localState.currentHeat === h.heatNumber && localState.laneStatus) {
        return Object.values(localState.laneStatus).some((l: any) => l && Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined));
      }
      if (commandCenterState?.currentHeat === h.heatNumber && commandCenterState?.laneStatus) {
        return Object.values(commandCenterState.laneStatus).some((l: any) => l && Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined));
      }
      return false;
    });

    const isScored = hasAthScores || hasLaneScores || hasLiveScores;

    if (!isScored) {
      const heatNum = targetIsTeam ? (roundNumber * 1100 + currentSoloRoundIndex) : (roundNumber * 100 + currentSoloRoundIndex);
      const isResolo = currentSoloRoundIndex > 1;
      return { heatNumber: heatNum, heatName: isResolo ? `Lượt Re-Solo #${heatNum}` : `Lượt Solo #${heatNum}` };
    } else {
      const nextSoloRoundIndex = currentSoloRoundIndex + 1;
      const heatNum = targetIsTeam ? (roundNumber * 1100 + nextSoloRoundIndex) : (roundNumber * 100 + nextSoloRoundIndex);
      const isResolo = nextSoloRoundIndex > 1;
      return { heatNumber: heatNum, heatName: isResolo ? `Lượt Re-Solo #${heatNum}` : `Lượt Solo #${heatNum}` };
    }
  }, [activeDistance, localState.heats, localState.currentHeat, localState.laneStatus, resolvedHeats, commandCenterState?.heats, commandCenterState?.laneStatus, commandCenterState?.currentHeat, activeAthletesList, athletes, distances, teamDistances, currentTournamentDoc?.teamDistances, localState.workflowStage, competitionMode]);

  const getMappedStageForUI = (stage: string): string => {
    if (stage === "team_competition") return "competition";
    if (stage === "official_result" || stage === "published") return "ranking";
    return stage;
  };

  // Stage definition with descriptive labels, icons, and status matching
  const stagesList: { stage: TimelineStage; label: string; desc: string }[] = [
    { stage: "registration", label: "Đăng Ký", desc: "Mở nhận hồ sơ VĐV" },
    { stage: "check_in", label: "Điểm Danh", desc: "Điểm danh & xếp bệ bắn" },
    { stage: "competition", label: "Thi Đấu", desc: "Cá nhân & Đồng đội" },
    { stage: "ranking", label: "Tổng Kết & Công Bố", desc: "Bảng vàng & Công bố" },
    { stage: "archived", label: "Lưu Trữ", desc: "Đóng băng dữ liệu" }
  ];

  // Quick Action: Freeze checked-in athletes & assign BIB numbers sequentially
  const handleFreezeAndAssignBibs = async () => {
    if (userRole !== "admin") return;
    if (!window.confirm("Xác nhận ĐÓNG BĂNG danh sách vận động viên và cấp số hiệu BIB tự động?")) return;

    const targetAthletes = deduplicatedAthletes.length > 0 ? deduplicatedAthletes : activeAthletesList;

    // Extract all pre-existing BIBs to avoid duplicates
    const preExistingBibs = new Set(
      targetAthletes
        .map(a => a.bibNumber)
        .filter(Boolean) as string[]
    );

    let bibCounter = 1;
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    const getNextAvailableBib = () => {
      while (true) {
        const bib = `BIB-${pad(bibCounter++, 3)}`;
        if (!preExistingBibs.has(bib)) {
          return bib;
        }
      }
    };

    const updated = targetAthletes.map(ath => {
      const isCheckedIn = !isInactive(ath);
      const nextStatus = isCheckedIn
        ? (ath.status === "Thi đấu" ? "checked_in" : (ath.status || "checked_in"))
        : (ath.status === "Bỏ thi" ? "dns" : (ath.status || "dns"));
      const nextCheckInStatus = ath.checkInStatus || (isCheckedIn ? "checked_in" : "pending");

      if (ath.bibNumber) {
        return {
          ...ath,
          idCard: ath.bibNumber,
          status: nextStatus,
          checkInStatus: nextCheckInStatus
        };
      }
      const generatedBib = getNextAvailableBib();
      return {
        ...ath,
        idCard: generatedBib, // Assign BIB to idCard/BIB field
        bibNumber: generatedBib, // Standard BIB
        status: nextStatus,
        checkInStatus: nextCheckInStatus
      };
    });

    await activeSetterAndCloud(updated);
    handleTransitionTo("competition");
    addAuditLog("FREEZE_ATHLETES", "Đóng băng danh sách đăng ký. Cập nhật trạng thái điểm danh và chuyển sang vòng thi đấu.");
    showToast("success", "Chốt sổ", "Đã hoàn tất đóng băng, chuyển sang thi đấu cá nhân!");
  };

  // Quick Action: Generate shooting order and lane allocations using AssignmentEngine
  const handleGenerateLanesAndHeats = () => {
    if (userRole !== "admin") return;
    if (!window.confirm("Xác nhận chạy AssignmentEngine để chia bệ bắn và phân bổ Trọng tài?")) return;

    const targetAthletes = deduplicatedAthletes.length > 0 ? deduplicatedAthletes : activeAthletesList;

    // Convert athletes to Participant format expected by AssignmentEngine
    const participants = targetAthletes.map(ath => ({
      participantId: ath.id,
      fullName: ath.name,
      bibNumber: ath.bibNumber || `BIB-${ath.id}`,
      clubId: ath.team,
      status: isInactive(ath) ? "eliminated" : "checked_in"
    }));

    const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
    const targetStages = isTeam ? (teamDistances || currentTournamentDoc?.teamDistances || []) : (distances || []);
    const targetStageIndex = activeDistance ? targetStages.findIndex((d: any) => d.id === activeDistance.id) : 0;
    const isFirstStage = targetStageIndex === 0;

    try {
      let assignmentResult;
      if (isTeam) {
        const teamModeMode = localState.teamAssignmentMode || "parallel";
        const sourceVersions = localState.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || [];
        const matchingVer = sourceVersions.find((v: any) => v.stageId === activeDistance?.id);
        const targetStrategy = matchingVer?.strategy?.startsWith("team_") ? matchingVer.strategy : `team_${teamModeMode}`;

        assignmentResult = AssignmentEngine.generateTeamAssignments(participants as any[], {
          lanesCount: localState.laneCount,
          refereeIds: ["referee_01", "referee_02", "referee_03"],
          strategy: targetStrategy,
          tournamentId: activeHistoryId || "tour-temp",
          stageId: activeDistance?.id || "d1",
          roundId: "r1"
        });
      } else {
        assignmentResult = AssignmentEngine.generateAssignments(participants as any[], {
          lanesCount: localState.laneCount,
          refereeIds: ["referee_01", "referee_02", "referee_03"],
          strategy: isFirstStage ? "sequential" : "snake",
          clubSeparation: isFirstStage ? false : true
        });
      }

      // Map the generated assignments of Heat 1 into active lanes monitor
      const heat1 = assignmentResult.heats.find(h => h.heatNumber === 1);
      const newLanes: Record<number, any> = {};
      
      for (let i = 1; i <= localState.laneCount; i++) {
        const assignedLane = heat1?.lanes.find(l => l.laneNumber === i);
        newLanes[i] = {
          athleteId: assignedLane?.participantId || null,
          refereeId: assignedLane?.refereeId || "Trọng tài bàn",
          status: assignedLane ? "preparing" : "idle",
          scores: Array(shotsCountLimit).fill(null)
        };
      }

      setLocalState(prev => {
        const updatedCaptured = { ...(prev.capturedRounds || {}) };
        if (activeDistance) {
          updatedCaptured[activeDistance.id] = {
            ...(updatedCaptured[activeDistance.id] || {}),
            heatsSnapshot: assignmentResult.heats,
            laneStatusSnapshot: newLanes
          };
        }
        return {
          ...prev,
          heats: assignmentResult.heats,
          laneStatus: newLanes,
          capturedRounds: updatedCaptured,
          currentHeat: 1
        };
      });

      handleTransitionTo("competition");
      addAuditLog("ASSIGNMENT_ENGINE", `Đã chạy AssignmentEngine (Thuật toán Snake - Phân bổ ${assignmentResult.totalHeats} lượt bắn).`);
      showToast("success", "Xếp bệ bắn", `Phân chia lượt bắn thành công! Chuyển sang Thi đấu cá nhân. Tổng số lượt bắn: ${assignmentResult.totalHeats}`);
    } catch (err: any) {
      showToast("error", "Lỗi xếp bệ", `Lỗi phân bổ bệ bắn: ${err.message}`);
    }
  };

  // Randomized Draw (BIB sequential number generation & Heat/Lane Assignment in one click)
  const handleRandomizeAndAssign = async () => {
    if (userRole !== "admin") return;
    if (!window.confirm("Xác nhận chạy bốc thăm ngẫu nhiên (Random): Hệ thống sẽ xáo trộn VĐV, tự động cấp số hiệu BIB và xếp bệ/lượt bắn ngay lập tức?")) return;

    const targetAthletes = deduplicatedAthletes.length > 0 ? deduplicatedAthletes : activeAthletesList;

    // Filter checked-in / active athletes (excluding with status === "Bỏ thi")
    const activeAthletes = targetAthletes.filter(a => !isInactive(a));
    const inactiveAthletes = targetAthletes.filter(a => isInactive(a));

    if (activeAthletes.length === 0) {
      showToast("error", "Lỗi bốc thăm", "Không có vận động viên nào sẵn sàng thi đấu để bốc thăm!");
      return;
    }

    // Shuffle active athletes randomly and automatically separate clubs BEFORE assigning BIBs
    const rawShuffledActive = [...activeAthletes].sort(() => Math.random() - 0.5);

    const applyClubSeparationToAthletes = (list: any[]) => {
      if (list.length <= 2) return list;
      const result: any[] = [];
      const pool = [...list];
      result.push(pool.shift()!);
      while (pool.length > 0) {
        const lastPlaced = result[result.length - 1];
        const lastClub = lastPlaced.team || lastPlaced.clubName || lastPlaced.clubId || "";
        let foundIndex = -1;
        for (let i = 0; i < pool.length; i++) {
          const itemClub = pool[i].team || pool[i].clubName || pool[i].clubId || "";
          if (!lastClub || itemClub !== lastClub) {
            foundIndex = i;
            break;
          }
        }
        if (foundIndex !== -1) {
          result.push(pool.splice(foundIndex, 1)[0]);
        } else {
          result.push(pool.shift()!);
        }
      }
      return result;
    };

    const shuffledActive = applyClubSeparationToAthletes(rawShuffledActive);

    // Extract all pre-existing BIBs from any athlete that has already drawn one (self-drawn or manually assigned)
    const preExistingBibs = new Set(
      targetAthletes
        .map(a => a.bibNumber)
        .filter(Boolean) as string[]
    );

    let bibCounter = 1;
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    const getNextAvailableBib = () => {
      while (true) {
        const bib = `BIB-${pad(bibCounter++, 3)}`;
        if (!preExistingBibs.has(bib)) {
          return bib;
        }
      }
    };

    const updatedActive = shuffledActive.map(ath => {
      const nextStatus = ath.status === "Thi đấu" ? "checked_in" : (ath.status || "checked_in");
      const nextCheckInStatus = ath.checkInStatus || (nextStatus === "checked_in" ? "checked_in" : "pending");

      if (ath.bibNumber) {
        return {
          ...ath,
          idCard: ath.bibNumber,
          status: nextStatus,
          checkInStatus: nextCheckInStatus,
          currentStageIndex: 0
        };
      }
      const generatedBib = getNextAvailableBib();
      return {
        ...ath,
        idCard: generatedBib, // Compatibility fallback
        bibNumber: generatedBib, // Standard BIB
        status: nextStatus,
        checkInStatus: nextCheckInStatus,
        currentStageIndex: 0
      };
    });

    // Mark inactive ones with sequential BIB values too
    const updatedInactive = inactiveAthletes.map(ath => {
      const nextStatus = ath.status === "Bỏ thi" ? "dns" : (ath.status || "dns");
      const nextCheckInStatus = ath.checkInStatus || "pending";

      if (ath.bibNumber) {
        return {
          ...ath,
          idCard: ath.bibNumber,
          status: nextStatus,
          checkInStatus: nextCheckInStatus
        };
      }
      const generatedBib = getNextAvailableBib();
      return {
        ...ath,
        idCard: generatedBib, // Compatibility fallback
        bibNumber: generatedBib, // Standard BIB
        status: nextStatus,
        checkInStatus: nextCheckInStatus
      };
    });

    const finalAthletesList = [...updatedActive, ...updatedInactive];

    try {
      // Sync list to database & local state
      await activeSetterAndCloud(finalAthletesList);

      // Generate assignments
      const participantsForEngine = updatedActive.map(ath => ({
        participantId: ath.id || ath.participantId,
        fullName: ath.name || ath.fullName,
        bibNumber: getCleanBibNumber(ath.bibNumber || ath.idCard, ath.id || ath.participantId),
        clubId: ath.team || ath.clubName,
        status: "checked_in",
        checkInStatus: "checked_in"
      }));

      let assignmentResult;
      const isTeam = (localState.workflowStage === "team_competition" || competitionMode === "team");
      if (isTeam) {
        const teamModeMode = localState.teamAssignmentMode || "parallel";
        const sourceVersions = localState.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || [];
        const matchingVer = sourceVersions.find((v: any) => v.stageId === activeDistance?.id);
        const targetStrategy = matchingVer?.strategy?.startsWith("team_") ? matchingVer.strategy : `team_${teamModeMode}`;

        assignmentResult = AssignmentEngine.generateTeamAssignments(participantsForEngine as any[], {
          lanesCount: localState.laneCount,
          refereeIds: ["referee_01", "referee_02", "referee_03"],
          strategy: targetStrategy,
          tournamentId: activeHistoryId || "tour-temp",
          stageId: activeDistance?.id || "d1",
          roundId: "r1"
        });
      } else {
        assignmentResult = AssignmentEngine.generateAssignments(participantsForEngine as any[], {
          lanesCount: localState.laneCount,
          refereeIds: ["referee_01", "referee_02", "referee_03"],
          strategy: "sequential",
          clubSeparation: false
        });
      }

      // Map generated assignments of Heat 1 into active lanes monitor
      const heat1 = assignmentResult.heats.find(h => h.heatNumber === 1);
      const newLanes: Record<number, any> = {};
      
      for (let i = 1; i <= localState.laneCount; i++) {
        const assignedLane = heat1?.lanes.find(l => l.laneNumber === i);
        newLanes[i] = {
          athleteId: assignedLane?.participantId || null,
          refereeId: assignedLane?.refereeId || "Trọng tài bàn",
          status: assignedLane ? "preparing" : "idle",
          scores: Array(shotsCountLimit).fill(null)
        };
      }

      setLocalState(prev => {
        const updatedCaptured = { ...(prev.capturedRounds || {}) };
        if (activeDistance) {
          updatedCaptured[activeDistance.id] = {
            ...(updatedCaptured[activeDistance.id] || {}),
            heatsSnapshot: assignmentResult.heats,
            laneStatusSnapshot: newLanes
          };
        }
        return {
          ...prev,
          heats: assignmentResult.heats,
          laneStatus: newLanes,
          capturedRounds: updatedCaptured,
          currentHeat: 1
        };
      });

      handleTransitionTo("competition");
      
      addAuditLog("RANDOM_DRAW_COMPLETE", `Đã bốc thăm ngẫu nhiên & xếp bệ thi đấu cho ${updatedActive.length} VĐV.`);
      showToast("success", "Thành công", `Bốc thăm ngẫu nhiên, cấp số hiệu BIB thành công! Chuyển sang Thi đấu cá nhân. Tổng số lượt bắn: ${assignmentResult.totalHeats}`);
    } catch (err: any) {
      showToast("error", "Lỗi bốc thăm", `Lỗi bốc thăm/xếp bệ: ${err.message}`);
    }
  };

  // Generate Team Assignments (Lập Lượt Bắn & Sắp Xếp Bệ Bắn Đồng Đội)
  const handleGenerateTeamAssignments = async (mode: "parallel" | "sequential") => {
    if (userRole !== "admin") return;
    if (!window.confirm(`Xác nhận sắp xếp bệ bắn đồng đội theo phương án: ${mode === "parallel" ? "Bắn đồng thời (Song song)" : "Bắn nối tiếp (Tuần tự)"}?`)) return;

    // Filter checked-in / active team athletes (primary and not with status === "Bỏ thi")
    const activeTeamAthletes = teamAthletes.filter(a => a.isPrimaryTeam && a.status !== "Bỏ thi" && !isNoTeam(a.team || a.clubName));

    if (activeTeamAthletes.length === 0) {
      showToast("error", "Lỗi sắp xếp", "Không có vận động viên bắn chính nào của các đội sẵn sàng thi đấu!");
      return;
    }

    // Group active athletes by team name
    const teamsMap: Record<string, typeof activeTeamAthletes> = {};
    activeTeamAthletes.forEach(ath => {
      const teamName = ath.team || "Không có Đội";
      if (!teamsMap[teamName]) {
        teamsMap[teamName] = [];
      }
      teamsMap[teamName].push(ath);
    });

    const teamNames = Object.keys(teamsMap);
    const lanesCount = localState.laneCount || 8;
    const generatedHeats: any[] = [];

    if (mode === "parallel") {
      let currentHeatNum = 1;
      let currentLaneNum = 1;
      let currentLanesList: any[] = [];

      teamNames.forEach((teamName) => {
        const members = teamsMap[teamName] || [];
        if (members.length === 0) return;

        // Check if this team fits in the current heat
        if (currentLaneNum + members.length - 1 > lanesCount) {
          if (currentLanesList.length > 0) {
            generatedHeats.push({
              heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              heatNumber: currentHeatNum,
              tournamentId: activeHistoryId || "tour-temp",
              stageId: activeDistance?.id || "d1",
              roundId: "r1",
              status: "pending",
              heatName: `Lượt bắn Đồng Đội ${currentHeatNum} (Song song)`,
              lanes: currentLanesList
            });
            currentHeatNum++;
          }
          currentLaneNum = 1;
          currentLanesList = [];
        }

        // Place members on consecutive/adjacent lanes
        members.forEach((athlete) => {
          currentLanesList.push({
            laneNumber: currentLaneNum,
            participantId: athlete.id,
            fullName: athlete.name,
            bibNumber: athlete.bibNumber || `BIB-${athlete.id}`,
            clubId: athlete.team,
            refereeId: `referee_${(currentLaneNum - 1) % 3 + 1}`,
            shootingOrder: 1
          });
          currentLaneNum++;
        });
      });

      // Push last heat
      if (currentLanesList.length > 0) {
        generatedHeats.push({
          heatId: `heat-team-p-${currentHeatNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          heatNumber: currentHeatNum,
          tournamentId: activeHistoryId || "tour-temp",
          stageId: activeDistance?.id || "d1",
          roundId: "r1",
          status: "pending",
          heatName: `Lượt bắn Đồng Đội ${currentHeatNum} (Song song)`,
          lanes: currentLanesList
        });
      }
    } else {
      let blockCounter = 0;
      const maxTeamSize = Math.max(...teamNames.map(name => (teamsMap[name] || []).length), 1);
      let seqHeatNum = 1;

      for (let i = 0; i < teamNames.length; i += lanesCount) {
        const blockTeams = teamNames.slice(i, i + lanesCount);
        blockCounter++;

        for (let shooterIdx = 0; shooterIdx < maxTeamSize; shooterIdx++) {
          const lanesList: any[] = [];

          blockTeams.forEach((teamName, laneIdx) => {
            const laneNum = laneIdx + 1;
            const members = teamsMap[teamName] || [];
            const athlete = members[shooterIdx];

            if (athlete) {
              lanesList.push({
                laneNumber: laneNum,
                participantId: athlete.id,
                fullName: athlete.name,
                bibNumber: athlete.bibNumber || `BIB-${athlete.id}`,
                clubId: athlete.team,
                refereeId: `referee_${(laneNum - 1) % 3 + 1}`,
                shootingOrder: shooterIdx + 1
              });
            }
          });

          if (lanesList.length > 0) {
            const currentHeatNumber = seqHeatNum++;
            const heatId = `heat-team-s-${currentHeatNumber}-${Date.now()}`;
            generatedHeats.push({
              heatId,
              heatNumber: currentHeatNumber,
              tournamentId: activeHistoryId || "tour-temp",
              stageId: activeDistance?.id || "d1",
              roundId: "r1",
              status: "pending",
              heatName: `Loạt bắn Đồng Đội ${currentHeatNumber} (Nối tiếp - VĐV ${shooterIdx + 1})`,
              lanes: lanesList
            });
          }
        }
      }
    }

    if (generatedHeats.length === 0) {
      showToast("error", "Lỗi sắp xếp", "Không tạo được lượt đấu đồng đội nào!");
      return;
    }

    // Set Heats and active lanes
    const heat1 = generatedHeats.find(h => h.heatNumber === 1);
    const newLanes: Record<number, any> = {};
    
    for (let i = 1; i <= lanesCount; i++) {
      const assignedLane = heat1?.lanes.find(l => l.laneNumber === i);
      newLanes[i] = {
        athleteId: assignedLane?.participantId || null,
        refereeId: assignedLane?.refereeId || "Trọng tài bàn",
        status: assignedLane ? "preparing" : "idle",
        scores: Array(shotsCountLimit).fill(null)
      };
    }

    setLocalState(prev => {
      const updatedCaptured = { ...(prev.capturedRounds || {}) };
      if (activeDistance) {
        updatedCaptured[activeDistance.id] = {
          ...(updatedCaptured[activeDistance.id] || {}),
          heatsSnapshot: generatedHeats,
          laneStatusSnapshot: newLanes
        };
      }
      return {
        ...prev,
        heats: generatedHeats,
        laneStatus: newLanes,
        capturedRounds: updatedCaptured,
        currentHeat: 1
      };
    });

    addAuditLog("TEAM_ASSIGNMENT_COMPLETE", `Đã lập lịch bệ bắn đồng đội (${mode === "parallel" ? "Song song" : "Nối tiếp"}) cho ${activeTeamAthletes.length} VĐV.`);
    showToast("success", "Thành công", `Đã lập bệ bắn đồng đội thành công! Tổng số lượt bắn: ${generatedHeats.length}`);
  };

  // Quick Action: Activate shooting lane
  const handleActivateLane = (laneNumber: number) => {
    setLocalState(prev => {
      const target = prev.laneStatus[laneNumber];
      if (!target || !target.athleteId) return prev;
      return {
        ...prev,
        laneStatus: {
          ...prev.laneStatus,
          [laneNumber]: {
            ...target,
            status: target.status === "active" ? "preparing" : "active"
          }
        }
      };
    });
    addAuditLog("LANE_ACTIVATION", `Kích hoạt/Tạm dừng bệ bắn số ${laneNumber}.`);
  };

  // Quick Action: Log score for a lane
  const [editingLane, setEditingLane] = useState<number | null>(null);
  const [editingScores, setEditingScores] = useState<(number | boolean | null)[]>([]);
  const [checkInSearch, setCheckInSearch] = useState("");

  const openQuickScorePanel = (laneNum: number) => {
    const lane = localState.laneStatus[laneNum];
    if (!lane || !lane.athleteId) return;
    setEditingLane(laneNum);
    setEditingScores([...(lane.scores || [])]);
  };

  const handleSaveQuickScoreLocal = async () => {
    if (editingLane === null) return;
    await handleSaveQuickScore(editingLane, editingScores);
    setEditingLane(null);
  };

  // Quick Action: Freeze Ranking
  const handleFreezeRanking = () => {
    if (userRole !== "admin") return;
    if (!window.confirm("Đóng băng bảng phân hạng? Dữ liệu điểm số vòng loại sẽ khóa lại.")) return;

    handleTransitionTo("ranking");
    addAuditLog("RANKING_FREEZE", "Đóng băng bảng phân hạng chính thức. Khóa toàn bộ chỉnh sửa điểm số cự ly hiện tại.");
    showToast("success", "Khóa bảng điểm", "Bảng xếp hạng đã được đóng băng!");
  };

  // Quick Action: Run Qualification cutoffs for the current distance
  const handleRunQualification = async () => {
    if (userRole !== "admin") return;
    if (!activeDistance) {
      showToast("error", "Lỗi lọc", "Không tìm thấy cự ly hoạt động!");
      return;
    }

    const isTeam = (localState.competitionActiveTab === "team" || localState.workflowStage === "team_competition" || competitionMode === "team");

    if (isTeam) {
      // TEAM MODE QUALIFICATION/CUTOFF LOGIC
      // 1. Calculate live team rankings
      const teamScores: Record<string, { teamName: string; totalScore: number; members: any[]; teamSoloScores: number[] }> = {};
      const activeTeamAthletes = activeAthletesList.filter(a => a && a.isPrimaryTeam === true && !isNoTeam(a.team || a.clubName || a.clubId || ""));
      
      activeTeamAthletes.forEach(ath => {
        if (ath.status === "Bỏ thi") return;
        const teamName = ath.team || "Không rõ Đội";
        
        let calculationDistances = [activeDistance];
        const isCumulativeActive = activeDistance?.isCumulative === true || String(activeDistance?.isCumulative) === "true";
        if (isCumulativeActive && teamDistances) {
          calculationDistances = teamDistances.slice(0, localState.currentDistanceIndex + 1);
        }
        
        let totalPoints = 0;
        calculationDistances.forEach(dist => {
          if (!dist) return;
          const scoresObj = (ath.scores?.[dist.id] || {}) as any;
          const shotsList = Array.isArray(scoresObj) ? scoresObj : (scoresObj?.shots || []);
          shotsList.forEach((shot: any) => {
            if (shot === true || shot === 1 || String(shot) === "true") {
              totalPoints += (dist.multiplier || 1);
            } else if (typeof shot === "number") {
              totalPoints += shot * (dist.multiplier || 1);
            }
          });
        });

        // Get athlete's solo scores
        const soloRoundsArr = (() => {
          const targetDistConfig = (teamDistances || []).find(d => d.id === activeDistance?.id) || activeDistance;
          if (!ath || !targetDistConfig) return [];
          const rounds = getSoloRoundsFromDist(ath, targetDistConfig);
          if (rounds && rounds.length > 0) return rounds;

          const targetDistId = targetDistConfig.id || "";
          const directHitsVal = ath.soloHits?.[targetDistId];
          if (directHitsVal !== undefined && directHitsVal !== null) {
            return [Number(directHitsVal)];
          }
          return [];
        })();

        if (!teamScores[teamName]) {
          teamScores[teamName] = { teamName, totalScore: 0, members: [], teamSoloScores: [] };
        }
        teamScores[teamName].members.push({
          id: ath.id,
          name: ath.name,
          score: totalPoints,
          soloScores: soloRoundsArr
        });
      });

      Object.keys(teamScores).forEach(k => {
        const team = teamScores[k];
        team.totalScore = team.members.reduce((acc, m) => acc + m.score, 0);
        
        const clubSoloScores: number[] = [];
        activeSoloColumns.forEach(sIdx => {
          const sumSoloForColumn = team.members.reduce((acc, m) => {
            const val = m.soloScores[sIdx];
            return acc + (typeof val === "number" ? val : 0);
          }, 0);
          clubSoloScores.push(sumSoloForColumn);
        });
        team.teamSoloScores = clubSoloScores;
      });

      const sortedTeams = Object.values(teamScores).sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        for (let i = 0; i < activeSoloColumns.length; i++) {
          const scoreA = a.teamSoloScores[i] || 0;
          const scoreB = b.teamSoloScores[i] || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
        return 0;
      });

      const isTeamElim = activeDistance?.isElimination === true || String(activeDistance?.isElimination) === "true";
      let teamAdvancingCount = sortedTeams.length;

      if (isTeamElim) {
        const elimType = String(activeDistance.eliminationType).trim().toLowerCase();
        const elimVal = Number(activeDistance.eliminationValue);
        if (elimType === "count") {
          teamAdvancingCount = elimVal || 4;
        } else if (elimType === "percent" || elimType === "percentage") {
          const pct = elimVal || 50;
          teamAdvancingCount = Math.max(1, Math.round((sortedTeams.length * pct) / 100));
        }
      }

      const teamRuleObj = (currentTournamentDoc as any)?.ruleEngineSettings?.[activeDistance?.id] || (localState as any)?.ruleEngineSettings?.[activeDistance?.id];
      if (teamRuleObj) {
        if (teamRuleObj.cutoffType === "top_n") {
          teamAdvancingCount = Number(teamRuleObj.cutoffValue) || teamAdvancingCount;
        } else if (teamRuleObj.cutoffType === "percentage") {
          const pct = Number(teamRuleObj.cutoffValue) || 100;
          teamAdvancingCount = Math.max(1, Math.round((sortedTeams.length * pct) / 100));
        }
      }

      const teamBoundaryIndex = Math.min(teamAdvancingCount - 1, sortedTeams.length - 1);
      const boundaryTeam = sortedTeams[teamBoundaryIndex];

      const areTeamsTied = (a: any, b: any) => {
        if (!a || !b) return false;
        if (a.totalScore !== b.totalScore) return false;
        for (let i = 0; i < activeSoloColumns.length; i++) {
          if ((a.teamSoloScores?.[i] || 0) !== (b.teamSoloScores?.[i] || 0)) {
            return false;
          }
        }
        return true;
      };

      const teamSures = sortedTeams.filter((t, idx) => idx < teamBoundaryIndex && !areTeamsTied(t, boundaryTeam));
      const teamContenders = sortedTeams.filter(t => areTeamsTied(t, boundaryTeam));
      const teamEliminated = sortedTeams.filter((t, idx) => idx > teamBoundaryIndex && !areTeamsTied(t, boundaryTeam));

      const isTeamBoundaryTied = isTeamElim && (teamSures.length < teamAdvancingCount) && (teamSures.length + teamContenders.length > teamAdvancingCount);

      const teamQualified = isTeamBoundaryTied ? teamSures : [...teamSures, ...teamContenders];
      const teamPendingSolo = isTeamBoundaryTied ? teamContenders : [];
      const teamFinalEliminated = isTeamBoundaryTied ? [...teamEliminated, ...teamContenders] : teamEliminated;

      if (isTeamBoundaryTied && teamPendingSolo.length > 0) {
        // Find which team athletes belong to these tied teams
        const tiedTeamNames = teamPendingSolo.map(t => t.teamName);
        const tiedAthletes = activeTeamAthletes.filter(a => a && tiedTeamNames.includes(a.team || ""));

        // Build participants list, sorted stably by team (clubId) so they shoot next to each other
        const participants = tiedAthletes.map(ath => ({
          participantId: ath.id,
          fullName: ath.name,
          bibNumber: getCleanBibNumber(ath.bibNumber, ath.id),
          clubId: ath.team || "",
          status: "checked_in" as const
        })).sort((a, b) => a.clubId.localeCompare(b.clubId));

        const targetDistances = teamDistances || currentTournamentDoc?.teamDistances || distances;
        const distanceIdx = targetDistances.findIndex(d => d.id === activeDistance.id);
        const roundNumber = distanceIdx >= 0 ? distanceIdx + 1 : 1;

        const existingHeatsSource = [
          ...(localState.heats || []),
          ...(resolvedHeats || []),
          ...(commandCenterState?.heats || [])
        ];

        const heatMap = new Map<number, any>();
        existingHeatsSource.forEach(h => {
          if (!h || !h.heatNumber) return;
          const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
          const isSameStage = h.stageId === activeDistance.id;
          if (isSoloType && isSameStage) {
            heatMap.set(h.heatNumber, h);
          }
        });

        const allSoloHeats = Array.from(heatMap.values()).sort((a, b) => (a.heatNumber || 0) - (b.heatNumber || 0));

        // Determine next soloRoundIndex
        let nextSoloRoundIdx = 1;
        let lastSoloHeatHasScores = false;

        if (allSoloHeats.length > 0) {
          const lastHeat = allSoloHeats[allSoloHeats.length - 1];
          const checkSoloHeatHasScores = (heatObj: any, soloIdx: number) => {
            const allAthletesToCheck = [...activeAthletesList.filter(a => a && a.isPrimaryTeam), ...(teamAthletes || [])];
            return allAthletesToCheck.some(ath => {
              if (!ath) return false;
              const athleteId = ath.id || ath.athleteId || ath.participantId;
              const targetAthlete = [
                ...(leaderboardTeamAthletes || []),
                ...(teamAthletes || [])
              ].find(a => a && (a.id === athleteId || (a.participantId && a.participantId === athleteId))) || ath;

              const rounds = getSoloRoundsFromDist(targetAthlete, activeDistance);
              if (rounds && typeof rounds[soloIdx] === "number" && rounds[soloIdx] >= 0) {
                return true;
              }
              return false;
            });
          };

          const lastSoloIdx = getSoloIdxForHeat(lastHeat.heatNumber);
          lastSoloHeatHasScores = checkSoloHeatHasScores(lastHeat, lastSoloIdx);

          if (lastSoloHeatHasScores) {
            nextSoloRoundIdx = lastSoloIdx + 2; // e.g. Solo -> Re-Solo
          } else {
            nextSoloRoundIdx = lastSoloIdx + 1;
          }
        }

        const isResolo = nextSoloRoundIdx > 1;
        if (isResolo && !lastSoloHeatHasScores) {
          showToast("warning", "Thông báo Solo", "Lượt solo hiện tại chưa được bắn/nhập điểm đầy đủ. Không thể tạo lượt Re-Solo tiếp theo!");
          return;
        }

        if (!window.confirm(`Xác nhận KHỞI TẠO lượt ${isResolo ? "Re-Solo" : "Solo"} cho ${teamPendingSolo.length} Đội tuyển bằng điểm nhau ở ranh giới?\n- Đội tranh chấp: ${tiedTeamNames.join(", ")}\n- Tổng số VĐV: ${participants.length}`)) {
          return;
        }

        // Generate the new solo heat(s) using AssignmentEngine
        const laneCapacityLimit = localState.laneCount || 8;
        const chunks: any[][] = [];
        for (let i = 0; i < participants.length; i += laneCapacityLimit) {
          chunks.push(participants.slice(i, i + laneCapacityLimit));
        }

        const newHeats: any[] = [];
        for (let j = 0; j < chunks.length; j++) {
          const nextHeat = AssignmentEngine.generateSoloHeat(chunks[j], {
            lanesCount: laneCapacityLimit,
            refereeIds: ["referee_01", "referee_02", "referee_03"],
            tournamentId: activeHistoryId || "tour-temp",
            stageId: activeDistance.id,
            roundId: `r${distanceIdx + 1}`,
            soloIndex: j + 1,
            soloRoundIndex: nextSoloRoundIdx,
            roundNumber,
            isTeamMode: true
          });
          newHeats.push(nextHeat);
        }

        const activeHeat = newHeats[0];
        const nextLaneStatus: Record<number, any> = {};
        for (let i = 1; i <= laneCapacityLimit; i++) {
          const assignedLane = activeHeat.lanes?.find((l: any) => l.laneNumber === i);
          nextLaneStatus[i] = {
            athleteId: assignedLane?.participantId || null,
            athleteName: assignedLane?.fullName || null,
            bibNumber: assignedLane?.bibNumber || null,
            refereeId: assignedLane?.refereeId || "Trọng tài bàn",
            status: assignedLane?.participantId ? "preparing" : "idle",
            scores: Array(isResolo ? 1 : (currentTournamentDoc?.teamShotsCount || 10)).fill(null)
          };
        }

        const mergedHeats = [
          ...(localState.heats || []).filter((h: any) => !newHeats.some((nh) => nh.heatNumber === h.heatNumber)),
          ...newHeats
        ];

        const updatedState = {
          ...localState,
          heats: mergedHeats,
          currentHeat: activeHeat.heatNumber,
          laneStatus: nextLaneStatus,
          soloQueue: participants.map(p => p.participantId),
          workflowStage: "team_competition" as const
        };

        setLocalState(updatedState);
        if (setCommandCenterState) {
          setCommandCenterState(updatedState);
        }

        addAuditLog("TEAM_SOLO_HEAT_GENERATED", `Tạo ${newHeats.length} lượt đấu solo đồng đội cho ${teamPendingSolo.length} đội.`);
        showToast("success", "Khởi tạo Solo", `Đã tạo lượt solo đồng đội thành công!`);
        return;

      } else {
        // NO TIED TEAMS - FREEZE ROUND & ELIMINATE
        if (!window.confirm(`Xác nhận HOÀN TẤT & CHỐT kết quả cự ly đồng đội ${activeDistance.distance}m?\n- Số CLB đi tiếp: ${teamQualified.length}\n- Số CLB bị loại: ${teamFinalEliminated.length}`)) return;

        const targetDistances = teamDistances || currentTournamentDoc?.teamDistances || distances;

        const qualifiedTeamNames = new Set(teamQualified.map(t => t.teamName));
        const eliminatedTeamNames = new Set(teamFinalEliminated.map(t => t.teamName));

        const updatedAthletes = activeAthletesList.map(ath => {
          if (!ath) return ath;
          const isPrevEliminated = isAthleteEliminatedInPrevStage(ath, activeDistance.id, targetDistances);
          if (isPrevEliminated) return ath;

          const tName = ath.team || "";
          if (qualifiedTeamNames.has(tName)) {
            return {
              ...ath,
              status: "Thi đấu",
              qualificationStatus: "qualified"
            };
          } else if (eliminatedTeamNames.has(tName)) {
            return {
              ...ath,
              status: "Bị loại",
              qualificationStatus: `eliminated_${activeDistance.id}`
            };
          }
          return ath;
        });

        const currentIdx = targetDistances.findIndex(d => d.id === activeDistance.id);
        const nextStage = (currentIdx !== -1 && currentIdx < targetDistances.length - 1)
          ? targetDistances[currentIdx + 1]
          : null;

        const qualifiedForNext = updatedAthletes.filter(ath => ath && ath.isPrimaryTeam === true && qualifiedTeamNames.has(ath.team || ""));

        let nextStageHeats: any[] = [];
        let nextStageLaneStatus: Record<number, any> = {};

        if (nextStage) {
          const sourceVersions = localState.assignmentVersions || commandCenterState?.assignmentVersions || [];
          const matchingVer = sourceVersions.find((v: any) => v.stageId === nextStage.id);
          const nextIdx = currentIdx + 1;
          const nextLanesCount = matchingVer?.lanesCount || localState.laneCount || 8;
          
          const seedScoresForNext: Record<string, number> = {};
          qualifiedForNext.forEach(ath => {
            const aId = ath.id || ath.participantId;
            const rankedTeam = teamQualified.find(t => t.teamName === ath.team);
            seedScoresForNext[aId] = rankedTeam ? rankedTeam.totalScore : 0;
          });

          const participantsForNext = qualifiedForNext.map(ath => ({
            participantId: ath.id,
            fullName: ath.name || ath.fullName,
            bibNumber: getCleanBibNumber(ath.bibNumber, ath.id),
            clubId: ath.team || "Tự Do",
            status: "checked_in"
          }));

          try {
            const teamModeMode = localState.teamAssignmentMode || "parallel";
            const targetStrategy = matchingVer?.strategy?.startsWith("team_")
              ? matchingVer.strategy
              : `team_${teamModeMode}`;
            const targetLanesCount = matchingVer?.lanesCount || nextLanesCount || 8;

            const genResult = AssignmentEngine.generateTeamAssignments(participantsForNext as any[], {
              lanesCount: targetLanesCount,
              refereeIds: ["referee_01", "referee_02", "referee_03"],
              strategy: targetStrategy,
              tournamentId: activeHistoryId || "tour-temp",
              stageId: nextStage.id,
              roundId: `r${nextIdx + 1}`
            });

            nextStageHeats = genResult.heats || [];
            const firstHeatOfNext = nextStageHeats[0];
            for (let i = 1; i <= targetLanesCount; i++) {
              const assignedLane = firstHeatOfNext?.lanes?.find((l: any) => l.laneNumber === i);
              nextStageLaneStatus[i] = {
                athleteId: assignedLane?.participantId || null,
                athleteName: assignedLane?.fullName || null,
                bibNumber: assignedLane?.bibNumber || null,
                refereeId: assignedLane?.refereeId || "Trọng tài bàn",
                status: assignedLane?.participantId ? "preparing" : "idle",
                scores: Array(currentTournamentDoc?.teamShotsCount || 10).fill(null)
              };
            }
          } catch (err) {
            console.error("Failed to pre-generate next stage lanes/heats:", err);
          }
        }

        const newCapturedRounds = { ...(localState.capturedRounds || {}) };
        newCapturedRounds[activeDistance.id] = {
          athletesSnapshot: updatedAthletes,
          heatsSnapshot: resolvedHeats,
          laneStatusSnapshot: localState.laneStatus || {},
          rankingsSnapshot: sortedTeams,
          qualificationSnapshot: {
            qualified: teamQualified.map(t => ({ teamName: t.teamName })),
            eliminated: teamFinalEliminated.map(t => ({ teamName: t.teamName })),
            pendingSoloShootout: []
          },
          isFinalized: true
        };

        if (nextStage) {
          newCapturedRounds[nextStage.id] = {
            athletesSnapshot: qualifiedForNext,
            heatsSnapshot: nextStageHeats,
            laneStatusSnapshot: nextStageLaneStatus,
            rankingsSnapshot: [],
            qualificationSnapshot: null
          };
        }

        const updatedLocalState = {
          ...localState,
          capturedRounds: newCapturedRounds
        };

        setLocalState(updatedLocalState);
        if (setCommandCenterState) {
          setCommandCenterState(updatedLocalState);
        }

        setTeamAthletes(updatedAthletes);

        if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
          try {
            await updateOnlineTournament(activeHistoryId, {
              commandCenterState: updatedLocalState,
              teamAthletes: updatedAthletes
            });
          } catch (err) {
            console.error("Firestore sync error:", err);
          }
        }

        addAuditLog("TEAM_ROUND_FINALIZED", `Đã chốt kết quả cự ly đồng đội ${activeDistance.distance}m.`);
        showToast("success", "Chốt kết quả", "Đã chốt thành công cự ly đồng đội!");
        return;
      }
    }

    if (!isTeam && !activeDistanceQualification) {
      showToast("error", "Lỗi lọc", "Không có dữ liệu phân hạng cự ly để tính toán!");
      return;
    }

    const hasTied = activeDistanceQualification.pendingSoloShootout && activeDistanceQualification.pendingSoloShootout.length > 0;
    if (hasTied) {
      // Find who is tied
      const tiedCandidates = activeDistanceQualification.pendingSoloShootout;
      
      const targetDistances = (localState.workflowStage === "team_competition" || (competitionMode as string) === "team")
        ? (teamDistances || currentTournamentDoc?.teamDistances || distances)
        : distances;
      const distanceIdx = targetDistances.findIndex(d => d.id === activeDistance.id);
      const roundNumber = distanceIdx >= 0 ? distanceIdx + 1 : 1;

      // Get all existing solo/resolo heats for this active distance across all state sources
      const existingHeatsSource = [
        ...(localState.heats || []),
        ...(resolvedHeats || []),
        ...(commandCenterState?.heats || [])
      ];

      const heatMap = new Map<number, any>();
      existingHeatsSource.forEach(h => {
        if (!h || !h.heatNumber) return;
        const isSoloType = h.heatType === "solo" || h.heatType === "resolo";
        const isSameStage = h.stageId === activeDistance.id || h.distanceId === activeDistance.id || (h.heatNumber >= (distanceIdx + 1) * 100 && h.heatNumber < (distanceIdx + 2) * 100) || (!h.stageId && !h.distanceId && distanceIdx === 0);
        if (isSoloType && isSameStage) {
          heatMap.set(h.heatNumber, h);
        }
      });

      const allSoloHeats = Array.from(heatMap.values()).sort((a, b) => (a.heatNumber || 0) - (b.heatNumber || 0));

      const checkSoloHeatHasScores = (heatObj: any, soloIdx: number) => {
        // Check if any tied or active athlete has recorded scores in ath.soloShotDetails or ath.soloRounds for soloIdx
        const allAthletesToCheck = [...activeAthletesList];
        const hasAthScores = allAthletesToCheck.some(ath => {
          if (!ath) return false;
          const athleteId = ath.id || ath.athleteId || ath.participantId;
          const targetAthlete = [
            ...(leaderboardAthletes || []),
            ...(athletes || [])
          ].find(a => a && (a.id === athleteId || (a.participantId && a.participantId === athleteId))) || ath;

          const rounds = getSoloRoundsFromDist(targetAthlete, activeDistance);
          if (rounds && typeof rounds[soloIdx] === "number" && rounds[soloIdx] >= 0) {
            return true;
          }
          return false;
        });
        if (hasAthScores) return true;

        // Check if heat lanes directly have scores
        if (heatObj?.lanes && heatObj.lanes.some((l: any) => Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined))) {
          return true;
        }

        // Check if current laneStatus in localState or commandCenterState for this heat has scores
        if (localState.currentHeat === heatObj?.heatNumber && localState.laneStatus) {
          if (Object.values(localState.laneStatus).some((l: any) => l && Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined))) {
            return true;
          }
        }
        if (commandCenterState?.currentHeat === heatObj?.heatNumber && commandCenterState?.laneStatus) {
          if (Object.values(commandCenterState.laneStatus).some((l: any) => l && Array.isArray(l.scores) && l.scores.some((s: any) => s !== null && s !== undefined))) {
            return true;
          }
        }

        return false;
      };

      const participants = tiedCandidates.map(q => {
        const ath = activeAthletesList.find(a => a && (a.id === q.athleteId || a.participantId === q.athleteId));
        return {
          participantId: q.athleteId,
          fullName: ath?.name || q.athleteId,
          bibNumber: ath?.bibNumber || `BIB-${q.athleteId}`,
          clubId: ath?.team || "",
          status: "checked_in" as const
        };
      });

      let latestSoloHeatUnused = false;
      let targetSoloHeat: any = null;

      let maxSoloRoundIndex = 0;
      allSoloHeats.forEach(h => {
        let sri = 1;
        if (h.heatNumber > 10000) {
          const base = Math.floor(h.heatNumber / 100);
          sri = base % 100;
        } else {
          sri = h.heatNumber % 100;
        }
        if (sri > maxSoloRoundIndex) {
          maxSoloRoundIndex = sri;
        }
      });

      const currentSoloRoundIndex = maxSoloRoundIndex || 1;

      // Filter out all heats of the current (latest) solo round
      const latestRoundHeats = allSoloHeats.filter(h => {
        let sri = 1;
        if (h.heatNumber > 10000) {
          const base = Math.floor(h.heatNumber / 100);
          sri = base % 100;
        } else {
          sri = h.heatNumber % 100;
        }
        return sri === currentSoloRoundIndex;
      });

      const latestRoundIsScored = latestRoundHeats.some((h) => {
        return checkSoloHeatHasScores(h, currentSoloRoundIndex - 1);
      });

      if (allSoloHeats.length > 0 && !latestRoundIsScored) {
        latestSoloHeatUnused = true;
        targetSoloHeat = { ...(latestRoundHeats[0] || allSoloHeats[allSoloHeats.length - 1]) };
      }

      const laneCapacityLimit = localState.laneCount || 2;
      const chunks: any[][] = [];
      for (let i = 0; i < participants.length; i += laneCapacityLimit) {
        chunks.push(participants.slice(i, i + laneCapacityLimit));
      }

      if (latestSoloHeatUnused && targetSoloHeat) {
        // REUSE existing unused solo heat instead of creating a duplicate empty round
        const correctHeatNumber = (roundNumber * 100 + currentSoloRoundIndex) * 100 + 1;
        const isResolo = currentSoloRoundIndex > 1;
        const correctHeatType = isResolo ? "resolo" : "solo";
        const correctHeatName = isResolo 
          ? `Lượt 1 - Vòng Re-Solo ${roundNumber * 100 + currentSoloRoundIndex}` 
          : `Lượt 1 - Vòng Solo ${roundNumber * 100 + currentSoloRoundIndex}`;

        targetSoloHeat.heatId = `heat-solo-${activeHistoryId || "tour-temp"}-${activeDistance.id}-${currentSoloRoundIndex}-1`;
        targetSoloHeat.heatNumber = correctHeatNumber;
        targetSoloHeat.heatType = correctHeatType;
        targetSoloHeat.heatName = correctHeatName;
        targetSoloHeat.stageId = activeDistance.id;
        
        // Use the first chunk for the reused heat
        targetSoloHeat.lanes = chunks[0].map((p, idx) => ({
          laneNumber: idx + 1,
          participantId: p.participantId,
          fullName: p.fullName,
          bibNumber: p.bibNumber,
          clubId: p.clubId,
          refereeId: `referee_0${(idx % 3) + 1}`,
          status: "preparing",
          scores: []
        }));

        // Generate extra heats for remaining chunks
        const extraHeats: any[] = [];
        for (let j = 1; j < chunks.length; j++) {
          const subHeatIndex = j + 1;
          const nextHeat = AssignmentEngine.generateSoloHeat(chunks[j], {
            lanesCount: laneCapacityLimit,
            refereeIds: ["referee_01", "referee_02", "referee_03"],
            tournamentId: activeHistoryId || "tour-temp",
            stageId: activeDistance.id,
            roundId: `r${roundNumber}`,
            soloIndex: subHeatIndex,
            soloRoundIndex: currentSoloRoundIndex,
            roundNumber
          });
          extraHeats.push(nextHeat);
        }

        showToast("info", `Kích hoạt ${correctHeatName}`, `Kích hoạt ${correctHeatName} cho ${chunks[0].length} VĐV thi đấu Sudden Death.${extraHeats.length > 0 ? ` Đồng thời tạo thêm ${extraHeats.length} lượt đấu solo bổ sung.` : ""}`);

        setLocalState(prev => {
          const targetRoundBase = roundNumber * 100 + currentSoloRoundIndex;
          // Clean up ALL old heats of this round base index to avoid duplicate/orphaned heats
          let updatedHeats = (prev.heats || []).filter((h: any) => {
            if (h.heatNumber > 10000) {
              const base = Math.floor(h.heatNumber / 100);
              return base !== targetRoundBase;
            }
            return h.heatNumber !== targetRoundBase;
          });

          updatedHeats = [...updatedHeats, targetSoloHeat, ...extraHeats];

          const newLanes: Record<number, any> = {};
          for (let i = 1; i <= laneCapacityLimit; i++) {
            const assignedLane = targetSoloHeat.lanes.find((l: any) => l.laneNumber === i);
            newLanes[i] = {
              athleteId: assignedLane?.participantId || null,
              refereeId: assignedLane?.refereeId || "Trọng tài bàn",
              status: assignedLane ? "preparing" : "active",
              scores: Array(3).fill(null)
            };
          }

          return {
            ...prev,
            heats: updatedHeats,
            currentHeat: correctHeatNumber,
            activeSubStage: activeDistance.id,
            laneCount: laneCapacityLimit,
            laneStatus: newLanes,
            soloQueue: tiedCandidates.map(q => q.athleteId),
            workflowStage: "competition"
          };
        });

        addAuditLog("SOLO_HEAT_REUSED", `Giữ & kích hoạt lượt bắn solo ${correctHeatName} cho VĐV hòa điểm.${extraHeats.length > 0 ? ` Tạo thêm ${extraHeats.length} lượt solo mới.` : ""}`);
      } else {
        // Create new heats for all chunks under a new solo round index
        const newSoloRoundIndex = currentSoloRoundIndex + (allSoloHeats.length > 0 ? 1 : 0);
        const newHeats: any[] = [];
        for (let j = 0; j < chunks.length; j++) {
          const subHeatIndex = j + 1;
          const nextHeat = AssignmentEngine.generateSoloHeat(chunks[j], {
            lanesCount: laneCapacityLimit,
            refereeIds: ["referee_01", "referee_02", "referee_03"],
            tournamentId: activeHistoryId || "tour-temp",
            stageId: activeDistance.id,
            roundId: `r${roundNumber}`,
            soloIndex: subHeatIndex,
            soloRoundIndex: newSoloRoundIndex,
            roundNumber
          });
          newHeats.push(nextHeat);
        }

        const firstNewHeat = newHeats[0];
        showToast("warning", `Khởi tạo ${firstNewHeat.heatName}`, `Phát hiện hòa điểm! Đã khởi tạo ${newHeats.length} lượt Solo cho ${participants.length} VĐV!`);

        setLocalState(prev => {
          const updatedHeats = [...(prev.heats || []), ...newHeats];
          const newLanes: Record<number, any> = {};
          for (let i = 1; i <= laneCapacityLimit; i++) {
            const assignedLane = firstNewHeat.lanes.find((l: any) => l.laneNumber === i);
            newLanes[i] = {
              athleteId: assignedLane?.participantId || null,
              refereeId: assignedLane?.refereeId || "Trọng tài bàn",
              status: assignedLane ? "preparing" : "active",
              scores: Array(3).fill(null)
            };
          }

          return {
            ...prev,
            heats: updatedHeats,
            currentHeat: firstNewHeat.heatNumber,
            activeSubStage: activeDistance.id,
            laneCount: laneCapacityLimit,
            laneStatus: newLanes,
            soloQueue: tiedCandidates.map(q => q.athleteId),
            workflowStage: "competition" // Stay/return to competition stage!
          };
        });

        addAuditLog("SOLO_HEAT_GENERATED", `AssignmentEngine tự động lập ${newHeats.length} lượt bắn solo phân định thứ hạng cho ${participants.length} VĐV.`);
      }

    } else {
      // No ties! This is great. We can now safely execute freeze / elimination for this round.
      if (!window.confirm(`Xác nhận HOÀN TẤT & CHỐT kết quả cự ly ${activeDistance.distance}m?\n- Số VĐV đi tiếp: ${activeDistanceQualification.qualified.length}\n- Số VĐV bị loại: ${activeDistanceQualification.eliminated.length}`)) return;

      const targetDistances = (localState.workflowStage === "team_competition" || (competitionMode as string) === "team")
        ? (teamDistances || currentTournamentDoc?.teamDistances || distances)
        : distances;

      const updatedAthletes = activeAthletesList.map(ath => {
        const isPrevEliminated = isAthleteEliminatedInPrevStage(ath, activeDistance.id, targetDistances);
        if (isPrevEliminated) {
          return ath;
        }

        const athleteKey = ath.id || ath.participantId;
        const isQualified = activeDistanceQualification.qualified.some(q => q.athleteId === athleteKey);
        const isEliminated = activeDistanceQualification.eliminated.some(q => q.athleteId === athleteKey);

        if (isQualified) {
          return {
            ...ath,
            status: "Thi đấu",
            qualificationStatus: "qualified"
          };
        } else if (isEliminated) {
          return {
            ...ath,
            status: "Bị loại",
            qualificationStatus: `eliminated_${activeDistance.id}`
          };
        }
        return ath;
      });

      // Pre-generate the next round's assignments and starting lineup
      const currentIdx = targetDistances.findIndex(d => d.id === activeDistance.id);
      const nextStage = (currentIdx !== -1 && currentIdx < targetDistances.length - 1)
        ? targetDistances[currentIdx + 1]
        : null;

      const qualifiedAthleteIds = new Set(activeDistanceQualification.qualified.map(q => q.athleteId));
      const qualifiedForNext = updatedAthletes
        .filter(ath => ath && qualifiedAthleteIds.has(ath.id || ath.participantId))
        .sort((a, b) => {
          const idxA = activeDistanceQualification.qualified.findIndex(q => q.athleteId === (a.id || a.participantId));
          const idxB = activeDistanceQualification.qualified.findIndex(q => q.athleteId === (b.id || b.participantId));
          return idxA - idxB;
        });

      let nextStageHeats: any[] = [];
      let nextStageLaneStatus: Record<number, any> = {};

      if (nextStage) {
        const sourceVersions = localState.assignmentVersions || commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
        const matchingVer = sourceVersions.find((v: any) => v.stageId === nextStage.id);
        const nextIdx = currentIdx + 1;
        const nextStrategy = resolveStrategyForStage(nextStage.id, nextIdx);
        const nextLanesCount = matchingVer?.lanesCount || localState.laneCount || 8;
        const nextClubSeparation = matchingVer?.clubSeparation !== false;

        // Compute seed scores based on their actual performance in activeDistance (the round being closed)
        const seedScoresForNext: Record<string, number> = {};
        qualifiedForNext.forEach(ath => {
          const aId = ath.id || ath.participantId;
          const rankedAth = activeDistanceRankings.find(r => r.athleteId === aId);
          seedScoresForNext[aId] = rankedAth ? rankedAth.totalScore : 0;
        });

        // Map to Participant format for assignment engine
        const participantsForNext = qualifiedForNext.map(ath => {
          const aId = ath.id || ath.participantId;
          return {
            participantId: aId,
            fullName: ath.name || ath.fullName,
            bibNumber: getCleanBibNumber(ath.bibNumber, aId),
            clubId: ath.team || ath.clubId || "Tự Do",
            status: "checked_in"
          };
        });

        try {
          const nextIdx = currentIdx + 1;
          const targetStrategy = matchingVer?.strategy || nextStrategy || "ranking_asc";
          const targetLanesCount = matchingVer?.lanesCount || nextLanesCount || 8;
          const targetClubSeparation = matchingVer?.clubSeparation !== false && nextClubSeparation !== false;

          let genResult;
          const isTeamMode = (localState.workflowStage === "team_competition" || (competitionMode as string) === "team");
          if (isTeamMode) {
            const teamModeMode = localState.teamAssignmentMode || "parallel";
            const teamStrategy = targetStrategy?.startsWith("team_") ? targetStrategy : `team_${teamModeMode}`;
            genResult = AssignmentEngine.generateTeamAssignments(participantsForNext as any[], {
              lanesCount: targetLanesCount,
              refereeIds: ["referee_01", "referee_02", "referee_03"],
              strategy: teamStrategy,
              tournamentId: activeHistoryId || "tour-temp",
              stageId: nextStage.id,
              roundId: `r${nextIdx + 1}`
            });
          } else {
            genResult = AssignmentEngine.generateAssignments(participantsForNext as any[], {
              lanesCount: targetLanesCount,
              refereeIds: ["referee_01", "referee_02", "referee_03"],
              strategy: targetStrategy as any,
              clubSeparation: targetClubSeparation,
              seedScores: seedScoresForNext,
              tournamentId: activeHistoryId || "tour-temp",
              stageId: nextStage.id,
              roundId: `r${nextIdx + 1}`
            });
          }

          nextStageHeats = genResult.heats || [];

          // Pre-populate laneStatus for the first heat of the next stage
          const firstHeatOfNext = nextStageHeats.find(h => h.heatNumber === (nextIdx + 1) * 100 + 1) || nextStageHeats[0];
          for (let i = 1; i <= targetLanesCount; i++) {
            const assignedLane = firstHeatOfNext?.lanes?.find((l: any) => l.laneNumber === i);
            nextStageLaneStatus[i] = {
              athleteId: assignedLane?.participantId || null,
              athleteName: assignedLane?.fullName || assignedLane?.name || null,
              bibNumber: assignedLane?.bibNumber || null,
              refereeId: assignedLane?.refereeId || "Trọng tài bàn",
              status: assignedLane?.participantId ? "preparing" : "idle",
              scores: Array(shotsCountLimit).fill(null)
            };
          }
        } catch (err) {
          console.error("Failed to pre-generate next stage lanes/heats:", err);
        }
      }

      // Generate the updated capturedRounds
      const newCapturedRounds = { ...(localState.capturedRounds || {}) };
      newCapturedRounds[activeDistance.id] = {
        athletesSnapshot: updatedAthletes,
        heatsSnapshot: resolvedHeats,
        laneStatusSnapshot: localState.laneStatus || {},
        rankingsSnapshot: activeDistanceRankings,
        qualificationSnapshot: activeDistanceQualification,
        isFinalized: true
      };

      if (nextStage) {
        newCapturedRounds[nextStage.id] = {
          athletesSnapshot: qualifiedForNext,
          heatsSnapshot: nextStageHeats,
          laneStatusSnapshot: nextStageLaneStatus,
          rankingsSnapshot: [],
          qualificationSnapshot: null
        };
      }

      // Now prepare combined localState
      const updatedLocalState = {
        ...localState,
        capturedRounds: newCapturedRounds
      };
      setLocalState(updatedLocalState);

      // Force update parent/App state immediately
      if (setCommandCenterState) {
        setCommandCenterState(updatedLocalState);
      }

      // Merge updatedAthletes back into global list to persist to Firestore
      const isTeam = (localState.workflowStage === "team_competition" || (competitionMode as string) === "team");
      const currentGlobal = isTeam ? (teamAthletes || []) : (athletes || []);
      const mergedAthletes = currentGlobal.map(globalAth => {
        const updatedAth = updatedAthletes.find(ua => ua && (ua.id === globalAth.id || ua.participantId === globalAth.id));
        return updatedAth || globalAth;
      });
      const newlyAdded = updatedAthletes.filter(ua => ua && !currentGlobal.some(ga => ga.id === ua.id || ga.participantId === ua.id));
      const finalAthletesList = [...mergedAthletes, ...newlyAdded];

      // Update parent component's athletes state
      if (isTeam) {
        setTeamAthletes(finalAthletesList);
      } else {
        setAthletes(finalAthletesList);
      }

      // Atomic, non-debounced sync to Firestore of BOTH athletes AND commandCenterState!
      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
        try {
          const updatePayload: any = {
            commandCenterState: updatedLocalState
          };
          if (isTeam) {
            updatePayload.teamAthletes = finalAthletesList;
          } else {
            updatePayload.athletes = finalAthletesList;
          }
          await updateOnlineTournament(activeHistoryId, updatePayload);
        } catch (err) {
          console.error("Failed atomic save in handleRunQualification:", err);
        }
      }

      // Log success & show toast
      addAuditLog("DISTANCE_QUALIFICATION_COMPLETE", `Chốt kết quả cự ly ${activeDistance.distance}m. ${activeDistanceQualification.qualified.length} VĐV đi tiếp, ${activeDistanceQualification.eliminated.length} VĐV bị loại.`);
      showToast("success", "Chốt cự ly thành công", `Đã chốt kết quả cự ly ${activeDistance.distance}m! (${activeDistanceQualification.qualified.length} VĐV đi tiếp, ${activeDistanceQualification.eliminated.length} VĐV bị loại). Thiết lập bệ bắn vòng sau "${nextStage ? nextStage.distance : ''}m" đã được tự động chuẩn bị thành công theo chiến thuật của vòng sau.`);
    }
  };

  // Quick Action: Generate Official Result
  const handleGenerateOfficialResults = () => {
    if (userRole !== "admin") return;
    if (!window.confirm("Bắt đầu khởi chạy OfficialResultEngine để lập biên bản kết quả pháp lý?")) return;

    // Build mapping for qualification results based on actual athlete statuses
    const qualResults: Record<string, any> = {};
    liveRankings.forEach((r) => {
      const ath = activeAthletesList.find(a => a && (a.id === r.athleteId || a.participantId === r.athleteId));
      if (ath?.status === "Bị loại") {
        qualResults[r.athleteId] = "eliminated";
      } else {
        qualResults[r.athleteId] = "qualified";
      }
    });

    // Run engine
    const officialPkg = OfficialResultEngine.generate({
      tournamentId: activeHistoryId || "tour-temp",
      frozenRankings: liveRankings,
      qualificationResults: qualResults,
      operator: operatorName
    });

    setLocalState(prev => ({
      ...prev,
      officialResults: officialPkg
    }));

    handleTransitionTo("official_result");
    addAuditLog("OFFICIAL_RESULT_GENERATE", `Lập biên bản kết quả chính thức V1 (Số lượng bản ghi: ${officialPkg.length}).`);
    showToast("success", "Thành lập biên bản", "Đã kết xuất biên bản kết quả chính thức thành công!");
  };

  // Helper to calculate correct team podium based on team competition rules
  const getCorrectTeamPodium = () => {
    // Calculate team scores from teamAthletes
    const teamScores: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};
    const activeTeamAthletes = (teamAthletes || []).filter(a => a.isPrimaryTeam && a.status !== "Bỏ thi");
    
    activeTeamAthletes.forEach((ath) => {
      const teamName = (ath.team || "").trim() || "VĐV Tự Do (Không Đội)";
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      
      // Sum up scores over all distances
      let personalScore = 0;
      const activeDistances = teamDistances || distances || [];
      activeDistances.forEach((dist) => {
        const hits = ath.scores?.[dist.id] || [];
        // Calculate hits/points sum
        const isDirect = (currentTournamentDoc?.teamShotsCount || currentTournamentDoc?.shotsCount || 10) === 1;
        let pointsSum = 0;
        if (isDirect) {
          hits.forEach((h: any) => {
            if (h !== null && h !== undefined && h !== "") {
              let val = h;
              if (val === "true" || val === "1") val = true;
              if (val === "false" || val === "0") val = false;
              if (typeof val === "string") {
                const parsed = Number(val);
                if (!isNaN(parsed)) val = parsed;
              }
              if (typeof val === "number") pointsSum += val;
              else if (val === true) pointsSum += 1;
            }
          });
        } else {
          pointsSum = hits.filter(Boolean).length;
        }
        personalScore += pointsSum * dist.multiplier;
      });
      teamScores[teamName] = (teamScores[teamName] || 0) + personalScore;
    });

    const sortedTeams = Object.keys(teamScores)
      .filter(t => t !== "VĐV Tự Do (Không Đội)" && t !== "Tự Do")
      .map((teamName, idx) => ({
        athleteId: `team-${idx}`,
        name: teamName,
        team: teamName,
        totalScore: teamScores[teamName],
        survivalScore: teamScores[teamName],
        allRoundTotalScore: teamScores[teamName],
        accuracy: 100,
        scoresByDistance: {},
        rank: 1,
        athletesCount: teamCounts[teamName] || 0,
        originalAthlete: null
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    sortedTeams.forEach((t, idx) => {
      let betterCount = 0;
      for (let j = 0; j < idx; j++) {
        if (sortedTeams[j].totalScore > t.totalScore) betterCount++;
      }
      t.rank = betterCount + 1;
    });

    return sortedTeams.slice(0, 3);
  };

  // Quick Action: Publish Results (To Cloud and Career Boards)
  const handlePublishResults = (customIndPodium?: any[], customTeamPodium?: any[]) => {
    if (userRole !== "admin") return;
    if ((localState?.officialResults || []).length === 0) {
      showToast("error", "Lỗi công bố", "Vui lòng sinh Biên Bản Kết Quả trước khi công bố!");
      return;
    }
    if (!window.confirm("CÔNG BỐ kết quả chính thức ra bảng vàng và cập nhật hồ sơ sự nghiệp vận động viên?")) return;

    // Use custom snapshots if passed from the summary stage to ensure 100% fidelity with the live visual top 3
    let indPodium = customIndPodium;
    let teamPodium = customTeamPodium;

    if (!indPodium) {
      const getTopThreeIndividuals = (list: any[], isInd: boolean) => {
        return list.slice(0, 3).map((r, idx) => ({
          athleteId: r.athleteId || r.id,
          name: r.name,
          team: r.team || "Tự Do",
          totalScore: isInd ? (r.survivalScore !== undefined ? r.survivalScore : r.totalScore) : r.totalScore,
          survivalScore: r.survivalScore !== undefined ? r.survivalScore : null,
          allRoundTotalScore: r.totalScore,
          accuracy: r.accuracy || 0,
          scoresByDistance: r.scoresByDistance || {},
          rank: r.rank || (idx + 1),
          originalAthlete: r.originalAthlete ? {
            id: r.originalAthlete.id,
            name: r.originalAthlete.name,
            team: r.originalAthlete.team,
            province: r.originalAthlete.province || "",
            avatarUrl: r.originalAthlete.avatarUrl || "",
            status: r.originalAthlete.status || "",
            masterAthleteId: r.originalAthlete.masterAthleteId || "",
            gender: r.originalAthlete.gender || "",
            birthYear: r.originalAthlete.birthYear || ""
          } : null
        }));
      };

      indPodium = getTopThreeIndividuals(
        RankingEngine.calculate({
          athletes: athletes || [],
          distances: distances as any[],
          tieBreakRule: "highest_distance_multiplier",
          shotsCount: currentTournamentDoc?.shotsCount || 10,
          directMaxPoints: currentTournamentDoc?.directMaxPoints,
          directMaxShots: currentTournamentDoc?.directMaxShots
        }),
        true
      );
    }

    if (!teamPodium) {
      if (competitionMode === "team") {
        teamPodium = getCorrectTeamPodium();
      } else {
        teamPodium = [];
      }
    }

    // Publish to online db
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      updateOnlineTournament(activeHistoryId, {
        status: "completed",
        isPublic: true,
        savedPodiumIndividual: indPodium,
        savedPodiumTeam: teamPodium
      } as any);
    }

    handleTransitionTo("published");
    addAuditLog("PUBLISH_RESULTS", "Công bố kết quả chính thức giải đấu. Đồng bộ dữ liệu cống hiến và ACP toàn quốc.");
    showToast("success", "Công bố kết quả", "Đã công bố kết quả chính thức giải đấu rộng rãi!");
  };

  // Quick Action: Archive Tournament
  const handleArchiveTournament = (customIndPodium?: any[], customTeamPodium?: any[]) => {
    if (userRole !== "admin") return;
    if (!window.confirm("LƯU TRỮ giải đấu? Thao tác này sẽ đóng băng vĩnh viễn dữ liệu giải đấu và không thể khôi phục.")) return;

    // Use passed-in visual podium values, or existing saved ones, or calculate fallbacks
    let indPodium = customIndPodium || currentTournamentDoc?.savedPodiumIndividual;
    let teamPodium = customTeamPodium || currentTournamentDoc?.savedPodiumTeam;

    if (!indPodium) {
      const getTopThreeIndividuals = (list: any[]) => {
        return list.slice(0, 3).map((r, idx) => ({
          athleteId: r.athleteId || r.id,
          name: r.name,
          team: r.team || "Tự Do",
          totalScore: r.totalScore,
          accuracy: r.accuracy || 0,
          scoresByDistance: r.scoresByDistance || {},
          rank: r.rank || (idx + 1),
          originalAthlete: r.originalAthlete ? {
            id: r.originalAthlete.id,
            name: r.originalAthlete.name,
            team: r.originalAthlete.team,
            province: r.originalAthlete.province || "",
            avatarUrl: r.originalAthlete.avatarUrl || "",
            status: r.originalAthlete.status || "",
            masterAthleteId: r.originalAthlete.masterAthleteId || "",
            gender: r.originalAthlete.gender || "",
            birthYear: r.originalAthlete.birthYear || ""
          } : null
        }));
      };

      indPodium = getTopThreeIndividuals(
        RankingEngine.calculate({
          athletes: athletes || [],
          distances: distances as any[],
          tieBreakRule: "highest_distance_multiplier",
          shotsCount: currentTournamentDoc?.shotsCount || 10,
          directMaxPoints: currentTournamentDoc?.directMaxPoints,
          directMaxShots: currentTournamentDoc?.directMaxShots
        })
      );
    }

    if (!teamPodium) {
      if (competitionMode === "team") {
        teamPodium = getCorrectTeamPodium();
      } else {
        teamPodium = [];
      }
    }

    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      updateOnlineTournament(activeHistoryId, {
        status: "archived",
        savedPodiumIndividual: indPodium,
        savedPodiumTeam: teamPodium
      } as any);
    }

    handleTransitionTo("archived");
    addAuditLog("ARCHIVE_TOURNAMENT", "Lưu trữ giải đấu thành công. Đóng băng dữ liệu lịch sử vĩnh viễn.");
    showToast("success", "Đã lưu trữ", "Đã lưu trữ giải đấu thành công!");
  };

  // Check if a stage is active, completed, or upcoming
  const getStageStatus = (stage: TimelineStage) => {
    const uiStages: TimelineStage[] = ["registration", "check_in", "competition", "ranking", "archived"];
    
    let currentUiStage: TimelineStage = "registration";
    const ws = localState.workflowStage;
    if (ws === "check_in") {
      currentUiStage = "check_in";
    } else if (ws === "competition" || ws === "team_competition") {
      currentUiStage = "competition";
    } else if (ws === "ranking" || ws === "qualification" || ws === "official_result" || ws === "published") {
      currentUiStage = "ranking";
    } else if (ws === "archived") {
      currentUiStage = "archived";
    }

    const currentIndex = uiStages.indexOf(currentUiStage);
    const targetIndex = uiStages.indexOf(stage);

    if (currentIndex === targetIndex) return "active";
    if (targetIndex < currentIndex) return "completed";
    return "upcoming";
  };

  // Copy OBS URL Helper
  const copyObsUrl = (overlayType: "leaderboard" | "current_lane" | "lower_third") => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/?obs=true&tournamentId=${activeHistoryId || "demo"}&type=${overlayType}`;
    navigator.clipboard.writeText(url);
    showToast("success", "Đã sao chép", `Đã sao chép đường dẫn OBS Overlay (${overlayType})!`);
  };

  const isLiveOperationStage = 
    localState.workflowStage === "competition" || 
    localState.workflowStage === "team_competition";

  const activeTournamentFormat = currentTournamentDoc?.tournamentFormat || "mixed";

  return (
    <div className="flex flex-col gap-6" id="tournament-command-center">
      {/* 1. Header Banner of Mission Control */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-650 flex items-center justify-center shadow-lg border border-indigo-500 animate-pulse">
              <Sliders className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Mission Control Room
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE SERVER
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5">
                VSC V3 - TOURNAMENT COMMAND CENTER
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Phòng Tổng chỉ huy kỹ thuật & Giám sát vận hành thời gian thực. Giải đấu: <strong className="text-indigo-300">{matchName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLocalState(prev => ({ ...prev, isPaused: !prev.isPaused }));
                addAuditLog(localState.isPaused ? "RESUME_TOURNAMENT" : "PAUSE_TOURNAMENT", "Tác vụ chỉ huy: " + (localState.isPaused ? "Khôi phục" : "Tạm hoãn") + " giải đấu.");
                showToast("info", "Trạng thái", localState.isPaused ? "Đã tiếp tục tiến trình giải!" : "Đã tạm hoãn tiến trình giải đấu!");
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                localState.isPaused
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30"
              }`}
            >
              {localState.isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" /> KHÔI PHỤC GIẢI
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" /> TẠM HOÃN GIẢI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Stage Timeline with Glow Effect */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-indigo-500" /> TIẾN TRÌNH TRẠNG THÁI VSC 05 STAGES (LIFECYCLE PIPELINE)
        </h3>
        <div className="flex items-center min-w-[1000px] gap-2 py-4">
          {stagesList.map((st, index) => {
            const status = getStageStatus(st.stage);
            return (
              <React.Fragment key={st.stage}>
                <button
                  onClick={() => handleTransitionTo(st.stage)}
                  disabled={userRole !== "admin"}
                  className={`flex-1 flex flex-col items-center text-center p-3 rounded-xl transition-all border relative ${
                    status === "active"
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950 scale-105 z-10"
                      : status === "completed"
                        ? "bg-slate-50 dark:bg-slate-800/50 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-300"
                        : "bg-slate-100 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-600 opacity-60"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Step {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-black mt-1.5 block">
                    {st.label}
                  </span>
                  <span className={`text-[9px] mt-1 block leading-tight ${status === "active" ? "text-indigo-200" : "text-slate-400"}`}>
                    {st.desc}
                  </span>

                  {/* Top indicators */}
                  {status === "active" && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-widest animate-pulse">
                      ACTIVE
                    </span>
                  )}
                  {status === "completed" && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white p-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
                {index < stagesList.length - 1 && (
                  <ArrowRight className={`w-4 h-4 shrink-0 ${status === "completed" ? "text-emerald-500" : "text-slate-300 dark:text-slate-800"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 5. ACTIVE STAGE OPERATION CENTER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md text-left mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6 gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" /> BẢNG ĐIỀU HÀNH TÁC CHIẾN (ACTIVE STAGE CONTROLLER)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Tiến trình hiện tại: <span className="font-extrabold text-indigo-650 dark:text-indigo-400 uppercase">{stagesList.find(s => s.stage === getMappedStageForUI(localState.workflowStage))?.label}</span></p>
          </div>
          <span className="text-xs font-bold text-indigo-650 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full shrink-0">
            Giai đoạn {stagesList.findIndex(s => s.stage === getMappedStageForUI(localState.workflowStage)) + 1} / {stagesList.length}
          </span>
        </div>

        {/* Dynamic Controls Rendering based on active workflowStage */}
        {localState.workflowStage === "registration" && (
          <RegistrationStage
            userRole={userRole}
            deduplicatedAthletes={deduplicatedAthletes}
            athletes={athletes}
            syncAthletesToCloud={syncAthletesToCloud}
            activeSetterAndCloud={activeSetterAndCloud}
            handleTransitionTo={handleTransitionTo}
            showToast={showToast}
            setEditingAthlete={setEditingAthlete}
            setEditAthleteFields={setEditAthleteFields}
            currentTournamentDoc={currentTournamentDoc}
          />
        )}

        {localState.workflowStage === "check_in" && (
          <CheckInStage
            deduplicatedAthletes={deduplicatedAthletes}
            athletes={athletes}
            activeAthletesList={activeAthletesList}
            syncAthletesToCloud={activeSetterAndCloud}
            showToast={showToast}
            handleRandomizeAndAssign={handleRandomizeAndAssign}
            handleTransitionTo={handleTransitionTo}
            isChecklistValid={isChecklistValid}
            checklistState={checklistState}
            setManualChecklist={setManualChecklist}
            computedAthleteCheckedIn={computedAthleteCheckedIn}
            computedLaneAssigned={computedLaneAssigned}
            computedRefereeReady={computedRefereeReady}
            computedDistanceConfigured={computedDistanceConfigured}
            computedEnvironmentReady={computedEnvironmentReady}
            computedNetworkReady={computedNetworkReady}
            resolvedHeats={resolvedHeats}
            teamAssignmentVersions={teamAssignmentVersions}
            setEditingAthlete={setEditingAthlete}
            setEditAthleteFields={setEditAthleteFields}
          />
        )}

        {(localState.workflowStage === "competition" || localState.workflowStage === "team_competition") && (
          <CompetitionStage
            activeTournamentFormat={activeTournamentFormat}
            localState={localState}
            setLocalState={setLocalState}
            competitionMode={competitionMode}
            setCompetitionMode={setCompetitionMode}
            userRole={userRole}
            addAuditLog={addAuditLog}
            showToast={showToast}
            distances={distances}
            teamDistances={teamDistances}
            currentTournamentDoc={currentTournamentDoc}
            resolvedHeats={resolvedHeats}
            teamAssignmentVersions={teamAssignmentVersions}
            setEditingAthlete={setEditingAthlete}
            setEditAthleteFields={setEditAthleteFields}
            activeShotsCountLimit={activeShotsCountLimit}
            activeDistance={activeDistance}
            activeDistanceRankings={activeDistanceRankings}
            activeSoloColumns={activeSoloColumns}
            activeDistanceQualification={activeDistanceQualification}
            leaderboardAthletes={leaderboardAthletes}
            leaderboardTeamAthletes={leaderboardTeamAthletes}
            athletes={athletes}
            teamAthletes={teamAthletes}
            hasAthleteShotInDist={hasAthleteShotInDist}
            onResetAthleteScore={onResetAthleteScore}
            handleTransitionTo={handleTransitionTo}
            globalTimer={globalTimer}
            dynamicSubStages={dynamicSubStages}
            activeAthletesList={activeAthletesList}
            getSoloIdxForHeat={getSoloIdxForHeat}
            handleRunQualification={handleRunQualification}
            nextSoloHeatInfo={nextSoloHeatInfo}
            shotsCountLimit={shotsCountLimit}
            getDisplayHeatLabel={getDisplayHeatLabel}
            getAthletesForHeat={getAthletesForHeat}
          />
        )}

        {(localState.workflowStage === "ranking" || localState.workflowStage === "official_result" || localState.workflowStage === "published" || localState.workflowStage === "archived") && (
          <SummaryPublishStage
            athletes={athletes}
            teamAthletes={teamAthletes}
            distances={distances}
            teamDistances={teamDistances || []}
            currentTournamentDoc={currentTournamentDoc}
            competitionMode={competitionMode}
            userRole={userRole}
            workflowStage={localState.workflowStage}
            handlePublishResults={handlePublishResults}
            handleArchiveTournament={handleArchiveTournament}
            handleTransitionTo={handleTransitionTo}
            addAuditLog={addAuditLog}
          />
        )}

        {!["ranking", "official_result", "published", "archived"].includes(localState.workflowStage) && (
          <WorkflowBanners
            workflowStage={localState.workflowStage}
            userRole={userRole}
            handleFreezeRanking={handleFreezeRanking}
            handleGenerateOfficialResults={handleGenerateOfficialResults}
            handlePublishResults={handlePublishResults}
            handleArchiveTournament={handleArchiveTournament}
            handleTransitionTo={handleTransitionTo}
          />
        )}
      </div>

      <LiveOperationPanels
        isLiveOperationStage={isLiveOperationStage}
        localState={localState}
        setLocalState={setLocalState}
        userRole={userRole}
        activeShotsCountLimit={activeShotsCountLimit}
        activeDistance={activeDistance}
        resolvedHeats={resolvedHeats}
        getDisplayHeatLabel={getDisplayHeatLabel}
        getAthletesForHeat={getAthletesForHeat}
        activeTournamentFormat={activeTournamentFormat}
        competitionMode={competitionMode}
        addAuditLog={addAuditLog}
        showToast={showToast}
        globalTimer={globalTimer}
        stagesList={stagesList}
        activeAthletesList={activeAthletesList}
        copyObsUrl={copyObsUrl}
        distances={distances}
        teamDistances={teamDistances}
        onOpenLiveBoard={onOpenLiveBoard}
        onOpenTimer={onOpenTimer}
        canControlTimer={canControlTimer}
        getLiveStatsForLane={getLiveStatsForLane}
        totalHeatsCount={totalHeatsCount}
        currentHeatIndex={currentHeatIndex}
        stageHeats={stageHeats}
      />

      <QuickScoreModal
        editingLane={editingLane}
        editingScores={editingScores}
        setEditingScores={setEditingScores}
        setEditingLane={setEditingLane}
        handleSaveQuickScore={handleSaveQuickScoreLocal}
      />

      <EditAthleteModal
        editingAthlete={editingAthlete}
        editAthleteFields={editAthleteFields}
        setEditingAthlete={setEditingAthlete}
        setEditAthleteFields={setEditAthleteFields}
        activeAthletesList={activeAthletesList}
        activeSetterAndCloud={activeSetterAndCloud}
        showToast={showToast}
      />

    </div>
  );
};
