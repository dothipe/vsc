import { useState, useEffect, useRef, Fragment } from "react";
import { 
  Menu, 
  X, 
  Clock, 
  ChevronDown, 
  User, 
  ClipboardCheck, 
  Database, 
  Play, 
  Heart, 
  Home 
} from "lucide-react";
import { auth } from "../firebase";
import { VSCLogo } from "./VSCLogo";

interface AppHeaderProps {
  currentUser: any;
  globalRole: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  homeActiveSubTab: "all" | "live" | "followed";
  setHomeActiveSubTab: (subTab: "all" | "live" | "followed") => void;
  activeHistoryId: string | null;
  handleExitTournament: () => void;
  handleLogoClick: () => void;
  history: any[];
  setIsLiveBoardOpen: (open: boolean) => void;
  setIsTimerOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  visibleNavigation: any[];
  currentTournamentDoc: any;
  rankingEnvironment: "individual" | "team";
  setRankingEnvironment: (env: "individual" | "team") => void;
  rankingMode: "individual" | "team";
  setRankingMode: (mode: "individual" | "team") => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  networkStatus: "online" | "offline" | null;
  controlPanelSubTab: string;
  setControlPanelSubTab: (subTab: any) => void;
  matchName: string;
}

export function AppHeader({
  currentUser,
  globalRole,
  activeTab,
  setActiveTab,
  homeActiveSubTab,
  setHomeActiveSubTab,
  activeHistoryId,
  handleExitTournament,
  handleLogoClick,
  history,
  setIsLiveBoardOpen,
  setIsTimerOpen,
  setIsAuthModalOpen,
  visibleNavigation,
  currentTournamentDoc,
  rankingEnvironment,
  setRankingEnvironment,
  rankingMode,
  setRankingMode,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  networkStatus,
  controlPanelSubTab,
  setControlPanelSubTab,
  matchName,
}: AppHeaderProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [isDataDropdownOpen, setIsDataDropdownOpen] = useState(false);
  const dataDropdownRef = useRef<HTMLDivElement>(null);
  const [dataDropdownStyle, setDataDropdownStyle] = useState<React.CSSProperties>({});

  const [isScoreDropdownOpen, setIsScoreDropdownOpen] = useState(false);
  const scoreDropdownRef = useRef<HTMLDivElement>(null);
  const [scoreDropdownStyle, setScoreDropdownStyle] = useState<React.CSSProperties>({});

  const [isRankingDropdownOpen, setIsRankingDropdownOpen] = useState(false);
  const rankingDropdownRef = useRef<HTMLDivElement>(null);
  const [rankingDropdownStyle, setRankingDropdownStyle] = useState<React.CSSProperties>({});

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (dataDropdownRef.current && !dataDropdownRef.current.contains(event.target as Node)) {
        setIsDataDropdownOpen(false);
      }
      if (scoreDropdownRef.current && !scoreDropdownRef.current.contains(event.target as Node)) {
        setIsScoreDropdownOpen(false);
      }
      if (rankingDropdownRef.current && !rankingDropdownRef.current.contains(event.target as Node)) {
        setIsRankingDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Horizontal Drag Menu scrolling mechanics
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMenuMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!menuScrollRef.current) return;
    isDownRef.current = true;
    startXRef.current = e.pageX - menuScrollRef.current.offsetLeft;
    scrollLeftRef.current = menuScrollRef.current.scrollLeft;
  };

  const handleMenuMouseLeave = () => {
    isDownRef.current = false;
  };

  const handleMenuMouseUp = () => {
    isDownRef.current = false;
  };

  const handleMenuMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current || !menuScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - menuScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    menuScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  return (
    <>
      {/* Real-time Network connection warning overlay */}
      {networkStatus === "offline" && (
        <div className="fixed top-0 left-0 right-0 bg-rose-600 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[9999] flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>⚠️ Mất kết nối Internet! Đồng bộ Score Cloud tạm thời bị gián đoạn.</span>
        </div>
      )}
      {networkStatus === "online" && (
        <div className="fixed top-0 left-0 right-0 bg-emerald-600 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[9999] flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase">
          <span className="shrink-0">✓</span>
          <span>Đã kết nối Internet trở lại! Đám mây đang hoạt động online.</span>
        </div>
      )}

      {/* Mobile Drawer Sidebar Menu (md:hidden) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/65 z-[100] backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          id="mobile-menu-backdrop"
        />
      )}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-[101] shadow-2xl flex flex-col p-5 transition-transform duration-300 ease-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="mobile-menu-drawer"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogoClick();
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-all text-left bg-transparent border-0 p-0 focus:outline-none"
          >
            <VSCLogo size={28} />
            <span className="text-base font-black text-white italic">
              VSCS.ASIA
            </span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            id="close-mobile-menu-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
          {visibleNavigation.map((navItem) => {
            const IconComponent = navItem.icon;
            const isHomeTab = navItem.id === "home";
            const isActive = isHomeTab 
              ? (activeTab === "home" && homeActiveSubTab === "all")
              : (activeTab === navItem.id);

            if (navItem.id === "leaderboard") {
              const isIndividualOnly = currentTournamentDoc?.tournamentFormat === "individual";
              if (isIndividualOnly) {
                return (
                  <button
                    key={navItem.id}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setRankingEnvironment("individual");
                      setRankingMode("individual");
                      setActiveTab("leaderboard");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-655/15 border border-indigo-500/20 text-white font-extrabold"
                        : "text-slate-400 hover:text-white hover:bg-slate-850"
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-4 h-4 text-slate-400" />}
                    <span>{navItem.title}</span>
                  </button>
                );
              }

              return (
                <div key={navItem.id} className="flex flex-col gap-1 my-1 pl-1 border-l-2 border-amber-500/40 ml-2">
                  <div className="px-3 py-1.5 text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    {IconComponent && <IconComponent className="w-4 h-4 text-amber-400" />}
                    <span>{navItem.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setRankingEnvironment("individual");
                      setRankingMode("individual");
                      setActiveTab("leaderboard");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ml-1 ${
                      activeTab === "leaderboard" && rankingEnvironment === "individual"
                        ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    }`}
                  >
                    <span className="text-sm shrink-0">🎯</span>
                    <span>Thi Đấu Cá Nhân</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setRankingEnvironment("team");
                      setRankingMode("team");
                      setActiveTab("leaderboard");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ml-1 ${
                      activeTab === "leaderboard" && rankingEnvironment === "team"
                        ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    }`}
                  >
                    <span className="text-sm shrink-0">👥</span>
                    <span>Thi Đấu Đồng Đội</span>
                  </button>
                </div>
              );
            }

            return (
              <Fragment key={navItem.id}>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (navItem.id === "liveboard") {
                      setIsLiveBoardOpen(true);
                    } else if (isHomeTab) {
                      if (activeHistoryId) {
                        handleExitTournament();
                      }
                      setHomeActiveSubTab("all");
                      setActiveTab("home");
                    } else {
                      setActiveTab(navItem.id as any);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-650/15 border border-indigo-500/20 text-white font-extrabold"
                      : "text-slate-400 hover:text-white hover:bg-slate-850"
                  }`}
                >
                  {IconComponent && <IconComponent className="w-4 h-4 text-slate-400" />}
                  <span>{navItem.title}</span>
                </button>

                {navItem.id === "liveboard" && (
                  <button
                    key="mobile-timer-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsTimerOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all cursor-pointer bg-amber-400 text-slate-950 font-extrabold shadow-sm my-1"
                  >
                    <Clock className="w-4 h-4 text-slate-950" />
                    <span>THỜI GIAN</span>
                  </button>
                )}
              </Fragment>
            );
          })}

          {/* If inside tournament, show Exit Tournament option */}
          {activeHistoryId && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleExitTournament();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 border border-transparent hover:border-rose-900/30 transition-all mt-4 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Thoát Giải Đấu</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Main Banner Header */}
      <header className="text-white shadow-lg" id="app-header">
        
        {/* 1. TOP BAR: Dark navy blue background */}
        <div className="hidden md:block bg-[#021b35] border-b border-white/5 py-1.5 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Center Creator Tag: "Hệ thống được phát triển bởi VSC" */}
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-100/95 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse shrink-0" />
              Hệ thống được phát triển bởi VSC
            </div>

            {/* Right Profile & Login Area */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 text-xs text-blue-100 relative">
                {currentUser ? (
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-1.5 max-w-[200px] truncate cursor-pointer hover:opacity-90 select-none text-left"
                    >
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-black uppercase shrink-0">
                        {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                      </div>
                      <span className="font-extrabold truncate text-[10px] text-white font-sans hover:underline flex items-center gap-1">
                        {currentUser.displayName || currentUser.email}
                        <span className="text-[7px] opacity-80">▼</span>
                      </span>
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-[9999] animate-fadeIn text-zinc-100">
                        <div className="px-3 py-2 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                          Tài khoản cá nhân
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setControlPanelSubTab("profile");
                            setActiveTab("control_panel");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          👤 My Profile (Hồ sơ)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setControlPanelSubTab("created");
                            setActiveTab("control_panel");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          🏆 My Control Panel (Giải đấu)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setControlPanelSubTab("settings");
                            setActiveTab("control_panel");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          ⚙️ Application Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setControlPanelSubTab("diagnostics");
                            setActiveTab("control_panel");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          🛠️ Developer Tools
                        </button>
                        <div className="border-t border-slate-800 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            auth.signOut();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-950/40 text-rose-400 transition-colors flex items-center gap-2 cursor-pointer font-bold"
                        >
                          🚪 Đăng xuất
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-[10px] font-black text-white hover:text-blue-100 uppercase underline cursor-pointer hover:scale-102 transition-all p-0.5 shrink-0 font-sans"
                  >
                    Đăng Nhập
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Header (md:hidden) */}
        <div className="flex md:hidden items-center justify-between bg-[#ae1d1e] px-4 h-16 relative z-20 border-b border-red-950/40">
          <div className="flex items-center gap-3">
            {isScrolled ? (
              <div className="w-10 h-10 shrink-0" />
            ) : null}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all cursor-pointer shrink-0 active:scale-95 ${
                isScrolled 
                  ? "fixed top-3 left-4 z-[9999] bg-[#ae1d1e] border border-white/25 shadow-[0_4px_24px_rgba(0,0,0,0.4)] scale-105" 
                  : "bg-black/10 hover:bg-black/20 border border-white/10"
              }`}
              id="mobile-menu-toggle-btn"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="h-6 w-[1px] bg-white/20 shrink-0" />
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all text-left bg-transparent border-0 p-0 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-black/10 border border-white/5 flex items-center justify-center p-0.5 shrink-0 shadow-inner">
                <VSCLogo size={24} />
              </div>
              <div className="text-left leading-none select-none font-sans">
                <h1 className="text-[17px] font-black italic tracking-tighter text-white font-sans uppercase">
                  VSCS.ASIA
                </h1>
                <div className="text-[9px] font-bold text-white/90 tracking-wide mt-1 uppercase font-sans">
                  Hệ thống giải đấu VSC
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center relative z-30" ref={userDropdownRef}>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 bg-black/25 hover:bg-black/40 border border-white/10 rounded-full pl-1.5 pr-2.5 py-1 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <div className="w-6.5 h-6.5 rounded-full bg-[#00c853] flex items-center justify-center text-xs text-white font-black uppercase shrink-0 shadow-sm border border-white/10 font-sans">
                  {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/90 shrink-0" strokeWidth={3} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 bg-black/25 hover:bg-black/40 border border-white/10 rounded-full pl-1.5 pr-3 py-1 transition-all shadow-md cursor-pointer active:scale-95 animate-fadeIn"
              >
                <div className="w-6.5 h-6.5 rounded-full bg-[#00c853] flex items-center justify-center text-[10px] text-white font-black uppercase shrink-0 shadow-sm border border-white/10">
                  <span className="text-sm">👤</span>
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-wider font-sans">
                  Đăng Nhập
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/90 shrink-0" strokeWidth={3} />
              </button>
            )}

            {userDropdownOpen && (
              <div className="absolute right-0 top-12 w-52 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-2 z-[9999] animate-fadeIn text-zinc-100 text-left">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400 font-sans">
                  Tài khoản
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setControlPanelSubTab("profile");
                    setActiveTab("control_panel");
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2 cursor-pointer font-semibold font-sans text-white"
                >
                  👤 My Profile (Hồ sơ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setControlPanelSubTab("created");
                    setActiveTab("control_panel");
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2 cursor-pointer font-semibold font-sans text-white"
                >
                  🏆 My Control Panel (Giải đấu)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    auth.signOut();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-950/40 text-rose-400 transition-colors flex items-center gap-2 cursor-pointer font-bold font-sans"
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. COMBINED HEADER BAR */}
        <div className="bg-[#ae1d1e] shadow-md border-b border-red-900 relative z-20 hidden md:flex md:flex-row md:items-stretch md:h-16">
          
          {/* Left Brand Area */}
          <div className="relative bg-[#004ea2] flex items-center pl-4 sm:pl-8 pr-12 shrink-0 z-10 h-12 sm:h-auto">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:opacity-85 transition-all text-left bg-transparent border-0 p-0 focus:outline-none"
            >
              <div className="bg-sky-950/40 border border-white/20 p-1 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                <VSCLogo size={34} />
              </div>
              <div className="text-left select-none">
                <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter leading-none font-sans flex items-center">
                  <span className="text-white">VSCS</span>
                  <span className="text-[#FFD700]">.ASIA</span>
                </h1>
              </div>
            </button>
            <div className="hidden sm:block absolute top-0 bottom-0 right-0 w-8 bg-[#004ea2] -skew-x-[20deg] origin-top-right translate-x-[15px] z-0" />
          </div>

          {/* Right Menu Area */}
          <div className="flex-1 flex items-center pl-4 sm:pl-8 pr-4 sm:pr-8 py-2 sm:py-0 overflow-hidden">
            <div 
              ref={menuScrollRef}
              onMouseDown={handleMenuMouseDown}
              onMouseLeave={handleMenuMouseLeave}
              onMouseUp={handleMenuMouseUp}
              onMouseMove={handleMenuMouseMove}
              onScroll={() => {
                setIsScoreDropdownOpen(false);
                setIsDataDropdownOpen(false);
                setIsRankingDropdownOpen(false);
              }}
              className="flex flex-nowrap items-center gap-1 sm:gap-1.5 font-sans overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-full scroll-smooth animate-fadeIn"
            >
              {(() => {
                const dataTabIds = ["athletes", "clubs", "provinces", "seasons", "referees", "sponsors", "users", "rule_templates"];
                const scoreTabIds = ["input_scores", "scoring"];

                const filteredNav = visibleNavigation.filter(n => n.id !== "control_panel");
                const dataNavItems = filteredNav.filter(n => dataTabIds.includes(n.id));
                const scoreNavItems = filteredNav.filter(n => scoreTabIds.includes(n.id));
                const mainNavItems = filteredNav.filter(n => !dataTabIds.includes(n.id) && !scoreTabIds.includes(n.id) && n.id !== "leaderboard" && n.id !== "history");
                
                const leaderboardNavItem = filteredNav.find(n => n.id === "leaderboard");
                const historyNavItem = filteredNav.find(n => n.id === "history");

                const isAnySubTabActive = dataTabIds.includes(activeTab);
                const isAnyScoreTabActive = scoreTabIds.includes(activeTab);

                return (
                  <>
                    {/* Standalone Navigation Tabs */}
                    {mainNavItems.map((navItem) => {
                      const IconComponent = navItem.icon;
                      const isHomeTab = navItem.id === "home";
                      const isActive = isHomeTab 
                        ? (activeTab === "home" && homeActiveSubTab === "all")
                        : (activeTab === navItem.id);
                      const showBadge = navItem.id === "history" && history.length > 0;

                      return (
                        <Fragment key={navItem.id}>
                          <button
                            onClick={() => {
                              if (navItem.id === "liveboard") {
                                setIsLiveBoardOpen(true);
                              } else if (isHomeTab) {
                                if (activeHistoryId) {
                                  handleExitTournament();
                                }
                                setHomeActiveSubTab("all");
                                setActiveTab("home");
                              } else {
                                setActiveTab(navItem.id as any);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative shrink-0 ${
                              isActive
                                ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                                : "text-white/90 hover:text-white hover:bg-white/10"
                            }`}
                            id={`tab-${navItem.id}-btn`}
                          >
                            {IconComponent && <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            <span>{navItem.title}</span>
                            {showBadge && (
                              <span className="absolute -top-1 -right-1 bg-amber-500 text-white border-2 border-[#ae1d1e] rounded-full text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center">
                                {history.length}
                              </span>
                            )}
                          </button>

                          {/* THỜI GIAN COUNTDOWN TIMER BOARD BUTTON */}
                          {navItem.id === "liveboard" && (
                            <button
                              onClick={() => setIsTimerOpen(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95 border border-amber-300/60"
                              id="tab-timer-btn"
                            >
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-950" />
                              <span>THỜI GIAN</span>
                            </button>
                          )}

                          {/* Render Sub-tabs next to Trang Chủ */}
                          {isHomeTab && !activeHistoryId && (
                            <>
                              <button
                                onClick={() => {
                                  setHomeActiveSubTab("live");
                                  setActiveTab("home");
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative shrink-0 ${
                                  activeTab === "home" && homeActiveSubTab === "live"
                                    ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                                    : "text-white/90 hover:text-white hover:bg-white/10"
                                }`}
                                id="tab-home-live-btn"
                              >
                                <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                                <span>Giải Đang Diễn Ra</span>
                              </button>

                              <button
                                onClick={() => {
                                  setHomeActiveSubTab("followed");
                                  setActiveTab("home");
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative shrink-0 ${
                                  activeTab === "home" && homeActiveSubTab === "followed"
                                    ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                                    : "text-white/90 hover:text-white hover:bg-white/10"
                                }`}
                                id="tab-home-followed-btn"
                              >
                                <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                                <span>Giải Đang Theo Dõi</span>
                              </button>
                            </>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* "Nhập/Ghi Điểm" Dropdown */}
                    {scoreNavItems.length > 0 && (
                      <div className="relative" ref={scoreDropdownRef}>
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setScoreDropdownStyle({
                              position: "fixed",
                              top: `${rect.bottom + 6}px`,
                              left: `${rect.left}px`,
                              zIndex: 9999,
                            });
                            setIsScoreDropdownOpen(!isScoreDropdownOpen);
                            setIsDataDropdownOpen(false);
                            setIsRankingDropdownOpen(false);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative cursor-pointer shrink-0 ${
                            isAnyScoreTabActive
                              ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                              : "text-white/90 hover:text-white hover:bg-white/10"
                          }`}
                          id="tab-score-dropdown-btn"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Nhập/Ghi Điểm</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isScoreDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isScoreDropdownOpen && (
                          <div style={scoreDropdownStyle} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn">
                            {scoreNavItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = activeTab === subItem.id;
                              return (
                                <button
                                  key={subItem.id}
                                  onClick={() => {
                                    setActiveTab(subItem.id as any);
                                    setIsScoreDropdownOpen(false);
                                  }}
                                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs transition-colors cursor-pointer ${
                                    isSubActive
                                      ? "bg-indigo-600 text-white font-black shadow-xs dark:bg-indigo-600 dark:text-white"
                                      : "text-gray-700 font-semibold hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {SubIcon && <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />}
                                  <span className="truncate">{subItem.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ranking Dropdown */}
                    {leaderboardNavItem && (() => {
                      const navItem = leaderboardNavItem;
                      const IconComponent = navItem.icon;
                      const isActive = activeTab === "leaderboard";

                      return (
                        <div className="relative" ref={rankingDropdownRef} key={navItem.id}>
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRankingDropdownStyle({
                                position: "fixed",
                                top: `${rect.bottom + 6}px`,
                                left: `${rect.left}px`,
                                zIndex: 9999,
                              });
                              setIsRankingDropdownOpen(!isRankingDropdownOpen);
                              setIsScoreDropdownOpen(false);
                              setIsDataDropdownOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative cursor-pointer shrink-0 ${
                              isActive
                                ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                                : "text-white/90 hover:text-white hover:bg-white/10"
                            }`}
                            id={`tab-${navItem.id}-btn`}
                          >
                            {IconComponent && <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            <span>{navItem.title}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isRankingDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isRankingDropdownOpen && (
                            <div style={rankingDropdownStyle} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn animate-fadeIn">
                              <button
                                onClick={() => {
                                  setRankingEnvironment("individual");
                                  setRankingMode("individual");
                                  setActiveTab("leaderboard");
                                  setIsRankingDropdownOpen(false);
                                }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                                  isActive && rankingEnvironment === "individual"
                                    ? "bg-indigo-600 text-white font-black shadow-xs dark:bg-indigo-600 dark:text-white"
                                    : "text-gray-700 font-semibold hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span className="text-base shrink-0">🎯</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold truncate">THI ĐẤU CÁ NHÂN</span>
                                  <span className={`text-[10px] font-normal truncate ${isActive && rankingEnvironment === "individual" ? "text-indigo-100" : "text-slate-400"}`}>Bảng xếp hạng cự ly cá nhân</span>
                                </div>
                              </button>

                              <button
                                onClick={() => {
                                  setRankingEnvironment("team");
                                  setRankingMode("team");
                                  setActiveTab("leaderboard");
                                  setIsRankingDropdownOpen(false);
                                }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                                  isActive && rankingEnvironment === "team"
                                    ? "bg-indigo-600 text-white font-black shadow-xs dark:bg-indigo-600 dark:text-white"
                                    : "text-gray-700 font-semibold hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span className="text-base shrink-0">👥</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold truncate">THI ĐẤU ĐỒNG ĐỘI</span>
                                  <span className={`text-[10px] font-normal truncate ${isActive && rankingEnvironment === "team" ? "text-indigo-100" : "text-slate-400"}`}>Bảng xếp hạng cự ly đồng đội</span>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Nhật Ký Tab */}
                    {historyNavItem && (() => {
                      const navItem = historyNavItem;
                      const IconComponent = navItem.icon;
                      const isActive = activeTab === navItem.id;
                      const showBadge = history.length > 0;

                      return (
                        <button
                          key={navItem.id}
                          onClick={() => {
                            setActiveTab(navItem.id as any);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative shrink-0 ${
                            isActive
                              ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300/60 scale-102"
                              : "text-white/90 hover:text-white hover:bg-white/10"
                          }`}
                          id={`tab-${navItem.id}-btn`}
                        >
                          {IconComponent && <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                          <span>{navItem.title}</span>
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white border-2 border-[#ae1d1e] rounded-full text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center">
                              {history.length}
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    {/* "Dữ Liệu" Dropdown */}
                    {dataNavItems.length > 0 && (
                      <div className="relative" ref={dataDropdownRef}>
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDataDropdownStyle({
                              position: "fixed",
                              top: `${rect.bottom + 6}px`,
                              left: `${rect.left}px`,
                              zIndex: 9999,
                            });
                            setIsDataDropdownOpen(!isDataDropdownOpen);
                            setIsScoreDropdownOpen(false);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all relative cursor-pointer shrink-0 ${
                            isAnySubTabActive
                              ? "bg-black/35 text-white shadow-inner border border-white/10"
                              : "text-white/90 hover:text-white hover:bg-white/10"
                          }`}
                          id="tab-data-dropdown-btn"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Dữ Liệu</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDataDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isDataDropdownOpen && (
                          <div style={dataDropdownStyle} className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn animate-fadeIn">
                            {dataNavItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = activeTab === subItem.id;
                              return (
                                <button
                                  key={subItem.id}
                                  onClick={() => {
                                    setActiveTab(subItem.id as any);
                                    setIsDataDropdownOpen(false);
                                  }}
                                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                    isSubActive
                                      ? "bg-indigo-550/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold"
                                      : "text-gray-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {SubIcon && <SubIcon className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                                  <span className="truncate">{subItem.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 3. HERO BANNER BACKGROUND AREA */}
        {activeTab === "home" && !activeHistoryId && (
          <div 
            className="relative overflow-hidden py-16 sm:py-24 flex flex-col items-center justify-center text-center bg-cover bg-center border-b border-red-900 shadow-inner"
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('https://lh3.googleusercontent.com/d/1sEes6o_PO8DTO4ZQa3IcvDcMK_2kwoPC')`,
            }}
          >
            <div className="relative z-10 w-full max-w-4xl px-4">
              <h2 className="text-[2px] leading-[150px] h-[130px] font-black text-white tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] mb-2 font-sans">
                ★★★
              </h2>
            </div>
          </div>
        )}

      </header>
    </>
  );
}
