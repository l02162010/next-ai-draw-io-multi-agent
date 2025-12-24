"use client"

import { AlertTriangle, Check, Eye, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { CodeBlock } from "@/components/code-block"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useDictionary } from "@/hooks/use-dictionary"
import { cn } from "@/lib/utils"

export type AgentRunStatus = "idle" | "running" | "success" | "error"

export interface AgentResult {
    id: string
    label: string
    status: AgentRunStatus
    xml?: string
    error?: string
    isMerge?: boolean
}

interface AgentResultsPanelProps {
    results: AgentResult[]
    onApply: (xml: string) => void
    onClear: () => void
}

function StatusBadge({ status }: { status: AgentRunStatus }) {
    const dict = useDictionary()
    const multi = dict.multiAgent || {
        statusRunning: "Running",
        statusSuccess: "Complete",
        statusError: "Error",
        statusIdle: "Idle",
    }
    const label =
        status === "running"
            ? multi.statusRunning
            : status === "success"
              ? multi.statusSuccess
              : status === "error"
                ? multi.statusError
                : multi.statusIdle

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                status === "running" && "bg-blue-500/10 text-blue-600",
                status === "success" && "bg-emerald-500/10 text-emerald-600",
                status === "error" && "bg-red-500/10 text-red-600",
                status === "idle" && "bg-muted text-muted-foreground",
            )}
        >
            {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === "success" && <Check className="h-3 w-3" />}
            {status === "error" && <AlertTriangle className="h-3 w-3" />}
            {label}
        </span>
    )
}

export function AgentResultsPanel({
    results,
    onApply,
    onClear,
}: AgentResultsPanelProps) {
    const dict = useDictionary()
    const multi = dict.multiAgent || {
        results: "Agent Results",
        compare: "Compare",
        clearResults: "Clear results",
        merged: "Merged",
        viewXml: "View XML",
        apply: "Apply",
        compareLeft: "Left",
        compareRight: "Right",
        compareTitle: "Compare Agents",
        compareHint: "Side-by-side XML for selected agents.",
        xmlPreview: "XML preview (read-only).",
    }
    const [openXmlId, setOpenXmlId] = useState<string | null>(null)
    const [compareOpen, setCompareOpen] = useState(false)
    const [compareLeft, setCompareLeft] = useState<string | null>(null)
    const [compareRight, setCompareRight] = useState<string | null>(null)

    const openXmlResult = useMemo(
        () => results.find((r) => r.id === openXmlId),
        [openXmlId, results],
    )
    const compareLeftResult = useMemo(
        () => results.find((r) => r.id === compareLeft),
        [compareLeft, results],
    )
    const compareRightResult = useMemo(
        () => results.find((r) => r.id === compareRight),
        [compareRight, results],
    )

    if (results.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {multi.results}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCompareOpen(true)}
                        disabled={!compareLeft || !compareRight}
                    >
                        {multi.compare}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={onClear}
                    >
                        {multi.clearResults}
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {results.map((result) => (
                    <div
                        key={result.id}
                        className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2",
                            result.isMerge && "border-primary/30",
                        )}
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium truncate">
                                    {result.label}
                                </span>
                                {result.isMerge && (
                                <span className="text-[11px] text-primary">
                                        {multi.merged}
                                </span>
                                )}
                            </div>
                            {result.error && (
                                <div className="text-[11px] text-red-500 truncate">
                                    {result.error}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <StatusBadge status={result.status} />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setOpenXmlId(result.id)}
                                disabled={!result.xml}
                            >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                {multi.viewXml}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                    result.xml && onApply(result.xml)
                                }
                                disabled={!result.xml}
                            >
                                {multi.apply}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 px-2 text-xs",
                                    compareLeft === result.id &&
                                        "bg-accent/70",
                                )}
                                onClick={() =>
                                    setCompareLeft((prev) =>
                                        prev === result.id ? null : result.id,
                                    )
                                }
                            >
                                {multi.compareLeft}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 px-2 text-xs",
                                    compareRight === result.id &&
                                        "bg-accent/70",
                                )}
                                onClick={() =>
                                    setCompareRight((prev) =>
                                        prev === result.id ? null : result.id,
                                    )
                                }
                            >
                                {multi.compareRight}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={!!openXmlId} onOpenChange={() => setOpenXmlId(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {openXmlResult?.label ||
                                multi.viewXml}
                        </DialogTitle>
                        <DialogDescription>
                            {multi.xmlPreview}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-auto rounded-md border p-3">
                        <CodeBlock code={openXmlResult?.xml || ""} />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{dict.multiAgent.compareTitle}</DialogTitle>
                        <DialogDescription>
                            {multi.compareHint}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border p-3">
                            <div className="text-xs font-medium mb-2">
                                {compareLeftResult?.label ||
                                    multi.compareLeft}
                            </div>
                            <CodeBlock
                                code={compareLeftResult?.xml || ""}
                            />
                        </div>
                        <div className="rounded-md border p-3">
                            <div className="text-xs font-medium mb-2">
                                {compareRightResult?.label ||
                                    multi.compareRight}
                            </div>
                            <CodeBlock
                                code={compareRightResult?.xml || ""}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
