"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface Student {
  id: string;
  name: string;
  subject: string;
  current_level: string;
  learning_goals: string | null;
  weak_areas: string | null;
  created_at: string;
}

export default function TutorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Add Student Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    subject: "",
    current_level: "Beginner",
    learning_goals: "",
    weak_areas: "",
  });

  const supabase = createClient();

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("tutor_id", user.id)
      .order("name", { ascending: true });

    if (fetchError) {
      setError(`Failed to fetch students: ${fetchError.message}`);
    } else {
      setStudents(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to create student account.");
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsModalOpen(false);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        subject: "",
        current_level: "Beginner",
        learning_goals: "",
        weak_areas: "",
      });
      fetchStudents();
    } catch (err: any) {
      setModalError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your registered students and their profiles.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </Button>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          placeholder="Search students by name or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Student List */}
      {isLoading ? (
        <LoadingState message="Loading students..." />
      ) : filteredStudents.length === 0 ? (
        <Card className="text-center p-12 text-slate-500">
          <p className="font-semibold text-slate-700">No students found.</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? "Try adjusting your search term."
              : "Click '+ Add Student' above to register your first student."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => (
            <Link key={student.id} href={`/tutor/students/${student.id}`}>
              <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-snug">{student.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {student.subject} • {student.current_level}
                      </p>
                    </div>
                  </div>

                  {student.learning_goals && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      <span className="font-semibold text-slate-600">Goals: </span>
                      <span className="text-slate-500 line-clamp-2">
                        {student.learning_goals}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 group">
                  View Profile
                  <svg
                    className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalError("");
        }}
        title="Add Student"
      >
        {modalError && <ErrorMessage message={modalError} />}
        <form onSubmit={handleAddStudent} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter student name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter student email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Temporary Password"
            type="password"
            placeholder="Enter temporary password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject"
              placeholder="e.g. Mathematics"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <Select
              label="Current Level"
              options={[
                { label: "Beginner", value: "Beginner" },
                { label: "Intermediate", value: "Intermediate" },
                { label: "Advanced", value: "Advanced" },
              ]}
              value={formData.current_level}
              onChange={(e) => setFormData({ ...formData, current_level: e.target.value })}
            />
          </div>

          <Textarea
            label="Learning Goals"
            placeholder="e.g. Improve algebra and problem solving"
            value={formData.learning_goals}
            onChange={(e) => setFormData({ ...formData, learning_goals: e.target.value })}
            rows={2}
          />

          <Textarea
            label="Weak Areas"
            placeholder="e.g. Word problems, quadratic equations"
            value={formData.weak_areas}
            onChange={(e) => setFormData({ ...formData, weak_areas: e.target.value })}
            rows={2}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
