/**
 * Deterministic text-interview rubric.
 * Scores are reproducible, explainable, and rigorous.
 * Per-answer signals drive feedback with zero baseline score inflation.
 */

export interface InterviewAnswerInput {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface InterviewEvaluation {
  relevanceScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  perAnswer: Array<{
    questionId: string;
    wordCount: number;
    relevance: number;
    depth: number;
    structure: number;
  }>;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'with', 'that', 'this', 'what', 'how', 'when', 'about',
  'are', 'was', 'were', 'have', 'has', 'had', 'tell', 'describe', 'role', 'which', 'them',
  'from', 'into', 'most', 'when', 'where', 'work', 'working', 'rely', 'why', 'interested',
]);

const STAR_MARKERS = {
  situation: /\b(situation|context|project|team|when i|at my|during)\b/i,
  task: /\b(task|goal|responsib|needed to|had to|objective|required)\b/i,
  action: /\b(i (built|designed|implemented|wrote|fixed|led|created|debugged|analy[sz]ed|used|decided|refactored)|my approach|i took)\b/i,
  result: /\b(result|outcome|improved|reduced|increased|achieved|delivered|saved|learned|impact)\b/i,
};

const TECH_SIGNAL =
  /\b(api|database|sql|index|cache|latency|test|debug|algorithm|complexity|architecture|deploy|ci\/cd|docker|cloud|scal|performance|secure|security|react|node|python|java|git|query|log|monitor|trace)\w*/gi;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

function isAnswerEmpty(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === 'not answered.' ||
    trimmed === 'not answered' ||
    trimmed === 'n/a' ||
    trimmed === 'na' ||
    trimmed === 'no answer' ||
    trimmed === 'none'
  );
}

