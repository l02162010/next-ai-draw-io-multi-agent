"use client"

import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useDictionary } from "@/hooks/use-dictionary"
import type { FlattenedModel } from "@/lib/types/model-config"
import { MultiAgentSelector } from "./multi-agent-selector"

interface MultiAgentControlsProps {
    enabled: boolean
    onEnabledChange: (value: boolean) => void
    models: FlattenedModel[]
    selectedAgentIds: string[]
    onSelectedAgentIdsChange: (ids: string[]) => void
    mergeModelId?: string
    onMergeModelIdChange: (id: string | undefined) => void
    onMerge: () => void
    disabled?: boolean
}

export function MultiAgentControls({
    enabled,
    onEnabledChange,
    models,
    selectedAgentIds,
    onSelectedAgentIdsChange,
    mergeModelId,
    onMergeModelIdChange,
    onMerge,
    disabled = false,
}: MultiAgentControlsProps) {
    const dict = useDictionary()
    const multi = dict.multiAgent || {
        enable: "Multi-agent",
        merge: "Merge",
        mergeModel: "Merge model",
    }
    const validatedModels = models.filter((m) => m.validated === true)

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 px-3 py-2 bg-background/60">
            <div className="flex items-center gap-2">
                <Switch
                    id="multi-agent-mode"
                    checked={enabled}
                    onCheckedChange={onEnabledChange}
                    disabled={disabled}
                />
                <label
                    htmlFor="multi-agent-mode"
                    className="text-xs font-medium text-muted-foreground"
                >
                    {multi.enable}
                </label>
            </div>

            <div className="h-4 w-px bg-border/60" />

            <MultiAgentSelector
                models={validatedModels}
                selectedIds={selectedAgentIds}
                onChange={onSelectedAgentIdsChange}
                disabled={disabled || !enabled}
            />

            <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Select
                    value={mergeModelId || ""}
                    onValueChange={(value) =>
                        onMergeModelIdChange(value || undefined)
                    }
                    disabled={disabled || !enabled}
                >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue
                            placeholder={multi.mergeModel}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {validatedModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                {model.modelId}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button
                type="button"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={onMerge}
                disabled={
                    disabled ||
                    !enabled ||
                    validatedModels.length === 0
                }
            >
                {multi.merge}
            </Button>
        </div>
    )
}
