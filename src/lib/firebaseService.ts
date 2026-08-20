import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
  serverTimestamp,
  writeBatch
} from "../firebase";
import { Athlete, DistanceConfig, MatchHistoryItem } from "../types";
import { RankingEngine } from "../engines/rankingEngine";

export interface LiveTimerConfig {
  initialSeconds: number;
  remainingSeconds: number;
  timerState: "idle" | "playing_voice" | "playing_horn" | "counting" | "paused" | "finished";
  targetEndTime: number | null;
  updatedAt: number;
  updatedBy?: string;
}

export interface TournamentData {
  id: string;
  matchName: string;
  creatorId: string;
  creatorEmail: string;
  createdAt: any;
  updatedAt: any;
  referees: string[]; // Email list of referees
  subAdmins?: string[]; // Email list of sub admins with direct admin permission
  isPublic: boolean;
  competitionMode: "individual" | "team";
  shotsCount: number;
  teamShotsCount: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  athletes: Athlete[];
  teamAthletes: Athlete[];
  inputAthletes: Athlete[];
  teamInputAthletes: Athlete[];
  masterAthletes?: Athlete[];
  startDate?: string;
  endDate?: string;
  status?: string;
  logo?: string;
  banner?: string;
  scoreEvents?: any[];
  scoreVersions?: any[];
  commandCenterState?: any;
  liveTimer?: LiveTimerConfig;
  tournamentName?: string;
  workflowState?: string;
  tournamentFormat?: "individual" | "team" | "mixed";
  savedPodiumIndividual?: any[];
  savedPodiumTeam?: any[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function isPlainObject(val: any): boolean {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

export function ensureArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object' && val !== null) {
    const keys = Object.keys(val).filter(k => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
    if (keys.length > 0) {
      return keys.map(k => (val as any)[String(k)] ?? (val as any)[k]);
    }
    return Object.values(val);
  }
  return [];
}

export function ensure2DArray<T = any>(val: any): T[][] {
  const outer = ensureArray<any>(val);
  return outer.map(item => ensureArray<T>(item));
}

export function normalize2DArray(val: any): (boolean | number | null)[][] {
  return ensure2DArray<boolean | number | null>(val);
}

function isNumericKeysObject(obj: any): boolean {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  const hasNumericKeys = keys.every(k => /^\d+$/.test(k));
  if (!hasNumericKeys) return false;
  // Ensure we only treat it as an array-map (for 2D arrays) if the child values are themselves arrays.
  // This prevents structured objects like laneStatus (Record<number, { athleteId, status, scores }>)
  // from being incorrectly converted into an array on read.
  return Object.values(obj).every(val => Array.isArray(val));
}

export function normalizeFirestoreData(obj: any): any {
  if (obj === undefined || obj === null) return obj;
  
  if (isNumericKeysObject(obj)) {
    const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
    return keys.map(k => normalizeFirestoreData(obj[String(k)]));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeFirestoreData(item));
  }
  
  if (isPlainObject(obj)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = normalizeFirestoreData(obj[key]);
    }
    return cleaned;
  }
  
  return obj;
}

export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (typeof obj === "string" && obj.startsWith("data:image")) {
    if (obj.length < 350000) {
      return obj;
    }
    return "" as any;
  }
  if (Array.isArray(obj)) {
    const hasNestedArray = obj.some(item => Array.isArray(item));
    if (hasNestedArray) {
      // Convert 2D array to a map object { "0": [...], "1": [...] } for Firestore compatibility
      const mapObj: Record<string, any> = {};
      obj.forEach((item, idx) => {
        mapObj[String(idx)] = sanitizeFirestoreData(item);
      });
      return mapObj as any;
    }
    return obj.map(item => sanitizeFirestoreData(item)) as any;
  }
  if (isPlainObject(obj)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      let val = (obj as any)[key];
      if (typeof val === "string" && val.startsWith("data:image")) {
        if (key === "avatarUrl") {
          if (val.length < 350000) {
            // Store directly to Cloud Firestore online
          } else {
            val = "";
          }
        } else if (["logo", "banner", "logoUrl", "bannerUrl", "logo", "banner"].includes(key)) {
          if (val.length < 350000) {
            // Keep compressed values directly in Firestore
          } else {
            val = "";
          }
        } else {
          val = "";
        }
      } else {
        val = sanitizeFirestoreData(val);
      }
      cleaned[key] = val;
    }
    return cleaned;
  }
  return obj;
}

export function deserializeFirestoreData<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;

  if (typeof obj === "string" && obj.startsWith("local-avatar:")) {
    const id = obj.split(":")[1];
    if (id) {
      try {
        const stored = localStorage.getItem(`vsc-avatar-${id}`);
        if (stored) return stored as any;
      } catch (e) {
        console.warn("localStorage get failed for avatar", e);
      }
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deserializeFirestoreData(item)) as any;
  }

  if (isPlainObject(obj)) {
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      let isConcealedArray = true;
      for (let i = 0; i < keys.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(obj, String(i))) {
          isConcealedArray = false;
          break;
        }
      }
      if (isConcealedArray) {
        // Convert map back to standard JS array
        const arr: any[] = [];
        for (let i = 0; i < keys.length; i++) {
          arr.push(deserializeFirestoreData((obj as any)[String(i)]));
        }
        return arr as any;
      }
    }

    const deserialized: any = {};
    for (const key of Object.keys(obj)) {
      deserialized[key] = deserializeFirestoreData((obj as any)[key]);
    }
    return deserialized;
  }

  return obj;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Handled (Non-Blocking): ', JSON.stringify(errInfo));
}

// ---------------- USER PROFILE HELPERS ----------------

export async function createUserProfile(uid: string, email: string, displayName: string, photoURL: string = "") {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef).catch(err => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    });
    
    if (userSnap && !userSnap.exists()) {
      const isFirstAdmin = email === "nahnatofficial@gmail.com"; // Default global admin based on email
      await setDoc(userRef, {
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL,
        role: isFirstAdmin ? "admin" : "user",
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      });
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}

export async function getUserProfile(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
  return null;
}

// ---------------- TOURNAMENT HELPERS ----------------

/**
 * Creates a new tournament in Firestore
 */
export async function createOnlineTournament(
  matchName: string,
  creatorId: string,
  creatorEmail: string,
  config: {
    competitionMode: "individual" | "team";
    shotsCount: number;
    teamShotsCount: number;
    directMaxPoints?: number;
    teamDirectMaxPoints?: number;
    distances: DistanceConfig[];
    teamDistances: DistanceConfig[];
    athletes: Athlete[];
    teamAthletes: Athlete[];
    inputAthletes: Athlete[];
    teamInputAthletes: Athlete[];
  }
): Promise<string> {
  const newId = `tour-v3-${Date.now()}`;
  const tourRef = doc(db, "v3_tournaments", newId);
  
  const payload: any = {
    id: newId,
    tournamentName: matchName || "Giải đấu mới",
    creatorId,
    creatorEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    referees: [], // Admin can add referee emails later
    subAdmins: [], // Sub admins with full admin rights
    isPublic: true,
    ...config
  };

  try {
    const sanitizedPayload = sanitizeFirestoreData(payload);
    await setDoc(tourRef, sanitizedPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `v3_tournaments/${newId}`);
  }
  return newId;
}

// In-memory queue to debounce and aggregate online tournament updates per tournament ID
const pendingTournamentUpdates = new Map<string, {
  timer: NodeJS.Timeout;
  mergedUpdates: Partial<TournamentData>;
  promiseResolvers: Array<{ resolve: (val: any) => void; reject: (err: any) => void }>;
}>();

/**
 * Updates a tournament in Firestore (e.g. updating scores, configs, referees)
 * This is debounced and throttled per tournament ID to prevent write stream exhaustion when offline.
 */
