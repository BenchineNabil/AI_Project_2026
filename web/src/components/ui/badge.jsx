import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary [a&]:hover:bg-primary/30",
        secondary:
          "border-white/10 bg-white/[0.06] text-muted-foreground [a&]:hover:bg-white/10",
        destructive:
          "border-transparent bg-destructive/25 text-red-200 [a&]:hover:bg-destructive/35",
        outline: "border-white/15 text-foreground/90 [a&]:hover:bg-white/[0.06]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
