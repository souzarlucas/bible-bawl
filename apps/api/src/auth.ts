import type { NextFunction, Request, Response } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './database.js'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'desenvolvimento-local-troque-antes-de-publicar')

export type Session = { userId: string; name: string; role: 'admin' | 'apresentador' | 'auxiliar'; isPrimary: boolean; authVersion: number }

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
    const user = db.prepare('SELECT id,name,role,is_primary,active,auth_version FROM users WHERE id=?').get(String(payload.userId || '')) as any
    if (!user?.active) return response.status(403).json({ message: 'Esta conta foi bloqueada. Fale com o administrador principal.',code:'ACCOUNT_BLOCKED' })
    if (Number(payload.authVersion || 0) !== Number(user.auth_version)) return response.status(401).json({ message:'Sua sessão foi encerrada por segurança. Entre novamente.',code:'SESSION_REVOKED' })
    request.session = { userId:user.id,name:user.name,role:user.role,isPrimary:Boolean(user.is_primary),authVersion:Number(user.auth_version) }
    next()
  } catch {
    response.status(401).json({ message: 'Sua sessão expirou. Entre novamente.' })
  }
}
