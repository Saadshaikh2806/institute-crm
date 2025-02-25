import Link from 'next/link'
import { Users, Home, Settings } from "lucide-react"

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: Home
  },
  {
    name: "Shared Access",
    href: "/admin/shared-access",
    icon: Users
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings
  }
]

export function AdminSidebar() {
  return (
    <div className="w-64 min-h-screen bg-gray-100 border-r">
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded-md"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}