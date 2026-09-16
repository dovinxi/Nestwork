import { FormEvent, useEffect, useState } from "react";
import { useProfile, useUpdateProfile } from "../api/profile";
import { useProfileStats } from "../api/stats";
import { StatCard } from "../components/StatCard";
import { ContactAvatar } from "../components/ContactAvatar";
import { readImageAsDataUrl } from "../utils/imageUpload";
import { ApiError } from "../api/client";

interface WritingSampleDraft {
  /** Present once the sample has been saved; absent for a newly-added, unsaved row. */
  id?: string;
  text: string;
}

export function ProfilePage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: profileStats } = useProfileStats();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [aiAboutMe, setAiAboutMe] = useState("");
  const [writingSamples, setWritingSamples] = useState<WritingSampleDraft[]>([]);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiSaveError, setAiSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setPhotoUrl(profile.photoUrl ?? "");
    setAiAboutMe(profile.aiAboutMe ?? "");
    setWritingSamples(profile.writingSamples);
  }, [profile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile.mutateAsync({ name: name.trim(), photoUrl: photoUrl.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSaveAiSettings(e: FormEvent) {
    e.preventDefault();
    setAiSaveError(null);
    try {
      await updateProfile.mutateAsync({
        aiAboutMe: aiAboutMe.trim() || undefined,
        writingSamples: writingSamples.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim() })),
      });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2000);
    } catch (err) {
      setAiSaveError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    }
  }

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    try {
      setPhotoUrl(await readImageAsDataUrl(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't use that photo.");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slateblue-800">Me</h1>
      <p className="mb-6 text-sm text-slateblue-500">
        This is you — the center of your Nest. Everyone else's "relationship to you" fans
        out from this node.
      </p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-nest-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-4">
          <ContactAvatar
            contact={{ firstName: name || "?", photoUrl }}
            className="h-14 w-14 text-lg"
            fallbackClassName="bg-nest-700 text-white"
          />
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

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg bg-nest-100 px-3 py-1.5 text-xs font-medium text-nest-700 hover:bg-nest-200">
              Upload photo
              <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl("");
                  setPhotoError(null);
                }}
                className="text-xs font-medium text-slateblue-400 hover:text-red-500"
              >
                Remove photo
              </button>
            )}
          </div>
          {photoUrl.startsWith("data:") ? (
            <p className="rounded-lg border border-nest-200 bg-nest-50 px-3 py-2 text-sm text-slateblue-500">
              Photo uploaded from device
            </p>
          ) : (
            <input
              className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none"
              placeholder="...or paste a photo URL"
              value={photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setPhotoError(null);
              }}
            />
          )}
          {photoError && <p className="text-xs text-red-600">{photoError}</p>}
        </div>

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

      <form onSubmit={handleSaveAiSettings} className="mt-6 rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slateblue-400">✨ AI Assistant</h2>
        <p className="mb-4 mt-1 text-sm text-slateblue-500">
          Help Quick Update and message drafting act more like you. Nothing here changes how your data is stored --
          it's only ever sent along as context when you use an AI feature.
        </p>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slateblue-500">About you</span>
          <textarea
            className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 placeholder:text-slateblue-300 focus:border-nest-400 focus:outline-none"
            rows={3}
            placeholder="e.g. I'm a fairly direct communicator, I care a lot about staying close with old college friends, and I prefer short messages over long ones."
            value={aiAboutMe}
            onChange={(e) => setAiAboutMe(e.target.value)}
          />
        </label>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slateblue-500">
            Writing samples <span className="font-normal text-slateblue-400">-- paste a few messages you've actually sent, so drafts sound like you</span>
          </span>
          <button
            type="button"
            onClick={() => setWritingSamples((prev) => [...prev, { text: "" }])}
            className="shrink-0 text-xs font-medium text-nest-700 hover:underline"
          >
            + Add example
          </button>
        </div>
        {writingSamples.length === 0 && (
          <p className="mb-2 text-xs text-slateblue-400">No examples yet -- drafts will use a neutral tone until you add some.</p>
        )}
        <div className="mb-4 space-y-2">
          {writingSamples.map((sample, idx) => (
            <div key={sample.id ?? `new-${idx}`} className="flex gap-2">
              <textarea
                className="w-full rounded-lg border border-nest-200 bg-white px-3 py-2 text-sm text-slateblue-800 focus:border-nest-400 focus:outline-none"
                rows={2}
                placeholder="Paste a message you've sent someone before..."
                value={sample.text}
                onChange={(e) => {
                  const next = [...writingSamples];
                  next[idx] = { ...next[idx], text: e.target.value };
                  setWritingSamples(next);
                }}
              />
              <button
                type="button"
                onClick={() => setWritingSamples((prev) => prev.filter((_, i) => i !== idx))}
                className="shrink-0 px-2 text-slateblue-300 hover:text-slateblue-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {aiSaveError && <p className="mb-2 text-xs text-red-600">{aiSaveError}</p>}
        <div className="flex items-center justify-end gap-3">
          {aiSaved && <span className="text-xs text-emerald-600">Saved</span>}
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
