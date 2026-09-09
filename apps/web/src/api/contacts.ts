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
