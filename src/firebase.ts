import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
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
  QueryConstraint,
  writeBatch
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseAppletConfig from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Storage
export const storage = getStorage(app);

// Initialize Firestore targeting the custom Database ID with long-polling and persistent local cache enabled to stay resilient when offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalForceLongPolling: true,
  useFetchHandler: true,
} as any, firebaseAppletConfig.firestoreDatabaseId || "ai-studio-3031112d-39bd-4933-828d-a6397149f785");

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
  QueryConstraint,
  writeBatch
};
export type { User };
