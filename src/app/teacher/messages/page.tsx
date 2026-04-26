"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Conversation } from "@/components/messaging/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function TeacherMessagesPage() {
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const { data: partnerIds, isLoading } = api.interaction.conversationPartners.useQuery();

  // Fetch basic user info for each partner — we'll use user.getById lazily
  // In production you'd batch this; for MVP we fetch the selected one
  const { data: partnerUser } = api.user.getById.useQuery(
    { userId: partnerId! },
    { enabled: !!partnerId },
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Messages"
        description="Direct messages with your students"
        crumbs={[{ label: "Teacher" }, { label: "Messages" }]}
      />

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Partner list */}
        <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border p-2 lg:col-span-1">
          {isLoading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            : !partnerIds?.length
              ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                  No conversations yet
                </div>
              )
              : partnerIds.map((id) => (
                  <PartnerRow
                    key={id}
                    userId={id}
                    isSelected={partnerId === id}
                    onSelect={() => setPartnerId(id)}
                  />
                ))}
        </div>

        {/* Conversation */}
        <div className="overflow-hidden rounded-xl border lg:col-span-3">
          {partnerId && partnerUser ? (
            <Conversation
              partnerId={partnerId}
              partnerName={partnerUser.name}
              partnerImage={partnerUser.image}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                Select a conversation
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerRow({
  userId,
  isSelected,
  onSelect,
}: {
  userId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: user } = api.user.getById.useQuery({ userId });
  if (!user) return <Skeleton className="h-14 rounded-lg" />;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
        isSelected && "bg-blue-50 dark:bg-blue-950/40",
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={user.image ?? ""} />
        <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.name}</span>
        <span className="text-[11px] text-muted-foreground capitalize">{String((user as any).role ?? "student")}</span>
      </div>
    </button>
  );
}