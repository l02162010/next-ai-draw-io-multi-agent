"use client"

import { Check, Users } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDictionary } from "@/hooks/use-dictionary"
import type { FlattenedModel } from "@/lib/types/model-config"
import { cn } from "@/lib/utils"

interface MultiAgentSelectorProps {
    models: FlattenedModel[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    disabled?: boolean
}

function groupModels(models: FlattenedModel[]) {
    const groups = new Map<
        string,
        { provider: string; models: FlattenedModel[] }
    >()
    for (const model of models) {
        const key = model.providerLabel
        const existing = groups.get(key)
        if (existing) {
            existing.models.push(model)
        } else {
            groups.set(key, { provider: model.provider, models: [model] })
        }
    }
    return groups
}

export function MultiAgentSelector({
    models,
    selectedIds,
    onChange,
    disabled = false,
}: MultiAgentSelectorProps) {
    const dict = useDictionary()
    const multi = dict.multiAgent || {
        agents: "Agents",
        selectAgents: "Select agents",
        selectAll: "Select all",
        clear: "Clear",
        noValidatedModels: "No verified models available.",
    }
    const validatedModels = useMemo(
        () => models.filter((m) => m.validated === true),
        [models],
    )
    const groupedModels = useMemo(
        () => groupModels(validatedModels),
        [validatedModels],
    )

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id))
        } else {
            onChange([...selectedIds, id])
        }
    }

    const handleSelectAll = () => {
        onChange(validatedModels.map((m) => m.id))
    }

    const handleClear = () => {
        onChange([])
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 px-2 text-xs gap-1.5"
                >
                    <Users className="h-4 w-4" />
                    {multi.agents}
                    <span className="text-muted-foreground">
                        ({selectedIds.length})
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {multi.selectAgents}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={handleSelectAll}
                            disabled={validatedModels.length === 0}
                        >
                            {multi.selectAll}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={handleClear}
                            disabled={selectedIds.length === 0}
                        >
                            {multi.clear}
                        </Button>
                    </div>
                </div>

                {validatedModels.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                        {multi.noValidatedModels}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {Array.from(groupedModels.entries()).map(
                            ([label, { models: providerModels }]) => (
                                <div key={label} className="space-y-1">
                                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide px-1">
                                        {label}
                                    </div>
                                    {providerModels.map((model) => {
                                        const isSelected =
                                            selectedIds.includes(model.id)
                                        return (
                                            <button
                                                key={model.id}
                                                type="button"
                                                onClick={() => toggle(model.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left hover:bg-accent transition-colors",
                                                    isSelected &&
                                                        "bg-accent/60",
                                                )}
                                            >
                                                <Check
                                                    className={cn(
                                                        "h-3.5 w-3.5",
                                                        isSelected
                                                            ? "opacity-100"
                                                            : "opacity-0",
                                                    )}
                                                />
                                                <span className="truncate">
                                                    {model.modelId}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
