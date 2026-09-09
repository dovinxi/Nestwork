import { useQuery } from "@tanstack/react-query";
import type { ProfileStats } from "@nestwork/shared";
import { api } from "./client";

export function useContactStats(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-stats", contactId],
    queryFn: () => api.get<ProfileStats>(`/contacts/${contactId}/stats`),
    enabled: !!contactId,
  });
}
