'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/** Contador regressivo (escassez) – usa um timestamp fixo para criar urgência */
const END_DATE = new Date();
END_DATE.setDate(END_DATE.getDate() + 3);
END_DATE.setHours(23, 59, 59, 999);

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, END_DATE.getTime() - now.getTime());
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  const units = [
    { value: timeLeft.days, label: 'd' },
    { value: timeLeft.hours, label: 'h' },
    { value: timeLeft.minutes, label: 'm' },
    { value: timeLeft.seconds, label: 's' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
    >
      <span className="hidden md:inline text-xs sm:text-sm text-[#E8EDED]/80 font-medium whitespace-nowrap">
        Encerra em:
      </span>
      <div className="flex gap-1 sm:gap-1.5">
        {units.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md bg-white/5 border border-[#4CCB7A]/30 min-w-[1.75rem] sm:min-w-[2.5rem]"
          >
            <span className="text-sm sm:text-lg font-bold text-[#4CCB7A] tabular-nums">
              {String(value).padStart(2, '0')}
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#E8EDED]/60 uppercase">
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
