import { useState, useEffect, useRef, useCallback } from "react";
import { Athlete, DistanceConfig, HeatV3, OfficialResult } from "../types";
import { ScoreValidationEngine } from "../engines/scoreValidationEngine";
import { getSoloRoundsFromDist } from "../engines/rankingEngine";
import { updateOnlineTournament } from "../lib/firebaseService";

export type TimelineStage =
  | "registration"
  | "check_in"
  | "freeze"
  | "assignment"
  | "competition"
  | "team_competition"
  | "ranking"
  | "qualification"
  | "official_result"
  | "published"
  | "archived";



export interface CommandCenterState {
  workflowStage: TimelineStage;
  isPaused: boolean;
  currentRoundIndex: number;
  currentDistanceIndex: number;
  currentHeat: number;
  laneCount: number;
  laneStatus: Record<number, {
    athleteId: string | null;
    athleteName?: string | null;
    bibNumber?: string | null;
    refereeId: string | null;
    status: "idle" | "preparing" | "active" | "completed";
    scores: (boolean | number | null)[];
  }>;
  heats?: HeatV3[];
  assignmentVersions?: any[];
  soloQueue: string[];
  reSoloQueue: string[];
  officialResults: OfficialResult[];
  activeSubStage?: string;
  subStages?: string[];
  competitionActiveTab?: "individual" | "team";
  individualLocked?: boolean;
  teamLocked?: boolean;
  teamAssignmentMode?: "parallel" | "sequential";
  capturedRounds?: Record<string, any>;
  assignmentStrategy?: string;
  assignmentStageId?: string;
  assignmentClubSeparation?: boolean;
  auditLogs: {
    id: string;
    timestamp: string;
    action: string;
    operator: string;
    description: string;
  }[];
}

function isEmptyValue(val: any): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object") {
    const keys = Object.keys(val).filter(k => val[k] !== undefined && val[k] !== null && val[k] !== "");
    if (keys.length === 0) return true;
  }
  return false;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  const isEmptyA = isEmptyValue(a);
  const isEmptyB = isEmptyValue(b);
  if (isEmptyA && isEmptyB) return true;
  if (isEmptyA !== isEmptyB) return false;

  if (typeof a === "object" || typeof b === "object") {
    if (typeof a !== typeof b) return false;
  }

  if (typeof a === "object" && a !== null && b !== null) {
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    } else {
      if (Array.isArray(b)) return false;

      const keysA = Object.keys(a).filter(k => a[k] !== undefined && a[k] !== null && a[k] !== "");
      const keysB = Object.keys(b).filter(k => b[k] !== undefined && b[k] !== null && b[k] !== "");

      if (keysA.length !== keysB.length) return false;

      for (const k of keysA) {
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }
  }

  const strA = a === undefined || a === null ? "" : String(a);
  const strB = b === undefined || b === null ? "" : String(b);
  return strA === strB;
}

interface UseCommandCenterStateProps {
  commandCenterState: CommandCenterState | null;
  setCommandCenterState?: React.Dispatch<React.SetStateAction<any>>;
  currentTournamentDoc: any;
  competitionMode: "individual" | "team";
  setCompetitionMode: (mode: "individual" | "team") => void;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  shotsCountLimit: number;
  operatorName: string;
  userRole: string;
  showToast: (type: "success" | "error" | "warning" | "info", title: string, desc: string) => void;
  getActiveAthletesList: () => Athlete[];
  activeSetterAndCloud: (updatedList: Athlete[]) => Promise<void>;
  getActiveDistance: () => DistanceConfig | null;
  getActiveShotsCountLimit: () => number;
  getResolvedHeats: () => any[];
  getIsChecklistValid: () => boolean;
  activeHistoryId: string | null;
  matchName: string;
}

