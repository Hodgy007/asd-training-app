import { redirect } from 'next/navigation'

export default async function CareerLessonRedirect(
  props: {
    params: Promise<{ moduleId: string; lessonId: string }>
  }
) {
  const params = await props.params
  redirect(`/training/program-careers/${params.moduleId}/${params.lessonId}`)
}
