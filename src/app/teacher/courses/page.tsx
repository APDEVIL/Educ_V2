"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { CourseCard } from "@/components/course/coruse-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";

export default function TeacherCoursesPage() {
  const { data: courses, isLoading } = api.course.myCourses.useQuery();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My courses"
        description="Create and manage your courses"
        crumbs={[{ label: "Teacher" }, { label: "Courses" }]}
        action={
          <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Link href="/teacher/courses/new">
              <Plus className="h-4 w-4" />
              New course
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : courses?.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <p className="font-medium">No courses yet</p>
            <p className="text-sm text-muted-foreground">Create your first course to get started</p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/teacher/courses/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create course
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses?.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              thumbnailUrl={course.thumbnailUrl}
              teacher={course.teacher}
              category={course.category}
              status={course.status ?? "draft"}
              variant="manage"
            />
          ))}
        </div>
      )}
    </div>
  );
}