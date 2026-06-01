import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
})

export function formatTimeAgo(value: string | number | Date) {
  const target = new Date(value)

  if (Number.isNaN(target.getTime())) {
    return "just now"
  }

  const now = new Date()
  const diffInSeconds = Math.round((target.getTime() - now.getTime()) / 1000)
  const absSeconds = Math.abs(diffInSeconds)

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffInSeconds, "second")
  }

  const diffInMinutes = Math.round(diffInSeconds / 60)
  if (Math.abs(diffInMinutes) < 60) {
    return relativeTimeFormatter.format(diffInMinutes, "minute")
  }

  const diffInHours = Math.round(diffInMinutes / 60)
  if (Math.abs(diffInHours) < 24) {
    return relativeTimeFormatter.format(diffInHours, "hour")
  }

  const diffInDays = Math.round(diffInHours / 24)
  if (Math.abs(diffInDays) < 30) {
    return relativeTimeFormatter.format(diffInDays, "day")
  }

  const diffInMonths = Math.round(diffInDays / 30)
  if (Math.abs(diffInMonths) < 12) {
    return relativeTimeFormatter.format(diffInMonths, "month")
  }

  const diffInYears = Math.round(diffInMonths / 12)
  return relativeTimeFormatter.format(diffInYears, "year")
}
