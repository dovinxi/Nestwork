import { FormEvent, useState } from "react";

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
}

interface CategoryListEditorProps {
  title: string;
  description: string;
  items: CategoryItem[] | undefined;
  /** Provide to show a color swatch picker and colored dot per item; omit for plain text labels. */
  colorOptions?: string[];
  namePlaceholder: string;
  createLabel: string;
  emptyMessage?: string;
  onCreate: (name: string, color?: string) => void | Promise<void>;
  onDelete: (id: string) => void;
}

/** Shared list + create-form editor for Circles, Tags, and Relationship types on the Categories page. */
export function CategoryListEditor({
  title,
  description,
  items,
  colorOptions,
  namePlaceholder,
  createLabel,
  emptyMessage = "Nothing yet.",
  onCreate,
  onDelete,
}: CategoryListEditorProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorOptions?.[0]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim(), color);
    setName("");
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slateblue-800">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slateblue-500">{description}</p>

      <section className="mb-4 rounded-xl border border-nest-200 bg-white p-5">
        <div className="space-y-2">
          {items?.length === 0 && <p className="text-sm text-slateblue-400">{emptyMessage}</p>}
          {items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-nest-50 px-3 py-2">
              <span
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={item.color ? { color: item.color } : undefined}
              >
                {item.color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />}
                {item.name}
              </span>
              <button onClick={() => onDelete(item.id)} className="text-xs text-slateblue-300 hover:text-red-500">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-nest-200 bg-white p-5">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            className="rounded-lg border border-nest-200 px-3 py-2 text-sm focus:border-nest-400 focus:outline-none"
            placeholder={namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!!colorOptions?.length && (
            <div className="flex gap-2">
              {colorOptions.map((c) => (
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
          )}
          <button type="submit" className="self-end rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white hover:bg-nest-700">
            {createLabel}
          </button>
        </form>
      </section>
    </div>
  );
}
