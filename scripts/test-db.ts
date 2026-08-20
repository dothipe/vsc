import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

async function run() {
  console.log("Testing read connection...");
  try {
    const qSnap = await getDocs(collection(db, "tournaments"));
    console.log(`Success! Read tournaments count: ${qSnap.size}`);
    qSnap.docs.forEach(doc => {
      console.log(`Doc ID: ${doc.id}, data:`, doc.data());
    });
  } catch (err) {
    console.error("Read connection failed:", err);
  }
}

run();
