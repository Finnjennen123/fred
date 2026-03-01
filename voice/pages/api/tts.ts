import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    const voiceId = process.env.VOICE_ID || ''

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_v3',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs error:', error)
      return res.status(500).json({ error: 'TTS failed' })
    }

    const audioBuffer = await response.arrayBuffer()

    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(audioBuffer))

  } catch (error) {
    console.error('TTS error:', error)
    res.status(500).json({ error: 'Error processing request' })
  }
}
