import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Uses service role key so it can read the plain_password field securely server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("crm_users")
      .select("full_name, email, plain_password, role, is_active, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Export credentials error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build CSV content
    const header = "Full Name,Email,Password,Role,Status,Created At"
    const rows = (data || []).map((user) => {
      const name = `"${(user.full_name || "").replace(/"/g, '""')}"`
      const email = `"${(user.email || "").replace(/"/g, '""')}"`
      const password = `"${(user.plain_password || "").replace(/"/g, '""')}"`
      const role = `"${(user.role || "").replace(/"/g, '""')}"`
      const status = user.is_active ? "Active" : "Inactive"
      const createdAt = user.created_at
        ? new Date(user.created_at).toLocaleString()
        : ""
      return `${name},${email},${password},${role},${status},"${createdAt}"`
    })

    const csv = [header, ...rows].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="user-credentials-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err: any) {
    console.error("Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
