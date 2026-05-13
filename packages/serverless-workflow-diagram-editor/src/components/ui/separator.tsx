import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "dec:shrink-0 dec:bg-border dec:data-horizontal:h-px dec:data-horizontal:w-full dec:data-vertical:w-px dec:data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
