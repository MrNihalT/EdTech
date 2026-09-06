export interface StudentInfo {
  name: string;
  subject: string;
  current_level: string;
  learning_goals?: string | null;
  weak_areas?: string | null;
}

export interface PastSessionInfo {
  topic: string;
  scheduled_at: string;
  notes?: string | null;
}

export interface ReviewInfo {
  topic: string;
  summary: string;
  homework: string[];
  next_topic?: string | null;
}

export function buildSessionPlanPrompt(
  student: StudentInfo,
  pastSessions: PastSessionInfo[],
  topic: string
): string {
  const historyText = pastSessions.length > 0
    ? pastSessions.map(s => `- Topic: ${s.topic} (${s.scheduled_at})`).join("\n")
    : "No prior sessions.";

  return `
You are an expert personalized AI tutor assistant for TutorFlow.
Create a structured lesson plan for an upcoming 1-on-1 tutoring session.

STUDENT PROFILE:
- Name: ${student.name}
- Subject: ${student.subject}
- Current Level: ${student.current_level}
- Learning Goals: ${student.learning_goals || "None specified"}
- Weak Areas: ${student.weak_areas || "None specified"}

PAST SESSIONS HISTORY:
${historyText}

UPCOMING SESSION TOPIC:
${topic}

INSTRUCTIONS:
Return ONLY a valid JSON object matching this schema. Do not include markdown code block syntax or extra prose.
Schema:
{
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "lesson_outline": ["Point 1: Introduction", "Point 2: Core Concept", "Point 3: Guided Practice", "Point 4: Wrap up & Questions"],
  "practice_questions": ["Question 1...", "Question 2...", "Question 3..."]
}
`;
}

export function buildSessionReviewPrompt(
  student: StudentInfo,
  topic: string,
  notes: string
): string {
  return `
You are an expert personalized AI tutor assistant for TutorFlow.
Summarize a completed tutoring session and generate homework based on tutor notes.

STUDENT PROFILE:
- Name: ${student.name}
- Subject: ${student.subject}
- Current Level: ${student.current_level}
- Learning Goals: ${student.learning_goals || "None specified"}
- Weak Areas: ${student.weak_areas || "None specified"}

SESSION TOPIC:
${topic}

TUTOR NOTES FROM SESSION:
${notes || "No additional notes provided."}

INSTRUCTIONS:
Return ONLY a valid JSON object matching this schema. Do not include markdown code block syntax or extra prose.
Schema:
{
  "summary": "Short paragraph summarizing student understanding, progress, and engagement during the session.",
  "homework": ["Task 1", "Task 2", "Task 3"],
  "next_topic": "Suggested topic for the next session"
}
`;
}

export function buildProgressSummaryPrompt(
  student: StudentInfo,
  reviews: ReviewInfo[]
): string {
  const reviewsText = reviews.length > 0
    ? reviews.map((r, i) => `Session ${i + 1} (${r.topic}): Summary: ${r.summary} | Next: ${r.next_topic || 'N/A'}`).join("\n")
    : "No completed session reviews yet.";

  return `
You are an expert personalized AI tutor assistant for TutorFlow.
Generate a comprehensive progress summary for a student based on all past session reviews.

STUDENT PROFILE:
- Name: ${student.name}
- Subject: ${student.subject}
- Current Level: ${student.current_level}
- Learning Goals: ${student.learning_goals || "None specified"}
- Weak Areas: ${student.weak_areas || "None specified"}

PAST SESSION REVIEWS:
${reviewsText}

INSTRUCTIONS:
Return ONLY a valid JSON object matching this schema.
Schema:
{
  "summary": "One clear, well-written paragraph explaining what the student has improved, remaining weak areas, overall progress, and what should be focused on next."
}
`;
}
