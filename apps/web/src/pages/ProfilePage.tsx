import { FormEvent, useEffect, useState } from "react";
import { useProfile, useUpdateProfile } from "../api/profile";
import { useProfileStats } from "../api/stats";
import { StatCard } from "../components/StatCard";

export function ProfilePage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: profileStats } = useProfileStats();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setPhotoUrl(profile.photoUrl ?? "");
  }, [profile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile.mutateAsync({ name: name.trim(), photoUrl: photoUrl.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slateblue-800">Me</h1>
      <p className="mb-6 text-sm text-slateblue-500">
        This is you — the center of your relationship web. Everyone else's "relationship to you" fans
        out from this node.
      </p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-nest-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-nest-700 text-lg font-semibold text-white">
            {name ? name[0]?.toUpperCase() : "?"}
          </div>
          <div className="flex-1">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slateblue-500">Your name</span>
              <input
                className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 focus:border-nest-400 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slateblue-500">Photo URL (optional)</span>
          <input
            className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
          <button
            type="submit"
            className="rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-nest-700"
          >
            Save
          </button>
        </div>
      </form>

      {!!profileStats?.stats.length && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Your stats</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profileStats.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
