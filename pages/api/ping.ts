import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json({ ok: true, runtime: 'pages-router', node: process.version })
}
