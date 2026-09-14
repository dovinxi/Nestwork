import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contact, ContactCreateInput, ContactUpdateInput } from "@nestwork/shared";
import { api } from "./client";

export function useContacts(params?: { tagId?: string; circleId?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.tagId) query.set("tagId", params.tagId);
  if (params?.circleId) query.set("circleId", params.circleId);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();

  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => api.get<Contact[]>(`/contacts${qs ? `?${qs}` : ""}`),
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    // Deliberately a different key namespace than useContacts's ["contacts", ...] --
    // useContacts() with no args and useContact(undefined) would otherwise hash to
    // the same cache key, so the add-contact form could pick up the contacts *list*
    // as `existing` and crash on `existing.emails.map`.
    queryKey: ["contact", id],
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactCreateInput) => api.post<Contact>("/contacts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactUpdateInput) => api.put<Contact>(`/contacts/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact"] });
    },
  });
}

/** Applies a tag to a batch of contacts at once -- e.g. from the Nest's selection tray. */
export function useBulkAddTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts, tagId }: { contacts: Contact[]; tagId: string }) => {
      await Promise.all(
        contacts
          .filter((c) => !c.tagIds.includes(tagId))
          .map((c) => api.put<Contact>(`/contacts/${c.id}`, { tagIds: [...c.tagIds, tagId] }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

/** Removes a tag from a batch of contacts at once. */
export function useBulkRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts, tagId }: { contacts: Contact[]; tagId: string }) => {
      await Promise.all(
        contacts
          .filter((c) => c.tagIds.includes(tagId))
          .map((c) => api.put<Contact>(`/contacts/${c.id}`, { tagIds: c.tagIds.filter((t) => t !== tagId) }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

/** Assigns a circle to a batch of contacts at once. */
export function useBulkAddCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts, circleId }: { contacts: Contact[]; circleId: string }) => {
      await Promise.all(
        contacts
          .filter((c) => !c.circleIds.includes(circleId))
          .map((c) => api.put<Contact>(`/contacts/${c.id}`, { circleIds: [...c.circleIds, circleId] }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

/** Sets the same keep-in-touch reminder cadence across a batch of contacts. */
export function useBulkSetKeepInTouch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts, frequencyDays }: { contacts: Contact[]; frequencyDays: number }) => {
      await Promise.all(
        contacts.map((c) => api.put<Contact>(`/contacts/${c.id}`, { keepInTouch: { frequencyDays } }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

/** Marks a batch of contacts as contacted today, same as each one's own "Log contact today" button. */
export function useBulkLogContactToday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contacts }: { contacts: Contact[] }) => {
      await Promise.all(contacts.map((c) => api.post<Contact>(`/contacts/${c.id}/log-contact`)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useLogContact(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Contact>(`/contacts/${id}/log-contact`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}
