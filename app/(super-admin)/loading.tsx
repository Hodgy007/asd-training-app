import { LoaderCircle } from 'lucide-react'

export default function SuperAdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoaderCircle className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  )
}