export function updateOnlineTournament(id: string, updates: Partial<TournamentData>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!id) {
      resolve();
      return;
    }

    let pending = pendingTournamentUpdates.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      
      // Perform a clean merge of the updates
      pending.mergedUpdates = {
        ...pending.mergedUpdates,
        ...updates
      };
      pending.promiseResolvers.push({ resolve, reject });
    } else {
      pending = {
        timer: null as any,
        mergedUpdates: { ...updates },
        promiseResolvers: [{ resolve, reject }]
      };
    }

    pending.timer = setTimeout(async () => {
      pendingTournamentUpdates.delete(id);
      
      const finalUpdates = pending.mergedUpdates;
      const resolvers = pending.promiseResolvers;

      try {
        const tourRef = doc(db, "v3_tournaments", id);
        const sanitizedUpdates = sanitizeFirestoreData(finalUpdates);
        
        // Auto-map matchName to tournamentName for backward/forward compatibility
        if (sanitizedUpdates.matchName) {
          sanitizedUpdates.tournamentName = sanitizedUpdates.matchName;
        }
        
        await updateDoc(tourRef, {
          ...sanitizedUpdates,
          updatedAt: serverTimestamp()
        });

        // Event-Driven V3 Ranking Engine trigger:
        // If scoring data, distances, status or rules are updated, synchronize to ledger and compute rankings/snapshots
        const isScoringUpdate = 
          "athletes" in finalUpdates || 
          "teamAthletes" in finalUpdates || 
          "scoreEvents" in finalUpdates || 
          "distances" in finalUpdates || 
          "tieBreakRule" in finalUpdates || 
          "status" in finalUpdates;

        if (isScoringUpdate) {
          try {
            const currentDoc = await getDoc(tourRef);
            if (currentDoc.exists()) {
              const data = normalizeFirestoreData(currentDoc.data() as any);
              const scoreEvents = data.scoreEvents || [];
              const matchName = data.matchName || data.tournamentName || "Giải đấu VSC";
              const isMixed = data.tournamentFormat === "mixed";

              if (isMixed) {
                // Individual Sync & Calculate
                const indDistances = data.distances || [];
                const indAthletes = data.athletes || [];
                await publishScoresToLedger(id, indAthletes, indDistances, scoreEvents, true);
                await calculateAndSaveSnapshotsFromLedger(id, indDistances, true, matchName);

                // Team Sync & Calculate
                const teamDistances = data.teamDistances || [];
                const teamAthletes = data.teamAthletes || [];
                await publishScoresToLedger(id, teamAthletes, teamDistances, scoreEvents, false);
                await calculateAndSaveSnapshotsFromLedger(id, teamDistances, false, matchName);
              } else {
                const isIndividual = data.competitionMode === "individual" || data.tournamentFormat === "individual";
                const distances = isIndividual ? (data.distances || []) : (data.teamDistances || []);
                const athletes = isIndividual ? (data.athletes || []) : (data.teamAthletes || []);
                
                // 1. Sync scores to official_score_ledger
                await publishScoresToLedger(id, athletes, distances, scoreEvents, isIndividual);

                // 2. Recalculate and publish all ranking & statistics snapshots
                await calculateAndSaveSnapshotsFromLedger(id, distances, isIndividual, matchName);
              }
            }
          } catch (err) {
            console.error("Error running V3 background Ranking calculations:", err);
          }
        }

        // Resolve all active pending promises
        resolvers.forEach(r => r.resolve(undefined));
      } catch (error) {
        // Reject all active pending promises
        resolvers.forEach(r => r.reject(error));
        handleFirestoreError(error, OperationType.WRITE, `v3_tournaments/${id}`);
      }
    }, 1500);

    pendingTournamentUpdates.set(id, pending);
  });
}

/**
 * Updates only the real-time live timer for a tournament in Firestore
 */
export async function updateOnlineTournamentTimer(id: string, timerData: LiveTimerConfig) {
  try {
    if (!id) return;
    const tourRef = doc(db, "v3_tournaments", id);
    await updateDoc(tourRef, {
      liveTimer: timerData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `v3_tournaments/${id}/liveTimer`);
  }
}

/**
 * Deletes an online tournament from Firestore
 */
export async function deleteOnlineTournament(id: string) {
  try {
    const tourRef = doc(db, "v3_tournaments", id);
    await deleteDoc(tourRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `v3_tournaments/${id}`);
  }
}

/**
 * Subscribes to real-time list of tournaments sorted by latest createdAt
 */
export function subscribeToTournamentsList(callback: (tournaments: TournamentData[]) => void) {
  const collectionRef = collection(db, "v3_tournaments");
  const q = query(collectionRef, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const list: TournamentData[] = [];
    snapshot.forEach((docSnap) => {
      const data = normalizeFirestoreData(docSnap.data());
      list.push({
        id: docSnap.id,
        ...data,
        matchName: data.tournamentName || data.matchName || data.name || "Giải đấu mới",
      } as TournamentData);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "v3_tournaments");
  });
}

/**
 * Subscribes to a single tournament documents in real-time
 */
export function subscribeToTournamentDoc(id: string, callback: (tournament: TournamentData | null) => void) {
  const docRef = doc(db, "v3_tournaments", id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = normalizeFirestoreData(docSnap.data());
      callback({
        id: docSnap.id,
        ...data,
        matchName: data.tournamentName || data.matchName || data.name || "Giải đấu mới",
      } as TournamentData);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `v3_tournaments/${id}`);
  });
}

/**
 * Updates an existing user profile in Firestore
 */
export async function updateUserProfile(uid: string, profileData: any) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Fetches a user profile by their email
 */
export async function getUserProfileByEmail(email: string) {
  try {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
  } catch (error) {
    console.error("Error fetching user profile by email:", error);
  }
  return null;
}

/**
 * Saves a single VSC System Athlete directly to Cloud Firestore without loading the full list.
 * This yields massive performance improvements for single edits/uploads.
 */
export async function saveVscSystemAthleteSingle(athlete: any) {
  try {
    const id = athlete.athleteId || athlete.id;
    if (!id) throw new Error("Athlete ID is required to save.");
    const docRef = doc(db, "athletes", id);
    
    const proposed = {
      id,
      athleteId: id,
      vscNumber: athlete.vscNumber || athlete.idCard || "",
      fullName: athlete.fullName || athlete.name || "",
      gender: athlete.gender || "Nam",
      dob: athlete.dob || athlete.birthday || "",
      birthday: athlete.birthday || athlete.dob || "",
      province: athlete.province || "Chưa rõ",
      country: athlete.country || "Việt Nam",
      clubId: athlete.clubId || athlete.currentClubId || athlete.team || "",
      currentClubId: athlete.currentClubId || athlete.clubId || athlete.team || "",
      team: athlete.team || athlete.clubId || athlete.currentClubId || "",
      clubName: athlete.clubName || athlete.teamName || "",
      teamName: athlete.teamName || athlete.clubName || "",
      avatarUrl: athlete.avatarUrl || athlete.avatar || "",
      avatar: athlete.avatar || athlete.avatarUrl || "",
      biography: athlete.biography || "",
      facebook: athlete.facebook || "",
      zalo: athlete.zalo || "",
      emergencyContact: athlete.emergencyContact || "",
      equipment: athlete.equipment || "",
      personalNotes: athlete.personalNotes || "",
      linkedUserId: athlete.linkedUserId || null,
      claimStatus: athlete.claimStatus || "unclaimed",
      profileCompletion: athlete.profileCompletion || 0,
      createdAt: athlete.createdAt || new Date().toISOString(),
      status: athlete.status || "active",
      slingshotType: athlete.slingshotType || "",
      bandSpec: athlete.bandSpec || "",
      ammoSize: athlete.ammoSize || "",
      shootingStance: athlete.shootingStance || "",
      achievements: athlete.achievements || ""
    };

    const sanitized = sanitizeFirestoreData({
      ...proposed,
      updatedAt: new Date().toISOString()
    });

    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.error("Error saving single VSC athlete:", error);
    handleFirestoreError(error, OperationType.WRITE, `athletes/${athlete.id}`);
  }
}

/**
 * Deletes a single VSC System Athlete directly from Cloud Firestore.
 */
export async function deleteVscSystemAthleteSingle(id: string) {
  try {
    if (!id) return;
    await deleteDoc(doc(db, "athletes", id));
  } catch (error) {
    console.error("Error deleting single VSC athlete:", error);
    handleFirestoreError(error, OperationType.DELETE, `athletes/${id}`);
  }
}

/**
 * Saves VSC System Athletes to Cloud Firestore
 */
