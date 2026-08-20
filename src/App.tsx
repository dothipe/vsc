import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, 
  Target, 
  Trophy, 
  Settings, 
  History, 
  User,
  UserPlus, 
  Trash2, 
  Save, 
  Undo2, 
  Search, 
  RotateCcw,
  Building, 
  HelpCircle,
  Sparkles,
  Info,
  Shield,
  Users,
  X,
  TrendingUp,
  ClipboardCheck,
  Youtube,
  Facebook,
  Share2,
  Lock,
  Unlock,
  Eye,
  Tv,
  Calendar,
  FileText,
  Clock,
  MapPin,
  Play,
  Heart,
  Database,
  ChevronDown,
  Menu,
  QrCode,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Edit3,
  LayoutDashboard,
  Radio
} from "lucide-react";
import { DistanceConfig, Athlete, MatchHistoryItem, StoredAthleteList, Club } from "./types";
import { Leaderboard } from "./components/Leaderboard";
import { TeamLeaderboard } from "./components/TeamLeaderboard";
import { UserManagement } from "./components/UserManagement";
import { RefereeManagement } from "./components/RefereeManagement";
import { SponsorManagement } from "./components/SponsorManagement";
import { RuleTemplateManagement } from "./components/RuleTemplateManagement";
import { SettingsPanel } from "./components/SettingsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { MainDashboard } from "./components/MainDashboard";
import { ExportModal } from "./components/ExportModal";
import { LiveBoard } from "./components/LiveBoard";
import { CountdownTimerBoard } from "./components/CountdownTimerBoard";
import { useGlobalTimer } from "./hooks/useGlobalTimer";
import { VSCLogo, SlingshotIcon } from "./components/VSCLogo";
import { ScoreValidationEngine } from "./engines/scoreValidationEngine";
import { OfficialScoreLedger } from "./components/OfficialScoreLedger";
import { getCleanVscNumber, getCleanBibNumber, isAthleteEliminated, isAthleteEliminatedInPrevStage } from "./utils/athleteUtils";
import { getStageDisplayName, isEmptyValue, deepEqual } from "./utils/generalUtils";
import { QrScannerModal } from "./components/QrScannerModal";
import { RefereeTerminal } from "./components/RefereeTerminal";

// Firebase imports
import { auth, db, doc, onSnapshot, updateDoc } from "./firebase";
import { subscribeToTournamentDoc, updateOnlineTournament, updateOnlineTournamentTimer, LiveTimerConfig, TournamentData, subscribeToVscSystemAthletes, subscribeToVscSystemClubs, subscribeToVscSystemSponsors, normalize2DArray, ensureArray, sanitizeFirestoreData, deserializeFirestoreData } from "./lib/firebaseService";
import { AuthModal } from "./components/AuthModal";
import { getGlobalRole, getTournamentRole } from "./foundation/permissions";
import { getVisibleNavigation } from "./foundation/navigationManifest";
import { DatabaseSeeder } from "./lib/vscService";
import { tournamentRepository } from "./repositories/tournament.repository";
import { ControlPanel } from "./components/ControlPanel";
import { TournamentCommandCenter } from "./components/TournamentCommandCenter";
import { TournamentManagement } from "./components/TournamentManagement";
import { PublicRegistration } from "./components/PublicRegistration";
import { AthleteRegistry } from "./components/AthleteRegistry";
import { ClubManagement } from "./components/ClubManagement";
import { ProvinceManagement } from "./components/ProvinceManagement";
import { SeasonManagement } from "./components/SeasonManagement";
import { HallOfFameTab } from "./components/HallOfFameTab";
import { HomeTab } from "./components/HomeTab";
import { AppHeader } from "./components/AppHeader";
import { TournamentWorkspaceBanner } from "./components/TournamentWorkspaceBanner";
import { LeaderboardTab } from "./components/LeaderboardTab";
import { AppFooter } from "./components/AppFooter";
import { UnlockScoreModal } from "./components/global/UnlockScoreModal";
import { ExitAndCreateConfirmModal } from "./components/global/ExitAndCreateConfirmModal";
import { SwitchingTournamentModal } from "./components/global/SwitchingTournamentModal";
import { RefereeLaneModal } from "./components/global/RefereeLaneModal";
import { CallAthleteModal } from "./components/global/CallAthleteModal";
import { usePermission } from "./providers/PermissionProvider";
import { useTournamentState } from "./providers/TournamentStateProvider";
import { Home, LogOut, Sliders, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_DISTANCES,
  DEFAULT_SHOTS_COUNT,
  DEFAULT_ATHLETES,
  DEFAULT_HISTORY,
  DEFAULT_STORED_LISTS,
} from "./initialData";
import { deviceStorage } from "./lib/storage";

// --- Helper functions for centralizing base64 avatar images to save localStorage space ---
interface SavedAvatarMap {
  [key: string]: string;
}

const saveAvatarsFromAthletes = (athletesToProcess: Athlete[]) => {
  // No-op to respect strict store-only requirements
};

function stripBase64Avatars<T>(data: T): T {
  return data;
}

function restoreBase64Avatars<T>(data: T): T {
  return data;
}

