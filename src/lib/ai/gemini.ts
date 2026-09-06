import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable is missing.");
}

export const gemini = new GoogleGenAI({
  apiKey: apiKey || "dummy-key-for-build",
});

export async function generateJSONResponse<T>(prompt: string): Promise<T> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Use gemini-3.6-flash model
  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const rawText = response.text || "";
  
  // Clean markdown backticks if returned
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleanedText) as T;
  } catch (error) {
    console.error("Failed to parse Gemini JSON response:", rawText, error);
    throw new Error("Failed to generate AI response. Invalid output format.");
  }
}