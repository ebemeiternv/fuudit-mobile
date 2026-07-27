-- Structured payload on messages (recipe cards, tool activity, etc.)
ALTER TABLE public.chef_messages
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Cascade delete: removing a conversation should remove its messages.
ALTER TABLE public.chef_messages
  DROP CONSTRAINT IF EXISTS chef_messages_conversation_id_fkey;
ALTER TABLE public.chef_messages
  ADD CONSTRAINT chef_messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.chef_conversations(id) ON DELETE CASCADE;

-- Rolling summary + counter on conversations
ALTER TABLE public.chef_conversations
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS chef_messages_conversation_created_idx
  ON public.chef_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS chef_conversations_user_last_idx
  ON public.chef_conversations (user_id, last_message_at DESC);