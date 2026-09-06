import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") {
    redirect("/tutor");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="student" userName={profile?.full_name || "Student"} />
      <main className="flex-1 p-8 max-w-7xl mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
