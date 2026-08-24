import React, { useState, useEffect, useMemo } from "react";
import { 
  Trophy, 
  Search, 
  Calendar, 
  Star, 
  Award, 
  Sparkles, 
  User, 
  Clock, 
  Shield, 
  X,
  MapPin,
  Flame,
  AwardIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RankingEngine } from "../engines/rankingEngine";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getCleanVscNumber } from "../utils/athleteUtils";

const AVATAR_MALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e2e8f0'/><circle cx='50' cy='38' r='20' fill='%23475569'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23475569'/></svg>";
const AVATAR_FEMALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fce7f3'/><circle cx='50' cy='38' r='20' fill='%23db2777'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23db2777'/></svg>";
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80";
const DEFAULT_CLUB_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e0e7ff'/><path d='M30 30h40v40H30z' fill='%234f46e5'/><path d='M40 40h20v20H40z' fill='%23ffffff'/></svg>";

interface HallOfFameEntry {
  id: string;
  hallOfFameId: string;
  seasonId: string;
  athleteId: string;
  clubId?: string;
  awardType: string;
  awardTitle: string;
  description: string;
  imageUrl?: string;
  achievedAt: any;
}

interface MappedHallOfFameEntry extends HallOfFameEntry {
  athlete: any | null;
  tournament: any | null;
}

