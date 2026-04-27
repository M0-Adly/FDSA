import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Citizen Portal | National Crisis Management System",
  description: "Citizen portal for emergency reporting.",
};

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <a href="/citizen" className="text-xl font-bold">Citizen Portal</a>
          <div className="flex gap-4">
            <a href="/citizen" className="hover:text-blue-200">Dashboard</a>
            <a href="/citizen/profile" className="hover:text-blue-200">Profile</a>
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
