import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Circle, CircleCreateInput } from "@nestwork/shared";
import { api } from "./client";

export function useCircles() {
  return useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Circle[]>("/circles"),
  });
}

export function useCreateCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CircleCreateInput) => api.post<Circle>("/circles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["circles"] }),
  });
}

export function useDeleteCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/circles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["circles"] }),
  });
}
