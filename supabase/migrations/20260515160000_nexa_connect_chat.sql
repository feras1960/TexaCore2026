-- ==============================================================================
-- Nexa Connect Chat Module Schema
-- Description: Schema for direct and group conversations, messages, and read receipts.
-- ==============================================================================

-- 1. Conversations Table
CREATE TABLE public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    name VARCHAR(255), -- Used for group chats
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Participants Table
CREATE TABLE public.chat_participants (
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Messages Table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'location', 'system')),
    metadata JSONB, -- Stores image URL, location coords, duration, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Read Receipts Table
CREATE TABLE public.chat_read_receipts (
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Users can view conversations they are part of"
ON public.chat_conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE conversation_id = chat_conversations.id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Participants RLS
CREATE POLICY "Users can view participants of their conversations"
ON public.chat_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.conversation_id = chat_participants.conversation_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add themselves or others to conversations"
ON public.chat_participants FOR INSERT
WITH CHECK (
    -- A user can add themselves OR if they are an admin of the conversation
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.conversation_id = chat_participants.conversation_id
        AND p.user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Messages RLS
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE conversation_id = chat_messages.conversation_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.chat_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE conversation_id = chat_messages.conversation_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid());

-- Read Receipts RLS
CREATE POLICY "Users can view read receipts for their conversations"
ON public.chat_read_receipts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_messages m
        JOIN public.chat_participants p ON m.conversation_id = p.conversation_id
        WHERE m.id = chat_read_receipts.message_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert read receipts"
ON public.chat_read_receipts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- ENABLE SUPABASE REALTIME
-- ==============================================================================

-- Drop if exists and recreate publication or add tables to it.
-- We use 'supabase_realtime' as the default publication created by Supabase.
BEGIN;
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
