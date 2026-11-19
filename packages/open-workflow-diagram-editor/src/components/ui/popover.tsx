/*
 * Copyright 2021-Present The Open Workflow Specification Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* DIVERGED FROM SHADCN */

import * as React from "react";
// DIVERGENCE: the CLI resolved `cn` to the npm package "cn"; ours is the alias in components.json.
import { cn } from "@/lib/utils";
import { Popover as PopoverPrimitive } from "radix-ui";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  container,
  arrowClassName,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  // DIVERGENCE: portal into this editor's own `.dec-root` (from `useEditorRoot`), never
  // `document.body` — outside `.dec-root` the scoped styles don't apply and it lands in the host's DOM.
  container: HTMLElement | null;
  // DIVERGENCE: an arrow (shadcn's popover has none).
  arrowClassName?: string;
}) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        // DIVERGENCE: no surface classes (bg, border, radius, padding, width, shadow, outline,
        // animations) as they would override `.dec-popover` - tokens in SidePanel.css.
        className={cn("dec:z-50 dec:origin-(--radix-popover-content-transform-origin)", className)}
        {...props}
      >
        {children}
        {/* DIVERGENCE: a bordered square, not Radix's SVG triangle */}
        <PopoverPrimitive.Arrow asChild width={12} height={6}>
          <span className={cn(arrowClassName)} aria-hidden="true" />
        </PopoverPrimitive.Arrow>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("dec:flex dec:flex-col dec:gap-1 dec:text-sm", className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <div data-slot="popover-title" className={cn("dec:font-medium", className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("dec:text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * DIVERGENCE (addition): the `.dec-root` a popover belongs in, found from its trigger when it
 * opens — never `document.querySelector`: a host may embed more than one editor. Put `triggerRef`
 * on the trigger, call `captureRoot()` from `onOpenChange(true)`, pass `root` as `container`.
 */
function useEditorRoot<T extends HTMLElement>() {
  const triggerRef = React.useRef<T>(null);
  const [root, setRoot] = React.useState<HTMLElement | null>(null);
  const captureRoot = () => setRoot(triggerRef.current?.closest<HTMLElement>(".dec-root") ?? null);
  return { triggerRef, root, captureRoot };
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  useEditorRoot,
};
