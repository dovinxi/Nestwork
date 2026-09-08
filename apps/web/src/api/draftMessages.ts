import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DraftMessage, DraftMessageCreateInput } from "@nestwork/shared";
import { api } from "./client";

export function useDraftMessages(contactId: string | undefined) {
  return useQuery({
    queryKey: ["draftMessages", contactId],
    queryFn: () => api.get<DraftMessage[]>(`/draft-messages?contactId=${contactId}`),
    enabled: !!contactId,
  });
}

export function useCreateDraftMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DraftMessageCreateInput) => api.post<DraftMessage>("/draft-messages", input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draftMessages", variables.contactId] });
    },
  });
}
