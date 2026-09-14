import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useContact, useDeleteContact, useLogContact, useContacts, useUpdateContact } from "../api/contacts";
import { useTags, useCreateTag } from "../api/tags";
import { useCircles } from "../api/circles";
import { useRelationshipTypes } from "../api/relationshipTypes";
import { useCreateRelationship, useDeleteRelationship, useRelationships } from "../api/relationships";
import { useCreateInteraction, useInteractions } from "../api/interactions";
import { useCreateDraftMessage, useDraftMessages } from "../api/draftMessages";
import { TagBadge } from "./TagBadge";
import { CircleBadge } from "./CircleBadge";
import { ProfileCompletionBar } from "./ProfileCompletionBar";
import { formatRelativeDays, getReminderStatus } from "../utils/keepInTouch";
import { capitalize } from "../utils/text";

const STATUS_LABEL: Record<string, string> = {
  overdue: "Overdue to reach out",
  "due-soon": "Reach out soon",
  ok: "Up to date",
  none: "No reminder set",
};

const STATUS_COLOR: Record<string, string> = {
  overdue: "text-red-600 bg-red-50",
  "due-soon": "text-amber-600 bg-amber-50",
  ok: "text-emerald-600 bg-emerald-50",
  none: "text-slateblue-400 bg-slateblue-50",
};

const NEW_TAG_COLORS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A"];

interface ContactDetailContentProps {
  contactId: string;
  /** Called after the contact is deleted -- page navigates away, panel just closes. */
  onDeleted: () => void;
  /** When provided (panel context), clicking a connection swaps the panel to that contact instead of navigating away. */
  onNavigateContact?: (contactId: string) => void;
  /**
   * When provided (panel context), "Edit" calls this instead of navigating to the /edit route --
   * keeps editing in-place so Cancel returns to this same preview instead of losing it.
   */
  onEdit?: () => void;
}

