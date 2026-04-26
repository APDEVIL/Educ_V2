"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Conversation } from "@/components/messaging/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function StudentMessagesPage() {
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const { data: partnerIds, isLoading } = api.interaction.conversationPartners.useQuery();
  const { data: partnerUser } = api.user.getById.useQuery(
    { userId: partnerId! },
    { enabled: !!partnerId },
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Messages"
        description="Chat with your teachers"
        crumbs={[{ label: "Messages" }]}
      />

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border p-2 lg:col-span-1">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            : !partnerIds?.length
              ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6 opacity-30" />
                  No conversations yet.
                  <span className="text-xs">Message your teacher from a course page.</span>
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
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-20" />
              Select a conversation
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

  const role = String((user as any).role ?? "student");

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
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="text-[11px] capitalize text-muted-foreground">{role}</span>
      </div>
    </button>
  );
}