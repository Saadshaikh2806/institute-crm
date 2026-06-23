import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { ActivityActionType, EntityType, FieldChange } from "@/types/crm"

interface LogActivityParams {
    actionType: ActivityActionType
    entityType?: EntityType
    entityId?: string
    details?: Record<string, any>
}

/**
 * Logs user activity to the database for tracking purposes.
 * This function is called from various parts of the app to track user actions.
 */
export async function logActivity({
    actionType,
    entityType,
    entityId,
    details,
}: LogActivityParams): Promise<void> {
    const supabase = createClientComponentClient()

    try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.id) {
            console.warn("Cannot log activity: User not authenticated")
            return
        }

        const { error } = await supabase
            .from("user_activity_logs")
            .insert([{
                user_id: session.user.id,
                user_email: session.user.email,
                action_type: actionType,
                entity_type: entityType,
                entity_id: entityId,
                details: details,
                user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
                created_at: new Date().toISOString()
            }])

        if (error) {
            console.error("Failed to log activity:", error)
        }
    } catch (error) {
        console.error("Error in logActivity:", error)
    }
}

/**
 * Compares two objects and returns only the fields that changed, as
 * { field: { from, to } }. Used to capture before/after detail on updates.
 * Pass `fields` to restrict the comparison to a known set of keys.
 */
export function diffObjects(
    before: Record<string, any> | null | undefined,
    after: Record<string, any> | null | undefined,
    fields?: string[]
): Record<string, FieldChange> {
    const changes: Record<string, FieldChange> = {}
    if (!after) return changes

    const keys = fields ?? Array.from(
        new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
    )

    for (const key of keys) {
        const from = before ? before[key] : undefined
        const to = after[key]
        // Treat empty string / null / undefined as equivalent "no value"
        const norm = (v: any) => (v === "" || v === null || v === undefined ? null : v)
        if (norm(from) !== norm(to)) {
            changes[key] = { from: from ?? null, to: to ?? null }
        }
    }

    return changes
}

/** Human-friendly field labels for change summaries. */
const fieldLabels: Record<string, string> = {
    name: "name",
    email: "email",
    phone: "phone",
    phone2: "phone 2",
    phone3: "phone 3",
    school: "school",
    stdBoard: "board",
    source: "source",
    status: "status",
    remarks: "remarks",
    engagement: "engagement",
    interestLevel: "interest level",
    budgetFit: "budget fit",
    counsellorName: "counsellor",
    team: "team",
}

const labelFor = (key: string) => fieldLabels[key] || key.replace(/_/g, " ")

/**
 * Builds a short summary of changed fields, e.g.
 * "status: Hot → Walk In Done; phone: 123 → 456".
 */
export function summarizeChanges(changes?: Record<string, FieldChange>): string {
    if (!changes) return ""
    const parts = Object.entries(changes).map(([key, change]) => {
        const from = change.from === null || change.from === "" ? "—" : change.from
        const to = change.to === null || change.to === "" ? "—" : change.to
        return `${labelFor(key)}: ${from} → ${to}`
    })
    return parts.join("; ")
}

/**
 * Get a human-readable description for an activity action.
 */
export function getActivityDescription(actionType: ActivityActionType, details?: Record<string, any>): string {
    const name = details?.entityName || details?.customerName || details?.taskTitle || details?.userEmail
    const changeSummary = summarizeChanges(details?.changes)

    switch (actionType) {
        case "login":
            return "Logged in"
        case "logout":
            return "Logged out"
        case "customer_create":
            return `Created customer${name ? `: ${name}` : ""}`
        case "customer_update":
            return `Updated customer${name ? ` ${name}` : ""}${changeSummary ? ` (${changeSummary})` : ""}`
        case "customer_delete":
            return `Deleted customer${name ? `: ${name}` : ""}`
        case "customer_status_change": {
            const from = details?.changes?.status?.from ?? details?.oldStatus
            const to = details?.changes?.status?.to ?? details?.newStatus
            if (from || to) return `Status${name ? ` for ${name}` : ""}: ${from || "—"} → ${to || "—"}`
            return "Changed customer status"
        }
        case "lead_score_update":
            return `Updated lead score${name ? ` for ${name}` : ""}${changeSummary ? ` (${changeSummary})` : ""}`
        case "task_create":
            return `Created task${name ? `: ${name}` : ""}`
        case "task_complete":
            return `Completed task${name ? `: ${name}` : ""}`
        case "task_reopen":
            return `Reopened task${name ? `: ${name}` : ""}`
        case "task_delete":
            return `Deleted task${name ? `: ${name}` : ""}`
        case "interaction_add":
            return `Added ${details?.interactionType || "interaction"}${details?.customerName ? ` for ${details.customerName}` : ""}`
        case "tag_add":
            return `Added tag${details?.tagName ? `: ${details.tagName}` : ""}`
        case "tag_delete":
            return `Removed tag${details?.tagName ? `: ${details.tagName}` : ""}`
        case "user_create":
            return `Created user${name ? `: ${name}` : ""}`
        case "user_update":
            return `Updated user${name ? `: ${name}` : ""}`
        case "user_deactivate":
            return `Deactivated user${name ? `: ${name}` : ""}`
        default:
            return actionType
    }
}

/**
 * Get icon class for activity type (for UI)
 */
export function getActivityIcon(actionType: ActivityActionType): string {
    const icons: Record<string, string> = {
        login: "LogIn",
        logout: "LogOut",
        customer_create: "UserPlus",
        customer_update: "UserCog",
        customer_delete: "UserMinus",
        customer_status_change: "RefreshCw",
        lead_score_update: "Gauge",
        task_create: "ListPlus",
        task_complete: "CheckCircle",
        task_reopen: "RotateCcw",
        task_delete: "ListMinus",
        interaction_add: "MessageSquare",
        tag_add: "Tag",
        tag_delete: "TagOff",
        user_create: "UserPlus",
        user_update: "UserCog",
        user_deactivate: "UserX"
    }

    return icons[actionType] || "Activity"
}
