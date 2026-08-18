import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({
  size = "md",
  withWordmark = true,
  name = "Comandas",
  logoUrl,
  className,
  light = false,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  name?: string;
  logoUrl?: string | null;
  className?: string;
  /** Nome em texto claro — pra usar sobre fundo escuro (ex: totem, painel). */
  light?: boolean;
}) {
  const badgeSize = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" }[size];
  const iconSize = { sm: "h-3.5 w-3.5", md: "h-4.5 w-4.5", lg: "h-7 w-7" }[size];
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className={cn("shrink-0 rounded-xl object-cover", badgeSize)}
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-900/20",
            badgeSize
          )}
        >
          <UtensilsCrossed className={iconSize} strokeWidth={2.25} />
        </div>
      )}
      {withWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight truncate",
            light ? "text-white" : "text-stone-900",
            textSize
          )}
        >
          {name}
          <span className={light ? "text-brand-400" : "text-brand-600"}>.</span>
        </span>
      )}
    </div>
  );
}
