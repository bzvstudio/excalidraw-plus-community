import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function OptionSelect<Value extends string>({
  label,
  value,
  options,
  disabled,
  className,
  onChange,
}: {
  label: string
  value: Value
  options: readonly { value: Value; label: string }[]
  disabled?: boolean
  className?: string
  onChange: (value: Value) => void
}) {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next as Value)
      }}
    >
      <SelectTrigger size="sm" aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
