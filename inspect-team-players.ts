import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  const tourSnap = await getDoc(doc(db, "v3_tournaments", "tour-v3-1784362333223"));
  if (!tourSnap.exists()) {
    console.log("Not found");
    return;
  }
  const data = tourSnap.data();
  console.log("--- TEAM ATHLETES ---");
  data.teamAthletes?.forEach((ath: any) => {
    console.log(`ID: ${ath.id}, Name: ${ath.fullName || ath.name}, Team: ${ath.team}`);
  });
  console.log("--- INDIVIDUAL ATHLETES ---");
  data.athletes?.forEach((ath: any) => {
    console.log(`ID: ${ath.id}, Name: ${ath.fullName || ath.name}, Team: ${ath.team}`);
  });
}

main().catch(console.error);
