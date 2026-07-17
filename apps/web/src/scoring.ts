import type { Answer, Participant, Team } from './types'

export function participantPoints(participantId: string, answers: Answer[]) {
  return answers.filter((answer) => answer.participant_id === participantId && answer.correct === 1).length
}

export function teamPoints(teamId: string, teams: Team[], participants: Participant[], answers: Answer[]) {
  if (!teams.some((team) => team.id === teamId)) return 0
  const memberIds = new Set(participants.filter((participant) => participant.team_id === teamId).map((participant) => participant.id))
  return answers.filter((answer) => memberIds.has(answer.participant_id) && answer.correct === 1).length
}
