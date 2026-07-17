import { describe, expect, it } from 'vitest'
import { participantPoints, teamPoints } from './scoring'

const teams: any[] = [{ id: 'equipe-1' }]
const participants: any[] = [{ id: 'p1', team_id: 'equipe-1' }, { id: 'p2', team_id: 'equipe-1' }]
const answers: any[] = [
  { participant_id: 'p1', correct: 1 }, { participant_id: 'p1', correct: 0 }, { participant_id: 'p2', correct: 1 }
]

describe('pontuação', () => {
  it('soma apenas os acertos do participante', () => expect(participantPoints('p1', answers)).toBe(1))
  it('soma os acertos de toda a equipe', () => expect(teamPoints('equipe-1', teams, participants, answers)).toBe(2))
})
