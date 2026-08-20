import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";
import { updateOnlineTournament } from "./src/lib/firebaseService";

async function main() {
  const id = "tour-v3-1784362333223";
  console.log("Triggering complete recalculation and sync for tournament", id);
  const snap = await getDoc(doc(db, "v3_tournaments", id));
  if (!snap.exists()) {
    console.error("Tournament not found!");
    process.exit(1);
  }
  const data = snap.data();
  console.log("Current status:", data.status);
  
  // Trigger updateOnlineTournament with status to force isScoringUpdate and run our new isolated calculations
  await updateOnlineTournament(id, { status: data.status || "archived" });
  console.log("Trigger complete. Waiting 10 seconds for background tasks to finish...");
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log("Done!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