export function evaluateInterviewAnswers(
  answers: InterviewAnswerInput[],
  targetRole: string | null,
): InterviewEvaluation {
  const perAnswer: InterviewEvaluation['perAnswer'] = [];
  let metricAnswers = 0;
  let starAnswers = 0;
  let thinAnswers = 0;
  let unansweredCount = 0;

  for (const a of answers) {
    const text = a.answerText.trim();

    if (isAnswerEmpty(text)) {
      unansweredCount += 1;
      perAnswer.push({
        questionId: a.questionId,
        wordCount: 0,
        relevance: 0,
        depth: 0,
        structure: 0,
      });
      continue;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount < 5) {
      unansweredCount += 1;
      perAnswer.push({
        questionId: a.questionId,
        wordCount,
        relevance: 0,
        depth: 0,
        structure: 0,
      });
      continue;
    }

    // Relevance: keyword overlap between student answer and prompt/role
    const qKeys = keywords(`${a.questionText} ${targetRole ?? ''}`);
    const aKeys = keywords(text);
    let overlap = 0;
    for (const k of qKeys) if (aKeys.has(k)) overlap += 1;
    const ratio = qKeys.size > 0 ? overlap / Math.min(qKeys.size, 6) : 0.4;
    const relevance = clamp(ratio * 85 + (overlap > 0 ? 15 : 0));

    // Technical depth: domain keywords + quantitative metrics + adequate length
    const techHits = (text.match(TECH_SIGNAL) ?? []).length;
    const hasMetric = /\d+\s?(%|x|ms|s|users|requests|hours|days|k|m|gb|mb|tb)?\b/i.test(text);
    if (hasMetric) metricAnswers += 1;
    const lengthScore = Math.min(wordCount, 150) * 0.3; // max 45 pts at 150 words
    const techScore = Math.min(techHits, 8) * 5; // max 40 pts
    const metricBonus = hasMetric ? 15 : 0;
    const depth = clamp(lengthScore + techScore + metricBonus);

    // Structure & Communication: STAR method + readability + paragraph flow
    const starHits = Object.values(STAR_MARKERS).filter((re) => re.test(text)).length;
    if (starHits >= 3) starAnswers += 1;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgSentence = sentences.length ? wordCount / sentences.length : wordCount;
    const readable = avgSentence >= 8 && avgSentence <= 28 ? 30 : 15;
    const starScore = Math.min(starHits * 15, 45); // max 45 pts
    const flowScore = Math.min(sentences.length, 5) * 5; // max 25 pts
    const structure = clamp(starScore + readable + flowScore);

    if (wordCount < 30) thinAnswers += 1;
    perAnswer.push({ questionId: a.questionId, wordCount, relevance, depth, structure });
  }

  const totalQuestions = Math.max(answers.length, 1);
  const answeredCount = answers.length - unansweredCount;

  // If literally no questions were answered, score is zero
  if (answeredCount === 0) {
    return {
      relevanceScore: 0,
      technicalScore: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      overallScore: 0,
      strengths: [],
      improvements: [
        'All interview questions were left unanswered. Answer each question to receive a performance evaluation.',
      ],
      summary: `Evaluation for ${targetRole || 'the target role'}: Incomplete (0/100). No questions were answered.`,
      perAnswer,
    };
  }

  // Averages across ALL questions so unanswered questions strictly penalize the total
  const relevanceScore = clamp(perAnswer.reduce((s, p) => s + p.relevance, 0) / totalQuestions);
  const technicalScore = clamp(perAnswer.reduce((s, p) => s + p.depth, 0) / totalQuestions);
  const communicationScore = clamp(perAnswer.reduce((s, p) => s + p.structure, 0) / totalQuestions);
  const problemSolvingScore = clamp(technicalScore * 0.55 + communicationScore * 0.45);
  const overallScore = clamp(
    relevanceScore * 0.3 + technicalScore * 0.35 + communicationScore * 0.2 + problemSolvingScore * 0.15,
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  // Strengths based on authentic criteria
  if (relevanceScore >= 65) strengths.push('Responses directly targeted the interview questions and target position competencies.');
  if (starAnswers >= Math.ceil(answeredCount / 2)) strengths.push('Effectively structured situational responses using the STAR method.');
  if (metricAnswers >= Math.ceil(answeredCount / 2)) strengths.push('Backed achievements with concrete metrics, quantitative results, and outcomes.');
  if (technicalScore >= 60) strengths.push('Demonstrated solid technical depth and applied domain terminology effectively.');

  // Constructive improvements
  if (unansweredCount > 0) {
    improvements.push(`${unansweredCount} question(s) were left unanswered or skipped. Attempting all questions is essential for high interview marks.`);
  }
  if (thinAnswers > 0) {
    improvements.push(`${thinAnswers} answer(s) were too brief. Aim for 80–150 words per response with specific examples.`);
  }
  if (relevanceScore < 60) {
    improvements.push('Tie each answer back to the question and the target role more explicitly.');
  }
  if (starAnswers < Math.ceil(answeredCount / 2)) {
    improvements.push('Structure answers with STAR (Situation, Task, Action, Result) to provide clear context and outcome.');
  }
  if (metricAnswers < Math.ceil(answeredCount / 2)) {
    improvements.push('Quantify impact (e.g., % improvement, latency reduction, scale of users/traffic).');
  }
  if (technicalScore < 55) {
    improvements.push('Incorporate more technical detail: architectural patterns, tools, trade-offs, and verification.');
  }

  const band =
    overallScore >= 80
      ? 'exceptional'
      : overallScore >= 65
        ? 'proficient'
        : overallScore >= 45
          ? 'developing'
          : 'needs practice';

  return {
    relevanceScore,
    technicalScore,
    communicationScore,
    problemSolvingScore,
    overallScore,
    strengths,
    improvements,
    summary: `Evaluation for ${targetRole || 'the target role'}: ${band} (${String(overallScore)}/100). Assessment reflects technical depth, situational structure, and topic relevance.`,
    perAnswer,
  };
}
