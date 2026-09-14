import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RelationshipType, RelationshipTypeCreateInput } from "@nestwork/shared";
import { api } from "./client";

export function useRelationshipTypes() {
  return useQuery({
    queryKey: ["relationship-types"],
    queryFn: () => api.get<RelationshipType[]>("/relationship-types"),
  });
}

export function useCreateRelationshipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipTypeCreateInput) => api.post<RelationshipType>("/relationship-types", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["relationship-types"] }),
  });
}

export function useDeleteRelationshipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/relationship-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["relationship-types"] }),
  });
}
