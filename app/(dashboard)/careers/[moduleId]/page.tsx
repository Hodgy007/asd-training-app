import { redirect } from 'next/navigation'

export default function CareerModuleRedirect({ params }: { params: { moduleId: string } }) {
  redirect(`/training/program-careers/${params.moduleId}`)
}
