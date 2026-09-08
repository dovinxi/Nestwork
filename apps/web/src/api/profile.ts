import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile, UserProfileUpdateInput } from "@nestwork/shared";
import { api } from "./client";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserProfileUpdateInput) => api.put<UserProfile>("/profile", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
