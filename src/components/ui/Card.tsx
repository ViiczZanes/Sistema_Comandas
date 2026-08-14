import { cn } from "@/lib/cn";

export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/[0.02]",
        interactive &&
          "transition-all duration-150 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/5",
        className
      )}
      {...props}
    />
  );
}
