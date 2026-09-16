import { FormEvent, useEffect, useState } from "react";
import type { Contact, ContactEmail, ContactPhone } from "@nestwork/shared";
import { useContact, useCreateContact, useUpdateContact } from "../api/contacts";
import { useCreateTag, useTags } from "../api/tags";
import { useCreateCircle, useCircles } from "../api/circles";
import { ApiError } from "../api/client";
import { FREQUENCY_PRESETS } from "../utils/keepInTouch";
import { readImageAsDataUrl } from "../utils/imageUpload";
import { ContactAvatar } from "./ContactAvatar";

type EmailDraft = Omit<ContactEmail, "id">;
type PhoneDraft = Omit<ContactPhone, "id">;

const NEW_TAG_COLORS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A"];

interface ContactFormContentProps {
  /** Omit to create a new contact instead of editing one. */
  contactId?: string;
  onSaved: (contact: Contact) => void;
  onCancel: () => void;
}

/** The add/edit contact form body, shared by the full-page route and the in-context web-view panel. */
export function ContactFormContent({ contactId, onSaved, onCancel }: ContactFormContentProps) {
  const isEditing = !!contactId;

  const { data: existing } = useContact(contactId);
  const { data: tags } = useTags();
  const { data: circles } = useCircles();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact(contactId ?? "");
  const createTag = useCreateTag();
  const createCircle = useCreateCircle();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [relationshipToMe, setRelationshipToMe] = useState("");
  const [howWeMet, setHowWeMet] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [emails, setEmails] = useState<EmailDraft[]>([]);
  const [phones, setPhones] = useState<PhoneDraft[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [frequencyDays, setFrequencyDays] = useState<number | undefined>(undefined);
  const [newTagName, setNewTagName] = useState("");
  const [newCircleName, setNewCircleName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setFirstName(existing.firstName);
    setLastName(existing.lastName ?? "");
    setNickname(existing.nickname ?? "");
    setPhotoUrl(existing.photoUrl ?? "");
    setRelationshipToMe(existing.relationshipToMe ?? "");
    setHowWeMet(existing.howWeMet ?? "");
    setCompany(existing.company ?? "");
    setJobTitle(existing.jobTitle ?? "");
    setBirthday(existing.birthday ? existing.birthday.slice(0, 10) : "");
    setNotes(existing.notes ?? "");
    setEmails(existing.emails.map((e) => ({ label: e.label, value: e.value })));
    setPhones(existing.phones.map((p) => ({ label: p.label, value: p.value })));
    setSelectedTagIds(existing.tagIds);
    setSelectedCircleIds(existing.circleIds);
    setFrequencyDays(existing.keepInTouch.frequencyDays);
  }, [existing]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id_) => id_ !== tagId) : [...prev, tagId]));
  }

  function toggleCircle(circleId: string) {
    setSelectedCircleIds((prev) =>
      prev.includes(circleId) ? prev.filter((id_) => id_ !== circleId) : [...prev, circleId]
    );
  }

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setPhotoError(null);
    try {
      setPhotoUrl(await readImageAsDataUrl(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't use that photo.");
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    const color = NEW_TAG_COLORS[Math.floor(Math.random() * NEW_TAG_COLORS.length)];
    const tag = await createTag.mutateAsync({ name: newTagName.trim(), color });
    setSelectedTagIds((prev) => [...prev, tag.id]);
    setNewTagName("");
  }

  async function handleCreateCircle() {
    if (!newCircleName.trim()) return;
    const color = NEW_TAG_COLORS[Math.floor(Math.random() * NEW_TAG_COLORS.length)];
    const circle = await createCircle.mutateAsync({ name: newCircleName.trim(), color });
    setSelectedCircleIds((prev) => [...prev, circle.id]);
    setNewCircleName("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      relationshipToMe: relationshipToMe.trim() || undefined,
      howWeMet: howWeMet.trim() || undefined,
      company: company.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      birthday: birthday || undefined,
      notes: notes.trim() || undefined,
      emails: emails.filter((e) => e.value.trim()),
      phones: phones.filter((p) => p.value.trim()),
      tagIds: selectedTagIds,
      circleIds: selectedCircleIds,
      keepInTouch: frequencyDays ? { frequencyDays } : undefined,
    };

    setSaveError(null);
    try {
      if (isEditing) {
        const updated = await updateContact.mutateAsync(payload);
        onSaved(updated);
      } else {
        const created = await createContact.mutateAsync(payload);
        onSaved(created);
      }
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the server -- check your connection and try again. Your changes haven't been lost."
      );
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slateblue-800">
        {isEditing ? "Edit Contact" : "Add Contact"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Basics</h2>
          <div className="mb-3 flex items-start gap-4">
            <ContactAvatar contact={{ firstName: firstName || "?", lastName, photoUrl }} className="h-14 w-14 text-lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded-lg bg-nest-100 px-3 py-1.5 text-xs font-medium text-nest-700 hover:bg-nest-200">
                  Upload photo
                  <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl("");
                      setPhotoError(null);
                    }}
                    className="text-xs font-medium text-slateblue-400 hover:text-red-500"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              {photoUrl.startsWith("data:") ? (
                <p className="rounded-lg border border-nest-200 bg-nest-50 px-3 py-2 text-sm text-slateblue-500">
                  Photo uploaded from device
                </p>
              ) : (
                <input
                  className={inputClass}
                  placeholder="...or paste a photo URL"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    setPhotoError(null);
                  }}
                />
              )}
              {photoError && <p className="text-xs text-red-600">{photoError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name*">
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Last name">
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field label="Nickname">
              <input className={inputClass} value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </Field>
            <Field label="Birthday">
              <input type="date" className={inputClass} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </Field>
            <Field label="Company">
              <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} />
            </Field>
            <Field label="Job title">
              <input className={inputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
            Your relationship
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Relationship to you">
              <input
                className={inputClass}
                placeholder="e.g. college friend, cousin, mentor"
                value={relationshipToMe}
                onChange={(e) => setRelationshipToMe(e.target.value)}
              />
            </Field>
            <Field label="How you met">
              <input className={inputClass} value={howWeMet} onChange={(e) => setHowWeMet(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
            Circles <span className="font-normal normal-case text-slateblue-400">-- where they fit in your life</span>
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {circles?.map((circle) => (
              <button
                type="button"
                key={circle.id}
                onClick={() => toggleCircle(circle.id)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-opacity"
                style={
                  selectedCircleIds.includes(circle.id)
                    ? { backgroundColor: circle.color, color: "white" }
                    : { backgroundColor: `${circle.color}22`, color: circle.color, opacity: 0.7 }
                }
              >
                {circle.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="New circle name"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCircle();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateCircle}
              className="shrink-0 rounded-lg bg-nest-100 px-3 py-2 text-sm font-medium text-nest-700 hover:bg-nest-200"
            >
              Add circle
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Contact info</h2>
          <RepeatingField
            label="Email"
            items={emails}
            onChange={setEmails}
            placeholder="name@example.com"
            defaultLabel="personal"
          />
          <RepeatingField
            label="Phone"
            items={phones}
            onChange={setPhones}
            placeholder="(555) 555-5555"
            defaultLabel="mobile"
          />
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
            Tags <span className="font-normal normal-case text-slateblue-400">-- what you know about them</span>
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-opacity"
                style={
                  selectedTagIds.includes(tag.id)
                    ? { backgroundColor: tag.color, color: "white" }
                    : { backgroundColor: `${tag.color}22`, color: tag.color, opacity: 0.7 }
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateTag}
              className="shrink-0 rounded-lg bg-nest-100 px-3 py-2 text-sm font-medium text-nest-700 hover:bg-nest-200"
            >
              Add tag
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
            Keep in touch
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFrequencyDays(undefined)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                frequencyDays === undefined ? "bg-nest-600 text-white" : "bg-nest-100 text-nest-700"
              }`}
            >
              No reminder
            </button>
            {FREQUENCY_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.days}
                onClick={() => setFrequencyDays(preset.days)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  frequencyDays === preset.days ? "bg-nest-600 text-white" : "bg-nest-100 text-nest-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-nest-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Notes</h2>
          <textarea
            className={`${inputClass} min-h-[100px]`}
            placeholder="Things to remember about this person..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {saveError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slateblue-500 hover:bg-nest-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateContact.isPending || createContact.isPending}
            className="rounded-lg bg-nest-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-nest-700 disabled:opacity-60"
          >
            {updateContact.isPending || createContact.isPending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Add contact"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slateblue-500">{label}</span>
      {children}
    </label>
  );
}

function RepeatingField<T extends { label: string; value: string }>({
  label,
  items,
  onChange,
  placeholder,
  defaultLabel,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  placeholder: string;
  defaultLabel: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slateblue-500">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, { label: defaultLabel, value: "" } as T])}
          className="text-xs font-medium text-nest-700 hover:underline"
        >
          + Add {label.toLowerCase()}
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="mb-2 flex items-end gap-2">
          {/* The actual email/phone goes here -- primary field, listed first. */}
          <div className="flex-1">
            <span className="mb-0.5 block text-[10px] font-medium text-slateblue-400">{label}</span>
            <input
              className={inputClass}
              placeholder={placeholder}
              value={item.value}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], value: e.target.value };
                onChange(next);
              }}
            />
          </div>
          {/* Just a category (e.g. "work", "mobile") -- secondary, kept small and clearly captioned
           * so it doesn't get mistaken for the field above and typed into by accident. */}
          <div className="w-24 shrink-0">
            <span className="mb-0.5 block text-[10px] font-medium text-slateblue-400">Type</span>
            <input
              className={inputClass}
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], label: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="shrink-0 px-2 pb-2 text-slateblue-300 hover:text-slateblue-500"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
