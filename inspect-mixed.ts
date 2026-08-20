import { db } from "./src/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

async function main() {
  console.log("--- TOURNAMENT INFO ---");
  const tourId = "tour-v3-1784362333223";
  const tourSnap = await getDoc(doc(db, "v3_tournaments", tourId));
  if (!tourSnap.exists()) {
    console.log("Tournament not found");
    return;
  }
  const tourData = tourSnap.data();
  console.log("status:", tourData.status);
  console.log("tournamentFormat:", tourData.tournamentFormat);
  console.log("competitionMode:", tourData.competitionMode);

  console.log("\n--- HALL OF FAME ---");
  const hofSnap = await getDocs(collection(db, "hall_of_fame"));
  hofSnap.forEach(doc => {
    const d = doc.data();
    if (doc.id.includes(tourId)) {
      console.log(`HOF ID: ${doc.id}`);
      console.log(`Athlete ID: ${d.athleteId}, Club: ${d.clubId}`);
      console.log(`Award: ${d.awardType} | ${d.awardTitle}`);
      console.log(`Desc: ${d.description}`);
    }
  });

  console.log("\n--- RANKING SNAPSHOT OVERALL ---");
  const snapOverall = await getDoc(doc(db, "ranking_snapshots", `${tourId}_overall`));
  if (snapOverall.exists()) {
    const d = snapOverall.data();
    console.log("Overall rankings length:", d.rankings?.length);
    d.rankings?.slice(0, 5).forEach((r: any) => {
      console.log(`Rank ${r.rank}: ${r.name} (id: ${r.athleteId}), Team: ${r.team}, Total: ${r.totalScore}`);
    });
  } else {
    console.log("No overall snapshot found");
  }

  console.log("\n--- TEAM RANKING SNAPSHOT OVERALL (if any) ---");
  const snapTeam = await getDoc(doc(db, "ranking_snapshots", `${tourId}_team_overall`));
  if (snapTeam.exists()) {
    const d = snapTeam.data();
    console.log("Team rankings length:", d.rankings?.length);
    d.rankings?.slice(0, 5).forEach((r: any) => {
      console.log(`Rank ${r.rank}: ${r.name} (id: ${r.athleteId}), Team: ${r.team}, Total: ${r.totalScore}`);
    });
  } else {
    console.log("No team overall snapshot found");
  }
}

main().catch(console.error);
