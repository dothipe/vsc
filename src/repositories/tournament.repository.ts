import { BaseRepository } from "./base.repository";
import { TournamentV3, TournamentHistoryV3, DistanceConfigV3 } from "../types";
import { db, collection, query, getDocs, writeBatch } from "../firebase";
import { 
  getCompleteTournamentData, 
  updateOnlineTournament, 
  subscribeToTournamentsList, 
  subscribeToTournamentDoc 
} from "../lib/firebaseService";

export class TournamentRepository extends BaseRepository<TournamentV3> {
  constructor() {
    super("v3_tournaments");
  }

  override async get(id: string, userId?: string, userRole?: string): Promise<TournamentV3 | null> {
    return await getCompleteTournamentData(id) as any;
  }

  override async create(id: string, data: Omit<TournamentV3, "id"> & { id?: string }, userId?: string, userRole?: string): Promise<TournamentV3> {
    const payload = { ...data, id };
    await updateOnlineTournament(id, payload as any);
    return payload as any;
  }

  override async update(id: string, data: Partial<TournamentV3>, userId?: string, userRole?: string): Promise<void> {
    await updateOnlineTournament(id, data as any);
  }

  override subscribe(
    id: string, 
    callback: (data: TournamentV3 | null) => void, 
    onError?: (error: any) => void, 
    userId?: string, 
    userRole?: string
  ): () => void {
    return subscribeToTournamentDoc(id, callback as any);
  }

  override subscribeList(
    constraints: any[] = [], 
    callback: (data: TournamentV3[]) => void, 
    onError?: (error: any) => void, 
    userId?: string, 
    userRole?: string
  ): () => void {
    return subscribeToTournamentsList(callback as any);
  }

  /**
   * Create a new tournament V3
   */
  async createTournament(
    tournament: Omit<TournamentV3, "id" | "createdAt" | "updatedAt" | "versionHistory"> & { id?: string },
    userId: string,
    userEmail: string,
    userRole: string
  ): Promise<TournamentV3> {
    const id = tournament.id || `tour-v3-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const initialHistory: TournamentHistoryV3 = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      userId,
      userEmail,
      action: "Khởi tạo",
      summary: `Tạo giải đấu: ${tournament.tournamentName}`
    };

    const initialWorkflowHistory = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      state: "draft" as const,
      updatedAt: timestamp,
      updatedBy: userEmail,
      comment: `Khởi tạo giải đấu: ${tournament.tournamentName}`
    };

    const payload: TournamentV3 = {
      ...tournament,
      id,
      versionHistory: [initialHistory],
      workflowState: tournament.workflowState || "draft",
      workflowHistory: [initialWorkflowHistory],
      workflowUpdatedAt: timestamp,
      workflowUpdatedBy: userEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
      views: 0
    };

    return await this.create(id, payload, userId, userRole);
  }

  /**
   * Duplicate an existing tournament
   */
  async duplicateTournament(
    originalId: string,
    newName: string,
    userId: string,
    userEmail: string,
    userRole: string
  ): Promise<TournamentV3 | null> {
    const original = await this.get(originalId, userId, userRole);
    if (!original) return null;

    const newId = `tour-v3-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const initialHistory: TournamentHistoryV3 = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      userId,
      userEmail,
      action: "Sao chép",
      summary: `Sao chép từ giải đấu gốc [${original.tournamentName}]`
    };

