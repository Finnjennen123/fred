import type { NextApiRequest, NextApiResponse } from 'next';
import { COURSE_STRUCTURE_SYSTEM_PROMPT, LearnerProfile } from '../../../lib/prompts';
import { callLLM } from '../../../lib/llm';
import { searchWeb, SearchResult } from '../../../lib/web-search';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profile = req.body as LearnerProfile;
    
    if (!profile.subject) {
      return res.status(400).json({ error: 'Missing subject in learner profile' });
    }

    console.log('[COURSE_GEN] Starting generation for subject:', profile.subject);

    // 1. Perform web search to get latest context
    let searchResults: SearchResult[] = [];
    try {
      console.log('[COURSE_GEN] Searching web for:', profile.subject);
      searchResults = await searchWeb(profile.subject);
    } catch (e) {
      console.warn('[COURSE_GEN] Web search failed, proceeding without:', e);
    }

    // 2. Prepare the prompt inputs
    const brain = {
      subject: profile.subject,
      reason: profile.reason,
      summary: profile.summary,
      starting_level: profile.starting_level,
      depth: profile.depth,
      focus_areas: profile.focus_areas,
      skip_areas: profile.skip_areas,
      learner_context: profile.learner_context,
      notes: profile.notes
    };

    const searchContext = searchResults.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippets.join(' ')}`).join('\n\n');

    const userMessage = `
Here is the LEARNER BRAIN:
${JSON.stringify(brain, null, 2)}

Here is the WEB RESEARCH:
${searchContext}

Design the course structure now.
    `.trim();

    // 3. Call LLM
    console.log('[COURSE_GEN] Calling LLM...');
    console.log('[COURSE_GEN] Brain context:', JSON.stringify(brain, null, 2)); // Add this log
    const response = await callLLM({
      messages: [
        { role: 'system', content: COURSE_STRUCTURE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content received from LLM');
    }

    let courseStructure;
    try {
      courseStructure = JSON.parse(content);
    } catch (e) {
      console.error('[COURSE_GEN] Failed to parse JSON:', content);
      return res.status(500).json({ error: 'Failed to parse generated course structure' });
    }

    console.log('[COURSE_GEN] Success!');
    
    // Return the structure
    return res.status(200).json(courseStructure);

  } catch (error: any) {
    console.error('[COURSE_GEN] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
