import { useEffect, useState } from 'react';

import { formatNowLong, splitTime } from '../lib/time';

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Clock({ className = '' }: { className?: string }) {
  const now = useNow(1000);
  const { main, suffix } = splitTime(now, true);
  const [hm, sec] = [main.slice(0, main.lastIndexOf(':')), main.slice(main.lastIndexOf(':') + 1)];
  return (
    <div className={`clock ${className}`}>
      <time className="clock__time" dateTime={now.toISOString()} aria-live="off">
        <span className="clock__hm">{hm}</span>
        <span className="clock__sec">:{sec}</span>
        <span className="clock__suffix">{suffix}</span>
      </time>
      <p className="clock__date">{formatNowLong(now)}</p>
    </div>
  );
}
