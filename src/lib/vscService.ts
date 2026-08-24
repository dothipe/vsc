import { 
  db, 
  auth,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "../firebase";
import { 
  UserV2, 
  AthleteV2, 
  ClubV2, 
  SeasonV2, 
  TournamentV2, 
  RefereeAssignmentV2, 
  TournamentEntryV2, 
  ShotLogV2, 
  TournamentResultV2, 
  RankingV2, 
  AuditLogV2, 
  SystemSettingsV2,
  UserRoleV2,
  HallOfFameV2,
  LaneV2
} from "../types";
import { 
  normalizeFirestoreData, 
  sanitizeFirestoreData,
  getCompleteTournamentData,
  updateOnlineTournament,
  subscribeToTournamentsList
} from "./firebaseService";

// Helper to sanitize undefined values for Firestore
function sanitizeData<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item)) as any;
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      cleaned[key] = sanitizeData(val);
    }
    return cleaned;
  }
  return obj;
}

// ==========================================
// 1. REPOSITORY PATTERN / CRUD SERVICES
// ==========================================

// USERS SERVICE
export const UserService = {
  async getUser(uid: string): Promise<UserV2 | null> {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? (docSnap.data() as UserV2) : null;
  },
  
  async saveUser(user: UserV2): Promise<void> {
    const sanitized = sanitizeData({
      ...user,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "users", user.uid), sanitized, { merge: true });
  },

  async updateUserRole(uid: string, role: UserRoleV2): Promise<void> {
    await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
  },

  async getAllUsers(): Promise<UserV2[]> {
    const querySnap = await getDocs(collection(db, "users"));
    return querySnap.docs.map(d => d.data() as UserV2);
  }
};

// ATHLETES SERVICE
export const AthleteService = {
  async getAthlete(athleteId: string): Promise<AthleteV2 | null> {
    const docSnap = await getDoc(doc(db, "athletes", athleteId));
    return docSnap.exists() ? (docSnap.data() as AthleteV2) : null;
  },

  async saveAthlete(athlete: AthleteV2): Promise<void> {
    const sanitized = sanitizeData({
      ...athlete,
      createdAt: athlete.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "athletes", athlete.athleteId), sanitized);
  },

  async deleteAthlete(athleteId: string): Promise<void> {
    await deleteDoc(doc(db, "athletes", athleteId));
  },

  async getAllAthletes(): Promise<AthleteV2[]> {
    const querySnap = await getDocs(collection(db, "athletes"));
    return querySnap.docs.map(d => d.data() as AthleteV2);
  },

  subscribeToAthletes(callback: (athletes: AthleteV2[]) => void) {
    return onSnapshot(collection(db, "athletes"), (snap) => {
      callback(snap.docs.map(d => d.data() as AthleteV2));
    });
  }
};

// CLUBS SERVICE
export const ClubService = {
  async getClub(clubId: string): Promise<ClubV2 | null> {
    const docSnap = await getDoc(doc(db, "clubs", clubId));
    return docSnap.exists() ? (docSnap.data() as ClubV2) : null;
  },

  async saveClub(club: ClubV2): Promise<void> {
    const sanitized = sanitizeData({
      ...club,
      createdAt: club.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "clubs", club.clubId), sanitized);
  },

  async deleteClub(clubId: string): Promise<void> {
    await deleteDoc(doc(db, "clubs", clubId));
  },

  async getAllClubs(): Promise<ClubV2[]> {
    const querySnap = await getDocs(collection(db, "clubs"));
    return querySnap.docs.map(d => d.data() as ClubV2);
  },

  subscribeToClubs(callback: (clubs: ClubV2[]) => void) {
    return onSnapshot(collection(db, "clubs"), (snap) => {
      callback(snap.docs.map(d => d.data() as ClubV2));
    });
  }
};

// SEASONS SERVICE
export const SeasonService = {
  async getSeason(seasonId: string): Promise<SeasonV2 | null> {
    const docSnap = await getDoc(doc(db, "seasons", seasonId));
    return docSnap.exists() ? (docSnap.data() as SeasonV2) : null;
  },

  async saveSeason(season: SeasonV2): Promise<void> {
    const sanitized = sanitizeData(season);
    await setDoc(doc(db, "seasons", season.seasonId), sanitized);
  },

  async getActiveSeason(): Promise<SeasonV2 | null> {
    const q = query(collection(db, "seasons"), where("isActive", "==", true));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as SeasonV2;
    }
    return null;
  },

  async setActiveSeason(seasonId: string): Promise<void> {
    // Deactivate others
    const querySnap = await getDocs(collection(db, "seasons"));
    for (const docSnap of querySnap.docs) {
      const s = docSnap.data() as SeasonV2;
      if (s.seasonId === seasonId) {
        await updateDoc(doc(db, "seasons", s.seasonId), { isActive: true });
      } else if (s.isActive) {
        await updateDoc(doc(db, "seasons", s.seasonId), { isActive: false });
      }
    }
  },

  async getAllSeasons(): Promise<SeasonV2[]> {
    const querySnap = await getDocs(collection(db, "seasons"));
    return querySnap.docs.map(d => d.data() as SeasonV2);
  }
};

// TOURNAMENTS SERVICE
export const TournamentService = {
  async getTournament(tournamentId: string): Promise<any | null> {
    return await getCompleteTournamentData(tournamentId);
  },

  async saveTournament(tournament: any): Promise<void> {
    const id = tournament.tournamentId || tournament.id;
    await updateOnlineTournament(id, tournament);

    if (tournament.status === "completed") {
      // Trigger automatic results, rankings, athlete/club synchronization, and Hall of Fame!
      await generateTournamentResults(id, tournament.seasonId || tournament.season);
    }
  },

  async deleteTournament(tournamentId: string): Promise<void> {
    await deleteDoc(doc(db, "v3_tournaments", tournamentId));
  },

  async getAllTournaments(): Promise<any[]> {
    return new Promise((resolve) => {
      const unsub = subscribeToTournamentsList((list) => {
        unsub();
        resolve(list);
      });
    });
  },

  subscribeToTournaments(callback: (tournaments: any[]) => void) {
    return subscribeToTournamentsList(callback);
  }
};

