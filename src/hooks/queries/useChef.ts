import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chefRepository, type ChefMessageInsert } from "@/repositories/chef";
import { queryKeys } from "./keys";

export const useChefConversations = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.chef.conversations(userId) : ["chef", "conversations", "anon"],
    queryFn: () => chefRepository.listConversations(userId!),
    enabled: !!userId,
  });

export const useChefMessages = (conversationId: string | undefined) =>
  useQuery({
    queryKey: conversationId ? queryKeys.chef.messages(conversationId) : ["chef", "messages", "anon"],
    queryFn: () => chefRepository.listMessages(conversationId!),
    enabled: !!conversationId,
  });

export const useCreateChefConversation = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => chefRepository.createConversation(userId!, title),
    onSuccess: () =>
      userId && qc.invalidateQueries({ queryKey: queryKeys.chef.conversations(userId) }),
  });
};

export const useAddChefMessage = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ChefMessageInsert, "user_id">) =>
      chefRepository.addMessage({ ...input, user_id: userId! }),
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: queryKeys.chef.messages(msg.conversation_id) });
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.chef.conversations(userId) });
    },
  });
};