export async function saveVscSystemAthletes(athletes: Athlete[]) {
  try {
    const activeIds = new Set<string>();
    
    // Fetch all current athletes in Firestore to compare and only update changed items
    const querySnap = await getDocs(collection(db, "athletes"));
    const existingMap = new Map<string, any>();
    querySnap.forEach((docSnap) => {
      existingMap.set(docSnap.id, docSnap.data());
    });

    const fieldsToCompare = [
      "athleteId", "vscNumber", "fullName", "gender", "dob", "birthday",
      "province", "country", "clubId", "currentClubId", "team", "clubName",
      "teamName", "avatarUrl", "avatar", "biography", "facebook", "zalo",
      "emergencyContact", "equipment", "personalNotes", "linkedUserId",
      "claimStatus", "status", "slingshotType", "bandSpec", "ammoSize", "shootingStance", "achievements"
    ];

    let batch = writeBatch(db);
    let count = 0;

    const commitAndReset = async () => {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    for (const item of athletes) {
      const ath = item as any;
      const id = ath.athleteId || ath.id;
      if (!id) continue;
      activeIds.add(id);

      const proposed = {
        id,
        athleteId: id,
        vscNumber: ath.vscNumber || ath.idCard || "",
        fullName: ath.fullName || ath.name || "",
        gender: ath.gender || "Nam",
        dob: ath.dob || ath.birthday || "",
        birthday: ath.birthday || ath.dob || "",
        province: ath.province || "Chưa rõ",
        country: ath.country || "Việt Nam",
        clubId: ath.clubId || ath.currentClubId || ath.team || "",
        currentClubId: ath.currentClubId || ath.clubId || ath.team || "",
        team: ath.team || ath.clubId || ath.currentClubId || "",
        clubName: ath.clubName || ath.teamName || "",
        teamName: ath.teamName || ath.clubName || "",
        avatarUrl: ath.avatarUrl || ath.avatar || "",
        avatar: ath.avatar || ath.avatarUrl || "",
        biography: ath.biography || "",
        facebook: ath.facebook || "",
        zalo: ath.zalo || "",
        emergencyContact: ath.emergencyContact || "",
        equipment: ath.equipment || "",
        personalNotes: ath.personalNotes || "",
        linkedUserId: ath.linkedUserId || null,
        claimStatus: ath.claimStatus || "unclaimed",
        profileCompletion: ath.profileCompletion || 0,
        createdAt: ath.createdAt || new Date().toISOString(),
        status: ath.status || "active",
        slingshotType: ath.slingshotType || "",
        bandSpec: ath.bandSpec || "",
        ammoSize: ath.ammoSize || "",
        shootingStance: ath.shootingStance || "",
        achievements: ath.achievements || ""
      };

      const existing = existingMap.get(id);
      let needsUpdate = !existing;

      if (existing) {
        for (const field of fieldsToCompare) {
          const v1 = existing[field] !== undefined ? existing[field] : "";
          const v2 = (proposed as any)[field] !== undefined ? (proposed as any)[field] : "";
          if (String(v1) !== String(v2)) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        const docRef = doc(db, "athletes", id);
        const sanitized = sanitizeFirestoreData({
          ...proposed,
          updatedAt: new Date().toISOString()
        });
        batch.set(docRef, sanitized, { merge: true });
        count++;
        if (count >= 400) {
          await commitAndReset();
        }
      }
    }

    // Purge deleted system athletes
    for (const docId of existingMap.keys()) {
      if (!activeIds.has(docId)) {
        batch.delete(doc(db, "athletes", docId));
        count++;
        if (count >= 400) {
          await commitAndReset();
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "athletes");
  }
}

/**
 * Fetches VSC System Athletes from Cloud Firestore
 */
export async function getVscSystemAthletes(): Promise<Athlete[]> {
  try {
    const q = collection(db, "athletes");
    const querySnap = await getDocs(q);
    const list: Athlete[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      let avatarUrl = data.avatarUrl;
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("local-avatar:")) {
        const id = avatarUrl.split(":")[1] || docSnap.id;
        try {
          const stored = localStorage.getItem(`vsc-avatar-${id}`);
          if (stored) {
            avatarUrl = stored;
          } else {
            avatarUrl = "";
          }
        } catch (e) {
          console.warn("Failed to get local avatar in getVscSystemAthletes", e);
          avatarUrl = "";
        }
      }
      list.push({
        id: docSnap.id,
        athleteId: docSnap.id,
        ...data,
        avatarUrl
      } as unknown as Athlete);
    });
    return list;
  } catch (error) {
    console.error("Error reading VSC system athletes from Firestore:", error);
  }
  return [];
}

/**
 * Subscribes in real-time to VSC System Athletes stored in Cloud Firestore
 */
export function subscribeToVscSystemAthletes(callback: (athletes: Athlete[]) => void) {
  const q = collection(db, "athletes");
  return onSnapshot(q, (querySnap) => {
    const list: Athlete[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      let avatarUrl = data.avatarUrl;
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("local-avatar:")) {
        const id = avatarUrl.split(":")[1] || docSnap.id;
        try {
          const stored = localStorage.getItem(`vsc-avatar-${id}`);
          if (stored) {
            avatarUrl = stored;
          } else {
            avatarUrl = "";
          }
        } catch (e) {
          console.warn("Failed to get local avatar in subscribeToVscSystemAthletes", e);
          avatarUrl = "";
        }
      }
      list.push({
        id: docSnap.id,
        athleteId: docSnap.id,
        ...data,
        avatarUrl
      } as unknown as Athlete);
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system athletes subscription failed, falling back gracefully:", error);
  });
}

// ==================== MASTER DATA SYNC HELPERS (NON-DESTRUCTIVE) ====================

export async function saveVscSystemClubs(clubs: any[]) {
  try {
    const activeIds = new Set<string>();

    const querySnap = await getDocs(collection(db, "clubs"));
    const existingMap = new Map<string, any>();
    querySnap.forEach((docSnap) => {
      existingMap.set(docSnap.id, docSnap.data());
    });

    const fieldsToCompare = [
      "clubId", "clubCode", "clubName", "shortName", "logo", "banner", "logoUrl", "bannerUrl", "province",
      "country", "address", "description", "managerUserId", "foundedDate", "leaderAthleteId", "leaderAthleteName",
      "memberCount", "achievements", "status"
    ];

    let batch = writeBatch(db);
    let count = 0;

    const commitAndReset = async () => {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    for (const c of clubs) {
      const id = c.clubId || c.id;
      if (!id) continue;
      activeIds.add(id);

      const proposed = {
        clubId: id,
        clubCode: c.clubCode || "",
        clubName: c.clubName || c.name || "",
        shortName: c.shortName || "",
        logo: c.logoUrl || c.logo || c.avatarUrl || "",
        banner: c.bannerUrl || c.banner || "",
        logoUrl: c.logoUrl || c.logo || c.avatarUrl || "",
        bannerUrl: c.bannerUrl || c.banner || "",
        province: c.province || "Chưa rõ",
        country: c.country || "Việt Nam",
        address: c.address || "",
        description: c.description || "",
        managerUserId: c.managerUserId || "",
        foundedDate: c.foundedDate || "",
        leaderAthleteId: c.leaderAthleteId || "",
        leaderAthleteName: c.leaderAthleteName || "",
        memberCount: c.memberCount !== undefined ? c.memberCount : 0,
        achievements: c.achievements || [],
        status: c.status || "active",
        createdAt: c.createdAt || new Date().toISOString()
      };

      const existing = existingMap.get(id);
      let needsUpdate = !existing;

      if (existing) {
        for (const field of fieldsToCompare) {
          const v1 = existing[field] !== undefined ? existing[field] : "";
          const v2 = (proposed as any)[field] !== undefined ? (proposed as any)[field] : "";
          if (String(v1) !== String(v2)) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        const docRef = doc(db, "clubs", id);
        const sanitized = sanitizeFirestoreData({
          ...proposed,
          updatedAt: new Date().toISOString()
        });
        batch.set(docRef, sanitized, { merge: true });
        count++;
        if (count >= 400) {
          await commitAndReset();
        }
      }
    }

    // Purge deleted system clubs
    for (const docId of existingMap.keys()) {
      if (!activeIds.has(docId)) {
        batch.delete(doc(db, "clubs", docId));
        count++;
        if (count >= 400) {
          await commitAndReset();
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "clubs");
  }
}

export function subscribeToVscSystemClubs(callback: (clubs: any[]) => void) {
  const q = collection(db, "clubs");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        clubId: docSnap.id,
        ...data,
        logoUrl: data.logo || data.logoUrl || "",
        bannerUrl: data.banner || data.bannerUrl || ""
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system clubs subscription failed:", error);
  });
}

export async function saveVscSystemReferees(referees: any[]) {
  try {
    const activeIds = new Set<string>();
    for (const r of referees) {
      const id = r.id || r.refereeId;
      if (!id) continue;
      activeIds.add(id);
      const docRef = doc(db, "users", id);
      await setDoc(docRef, {
        uid: id,
        displayName: r.fullName || "",
        fullName: r.fullName || "",
        role: "referee",
        licenseLevel: r.licenseLevel || "national",
        badgeNumber: r.badgeNumber || "",
        status: r.status || "active",
        certifiedAt: r.certifiedAt || "",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "users");
  }
}

export function subscribeToVscSystemReferees(callback: (referees: any[]) => void) {
  const q = query(collection(db, "users"), where("role", "==", "referee"));
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        fullName: data.displayName || data.fullName || "",
        licenseLevel: data.licenseLevel || "national",
        badgeNumber: data.badgeNumber || "",
        status: data.status || "active",
        certifiedAt: data.certifiedAt || data.createdAt || ""
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system referees subscription failed:", error);
  });
}

export async function saveVscSystemUsers(users: any[]) {
  try {
    const activeIds = new Set<string>();
    let batch = writeBatch(db);
    let count = 0;

    const commitAndReset = async () => {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    for (const u of users) {
      const id = u.uid || u.id;
      if (!id) continue;
      activeIds.add(id);
      const docRef = doc(db, "users", id);
      const sanitized = sanitizeFirestoreData({
        uid: id,
        email: u.email || "",
        displayName: u.displayName || "",
        avatarUrl: u.avatarUrl || u.googleAvatar || "",
        googleAvatar: u.googleAvatar || u.avatarUrl || "",
        customAvatar: u.customAvatar || "",
        phone: u.phone || "",
        role: u.role || "athlete",
        permissions: u.permissions || [],
        linkedAthleteId: u.masterAthleteId || u.linkedAthleteId || null,
        masterAthleteId: u.masterAthleteId || u.linkedAthleteId || "",
        status: u.status || "active",
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
        lastLogin: u.lastLogin || ""
      });
      batch.set(docRef, sanitized, { merge: true });
      count++;
      if (count >= 400) {
        await commitAndReset();
      }
    }

    const querySnap = await getDocs(collection(db, "users"));
    for (const docSnap of querySnap.docs) {
      if (!activeIds.has(docSnap.id) && docSnap.id.startsWith("user-")) {
        batch.delete(doc(db, "users", docSnap.id));
        count++;
        if (count >= 400) {
          await commitAndReset();
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "users");
  }
}

export async function saveVscSystemUserSingle(user: any) {
  try {
    const id = user.uid || user.id;
    if (!id) throw new Error("User ID is required");
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const updatePayload: any = {
        email: user.email ? user.email.trim().toLowerCase() : existingData.email,
        displayName: user.displayName || existingData.displayName,
        role: user.role || existingData.role || "athlete",
        masterAthleteId: user.masterAthleteId !== undefined ? user.masterAthleteId : (existingData.masterAthleteId || ""),
        linkedAthleteId: user.masterAthleteId !== undefined ? user.masterAthleteId : (existingData.linkedAthleteId || null),
        updatedAt: new Date().toISOString()
      };
      if (user.avatarUrl) {
        updatePayload.avatarUrl = user.avatarUrl;
      }
      await updateDoc(docRef, sanitizeFirestoreData(updatePayload));
    } else {
      const sanitized = sanitizeFirestoreData({
        uid: id,
        email: user.email ? user.email.trim().toLowerCase() : "",
        displayName: user.displayName || "",
        avatarUrl: user.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        googleAvatar: user.googleAvatar || "",
        customAvatar: user.customAvatar || "",
        phone: user.phone || "",
        role: user.role || "athlete",
        permissions: user.permissions || [],
        linkedAthleteId: user.masterAthleteId || null,
        masterAthleteId: user.masterAthleteId || "",
        status: user.status || "active",
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: user.lastLogin || ""
      });
      await setDoc(docRef, sanitized, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function deleteVscSystemUser(id: string) {
  try {
    if (!id) return;
    await deleteDoc(doc(db, "users", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
  }
}

export function subscribeToVscSystemUsers(callback: (users: any[]) => void) {
  const q = collection(db, "users");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        uid: docSnap.id,
        ...data,
        masterAthleteId: data.masterAthleteId || data.linkedAthleteId || "",
        avatarUrl: data.avatarUrl || data.googleAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system users subscription failed:", error);
  });
}

export async function saveVscSystemSponsors(sponsors: any[]) {
  try {
    const activeIds = new Set<string>();
    for (const s of sponsors) {
      const id = s.id || s.sponsorId;
      if (!id) continue;
      activeIds.add(id);
      const docRef = doc(db, "sponsors", id);
      const sanitized = sanitizeFirestoreData({
        sponsorId: id,
        name: s.name || "",
        logo: s.logo || s.imageUrl || "",
        website: s.website || "",
        tier: s.tier || "bronze",
        status: s.status || "active",
        createdAt: s.createdAt || new Date().toISOString()
      });
      await setDoc(docRef, sanitized, { merge: true });
    }

    const querySnap = await getDocs(collection(db, "sponsors"));
    for (const docSnap of querySnap.docs) {
      if (!activeIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "sponsors", docSnap.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "sponsors");
  }
}

export function subscribeToVscSystemSponsors(callback: (sponsors: any[]) => void) {
  const q = collection(db, "sponsors");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      list.push({
        id: docSnap.id,
        sponsorId: docSnap.id,
        ...docSnap.data()
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system sponsors subscription failed:", error);
  });
}

export async function saveVscSystemTemplates(templates: any[]) {
  try {
    const activeIds = new Set<string>();
    for (const t of templates) {
      const id = t.id || t.templateId;
      if (!id) continue;
      activeIds.add(id);
      const docRef = doc(db, "templates", id);
      const sanitized = sanitizeFirestoreData({
        templateId: id,
        name: t.name || "",
        type: t.type || "scorecard",
        content: t.content || "",
        status: t.status || "active",
        createdAt: t.createdAt || new Date().toISOString()
      });
      await setDoc(docRef, sanitized, { merge: true });
    }

    const querySnap = await getDocs(collection(db, "templates"));
    for (const docSnap of querySnap.docs) {
      if (!activeIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "templates", docSnap.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "templates");
  }
}

export function subscribeToVscSystemTemplates(callback: (templates: any[]) => void) {
  const q = collection(db, "templates");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      list.push({
        id: docSnap.id,
        templateId: docSnap.id,
        ...docSnap.data()
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system templates subscription failed:", error);
  });
}


// ==================== AUDIT LOGS & ACCOUNT LINKING LIFE CYCLE (V3) ====================

export interface VscAuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: "LINK_ACCOUNT" | "UNLINK_ACCOUNT" | "OVERRIDE_CLAIM" | "CREATE_ATHLETE_PROFILE" | "UPDATE_ATHLETE_PROFILE" | "LINK_ACCOUNT_REQUEST";
  athleteId: string;
  athleteName: string;
  details: string;
  timestamp: string;
}

/**
 * Creates an audit log entry in Firestore
 */
export async function addVscAuditLog(log: VscAuditLog) {
  try {
    const auditRef = collection(db, "audit_logs");
    const sanitizedLog = sanitizeFirestoreData({
      logId: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: log.userId,
      userRole: "user",
      action: log.action,
      targetCollection: "athletes",
      targetDocumentId: log.athleteId,
      newData: {
        athleteName: log.athleteName,
        details: log.details,
        userEmail: log.userEmail
      },
      timestamp: log.timestamp || new Date().toISOString()
    });
    await addDoc(auditRef, sanitizedLog);
  } catch (error) {
    console.error("Error writing audit log:", error);
  }
}

/**
 * Fetches all audit logs
 */
export async function getVscAuditLogs(): Promise<VscAuditLog[]> {
  try {
    const auditRef = collection(db, "audit_logs");
    const q = query(auditRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const logs: VscAuditLog[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        userId: data.userId || "",
        userEmail: data.newData?.userEmail || "",
        action: data.action || "",
        athleteId: data.targetDocumentId || "",
        athleteName: data.newData?.athleteName || "",
        details: data.newData?.details || "",
        timestamp: data.timestamp || ""
      } as VscAuditLog);
    });
    return logs;
  } catch (error) {
    console.error("Error reading audit trail:", error);
    return [];
  }
}

/**
 * Coordinates linking a User Profile and a MasterAthlete.
 * Account Claim Protection:
 * - One Master Athlete can belong to only one Master User.
 * - Once linked, linkedUserId is immutable unless overridden.
 */
export async function coordinateLinkAthlete(
  userId: string,
  userEmail: string,
  athleteId: string,
  isOverride: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch user profile
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, message: "Không tìm thấy hồ sơ người dùng." };
    }
    const userProfile = userSnap.data();

    // 2. Fetch single athlete from the /athletes collection
    const athleteRef = doc(db, "athletes", athleteId);
    const athleteSnap = await getDoc(athleteRef);
    if (!athleteSnap.exists()) {
      return { success: false, message: "Không tìm thấy hồ sơ vận động viên gốc." };
    }
    const athlete = athleteSnap.data();

    // 4. Account Claim Protection: check already linked
    if (athlete.linkedUserId && athlete.linkedUserId !== userId) {
      if (!isOverride) {
        return { 
          success: false, 
          message: `Hồ sơ vận động viên này đã được liên kết với một tài khoản khác (UID: ...${athlete.linkedUserId.slice(-6)}). Vui lòng liên hệ Quản trị viên hệ thống để giải quyết.` 
        };
      } else {
        // Log override action
        await addVscAuditLog({
          userId,
          userEmail,
          action: "OVERRIDE_CLAIM",
          athleteId: athlete.athleteId || athleteId,
          athleteName: athlete.fullName || athlete.name || "Vận động viên",
          details: `Quản trị viên đã ghi đè quyền sở hữu của hồ sơ VĐV từ người dùng cũ (UID: ${athlete.linkedUserId}) sang người dùng mới (UID: ${userId}).`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 5. Update athlete in /athletes collection
    await updateDoc(athleteRef, {
      linkedUserId: userId,
      claimStatus: "pending_review"
    });

    // Also update user profile to record the pending status
    await updateDoc(userRef, {
      claimStatus: "pending_review"
    });

    // 7. Audit log link action
    await addVscAuditLog({
      userId,
      userEmail,
      action: "LINK_ACCOUNT_REQUEST",
      athleteId: athlete.athleteId || athleteId,
      athleteName: athlete.fullName || athlete.name || "Vận động viên",
      details: `Gửi yêu cầu liên kết tài khoản người dùng (${userEmail}) với hồ sơ VĐV (${athleteId}) - Đang chờ duyệt.`,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Gửi yêu cầu liên kết thành công! Vui lòng chờ Ban tổ chức phê duyệt hồ sơ của bạn." };
  } catch (error: any) {
    console.error("Coordinated link athlete error:", error);
    return { success: false, message: `Lỗi hệ thống: ${error.message || error}` };
  }
}

/**
 * Coordinates unlinking an athlete profile (Administrator Only check is handled at UI level)
 */
export async function coordinateUnlinkAthlete(
  userId: string,
  userEmail: string,
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch single athlete from the /athletes collection
    const athleteRef = doc(db, "athletes", athleteId);
    const athleteSnap = await getDoc(athleteRef);
    if (athleteSnap.exists()) {
      await updateDoc(athleteRef, {
        linkedUserId: null,
        claimStatus: "unclaimed"
      });
    }

    // 2. Clear masterAthleteId in user profile
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      masterAthleteId: null,
      claimStatus: "unclaimed",
      updatedAt: serverTimestamp()
    });

    // 3. Write audit log
    await addVscAuditLog({
      userId,
      userEmail,
      action: "UNLINK_ACCOUNT",
      athleteId,
      athleteName: "Hồ sơ VĐV",
      details: `Quản trị viên đã hủy liên kết hồ sơ VĐV (${athleteId}) khỏi tài khoản người dùng (${userEmail}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Hủy liên kết thành công!" };
  } catch (error: any) {
    console.error("Coordinated unlink athlete error:", error);
    return { success: false, message: `Lỗi hệ thống: ${error.message || error}` };
  }
}

/**
 * Calculates Profile Completion Percentage dynamically
 */
export function calculateProfileCompletion(athlete: any, profile: any): number {
  if (!athlete && !profile) return 0;
  
  // Use fields from linked athlete if available, else local user profile
  const p = athlete || profile || {};
  const customAvatar = p.avatarUrl || p.customAvatarUrl || p.avatar || "";
  const phone = p.phone || "";
  const province = p.province || "";
  const club = p.clubName || p.club || "";
  const biography = p.biography || "";
  const emergencyContact = p.emergencyContact || "";
  const facebook = p.facebook || "";
  const zalo = p.zalo || "";

  let filledCount = 0;
  const totalWeightPoints = 7;

  if (customAvatar && customAvatar.trim() !== "") filledCount++;
  if (phone && phone.trim() !== "") filledCount++;
  if (province && province.trim() !== "" && province !== "Chưa rõ") filledCount++;
  if (club && club.trim() !== "" && club !== "Chưa rõ" && club !== "Tự Do") filledCount++;
  if (biography && biography.trim() !== "") filledCount++;
  if (emergencyContact && emergencyContact.trim() !== "") filledCount++;
  if (facebook && facebook.trim() !== "" || zalo && zalo.trim() !== "") filledCount++;

  return Math.round((filledCount / totalWeightPoints) * 100);
}

/**
 * Saves club join requests list to Firestore (global registry style)
 */
export async function saveVscClubRequests(requests: any[]) {
  try {
    const activeIds = new Set<string>();
    for (const req of requests) {
      const id = req.requestId || req.id;
      if (!id) continue;
      activeIds.add(id);
      const docRef = doc(db, "club_join_requests", id);
      const sanitized = sanitizeFirestoreData({
        requestId: id,
        clubId: req.clubId || "",
        athleteId: req.athleteId || "",
        userId: req.userId || "",
        status: req.status || "pending",
        requestedAt: req.requestedAt || req.createdAt || new Date().toISOString(),
        approvedBy: req.approvedBy || null,
        approvedAt: req.approvedAt || null
      });
      await setDoc(docRef, sanitized, { merge: true });
    }

    const querySnap = await getDocs(collection(db, "club_join_requests"));
    for (const docSnap of querySnap.docs) {
      if (!activeIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "club_join_requests", docSnap.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "club_join_requests");
  }
}

/**
 * Subscribes to club join requests in real-time
 */
export function subscribeToVscClubRequests(callback: (requests: any[]) => void) {
  const q = collection(db, "club_join_requests");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        requestId: docSnap.id,
        ...data
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system club requests subscription failed, falling back gracefully:", error);
  });
}

/**
 * Purges legacy collection documents to completely transition to V3
 */
export async function purgeLegacyCollections(): Promise<{ success: boolean; message: string }> {
  const legacyCollections = [
    "vsc_system_athletes",
    "vsc_system_clubs",
    "vsc_system_referees",
    "vsc_system_users",
    "vsc_system_sponsors",
    "vsc_system_templates",
    "vsc_system_club_requests",
    "vsc_audit_trail",
    "v3_tournaments",
    "tournaments",
    "rankings",
    "liveboard",
    "lanes",
    "referee_assignments",
    "shot_logs",
    "tournament_entries",
    "tournament_results",
    "athletes",
    "clubs",
    "hall_of_fame",
    "users",
    "audit_logs",
    "system_settings",
    "v3_rule_templates",
    "event_logs",
    "club_join_requests",
    "club_members",
    "seasons",
    "rule_templates",
    "official_score_ledger",
    "ranking_snapshots",
    "career_snapshots",
    "statistics_snapshots",
    "liveboard_snapshots",
    "repository_metadata",
    "system_metadata"
  ];

  let deletedCount = 0;
  let errorsCount = 0;

  for (const collectionName of legacyCollections) {
    try {
      const colRef = collection(db, collectionName);
      const querySnap = await getDocs(colRef);
      for (const d of querySnap.docs) {
        await deleteDoc(doc(db, collectionName, d.id));
        deletedCount++;
      }
    } catch (err) {
      console.error(`Error purging legacy collection ${collectionName}:`, err);
      errorsCount++;
    }
  }

  if (errorsCount > 0) {
    return {
      success: false,
      message: `Đã xóa thành công ${deletedCount} bản ghi cũ, tuy nhiên có ${errorsCount} lỗi xảy ra.`
    };
  }

  return {
    success: true,
    message: `Đã dọn dẹp sạch sẽ toàn bộ dữ liệu của phiên bản cũ (${deletedCount} bản ghi đã được xóa).`
  };
}

/**
 * Sync tournament scoring records directly into `/official_score_ledger`
 */
export async function publishScoresToLedger(
  tournamentId: string,
  athletes: Athlete[],
  distances: DistanceConfig[],
  scoreEvents: any[],
  isIndividual: boolean
) {
  try {
    let batch = writeBatch(db);
    let count = 0;

    const commitAndReset = async () => {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    const setDocInBatch = async (docRef: any, data: any) => {
      batch.set(docRef, data);
      count++;
      if (count >= 400) {
        await commitAndReset();
      }
    };

    for (const athlete of athletes) {
      for (const dist of distances) {
        // We include isIndividual in the scoreId to prevent individual and team scores overwriting each other
        const modeSuffix = isIndividual ? "ind" : "team";
        const scoreId = `${tournamentId}_${modeSuffix}_${athlete.id}_${dist.id}`;
        const rawShots = (athlete.scores || {})[dist.id] || [];
        
        // Normalize shots to numbers
        const shots = rawShots.map((shot) => {
          if (shot === true) return 10;
          if (shot === false) return 0;
          if (typeof shot === "number") return shot;
          return 0;
        });

        // Compute total points
        const rawTotal = shots.reduce((acc, s) => acc + s, 0);
        const total = rawTotal * (dist.multiplier || 1);

        // soloShots
        const soloShots = athlete.soloRounds?.[dist.id] || [];

        // find reSoloShots from scoreEvents
        let reSoloShots: number[] = [];
        const resSoloEv = scoreEvents.find(
          (e) => e.athleteId === athlete.id && e.distanceId === dist.id && e.type === "re_solo"
        );
        if (resSoloEv && Array.isArray(resSoloEv.scores)) {
          reSoloShots = resSoloEv.scores.map((s: any) => (s === true ? 10 : s === false ? 0 : Number(s) || 0));
        }

        const operator = athlete.calledBy || "Referee";

        await setDocInBatch(doc(db, "official_score_ledger", scoreId), {
          scoreId,
          tournamentId,
          participantId: athlete.id,
          round: dist.id,
          distance: parseInt(dist.distance) || 10,
          shots,
          total,
          soloShots,
          reSoloShots,
          operator,
          isIndividual, // Save isIndividual boolean field
          timestamp: new Date().toISOString()
        });
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`Successfully published scores for tournament ${tournamentId} to official_score_ledger.`);
  } catch (error) {
    console.error("Error publishing scores to ledger:", error);
  }
}

/**
 * Fetch official score ledger records, reconstruct standings, compute rankings, and publish snapshoots
 */
export async function calculateAndSaveSnapshotsFromLedger(
  tournamentId: string,
  distances: DistanceConfig[],
  isIndividual: boolean,
  matchName: string = "Giải đấu VSC"
) {
  try {
    const ledgerRef = collection(db, "official_score_ledger");
    const q = query(ledgerRef, where("tournamentId", "==", tournamentId));
    const querySnap = await getDocs(q);
    
    const rawLedgerDocs = querySnap.docs.map(doc => doc.data());
    // Filter the ledger documents in memory to match the requested competition mode.
    // If the ledger document does not have the 'isIndividual' field (legacy data), we fallback to true if isIndividual is true,
    // or if we have legacy data, we accept it.
    const ledgerDocs = rawLedgerDocs.filter(d => {
      if (d.isIndividual === undefined) {
        return isIndividual;
      }
      return d.isIndividual === isIndividual;
    });

    if (ledgerDocs.length === 0) {
      console.log(`No official score ledger entries found for tournament ${tournamentId} and isIndividual=${isIndividual}`);
      return;
    }

    const tourRef = doc(db, "v3_tournaments", tournamentId);
    const tourSnap = await getDoc(tourRef);
    if (!tourSnap.exists()) return;
    const tourData = normalizeFirestoreData(tourSnap.data() as any);
    
    // Deduplicate base athletes by ID to prevent any duplicates
    const rawBaseAthletes = isIndividual ? (tourData.athletes || []) : (tourData.teamAthletes || []);
    const seenIds = new Set<string>();
    const baseAthletes = rawBaseAthletes.filter((ath: any) => {
      if (!ath || !ath.id) return false;
      if (seenIds.has(ath.id)) return false;
      seenIds.add(ath.id);
      return true;
    });

    const tieBreakRule = tourData.tieBreakRule || "highest_distance_multiplier";

    // Deriving correct v3 tournament shots parameters
    const compMode = tourData.competitionMode || (isIndividual ? "individual" : "team");
    const isTeam = compMode === "team";
    const shotsCount = tourData.shotsCount || 10;
    const isDirectMode = shotsCount === 1;

    const effectiveShotsCount = isDirectMode
      ? (isTeam ? (tourData.teamDirectMaxShots || 10) : (tourData.directMaxShots || 10))
      : shotsCount;

    const effectiveDirectMaxPoints = isTeam ? tourData.teamDirectMaxPoints : tourData.directMaxPoints;
    const effectiveDirectMaxShots = isTeam ? (tourData.teamDirectMaxShots || 10) : (tourData.directMaxShots || 10);

    const reconstructedAthletes: Athlete[] = baseAthletes.map((baseAth: any) => {
      const ath: Athlete = {
        ...baseAth,
        scores: {},
        soloHits: {},
        soloRounds: {}
      };

      distances.forEach((dist) => {
        const ledgerEntry = ledgerDocs.find(
          (d) => d.participantId === ath.id && d.round === dist.id
        );

        if (ledgerEntry) {
          ath.scores[dist.id] = ledgerEntry.shots || [];
          if (ledgerEntry.soloShots && Array.isArray(ledgerEntry.soloShots)) {
            ath.soloRounds = ath.soloRounds || {};
            ath.soloRounds[dist.id] = ledgerEntry.soloShots;
            ath.soloHits = ath.soloHits || {};
            ath.soloHits[dist.id] = ledgerEntry.soloShots.filter(Boolean).length;
          }
        } else {
          ath.scores[dist.id] = [];
        }
      });

      return ath;
    });

    const rankings = RankingEngine.calculate({
      athletes: reconstructedAthletes,
      distances: distances as any[],
      tieBreakRule,
      shotsCount: effectiveShotsCount,
      directMaxPoints: effectiveDirectMaxPoints,
      directMaxShots: effectiveDirectMaxShots
    });

    let batch = writeBatch(db);

    // Save podiums into the tournament document if we are completed/archived to ensure freeze
    if (tourData.status === "completed" || tourData.status === "archived") {
      const getTopThreeIndividuals = (list: any[]) => {
        return list.slice(0, 3).map((r, idx) => ({
          athleteId: r.athleteId,
          name: r.name,
          team: r.team || "Tự Do",
          totalScore: isIndividual ? (r.survivalScore !== undefined ? r.survivalScore : r.totalScore) : r.totalScore,
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

      if (isIndividual) {
        if (!tourData.savedPodiumIndividual || !Array.isArray(tourData.savedPodiumIndividual) || tourData.savedPodiumIndividual.length === 0) {
          const podiumSnapshot = getTopThreeIndividuals(rankings);
          batch.update(tourRef, {
            savedPodiumIndividual: podiumSnapshot
          });
          tourData.savedPodiumIndividual = podiumSnapshot;
        }
      } else {
        if (!tourData.savedPodiumTeam || !Array.isArray(tourData.savedPodiumTeam) || tourData.savedPodiumTeam.length === 0) {
          const podiumSnapshot = getTopThreeIndividuals(rankings);
          batch.update(tourRef, {
            savedPodiumTeam: podiumSnapshot
          });
          tourData.savedPodiumTeam = podiumSnapshot;
        }
      }
    }

    let count = 0;

    const commitAndReset = async () => {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    const setDocInBatch = async (docRef: any, data: any) => {
      batch.set(docRef, data);
      count++;
      if (count >= 400) {
        await commitAndReset();
      }
    };

    // 1. Overall Ranking Snapshot
    const overallSnapshotId = isIndividual ? `${tournamentId}_overall` : `${tournamentId}_team_overall`;
    await setDocInBatch(doc(db, "ranking_snapshots", overallSnapshotId), {
      snapshotId: overallSnapshotId,
      tournamentId,
      round: "overall",
      distance: 0,
      rankings: rankings.map((r) => ({
        athleteId: r.athleteId,
        name: r.name,
        team: r.team,
        totalScore: r.totalScore,
        accuracy: r.accuracy,
        scoresByDistance: r.scoresByDistance,
        rank: r.rank,
        isTied: r.isTied
      })),
      metadata: { type: "overall", matchName, totalParticipants: reconstructedAthletes.length },
      createdAt: new Date().toISOString()
    });

    // 2. Round/Distance Rankings
    for (const dist of distances) {
      const roundRankings = RankingEngine.calculate({
        athletes: reconstructedAthletes,
        distances: [dist] as any[],
        tieBreakRule,
        shotsCount: effectiveShotsCount,
        directMaxPoints: effectiveDirectMaxPoints,
        directMaxShots: effectiveDirectMaxShots
      });

      const roundSnapshotId = isIndividual ? `${tournamentId}_round_${dist.id}` : `${tournamentId}_team_round_${dist.id}`;
      await setDocInBatch(doc(db, "ranking_snapshots", roundSnapshotId), {
        snapshotId: roundSnapshotId,
        tournamentId,
        round: dist.id,
        distance: parseInt(dist.distance) || 10,
        rankings: roundRankings.map((r) => ({
          athleteId: r.athleteId,
          name: r.name,
          team: r.team,
          totalScore: r.totalScore,
          accuracy: r.accuracy,
          scoresByDistance: r.scoresByDistance,
          rank: r.rank,
          isTied: r.isTied
        })),
        metadata: { type: "round", distanceId: dist.id, distanceName: dist.distance },
        createdAt: new Date().toISOString()
      });
    }

    // 3. Club (Team) Rankings
    const clubMap: Record<string, { totalScore: number; athletesCount: number }> = {};
    reconstructedAthletes.forEach((ath) => {
      if (ath.team) {
        const teamName = ath.team.trim();
        if (teamName) {
          const rankInfo = rankings.find(r => r.athleteId === ath.id);
          const score = rankInfo ? rankInfo.totalScore : 0;

          if (!clubMap[teamName]) {
            clubMap[teamName] = { totalScore: 0, athletesCount: 0 };
          }
          clubMap[teamName].totalScore += score;
          clubMap[teamName].athletesCount += 1;
        }
      }
    });

    const clubRankings = Object.entries(clubMap)
      .map(([clubName, info]) => ({
        clubName,
        totalScore: info.totalScore,
        athletesCount: info.athletesCount
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((club, idx) => ({
        ...club,
        rank: idx + 1
      }));

    const clubSnapshotId = isIndividual ? `${tournamentId}_club` : `${tournamentId}_team_club`;
    await setDocInBatch(doc(db, "ranking_snapshots", clubSnapshotId), {
      snapshotId: clubSnapshotId,
      tournamentId,
      round: "club",
      distance: 0,
      rankings: clubRankings,
      metadata: { type: "club" },
      createdAt: new Date().toISOString()
    });

    // 4. Province Rankings
    const provinceMap: Record<string, { totalScore: number; athletesCount: number }> = {};
    reconstructedAthletes.forEach((ath) => {
      if (ath.province) {
        const provName = ath.province.trim();
        if (provName) {
          const rankInfo = rankings.find(r => r.athleteId === ath.id);
          const score = rankInfo ? rankInfo.totalScore : 0;

          if (!provinceMap[provName]) {
            provinceMap[provName] = { totalScore: 0, athletesCount: 0 };
          }
          provinceMap[provName].totalScore += score;
          provinceMap[provName].athletesCount += 1;
        }
      }
    });

    const provinceRankings = Object.entries(provinceMap)
      .map(([provinceName, info]) => ({
        provinceName,
        totalScore: info.totalScore,
        athletesCount: info.athletesCount
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((prov, idx) => ({
        ...prov,
        rank: idx + 1
      }));

    const provinceSnapshotId = isIndividual ? `${tournamentId}_province` : `${tournamentId}_team_province`;
    await setDocInBatch(doc(db, "ranking_snapshots", provinceSnapshotId), {
      snapshotId: provinceSnapshotId,
      tournamentId,
      round: "province",
      distance: 0,
      rankings: provinceRankings,
      metadata: { type: "province" },
      createdAt: new Date().toISOString()
    });

    // 5. Update Liveboard Snapshots (active broadcast scoreboard view)
    const currentTourMode = tourData.competitionMode || "individual";
    const isActiveMode = (currentTourMode === "individual" && isIndividual) || (currentTourMode === "team" && !isIndividual);
    if (isActiveMode) {
      const liveboardSnapshotId = tournamentId;
      await setDocInBatch(doc(db, "liveboard_snapshots", liveboardSnapshotId), {
        snapshotId: liveboardSnapshotId,
        tournamentId,
        activeHeat: tourData.commandCenterState?.currentHeat || 1,
        activeLanes: Object.entries(tourData.commandCenterState?.laneStatus || {}).map(([lane, status]: any) => ({
          laneNumber: parseInt(lane),
          athleteId: status.athleteId,
          status: status.status,
          refereeId: status.refereeId
        })),
        leaderboard: rankings.slice(0, 15).map((r) => ({
          rank: r.rank,
          name: r.name,
          team: r.team,
          totalScore: r.totalScore,
          accuracy: r.accuracy
        })),
        updatedAt: new Date().toISOString()
      });
    }

    // 6. Calculate and Save Static Metrics (statistics_snapshots)
    for (const ath of reconstructedAthletes) {
      let longestHitStreak = 0;
      let currentHitStreak = 0;
      let shotsCount = 0;
      let totalHits = 0;
      const distanceMetrics: Record<string, number> = {};

      distances.forEach((dist) => {
        const rawShots = (ath.scores || {})[dist.id] || [];
        const shots = rawShots.map(shot => {
          if (shot === true) return 10;
          if (shot === false) return 0;
          if (typeof shot === "number") return shot;
          return 0;
        });

        let distHits = 0;
        shots.forEach((points) => {
          shotsCount++;
          const isHit = points > 0;
          if (isHit) {
            totalHits++;
            distHits++;
            currentHitStreak++;
            if (currentHitStreak > longestHitStreak) {
              longestHitStreak = currentHitStreak;
            }
          } else {
            currentHitStreak = 0;
          }
        });

        const distAccuracy = shots.length > 0 ? (distHits / shots.length) * 100 : 0;
        distanceMetrics[dist.distance] = distAccuracy;
      });

      const averageAccuracy = shotsCount > 0 ? (totalHits / shotsCount) * 100 : 0;

      const statsSnapshotId = ath.id;
      await setDocInBatch(doc(db, "statistics_snapshots", statsSnapshotId), {
        snapshotId: statsSnapshotId,
        athleteId: ath.id,
        averageAccuracy,
        longestHitStreak,
        shotsCount,
        distanceMetrics,
        updatedAt: new Date().toISOString()
      });
    }

    // 7. Write Hall of Fame (if tournament is marked completed or archived)
    if ((tourData.status === "completed" || tourData.status === "archived") && rankings.length > 0) {
      const modeSuffix = isIndividual ? "ind" : "team";
      // Clean up only HOF entries of this specific mode to prevent individual and team overwriting each other
      try {
        const qHof = query(collection(db, "hall_of_fame"));
        const snapshotHof = await getDocs(qHof);
        for (const docSnap of snapshotHof.docs) {
          const hId = docSnap.id;
          // Delete standard v3 format entries for this mode
          if (hId.startsWith(`hof_${tournamentId}_${modeSuffix}_`)) {
            await deleteDoc(docSnap.ref);
          }
          // Also delete old legacy format entries starting with hof_tourId_vdv- or hof_tourId_reg-
          // which represent legacy individual results, to prevent duplicate or incorrect old entries from lingering
          if (isIndividual && (hId.startsWith(`hof_${tournamentId}_vdv-`) || hId.startsWith(`hof_${tournamentId}_reg-`))) {
            await deleteDoc(docSnap.ref);
          }
        }
      } catch (err) {
        console.error("Error pre-cleaning hall_of_fame for tournament:", err);
      }

      let gold: any = null;
      let silver: any = null;
      let bronze: any = null;

      if (isIndividual && tourData.savedPodiumIndividual && Array.isArray(tourData.savedPodiumIndividual) && tourData.savedPodiumIndividual.length > 0) {
        const spi = tourData.savedPodiumIndividual;
        gold = spi[0] || null;
        silver = spi[1] || null;
        bronze = spi[2] || null;
      } else if (!isIndividual && tourData.savedPodiumTeam && Array.isArray(tourData.savedPodiumTeam) && tourData.savedPodiumTeam.length > 0) {
        const spt = tourData.savedPodiumTeam;
        gold = spt[0] || null;
        silver = spt[1] || null;
        bronze = spt[2] || null;
      } else {
        gold = rankings[0];
        silver = rankings[1];
        bronze = rankings[2];
      }

      const getChampionScore = (ath: any) => {
        if (!ath) return 0;
        if (isIndividual) {
          if (ath.survivalScore !== undefined && ath.survivalScore !== null) {
            return ath.survivalScore;
          }
          if (ath.totalScore !== undefined && ath.totalScore !== null) {
            return ath.totalScore;
          }
          return ath.allRoundTotalScore || 0;
        }
        return ath.totalScore || 0;
      };

      const champions = [
        { athlete: gold, title: "Vô địch", type: "champion" },
        { athlete: silver, title: "Á quan 1", type: "runner_up_1" },
        { athlete: bronze, title: "Á quan 2", type: "runner_up_2" }
      ].filter(item => item.athlete && typeof getChampionScore(item.athlete) === "number" && getChampionScore(item.athlete) > 0);

      for (const item of champions) {
        const participantId = item.athlete.athleteId;
        const originalAthlete = item.athlete.originalAthlete;
        const masterAthleteId = originalAthlete?.masterAthleteId || originalAthlete?.id || participantId;
        
        const hallOfFameId = `hof_${tournamentId}_${modeSuffix}_${item.type}`;
        const scoreVal = getChampionScore(item.athlete);
        
        await setDocInBatch(doc(db, "hall_of_fame", hallOfFameId), {
          hallOfFameId,
          seasonId: tourData.seasonId || "2026",
          athleteId: masterAthleteId,
          clubId: item.athlete.team,
          awardType: item.type,
          awardTitle: `${item.title} - ${matchName}`,
          description: `Đạt giải ${item.title} tại giải đấu ${matchName} với tổng điểm ${scoreVal}.`,
          imageUrl: originalAthlete?.avatarUrl || "",
          achievedAt: new Date().toISOString()
        });
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    console.log(`Successfully calculated and published snapshots for tournament ${tournamentId}`);

    // Trigger Season Rankings Calculation if tournament has seasonId
    if (tourData.seasonId) {
      await calculateAndSaveSeasonRankings(tourData.seasonId);
    }

  } catch (error) {
    console.error("Error calculating and saving snapshots:", error);
  }
}

/**
 * Calculate multi-tournament cumulative rankings for a specific season
 */
export async function calculateAndSaveSeasonRankings(seasonId: string) {
  try {
    const tourRef = collection(db, "v3_tournaments");
    const q = query(tourRef, where("seasonId", "==", seasonId));
    const querySnap = await getDocs(q);
    
    const tournaments = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    if (tournaments.length === 0) return;

    const seasonAgg: Record<string, {
      athleteId: string;
      name: string;
      team: string;
      totalScoreSum: number;
      seasonPointsSum: number;
      tournamentsParticipated: number;
    }> = {};

    for (const tour of tournaments) {
      const overallSnapId = `${tour.id}_overall`;
      const snapSnap = await getDoc(doc(db, "ranking_snapshots", overallSnapId));
      if (!snapSnap.exists()) continue;

      const snapData = snapSnap.data();
      const rankings = snapData.rankings || [];

      rankings.forEach((rankEntry: any) => {
        const { athleteId, name, team, totalScore, rank } = rankEntry;
        
        let points = 5;
        if (rank === 1) points = 100;
        else if (rank === 2) points = 85;
        else if (rank === 3) points = 75;
        else if (rank === 4) points = 65;
        else if (rank === 5) points = 55;
        else if (rank === 6) points = 50;
        else if (rank === 7) points = 45;
        else if (rank === 8) points = 40;
        else if (rank === 9) points = 35;
        else if (rank === 10) points = 30;
        else if (rank >= 11 && rank <= 15) points = 20;
        else if (rank >= 16 && rank <= 20) points = 10;

        if (!seasonAgg[athleteId]) {
          seasonAgg[athleteId] = {
            athleteId,
            name,
            team,
            totalScoreSum: 0,
            seasonPointsSum: 0,
            tournamentsParticipated: 0
          };
        }

        seasonAgg[athleteId].totalScoreSum += totalScore;
        seasonAgg[athleteId].seasonPointsSum += points;
        seasonAgg[athleteId].tournamentsParticipated += 1;
      });
    }

    const seasonRankings = Object.values(seasonAgg)
      .sort((a, b) => {
        if (b.seasonPointsSum !== a.seasonPointsSum) {
          return b.seasonPointsSum - a.seasonPointsSum;
        }
        return b.totalScoreSum - a.totalScoreSum;
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1
      }));

    const seasonSnapshotId = `season_${seasonId}`;
    await setDoc(doc(db, "ranking_snapshots", seasonSnapshotId), {
      snapshotId: seasonSnapshotId,
      tournamentId: `season_${seasonId}`,
      round: "season",
      distance: 0,
      rankings: seasonRankings,
      metadata: { type: "season", seasonId },
      createdAt: new Date().toISOString()
    });

    console.log(`Successfully calculated and published season rankings for season ${seasonId}`);
  } catch (error) {
    console.error("Error calculating season rankings:", error);
  }
}

export function subscribeToVscSystemSeasons(callback: (seasons: any[]) => void) {
  const q = collection(db, "seasons");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      list.push({
        id: docSnap.id,
        seasonId: docSnap.id,
        ...docSnap.data()
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system seasons subscription failed:", error);
  });
}

export async function saveVscSystemSeason(seasonId: string, seasonData: any) {
  try {
    await setDoc(doc(db, "seasons", seasonId), seasonData, { merge: true });
  } catch (error) {
    console.error("Error saving VSC system season:", error);
  }
}

export async function deleteVscSystemSeason(seasonId: string) {
  try {
    await deleteDoc(doc(db, "seasons", seasonId));
  } catch (error) {
    console.error("Error deleting VSC system season:", error);
  }
}

export function subscribeToVscSystemProvinces(callback: (provinces: any[]) => void) {
  const q = collection(db, "provinces");
  return onSnapshot(q, (querySnap) => {
    const list: any[] = [];
    querySnap.forEach((docSnap) => {
      list.push({
        id: docSnap.id,
        provinceId: docSnap.id,
        ...docSnap.data()
      });
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system provinces subscription failed:", error);
  });
}

export async function saveVscSystemProvince(provinceId: string, provinceData: any) {
  try {
    await setDoc(doc(db, "provinces", provinceId), provinceData, { merge: true });
  } catch (error) {
    console.error("Error saving VSC system province:", error);
  }
}

export async function deleteVscSystemProvince(provinceId: string) {
  try {
    await deleteDoc(doc(db, "provinces", provinceId));
  } catch (error) {
    console.error("Error deleting VSC system province:", error);
  }
}


