import type { Session } from './security'

export type Role = Session['role']

export function canManageUsers(session: Session) {
  return session.role === 'admin'
}

export function canManageTarget(session: Session, target: { id: string; role: Role; is_primary: number }) {
  if (session.role !== 'admin') return false
  if (target.is_primary || target.id === session.userId) return false
  if (target.role === 'admin') return session.isPrimary
  return true
}

export function canAssignRole(session: Session, role: Role) {
  return session.role === 'admin' && (role !== 'admin' || session.isPrimary)
}

export function canConfigureGame(session: Session) {
  return session.role === 'admin'
}

export function canPresent(session: Session) {
  return session.role === 'admin' || session.role === 'apresentador'
}
