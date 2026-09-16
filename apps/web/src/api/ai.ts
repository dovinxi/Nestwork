import { useMutation } from "@tanstack/react-query";
import type { DraftMessageInput, DraftMessageResult, ParseNoteInput, ParseNoteResult } from "@nestwork/shared";
import { api } from "./client";

export function useParseNote() {
  return useMutation({
    mutationFn: (input: ParseNoteInput) => api.post<ParseNoteResult>("/ai/parse-note", input),
  });
}

export function useDraftMessage() {
  return useMutation({
    mutationFn: (input: DraftMessageInput) => api.post<DraftMessageResult>("/ai/draft-message", input),
  });
}
