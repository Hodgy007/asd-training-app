import { redirect } from 'next/navigation'

export default async function CareerModuleRedirect(props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params
  redirect(`/training/program-careers/${params.moduleId}`)
}
