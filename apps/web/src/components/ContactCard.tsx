import { Link } from "react-router-dom";
import type { Contact, Tag, Circle } from "@nestwork/shared";
import { TagBadge } from "./TagBadge";
import { CircleBadge } from "./CircleBadge";
import { ContactAvatar } from "./ContactAvatar";
import { getReminderStatus } from "../utils/keepInTouch";
import { capitalize } from "../utils/text";

const STATUS_DOT: Record<string, string> = {
  overdue: "bg-red-400",
  "due-soon": "bg-amber-400",
  ok: "bg-emerald-400",
  none: "bg-slateblue-200",
};

export function ContactCard({ contact, tags, circles }: { contact: Contact; tags: Tag[]; circles: Circle[] }) {
  const status = getReminderStatus(contact.keepInTouch);
  const contactTags = tags.filter((t) => contact.tagIds.includes(t.id));
  const contactCircles = circles.filter((c) => contact.circleIds.includes(c.id));

  return (
    <Link
      to={`/contacts/${contact.id}`}
      className="flex items-center gap-4 rounded-xl border border-nest-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <ContactAvatar contact={contact} className="h-11 w-11 text-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slateblue-800">
            {contact.firstName} {contact.lastName}
          </span>
          {status !== "none" && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
              title={
                status === "overdue" ? "Overdue to reach out" : status === "due-soon" ? "Reach out soon" : "Up to date"
              }
            />
          )}
        </div>
        {contact.relationshipToMe && (
          <div className="truncate text-sm text-slateblue-500">{capitalize(contact.relationshipToMe)}</div>
        )}
        {(contactCircles.length > 0 || contactTags.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {contactCircles.map((circle) => (
              <CircleBadge key={circle.id} circle={circle} />
            ))}
            {contactTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
