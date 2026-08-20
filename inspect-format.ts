import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  console.log("Fetching tournament properties...");
  const snap = await getDoc(doc(db, "v3_tournaments", "tour-v3-1784362333223"));
  if (snap.exists()) {
    const data = snap.data();
    console.log("tournamentFormat:", data.tournamentFormat);
    console.log("competitionMode:", data.competitionMode);
    console.log("individualLocked:", data.individualLocked);
    console.log("teamLocked:", data.teamLocked);
    console.log("commandCenterState format:", data.commandCenterState?.tournamentFormat);
    console.log("commandCenterState stage:", data.commandCenterState?.workflowStage);
  } else {
    console.log("Not found!");
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
});
