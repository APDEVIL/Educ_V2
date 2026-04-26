import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getInitials, formatDate } from "@/lib/utils";
import { BookOpen, GraduationCap, Mail, Phone, Calendar } from "lucide-react";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  const user = await api.user.getById({ userId: params.userId });
  if (!user) notFound();

  const role = (user.role ?? "student") as string;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={user.name}
        crumbs={[
          { label: "Admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge
              variant={user.banned ? "destructive" : "secondary"}
              className="capitalize"
            >
              {user.banned ? "Banned" : role}
            </Badge>
            <Separator />
            <div className="w-full space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {user.profile?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{user.profile.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              {user.profile?.bio && (
                <p className="text-xs text-muted-foreground">{user.profile.bio}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Enrolled courses */}
          {user.enrollments && user.enrollments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4" />
                  Enrolled courses ({user.enrollments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{e.courseId}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(e.progressPercent ?? 0)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Taught courses (teacher) */}
          {user.taughtCourses && user.taughtCourses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4" />
                  Courses taught ({user.taughtCourses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.taughtCourses.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{c.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}