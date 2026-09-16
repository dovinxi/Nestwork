import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Contact, ProfileStat, Tag } from "@nestwork/shared";
import {
  useBulkAddCircle,
  useBulkAddTag,
  useBulkLogContactToday,
  useBulkRemoveTag,
  useBulkSetKeepInTouch,
  useContacts,
} from "../api/contacts";
import { useBulkLogInteraction } from "../api/interactions";
import { useRelationships } from "../api/relationships";
import { useProfile } from "../api/profile";
import { useCircles, useCreateCircle } from "../api/circles";
import { useTags } from "../api/tags";
import { useProfileStats } from "../api/stats";
import { AddContactPanel } from "../components/AddContactPanel";
import { QuickUpdateModal } from "../components/QuickUpdateModal";
import { ContactPreviewPanel } from "../components/ContactPreviewPanel";
import { SelectionTray } from "../components/SelectionTray";
import { StatCard } from "../components/StatCard";
import { capitalize } from "../utils/text";

const SIZE = 700;
const CENTER = SIZE / 2;
const NODE_RADIUS = 22;
const CENTER_NODE_RADIUS = 28;
const MIN_BUBBLE_RADIUS = 50;
const MAX_BUBBLE_RADIUS = 100;
const RADIUS_PER_SQRT_MEMBER = 20;
const INNER_CLEARANCE = 90; // min distance from Me to the nearest edge of any bubble
const CANVAS_MAX_R = SIZE / 2 - 40; // keeps every bubble's outer edge (+ label) inside the viewBox
const BUBBLE_PADDING = 18; // min gap enforced between adjacent bubble edges
const UNSORTED_COLOR = "#B9C4D0";
const NEW_CIRCLE_COLORS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A"];
const ZOOM_FILL_RATIO = 0.85; // how much of the canvas the zoomed bubble should occupy
const ZOOM_MIN_SCALE = 1.4;
const ZOOM_MAX_SCALE = 3;

// Free-form pan/zoom on the canvas itself -- wheel/trackpad/pinch, independent of the
// click-to-zoom-into-a-circle feature above (the two compose: you can wheel-zoom further
// into wherever you clicked). Kept unbounded on pan so the canvas can grow later without
// the interaction model needing to change.
const VIEW_MIN_SCALE = 0.5;
const VIEW_MAX_SCALE = 6;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const DRAG_THRESHOLD_PX = 4; // below this, a pointer-down+up on empty space counts as a click, not a pan

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointAt(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function polar(radius: number, angle: number) {
  return pointAt(CENTER, CENTER, radius, angle);
}

/** A contact's node on the web -- their photo when set (falling back to initials, including
 * on a broken image URL), clipped to the node's circle. */
function NestContactNode({
  contact,
  x,
  y,
  isSelected,
  onClick,
}: {
  contact: Contact;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = `${contact.firstName[0] ?? ""}${contact.lastName?.[0] ?? ""}`.toUpperCase();
  const showPhoto = !!contact.photoUrl && !imageFailed;

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} className="rel-node cursor-pointer">
      {isSelected && <circle r={NODE_RADIUS + 6} fill="none" stroke="#F5A623" strokeWidth={3} />}
      <circle className="rel-node-circle" r={NODE_RADIUS} fill="#4F80B4" />
      {showPhoto ? (
        <>
          <clipPath id={`avatar-clip-${contact.id}`}>
            <circle r={NODE_RADIUS} />
          </clipPath>
          <image
            href={contact.photoUrl}
            x={-NODE_RADIUS}
            y={-NODE_RADIUS}
            width={NODE_RADIUS * 2}
            height={NODE_RADIUS * 2}
            clipPath={`url(#avatar-clip-${contact.id})`}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setImageFailed(true)}
          />
        </>
      ) : (
        <text textAnchor="middle" dy="0.35em" fontSize={12} fill="white" fontWeight={600}>
          {initials || "?"}
        </text>
      )}
      <text textAnchor="middle" y={NODE_RADIUS + 16} fontSize={11} fill="#37414F">
        {contact.firstName}
      </text>
    </g>
  );
}

