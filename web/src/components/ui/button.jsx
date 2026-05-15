import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-gradient-to-br from-primary via-primary to-orange-600 text-primary-foreground shadow-[0_4px_24px_-4px_oklch(0.55_0.2_35_/_0.55)] hover:brightness-110 hover:shadow-[0_6px_28px_-4px_oklch(0.55_0.22_35_/_0.65)]",
        destructive:
          "rounded-full bg-destructive text-white shadow-inner hover:brightness-110 focus-visible:ring-destructive/50",
        outline:
          "rounded-full border border-white/15 bg-white/[0.04] text-foreground shadow-none backdrop-blur-md hover:border-primary/50 hover:bg-white/[0.07]",
        secondary:
          "rounded-full bg-secondary/90 text-secondary-foreground border border-white/5 hover:bg-secondary",
        ghost:
          "rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.06]",
        link: "rounded-none text-accent underline-offset-4 hover:underline hover:text-accent/90",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-full gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-full px-7 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
