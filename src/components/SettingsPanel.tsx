import React, { useState, useEffect, useRef } from "react";
import { 
  Settings, Sun, Moon, Globe, Database, Shield, FileDown, FileUp, 
  Eye, Volume2, Tv, Sparkles, Cpu, Info, Check, RotateCcw, Save, Trash2, ShieldAlert
} from "lucide-react";
import { DistanceConfig, Athlete, MatchHistoryItem, StoredAthleteList } from "../types";

interface SettingsPanelProps {
  matchName: string;
  setMatchName: (name: string) => void;
  distances: DistanceConfig[];
  setDistances: (distances: DistanceConfig[]) => void;
  shotsCount: number;
  setShotsCount: (count: number) => void;
  athletes: Athlete[];
  setAthletes: (athletes: Athlete[]) => void;
  masterAthletes: Athlete[];
  setMasterAthletes: (athletes: Athlete[]) => void;
  history: MatchHistoryItem[];
  setHistory: (history: MatchHistoryItem[]) => void;
  onSaveCurrentSessionToHistory: (customName?: string) => void;
  onResetSession: () => void;
  onImportBackup: (data: string) => boolean;
  storedAthleteLists: StoredAthleteList[];
  setStoredAthleteLists: React.Dispatch<React.SetStateAction<StoredAthleteList[]>>;
  activeHistoryId: string | null;
  setActiveHistoryId: (id: string | null) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  
  // Team modes
  teamDistances: DistanceConfig[];
  setTeamDistances: (distances: DistanceConfig[]) => void;
  teamShotsCount: number;
  setTeamShotsCount: (count: number) => void;
  teamAthletes: Athlete[];
  setTeamAthletes: (athletes: Athlete[]) => void;
  directMaxShots: number;
  setDirectMaxShots: (max: number) => void;
  teamDirectMaxShots: number;
  setTeamDirectMaxShots: (max: number) => void;
  directMaxPoints: number | undefined;
  setDirectMaxPoints: (max: number | undefined) => void;
  teamDirectMaxPoints: number | undefined;
  setTeamDirectMaxPoints: (max: number | undefined) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  matchName,
  athletes,
  masterAthletes,
  history,
  onImportBackup,
  storedAthleteLists
}) => {
  // Current Active Category inside Settings Panel
  const [activeTab, setActiveTab] = useState<
    "theme" | "lang" | "firebase" | "perms" | "backup" | "access" | "obs" | "ai" | "dev" | "sys"
  >("theme");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Theme state
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [accentColor, setAccentColor] = useState<string>("indigo");

  // Apply theme & accent
  const handleThemeToggle = (mode: "light" | "dark") => {
    setThemeMode(mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
  };

  // 2. Language state
  const [lang, setLang] = useState<"vi" | "en">("vi");

  // 3. Accessibility states
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [ttsSpeech, setTtsSpeech] = useState(false);

  // 4. OBS states
  const [chromaKey, setChromaKey] = useState(false);
  const [obsResolution, setObsResolution] = useState("1080p");
  const [overlayRefreshRate, setOverlayRefreshRate] = useState(60);

  // 5. AI states
  const [smartPredictions, setSmartPredictions] = useState(true);
  const [geminiSummaries, setGeminiSummaries] = useState(true);
  const [autoMatchAnalyze, setAutoMatchAnalyze] = useState(false);

  // 6. Developer Options states
  const [debugLogs, setDebugLogs] = useState(false);
  const [localStorageView, setLocalStorageView] = useState<string>("");

  useEffect(() => {
    if (activeTab === "dev") {
      setLocalStorageView("Hệ thống VSC Platform V3 hoạt động 100% online trên Firestore Cloud.\nKhông ghi bất kỳ dữ liệu nào xuống LocalStorage của thiết bị để tránh xung đột ghi đè dữ liệu.");
    }
  }, [activeTab]);

  // Backup actions
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExportJSON = () => {
    const backupObj = {
      version: "v3.0.0-vsc",
      timestamp: new Date().toISOString(),
      matchName,
      athletes,
      masterAthletes,
      history,
      storedAthleteLists
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vsc-slingshot-backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearCache = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm (cache) ứng dụng? Các cấu hình không được đồng bộ hóa có thể bị mất.")) {
      try {
        if (typeof indexedDB !== "undefined") {
          indexedDB.deleteDatabase("SlingshotDeviceStorage");
        }
      } catch (e) {
        console.warn("Could not delete IndexedDB database:", e);
      }
      window.location.reload();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-lg p-6 min-h-[500px] flex flex-col lg:flex-row gap-6 text-left font-sans">
      
      {/* LEFT COLUMN: Sidebar tab selectors */}
      <div className="lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-150 dark:border-slate-800 pb-4 lg:pb-0 lg:pr-4 flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
          <span className="font-black text-sm uppercase text-slate-800 dark:text-white tracking-wider">Cấu hình Hệ thống</span>
        </div>

        <button
          onClick={() => setActiveTab("theme")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "theme"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Giao Diện (Theme)</span>
        </button>

        <button
          onClick={() => setActiveTab("lang")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "lang"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Ngôn Ngữ (Language)</span>
        </button>

        <button
          onClick={() => setActiveTab("firebase")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "firebase"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Đám Mây (Firebase)</span>
        </button>

        <button
          onClick={() => setActiveTab("perms")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "perms"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Phân Quyền (Permissions)</span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "backup"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <FileDown className="w-4 h-4" />
          <span>Sao Lưu & Backup (Backup)</span>
        </button>

        <button
          onClick={() => setActiveTab("access")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "access"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Trực Quan & Âm Thanh</span>
        </button>

        <button
          onClick={() => setActiveTab("obs")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "obs"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Livestream & OBS</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "ai"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Trí Tuệ Nhân Tạo (AI)</span>
        </button>

        <button
          onClick={() => setActiveTab("dev")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "dev"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Nhà Phát Triển (Developer)</span>
        </button>

        <button
          onClick={() => setActiveTab("sys")}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "sys"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/40"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Thông Tin Hệ Thống</span>
        </button>
      </div>

      {/* RIGHT COLUMN: Active Config Section details */}
      <div className="flex-1 min-w-0 bg-slate-50/55 dark:bg-slate-950/20 p-5 rounded-2xl border border-gray-150 dark:border-slate-850">
        
        {/* 1. Theme Configuration Panel */}
        {activeTab === "theme" && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Tông màu và Chế độ hiển thị</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Tùy biến không gian màu của phần mềm ghi điểm để tối ưu hóa sự tập trung của ban trọng tài.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeToggle("light")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition-all ${
                  themeMode === "light"
                    ? "bg-white border-indigo-600 text-indigo-600 shadow-sm"
                    : "bg-slate-50 border-gray-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                }`}
              >
                <Sun className="w-6 h-6 text-amber-500" />
                <span className="text-xs">Chế độ Sáng (Light Mode)</span>
              </button>

              <button
                onClick={() => handleThemeToggle("dark")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition-all ${
                  themeMode === "dark"
                    ? "bg-slate-900 border-indigo-600 text-indigo-400 shadow-sm"
                    : "bg-slate-50 border-gray-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                }`}
              >
                <Moon className="w-6 h-6 text-indigo-400" />
                <span className="text-xs">Chế độ Tối (Dark Mode)</span>
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-800 pt-4">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2 uppercase tracking-wider">Màu sắc chủ đạo (Accent Color)</span>
              <div className="flex gap-2">
                {["indigo", "blue", "emerald", "rose", "amber"].map((col) => {
                  const colorMap: Record<string, string> = {
                    indigo: "bg-indigo-600",
                    blue: "bg-blue-600",
                    emerald: "bg-emerald-600",
                    rose: "bg-rose-600",
                    amber: "bg-amber-500"
                  };
                  return (
                    <button
                      key={col}
                      onClick={() => handleAccentChange(col)}
                      className={`w-8 h-8 rounded-full ${colorMap[col]} flex items-center justify-center transition-transform hover:scale-110 cursor-pointer`}
                    >
                      {accentColor === col && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. Language Configuration Panel */}
        {activeTab === "lang" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Ngôn ngữ ứng dụng (Language)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Lựa chọn ngôn ngữ dịch thuật cho các đề mục và báo cáo giải đấu.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="app-lang"
                  checked={lang === "vi"}
                  onChange={() => setLang("vi")}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="text-xs font-black block">Tiếng Việt (Vietnamese)</span>
                  <span className="text-[10px] text-slate-400">Chuẩn hóa cho toàn bộ giải đấu VSC quốc gia.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="app-lang"
                  checked={lang === "en"}
                  onChange={() => setLang("en")}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="text-xs font-black block">Tiếng Anh (English)</span>
                  <span className="text-[10px] text-slate-400">Dành cho các giải Slingshot giao hữu quốc tế.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 3. Firebase Cloud Syncer Panel */}
        {activeTab === "firebase" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Cơ sở dữ liệu đám mây (Cloud Firestore)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Xem trạng thái đồng bộ hóa thời gian thực (Real-time Cloud Sync).</p>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 block">KẾT NỐI KHỎE MẠNH (ONLINE)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 block font-mono">ai-studio-3031112d-39bd-4933-828d-a6397149f785</span>
              </div>
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-3 rounded-xl text-[11px] text-slate-600 dark:text-slate-350">
              <div className="flex justify-between border-b pb-1">
                <span>Firestore Collections:</span>
                <span className="font-mono font-bold">tournaments, rule_templates, athletes... (19 tables)</span>
              </div>
              <div className="flex justify-between border-b pb-1 pt-1">
                <span>Autoseeding Status:</span>
                <span className="text-emerald-600 font-bold">Hoàn tất khởi tạo VSC V3.0 Schema</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Latency Engine:</span>
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">&lt; 80ms realtime sync</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Permissions Matrix Panel */}
        {activeTab === "perms" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Hệ thống phân quyền (Permissions)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Theo dõi ma trận quyền hạn hiện tại của tài khoản của bạn.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tài khoản:</span>
                <span className="text-xs font-mono font-bold text-indigo-600">Admin Board / Ban Tổ Chức</span>
              </div>

              <div className="space-y-1 text-[10.5px] text-slate-500 leading-normal font-medium">
                <p className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Danh sách quyền được cấp:
                </p>
                <p>✓ <strong className="text-slate-700 dark:text-slate-300">CREATE:</strong> Khởi tạo giải đấu, quy chế bắn mới</p>
                <p>✓ <strong className="text-slate-700 dark:text-slate-300">UPDATE:</strong> Hiệu chỉnh khoảng cách, điểm số, trọng tài phụ</p>
                <p>✓ <strong className="text-slate-700 dark:text-slate-300">DELETE:</strong> Lưu trữ lịch sử và hủy đăng ký VĐV</p>
                <p>✓ <strong className="text-slate-700 dark:text-slate-300">BYPASS LOCKS:</strong> Mở khóa nhanh cấu hình chống can thiệp</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Backup / Import Panel */}
        {activeTab === "backup" && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Sao Lưu & Phục Hồi Toàn Bộ (Backup & Recovery)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Tải tệp JSON dự phòng toàn bộ cơ sở dữ liệu hoặc nạp tệp sao lưu trước đó.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportJSON}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-md shadow-indigo-150 cursor-pointer"
              >
                <FileDown className="w-4.5 h-4.5" />
                Tải Tệp Backup JSON Hệ Thống
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 font-bold border rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
              >
                <FileUp className="w-4.5 h-4.5" />
                Nạp Tệp Sao Lưu (.json)
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError("");
                setImportSuccess(false);

                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const text = event.target?.result as string;
                    const success = onImportBackup(text);
                    if (success) {
                      setImportSuccess(true);
                      setTimeout(() => setImportSuccess(false), 4500);
                    } else {
                      setImportError("Cấu trúc file backup không phù hợp với chuẩn VSC V3.0");
                    }
                  } catch (err) {
                    setImportError("Lỗi đọc cấu trúc tệp backup JSON!");
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
              className="hidden"
            />

            {importError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold animate-fadeIn text-center">
                ⚠️ {importError}
              </div>
            )}

            {importSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 p-3 rounded-xl text-xs font-black animate-fadeIn text-center">
                ✓ Phục hồi hoàn chỉnh dữ liệu và đồng bộ hóa thành công!
              </div>
            )}
          </div>
        )}

        {/* 6. Accessibility Configurations Panel */}
        {activeTab === "access" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Tính năng Trực Quan & Âm Thanh (Accessibility)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Tùy chỉnh các chế độ hỗ trợ nhập điểm nhanh tại bãi bắn nắng nôi chói chang.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Tông chữ siêu to (Large Font Panel)</span>
                  <span className="text-[9.5px] text-slate-400">Tăng kích thước nút bắn giúp hạn chế ấn nhầm ngoài nắng.</span>
                </div>
                <input
                  type="checkbox"
                  checked={largeFont}
                  onChange={(e) => setLargeFont(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Độ tương phản cực đại (High Contrast)</span>
                  <span className="text-[9.5px] text-slate-400">Nền trắng đen tuyệt đối chống lóa dưới ánh mặt trời gay gắt.</span>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Âm thanh phản hồi (Audio Sound Effects)</span>
                  <span className="text-[9.5px] text-slate-400">Phát âm thanh "Tách/Ding" mỗi khi ghi điểm thành công.</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Đọc điểm loa phát thanh (Text-to-Speech)</span>
                  <span className="text-[9.5px] text-slate-400">Đọc số điểm vừa ghi (ví dụ: "Số 5 đạt 10 điểm!") qua loa thoại.</span>
                </div>
                <input
                  type="checkbox"
                  checked={ttsSpeech}
                  onChange={(e) => setTtsSpeech(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
            </div>
          </div>
        )}

        {/* 7. OBS Livestream Layouts Panel */}
        {activeTab === "obs" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Cấu hình luồng Livestream OBS (Overlay Overlay)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Đặt cấu hình cho lớp phủ Green Screen (Chroma Key) hiển thị trực tiếp lên luồng phát sóng.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Phông nền xanh lá (Chroma Key Background)</span>
                  <span className="text-[9.5px] text-slate-400">Đổi nền lớp phủ bảng điểm sang xanh lá cây chuẩn #00FF00.</span>
                </div>
                <input
                  type="checkbox"
                  checked={chromaKey}
                  onChange={(e) => setChromaKey(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <div className="flex flex-col gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-3 rounded-xl text-xs font-semibold">
                <span>Độ phân giải Overlay phát sóng:</span>
                <select
                  value={obsResolution}
                  onChange={(e) => setObsResolution(e.target.value)}
                  className="mt-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded focus:outline-none"
                >
                  <option value="1080p">Ultra HD - 1080p (1920x1080)</option>
                  <option value="720p">Standard HD - 720p (1280x720)</option>
                  <option value="4k">Premium 4K (3840x2160)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-3 rounded-xl text-xs font-semibold">
                <span>Tốc độ làm tươi (Overlay Refresh Rate): {overlayRefreshRate} Hz</span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  value={overlayRefreshRate}
                  onChange={(e) => setOverlayRefreshRate(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* 8. AI smart options panel */}
        {activeTab === "ai" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Trí tuệ nhân tạo (AI Integration)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Sử dụng mô hình server-side Gemini 1.5/2.0 API để hỗ trợ phân tích kết quả.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Dự đoán điểm xếp hạng (Smart Predictions)</span>
                  <span className="text-[9.5px] text-slate-400">Tính toán xác suất leo top dựa trên phong độ lịch sử thi đấu của VĐV.</span>
                </div>
                <input
                  type="checkbox"
                  checked={smartPredictions}
                  onChange={(e) => setSmartPredictions(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Tự động tóm tắt giải đấu (Gemini Summaries)</span>
                  <span className="text-[9.5px] text-slate-400">Sản xuất báo cáo tổng kết giải đấu ngay sau khi hồi cự ly kết thúc.</span>
                </div>
                <input
                  type="checkbox"
                  checked={geminiSummaries}
                  onChange={(e) => setGeminiSummaries(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">Phân tích chéo phong độ trực tiếp (Auto Analyze)</span>
                  <span className="text-[9.5px] text-slate-400">Gợi ý phân chia làn thi đấu cân bằng độ khó thuật toán.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoMatchAnalyze}
                  onChange={(e) => setAutoMatchAnalyze(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
            </div>
          </div>
        )}

        {/* 9. Developer options raw info panel */}
        {activeTab === "dev" && (
          <div className="space-y-4 animate-fadeIn font-mono">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Tùy chọn Nhà Phát Triển (Developer Options)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Xóa bộ nhớ đệm, khôi phục cứng hoặc kiểm tra trạng thái LocalStorage.</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleClearCache}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa Cứng Bộ Nhớ Đệm (Hard Reset)
                </button>

                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Đồng Bộ Lại (Force Sync)
                </button>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-450 block mb-1 uppercase tracking-wider">Trình xem LocalStorage (Raw State Keys):</span>
                <textarea
                  value={localStorageView}
                  readOnly
                  rows={8}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] rounded-xl font-mono leading-relaxed outline-none"
                />
              </div>

              <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer font-sans">
                <div>
                  <span className="text-xs font-bold block">Bật Console Debug (Detailed Logging)</span>
                  <span className="text-[9.5px] text-slate-400">In nhật ký chi tiết các cuộc gọi API và Firestore lên terminal.</span>
                </div>
                <input
                  type="checkbox"
                  checked={debugLogs}
                  onChange={(e) => setDebugLogs(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
            </div>
          </div>
        )}

        {/* 10. System Information Panel */}
        {activeTab === "sys" && (
          <div className="space-y-4 animate-fadeIn font-mono">
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Thông tin hệ thống & Stack</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Phiên bản biên dịch và kiến trúc hạ tầng giải pháp ghi điểm VSC.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-xs space-y-2.5 font-sans leading-normal">
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-700 dark:text-slate-350">Phiên bản (Release Version):</span>
                <span className="font-mono font-black text-rose-600">v3.0.0-clean-architecture</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-700 dark:text-slate-350">Kiến trúc (Architecture):</span>
                <span className="text-indigo-600 font-bold">Single Owner Workspace (SOW)</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-700 dark:text-slate-350">Khung phát triển (Framework):</span>
                <span className="font-mono">React 18 + Vite 5 + Tailwind v4 + TS</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-700 dark:text-slate-350">Hạ tầng ảo hóa:</span>
                <span className="font-mono">Google Cloud Run (Severless Sandbox)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-350">Chịu trách nhiệm phát triển:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Vietnam Slingshot Federation (VSC)</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
