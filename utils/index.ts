import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export { formatTimeAgo } from "@/utils/time/format-time-ago"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
