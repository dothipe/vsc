import React, { useState, useEffect } from "react";
import { 
  subscribeToTournamentsList,
  subscribeToVscSystemAthletes,
  subscribeToVscSystemClubs,
  subscribeToVscSystemSeasons,
  saveVscSystemSeason
} from "../lib/firebaseService";
import { 
  Trophy, 
  Calendar, 
  Plus, 
  Search, 
  ArrowLeft, 
  FileText, 
  Users, 
  Building, 
  Award, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  Sparkles,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SeasonInfo {
  seasonId: string;
  name: string;
  year: number;
  description: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "completed" | "archived";
}

const DEFAULT_SEASONS: SeasonInfo[] = [
  {
    seasonId: "season_2026",
    name: "VSC Season 2026",
    year: 2026,
    status: "active",
    description: "Mùa giải vô địch quốc gia chính thức năm 2026 với chuỗi giải đấu quy mô lớn.",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-12-31T23:59:59Z"
  },
  {
    seasonId: "season_2025",
    name: "VSC Season 2025",
    year: 2025,
    status: "completed",
    description: "Mùa giải Slingshot VSC khép lại thành công tốt đẹp với nhiều kỷ lục bắn ná được xác lập.",
    startDate: "2025-01-01T00:00:00Z",
    endDate: "2025-12-31T23:59:59Z"
  }
];

interface SeasonManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function SeasonManagement({ currentUser, userRole }: SeasonManagementProps) {
  const [seasons, setSeasons] = useState<SeasonInfo[]>(DEFAULT_SEASONS);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [masterAthletes, setMasterAthletes] = useState<any[]>([]);
  const [masterClubs, setMasterClubs] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<SeasonInfo | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonYear, setNewSeasonYear] = useState(2026);
  const [newSeasonDesc, setNewSeasonDesc] = useState("");
  const [newSeasonStart, setNewSeasonStart] = useState("2026-01-01");
  const [newSeasonEnd, setNewSeasonEnd] = useState("2026-12-31");

  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "system_owner";

  useEffect(() => {
    const unsubTournaments = subscribeToTournamentsList((data) => {
      setTournaments(data || []);
    });

    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      setMasterAthletes(data || []);
    });

    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setMasterClubs(data || []);
    });

    const unsubSeasons = subscribeToVscSystemSeasons((data) => {
      if (data && data.length > 0) {
        setSeasons(data);
      } else {
        // Seed default seasons in Firestore so they are stored directly on the Store
        DEFAULT_SEASONS.forEach((s) => {
          saveVscSystemSeason(s.seasonId, s);
        });
        setSeasons(DEFAULT_SEASONS);
      }
    });

    return () => {
      unsubTournaments();
      unsubAthletes();
      unsubClubs();
      unsubSeasons();
    };
  }, []);

  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    const newSeason: SeasonInfo = {
      seasonId: `season_${Date.now()}`,
      name: newSeasonName.trim(),
      year: Number(newSeasonYear),
      description: newSeasonDesc.trim(),
      startDate: new Date(newSeasonStart).toISOString(),
      endDate: new Date(newSeasonEnd).toISOString(),
      status: "draft"
    };

    await saveVscSystemSeason(newSeason.seasonId, newSeason);
    setShowAddModal(false);

    // Clear form
    setNewSeasonName("");
    setNewSeasonYear(2026);
    setNewSeasonDesc("");
    setNewSeasonStart("2026-01-01");
    setNewSeasonEnd("2026-12-31");
  };

  const handleStatusChange = async (seasonId: string, newStatus: "draft" | "active" | "completed" | "archived") => {
    const updated = seasons.map(s => {
      if (s.seasonId === seasonId) {
        return { ...s, status: newStatus };
      }
      if (newStatus === "active" && s.status === "active") {
        return { ...s, status: "completed" as const };
      }
      return s;
    });

    if (newStatus === "active") {
      const activeSeasons = seasons.filter(s => s.status === "active" && s.seasonId !== seasonId);
      for (const s of activeSeasons) {
        await saveVscSystemSeason(s.seasonId, { ...s, status: "completed" });
      }
    }
    const target = seasons.find(s => s.seasonId === seasonId);
    if (target) {
      const updatedTarget = { ...target, status: newStatus };
      await saveVscSystemSeason(seasonId, updatedTarget);
      if (selectedSeason && selectedSeason.seasonId === seasonId) {
        setSelectedSeason(updatedTarget);
      }
    }
  };

  const filteredSeasons = seasons.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(s.year).includes(searchQuery);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get tournaments belonging to a specific season
  const getSeasonTournaments = (seasonName: string) => {
    // Normalizes name compare (e.g., matching "VSC 2026" or "Season 2026" formats)
    return tournaments.filter(tour => {
      const tourSeasonStr = String(tour.season || "").toLowerCase();
      const matchNameStr = String(seasonName).toLowerCase();
      return tourSeasonStr.includes(matchNameStr) || matchNameStr.includes(tourSeasonStr);
    });
  };

  // Compute overall Individual Standing Points for a Season
  const getSeasonIndividualStandings = (seasonName: string) => {
    const seasonTours = getSeasonTournaments(seasonName);
    
    // Aggregate points for athletes across all tournaments of this season
    const athletePointsMap: Record<string, { athleteId: string; name: string; club: string; totalHits: number; tournamentsPlayed: number }> = {};

    seasonTours.forEach(tour => {
      const tourAthletes = tour.athletes || [];
      const distances = tour.distances || [];
      
      tourAthletes.forEach((ath: any) => {
        // Compute total hits for this tournament
        let hitsSum = 0;
        distances.forEach((d: any) => {
          const scores = ath.scores?.[d.id] || [];
          scores.forEach((s: any) => {
            if (s === true) hitsSum += 1;
            else if (typeof s === "number") hitsSum += s; // direct scoring modes
          });
        });

        const athId = ath.id || ath.athleteId;
        if (!athId) return;

        if (!athletePointsMap[athId]) {
          athletePointsMap[athId] = {
            athleteId: athId,
            name: ath.fullName || ath.name || "Xạ Thủ",
            club: ath.team || ath.clubName || "Tự do",
            totalHits: 0,
            tournamentsPlayed: 0
          };
        }

        athletePointsMap[athId].totalHits += hitsSum;
        athletePointsMap[athId].tournamentsPlayed += 1;
      });
    });

    return Object.values(athletePointsMap).sort((a, b) => b.totalHits - a.totalHits);
  };

  // Compute Team Standing Points for a Season
  const getSeasonTeamStandings = (seasonName: string) => {
    const seasonTours = getSeasonTournaments(seasonName);
    const teamPointsMap: Record<string, { clubName: string; totalHits: number; tournamentsPlayed: number }> = {};

    seasonTours.forEach(tour => {
      const tourAthletes = tour.athletes || [];
      const distances = tour.distances || [];

      tourAthletes.forEach((ath: any) => {
        const teamName = ath.team || ath.clubName || "";
        if (!teamName || teamName === "Tự do" || teamName.toLowerCase() === "free") return;

        let hitsSum = 0;
        distances.forEach((d: any) => {
          const scores = ath.scores?.[d.id] || [];
          scores.forEach((s: any) => {
            if (s === true) hitsSum += 1;
            else if (typeof s === "number") hitsSum += s;
          });
        });

        if (!teamPointsMap[teamName]) {
          teamPointsMap[teamName] = {
            clubName: teamName,
            totalHits: 0,
            tournamentsPlayed: 0
          };
        }

        teamPointsMap[teamName].totalHits += hitsSum;
      });

      // Aggregate tournament played counts for clubs
      const activeClubsInTour = new Set<string>();
      tourAthletes.forEach((ath: any) => {
        if (ath.team) activeClubsInTour.add(ath.team);
      });
      activeClubsInTour.forEach(teamName => {
        if (teamPointsMap[teamName]) {
          teamPointsMap[teamName].tournamentsPlayed += 1;
        }
      });
    });

    return Object.values(teamPointsMap).sort((a, b) => b.totalHits - a.totalHits);
  };

  const activeTournaments = selectedSeason ? getSeasonTournaments(selectedSeason.name) : [];
  const individualStandings = selectedSeason ? getSeasonIndividualStandings(selectedSeason.name) : [];
  const teamStandings = selectedSeason ? getSeasonTeamStandings(selectedSeason.name) : [];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-2xl text-white shadow-md shadow-amber-600/10">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest font-mono">VSC PLATFORM V3.0</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Hồ Sơ Mùa Giải (Season Central)</h1>
          </div>
        </div>

        {isAdmin && !selectedSeason && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/15 transition-all flex items-center gap-2 self-stretch md:self-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Khởi tạo Mùa Giải mới
          </button>
        )}

        {selectedSeason && (
          <button
            onClick={() => setSelectedSeason(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-250 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedSeason ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search / Filters Panel */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm mùa giải (Tên, năm)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Bản nháp</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Đã kết thúc</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>

            {/* Season Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSeasons.map((season) => {
                const tourCount = getSeasonTournaments(season.name).length;
                const statusColors: any = {
                  draft: "bg-slate-100 text-slate-650 border-slate-200 dark:bg-slate-850 dark:text-slate-350 dark:border-slate-800",
                  active: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 animate-pulse",
                  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                  archived: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-850 dark:text-slate-450 dark:border-slate-800"
                };

                return (
                  <div 
                    key={season.seasonId}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-500 dark:hover:border-indigo-500/50 transition-all shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                          NĂM {season.year}
                        </span>
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${statusColors[season.status]}`}>
                          {season.status === "draft" && "Bản nháp"}
                          {season.status === "active" && "Đang diễn ra"}
                          {season.status === "completed" && "Đã hoàn thành"}
                          {season.status === "archived" && "Lưu trữ"}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{season.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {season.description}
                        </p>
                      </div>

                      <div className="flex gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(season.startDate).toLocaleDateString("vi-VN")} - {new Date(season.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                        {tourCount} Giải đấu trực thuộc
                      </span>
                      
                      <button
                        onClick={() => setSelectedSeason(season)}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white font-black text-[10px] uppercase tracking-wide rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        Vào trung tâm mùa giải
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Box: Season Metadata & Config */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm h-fit">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase leading-tight">{selectedSeason.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cơ sở điều hành bảng xếp hạng & liên kết giải đấu.</p>
                </div>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3 font-medium text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-450">Năm khởi tranh:</span>
                  <span className="font-bold text-slate-850 dark:text-slate-200">{selectedSeason.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Trạng thái:</span>
                  <span className="font-bold font-mono text-amber-500 uppercase">{selectedSeason.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Bắt đầu:</span>
                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedSeason.startDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Kết thúc:</span>
                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedSeason.endDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-2 italic">
                  {selectedSeason.description}
                </p>
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-indigo-500 block">Thao tác Admin</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleStatusChange(selectedSeason.seasonId, "active")}
                      className={`px-3 py-1 text-[10px] rounded border font-bold ${selectedSeason.status === "active" ? "bg-amber-550 border-amber-600 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                    >
                      Kích hoạt
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedSeason.seasonId, "completed")}
                      className={`px-3 py-1 text-[10px] rounded border font-bold ${selectedSeason.status === "completed" ? "bg-emerald-550 border-emerald-600 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                    >
                      Hoàn thành
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedSeason.seasonId, "archived")}
                      className={`px-3 py-1 text-[10px] rounded border font-bold ${selectedSeason.status === "archived" ? "bg-slate-700 border-slate-800 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                    >
                      Lưu trữ
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Tournaments and standings list */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tournaments registry tab content */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
                
                {/* 1. Tournament registry list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Giải đấu thuộc mùa giải này ({activeTournaments.length})
                  </h3>

                  {activeTournaments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa phát hiện giải đấu nào được phân phối cho mùa giải này.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTournaments.map((tour) => (
                        <div key={tour.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{tour.tournamentName}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Định dạng: {tour.tournamentFormat === "mixed" ? "Cá nhân & Đồng đội" : "Cá nhân"}
                            </span>
                          </div>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200/50 uppercase font-mono">
                            {tour.status === "live" ? "Live" : "Đã xong"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Overall Individual Standings tab */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <Award className="w-4 h-4 text-emerald-500" />
                    Bảng xếp hạng cá nhân tích lũy (Season Individual Rankings)
                  </h3>

                  {individualStandings.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Dữ liệu xếp hạng cá nhân sẽ được cập nhật sau khi hoàn thành giải đấu đầu tiên.</p>
                  ) : (
                    <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 font-mono text-xs">
                      {individualStandings.map((std, idx) => (
                        <div key={`${std.athleteId || 'std'}-${idx}`} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-center font-bold text-slate-450">#{idx + 1}</span>
                            <div className="text-left font-sans">
                              <p className="font-bold text-slate-800 dark:text-white">{std.name}</p>
                              <span className="text-[10px] text-slate-450 block">{std.club}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-indigo-650 dark:text-indigo-400">{std.totalHits} Điểm</span>
                            <span className="text-[10px] text-slate-400 block font-sans">Đã chơi {std.tournamentsPlayed} giải</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Overall Team Standings tab */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <Building className="w-4 h-4 text-rose-500" />
                    Bảng xếp hạng đồng đội tích lũy (Season Club Standings)
                  </h3>

                  {teamStandings.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Dữ liệu xếp hạng đồng đội sẽ tự động đồng bộ từ thành tích của các thành viên.</p>
                  ) : (
                    <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 font-mono text-xs">
                      {teamStandings.map((std, idx) => (
                        <div key={std.clubName} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-center font-bold text-slate-450">#{idx + 1}</span>
                            <span className="font-sans font-bold text-slate-800 dark:text-white">{std.clubName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-rose-600 dark:text-rose-400">{std.totalHits} Điểm</span>
                            <span className="text-[10px] text-slate-400 block font-sans">Đã tham dự {std.tournamentsPlayed} giải</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Season Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white uppercase tracking-tight">Khởi tạo Mùa Giải Mới</h3>
            <form onSubmit={handleAddSeason} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Tên Mùa Giải *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: VSC Season 2027"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Năm khởi tranh *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ví dụ: 2027"
                    value={newSeasonYear}
                    onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bản nháp mặc định</label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg font-bold text-slate-500">
                    Bản nháp (Draft)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newSeasonStart}
                    onChange={(e) => setNewSeasonStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newSeasonEnd}
                    onChange={(e) => setNewSeasonEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mô tả/Kế hoạch mùa giải</label>
                <textarea
                  placeholder="Kế hoạch số lượng vòng đấu tranh tài tích điểm..."
                  value={newSeasonDesc}
                  onChange={(e) => setNewSeasonDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg font-bold"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
