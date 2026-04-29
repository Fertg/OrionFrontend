import { useEffect, useRef, useState } from 'react';

/**
 * Anima un valor numérico desde su valor anterior hasta el nuevo.
 * Usa requestAnimationFrame para suavidad.
 *
 * @param {number} target - valor objetivo
 * @param {number} duration - duración en ms (default 600)
 * @returns {number} valor actual durante la animación
 */
export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const previousRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = previousRef.current;
    const end = target;
    if (start === end) {
      setValue(end);
      return;
    }

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(end);
        previousRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