export function useCommandCenterState({
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
  getActiveAthletesList,
  activeSetterAndCloud,
  getActiveDistance,
  getActiveShotsCountLimit,
  getResolvedHeats,
  getIsChecklistValid,
  activeHistoryId,
  matchName,
}: UseCommandCenterStateProps) {
  // Refs to prevent echo loop in Parent <-> Child state synchronization
  const lastIncomingStateRef = useRef<any>(null);
  const lastOutgoingStateRef = useRef<any>(null);
  const lastTransitionTimeRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  // State initialization
  const [localState, setLocalState] = useState<CommandCenterState>(() => {
    const laneLimit = (currentTournamentDoc as any)?.laneCapacity || 8;
    const defaultLanes: Record<number, any> = {};
    for (let i = 1; i <= laneLimit; i++) {
      defaultLanes[i] = {
        athleteId: null,
        refereeId: null,
        status: "idle",
        scores: Array(shotsCountLimit).fill(null),
      };
    }
    const defaultCCS: CommandCenterState = {
      workflowStage: "registration",
      isPaused: false,
      currentRoundIndex: 0,
      currentDistanceIndex: 0,
      currentHeat: 1,
      laneCount: laneLimit,
      laneStatus: defaultLanes,
      soloQueue: [],
      reSoloQueue: [],
      officialResults: [],
      activeSubStage: "5-1",
      subStages: ["5-1", "5-1-1", "5-2", "5-2-1", "5-3"],
      competitionActiveTab: "individual",
      individualLocked: true,
      teamLocked: true,
      auditLogs: [
        {
          id: `log-${Date.now()}-init`,
          timestamp: new Date().toISOString(),
          action: "INITIALIZE",
          operator: "System",
          description: "Khởi tạo bảng điều khiển tác chiến Tournament Command Center V1.0.",
        },
      ],
    };

    if (commandCenterState) {
      const initialStage = commandCenterState.workflowStage === "freeze" ? "assignment" : commandCenterState.workflowStage;
      return {
        ...defaultCCS,
        ...commandCenterState,
        workflowStage: initialStage,
      };
    }

    return defaultCCS;
  });

  // Sync state from prop when changed externally (e.g. from Firestore subscription)
  useEffect(() => {
    if (commandCenterState) {
      // If the user transitioned recently (within 3.5s), don't let older remote stage override
      if (Date.now() - lastTransitionTimeRef.current < 3500) {
        return;
      }
      if (deepEqual(commandCenterState, lastOutgoingStateRef.current)) {
        return;
      }

      setLocalState((prev) => {
        const syncedState = { ...commandCenterState };
        if (syncedState.workflowStage === "freeze") {
          syncedState.workflowStage = "assignment";
        }
        if (!deepEqual(prev, syncedState)) {
          lastIncomingStateRef.current = syncedState;
          isSyncingRef.current = true;
          return syncedState;
        }
        return prev;
      });
    }
  }, [commandCenterState]);

  // Sync lane count from tournament document configuration
  useEffect(() => {
    const docLaneCapacity = (currentTournamentDoc as any)?.laneCapacity;
    if (docLaneCapacity && localState.laneCount !== docLaneCapacity) {
      setLocalState((prev) => {
        if (prev.laneCount === docLaneCapacity) return prev;

        const newLaneCount = docLaneCapacity;
        const newLaneStatus = { ...prev.laneStatus };

        for (let i = 1; i <= newLaneCount; i++) {
          if (!newLaneStatus[i]) {
            newLaneStatus[i] = {
              athleteId: null,
              refereeId: null,
              status: "idle",
              scores: Array(shotsCountLimit).fill(null),
            };
          }
        }

        Object.keys(newLaneStatus).forEach((k) => {
          if (Number(k) > newLaneCount) {
            delete newLaneStatus[Number(k)];
          }
        });

        return {
          ...prev,
          laneCount: newLaneCount,
          laneStatus: newLaneStatus,
        };
      });
    }
  }, [(currentTournamentDoc as any)?.laneCapacity, shotsCountLimit]);

  // Sync localState back up to App parent state (debounced)
  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (setCommandCenterState) {
      if (deepEqual(localState, lastIncomingStateRef.current)) {
        return;
      }

      const timer = setTimeout(() => {
        setCommandCenterState((prev: any) => {
          if (!deepEqual(prev, localState)) {
            lastOutgoingStateRef.current = localState;
            return localState;
          }
          return prev;
        });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [localState, setCommandCenterState]);

  // Helper to audit actions
  const addAuditLog = useCallback((action: string, description: string) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action,
      operator: operatorName,
      description,
    };
    setLocalState((prev) => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 50),
    }));
  }, [operatorName]);

  const handleTransitionTo = useCallback((nextStage: TimelineStage) => {
    if (userRole !== "admin") {
      showToast("error", "Từ chối", "Chỉ Ban Tổ Chức (Admin) mới có quyền điều khiển dòng trạng thái!");
      return;
    }

    if (nextStage === "competition" || nextStage === "team_competition") {
      if (!getIsChecklistValid()) {
        showToast("error", "Kiểm tra thất bại", "Vui lòng hoàn thành toàn bộ danh sách kiểm tra (Ready Checklist) trước khi Go Live!");
        return;
      }
    }

    const mapWorkflowStageToStatus = (stage: string): string => {
      switch (stage) {
        case "registration": return "registration";
        case "check_in":
        case "assignment": return "ready";
        case "competition":
        case "team_competition":
        case "ranking":
        case "qualification": return "live";
        case "official_result":
        case "published": return "completed";
        case "archived": return "archived";
        default: return "registration";
      }
    };

    const mapWorkflowStageToWorkflowState = (stage: string): string => {
      switch (stage) {
        case "registration": return "registration_open";
        case "check_in": return "checkin";
        case "assignment": return "lane_assignment";
        case "competition":
        case "team_competition": return "live";
        case "ranking": return "ranking_locked";
        case "qualification": return "verification";
        case "official_result": return "award";
        case "published": return "completed";
        case "archived": return "archived";
        default: return "registration_open";
      }
    };

    let updatedState: any = null;

    setLocalState((prev) => {
      const updated: any = {
        ...prev,
        workflowStage: nextStage,
      };
      if (nextStage === "competition") {
        updated.individualLocked = true;
        updated.teamLocked = true;
        updated.competitionActiveTab = prev.competitionActiveTab || "individual";
      } else if (nextStage === "ranking") {
        updated.individualLocked = true;
        updated.teamLocked = true;
      }
      updatedState = updated;
      return updated;
    });

    lastOutgoingStateRef.current = updatedState;
    lastTransitionTimeRef.current = Date.now();

    if (setCommandCenterState && updatedState) {
      setCommandCenterState(updatedState);
    }

    // Persist immediately to cloud to prevent lag reversion
    if (activeHistoryId && activeHistoryId.startsWith("tour-") && updatedState) {
      const mappedStatus = mapWorkflowStageToStatus(nextStage);
      const mappedWorkflowState = mapWorkflowStageToWorkflowState(nextStage);
      updateOnlineTournament(activeHistoryId, {
        status: mappedStatus,
        workflowState: mappedWorkflowState,
        commandCenterState: updatedState,
      }).catch((err) => console.error("Direct stage sync failed:", err));
    }

    if (nextStage === "team_competition") {
      if (setCompetitionMode) setCompetitionMode("team");
    } else if (nextStage === "competition") {
      const targetMode = localState.competitionActiveTab || "individual";
      if (setCompetitionMode) setCompetitionMode(targetMode);
    }

    const stagesMap: Record<TimelineStage, string> = {
      registration: "Đăng Ký",
      check_in: "Điểm Danh",
      freeze: "Chốt Sổ",
      assignment: "Chia Bệ",
      competition: "Cá Nhân",
      team_competition: "Đồng Đội",
      ranking: "Xếp Hạng",
      qualification: "Thăng Hạng",
      official_result: "Chung Cuộc",
      published: "Công Bố",
      archived: "Lưu Trữ",
    };

    addAuditLog("WORKFLOW_TRANSITION", `Chuyển trạng thái tiến độ giải đấu sang: ${stagesMap[nextStage] || nextStage}.`);
    showToast("success", "Thành công", `Đã chuyển sang giai đoạn ${stagesMap[nextStage] || nextStage}!`);
  }, [userRole, getIsChecklistValid, localState.competitionActiveTab, setCompetitionMode, setCommandCenterState, activeHistoryId, addAuditLog, showToast]);

  const handleToggleCheckIn = useCallback(async (athleteId: string) => {
    const updated = getActiveAthletesList().map((ath) => {
      if (ath.id === athleteId) {
        const currentStatus = ath.status === "Thi đấu" ? "Bỏ thi" : "Thi đấu";
        return { ...ath, status: currentStatus };
      }
      return ath;
    });
    await activeSetterAndCloud(updated);
    showToast("success", "Điểm danh", "Cập nhật trạng thái điểm danh vận động viên thành công!");
  }, [getActiveAthletesList, activeSetterAndCloud, showToast]);

  const getSoloIdxForHeat = useCallback((heatNumber: number) => {
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
  }, []);

  const handleSaveQuickScore = useCallback(async (editingLane: number, editingScores: (boolean | number | null)[]) => {
    if (editingLane === null) return;
    const athleteId = localState.laneStatus[editingLane]?.athleteId;
    if (!athleteId) return;

    const activeAthletesList = getActiveAthletesList();
    const athleteObj = activeAthletesList.find((a) => a && (a.id === athleteId || a.participantId === athleteId));
    if (!athleteObj) return;

    const activeDistance = getActiveDistance();
    const activeShotsCountLimit = getActiveShotsCountLimit();

    const validation = ScoreValidationEngine.validate({
      tournament: {
        id: activeHistoryId || "tour-temp",
        matchName,
        distances: (competitionMode === "individual" ? distances : (teamDistances || [])) as any[],
        status: "live",
        shotsCount: (currentTournamentDoc as any)?.shotsCount || 10,
        teamShotsCount: (currentTournamentDoc as any)?.teamShotsCount || 10,
        directMaxShots: (currentTournamentDoc as any)?.directMaxShots,
        teamDirectMaxShots: (currentTournamentDoc as any)?.teamDirectMaxShots,
        directMaxPoints: (currentTournamentDoc as any)?.directMaxPoints,
        teamDirectMaxPoints: (currentTournamentDoc as any)?.teamDirectMaxPoints,
        tournamentFormat: competitionMode,
      } as any,
      distanceId: activeDistance?.id || "d1",
      lane: {
        laneNumber: editingLane,
        athleteId,
        refereeId: localState.laneStatus[editingLane].refereeId,
        currentShotIndex: editingScores.filter((s) => s !== null).length,
        totalShotsRequired: activeShotsCountLimit,
        scores: editingScores,
        status: "active",
      },
      athlete: athleteObj,
      scores: editingScores,
      refereeContext: {
        userId: "admin",
        role: "admin",
      },
    });

    if (!validation.isValid) {
      showToast("error", "Không hợp lệ", `[Validation Failed] ${validation.error?.message}`);
      return;
    }

    const resolvedHeats = getResolvedHeats();
    const activeHeatObj = (resolvedHeats || localState?.heats || []).find((h: any) => h.heatNumber === localState?.currentHeat);
    const isSoloHeat = activeHeatObj?.heatType === "solo" || activeHeatObj?.heatType === "resolo";

    if (isSoloHeat && activeDistance) {
      const distId = activeDistance.id;
      const targetSoloIdx = getSoloIdxForHeat(localState.currentHeat);

      setLocalState((prev) => {
        const updatedHeats = (prev.heats || []).map((h: any) => {
          if (h.heatNumber === localState.currentHeat) {
            const updatedLanes = (h.lanes || []).map((l: any) => {
              if (l.laneNumber === editingLane || l.participantId === athleteId) {
                return { ...l, scores: validation.sanitizedScores };
              }
              return l;
            });
            return { ...h, lanes: updatedLanes };
          }
          return h;
        });

        return {
          ...prev,
          heats: updatedHeats,
          laneStatus: {
            ...prev.laneStatus,
            [editingLane]: {
              ...prev.laneStatus[editingLane],
              scores: validation.sanitizedScores,
              status: "completed",
            },
          },
        };
      });

      const distAliasKeys = Array.from(new Set([
        distId,
        activeDistance?.id,
        `dist-${distId}`,
        `stage-${distId}`,
        `vong-${distId}`,
      ].filter(Boolean))) as string[];

      const updated = activeAthletesList.map((ath) => {
        if (ath && (ath.id === athleteId || ath.participantId === athleteId)) {
          const existingRounds = getSoloRoundsFromDist(ath, activeDistance);
          const rawRounds = existingRounds.length > 0 ? [...existingRounds] : (Array.isArray(ath.soloRounds?.[distId]) ? [...ath.soloRounds[distId]] : []);
          const rawDetails = Array.isArray(ath.soloShotDetails?.[distId]) ? [...ath.soloShotDetails[distId]] : [];

          while (rawRounds.length <= targetSoloIdx) rawRounds.push(0);
          while (rawDetails.length <= targetSoloIdx) rawDetails.push([]);

          const sanitized = validation.sanitizedScores;
          const soloSum = sanitized.reduce<number>((acc: number, s: any) => acc + (typeof s === "number" ? s : (s === true ? 1 : 0)), 0);

          rawRounds[targetSoloIdx] = soloSum;
          rawDetails[targetSoloIdx] = sanitized;

          const totalSoloHits = rawRounds.reduce((sum, r) => sum + (r || 0), 0);

          const updatedSoloRounds = { ...(ath.soloRounds || {}) };
          const updatedSoloShotDetails = { ...(ath.soloShotDetails || {}) };
          const updatedSoloHits = { ...(ath.soloHits || {}) };

          distAliasKeys.forEach((k) => {
            updatedSoloRounds[k] = rawRounds;
            updatedSoloShotDetails[k] = rawDetails;
            updatedSoloHits[k] = totalSoloHits;
          });

          return {
            ...ath,
            soloRounds: updatedSoloRounds,
            soloShotDetails: updatedSoloShotDetails,
            soloHits: updatedSoloHits,
          };
        }
        return ath;
      });

      await activeSetterAndCloud(updated);
      showToast("success", "Đã lưu", `Đã cập nhật điểm bắn solo nhanh cho bệ bắn ${editingLane}.`);
      addAuditLog("QUICK_SCORE_SOLO", `Lưu điểm solo bệ bắn ${editingLane}: [${validation.sanitizedScores.join(", ")}].`);
    } else {
      setLocalState((prev) => ({
        ...prev,
        laneStatus: {
          ...prev.laneStatus,
          [editingLane]: {
            ...prev.laneStatus[editingLane],
            scores: validation.sanitizedScores,
            status: "completed",
          },
        },
      }));

      if (activeDistance) {
        const distId = activeDistance.id;
        const updated = activeAthletesList.map((ath) => {
          if (ath && (ath.id === athleteId || ath.participantId === athleteId)) {
            const updatedScores = { ...(ath.scores || {}) };
            updatedScores[distId] = validation.sanitizedScores;

            const distAliasKeys = Array.from(new Set([
              distId,
              activeDistance?.id,
              `dist-${distId}`,
              `stage-${distId}`,
              `vong-${distId}`,
            ].filter(Boolean))) as string[];

            distAliasKeys.forEach((k) => {
              updatedScores[k] = validation.sanitizedScores;
            });

            return {
              ...ath,
              scores: updatedScores,
            };
          }
          return ath;
        });

        await activeSetterAndCloud(updated);
        showToast("success", "Đã lưu", `Đã lưu nhanh kết quả bắn của bệ bắn ${editingLane}.`);
        addAuditLog("QUICK_SCORE_SAVE", `Lưu điểm bệ bắn ${editingLane}: [${validation.sanitizedScores.join(", ")}].`);
      }
    }
  }, [
    localState.laneStatus,
    localState.currentHeat,
    localState.heats,
    getActiveAthletesList,
    getActiveDistance,
    getActiveShotsCountLimit,
    getResolvedHeats,
    activeHistoryId,
    matchName,
    competitionMode,
    distances,
    teamDistances,
    currentTournamentDoc,
    activeSetterAndCloud,
    addAuditLog,
    getSoloIdxForHeat,
    showToast,
  ]);

  return {
    localState,
    setLocalState,
    addAuditLog,
    handleTransitionTo,
    handleToggleCheckIn,
    handleSaveQuickScore,
    getSoloIdxForHeat,
  };
}
