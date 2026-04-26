import { PageHeader } from "@/components/layout/page-header";
import { CourseForm } from "@/components/course/course-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewCoursePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create course"
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: "New" },
        ]}
      />
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="pt-6">
            <CourseForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}