export function ContactDetailContent({ contactId: id, onDeleted, onNavigateContact, onEdit }: ContactDetailContentProps) {
  const { data: contact } = useContact(id);
  const { data: tags } = useTags();
  const { data: circles } = useCircles();
  const { data: relationshipTypes } = useRelationshipTypes();
  const { data: allContacts } = useContacts();
  const { data: relationships } = useRelationships(id);
  const { data: interactions } = useInteractions(id);
  const { data: draftMessages } = useDraftMessages(id);

  const deleteContact = useDeleteContact();
  const logContact = useLogContact(id);
  const updateContact = useUpdateContact(id);
  const createRelationship = useCreateRelationship();
  const deleteRelationship = useDeleteRelationship();
  const createInteraction = useCreateInteraction();
  const createDraftMessage = useCreateDraftMessage();
  const createTag = useCreateTag();

  const [noteText, setNoteText] = useState("");
  const [noteImportant, setNoteImportant] = useState(false);
  const [relContactId, setRelContactId] = useState("");
  const [relType, setRelType] = useState("");
  const [draftText, setDraftText] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (!relType && relationshipTypes?.length) setRelType(relationshipTypes[0].name);
  }, [relType, relationshipTypes]);

  if (!contact) return <p className="text-sm text-slateblue-400">Loading...</p>;

  const contactTags = (tags ?? []).filter((t) => contact.tagIds.includes(t.id));
  const contactCircles = (circles ?? []).filter((c) => contact.circleIds.includes(c.id));
  const status = getReminderStatus(contact.keepInTouch);
  const otherContacts = (allContacts ?? []).filter((c) => c.id !== contact.id);

  function contactName(cid: string) {
    const c = allContacts?.find((c) => c.id === cid);
    return c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : "Unknown";
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await createInteraction.mutateAsync({
      contactId: id,
      date: new Date().toISOString(),
      type: "note",
      summary: noteText.trim(),
      important: noteImportant,
    });
    setNoteText("");
    setNoteImportant(false);
  }

  async function handleAddRelationship(e: FormEvent) {
    e.preventDefault();
    if (!relContactId || !relType) return;
    await createRelationship.mutateAsync({ contactAId: id, contactBId: relContactId, type: relType });
    setRelContactId("");
  }

  async function handleRemoveTag(tagId: string) {
    await updateContact.mutateAsync({ tagIds: contact!.tagIds.filter((t) => t !== tagId) });
  }

  async function handleAddTag(tagId: string) {
    if (contact!.tagIds.includes(tagId)) return;
    await updateContact.mutateAsync({ tagIds: [...contact!.tagIds, tagId] });
  }

  async function handleCreateAndAddTag() {
    if (!newTagName.trim()) return;
    const color = NEW_TAG_COLORS[Math.floor(Math.random() * NEW_TAG_COLORS.length)];
    const tag = await createTag.mutateAsync({ name: newTagName.trim(), color });
    await updateContact.mutateAsync({ tagIds: [...contact!.tagIds, tag.id] });
    setNewTagName("");
  }

  async function handleSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draftText.trim()) return;
    await createDraftMessage.mutateAsync({ contactId: id, draftText: draftText.trim(), status: "draft", generatedByAI: false });
    setDraftText("");
  }

  async function handleDelete() {
    if (!confirm(`Delete ${contact?.firstName ?? "this contact"}? This can't be undone.`)) return;
    await deleteContact.mutateAsync(id);
    onDeleted();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProfileCompletionBar contact={contact} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nest-200 text-lg font-semibold text-nest-800 sm:h-16 sm:w-16 sm:text-xl">
            {contact.firstName[0]}
            {contact.lastName?.[0] ?? ""}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slateblue-800 sm:text-2xl">
              {contact.firstName} {contact.lastName}
              {contact.nickname && <span className="ml-2 text-base font-normal text-slateblue-400">"{contact.nickname}"</span>}
            </h1>
            {contact.relationshipToMe && <p className="text-sm text-slateblue-500">{capitalize(contact.relationshipToMe)}</p>}
            {(contact.jobTitle || contact.company) && (
              <p className="text-sm text-slateblue-400">
                {contact.jobTitle}
                {contact.jobTitle && contact.company ? " at " : ""}
                {contact.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit ? (
            <button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-100">
              Edit
            </button>
          ) : (
            <Link to={`/contacts/${id}/edit`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-100">
              Edit
            </Link>
          )}
          <button onClick={handleDelete} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      {contactCircles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contactCircles.map((circle) => (
            <CircleBadge key={circle.id} circle={circle} />
          ))}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          {contactTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
          ))}
          <button
            type="button"
            onClick={() => setShowTagPicker((v) => !v)}
            className="rounded-full border border-dashed border-nest-300 px-2.5 py-0.5 text-xs font-medium text-slateblue-400 hover:border-nest-400 hover:text-nest-600"
          >
            + Tag
          </button>
        </div>

        {showTagPicker && (
          <div className="mt-2 rounded-xl border border-nest-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(tags ?? [])
                .filter((t) => !contact.tagIds.includes(t.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.id)}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              {(tags ?? []).filter((t) => !contact.tagIds.includes(t.id)).length === 0 && (
                <span className="text-xs text-slateblue-400">No other existing tags -- create one below.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-nest-200 px-2 py-1 text-sm focus:border-nest-400 focus:outline-none"
                placeholder="New tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateAndAddTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateAndAddTag}
                className="shrink-0 rounded-lg bg-nest-100 px-3 py-1 text-xs font-medium text-nest-700 hover:bg-nest-200"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slateblue-400">Keep in touch</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-slateblue-600">
          <span>Last contacted {formatRelativeDays(contact.keepInTouch.lastContactedAt)}</span>
          <button
            onClick={() => logContact.mutate()}
            className="rounded-lg bg-nest-100 px-3 py-1.5 text-xs font-medium text-nest-700 hover:bg-nest-200"
          >
            Log contact today
          </button>
        </div>
      </section>

      {(contact.emails.length > 0 || contact.phones.length > 0) && (
        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Contact info</h2>
          <div className="space-y-1 text-sm text-slateblue-600">
            {contact.emails.map((e) => (
              <div key={e.id}>
                <span className="text-slateblue-400">{e.label}: </span>
                {e.value}
              </div>
            ))}
            {contact.phones.map((p) => (
              <div key={p.id}>
                <span className="text-slateblue-400">{p.label}: </span>
                {p.value}
              </div>
            ))}
          </div>
        </section>
      )}

      {contact.notes && (
        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-slateblue-600">{contact.notes}</p>
        </section>
      )}

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
          Things to remember & interactions
        </h2>
        <div className="mb-4 space-y-2">
          {interactions?.length === 0 && <p className="text-sm text-slateblue-400">Nothing logged yet.</p>}
          {interactions?.map((interaction) => (
            <div key={interaction.id} className="flex items-start gap-2 rounded-lg bg-nest-50 px-3 py-2 text-sm">
              {interaction.important && <span title="Important">⭐</span>}
              <div className="flex-1">
                <p className="text-slateblue-700">{interaction.summary}</p>
                <p className="text-xs text-slateblue-400">{new Date(interaction.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddNote} className="flex flex-col gap-2">
          <textarea
            className="w-full rounded-lg border border-nest-200 px-3 py-2 text-sm focus:border-nest-400 focus:outline-none"
            placeholder="Log an interaction or something to remember..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slateblue-500">
              <input type="checkbox" checked={noteImportant} onChange={(e) => setNoteImportant(e.target.checked)} />
              Mark as important
            </label>
            <button type="submit" className="rounded-lg bg-nest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-nest-700">
              Add
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Connections</h2>
        <div className="mb-4 space-y-2">
          {relationships?.length === 0 && <p className="text-sm text-slateblue-400">No connections logged yet.</p>}
          {relationships?.map((rel) => {
            const otherId = rel.contactAId === id ? rel.contactBId : rel.contactAId;
            return (
              <div key={rel.id} className="flex items-center justify-between rounded-lg bg-nest-50 px-3 py-2 text-sm">
                <span>
                  {onNavigateContact ? (
                    <button
                      type="button"
                      onClick={() => onNavigateContact(otherId)}
                      className="font-medium text-nest-700 hover:underline"
                    >
                      {contactName(otherId)}
                    </button>
                  ) : (
                    <Link to={`/contacts/${otherId}`} className="font-medium text-nest-700 hover:underline">
                      {contactName(otherId)}
                    </Link>
                  )}
                  <span className="text-slateblue-400"> — {capitalize(rel.type)}</span>
                </span>
                <button onClick={() => deleteRelationship.mutate(rel.id)} className="text-xs text-slateblue-300 hover:text-red-500">
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleAddRelationship} className="flex flex-wrap gap-2">
          <select
            value={relContactId}
            onChange={(e) => setRelContactId(e.target.value)}
            className="flex-1 rounded-lg border border-nest-200 px-2 py-1.5 text-sm"
          >
            <option value="">Connect to...</option>
            {otherContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            className="rounded-lg border border-nest-200 px-2 py-1.5 text-sm"
          >
            {relationshipTypes?.map((t) => (
              <option key={t.id} value={t.name}>
                {capitalize(t.name)}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200">
            Add
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-dashed border-nest-300 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slateblue-400">Draft a message</h2>
          <span className="rounded-full bg-nest-100 px-2 py-0.5 text-[10px] font-medium text-nest-600">
            AI drafting coming in phase 2
          </span>
        </div>
        <div className="mb-3 space-y-2">
          {draftMessages?.map((d) => (
            <p key={d.id} className="rounded-lg bg-nest-50 px-3 py-2 text-sm text-slateblue-600">
              {d.draftText}
            </p>
          ))}
        </div>
        <form onSubmit={handleSaveDraft} className="flex flex-col gap-2">
          <textarea
            className="w-full rounded-lg border border-nest-200 px-3 py-2 text-sm focus:border-nest-400 focus:outline-none"
            placeholder="Write a message draft by hand for now..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <button
            type="submit"
            className="self-end rounded-lg bg-nest-100 px-3 py-1.5 text-xs font-medium text-nest-700 hover:bg-nest-200"
          >
            Save draft
          </button>
        </form>
      </section>
    </div>
  );
}
