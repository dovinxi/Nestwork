import { Link } from "react-router-dom";
import type { ProfileStat } from "@nestwork/shared";

export function StatCard({ stat }: { stat: ProfileStat }) {
  const content = (
    <>
      <span className="text-xs font-semibold uppercase tracking-wide text-slateblue-400">{stat.label}</span>
      <span className="mt-1 block text-xl font-semibold leading-tight text-slateblue-800">{stat.value}</span>
      {stat.description && <span className="mt-0.5 block text-xs text-slateblue-400">{stat.description}</span>}
    </>
  );

  const className = "block rounded-xl border border-nest-200 bg-white p-4 transition-shadow hover:shadow-md";

  if (stat.contactId) {
    return (
      <Link to={`/contacts/${stat.contactId}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
