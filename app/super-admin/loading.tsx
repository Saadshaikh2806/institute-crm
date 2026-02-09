export default function SuperAdminLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-muted-foreground">Loading Super Admin Dashboard...</p>
            </div>
        </div>
    )
}
