/** A message the user has written themselves, kept as a style example for AI-drafted messages. */
export interface WritingSample {
  id: string;
  text: string;
}

/**
 * The app owner's own profile -- a singleton, not a Contact. It's the fixed
 * center of the relationship web; every contact's `relationshipToMe` becomes
 * a spoke out to this node.
 */
export interface UserProfile {
  id: "me";
  name: string;
  photoUrl?: string;
  /** Freeform context fed to the AI features so they act more like this specific person. */
  aiAboutMe?: string;
  writingSamples: WritingSample[];
  updatedAt: string;
}

export type UserProfileUpdateInput = Partial<Pick<UserProfile, "name" | "photoUrl" | "aiAboutMe">> & {
  writingSamples?: Omit<WritingSample, "id">[];
};