// REFEREE ASSIGNMENTS SERVICE
export const RefereeAssignmentService = {
  async getAssignment(assignmentId: string): Promise<RefereeAssignmentV2 | null> {
    const docSnap = await getDoc(doc(db, "referee_assignments", assignmentId));
    return docSnap.exists() ? (docSnap.data() as RefereeAssignmentV2) : null;
  },

  async saveAssignment(assignment: RefereeAssignmentV2): Promise<void> {
    const docRef = doc(db, "referee_assignments", assignment.assignmentId);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() : null;

    const sanitized = sanitizeData({
      ...assignment,
      createdAt: assignment.createdAt || serverTimestamp()
    });
    await setDoc(docRef, sanitized);

    // Audit Log for referee change (Step 9)
    await AuditEngine.logAction(
      assignment.refereeId || "admin_user_id",
      "referee",
      "CHANGE_REFEREE",
      "referee_assignments",
      assignment.assignmentId,
      oldData,
      sanitized
    );
  },

  async getAssignmentsByTournament(tournamentId: string): Promise<RefereeAssignmentV2[]> {
    const q = query(collection(db, "referee_assignments"), where("tournamentId", "==", tournamentId));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as RefereeAssignmentV2);
  }
};

// TOURNAMENT ENTRIES SERVICE
export const TournamentEntryService = {
  async getEntry(entryId: string): Promise<TournamentEntryV2 | null> {
    const docSnap = await getDoc(doc(db, "tournament_entries", entryId));
    return docSnap.exists() ? (docSnap.data() as TournamentEntryV2) : null;
  },

  async saveEntry(entry: TournamentEntryV2): Promise<void> {
    const sanitized = sanitizeData({
      ...entry,
      registeredAt: entry.registeredAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "tournament_entries", entry.entryId), sanitized);
  },

  async getEntriesByTournament(tournamentId: string): Promise<TournamentEntryV2[]> {
    const q = query(collection(db, "tournament_entries"), where("tournamentId", "==", tournamentId));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as TournamentEntryV2);
  },

  subscribeToEntries(tournamentId: string, callback: (entries: TournamentEntryV2[]) => void) {
    const q = query(collection(db, "tournament_entries"), where("tournamentId", "==", tournamentId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as TournamentEntryV2));
    });
  }
};

// SHOT LOGS SERVICE
export const ShotLogsService = {
  async saveShotLog(shot: ShotLogV2): Promise<void> {
    const sanitized = sanitizeData({
      ...shot,
      timestamp: shot.timestamp || serverTimestamp()
    });
    await setDoc(doc(db, "shot_logs", shot.shotId), sanitized);
  },

  async getShotLogsByTournamentAndAthlete(tournamentId: string, athleteId: string): Promise<ShotLogV2[]> {
    const q = query(
      collection(db, "shot_logs"), 
      where("tournamentId", "==", tournamentId),
      where("athleteId", "==", athleteId),
      orderBy("shotIndex", "asc")
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as ShotLogV2);
  },

  async getAllShotLogsForAthlete(athleteId: string): Promise<ShotLogV2[]> {
    const q = query(collection(db, "shot_logs"), where("athleteId", "==", athleteId), orderBy("timestamp", "asc"));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as ShotLogV2);
  },

  subscribeToShotLogs(tournamentId: string, callback: (shots: ShotLogV2[]) => void) {
    const q = query(
      collection(db, "shot_logs"), 
      where("tournamentId", "==", tournamentId),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as ShotLogV2));
    });
  },

  async deleteShotLog(shotId: string, refereeId: string): Promise<void> {
    const docRef = doc(db, "shot_logs", shotId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const oldData = snap.data() as ShotLogV2;
    await deleteDoc(docRef);

    // Audit Log (Step 9)
    await AuditEngine.logAction(
      refereeId,
      "referee",
      "DELETE_SCORE",
      "shot_logs",
      shotId,
      oldData,
      null
    );

    // Recalculate athlete stats
    await calculateAthleteStats(oldData.athleteId);
  },

  async editShotLog(shotId: string, updates: Partial<ShotLogV2>, refereeId: string): Promise<void> {
    const docRef = doc(db, "shot_logs", shotId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const oldData = snap.data() as ShotLogV2;
    const newData = { ...oldData, ...updates, timestamp: serverTimestamp() };
    await setDoc(docRef, sanitizeData(newData));

    // Audit Log (Step 9)
    await AuditEngine.logAction(
      refereeId,
      "referee",
      "EDIT_SCORE",
      "shot_logs",
      shotId,
      oldData,
      newData
    );

    // Recalculate athlete stats
    await calculateAthleteStats(oldData.athleteId);
  }
};

// TOURNAMENT RESULTS SERVICE
export const TournamentResultService = {
  async getResult(resultId: string): Promise<TournamentResultV2 | null> {
    const docSnap = await getDoc(doc(db, "tournament_results", resultId));
    return docSnap.exists() ? (docSnap.data() as TournamentResultV2) : null;
  },

  async saveResult(result: TournamentResultV2): Promise<void> {
    const sanitized = sanitizeData({
      ...result,
      createdAt: result.createdAt || serverTimestamp()
    });
    await setDoc(doc(db, "tournament_results", result.resultId), sanitized);
  },

  async getResultsByTournament(tournamentId: string): Promise<TournamentResultV2[]> {
    const q = query(collection(db, "tournament_results"), where("tournamentId", "==", tournamentId), orderBy("rank", "asc"));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as TournamentResultV2);
  },

  async getResultsByAthlete(athleteId: string): Promise<TournamentResultV2[]> {
    const q = query(collection(db, "tournament_results"), where("athleteId", "==", athleteId));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as TournamentResultV2);
  }
};

// RANKINGS SERVICE
export const RankingsService = {
  async getRanking(rankingId: string): Promise<RankingV2 | null> {
    const docSnap = await getDoc(doc(db, "rankings", rankingId));
    return docSnap.exists() ? (docSnap.data() as RankingV2) : null;
  },

  async saveRanking(ranking: RankingV2): Promise<void> {
    const sanitized = sanitizeData({
      ...ranking,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "rankings", ranking.rankingId), sanitized);
  },

  async getRankingsBySeason(seasonId: string): Promise<RankingV2[]> {
    const q = query(collection(db, "rankings"), where("seasonId", "==", seasonId), orderBy("rank", "asc"));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as RankingV2);
  }
};

