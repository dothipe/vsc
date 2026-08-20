import React, { useState } from "react";
import { 
  Trophy, 
  Settings, 
  History, 
  Users, 
  Shield, 
  Tv, 
  Menu, 
  X, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Vote, 
  FileLock2, 
  Database,
  Grid,
  Calendar,
  Sliders
} from "lucide-react";
import { usePermission } from "../providers/PermissionProvider";
import { auth, googleProvider, signInWithPopup, signOut } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface ShellLayoutProps {
  currentTab: string;
  onTabChange: (tab: any) => void;
  children: React.ReactNode;
  matchName: string;
  startDate?: string;
  endDate?: string;
}

export const ShellLayout: React.FC<ShellLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
  matchName,
  startDate,
  endDate,
}) => {
  const { role, overriddenRole, setOverriddenRole, hasPermission } = usePermission();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navigationItems = [
    { id: "home", label: "Trang chủ", icon: Trophy, action: "READ" as const },
    { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard, action: "READ" as const },
    { id: "tournaments", label: "Quản lý giải đấu", icon: Calendar, action: "READ" as const },
    { id: "scoring", label: "Bệ bắn", icon: Vote, action: "SCORE_LEVEL" as const },
    { id: "input_scores", label: "Nhập điểm", icon: Grid, action: "SCORE_LEVEL" as const },
    { id: "leaderboard", label: "Cá nhân", icon: Trophy, action: "READ" as const },
    { id: "teams", label: "Đồng đội", icon: Users, action: "READ" as const },
    { id: "athletes", label: "Vận động viên", icon: Users, action: "ATHLETE_LEVEL" as const },
    { id: "settings", label: "Cài đặt", icon: Settings, action: "TOURNAMENT_LEVEL" as const },
    { id: "command_center", label: "Tác chiến (Mission Control)", icon: Sliders, action: "TOURNAMENT_LEVEL" as const },
    { id: "history", label: "Lịch sử", icon: History, action: "READ" as const },
    { id: "control_panel", label: "Phòng máy", icon: Database, action: "SYSTEM_LEVEL" as const },
  ];

  const filteredNavItems = navigationItems.filter((item) => hasPermission(item.action));

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setOverriddenRole(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const activeUser = auth.currentUser;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner for Role Simulation / Testing Overrides */}
      {overriddenRole && (
        <div className="bg-amber-500 text-slate-900 text-xs py-1 px-4 text-center font-semibold tracking-wide shrink-0">
          CHẾ ĐỘ GIẢ LẬP VAI TRÒ: <span className="underline">{overriddenRole.toUpperCase()}</span>. Đang bỏ qua phân quyền mặc định.
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 sticky top-0 h-screen">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-xl text-white">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-lg tracking-tight font-sans">VSC PLATFORM</h1>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-semibold">VERSION 3.0</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "hover:bg-slate-800 hover:text-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer of Sidebar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
            <p className="text-[10px] text-slate-600 font-mono">
              VSC PLATFORM V3 © {new Date().getFullYear()}
            </p>
          </div>
        </aside>

        {/* Mobile Sidebar overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Sidebar */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col z-50 md:hidden"
              >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-xl text-white">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-white text-md tracking-tight font-sans">VSC PLATFORM</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onTabChange(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-slate-800 hover:text-slate-100 text-slate-400"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-slate-800 text-center">
                  <span className="text-[10px] text-slate-600 font-mono">VSC PLATFORM V3</span>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 shrink-0 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-30">
            {/* Left side header - mobile burger & match name */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 md:hidden shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 text-base md:text-lg leading-tight truncate">
                  {matchName || "VSC Slingshot Championship"}
                </h2>
                {startDate && endDate && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Thời gian: {startDate} - {endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Right side header - role info and login */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Active Role Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Vai trò:</span>
                <span className="text-slate-900 font-mono font-bold uppercase">{role}</span>
              </div>

              {/* User Dropdown / Auth trigger */}
              <div className="relative">
                {activeUser ? (
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1 pl-3 border border-slate-200 hover:border-slate-300 rounded-full bg-slate-50 transition-colors"
                  >
                    <span className="hidden lg:inline text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                      {activeUser.displayName || activeUser.email}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {activeUser.displayName ? activeUser.displayName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                )}

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && activeUser && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-2 font-sans"
                      >
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-xs text-slate-500 leading-none">Tài khoản</p>
                          <p className="font-semibold text-sm text-slate-800 truncate mt-1.5">{activeUser.displayName || "N/A"}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{activeUser.email}</p>
                        </div>

                        {/* Role Simulator inside user dropdown for Admins */}
                        {(role === "system_owner" || role === "admin" || role === "tournament_director") && (
                          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-2">Simulate Role</p>
                            <select
                              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white text-slate-700 font-mono focus:outline-none"
                              value={overriddenRole || ""}
                              onChange={(e) => setOverriddenRole((e.target.value as any) || null)}
                            >
                              <option value="">(None - Default)</option>
                              <option value="system_owner">System Owner</option>
                              <option value="tournament_director">Tournament Director</option>
                              <option value="admin">Admin</option>
                              <option value="head_referee">Head Referee</option>
                              <option value="referee">Referee</option>
                              <option value="check_in_staff">Check-In Staff</option>
                              <option value="score_operator">Score Operator</option>
                              <option value="media_operator">Media Operator</option>
                              <option value="athlete">Athlete</option>
                              <option value="club_manager">Club Manager</option>
                              <option value="viewer">Viewer</option>
                              <option value="obs">OBS Account</option>
                              <option value="tv_display">TV Display</option>
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Body content wrapped in beautiful spring animations */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="max-w-7xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};
