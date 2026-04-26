"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Megaphone, Bell } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  courseId: z.string().uuid("Select a course"),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export default function TeacherNotificationsPage() {
  const { data: courses } = api.course.myCourses.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { courseId: "", title: "", body: "" },
  });

  const announce = api.notification.sendAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("Announcement sent to all enrolled students");
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const notifyUpdate = api.notification.notifyCourseUpdate.useMutation({
    onSuccess: () => {
      toast.success("Course update notification sent");
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  function onAnnounce(values: FormValues) {
    announce.mutate({ courseId: values.courseId, title: values.title, body: values.body });
  }

  function onCourseUpdate(values: FormValues) {
    notifyUpdate.mutate({ courseId: values.courseId, description: values.body });
  }

  const isPending = announce.isPending || notifyUpdate.isPending;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        description="Send announcements and updates to your students"
        crumbs={[{ label: "Teacher" }, { label: "Notifications" }]}
      />

      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Megaphone className="h-4 w-4" />
              Send to course students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                {/* Course selector */}
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Live session tomorrow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Write your message…" rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700"
                    disabled={isPending}
                    onClick={form.handleSubmit(onAnnounce)}
                  >
                    <Megaphone className="h-4 w-4" />
                    Send announcement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    disabled={isPending}
                    onClick={form.handleSubmit(onCourseUpdate)}
                  >
                    <Bell className="h-4 w-4" />
                    Course update
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}