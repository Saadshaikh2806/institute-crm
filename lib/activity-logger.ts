import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { ActivityActionType, EntityType } from "@/types/crm"

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
 * Get a human-readable description for an activity action
 */
export function getActivityDescription(actionType: ActivityActionType, details?: Record<string, any>): string {
    const descriptions: Record<ActivityActionType, string> = {
        login: "Logged in",
        logout: "Logged out",
        customer_create: `Created customer${details?.customerName ? `: ${details.customerName}` : ""}`,
        customer_update: `Updated customer${details?.customerName ? `: ${details.customerName}` : ""}`,
        customer_delete: `Deleted customer${details?.customerName ? `: ${details.customerName}` : ""}`,
        customer_status_change: `Changed customer status${details?.newStatus ? ` to ${details.newStatus}` : ""}`,
        task_create: `Created task${details?.taskTitle ? `: ${details.taskTitle}` : ""}`,
        task_complete: `Completed task${details?.taskTitle ? `: ${details.taskTitle}` : ""}`,
        task_delete: `Deleted task${details?.taskTitle ? `: ${details.taskTitle}` : ""}`,
        interaction_add: `Added ${details?.interactionType || "interaction"}`,
        tag_add: `Added tag${details?.tagName ? `: ${details.tagName}` : ""}`,
        tag_delete: `Removed tag${details?.tagName ? `: ${details.tagName}` : ""}`,
        user_create: `Created user${details?.userEmail ? `: ${details.userEmail}` : ""}`,
        user_update: `Updated user${details?.userEmail ? `: ${details.userEmail}` : ""}`,
        user_deactivate: `Deactivated user${details?.userEmail ? `: ${details.userEmail}` : ""}`
    }

    return descriptions[actionType] || actionType
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
        task_create: "ListPlus",
        task_complete: "CheckCircle",
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
