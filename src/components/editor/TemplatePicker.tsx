import { TEMPLATES } from '../../templates'
import { CheckIcon } from '../ui/icons'

interface TemplatePickerProps {
  value: string
  onChange: (templateId: string) => void
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {TEMPLATES.map((template) => {
        const selected = template.id === value
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={`relative rounded-lg border p-3 text-left transition-colors ${
              selected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <CheckIcon className="text-xs" />
              </span>
            )}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: template.colors.primary }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: template.colors.secondary }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: template.colors.accent }} />
            </div>
            <p className="text-sm font-semibold text-slate-800">{template.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{template.description}</p>
          </button>
        )
      })}
    </div>
  )
}