/** The "Hide all"/"Show all" toggle plus one pill per tag -- shared between the desktop
 * inline row and the mobile dropdown panel so the two stay in sync automatically. */
function TagVisibilityPills({
  tags,
  hiddenTagIds,
  onToggleAll,
  onToggleTag,
}: {
  tags: Tag[];
  hiddenTagIds: Set<string>;
  onToggleAll: () => void;
  onToggleTag: (tagId: string) => void;
}) {
  return (
    <>
      <button
        onClick={onToggleAll}
        className="shrink-0 rounded-full border border-dashed border-nest-300 px-3 py-1 text-xs font-medium text-slateblue-500 hover:border-nest-400"
      >
        {hiddenTagIds.size ? "Show all" : "Hide all"}
      </button>
      {tags.map((tag) => {
        const hidden = hiddenTagIds.has(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-opacity"
            style={
              hidden
                ? { backgroundColor: `${tag.color}22`, color: tag.color, opacity: 0.5 }
                : { backgroundColor: tag.color, color: "white" }
            }
            title={hidden ? `Show "${tag.name}" connection lines` : `Hide "${tag.name}" connection lines`}
          >
            {tag.name}
          </button>
        );
      })}
    </>
  );
}

/** Area-proportional so bubble *size* (not radius) tracks member count -- how people actually perceive it. */
function bubbleRadiusFor(memberCount: number) {
  const raw = MIN_BUBBLE_RADIUS + RADIUS_PER_SQRT_MEMBER * Math.sqrt(memberCount);
  return Math.min(MAX_BUBBLE_RADIUS, raw);
}

/**
 * Places every bubble on a single shared ring so overlap can be solved with one
 * number: the ring radius R. Two bubbles i, j on a ring of radius R with center
 * angle gap Δθ are exactly touching when 2*R*sin(Δθ/2) = r_i + r_j + padding, so
 * binary-search the smallest R that lets every neighbor pair clear that gap
 * around the full circle -- guarantees no overlap regardless of member counts.
 */
function solveRingLayout(radii: number[]) {
  const n = radii.length;
  if (n === 0) return { ringRadius: 0, angles: [] as number[] };
  if (n === 1) return { ringRadius: INNER_CLEARANCE + radii[0], angles: [-Math.PI / 2] };

  const minRingRadius = INNER_CLEARANCE + Math.max(...radii);
  const outerBound = Math.max(minRingRadius, CANVAS_MAX_R - Math.max(...radii));

  const requiredGap = (i: number, j: number, R: number) => {
    const chord = radii[i] + radii[j] + BUBBLE_PADDING;
    return 2 * Math.asin(Math.min(1, chord / (2 * R)));
  };
  const totalAngleAt = (R: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += requiredGap(i, (i + 1) % n, R);
    return sum;
  };

  let lo = minRingRadius;
  let hi = Math.max(minRingRadius, outerBound);
  if (totalAngleAt(hi) > 2 * Math.PI) {
    // Even at the max canvas-safe radius it's tight -- widen the search so the
    // binary search below still converges (bubbles may end up a bit larger
    // than the canvas guideline in this edge case, which is preferable to
    // overlapping bubbles).
    hi = minRingRadius;
    let guard = 0;
    while (totalAngleAt(hi) > 2 * Math.PI && guard < 60) {
      hi = hi * 1.4 + 10;
      guard++;
    }
  }
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    if (totalAngleAt(mid) > 2 * Math.PI) lo = mid;
    else hi = mid;
  }
  const R = Math.max(hi, minRingRadius);

  const rawGaps = radii.map((_, i) => requiredGap(i, (i + 1) % n, R));
  const rawTotal = rawGaps.reduce((a, b) => a + b, 0);
  const scale = rawTotal > 2 * Math.PI ? (2 * Math.PI) / rawTotal : 1;
  const gaps = rawGaps.map((g) => g * scale);
  const slackPerGap = Math.max(0, (2 * Math.PI - gaps.reduce((a, b) => a + b, 0)) / n);

  const angles = [-Math.PI / 2];
  for (let i = 1; i < n; i++) angles.push(angles[i - 1] + gaps[i - 1] + slackPerGap);

  return { ringRadius: R, angles };
}

