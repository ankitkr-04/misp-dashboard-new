import { useState } from "react";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/constants";

type SecretTriggerProps = {
  onTriggered?: () => void;
  disabled?: boolean;
};

export default function SecretTrigger({
  onTriggered,
  disabled = false,
}: SecretTriggerProps) {
  const [isPending, setIsPending] = useState(false);

  const activateGodMode = async () => {
    if (isPending || disabled) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`${API_BASE}/god-mode`, {
        method: "POST",
      });

      if (response.ok) {
        onTriggered?.();
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.button
      type="button"
      className="group panel-shell flex h-10 w-10 items-center justify-center p-0 opacity-30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-20"
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={activateGodMode}
      aria-label={disabled ? "Burst mode unavailable in live feed mode" : "Activate burst mode"}
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              disabled ? "bg-slate-600" : isPending ? "bg-rose-400" : "bg-emerald-300"
            }`}
            style={{
              boxShadow: disabled
                ? "0 0 6px rgba(100, 116, 139, 0.25)"
                : isPending
                ? "0 0 10px rgba(251, 113, 133, 0.55)"
                : "0 0 10px rgba(0, 255, 136, 0.4)",
            }}
          />
        ))}
      </div>
    </motion.button>
  );
}