    const initialWorkflowHistory = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      state: "draft" as const,
      updatedAt: timestamp,
      updatedBy: userEmail,
      comment: `Sao chép từ giải đấu gốc [${original.tournamentName}]`
    };

    const cleanedCommandCenterState = original.commandCenterState ? {
      ...original.commandCenterState,
      assignmentVersions: [],
      heats: [],
      laneStatus: {},
      currentHeat: 1
    } : undefined;

    const payload: TournamentV3 = {
      ...original,
      id: newId,
      tournamentName: newName,
      status: "draft", // Reset duplicated tournament to draft
      workflowState: "draft",
      workflowHistory: [initialWorkflowHistory],
      workflowUpdatedAt: timestamp,
      workflowUpdatedBy: userEmail,
      versionHistory: [initialHistory],
      commandCenterState: cleanedCommandCenterState,
      createdAt: timestamp,
      updatedAt: timestamp,
      views: 0
    };

    return await this.create(newId, payload, userId, userRole);
  }

  /**
   * Update a tournament and add history log
   */
  async updateTournament(
    id: string,
    updates: Partial<TournamentV3>,
    userId: string,
    userEmail: string,
    userRole: string,
    historyAction?: string,
    historySummary?: string
  ): Promise<void> {
    const current = await this.get(id, userId, userRole);
    if (!current) throw new Error("Tournament not found");

    const timestamp = new Date().toISOString();
    const nextHistory = [...(current.versionHistory || [])];

    if (historyAction && historySummary) {
      const log: TournamentHistoryV3 = {
        id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp,
        userId,
        userEmail,
        action: historyAction,
        summary: historySummary
      };
      nextHistory.push(log);
    }

    const nextWorkflowHistory = [...(current.workflowHistory || [])];
    const finalUpdates = { ...updates };
    if (finalUpdates.workflowState && finalUpdates.workflowState !== current.workflowState) {
      const whItem = {
        id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        state: finalUpdates.workflowState,
        updatedAt: timestamp,
        updatedBy: userEmail,
        comment: historySummary || `Chuyển trạng thái sang ${finalUpdates.workflowState}`
      };
      nextWorkflowHistory.push(whItem);
      finalUpdates.workflowHistory = nextWorkflowHistory;
      finalUpdates.workflowUpdatedAt = timestamp;
      finalUpdates.workflowUpdatedBy = userEmail;
    }

    const payload: Partial<TournamentV3> = {
      ...finalUpdates,
      versionHistory: nextHistory,
      updatedAt: timestamp
    };

    await this.update(id, payload, userId, userRole);
  }

  /**
   * Delete tournament and clean up associated hall of fame, ranking snapshots, and statistics snapshots
   */
  override async delete(id: string, userId?: string, userRole?: string): Promise<void> {
    // 1. Delete the tournament itself
    await super.delete(id, userId, userRole);

    // 2. Query and delete all associated hall_of_fame entries
    try {
      const q = query(collection(db, "hall_of_fame"));
      const snapshot = await getDocs(q);
      let batch = writeBatch(db);
      let count = 0;

      snapshot.forEach((docSnap) => {
        const hId = docSnap.id;
        // Match v3 format: hof_${tournamentId}_${athleteId}
        // Match v2 format: hof-${seasonId}-${tournamentId}
        if (hId === `hof-${id}` || hId.includes(`_${id}`) || hId.includes(`-${id}`)) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error("Error cleaning up hall_of_fame for deleted tournament:", err);
    }

    // 3. Query and delete all associated ranking_snapshots
    try {
      const q = query(collection(db, "ranking_snapshots"));
      const snapshot = await getDocs(q);
      let batch = writeBatch(db);
      let count = 0;

      snapshot.forEach((docSnap) => {
        const snapId = docSnap.id;
        if (snapId.startsWith(`${id}_`)) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error("Error cleaning up ranking_snapshots for deleted tournament:", err);
    }

    // 4. Query and delete all associated statistics_snapshots
    try {
      const q = query(collection(db, "statistics_snapshots"));
      const snapshot = await getDocs(q);
      let batch = writeBatch(db);
      let count = 0;

      snapshot.forEach((docSnap) => {
        const snapId = docSnap.id;
        if (snapId.startsWith(`${id}_`)) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error("Error cleaning up statistics_snapshots for deleted tournament:", err);
    }
  }
}

export const tournamentRepository = new TournamentRepository();
