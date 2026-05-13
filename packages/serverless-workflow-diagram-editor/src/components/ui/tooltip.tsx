"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "dec:z-50 dec:inline-flex dec:w-fit dec:max-w-xs dec:origin-(--radix-tooltip-content-transform-origin) dec:items-center dec:gap-1.5 dec:rounded-xl dec:bg-foreground dec:px-3 dec:py-1.5 dec:text-xs dec:text-background dec:has-data-[slot=kbd]:pr-1.5 dec:data-[side=bottom]:slide-in-from-top-2 dec:data-[side=left]:slide-in-from-right-2 dec:data-[side=right]:slide-in-from-left-2 dec:data-[side=top]:slide-in-from-bottom-2 dec:**:data-[slot=kbd]:relative dec:**:data-[slot=kbd]:isolate dec:**:data-[slot=kbd]:z-50 dec:**:data-[slot=kbd]:rounded-lg dec:data-[state=delayed-open]:animate-in dec:data-[state=delayed-open]:fade-in-0 dec:data-[state=delayed-open]:zoom-in-95 dec:data-open:animate-in dec:data-open:fade-in-0 dec:data-open:zoom-in-95 dec:data-closed:animate-out dec:data-closed:fade-out-0 dec:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="dec:z-50 dec:size-2.5 dec:translate-y-[calc(-50%_-_2px)] dec:rotate-45 dec:rounded-[2px] dec:bg-foreground dec:fill-foreground dec:data-[side=left]:translate-x-[-1.5px] dec:data-[side=right]:translate-x-[1.5px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
