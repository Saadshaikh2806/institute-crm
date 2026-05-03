import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// This route uses the SERVICE ROLE key to bypass email verification
// and directly update any user's password. Only callable server-side.
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

export async function POST(req: NextRequest) {
  try {
    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "userId and newPassword are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Use admin API to update the user's password directly (no email needed)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also persist plain password in crm_users for the credentials export feature
    await supabaseAdmin
      .from("crm_users")
      .update({ plain_password: newPassword })
      .eq("auth_user_id", userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
