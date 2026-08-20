import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus,
  Settings,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { useGlobalTimer, GlobalTimerState } from "../hooks/useGlobalTimer";

interface CountdownTimerBoardProps {
  isOpen: boolean;
  onClose: () => void;
  matchName?: string;
  globalTimer?: GlobalTimerState;
  canControlTimer?: boolean;
}

export const CountdownTimerBoard: React.FC<CountdownTimerBoardProps> = ({
  isOpen,
  onClose,
  matchName = "GIẢI THI ĐẤU BẮN SÚNG CAO SU VSC",
  globalTimer: passedGlobalTimer,
  canControlTimer = true,
}) => {
  const localTimer = useGlobalTimer(150);
  const timer = passedGlobalTimer || localTimer;

  const {
    initialSeconds,
    timerState,
    isMuted,
    handleStart,
    handlePause,
    handleStop,
    handleSetTime,
    handleAdjustMinutes,
    handleAdjustSeconds,
    setIsMuted,
    testAudio,
  } = timer;

  const [remainingSeconds, setRemainingSeconds] = useState(timer.remainingSeconds);

  useEffect(() => {
    if (isOpen && timer.subscribeToSeconds) {
      return timer.subscribeToSeconds((secs) => {
        setRemainingSeconds(secs);
      });
    } else {
      setRemainingSeconds(timer.remainingSeconds);
    }
  }, [timer, isOpen]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!isOpen) return null;

  // Formatting MM:SS
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedMinutes = String(mins).padStart(2, "0");
  const formattedSeconds = String(secs).padStart(2, "0");

  const isWarningZone = remainingSeconds <= 5 && timerState === "counting";

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* HEADER (Matching Liveboard Style) */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 md:px-6 md:py-3.5 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
            <Clock className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] md:text-xs font-black uppercase rounded tracking-wider">
                BẢNG ĐỒNG HỒ THỜI GIAN
              </span>
              {timerState === "playing_voice" && (
                <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold rounded animate-pulse">
                  📢 Đang phát thông báo...
                </span>
              )}
              {timerState === "playing_horn" && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded animate-bounce">
                  🎺 Còi bắt đầu...
                </span>
              )}
              {timerState === "counting" && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  ĐANG ĐẾM NGƯỢC
                </span>
              )}
              {timerState === "paused" && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold rounded">
                  ⏸️ TẠM DỪNG
                </span>
              )}
            </div>
            <h2 className="text-sm md:text-base font-extrabold text-white truncate max-w-md mt-0.5">
              {matchName}
            </h2>
          </div>
        </div>

        {/* Top Right Header Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={testAudio}
            className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Phát thử còi thi đấu"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Thử loa</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isMuted 
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {canControlTimer && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showSettings 
                  ? "bg-amber-400 text-slate-950 font-bold border-amber-300" 
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Cài đặt thời gian"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              onClose();
            }}
            className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer shadow-lg ml-1"
            title="Đóng trang"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* SETTINGS POPUP / PRESETS OVERLAY */}
      {showSettings && (
        <div className="bg-slate-900 border-b border-amber-500/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Cài Đặt Thời Gian:</span>
            <div className="flex items-center gap-1.5 ml-2">
              {[
                { label: "02:30 (Mặc định)", sec: 150 },
                { label: "02:00", sec: 120 },
                { label: "01:30", sec: 90 },
                { label: "01:00", sec: 60 },
                { label: "03:00", sec: 180 },
                { label: "00:30", sec: 30 }
              ].map((p) => (
                <button
                  key={p.sec}
                  onClick={() => handleSetTime(p.sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    initialSeconds === p.sec
                      ? "bg-amber-400 text-slate-950 shadow-md font-extrabold"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 gap-2">
              <span className="text-xs text-slate-400 font-bold">Phút:</span>
              <button onClick={() => handleAdjustMinutes(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-black text-amber-400 text-sm w-6 text-center">{Math.floor(initialSeconds / 60)}</span>
              <button onClick={() => handleAdjustMinutes(1)} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 gap-2">
              <span className="text-xs text-slate-400 font-bold">Giây:</span>
              <button onClick={() => handleAdjustSeconds(-10)} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-black text-amber-400 text-sm w-8 text-center">{initialSeconds % 60}s</span>
              <button onClick={() => handleAdjustSeconds(10)} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CENTER CONTENT AREA: MASSIVE COUNTDOWN DISPLAY (~95% FONT SIZE) */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 relative w-full h-full overflow-hidden">
        {/* Subtle background glow effect */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            isWarningZone 
              ? "bg-rose-600/15 radial-glow-rose" 
              : timerState === "counting"
              ? "bg-emerald-500/5"
              : "bg-amber-500/5"
          }`}
        />

        {/* Countdown Digits (Font size ~95% viewport constrained for maximum readability from afar) */}
        <div className="z-10 flex flex-col items-center justify-center w-full my-auto">
          <div 
            className={`font-mono font-black tracking-tight leading-none text-center transition-all duration-300 select-none ${
              isWarningZone
                ? "text-rose-500 animate-pulse drop-shadow-[0_0_80px_rgba(244,63,94,0.9)] scale-105"
                : timerState === "finished"
                ? "text-rose-600"
                : timerState === "counting"
                ? "text-amber-400 drop-shadow-[0_0_50px_rgba(251,191,36,0.3)]"
                : "text-slate-100"
            }`}
            style={{
              fontSize: "clamp(8rem, 28vw, 42vh)",
              lineHeight: "0.85"
            }}
          >
            {formattedMinutes}:{formattedSeconds}
          </div>

          {/* Additional Status Label */}
          <div className="mt-4 md:mt-6">
            {isWarningZone && (
              <span className="px-6 py-2 bg-rose-600 text-white font-black text-lg md:text-2xl uppercase rounded-2xl tracking-widest animate-bounce shadow-2xl flex items-center gap-2">
                <ShieldAlert className="w-7 h-7" /> CẢNH BÁO: CÒN 5 GIÂY!
              </span>
            )}
            {!isWarningZone && timerState === "counting" && (
              <span className="text-slate-400 font-extrabold uppercase tracking-widest text-sm md:text-lg">
                THỜI GIAN THI ĐẤU ĐANG ĐẾM NGƯỢC
              </span>
            )}
            {timerState === "paused" && (
              <span className="text-yellow-400 font-extrabold uppercase tracking-widest text-sm md:text-lg bg-yellow-500/10 px-4 py-1.5 rounded-xl border border-yellow-500/20">
                ĐỒNG HỒ ĐANG TẠM DỪNG
              </span>
            )}
            {timerState === "idle" && (
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs md:text-sm">
                SẴN SÀNG - BẤM BẮT ĐẦU ĐỂ KÍCH HOẠT QUY TRÌNH ÂM THANH & CÒI
              </span>
            )}
          </div>
        </div>

        {/* CONTROLS ROW IMMEDIATELY BELOW THE COUNTDOWN TIMER */}
        {canControlTimer ? (
          <div className="z-20 mb-6 md:mb-10 mt-auto flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-3xl shadow-2xl backdrop-blur-md">
            {/* 1. BẮT ĐẦU (START) */}
            <button
              onClick={handleStart}
              disabled={timerState === "counting" || timerState === "playing_voice" || timerState === "playing_horn"}
              className={`px-6 sm:px-10 py-3.5 sm:py-5 rounded-2xl font-black text-base sm:text-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-3 shadow-xl active:scale-95 ${
                timerState === "counting" || timerState === "playing_voice" || timerState === "playing_horn"
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-900/40 ring-4 ring-emerald-500/30 scale-102"
              }`}
            >
              <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              <span>Bắt Đầu</span>
            </button>

            {/* 2. TẠM DỪNG (PAUSE) */}
            <button
              onClick={handlePause}
              disabled={timerState !== "counting"}
              className={`px-6 sm:px-8 py-3.5 sm:py-5 rounded-2xl font-black text-base sm:text-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-3 shadow-xl active:scale-95 ${
                timerState !== "counting"
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                  : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-900/40 ring-4 ring-amber-400/30"
              }`}
            >
              <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              <span>Tạm Dừng</span>
            </button>

            {/* 3. STOP (RESET) */}
            <button
              onClick={handleStop}
              className="px-6 sm:px-8 py-3.5 sm:py-5 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-slate-200 rounded-2xl font-black text-base sm:text-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-3 shadow-xl active:scale-95"
            >
              <Square className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        ) : (
          <div className="z-20 mb-6 md:mb-10 mt-auto flex items-center justify-center gap-3 bg-slate-900/90 border border-sky-500/30 px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-md">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sky-300 font-extrabold text-xs sm:text-base tracking-wide flex items-center gap-2">
              🔒 ĐỒNG BỘ REALTIME TẤT CẢ THIẾT BỊ (Chỉ Ban tổ chức, MC & Trọng tài có quyền điều khiển)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
