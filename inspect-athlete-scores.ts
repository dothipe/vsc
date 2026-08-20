import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  const tournamentId = "tour-v3-1784362333223";
  const tourSnap = await getDoc(doc(db, "v3_tournaments", tournamentId));
  if (!tourSnap.exists()) {
    console.log("No tournament found");
    return;
  }
  const data = tourSnap.data();
  const ath = data.athletes?.find((a: any) => a.id === "vdv-1786158139020");
  if (ath) {
    console.log("Athlete name:", ath.fullName || ath.name);
    console.log("Scores keys:", Object.keys(ath.scores || {}));
    console.log("Scores details:", JSON.stringify(ath.scores, null, 2));
    console.log("Qualifications status:", ath.qualificationStatus);
    console.log("Status:", ath.status);
  } else {
    console.log("Athlete not found in individual list!");
  }
  process.exit(0);
}

main().catch(console.error);