export function HallOfFameTab() {
  const [hallOfFameList, setHallOfFameList] = useState<HallOfFameEntry[]>([]);
  const [athletesMap, setAthletesMap] = useState<Record<string, any>>({});
  const [tournamentsMap, setTournamentsMap] = useState<Record<string, any>>({});
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [clubsMap, setClubsMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedAwardType, setSelectedAwardType] = useState("all");
  const [selectedCard, setSelectedCard] = useState<MappedHallOfFameEntry | null>(null);

  // 1. Subscribe to Hall of Fame data
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "hall_of_fame"), orderBy("achievedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: HallOfFameEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as HallOfFameEntry);
      });
      setHallOfFameList(list);
      setIsLoading(false);
    }, (err) => {
      console.error("Error subscribing to hall of fame:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Athletes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "athletes"), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const record = { 
          id: doc.id, 
          ...data,
          avatarUrl: data.avatarUrl || data.avatar || ""
        };
        map[doc.id] = record;
        if (data.athleteId) {
          map[data.athleteId] = record;
        }
      });
      setAthletesMap(map);
    }, (err) => {
      console.error("Error subscribing to athletes:", err);
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Tournaments
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "v3_tournaments"), (snapshot) => {
      const map: Record<string, any> = {};
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = { id: doc.id, ...data };
        map[doc.id] = item;
        if (data.tournamentId) {
          map[data.tournamentId] = item;
        }
        list.push(item);
      });
      setTournamentsMap(map);
      setTournamentsList(list);
    }, (err) => {
      console.error("Error subscribing to tournaments:", err);
    });

    return () => unsubscribe();
  }, []);

  // 3b. Subscribe to Clubs from Firestore (Never fallback to LocalStorage)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "clubs"), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = { id: doc.id, ...data };
        map[doc.id] = item;
        if (data.clubName) {
          map[data.clubName] = item;
        }
        if (data.clubId) {
          map[data.clubId] = item;
        }
        if (data.name) {
          map[data.name] = item;
        }
      });
      setClubsMap(map);
    }, (err) => {
      console.error("Error subscribing to clubs:", err);
    });

    return () => unsubscribe();
  }, []);

  // Helper to translate club ID / symbol into official club name from database
  const getClubName = (clubIdOrName: string | undefined) => {
    if (!clubIdOrName) return "Vận Động Viên Tự Do";
    const clean = clubIdOrName.trim();
    if (
      clean.toLowerCase() === "free" || 
      clean.toLowerCase() === "tự do" || 
      clean.toLowerCase() === "vđv tự do" || 
      clean.toLowerCase() === "tu do"
    ) {
      return "Vận Động Viên Tự Do";
    }
    
    // 1. Exact match in clubsMap
    if (clubsMap[clean]) {
      const c = clubsMap[clean];
      return c.clubName || c.name || c.fullName || clean;
    }
    
    // 2. Search values inside clubsMap
    const matched = Object.values(clubsMap).find(
      (c: any) => c.id === clean || c.clubId === clean || c.clubName === clean || c.name === clean
    );
    if (matched) {
      return matched.clubName || matched.name || matched.fullName || clean;
    }
    
    // 3. Fallback check for long generated IDs or numbers
    if (clean.startsWith("club-") || (/^\d+$/.test(clean) && clean.length > 5) || (clean.includes("-") && clean.length > 10)) {
      return "Vận Động Viên Tự Do";
    }
    return clean;
  };

  const parseLocalAvatar = (avatarUrl: string | undefined | null, fallbackId: string) => {
    if (!avatarUrl || typeof avatarUrl !== "string") return avatarUrl || null;
    if (avatarUrl.startsWith("local-avatar:")) {
      const id = avatarUrl.split(":")[1] || fallbackId;
      try {
        const stored = localStorage.getItem(`vsc-avatar-${id}`);
        return stored || null;
      } catch (e) {
        console.warn("Failed to get local avatar in HallOfFameTab parseLocalAvatar helper", e);
        return null;
      }
    }
    return avatarUrl;
  };

  // 4. Map records with Athlete & Tournament details
  const mappedList = useMemo<MappedHallOfFameEntry[]>(() => {
    const list: MappedHallOfFameEntry[] = [];
    const existingKeys = new Set<string>();

    const findMasterAthlete = (id: string, name?: string) => {
      if (!id) return null;
      if (athletesMap[id]) return athletesMap[id];
      const idLower = id.toLowerCase();
      const matched = Object.values(athletesMap).find((ath: any) => {
        if (!ath) return false;
        if (ath.id && ath.id.toLowerCase() === idLower) return true;
        if (ath.athleteId && ath.athleteId.toLowerCase() === idLower) return true;
        if (ath.vscNumber && ath.vscNumber.toLowerCase() === idLower) return true;
        if (name && ath.fullName && ath.fullName.trim().toLowerCase() === name.trim().toLowerCase()) return true;
        return false;
      });
      return matched || null;
    };

    for (const item of hallOfFameList) {
      // 1. FILTER: Filter out any Hall of Fame entries with 0 points/scores
      const desc = (item.description || "").toLowerCase();
      if (
        desc.includes("tổng điểm 0") || 
        desc.includes("tổng điểm 0.0") || 
        desc.includes("với 0 điểm") ||
        desc.includes("điểm số: 0") ||
        desc.endsWith("điểm 0.") ||
        desc.endsWith("điểm 0")
      ) {
        continue;
      }

      // 2. Find tournament strictly by ID extracted from hallOfFameId
      let tournament = null;
      let tId = "";
      if (item.hallOfFameId) {
        const parts = item.hallOfFameId.split("_");
        // hof_[tournamentId]_[athleteId]
        if (parts[0] === "hof" && parts.length >= 3) {
          tId = parts.slice(1, parts.length - 1).join("_");
          if (tId.endsWith("_ind")) {
            tId = tId.slice(0, -4);
          } else if (tId.endsWith("_team")) {
            tId = tId.slice(0, -5);
          }
          if (tournamentsMap[tId]) {
            tournament = tournamentsMap[tId];
          }
        }

        // Support dashed/hyphenated legacy v2 formats: hof-${seasonId}-${tournamentId}
        if (!tournament) {
          const dashParts = item.hallOfFameId.split("-");
          if (dashParts[0] === "hof" && dashParts.length >= 3) {
            tId = dashParts.slice(2).join("-");
            if (tournamentsMap[tId]) {
              tournament = tournamentsMap[tId];
            }
          }
        }
      }

      // Fallback matching strictly matching the complete pattern: hof_${tId}_${item.athleteId}
      if (!tournament && item.hallOfFameId && item.athleteId) {
        const exactTId = Object.keys(tournamentsMap).find(
          tId => item.hallOfFameId === `hof_${tId}_${item.athleteId}`
        );
        if (exactTId) {
          tournament = tournamentsMap[exactTId];
        }
      }

      // CRITICAL: Filter out achievements of deleted tournaments (where tournament is not found in the active list)
      if (!tournament) {
        continue;
      }

      // Direct Master Athlete lookup with robust search
      let athlete = findMasterAthlete(item.athleteId);
      
      // If direct lookup fails (e.g. athleteId is a tournament participantId like reg-... or vdv-...),
      // search for a participant record in the subscribed tournaments (checking both individual and team lists)
      if (!athlete && tournamentsList.length > 0) {
        for (const t of tournamentsList) {
          const listToCheck = [
            ...(Array.isArray(t.athletes) ? t.athletes : []),
            ...(Array.isArray(t.teamAthletes) ? t.teamAthletes : [])
          ];
          const foundParticipant = listToCheck.find(
            (p: any) => p && (
              p.participantId === item.athleteId || 
              p.id === item.athleteId || 
              p.masterAthleteId === item.athleteId
            )
          );
          if (foundParticipant) {
            const masterId = foundParticipant.masterAthleteId || foundParticipant.id || foundParticipant.participantId;
            athlete = findMasterAthlete(masterId, foundParticipant.fullName || foundParticipant.name);
            
            if (!athlete && foundParticipant.vscNumber) {
              athlete = findMasterAthlete(foundParticipant.vscNumber);
            }

            if (!athlete) {
              // Construct a fallback athlete profile from participant snapshot
              athlete = {
                id: masterId,
                athleteId: masterId,
                fullName: foundParticipant.fullName || foundParticipant.name,
                vscNumber: foundParticipant.vscNumber || foundParticipant.idCard || foundParticipant.bibNumber || "",
                gender: foundParticipant.gender || "Nam",
                clubId: foundParticipant.clubId || foundParticipant.clubName || item.clubId || "VĐV Tự do",
                avatarUrl: parseLocalAvatar(foundParticipant.avatarUrl, masterId),
                status: "active"
              };
            }
            break;
          }
        }
      }

      // Fallback for team awards if direct/indirect athlete lookup failed
      const isEntryIndividual = !(item.awardType?.includes("team") || item.hallOfFameId?.includes("_team_"));
      if (!isEntryIndividual && !athlete) {
        athlete = {
          id: item.athleteId,
          athleteId: item.athleteId,
          fullName: item.clubId || item.athleteId || "Đồng Đội VSC",
          vscNumber: "",
          gender: "Cả hai",
          clubId: item.clubId || "VĐV Tự do",
          avatarUrl: parseLocalAvatar(item.imageUrl, item.athleteId),
          status: "active"
        };
      }

      // CRITICAL FILTER: Skip this entry if the athlete is a deleted test athlete or cannot be resolved to an active athlete (prevents showing fake 'Xạ Thủ VSC' fallback cards)
      if (!athlete || athlete.fullName === "Xạ Thủ VSC") {
        continue;
      }

      // 5. Dynamic Clean description and awardTitle using active tournament details (filters out any stale "(Bản sao)" or old names)
      let awardTitle = item.awardTitle || "";
      let description = item.description || "";

      if (tournament) {
        const currentTourName = tournament.tournamentName || tournament.title || "";
        
        // Compute correct score dynamically based on archived tournament data and survival rules
        let survivalScoreVal: number | null = null;
        let totalScoreVal: number | null = null;
        try {
          const isEntryIndividual = !(item.awardType?.includes("team") || item.hallOfFameId?.includes("_team_"));
          
          if (isEntryIndividual) {
            const spi = tournament.savedPodiumIndividual;
            if (Array.isArray(spi) && spi.length > 0) {
              const matchId = item.athleteId;
              const foundInPodium = spi.find(
                (p: any) => p && (
                  p.athleteId === matchId || 
                  p.id === matchId || 
                  p.originalAthlete?.masterAthleteId === matchId || 
                  p.originalAthlete?.id === matchId
                )
              );
              if (foundInPodium) {
                survivalScoreVal = foundInPodium.survivalScore !== undefined && foundInPodium.survivalScore !== null ? Number(foundInPodium.survivalScore) : null;
                totalScoreVal = foundInPodium.allRoundTotalScore !== undefined && foundInPodium.allRoundTotalScore !== null 
                  ? Number(foundInPodium.allRoundTotalScore) 
                  : (foundInPodium.totalScore !== undefined && foundInPodium.totalScore !== null ? Number(foundInPodium.totalScore) : null);
              }
            }
          } else {
            const spt = tournament.savedPodiumTeam;
            if (Array.isArray(spt) && spt.length > 0) {
              const matchId = item.athleteId;
              const foundInPodium = spt.find(
                (p: any) => p && (
                  p.athleteId === matchId || 
                  p.id === matchId || 
                  p.teamId === matchId || 
                  p.team === matchId
                )
              );
              if (foundInPodium) {
                totalScoreVal = foundInPodium.totalScore !== undefined && foundInPodium.totalScore !== null ? Number(foundInPodium.totalScore) : null;
              }
            }
          }

          if (survivalScoreVal === null && totalScoreVal === null) {
            const tourDistances = isEntryIndividual ? (tournament.distances || []) : (tournament.teamDistances || []);
            const tourAthletes = isEntryIndividual ? (tournament.athletes || []) : (tournament.teamAthletes || []);

            if (tourDistances.length > 0 && tourAthletes.length > 0) {
              const calculatedRankings = RankingEngine.calculate({
                athletes: tourAthletes,
                distances: tourDistances as any[],
                tieBreakRule: tournament.tieBreakRule || "highest_distance_multiplier",
                shotsCount: isEntryIndividual ? (tournament.shotsCount || 10) : (tournament.teamShotsCount || 10),
                directMaxPoints: isEntryIndividual ? tournament.directMaxPoints : tournament.teamDirectMaxPoints,
                directMaxShots: isEntryIndividual ? tournament.directMaxShots : tournament.teamDirectMaxShots
              });

              const matchId = item.athleteId;
              const foundRanked = calculatedRankings.find(
                (r) => r.athleteId === matchId || r.originalAthlete?.masterAthleteId === matchId || r.originalAthlete?.id === matchId
              );

              if (foundRanked) {
                survivalScoreVal = isEntryIndividual && foundRanked.survivalScore !== undefined ? foundRanked.survivalScore : null;
                totalScoreVal = foundRanked.totalScore !== undefined ? foundRanked.totalScore : null;
              }
            }
          }
        } catch (calcErr) {
          console.error("Error computing correct score for Hall of Fame card:", calcErr);
        }

        // Determine proper title prefix (Check Á quan 1 & Á quan 2 first, then Vô địch / champion!)
        const isEntryIndividual = !(item.awardType?.includes("team") || item.hallOfFameId?.includes("_team_"));
        let titlePrefix = "Vinh danh";
        const cleanTitle = awardTitle.toLowerCase();
        const cleanDesc = description.toLowerCase();

        if (cleanTitle.includes("á quan 1") || cleanDesc.includes("á quan 1") || item.awardType === "runner_up_1") {
          titlePrefix = "Á quan 1";
        } else if (cleanTitle.includes("á quan 2") || cleanDesc.includes("á quan 2") || item.awardType === "runner_up_2") {
          titlePrefix = "Á quan 2";
        } else if (cleanTitle.includes("vô địch") || cleanDesc.includes("vô địch") || cleanTitle.includes("champion") || item.awardType === "champion") {
          titlePrefix = isEntryIndividual ? "Vô địch" : "Team Vô địch";
        }

        awardTitle = `${titlePrefix} - ${currentTourName}`;

        if (survivalScoreVal !== null && totalScoreVal !== null && survivalScoreVal !== totalScoreVal && survivalScoreVal !== 0 && totalScoreVal !== 0) {
          description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} với điểm: ${survivalScoreVal} / Tổng cộng: ${totalScoreVal} điểm.`;
        } else if (totalScoreVal !== null && totalScoreVal !== 0) {
          description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} với tổng điểm ${totalScoreVal} điểm.`;
        } else if (survivalScoreVal !== null && survivalScoreVal !== 0) {
          description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} với tổng điểm ${survivalScoreVal} điểm.`;
        } else {
          const scoreMatch = item.description?.match(/tổng điểm ([\d\.,]+)/i) || item.description?.match(/điểm: ([\d\.,]+)/i);
          if (scoreMatch && scoreMatch[1]) {
            description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} với tổng điểm ${scoreMatch[1]} điểm.`;
          } else {
            description = item.description || `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName}.`;
          }
        }
      }

      list.push({
        ...item,
        awardTitle,
        description,
        athlete,
        tournament
      });

      if (tournament && item.athleteId && item.awardType) {
        existingKeys.add(`${tournament.id}_${item.athleteId}_${item.awardType}`);
        if (item.awardType === "champion" || item.awardType === "national_champion" || item.awardType === "season_champion") {
          existingKeys.add(`${tournament.id}_${item.athleteId}_is_champion`);
        }
      }
    }

    // Dynamic Backfill of individual runners-up (1st and 2nd runner up / silver and bronze) from stored tournament's savedPodiumIndividual
    for (const t of tournamentsList) {
      if (t.status === "completed" || t.status === "archived") {
        const spi = t.savedPodiumIndividual;
        if (Array.isArray(spi) && spi.length > 0) {
          spi.forEach((podiumItem, idx) => {
            if (!podiumItem) return;
            const athleteId = podiumItem.athleteId || podiumItem.id;
            if (!athleteId) return;

            // Map rank index to award type and title prefix
            let awardType = "champion";
            let titlePrefix = "Vô địch";
            if (idx === 1) {
              awardType = "runner_up_1";
              titlePrefix = "Á quan 1";
            } else if (idx === 2) {
              awardType = "runner_up_2";
              titlePrefix = "Á quan 2";
            } else if (idx > 2) {
              return; // Skip beyond top 3
            }

            const isChamp = idx === 0;
            const champKey = `${t.id}_${athleteId}_is_champion`;
            const key = `${t.id}_${athleteId}_${awardType}`;

            const checkExists = isChamp ? (existingKeys.has(champKey) || existingKeys.has(key)) : existingKeys.has(key);

            if (!checkExists) {
              // Resolve fallback athlete info
              const originalAthlete = podiumItem.originalAthlete;
              let resolvedAthlete = findMasterAthlete(athleteId, podiumItem.name);

              if (!resolvedAthlete && originalAthlete) {
                const masterId = originalAthlete.masterAthleteId || originalAthlete.id;
                resolvedAthlete = findMasterAthlete(masterId, originalAthlete.name || podiumItem.name);
                
                if (!resolvedAthlete && originalAthlete.vscNumber) {
                  resolvedAthlete = findMasterAthlete(originalAthlete.vscNumber);
                }

                if (!resolvedAthlete) {
                  resolvedAthlete = {
                    id: originalAthlete.id,
                    athleteId: masterId,
                    fullName: originalAthlete.name || podiumItem.name,
                    vscNumber: originalAthlete.vscNumber || "",
                    gender: originalAthlete.gender || "Nam",
                    clubId: originalAthlete.team || podiumItem.team || "VĐV Tự do",
                    avatarUrl: parseLocalAvatar(originalAthlete.avatarUrl, masterId),
                    status: "active"
                  };
                }
              }

              if (!resolvedAthlete) {
                resolvedAthlete = {
                  id: athleteId,
                  athleteId: athleteId,
                  fullName: podiumItem.name || "Xạ Thủ VSC",
                  vscNumber: "",
                  gender: "Nam",
                  clubId: podiumItem.team || "VĐV Tự do",
                  avatarUrl: parseLocalAvatar(podiumItem.avatarUrl || podiumItem.photoURL || podiumItem.avatar, athleteId),
                  status: "active"
                };
              }

              // Determine description and score
              const survivalScoreVal = podiumItem.survivalScore !== undefined && podiumItem.survivalScore !== null ? Number(podiumItem.survivalScore) : null;
              const totalScoreVal = podiumItem.allRoundTotalScore !== undefined && podiumItem.allRoundTotalScore !== null 
                ? Number(podiumItem.allRoundTotalScore) 
                : (podiumItem.totalScore !== undefined && podiumItem.totalScore !== null ? Number(podiumItem.totalScore) : null);
              
              let description = "";
              const currentTourName = t.tournamentName || t.title || "Giải đấu VSC";
              if (survivalScoreVal !== null && totalScoreVal !== null && survivalScoreVal !== totalScoreVal && survivalScoreVal !== 0 && totalScoreVal !== 0) {
                description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} với điểm: ${survivalScoreVal} / Tổng cộng: ${totalScoreVal} điểm.`;
              } else if (totalScoreVal !== null && totalScoreVal !== 0) {
                description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} with tổng điểm ${totalScoreVal} điểm.`;
              } else if (survivalScoreVal !== null && survivalScoreVal !== 0) {
                description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName} with tổng điểm ${survivalScoreVal} điểm.`;
              } else {
                description = `Đạt giải ${titlePrefix} tại giải đấu ${currentTourName}.`;
              }

              list.push({
                id: `synthetic_${t.id}_${athleteId}_${awardType}`,
                hallOfFameId: `hof_${t.id}_ind_${awardType}`,
                seasonId: t.seasonId || "2026",
                athleteId,
                clubId: podiumItem.team || "VĐV Tự do",
                awardType,
                awardTitle: `${titlePrefix} - ${currentTourName}`,
                description,
                imageUrl: parseLocalAvatar(originalAthlete?.avatarUrl, athleteId) || "",
                achievedAt: t.archivedAt || t.updatedAt || new Date().toISOString(),
                athlete: resolvedAthlete,
                tournament: t
              });

              existingKeys.add(key);
              if (isChamp) {
                existingKeys.add(champKey);
              }
            }
          });
        }
      }
    }

    return list;
  }, [hallOfFameList, athletesMap, tournamentsMap, tournamentsList]);

  // 5. Distinct seasons list
  const seasons = useMemo(() => {
    const s = new Set<string>();
    mappedList.forEach((item) => {
      if (item.seasonId) s.add(item.seasonId);
    });
    return Array.from(s).sort();
  }, [mappedList]);

  // 6. Filtered List
  const filteredList = useMemo(() => {
    return mappedList.filter((item) => {
      const athleteName = item.athlete?.fullName || "";
      const athleteNickname = item.athlete?.nickname || "";
      const vscNum = item.athlete?.vscNumber || "";
      const rClub = getClubName(item.athlete?.clubId || item.athlete?.clubName || item.clubId);
      
      const matchesSearch = 
        item.athleteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athleteNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vscNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.awardTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rClub.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSeason = selectedSeason === "all" || item.seasonId === selectedSeason;
      const matchesAwardType = selectedAwardType === "all" || item.awardType === selectedAwardType;

      return matchesSearch && matchesSeason && matchesAwardType;
    });
  }, [mappedList, searchQuery, selectedSeason, selectedAwardType, clubsMap]);

  // Highlight Stats
  const stats = useMemo(() => {
    const totalHonored = mappedList.length;
    const uniqueAthletes = new Set(mappedList.map(item => {
      return item.athlete?.fullName || item.athleteId;
    })).size;
    
    // Find club with most honors - strictly from system clubs, never "Vận Động Viên Tự Do" / "free"
    const clubCount: { [key: string]: number } = {};
    mappedList.forEach(item => {
      const clubIdOrName = item.clubId || item.athlete?.clubId || item.athlete?.clubName;
      if (clubIdOrName) {
        const resolvedName = getClubName(clubIdOrName);
        if (resolvedName && resolvedName !== "Vận Động Viên Tự Do") {
          clubCount[resolvedName] = (clubCount[resolvedName] || 0) + 1;
        }
      }
    });
    
    let topClub = "N/A";
    let maxClubHonors = 0;
    Object.entries(clubCount).forEach(([club, count]) => {
      if (count > maxClubHonors) {
        maxClubHonors = count;
        topClub = club;
      }
    });

    return {
      totalHonored,
      uniqueAthletes,
      topClub: topClub === "N/A" ? "Không có" : topClub
    };
  }, [mappedList, clubsMap]);

  const getAwardTypeLabel = (type: string, description?: string, title?: string, isTeam?: boolean) => {
    const text = ((description || "") + " " + (title || "")).toLowerCase();
    
    if (text.includes("á quan 1") || text.includes("hạng 2") || text.includes("giải nhì") || text.includes("á quân một") || type === "runner_up_1") {
      return "Á Quân 1";
    }
    if (text.includes("á quan 2") || text.includes("hạng 3") || text.includes("giải ba") || text.includes("á quân hai") || type === "runner_up_2") {
      return "Á Quân 2";
    }
    if (text.includes("vô địch") || text.includes("giải nhất") || text.includes("hạng 1") || text.includes("quán quân") || type === "champion") {
      return isTeam ? "Team Vô Địch" : "Vô Địch / Nhất";
    }

    if (!type) return "Vinh Danh";
    const t = type.toLowerCase();
    if (t === "national_champion" || t.includes("national_champion")) return "Vô Địch Quốc Gia";
    if (t === "season_champion" || t.includes("season_champion")) return "Vô Địch Mùa Giải";
    if (t.includes("champion")) return isTeam ? "Team Vô Địch" : "Vô Địch / Nhất";
    if (t.includes("runner") || t.includes("runner_up")) return "Á Quân";
    if (t.includes("record")) return "Kỷ Lục Gia";
    return "Xạ Thủ Ưu Tú";
  };

  const getCardColorClass = (type: string, description?: string, title?: string) => {
    const text = ((description || "") + " " + (title || "")).toLowerCase();
    if (text.includes("á quan 1") || text.includes("hạng 2") || text.includes("nhì") || type === "runner_up_1") {
      return "bg-slate-50/70 border-slate-400/30 dark:bg-slate-900/20";
    }
    if (text.includes("á quan 2") || text.includes("hạng 3") || text.includes("ba") || type === "runner_up_2") {
      return "bg-orange-50/70 border-orange-500/30 dark:bg-orange-950/10";
    }
    const t = type.toLowerCase();
    if (t === "national_champion" || t.includes("champion")) {
      return "bg-amber-50/70 border-amber-500/30 dark:bg-amber-950/20";
    }
    if (t.includes("runner")) {
      return "bg-slate-50/70 border-slate-400/30 dark:bg-slate-900/20";
    }
    return "bg-blue-50/70 border-blue-500/30 dark:bg-blue-950/20";
  };

  const getBadgeBg = (type: string, description?: string, title?: string) => {
    const text = ((description || "") + " " + (title || "")).toLowerCase();
    if (text.includes("á quan 1") || text.includes("hạng 2") || text.includes("nhì") || type === "runner_up_1") {
      return "bg-gradient-to-r from-slate-500 to-zinc-600 text-white shadow-slate-500/20";
    }
    if (text.includes("á quan 2") || text.includes("hạng 3") || text.includes("ba") || type === "runner_up_2") {
      return "bg-gradient-to-r from-amber-700 to-amber-800 text-white shadow-amber-700/20";
    }
    const t = type.toLowerCase();
    if (t === "national_champion" || t.includes("champion")) {
      return "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-amber-500/20";
    }
    if (t.includes("runner")) {
      return "bg-gradient-to-r from-slate-500 to-zinc-600 text-white shadow-slate-500/20";
    }
    return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/20";
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-4 animate-fadeIn" id="hall-of-fame-panel">
      
      {/* 1. HERO BRAND BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-10 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]" />
        
        {/* Abstract Background Elements */}
        <div className="absolute -right-16 -bottom-16 opacity-10 select-none pointer-events-none">
          <Trophy className="w-96 h-96 text-yellow-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              ĐẠI SẢNH DANH VỌNG CHÍNH THỨC VSC
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight font-sans">
              HALL OF FAME
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed font-sans">
              Nơi ghi nhận vĩnh viễn những xạ thủ xuất sắc nhất lịch sử Slingshot Việt Nam, các nhà vô địch, á quân quốc gia và kỷ lục gia đã lập nên những thành tựu phi thường.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. STATS SUMMARIES ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="hof-stats-row">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 block">Lượt vinh danh</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">{stats.totalHonored}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 block">Số lượng xạ thủ</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">{stats.uniqueAthletes}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 block">Đơn vị xuất sắc nhất</span>
            <span className="text-lg font-black text-slate-900 dark:text-white block mt-1 truncate max-w-[180px]">{stats.topClub}</span>
          </div>
        </div>

      </div>

      {/* 3. SEARCH & CONTROLS BOX */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 shadow-3xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên xạ thủ, mã VĐV, giải đấu, đơn vị..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all"
            id="hof-search-input"
          />
        </div>

        {/* Season Filter */}
        <div className="relative shrink-0 w-full md:w-56">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all appearance-none cursor-pointer"
            id="hof-season-select"
          >
            <option value="all">Tất cả các mùa giải</option>
            {seasons.map((s) => (
              <option key={s} value={s}>Mùa giải {s}</option>
            ))}
          </select>
        </div>

        {/* Award Type Filter */}
        <div className="relative shrink-0 w-full md:w-56">
          <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedAwardType}
            onChange={(e) => setSelectedAwardType(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all appearance-none cursor-pointer"
            id="hof-award-select"
          >
            <option value="all">Tất cả danh hiệu</option>
            <option value="national_champion">Vô Địch Quốc Gia</option>
            <option value="season_champion">Vô Địch Mùa Giải</option>
            <option value="champion">Vô Địch / Giải Nhất</option>
            <option value="runner_up_1">Á Quân 1 / Giải Nhì</option>
            <option value="runner_up_2">Á Quân 2 / Giải Ba</option>
          </select>
        </div>

      </div>

      {/* 4. CARDS GRID */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 font-sans font-medium">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span>Đang đồng bộ dữ liệu Đại Sảnh Danh Vọng...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 font-sans p-6">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="font-extrabold text-sm text-slate-600 dark:text-slate-300">Không tìm thấy dữ liệu vinh danh phù hợp</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="hof-cards-grid">
          {filteredList.map((hof) => {
            // Check if it is a Team award or an Individual award
            const isEntryIndividual = !(hof.awardType?.includes("team") || hof.hallOfFameId?.includes("_team_"));

            const cardBg = getCardColorClass(hof.awardType, hof.description, hof.awardTitle);
            const badgeBg = getBadgeBg(hof.awardType, hof.description, hof.awardTitle);
            const label = getAwardTypeLabel(hof.awardType, hof.description, hof.awardTitle, !isEntryIndividual);

            // Fetch matched info or fallback
            const athleteName = hof.athlete?.fullName || "Xạ Thủ VSC";
            
            const clubKey = (hof.athlete?.clubId || hof.athlete?.clubName || hof.clubId || "").trim();
            const clubObj = clubsMap[clubKey] || Object.values(clubsMap).find(
              (c: any) => c.id === clubKey || c.clubId === clubKey || c.clubName === clubKey || c.name === clubKey
            );
            const clubLogo = clubObj ? (clubObj.logoUrl || clubObj.logo || null) : null;

            let athleteAvatar = hof.athlete?.avatarUrl || hof.athlete?.avatar || hof.athlete?.photoURL || null;
            if (!athleteAvatar) {
              if (!isEntryIndividual && clubLogo) {
                athleteAvatar = clubLogo;
              } else {
                athleteAvatar = hof.athlete?.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
              }
            }
            
            let vscNumber = "";
            if (isEntryIndividual) {
              vscNumber = getCleanVscNumber(
                hof.athlete?.vscNumber || hof.athlete?.idCard, 
                hof.athlete?.athleteId || hof.athleteId || hof.athlete?.id
              );
            } else {
              // Check if there is a short, clean, valid team/club ID. Otherwise, write "Team"
              const originalTeamId = hof.athlete?.vscNumber || hof.athlete?.id || hof.athleteId || "";
              const cleanTeamId = originalTeamId.replace(/^(team-|club-)/gi, "").trim().toUpperCase();
              if (cleanTeamId && !cleanTeamId.includes("-") && cleanTeamId.length <= 8 && !/^\d{10,}/.test(cleanTeamId)) {
                vscNumber = cleanTeamId;
              } else {
                vscNumber = "Team";
              }
            }
            
            const clubName = getClubName(clubKey);

            // Tournament banner
            const tourBanner = hof.tournament?.banner || DEFAULT_BANNER;

            return (
              <motion.div
                layout
                key={hof.id}
                onClick={() => setSelectedCard(hof)}
                className={`flex flex-col border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white dark:bg-slate-900/60`}
                whileHover={{ y: -4 }}
                id={`hof-card-${hof.id}`}
              >
                
                {/* 4a. TOURNAMENT BANNER BADGE OVERLAY HEADER */}
                <div className="relative h-28 w-full overflow-hidden shrink-0">
                  <img 
                    src={tourBanner} 
                    alt={hof.awardTitle} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Banner dark overlay gradient for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

                  {/* Floating Commemorative Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 font-sans font-black text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow-md z-10 bg-black/40 text-yellow-400 backdrop-blur-xs border border-yellow-400/20">
                    <Flame className="w-3 h-3 fill-current animate-pulse text-amber-500" />
                    <span>{hof.tournament?.tournamentName || hof.tournament?.title || "VSC CHAMPIONSHIP"}</span>
                  </div>

                  {/* Star backdrop subtle glow */}
                  <div className="absolute -right-3 -top-3 text-amber-500/20 select-none z-10">
                    <Star className="w-16 h-16 fill-current animate-spin-slow" />
                  </div>
                </div>

                {/* 4b. ATHLETE PROFILE GRID SECTION */}
                <div className="px-5 pb-5 pt-0 flex-1 flex flex-col relative">
                  
                  {/* Overlapping Avatar Container */}
                  <div className="flex items-end justify-between -mt-8 mb-3 relative z-10">
                    <div className="relative">
                      <img 
                        src={athleteAvatar} 
                        alt={athleteName} 
                        className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      {/* Miniature Gold Badge */}
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 border-2 border-white dark:border-slate-900 text-white rounded-full p-1 shadow-xs">
                        <Trophy className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Award Title Floating over alignment */}
                    <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm border border-black/5 ${badgeBg}`}>
                      {label}
                    </div>
                  </div>

                  {/* Identity Box */}
                  <div className="space-y-1 mb-3">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight font-sans tracking-tight flex items-center gap-1.5 flex-wrap">
                      {athleteName}
                      {hof.athlete?.nickname && (
                        <span className="text-xs text-slate-400 font-bold">({hof.athlete.nickname})</span>
                      )}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* VSC Number Badge */}
                      <span className="text-[10px] font-black tracking-wider text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 dark:bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {vscNumber}
                      </span>
                      {/* Club AFFILIATION */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                        {clubLogo ? (
                          <img 
                            src={clubLogo} 
                            alt={clubName} 
                            className="w-4 h-4 object-contain rounded" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {clubName}
                      </span>
                    </div>
                  </div>

                  {/* Achievement description text */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold italic border-l-2 border-amber-500/30 pl-3 py-0.5 my-3 flex-1 line-clamp-3">
                    "{hof.description}"
                  </p>

                  {/* Divider line */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-3" />

                  {/* Footing Meta Info */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <div className="flex items-center gap-1.5 font-sans font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mùa giải {hof.seasonId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{hof.achievedAt ? new Date(hof.achievedAt.seconds ? hof.achievedAt.seconds * 1000 : hof.achievedAt).toLocaleDateString("vi-VN") : "12/8/2026"}</span>
                    </div>
                  </div>

                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. INTERACTIVE CERTIFICATE MODEL MODAL */}
      <AnimatePresence>
        {selectedCard && (() => {
          const isModalEntryIndividual = !(selectedCard.awardType?.includes("team") || selectedCard.hallOfFameId?.includes("_team_"));
          const modalClubKey = (selectedCard.athlete?.clubId || selectedCard.athlete?.clubName || selectedCard.clubId || "").trim();
          const modalClubObj = clubsMap[modalClubKey] || Object.values(clubsMap).find(
            (c: any) => c.id === modalClubKey || c.clubId === modalClubKey || c.clubName === modalClubKey || c.name === modalClubKey
          );
          const modalClubLogo = modalClubObj ? (modalClubObj.logoUrl || modalClubObj.logo || null) : null;

          let modalAthleteAvatar = selectedCard.athlete?.avatarUrl || selectedCard.athlete?.avatar || selectedCard.athlete?.photoURL || null;
          if (!modalAthleteAvatar) {
            if (!isModalEntryIndividual && modalClubLogo) {
              modalAthleteAvatar = modalClubLogo;
            } else {
              modalAthleteAvatar = selectedCard.athlete?.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE;
            }
          }
          const modalClubName = getClubName(modalClubKey);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
                onClick={() => setSelectedCard(null)}
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden z-10 font-sans"
                id="hof-certificate-modal"
              >
                {/* Gold borders mimicking a real certificate frame */}
                <div className="absolute inset-2 border-2 border-dashed border-amber-500/20 dark:border-amber-500/30 rounded-2xl pointer-events-none" />

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center gap-6 relative z-10 py-2">
                  <Trophy className="w-16 h-16 text-amber-500 drop-shadow-[0_4px_10px_rgba(245,158,11,0.3)] animate-bounce-slow" />
                  
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 block">Vinh danh vĩnh viễn</span>
                    <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-wide">Bằng danh dự VSC</h3>
                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-2" />
                  </div>

                  {/* Athlete Image & Bio */}
                  <div className="flex flex-col items-center gap-3">
                    <img 
                      src={modalAthleteAvatar} 
                      alt={selectedCard.athlete?.fullName || "VĐV"} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-amber-500/30 shadow-md bg-slate-50"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {selectedCard.athlete?.fullName || "Xạ Thủ VSC"}
                      </h4>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {isModalEntryIndividual
                            ? getCleanVscNumber(selectedCard.athlete?.vscNumber || selectedCard.athlete?.idCard, selectedCard.athlete?.athleteId || selectedCard.athleteId || selectedCard.athlete?.id)
                            : (
                                (() => {
                                  const originalTeamId = selectedCard.athlete?.vscNumber || selectedCard.athlete?.id || selectedCard.athleteId || "";
                                  const cleanTeamId = originalTeamId.replace(/^(team-|club-)/gi, "").trim().toUpperCase();
                                  if (cleanTeamId && !cleanTeamId.includes("-") && cleanTeamId.length <= 8 && !/^\d{10,}/.test(cleanTeamId)) {
                                    return cleanTeamId;
                                  }
                                  return "Team";
                                })()
                              )
                          }
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 dark:text-slate-300">
                          {modalClubLogo ? (
                            <img 
                              src={modalClubLogo} 
                              alt={modalClubName} 
                              className="w-4 h-4 object-contain rounded" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {modalClubName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-5 w-full shadow-inner">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic leading-relaxed">
                      "{selectedCard.description}"
                    </p>
                  </div>

                  {/* Certificate Footer Columns */}
                  <div className="grid grid-cols-2 gap-4 w-full text-xs font-bold text-slate-400 dark:text-slate-500 mt-2">
                    <div className="text-left bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="text-[9px] uppercase font-black block text-slate-400">Danh hiệu</span>
                      <span className="text-slate-800 dark:text-white font-extrabold block mt-0.5 truncate">
                        {getAwardTypeLabel(
                          selectedCard.awardType, 
                          selectedCard.description, 
                          selectedCard.awardTitle, 
                          !isModalEntryIndividual
                        )}
                      </span>
                    </div>
                    <div className="text-right bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="text-[9px] uppercase font-black block text-slate-400">Ngày ghi danh</span>
                      <span className="text-slate-800 dark:text-white font-extrabold block mt-0.5">
                        {selectedCard.achievedAt ? new Date(selectedCard.achievedAt.seconds ? selectedCard.achievedAt.seconds * 1000 : selectedCard.achievedAt).toLocaleDateString("vi-VN") : "12/8/2026"}
                      </span>
                    </div>
                  </div>

                  <div className="text-[9px] font-black tracking-widest text-slate-300 dark:text-slate-600 uppercase mt-4">
                    © Vietnam Slingshot Championship Platform
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
