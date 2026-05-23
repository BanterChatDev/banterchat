import { useEffect, useRef, useState } from 'react';

export function useMountTransition(isOpen, exitDurationMs) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(timer.current);
      setIsExiting(false);
      setShouldRender(true);
      return undefined;
    }
    if (!shouldRender) return undefined;
    setIsExiting(true);
    timer.current = setTimeout(() => {
      setShouldRender(false);
      setIsExiting(false);
    }, exitDurationMs);
    return () => clearTimeout(timer.current);
  }, [isOpen, exitDurationMs, shouldRender]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { shouldRender, isExiting };
}