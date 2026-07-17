import type { Session } from './auth.js'

export type Role = Session['role']
export const canManageUsers = (session: Session) => session.role === 'admin'
export const canAssignRole = (session: Session, role: Role) => session.role === 'admin' && (role !== 'admin' || session.isPrimary)
export const canConfigureGame = (session: Session) => session.role === 'admin'
export const canPresent = (session: Session) => session.role === 'admin' || session.role === 'apresentador'
export function canManageTarget(session: Session, target: { id: string; role: Role; is_primary: number }) {
  if (session.role !== 'admin' || target.is_primary || target.id === session.userId) return false
  return target.role !== 'admin' || session.isPrimary
}
