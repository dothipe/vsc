import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { DistanceConfig, Athlete, MatchHistoryItem, StoredAthleteList, Club } from "../types";
import { auth, db, doc, onSnapshot, updateDoc } from "../firebase";
import { 
  subscribeToTournamentDoc, 
  updateOnlineTournament, 
  updateOnlineTournamentTimer, 
  LiveTimerConfig, 
  TournamentData,
  subscribeToVscSystemAthletes, 
  subscribeToVscSystemClubs, 
  subscribeToVscSystemSponsors, 
  sanitizeFirestoreData, 
  deserializeFirestoreData,
  normalize2DArray,
  ensureArray
} from "../lib/firebaseService";
import { getGlobalRole, getTournamentRole } from "../foundation/permissions";
import { getVisibleNavigation } from "../foundation/navigationManifest";
import { tournamentRepository } from "../repositories/tournament.repository";
import { usePermission } from "./PermissionProvider";
import { useGlobalTimer } from "../hooks/useGlobalTimer";
import { ScoreValidationEngine } from "../engines/scoreValidationEngine";
import { 
  DEFAULT_DISTANCES, 
  DEFAULT_SHOTS_COUNT, 
  DEFAULT_ATHLETES, 
  DEFAULT_HISTORY, 
  DEFAULT_STORED_LISTS 
} from "../initialData";
import { deepEqual } from "../utils/generalUtils";
import { isAthleteEliminated, isAthleteEliminatedInPrevStage, isNoTeam } from "../utils/athleteUtils";

const TournamentStateContext = createContext<any>(null);

export const useTournamentState = () => {
  const context = useContext(TournamentStateContext);
  if (!context) {
    throw new Error("useTournamentState must be used within a TournamentStateProvider");
  }
  return context;
};

interface ProviderProps {
  children: ReactNode;
}

