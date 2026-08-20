import { db } from "./src/firebase";
import { collection, getDocs } from "firebase/firestore";

async function main() {
  console.log("Fetching hall_of_fame docs...");
  const snap = await getDocs(collection(db, "hall_of_fame"));
  snap.forEach(doc => {
    console.log("ID:", doc.id, "DATA:", JSON.stringify(doc.data(), null, 2));
  });
  console.log("Done!");
}

main().catch(err => {
  console.error("Error:", err);
});
