import { PageHeader } from "@/components/layout/page-header";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/server";

interface Props {
  params: { courseId: string };
}

export default async function NewAssessmentPage({ params }: Props) {
  const { courseId } = params;
  const course = await api.course.getById({ courseId });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="New assessment"
        description="Create an assignment, quiz or exam for your students"
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Assessments", href: `/teacher/courses/${courseId}/assessments` },
          { label: "New" },
        ]}
      />
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <AssessmentForm courseId={courseId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}