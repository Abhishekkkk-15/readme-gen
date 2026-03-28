import { Info } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { mockModels } from '@/data/mock'
import type { Model } from '@/types'

type ModelSelectorProps = {
  value: string
  onChange: (id: string) => void
  models?: Model[]
  id?: string
  label?: string
}

export function ModelSelector({
  value,
  onChange,
  models = mockModels,
  id = 'model',
  label = 'Model',
}: ModelSelectorProps) {
  const selected = models.find((m) => m.id === value) ?? models[0]

  const byProvider = models.reduce<Record<string, Model[]>>((acc, m) => {
    acc[m.provider] ??= []
    acc[m.provider]!.push(m)
    return acc
  }, {})

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {selected ? (
          <Tooltip>
            <TooltipTrigger
              className="text-muted-foreground hover:text-foreground inline-flex"
              aria-label="Model details"
            >
              <Info className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-xs">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground mt-1">
                Context: {selected.contextLength.toLocaleString()} tokens · In ${selected.pricing.input} /
                1M · Out ${selected.pricing.output}/1M
              </p>
              <p className="mt-1">{selected.capabilities.join(' · ')}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a model">{selected?.name}</SelectValue>
        </SelectTrigger>
        {selected?.recommended ? (
          <Badge variant="secondary" className="w-fit text-[10px]">
            Recommended for READMEs
          </Badge>
        ) : null}
        <SelectContent>
          {Object.entries(byProvider).map(([provider, list]) => (
            <SelectGroup key={provider}>
              <SelectLabel>{provider}</SelectLabel>
              {list.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={!m.isAvailable}>
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="flex items-center gap-2">
                      {m.name}
                      {m.recommended ? (
                        <Badge variant="outline" className="text-[10px]">
                          Pick
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-normal">
                      ${m.pricing.input} in · ${m.pricing.output} out / 1M ·{' '}
                      {(m.contextLength / 1000).toFixed(0)}k ctx
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
