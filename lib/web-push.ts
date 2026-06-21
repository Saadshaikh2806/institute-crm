import webpush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    "mailto:notifications@institute-crm.local",
    publicKey,
    privateKey
  )
}

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: { title: string; body: string; url?: string }
) {
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured")
  }

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  )
}