export function TournamentStateProvider({ children }: ProviderProps) {
  const { setOverriddenRole, setOverriddenRoleV3 } = usePermission();
  const [isStorageRestoring, setIsStorageRestoring] = useState(true);
  const [isNewTournamentModalOpen, setIsNewTournamentModalOpen] = useState(false);

  // --- Persistent States ---
  const [matchName, setMatchName] = useState<string>("Giải Vô Địch Bắn Ná Slingshot 2026");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [headerTempName, setHeaderTempName] = useState<string>(matchName);

  const restoreAllData = async () => {
    setIsStorageRestoring(false);
  };

  useEffect(() => {
    restoreAllData();
  }, []);

  useEffect(() => {
    setHeaderTempName(matchName);
  }, [matchName]);

  const handleSaveHeaderMatchName = () => {
    const trimmed = headerTempName.trim();
    if (!trimmed) return;

    const oldName = matchName.trim();
    if (oldName && oldName.toLowerCase() !== trimmed.toLowerCase()) {
      setStoredAthleteLists((prev) => {
        return prev.map((item) => {
          if (item.name.trim().toLowerCase() === oldName.toLowerCase()) {
            return { ...item, name: trimmed };
          }
          return item;
        });
      });

      setHistory((prev) => {
        return prev.map((item) => {
          if (item.matchName.trim().toLowerCase() === oldName.toLowerCase()) {
            return { ...item, matchName: trimmed };
          }
          return item;
        });
      });
    }

    setMatchName(trimmed);
  };

  const [distances, setDistances] = useState<DistanceConfig[]>(() => JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
  const [shotsCount, setShotsCount] = useState<number>(DEFAULT_SHOTS_COUNT);
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const seen = new Set<string>();
    return DEFAULT_ATHLETES.filter((a: Athlete) => {
      if (!a || !a.id) return false;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return false;
      seen.add(stripped);
      return true;
    });
  });

  const [competitionMode, setCompetitionMode] = useState<"individual" | "team">("individual");
  const [isSpectatorModeOverridden, setIsSpectatorModeOverridden] = useState(false);
  const isSpectatorModeOverriddenRef = useRef(false);
  useEffect(() => {
    isSpectatorModeOverriddenRef.current = isSpectatorModeOverridden;
  }, [isSpectatorModeOverridden]);

  const [systemAdminRoleOverride, setSystemAdminRoleOverride] = useState<"system_owner" | "admin" | "referee" | "spectator" | null>(null);

  useEffect(() => {
    if (systemAdminRoleOverride) {
      if (systemAdminRoleOverride === "system_owner") {
        setOverriddenRole("system_owner");
        setOverriddenRoleV3("system_owner");
      } else if (systemAdminRoleOverride === "admin") {
        setOverriddenRole("admin");
        setOverriddenRoleV3("admin");
      } else if (systemAdminRoleOverride === "referee") {
        setOverriddenRole("referee");
        setOverriddenRoleV3("referee");
      } else if (systemAdminRoleOverride === "spectator") {
        setOverriddenRole("viewer");
        setOverriddenRoleV3("viewer");
      }
    } else {
      setOverriddenRole(null);
      setOverriddenRoleV3(null);
    }
  }, [systemAdminRoleOverride, setOverriddenRole, setOverriddenRoleV3]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatICTTime = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  };

  const formatICTDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  };

  const [networkStatus, setNetworkStatus] = useState<"online" | "offline" | null>(null);
  const onlineTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => {
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
      setNetworkStatus("online");
      onlineTimerRef.current = setTimeout(() => {
        setNetworkStatus(null);
      }, 5000);
    };
    const handleOffline = () => {
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
      setNetworkStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (onlineTimerRef.current) clearTimeout(onlineTimerRef.current);
    };
  }, []);

  const [scoreEvents, setScoreEvents] = useState<any[]>([]);
  const [scoreVersions, setScoreVersions] = useState<any[]>([]);
  const [expandedAthleteIds, setExpandedAthleteIds] = useState<Record<string, boolean>>({});
  const [teamDistances, setTeamDistances] = useState<DistanceConfig[]>(() => JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
  const [teamShotsCount, setTeamShotsCount] = useState<number>(DEFAULT_SHOTS_COUNT);

  const [commandCenterState, setCommandCenterState] = useState<any | null>(null);
  const lastWriteTimeRef = useRef<number>(0);
  const isIncomingUpdateRef = useRef<boolean>(false);
  const lastIncomingUpdateRef = useRef<number>(0);
  const lastSentPayloadRef = useRef<string>("");
  const prevActiveHistoryIdRef = useRef<string | null>(null);

  const setCommandCenterStateWithWriteTime = useCallback((newStateOrUpdater: any) => {
    lastWriteTimeRef.current = Date.now();
    setCommandCenterState(newStateOrUpdater);
  }, []);

  // Admin Edit and Soft Delete Score states
  const [editingScoreEvent, setEditingScoreEvent] = useState<any | null>(null);
  const [editingScores, setEditingScores] = useState<any[]>([]);
  const [editReason, setEditReason] = useState("");
  const [deletingScoreEvent, setDeletingScoreEvent] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenLaneNumber, setReopenLaneNumber] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  const [showCallAthleteModal, setShowCallAthleteModal] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const [callSearchTerm, setCallSearchTerm] = useState("");
  const [callLaneAssignments, setCallLaneAssignments] = useState<Record<string, number>>({});

  // QR Code Scanner States and Hooks
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [scannedAthleteConfirmData, setScannedAthleteConfirmData] = useState<any | null>(null);
  const qrScannerRef = useRef<any>(null);
  const qrIsTransitioningRef = useRef(false);
  const stopPendingRef = useRef(false);

  // Lookup scanned athlete and check status for confirmation
  const handleLookupScannedAthlete = (scannedText: string) => {
    if (!scannedText) return;
    let targetId = scannedText.trim();
    if (targetId.toUpperCase().includes("VSC-")) {
      const parts = targetId.split("-");
      const bibIdx = parts.indexOf("BIB");
      if (bibIdx !== -1 && bibIdx + 1 < parts.length) {
        targetId = parts[bibIdx + 1];
      } else {
        targetId = parts[parts.length - 1];
      }
    }
    const allAths = (competitionMode === "individual"
      ? athletes
      : (teamAthletes && teamAthletes.length > 0
          ? teamAthletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName))
          : athletes.filter((a) => a.isPrimaryTeam && !isNoTeam(a.team || a.clubName)))) || [];
    const athleteObj = allAths.find((a) => 
      a.id.toLowerCase() === targetId.toLowerCase() ||
      (a.bibNumber && a.bibNumber.toLowerCase() === targetId.toLowerCase()) ||
      (a.vscNumber && a.vscNumber.toLowerCase() === targetId.toLowerCase())
    );
    if (!athleteObj) {
      alert(`❌ Không tìm thấy vận động viên với mã: "${targetId}" trong giải đấu này!`);
      if (activeCameraId) {
        startQrScanning(activeCameraId);
      }
      return;
    }
    const currentDistIdx = commandCenterState?.currentDistanceIndex || 0;
    const currentDistList = competitionMode === "individual" ? distances : teamDistances;
    const activeDistanceObj = currentDistList[currentDistIdx];
    const currentDistId = activeDistanceObj?.id;
    const activeDistanceName = activeDistanceObj?.distance || `Vòng ${currentDistIdx + 1}`;
    const hasCompleted = (commandCenterState?.scoreEvents || scoreEvents || []).some(
      (evt: any) => evt.athleteId === athleteObj.id && evt.distanceId === currentDistId && !evt.deleted
    ) || (() => {
      const mainScores = athleteObj.scores?.[currentDistId];
      return mainScores && mainScores.some((s: any) => s !== null && s !== undefined);
    })();
    let isDisqualifiedOrDNS = false;
    let statusMsg = "";
    if (athleteObj.status === "Bỏ thi" || athleteObj.status === "DNS" || athleteObj.checkInStatus === "DNS") {
      isDisqualifiedOrDNS = true;
      statusMsg = "VĐV đang ở trạng thái Bỏ thi / DNS!";
    } else if (athleteObj.status === "DQ") {
      isDisqualifiedOrDNS = true;
      statusMsg = "VĐV đã bị tước quyền thi đấu (DQ)!";
    } else if (athleteObj.status === "Withdraw") {
      isDisqualifiedOrDNS = true;
      statusMsg = "VĐV đã rút lui khỏi giải đấu!";
    }
    let isPresentInCurrentHeats = true;
    let assignedHeatNum: number | null = null;
    let assignedLaneNum: number | null = null;

    let currentStageHeats: any[] | null = null;
    if (commandCenterState?.activeSubStage === currentDistId && Array.isArray(commandCenterState?.heats)) {
      currentStageHeats = commandCenterState.heats;
    } else {
      const capturedRounds = commandCenterState?.capturedRounds;
      if (capturedRounds?.[currentDistId]?.heatsSnapshot) {
        currentStageHeats = capturedRounds[currentDistId].heatsSnapshot;
      } else {
        const sourceVersions = commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
        const matches = sourceVersions.filter((v: any) => v.stageId === currentDistId);
        const sortedMatches = [...matches].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        if (sortedMatches[0]) {
          currentStageHeats = sortedMatches[0].heats;
        }
      }
    }

    const checkLaneMatchesAthlete = (l: any) => {
      if (!l) return false;
      const lPartId = (l.participantId || "").toLowerCase().trim();
      const lAthId = (l.athleteId || "").toLowerCase().trim();
      const lFullName = (l.fullName || "").toLowerCase().trim();
      const lBib = (l.bibNumber || "").toLowerCase().trim();

      const aId = (athleteObj.id || "").toLowerCase().trim();
      const aPartId = (athleteObj.participantId || "").toLowerCase().trim();
      const aName = (athleteObj.name || "").toLowerCase().trim();
      const aFullName = (athleteObj.fullName || "").toLowerCase().trim();
      const aBib = (athleteObj.bibNumber || "").toLowerCase().trim();
      const aVsc = (athleteObj.vscNumber || "").toLowerCase().trim();

      return (
        (lPartId && (lPartId === aId || lPartId === aPartId || lPartId === aBib || lPartId === aVsc)) ||
        (lAthId && (lAthId === aId || lAthId === aPartId || lAthId === aBib || lAthId === aVsc)) ||
        (lFullName && (lFullName === aName || lFullName === aFullName)) ||
        (lBib && (lBib === aBib || lBib === aId || lBib === aPartId || lBib === aVsc))
      );
    };

    if (Array.isArray(currentStageHeats)) {
      let found = false;
      currentStageHeats.forEach((h: any) => {
        const foundLane = h.lanes?.find(checkLaneMatchesAthlete);
        if (foundLane) {
          assignedHeatNum = h.heatNumber;
          assignedLaneNum = foundLane.laneNumber;
          found = true;
        }
      });
      if (currentDistIdx > 0 && !found) {
        isPresentInCurrentHeats = false;
      }
    } else if (commandCenterState?.heats) {
      let found = false;
      commandCenterState.heats.forEach((h: any) => {
        const foundLane = h.lanes?.find(checkLaneMatchesAthlete);
        if (foundLane) {
          assignedHeatNum = h.heatNumber;
          assignedLaneNum = foundLane.laneNumber;
          found = true;
        }
      });
      if (currentDistIdx > 0 && !found) {
        isPresentInCurrentHeats = false;
      }
    }
    const workspaces = commandCenterState?.refereeWorkspaces || [];
    const occupiedLanes = new Set<number>();
    workspaces.forEach((ws: any) => {
      if (ws.athletes) {
        ws.athletes.forEach((a: any) => {
          if (a.status === "scoring" && a.laneNumber) {
            occupiedLanes.add(Number(a.laneNumber));
          }
        });
      }
    });
    if (commandCenterState?.laneStatus) {
      Object.entries(commandCenterState.laneStatus).forEach(([lStr, lVal]: [string, any]) => {
        if (lVal?.athleteId && lVal?.status !== "completed") {
          occupiedLanes.add(Number(lStr));
        }
      });
    }
    let preferredLane = assignedLaneNum || 1;
    let nextFreeLane = preferredLane;
    const isLaneOccupied = occupiedLanes.has(preferredLane);
    if (isLaneOccupied) {
      const laneLimit = getActiveLaneLimit();
      for (let l = 1; l <= laneLimit; l++) {
        if (!occupiedLanes.has(l)) {
          nextFreeLane = l;
          break;
        }
      }
    }

    // Build the sequential progress across all stages of the tournament
    const stageProgress = currentDistList.map((st: any, idx: number) => {
      const isCompleted = (commandCenterState?.scoreEvents || scoreEvents || []).some(
        (evt: any) => evt.athleteId === athleteObj.id && evt.distanceId === st.id && !evt.deleted
      ) || (() => {
        const mainScores = athleteObj.scores?.[st.id];
        return mainScores && mainScores.some((s: any) => s !== null && s !== undefined);
      })();

      const eliminatedInPrev = isAthleteEliminatedInPrevStage(athleteObj, st.id, currentDistList);
      const eliminatedInThis = !eliminatedInPrev && isAthleteEliminated(athleteObj, st.id, currentDistList);

      let stageHeats: any[] | null = null;
      if (commandCenterState?.activeSubStage === st.id && Array.isArray(commandCenterState?.heats)) {
        stageHeats = commandCenterState.heats;
      } else {
        const capturedRounds = commandCenterState?.capturedRounds;
        if (capturedRounds?.[st.id]?.heatsSnapshot) {
          stageHeats = capturedRounds[st.id].heatsSnapshot;
        } else {
          const sourceVersions = commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.commandCenterState?.assignmentVersions || (currentTournamentDoc as any)?.assignmentVersions || [];
          const matches = sourceVersions.filter((v: any) => v.stageId === st.id);
          const sortedMatches = [...matches].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          if (sortedMatches[0]) {
            stageHeats = sortedMatches[0].heats;
          }
        }
      }

      let hNum: number | null = null;
      let lNum: number | null = null;
      if (Array.isArray(stageHeats)) {
        stageHeats.forEach((h: any) => {
          const foundLane = h.lanes?.find(checkLaneMatchesAthlete);
          if (foundLane) {
            hNum = h.heatNumber;
            lNum = foundLane.laneNumber;
          }
        });
      }

      return {
        stageId: st.id,
        stageName: st.distance || `Vòng ${idx + 1}`,
        isCompleted,
        eliminatedInPrev,
        eliminatedInThis,
        assignedHeatNum: hNum,
        assignedLaneNum: lNum,
        isCurrent: st.id === currentDistId
      };
    });

    setScannedAthleteConfirmData({
      athleteObj,
      activeDistanceName,
      hasCompleted,
      isDisqualifiedOrDNS,
      statusMsg,
      isPresentInCurrentHeats,
      assignedHeatNum,
      assignedLaneNum,
      nextFreeLane,
      scannedText,
      stageProgress
    });
  };

  const startQrScanning = async (cameraId: string) => {
    if (qrIsTransitioningRef.current) return;
    stopPendingRef.current = false;
    qrIsTransitioningRef.current = true;
    try {
      setQrScannerError(null);
      setScannedAthleteConfirmData(null);
      if (qrScannerRef.current) {
        try {
          if (qrScannerRef.current.isScanning) {
            await qrScannerRef.current.stop();
          }
        } catch (e) {
          console.error(e);
        }
        qrScannerRef.current = null;
      }
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader-view-element");
      qrScannerRef.current = scanner;
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(200);
          try {
            if (scanner.isScanning) await scanner.stop();
          } catch (e) {
            console.error(e);
          }
          qrScannerRef.current = null;
          handleLookupScannedAthlete(decodedText);
        },
        () => {}
      );
      if (stopPendingRef.current) {
        qrIsTransitioningRef.current = false;
        await stopQrScanning();
      }
    } catch (err: any) {
      setQrScannerError(`Lỗi khởi động camera: ${err.message || err}`);
    } finally {
      qrIsTransitioningRef.current = false;
    }
  };

  const stopQrScanning = async () => {
    if (qrIsTransitioningRef.current) {
      stopPendingRef.current = true;
      return;
    }
    if (qrScannerRef.current) {
      qrIsTransitioningRef.current = true;
      try {
        if (qrScannerRef.current.isScanning) await qrScannerRef.current.stop();
      } catch (err) {
        console.error(err);
      } finally {
        qrScannerRef.current = null;
        qrIsTransitioningRef.current = false;
        stopPendingRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (showQrScanner) {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        Html5Qrcode.getCameras()
          .then((cameras) => {
            setAvailableCameras(cameras);
            if (cameras.length > 0) {
              const backCam = cameras.find((c) =>
                c.label.toLowerCase().includes("back") ||
                c.label.toLowerCase().includes("sau") ||
                c.label.toLowerCase().includes("environment") ||
                c.label.toLowerCase().includes("rear")
              );
              const selectedCam = backCam || cameras[0];
              setActiveCameraId(selectedCam.id);
              startQrScanning(selectedCam.id);
            } else {
              setQrScannerError("Không tìm thấy camera trên thiết bị!");
            }
          })
          .catch(() => {
            setQrScannerError("Không thể truy cập camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt!");
          });
      });
    } else {
      stopQrScanning();
    }
    return () => {
      stopQrScanning();
    };
  }, [showQrScanner]);

  const [directMaxShots, setDirectMaxShots] = useState<number>(10);
  const [directMaxPoints, setDirectMaxPoints] = useState<number | undefined>(undefined);
  const [teamDirectMaxShots, setTeamDirectMaxShots] = useState<number>(10);
  const [teamDirectMaxPoints, setTeamDirectMaxPoints] = useState<number | undefined>(undefined);

  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>(() => {
    const seen = new Set<string>();
    return DEFAULT_ATHLETES.filter((a: Athlete) => {
      if (!a || !a.id) return false;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return false;
      seen.add(stripped);
      return true;
    });
  });

  const [teamInputAthletes, setTeamInputAthletes] = useState<Athlete[]>([]);
  const [masterAthletes, setMasterAthletes] = useState<Athlete[]>(() => {
    const seen = new Set<string>();
    return DEFAULT_ATHLETES.filter((a: Athlete) => {
      if (!a || !a.id) return false;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return false;
      seen.add(stripped);
      return true;
    });
  });

  const [history, setHistory] = useState<MatchHistoryItem[]>(() => {
    return (DEFAULT_HISTORY || []).filter((h: any) => h && h.matchName && h.matchName.trim());
  });

  const [storedAthleteLists, setStoredAthleteLists] = useState<StoredAthleteList[]>(() => {
    return (DEFAULT_STORED_LISTS || []).filter((l: any) => l && l.name && l.name.trim());
  });

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("activeHistoryId") || params.get("tournamentId") || params.get("id");
      if (urlId) return urlId;
    }
    return null;
  });

  // Authentication and realtime sync states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [homeActiveSubTab, setHomeActiveSubTab] = useState<"all" | "live" | "followed">("all");
  const [currentTournamentDoc, setCurrentTournamentDoc] = useState<TournamentData | null>(null);

  const getActiveLaneLimit = () => {
    return (currentTournamentDoc as any)?.laneCapacity || commandCenterState?.laneCount || 13;
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      } else {
        setUserProfile(null);
      }
    }, (error) => {
      console.warn("Error listening to user profile:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Deduplication safety effects
  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = athletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = athletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setAthletes(cleaned);
    }
  }, [athletes]);

  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = teamAthletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = teamAthletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setTeamAthletes(cleaned);
    }
  }, [teamAthletes]);

  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = masterAthletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = masterAthletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setMasterAthletes(cleaned);
    }
  }, [masterAthletes]);

  const [activeTab, setActiveTab] = useState<any>(() => {
    return activeHistoryId ? "dashboard" : "home";
  });
  const [deleteTournamentConfirm, setDeleteTournamentConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRankingMenuOpen, setIsMobileRankingMenuOpen] = useState(false);
  const [rankingMode, setRankingMode] = useState<"individual" | "team">("individual");
  const [rankingEnvironment, setRankingEnvironment] = useState<"individual" | "team">("individual");

  useEffect(() => {
    const fmt = currentTournamentDoc?.tournamentFormat;
    if (fmt === "individual") {
      setRankingEnvironment("individual");
      setRankingMode("individual");
    } else {
      setRankingEnvironment(competitionMode);
    }
  }, [competitionMode, currentTournamentDoc?.tournamentFormat]);

  const [controlPanelSubTab, setControlPanelSubTab] = useState<any>("profile");
  const [scoringSearchQuery, setScoringSearchQuery] = useState("");
  const [scoringDistanceFilter, setScoringDistanceFilter] = useState("all");
  const [scoringTypeFilter, setScoringTypeFilter] = useState("all");

  useEffect(() => {
    if (!currentUser && !["home", "dashboard", "leaderboard", "teams", "athletes", "clubs", "tournaments", "provinces", "seasons", "scoring", "control_panel", "public_registration"].includes(activeTab)) {
      setActiveTab("home");
    }
  }, [currentUser, activeTab]);

  const [refereeSelectedLane, setRefereeSelectedLane] = useState<number | null>(null);
  const [showRefereeLaneModal, setShowRefereeLaneModal] = useState(false);

  useEffect(() => {
    if (activeTab === "input_scores") {
      setShowRefereeLaneModal(true);
    }
  }, [activeTab]);

  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showExitAndCreateConfirmModal, setShowExitAndCreateConfirmModal] = useState(false);
  const [switchingTournamentData, setSwitchingTournamentData] = useState<{ id: string; tournamentName: string; targetTab?: string } | null>(null);

  const [followedTournaments, setFollowedTournaments] = useState<string[]>([]);

  useEffect(() => {
    if (userProfile && userProfile.followedTournaments !== undefined) {
      const dbFollowed = userProfile.followedTournaments
        ? userProfile.followedTournaments.split(",").filter(Boolean)
        : [];
      const isSame = dbFollowed.length === followedTournaments.length && 
                     dbFollowed.every((val) => followedTournaments.includes(val));
      if (!isSame) {
        setFollowedTournaments(dbFollowed);
      }
    }
  }, [userProfile]);

  const toggleFollowTournament = async (id: string) => {
    if (!id) return;
    const isCurrentlyFollowed = followedTournaments.includes(id);
    const next = isCurrentlyFollowed ? followedTournaments.filter((item) => item !== id) : [...followedTournaments, id];
    setFollowedTournaments(next);
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { followedTournaments: next.join(",") });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [v3Tournaments, setV3Tournaments] = useState<any[]>([]);
  useEffect(() => {
    const unsubscribe = tournamentRepository.subscribeList([], (list) => {
      setV3Tournaments(list || []);
    }, (err) => {
      console.error(err);
    });
    return () => unsubscribe();
  }, []);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [visibleTournamentsCount, setVisibleTournamentsCount] = useState<number>(10);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setVisibleTournamentsCount(isMobile ? 10 : 40);
  }, [isMobile]);

  useEffect(() => {
    if (activeTab !== "home" || activeHistoryId) return;
    const handleScroll = () => {
      const threshold = 150;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      if (isNearBottom) {
        setVisibleTournamentsCount((prev) => {
          const maxLimit = isMobile ? 60 : 160;
          if (prev >= maxLimit) return prev;
          const increment = isMobile ? 5 : 12;
          const nextVal = prev + increment;
          return nextVal > maxLimit ? maxLimit : nextVal;
        });
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, activeHistoryId, isMobile]);

  const [vscSystemAthletes, setVscSystemAthletes] = useState<Athlete[]>([]);
  const [vscSystemClubs, setVscSystemClubs] = useState<any[]>([]);
  useEffect(() => {
    const unsubAthletes = subscribeToVscSystemAthletes((list) => {
      setVscSystemAthletes(list || []);
    });
    const unsubClubs = subscribeToVscSystemClubs((list) => {
      setVscSystemClubs(list || []);
    });
    return () => {
      unsubAthletes();
      unsubClubs();
    };
  }, []);

  const incrementTournamentViews = (id: string) => {
    if (!id) return;
    const tour = v3Tournaments.find(t => t.id === id);
    const currentViews = tour?.views || 0;
    tournamentRepository.update(id, { views: currentViews + 1 })
      .catch(err => console.error(err));
  };

  const handleSelectTournament = (id: string, tournament: any, targetTab?: string) => {
    if (activeHistoryId && activeHistoryId !== id) {
      setSwitchingTournamentData({
        id,
        tournamentName: tournament?.tournamentName || tournament?.matchName || "Giải đấu mới",
        targetTab: targetTab || "dashboard"
      });
    } else {
      setActiveHistoryId(id);
      if (id) {
        incrementTournamentViews(id);
        if (targetTab === "liveboard") {
          setActiveTab("dashboard");
          setIsLiveBoardOpen(true);
        } else {
          setActiveTab((targetTab as any) || "dashboard");
        }
      }
    }
  };

  const confirmTournamentSwitch = () => {
    if (!switchingTournamentData) return;
    const { id, targetTab } = switchingTournamentData;

    setAthletes([]);
    setMasterAthletes([]);
    setTeamAthletes([]);
    setInputAthletes([]);
    setTeamInputAthletes([]);
    setMatchName("");
    setHeaderTempName("");
    setStartDate("");
    setEndDate("");
    setDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setShotsCount(DEFAULT_SHOTS_COUNT);
    setTeamDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setTeamShotsCount(DEFAULT_SHOTS_COUNT);
    setCompetitionMode("individual");
    setDirectMaxPoints(undefined);
    setTeamDirectMaxPoints(undefined);

    setActiveHistoryId(id);
    incrementTournamentViews(id);
    if (targetTab === "liveboard") {
      setActiveTab("dashboard");
      setIsLiveBoardOpen(true);
    } else {
      setActiveTab((targetTab as any) || "dashboard");
    }
    setSwitchingTournamentData(null);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLiveBoardOpen, setIsLiveBoardOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  useEffect(() => {
    const handleOpenLiveBoard = () => setIsLiveBoardOpen(true);
    window.addEventListener("openLiveBoard", handleOpenLiveBoard);
    return () => window.removeEventListener("openLiveBoard", handleOpenLiveBoard);
  }, []);

  const [isScoringEditAuthorized, setIsScoringEditAuthorized] = useState(false);
  const [showUnlockScoreModal, setShowUnlockScoreModal] = useState(false);
  const [pendingScoreToggle, setPendingScoreToggle] = useState<{ athleteId: string; distanceId: string; shotIndex: number } | null>(null);
  const [pendingDirectScoreUpdate, setPendingDirectScoreUpdate] = useState<{ athleteId: string; distanceId: string; value: number | null; shotIndex: number } | null>(null);
  const [pendingAddAthlete, setPendingAddAthlete] = useState(false);
  const [pendingScrollAthleteId, setPendingScrollAthleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "scoring") {
      setIsScoringEditAuthorized(false);
      setPendingAddAthlete(false);
      setPendingScoreToggle(null);
      setPendingDirectScoreUpdate(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "scoring" && pendingScrollAthleteId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`athlete-card-${pendingScrollAthleteId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add("ring-8", "ring-indigo-500/20", "transition-all", "duration-500");
          setTimeout(() => {
            element.classList.remove("ring-8", "ring-indigo-500/20");
          }, 2000);
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        setPendingScrollAthleteId(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeTab, pendingScrollAthleteId]);

  const [inputAthletes, setInputAthletes] = useState<Athlete[]>([]);
  const [clubs, setClubs] = useState<Club[]>(() => [
    { id: "club-1", name: "CLB Bắn Ná Việt Nam", avatarUrl: "", province: "Hà Nội" }
  ]);
  const [isAddingAthleteToInputBoard, setIsAddingAthleteToInputBoard] = useState(false);
  const [inputBoardAddSearch, setInputBoardAddSearch] = useState("");
  const [selectedInputBoardAthleteIds, setSelectedInputBoardAthleteIds] = useState<string[]>([]);

  const [isAddingAthleteToTournament, setIsAddingAthleteToTournament] = useState(false);
  const [tourAddSearch, setTourAddSearch] = useState("");
  const [selectedTourAthleteIds, setSelectedTourAthleteIds] = useState<string[]>([]);

  const [systemSponsors, setSystemSponsors] = useState<any[]>([]);
  useEffect(() => {
    const unsubscribeSponsors = subscribeToVscSystemSponsors((data) => {
      setSystemSponsors(data || []);
    });
    return () => unsubscribeSponsors();
  }, []);

  const isOnlineTournament = activeHistoryId?.startsWith("tour-");
  const isGlobalAdmin = currentUser?.email 
    ? (getGlobalRole(currentUser.email) === "system_owner" || getGlobalRole(currentUser.email) === "admin") 
    : false;
  const isTournamentOwner = currentUser && currentTournamentDoc && (currentTournamentDoc.creatorId === currentUser.uid || isGlobalAdmin);
  const isTournamentSubAdmin = currentUser && currentTournamentDoc && (currentTournamentDoc.subAdmins?.some((email: string) => email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()));
  const isTournamentReferee = currentUser && currentTournamentDoc && (currentTournamentDoc.referees?.includes(currentUser.email || ""));

  const baseUserRole = isGlobalAdmin
    ? "admin"
    : !currentUser
      ? "spectator"
      : (activeHistoryId && !isOnlineTournament)
        ? "admin" 
        : (isTournamentOwner || isTournamentSubAdmin) 
          ? "admin" 
          : isTournamentReferee 
            ? "referee" 
            : "spectator";

  const userRole = isGlobalAdmin && systemAdminRoleOverride
    ? (systemAdminRoleOverride === "system_owner" || systemAdminRoleOverride === "admin" ? "admin" : systemAdminRoleOverride === "referee" ? "referee" : "spectator")
    : baseUserRole;

  const canControlTimer = useMemo(() => {
    return userRole === "admin" || userRole === "referee";
  }, [userRole]);

  const handleSyncTimerToRemote = useCallback((timerData: LiveTimerConfig) => {
    if (activeHistoryId && canControlTimer) {
      updateOnlineTournamentTimer(activeHistoryId, timerData);
    }
  }, [activeHistoryId, canControlTimer]);

  const globalTimer = useGlobalTimer(
    150,
    activeHistoryId,
    currentTournamentDoc?.liveTimer,
    handleSyncTimerToRemote
  );

  const baseGlobalRole = useMemo(() => getGlobalRole(currentUser?.email), [currentUser]);
  const globalRole = useMemo(() => {
    if (isGlobalAdmin && systemAdminRoleOverride) {
      if (systemAdminRoleOverride === "system_owner") return "system_owner";
      if (systemAdminRoleOverride === "admin") return "admin";
      if (systemAdminRoleOverride === "referee" || systemAdminRoleOverride === "spectator") return "user";
    }
    return baseGlobalRole;
  }, [isGlobalAdmin, systemAdminRoleOverride, baseGlobalRole]);

  const baseTournamentRole = useMemo(() => getTournamentRole(currentUser?.email, currentUser?.uid, currentTournamentDoc), [currentUser, currentTournamentDoc]);
  const tournamentRole = useMemo(() => {
    if (isGlobalAdmin && systemAdminRoleOverride) {
      if (systemAdminRoleOverride === "system_owner") return "tournament_owner";
      if (systemAdminRoleOverride === "admin") return "sub_admin";
      if (systemAdminRoleOverride === "referee") return "referee";
      if (systemAdminRoleOverride === "spectator") return "spectator";
    }
    return baseTournamentRole;
  }, [isGlobalAdmin, systemAdminRoleOverride, baseTournamentRole]);

  const visibleNavigation = useMemo(() => {
    return getVisibleNavigation({
      activeHistoryId,
      currentTournamentDoc,
      globalRole,
      tournamentRole,
      customSubAdminCaps: (currentTournamentDoc as any)?.customSubAdminCaps
    });
  }, [activeHistoryId, currentTournamentDoc, globalRole, tournamentRole]);

  useEffect(() => {
    if (visibleNavigation.length > 0) {
      const isCurrentTabVisible = visibleNavigation.some((n) => n.id === activeTab);
      if (!isCurrentTabVisible) {
        const defaultTab = visibleNavigation.find(n => n.id === "dashboard") || visibleNavigation[0];
        if (defaultTab && defaultTab.id !== activeTab) {
          setActiveTab(defaultTab.id as any);
        }
      }
    }
  }, [visibleNavigation, activeTab]);

  useEffect(() => {
    if (userRole === "admin") return;
    if (!commandCenterState) return;
    const isIndivLocked = commandCenterState.individualLocked === true;
    const isTmLocked = commandCenterState.teamLocked === true;
    if (!isIndivLocked && isTmLocked) {
      if (competitionMode !== "individual") setCompetitionMode("individual");
    } else if (isIndivLocked && !isTmLocked) {
      if (competitionMode !== "team") setCompetitionMode("team");
    }
  }, [commandCenterState?.individualLocked, commandCenterState?.teamLocked, competitionMode, userRole]);

  useEffect(() => {
    setCurrentTournamentDoc(null);
    setIsSpectatorModeOverridden(false);
    setMasterAthletes(vscSystemAthletes);
    if (!activeHistoryId || !activeHistoryId.startsWith("tour-")) return;

    const unsubscribe = subscribeToTournamentDoc(activeHistoryId, (rawDocVal) => {
      if (rawDocVal) {
        isIncomingUpdateRef.current = true;
        lastIncomingUpdateRef.current = Date.now();
        const docVal = deserializeFirestoreData(rawDocVal);
        setCurrentTournamentDoc(docVal);
        if (docVal.matchName) {
          setMatchName(docVal.matchName);
          setHeaderTempName(docVal.matchName);
        }
        if (docVal.startDate !== undefined) setStartDate(docVal.startDate || "");
        if (docVal.endDate !== undefined) setEndDate(docVal.endDate || "");
        let resolvedMode = docVal.competitionMode || "individual";
        if (docVal.tournamentFormat === "individual") resolvedMode = "individual";
        if (!isSpectatorModeOverriddenRef.current || (docVal.tournamentFormat && docVal.tournamentFormat !== "mixed")) {
          setCompetitionMode(resolvedMode);
        }
        if (docVal.shotsCount) setShotsCount(docVal.shotsCount);
        if (docVal.teamShotsCount) setTeamShotsCount(docVal.teamShotsCount);
        if (docVal.distances) {
          setDistances((prev) => !deepEqual(prev, docVal.distances) ? docVal.distances : prev);
        }
        if (docVal.teamDistances) {
          setTeamDistances((prev) => !deepEqual(prev, docVal.teamDistances) ? docVal.teamDistances : prev);
        }
        if (docVal.athletes) {
          setAthletes((prev) => {
            const restored = docVal.athletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        }
        if (docVal.teamAthletes && docVal.teamAthletes.length > 0) {
          setTeamAthletes((prev) => {
            const restored = docVal.teamAthletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        } else if (docVal.athletes) {
          setTeamAthletes((prev) => {
            const restored = docVal.athletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        }
        if (docVal.inputAthletes) {
          setInputAthletes((prev) => {
            const restored = docVal.inputAthletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        }
        if (docVal.teamInputAthletes) {
          setTeamInputAthletes((prev) => {
            const restored = docVal.teamInputAthletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        }
        if (docVal.masterAthletes) {
          setMasterAthletes((prev) => {
            const restored = docVal.masterAthletes;
            return !deepEqual(prev, restored) ? restored : prev;
          });
        }
        if (docVal.scoreEvents) {
          setScoreEvents((prev) => !deepEqual(prev, docVal.scoreEvents) ? docVal.scoreEvents : prev);
        }
        if (docVal.scoreVersions) {
          setScoreVersions((prev) => !deepEqual(prev, docVal.scoreVersions) ? docVal.scoreVersions : prev);
        }

        const mapStatusToWorkflowStage = (status: string, currentStage: string | undefined | null): string => {
          if (!status) return currentStage || "registration";
          if (status === "registration" && (currentStage === "registration" || currentStage === "check_in")) return currentStage;
          if (status === "ready" && currentStage === "assignment") return currentStage;
          if (status === "live" && (currentStage === "competition" || currentStage === "team_competition" || currentStage === "ranking" || currentStage === "qualification")) return currentStage;
          if (status === "completed" && (currentStage === "official_result" || currentStage === "published")) return currentStage;
          if (status === "archived" && currentStage === "archived") return currentStage;
          switch (status) {
            case "registration": return "registration";
            case "ready": return "assignment";
            case "live": return "competition";
            case "completed": return "official_result";
            case "archived": return "archived";
            default: return currentStage || "registration";
          }
        };

        const mapWorkflowStateToWorkflowStage = (wState: string | undefined | null, currentStage: string | undefined | null): string => {
          if (!wState) return mapStatusToWorkflowStage(docVal.status || "draft", currentStage);
          switch (wState) {
            case "draft":
            case "registration_open": return "registration";
            case "checkin": return "check_in";
            case "registration_closed":
            case "lane_assignment": return "assignment";
            case "ready": return "competition";
            case "live": return currentStage === "team_competition" ? "team_competition" : "competition";
            case "ranking_locked": return "ranking";
            case "verification": return "qualification";
            case "award": return "official_result";
            case "completed": return "published";
            case "archived": return "archived";
            default: return mapStatusToWorkflowStage(docVal.status || "draft", currentStage);
          }
        };

        const laneLimit = (docVal as any).laneCapacity || 8;
        const defaultLanes: Record<number, any> = {};
        for (let i = 1; i <= laneLimit; i++) {
          defaultLanes[i] = {
            athleteId: null,
            refereeId: null,
            status: "idle",
            scores: Array((docVal as any).shotsCount || 10).fill(null)
          };
        }
        const defaultCCS = {
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
          auditLogs: []
        };
        const targetCCS = { ...defaultCCS, ...(docVal.commandCenterState || {}) };
        if (targetCCS.laneCount !== laneLimit) {
          targetCCS.laneCount = laneLimit;
          const newLaneStatus = { ...(targetCCS.laneStatus || {}) };
          for (let i = 1; i <= laneLimit; i++) {
            if (!newLaneStatus[i]) {
              newLaneStatus[i] = {
                athleteId: null,
                refereeId: null,
                status: "idle",
                scores: Array((docVal as any).shotsCount || 10).fill(null)
              };
            }
          }
          Object.keys(newLaneStatus).forEach(k => {
            if (Number(k) > laneLimit) delete newLaneStatus[Number(k)];
          });
          targetCCS.laneStatus = newLaneStatus;
        }
        const mappedStage = mapWorkflowStateToWorkflowStage(docVal.workflowState, targetCCS.workflowStage);
        if (mappedStage !== targetCCS.workflowStage) targetCCS.workflowStage = mappedStage;

        setCommandCenterState((prev: any) => !deepEqual(prev, targetCCS) ? targetCCS : prev);
        if (docVal.directMaxPoints !== undefined) setDirectMaxPoints(docVal.directMaxPoints !== null ? docVal.directMaxPoints : undefined);
        if (docVal.teamDirectMaxPoints !== undefined) setTeamDirectMaxPoints(docVal.teamDirectMaxPoints !== null ? docVal.teamDirectMaxPoints : undefined);
        if (docVal.directMaxShots !== undefined) setDirectMaxShots(docVal.directMaxShots !== null ? docVal.directMaxShots : 10);
        if (docVal.teamDirectMaxShots !== undefined) setTeamDirectMaxShots(docVal.teamDirectMaxShots !== null ? docVal.teamDirectMaxShots : 10);
      }
    });

    return () => unsubscribe();
  }, [activeHistoryId, vscSystemAthletes]);

  // Cloud publisher effect
  useEffect(() => {
    if (!activeHistoryId || !activeHistoryId.startsWith("tour-")) return;
    if (userRole !== "admin" && userRole !== "referee") return;

    const timeSinceLastIncoming = Date.now() - lastIncomingUpdateRef.current;
    const isRecentIncoming = isIncomingUpdateRef.current || timeSinceLastIncoming < 2000;

    if (isRecentIncoming) {
      isIncomingUpdateRef.current = false;
      return;
    }

    // Do not publish if the tournament document has not finished loading or state is null
    if (!currentTournamentDoc || !commandCenterState) {
      return;
    }

    const mapWorkflowStageToStatus = (workflowStage: string | undefined | null): any => {
      if (!workflowStage) return undefined;
      switch (workflowStage) {
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
        default: return undefined;
      }
    };

    const mapWorkflowStageToWorkflowState = (workflowStage: string | undefined | null): any => {
      if (!workflowStage) return undefined;
      switch (workflowStage) {
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
        default: return undefined;
      }
    };

    const mappedStatus = mapWorkflowStageToStatus(commandCenterState?.workflowStage);
    const mappedWorkflowState = mapWorkflowStageToWorkflowState(commandCenterState?.workflowStage);

    const updatePayload: any = {
      matchName,
      startDate,
      endDate,
      distances,
      shotsCount,
      athletes,
      teamDistances,
      teamShotsCount,
      teamAthletes,
      inputAthletes,
      teamInputAthletes,
      directMaxPoints,
      teamDirectMaxPoints,
      directMaxShots,
      teamDirectMaxShots,
      masterAthletes,
      scoreEvents,
      scoreVersions,
      commandCenterState
    };
    if (mappedStatus) updatePayload.status = mappedStatus;
    if (mappedWorkflowState) updatePayload.workflowState = mappedWorkflowState;

    const sanitizedLocal = sanitizeFirestoreData(updatePayload);
    const sanitizedRemote = currentTournamentDoc ? sanitizeFirestoreData(currentTournamentDoc) : null;

    const updatesToPublish: any = {};
    let isDifferent = false;
    if (sanitizedRemote) {
      for (const key of Object.keys(sanitizedLocal)) {
        if (!deepEqual(sanitizedLocal[key], (sanitizedRemote as any)[key])) {
          console.log(`[Firestore Sync] Mismatch found in key "${key}":`, sanitizedLocal[key], (sanitizedRemote as any)[key]);
          updatesToPublish[key] = updatePayload[key];
          isDifferent = true;
        }
      }
    } else {
      isDifferent = true;
      Object.assign(updatesToPublish, updatePayload);
    }

    if (!isDifferent) return;

    if (prevActiveHistoryIdRef.current !== activeHistoryId) {
      prevActiveHistoryIdRef.current = activeHistoryId;
      lastSentPayloadRef.current = "";
    }

    const payloadStr = JSON.stringify(updatesToPublish);
    if (lastSentPayloadRef.current === payloadStr) {
      return;
    }

    lastWriteTimeRef.current = Date.now();

    const timer = setTimeout(async () => {
      try {
        await updateOnlineTournament(activeHistoryId, updatesToPublish);
        lastSentPayloadRef.current = payloadStr;
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    activeHistoryId,
    userRole,
    matchName,
    startDate,
    endDate,
    distances,
    shotsCount,
    athletes,
    teamDistances,
    teamShotsCount,
    teamAthletes,
    inputAthletes,
    teamInputAthletes,
    directMaxPoints,
    teamDirectMaxPoints,
    directMaxShots,
    teamDirectMaxShots,
    masterAthletes,
    scoreEvents,
    scoreVersions,
    commandCenterState,
    currentTournamentDoc
  ]);

  // Self-healing effect
  useEffect(() => {
    let changedAny = false;
    const sanitizeAthleteScores = (athletesList: Athlete[], validDistances: DistanceConfig[]) => {
      if (!validDistances || validDistances.length === 0) return athletesList;
      const validDistIds = new Set(validDistances.map(d => d.id));
      const soloDistIds = validDistIds;
      return athletesList.map((a) => {
        let modified = false;
        let cleanedScores = { ...(a.scores || {}) };
        Object.keys(cleanedScores).forEach((k) => {
          if (!validDistIds.has(k)) {
            delete cleanedScores[k];
            modified = true;
          }
        });

        const cleanSoloMap = (map: Record<string, any> | undefined) => {
          if (!map) return {};
          const nextMap = { ...map };
          Object.keys(nextMap).forEach((k) => {
            const kLower = k.toLowerCase().trim();
            const isValidSoloKey = Array.from(soloDistIds).some((soloId) => {
              const idLower = soloId.toLowerCase().trim();
              const distObj = validDistances.find(d => d.id === soloId);
              const distVal = distObj?.distance !== undefined && distObj?.distance !== null ? String(distObj.distance).toLowerCase().trim() : "";
              const distName = distObj?.name ? distObj.name.toLowerCase().trim() : "";
              return kLower === idLower || kLower === distVal || kLower === distName;
            });
            if (!isValidSoloKey) {
              delete nextMap[k];
              modified = true;
            }
          });
          return nextMap;
        };

        const cleanedSoloHits = cleanSoloMap(a.soloHits);
        const cleanedSoloRounds = cleanSoloMap(a.soloRounds);
        const cleanedSoloShotDetails = cleanSoloMap(a.soloShotDetails);

        let qStatus = a.qualificationStatus || "";
        if (qStatus) {
          if (qStatus.startsWith("eliminated_") || qStatus.startsWith("qualified_") || qStatus.startsWith("pending_solo_")) {
            const parts = qStatus.split("_");
            const refDistId = parts.slice(1).join("_");
            if (!validDistIds.has(refDistId)) {
              qStatus = "";
              modified = true;
            }
          }
        }

        let athStatus = a.status || "Thi đấu";
        if (athStatus === "Bị loại" || athStatus === "eliminated") {
          const hasCurrentValidElimination = qStatus === "eliminated" || Array.from(validDistIds).some(id => qStatus === `eliminated_${id}`);
          if (!hasCurrentValidElimination) {
            athStatus = "Thi đấu";
            modified = true;
          }
        }

        if (modified) {
          changedAny = true;
          return {
            ...a,
            scores: cleanedScores,
            soloHits: cleanedSoloHits,
            soloRounds: cleanedSoloRounds,
            soloShotDetails: cleanedSoloShotDetails,
            qualificationStatus: qStatus,
            status: athStatus
          };
        }
        return a;
      });
    };

    if (athletes.length > 0 && distances.length > 0) {
      const nextAthletes = sanitizeAthleteScores(athletes, distances);
      if (changedAny) setAthletes(nextAthletes);
    }
    if (teamAthletes.length > 0 && teamDistances.length > 0) {
      const nextTeamAthletes = sanitizeAthleteScores(teamAthletes, teamDistances);
      const isTeamModified = nextTeamAthletes.some((ta, idx) => ta !== teamAthletes[idx]);
      if (isTeamModified) setTeamAthletes(nextTeamAthletes);
    }
  }, [distances, teamDistances, commandCenterState?.currentDistanceIndex]);

  // Sync teamAthletes with athletes
  useEffect(() => {
    if (!athletes || athletes.length === 0) return;
    setTeamAthletes((prevTeam) => {
      const prevMap = new Map<string, Athlete>();
      (prevTeam || []).forEach((a) => {
        if (a && a.id) prevMap.set(a.id, a);
      });
      let changed = false;
      const updated = athletes.map((ath) => {
        const existing = prevMap.get(ath.id);
        if (!existing) {
          changed = true;
          return { ...ath };
        } else {
          const aAny = ath as any;
          const eAny = existing as any;
          const normalizedAthTeam = (ath.team || aAny.clubName || "").trim();
          const normalizedAthClubName = (aAny.clubName || ath.team || "").trim();
          const normalizedExistingTeam = (existing.team || eAny.clubName || "").trim();
          const normalizedExistingClubName = (eAny.clubName || existing.team || "").trim();
          const normalizedExistingStatus = existing.status || "Thi đấu";
          const normalizedAthStatus = ath.status || "Thi đấu";
          const isMetadataChanged =
            (existing.name || "").trim() !== (ath.name || "").trim() ||
            normalizedExistingTeam !== normalizedAthTeam ||
            normalizedExistingClubName !== normalizedAthClubName ||
            (eAny.vscNumber || "").trim() !== (aAny.vscNumber || "").trim() ||
            (eAny.bibNumber || "").trim() !== (aAny.bibNumber || "").trim() ||
            !!existing.isPrimaryTeam !== !!ath.isPrimaryTeam ||
            (eAny.competitionCategory || "").trim() !== (aAny.competitionCategory || "").trim() ||
            normalizedExistingStatus !== normalizedAthStatus;
          if (isMetadataChanged) {
            changed = true;
            return {
              ...existing,
              name: ath.name,
              team: normalizedAthTeam,
              clubName: normalizedAthClubName,
              vscNumber: aAny.vscNumber || "",
              bibNumber: aAny.bibNumber || "",
              isPrimaryTeam: ath.isPrimaryTeam ?? false,
              competitionCategory: aAny.competitionCategory || "",
              status: normalizedAthStatus
            } as any;
          }
          return existing;
        }
      });
      const filteredUpdated = updated.filter((a) => athletes.some((ath) => ath.id === a.id));
      if (filteredUpdated.length !== (prevTeam || []).length) changed = true;
      return changed ? filteredUpdated : prevTeam;
    });
  }, [athletes]);

  // Automatically save session to history
  useEffect(() => {
    if (!activeHistoryId) return;
    if (!matchName || !matchName.trim()) return;
    if (athletes.length === 0 && masterAthletes.length === 0 && teamAthletes.length === 0) return;
    const athletesToSave = masterAthletes.length > 0 ? masterAthletes : athletes;
    let matchId = activeHistoryId;
    if (!matchId) {
      const existing = history.find((h) => h.matchName.trim().toLowerCase() === matchName.trim().toLowerCase());
      matchId = existing ? existing.id : `hist-${Date.now()}`;
      setActiveHistoryId(matchId);
      return;
    }
    setHistory((prevHistory) => {
      const existingIndex = prevHistory.findIndex((h) => h.id === matchId);
      const updatedItem: MatchHistoryItem = {
        id: matchId!,
        date: new Date().toISOString(),
        matchName: matchName.trim(),
        shotCount: shotsCount,
        distances: [...distances],
        athletes: JSON.parse(JSON.stringify(athletes)),
        masterCount: masterAthletes.length,
        masterAthletes: JSON.parse(JSON.stringify(masterAthletes)),
        teamDistances: [...teamDistances],
        teamShotCount: teamShotsCount,
        teamAthletes: JSON.parse(JSON.stringify(teamAthletes)),
        startDate: startDate,
        endDate: endDate,
      };
      if (existingIndex > -1) {
        const copy = [...prevHistory];
        copy[existingIndex] = updatedItem;
        return copy;
      } else {
        return [updatedItem, ...prevHistory];
      }
    });
    setStoredAthleteLists((prevLists) => {
      const existingIdx = prevLists.findIndex((list) => list.name.trim().toLowerCase() === matchName.trim().toLowerCase());
      const listId = existingIdx > -1 ? prevLists[existingIdx].id : `list-${Date.now()}`;
      const updatedList: StoredAthleteList = {
        id: listId,
        name: matchName.trim(),
        createdAt: new Date().toISOString(),
        athletes: JSON.parse(JSON.stringify(athletesToSave)),
      };
      if (existingIdx > -1) {
        const copy = [...prevLists];
        copy[existingIdx] = updatedList;
        return copy;
      } else {
        return [updatedList, ...prevLists];
      }
    });
  }, [matchName, distances, shotsCount, athletes, masterAthletes, activeHistoryId, teamDistances, teamShotsCount, teamAthletes, startDate, endDate]);

  const leaderboardAthletes = useMemo(() => {
    const workspaces = commandCenterState?.refereeWorkspaces || [];
    const activeDistanceId = distances[commandCenterState?.currentDistanceIndex || 0]?.id;
    const activeAthletesMap = new Map<string, Athlete>();
    athletes.forEach(a => { if (a && a.id) activeAthletesMap.set(a.id, a); });
    inputAthletes.forEach(a => {
      if (a && a.id && !activeAthletesMap.has(a.id)) {
        activeAthletesMap.set(a.id, a);
      }
    });
    const activeList = Array.from(activeAthletesMap.values());
    return activeList.map((athInTournament) => {
      const m = masterAthletes.find((master) => master.id === athInTournament.id) || athInTournament;
      const activeAth = athletes.find((a) => a.id === m.id);
      const inputAth = inputAthletes.find((a) => a.id === m.id);
      const mergedScores: Record<string, (boolean | number | null)[]> = {};
      distances.forEach((d) => {
        mergedScores[d.id] = Array(shotsCount).fill(null);
      });
      if (activeAth) {
        Object.keys(activeAth.scores || {}).forEach((k) => {
          if (activeAth.scores[k]) mergedScores[k] = [...activeAth.scores[k]];
        });
      }
      if (inputAth) {
        Object.keys(inputAth.scores || {}).forEach((k) => {
          if (inputAth.scores[k]) mergedScores[k] = [...inputAth.scores[k]];
        });
      }
      const mergedSoloHits = { ...(activeAth?.soloHits || {}), ...(inputAth?.soloHits || {}) };
      const mergedSoloRounds = { ...(activeAth?.soloRounds || {}), ...(inputAth?.soloRounds || {}) };
      const mergedSoloShotDetails = { ...(activeAth?.soloShotDetails || {}), ...(inputAth?.soloShotDetails || {}) };

      if (activeDistanceId) {
        for (const ws of workspaces) {
          const found = ws.athletes?.find((a: any) =>
            (a.athleteId === m.id || a.athleteId === m.participantId || a.id === m.id) &&
            Array.isArray(a.scores) &&
            a.scores.some((s: any) => s !== null && s !== undefined)
          );
          if (found && found.scores) {
            const currentActiveHeat = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
            const isSoloHeat = currentActiveHeat?.heatType === "solo" || currentActiveHeat?.heatType === "resolo";
            const isLiveSolo = isSoloHeat;
            if (isLiveSolo) {
              const liveDetails = (found.scores || []).map((s: any) => s ?? null);
              const liveRoundSum = liveDetails.reduce((acc: number, val: any) => {
                if (typeof val === 'number') return acc + val;
                if (val === true) return acc + 1;
                return acc;
              }, 0);
              const distObj = distances[commandCenterState?.currentDistanceIndex || 0];
              const aliasKeys = Array.from(new Set([activeDistanceId, distObj?.id].filter(Boolean))) as string[];
              const targetRoundIdx = currentActiveHeat?.heatType === "resolo" ? 1 : 0;
              aliasKeys.forEach(k => {
                const prevRounds = Array.isArray((mergedSoloRounds as any)[k]) ? [...(mergedSoloRounds as any)[k]] : [];
                const prevDetails = Array.isArray((mergedSoloShotDetails as any)[k]) ? [...(mergedSoloShotDetails as any)[k]] : [];
                while (prevRounds.length <= targetRoundIdx) prevRounds.push(0);
                while (prevDetails.length <= targetRoundIdx) prevDetails.push([]);
                prevRounds[targetRoundIdx] = liveRoundSum;
                prevDetails[targetRoundIdx] = liveDetails;
                (mergedSoloRounds as any)[k] = prevRounds;
                (mergedSoloShotDetails as any)[k] = prevDetails;
                (mergedSoloHits as any)[k] = prevRounds.reduce((acc, r) => acc + (r || 0), 0);
              });
            } else {
              mergedScores[activeDistanceId] = [...found.scores];
            }
            break;
          }
        }
      }
      return {
        ...m,
        team: activeAth?.team || inputAth?.team || m.team || "",
        isPrimaryTeam: activeAth?.isPrimaryTeam ?? inputAth?.isPrimaryTeam ?? athInTournament.isPrimaryTeam ?? false,
        scores: mergedScores,
        soloHits: mergedSoloHits,
        soloRounds: mergedSoloRounds,
        soloShotDetails: mergedSoloShotDetails,
        status: activeAth?.status || inputAth?.status || m.status || "Thi đấu",
        qualificationStatus: activeAth?.qualificationStatus || inputAth?.qualificationStatus || athInTournament?.qualificationStatus || m?.qualificationStatus
      };
    });
  }, [masterAthletes, athletes, inputAthletes, distances, shotsCount, commandCenterState?.refereeWorkspaces, commandCenterState?.currentDistanceIndex]);

  const leaderboardTeamAthletes = useMemo(() => {
    const workspaces = commandCenterState?.refereeWorkspaces || [];
    const activeDistanceId = teamDistances[commandCenterState?.currentDistanceIndex || 0]?.id;
    const activeTeamAthletesMap = new Map<string, Athlete>();
    teamAthletes.forEach(a => { if (a && a.id) activeTeamAthletesMap.set(a.id, a); });
    teamInputAthletes.forEach(a => {
      if (a && a.id && !activeTeamAthletesMap.has(a.id)) {
        activeTeamAthletesMap.set(a.id, a);
      }
    });
    const activeList = Array.from(activeTeamAthletesMap.values());
    return activeList.map((athInTournament) => {
      const m = masterAthletes.find((master) => master.id === athInTournament.id) || athInTournament;
      const activeAth = teamAthletes.find((a) => a.id === m.id);
      const inputAth = teamInputAthletes.find((a) => a.id === m.id);
      const mergedScores: Record<string, (boolean | number | null)[]> = {};
      teamDistances.forEach((d) => {
        mergedScores[d.id] = Array(teamShotsCount).fill(null);
      });
      if (activeAth) {
        Object.keys(activeAth.scores || {}).forEach((k) => {
          if (activeAth.scores[k]) mergedScores[k] = [...activeAth.scores[k]];
        });
      }
      if (inputAth) {
        Object.keys(inputAth.scores || {}).forEach((k) => {
          if (inputAth.scores[k]) mergedScores[k] = [...inputAth.scores[k]];
        });
      }
      const mergedSoloHits = { ...(activeAth?.soloHits || {}), ...(inputAth?.soloHits || {}) };
      const mergedSoloRounds = { ...(activeAth?.soloRounds || {}), ...(inputAth?.soloRounds || {}) };
      const mergedSoloShotDetails = { ...(activeAth?.soloShotDetails || {}), ...(inputAth?.soloShotDetails || {}) };

      if (activeDistanceId) {
        for (const ws of workspaces) {
          const found = ws.athletes?.find((a: any) =>
            (a.athleteId === m.id || a.athleteId === m.participantId || a.id === m.id) &&
            Array.isArray(a.scores) &&
            a.scores.some((s: any) => s !== null && s !== undefined)
          );
          if (found && found.scores) {
            const currentActiveHeat = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
            const isSoloHeat = currentActiveHeat?.heatType === "solo" || currentActiveHeat?.heatType === "resolo";
            const isLiveSolo = isSoloHeat;
            if (isLiveSolo) {
              const liveDetails = (found.scores || []).map((s: any) => s ?? null);
              const liveRoundSum = liveDetails.reduce((acc: number, val: any) => {
                if (typeof val === 'number') return acc + val;
                if (val === true) return acc + 1;
                return acc;
              }, 0);
              const distObj = teamDistances[commandCenterState?.currentDistanceIndex || 0];
              const aliasKeys = Array.from(new Set([activeDistanceId, distObj?.id].filter(Boolean))) as string[];
              const targetRoundIdx = currentActiveHeat?.heatType === "resolo" ? 1 : 0;
              aliasKeys.forEach(k => {
                const prevRounds = Array.isArray((mergedSoloRounds as any)[k]) ? [...(mergedSoloRounds as any)[k]] : [];
                const prevDetails = Array.isArray((mergedSoloShotDetails as any)[k]) ? [...(mergedSoloShotDetails as any)[k]] : [];
                while (prevRounds.length <= targetRoundIdx) prevRounds.push(0);
                while (prevDetails.length <= targetRoundIdx) prevDetails.push([]);
                prevRounds[targetRoundIdx] = liveRoundSum;
                prevDetails[targetRoundIdx] = liveDetails;
                (mergedSoloRounds as any)[k] = prevRounds;
                (mergedSoloShotDetails as any)[k] = prevDetails;
                (mergedSoloHits as any)[k] = prevRounds.reduce((acc, r) => acc + (r || 0), 0);
              });
            } else {
              mergedScores[activeDistanceId] = [...found.scores];
            }
            break;
          }
        }
      }
      return {
        ...m,
        team: activeAth?.team || inputAth?.team || m.team || "",
        isPrimaryTeam: activeAth?.isPrimaryTeam ?? inputAth?.isPrimaryTeam ?? athInTournament.isPrimaryTeam ?? false,
        scores: mergedScores,
        soloHits: mergedSoloHits,
        soloRounds: mergedSoloRounds,
        soloShotDetails: mergedSoloShotDetails,
        status: activeAth?.status || inputAth?.status || m.status || "Thi đấu",
        qualificationStatus: activeAth?.qualificationStatus || inputAth?.qualificationStatus || athInTournament?.qualificationStatus || m?.qualificationStatus
      };
    });
  }, [masterAthletes, teamAthletes, teamInputAthletes, teamDistances, teamShotsCount, commandCenterState?.refereeWorkspaces, commandCenterState?.currentDistanceIndex]);

  // Sync basic metadata from master profiles to current active session athletes
  useEffect(() => {
    setAthletes((prevActive) => {
      let changed = false;
      const updated = prevActive.map((activeAth) => {
        const masterAth = masterAthletes.find((m) => m.id === activeAth.id);
        if (masterAth) {
          const nameDiff = (activeAth.name || "").trim() !== (masterAth.name || "").trim();
          const teamDiff = (activeAth.team || "").trim() !== (masterAth.team || "").trim();
          const genderDiff = (activeAth.gender || "").trim() !== (masterAth.gender || "").trim();
          const avatarUrlDiff = (activeAth.avatarUrl || "").trim() !== (masterAth.avatarUrl || "").trim();
          const normalizedActiveStatus = activeAth.status || "Thi đấu";
          const normalizedMasterStatus = masterAth.status || "Thi đấu";
          const isCheckInStatus = ["checked_in", "registered", "dns", "withdrawn"].includes(normalizedActiveStatus);
          const statusDiff = isCheckInStatus ? false : (normalizedActiveStatus.trim() !== normalizedMasterStatus.trim());

          if (nameDiff || teamDiff || genderDiff || avatarUrlDiff || statusDiff) {
            changed = true;
            return {
              ...activeAth,
              name: (masterAth.name || "").trim(),
              team: (masterAth.team || "").trim(),
              gender: (masterAth.gender || "").trim(),
              avatarUrl: masterAth.avatarUrl,
              status: isCheckInStatus ? normalizedActiveStatus : normalizedMasterStatus.trim(),
            };
          }
        }
        return activeAth;
      });
      return changed ? updated : prevActive;
    });

    setTeamAthletes((prevTeam) => {
      let changed = false;
      const updated = prevTeam.map((activeAth) => {
        const masterAth = masterAthletes.find((m) => m.id === activeAth.id);
        if (masterAth) {
          const nameDiff = (activeAth.name || "").trim() !== (masterAth.name || "").trim();
          const teamDiff = (activeAth.team || "").trim() !== (masterAth.team || "").trim();
          const genderDiff = (activeAth.gender || "").trim() !== (masterAth.gender || "").trim();
          const avatarUrlDiff = (activeAth.avatarUrl || "").trim() !== (masterAth.avatarUrl || "").trim();
          const normalizedActiveStatus = activeAth.status || "Thi đấu";
          const normalizedMasterStatus = masterAth.status || "Thi đấu";
          const isCheckInStatus = ["checked_in", "registered", "dns", "withdrawn"].includes(normalizedActiveStatus);
          const statusDiff = isCheckInStatus ? false : (normalizedActiveStatus.trim() !== normalizedMasterStatus.trim());

          if (nameDiff || teamDiff || genderDiff || avatarUrlDiff || statusDiff) {
            changed = true;
            return {
              ...activeAth,
              name: (masterAth.name || "").trim(),
              team: (masterAth.team || "").trim(),
              gender: (masterAth.gender || "").trim(),
              avatarUrl: masterAth.avatarUrl,
              status: isCheckInStatus ? normalizedActiveStatus : normalizedMasterStatus.trim(),
            };
          }
        }
        return activeAth;
      });
      return changed ? updated : prevTeam;
    });
  }, [masterAthletes]);

  const executeToggleScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    if (competitionMode === "individual") {
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(shotsCount).fill(null);
          if (currentScores.length < shotsCount) {
            currentScores.push(...Array(shotsCount - currentScores.length).fill(null));
          }
          const val = currentScores[shotIndex];
          if (val === true) currentScores[shotIndex] = false;
          else if (val === false) currentScores[shotIndex] = null;
          else currentScores[shotIndex] = true;
          return { ...athlete, scores: { ...athlete.scores, [distanceId]: currentScores } };
        })
      );
    } else {
      setTeamAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(teamShotsCount).fill(null);
          if (currentScores.length < teamShotsCount) {
            currentScores.push(...Array(teamShotsCount - currentScores.length).fill(null));
          }
          const val = currentScores[shotIndex];
          if (val === true) currentScores[shotIndex] = false;
          else if (val === false) currentScores[shotIndex] = null;
          else currentScores[shotIndex] = true;
          return { ...athlete, scores: { ...athlete.scores, [distanceId]: currentScores } };
        })
      );
    }
  };

  const isDistanceLocked = (distId: string) => {
    if (!commandCenterState) return false;
    const stage = commandCenterState.workflowStage;
    if (stage === "archived" || stage === "published" || stage === "official_result") return true;
    if (stage === "competition") {
      const activeSubStageId = commandCenterState.activeSubStage;
      if (!activeSubStageId) return false;
      const list: { id: string; distanceId: string }[] = [];
      const currentDistances = competitionMode === "individual" ? distances : teamDistances;
      currentDistances.forEach((dist) => {
        list.push({ id: dist.id, distanceId: dist.id });
        if (dist.isSolo !== false) list.push({ id: `${dist.id}-solo`, distanceId: dist.id });
        if (dist.isResolo) list.push({ id: `${dist.id}-resolo`, distanceId: dist.id });
      });
      const activeIdx = list.findIndex(s => s.id === activeSubStageId);
      if (activeIdx === -1) return false;
      const distanceIndices = list.map((s, idx) => s.distanceId === distId ? idx : -1).filter(idx => idx !== -1);
      if (distanceIndices.length === 0) return false;
      const maxDistIdx = Math.max(...distanceIndices);
      return maxDistIdx < activeIdx;
    }
    return false;
  };

  const handleToggleScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    if (isDistanceLocked(distanceId)) {
      alert("Vòng thi này đã bị khóa điểm (chỉ đọc)!");
      return;
    }
    if (!isScoringEditAuthorized) {
      setPendingScoreToggle({ athleteId, distanceId, shotIndex });
      setShowUnlockScoreModal(true);
      return;
    }
    executeToggleScore(athleteId, distanceId, shotIndex);
  };

  const handleUpdateAthlete = (athleteId: string, name: string, team: string, customId?: string) => {
    const checkId = customId ? customId.trim() : athleteId;
    const isIdTaken = masterAthletes.some((a) => a.id === checkId && a.id !== athleteId);
    const finalId = isIdTaken ? athleteId : checkId;

    setMasterAthletes((prev) =>
      prev.map((ma) => {
        if (ma.id !== athleteId) return ma;
        return { ...ma, id: finalId, name, team };
      })
    );

    if (competitionMode === "individual") {
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const finalScores = { ...athlete.scores };
          distances.forEach((d) => {
            if (!finalScores[d.id]) finalScores[d.id] = Array(shotsCount).fill(null);
          });
          return { ...athlete, id: finalId, name, team, scores: finalScores };
        })
      );
    } else {
      setTeamAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          const finalScores = { ...athlete.scores };
          teamDistances.forEach((d) => {
            if (!finalScores[d.id]) finalScores[d.id] = Array(teamShotsCount).fill(null);
          });
          return { ...athlete, id: finalId, name, team, scores: finalScores };
        })
      );
    }
  };

  const handleDeleteAthlete = (athleteId: string) => {
    let nextAthletes = athletes;
    let nextTeamAthletes = teamAthletes;
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        nextAthletes = prev.filter((a) => a.id !== athleteId);
        return nextAthletes;
      });
    } else {
      setTeamAthletes((prev) => {
        nextTeamAthletes = prev.filter((a) => a.id !== athleteId);
        return nextTeamAthletes;
      });
    }
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      updateOnlineTournament(activeHistoryId, {
        athletes: competitionMode === "individual" ? nextAthletes.filter((a) => a.id !== athleteId) : athletes,
        teamAthletes: competitionMode !== "individual" ? nextTeamAthletes.filter((a) => a.id !== athleteId) : teamAthletes
      }).catch((err) => console.error(err));
    }
  };

  const handleMoveAthlete = (athleteId: string, direction: "up" | "down") => {
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    } else {
      setTeamAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    }
  };

  return (
    <TournamentStateContext.Provider value={{
      isStorageRestoring, setIsStorageRestoring,
      isNewTournamentModalOpen, setIsNewTournamentModalOpen,
      matchName, setMatchName,
      startDate, setStartDate,
      endDate, setEndDate,
      headerTempName, setHeaderTempName,
      handleSaveHeaderMatchName,
      distances, setDistances,
      shotsCount, setShotsCount,
      athletes, setAthletes,
      competitionMode, setCompetitionMode,
      isSpectatorModeOverridden, setIsSpectatorModeOverridden,
      systemAdminRoleOverride, setSystemAdminRoleOverride,
      currentTime,
      formatICTTime,
      formatICTDate,
      networkStatus,
      scoreEvents, setScoreEvents,
      scoreVersions, setScoreVersions,
      expandedAthleteIds, setExpandedAthleteIds,
      teamDistances, setTeamDistances,
      teamShotsCount, setTeamShotsCount,
      commandCenterState, setCommandCenterState,
      setCommandCenterStateWithWriteTime,
      editingScoreEvent, setEditingScoreEvent,
      editingScores, setEditingScores,
      editReason, setEditReason,
      deletingScoreEvent, setDeletingScoreEvent,
      deleteReason, setDeleteReason,
      showReopenModal, setShowReopenModal,
      reopenLaneNumber, setReopenLaneNumber,
      reopenReason, setReopenReason,
      showCallAthleteModal, setShowCallAthleteModal,
      selectedCallIds, setSelectedCallIds,
      callSearchTerm, setCallSearchTerm,
      callLaneAssignments, setCallLaneAssignments,
      showQrScanner, setShowQrScanner,
      qrScannerError, setQrScannerError,
      availableCameras, setAvailableCameras,
      activeCameraId, setActiveCameraId,
      scannedAthleteConfirmData, setScannedAthleteConfirmData,
      handleLookupScannedAthlete,
      startQrScanning,
      stopQrScanning,
      directMaxShots, setDirectMaxShots,
      directMaxPoints, setDirectMaxPoints,
      teamDirectMaxShots, setTeamDirectMaxShots,
      teamDirectMaxPoints, setTeamDirectMaxPoints,
      teamAthletes, setTeamAthletes,
      teamInputAthletes, setTeamInputAthletes,
      masterAthletes, setMasterAthletes,
      history, setHistory,
      storedAthleteLists, setStoredAthleteLists,
      activeHistoryId, setActiveHistoryId,
      isAuthModalOpen, setIsAuthModalOpen,
      currentUser,
      userProfile,
      homeActiveSubTab, setHomeActiveSubTab,
      currentTournamentDoc,
      getActiveLaneLimit,
      activeTab, setActiveTab,
      deleteTournamentConfirm, setDeleteTournamentConfirm,
      isMobileMenuOpen, setIsMobileMenuOpen,
      isMobileRankingMenuOpen, setIsMobileRankingMenuOpen,
      rankingMode, setRankingMode,
      rankingEnvironment, setRankingEnvironment,
      controlPanelSubTab, setControlPanelSubTab,
      scoringSearchQuery, setScoringSearchQuery,
      scoringDistanceFilter, setScoringDistanceFilter,
      scoringTypeFilter, setScoringTypeFilter,
      refereeSelectedLane, setRefereeSelectedLane,
      showRefereeLaneModal, setShowRefereeLaneModal,
      showExitConfirmModal, setShowExitConfirmModal,
      showExitAndCreateConfirmModal, setShowExitAndCreateConfirmModal,
      switchingTournamentData, setSwitchingTournamentData,
      followedTournaments, setFollowedTournaments,
      toggleFollowTournament,
      v3Tournaments,
      isMobile,
      visibleTournamentsCount, setVisibleTournamentsCount,
      vscSystemAthletes,
      vscSystemClubs,
      incrementTournamentViews,
      handleSelectTournament,
      confirmTournamentSwitch,
      searchQuery, setSearchQuery,
      isSearchExpanded, setIsSearchExpanded,
      isExportModalOpen, setIsExportModalOpen,
      isLiveBoardOpen, setIsLiveBoardOpen,
      isTimerOpen, setIsTimerOpen,
      isScoringEditAuthorized, setIsScoringEditAuthorized,
      showUnlockScoreModal, setShowUnlockScoreModal,
      pendingScoreToggle, setPendingScoreToggle,
      pendingDirectScoreUpdate, setPendingDirectScoreUpdate,
      pendingAddAthlete, setPendingAddAthlete,
      pendingScrollAthleteId, setPendingScrollAthleteId,
      inputAthletes, setInputAthletes,
      clubs, setClubs,
      isAddingAthleteToInputBoard, setIsAddingAthleteToInputBoard,
      inputBoardAddSearch, setInputBoardAddSearch,
      selectedInputBoardAthleteIds, setSelectedInputBoardAthleteIds,
      isAddingAthleteToTournament, setIsAddingAthleteToTournament,
      tourAddSearch, setTourAddSearch,
      selectedTourAthleteIds, setSelectedTourAthleteIds,
      systemSponsors,
      userRole,
      canControlTimer,
      globalTimer,
      globalRole,
      tournamentRole,
      visibleNavigation,
      leaderboardAthletes,
      leaderboardTeamAthletes,
      handleToggleScore,
      handleUpdateAthlete,
      handleDeleteAthlete,
      handleMoveAthlete,
      isDistanceLocked,
      lastWriteTimeRef,
    }}>
      {children}
    </TournamentStateContext.Provider>
  );
}
