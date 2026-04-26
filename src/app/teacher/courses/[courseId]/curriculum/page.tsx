"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CurriculumEditor } from "@/components/course/curriculum-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function CurriculumPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading } = api.course.getById.useQuery({ courseId });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Curriculum"
        description="Manage modules, lessons and learning materials"
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Curriculum" },
        ]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <CurriculumEditor
          courseId={courseId}
          modules={(course?.modules ?? []) as any}
        />
      )}
    </div>
  );
}