import { useEffect, useState } from 'react';

export function PstClock() {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    function updateClock() {
      // Philippine Standard Time is UTC + 8 hours
      const now = new Date();
      
      // We format using Intl.DateTimeFormat with Asia/Manila timezone
      try {
        const manilaTimeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        
        const manilaDateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });

        setTimeStr(manilaTimeFormatter.format(now));
        setDateStr(manilaDateFormatter.format(now));
      } catch (err) {
        // Fallback calculation in case of older platform environments (UTC + 8 hours)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pstTime = new Date(utc + (3600000 * 8));
        setTimeStr(pstTime.toLocaleTimeString('en-US', { hour12: true }));
        setDateStr(pstTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }));
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-end font-mono text-xs text-slate-400 select-none">
      <div className="flex items-center space-x-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-200 tracking-wider uppercase">{timeStr}</span>
        <span className="text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-1 rounded font-sans scale-90">PST</span>
      </div>
      <div className="text-[11px] text-slate-500 font-medium">
        {dateStr}
      </div>
    </div>
  );
}
export default PstClock;
