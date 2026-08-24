import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  QueryConstraint 
} from "../firebase";
import { db } from "../firebase";
import { handleFirestoreError } from "../foundation/failure";

function isPlainObject(val: any): boolean {
  if (val === null || typeof val !== 'object') return false;
  if (Array.isArray(val)) return false;
  if (val instanceof Date || val instanceof RegExp) return false;
  
  // Exclude Firestore FieldValue/Timestamp or other Firestore internal classes if possible
  const className = val.constructor ? val.constructor.name : "";
  if (className && (className.includes("FieldValue") || className.includes("Timestamp") || className.includes("DocumentReference"))) {
    return false;
  }
  
  const proto = Object.getPrototypeOf(val);
  if (proto === null || proto === Object.prototype) return true;
  
  // If proto is some other object, check if it's a simple object with constructor Name of Object
  return className === "Object";
}

function sanitizeForFirestore<T>(obj: T, isInsideTournamentAthleteList: boolean = false): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (typeof obj === "string" && obj.startsWith("data:image")) {
    if (isInsideTournamentAthleteList) {
      return "" as any;
    }
    if (obj.length < 100000) {
      return obj;
    }
    return "" as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item, isInsideTournamentAthleteList)) as any;
  }
  if (isPlainObject(obj)) {
    const cleaned: any = {};

    for (const key of Object.keys(obj)) {
      let val = (obj as any)[key];
      if (val !== undefined) {
        const nextIsInsideList = isInsideTournamentAthleteList || key === "athletes" || key === "teamAthletes";

        if (nextIsInsideList && (key === "avatarUrl" || key === "avatar")) {
          if (typeof val === "string" && (val.startsWith("data:image") || val.length > 500)) {
            val = "";
          }
        }

        if (typeof val === "string" && val.startsWith("data:image")) {
          if (key === "avatarUrl" || key === "avatar") {
            if (val.length < 50000) {
              // Keep compressed avatar online in Firestore
            } else {
              val = "";
            }
          } else if (["logo", "banner", "logoUrl", "bannerUrl"].includes(key)) {
            if (val.length < 95000) {
              // Keep compressed logo / banner online in Firestore
            } else {
              val = "";
            }
          } else {
            if (val.length >= 80000) {
              val = "";
            }
          }
        } else if (key === "auditLogs" && Array.isArray(val)) {
          val = val.slice(0, 50).map(item => sanitizeForFirestore(item, nextIsInsideList));
        } else if (key === "scoreVersions" && Array.isArray(val)) {
          val = val.slice(-15).map(item => sanitizeForFirestore(item, nextIsInsideList));
        } else {
          val = sanitizeForFirestore(val, nextIsInsideList);
        }
        cleaned[key] = val;
      }
    }
    return cleaned;
  }
  return obj;
}

export abstract class BaseRepository<T extends { id?: string }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

  /**
   * Fetch a single document by ID
   */
  async get(id: string, userId?: string, userRole?: string): Promise<T | null> {
    const docRef = this.getDocRef(id);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, "READ", `${this.collectionName}/${id}`, userId, userRole);
    }
  }

  /**
   * Create or replace a document with a specific ID
   */
  async create(id: string, data: Omit<T, "id"> & { id?: string }, userId?: string, userRole?: string): Promise<T> {
    const docRef = this.getDocRef(id);
    const payload = sanitizeForFirestore({ ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    try {
      await setDoc(docRef, payload);
      return payload as unknown as T;
    } catch (error) {
      handleFirestoreError(error, "CREATE", `${this.collectionName}/${id}`, userId, userRole);
    }
  }

  /**
   * Update fields of an existing document
   */
  async update(id: string, data: Partial<T>, userId?: string, userRole?: string): Promise<void> {
    const docRef = this.getDocRef(id);
    const payload = sanitizeForFirestore({ ...data, updatedAt: new Date().toISOString() });
    try {
      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, "UPDATE", `${this.collectionName}/${id}`, userId, userRole);
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string, userId?: string, userRole?: string): Promise<void> {
    const docRef = this.getDocRef(id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, "DELETE", `${this.collectionName}/${id}`, userId, userRole);
    }
  }

  /**
   * List documents from a collection with query constraints
   */
  async list(constraints: QueryConstraint[] = [], userId?: string, userRole?: string): Promise<T[]> {
    const collRef = this.getCollectionRef();
    const q = query(collRef, ...constraints);
    try {
      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      querySnapshot.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      return results;
    } catch (error) {
      handleFirestoreError(error, "READ", this.collectionName, userId, userRole);
    }
  }

  /**
   * Realtime subscribe to a single document
   */
  subscribe(id: string, callback: (data: T | null) => void, onError?: (error: any) => void, userId?: string, userRole?: string): () => void {
    const docRef = this.getDocRef(id);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          callback(null);
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, "SUBSCRIBE", `${this.collectionName}/${id}`, userId, userRole);
      }
    );
  }

  /**
   * Realtime subscribe to a list of documents with query constraints
   */
  subscribeList(constraints: QueryConstraint[] = [], callback: (data: T[]) => void, onError?: (error: any) => void, userId?: string, userRole?: string): () => void {
    const collRef = this.getCollectionRef();
    const q = query(collRef, ...constraints);
    return onSnapshot(
      q,
      (querySnapshot) => {
        const results: T[] = [];
        querySnapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        callback(results);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, "SUBSCRIBE", this.collectionName, userId, userRole);
      }
    );
  }
}
