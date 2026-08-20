import { db } from "./src/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { RankingEngine } from "./src/engines/rankingEngine";
import { normalizeFirestoreData } from "./src/lib/firebaseService";

async function main() {
  const tournamentId = "tour-v3-1784362333223";
  const ledgerRef = collection(db, "official_score_ledger");
  const q = query(ledgerRef, where("tournamentId", "==", tournamentId));
  const querySnap = await getDocs(q);
  const ledgerDocs = querySnap.docs.map(doc => doc.data());

  const tourRef = doc(db, "v3_tournaments", tournamentId);
  const tourSnap = await getDoc(tourRef);
  if (!tourSnap.exists()) {
    console.log("No tournament");
    return;
  }
  const tourData = normalizeFirestoreData(tourSnap.data() as any);
  const distances = tourData.distances || [];
  const rawBaseAthletes = tourData.athletes || [];
  
  const seenIds = new Set<string>();
  const baseAthletes = rawBaseAthletes.filter((ath: any) => {
    if (!ath || !ath.id) return false;
    if (seenIds.has(ath.id)) return false;
    seenIds.add(ath.id);
    return true;
  });

  const tieBreakRule = tourData.tieBreakRule || "highest_distance_multiplier";
  const shotsCount = tourData.shotsCount || 10;
  const isDirectMode = shotsCount === 1;
  const effectiveShotsCount = isDirectMode ? (tourData.directMaxShots || 10) : shotsCount;
  const effectiveDirectMaxPoints = tourData.directMaxPoints;
  const effectiveDirectMaxShots = tourData.directMaxShots || 10;

  const reconstructedAthletes = baseAthletes.map((baseAth: any) => {
    const ath = {
      ...baseAth,
      scores: {},
      soloHits: {},
      soloRounds: {}
    };

    distances.forEach((dist: any) => {
      const ledgerEntry = ledgerDocs.find(
        (d) => d.participantId === ath.id && d.round === dist.id
      );

      if (ledgerEntry) {
        ath.scores[dist.id] = ledgerEntry.shots || [];
        if (ledgerEntry.soloShots && Array.isArray(ledgerEntry.soloShots)) {
          ath.soloRounds = ath.soloRounds || {};
          ath.soloRounds[dist.id] = ledgerEntry.soloShots;
          ath.soloHits = ath.soloHits || {};
          ath.soloHits[dist.id] = ledgerEntry.soloShots.filter(Boolean).length;
        }
      } else {
        ath.scores[dist.id] = [];
      }
    });

    return ath;
  });

  const rankings = RankingEngine.calculate({
    athletes: reconstructedAthletes,
    distances: distances as any[],
    tieBreakRule,
    shotsCount: effectiveShotsCount,
    directMaxPoints: effectiveDirectMaxPoints,
    directMaxShots: effectiveDirectMaxShots
  });

  console.log("--- CALCULATED INDIVIDUAL RANKINGS ---");
  rankings.slice(0, 5).forEach((r) => {
    console.log(`Rank ${r.rank}: ${r.name} (id: ${r.athleteId}), Total: ${r.totalScore}, Accuracy: ${r.accuracy}`);
  });
  process.exit(0);
}

main().catch(console.error);
