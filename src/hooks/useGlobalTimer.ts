import { useState, useEffect, useRef, useCallback } from "react";
import { LiveTimerConfig } from "../lib/firebaseService";

export interface GlobalTimerState {
  initialSeconds: number;
  remainingSeconds: number;
  timerState: "idle" | "playing_voice" | "playing_horn" | "counting" | "paused" | "finished";
  isMuted: boolean;
  
  handleStart: () => void;
  handlePause: () => void;
  handleStop: () => void;
  handleSetTime: (totalSecs: number) => void;
  handleAdjustMinutes: (delta: number) => void;
  handleAdjustSeconds: (delta: number) => void;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  testAudio: () => void;
  subscribeToSeconds?: (callback: (secs: number) => void) => () => void;
}

const STORAGE_PREFIX = "vsc_global_timer_state_v1_";

const getStorageKey = (tournamentId?: string | null) => {
  return `${STORAGE_PREFIX}${tournamentId || "default"}`;
};

const AUDIO_SOURCES = {
  voice: [
    "/audio/prepare.mp3",
    "https://vscvietnamslingshot.infinityfreeapp.com/prepare.mp3",
    "https://raw.githubusercontent.com/dothipe/VSCVietnamSlingshot/main/public/audio/prepare.mp3"
  ],
  horn: [
    "/audio/horn.mp3",
    "https://vscvietnamslingshot.infinityfreeapp.com/start_end.mp3",
    "https://raw.githubusercontent.com/dothipe/VSCVietnamSlingshot/main/public/audio/horn.mp3"
  ],
  tick: [
    "/audio/tick.mp3",
    "https://vscvietnamslingshot.infinityfreeapp.com/tick.mp3",
    "https://raw.githubusercontent.com/dothipe/VSCVietnamSlingshot/main/public/audio/tick.mp3"
  ]
};

