import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Interaction, InteractionCreateInput } from "@nestwork/shared";
import { api } from "./client";

export function useInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: ["interactions", contactId],
    queryFn: () => api.get<Interaction[]>(`/interactions?contactId=${contactId}`),
    enabled: !!contactId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InteractionCreateInput) => api.post<Interaction>("/interactions", input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["interactions", variables.contactId] });
    },
  });
}

export function useDeleteInteraction(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/interactions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interactions", contactId] }),
  });
}
