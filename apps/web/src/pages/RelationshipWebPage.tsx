import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Contact } from "@nestwork/shared";
import { useContacts } from "../api/contacts";
import { useRelationships } from "../api/relationships";
import { useProfile } from "../api/profile";
import { useCircles } from "../api/circles";
import { useTags } from "../api/tags";

const SIZE = 640;
const CENTER = SIZE / 2;
const NODE_RADIUS = 22;
const CENTER_NODE_RADIUS = 28;
const MIN_BUBBLE_RADIUS = 50;
const MAX_BUBBLE_RADIUS = 150;
const RADIUS_PER_SQRT_MEMBER = 24;
const INNER_CLEARANCE = 95; // min distance from Me to the nearest edge of any bubble
const CANVAS_MAX_R = SIZE / 2 - 30;
const UNSORTED_COLOR = "#B9C4D0";

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

export function RelationshipWebPage() {
  const { data: contacts } = useContacts();
  const { data: relationships } = useRelationships();
  const { data: profile } = useProfile();
  const { data: circles } = useCircles();
  const { data: tags } = useTags();
  const navigate = useNavigate();

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

    // Bubble size is area-proportional to member count; angular room per cluster
    // is weighted the same way so bigger bubbles get more space around the ring.
    const radii = clusterKeys.map((key) => bubbleRadiusFor(groups.get(key)!.length));
    const totalRadius = radii.reduce((sum, r) => sum + r, 0);

    let angleCursor = -Math.PI / 2;
    clusterKeys.forEach((key, i) => {
      const members = groups.get(key)!;
      const bubbleRadius = radii[i];
      const sectorWidth = (bubbleRadius / totalRadius) * 2 * Math.PI;
      const hubAngle = angleCursor + sectorWidth / 2;
      angleCursor += sectorWidth;

      const hubDistance = Math.min(INNER_CLEARANCE + bubbleRadius, CANVAS_MAX_R - bubbleRadius);
      const hub = polar(hubDistance, hubAngle);

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

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slateblue-800">Relationship Web</h1>
        <p className="text-sm text-slateblue-500">
          Colored regions are your <span className="font-medium text-nest-700">Circles</span> -- where people fit
          in your life. Dotted lines connect people who share a{" "}
          <span className="font-medium text-nest-700">Tag</span>. Solid lines are connections you've logged
          between people.
        </p>
      </div>

      {!contacts?.length && (
        <div className="rounded-xl border border-dashed border-nest-300 bg-white/50 px-6 py-12 text-center text-slateblue-500">
          Add a few contacts to see the web take shape.
        </div>
      )}

      {!!contacts?.length && (
        <div className="flex justify-center overflow-x-auto rounded-xl border border-nest-200 bg-white p-4">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ width: SIZE, height: SIZE }}>
            {layout.bubbles.map((bubble) => (
              <g key={bubble.key}>
                <circle cx={bubble.cx} cy={bubble.cy} r={bubble.radius} fill={bubble.color} opacity={0.14} />
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
                <g key={`spoke-${c.id}`}>
                  <line x1={CENTER} y1={CENTER} x2={pos.x} y2={pos.y} stroke="#D3E5F5" strokeWidth={1.5} strokeDasharray="4 4" />
                  {c.relationshipToMe && (
                    <text x={midX} y={midY} fontSize={10} fill="#8C9AAC" textAnchor="middle">
                      {c.relationshipToMe}
                    </text>
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
                <g key={rel.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#B4D1EC" strokeWidth={2} />
                  <text x={midX} y={midY} fontSize={10} fill="#647188" textAnchor="middle">
                    {rel.type}
                  </text>
                </g>
              );
            })}

            <g transform={`translate(${CENTER}, ${CENTER})`} onClick={() => navigate("/me")} className="cursor-pointer">
              <circle r={CENTER_NODE_RADIUS} fill="#2C5F8A" />
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
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  className="cursor-pointer"
                >
                  <circle r={NODE_RADIUS} fill="#4F80B4" />
                  <text textAnchor="middle" dy="0.35em" fontSize={12} fill="white" fontWeight={600}>
                    {initials || "?"}
                  </text>
                  <text textAnchor="middle" y={NODE_RADIUS + 16} fontSize={11} fill="#37414F">
                    {c.firstName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
