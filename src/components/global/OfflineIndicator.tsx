import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, CloudLightning, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setSyncing(true);
      // Mock sync duration
      const timer = setTimeout(() => {
        setSyncing(false);
        const hideTimer = setTimeout(() => {
          setShowStatus(false);
        }, 3000);
        return () => clearTimeout(hideTimer);
      }, 1500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      setSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-4 left-4 z-50 pointer-events-none"
        >
          {isOnline ? (
            <div className="bg-slate-900 border border-slate-800 text-emerald-400 text-xs px-3.5 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-mono">
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ĐANG ĐỒNG BỘ ĐÁM MÂY...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span>KẾT NỐI ONLINE - ĐÃ ĐỒNG BỘ</span>
                </>
              )}
            </div>
          ) : (
            <div className="bg-rose-950 border border-rose-800 text-rose-300 text-xs px-3.5 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-mono animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span>MẤT KẾT NỐI - ĐANG LƯU CACHE NGOẠI TUYẾN</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
