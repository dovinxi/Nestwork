import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Contact } from "@nestwork/shared";
import { useContacts } from "../api/contacts";
import { useRelationships } from "../api/relationships";
import { useProfile } from "../api/profile";
import { useCircles } from "../api/circles";
import { useTags } from "../api/tags";
import { ContactPreviewPanel } from "../components/ContactPreviewPanel";
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
const ZOOM_FILL_RATIO = 0.85; // how much of the canvas the zoomed bubble should occupy
const ZOOM_MIN_SCALE = 1.4;
const ZOOM_MAX_SCALE = 3;

function pointAt(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function polar(radius: number, angle: number) {
  return pointAt(CENTER, CENTER, radius, angle);
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

export function RelationshipWebPage() {
  const [search, setSearch] = useState("");
  const { data: contacts } = useContacts({ search: search || undefined });
  const { data: relationships } = useRelationships();
  const { data: profile } = useProfile();
  const { data: circles } = useCircles();
  const { data: tags } = useTags();
  const navigate = useNavigate();

  const [zoomedKey, setZoomedKey] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

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
    const links: { key: string; a: string; b: string; color: string; tagName: string }[] = [];
    for (const tag of tags) {
      const members = contacts.filter((c) => c.tagIds.includes(tag.id));
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({ key: `${tag.id}-${members[i].id}-${members[j].id}`, a: members[i].id, b: members[j].id, color: tag.color, tagName: tag.name });
        }
      }
    }
    return links;
  }, [contacts, tags]);

  const zoomedBubble = zoomedKey ? layout.bubbles.find((b) => b.key === zoomedKey) : undefined;

  const zoomTransform = useMemo(() => {
    if (!zoomedBubble) return "translate(0px, 0px) scale(1)";
    const targetR = CANVAS_MAX_R * ZOOM_FILL_RATIO;
    const scale = Math.min(ZOOM_MAX_SCALE, Math.max(ZOOM_MIN_SCALE, targetR / zoomedBubble.radius));
    const tx = CENTER - scale * zoomedBubble.cx;
    const ty = CENTER - scale * zoomedBubble.cy;
    return `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [zoomedBubble]);

  function handleBackgroundClick() {
    setZoomedKey(null);
    setSelectedContactId(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slateblue-800">Relationship Web</h1>
          <p className="text-sm text-slateblue-500">
            Click a circle to zoom in, a person to see their full profile, and empty space to back out.
            Dotted lines connect people who share a <span className="font-medium text-nest-700">Tag</span>; solid
            lines are connections you've logged.
          </p>
        </div>
        {zoomedBubble && (
          <button
            onClick={handleBackgroundClick}
            className="shrink-0 rounded-lg bg-nest-100 px-3 py-1.5 text-sm font-medium text-nest-700 hover:bg-nest-200"
          >
            ← Back to full web
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search everything: name, circle, tag, job, notes..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setZoomedKey(null);
          setSelectedContactId(null);
        }}
        className="mb-4 w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none sm:w-80"
      />

      {!contacts?.length && (
        <div className="rounded-xl border border-dashed border-nest-300 bg-white/50 px-6 py-12 text-center text-slateblue-500">
          {search ? `No one matches "${search}".` : "Add a few contacts to see the web take shape."}
        </div>
      )}

      {!!contacts?.length && (
        <div className="flex justify-center overflow-x-auto rounded-xl border border-nest-200 bg-white p-4">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ width: SIZE, height: SIZE }}>
            <rect
              x={0}
              y={0}
              width={SIZE}
              height={SIZE}
              fill="transparent"
              style={{ pointerEvents: "all" }}
              onClick={handleBackgroundClick}
            />
            <g style={{ transform: zoomTransform, transformOrigin: "0px 0px", transition: "transform 650ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
              {layout.bubbles.map((bubble) => (
                <g
                  key={bubble.key}
                  className="rel-bubble cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedKey(bubble.key);
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

              {tagLinks.map((link) => {
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
                  navigate("/me");
                }}
                className="rel-node cursor-pointer"
              >
                <circle className="rel-center-circle" r={CENTER_NODE_RADIUS} fill="#2C5F8A" />
                <text textAnchor="middle" dy="0.35em" fontSize={13} fill="white" fontWeight={700}>
                  {(profile?.name ?? "Me")[0]?.toUpperCase()}
                </text>
                <text textAnchor="middle" y={CENTER_NODE_RADIUS + 16} fontSize={12} fill="#233D57" fontWeight={600}>
                  {profile?.name ?? "Me"}
                </text>
              </g>

              {contacts.map((c) => {
                const pos = layout.positions.get(c.id);
                if (!pos) return null;
                const initials = `${c.firstName[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase();
                return (
                  <g
                    key={c.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContactId(c.id);
                    }}
                    className="rel-node cursor-pointer"
                  >
                    <circle className="rel-node-circle" r={NODE_RADIUS} fill="#4F80B4" />
                    <text textAnchor="middle" dy="0.35em" fontSize={12} fill="white" fontWeight={600}>
                      {initials || "?"}
                    </text>
                    <text textAnchor="middle" y={NODE_RADIUS + 16} fontSize={11} fill="#37414F">
                      {c.firstName}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {selectedContactId && (
        <ContactPreviewPanel
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          onNavigateContact={setSelectedContactId}
        />
      )}
    </div>
  );
}
