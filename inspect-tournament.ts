import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  console.log("Fetching tournament...");
  const snap = await getDoc(doc(db, "v3_tournaments", "tour-v3-1784362333223"));
  if (snap.exists()) {
    const data = snap.data();
    console.log("Tournament status:", data.status);
    console.log("Competition Mode:", data.competitionMode);
    console.log("Distances:", JSON.stringify(data.distances, null, 2));
    
    // Check first athlete's scores
    if (data.athletes && data.athletes.length > 0) {
      const a = data.athletes[0];
      console.log("First athlete:", a.fullName || a.name, "Scores:", JSON.stringify(a.scores, null, 2));
    } else {
      console.log("No athletes!");
    }
  } else {
    console.log("Not found!");
  }
}

main().catch(err => {
  console.error("Error:", err);
});