export function useGlobalTimer(
  defaultSeconds = 150,
  tournamentId?: string | null,
  remoteTimer?: LiveTimerConfig | null,
  onSyncToRemote?: (timerData: LiveTimerConfig) => void
): GlobalTimerState {
  const currentKey = getStorageKey(tournamentId);

  // Initialize state from localStorage if available
  const [initialSeconds, setInitialSeconds] = useState<number>(() => {
    try {
      if (remoteTimer && typeof remoteTimer.initialSeconds === "number" && remoteTimer.initialSeconds > 0) {
        return remoteTimer.initialSeconds;
      }
      const saved = localStorage.getItem(currentKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.initialSeconds === "number" && parsed.initialSeconds > 0) {
          return parsed.initialSeconds;
        }
      }
    } catch (e) {
      console.warn("Failed reading initialSeconds from localStorage", e);
    }
    return defaultSeconds;
  });

  const [timerState, setTimerState] = useState<"idle" | "playing_voice" | "playing_horn" | "counting" | "paused" | "finished">(() => {
    try {
      const saved = localStorage.getItem(currentKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timerState === "counting" || parsed.timerState === "playing_voice" || parsed.timerState === "playing_horn") {
          return "paused";
        }
        if (parsed.timerState) {
          return parsed.timerState;
        }
      }
    } catch (e) {
      console.warn("Failed reading timerState from localStorage", e);
    }
    return "idle";
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(currentKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isMuted);
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

  const initialRemainingSecondsValue = (() => {
    try {
      if (remoteTimer && typeof remoteTimer.remainingSeconds === "number") {
        return remoteTimer.remainingSeconds;
      }
      const saved = localStorage.getItem(currentKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.remainingSeconds === "number") {
          return parsed.remainingSeconds;
        }
      }
    } catch (e) {
      console.warn("Failed reading remainingSeconds from localStorage", e);
    }
    return defaultSeconds;
  })();

  const remainingSecondsRef = useRef<number>(initialRemainingSecondsValue);

  const listenersRef = useRef<Set<(secs: number) => void>>(new Set());

  const subscribeToSeconds = useCallback((callback: (secs: number) => void) => {
    listenersRef.current.add(callback);
    callback(remainingSecondsRef.current);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const setRemainingSeconds = useCallback((valOrFn: number | ((prev: number) => number)) => {
    const nextVal = typeof valOrFn === "function" ? valOrFn(remainingSecondsRef.current) : valOrFn;
    remainingSecondsRef.current = nextVal;
    listenersRef.current.forEach((cb) => cb(nextVal));

    try {
      localStorage.setItem(
        currentKey,
        JSON.stringify({
          initialSeconds,
          remainingSeconds: nextVal,
          timerState: timerState === "playing_voice" || timerState === "playing_horn" ? "counting" : timerState,
          isMuted,
        })
      );
    } catch (e) {}
  }, [currentKey, initialSeconds, timerState, isMuted]);

  const lastRemoteUpdatedAtRef = useRef<number>(remoteTimer?.updatedAt || 0);
  const prevRemoteStateRef = useRef<string | null>(remoteTimer?.timerState || null);
  const isFirstRemoteSyncRef = useRef<boolean>(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggered5sTickRef = useRef<boolean>(false);

  // Active playing audio element reference
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioUnlocked = useCallback(() => {
    // Silent unlock hook for user interaction
  }, []);

  // Stop currently playing audio track safely
  const stopCurrentAudio = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (e) {
        // ignore
      }
      activeAudioRef.current = null;
    }
  }, []);

  // Sync state whenever remoteTimer changes from Firestore
  useEffect(() => {
    if (!remoteTimer) return;

    const remoteUpdated = remoteTimer.updatedAt || 0;
    if (remoteUpdated && remoteUpdated <= lastRemoteUpdatedAtRef.current) {
      return;
    }
    lastRemoteUpdatedAtRef.current = remoteUpdated;

    if (typeof remoteTimer.initialSeconds === "number" && remoteTimer.initialSeconds > 0) {
      setInitialSeconds(remoteTimer.initialSeconds);
    }

    if (typeof remoteTimer.remainingSeconds === "number") {
      setRemainingSeconds(remoteTimer.remainingSeconds);
    }

    const stateChanged = remoteTimer.timerState !== prevRemoteStateRef.current;
    prevRemoteStateRef.current = remoteTimer.timerState || null;

    if (remoteTimer.timerState) {
      if (isFirstRemoteSyncRef.current) {
        isFirstRemoteSyncRef.current = false;
        // On initial remote sync, normalize active counting state to paused so timer doesn't auto-run
        if (remoteTimer.timerState === "counting" || remoteTimer.timerState === "playing_voice" || remoteTimer.timerState === "playing_horn") {
          setTimerState("paused");
        } else {
          setTimerState(remoteTimer.timerState);
        }
      } else {
        setTimerState(remoteTimer.timerState);

        // Play audio on synced device if timer state transitioned remotely
        if (stateChanged && !isMuted) {
          if (remoteTimer.timerState === "playing_voice") {
            playAudio("voice");
          } else if (remoteTimer.timerState === "playing_horn") {
            playAudio("horn");
          }
        }
      }
    }
  }, [
    remoteTimer?.updatedAt,
    remoteTimer?.timerState,
    remoteTimer?.remainingSeconds,
    remoteTimer?.initialSeconds,
    isMuted
  ]);

  // Re-sync state when tournamentId changes
  useEffect(() => {
    const key = getStorageKey(tournamentId);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const initSec = (typeof parsed.initialSeconds === "number" && parsed.initialSeconds > 0) ? parsed.initialSeconds : defaultSeconds;
        setInitialSeconds(initSec);
        setIsMuted(Boolean(parsed.isMuted));

        if (typeof parsed.remainingSeconds === "number") {
          setRemainingSeconds(parsed.remainingSeconds);
        } else {
          setRemainingSeconds(initSec);
        }

        if (parsed.timerState) {
          if (parsed.timerState === "counting" || parsed.timerState === "playing_voice" || parsed.timerState === "playing_horn") {
            setTimerState("paused");
          } else {
            setTimerState(parsed.timerState);
          }
        } else {
          setTimerState("idle");
        }
      } else {
        setInitialSeconds(defaultSeconds);
        setRemainingSeconds(defaultSeconds);
        setTimerState("idle");
        setIsMuted(false);
      }
    } catch (e) {
      console.warn("Failed re-syncing timer state on tournament switch", e);
    }
  }, [tournamentId, defaultSeconds]);

  // Persist timer state to localStorage whenever key parameters or key changes
  useEffect(() => {
    try {
      localStorage.setItem(
        currentKey,
        JSON.stringify({
          initialSeconds,
          remainingSeconds: remainingSecondsRef.current,
          timerState: timerState === "playing_voice" || timerState === "playing_horn" ? "counting" : timerState,
          isMuted,
        })
      );
    } catch (e) {
      console.warn("Failed saving timer state to localStorage", e);
    }
  }, [currentKey, initialSeconds, timerState, isMuted]);

  // Sync remaining time when initialSeconds changes and timer is idle
  useEffect(() => {
    if (timerState === "idle" || timerState === "finished") {
      setRemainingSeconds(initialSeconds);
    }
  }, [initialSeconds, timerState]);

  // Direct HTML5 Audio player using direct MP3 URLs without memory buffer cache or frequency oscillators
  const playAudio = useCallback((type: "voice" | "horn" | "tick", onEndCallback?: () => void) => {
    if (isMuted) {
      if (onEndCallback) onEndCallback();
      return;
    }

    stopCurrentAudio();

    let handled = false;
    const triggerEndCallback = (delayMs = 0) => {
      if (!handled) {
        handled = true;
        if (onEndCallback) {
          if (delayMs > 0) {
            setTimeout(onEndCallback, delayMs);
          } else {
            onEndCallback();
          }
        }
      }
    };

    const urls = AUDIO_SOURCES[type] || [];

    const tryPlayNext = (index: number) => {
      if (index >= urls.length) {
        console.warn(`[Audio] Could not play audio for ${type}`);
        const fallbackDelay = type === "voice" ? 2500 : type === "horn" ? 1200 : 0;
        triggerEndCallback(fallbackDelay);
        return;
      }

      const rawUrl = urls[index];
      const fullUrl = rawUrl.startsWith("/") && typeof window !== "undefined"
        ? window.location.origin + rawUrl
        : rawUrl;

      const audio = new Audio(fullUrl);
      activeAudioRef.current = audio;

      const timeoutMs = type === "voice" ? 4500 : type === "horn" ? 3500 : 1500;
      const safetyTimer = setTimeout(() => {
        if (activeAudioRef.current === audio && !audio.ended) {
          console.warn(`[Audio] Playback timeout for ${type} (${fullUrl})`);
          try { audio.pause(); } catch (e) {}
          activeAudioRef.current = null;
          tryPlayNext(index + 1);
        }
      }, timeoutMs);

      audio.onended = () => {
        clearTimeout(safetyTimer);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        triggerEndCallback(0);
      };

      audio.onerror = (err) => {
        clearTimeout(safetyTimer);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        console.warn(`[Audio] Direct audio error (${fullUrl}) for ${type}:`, err);
        tryPlayNext(index + 1);
      };

      audio.play().then(() => {
        // Playback started successfully
      }).catch((err) => {
        clearTimeout(safetyTimer);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        console.warn(`[Audio] Playback blocked or failed for ${type} (${fullUrl}):`, err);
        tryPlayNext(index + 1);
      });
    };

    tryPlayNext(0);
  }, [isMuted, stopCurrentAudio]);

  const testAudio = useCallback(() => {
    ensureAudioUnlocked();
    playAudio("horn");
  }, [ensureAudioUnlocked, playAudio]);

  // Helper to publish updates to remote Firestore
  const syncToRemote = useCallback((data: Omit<LiveTimerConfig, "updatedAt">) => {
    const fullConfig: LiveTimerConfig = {
      ...data,
      updatedAt: Date.now()
    };
    lastRemoteUpdatedAtRef.current = fullConfig.updatedAt;
    if (onSyncToRemote) {
      onSyncToRemote(fullConfig);
    }
  }, [onSyncToRemote]);

  // Full sequence when clicking BẮT ĐẦU or Start
  const handleStart = useCallback(() => {
    ensureAudioUnlocked();

    // If paused, just resume counting directly without re-playing voice/horn
    if (timerState === "paused" && remainingSecondsRef.current > 0) {
      setTimerState("counting");

      syncToRemote({
        initialSeconds,
        remainingSeconds: remainingSecondsRef.current,
        timerState: "counting",
        targetEndTime: null
      });
      return;
    }

    // Full start sequence
    hasTriggered5sTickRef.current = false;
    setRemainingSeconds(initialSeconds);
    setTimerState("playing_voice");

    syncToRemote({
      initialSeconds,
      remainingSeconds: initialSeconds,
      timerState: "playing_voice",
      targetEndTime: null
    });

    // 1. Play Voice
    playAudio("voice", () => {
      // 2. Play Horn
      setTimerState("playing_horn");
      syncToRemote({
        initialSeconds,
        remainingSeconds: initialSeconds,
        timerState: "playing_horn",
        targetEndTime: null
      });

      playAudio("horn", () => {
        // 3. Start Countdown
        setRemainingSeconds(initialSeconds);
        setTimerState("counting");

        syncToRemote({
          initialSeconds,
          remainingSeconds: initialSeconds,
          timerState: "counting",
          targetEndTime: null
        });
      });
    });
  }, [timerState, initialSeconds, playAudio, ensureAudioUnlocked, syncToRemote]);

  // Countdown timer ticker effect: counts down by 1 second every 1000ms
  useEffect(() => {
    if (timerState === "counting") {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = prev - 1;

          // 5-second tick-tock trigger
          if (next <= 5 && next > 0 && !hasTriggered5sTickRef.current) {
            hasTriggered5sTickRef.current = true;
            playAudio("tick");
          }

          if (next <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setTimerState("finished");

            stopCurrentAudio();

            // Play Finish Horn
            playAudio("horn", () => {
              setTimeout(() => {
                setRemainingSeconds(initialSeconds);
                setTimerState("idle");
                hasTriggered5sTickRef.current = false;
              }, 1000);
            });

            return 0;
          }

          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerState, initialSeconds, playAudio, stopCurrentAudio]);

  // Pause
  const handlePause = useCallback(() => {
    stopCurrentAudio();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTimerState("paused");

    syncToRemote({
      initialSeconds,
      remainingSeconds: remainingSecondsRef.current,
      timerState: "paused",
      targetEndTime: null
    });
  }, [initialSeconds, stopCurrentAudio, syncToRemote]);

  // Reset / Stop
  const handleStop = useCallback(() => {
    stopCurrentAudio();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    hasTriggered5sTickRef.current = false;
    setTimerState("idle");
    setRemainingSeconds(initialSeconds);

    syncToRemote({
      initialSeconds,
      remainingSeconds: initialSeconds,
      timerState: "idle",
      targetEndTime: null
    });
  }, [initialSeconds, stopCurrentAudio, syncToRemote]);

  // Adjust time
  const handleSetTime = useCallback((totalSecs: number) => {
    stopCurrentAudio();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    hasTriggered5sTickRef.current = false;
    setTimerState("idle");
    setInitialSeconds(totalSecs);
    setRemainingSeconds(totalSecs);

    syncToRemote({
      initialSeconds: totalSecs,
      remainingSeconds: totalSecs,
      timerState: "idle",
      targetEndTime: null
    });
  }, [stopCurrentAudio, syncToRemote]);

  const handleAdjustMinutes = useCallback((delta: number) => {
    const currentMins = Math.floor(initialSeconds / 60);
    const currentSecs = initialSeconds % 60;
    const newMins = Math.max(0, currentMins + delta);
    handleSetTime(newMins * 60 + currentSecs);
  }, [initialSeconds, handleSetTime]);

  const handleAdjustSeconds = useCallback((delta: number) => {
    const newTotal = Math.max(5, initialSeconds + delta);
    handleSetTime(newTotal);
  }, [initialSeconds, handleSetTime]);

  return {
    initialSeconds,
    get remainingSeconds() {
      return remainingSecondsRef.current;
    },
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
    subscribeToSeconds
  };
}