// AUDIT LOGS SERVICE
export const AuditLogsService = {
  async saveAuditLog(log: AuditLogV2): Promise<void> {
    const sanitized = sanitizeData({
      ...log,
      timestamp: log.timestamp || serverTimestamp()
    });
    await setDoc(doc(db, "audit_logs", log.logId), sanitized);
  },

  async getAuditLogs(): Promise<AuditLogV2[]> {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as AuditLogV2);
  }
};

// SYSTEM SETTINGS SERVICE
export const SystemSettingsService = {
  async getSettings(): Promise<SystemSettingsV2 | null> {
    const docSnap = await getDoc(doc(db, "system_settings", "vsc_config"));
    return docSnap.exists() ? (docSnap.data() as SystemSettingsV2) : null;
  },

  async saveSettings(settings: SystemSettingsV2): Promise<void> {
    await setDoc(doc(db, "system_settings", "vsc_config"), sanitizeData(settings));
  }
};

// HALL OF FAME SERVICE
export const HallOfFameService = {
  async getAward(hallOfFameId: string): Promise<HallOfFameV2 | null> {
    const docSnap = await getDoc(doc(db, "hall_of_fame", hallOfFameId));
    return docSnap.exists() ? (docSnap.data() as HallOfFameV2) : null;
  },

  async saveAward(award: HallOfFameV2): Promise<void> {
    const sanitized = sanitizeData({
      ...award,
      createdAt: award.createdAt || serverTimestamp()
    });
    await setDoc(doc(db, "hall_of_fame", award.hallOfFameId), sanitized);
  },

  async deleteAward(hallOfFameId: string): Promise<void> {
    await deleteDoc(doc(db, "hall_of_fame", hallOfFameId));
  },

  async getAllAwards(): Promise<HallOfFameV2[]> {
    const querySnap = await getDocs(collection(db, "hall_of_fame"));
    return querySnap.docs.map(d => d.data() as HallOfFameV2);
  },

  async getAwardsBySeason(seasonId: string): Promise<HallOfFameV2[]> {
    const q = query(collection(db, "hall_of_fame"), where("seasonId", "==", seasonId));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as HallOfFameV2);
  }
};

// LANES SERVICE
export const LanesService = {
  async getLane(laneId: string): Promise<LaneV2 | null> {
    const docSnap = await getDoc(doc(db, "lanes", laneId));
    return docSnap.exists() ? (docSnap.data() as LaneV2) : null;
  },

  async saveLane(lane: LaneV2): Promise<void> {
    const sanitized = sanitizeData({
      ...lane,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "lanes", lane.laneId), sanitized);
    
    // Sync to liveboard real-time cache
    await LiveboardCache.updateLaneLive(lane.tournamentId, lane.laneId);
  },

  async deleteLane(laneId: string): Promise<void> {
    await deleteDoc(doc(db, "lanes", laneId));
  },

  async getAllLanes(): Promise<LaneV2[]> {
    const querySnap = await getDocs(collection(db, "lanes"));
    return querySnap.docs.map(d => d.data() as LaneV2);
  },

  async getLanesByTournament(tournamentId: string): Promise<LaneV2[]> {
    const q = query(collection(db, "lanes"), where("tournamentId", "==", tournamentId));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => d.data() as LaneV2);
  },

  subscribeToLanes(tournamentId: string, callback: (lanes: LaneV2[]) => void) {
    const q = query(collection(db, "lanes"), where("tournamentId", "==", tournamentId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as LaneV2));
    });
  }
};


// ==========================================
// 2. SPRINT 2 - CORE ENGINES
// ==========================================

/**
 * ATHLETE STATISTICS ENGINE
 * Automatically computes: accuracy, best score, best distance, best tournament, longest streak, total hits, total shots
 */
