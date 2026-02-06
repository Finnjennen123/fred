import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = process.env.DEEPGRAM_API_KEY
  
  if (!token) {
    return res.status(500).json({ error: 'No API key configured' })
  }
  
  res.status(200).json({ token })
}
