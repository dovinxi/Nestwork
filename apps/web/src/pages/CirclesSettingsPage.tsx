import { FormEvent, useState } from "react";
import { useCreateCircle, useDeleteCircle, useCircles } from "../api/circles";

const COLOR_OPTIONS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A", "#233D57"];

export function CirclesSettingsPage() {
  const { data: circles } = useCircles();
  const createCircle = useCreateCircle();
  const deleteCircle = useDeleteCircle();

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCircle.mutateAsync({ name: name.trim(), color });
    setName("");
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slateblue-800">Circles</h1>
      <p className="mb-6 text-sm text-slateblue-500">
        Where someone fits in your life -- Family, Work, College. A contact can belong to more
        than one. These are the clusters in your Relationship Web.
      </p>

      <section className="mb-6 rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Your circles</h2>
        <div className="space-y-2">
          {circles?.length === 0 && <p className="text-sm text-slateblue-400">No circles yet.</p>}
          {circles?.map((circle) => (
            <div key={circle.id} className="flex items-center justify-between rounded-lg bg-nest-50 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: circle.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: circle.color }} />
                {circle.name}
              </span>
              <button onClick={() => deleteCircle.mutate(circle.id)} className="text-xs text-slateblue-300 hover:text-red-500">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">New circle</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            className="rounded-lg border border-nest-200 px-3 py-2 text-sm focus:border-nest-400 focus:outline-none"
            placeholder="Circle name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full ring-offset-2"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={c}
              />
            ))}
          </div>
          <button type="submit" className="self-end rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white hover:bg-nest-700">
            Create circle
          </button>
        </form>
      </section>
    </div>
  );
}
