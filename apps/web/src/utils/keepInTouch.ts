import type { KeepInTouch } from "@nestwork/shared";

export type ReminderStatus = "overdue" | "due-soon" | "ok" | "none";

const DUE_SOON_WINDOW_DAYS = 3;

export function getReminderStatus(keepInTouch: KeepInTouch): ReminderStatus {
  if (!keepInTouch.nextReminderAt) return "none";

  const daysUntil = Math.floor(
    (new Date(keepInTouch.nextReminderAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return "overdue";
  if (daysUntil <= DUE_SOON_WINDOW_DAYS) return "due-soon";
  return "ok";
}

export function formatRelativeDays(iso?: string): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days > 1) return `${days} days ago`;
  if (days === -1) return "tomorrow";
  return `in ${Math.abs(days)} days`;
}

export const FREQUENCY_PRESETS = [
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Monthly", days: 30 },
  { label: "Every 3 months", days: 90 },
  { label: "Every 6 months", days: 182 },
  { label: "Yearly", days: 365 },
];
