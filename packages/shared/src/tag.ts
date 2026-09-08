export interface Tag {
  id: string;
  name: string;
  color: string; // hex, defaults chosen from the soft-blue palette
  createdAt: string;
}

export type TagCreateInput = Omit<Tag, "id" | "createdAt">;
export type TagUpdateInput = Partial<TagCreateInput>;
