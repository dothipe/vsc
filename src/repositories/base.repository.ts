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
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (typeof obj === "string" && obj.startsWith("data:image")) {
    if (obj.length < 350000) {
      return obj;
    }
    return "" as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (isPlainObject(obj)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      let val = (obj as any)[key];
      if (val !== undefined) {
        if (typeof val === "string" && val.startsWith("data:image")) {
          if (key === "avatarUrl") {
            if (val.length < 350000) {
              // Store directly online in Firestore
            } else {
              val = "";
            }
          } else if (key === "logo" || key === "banner") {
            // Keep compressed base64 image data for tournament logo & banner
            if (val.length >= 350000) {
              val = "";
            }
          } else {
            val = "";
          }
        } else {
          val = sanitizeForFirestore(val);
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
