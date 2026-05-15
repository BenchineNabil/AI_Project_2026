import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-2 text-sm text-foreground shadow-inner backdrop-blur-sm transition-[border-color,box-shadow] duration-200 outline-none",
        "placeholder:text-muted-foreground/70 selection:bg-primary/30 selection:text-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground",
        "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25",
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-invalid:border-destructive/60 aria-invalid:ring-destructive/20",
        "font-mono tabular-nums",
        className
      )}
      {...props}
    />
  );
}

export { Input };
