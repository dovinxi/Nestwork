import { useQuery } from "@tanstack/react-query";
import type { ProfileStats } from "@nestwork/shared";
import { api } from "./client";

export function useProfileStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<ProfileStats>("/stats"),
  });
}
