import { useEffect, useState } from "react";
import type { Circle, Contact, Tag } from "@nestwork/shared";
import { FREQUENCY_PRESETS } from "../utils/keepInTouch";

type ExpandedAction = "note" | "reminder" | "circle" | null;

type PendingAction =
  | { id: string; kind: "addTag"; tagId: string; label: string }
  | { id: string; kind: "removeTag"; tagId: string; label: string }
  | { id: string; kind: "addCircle"; circleId: string; label: string }
  | { id: string; kind: "markContactedToday"; label: string }
  | { id: string; kind: "logNote"; summary: string; label: string }
  | { id: string; kind: "setReminder"; frequencyDays: number; label: string }
  | { id: string; kind: "saveAsCircle"; name: string; label: string };

interface SelectionTrayProps {
  contacts: Contact[];
  tags: Tag[];
  circles: Circle[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onExit: () => void;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onAddCircle: (circleId: string) => void;
  onLogContactToday: () => void;
  onLogNote: (summary: string) => void;
  onSetReminder: (frequencyDays: number) => void;
  onSaveAsCircle: (name: string) => void;
  isBusy?: boolean;
  /** Include yourself as a selected member of the group -- pass your display name and a handler to deselect. */
  me?: { name: string; onRemove: () => void } | null;
}

const menuSelectClass =
  "w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-left text-sm text-slateblue-700 focus:border-nest-400 focus:outline-none disabled:opacity-50";
const menuButtonClass =
  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slateblue-700 hover:bg-nest-100 disabled:opacity-50";
const sectionLabelClass = "px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slateblue-400";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
}

/**
 * Floating tray for the Nest's selection mode. Picking an action from the "Actions" menu only
 * queues it -- nothing is sent to the server until "Save changes" is pressed, so a wrong pick
 * can just be removed from the queue instead of needing an undo.
 */
