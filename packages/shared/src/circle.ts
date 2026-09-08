/**
 * "Where this person fits in my life" -- a life-domain grouping (Family, Work,
 * College, ...). Contrast with Tag, which answers "what do I know about them".
 * A contact can belong to multiple circles. Circles form the spatial clusters
 * in the relationship web; shared tags draw connections across those clusters.
 */
export interface Circle {
  id: string;
  name: string;
  color: string; // hex, also used as the cluster color in the relationship web
  createdAt: string;
}

export type CircleCreateInput = Omit<Circle, "id" | "createdAt">;
export type CircleUpdateInput = Partial<CircleCreateInput>;