export default function App() {
  const {
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
    lastWriteTimeRef,
  } = useTournamentState();

  const isGlobalAdmin = globalRole === "admin" || globalRole === "system_owner";

  const handleProcessScannedAthlete = async (scannedText: string) => {
    if (!scannedText || !commandCenterState) return;
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
          ? teamAthletes.filter((a) => a.isPrimaryTeam)
          : athletes.filter((a) => a.isPrimaryTeam))) || [];
          
    const athleteObj = allAths.find((a) => 
      a.id.toLowerCase() === targetId.toLowerCase() ||
      (a.bibNumber && a.bibNumber.toLowerCase() === targetId.toLowerCase()) ||
      (a.vscNumber && a.vscNumber.toLowerCase() === targetId.toLowerCase())
    );

    if (!athleteObj) {
      alert(`❌ Không tìm thấy vận động viên: "${targetId}"`);
      return;
    }

    // Determine lane to assign robustly
    let assignedLaneNum: number | null = null;
    const currentDistances = competitionMode === "individual" ? distances : teamDistances;
    const currentDistIdx = commandCenterState?.currentDistanceIndex || 0;
    const activeDistanceObj = currentDistances[currentDistIdx];
    const currentDistId = activeDistanceObj?.id;

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
      currentStageHeats.forEach((h: any) => {
        const foundLane = h.lanes?.find(checkLaneMatchesAthlete);
        if (foundLane) {
          assignedLaneNum = foundLane.laneNumber;
        }
      });
    } else if (commandCenterState.heats) {
      commandCenterState.heats.forEach((h: any) => {
        const foundLane = h.lanes?.find(checkLaneMatchesAthlete);
        if (foundLane) {
          assignedLaneNum = foundLane.laneNumber;
        }
      });
    }

    const occupiedLanes = new Set<number>();
    const workspaces = commandCenterState.refereeWorkspaces || [];
    workspaces.forEach((ws: any) => {
      if (ws.athletes) {
        ws.athletes.forEach((a: any) => {
          if (a.status === "scoring" && a.laneNumber) {
            occupiedLanes.add(Number(a.laneNumber));
          }
        });
      }
    });
    if (commandCenterState.laneStatus) {
      Object.entries(commandCenterState.laneStatus).forEach(([lStr, lVal]: [string, any]) => {
        if (lVal?.athleteId && lVal?.status !== "completed") {
          occupiedLanes.add(Number(lStr));
        }
      });
    }

    let preferredLane = refereeSelectedLane || assignedLaneNum || 1;
    let nextFreeLane = preferredLane;
    if (occupiedLanes.has(preferredLane)) {
      const laneLimit = getActiveLaneLimit();
      for (let l = 1; l <= laneLimit; l++) {
        if (!occupiedLanes.has(l)) {
          nextFreeLane = l;
          break;
        }
      }
    }

    const finalLaneNum = nextFreeLane;
    const refereeId = (currentUser?.email || "anonymous").toLowerCase();
    const refereeName = currentUser?.displayName || refereeId.split("@")[0];

    const newAth = {
      athleteId: athleteObj.id,
      athleteName: athleteObj.name,
      scores: Array(currentShotsCount).fill(null),
      status: "scoring" as const,
      lockedAt: new Date().toISOString(),
      laneNumber: finalLaneNum
    };

    const currentWorkspaces = [...workspaces];
    let myWsIndex = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId);

    if (myWsIndex === -1) {
      currentWorkspaces.push({
        refereeId,
        refereeName,
        athletes: [newAth]
      });
    } else {
      const existingAthIdx = (currentWorkspaces[myWsIndex].athletes || []).findIndex((a: any) => a.athleteId === athleteObj.id);
      if (existingAthIdx === -1) {
        currentWorkspaces[myWsIndex] = {
          ...currentWorkspaces[myWsIndex],
          athletes: [
            ...(currentWorkspaces[myWsIndex].athletes || []),
            newAth
          ]
        };
      } else {
        const updatedAthletes = [...(currentWorkspaces[myWsIndex].athletes || [])];
        updatedAthletes[existingAthIdx] = {
          ...updatedAthletes[existingAthIdx],
          status: "scoring",
          laneNumber: finalLaneNum
        };
        currentWorkspaces[myWsIndex] = {
          ...currentWorkspaces[myWsIndex],
          athletes: updatedAthletes
        };
      }
    }

    await handleUpdateWorkspaces(currentWorkspaces);

    // Also add to audit logs in firestore
    try {
      const updatedCCS = {
        ...commandCenterState,
        refereeWorkspaces: currentWorkspaces,
        auditLogs: [
          ...(commandCenterState.auditLogs || []),
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "QR_ASSIGN_LANE",
            operator: currentUser?.email || "Trọng Tài",
            description: `Quét QR: Đã xếp VĐV ${athleteObj.name} vào Bệ số ${finalLaneNum}.`
          }
        ]
      };
      await updateOnlineTournament(activeHistoryId, {
        commandCenterState: updatedCCS
      });
    } catch (e) {
      console.error("Failed to append scanned audit log:", e);
    }

    alert(`✅ Đã xếp VĐV ${athleteObj.name} vào Bệ bắn số ${finalLaneNum}!`);
  };

  // --- Handlers for Athletes Scoring ---

  // Toggles the hit state of a specific check box
  const executeToggleScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    if (competitionMode === "individual") {
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(shotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < shotsCount) {
            const diff = shotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(teamShotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < teamShotsCount) {
            const diff = teamShotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
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

      // Generate dynamic sub-stages list exactly like TournamentCommandCenter
      const list: { id: string; distanceId: string }[] = [];
      const currentDistances = competitionMode === "individual" ? distances : teamDistances;
      currentDistances.forEach((dist) => {
        // Standard round
        list.push({
          id: dist.id,
          distanceId: dist.id
        });
        // Solo round
        if (dist.isSolo !== false) {
          list.push({
            id: `${dist.id}-solo`,
            distanceId: dist.id
          });
        }
        // Re-Solo round
        if (dist.isResolo) {
          list.push({
            id: `${dist.id}-resolo`,
            distanceId: dist.id
          });
        }
      });

      const activeIdx = list.findIndex(s => s.id === activeSubStageId);
      if (activeIdx === -1) return false;

      const distanceIndices = list
        .map((s, idx) => s.distanceId === distId ? idx : -1)
        .filter(idx => idx !== -1);
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

  // Modifies an athlete details safely
  const handleUpdateAthlete = (athleteId: string, name: string, team: string, customId?: string) => {
    const checkId = customId ? customId.trim() : athleteId;
    const isIdTaken = masterAthletes.some((a) => a.id === checkId && a.id !== athleteId);
    const finalId = isIdTaken ? athleteId : checkId;

    // Update in Master Roster first
    setMasterAthletes((prev) =>
      prev.map((ma) => {
        if (ma.id !== athleteId) return ma;
        return {
          ...ma,
          id: finalId,
          name,
          team,
        };
      })
    );

    // Update in active tournament
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          // If distances or scores fields are missing, re-populate them
          const finalScores = { ...athlete.scores };
          distances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(shotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    } else {
      setTeamAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          // If distances or scores fields are missing, re-populate them
          const finalScores = { ...athlete.scores };
          teamDistances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(teamShotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    }
  };

  // Delete an athlete
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
      }).catch((err) => console.error("Firestore sync error on delete athlete:", err));
    }
  };

  // Move athlete position in the main scoring list
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

  // Toggle score for inputAthletes
  const handleToggleInputScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    const list = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const targetA = list.find((a) => a.id === athleteId);
    if (targetA?.calledBy && targetA.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()) {
      return;
    }
    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(shotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < shotsCount) {
            const diff = shotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(teamShotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < teamShotsCount) {
            const diff = teamShotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    }
  };

  const executeDirectScoreUpdate = (
    athleteId: string, 
    distanceId: string, 
    value: number | null, 
    shotIndex: number = 0
  ) => {
    if (competitionMode === "individual") {
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [];

          currentScores[shotIndex] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [];

          currentScores[shotIndex] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
      // Also update athletes list if athlete exists there
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [];

          currentScores[shotIndex] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    }
  };

  const handleUpdateDirectScore = (
    athleteId: string, 
    distanceId: string, 
    value: number | null, 
    shotIndex: number = 0
  ) => {
    if (isDistanceLocked(distanceId)) {
      alert("Vòng thi này đã bị khóa điểm (chỉ đọc)!");
      return;
    }
    if (!isScoringEditAuthorized) {
      setPendingDirectScoreUpdate({ athleteId, distanceId, value, shotIndex });
      setShowUnlockScoreModal(true);
      return;
    }
    executeDirectScoreUpdate(athleteId, distanceId, value, shotIndex);
  };

  const handleUpdateDirectInputScore = (athleteId: string, distanceId: string, value: number | null) => {
    if (isDistanceLocked(distanceId)) {
      alert("Vòng thi này đã bị khóa điểm (chỉ đọc)!");
      return;
    }
    const list = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const targetA = list.find((a) => a.id === athleteId);
    if (targetA?.calledBy && targetA.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()) {
      return;
    }
    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    }
  };

  // Update solo shootout hits for main athletes
  const handleUpdateSoloHits = (athleteId: string, distanceId: string, rounds: (number | null)[], shotDetails?: (boolean | number | null)[][]) => {
    const isAnyNumber = rounds.some((r) => r !== null && r !== undefined);
    const sum = isAnyNumber 
      ? rounds.reduce<number>((s, r) => s + (r === null || r === undefined ? 0 : r), 0)
      : null;

    // Find target distance object to get alias keys (id)
    const targetDists = competitionMode === "individual" ? distances : teamDistances;
    const distObj = targetDists.find(d => d.id === distanceId || String(d.distance) === distanceId || d.name === distanceId);
    
    const distSearchTerms = [distanceId, distObj?.id]
      .filter(Boolean)
      .map(s => String(s).toLowerCase().trim());

    let updatedAthletesList: Athlete[] = [];

    if (competitionMode === "individual") {
      updatedAthletesList = athletes.map((athlete) => {
        if (athlete.id !== athleteId) return athlete;

        const matchedSoloKeys = Object.keys({ ...(athlete.soloRounds || {}), ...(athlete.soloHits || {}) }).filter(k => {
          const kLower = k.toLowerCase().trim();
          return distSearchTerms.some(term => term && kLower === term);
        });

        const keysToUpdate = Array.from(new Set([
          distanceId,
          distObj?.id,
          ...matchedSoloKeys
        ].filter(Boolean))) as string[];

        const newSoloHits = { ...(athlete.soloHits || {}) };
        const newSoloRounds = { ...(athlete.soloRounds || {}) };
        const newSoloShotDetails = { ...(athlete.soloShotDetails || {}) };

        keysToUpdate.forEach(k => {
          newSoloHits[k] = sum as any;
          newSoloRounds[k] = rounds as any;
          if (shotDetails) newSoloShotDetails[k] = shotDetails as any;
        });

        return {
          ...athlete,
          soloHits: newSoloHits,
          soloRounds: newSoloRounds,
          soloShotDetails: newSoloShotDetails,
        };
      });
      setAthletes(updatedAthletesList);
    } else {
      updatedAthletesList = teamAthletes.map((athlete) => {
        if (athlete.id !== athleteId) return athlete;

        const matchedSoloKeys = Object.keys({ ...(athlete.soloRounds || {}), ...(athlete.soloHits || {}) }).filter(k => {
          const kLower = k.toLowerCase().trim();
          return distSearchTerms.some(term => term && kLower === term);
        });

        const keysToUpdate = Array.from(new Set([
          distanceId,
          distObj?.id,
          ...matchedSoloKeys
        ].filter(Boolean))) as string[];

        const newSoloHits = { ...(athlete.soloHits || {}) };
        const newSoloRounds = { ...(athlete.soloRounds || {}) };
        const newSoloShotDetails = { ...(athlete.soloShotDetails || {}) };

        keysToUpdate.forEach(k => {
          newSoloHits[k] = sum as any;
          newSoloRounds[k] = rounds as any;
          if (shotDetails) newSoloShotDetails[k] = shotDetails as any;
        });

        return {
          ...athlete,
          soloHits: newSoloHits,
          soloRounds: newSoloRounds,
          soloShotDetails: newSoloShotDetails,
        };
      });
      setTeamAthletes(updatedAthletesList);
    }

    // Persist updated solo scores to cloud / Firestore instantly
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      updateOnlineTournament(activeHistoryId, {
        [competitionMode === "individual" ? "athletes" : "teamAthletes"]: updatedAthletesList
      }).catch(err => console.error("Cloud update solo hits failed:", err));
    }
  };

  // Update solo shootout hits for input board athletes
  const handleUpdateInputSoloHits = (athleteId: string, distanceId: string, rounds: (number | null)[], shotDetails?: (boolean | number | null)[][]) => {
    const isAnyNumber = rounds.some((r) => r !== null && r !== undefined);
    const sum = isAnyNumber 
      ? rounds.reduce<number>((s, r) => s + (r === null || r === undefined ? 0 : r), 0)
      : null;

    const targetDists = competitionMode === "individual" ? distances : teamDistances;
    const distObj = targetDists.find(d => d.id === distanceId || String(d.distance) === distanceId || d.name === distanceId);
    
    const distSearchTerms = [distanceId, distObj?.id]
      .filter(Boolean)
      .map(s => String(s).toLowerCase().trim());

    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const matchedSoloKeys = Object.keys({ ...(athlete.soloRounds || {}), ...(athlete.soloHits || {}) }).filter(k => {
            const kLower = k.toLowerCase().trim();
            return distSearchTerms.some(term => term && kLower === term);
          });

          const keysToUpdate = Array.from(new Set([
            distanceId,
            distObj?.id,
            ...matchedSoloKeys
          ].filter(Boolean))) as string[];

          const newSoloHits = { ...(athlete.soloHits || {}) };
          const newSoloRounds = { ...(athlete.soloRounds || {}) };
          const newSoloShotDetails = { ...(athlete.soloShotDetails || {}) };

          keysToUpdate.forEach(k => {
            newSoloHits[k] = sum as any;
            newSoloRounds[k] = rounds as any;
            if (shotDetails) newSoloShotDetails[k] = shotDetails as any;
          });

          return {
            ...athlete,
            soloHits: newSoloHits,
            soloRounds: newSoloRounds,
            soloShotDetails: newSoloShotDetails,
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const matchedSoloKeys = Object.keys({ ...(athlete.soloRounds || {}), ...(athlete.soloHits || {}) }).filter(k => {
            const kLower = k.toLowerCase().trim();
            return distSearchTerms.some(term => term && kLower === term);
          });

          const keysToUpdate = Array.from(new Set([
            distanceId,
            distObj?.id,
            ...matchedSoloKeys
          ].filter(Boolean))) as string[];

          const newSoloHits = { ...(athlete.soloHits || {}) };
          const newSoloRounds = { ...(athlete.soloRounds || {}) };
          const newSoloShotDetails = { ...(athlete.soloShotDetails || {}) };

          keysToUpdate.forEach(k => {
            newSoloHits[k] = sum as any;
            newSoloRounds[k] = rounds as any;
            if (shotDetails) newSoloShotDetails[k] = shotDetails as any;
          });

          return {
            ...athlete,
            soloHits: newSoloHits,
            soloRounds: newSoloRounds,
            soloShotDetails: newSoloShotDetails,
          };
        })
      );
    }
  };

  // Update input athlete details
  const handleUpdateInputAthlete = (athleteId: string, name: string, team: string, customId?: string) => {
    const checkId = customId ? customId.trim() : athleteId;
    const isIdTaken = masterAthletes.some((a) => a.id === checkId && a.id !== athleteId);
    const finalId = isIdTaken ? athleteId : checkId;

    // Update in Master Roster first
    setMasterAthletes((prev) =>
      prev.map((ma) => {
        if (ma.id !== athleteId) return ma;
        return {
          ...ma,
          id: finalId,
          name,
          team,
        };
      })
    );

    // Update in inputAthletes or teamInputAthletes
    if (competitionMode === "individual") {
      setInputAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const finalScores = { ...athlete.scores };
          distances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(shotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    } else {
      setTeamInputAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const finalScores = { ...athlete.scores };
          teamDistances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(teamShotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    }
  };

  // Delete an input athlete
  const handleDeleteInputAthlete = (athleteId: string) => {
    if (competitionMode === "individual") {
      setInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    } else {
      setTeamInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    }
  };

  // Move input athlete position
  const handleMoveInputAthlete = (athleteId: string, direction: "up" | "down") => {
    if (competitionMode === "individual") {
      setInputAthletes((prev) => {
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
      setTeamInputAthletes((prev) => {
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

  const getActiveAthleteListAndUpdater = () => {
    if (competitionMode === "individual") {
      return {
        list: athletes,
        update: (updated: Athlete[]) => {
          setAthletes(updated);
          return { athletes: updated, teamAthletes };
        }
      };
    } else {
      if (teamAthletes && teamAthletes.length > 0) {
        return {
          list: teamAthletes,
          update: (updated: Athlete[]) => {
            setTeamAthletes(updated);
            return { athletes, teamAthletes: updated };
          }
        };
      } else {
        return {
          list: athletes,
          update: (updated: Athlete[]) => {
            setAthletes(updated);
            return { athletes: updated, teamAthletes };
          }
        };
      }
    }
  };

  const handleSaveRefereeLaneScore = (laneNumber: number, scores: (boolean | number | null)[]) => {
    if (!commandCenterState) return;
    
    const activeDistanceId = (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex]?.id;
    if (!activeDistanceId) return;

    const lane = commandCenterState.laneStatus[laneNumber];
    if (!lane || !lane.athleteId) {
      alert("Không có vận động viên gán cho bệ bắn này!");
      return;
    }

    const { list: athleteList, update: updateAthleteListInState } = getActiveAthleteListAndUpdater();
    const athlete = athleteList.find((a) => a.id === lane.athleteId);
    if (!athlete) {
      alert("Không tìm thấy dữ liệu vận động viên!");
      return;
    }

    // Call validation engine
    const validationInput = {
      tournament: {
        status: activeHistoryId && activeHistoryId.startsWith("tour-") ? "live" : "draft",
        distances: competitionMode === "individual" ? distances : teamDistances,
        shotsCount: competitionMode === "individual" ? shotsCount : teamShotsCount,
        directMaxPoints: competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints,
        directMaxShots: competitionMode === "individual" ? directMaxShots : teamDirectMaxShots,
        headReferee: (currentTournamentDoc as any)?.headReferee || "anonymous",
        assistantReferees: (currentTournamentDoc as any)?.assistantReferees || [],
        tournamentFormat: competitionMode
      } as any,
      distanceId: activeDistanceId,
      lane: {
        laneNumber,
        athleteId: lane.athleteId,
        refereeId: lane.refereeId,
        status: lane.status,
        scores: lane.scores
      } as any,
      athlete: athlete,
      scores: scores,
      refereeContext: {
        userId: currentUser?.email || "anonymous",
        role: userRole,
        isHeadReferee: userRole === "admin" || (currentTournamentDoc as any)?.headReferee === currentUser?.email
      }
    };

    const validationResult = ScoreValidationEngine.validate(validationInput);
    if (!validationResult.isValid) {
      alert(`Lỗi xác thực bảng điểm: ${validationResult.error?.message}`);
      return;
    }

    // Success! Generate ScoreEvent
    const eventId = `se-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      athleteId: athlete.id,
      athleteName: athlete.name,
      athleteBib: athlete.id,
      distanceId: activeDistanceId,
      distanceName: (competitionMode === "individual" ? distances : teamDistances)[commandCenterState?.currentDistanceIndex || 0]?.distance,
      heat: commandCenterState?.currentHeat || 1,
      lane: laneNumber,
      scores: [...validationResult.sanitizedScores],
      points: validationResult.metadata?.points || 0,
      isBullseye: validationResult.metadata?.isBullseye || false,
      operator: currentUser?.email || "Trọng Tài",
      type: "save",
      competitionMode: competitionMode,
      tournamentFormat: competitionMode
    };

    // Update scoreEvents
    setScoreEvents((prev) => [...prev, newEvent]);

    // Update athlete's main score record
    const updatedAthletes = athleteList.map((a) => {
      if (a.id === athlete.id) {
        return {
          ...a,
          scores: {
            ...a.scores,
            [activeDistanceId]: [...validationResult.sanitizedScores]
          }
        };
      }
      return a;
    });

    updateAthleteListInState(updatedAthletes);

    // Update commandCenterState lane status and add audit log
    const updatedLaneStatus = {
      ...commandCenterState.laneStatus,
      [laneNumber]: {
        ...lane,
        status: "completed",
        scores: [...validationResult.sanitizedScores]
      }
    };

    const updatedCommandCenterState = {
      ...commandCenterState,
      laneStatus: updatedLaneStatus,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "SAVE_SCORE",
          operator: currentUser?.email || "Trọng Tài",
          description: `Đã ghi nhận điểm cho bệ bắn số ${laneNumber} (VĐV: ${athlete.name} - ${validationResult.metadata?.points} điểm).`
        },
        ...(commandCenterState.auditLogs || [])
      ]
    };

    setCommandCenterState(updatedCommandCenterState);
    alert(`Đã lưu bảng điểm thành công cho bệ bắn số ${laneNumber}!`);
  };

  const handleReopenLane = () => {
    if (!commandCenterState || reopenLaneNumber === null) return;
    if (!reopenReason.trim()) {
      alert("Vui lòng nhập lý do mở khóa bệ bắn!");
      return;
    }

    const lane = commandCenterState.laneStatus[reopenLaneNumber];
    if (!lane || !lane.athleteId) return;

    const { list: athleteList } = getActiveAthleteListAndUpdater();
    const athlete = athleteList.find((a) => a.id === lane.athleteId);
    if (!athlete) return;

    const activeDistanceId = (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex]?.id;
    if (!activeDistanceId) return;

    // Create ScoreVersion record
    const versionId = `sv-${Date.now()}`;
    const newVersion = {
      id: versionId,
      timestamp: new Date().toISOString(),
      athleteId: athlete.id,
      athleteName: athlete.name,
      distanceId: activeDistanceId,
      heat: commandCenterState.currentHeat,
      lane: reopenLaneNumber,
      previousScores: [...(lane.scores || [])],
      reopenedBy: currentUser?.email || "Head Referee",
      reason: reopenReason
    };

    setScoreVersions((prev) => [...prev, newVersion]);

    // Create Audit Log and reopen lane
    const updatedLaneStatus = {
      ...commandCenterState.laneStatus,
      [reopenLaneNumber]: {
        ...lane,
        status: "active"
      }
    };

    const updatedCommandCenterState = {
      ...commandCenterState,
      laneStatus: updatedLaneStatus,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "REOPEN_LANE",
          operator: currentUser?.email || "Head Referee",
          description: `Mở khóa bệ bắn số ${reopenLaneNumber} (VĐV: ${athlete.name}). Lý do: ${reopenReason}`
        },
        ...(commandCenterState.auditLogs || [])
      ]
    };

    setCommandCenterState(updatedCommandCenterState);

    // Reset reopen modal states
    setShowReopenModal(false);
    setReopenLaneNumber(null);
    setReopenReason("");
    alert(`Đã mở khóa bệ bắn số ${reopenLaneNumber} để chỉnh sửa.`);
  };

  const getAthleteActiveLane = (athId: string) => {
    if (!commandCenterState?.laneStatus) return null;
    const laneKey = Object.keys(commandCenterState.laneStatus).find(
      (key) => commandCenterState.laneStatus[Number(key)]?.athleteId === athId
    );
    return laneKey ? Number(laneKey) : null;
  };

  const handleUpdateWorkspaces = async (newWorkspaces: any[]) => {
    if (!activeHistoryId || !commandCenterState) return;

    lastWriteTimeRef.current = Date.now();

    // Dynamically update laneStatus based on refereeWorkspaces to keep Mission Control in perfect real-time sync
    const updatedLaneStatus = { ...(commandCenterState.laneStatus || {}) };

    // Clear lanes that were previously "scoring" but are no longer active in any workspace
    Object.keys(updatedLaneStatus).forEach((laneKey) => {
      const laneNum = Number(laneKey);
      const lane = updatedLaneStatus[laneNum];
      if (lane && lane.status === "scoring") {
        const isStillScoring = newWorkspaces.some((ws: any) => 
          ws && Array.isArray(ws.athletes) && ws.athletes.some((ath: any) => 
            ath && ath.athleteId === lane.athleteId && ath.laneNumber === laneNum && ath.status === "scoring"
          )
        );
        if (!isStillScoring) {
          updatedLaneStatus[laneNum] = {
            athleteId: null,
            refereeId: "Trọng tài bàn",
            status: "idle",
            scores: []
          };
        }
      }
    });

    // Merge currently active scoring athletes into laneStatus
    newWorkspaces.forEach((ws: any) => {
      if (ws && Array.isArray(ws.athletes)) {
        ws.athletes.forEach((ath: any) => {
          if (ath && ath.athleteId && ath.laneNumber && ath.status === "scoring") {
            updatedLaneStatus[ath.laneNumber] = {
              athleteId: ath.athleteId,
              refereeId: ws.refereeId || "Trọng tài",
              status: "scoring",
              scores: ath.scores || []
            };
          }
        });
      }
    });

    const updatedState = {
      ...commandCenterState,
      refereeWorkspaces: newWorkspaces,
      laneStatus: updatedLaneStatus
    };
    setCommandCenterState(updatedState);
    
    try {
      await updateOnlineTournament(activeHistoryId, {
        commandCenterState: updatedState
      });
    } catch (err) {
      console.error("Immediate workspaces sync failed:", err);
    }
  };

  const handleSaveAthleteWorkspaceScore = async (athId: string) => {
    if (!commandCenterState || !activeHistoryId) {
      alert("Không thể ghi nhận kết quả: Bảng điều khiển chưa kích hoạt hoặc chưa chọn giải đấu!");
      return;
    }
    
    const refereeId = (currentUser?.email || "anonymous").toLowerCase();
    const workspaces = commandCenterState.refereeWorkspaces || [];
    const myWorkspace = workspaces.find((ws: any) => ws.refereeId?.toLowerCase() === refereeId);
    if (!myWorkspace) {
      alert("Không tìm thấy không gian chấm điểm của trọng tài này trong danh sách!");
      return;
    }

    const workspaceAthlete = myWorkspace.athletes?.find((a: any) => a.athleteId === athId);
    if (!workspaceAthlete) {
      alert("Không tìm thấy dữ liệu chấm điểm của vận động viên này trong bệ bắn của bạn!");
      return;
    }

    const activeDistanceId = (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex]?.id;
    if (!activeDistanceId) {
      alert("Không tìm thấy thông tin cự ly thi đấu đang diễn ra!");
      return;
    }

    const { list: athleteList, update: updateAthleteListInState } = getActiveAthleteListAndUpdater();
    const athlete = athleteList.find((a) => a.id === athId);
    if (!athlete) {
      alert("Không tìm thấy dữ liệu vận động viên trong danh sách giải đấu!");
      return;
    }

    const laneNumber = workspaceAthlete.laneNumber || 1;

    // Validate using ScoreValidationEngine
    const validationInput = {
      tournament: {
        status: activeHistoryId && activeHistoryId.startsWith("tour-") ? "live" : "draft",
        distances: competitionMode === "individual" ? distances : teamDistances,
        shotsCount: competitionMode === "individual" ? shotsCount : teamShotsCount,
        directMaxPoints: competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints,
        directMaxShots: competitionMode === "individual" ? directMaxShots : teamDirectMaxShots,
        headReferee: (currentTournamentDoc as any)?.headReferee || "anonymous",
        assistantReferees: (currentTournamentDoc as any)?.assistantReferees || [],
        tournamentFormat: competitionMode
      } as any,
      distanceId: activeDistanceId,
      lane: {
        laneNumber,
        athleteId: athId,
        refereeId: refereeId,
        status: "active",
        scores: workspaceAthlete.scores
      } as any,
      athlete: athlete,
      scores: workspaceAthlete.scores,
      refereeContext: {
        userId: currentUser?.email || "anonymous",
        role: userRole,
        isHeadReferee: userRole === "admin" || (currentTournamentDoc as any)?.headReferee === currentUser?.email
      },
      workflowContext: {
        isOverrideAllowed: true,
        isOfflineMode: !activeHistoryId?.startsWith("tour-")
      }
    };

    const validationResult = ScoreValidationEngine.validate(validationInput);
    if (!validationResult.isValid) {
      alert(`Lỗi xác thực bảng điểm: ${validationResult.error?.message}`);
      return;
    }

    // Success! Create ScoreEvent
    const eventId = `se-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      athleteId: athlete.id,
      athleteName: athlete.name,
      athleteBib: athlete.id,
      distanceId: activeDistanceId,
      distanceName: (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex]?.distance,
      heat: commandCenterState.currentHeat || 1,
      lane: laneNumber,
      scores: [...validationResult.sanitizedScores],
      points: validationResult.metadata?.points || 0,
      isBullseye: validationResult.metadata?.isBullseye || false,
      operator: currentUser?.email || "Trọng Tài",
      type: "save",
      competitionMode: competitionMode,
      tournamentFormat: competitionMode
    };

    setScoreEvents((prev) => [...prev, newEvent]);

    const currentActiveHeat = (commandCenterState?.heats || []).find((h: any) => Number(h.heatNumber) === Number(commandCenterState?.currentHeat));
    const isSoloHeat = Boolean(currentActiveHeat && (currentActiveHeat.heatType === "solo" || currentActiveHeat.heatType === "resolo"));
    const isSoloMode = isSoloHeat;

    if (isSoloMode) {
      const sanitizedShotDetails = (validationResult.sanitizedScores || []).map((s: any) => s ?? null);
      const soloRoundSum = sanitizedShotDetails.reduce((acc: number, val: any) => {
        if (typeof val === 'number') return acc + val;
        if (val === true) return acc + 1;
        return acc;
      }, 0);

      const isReSoloHeat = currentActiveHeat?.heatType === "resolo";

      const hNum = Number(commandCenterState?.currentHeat || 0);
      let sri = 1;
      if (hNum > 10000) {
        const base = Math.floor(hNum / 100);
        sri = base % 100;
      } else {
        sri = hNum % 100;
      }
      const targetRoundIdx = Math.max(0, sri - 1);

      const activeDistObj = (competitionMode === "individual" ? distances : teamDistances)[commandCenterState.currentDistanceIndex];
      const distAliasKeys = Array.from(new Set([
        activeDistanceId, 
        activeDistObj?.id
      ].filter(Boolean))) as string[];

      const updatedAthletes: Athlete[] = athleteList.map((a: Athlete): Athlete => {
        if (a.id === athlete.id) {
          const rawExistingRounds = a.soloRounds?.[activeDistanceId];
          const rawExistingShotDetails = a.soloShotDetails?.[activeDistanceId];
          const rawHits = a.soloHits?.[activeDistanceId];

          let existingRounds: number[] = [];
          let existingShotDetails: any[][] = [];

          const parsedExistingRounds = ensureArray(rawExistingRounds);
          if (parsedExistingRounds.length > 0 && (!rawExistingShotDetails || ensureArray(rawExistingShotDetails).length === 0)) {
            const roundsSum = parsedExistingRounds.reduce((acc: number, r: any) => acc + (typeof r === 'number' ? r : (r ? 1 : 0)), 0);
            if (parsedExistingRounds.length > 1 && rawHits !== undefined && Number(rawHits) === roundsSum) {
              existingRounds = [roundsSum];
              existingShotDetails = [parsedExistingRounds.map((s: any) => s ?? null)];
            } else {
              existingRounds = parsedExistingRounds.map((r: any) => Number(r) || 0);
              existingShotDetails = [];
            }
          } else {
            existingRounds = parsedExistingRounds.map((r: any) => Number(r) || 0);
            existingShotDetails = normalize2DArray(rawExistingShotDetails);
          }

          // Ensure array is padded up to targetRoundIdx
          while (existingRounds.length <= targetRoundIdx) {
            existingRounds.push(0);
            existingShotDetails.push([]);
          }

          existingRounds[targetRoundIdx] = soloRoundSum;
          existingShotDetails[targetRoundIdx] = sanitizedShotDetails;

          const totalHitsSum = existingRounds.reduce((sum, r) => sum + (r || 0), 0);

          const currentSoloHits: Record<string, number> = { ...(a.soloHits || {}) };
          const currentSoloRounds: Record<string, number[]> = { ...(a.soloRounds || {}) };
          const currentSoloShotDetails: Record<string, any[][]> = { ...(a.soloShotDetails || {}) };

          distAliasKeys.forEach(k => {
            currentSoloHits[k] = totalHitsSum;
            currentSoloRounds[k] = existingRounds;
            currentSoloShotDetails[k] = existingShotDetails;
          });

          return {
            ...a,
            soloHits: currentSoloHits,
            soloRounds: currentSoloRounds,
            soloShotDetails: currentSoloShotDetails
          };
        }
        return a;
      });

      const { athletes: finalAthletes, teamAthletes: finalTeamAthletes } = updateAthleteListInState(updatedAthletes);

      const updatedLaneStatus = {
        ...(commandCenterState.laneStatus || {}),
        [laneNumber]: {
          athleteId: athId,
          refereeId: refereeId,
          status: "completed" as const,
          scores: [...validationResult.sanitizedScores]
        }
      };

      const updatedSoloQueue = (commandCenterState.soloQueue || []).filter((id: string) => id !== athId);

      const currentWorkspaces = [...(commandCenterState.refereeWorkspaces || [])];
      const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId);
      if (myWsIdx !== -1) {
        currentWorkspaces[myWsIdx] = {
          ...currentWorkspaces[myWsIdx],
          athletes: (currentWorkspaces[myWsIdx].athletes || []).filter((a: any) => a.athleteId !== athId)
        };
      }

      const updatedCommandCenterState = {
        ...commandCenterState,
        soloQueue: updatedSoloQueue,
        laneStatus: updatedLaneStatus,
        refereeWorkspaces: currentWorkspaces,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "SOLO_SCORE_SAVED",
            operator: currentUser?.email || "Trọng Tài",
            description: `Trọng tài đã ghi nhận kết quả SOLO (${soloRoundSum}) cho VĐV: ${athlete.name}.`
          },
          ...(commandCenterState.auditLogs || [])
        ]
      };

      setCommandCenterState(updatedCommandCenterState);

      try {
        await updateOnlineTournament(activeHistoryId, {
          athletes: finalAthletes,
          teamAthletes: finalTeamAthletes,
          commandCenterState: updatedCommandCenterState,
          scoreEvents: [...(scoreEvents || []), newEvent]
        });
      } catch (err) {
        console.error("Firestore sync error:", err);
      }

      alert(`Đã ghi nhận kết quả SOLO (${soloRoundSum}) thành công cho VĐV ${athlete.name}!`);
      return;
    }

    // Update athlete's main score record
    const updatedAthletes = athleteList.map((a) => {
      if (a.id === athlete.id) {
        return {
          ...a,
          scores: {
            ...a.scores,
            [activeDistanceId]: [...validationResult.sanitizedScores]
          }
        };
      }
      return a;
    });

    const { athletes: finalAthletes, teamAthletes: finalTeamAthletes } = updateAthleteListInState(updatedAthletes);

    // Mark the lane as completed in CommandCenterState
    const updatedLaneStatus = {
      ...(commandCenterState.laneStatus || {}),
      [laneNumber]: {
        athleteId: athId,
        refereeId: refereeId,
        status: "completed" as const,
        scores: [...validationResult.sanitizedScores]
      }
    };

    // Remove athlete from our active scoring list in workspaces
    const currentWorkspaces = [...(commandCenterState.refereeWorkspaces || [])];
    const myWsIdx = currentWorkspaces.findIndex((ws: any) => ws.refereeId?.toLowerCase() === refereeId);
    if (myWsIdx !== -1) {
      currentWorkspaces[myWsIdx] = {
        ...currentWorkspaces[myWsIdx],
        athletes: (currentWorkspaces[myWsIdx].athletes || []).filter((a: any) => a.athleteId !== athId)
      };
    }

    const updatedCommandCenterState = {
      ...commandCenterState,
      laneStatus: updatedLaneStatus,
      refereeWorkspaces: currentWorkspaces,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "SAVE_SCORE",
          operator: currentUser?.email || "Trọng Tài",
          description: `Đã ghi nhận điểm chính thức cho VĐV: ${athlete.name} (${validationResult.metadata?.points} điểm).`
        },
        ...(commandCenterState.auditLogs || [])
      ]
    };

    setCommandCenterState(updatedCommandCenterState);

    try {
      await updateOnlineTournament(activeHistoryId, {
        athletes: finalAthletes,
        teamAthletes: finalTeamAthletes,
        scoreEvents: [...scoreEvents, newEvent],
        commandCenterState: updatedCommandCenterState
      });
      alert(`Đã lưu bảng điểm và khóa lượt bắn thành công cho VĐV ${athlete.name}!`);
    } catch (err) {
      console.error("Cloud score save failed:", err);
      alert("Đã xảy ra lỗi đồng bộ điểm lên đám mây!");
    }
  };

  const handleSaveAdminEditedScore = async () => {
    if (!editingScoreEvent || !activeHistoryId || !commandCenterState) return;
    if (!editReason.trim()) {
      alert("Vui lòng nhập lý do chỉnh sửa!");
      return;
    }

    const event = editingScoreEvent;
    const sanitizedScores = editingScores.map(val => {
      if (val === "" || val === undefined) return null;
      if (typeof val === "string") {
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return val;
    });

    const newPoints = (() => {
      const activeDist = (competitionMode === "individual" ? distances : teamDistances).find(d => d.id === event.distanceId);
      const mult = activeDist?.multiplier || 1;
      const isDirect = (competitionMode === "individual" ? shotsCount : teamShotsCount) === 1 || ((competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints) || 0) > 0;
      const hasNumericScores = sanitizedScores.some(s => typeof s === "number" && s > 1);
      if (isDirect || hasNumericScores) {
        return sanitizedScores.reduce((acc, s) => {
          if (typeof s === "number") return acc + s;
          const num = Number(s);
          return acc + (!isNaN(num) ? num : (s === true ? 1 : 0));
        }, 0) * mult;
      } else {
        const hits = sanitizedScores.filter(s => s === true || s === "true" || s === "1" || (typeof s === "number" && s > 0)).length;
        return hits * mult;
      }
    })();

    // Create ScoreVersion
    const versionId = `sv-${Date.now()}`;
    const newVersion = {
      id: versionId,
      eventId: event.id,
      timestamp: new Date().toISOString(),
      athleteId: event.athleteId,
      athleteName: event.athleteName,
      distanceId: event.distanceId,
      heat: event.heat,
      lane: event.lane,
      previousScores: [...event.scores],
      previousPoints: event.points,
      newScores: [...sanitizedScores],
      newPoints: newPoints,
      operator: currentUser?.email || "Admin",
      reason: editReason
    };

    const updatedVersions = [...(scoreVersions || []), newVersion];
    setScoreVersions(updatedVersions);

    // Update scoreEvents
    const updatedEvents = scoreEvents.map(evt => {
      if (evt.id === event.id) {
        return {
          ...evt,
          scores: [...sanitizedScores],
          points: newPoints,
          version: (evt.version || 1) + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || "Admin",
          updateReason: editReason
        };
      }
      return evt;
    });
    setScoreEvents(updatedEvents);

    // Update athlete's main scores
    const { list: athleteList, update: updateAthleteListInState } = getActiveAthleteListAndUpdater();
    const updatedAthletes = athleteList.map(a => {
      if (a.id === event.athleteId) {
        return {
          ...a,
          scores: {
            ...a.scores,
            [event.distanceId]: [...sanitizedScores]
          }
        };
      }
      return a;
    });

    const { athletes: finalAthletes, teamAthletes: finalTeamAthletes } = updateAthleteListInState(updatedAthletes);

    // Update laneStatus if matches current active lane in CommandCenterState
    const updatedLaneStatus = { ...(commandCenterState.laneStatus || {}) };
    Object.entries(updatedLaneStatus).forEach(([laneKey, lVal]: [string, any]) => {
      if (lVal?.athleteId === event.athleteId && Number(laneKey) === event.lane) {
        updatedLaneStatus[laneKey] = {
          ...lVal,
          scores: [...sanitizedScores]
        };
      }
    });

    const updatedCommandCenterState = {
      ...commandCenterState,
      laneStatus: updatedLaneStatus,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "EDIT_SCORE",
          operator: currentUser?.email || "Admin",
          description: `Chỉnh sửa kết quả của VĐV: ${event.athleteName} (Phiên bản mới: ${newPoints}đ). Lý do: ${editReason}`
        },
        ...(commandCenterState.auditLogs || [])
      ]
    };
    setCommandCenterState(updatedCommandCenterState);

    try {
      await updateOnlineTournament(activeHistoryId, {
        athletes: finalAthletes,
        teamAthletes: finalTeamAthletes,
        scoreEvents: updatedEvents,
        scoreVersions: updatedVersions,
        commandCenterState: updatedCommandCenterState
      });
      alert(`Đã cập nhật bảng điểm của VĐV ${event.athleteName} thành công!`);
      setEditingScoreEvent(null);
      setEditingScores([]);
      setEditReason("");
    } catch (err) {
      console.error("Admin edit score sync failed:", err);
      alert("Đồng bộ dữ liệu Admin Edit thất bại!");
    }
  };

  const handleSaveAdminSoftDeleteScore = async () => {
    if (!deletingScoreEvent || !activeHistoryId || !commandCenterState) return;
    if (!deleteReason.trim()) {
      alert("Vui lòng nhập lý do xóa kết quả!");
      return;
    }

    const event = deletingScoreEvent;

    // Update scoreEvents
    const updatedEvents = scoreEvents.map(evt => {
      if (evt.id === event.id) {
        return {
          ...evt,
          deleted: true,
          deletedBy: currentUser?.email || "Admin",
          deletedAt: new Date().toISOString(),
          deletedReason: deleteReason
        };
      }
      return evt;
    });
    setScoreEvents(updatedEvents);

    // Remove score from athlete's main scores
    const { list: athleteList, update: updateAthleteListInState } = getActiveAthleteListAndUpdater();
    const updatedAthletes = athleteList.map(a => {
      if (a.id === event.athleteId) {
        const copyScores = { ...a.scores };
        delete copyScores[event.distanceId];
        return {
          ...a,
          scores: copyScores
        };
      }
      return a;
    });

    const { athletes: finalAthletes, teamAthletes: finalTeamAthletes } = updateAthleteListInState(updatedAthletes);

    // Update laneStatus if matches current active lane in CommandCenterState
    const updatedLaneStatus = { ...(commandCenterState.laneStatus || {}) };
    Object.entries(updatedLaneStatus).forEach(([laneKey, lVal]: [string, any]) => {
      if (lVal?.athleteId === event.athleteId && Number(laneKey) === event.lane) {
        delete updatedLaneStatus[laneKey];
      }
    });

    const updatedCommandCenterState = {
      ...commandCenterState,
      laneStatus: updatedLaneStatus,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "SOFT_DELETE_SCORE",
          operator: currentUser?.email || "Admin",
          description: `Soft-delete lượt nộp điểm của VĐV: ${event.athleteName} (${event.points} điểm, cự ly: ${event.distanceName}). Lý do: ${deleteReason}`
        },
        ...(commandCenterState.auditLogs || [])
      ]
    };
    setCommandCenterState(updatedCommandCenterState);

    try {
      await updateOnlineTournament(activeHistoryId, {
        athletes: finalAthletes,
        teamAthletes: finalTeamAthletes,
        scoreEvents: updatedEvents,
        commandCenterState: updatedCommandCenterState
      });
      alert(`Đã thu hồi & xóa mềm bảng điểm của VĐV ${event.athleteName} thành công!`);
      setDeletingScoreEvent(null);
      setDeleteReason("");
    } catch (err) {
      console.error("Admin soft delete sync failed:", err);
      alert("Đồng bộ dữ liệu soft-delete thất bại!");
    }
  };

  // Save/Transfer scores from input board to Ghi Điểm page
  const handleSaveInputScoresToMain = () => {
    const activeInputList = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    if (activeInputList.length === 0) {
      alert("Không có vận động viên nào trong bảng Nhập Điểm!");
      return;
    }

    const firstImported = activeInputList[0];
    if (firstImported) {
      setPendingScrollAthleteId(firstImported.id);
    }

    if (competitionMode === "individual") {
      setAthletes((prev) => {
        const mergedAthletes = [...prev];
        activeInputList.forEach((ia) => {
          const existingIdx = mergedAthletes.findIndex((a) => a.id === ia.id);
          if (existingIdx !== -1) {
            mergedAthletes[existingIdx] = {
              ...mergedAthletes[existingIdx],
              scores: {
                ...mergedAthletes[existingIdx].scores,
                ...ia.scores,
              },
              soloHits: {
                ...(mergedAthletes[existingIdx].soloHits || {}),
                ...(ia.soloHits || {}),
              },
              soloRounds: {
                ...(mergedAthletes[existingIdx].soloRounds || {}),
                ...(ia.soloRounds || {}),
              },
              soloShotDetails: {
                ...(mergedAthletes[existingIdx].soloShotDetails || {}),
                ...(ia.soloShotDetails || {}),
              },
            };
          } else {
            mergedAthletes.push(ia);
          }
        });
        return mergedAthletes;
      });
      setInputAthletes([]); // Clear
    } else {
      setTeamAthletes((prev) => {
        const mergedAthletes = [...prev];
        activeInputList.forEach((ia) => {
          const existingIdx = mergedAthletes.findIndex((a) => a.id === ia.id);
          if (existingIdx !== -1) {
            mergedAthletes[existingIdx] = {
              ...mergedAthletes[existingIdx],
              scores: {
                ...mergedAthletes[existingIdx].scores,
                ...ia.scores,
              },
              soloHits: {
                ...(mergedAthletes[existingIdx].soloHits || {}),
                ...(ia.soloHits || {}),
              },
              soloRounds: {
                ...(mergedAthletes[existingIdx].soloRounds || {}),
                ...(ia.soloRounds || {}),
              },
              soloShotDetails: {
                ...(mergedAthletes[existingIdx].soloShotDetails || {}),
                ...(ia.soloShotDetails || {}),
              },
            };
          } else {
            mergedAthletes.push(ia);
          }
        });
        return mergedAthletes;
      });
      setTeamInputAthletes([]); // Clear
    }

    alert(`Lưu điểm thành công! Đã tự động cập nhật ${activeInputList.length} VĐV sang danh sách Ghi Điểm.`);
    setActiveTab("scoring");
  };

  // Increments and appends a new athlete with a unique auto ID
  const handleAddAthleteCustom = (name: string, team: string) => {
    const activeAthList = competitionMode === "individual" ? athletes : teamAthletes;
    const finalName = name.trim() || `VĐV Mới ${activeAthList.length + 1}`;
    
    // Auto-generate numeric ID based on maximum current numeric ID + 1
    let nextIdNum = 1;
    if (activeAthList.length > 0) {
      const ids = activeAthList.map((a) => parseInt(a.id, 10)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        nextIdNum = Math.max(...ids) + 1;
      } else {
        nextIdNum = activeAthList.length + 1;
      }
    }
    const finalId = nextIdNum.toString().padStart(4, "0");

    if (competitionMode === "individual") {
      const freshScores: Record<string, (boolean | null)[]> = {};
      distances.forEach((dist) => {
        freshScores[dist.id] = Array(shotsCount).fill(null);
      });

      const newAthlete: Athlete = {
        id: finalId,
        name: finalName,
        team: team.trim(),
        scores: freshScores,
      };
      setAthletes((prev) => [...prev, newAthlete]);
    } else {
      const freshScores: Record<string, (boolean | null)[]> = {};
      teamDistances.forEach((dist) => {
        freshScores[dist.id] = Array(teamShotsCount).fill(null);
      });

      const newAthlete: Athlete = {
        id: finalId,
        name: finalName,
        team: team.trim(),
        scores: freshScores,
      };
      setTeamAthletes((prev) => [...prev, newAthlete]);
    }
  };

  // Instantly triggers adding athlete view (when clicking the giant '+' button at bottom)
  const handleAddBlankAthlete = () => {
    if (!isScoringEditAuthorized) {
      setPendingAddAthlete(true);
      setShowUnlockScoreModal(true);
      return;
    }
    setIsAddingAthleteToTournament(true);
  };

  // --- Handlers for Settings & Administration Actions ---

  // Save current snapshot of scores to historical archive
  const handleSaveCurrentSessionToHistory = (customName?: string) => {
    const nameToSave = customName?.trim() || `${matchName} (Lưu lúc ${new Date().toLocaleTimeString("vi-VN")})`;
    
    const newHistoryItem: MatchHistoryItem = {
      id: `hist-${Date.now()}`,
      date: new Date().toISOString(),
      matchName: nameToSave,
      shotCount: shotsCount,
      distances: [...distances],
      athletes: JSON.parse(JSON.stringify(athletes)), // Only save active tournament athletes (Ghi Điểm)
      masterCount: masterAthletes.length,
      masterAthletes: JSON.parse(JSON.stringify(masterAthletes)),
      teamDistances: [...teamDistances],
      teamShotCount: teamShotsCount,
      teamAthletes: JSON.parse(JSON.stringify(teamAthletes)),
      startDate: startDate,
      endDate: endDate,
    };

    setHistory((prev) => {
      // If we are saving from settings with an explicit non-temporary name that matches an existing tournament, overwrite it or prepend
      const existingIndex = prev.findIndex((h) => h.matchName.toLowerCase() === nameToSave.toLowerCase());
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex] = newHistoryItem;
        return copy;
      }
      return [newHistoryItem, ...prev];
    });
    alert(`Đã lưu thành công trận đấu "${nameToSave}" vào danh sách lịch sử.`);
  };

  // Exit current tournament and reset all tournament state variables back to defaults
  const handleExitTournament = () => {
    setActiveHistoryId(null);
    setAthletes([]);
    setMasterAthletes(vscSystemAthletes);
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
    


    setActiveTab("home");
  };

  const handleLogoClick = () => {
    if (activeHistoryId) {
      handleExitTournament();
    } else {
      setHomeActiveSubTab("all");
      setActiveTab("home");
    }
  };

  // Restore scores state from archive
  const handleRestoreHistoryItem = (itemId: string) => {
    const target = history.find((h) => h.id === itemId);
    if (!target) return;

    // Set activeHistoryId first to avoid creating next entries
    setActiveHistoryId(target.id);

    // Now restore target match
    setMatchName(target.matchName);
    setStartDate(target.startDate || "");
    setEndDate(target.endDate || "");
    setDistances(target.distances);
    setShotsCount(target.shotCount);
    setAthletes(target.athletes);

    if (target.teamDistances) setTeamDistances(target.teamDistances);
    if (target.teamShotCount) setTeamShotsCount(target.teamShotCount);
    if (target.teamAthletes) setTeamAthletes(target.teamAthletes);
    
    // Restore master list of that match fully into master registry (Quản lý VĐV)
    const restoredMasters = target.masterAthletes && target.masterAthletes.length > 0
      ? target.masterAthletes
      : target.athletes;
    setMasterAthletes(JSON.parse(JSON.stringify(restoredMasters)));

    setActiveTab("scoring"); // redirect back to scorecards
  };

  // Remove history snapshot
  const handleDeleteHistoryItem = (itemId: string) => {
    const target = history.find((h) => h.id === itemId);
    if (target) {
      const matchName = target.matchName;
      // Also delete the saved athlete roster list with the exact same tournament name
      setStoredAthleteLists((prev) => prev.filter((list) => list.name.toLowerCase() !== matchName.toLowerCase()));
    }
    setHistory((prev) => prev.filter((h) => h.id !== itemId));
  };

  // Clear all scores inside boxes back to unchecked, preserving the players list
  const handleResetSession = () => {
    const nextAthletes = athletes.map((athlete) => {
      const resetScores: Record<string, (boolean | null)[]> = {};
      distances.forEach((dist) => {
        resetScores[dist.id] = Array(shotsCount).fill(null);
      });
      return {
        ...athlete,
        scores: resetScores,
        soloHits: {},
        soloRounds: {},
        soloShotDetails: {},
        qualificationStatus: undefined
      };
    });

    const nextTeamAthletes = teamAthletes.map((athlete) => {
      const resetScores: Record<string, (boolean | null)[]> = {};
      teamDistances.forEach((dist) => {
        resetScores[dist.id] = Array(teamShotsCount).fill(null);
      });
      return {
        ...athlete,
        scores: resetScores,
        soloHits: {},
        soloRounds: {},
        soloShotDetails: {},
        qualificationStatus: undefined
      };
    });

    setAthletes(nextAthletes);
    setTeamAthletes(nextTeamAthletes);

    const nextScoreEvents: any[] = [];
    setScoreEvents(nextScoreEvents);

    if (commandCenterState) {
      const newCcState = {
        ...commandCenterState,
        laneStatus: {},
        soloQueue: [],
        scoreEvents: [],
        refereeWorkspaces: (commandCenterState.refereeWorkspaces || []).map((ws: any) => ({
          ...ws,
          athletes: []
        }))
      };
      setCommandCenterState(newCcState);

      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
        try {
          updateOnlineTournament(activeHistoryId, {
            athletes: nextAthletes,
            teamAthletes: nextTeamAthletes,
            commandCenterState: newCcState,
            scoreEvents: nextScoreEvents
          });
        } catch (err) {
          console.error("Firestore sync error on reset session:", err);
        }
      }
    }
  };

  const handleResetAthleteScore = (athId: string, distId: string) => {
    const distIdx = distances.findIndex((d) => d.id === distId);
    const teamDistIdx = teamDistances.findIndex((d) => d.id === distId);
    const idx = distIdx >= 0 ? distIdx : (teamDistIdx >= 0 ? teamDistIdx : 0);

    const activeDistanceObj = distances.find((d) => d.id === distId) || teamDistances.find((d) => d.id === distId);

    const keysToDelete = new Set<string>();
    keysToDelete.add(distId);
    keysToDelete.add(`dist-${distId}`);
    keysToDelete.add(`stage-${distId}`);
    keysToDelete.add(`vong-${distId}`);
    keysToDelete.add(`dist-${idx + 1}`);
    keysToDelete.add(`stage-${idx + 1}`);
    keysToDelete.add(`vong-${idx + 1}`);
    if (activeDistanceObj) {
      if (activeDistanceObj.id) {
        keysToDelete.add(activeDistanceObj.id);
        keysToDelete.add(`dist-${activeDistanceObj.id}`);
        keysToDelete.add(`stage-${activeDistanceObj.id}`);
        keysToDelete.add(`vong-${activeDistanceObj.id}`);
      }
      if (activeDistanceObj.distance) {
        const dStr = String(activeDistanceObj.distance);
        keysToDelete.add(dStr);
        keysToDelete.add(`dist-${dStr}`);
        keysToDelete.add(`stage-${dStr}`);
        keysToDelete.add(`vong-${dStr}`);
      }
      if (activeDistanceObj.name) {
        const nStr = String(activeDistanceObj.name);
        keysToDelete.add(nStr);
        keysToDelete.add(`dist-${nStr}`);
        keysToDelete.add(`stage-${nStr}`);
        keysToDelete.add(`vong-${nStr}`);
      }
    }

    const deleteKeysFromObject = (obj: any) => {
      if (!obj) return {};
      const newObj = { ...obj };
      Object.keys(newObj).forEach((k) => {
        const kLower = k.toLowerCase().trim();
        const matches = Array.from(keysToDelete).some((delKey) => {
          const dkLower = delKey.toLowerCase().trim();
          return (
            kLower === dkLower ||
            kLower.includes(`-${dkLower}`) ||
            kLower.includes(`_${dkLower}`) ||
            dkLower.includes(`-${kLower}`) ||
            dkLower.includes(`_${kLower}`)
          );
        });
        if (matches) {
          delete newObj[k];
        }
      });
      return newObj;
    };

    const nextAthletes = athletes.map((a) => {
      if (a.id !== athId && a.participantId !== athId) return a;
      const newScores = deleteKeysFromObject(a.scores);
      const newSoloHits = deleteKeysFromObject(a.soloHits);
      const newSoloRounds = deleteKeysFromObject(a.soloRounds);
      const newSoloShotDetails = deleteKeysFromObject(a.soloShotDetails);

      let newQualStatus = a.qualificationStatus;
      if (newQualStatus && (newQualStatus.includes(distId) || newQualStatus === "pending_solo")) {
        newQualStatus = undefined;
      }

      return {
        ...a,
        scores: newScores,
        soloHits: newSoloHits,
        soloRounds: newSoloRounds,
        soloShotDetails: newSoloShotDetails,
        qualificationStatus: newQualStatus
      };
    });

    const nextTeamAthletes = teamAthletes.map((a) => {
      if (a.id !== athId && a.participantId !== athId) return a;
      const newScores = deleteKeysFromObject(a.scores);
      const newSoloHits = deleteKeysFromObject(a.soloHits);
      const newSoloRounds = deleteKeysFromObject(a.soloRounds);
      const newSoloShotDetails = deleteKeysFromObject(a.soloShotDetails);

      let newQualStatus = a.qualificationStatus;
      if (newQualStatus && (newQualStatus.includes(distId) || newQualStatus === "pending_solo")) {
        newQualStatus = undefined;
      }

      return {
        ...a,
        scores: newScores,
        soloHits: newSoloHits,
        soloRounds: newSoloRounds,
        soloShotDetails: newSoloShotDetails,
        qualificationStatus: newQualStatus
      };
    });

    setAthletes(nextAthletes);
    setTeamAthletes(nextTeamAthletes);

    // Clear score events matching athId and distId
    const nextScoreEvents = (scoreEvents || []).filter(
      (evt) => !((evt.athleteId === athId || evt.athleteBib === athId) && evt.distanceId === distId)
    );
    setScoreEvents(nextScoreEvents);

    // Sync referee workspaces and command center state
    if (commandCenterState) {
      const updatedWorkspaces = (commandCenterState.refereeWorkspaces || []).map((ws: any) => ({
        ...ws,
        athletes: (ws.athletes || []).filter((a: any) => a.athleteId !== athId && a.id !== athId)
      }));

      const newLaneStatus = { ...(commandCenterState.laneStatus || {}) };
      Object.keys(newLaneStatus).forEach((lKey) => {
        if (newLaneStatus[lKey]?.athleteId === athId) {
          delete newLaneStatus[lKey];
        }
      });

      const newCcState = {
        ...commandCenterState,
        refereeWorkspaces: updatedWorkspaces,
        laneStatus: newLaneStatus,
        scoreEvents: (commandCenterState.scoreEvents || []).filter(
          (evt: any) => !((evt.athleteId === athId || evt.athleteBib === athId) && evt.distanceId === distId)
        )
      };

      setCommandCenterState(newCcState);
      handleUpdateWorkspaces(updatedWorkspaces);

      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
        try {
          updateOnlineTournament(activeHistoryId, {
            athletes: nextAthletes,
            teamAthletes: nextTeamAthletes,
            commandCenterState: newCcState,
            scoreEvents: nextScoreEvents
          });
        } catch (err) {
          console.error("Firestore sync error on reset athlete score:", err);
        }
      }
    }
  };

  // Validate and read imported text data backup (Active tournament configuration & active athletes only)
  const handleImportSingleBackup = (dataString: string): boolean => {
    try {
      const parsed = JSON.parse(dataString);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray(parsed.distances) &&
        Array.isArray(parsed.athletes)
      ) {
        const incomingName = (parsed.matchName || "Giải đấu mới").trim();
        
        // Find existing with same name in history
        const duplicateIdx = history.findIndex(
          (h) => h.matchName.trim().toLowerCase() === incomingName.toLowerCase()
        );
        
        let finalName = incomingName;
        let shouldOverwrite = false;
        let shouldAppendNew = true;
        let proceed = true;
        
        if (duplicateIdx > -1) {
          // If name matches, show overwrite, rename or cancel
          const isOverwrite = window.confirm(
            `Giải đấu "${incomingName}" đã tồn tại trong danh sách Lịch sử.\n\n` +
            `• Chọn [OK (Xác nhận)] để GHI ĐÈ giải cũ.\n` +
            `• Chọn [Hủy (Cancel)] để ĐỔI TÊN giải và lưu song song cả hai giải.`
          );
          
          if (isOverwrite) {
            shouldOverwrite = true;
            shouldAppendNew = false;
          } else {
            const newName = window.prompt(
              `Vui lòng nhập TÊN MỚI cho giải đấu phục hồi để tránh trùng lập:`,
              incomingName + " (Bản phục hồi)"
            );
            if (newName && newName.trim() !== "") {
              finalName = newName.trim();
              shouldAppendNew = true;
            } else {
              // User pressed Cancel on prompt or gave empty name -> cancel entirely
              proceed = false;
            }
          }
        }
        
        if (!proceed) {
          return false;
        }

        // Apply active states
        setMatchName(finalName);
        setDistances(parsed.distances);
        if (parsed.shotsCount) setShotsCount(parsed.shotsCount);
        
        const restoredAthletes = restoreBase64Avatars(parsed.athletes);
        setAthletes(restoredAthletes);
        saveAvatarsFromAthletes(restoredAthletes);

        // Sync team parameters if present
        if (parsed.teamDistances) setTeamDistances(parsed.teamDistances);
        if (parsed.teamShotsCount) setTeamShotsCount(parsed.teamShotsCount);
        if (parsed.teamAthletes) {
          const restoredTeam = restoreBase64Avatars(parsed.teamAthletes);
          setTeamAthletes(restoredTeam);
          saveAvatarsFromAthletes(restoredTeam);
        }

        // Put/Add this session into matches history
        const newHistoryItem: MatchHistoryItem = {
          id: shouldOverwrite ? history[duplicateIdx].id : `hist-${Date.now()}`,
          date: new Date().toISOString(),
          matchName: finalName,
          shotCount: parsed.shotsCount || shotsCount,
          distances: parsed.distances,
          athletes: restoredAthletes,
          masterCount: restoredAthletes.length,
          masterAthletes: restoredAthletes,
          teamDistances: parsed.teamDistances || [...teamDistances],
          teamShotCount: parsed.teamShotsCount || teamShotsCount,
          teamAthletes: parsed.teamAthletes ? restoreBase64Avatars(parsed.teamAthletes) : [...teamAthletes],
        };

        setHistory((prev) => {
          if (shouldOverwrite) {
            const updated = [...prev];
            updated[duplicateIdx] = newHistoryItem;
            return updated;
          } else if (shouldAppendNew) {
            // Append at the front (as modern/active item)
            return [newHistoryItem, ...prev];
          }
          return prev;
        });

        alert(`Đã khôi phục thành công giải đấu "${finalName}" và ghi nhận vào Lịch Sử.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Validate and read full database backup (Active tournament + entire history log)
  const handleImportFullBackup = (dataString: string): boolean => {
    try {
      const parsed = JSON.parse(dataString);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray(parsed.distances) &&
        Array.isArray(parsed.athletes)
      ) {
        // 1. First restore active session from parsed
        const incomingActiveName = (parsed.matchName || "Giải đấu mới").trim();
        setMatchName(incomingActiveName);
        setDistances(parsed.distances);
        if (parsed.shotsCount) setShotsCount(parsed.shotsCount);
        
        const restoredAthletes = restoreBase64Avatars(parsed.athletes);
        setAthletes(restoredAthletes);
        saveAvatarsFromAthletes(restoredAthletes);

        // Sync team parameters if present
        if (parsed.teamDistances) setTeamDistances(parsed.teamDistances);
        if (parsed.teamShotsCount) setTeamShotsCount(parsed.teamShotsCount);
        if (parsed.teamAthletes) {
          const restoredTeam = restoreBase64Avatars(parsed.teamAthletes);
          setTeamAthletes(restoredTeam);
          saveAvatarsFromAthletes(restoredTeam);
        }

        // 2. Now process the history log array properly (checking duplicates)
        if (Array.isArray(parsed.history)) {
          const restoredHistory = restoreBase64Avatars(parsed.history);
          
          setHistory((currentHistory) => {
            const tempHistory = [...currentHistory];
            
            restoredHistory.forEach((importedItem: MatchHistoryItem) => {
              if (importedItem.athletes) saveAvatarsFromAthletes(importedItem.athletes);
              if (importedItem.masterAthletes) saveAvatarsFromAthletes(importedItem.masterAthletes);
              if (importedItem.teamAthletes) saveAvatarsFromAthletes(importedItem.teamAthletes);
              
              const collisionIdx = tempHistory.findIndex(
                (h) => h.matchName.trim().toLowerCase() === importedItem.matchName.trim().toLowerCase()
              );
              
              if (collisionIdx > -1) {
                // Duplicate found. Ask!
                const isOverwrite = window.confirm(
                  `Giải đấu "${importedItem.matchName}" đã tồn tại trong lịch sử của bạn.\n\n` +
                  `• Chọn [OK (Xác nhận)] để GHI ĐÈ dữ liệu từ file backup lên giải hiện tại.\n` +
                  `• Chọn [Hủy (Cancel)] để ĐỔI TÊN giải từ file backup và lưu song song.`
                );
                
                if (isOverwrite) {
                  // overwrite existing index keeping old ID
                  tempHistory[collisionIdx] = {
                    ...importedItem,
                    id: tempHistory[collisionIdx].id // keep existing id
                  };
                } else {
                  // Prompt for name change
                  const newName = window.prompt(
                    `Vui lòng nhập TÊN MỚI cho giải đấu "${importedItem.matchName}" để lưu mới:`,
                    importedItem.matchName + " (Bản phục hồi)"
                  );
                  if (newName && newName.trim() !== "") {
                    tempHistory.unshift({
                      ...importedItem,
                      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      matchName: newName.trim()
                    });
                  } else {
                    // skip/discard importing this particular duplicate item
                  }
                }
              } else {
                // No duplicate, prepend directly!
                tempHistory.unshift(importedItem);
              }
            });
            
            return tempHistory;
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Export full JSON backup of the active session and historical events
  const handleExportBackup = () => {
    const backupData = {
      matchName,
      distances,
      shotsCount,
      athletes,
      history,
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slingshot-scoring_${matchName.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter athletes for the scoring board view list
  const filteredAthletesScoring = athletes.filter((a) => {
    if (!a) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(query) ||
      (a.id || "").toLowerCase().includes(query) ||
      (a.team || "").toLowerCase().includes(query)
    );
  });

  // Filter athletes for the input board view list
  const filteredInputAthletes = inputAthletes.filter((a) => {
    if (!a) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(query) ||
      (a.id || "").toLowerCase().includes(query) ||
      (a.team || "").toLowerCase().includes(query)
    );
  });

  // Contextual current pointers based on active competitionMode
  const currentDistances = competitionMode === "individual" ? distances : teamDistances;
  const currentShotsCount = competitionMode === "individual" ? shotsCount : teamShotsCount;
  const currentAthletes = competitionMode === "individual" ? athletes : teamAthletes;
  const currentInputAthletes = competitionMode === "individual" ? inputAthletes : teamInputAthletes;

  // Filter team athletes for the scoring board view list
  const filteredTeamAthletesScoring = teamAthletes.filter((a) => {
    if (!a) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(query) ||
      (a.id || "").toLowerCase().includes(query) ||
      (a.team || "").toLowerCase().includes(query)
    );
  });

  // Filter team athletes for the input board view list
  const filteredTeamInputAthletes = teamInputAthletes.filter((a) => {
    if (!a) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(query) ||
      (a.id || "").toLowerCase().includes(query) ||
      (a.team || "").toLowerCase().includes(query)
    );
  });

  const activeFilteredScoringAthletes = competitionMode === "individual" ? filteredAthletesScoring : filteredTeamAthletesScoring;
  const activeFilteredInputAthletes = competitionMode === "individual" ? filteredInputAthletes : filteredTeamInputAthletes;

  if (isStorageRestoring) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        <div className="z-10 flex flex-col items-center gap-6 max-w-sm">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm shadow-xl animate-bounce duration-1000">
            <VSCLogo size={100} />
          </div>
          <div className="space-y-2 animate-pulse">
            <h2 className="text-xl font-black uppercase text-amber-500 tracking-wider">ĐANG ĐỒNG BỘ DỮ LIỆU</h2>
            <p className="text-xs text-gray-300 font-mono">Đang tải & bảo mật dữ liệu lưu trữ từ bộ nhớ điện thoại...</p>
          </div>
          <div className="w-16 h-1 mt-2 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 sm:pb-16 transition-colors duration-200">
      
      <AppHeader
        currentUser={currentUser}
        globalRole={globalRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        homeActiveSubTab={homeActiveSubTab}
        setHomeActiveSubTab={setHomeActiveSubTab}
        activeHistoryId={activeHistoryId}
        handleExitTournament={handleExitTournament}
        handleLogoClick={handleLogoClick}
        history={history}
        setIsLiveBoardOpen={setIsLiveBoardOpen}
        setIsTimerOpen={setIsTimerOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        visibleNavigation={visibleNavigation}
        currentTournamentDoc={currentTournamentDoc}
        rankingEnvironment={rankingEnvironment}
        setRankingEnvironment={setRankingEnvironment}
        rankingMode={rankingMode}
        setRankingMode={setRankingMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        networkStatus={networkStatus}
        controlPanelSubTab={controlPanelSubTab}
        setControlPanelSubTab={setControlPanelSubTab}
        matchName={matchName}
      />

      {/* Main Core Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex flex-col gap-6" id="app-main">

        {/* Active Tournament Role & Control Board Banner */}
        <TournamentWorkspaceBanner
          activeHistoryId={activeHistoryId}
          currentTournamentDoc={currentTournamentDoc}
          matchName={matchName}
          commandCenterState={commandCenterState}
          competitionMode={competitionMode}
          setCompetitionMode={setCompetitionMode}
          userRole={userRole}
          isSpectatorModeOverridden={isSpectatorModeOverridden}
          setIsSpectatorModeOverridden={setIsSpectatorModeOverridden}
          distances={distances}
          teamDistances={teamDistances}
          networkStatus={networkStatus}
        />

        {/* Contextual tools when scoring or inputting scores */}
        {(activeTab === "scoring" || activeTab === "input_scores") && (
          <div className="flex justify-end w-full mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm vận động viên (Tên, Mã, Đội)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white border border-gray-350 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* Tab content area logic */}
        <div className="tab-content translate-y-0" id="active-tab-panel">

               {/* TAB 1: SCORING WORKSPACE BOARD */}
          {activeTab === "scoring" && (
            <OfficialScoreLedger
              athletes={competitionMode === "individual" ? athletes : (teamAthletes || []).filter((a) => a.isPrimaryTeam)}
              distances={competitionMode === "individual" ? distances : teamDistances}
              shotsCount={competitionMode === "individual" ? shotsCount : teamShotsCount}
              competitionMode={competitionMode}
              userRole={userRole}
              scoreEvents={scoreEvents}
              onToggleScore={handleToggleScore}
              onUpdateDirectScore={handleUpdateDirectScore}
              onUpdateSoloHits={handleUpdateSoloHits}
              onResetAthleteScore={handleResetAthleteScore}
              directMaxPoints={competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints}
              isDistanceLocked={isDistanceLocked}
              isScoringEditAuthorized={isScoringEditAuthorized}
              onRequireUnlock={() => {
                setPendingScoreToggle(null);
                setShowUnlockScoreModal(true);
              }}
            />
          )}

          {/* TAB 1B: OFFICIAL REFEREE TERMINAL (NHẬP ĐIỂM) */}
          {activeTab === "input_scores" && (
            <RefereeTerminal
              currentUser={currentUser}
              userRole={userRole}
              matchName={matchName}
              commandCenterState={commandCenterState}
              distances={distances}
              teamDistances={teamDistances}
              competitionMode={competitionMode}
              athletes={athletes}
              teamAthletes={teamAthletes}
              leaderboardAthletes={leaderboardAthletes}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
              currentTournamentDoc={currentTournamentDoc}
              scoreEvents={scoreEvents}
              refereeSelectedLane={refereeSelectedLane}
              setRefereeSelectedLane={setRefereeSelectedLane}
              setShowRefereeLaneModal={setShowRefereeLaneModal}
              setShowQrScanner={setShowQrScanner}
              setSelectedCallIds={setSelectedCallIds}
              setCallSearchTerm={setCallSearchTerm}
              setShowCallAthleteModal={setShowCallAthleteModal}
              handleUpdateWorkspaces={handleUpdateWorkspaces}
              handleSaveAthleteWorkspaceScore={handleSaveAthleteWorkspaceScore}
              handleResetAthleteScore={handleResetAthleteScore}
            />
          )}

          {/* TAB: VSC HOME CENTRAL HUB */}
          {activeTab === "home" && !activeHistoryId && (
            <HomeTab
              currentUser={currentUser}
              globalRole={globalRole}
              v3Tournaments={v3Tournaments}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearchExpanded={isSearchExpanded}
              setIsSearchExpanded={setIsSearchExpanded}
              handleSelectTournament={handleSelectTournament}
              followedTournaments={followedTournaments}
              toggleFollowTournament={toggleFollowTournament}
              setDeleteTournamentConfirm={setDeleteTournamentConfirm}
              visibleTournamentsCount={visibleTournamentsCount}
              setVisibleTournamentsCount={setVisibleTournamentsCount}
              isMobile={isMobile}
              setActiveTab={setActiveTab}
              homeActiveSubTab={homeActiveSubTab}
              systemSponsors={systemSponsors}
              vscSystemAthletes={vscSystemAthletes}
              vscSystemClubs={vscSystemClubs}
              masterAthletes={masterAthletes}
              clubs={clubs}
              history={history}
            />
          )}

          {/* TAB 0: TOURNAMENT SUMMARY DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <MainDashboard
              athletes={athletes}
              distances={distances}
              shotsCount={shotsCount}
              matchName={matchName}
              masterAthletes={masterAthletes}
              teamAthletes={teamAthletes}
              teamDistances={teamDistances}
              teamShotsCount={teamShotsCount}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
              directMaxShots={directMaxShots}
              teamDirectMaxShots={teamDirectMaxShots}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              sponsors={systemSponsors}
              systemClubs={vscSystemClubs}
              onExportClick={() => setIsExportModalOpen(true)}
              onLiveBoardClick={() => setIsLiveBoardOpen(true)}
              onTimerClick={() => setIsTimerOpen(true)}
            />
          )}

          {/* TAB: PUBLIC ATHLETE REGISTRATION */}
          {activeTab === "public_registration" && (
            <PublicRegistration
              activeHistoryId={activeHistoryId}
              currentTournamentDoc={currentTournamentDoc}
              currentUser={currentUser}
            />
          )}

          {/* TAB 2: LIVE TOURNAMENT RANKING LEADERBOARD (UNIFIED RANKING) */}
          {activeTab === "leaderboard" && (
            <LeaderboardTab
              rankingMode={rankingMode}
              setRankingMode={setRankingMode}
              rankingEnvironment={rankingEnvironment}
              leaderboardAthletes={leaderboardAthletes}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
              distances={distances}
              teamDistances={teamDistances}
              shotsCount={shotsCount}
              teamShotsCount={teamShotsCount}
              directMaxShots={directMaxShots}
              teamDirectMaxShots={teamDirectMaxShots}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              commandCenterState={commandCenterState}
            />
          )}

          {/* TAB NEW: MASTER DATA REGISTRIES */}
          {activeTab === "athletes" && (
            <AthleteRegistry
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB NEW: CLUB MANAGEMENT PORTAL */}
          {activeTab === "clubs" && (
            <ClubManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB NEW: PROVINCE MANAGEMENT PORTAL */}
          {activeTab === "provinces" && (
            <ProvinceManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB NEW: SEASON MANAGEMENT PORTAL */}
          {activeTab === "seasons" && (
            <SeasonManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB NEW: HALL OF FAME PORTAL */}
          {activeTab === "hall_of_fame" && (
            <HallOfFameTab />
          )}

          {/* TAB: SYSTEM USERS & ROLES */}
          {activeTab === "users" && (
            <UserManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB: SYSTEM REFEREES */}
          {activeTab === "referees" && (
            <RefereeManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB: SYSTEM SPONSORS */}
          {activeTab === "sponsors" && (
            <SponsorManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* TAB: SYSTEM RULE TEMPLATES */}
          {activeTab === "rule_templates" && (
            <RuleTemplateManagement
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

           {/* TAB: TOURNAMENT MANAGEMENT FOUNDATION */}
          {activeTab === "tournaments" && (
            <TournamentManagement onSelectTournament={handleSelectTournament} />
          )}

          {/* TAB: TOURNAMENT WORKSPACE DIRECT LINK */}
          {activeTab === "tournament_mgmt" && (
            <TournamentManagement activeHistoryId={activeHistoryId} />
          )}

          {/* TAB: CREATE TOURNAMENT SHORTCUT */}
          {activeTab === "create_tournament" && (
            <TournamentManagement isCreateOpen={true} onExitCreate={() => setActiveTab("tournaments")} />
          )}

          {/* TAB 4: SAVED HISTORY SNAPSHOTS RECORD */}
          {activeTab === "history" && (
            <HistoryPanel
              history={history}
              onRestoreHistoryItem={handleRestoreHistoryItem}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              currentMasterCount={masterAthletes.length}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportFullBackup}
            />
          )}

          {/* TAB 5: MY CONTROL PANEL (PERSONAL WORKSPACE) */}
          {activeTab === "control_panel" && (
            <ControlPanel
              activeHistoryId={activeHistoryId}
              onSelectTournament={(id, tournament) => handleSelectTournament(id, tournament, "dashboard")}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              initialSubTab={controlPanelSubTab}
              onSubTabChange={setControlPanelSubTab}
              matchName={matchName}
              setMatchName={setMatchName}
              distances={distances}
              setDistances={setDistances}
              shotsCount={shotsCount}
              setShotsCount={setShotsCount}
              athletes={athletes}
              setAthletes={setAthletes}
              masterAthletes={masterAthletes}
              setMasterAthletes={setMasterAthletes}
              history={history}
              setHistory={setHistory}
              onSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
              onResetSession={handleResetSession}
              onImportBackup={handleImportFullBackup}
              storedAthleteLists={storedAthleteLists}
              setStoredAthleteLists={setStoredAthleteLists}
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
          )}

          {/* TAB: TOURNAMENT COMMAND CENTER (MISSION CONTROL) */}
          {activeTab === "command_center" && (
            <TournamentCommandCenter
              activeHistoryId={activeHistoryId}
              matchName={matchName}
              distances={competitionMode === "individual" ? distances : teamDistances}
              teamDistances={teamDistances}
              athletes={athletes}
              setAthletes={setAthletes}
              teamAthletes={teamAthletes}
              setTeamAthletes={setTeamAthletes}
              competitionMode={competitionMode}
              setCompetitionMode={setCompetitionMode}
              userRole={userRole}
              currentUser={currentUser}
              currentTournamentDoc={currentTournamentDoc}
              commandCenterState={commandCenterState}
              setCommandCenterState={setCommandCenterStateWithWriteTime}
              onResetAthleteScore={handleResetAthleteScore}
              globalTimer={globalTimer}
              canControlTimer={canControlTimer}
              onOpenTimer={() => setIsTimerOpen(true)}
              onOpenLiveBoard={() => setIsLiveBoardOpen(true)}
              leaderboardAthletes={leaderboardAthletes}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
            />
          )}

        </div>

      </main>

      <AppFooter
        currentTime={currentTime}
        formatICTTime={formatICTTime}
        formatICTDate={formatICTDate}
        isGlobalAdmin={isGlobalAdmin}
        systemAdminRoleOverride={systemAdminRoleOverride}
        setSystemAdminRoleOverride={setSystemAdminRoleOverride}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        matchName={matchName}
        athletes={competitionMode === "individual" ? leaderboardAthletes : leaderboardTeamAthletes}
        distances={currentDistances}
        shotsCount={currentShotsCount}
        directMaxShots={directMaxShots}
        teamDirectMaxShots={teamDirectMaxShots}
        competitionMode={competitionMode}
        directMaxPoints={directMaxPoints}
        teamDirectMaxPoints={teamDirectMaxPoints}
        activeTab={activeTab}
        indAthletes={leaderboardAthletes}
        indDistances={distances}
        indShotsCount={shotsCount}
        teamAthletes={leaderboardTeamAthletes}
        teamDistances={teamDistances}
        teamShotsCount={teamShotsCount}
      />

      <LiveBoard
        isOpen={isLiveBoardOpen}
        onClose={() => setIsLiveBoardOpen(false)}
        matchName={matchName}
        athletes={leaderboardAthletes}
        distances={distances}
        shotsCount={shotsCount}
        teamAthletes={teamAthletes}
        teamDistances={teamDistances}
        teamShotsCount={teamShotsCount}
        leaderboardTeamAthletes={leaderboardTeamAthletes}
        directMaxShots={directMaxShots}
        teamDirectMaxShots={teamDirectMaxShots}
        directMaxPoints={directMaxPoints}
        teamDirectMaxPoints={teamDirectMaxPoints}
        commandCenterState={commandCenterState}
      />

      <CountdownTimerBoard
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        matchName={matchName}
        globalTimer={globalTimer}
        canControlTimer={canControlTimer}
      />

      <UnlockScoreModal
        isOpen={showUnlockScoreModal}
        pendingAddAthlete={pendingAddAthlete}
        onCancel={() => {
          setPendingScoreToggle(null);
          setPendingDirectScoreUpdate(null);
          setPendingAddAthlete(false);
          setShowUnlockScoreModal(false);
        }}
        onConfirm={() => {
          setIsScoringEditAuthorized(true);
          if (pendingScoreToggle) {
            const { athleteId, distanceId, shotIndex } = pendingScoreToggle;
            executeToggleScore(athleteId, distanceId, shotIndex);
            setPendingScoreToggle(null);
          }
          if (pendingDirectScoreUpdate) {
            const { athleteId, distanceId, value, shotIndex } = pendingDirectScoreUpdate;
            executeDirectScoreUpdate(athleteId, distanceId, value, shotIndex);
            setPendingDirectScoreUpdate(null);
          }
          if (pendingAddAthlete) {
            setIsAddingAthleteToTournament(true);
            setPendingAddAthlete(false);
          }
          setShowUnlockScoreModal(false);
        }}
      />

      <ExitAndCreateConfirmModal
        isOpen={showExitAndCreateConfirmModal}
        onCancel={() => setShowExitAndCreateConfirmModal(false)}
        onConfirm={() => {
          setShowExitAndCreateConfirmModal(false);
          handleExitTournament();
          setActiveTab("create_tournament");
        }}
      />

      <SwitchingTournamentModal
        isOpen={!!switchingTournamentData}
        matchName={matchName}
        switchingTournamentName={switchingTournamentData?.tournamentName || ""}
        onCancel={() => setSwitchingTournamentData(null)}
        onConfirm={confirmTournamentSwitch}
      />

      <QrScannerModal
        showQrScanner={showQrScanner}
        scannedAthleteConfirmData={scannedAthleteConfirmData}
        qrScannerError={qrScannerError}
        availableCameras={availableCameras}
        activeCameraId={activeCameraId}
        setScannedAthleteConfirmData={setScannedAthleteConfirmData}
        setShowQrScanner={setShowQrScanner}
        setActiveCameraId={setActiveCameraId}
        startQrScanning={startQrScanning}
        handleProcessScannedAthlete={handleProcessScannedAthlete}
      />

      <RefereeLaneModal
        isOpen={showRefereeLaneModal}
        onClose={() => setShowRefereeLaneModal(false)}
        currentUser={currentUser}
        competitionMode={competitionMode}
        distances={distances}
        teamDistances={teamDistances}
        commandCenterState={commandCenterState}
        currentTournamentDoc={currentTournamentDoc}
        refereeSelectedLane={refereeSelectedLane}
        setRefereeSelectedLane={setRefereeSelectedLane}
        laneLimit={getActiveLaneLimit()}
      />

      <CallAthleteModal
        isOpen={showCallAthleteModal}
        onClose={() => setShowCallAthleteModal(false)}
        currentUser={currentUser}
        competitionMode={competitionMode}
        distances={distances}
        teamDistances={teamDistances}
        shotsCount={shotsCount}
        teamShotsCount={teamShotsCount}
        athletes={athletes}
        teamAthletes={teamAthletes}
        leaderboardAthletes={leaderboardAthletes}
        leaderboardTeamAthletes={leaderboardTeamAthletes}
        commandCenterState={commandCenterState}
        scoreEvents={scoreEvents}
        refereeSelectedLane={refereeSelectedLane}
        selectedCallIds={selectedCallIds}
        setSelectedCallIds={setSelectedCallIds}
        callSearchTerm={callSearchTerm}
        setCallSearchTerm={setCallSearchTerm}
        callLaneAssignments={callLaneAssignments}
        setCallLaneAssignments={setCallLaneAssignments}
        handleUpdateWorkspaces={handleUpdateWorkspaces}
        laneLimit={getActiveLaneLimit()}
      />

      {/* Mobile Floating Bottom Navigation Bar (md:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#ae1d1e] border-t border-red-900/30 px-2 py-1 flex items-center justify-around md:hidden pb-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.25)] font-sans">
        {(activeHistoryId ? [
          {
            id: "input_scores",
            label: "Nhập Điểm",
            icon: Edit3,
            isActive: activeTab === "input_scores",
            onClick: () => {
              setActiveTab("input_scores");
            }
          },
          {
            id: "dashboard",
            label: "Overview",
            icon: LayoutDashboard,
            isActive: activeTab === "dashboard",
            onClick: () => {
              setActiveTab("dashboard");
            }
          },
          {
            id: "home",
            label: "Trang Chủ",
            icon: Home,
            isActive: activeTab === "home",
            onClick: () => {
              handleExitTournament();
              setHomeActiveSubTab("all");
              setActiveTab("home");
            }
          },
          {
            id: "leaderboard",
            label: "RANKING",
            icon: Trophy,
            isActive: activeTab === "leaderboard",
            onClick: () => {
              const isIndividualOnly = currentTournamentDoc?.tournamentFormat === "individual";
              if (isIndividualOnly) {
                setRankingEnvironment("individual");
                setRankingMode("individual");
                setActiveTab("leaderboard");
                setIsMobileRankingMenuOpen(false);
              } else {
                setIsMobileRankingMenuOpen(!isMobileRankingMenuOpen);
              }
            }
          },
          {
            id: "command_center",
            label: "MISSION CONTROL",
            icon: Radio,
            isActive: activeTab === "command_center",
            onClick: () => {
              setActiveTab("command_center");
            }
          }
        ] : [
          {
            id: "athletes",
            label: "VĐV",
            icon: Users,
            isActive: activeTab === "athletes" && !activeHistoryId,
            onClick: () => {
              setActiveTab("athletes");
            }
          },
          {
            id: "clubs",
            label: "CLB",
            icon: Shield,
            isActive: activeTab === "clubs" && !activeHistoryId,
            onClick: () => {
              setActiveTab("clubs");
            }
          },
          {
            id: "home",
            label: "Trang Chủ",
            icon: Home,
            isActive: activeTab === "home" && homeActiveSubTab === "all" && !activeHistoryId,
            onClick: () => {
              setHomeActiveSubTab("all");
              setActiveTab("home");
            }
          },
          {
            id: "followed",
            label: "Theo Dõi",
            icon: Heart,
            isActive: activeTab === "home" && homeActiveSubTab === "followed" && !activeHistoryId,
            onClick: () => {
              setHomeActiveSubTab("followed");
              setActiveTab("home");
            }
          },
          {
            id: "profile",
            label: "Hồ Sơ",
            icon: User,
            isActive: activeTab === "control_panel" && controlPanelSubTab === "profile" && !activeHistoryId,
            onClick: () => {
              setActiveTab("control_panel");
              setControlPanelSubTab("profile");
            }
          }
        ]).map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 relative cursor-pointer ${
                item.isActive ? "-translate-y-2.5" : "translate-y-0"
              }`}
              id={`bottom-nav-${item.id}-btn`}
            >
              {item.isActive ? (
                /* Active Floating State */
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-white text-[#ae1d1e] shadow-lg border-4 border-[#ae1d1e] flex items-center justify-center scale-105 transition-all duration-300">
                    <IconComp className="w-4.5 h-4.5 text-[#ae1d1e]" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-black tracking-wide mt-0.5 text-white font-extrabold transition-all duration-300 font-sans truncate max-w-[68px]">
                    {item.label}
                  </span>
                </div>
              ) : (
                /* Inactive Flat State */
                <div className="flex flex-col items-center py-0.5">
                  <IconComp className="w-4.5 h-4.5 text-white/75 mb-0.5 transition-all duration-300 hover:text-white" />
                  <span className="text-[9px] font-medium tracking-wide text-white/75 truncate max-w-[68px] font-sans">
                    {item.label}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Popover for Mobile Bottom Bar RANKING Sub-branches */}
      {isMobileRankingMenuOpen && activeHistoryId && (
        <>
          <div
            className="fixed inset-0 z-45 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileRankingMenuOpen(false)}
          />
          <div className="fixed bottom-16 right-3 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex flex-col gap-1.5 w-56 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
            <div className="text-[10px] font-black uppercase text-amber-400 px-2.5 py-1 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Chọn Xếp Hạng
              </span>
              <button
                onClick={() => setIsMobileRankingMenuOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => {
                setRankingEnvironment("individual");
                setRankingMode("individual");
                setActiveTab("leaderboard");
                setIsMobileRankingMenuOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === "leaderboard" && rankingEnvironment === "individual"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="text-base shrink-0">🎯</span>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold leading-tight">Thi Đấu Cá Nhân</span>
                <span className="text-[9px] opacity-80 font-normal">Bảng điểm cự ly cá nhân</span>
              </div>
            </button>
            <button
              onClick={() => {
                setRankingEnvironment("team");
                setRankingMode("team");
                setActiveTab("leaderboard");
                setIsMobileRankingMenuOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === "leaderboard" && rankingEnvironment === "team"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="text-base shrink-0">👥</span>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold leading-tight">Thi Đấu Đồng Đội</span>
                <span className="text-[9px] opacity-80 font-normal">Bảng điểm cự ly đồng đội</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Delete Tournament Confirmation Modal */}
      {deleteTournamentConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4 my-auto">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider">
                Xác Nhận Xóa Giải Đấu?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn giải đấu{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  "{deleteTournamentConfirm.name}"
                </strong>{" "}
                khỏi hệ thống? Tất cả sơ đồ bệ bắn, cự ly, danh sách VĐV và bảng điểm sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTournamentConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const tourId = deleteTournamentConfirm.id;
                  setDeleteTournamentConfirm(null);
                  try {
                    await tournamentRepository.delete(tourId);
                    alert("Đã xóa giải đấu thành công!");
                  } catch (err) {
                    console.error("Failed to delete tournament:", err);
                    alert("Không thể xóa giải đấu!");
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/20"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

    </div>
  );
}