export async function calculateAthleteStats(athleteId: string): Promise<void> {
  // 1. Fetch all shot logs
  const shotLogs = await ShotLogsService.getAllShotLogsForAthlete(athleteId);
  // 2. Fetch all tournament results
  const results = await TournamentResultService.getResultsByAthlete(athleteId);

  const totalShots = shotLogs.length;
  const totalHits = shotLogs.filter(s => s.result === "hit").length;
  const averageAccuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;

  // Streak calculations
  let currentStreak = 0;
  let longestHitStreak = 0;
  for (const shot of shotLogs) {
    if (shot.result === "hit") {
      currentStreak++;
      if (currentStreak > longestHitStreak) {
        longestHitStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // Tournament calculations
  const totalTournaments = results.length;
  const totalMatchesPlayed = totalTournaments; // mapping distinct played matches
  
  let highestAccuracy = 0;
  let highestScore = 0;
  let bestTournamentId = "";

  for (const res of results) {
    if (res.accuracy > highestAccuracy) highestAccuracy = res.accuracy;
    if (res.score > highestScore) {
      highestScore = res.score;
      bestTournamentId = res.tournamentId;
    }
  }

  // Best scores per distance
  let best10m = 0;
  let best12m = 0;
  let best15m = 0;

  for (const shot of shotLogs) {
    if (shot.result === "hit") {
      if (shot.distance === 10 && shot.score > best10m) best10m = shot.score;
      if (shot.distance === 12 && shot.score > best12m) best12m = shot.score;
      if (shot.distance === 15 && shot.score > best15m) best15m = shot.score;
    }
  }

  const updatedStats = {
    totalTournaments,
    totalShots,
    totalHits,
    averageAccuracy,
    highestAccuracy,
    highestScore,
    longestHitStreak,
    totalMatchesPlayed,
    best10m,
    best12m,
    best15m,
    bestTournamentId
  };

  const athlete = await AthleteService.getAthlete(athleteId);
  if (athlete) {
    await AthleteService.saveAthlete({
      ...athlete,
      stats: updatedStats,
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * CLUB STATISTICS ENGINE
 * Automatically computes: member count, total points, club ranking, tournament count, podium count
 */
export async function calculateClubStats(clubId: string): Promise<void> {
  // Fetch club
  const club = await ClubService.getClub(clubId);
  if (!club) return;

  // Get all athletes belonging to club
  const allAthletes = await AthleteService.getAllAthletes();
  const clubAthletes = allAthletes.filter(a => a.clubId === clubId);
  const memberCount = clubAthletes.length;

  let totalPoints = 0;
  let tournamentCount = 0;
  let podiumCount = 0;

  // Get active season rankings to sum club points
  const activeSeason = await SeasonService.getActiveSeason();
  if (activeSeason) {
    const rankings = await RankingsService.getRankingsBySeason(activeSeason.seasonId);
    const clubRankings = rankings.filter(r => r.clubId === clubId);
    totalPoints = clubRankings.reduce((sum, r) => sum + r.totalPoints, 0);
  }

  // Get podium counts and tournaments played from results
  for (const athlete of clubAthletes) {
    const results = await TournamentResultService.getResultsByAthlete(athlete.athleteId);
    tournamentCount += results.length;
    podiumCount += results.filter(r => r.rank >= 1 && r.rank <= 3).length;
  }

  const updatedStats = {
    totalPoints,
    clubRanking: club.stats?.clubRanking || 0, // Assigned via global rankings calculator
    tournamentCount,
    podiumCount
  };

  await ClubService.saveClub({
    ...club,
    memberCount,
    stats: updatedStats,
    updatedAt: serverTimestamp()
  });
}

/**
 * SEASON ENGINE
 * Automates active season switches, configurations, and point distribution
 */
export const SeasonEngine = {
  async transitionToNewSeason(newSeasonId: string): Promise<void> {
    await SeasonService.setActiveSeason(newSeasonId);
  },

  async awardPointsForSeason(seasonId: string, result: TournamentResultV2): Promise<void> {
    await TournamentResultService.saveResult({
      ...result,
      seasonId,
      createdAt: serverTimestamp()
    });
  }
};

/**
 * TOURNAMENT COMPLETION AUTOMATION
 * Generates tournament_results, awards season points, triggers Rankings Engine, and Updates Hall of Fame
 */
export async function generateTournamentResults(tournamentId: string, seasonId: string): Promise<void> {
  const tournament = await TournamentService.getTournament(tournamentId);
  if (!tournament) return;

  // 1. Fetch all entries
  const entries = await TournamentEntryService.getEntriesByTournament(tournamentId);
  // Filter eligible entries
  const eligibleEntries = entries.filter(e => e.status === "registered" || e.status === "checked_in");

  // 2. Sort entries by currentScore (desc) then accuracy (desc)
  eligibleEntries.sort((a, b) => {
    const scoreDiff = b.realtimeStats.currentScore - a.realtimeStats.currentScore;
    if (scoreDiff !== 0) return scoreDiff;
    return b.realtimeStats.accuracy - a.realtimeStats.accuracy;
  });

  // 3. Fetch active season to read point rules
  const seasonSnap = await getDoc(doc(db, "seasons", seasonId));
  const season = seasonSnap.exists() ? (seasonSnap.data() as SeasonV2) : null;
  const pointRules = season?.pointRules || {
    rank_1: 100,
    rank_2: 80,
    rank_3: 60,
    rank_4: 50,
    rank_5: 45,
    rank_6: 40,
    rank_7: 36,
    rank_8: 32,
    rank_9: 29,
    rank_10: 26,
  };

  // 4. Create and save TournamentResultV2 documents
  let rank = 1;
  const createdResults: TournamentResultV2[] = [];
  for (const entry of eligibleEntries) {
    const ruleKey = `rank_${rank}`;
    const seasonPointsEarned = pointRules[ruleKey] || (rank <= 10 ? 20 : 5); // default fallback

    const resultDoc: TournamentResultV2 = {
      resultId: `res-${tournamentId}-${entry.athleteId}`,
      tournamentId,
      seasonId,
      athleteId: entry.athleteId,
      rank,
      score: entry.realtimeStats.currentScore,
      accuracy: entry.realtimeStats.accuracy,
      seasonPointsEarned,
      createdAt: serverTimestamp()
    };

    await TournamentResultService.saveResult(resultDoc);
    createdResults.push(resultDoc);
    rank++;
  }

  // 5. Audit Log the completion (Step 9)
  await AuditEngine.logAction(
    tournament.organizerId || "admin_user_id",
    "super_admin",
    "UPDATE_RESULT",
    "tournaments",
    tournamentId,
    { status: "active" },
    { status: "completed", resultsCount: createdResults.length }
  );

  // 6. Recalculate National Rankings (triggers Athlete Sync & Club Sync under the hood!)
  await calculateNationalRankings(seasonId);

  // Note: Hall of Fame is managed via V3 calculateAndSaveSnapshotsFromLedger to support full top 3 and correct survival-round logic.
}

/**
 * RANKING ENGINE
 * Calculates and saves national standings (Overall, Paper Target, Falling Target, Spinning Target)
 */
export async function calculateNationalRankings(seasonId: string): Promise<void> {
  // 1. Fetch all tournament results for this season
  const querySnap = await getDocs(collection(db, "tournament_results"));
  const allResults = querySnap.docs.map(d => d.data() as TournamentResultV2);
  const seasonResults = allResults.filter(r => r.seasonId === seasonId);

  // 2. Fetch all athletes to resolve their details (Club)
  const allAthletes = await AthleteService.getAllAthletes();
  const athleteMap = new Map<string, AthleteV2>();
  allAthletes.forEach(a => athleteMap.set(a.athleteId, a));

  // 3. Group and aggregate points by athleteId
  const standingsMap = new Map<string, {
    athleteId: string;
    clubId?: string;
    totalPoints: number;
    tournamentsPlayed: number;
    accuracies: number[];
  }>();

  for (const res of seasonResults) {
    const athlete = athleteMap.get(res.athleteId);
    const clubId = athlete?.clubId;

    if (!standingsMap.has(res.athleteId)) {
      standingsMap.set(res.athleteId, {
        athleteId: res.athleteId,
        clubId,
        totalPoints: 0,
        tournamentsPlayed: 0,
        accuracies: []
      });
    }

    const entry = standingsMap.get(res.athleteId)!;
    entry.totalPoints += res.seasonPointsEarned;
    entry.tournamentsPlayed += 1;
    entry.accuracies.push(res.accuracy);
  }

  // 4. Fetch previous rankings for rankMovement calculations
  const oldRankings = await RankingsService.getRankingsBySeason(seasonId);
  const oldRankMap = new Map<string, number>();
  oldRankings.forEach(r => oldRankMap.set(r.athleteId, r.rank));

  // 5. Build, sort, and save standings
  const standingsList = Array.from(standingsMap.values()).map(item => {
    const avgAccuracy = item.accuracies.length > 0 
      ? item.accuracies.reduce((sum, val) => sum + val, 0) / item.accuracies.length
      : 0;
    return {
      ...item,
      averageAccuracy: avgAccuracy
    };
  });

  // Sort by totalPoints desc, then by averageAccuracy desc
  standingsList.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.averageAccuracy - a.averageAccuracy;
  });

  // 6. Write new rankings back to Firestore and Sync to Athlete Profiles (Step 6)
  let rank = 1;
  for (const standing of standingsList) {
    const prevRank = oldRankMap.get(standing.athleteId) || 0;
    const rankMovement = prevRank > 0 ? prevRank - rank : 0;

    // Calculate medals earned in this season
    const athleteResults = seasonResults.filter(r => r.athleteId === standing.athleteId);
    const medalsCalculated = {
      gold: athleteResults.filter(r => r.rank === 1).length,
      silver: athleteResults.filter(r => r.rank === 2).length,
      bronze: athleteResults.filter(r => r.rank === 3).length
    };

    const rankingDoc: RankingV2 = {
      rankingId: `rank-${seasonId}-${standing.athleteId}`,
      seasonId,
      athleteId: standing.athleteId,
      clubId: standing.clubId,
      totalPoints: standing.totalPoints,
      rank,
      previousRank: prevRank,
      rankMovement,
      tournamentsPlayed: standing.tournamentsPlayed,
      averageAccuracy: standing.averageAccuracy,
      medalsCalculated,
      updatedAt: serverTimestamp()
    };

    await RankingsService.saveRanking(rankingDoc);

    // Sync back to athlete profile (Step 6 Athlete Sync)
    const athlete = athleteMap.get(standing.athleteId);
    if (athlete) {
      await AthleteService.saveAthlete({
        ...athlete,
        rankingPoints: standing.totalPoints,
        nationalRank: rank,
        medals: medalsCalculated,
        updatedAt: serverTimestamp()
      });
    }

    rank++;
  }

  // 7. Re-calculate club points based on new national standings
  const clubs = await ClubService.getAllClubs();
  for (const club of clubs) {
    await calculateClubStats(club.clubId);
  }

  // 8. Re-assign club ranking ranks
  const updatedClubs = await ClubService.getAllClubs();
  updatedClubs.sort((a, b) => (b.stats?.totalPoints || 0) - (a.stats?.totalPoints || 0));
  
  let clubRank = 1;
  for (const club of updatedClubs) {
    await ClubService.saveClub({
      ...club,
      stats: {
        ...club.stats,
        clubRanking: clubRank
      },
      updatedAt: serverTimestamp()
    });
    clubRank++;
  }
}

/**
 * AUDIT ENGINE
 * Automatically generates a secure audit entry
 */
export const AuditEngine = {
  async logAction(
    userId: string,
    userRole: UserRoleV2,
    action: "EDIT_SCORE" | "DELETE_SCORE" | "UPDATE_RESULT" | "CHANGE_REFEREE" | "UPDATE_CONFIG",
    targetCollection: string,
    targetDocumentId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const logDoc: AuditLogV2 = {
      logId,
      userId,
      userRole,
      action,
      targetCollection,
      targetDocumentId,
      oldData: oldData || null,
      newData: newData || null,
      timestamp: serverTimestamp()
    };
    await AuditLogsService.saveAuditLog(logDoc);
  }
};

/**
 * LIVEBOARD REALTIME CACHE ENGINE
 * Designs cache collection for ultra-fast, zero-overhead real-time queries for TV screen, livestream overlays, and public liveboard.
 */
export const LiveboardCache = {
  async updateCurrentTournament(tournamentId: string): Promise<void> {
    const tSnap = await getDoc(doc(db, "tournaments", tournamentId));
    if (!tSnap.exists()) return;
    const tData = tSnap.data() as TournamentV2;

    const entries = await getDocs(query(collection(db, "tournament_entries"), where("tournamentId", "==", tournamentId)));
    const activeAthletesCount = entries.size;

    await setDoc(doc(db, "liveboard", "current_tournament"), sanitizeData({
      liveboardId: "current_tournament",
      tournamentId,
      title: tData.title,
      status: tData.status,
      level: tData.level,
      activeAthletesCount,
      updatedAt: serverTimestamp()
    }));
  },

  async updateAthleteLive(tournamentId: string, athleteId: string): Promise<void> {
    const entrySnap = await getDoc(doc(db, "tournament_entries", `${tournamentId}-${athleteId}`));
    if (!entrySnap.exists()) return;
    const entry = entrySnap.data() as TournamentEntryV2;

    const athSnap = await getDoc(doc(db, "athletes", athleteId));
    const athName = athSnap.exists() ? (athSnap.data() as AthleteV2).fullName : "Unknown";
    const clubId = athSnap.exists() ? (athSnap.data() as AthleteV2).clubId : "";
    let clubName = "Unknown";
    if (clubId) {
      const clubSnap = await getDoc(doc(db, "clubs", clubId));
      if (clubSnap.exists()) clubName = (clubSnap.data() as ClubV2).clubName;
    }

    await setDoc(doc(db, "liveboard", `athlete_live_${athleteId}`), sanitizeData({
      liveboardId: `athlete_live_${athleteId}`,
      tournamentId,
      athleteId,
      athleteName: athName,
      clubName,
      currentScore: entry.realtimeStats.currentScore,
      accuracy: entry.realtimeStats.accuracy,
      currentStreak: entry.realtimeStats.currentStreak,
      highestStreak: entry.realtimeStats.highestStreak,
      shotsFired: entry.realtimeStats.shotsFired,
      shotsRemaining: entry.realtimeStats.shotsRemaining,
      updatedAt: serverTimestamp()
    }));
  },

  async updateLaneLive(tournamentId: string, laneId: string): Promise<void> {
    const laneSnap = await getDoc(doc(db, "lanes", laneId));
    if (!laneSnap.exists()) return;
    const lane = laneSnap.data() as LaneV2;

    let athleteName = "";
    if (lane.athleteId) {
      const athSnap = await getDoc(doc(db, "athletes", lane.athleteId));
      if (athSnap.exists()) athleteName = (athSnap.data() as AthleteV2).fullName;
    }

    await setDoc(doc(db, "liveboard", `lane_live_${lane.laneNumber}`), sanitizeData({
      liveboardId: `lane_live_${lane.laneNumber}`,
      tournamentId,
      laneId,
      laneNumber: lane.laneNumber,
      athleteId: lane.athleteId || null,
      athleteName: athleteName || null,
      status: lane.status,
      currentRound: lane.currentRound || null,
      currentDistance: lane.currentDistance || null,
      updatedAt: serverTimestamp()
    }));
  }
};

/**
 * LIVEBOARD DATA ENGINE
 * Connects entries and shot logs to feed the live scoreboards
 */
export const LiveboardDataEngine = {
  subscribeToLiveboard(
    tournamentId: string,
    callback: (data: {
      entries: TournamentEntryV2[];
      latestShots: ShotLogV2[];
    }) => void
  ) {
    let currentEntries: TournamentEntryV2[] = [];
    let currentShots: ShotLogV2[] = [];

    const unsubEntries = TournamentEntryService.subscribeToEntries(tournamentId, (entries) => {
      currentEntries = entries;
      callback({ entries: currentEntries, latestShots: currentShots });
    });

    const unsubShots = ShotLogsService.subscribeToShotLogs(tournamentId, (shots) => {
      currentShots = shots;
      callback({ entries: currentEntries, latestShots: currentShots });
    });

    return () => {
      unsubEntries();
      unsubShots();
    };
  },

  async recordShot(
    tournamentId: string,
    athleteId: string,
    roundId: string,
    distance: number,
    laneNumber: number,
    shotIndex: number,
    score: number,
    result: "hit" | "miss",
    refereeId: string
  ): Promise<void> {
    // 1. Retrieve prior shots to calculate current streak
    const shots = await ShotLogsService.getShotLogsByTournamentAndAthlete(tournamentId, athleteId);
    
    let currentStreak = 0;
    for (let i = shots.length - 1; i >= 0; i--) {
      if (shots[i].result === "hit") {
        currentStreak++;
      } else {
        break;
      }
    }
    const streakAtMoment = result === "hit" ? currentStreak + 1 : 0;

    // 2. Log shot
    const shotId = `shot-${tournamentId}-${athleteId}-${roundId}-${distance}-${shotIndex}`;
    const shotDoc: ShotLogV2 = {
      shotId,
      tournamentId,
      athleteId,
      roundId,
      distance,
      laneNumber,
      shotIndex,
      score,
      result,
      streakAtMoment,
      refereeId,
      timestamp: serverTimestamp()
    };
    await ShotLogsService.saveShotLog(shotDoc);

    // Audit Log for point entry (Step 9)
    await AuditEngine.logAction(
      refereeId,
      "referee",
      "EDIT_SCORE",
      "shot_logs",
      shotId,
      null,
      shotDoc
    );

    // 3. Update entry realtime statistics
    const entryId = `${tournamentId}-${athleteId}`;
    const entry = await TournamentEntryService.getEntry(entryId);
    if (entry) {
      const allAthleteShots = [...shots, shotDoc];
      const shotsFired = allAthleteShots.length;
      const totalHits = allAthleteShots.filter(s => s.result === "hit").length;
      const accuracy = shotsFired > 0 ? (totalHits / shotsFired) * 100 : 0;
      
      // Compute total score directly from shot logs to prevent drift
      const totalScore = allAthleteShots.reduce((sum, s) => sum + s.score, 0);

      // Compute highest streak
      let highestStreak = 0;
      let tempStreak = 0;
      for (const s of allAthleteShots) {
        if (s.result === "hit") {
          tempStreak++;
          if (tempStreak > highestStreak) highestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      const updatedEntry: TournamentEntryV2 = {
        ...entry,
        currentProgress: {
          currentRoundId: roundId,
          currentDistance: distance,
          currentShotIndex: shotIndex
        },
        realtimeStats: {
          currentScore: totalScore,
          accuracy,
          currentStreak: streakAtMoment,
          highestStreak,
          shotsFired,
          shotsRemaining: Math.max(0, entry.realtimeStats.shotsRemaining - 1)
        },
        updatedAt: serverTimestamp()
      };

      await TournamentEntryService.saveEntry(updatedEntry);

      // Sync to liveboard real-time cache
      await LiveboardCache.updateAthleteLive(tournamentId, athleteId);
      await LiveboardCache.updateCurrentTournament(tournamentId);
    }

    // 4. Fire async triggers to recalculate athlete statistics
    await calculateAthleteStats(athleteId);
  }
};

// ==========================================
// 3. DATABASE V3 SEEDER
// ==========================================
export const DatabaseSeeder = {
  async seedDatabase(): Promise<{ success: boolean; report: string }> {
    try {
      // Safety check: if already seeded, skip completely to prevent overwriting user-edited data
      try {
        const configSnap = await getDoc(doc(db, "system_settings", "vsc_config"));
        if (configSnap.exists()) {
          console.log("Database V3.0 is already initialized/seeded in Firestore. Skipping seeder.");
          return { success: true, report: "Skipped: Already seeded in Firestore" };
        }
      } catch (e) {
        console.warn("Could not check if vsc_config exists, proceeding with seed:", e);
      }

      console.log("Starting Database V3.0 Seeding via Client-Side...");
      let logs = "";
      const log = (msg: string) => {
        console.log(msg);
        logs += msg + "\n";
      };

      // 1. system_settings
      log("Seeding system_settings...");
      const systemSettingsDoc = {
        settingId: "vsc_config",
        databaseVersion: "3.0",
        maintenanceMode: false,
        rankingsEnabled: true,
        liveboardEnabled: true,
        modules: {
          clubs: true,
          rankings: true,
          hallOfFame: true,
          liveboard: true,
          shotLogs: true,
          auditLogs: true
        }
      };
      await setDoc(doc(db, "system_settings", "vsc_config"), sanitizeData(systemSettingsDoc));
      log("Seeded system_settings: 1 document with version 3.0");

      // 2. seasons
      log("Seeding seasons...");
      const seasonDoc = {
        seasonId: "season_2026",
        name: "VSC Season 2026",
        year: 2026,
        status: "active",
        description: "Official Competitive Season 2026",
        startDate: "2026-01-01T00:00:00Z",
        endDate: "2026-12-31T23:59:59Z"
      };
      await setDoc(doc(db, "seasons", "season_2026"), sanitizeData(seasonDoc));
      log("Seeded seasons: 1 document for Season 2026");

      // 3. clubs
      log("Seeding clubs...");
      const clubs = [
        {
          clubId: "36SC",
          clubName: "Thanh Hoa Slingshot Club (36SC)",
          shortName: "36SC",
          logo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
          banner: "https://images.unsplash.com/photo-1557683316-973673baf926",
          province: "Thanh Hóa",
          address: "Thành phố Thanh Hóa, Thanh Hóa",
          description: "Câu luật bộ ná cao su chính thống của tỉnh Thanh Hóa",
          managerUserId: "user_dir_1",
          foundedDate: "2020-05-15",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          clubId: "HanoiSC",
          clubName: "Hanoi Slingshot Club",
          shortName: "Hanoi SC",
          logo: "https://images.unsplash.com/photo-1579546929662-711aa81148cf",
          banner: "https://images.unsplash.com/photo-1557683311-eac922347aa1",
          province: "Hà Nội",
          address: "Quận Hoàn Kiếm, Hà Nội",
          description: "Đại diện ná cao su thủ đô Hà Nội",
          managerUserId: "user_ref_1",
          foundedDate: "2021-08-20",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          clubId: "SaigonSC",
          clubName: "Saigon Slingshot Club",
          shortName: "Saigon SC",
          logo: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc",
          banner: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
          province: "Hồ Chí Minh",
          address: "Quận 1, TP Hồ Chí Minh",
          description: "Câu lạc bộ ná cao su miền Nam năng động",
          managerUserId: "user_ref_2",
          foundedDate: "2022-11-10",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      for (const c of clubs) {
        await setDoc(doc(db, "clubs", c.clubId), sanitizeData(c));
      }
      log(`Seeded clubs: ${clubs.length} documents`);

      // 4. users (including super admin, director, 10 referees, 19 athlete accounts)
      log("Seeding users...");
      const usersList = [
        {
          uid: "admin_user_id",
          email: "nahnatofficial@gmail.com",
          displayName: "VSC Super Admin",
          googleAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          customAvatar: "",
          phone: "0901234567",
          role: "super_admin",
          permissions: ["all"],
          linkedAthleteId: "athlete_1",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        {
          uid: "user_dir_1",
          email: "director@vscs.asia",
          displayName: "VSC Director",
          googleAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
          customAvatar: "",
          phone: "0907654321",
          role: "director",
          permissions: ["manage_tournaments", "manage_clubs"],
          linkedAthleteId: "",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      ];

      // Seed 10 referees (Trọng tài 1 đến 10)
      for (let i = 1; i <= 10; i++) {
        usersList.push({
          uid: `user_ref_${i}`,
          email: `referee_${i}@vscs.asia`,
          displayName: `Trọng Tài ${i}`,
          googleAvatar: `https://images.unsplash.com/photo-${1535713875002 + i * 110}-d1d0cf377fde`,
          customAvatar: "",
          phone: `09110000${i < 10 ? '0' : ''}${i}`,
          role: "referee",
          permissions: ["score_lane"],
          linkedAthleteId: "",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      }

      // Seed athlete users for athlete_2 to athlete_20 (athlete_1 is linked to Super Admin)
      for (let i = 2; i <= 20; i++) {
        usersList.push({
          uid: `user_ath_${i}`,
          email: `athlete_${i}@vscs.asia`,
          displayName: `Xạ Thủ Hệ Thống ${i}`,
          googleAvatar: `https://images.unsplash.com/photo-${1535713875002 + i * 120}-d1d0cf377fde`,
          customAvatar: "",
          phone: `09880000${i < 10 ? '0' : ''}${i}`,
          role: "athlete",
          permissions: ["view_stats"],
          linkedAthleteId: `athlete_${i}`,
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      }

      for (const u of usersList) {
        await setDoc(doc(db, "users", u.uid), sanitizeData(u));
      }
      log(`Seeded users: ${usersList.length} documents (1 Admin, 1 Director, 10 Referees, 19 Athlete Accounts)`);

      // 5. athletes (20 system athletes & 10 local athletes)
      log("Seeding athletes...");
      const provinces = ["Thanh Hóa", "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "Nghệ An", "Bình Dương"];
      const clubIds = ["36SC", "HanoiSC", "SaigonSC", ""];
      
      const athletesList: any[] = [];

      // 20 System Athletes (verified claimStatus, linked to corresponding user accounts)
      for (let i = 1; i <= 20; i++) {
        const linkedUserId = i === 1 ? "admin_user_id" : `user_ath_${i}`;
        athletesList.push({
          athleteId: `athlete_${i}`,
          vscNumber: `VSC-${2026000 + i}`,
          fullName: `Xạ Thủ Hệ Thống ${i}`,
          gender: i % 2 === 0 ? "Nữ" : "Nam",
          birthday: `199${i % 10}-06-15`,
          province: provinces[i % provinces.length],
          currentClubId: clubIds[i % 4],
          avatar: `https://images.unsplash.com/photo-${1535713875002 + i * 130}-d1d0cf377fde`,
          biography: `Tôi là xạ thủ hệ thống thứ ${i} của VSC. Bắn ná cao su thể thao chuyên nghiệp.`,
          facebook: `facebook.com/vsc.system.${i}`,
          zalo: `098${i}123456`,
          emergencyContact: "Gia đình - 0900000000",
          equipment: "Ná Một Mặt, thun dẹt 0.60mm, bi 7mm",
          personalNotes: "Tâm lý thi đấu vững vàng.",
          linkedUserId,
          claimStatus: "verified",
          profileCompletion: 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // 10 Local Athletes (unclaimed, local registration)
      for (let i = 1; i <= 10; i++) {
        athletesList.push({
          athleteId: `athlete_local_${i}`,
          vscNumber: `VSC-LOCAL-${2026000 + i}`,
          fullName: `Xạ Thủ Địa Phương ${i}`,
          gender: i % 2 === 0 ? "Nữ" : "Nam",
          birthday: `199${(i + 5) % 10}-08-20`,
          province: provinces[(i + 3) % provinces.length],
          currentClubId: "",
          avatar: `https://images.unsplash.com/photo-${1535713875002 + i * 210}-d1d0cf377fde`,
          biography: `Xạ thủ tự do đăng ký tham gia thi đấu tại địa phương.`,
          facebook: "",
          zalo: "",
          emergencyContact: "Liên hệ khẩn cấp - 0912000000",
          equipment: "Ná truyền thống, thun tròn, bi đất nung / bi sắt",
          personalNotes: "Tham gia giao lưu cọ xát nâng cao tay nghề.",
          linkedUserId: "",
          claimStatus: "unclaimed",
          profileCompletion: 60,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      for (const a of athletesList) {
        await setDoc(doc(db, "athletes", a.athleteId), sanitizeData(a));
      }
      log(`Seeded athletes: ${athletesList.length} documents (20 System Verified, 10 Local Unclaimed)`);

      // 6. club_members (resolves memberships of verified/local athletes to clubs)
      log("Seeding club_members...");
      const clubMembers = [];
      for (let i = 0; i < athletesList.length; i++) {
        const ath = athletesList[i];
        if (ath.currentClubId) {
          clubMembers.push({
            memberId: `member_ath_${ath.athleteId}`,
            clubId: ath.currentClubId,
            athleteId: ath.athleteId,
            userId: ath.linkedUserId || "",
            role: i < 3 ? "leader" : "member",
            status: "active",
            joinedAt: "2026-01-10T08:00:00Z"
          });
        }
      }
      for (const cm of clubMembers) {
        await setDoc(doc(db, "club_members", cm.memberId), sanitizeData(cm));
      }
      log(`Seeded club_members: ${clubMembers.length} documents`);

      // 7. club_join_requests
      log("Seeding club_join_requests...");
      const joinRequests = [
        {
          requestId: "req_join_1",
          clubId: "36SC",
          athleteId: "athlete_local_1",
          userId: "",
          status: "pending",
          requestedAt: new Date().toISOString()
        },
        {
          requestId: "req_join_2",
          clubId: "HanoiSC",
          athleteId: "athlete_local_2",
          userId: "",
          status: "approved",
          requestedAt: "2026-06-20T10:00:00Z",
          approvedBy: "user_ref_1",
          approvedAt: "2026-06-21T09:00:00Z"
        }
      ];
      for (const r of joinRequests) {
        await setDoc(doc(db, "club_join_requests", r.requestId), sanitizeData(r));
      }
      log(`Seeded club_join_requests: ${joinRequests.length} documents`);

      // 8. rule_templates
      log("Seeding rule_templates...");
      const ruleTemplates = [
        {
          templateId: "scorecard_std_10m",
          name: "VSC Standard 10m Scorecard",
          type: "scorecard",
          content: JSON.stringify({ distance: 10, targetType: "paper", totalShots: 20 }),
          status: "active",
          createdAt: new Date().toISOString()
        },
        {
          templateId: "tiebreak_sudden_death",
          name: "Solo Sudden-Death Tiebreaker",
          type: "tiebreak",
          content: JSON.stringify({ maxShots: 1, trigger: "score_equality" }),
          status: "active",
          createdAt: new Date().toISOString()
        }
      ];
      for (const rt of ruleTemplates) {
        await setDoc(doc(db, "rule_templates", rt.templateId), sanitizeData(rt));
      }
      log(`Seeded rule_templates: ${ruleTemplates.length} documents`);

      // 9. Skip legacy/sample tournaments, score ledgers, ranking snapshots, liveboards and hall of fame seeding to keep environment pristine and completely clean
      log("Pruned sample tournaments and related match entries seeding to keep database pristine and clean.");

      // 16. audit_logs
      log("Seeding audit_logs...");
      const auditLog = {
        logId: "audit_init_v3_freeze_2026",
        userId: "admin_user_id",
        userRole: "super_admin",
        action: "GENERATE_SAMPLE_SEASON_2026",
        targetCollection: "seasons",
        targetDocumentId: "season_2026",
        oldData: {},
        newData: { status: "active", athletesCount: 30, roundsCount: 5 },
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, "audit_logs", "audit_init_v3_freeze_2026"), sanitizeData(auditLog));
      log("Seeded audit_logs: 1 transaction log created");

      // 17. event_logs
      log("Seeding event_logs...");
      const eventLog = {
        logId: "event_database_initialized_2026",
        eventName: "DATABASE_SAMPLE_SEASON_2026_SUCCESS",
        payload: { completedBy: "System Coding Agent", version: "3.0" },
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, "event_logs", "event_database_initialized_2026"), sanitizeData(eventLog));
      log("Seeded event_logs: 1 event logged");

      // 18. repository_metadata
      log("Seeding repository_metadata...");
      const repoMeta = {
        id: "repo_meta_score_ledger",
        collectionName: "official_score_ledger",
        lastSyncTime: new Date().toISOString()
      };
      await setDoc(doc(db, "repository_metadata", "repo_meta_score_ledger"), sanitizeData(repoMeta));
      log("Seeded repository_metadata: 1 sync sync_mark set");

      // 19. system_metadata
      log("Seeding system_metadata...");
      const systemMeta = {
        id: "sys_health_check",
        moduleName: "FirestoreDatabaseV3",
        status: "healthy_and_frozen",
        diagnostics: { totalCollections: 19, activeConnections: 1 }
      };
      await setDoc(doc(db, "system_metadata", "sys_health_check"), sanitizeData(systemMeta));
      log("Seeded system_metadata: 1 diagnostics log registered");

      log("DATABASE V3.0 COMPLETE SAMPLE SEASON 2026 INITIALIZED SUCCESSFULLY!");
      return { success: true, report: logs };
    } catch (error: any) {
      console.error("Database Seeding Failed:", error);
      return { success: false, report: `Failed: ${error?.message || error}` };
    }
  }
};
