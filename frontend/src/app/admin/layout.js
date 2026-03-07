import AdminSidebar from "@/components/admin/AdminSidebar"

export default function AdminLayout({ children }) {

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">

      {/* Sidebar – sticky and full viewport height */}
      <div className="w-64 min-h-screen sticky top-0">
        <AdminSidebar />
      </div>

      {/* Page Content – scrollable independently */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>

    </div>
  )
}