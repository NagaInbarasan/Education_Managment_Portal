/**
 * AI Intent Router — Uses Qwen3:8B to classify user intent.
 * Maps natural language questions to safe tool categories.
 */
import { generateChat } from './ollamaClient.js';

const INTENT_CATEGORIES = [
  'ATTENDANCE_QUERY',
  'ASSIGNMENT_QUERY',
  'TEST_QUERY',
  'RESULT_QUERY',
  'TIMETABLE_QUERY',
  'ANNOUNCEMENT_QUERY',
  'STUDENT_QUERY',
  'SUBJECT_TUTOR',
  'GENERAL_HELP',
  'UNKNOWN'
];

const CLASSIFICATION_PROMPT = `You are an intent classifier for a college management portal called Phazon.
Classify the user's question into exactly ONE category from the list below.

Categories:
- ATTENDANCE_QUERY: Questions about attendance, absences, presence, who is absent/present today, attendance percentage, low attendance
- ASSIGNMENT_QUERY: Questions about assignments, submissions, who hasn't submitted, pending assignments, due dates
- TEST_QUERY: Questions about tests, exams, who hasn't taken a test, test completion
- RESULT_QUERY: Questions about marks, scores, grades, results, pass/fail, average score, highest/lowest
- TIMETABLE_QUERY: Questions about schedule, classes, periods, next class, today's classes, when is my class
- ANNOUNCEMENT_QUERY: Questions about announcements, notices, what was announced
- STUDENT_QUERY: Questions about student lists, student count, show students, who is in my class
- SUBJECT_TUTOR: Academic or conceptual questions about a subject topic (e.g. "what is polymorphism", "explain normalization")
- GENERAL_HELP: Questions about how to use the portal, navigation help
- UNKNOWN: Cannot classify or out of scope

Also extract relevant parameters from the question:
- assignment_title: name of a specific assignment mentioned
- test_title: name of a specific test mentioned
- subject_name: name of a subject mentioned
- section_name: section mentioned (e.g. "Section C", "Section B")
- student_name: specific student name mentioned
- threshold: numeric threshold mentioned (e.g. "below 75%" -> 75)
- date_reference: date reference (e.g. "today", "yesterday", "last 3 days")
- next_class: true if asking about next/upcoming class

Respond with ONLY a JSON object, no other text:
{"intent": "CATEGORY_NAME", "params": {"key": "value"}}`;

/**
 * Classify user intent using Qwen.
 * Returns { intent, params, toolName }
 */
export async function classifyIntent(question, userRole) {
  try {
    const messages = [
      { role: 'system', content: CLASSIFICATION_PROMPT },
      { role: 'user', content: `User role: ${userRole}\nQuestion: ${question}` }
    ];

    const response = await generateChat(messages, { noThink: true, temperature: 0.1 });
    
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = response.trim();
    
    // Remove think tags if present
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Find JSON object in the response
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Intent router: No JSON found in response:', response);
      return { intent: 'GENERAL_HELP', params: {} };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const intent = INTENT_CATEGORIES.includes(parsed.intent) ? parsed.intent : 'UNKNOWN';
    const params = parsed.params || {};

    // Normalize certain params
    if (params.threshold && typeof params.threshold === 'string') {
      params.threshold = parseInt(params.threshold, 10) || 75;
    }
    if (params.next_class === 'true' || params.next_class === true) {
      params.next_class = true;
    }

    return { intent, params };
  } catch (err) {
    console.error('Intent classification error:', err.message);
    return { intent: 'GENERAL_HELP', params: {} };
  }
}
