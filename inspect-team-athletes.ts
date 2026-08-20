import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  console.log("Fetching tournament teamAthletes...");
  const snap = await getDoc(doc(db, "v3_tournaments", "tour-v3-1784362333223"));
  if (snap.exists()) {
    const data = snap.data();
    console.log("teamAthletes length:", data.teamAthletes?.length);
    if (data.teamAthletes && data.teamAthletes.length > 0) {
      data.teamAthletes.slice(0, 3).forEach((ta: any) => {
        console.log("Team Athlete:", ta.fullName || ta.name, "Scores:", JSON.stringify(ta.scores, null, 2));
      });
    }
  } else {
    console.log("Not found!");
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
});
