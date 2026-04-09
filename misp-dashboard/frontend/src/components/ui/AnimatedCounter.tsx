import { useEffect, useRef, useState } from "react";
import { COUNTER_ANIMATION_DURATION_MS } from "../../utils/constants";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  decimals?: number;
};

export default function AnimatedCounter({
  value,
  duration = COUNTER_ANIMATION_DURATION_MS,
  decimals,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayedValueRef = useRef(value);

  useEffect(() => {
    const startValue = displayedValueRef.current;
    const delta = value - startValue;
    const startTime = performance.now();
    let animationFrameId = 0;

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + delta * easedProgress;

      displayedValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      displayedValueRef.current = value;
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [duration, value]);

  const inferredDecimals = decimals ?? (Number.isInteger(value) ? 0 : 1);

  return <span>{displayValue.toFixed(inferredDecimals)}</span>;
}
