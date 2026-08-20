import { db } from "./src/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

async function main() {
  console.log("Checking official_score_ledger docs...");
  const snap = await getDocs(query(collection(db, "official_score_ledger"), limit(5)));
  console.log("Found general ledger docs size:", snap.size);
  snap.forEach(doc => {
    console.log("ID:", doc.id, "DATA:", JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
});
