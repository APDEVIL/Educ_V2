"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Pin, Lock, MessageSquare, Plus, Reply, Flag } from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/auth-client";

const newDiscussionSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export default function StudentDiscussionsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const user = useUser();
  const [selected, setSelected] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const utils = api.useUtils();
  const { data: course } = api.course.getById.useQuery({ courseId });
  const { data: discussions, isLoading } = api.interaction.listDiscussions.useQuery({ courseId });

  const form = useForm({ resolver: zodResolver(newDiscussionSchema), defaultValues: { title: "", body: "" } });

  const createDiscussion = api.interaction.createDiscussion.useMutation({
    onSuccess: () => {
      toast.success("Discussion posted");
      form.reset();
      setNewOpen(false);
      void utils.interaction.listDiscussions.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const addReply = api.interaction.addReply.useMutation({
    onSuccess: () => {
      setReplyBody("");
      void utils.interaction.listDiscussions.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const report = api.interaction.report.useMutation({
    onSuccess: () => toast.success("Reported — our team will review it"),
    onError: (err) => toast.error(err.message),
  });

  const selectedDiscussion = (discussions as any[])?.find((d) => d.id === selected);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Discussions"
        crumbs={[
          { label: "My courses", href: "/courses" },
          { label: course?.title ?? "Course", href: `/learn/${courseId}` },
          { label: "Discussions" },
        ]}
        action={
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                New topic
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Start a discussion</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((v) =>
                    createDiscussion.mutate({ courseId, title: v.title, body: v.body })
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="What's your question?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Details</FormLabel>
                        <FormControl><Textarea placeholder="Describe your question…" rows={4} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createDiscussion.isPending}>
                    Post
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid h-[calc(100vh-240px)] grid-cols-1 gap-4 lg:grid-cols-5">
        {/* List */}
        <ScrollArea className="rounded-xl border p-2 lg:col-span-2">
          {isLoading
            ? [...Array(5)].map((_, i) => <Skeleton key={i} className="mb-2 h-20 rounded-lg" />)
            : (discussions as any[])?.length === 0
              ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6 opacity-30" />
                  No discussions yet — start one!
                </div>
              )
              : (discussions as any[]).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                    className={cn(
                      "mb-1.5 flex w-full flex-col gap-1.5 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent",
                      selected === d.id && "border border-blue-500 bg-blue-50 dark:bg-blue-950/40",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      {d.isPinned && <Pin className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />}
                      <span className="flex-1 line-clamp-2 text-sm font-medium leading-snug">{d.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{d.replies?.length ?? 0} replies</span>
                      <span>·</span>
                      <span>{formatRelativeTime(d.createdAt)}</span>
                      {d.isLocked && (
                        <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px]">Locked</Badge>
                      )}
                    </div>
                  </button>
                ))}
        </ScrollArea>

        {/* Detail */}
        <div className="flex flex-col overflow-hidden rounded-xl border lg:col-span-3">
          {!selectedDiscussion ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-20" />
              Select a discussion
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 border-b p-4">
                <div>
                  <h3 className="text-sm font-semibold">{selectedDiscussion.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedDiscussion.author?.name} · {formatRelativeTime(selectedDiscussion.createdAt)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  title="Report"
                  onClick={() =>
                    report.mutate({ discussionId: selectedDiscussion.id, reason: "Inappropriate content" })
                  }
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <p className="mb-5 text-sm leading-relaxed">{selectedDiscussion.body}</p>
                <Separator className="mb-4" />
                <div className="space-y-4">
                  {selectedDiscussion.replies?.length === 0 && (
                    <p className="text-xs text-muted-foreground">No replies yet — be the first!</p>
                  )}
                  {selectedDiscussion.replies?.map((r: any) => (
                    <div key={r.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={r.author?.image ?? ""} />
                        <AvatarFallback className="text-[10px]">{getInitials(r.author?.name ?? "U")}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{r.author?.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {!selectedDiscussion.isLocked ? (
                <div className="flex gap-2 border-t p-3">
                  <Textarea
                    placeholder="Write a reply… (Enter to send)"
                    rows={2}
                    className="resize-none text-sm"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) {
                        e.preventDefault();
                        addReply.mutate({ discussionId: selectedDiscussion.id, body: replyBody.trim() });
                      }
                    }}
                  />
                  <Button
                    className="h-auto shrink-0 self-end bg-blue-600 hover:bg-blue-700"
                    disabled={!replyBody.trim() || addReply.isPending}
                    onClick={() =>
                      addReply.mutate({ discussionId: selectedDiscussion.id, body: replyBody.trim() })
                    }
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                  <Lock className="mr-1.5 inline h-3 w-3" />
                  This discussion is locked
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}