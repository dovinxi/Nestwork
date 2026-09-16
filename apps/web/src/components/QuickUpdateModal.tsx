import { useState } from "react";
import type { Contact, ContactUpdateInput, ContactUpdateSuggestion } from "@nestwork/shared";
import { useParseNote } from "../api/ai";
import { useUpdateContact } from "../api/contacts";
import { useCreateInteraction } from "../api/interactions";
import { useCreateTag } from "../api/tags";
import { useCreateCircle } from "../api/circles";
import { ApiError } from "../api/client";

const NEW_TAG_COLORS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A"];

interface QuickUpdateModalProps {
  contacts: Contact[];
  onClose: () => void;
}

/** Freeform-note -> structured contact updates. Nothing is written until the user reviews
 * and hits Apply on a specific contact -- the AI only ever produces a preview. */
export function QuickUpdateModal({ contacts, onClose }: QuickUpdateModalProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ suggestions: ContactUpdateSuggestion[]; unmatchedNames: string[] } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const parseNote = useParseNote();

  async function handleParse() {
    if (!text.trim()) return;
    setError(null);
    setResult(null);
    try {
      const parsed = await parseNote.mutateAsync({ text: text.trim() });
      setResult(parsed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the AI service. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slateblue-900/30 p-4 pt-12 sm:pt-20">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-nest-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slateblue-700">✨ Quick Update</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-slateblue-400 hover:bg-nest-100 hover:text-slateblue-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-sm text-slateblue-500">
            Describe what happened in your own words -- who it was, what you talked about, anything new. AI will
            suggest what to log and update; nothing changes until you approve it.
          </p>
          <textarea
            className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none"
            rows={4}
            placeholder={'e.g. "Grabbed coffee with Sarah today -- she just started a new job as a PM at Stripe and is moving to Austin. Feels like we\'re becoming closer friends."'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleParse}
              disabled={!text.trim() || parseNote.isPending}
              className="rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-nest-700 disabled:opacity-50"
            >
              {parseNote.isPending ? "Parsing..." : "✨ Parse with AI"}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-5 space-y-4 border-t border-nest-200 pt-4">
              {result.suggestions.length === 0 && result.unmatchedNames.length === 0 && (
                <p className="text-sm text-slateblue-400">
                  Nothing to update -- try describing who it involved and what happened.
                </p>
              )}

              {result.suggestions.map((suggestion) => {
                const contact = contacts.find((c) => c.id === suggestion.contactId);
                if (!contact) return null;
                return <SuggestionCard key={suggestion.contactId} suggestion={suggestion} contact={contact} />;
              })}

              {result.unmatchedNames.length > 0 && (
                <p className="rounded-lg bg-nest-50 px-3 py-2 text-xs text-slateblue-500">
                  Mentioned but not matched to a contact: {result.unmatchedNames.join(", ")} -- no changes made for
                  them.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, contact }: { suggestion: ContactUpdateSuggestion; contact: Contact }) {
  const [summary, setSummary] = useState(suggestion.interactionSummary);
  const [important, setImportant] = useState(suggestion.interactionImportant);
  const [checkedFields, setCheckedFields] = useState(new Set(suggestion.fieldUpdates.map((f) => f.field)));
  const [checkedTags, setCheckedTags] = useState(new Set(suggestion.addTags.map((t) => t.name)));
  const [checkedCircles, setCheckedCircles] = useState(new Set(suggestion.addCircles.map((c) => c.name)));
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const updateContact = useUpdateContact(suggestion.contactId);
  const createInteraction = useCreateInteraction();
  const createTag = useCreateTag();
  const createCircle = useCreateCircle();

  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, key: T) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSet(next);
  }

  async function handleApply() {
    setApplyError(null);
    try {
      const tagIds = [...contact.tagIds];
      for (const tag of suggestion.addTags) {
        if (!checkedTags.has(tag.name)) continue;
        let id = tag.existingTagId;
        if (!id) {
          const color = NEW_TAG_COLORS[Math.floor(Math.random() * NEW_TAG_COLORS.length)];
          const created = await createTag.mutateAsync({ name: tag.name, color });
          id = created.id;
        }
        if (!tagIds.includes(id)) tagIds.push(id);
      }

      const circleIds = [...contact.circleIds];
      for (const circle of suggestion.addCircles) {
        if (!checkedCircles.has(circle.name)) continue;
        let id = circle.existingCircleId;
        if (!id) {
          const color = NEW_TAG_COLORS[Math.floor(Math.random() * NEW_TAG_COLORS.length)];
          const created = await createCircle.mutateAsync({ name: circle.name, color });
          id = created.id;
        }
        if (!circleIds.includes(id)) circleIds.push(id);
      }

      const fieldPatch: ContactUpdateInput = {};
      for (const f of suggestion.fieldUpdates) {
        if (checkedFields.has(f.field)) fieldPatch[f.field] = f.suggestedValue;
      }

      await updateContact.mutateAsync({ ...fieldPatch, tagIds, circleIds });

      if (summary.trim()) {
        await createInteraction.mutateAsync({
          contactId: suggestion.contactId,
          date: new Date().toISOString(),
          type: "note",
          summary: summary.trim(),
          important,
        });
      }

      setApplied(true);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : "Couldn't apply these updates. Please try again.");
    }
  }

  const isApplying = updateContact.isPending || createInteraction.isPending || createTag.isPending || createCircle.isPending;

  return (
    <div className={`rounded-xl border p-4 ${applied ? "border-emerald-200 bg-emerald-50/50" : "border-nest-200 bg-white"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slateblue-800">{suggestion.contactName}</h3>
        {applied ? (
          <span className="text-xs font-medium text-emerald-600">✓ Applied</span>
        ) : (
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="rounded-lg bg-nest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-nest-700 disabled:opacity-50"
          >
            {isApplying ? "Applying..." : `Apply to ${contact.firstName}`}
          </button>
        )}
      </div>

      <label className="mb-2 block">
        <span className="mb-1 block text-xs font-medium text-slateblue-500">Log as interaction</span>
        <textarea
          className="w-full rounded-lg border border-nest-200 bg-white px-2 py-1.5 text-sm text-slateblue-800 focus:border-nest-400 focus:outline-none disabled:bg-nest-50 disabled:text-slateblue-400"
          rows={2}
          value={summary}
          disabled={applied}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      <label className="mb-3 flex items-center gap-1.5 text-xs text-slateblue-500">
        <input type="checkbox" checked={important} disabled={applied} onChange={(e) => setImportant(e.target.checked)} />
        Mark as important
      </label>

      {suggestion.fieldUpdates.length > 0 && (
        <div className="mb-3 space-y-1">
          {suggestion.fieldUpdates.map((f) => (
            <label key={f.field} className="flex items-center gap-1.5 text-xs text-slateblue-600">
              <input
                type="checkbox"
                checked={checkedFields.has(f.field)}
                disabled={applied}
                onChange={() => toggle(checkedFields, setCheckedFields, f.field)}
              />
              <span className="font-medium">{f.label}:</span> {f.suggestedValue}
              {f.currentValue && <span className="text-slateblue-300"> (was: {f.currentValue})</span>}
            </label>
          ))}
        </div>
      )}

      {(suggestion.addTags.length > 0 || suggestion.addCircles.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.addTags.map((tag) => {
            const checked = checkedTags.has(tag.name);
            return (
              <button
                key={tag.name}
                type="button"
                disabled={applied}
                onClick={() => toggle(checkedTags, setCheckedTags, tag.name)}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity disabled:opacity-70"
                style={checked ? { backgroundColor: "#4F80B4", color: "white" } : { backgroundColor: "#EAF2FB", color: "#8C9AAC" }}
              >
                {tag.name}
                {!tag.existingTagId && " (new)"}
              </button>
            );
          })}
          {suggestion.addCircles.map((circle) => {
            const checked = checkedCircles.has(circle.name);
            return (
              <button
                key={circle.name}
                type="button"
                disabled={applied}
                onClick={() => toggle(checkedCircles, setCheckedCircles, circle.name)}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity disabled:opacity-70"
                style={checked ? { backgroundColor: "#2E4F70", color: "white" } : { backgroundColor: "#EAF2FB", color: "#8C9AAC" }}
              >
                {circle.name}
                {!circle.existingCircleId && " (new)"}
              </button>
            );
          })}
        </div>
      )}

      {applyError && <p className="mt-2 text-xs text-red-600">{applyError}</p>}
    </div>
  );
}
