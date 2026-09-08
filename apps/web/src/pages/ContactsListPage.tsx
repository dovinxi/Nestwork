import { useState } from "react";
import { Link } from "react-router-dom";
import { useContacts } from "../api/contacts";
import { useTags } from "../api/tags";
import { useCircles } from "../api/circles";
import { ContactCard } from "../components/ContactCard";

export function ContactsListPage() {
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [circleId, setCircleId] = useState<string | undefined>(undefined);

  const { data: contacts, isLoading } = useContacts({ search: search || undefined, tagId, circleId });
  const { data: tags } = useTags();
  const { data: circles } = useCircles();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slateblue-800">Contacts</h1>
          <p className="text-sm text-slateblue-500">
            {contacts?.length ?? 0} {contacts?.length === 1 ? "person" : "people"} in your nest
          </p>
        </div>
        <Link
          to="/contacts/new"
          className="rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-nest-700"
        >
          + Add Contact
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <input
          type="text"
          placeholder="Search by name or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none sm:w-64"
        />

        {!!circles?.length && (
          <FilterRow label="Circles">
            <button
              onClick={() => setCircleId(undefined)}
              className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                !circleId ? "bg-nest-600 text-white" : "bg-nest-100 text-nest-700 hover:bg-nest-200"
              }`}
            >
              All
            </button>
            {circles.map((circle) => (
              <button
                key={circle.id}
                onClick={() => setCircleId(circle.id)}
                className="shrink-0 rounded-md px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: circle.color, opacity: circleId === circle.id || !circleId ? 1 : 0.5 }}
              >
                {circle.name}
              </button>
            ))}
          </FilterRow>
        )}

        {!!tags?.length && (
          <FilterRow label="Tags">
            <button
              onClick={() => setTagId(undefined)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                !tagId ? "bg-nest-600 text-white" : "bg-nest-100 text-nest-700 hover:bg-nest-200"
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setTagId(tag.id)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                style={
                  tagId === tag.id
                    ? { backgroundColor: tag.color, color: "white" }
                    : { backgroundColor: `${tag.color}22`, color: tag.color }
                }
              >
                {tag.name}
              </button>
            ))}
          </FilterRow>
        )}
      </div>

      {isLoading && <p className="text-sm text-slateblue-400">Loading contacts...</p>}

      {!isLoading && contacts?.length === 0 && (
        <div className="rounded-xl border border-dashed border-nest-300 bg-white/50 px-6 py-12 text-center">
          <p className="text-slateblue-500">No contacts yet.</p>
          <Link to="/contacts/new" className="mt-2 inline-block text-sm font-medium text-nest-700 hover:underline">
            Add your first contact
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contacts?.map((contact) => (
          <ContactCard key={contact.id} contact={contact} tags={tags ?? []} circles={circles ?? []} />
        ))}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-slateblue-400">{label}</span>
      <div className="-mx-4 flex flex-1 gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">{children}</div>
    </div>
  );
}
