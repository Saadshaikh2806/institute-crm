"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData.split("").map((char) => char.charCodeAt(0)))
}

export function NotificationPermission() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSupport = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
      setSupported(true)

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      setSubscribed(!!existing)
    }
    checkSupport()
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        toast.error("Push notifications are not configured")
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Notification permission denied")
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!res.ok) throw new Error("Failed to save subscription")

      setSubscribed(true)
      toast.success("Notifications enabled for due tasks")
    } catch (error) {
      console.error("Error subscribing to push notifications:", error)
      toast.error("Could not enable notifications")
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      toast.success("Notifications disabled")
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      toast.error("Could not disable notifications")
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1"
      disabled={loading}
      onClick={subscribed ? unsubscribe : subscribe}
      title={subscribed ? "Disable due-task notifications" : "Enable due-task notifications"}
    >
      {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      <span className="hidden sm:inline">{subscribed ? "Notifications On" : "Enable Notifications"}</span>
    </Button>
  )
}
