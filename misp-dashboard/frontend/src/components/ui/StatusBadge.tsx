import { SEVERITY_COLORS } from "../../utils/constants";

type StatusBadgeProps = {
  severity: string;
};

export default function StatusBadge({ severity }: StatusBadgeProps) {
  const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.Low;

  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold"
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
      }}
    >
      {severity}
    </span>
  );
}
