import type { Circle } from "@nestwork/shared";

/** Visually distinct from TagBadge (solid pill, rounded-md) -- circles are the
 * structural "where they fit" grouping, tags are lighter freeform attributes. */
export function CircleBadge({ circle, onRemove }: { circle: Circle; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: circle.color }}
    >
      {circle.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-[10px] leading-none opacity-70 hover:opacity-100"
          aria-label={`Remove ${circle.name} circle`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
