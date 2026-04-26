"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useUser } from "@/lib/auth-client";
import { MessageBubble } from "./message-bubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface ConversationProps {
  partnerId: string;
  partnerName: string;
  partnerImage?: string | null;
}

export function Conversation({ partnerId, partnerName, partnerImage }: ConversationProps) {
  const user = useUser();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const { data: messages, isLoading } = api.interaction.getConversation.useQuery(
    { partnerId, limit: 50, offset: 0 },
    { refetchInterval: 5000 }, // poll every 5s (replace with WS in prod)
  );

  const sendMsg = api.interaction.sendMessage.useMutation({
    onSuccess: () => {
      setText("");
      void utils.interaction.getConversation.invalidate({ partnerId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMsg.mutate({ receiverId: partnerId, type: "text", body: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={partnerImage ?? ""} />
          <AvatarFallback className="text-xs">{getInitials(partnerName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{partnerName}</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : !messages?.length ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                id={msg.id}
                body={msg.body}
                fileUrl={msg.fileUrl}
                fileName={msg.fileName}
                type={msg.type}
                createdAt={msg.createdAt}
                sender={msg.sender}
                isMine={msg.senderId === user?.id}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="max-h-32 min-h-[36px] flex-1 resize-none border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700"
            onClick={handleSend}
            disabled={!text.trim() || sendMsg.isPending}
          >
            <Send className="h-3.5 w-3.5 text-white" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}