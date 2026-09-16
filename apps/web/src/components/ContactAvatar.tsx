import { useState } from "react";

interface ContactAvatarProps {
  contact: { firstName: string; lastName?: string; photoUrl?: string };
  /** Sizing + text-size utility classes, e.g. "h-11 w-11 text-sm". */
  className?: string;
  /** Background/text color classes for the initials fallback, kept separate from `className`
   * so callers can theme it (e.g. a darker style for the "Me" node). */
  fallbackClassName?: string;
}

/** Shows the contact's photo when set, falling back to initials -- including if the photo URL fails to load. */
export function ContactAvatar({
  contact,
  className = "h-11 w-11 text-sm",
  fallbackClassName = "bg-nest-200 text-nest-800",
}: ContactAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = `${contact.firstName[0] ?? ""}${contact.lastName?.[0] ?? ""}`.toUpperCase();

  if (contact.photoUrl && !imageFailed) {
    return (
      <img
        src={contact.photoUrl}
        alt={`${contact.firstName} ${contact.lastName ?? ""}`.trim()}
        onError={() => setImageFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${fallbackClassName} ${className}`}>
      {initials || "?"}
    </div>
  );
}
