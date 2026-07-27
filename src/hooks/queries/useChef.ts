import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chefRepository } from "@/repositories/chef";
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

export const useRenameChefConversation = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chefRepository.renameConversation(id, title),
    onSuccess: () =>
      userId && qc.invalidateQueries({ queryKey: queryKeys.chef.conversations(userId) }),
  });
};

export const useDeleteChefConversation = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chefRepository.deleteConversation(id),
    onSuccess: () =>
      userId && qc.invalidateQueries({ queryKey: queryKeys.chef.conversations(userId) }),
  });
};

export const useSendChefMessage = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: string; message: string }) =>
      chefRepository.sendMessage(conversationId, message),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.chef.messages(vars.conversationId) });
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.chef.conversations(userId) });
    },
  });
};
