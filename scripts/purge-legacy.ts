import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import * as fs from "fs";

// Load configuration
const rawConfig = fs.readFileSync("./firebase-applet-config.json", "utf-8");
const firebaseConfig = JSON.parse(rawConfig);

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-3031112d-39bd-4933-828d-a6397149f785");

async function purgeLegacy() {
  console.log("Starting Firestore Legacy Collections Purge...");

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
    "rankings",
    "liveboard",
    "lanes",
    "referee_assignments",
    "shot_logs",
    "tournament_entries",
    "tournament_results",
    "v3_rule_templates"
  ];

  let totalDeleted = 0;

  for (const collectionName of legacyCollections) {
    try {
      console.log(`Processing collection: ${collectionName}...`);
      const colRef = collection(db, collectionName);
      const querySnap = await getDocs(colRef);
      console.log(`Found ${querySnap.size} documents in ${collectionName}.`);
      
      for (const d of querySnap.docs) {
        await deleteDoc(doc(db, collectionName, d.id));
        totalDeleted++;
      }
      console.log(`Finished purging: ${collectionName}.`);
    } catch (err) {
      console.error(`Error purging legacy collection ${collectionName}:`, err);
    }
  }

  console.log(`Legacy purge complete! Total documents deleted: ${totalDeleted}`);
}

purgeLegacy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Purge script failed:", err);
    process.exit(1);
  });
