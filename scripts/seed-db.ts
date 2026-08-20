import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc } from "firebase/firestore";
import * as fs from "fs";

// Load configuration
const rawConfig = fs.readFileSync("./firebase-applet-config.json", "utf-8");
const firebaseConfig = JSON.parse(rawConfig);

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

async function seed() {
  console.log("Starting Firestore Seeding...");

  // ==================== 1. SYSTEM SETTINGS ====================
  console.log("Seeding system_settings...");
  const systemSettingsDoc = {
    rankingEnabled: true,
    clubRankingEnabled: true,
    seasonEnabled: true,
    liveboardEnabled: true,
    auditEnabled: true,
    shotLogsEnabled: true,
    clubManagementEnabled: true,
    athleteProfileEnabled: true,
    publicPortalEnabled: true,
    maintenanceMode: false,
    // Part 5 specific requirements
    clubsEnabled: true,
    hallOfFameEnabled: false,
    rankingsEnabled: true,
  };
  await setDoc(doc(db, "system_settings", "vsc_config"), systemSettingsDoc);

  // ==================== 2. SEASONS ====================
  console.log("Seeding seasons...");
  const seasonDoc = {
    seasonId: "season_2026",
    name: "VSC Season 2026",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2026-12-31T23:59:59Z"),
    isActive: true,
    pointRules: {
      rank_1: 100,
      rank_2: 80,
      rank_3: 60,
      rank_4: 50,
      rank_5: 45,
      rank_6: 40,
      rank_7: 36,
      rank_8: 32,
      rank_9: 29,
      rank_10: 26,
    }
  };
  await setDoc(doc(db, "seasons", "season_2026"), seasonDoc);

  // ==================== 3. CLUBS ====================
  console.log("Seeding clubs...");
  const clubs = [
    {
      clubId: "36SC",
      clubCode: "36SC",
      clubName: "Thanh Hoa Slingshot Club (36SC)",
      shortName: "36SC",
      province: "Thanh Hóa",
      country: "Việt Nam",
      logoUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
      bannerUrl: "https://images.unsplash.com/photo-1557683316-973673baf926",
      description: "Câu lạc bộ ná cao su chính thống của tỉnh Thanh Hóa",
      leaderAthleteId: "athlete_1",
      memberCount: 4,
      stats: {
        totalPoints: 240,
        clubRanking: 1,
        tournamentCount: 1,
        podiumCount: 2
      }
    },
    {
      clubId: "HanoiSC",
      clubCode: "HANOI_SC",
      clubName: "Hanoi Slingshot Club",
      shortName: "Hanoi SC",
      province: "Hà Nội",
      country: "Việt Nam",
      logoUrl: "https://images.unsplash.com/photo-1579546929662-711aa81148cf",
      bannerUrl: "https://images.unsplash.com/photo-1557683311-eac922347aa1",
      description: "Đại diện ná cao su thủ đô Hà Nội",
      leaderAthleteId: "athlete_5",
      memberCount: 3,
      stats: {
        totalPoints: 170,
        clubRanking: 2,
        tournamentCount: 1,
        podiumCount: 1
      }
    },
    {
      clubId: "SaigonSC",
      clubCode: "SAIGON_SC",
      clubName: "Saigon Slingshot Club",
      shortName: "Saigon SC",
      province: "Hồ Chí Minh",
      country: "Việt Nam",
      logoUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc",
      bannerUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
      description: "Câu lạc bộ ná cao su miền Nam năng động",
      leaderAthleteId: "athlete_8",
      memberCount: 3,
      stats: {
        totalPoints: 130,
        clubRanking: 3,
        tournamentCount: 1,
        podiumCount: 0
      }
    }
  ];

  for (const c of clubs) {
    await setDoc(doc(db, "clubs", c.clubId), c);
  }

  // ==================== 4. USERS ====================
  console.log("Seeding users...");
  const adminUser = {
    uid: "admin_user_id",
    email: "nahnatofficial@gmail.com",
    displayName: "VSC Super Admin",
    role: "super_admin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await setDoc(doc(db, "users", "admin_user_id"), adminUser);

  // ==================== 5. ATHLETES ====================
  console.log("Seeding athletes...");
  const provinces = ["Thanh Hóa", "Hà Nội", "Hồ Chí Minh"];
  const clubIds = ["36SC", "HanoiSC", "SaigonSC"];
  
  const athletes = Array.from({ length: 10 }).map((_, i) => {
    const idx = i + 1;
    const clubId = clubIds[i % 3];
    return {
      athleteId: `athlete_${idx}`,
      vscNumber: `VSC-${2026000 + idx}`,
      fullName: `Vận Động Viên ${idx}`,
      nickname: `Xạ Thủ ${idx}`,
      gender: idx % 2 === 0 ? "Nữ" : "Nam",
      dob: `199${idx}-06-15`,
      avatarUrl: `https://images.unsplash.com/photo-${1535713875002 + idx * 1000}-d1d0cf377fde`,
      province: provinces[i % 3],
      country: "Việt Nam",
      clubId,
      status: "active",
      stats: {
        totalTournaments: 1,
        totalShots: 3,
        totalHits: idx % 3 === 0 ? 1 : 2,
        averageAccuracy: idx % 3 === 0 ? 33.33 : 66.67,
        highestAccuracy: idx % 3 === 0 ? 33.33 : 66.67,
        highestScore: 10 * (idx % 3 === 0 ? 1 : 2),
        longestHitStreak: idx % 3 === 0 ? 1 : 2,
        totalMatchesPlayed: 1,
        best10m: 10 * (idx % 3 === 0 ? 1 : 2),
        best12m: 8 * (idx % 3 === 0 ? 1 : 2),
        best15m: 5 * (idx % 3 === 0 ? 1 : 2),
        bestTournamentId: "tournament_1"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  for (const a of athletes) {
    await setDoc(doc(db, "athletes", a.athleteId), a);
  }

  // ==================== 6. TOURNAMENTS ====================
  console.log("Seeding tournaments...");
  const tournamentDoc = {
    tournamentId: "tournament_1",
    seasonId: "season_2026",
    title: "Giải Vô Địch Ná Cao Su Quốc Gia VSC 2026",
    description: "Giải đấu chính quy quy tụ các xạ thủ hàng đầu toàn quốc tranh tài ở cả 3 cự ly.",
    type: "paper_target",
    level: "national",
    format: "individual",
    location: "Sân vận động Quốc gia Mỹ Đình",
    province: "Hà Nội",
    startDate: new Date("2026-07-10T08:00:00Z"),
    endDate: new Date("2026-07-12T18:00:00Z"),
    status: "active",
    organizerId: "admin_user_id",
    distances: [10, 12, 15],
    rounds: ["Qualification", "Semi Final", "Final"],
    teamMode: false,
    config: {
      maxEntries: 100,
      refereeCount: 5,
      lanesCount: 10
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await setDoc(doc(db, "tournaments", "tournament_1"), tournamentDoc);

  // ==================== 7. TOURNAMENT ENTRIES ====================
  console.log("Seeding tournament_entries...");
  const entries = athletes.map((a, i) => {
    const idx = i + 1;
    return {
      entryId: `entry_${idx}`,
      tournamentId: "tournament_1",
      athleteId: a.athleteId,
      laneNumber: idx, // Assign laneNumber
      status: "checked_in",
      currentProgress: {
        currentRoundId: "Qualification",
        currentDistance: 10,
        currentShotIndex: 3
      },
      realtimeStats: {
        currentScore: idx % 3 === 0 ? 10 : 20,
        accuracy: idx % 3 === 0 ? 33.33 : 66.67,
        currentStreak: idx % 3 === 0 ? 1 : 2,
        highestStreak: idx % 3 === 0 ? 1 : 2,
        shotsFired: 3,
        shotsRemaining: 17
      },
      registeredAt: new Date(),
      checkedInAt: new Date(),
      updatedAt: new Date()
    };
  });

  for (const e of entries) {
    await setDoc(doc(db, "tournament_entries", e.entryId), e);
  }

  // ==================== 8. SHOT LOGS ====================
  console.log("Seeding shot_logs...");
  // Create 3 shots per athlete = 30 shot logs
  const shotLogs = [];
  for (let i = 0; i < 10; i++) {
    const idx = i + 1;
    const athleteId = `athlete_${idx}`;
    
    // Shot 1
    shotLogs.push({
      shotId: `shot_log_${idx}_1`,
      tournamentId: "tournament_1",
      athleteId,
      roundId: "Qualification",
      distance: 10,
      laneNumber: idx,
      shotIndex: 1,
      score: 10,
      result: "hit",
      streakAtMoment: 1,
      refereeId: "admin_user_id",
      timestamp: new Date()
    });

    // Shot 2
    shotLogs.push({
      shotId: `shot_log_${idx}_2`,
      tournamentId: "tournament_1",
      athleteId,
      roundId: "Qualification",
      distance: 10,
      laneNumber: idx,
      shotIndex: 2,
      score: idx % 3 === 0 ? 0 : 10,
      result: idx % 3 === 0 ? "miss" : "hit",
      streakAtMoment: idx % 3 === 0 ? 0 : 2,
      refereeId: "admin_user_id",
      timestamp: new Date()
    });

    // Shot 3
    shotLogs.push({
      shotId: `shot_log_${idx}_3`,
      tournamentId: "tournament_1",
      athleteId,
      roundId: "Qualification",
      distance: 10,
      laneNumber: idx,
      shotIndex: 3,
      score: 10,
      result: "hit",
      streakAtMoment: idx % 3 === 0 ? 1 : 3,
      refereeId: "admin_user_id",
      timestamp: new Date()
    });
  }

  for (const s of shotLogs) {
    await setDoc(doc(db, "shot_logs", s.shotId), s);
  }

  // ==================== 9. TOURNAMENT RESULTS ====================
  console.log("Seeding tournament_results...");
  const results = athletes.map((a, i) => {
    const idx = i + 1;
    // We award ranks sequentially based on entry idx
    return {
      resultId: `result_${idx}`,
      tournamentId: "tournament_1",
      seasonId: "season_2026",
      athleteId: a.athleteId,
      rank: idx,
      score: idx % 3 === 0 ? 10 : 20,
      accuracy: idx % 3 === 0 ? 33.33 : 66.67,
      seasonPointsEarned: idx === 1 ? 100 : idx === 2 ? 80 : idx === 3 ? 60 : 50 - idx * 2,
      createdAt: new Date()
    };
  });

  for (const r of results) {
    await setDoc(doc(db, "tournament_results", r.resultId), r);
  }

  // ==================== 10. RANKINGS ====================
  console.log("Seeding rankings...");
  const rankings = athletes.map((a, i) => {
    const idx = i + 1;
    return {
      rankingId: `rank_${idx}`,
      seasonId: "season_2026",
      athleteId: a.athleteId,
      clubId: a.clubId,
      totalPoints: idx === 1 ? 100 : idx === 2 ? 80 : idx === 3 ? 60 : 50 - idx * 2,
      rank: idx,
      previousRank: idx + 1 <= 10 ? idx + 1 : idx,
      rankMovement: 1,
      tournamentsPlayed: 1,
      averageAccuracy: idx % 3 === 0 ? 33.33 : 66.67,
      medalsCalculated: {
        gold: idx === 1 ? 1 : 0,
        silver: idx === 2 ? 1 : 0,
        bronze: idx === 3 ? 1 : 0
      },
      updatedAt: new Date()
    };
  });

  for (const r of rankings) {
    await setDoc(doc(db, "rankings", r.rankingId), r);
  }

  // ==================== 11. REFEREE ASSIGNMENTS ====================
  console.log("Seeding referee_assignments...");
  const assignments = Array.from({ length: 10 }).map((_, i) => {
    const idx = i + 1;
    return {
      assignmentId: `assignment_${idx}`,
      tournamentId: "tournament_1",
      laneNumber: idx,
      roundId: "Qualification",
      refereeId: "admin_user_id",
      createdAt: new Date()
    };
  });

  for (const as of assignments) {
    await setDoc(doc(db, "referee_assignments", as.assignmentId), as);
  }

  // ==================== 12. AUDIT LOGS ====================
  console.log("Seeding audit_logs...");
  const auditLog = {
    logId: "log_1",
    userId: "admin_user_id",
    userRole: "super_admin" as const,
    action: "UPDATE_CONFIG",
    targetCollection: "system_settings",
    targetDocumentId: "vsc_config",
    oldData: null,
    newData: { liveboardEnabled: true, rankingsEnabled: true },
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: new Date()
  };
  await setDoc(doc(db, "audit_logs", "log_1"), auditLog);

  console.log("Firestore Seeding Completed Successfully!");
}

seed().catch((err) => {
  console.error("Seeding Failed:", err);
  process.exit(1);
});
