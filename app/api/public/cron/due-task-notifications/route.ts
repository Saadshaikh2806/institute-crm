import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { sendPushNotification } from "@/lib/web-push"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: dueTasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, duedate, user_id, customer_id, customers(name)")
    .eq("completed", false)
    .is("notified_at", null)
    .lte("duedate", todayEnd.toISOString())

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  if (!dueTasks || dueTasks.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const userIds = Array.from(new Set(dueTasks.map((t) => t.user_id)))

  const { data: subscriptions, error: subsError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds)

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 })
  }

  const subsByUser = new Map<string, typeof subscriptions>()
  for (const sub of subscriptions ?? []) {
    const list = subsByUser.get(sub.user_id) ?? []
    list.push(sub)
    subsByUser.set(sub.user_id, list)
  }

  let sent = 0
  const notifiedTaskIds: string[] = []
  const staleEndpoints: string[] = []

  for (const task of dueTasks) {
    const subs = subsByUser.get(task.user_id) ?? []
    if (subs.length === 0) continue

    const customerName = (task as any).customers?.name
    const payload = {
      title: "Task Due",
      body: customerName ? `${task.title} — ${customerName}` : task.title,
      url: "/",
    }

    for (const sub of subs) {
      try {
        await sendPushNotification(sub, payload)
        sent++
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleEndpoints.push(sub.endpoint)
        }
      }
    }

    notifiedTaskIds.push(task.id)
  }

  if (notifiedTaskIds.length > 0) {
    await supabaseAdmin
      .from("tasks")
      .update({ notified_at: new Date().toISOString() })
      .in("id", notifiedTaskIds)
  }

  if (staleEndpoints.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints)
  }

  return NextResponse.json({ sent, tasksNotified: notifiedTaskIds.length })
}
