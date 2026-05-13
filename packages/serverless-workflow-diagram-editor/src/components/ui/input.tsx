import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "dec:h-9 dec:w-full dec:min-w-0 dec:rounded-3xl dec:border dec:border-transparent dec:bg-input/50 dec:px-3 dec:py-1 dec:text-base dec:transition-[color,box-shadow,background-color] dec:outline-none dec:file:inline-flex dec:file:h-7 dec:file:border-0 dec:file:bg-transparent dec:file:text-sm dec:file:font-medium dec:file:text-foreground dec:placeholder:text-muted-foreground dec:focus-visible:border-ring dec:focus-visible:ring-3 dec:focus-visible:ring-ring/30 dec:disabled:pointer-events-none dec:disabled:cursor-not-allowed dec:disabled:opacity-50 dec:aria-invalid:border-destructive dec:aria-invalid:ring-3 dec:aria-invalid:ring-destructive/20 dec:md:text-sm dec:dark:aria-invalid:border-destructive/50 dec:dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
