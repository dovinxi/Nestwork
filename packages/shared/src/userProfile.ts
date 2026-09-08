/**
 * The app owner's own profile -- a singleton, not a Contact. It's the fixed
 * center of the relationship web; every contact's `relationshipToMe` becomes
 * a spoke out to this node.
 */
export interface UserProfile {
  id: "me";
  name: string;
  photoUrl?: string;
  updatedAt: string;
}

export type UserProfileUpdateInput = Partial<Pick<UserProfile, "name" | "photoUrl">>;
