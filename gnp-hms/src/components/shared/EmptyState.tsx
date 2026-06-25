import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-[#E6F4F2] rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[#0E7C6E]" />
      </div>
      <h3 className="text-[#0F172A] font-medium text-base mb-1">{title}</h3>
      <p className="text-[#64748B] text-sm max-w-sm leading-relaxed mb-4">{description}</p>
      {action && action}
    </div>
  )
}