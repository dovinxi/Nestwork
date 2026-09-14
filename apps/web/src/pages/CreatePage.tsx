import { useCreateCircle, useDeleteCircle, useCircles } from "../api/circles";
import { useCreateTag, useDeleteTag, useTags } from "../api/tags";
import { CategoryListEditor } from "../components/CategoryListEditor";

const COLOR_OPTIONS = ["#5C97CB", "#3E7CB1", "#7FB1DE", "#A9CBEE", "#2C5F8A", "#233D57"];

export function CreatePage() {
  const { data: circles } = useCircles();
  const createCircle = useCreateCircle();
  const deleteCircle = useDeleteCircle();

  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slateblue-800">Create</h1>
      <p className="mb-6 text-sm text-slateblue-500">
        The vocabulary behind your Nest -- where people fit in your life, and what you know about them.
      </p>

      <div className="space-y-8">
        <CategoryListEditor
          title="Circles"
          description="Where someone fits in your life -- Family, Work, College. A contact can belong to more than one. These are the clusters in your Nest."
          items={circles}
          colorOptions={COLOR_OPTIONS}
          namePlaceholder="Circle name"
          createLabel="Create circle"
          emptyMessage="No circles yet."
          onCreate={(name, color) => createCircle.mutateAsync({ name, color: color! })}
          onDelete={(id) => deleteCircle.mutate(id)}
        />

        <CategoryListEditor
          title="Tags"
          description="What you know about someone -- interests, facts, anything worth remembering. Contrast with Circles, which are about where they fit in your life."
          items={tags}
          colorOptions={COLOR_OPTIONS}
          namePlaceholder="Tag name"
          createLabel="Create tag"
          emptyMessage="No tags yet."
          onCreate={(name, color) => createTag.mutateAsync({ name, color: color! })}
          onDelete={(id) => deleteTag.mutate(id)}
        />
      </div>
    </div>
  );
}
