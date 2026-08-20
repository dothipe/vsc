import React, { useState, useEffect } from "react";
import { GlobalTimerState } from "../../hooks/useGlobalTimer";

interface CountdownClockProps {
  timer: GlobalTimerState;
  isWarningDisabled?: boolean;
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  timer,
  isWarningDisabled = false,
}) => {
  const [seconds, setSeconds] = useState(timer.remainingSeconds);

  useEffect(() => {
    if (timer.subscribeToSeconds) {
      return timer.subscribeToSeconds((secs) => {
        setSeconds(secs);
      });
    } else {
      setSeconds(timer.remainingSeconds);
    }
  }, [timer]);

  const mins = Math.floor(seconds / 60);
  const s = seconds % 60;
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(s).padStart(2, "0");
  const isWarning = !isWarningDisabled && seconds <= 5 && timer.timerState === "counting";

  return (
    <div className="flex flex-col items-center justify-center my-2 py-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
      <div className={`font-mono font-black text-4xl sm:text-5xl tracking-tight leading-none ${
        isWarning
          ? "text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]"
          : timer.timerState === "counting"
          ? "text-amber-400"
          : "text-slate-100"
      }`}>
        {formattedMins}:{formattedSecs}
      </div>
      {isWarning && (
        <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest mt-1 animate-bounce">
          ⚠️ Còn 5 giây!
        </span>
      )}
    </div>
  );
};
