"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      // Sign up user with metadata role = 'tutor'
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "tutor",
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError("Sign up failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Insert or upsert into profiles table
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          full_name: fullName,
          role: "tutor",
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.warn("Profile creation warning:", profileError.message);
      }

      // Check if session was created directly or if email confirmation is required
      if (data.session) {
        router.push("/tutor");
        router.refresh();
      } else {
        setSuccessMsg(
          "Tutor account created! If email confirmation is enabled in your Supabase project, please check your inbox to confirm your email before logging in."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Art */}
      <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8 relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-500/20 mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Tutor Account</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Start managing students with TutorFlow
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-5">
            {successMsg}
            <div className="mt-3">
              <Link
                href="/login"
                className="inline-block bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full py-2.5 mt-2"
              size="lg"
              isLoading={isLoading}
            >
              Sign Up as Tutor
            </Button>
          </form>
        )}

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Note: Student accounts are created by Tutors inside the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
