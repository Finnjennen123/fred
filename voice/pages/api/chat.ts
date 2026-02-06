import { GoogleGenerativeAI } from '@google/generative-ai'
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Load prompt from file once at startup
const voicePrompt = fs.readFileSync(path.join(process.cwd(), 'resources', 'orb_prompt.txt'), 'utf-8').trim()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: {
        role: 'user',
        parts: [{ text: voicePrompt }]
      }
    })

    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    })

    const lastMessage = messages[messages.length - 1].content
    const result = await chat.sendMessageStream(lastMessage)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        res.write(text)
      }
    }

    res.end()

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Error processing request' })
  }
}
