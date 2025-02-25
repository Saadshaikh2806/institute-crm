import { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { AuthCallbackHandler } from "@/components/auth/auth-callback-handler"

export const metadata: Metadata = {
  title: "Login - ADCI CRM",
  description: "Login to access the CRM system",
}

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <AuthCallbackHandler />
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Login to ADCI CRM
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
} 
