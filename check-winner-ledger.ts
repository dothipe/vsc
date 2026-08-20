import { db } from "./src/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

async function main() {
  const q = query(collection(db, "official_score_ledger"), 
                  where("tournamentId", "==", "tour-v3-1784362333223"),
                  where("participantId", "==", "vdv-1786158139020"));
  const snap = await getDocs(q);
  console.log("Winner ledger docs size:", snap.size);
  snap.forEach(doc => {
    console.log("ID:", doc.id, "DATA:", JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

main().catch(console.error);
