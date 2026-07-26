// Central place for all TanStack Query keys, scoped by user id where relevant.
export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  pantry: {
    all: (userId: string) => ["pantry", userId] as const,
  },
  mealPlan: {
    range: (userId: string, from: string, to: string) =>
      ["mealPlan", userId, from, to] as const,
  },
  grocery: {
    all: (userId: string) => ["grocery", userId] as const,
  },
  savedRecipes: {
    all: (userId: string) => ["savedRecipes", userId] as const,
  },
  chef: {
    conversations: (userId: string) => ["chef", "conversations", userId] as const,
    messages: (conversationId: string) => ["chef", "messages", conversationId] as const,
  },
};
