import type { Contact } from "@nestwork/shared";
import { getProfileCompletion } from "../utils/profileCompletion";

export function ProfileCompletionBar({ contact }: { contact: Contact }) {
  const { completed, total, missing } = getProfileCompletion(contact);
  const pct = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <div className="rounded-xl border border-nest-200 bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-slateblue-400">Profile completion</span>
        <span className={`font-medium ${isComplete ? "text-emerald-600" : "text-slateblue-500"}`}>
          {isComplete ? "Complete! 🎉" : `${completed} / ${total} fields`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-nest-100">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-nest-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isComplete && (
        <p className="mt-1.5 text-xs text-slateblue-400">
          Add {missing.slice(0, 3).join(", ")}
          {missing.length > 3 ? `, +${missing.length - 3} more` : ""} to fill this out.
        </p>
      )}
    </div>
  );
}
