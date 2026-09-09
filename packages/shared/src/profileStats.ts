/**
 * Generic stat-card shape so the profile's stats section can grow (streaks,
 * badges, other gamification down the road) without frontend changes -- the
 * backend just appends to the list and the UI renders whatever it gets.
 */
export interface ProfileStat {
  id: string;
  label: string;
  value: string;
  /** Optional secondary line, e.g. "3 shared connections". */
  description?: string;
  /** When present, the stat card links to this contact. */
  contactId?: string;
}

export interface ProfileStats {
  stats: ProfileStat[];
}
