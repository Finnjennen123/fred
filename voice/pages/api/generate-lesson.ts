
import type { NextApiRequest, NextApiResponse } from 'next';
import { callLLM } from '../../lib/llm';
import { searchWeb } from '../../lib/web-search';
import learnerProfile from '../../learner_profile.json';

// System prompt from course/lessonPrompt.js
const LESSON_GENERATION_SYSTEM_PROMPT = `You are a personal tutor generating a single lesson for a learner. You will receive two things:

1. THE BRAIN — everything we know about this learner. This includes:
   - high_level.onboarding: what they want to learn and why
   - high_level.profiling: their current level, vocabulary, gaps, strengths, background, preferred depth, preferred tone, what to skip, what to teach from scratch
   - low_level: their performance data from previous lessons (may be empty if this is early in the course)

2. THE LESSON — which specific lesson to generate, including:
   - The title and description
   - The instructional_seed — this is your main directive. It tells you exactly what to teach and at what angle.
   - Where this lesson sits in the course (phase and lesson number)

YOUR JOB: Generate the full teaching content for this ONE lesson.

Rules:
- Follow the instructional_seed closely. It was written with this specific learner in mind.
- Match the tone from the profiling data. If it says casual, be casual. If it says professional, be professional.
- Match the depth from the profiling data. Don't go deeper or shallower than what was specified.
- Match the vocabulary level. Don't use jargon the learner won't know unless you're explicitly teaching that term.
- Use the learner's background to make content relatable.
- Leverage their strengths as bridges to new concepts.
- Don't overdo personalization. Make it natural — don't force connections back to the user's background where it doesn't add value.
- If low_level has data from previous lessons, adapt. If they struggled recently, slow down and reinforce. If they've been crushing it, you can be more efficient.
- If low_level is empty, just use high_level to guide everything.
- Teach, don't lecture. This should feel like a mentor explaining something one-on-one, not a textbook.
- Keep it focused. This is ONE lesson on ONE topic. Don't wander.


You will also receive web_research — recent search results about this lesson's topic. Use this to:
- Ground your teaching in accurate, current information
- Reference real tools, frameworks, or developments that exist today
- Avoid teaching outdated practices or deprecated features
- Include specific examples or data points that are up to date

The web research is supplementary. The brain data still drives personalization, tone, and depth. Use search results for factual accuracy, not for changing how you teach.

MASTERY CRITERIA: At the end of your lesson content, generate a clear set of mastery criteria — what the learner needs to know to PASS this lesson. This is not a quiz. It's a checklist that defines "this person understood this lesson." Keep it to 2-5 concrete, testable points. These will be used by the teaching agent to build quiz questions and decide whether the learner can move forward.

Your output should be JSON with two fields:
{
  "content": "The full lesson content as a string. Use markdown formatting for structure (headings, lists, code blocks, etc.). Make it readable and well-organized.",
  "mastery_criteria": [
    "Can explain X",
    "Understands the difference between Y and Z",
    "Knows when to apply W"
  ]
}`;

function buildLessonQueries(lesson: any) {
  return [
    `${lesson.title}`,
    `${lesson.title} guide explanation`
  ];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lesson, brain } = req.body;

  if (!lesson || !lesson.title) {
    return res.status(400).json({ error: 'Missing lesson data' });
  }

  // Construct the brain object if not fully provided, using default profile
  // If the frontend sends a simplified brain (just {high_level: ...}), we use it directly.
  // We ensure it has the structure expected by the prompt.
  let brainData = brain;
  
  if (!brainData) {
      brainData = {
        high_level: {
          onboarding: {
            subject: learnerProfile.subject,
            reason: learnerProfile.reason
          },
          profiling: {
            starting_level: learnerProfile.starting_level,
            depth: learnerProfile.depth,
            preferred_tone: "casual",
            background: learnerProfile.learner_context
          }
        },
        low_level: {}
      };
  }

  try {
    // 1. Web Search
    const queries = buildLessonQueries(lesson);
    const searchResults = [];
    
    // Execute searches in parallel
    const searchPromises = queries.map(q => searchWeb(q));
    const results = await Promise.all(searchPromises);
    
    for (const resultGroup of results) {
      searchResults.push(...resultGroup);
    }

    // 2. Call LLM
    console.log('[LESSON_GEN] Calling LLM with brain:', JSON.stringify(brainData.high_level, null, 2));
    const response = await callLLM({
      messages: [
        {
          role: 'system',
          content: LESSON_GENERATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify({
            brain: brainData,
            lesson: {
              title: lesson.title,
              description: lesson.description || lesson.title,
              instructional_seed: lesson.instructional_seed || `Teach ${lesson.title} effectively.`,
              phase_title: lesson.phase_title || 'General',
              lesson_number: lesson.lesson_number || 1,
              phase_number: lesson.phase_number || 1
            },
            web_research: searchResults
          })
        }
      ],
      response_format: { type: 'json_object' }
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No content received from LLM');
    }

    // Strip markdown code fences if LLM wraps response in ```json ... ```
    let raw = choice.message.content.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let generatedLesson: any;
    try {
      generatedLesson = JSON.parse(raw);
    } catch (parseErr) {
      // LLM output was likely truncated — attempt repair
      console.warn('[LESSON_GEN] JSON parse failed, attempting repair...');
      let repaired = raw;
      // Close any unclosed string (find last unescaped quote)
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) repaired += '"';
      // Close unclosed array brackets and object braces
      const open = (ch: string) => (repaired.match(new RegExp(`\\${ch}`, 'g')) || []).length;
      const brackets = open('[') - open(']');
      const braces = open('{') - open('}');
      for (let i = 0; i < brackets; i++) repaired += ']';
      for (let i = 0; i < braces; i++) repaired += '}';
      try {
        generatedLesson = JSON.parse(repaired);
        console.log('[LESSON_GEN] JSON repair succeeded');
      } catch {
        // Last resort: extract content before the break and build a valid object
        const contentMatch = raw.match(/"content"\s*:\s*"([\s\S]*)/);
        if (contentMatch) {
          // Grab everything after "content": " and clean up
          let content = contentMatch[1];
          // Remove trailing incomplete JSON
          content = content.replace(/",?\s*"mastery_criteria[\s\S]*$/, '');
          // Unescape for readability, then re-escape
          generatedLesson = {
            content: content.replace(/\\n/g, '\n').replace(/\\"/g, '"'),
            mastery_criteria: ['Review this lesson and confirm understanding of key concepts']
          };
          console.log('[LESSON_GEN] Extracted partial content as fallback');
        } else {
          throw parseErr;
        }
      }
    }
    
    // Ensure mastery_criteria is an array
    if (!Array.isArray(generatedLesson.mastery_criteria)) {
      generatedLesson.mastery_criteria = [generatedLesson.mastery_criteria].filter(Boolean);
    }

    res.status(200).json(generatedLesson);
  } catch (error: any) {
    console.error('Error generating lesson:', error);
    res.status(500).json({ error: error.message || 'Failed to generate lesson' });
  }
}
