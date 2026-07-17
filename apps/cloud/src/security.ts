import { SignJWT, jwtVerify } from 'jose'

const encoder = new TextEncoder()

function base64(bytes: ArrayBuffer) {
  const values = new Uint8Array(bytes)
  let binary = ''
  for (const value of values) binary += String.fromCharCode(value)
  return btoa(binary)
}

async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return base64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 150_000 }, key, 256))
}

export async function hashPassword(password: string) {
  const salt = crypto.randomUUID()
  return `${salt}:${await derive(password, salt)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = await derive(password, salt)
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return difference === 0
}

export type Session = { userId: string; name: string; role: 'admin' | 'apresentador' | 'auxiliar' }

export async function createToken(session: Session, secret: string) {
  return new SignJWT(session).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(encoder.encode(secret))
}

export async function readToken(token: string, secret: string) {
  const { payload } = await jwtVerify(token, encoder.encode(secret))
  return payload as unknown as Session
}
