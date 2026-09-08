import type { Tag } from "@nestwork/shared";

export function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-[10px] leading-none opacity-60 hover:opacity-100"
          aria-label={`Remove ${tag.name} tag`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
