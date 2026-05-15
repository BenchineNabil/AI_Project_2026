import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (same helper as the original shadcn setup). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
