import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify tutor role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "tutor") {
      return NextResponse.json(
        { error: "Forbidden: Only tutors can create students" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      full_name,
      email,
      password,
      subject,
      current_level,
      learning_goals,
      weak_areas,
    } = body;

    if (!full_name || !email || !password || !subject || !current_level) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Create Auth user
    let newUserId: string | null = null;

    const { data: adminUser, error: adminError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (adminError || !adminUser.user) {
      // Fallback to sign up if admin API fails or missing service key
      const { data: signUpData, error: signUpError } =
        await adminSupabase.auth.signUp({
          email,
          password,
          options: { data: { full_name } },
        });

      if (signUpError || !signUpData.user) {
        return NextResponse.json(
          { error: signUpError?.message || adminError?.message || "Failed to create student account" },
          { status: 400 }
        );
      }
      newUserId = signUpData.user.id;
    } else {
      newUserId = adminUser.user.id;
    }

    // 2. Insert into profiles
    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: newUserId,
      full_name,
      role: "student",
    });

    if (profileError) {
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 3. Insert into students
    const { data: studentRecord, error: studentError } = await adminSupabase
      .from("students")
      .insert({
        user_id: newUserId,
        tutor_id: user.id,
        name: full_name,
        subject,
        current_level,
        learning_goals: learning_goals || "",
        weak_areas: weak_areas || "",
      })
      .select()
      .single();

    if (studentError) {
      return NextResponse.json(
        { error: `Student record creation failed: ${studentError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ student: studentRecord }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
