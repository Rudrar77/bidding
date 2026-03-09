import { useState, useEffect } from "react";

interface CountdownTimerProps {
  endTime: Date;
  compact?: boolean;
}

export default function CountdownTimer({ endTime, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft.expired) {
    return <span className="text-destructive font-mono font-semibold">Ended</span>;
  }

  if (compact) {
    return (
      <span className="font-mono text-primary font-semibold">
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      {[
        { val: timeLeft.hours, label: "HRS" },
        { val: timeLeft.minutes, label: "MIN" },
        { val: timeLeft.seconds, label: "SEC" },
      ].map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="bg-secondary rounded-md px-3 py-1.5 font-mono text-lg font-bold text-primary tabular-nums">
            {String(unit.val).padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
