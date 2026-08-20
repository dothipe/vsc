import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  X, 
  Users, 
  Eye, 
  Share2, 
  Play, 
  Heart, 
  Trophy, 
  Calendar, 
  Building, 
  MapPin, 
  Sliders, 
  Settings, 
  FileText, 
  Target,
  Trash2,
  Shield
} from "lucide-react";
import { VSCLogo } from "./VSCLogo";

interface HomeTabProps {
  currentUser: any;
  globalRole: string;
  v3Tournaments: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchExpanded: boolean;
  setIsSearchExpanded: (expanded: boolean) => void;
  handleSelectTournament: (id: string, tour: any, tab: string) => void;
  followedTournaments: string[];
  toggleFollowTournament: (id: string) => void;
  setDeleteTournamentConfirm: (confirm: { id: string; name: string } | null) => void;
  visibleTournamentsCount: number;
  setVisibleTournamentsCount: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
  setActiveTab: (tab: any) => void;
  homeActiveSubTab: "all" | "live" | "followed";
  systemSponsors: any[];
  vscSystemAthletes: any[];
  vscSystemClubs: any[];
  masterAthletes: any[];
  clubs: any[];
  history: any[];
}

export function HomeTab({
  currentUser,
  globalRole,
  v3Tournaments,
  searchQuery,
  setSearchQuery,
  isSearchExpanded,
  setIsSearchExpanded,
  handleSelectTournament,
  followedTournaments,
  toggleFollowTournament,
  setDeleteTournamentConfirm,
  visibleTournamentsCount,
  setVisibleTournamentsCount,
  isMobile,
  setActiveTab,
  homeActiveSubTab,
  systemSponsors,
  vscSystemAthletes,
  vscSystemClubs,
  masterAthletes,
  clubs,
  history
}: HomeTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-slate-900 dark:text-white">

      {/* Interactive Search Bar Toggle (Nút kính lúp) */}
      <div className="flex justify-end items-center mb-2 px-1">
        {isSearchExpanded ? (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-3 pr-1 py-1 shadow-md w-full max-w-md animate-slideDown">
            <Search className="w-4 h-4 text-[#ae1d1e] shrink-0" />
            <input
              type="text"
              placeholder="Tìm giải đấu của bạn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none bg-transparent py-1 font-bold font-sans"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                setIsSearchExpanded(false);
                setSearchQuery("");
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full text-xs font-black text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-sans"
            >
              Đóng
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSearchExpanded(true)}
            className="w-10 h-10 rounded-full bg-[#ae1d1e] hover:bg-red-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer hover:shadow-red-550/20"
            title="Tìm kiếm giải đấu"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Tournament Grid Sections */}
      {(() => {
        const filtered = !searchQuery.trim() 
          ? v3Tournaments 
          : v3Tournaments.filter(t => 
              t.tournamentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );

        const activeFeatured = filtered.filter(t => ["live", "registration", "ready"].includes(t.status));
        const inactiveFeatured = filtered.filter(t => !["live", "registration", "ready"].includes(t.status));
        const finalFeatured = [...activeFeatured, ...inactiveFeatured].slice(0, 8);

        const popular = [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);

        const renderCard = (tour: any) => {
          const viewCount = tour.views !== undefined ? tour.views : 0;
          
          return (
            <div 
              key={tour.id}
              onClick={() => handleSelectTournament(tour.id, tour, "dashboard")}
              className="relative w-full flex flex-col rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer group font-sans"
            >
              {/* Banner area */}
              <div className="relative aspect-[4/3] w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-850">
                {tour.banner ? (
                  <img 
                    src={tour.banner} 
                    alt={tour.tournamentName} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center opacity-95 transition-transform duration-500 group-hover:scale-105">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent)] opacity-60"></div>
                    <VSCLogo size={52} />
                  </div>
                )}

                {/* Floating Status Badge top-left */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/40 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  {tour.status === "live" ? "ĐANG BẮN" : tour.status === "registration" ? "ĐANG ĐĂNG KÝ" : tour.status === "ready" ? "SẴN SÀNG" : "BẢN NHÁP"}
                </div>

                {/* Floating Admin / Format Badge top-right */}
                {currentUser && (tour.creatorId === currentUser.uid || tour.creatorEmail === currentUser.email) && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                    <Users className="w-3.5 h-3.5" />
                    <span>TRƯỞNG GIẢI</span>
                  </div>
                )}

                {/* Floating Viewcount bottom-right */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-full text-white text-[10px] font-black tracking-wide shadow-sm">
                  <Eye className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                  <span>{viewCount} lượt xem</span>
                </div>
              </div>

              {/* Info Area with centered overlapping Logo */}
              <div className="p-5 flex flex-col justify-between bg-white dark:bg-slate-900 text-center relative z-10">
                {/* Overlapping Round Logo */}
                <div className="relative -mt-16 mb-4 mx-auto z-20 w-24 h-24 rounded-full bg-white dark:bg-slate-900 p-1.5 shadow-xl border-4 border-white dark:border-slate-900 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                  {tour.logo ? (
                    <img 
                      src={tour.logo} 
                      alt="Logo" 
                      className="w-full h-full rounded-full object-contain bg-white" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center p-1.5">
                      <VSCLogo size={42} />
                    </div>
                  )}
                </div>

                <div className="space-y-1 mt-1">
                  {/* Centered Star Rating */}
                  {["live", "completed"].includes(tour.status) && (
                    <div className="flex justify-center gap-0.5 text-rose-600 dark:text-rose-500 text-sm animate-pulse">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                  )}

                  {/* Category Subtitle */}
                  <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest leading-none mt-1">
                    {tour.tournamentFormat === "individual" 
                      ? "--- THI CÁ NHÂN ---" 
                      : tour.tournamentFormat === "team" 
                        ? "--- THI ĐỒNG ĐỘI ---" 
                        : "--- THI CÁ NHÂN & ĐỒNG ĐỘI ---"}
                  </div>

                  {/* Tournament Name */}
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight leading-snug mt-1.5 px-3 text-center line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors" title={tour.tournamentName}>
                    {tour.tournamentName}
                  </h4>
                </div>

                {/* Date badge */}
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-300 font-bold text-[10px] mt-3 mx-auto shadow-3xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Từ {tour.startDate || "Chưa rõ"} đến {tour.endDate || tour.startDate || "Chưa rõ"}</span>
                </div>

                {/* Separator line */}
                <div className="border-t border-slate-100 dark:border-slate-850 my-4 w-full"></div>

                {/* Follow (Theo dõi) Button */}
                <div className="flex justify-center w-full mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollowTournament(tour.id);
                    }}
                    className={`w-fit px-4.5 h-[34px] border rounded-xl flex items-center justify-center gap-2 font-extrabold text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                      followedTournaments.includes(tour.id)
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/35"
                        : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors duration-200 ${
                        followedTournaments.includes(tour.id)
                          ? "text-rose-500 fill-rose-500"
                          : "text-slate-400 fill-white"
                      }`}
                    />
                    <span>
                      {followedTournaments.includes(tour.id) ? "Đã theo dõi" : "Theo dõi"}
                    </span>
                  </button>
                </div>

                {/* Action buttons row matching sample layout exactly */}
                <div className="flex items-center gap-2 px-1 w-full">
                  {/* Left Trash/Delete Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (globalRole === "user_admin" || globalRole === "system_owner") {
                        setDeleteTournamentConfirm({ id: tour.id, name: tour.tournamentName });
                      } else {
                        alert("Chức năng chỉ dành cho Trưởng giải / Quản trị viên.");
                      }
                    }}
                    className="w-[34px] h-[34px] shrink-0 border border-rose-200 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center transition hover:bg-rose-100 dark:hover:bg-rose-950/40 cursor-pointer active:scale-95"
                    title="Xóa giải đấu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Middle Share Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/?tour=${tour.id}`;
                      navigator.clipboard.writeText(url);
                      alert("Đã sao chép liên kết chia sẻ giải đấu!");
                    }}
                    className="flex-1 h-[34px] border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 font-extrabold text-[11px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Chia sẻ
                  </button>

                  {/* Right Play / Join Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTournament(tour.id, tour, "dashboard");
                    }}
                    className="flex-1 h-[34px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/30 text-indigo-650 dark:text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-indigo-100/70 dark:hover:bg-indigo-950/80 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-indigo-650 dark:fill-indigo-400 stroke-none" /> VÀO GIẢI
                  </button>
                </div>
              </div>
            </div>
          );
        };
        
        if (homeActiveSubTab === "live") {
          const liveTournaments = filtered;
          return (
            <div className="space-y-6 animate-fadeIn font-sans">
              <div className="border-b-2 border-indigo-600 pb-0 flex items-center justify-between">
                <span className="bg-indigo-600 text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-t-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Giải Đang Diễn Ra
                </span>
              </div>
              {liveTournaments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Play className="w-8 h-8 text-slate-355 dark:text-slate-650 mx-auto animate-bounce" />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    Hiện chưa có giải đấu nào đang diễn ra trực tuyến.
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold max-w-md mx-auto">
                    Khi các ban tổ chức chuyển trạng thái giải đấu sang chế độ "ĐANG BẮN" (live), giải đấu sẽ tự động xuất hiện tại tab này.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                  {liveTournaments.map(tour => renderCard(tour))}
                </div>
              )}
            </div>
          );
        }

        if (homeActiveSubTab === "followed") {
          const followedTours = filtered.filter(t => followedTournaments.includes(t.id));
          return (
            <div className="space-y-6 animate-fadeIn font-sans">
              <div className="border-b-2 border-rose-600 pb-0 flex items-center justify-between">
                <span className="bg-rose-600 text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-t-md flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                  Giải Đấu Đang Theo Dõi
                </span>
              </div>
              {followedTours.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Heart className="w-8 h-8 text-rose-350 dark:text-rose-900 mx-auto animate-pulse" />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    Bạn chưa theo dõi giải đấu nào.
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold max-w-md mx-auto">
                    Bấm vào nút <span className="text-rose-600 dark:text-rose-400 font-bold">♥ Theo dõi</span> trên thẻ thông tin giải đấu bất kỳ tại trang chủ để lưu lại danh sách riêng của bạn tại đây.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                  {followedTours.map(tour => renderCard(tour))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-12">
            {/* SECTION 1: GIẢI ĐẤU NỔI BẬT */}
            <div className="space-y-5">
              <div className="border-b-2 border-rose-700 pb-0 flex items-center justify-between">
                <span className="bg-rose-700 text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-t-md">
                  Giải đấu nổi bật
                </span>
              </div>
              
              {finalFeatured.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 text-center text-xs font-bold text-slate-450 dark:text-slate-500">
                  Không tìm thấy giải đấu nổi bật nào.
                </div>
              ) : (
                <div className="flex overflow-x-auto pb-4 snap-x snap-mandatory gap-6 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:pb-0">
                  {finalFeatured.map(tour => (
                    <div key={tour.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start lg:w-full lg:shrink lg:snap-align-none">
                      {renderCard(tour)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: GIẢI NHIỀU NGƯỜI XEM */}
            <div className="space-y-5">
              <div className="border-b-2 border-rose-700 pb-0 flex items-center justify-between">
                <span className="bg-rose-700 text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-t-md">
                  Giải nhiều người xem
                </span>
              </div>
              
              {popular.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 text-center text-xs font-bold text-slate-450 dark:text-slate-500">
                  Không tìm thấy giải đấu được đề xuất nào.
                </div>
              ) : (
                <div className="flex overflow-x-auto pb-4 snap-x snap-mandatory gap-6 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:pb-0">
                  {popular.map(tour => (
                    <div key={tour.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start lg:w-full lg:shrink lg:snap-align-none">
                      {renderCard(tour)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 3: TẤT CẢ GIẢI ĐẤU */}
            <div className="space-y-5">
              <div className="border-b-2 border-rose-700 pb-0 flex items-center justify-between">
                <span className="bg-rose-700 text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-t-md">
                  Tất cả giải đấu
                </span>
                <button 
                  onClick={() => setActiveTab("tournaments")}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                >
                  Quản lý giải đấu →
                </button>
              </div>
              
              {filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 text-center text-xs font-bold text-slate-450 dark:text-slate-500">
                  Chưa có giải đấu VSC V3.0 nào hoạt động hoặc không tìm thấy kết quả phù hợp.
                </div>
              ) : (() => {
                const visibleFiltered = filtered.slice(0, visibleTournamentsCount);
                return (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                      {visibleFiltered.map(tour => renderCard(tour))}
                    </div>
                    
                    {/* Scroll Status & See More Controls */}
                    <div className="flex flex-col items-center justify-center pt-6 pb-2 border-t border-slate-100 dark:border-slate-800/60">
                      {filtered.length > visibleTournamentsCount ? (
                        <div className="text-center space-y-3">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Đang hiển thị <span className="text-indigo-600 dark:text-indigo-400">{visibleTournamentsCount}</span> trên tổng số <span className="text-indigo-600 dark:text-indigo-400">{filtered.length}</span> giải đấu.
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 animate-pulse">
                            {isMobile ? "Vuốt xuống để tự động tải thêm..." : "Cuộn chuột xuống để tự động tải thêm..."}
                          </p>
                          <button
                            onClick={() => {
                              setVisibleTournamentsCount(prev => {
                                const maxLimit = isMobile ? 60 : 160;
                                const increment = isMobile ? 5 : 12;
                                const nextVal = prev + increment;
                                return nextVal > maxLimit ? maxLimit : nextVal;
                              });
                            }}
                            className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold px-5 py-2.5 rounded-2xl transition shadow-3xs cursor-pointer active:scale-95"
                          >
                            Xem thêm {isMobile ? "5" : "12"} giải đấu
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-450 dark:text-slate-500 mb-2">
                          Đã hiển thị toàn bộ {filtered.length} giải đấu phù hợp.
                        </p>
                      )}
                      
                      {/* Central button to enter tournament management */}
                      <button
                        onClick={() => setActiveTab("tournaments")}
                        className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer active:scale-95 font-sans"
                      >
                        <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
                        Xem thêm và Quản lý tất cả giải đấu
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Core Features Portal Grid */}
      <div className="space-y-4 font-sans">
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded bg-indigo-600"></span>
          PHÂN HỆ CHỨC NĂNG HỆ THỐNG
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div 
            onClick={() => setActiveTab("tournaments")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Cổng Giải Đấu (Tournament Portal)
              </h4>
              <p className="text-[11px] text-slate-555 dark:text-slate-400 leading-relaxed font-semibold">
                Quản lý thiết lập giải đấu: Cấu hình quy chế, phê duyệt đăng ký, chia làn tự động và gán ban trọng tài tác chiến.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => setActiveTab("athletes")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Danh Tính Xạ Thủ (Athlete Registry)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Danh sách hồ sơ xạ thủ gốc độc lập của hệ thống VSC. Thống kê lịch sử sự nghiệp và thứ hạng tích lũy quốc gia.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => setActiveTab("clubs")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <Building className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Hồ Sơ CLB (Club Space)
              </h4>
              <p className="text-[11px] text-slate-555 dark:text-slate-450 leading-relaxed font-semibold">
                Quản lý danh sách thành viên các câu lạc bộ, lịch sử phát triển, sáp nhập, và quản trị viên đại diện cho từng đơn vị.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div 
            onClick={() => setActiveTab("provinces")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Bản Đồ Địa Phương (Provinces)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Phân bổ xạ thủ và tổ chức câu lạc bộ theo 3 miền Bắc - Trung - Nam, theo dõi hoạt động thi đấu và thứ hạng của tỉnh thành.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div 
            onClick={() => setActiveTab("seasons")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-550 dark:text-amber-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Trung Tâm Mùa Giải (Season Central)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Tổng hợp điểm số tích lũy qua từng mùa giải, công nhận bảng vàng danh vọng (Hall of Fame) và xếp hạng đồng đội quốc gia.
              </p>
            </div>
          </div>

          {/* Card 6 */}
          <div 
            onClick={() => setActiveTab("control_panel")}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-550 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Bảng Điều Khiển (Control Panel)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Chuyển đổi vai trò phân quyền (Admin, Trọng tài, Spectator), quản lý liên kết tài khoản vận động viên và thông tin cá nhân.
              </p>
            </div>
          </div>

          {/* Administrative Workspaces for System Owner / Admins */}
          {(globalRole === "system_owner" || globalRole === "admin") && (
            <>
              {/* Card 7 */}
              <div 
                onClick={() => setActiveTab("users")}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-550 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    Tài Khoản & Phân Quyền
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Quản trị phân quyền tài khoản, gán vai trò vận động viên và trọng tài gốc trên hệ thống.
                  </p>
                </div>
              </div>

              {/* Card 8 */}
              <div 
                onClick={() => setActiveTab("referees")}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-550 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    Ban Trọng Tài
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Cơ sở dữ liệu danh sách trọng tài chính thức, số hiệu badge và chứng chỉ chuyên môn.
                  </p>
                </div>
              </div>

              {/* Card 9 */}
              <div 
                onClick={() => setActiveTab("sponsors")}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-550 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
                  <Trophy className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    Nhà Tài Trợ (Sponsors)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Danh sách nhà tài trợ đồng hành, thương hiệu và liên kết website quảng bá giải đấu.
                  </p>
                </div>
              </div>

              {/* Card 10 */}
              <div 
                onClick={() => setActiveTab("rule_templates")}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-550 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 transition-all group-hover:scale-110">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    Bản Mẫu Quy Chế
                  </h4>
                  <p className="text-[11px] text-slate-555 dark:text-slate-400 leading-relaxed font-semibold">
                    Cấu hình bản mẫu quy chế và cự ly thi đấu chuẩn phục vụ khởi tạo giải đấu siêu tốc.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Slingshot values block */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-6 items-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-455 flex items-center justify-center shrink-0">
          <Target className="w-8 h-8 animate-spin" style={{ animationDuration: '20s' }} />
        </div>
        <div className="space-y-2 text-left">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-widest font-mono">
            CHÍNH XÁC • MINH BẠCH • TÁC CHIẾN THỜI GIAN THỰC
          </h4>
          <p className="text-xs text-slate-555 dark:text-slate-400 leading-relaxed font-medium">
            Hệ điều hành VSC Platform V3 được xây dựng dựa trên các tiêu chuẩn thi đấu khắt khe nhất của Ủy ban Slingshot Việt Nam (VSC). Mọi dữ liệu điểm số từ bệ bắn đều được đồng bộ hóa tức thì lên đám mây Firestore, đảm bảo tuyệt đối tính trung thực, bảo mật và công bằng cho mọi giải thi đấu ná cao su chuyên nghiệp.
          </p>
        </div>
      </div>

      {/* Sponsor Showcase Section */}
      <div id="vsc-sponsor-showcase" className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded bg-amber-500"></span>
              NHÀ TÀI TRỢ ĐỒNG HÀNH
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              Chung tay phát triển phong trào bắn ná cao su chuyên nghiệp tại Việt Nam
            </p>
          </div>
          {(globalRole === "system_owner" || globalRole === "admin") && (
            <button
              onClick={() => setActiveTab("sponsors")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-center"
            >
              Quản lý nhà tài trợ →
            </button>
          )}
        </div>

        {systemSponsors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-250 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900/40 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 flex items-center justify-center animate-pulse">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                Chào đón các Nhà tài trợ và Đối tác thương hiệu
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Hệ thống VSC Platform hỗ trợ hiển thị logo, quảng bá thương hiệu trang trọng tại trang chủ và bảng điện tử liveboard thời gian thực.
              </p>
            </div>
            <button
              onClick={() => {
                if (globalRole === "system_owner" || globalRole === "admin") {
                  setActiveTab("sponsors");
                } else {
                  alert("Vui lòng liên hệ Ban tổ chức (VSC) qua hotline/email để đăng ký tài trợ đồng hành.");
                }
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 dark:hover:bg-amber-600 hover:text-white text-slate-750 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
            >
              Đăng Ký Tài Trợ Ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {systemSponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.website || "#"}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md h-32 relative overflow-hidden cursor-pointer"
              >
                {/* Tier indicator tag */}
                <span className={`absolute top-2 right-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  sponsor.tier === "gold" 
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                    : sponsor.tier === "silver"
                      ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400"
                }`}>
                  {sponsor.tier === "gold" ? "Vàng" : sponsor.tier === "silver" ? "Bạc" : "Đồng"}
                </span>

                <div className="w-14 h-14 flex items-center justify-center mb-2 shrink-0 bg-slate-50 dark:bg-slate-850/40 rounded-xl overflow-hidden p-1 transition-transform group-hover:scale-105">
                  {sponsor.logo ? (
                    <img
                      src={sponsor.logo}
                      alt={sponsor.name}
                      className="w-full h-full object-contain filter dark:brightness-95"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Trophy className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <span className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                  {sponsor.name}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Metrics Section relocated below sponsors */}
      <div className="pt-10 border-t border-slate-200 dark:border-slate-800/80 space-y-5">
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded bg-emerald-500"></span>
          THỐNG KÊ HỆ THỐNG VSC
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{v3Tournaments.length > 0 ? v3Tournaments.length : (history.length > 0 ? history.length : 0)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">Giải Đấu Trong Hệ Thống</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 animate-pulse">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{vscSystemAthletes.length > 0 ? vscSystemAthletes.length : masterAthletes.length}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">VĐV Đăng Ký ACP</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{vscSystemClubs.length > 0 ? vscSystemClubs.length : clubs.length}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">Câu Lạc Bộ Hệ Thống</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
