import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contact, Interaction, InteractionCreateInput } from "@nestwork/shared";
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

/** Logs the same note across a batch of contacts at once -- e.g. from the Nest's selection tray. */
export function useBulkLogInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts, summary }: { contacts: Contact[]; summary: string }) => {
      await Promise.all(
        contacts.map((c) =>
          api.post<Interaction>("/interactions", {
            contactId: c.id,
            date: new Date().toISOString(),
            type: "note",
            summary,
            important: false,
          })
        )
      );
    },
    onSuccess: (_data, variables) => {
      for (const c of variables.contacts) {
        queryClient.invalidateQueries({ queryKey: ["interactions", c.id] });
        queryClient.invalidateQueries({ queryKey: ["contact-stats", c.id] });
      }
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
