import type { NextApiRequest, NextApiResponse } from 'next'
import {
  ONBOARDING_PROMPT,
  PROFILING_PROMPT,
  onboardingTools,
  profilingTools,
  OnboardingResult,
  ProfilingResult,
  LearnerProfile
} from '../../lib/prompts'
import { callLLM } from '../../lib/llm'
import { insertLearnerProfile } from '../../lib/db'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ConversationState {
  messages: Message[]
  phase: 'onboarding' | 'profiling' | 'complete'
  onboardingResult?: OnboardingResult
  profilingResult?: ProfilingResult
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Auth disabled — no user resolution
    const userId: string | null = null

    const { messages: clientMessages, phase: clientPhase, onboardingResult: clientOnboardingResult, forceComplete } = req.body as {
      messages: Message[]
      phase?: 'onboarding' | 'profiling' | 'complete'
      onboardingResult?: OnboardingResult
      forceComplete?: boolean
    }

    // ── Force-complete: extract learner profile from conversation so far ──
    if (forceComplete) {
      const extractTool = {
        type: 'function' as const,
        function: {
          name: 'extract_learner_profile',
          description: 'Extract the learner profile from the conversation so far.',
          parameters: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'What the learner wants to study' },
              reason: { type: 'string', description: 'Why they want to learn this' },
              summary: { type: 'string', description: 'Brief conversation summary' },
              starting_level: { type: 'string', description: "Where should the course start? E.g. 'complete beginner', 'knows basics', 'intermediate'" },
              depth: { type: 'string', description: "How deep should the course go? E.g. 'broad overview', 'solid working knowledge', 'deep mastery'" },
              focus_areas: { type: 'string', description: 'What should the course focus on?' },
              skip_areas: { type: 'string', description: 'Anything to skip or de-emphasize' },
              learner_context: { type: 'string', description: 'Relevant context about the learner' },
              notes: { type: 'string', description: 'Other observations' },
              final_message: { type: 'string', description: "A short, warm closing message to the user (1-2 sentences). Something like 'Awesome, I've got everything I need!'" }
            },
            required: ['subject', 'reason', 'summary', 'starting_level', 'depth', 'focus_areas', 'final_message']
          }
        }
      }

      const extractMessages = [
        {
          role: 'system' as const,
          content: `You are analyzing a conversation between a learner and an onboarding assistant. Based on what has been discussed, extract the learner's profile by calling extract_learner_profile. For any information not explicitly discussed, make reasonable inferences from context. You MUST call the tool.`
        },
        ...clientMessages
      ]

      const extractData = await callLLM({ messages: extractMessages, tools: [extractTool] })
      const extractMsg = extractData.choices?.[0]?.message

      if ((extractMsg?.tool_calls?.length ?? 0) > 0) {
        const args = JSON.parse(extractMsg.tool_calls[0].function.arguments)
        return res.status(200).json({
          type: 'complete',
          text: args.final_message || "Great, I have enough to build your course. Let's go!",
          learnerProfile: {
            subject: args.subject || '',
            reason: args.reason || '',
            summary: args.summary || '',
            onboarding_summary: args.summary || '',
            starting_level: args.starting_level || 'beginner',
            depth: args.depth || 'moderate',
            focus_areas: args.focus_areas || '',
            skip_areas: args.skip_areas || '',
            learner_context: args.learner_context || '',
            notes: args.notes || ''
          }
        })
      }

      // Fallback if LLM didn't call the tool
      return res.status(200).json({
        type: 'complete',
        text: "I've got enough to get started. Let me build your course!",
        learnerProfile: {
          subject: clientOnboardingResult?.subject || 'General Topic',
          reason: clientOnboardingResult?.reason || 'Personal interest',
          summary: clientOnboardingResult?.summary || 'Learner onboarding',
          onboarding_summary: clientOnboardingResult?.summary || 'Learner onboarding',
          starting_level: 'beginner',
          depth: 'moderate',
          focus_areas: '',
          skip_areas: '',
          learner_context: '',
          notes: ''
        }
      })
    }

    // Determine current phase
    let phase = clientPhase || 'onboarding'
    let onboardingResult = clientOnboardingResult

    // Build messages with the appropriate system prompt
    const systemPrompt = phase === 'onboarding' ? ONBOARDING_PROMPT : PROFILING_PROMPT
    const tools = phase === 'onboarding' ? onboardingTools : profilingTools

    // Build the full messages array with system prompt
    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...clientMessages
    ]

    // If transitioning to profiling, add a hidden instruction
    if (phase === 'profiling') {
      // Check if we already have the transition message
      const hasTransition = clientMessages.some(m =>
        m.role === 'user' && m.content.includes('[SYSTEM: Onboarding phase complete')
      )
      // Only inject the system prompt if we haven't already AND if we have the result
      if (!hasTransition && onboardingResult) {
        // Insert transition message as a system-like user message
        // This ensures the model sees it in context
        fullMessages.push({
          role: 'user' as const,
          content: `[SYSTEM: Onboarding phase complete. 
          User wants to learn: ${onboardingResult.subject}
          Reason: ${onboardingResult.reason}
          Summary: ${onboardingResult.summary}
          
          You now know what they want to learn and why. 
          Now, switch to PROFILING mode.
          Your goal is to determine their current skill level and how deep the course should go.
          Ask ONE simple question to start this phase.
          Don't start with a new greeting - just continue the flow naturally.]`
        })
      }
    }

    // DEBUG: Log the last message to see what we're sending
    // console.log('[CHAT] Last message sent to LLM:', fullMessages[fullMessages.length - 1].content);

    // Call LLM provider
    const data = await callLLM({ messages: fullMessages, tools })
    const choice = data.choices?.[0]
    const message = choice?.message

    if (!message) {
      return res.status(500).json({ error: 'No response from model' })
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]
      const toolArgs = JSON.parse(toolCall.function.arguments)

      if (toolCall.function.name === 'complete_onboarding') {
        // Transition to profiling phase
        return res.status(200).json({
          type: 'phase_transition',
          newPhase: 'profiling',
          onboardingResult: toolArgs as OnboardingResult,
          // Request another turn immediately
          continueConversation: true
        })
      }

      if (toolCall.function.name === 'complete_profiling') {
        const profilingResult = toolArgs as ProfilingResult

        // Save the learner profile
        const learnerProfile: LearnerProfile = {
          subject: onboardingResult?.subject || '',
          reason: onboardingResult?.reason || '',
          summary: onboardingResult?.summary || '',
          onboarding_summary: onboardingResult?.summary || '',
          starting_level: profilingResult.starting_level,
          depth: profilingResult.depth,
          focus_areas: profilingResult.focus_areas,
          skip_areas: profilingResult.skip_areas,
          learner_context: profilingResult.learner_context,
          notes: profilingResult.notes
        }

        // Removed auth check to allow guest generation
        // if (!userId) { ... }

        try {
          if (userId) {
            const id = await insertLearnerProfile(userId, learnerProfile)
            console.log('Saved learner profile to DB with id:', id)
          }
        } catch (e) {
          console.error('Failed to save learner profile to DB:', e)
        }

        return res.status(200).json({
          type: 'complete',
          text: profilingResult.final_message,
          learnerProfile
        })
      }
    }

    // Regular text response - stream it back
    const text = message.content || ''

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.write(text)
    res.end()

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Error processing request' })
  }
}
