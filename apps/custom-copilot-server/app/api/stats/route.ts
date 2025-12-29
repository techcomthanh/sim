import { NextResponse } from 'next/server'
import { z } from 'zod'

const StatsSchema = z.object({
  messageId: z.string().optional(),
  diffCreated: z.boolean().optional(),
  diffAccepted: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const stats = StatsSchema.parse(body)

    console.info('Stats received:', stats)

    // TODO: Store stats in database for analytics

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Invalid stats data' },
      { status: 400 }
    )
  }
}
