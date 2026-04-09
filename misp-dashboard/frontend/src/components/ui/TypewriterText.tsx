import { useEffect, useState } from "react";
import { ANALYSIS_TYPEWRITER_SPEED_MS } from "../../utils/constants";

type TypewriterTextProps = {
  text: string;
  speed?: number;
};

export default function TypewriterText({
  text,
  speed = ANALYSIS_TYPEWRITER_SPEED_MS,
}: TypewriterTextProps) {
  const [visibleText, setVisibleText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setVisibleText("");
    setIsTyping(true);

    let currentIndex = 0;
    const intervalId = window.setInterval(() => {
      currentIndex += 1;
      setVisibleText(text.slice(0, currentIndex));

      if (currentIndex >= text.length) {
        setIsTyping(false);
        window.clearInterval(intervalId);
      }
    }, speed);

    return () => window.clearInterval(intervalId);
  }, [speed, text]);

  return (
    <span className="whitespace-pre-wrap">
      {visibleText}
      {isTyping ? <span className="cursor-blink text-cyan-300">|</span> : null}
    </span>
  );
}
