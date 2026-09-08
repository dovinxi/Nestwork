import { FormEvent, useState } from "react";
import { useCreateTag, useDeleteTag, useTags } from "../api/tags";

const COLOR_OPTIONS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A", "#233D57"];

export function TagsSettingsPage() {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createTag.mutateAsync({ name: name.trim(), color });
    setName("");
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slateblue-800">Tags</h1>
      <p className="mb-6 text-sm text-slateblue-500">
        What you know about someone -- interests, facts, anything worth remembering. Contrast with
        Circles, which are about where they fit in your life.
      </p>

      <section className="mb-6 rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">Your tags</h2>
        <div className="space-y-2">
          {tags?.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between rounded-lg bg-nest-50 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: tag.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
              <button onClick={() => deleteTag.mutate(tag.id)} className="text-xs text-slateblue-300 hover:text-red-500">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slateblue-400">New tag</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            className="rounded-lg border border-nest-200 px-3 py-2 text-sm focus:border-nest-400 focus:outline-none"
            placeholder="Tag name"
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
            Create tag
          </button>
        </form>
      </section>
    </div>
  );
}