export function SelectionTray({
  contacts,
  tags,
  circles,
  onRemove,
  onClear,
  onExit,
  onAddTag,
  onRemoveTag,
  onAddCircle,
  onLogContactToday,
  onLogNote,
  onSetReminder,
  onSaveAsCircle,
  isBusy,
  me,
}: SelectionTrayProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedAction>(null);
  const [noteText, setNoteText] = useState("");
  const [circleName, setCircleName] = useState("");
  const [pending, setPending] = useState<PendingAction[]>([]);

  const totalCount = contacts.length + (me ? 1 : 0);

  // A queued edit only makes sense for the selection it was made against -- once that selection
  // empties out (Clear, or removing everyone), drop anything still pending instead of letting it
  // silently apply to whoever gets selected next.
  useEffect(() => {
    if (totalCount === 0) setPending((prev) => (prev.length ? [] : prev));
  }, [totalCount]);

  if (!totalCount) return null;

  function addPending(action: PendingAction) {
    setPending((prev) => {
      if (action.kind === "setReminder") return [...prev.filter((a) => a.kind !== "setReminder"), action];
      if (action.kind === "markContactedToday" && prev.some((a) => a.kind === "markContactedToday")) return prev;
      if (action.kind === "addTag" && prev.some((a) => a.kind === "addTag" && a.tagId === action.tagId)) return prev;
      if (action.kind === "removeTag" && prev.some((a) => a.kind === "removeTag" && a.tagId === action.tagId)) return prev;
      if (action.kind === "addCircle" && prev.some((a) => a.kind === "addCircle" && a.circleId === action.circleId)) return prev;
      return [...prev, action];
    });
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSaveChanges() {
    for (const action of pending) {
      switch (action.kind) {
        case "addTag":
          onAddTag(action.tagId);
          break;
        case "removeTag":
          onRemoveTag(action.tagId);
          break;
        case "addCircle":
          onAddCircle(action.circleId);
          break;
        case "markContactedToday":
          onLogContactToday();
          break;
        case "logNote":
          onLogNote(action.summary);
          break;
        case "setReminder":
          onSetReminder(action.frequencyDays);
          break;
        case "saveAsCircle":
          onSaveAsCircle(action.name);
          break;
      }
    }
    setPending([]);
    setMenuOpen(false);
    setExpanded(null);
  }

  function handleQueueNote() {
    if (!noteText.trim()) return;
    addPending({ id: newId(), kind: "logNote", summary: noteText.trim(), label: `Note: "${noteText.trim()}"` });
    setNoteText("");
    setExpanded(null);
  }

  function handleQueueSaveAsCircle() {
    if (!circleName.trim()) return;
    addPending({ id: newId(), kind: "saveAsCircle", name: circleName.trim(), label: `New circle: "${circleName.trim()}"` });
    setCircleName("");
    setExpanded(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 md:bottom-0 md:pb-6">
      <div className="relative w-full max-w-3xl">
        {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />}

        <div className="relative z-40 flex flex-col gap-3 rounded-xl border border-nest-200 bg-white px-4 py-3 shadow-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {me && (
                  <button
                    type="button"
                    title="Remove yourself"
                    onClick={me.onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-nest-800 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    {me.name[0]?.toUpperCase() || "?"}
                  </button>
                )}
                {contacts.slice(0, me ? 5 : 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`Remove ${c.firstName}`}
                    onClick={() => onRemove(c.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-nest-600 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    {`${c.firstName[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?"}
                  </button>
                ))}
                {contacts.length > (me ? 5 : 6) && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-nest-200 text-xs font-semibold text-nest-700">
                    +{contacts.length - (me ? 5 : 6)}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-slateblue-700">
                {totalCount} {totalCount === 1 ? "person" : "people"} selected
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  menuOpen ? "bg-nest-700 text-white" : "bg-nest-100 text-nest-700 hover:bg-nest-200"
                }`}
              >
                Actions ▾
              </button>
              <button
                onClick={() => {
                  onClear();
                  setPending([]);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slateblue-500 hover:bg-nest-100"
              >
                Clear
              </button>
              <button onClick={onExit} className="rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200">
                Done
              </button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-nest-100 pt-3">
              <div className="flex flex-wrap gap-2">
                {pending.map((action) => (
                  <span
                    key={action.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-nest-50 py-1 pl-3 pr-1.5 text-xs font-medium text-nest-800"
                  >
                    {action.label}
                    <button
                      disabled={isBusy}
                      onClick={() => removePending(action.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-nest-500 hover:bg-nest-200 hover:text-nest-800 disabled:opacity-50"
                      aria-label="Remove this queued change"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  disabled={isBusy}
                  onClick={() => setPending([])}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slateblue-500 hover:bg-nest-100 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  disabled={isBusy}
                  onClick={handleSaveChanges}
                  className="rounded-lg bg-nest-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-nest-700 disabled:opacity-50"
                >
                  Save changes ({pending.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {menuOpen && (
          <div className="absolute bottom-full right-0 z-40 mb-2 max-h-[70vh] w-full space-y-1 overflow-y-auto rounded-xl border border-nest-200 bg-white p-3 shadow-2xl sm:w-80">
            <p className={sectionLabelClass}>Edit</p>
            {!!tags.length && (
              <select
                defaultValue=""
                disabled={isBusy}
                onChange={(e) => {
                  const tagId = e.target.value;
                  const tag = tags.find((t) => t.id === tagId);
                  if (tagId && tag) addPending({ id: newId(), kind: "addTag", tagId, label: `+ Tag: ${tag.name}` });
                  e.target.value = "";
                }}
                className={menuSelectClass}
              >
                <option value="" disabled>
                  + Tag all with...
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}
            {!!tags.length && (
              <select
                defaultValue=""
                disabled={isBusy}
                onChange={(e) => {
                  const tagId = e.target.value;
                  const tag = tags.find((t) => t.id === tagId);
                  if (tagId && tag) addPending({ id: newId(), kind: "removeTag", tagId, label: `− Tag: ${tag.name}` });
                  e.target.value = "";
                }}
                className={menuSelectClass}
              >
                <option value="" disabled>
                  − Remove tag...
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}
            {!!circles.length && (
              <select
                defaultValue=""
                disabled={isBusy}
                onChange={(e) => {
                  const circleId = e.target.value;
                  const circle = circles.find((c) => c.id === circleId);
                  if (circleId && circle)
                    addPending({ id: newId(), kind: "addCircle", circleId, label: `+ Circle: ${circle.name}` });
                  e.target.value = "";
                }}
                className={menuSelectClass}
              >
                <option value="" disabled>
                  + Add to circle...
                </option>
                {circles.map((circle) => (
                  <option key={circle.id} value={circle.id}>
                    {circle.name}
                  </option>
                ))}
              </select>
            )}

            <p className={sectionLabelClass}>Log &amp; remind</p>
            <button
              disabled={isBusy}
              onClick={() => addPending({ id: newId(), kind: "markContactedToday", label: "Mark contacted today" })}
              className={menuButtonClass}
            >
              Mark contacted today
            </button>
            <button disabled={isBusy} onClick={() => setExpanded((v) => (v === "note" ? null : "note"))} className={menuButtonClass}>
              Log a note...
            </button>
            {expanded === "note" && (
              <div className="flex gap-2 px-1">
                <input
                  autoFocus
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQueueNote()}
                  placeholder="e.g. Invited to the reunion"
                  className="flex-1 rounded-lg border border-nest-200 px-3 py-1.5 text-sm focus:border-nest-400 focus:outline-none"
                />
                <button
                  disabled={isBusy || !noteText.trim()}
                  onClick={handleQueueNote}
                  className="shrink-0 rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
            <button
              disabled={isBusy}
              onClick={() => setExpanded((v) => (v === "reminder" ? null : "reminder"))}
              className={menuButtonClass}
            >
              Set reminder...
            </button>
            {expanded === "reminder" && (
              <div className="flex flex-wrap gap-2 px-1">
                {FREQUENCY_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    disabled={isBusy}
                    onClick={() => {
                      addPending({ id: newId(), kind: "setReminder", frequencyDays: preset.days, label: `Reminder: ${preset.label}` });
                      setExpanded(null);
                    }}
                    className="rounded-full bg-nest-100 px-3 py-1 text-xs font-medium text-nest-700 hover:bg-nest-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <p className={sectionLabelClass}>Save</p>
            <button
              disabled={isBusy}
              onClick={() => setExpanded((v) => (v === "circle" ? null : "circle"))}
              className={menuButtonClass}
            >
              Save as Circle...
            </button>
            {expanded === "circle" && (
              <div className="flex gap-2 px-1">
                <input
                  autoFocus
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQueueSaveAsCircle()}
                  placeholder="e.g. 2026 Wedding Guests"
                  className="flex-1 rounded-lg border border-nest-200 px-3 py-1.5 text-sm focus:border-nest-400 focus:outline-none"
                />
                <button
                  disabled={isBusy || !circleName.trim()}
                  onClick={handleQueueSaveAsCircle}
                  className="shrink-0 rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
