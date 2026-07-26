import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profilesRepository, type ProfileUpdate } from "@/repositories/profiles";
import { queryKeys } from "./keys";

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId ? queryKeys.profile(userId) : ["profile", "anon"],
    queryFn: () => profilesRepository.getById(userId!),
    enabled: !!userId,
  });
};

export const useUpdateProfile = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => profilesRepository.update(userId!, patch),
    onSuccess: (data) => {
      if (userId) qc.setQueryData(queryKeys.profile(userId), data);
    },
  });
};
