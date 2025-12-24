"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useMemo, useRef } from "react"
import type { FlattenedModel } from "@/lib/types/model-config"
import { isMxCellXmlComplete, wrapWithMxFile } from "@/lib/utils"

type AgentStatus = "idle" | "running" | "success" | "error"

interface AgentRequest {
    runId: string
    parts: any[]
    xml: string
    previousXml: string
    sessionId: string
    accessCode: string
    minimalStyle: boolean
}

interface AgentRunnerProps {
    agent: FlattenedModel
    request: AgentRequest | null
    onStatusChange: (status: AgentStatus, runId: string) => void
    onResult: (xml: string, runId: string) => void
    onError: (message: string, runId: string) => void
}

const TOOL_ERROR_STATE = "output-error" as const
const MAX_AUTO_RETRY_COUNT = 1
const MAX_CONTINUATION_RETRY_COUNT = 2

interface MessagePart {
    type: string
    state?: string
    toolName?: string
    input?: { xml?: string; [key: string]: unknown }
    [key: string]: unknown
}

interface ChatMessage {
    role: string
    parts?: MessagePart[]
    [key: string]: unknown
}

function hasToolErrors(messages: ChatMessage[]): boolean {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "assistant") return false

    const toolParts =
        (lastMessage.parts as MessagePart[] | undefined)?.filter((part) =>
            part.type?.startsWith("tool-"),
        ) || []

    if (toolParts.length === 0) return false
    const lastToolPart = toolParts[toolParts.length - 1]
    return lastToolPart?.state === TOOL_ERROR_STATE
}

export function AgentRunner({
    agent,
    request,
    onStatusChange,
    onResult,
    onError,
}: AgentRunnerProps) {
    const partialXmlRef = useRef<string>("")
    const autoRetryCountRef = useRef(0)
    const continuationRetryCountRef = useRef(0)
    const lastRunIdRef = useRef<string | null>(null)

    const headers = useMemo(() => {
        return {
            ...(request?.accessCode && {
                "x-access-code": request.accessCode,
            }),
            "x-ai-provider": agent.provider,
            "x-ai-model": agent.modelId,
            ...(agent.baseUrl && { "x-ai-base-url": agent.baseUrl }),
            ...(agent.apiKey && { "x-ai-api-key": agent.apiKey }),
            ...(agent.awsAccessKeyId && {
                "x-aws-access-key-id": agent.awsAccessKeyId,
            }),
            ...(agent.awsSecretAccessKey && {
                "x-aws-secret-access-key": agent.awsSecretAccessKey,
            }),
            ...(agent.awsRegion && { "x-aws-region": agent.awsRegion }),
            ...(agent.awsSessionToken && {
                "x-aws-session-token": agent.awsSessionToken,
            }),
            ...(request?.minimalStyle && {
                "x-minimal-style": "true",
            }),
        }
    }, [agent, request])

    const {
        messages,
        sendMessage,
        addToolOutput,
        status,
        error,
        setMessages,
    } = useChat({
        transport: new DefaultChatTransport({ api: "/api/chat" }),
        onToolCall: async ({ toolCall }) => {
            if (toolCall.toolName === "display_diagram") {
                const { xml } = toolCall.input as { xml: string }
                if (!isMxCellXmlComplete(xml)) {
                    partialXmlRef.current = xml
                    addToolOutput({
                        tool: "display_diagram",
                        toolCallId: toolCall.toolCallId,
                        state: "output-error",
                        errorText:
                            "Output was truncated. Use append_diagram to continue from the end.",
                    })
                    return
                }

                const fullXml = wrapWithMxFile(xml)
                onResult(fullXml, request?.runId || "")
                addToolOutput({
                    tool: "display_diagram",
                    toolCallId: toolCall.toolCallId,
                    output: "Diagram captured.",
                })
            } else if (toolCall.toolName === "append_diagram") {
                const { xml } = toolCall.input as { xml: string }
                partialXmlRef.current += xml
                if (isMxCellXmlComplete(partialXmlRef.current)) {
                    const fullXml = wrapWithMxFile(partialXmlRef.current)
                    partialXmlRef.current = ""
                    onResult(fullXml, request?.runId || "")
                    addToolOutput({
                        tool: "append_diagram",
                        toolCallId: toolCall.toolCallId,
                        output: "Diagram captured.",
                    })
                } else {
                    addToolOutput({
                        tool: "append_diagram",
                        toolCallId: toolCall.toolCallId,
                        state: "output-error",
                        errorText:
                            "Diagram still incomplete. Call append_diagram again.",
                    })
                }
            } else if (toolCall.toolName === "edit_diagram") {
                addToolOutput({
                    tool: "edit_diagram",
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText:
                        "Multi-agent runs do not support edit_diagram. Regenerate with display_diagram.",
                })
            }
        },
        onError: (err) => {
            onError(err.message || "Agent request failed.", request?.runId || "")
        },
        onFinish: () => {
            // If no result was captured, mark as error
            if (!partialXmlRef.current && status !== "error") {
                // no-op: result is set in onToolCall
            }
        },
        sendAutomaticallyWhen: ({ messages }) => {
            const isInContinuationMode = partialXmlRef.current.length > 0
            const shouldRetry = hasToolErrors(
                messages as unknown as ChatMessage[],
            )

            if (!shouldRetry) {
                autoRetryCountRef.current = 0
                continuationRetryCountRef.current = 0
                partialXmlRef.current = ""
                return false
            }

            if (isInContinuationMode) {
                if (
                    continuationRetryCountRef.current >=
                    MAX_CONTINUATION_RETRY_COUNT
                ) {
                    continuationRetryCountRef.current = 0
                    partialXmlRef.current = ""
                    return false
                }
                continuationRetryCountRef.current++
            } else {
                if (autoRetryCountRef.current >= MAX_AUTO_RETRY_COUNT) {
                    autoRetryCountRef.current = 0
                    partialXmlRef.current = ""
                    return false
                }
                autoRetryCountRef.current++
            }

            return true
        },
    })

    useEffect(() => {
        if (!request) return
        if (lastRunIdRef.current === request.runId) return
        lastRunIdRef.current = request.runId

        autoRetryCountRef.current = 0
        continuationRetryCountRef.current = 0
        partialXmlRef.current = ""
        setMessages([])
        onStatusChange("running", request.runId)

        sendMessage(
            { parts: request.parts },
            {
                body: {
                    xml: request.xml,
                    previousXml: request.previousXml,
                    sessionId: request.sessionId,
                },
                headers,
            },
        )
    }, [headers, onStatusChange, request, sendMessage, setMessages])

    useEffect(() => {
        if (!request || lastRunIdRef.current !== request.runId) return
        if (status === "error" || error) {
            onStatusChange("error", request.runId)
            onError(
                error?.message || "Agent request failed.",
                request.runId,
            )
        }
    }, [error, onError, onStatusChange, request, status])

    return null
}
