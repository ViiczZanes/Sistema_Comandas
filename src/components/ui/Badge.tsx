import { cn } from "@/lib/cn";

type Tone = "neutral" | "green" | "red" | "yellow" | "blue" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-600",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  brand: "bg-brand-100 text-brand-800",
};

const dots: Record<Tone, string> = {
  neutral: "bg-stone-400",
  green: "bg-emerald-500",
  red: "bg-red-500",
  yellow: "bg-amber-500",
  blue: "bg-blue-500",
  brand: "bg-brand-500",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[tone])} />
      )}
      {children}
    </span>
  );
}
