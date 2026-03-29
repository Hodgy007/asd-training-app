import { redirect } from 'next/navigation'

export default function CareerLessonRedirect({
  params,
}: {
  params: { moduleId: string; lessonId: string }
}) {
  redirect(`/training/program-careers/${params.moduleId}/${params.lessonId}`)
}
