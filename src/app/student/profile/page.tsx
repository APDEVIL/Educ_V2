"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useUser } from "@/lib/auth-client";

const schema = z.object({
  name: z.string().min(2, "Min 2 characters").max(80),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  // teacher fields
  expertise: z.string().optional(),
  qualification: z.string().optional(),
  // student fields
  gradeLevel: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useUser();
  const utils = api.useUtils();

  const { data: profile, isLoading } = api.user.getProfile.useQuery();
  const role = String((user as any)?.role ?? "student");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", bio: "", phone: "", avatarUrl: "",
      expertise: "", qualification: "", gradeLevel: "",
    },
  });

  // Populate form once profile loads
  useEffect(() => {
    if (!user && !profile) return;
    form.reset({
      name: user?.name ?? "",
      bio: profile?.bio ?? "",
      phone: profile?.phone ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      expertise: profile?.expertise ?? "",
      qualification: profile?.qualification ?? "",
      gradeLevel: profile?.gradeLevel ?? "",
    });
  }, [user, profile, form]);

  const upsert = api.user.upsertProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      void utils.user.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    upsert.mutate({
      name: values.name,
      bio: values.bio || undefined,
      phone: values.phone || undefined,
      avatarUrl: values.avatarUrl || undefined,
      expertise: values.expertise || undefined,
      qualification: values.qualification || undefined,
      gradeLevel: values.gradeLevel || undefined,
    });
  }

  const avatarUrl = form.watch("avatarUrl");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profile"
        description="Manage your personal information"
        crumbs={[{ label: "Profile" }]}
      />

      <div className="mx-auto w-full max-w-2xl">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Avatar preview card */}
            <Card>
              <CardContent className="flex items-center gap-5 p-5">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || user?.image || ""} />
                  <AvatarFallback className="text-xl">
                    {getInitials(user?.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 w-fit capitalize">{role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Edit form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Edit profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Display name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Avatar URL */}
                    <FormField
                      control={form.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://…" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Paste a publicly accessible image URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bio */}
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us a bit about yourself…"
                              rows={3}
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input placeholder="+91 …" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Teacher-specific */}
                    {(role === "teacher" || role === "admin") && (
                      <>
                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground">
                          Teacher information
                        </p>
                        <FormField
                          control={form.control}
                          name="expertise"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area of expertise</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Web Development, Data Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="qualification"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qualification</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. M.Tech Computer Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Student-specific */}
                    {role === "student" && (
                      <>
                        <Separator />
                        <FormField
                          control={form.control}
                          name="gradeLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade / Year</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 3rd year B.Tech" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={upsert.isPending}
                    >
                      {upsert.isPending ? "Saving…" : "Save changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}