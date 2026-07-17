import type { NextFunction, Request, Response } from 'express'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'desenvolvimento-local-troque-antes-de-publicar')

export type Session = { userId: string; name: string; role: 'admin' | 'apresentador' | 'auxiliar' }

export async function createToken(session: Session) {
  return new SignJWT(session).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(secret)
}

declare global {
  namespace Express { interface Request { session?: Session } }
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return response.status(401).json({ message: 'Entre novamente para continuar.' })
    const { payload } = await jwtVerify(token, secret)
    request.session = payload as unknown as Session
    next()
  } catch {
    response.status(401).json({ message: 'Sua sessão expirou. Entre novamente.' })
  }
}
