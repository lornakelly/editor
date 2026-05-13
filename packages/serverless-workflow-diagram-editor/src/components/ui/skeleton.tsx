import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("dec:animate-pulse dec:rounded-2xl dec:bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
