import { db } from "./src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  console.log("Fetching ranking_snapshots...");
  const snap = await getDoc(doc(db, "ranking_snapshots", "tour-v3-1784362333223_overall"));
  if (snap.exists()) {
    console.log("DATA:", JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Not found!");
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
