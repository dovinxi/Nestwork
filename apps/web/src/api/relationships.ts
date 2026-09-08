import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Relationship, RelationshipCreateInput } from "@nestwork/shared";
import { api } from "./client";

export function useRelationships(contactId?: string) {
  const qs = contactId ? `?contactId=${contactId}` : "";
  return useQuery({
    queryKey: ["relationships", contactId],
    queryFn: () => api.get<Relationship[]>(`/relationships${qs}`),
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipCreateInput) => api.post<Relationship>("/relationships", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["relationships"] }),
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/relationships/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["relationships"] }),
  });
}
