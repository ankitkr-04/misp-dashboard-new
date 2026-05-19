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
      className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={activateGodMode}
      aria-label={disabled ? "Burst mode unavailable in live feed mode" : "Activate burst mode"}
    >
      {isPending ? "Starting..." : "Demo burst"}
    </motion.button>
  );
}
