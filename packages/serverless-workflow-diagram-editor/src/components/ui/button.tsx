import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "dec:group/button dec:inline-flex dec:shrink-0 dec:items-center dec:justify-center dec:rounded-4xl dec:border dec:border-transparent dec:bg-clip-padding dec:text-sm dec:font-medium dec:whitespace-nowrap dec:transition-all dec:outline-none dec:select-none dec:focus-visible:border-ring dec:focus-visible:ring-3 dec:focus-visible:ring-ring/30 dec:active:not-aria-[haspopup]:translate-y-px dec:disabled:pointer-events-none dec:disabled:opacity-50 dec:aria-invalid:border-destructive dec:aria-invalid:ring-3 dec:aria-invalid:ring-destructive/20 dec:dark:aria-invalid:border-destructive/50 dec:dark:aria-invalid:ring-destructive/40 dec:[&_svg]:pointer-events-none dec:[&_svg]:shrink-0 dec:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: "dec:bg-primary dec:text-primary-foreground dec:hover:bg-primary/80",
        outline:
          "dec:border-border dec:bg-background dec:hover:bg-muted dec:hover:text-foreground dec:aria-expanded:bg-muted dec:aria-expanded:text-foreground dec:dark:bg-transparent dec:dark:hover:bg-input/30",
        secondary:
          "dec:bg-secondary dec:text-secondary-foreground dec:hover:bg-secondary/80 dec:aria-expanded:bg-secondary dec:aria-expanded:text-secondary-foreground",
        ghost:
          "dec:hover:bg-muted dec:hover:text-foreground dec:aria-expanded:bg-muted dec:aria-expanded:text-foreground dec:dark:hover:bg-muted/50",
        destructive:
          "dec:bg-destructive/10 dec:text-destructive dec:hover:bg-destructive/20 dec:focus-visible:border-destructive/40 dec:focus-visible:ring-destructive/20 dec:dark:bg-destructive/20 dec:dark:hover:bg-destructive/30 dec:dark:focus-visible:ring-destructive/40",
        link: "dec:text-primary dec:underline-offset-4 dec:hover:underline",
      },
      size: {
        default:
          "dec:h-9 dec:gap-1.5 dec:px-3 dec:has-data-[icon=inline-end]:pr-2.5 dec:has-data-[icon=inline-start]:pl-2.5",
        xs: "dec:h-6 dec:gap-1 dec:px-2.5 dec:text-xs dec:has-data-[icon=inline-end]:pr-2 dec:has-data-[icon=inline-start]:pl-2 dec:[&_svg:not([class*=size-])]:size-3",
        sm: "dec:h-8 dec:gap-1 dec:px-3 dec:has-data-[icon=inline-end]:pr-2 dec:has-data-[icon=inline-start]:pl-2",
        lg: "dec:h-10 dec:gap-1.5 dec:px-4 dec:has-data-[icon=inline-end]:pr-3 dec:has-data-[icon=inline-start]:pl-3",
        icon: "dec:size-9",
        "icon-xs": "dec:size-6 dec:[&_svg:not([class*=size-])]:size-3",
        "icon-sm": "dec:size-8",
        "icon-lg": "dec:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