export function NestPage() {
  const [search, setSearch] = useState("");
  const { data: contacts } = useContacts({ search: search || undefined });
  const hasContacts = !!contacts?.length; // svg only mounts once this is true -- effects below key off it, not []
  const { data: relationships } = useRelationships();
  const { data: profile } = useProfile();
  const { data: circles } = useCircles();
  const { data: tags } = useTags();
  const navigate = useNavigate();
  const location = useLocation();

  // The contact popup lives in the URL (?contact=id) instead of local state, so the browser's
  // back button closes it and returns here instead of leaving the page entirely.
  const selectedContactId = new URLSearchParams(location.search).get("contact");

  function showContact(id: string) {
    const search = `?contact=${id}`;
    if (selectedContactId) {
      // Popup already open -- swap who it shows without growing the back-stack, so one Back
      // press always returns to the bare web regardless of how many contacts were viewed.
      navigate({ pathname: location.pathname, search }, { replace: true });
    } else {
      navigate({ pathname: location.pathname, search });
    }
  }

  function closeContactPanel() {
    if (selectedContactId) navigate(-1);
  }

  const [zoomedKey, setZoomedKey] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [viewTransitionEnabled, setViewTransitionEnabled] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(
    null
  );
  const isViewChanged = view.x !== 0 || view.y !== 0 || view.scale !== 1;

  function animateViewTo(next: { x: number; y: number; scale: number }) {
    setViewTransitionEnabled(true);
    setView(next);
  }

  // Wheel/trackpad-pinch zoom, anchored to the cursor. Attached as a native (non-passive)
  // listener because React's onWheel is passive by default, which would silently no-op
  // preventDefault -- and without it, this gesture zooms the whole page instead of the canvas.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = svg!.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * SIZE;
      const cy = ((e.clientY - rect.top) / rect.height) * SIZE;
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);

      setViewTransitionEnabled(false);
      setView((prev) => {
        const nextScale = clamp(prev.scale * factor, VIEW_MIN_SCALE, VIEW_MAX_SCALE);
        if (nextScale === prev.scale) return prev;
        return {
          scale: nextScale,
          x: cx - (nextScale * (cx - prev.x)) / prev.scale,
          y: cy - (nextScale * (cy - prev.y)) / prev.scale,
        };
      });
    }

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [hasContacts]);

  // Two-finger pinch-to-zoom/pan on touch devices -- same non-passive-listener reasoning as
  // the wheel handler above, so it doesn't also trigger the browser's native page pinch-zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let pinch: { dist: number; scale: number; worldX: number; worldY: number } | null = null;

    function touchPoint(t: Touch) {
      const rect = svg!.getBoundingClientRect();
      return { x: ((t.clientX - rect.left) / rect.width) * SIZE, y: ((t.clientY - rect.top) / rect.height) * SIZE };
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const p1 = touchPoint(e.touches[0]);
      const p2 = touchPoint(e.touches[1]);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      setViewTransitionEnabled(false);
      setView((prev) => {
        pinch = {
          dist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
          scale: prev.scale,
          worldX: (midX - prev.x) / prev.scale,
          worldY: (midY - prev.y) / prev.scale,
        };
        return prev;
      });
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinch) return;
      e.preventDefault();
      const p1 = touchPoint(e.touches[0]);
      const p2 = touchPoint(e.touches[1]);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const nextScale = clamp(pinch.scale * (dist / pinch.dist), VIEW_MIN_SCALE, VIEW_MAX_SCALE);
      setView({ scale: nextScale, x: midX - nextScale * pinch.worldX, y: midY - nextScale * pinch.worldY });
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinch = null;
    }

    svg.addEventListener("touchstart", handleTouchStart, { passive: false });
    svg.addEventListener("touchmove", handleTouchMove, { passive: false });
    svg.addEventListener("touchend", handleTouchEnd);
    svg.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      svg.removeEventListener("touchstart", handleTouchStart);
      svg.removeEventListener("touchmove", handleTouchMove);
      svg.removeEventListener("touchend", handleTouchEnd);
      svg.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [hasContacts]);

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGRectElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nice-to-have (keeps the drag going if the cursor leaves the canvas) --
      // panning still works via normal event bubbling if the browser refuses it.
    }
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, originX: view.x, originY: view.y, moved: false };
  }

  function handleBackgroundPointerMove(e: React.PointerEvent<SVGRectElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const rawDx = e.clientX - drag.startX;
    const rawDy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(rawDx, rawDy) > DRAG_THRESHOLD_PX) drag.moved = true;
    if (!drag.moved) return;

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const unitsPerPixel = SIZE / rect.width;
    setViewTransitionEnabled(false);
    setView((prev) => ({ ...prev, x: drag.originX + rawDx * unitsPerPixel, y: drag.originY + rawDy * unitsPerPixel }));
  }

  function handleBackgroundPointerUp() {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    if (drag && !drag.moved) handleBackgroundClick();
  }

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [meSelected, setMeSelected] = useState(false);
  const [meImageFailed, setMeImageFailed] = useState(false);
  const bulkAddTag = useBulkAddTag();
  const bulkRemoveTag = useBulkRemoveTag();
  const bulkAddCircle = useBulkAddCircle();
  const bulkSetKeepInTouch = useBulkSetKeepInTouch();
  const bulkLogContactToday = useBulkLogContactToday();
  const bulkLogInteraction = useBulkLogInteraction();
  const createCircle = useCreateCircle();

  const isBulkActionBusy =
    bulkAddTag.isPending ||
    bulkRemoveTag.isPending ||
    bulkAddCircle.isPending ||
    bulkSetKeepInTouch.isPending ||
    bulkLogContactToday.isPending ||
    bulkLogInteraction.isPending ||
    createCircle.isPending;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedContacts = useMemo(
    () => (contacts ?? []).filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds]
  );

  async function handleSaveAsCircle(name: string) {
    const color = NEW_CIRCLE_COLORS[Math.floor(Math.random() * NEW_CIRCLE_COLORS.length)];
    const circle = await createCircle.mutateAsync({ name, color });
    await bulkAddCircle.mutateAsync({ contacts: selectedContacts, circleId: circle.id });
  }

  const layout = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const bubbles: { key: string; name: string; color: string; cx: number; cy: number; radius: number }[] = [];
    if (!contacts?.length) return { positions, bubbles };

    // Group contacts by primary circle (first circleId), or "unsorted".
    const groups = new Map<string, Contact[]>();
    for (const contact of contacts) {
      const key = contact.circleIds[0] ?? "unsorted";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(contact);
    }

    const circleById = new Map((circles ?? []).map((c) => [c.id, c]));
    const clusterKeys = [...groups.keys()].sort((a, b) => {
      if (a === "unsorted") return 1;
      if (b === "unsorted") return -1;
      return (circleById.get(a)?.name ?? "").localeCompare(circleById.get(b)?.name ?? "");
    });

    const radii = clusterKeys.map((key) => bubbleRadiusFor(groups.get(key)!.length));
    const { ringRadius, angles } = solveRingLayout(radii);

    clusterKeys.forEach((key, i) => {
      const members = groups.get(key)!;
      const bubbleRadius = radii[i];
      const hub = polar(ringRadius, angles[i]);

      if (members.length === 1) {
        positions.set(members[0].id, hub);
      } else {
        const subRadius = Math.max(0, bubbleRadius - NODE_RADIUS - 10);
        members.forEach((member, j) => {
          const memberAngle = -Math.PI / 2 + (j / members.length) * 2 * Math.PI;
          positions.set(member.id, pointAt(hub.x, hub.y, subRadius, memberAngle));
        });
      }

      const circle = key === "unsorted" ? undefined : circleById.get(key);
      bubbles.push({
        key,
        name: circle?.name ?? "Unsorted",
        color: circle?.color ?? UNSORTED_COLOR,
        cx: hub.x,
        cy: hub.y,
        radius: bubbleRadius,
      });
    });

    return { positions, bubbles };
  }, [contacts, circles]);

  const tagLinks = useMemo(() => {
    if (!contacts?.length || !tags?.length) return [];
    const links: { key: string; a: string; b: string; color: string; tagId: string; tagName: string }[] = [];
    for (const tag of tags) {
      const members = contacts.filter((c) => c.tagIds.includes(tag.id));
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({
            key: `${tag.id}-${members[i].id}-${members[j].id}`,
            a: members[i].id,
            b: members[j].id,
            color: tag.color,
            tagId: tag.id,
            tagName: tag.name,
          });
        }
      }
    }
    return links;
  }, [contacts, tags]);

  // Tags actually present as connection lines right now -- no point offering a toggle for a
  // tag nobody shares. Empty set = every tag's lines are shown (the pre-existing behavior).
  const tagsWithLinks = useMemo(() => {
    const ids = new Set(tagLinks.map((l) => l.tagId));
    return (tags ?? []).filter((t) => ids.has(t.id));
  }, [tagLinks, tags]);
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<string>>(new Set());
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const visibleTagLinks = useMemo(
    () => tagLinks.filter((l) => !hiddenTagIds.has(l.tagId)),
    [tagLinks, hiddenTagIds]
  );

  function toggleTagLinesHidden(tagId: string) {
    setHiddenTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  const zoomedBubble = zoomedKey ? layout.bubbles.find((b) => b.key === zoomedKey) : undefined;

  const { data: networkStats } = useProfileStats();

  const clusterStats = useMemo<ProfileStat[] | null>(() => {
    if (!zoomedBubble || !contacts?.length) return null;

    const members = contacts.filter((c) => (c.circleIds[0] ?? "unsorted") === zoomedBubble.key);
    if (!members.length) return null;
    const memberIds = new Set(members.map((c) => c.id));

    // Same "connectivity" definition used by the profile stats (relationship edges +
    // shared tags), computed across the whole web so a circle's "hub" reflects how
    // plugged in that person is overall, not just within this cluster.
    const linked = new Map<string, Set<string>>();
    for (const c of contacts) linked.set(c.id, new Set());
    for (const rel of relationships ?? []) {
      linked.get(rel.contactAId)?.add(rel.contactBId);
      linked.get(rel.contactBId)?.add(rel.contactAId);
    }
    const tagToContactIds = new Map<string, string[]>();
    for (const c of contacts) {
      for (const tagId of c.tagIds) {
        if (!tagToContactIds.has(tagId)) tagToContactIds.set(tagId, []);
        tagToContactIds.get(tagId)!.push(c.id);
      }
    }
    for (const ids of tagToContactIds.values()) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          linked.get(ids[i])?.add(ids[j]);
          linked.get(ids[j])?.add(ids[i]);
        }
      }
    }

    const ranked = members
      .map((c) => ({ contact: c, score: linked.get(c.id)?.size ?? 0 }))
      .sort((a, b) => b.score - a.score || a.contact.firstName.localeCompare(b.contact.firstName));
    const hub = ranked[0];

    const internalLinks = (relationships ?? []).filter(
      (rel) => memberIds.has(rel.contactAId) && memberIds.has(rel.contactBId)
    ).length;

    const sharedTagCount = [...tagToContactIds.values()].filter(
      (ids) => ids.filter((id) => memberIds.has(id)).length >= 2
    ).length;

    return [
      {
        id: "members",
        label: "Members",
        value: String(members.length),
        description: members.length === 1 ? "person in this circle" : "people in this circle",
      },
      {
        id: "hub",
        label: "Most Connected",
        value: `${hub.contact.firstName} ${hub.contact.lastName ?? ""}`.trim(),
        contactId: hub.contact.id,
        description: hub.score
          ? `${hub.score} connection${hub.score === 1 ? "" : "s"} in your web`
          : "Not linked to anyone else yet",
      },
      {
        id: "internal-links",
        label: "Internal Links",
        value: String(internalLinks),
        description:
          internalLinks === 1 ? "relationship logged within this circle" : "relationships logged within this circle",
      },
      {
        id: "shared-tags",
        label: "Shared Tags",
        value: String(sharedTagCount),
        description:
          sharedTagCount === 1 ? "tag shared by two+ members here" : "tags shared by two+ members here",
      },
    ];
  }, [zoomedBubble, contacts, relationships]);

  function bubbleViewTarget(bubble: { cx: number; cy: number; radius: number }) {
    const targetR = CANVAS_MAX_R * ZOOM_FILL_RATIO;
    const scale = clamp(targetR / bubble.radius, ZOOM_MIN_SCALE, ZOOM_MAX_SCALE);
    return { x: CENTER - scale * bubble.cx, y: CENTER - scale * bubble.cy, scale };
  }

  const viewTransform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;

  function handleBackgroundClick() {
    setZoomedKey(null);
    closeContactPanel();
    animateViewTo({ x: 0, y: 0, scale: 1 });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slateblue-800">My Nest</h1>
          <p className="text-sm text-slateblue-500">
            {selectionMode ? (
              <>
                Click people to add them to your group. Search above to narrow by name, circle, tag, or job first.
              </>
            ) : (
              <>
                Click a circle to zoom in, a person to see their full profile, and empty space to back out.
                Dotted lines connect people who share a <span className="font-medium text-nest-700">Tag</span>; solid
                lines are connections you've logged.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(zoomedBubble || isViewChanged) && (
            <button
              onClick={handleBackgroundClick}
              className="rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200"
            >
              ← Back to full web
            </button>
          )}
          <button
            onClick={() => setSelectionMode((v) => !v)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              selectionMode ? "bg-nest-700 text-white" : "bg-nest-100 text-nest-700 hover:bg-nest-200"
            }`}
          >
            {selectionMode ? "Done selecting" : "Select people"}
          </button>
          <button
            onClick={() => setShowQuickUpdate(true)}
            className="rounded-lg bg-nest-100 px-4 py-2 text-sm font-medium text-nest-700 hover:bg-nest-200"
          >
            ✨ Quick Update
          </button>
          <button
            onClick={() => setShowAddContact(true)}
            className="rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-nest-700"
          >
            + Add Contact
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search everything: name, circle, tag, job, notes..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setZoomedKey(null);
          closeContactPanel();
        }}
        className="mb-4 w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none sm:w-80"
      />

      {!!tagsWithLinks.length && (
        <div className="mb-4">
          {/* Desktop/tablet: full inline row -- plenty of horizontal room. */}
          <div className="hidden items-start gap-2 sm:flex">
            <span className="mt-1 shrink-0 whitespace-nowrap text-xs font-medium text-slateblue-400">
              Tag connections
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              <TagVisibilityPills
                tags={tagsWithLinks}
                hiddenTagIds={hiddenTagIds}
                onToggleAll={() =>
                  setHiddenTagIds(hiddenTagIds.size ? new Set() : new Set(tagsWithLinks.map((t) => t.id)))
                }
                onToggleTag={toggleTagLinesHidden}
              />
            </div>
          </div>

          {/* Mobile: collapsed behind a dropdown so it doesn't push the graph down. */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setTagPanelOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-nest-200 bg-white px-3 py-1.5 text-xs font-medium text-slateblue-600"
            >
              Tag connections
              {hiddenTagIds.size > 0 && (
                <span className="rounded-full bg-nest-100 px-1.5 py-0.5 text-[10px] font-semibold text-nest-700">
                  {tagsWithLinks.length - hiddenTagIds.size}/{tagsWithLinks.length} shown
                </span>
              )}
              <span className={`text-[10px] transition-transform ${tagPanelOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            {tagPanelOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setTagPanelOpen(false)} />
                <div className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[85vw] rounded-lg border border-nest-200 bg-white p-3 shadow-lg">
                  <div className="flex flex-wrap gap-1.5">
                    <TagVisibilityPills
                      tags={tagsWithLinks}
                      hiddenTagIds={hiddenTagIds}
                      onToggleAll={() =>
                        setHiddenTagIds(hiddenTagIds.size ? new Set() : new Set(tagsWithLinks.map((t) => t.id)))
                      }
                      onToggleTag={toggleTagLinesHidden}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!contacts?.length && (
        <div className="rounded-xl border border-dashed border-nest-300 bg-white/50 px-6 py-12 text-center text-slateblue-500">
          {search ? `No one matches "${search}".` : "Add a few contacts to see the web take shape."}
        </div>
      )}

      {!!contacts?.length && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 justify-center rounded-xl border border-nest-200 bg-white p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full touch-none select-none"
            style={{ width: SIZE, aspectRatio: "1 / 1" }}
          >
            <rect
              x={0}
              y={0}
              width={SIZE}
              height={SIZE}
              fill="transparent"
              style={{ pointerEvents: "all", cursor: dragStateRef.current?.moved ? "grabbing" : "grab" }}
              onPointerDown={handleBackgroundPointerDown}
              onPointerMove={handleBackgroundPointerMove}
              onPointerUp={handleBackgroundPointerUp}
              onPointerCancel={handleBackgroundPointerUp}
            />
            <g
              style={{
                transform: viewTransform,
                transformOrigin: "0px 0px",
                transition: viewTransitionEnabled ? "transform 650ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              }}
            >
              {layout.bubbles.map((bubble) => (
                <g
                  key={bubble.key}
                  className="rel-bubble cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedKey(bubble.key);
                    animateViewTo(bubbleViewTarget(bubble));
                  }}
                >
                  <circle
                    className="rel-bubble-circle"
                    cx={bubble.cx}
                    cy={bubble.cy}
                    r={bubble.radius}
                    fill={bubble.color}
                    opacity={0.14}
                    style={{ "--hover-r": `${bubble.radius + 10}px` } as React.CSSProperties}
                  />
                  <text
                    x={bubble.cx}
                    y={bubble.cy - bubble.radius - 12}
                    fontSize={12}
                    fontWeight={600}
                    fill={bubble.color}
                    textAnchor="middle"
                  >
                    {bubble.name}
                  </text>
                </g>
              ))}

              {visibleTagLinks.map((link) => {
                const a = layout.positions.get(link.a);
                const b = layout.positions.get(link.b);
                if (!a || !b) return null;
                return (
                  <line
                    key={link.key}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={link.color}
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    opacity={0.55}
                  >
                    <title>{link.tagName}</title>
                  </line>
                );
              })}

              {contacts.map((c) => {
                const pos = layout.positions.get(c.id);
                if (!pos) return null;
                const midX = (CENTER + pos.x) / 2;
                const midY = (CENTER + pos.y) / 2;
                return (
                  <g key={`spoke-${c.id}`} className="rel-edge">
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={pos.x}
                      y2={pos.y}
                      stroke="#D3E5F5"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      style={{ pointerEvents: "none" }}
                    />
                    {c.relationshipToMe && (
                      <>
                        <line
                          x1={CENTER}
                          y1={CENTER}
                          x2={pos.x}
                          y2={pos.y}
                          stroke="transparent"
                          strokeWidth={14}
                          style={{ pointerEvents: "stroke" }}
                        />
                        <text className="rel-edge-label" x={midX} y={midY} fontSize={10} fill="#8C9AAC" textAnchor="middle">
                          {capitalize(c.relationshipToMe)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {relationships?.map((rel) => {
                const a = layout.positions.get(rel.contactAId);
                const b = layout.positions.get(rel.contactBId);
                if (!a || !b) return null;
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                return (
                  <g key={rel.id} className="rel-edge">
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#B4D1EC" strokeWidth={2} style={{ pointerEvents: "none" }} />
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      strokeWidth={14}
                      style={{ pointerEvents: "stroke" }}
                    />
                    <text className="rel-edge-label" x={midX} y={midY} fontSize={10} fill="#647188" textAnchor="middle">
                      {capitalize(rel.type)}
                    </text>
                  </g>
                );
              })}

              <g
                transform={`translate(${CENTER}, ${CENTER})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectionMode) setMeSelected((v) => !v);
                  else navigate("/me");
                }}
                className="rel-node cursor-pointer"
              >
                {meSelected && (
                  <circle r={CENTER_NODE_RADIUS + 6} fill="none" stroke="#F5A623" strokeWidth={3} />
                )}
                <circle className="rel-center-circle" r={CENTER_NODE_RADIUS} fill="#2C5F8A" />
                {profile?.photoUrl && !meImageFailed ? (
                  <>
                    <clipPath id="me-avatar-clip">
                      <circle r={CENTER_NODE_RADIUS} />
                    </clipPath>
                    <image
                      href={profile.photoUrl}
                      x={-CENTER_NODE_RADIUS}
                      y={-CENTER_NODE_RADIUS}
                      width={CENTER_NODE_RADIUS * 2}
                      height={CENTER_NODE_RADIUS * 2}
                      clipPath="url(#me-avatar-clip)"
                      preserveAspectRatio="xMidYMid slice"
                      onError={() => setMeImageFailed(true)}
                    />
                  </>
                ) : (
                  <text textAnchor="middle" dy="0.35em" fontSize={13} fill="white" fontWeight={700}>
                    {(profile?.name ?? "Me")[0]?.toUpperCase()}
                  </text>
                )}
                <text textAnchor="middle" y={CENTER_NODE_RADIUS + 16} fontSize={12} fill="#233D57" fontWeight={600}>
                  {profile?.name ?? "Me"}
                </text>
              </g>

              {contacts.map((c) => {
                const pos = layout.positions.get(c.id);
                if (!pos) return null;
                return (
                  <NestContactNode
                    key={c.id}
                    contact={c}
                    x={pos.x}
                    y={pos.y}
                    isSelected={selectedIds.has(c.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectionMode) toggleSelected(c.id);
                      else showContact(c.id);
                    }}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="w-full shrink-0 rounded-xl border border-nest-200 bg-white p-4 lg:w-64">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">
            {zoomedBubble ? zoomedBubble.name : "Network stats"}
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {(zoomedBubble ? clusterStats : networkStats?.stats)?.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </aside>
        </div>
      )}

      {selectedContactId && (
        <ContactPreviewPanel contactId={selectedContactId} onClose={closeContactPanel} onNavigateContact={showContact} />
      )}

      {showQuickUpdate && <QuickUpdateModal contacts={contacts ?? []} onClose={() => setShowQuickUpdate(false)} />}

      {showAddContact && (
        <AddContactPanel
          onClose={() => setShowAddContact(false)}
          onCreated={(contact) => {
            setShowAddContact(false);
            showContact(contact.id);
          }}
        />
      )}

      <SelectionTray
        contacts={selectedContacts}
        tags={tags ?? []}
        circles={circles ?? []}
        onRemove={toggleSelected}
        onClear={() => {
          setSelectedIds(new Set());
          setMeSelected(false);
        }}
        onExit={() => setSelectionMode(false)}
        onAddTag={(tagId) => bulkAddTag.mutate({ contacts: selectedContacts, tagId })}
        onRemoveTag={(tagId) => bulkRemoveTag.mutate({ contacts: selectedContacts, tagId })}
        onAddCircle={(circleId) => bulkAddCircle.mutate({ contacts: selectedContacts, circleId })}
        onLogContactToday={() => bulkLogContactToday.mutate({ contacts: selectedContacts })}
        onLogNote={(summary) => bulkLogInteraction.mutate({ contacts: selectedContacts, summary })}
        onSetReminder={(frequencyDays) => bulkSetKeepInTouch.mutate({ contacts: selectedContacts, frequencyDays })}
        onSaveAsCircle={handleSaveAsCircle}
        isBusy={isBulkActionBusy}
        me={meSelected ? { name: profile?.name ?? "Me", onRemove: () => setMeSelected(false) } : null}
      />
    </div>
  );
}
