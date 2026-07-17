import { describe,expect,it } from 'vitest'
import { canAssignRole,canManageTarget,canPresent } from './authorization'
import type { Session } from './security'

const primary:Session={ userId:'principal',name:'Lucas',role:'admin',isPrimary:true,authVersion:1 }
const admin:Session={ userId:'admin-2',name:'Outro admin',role:'admin',isPrimary:false,authVersion:1 }
const presenter:Session={ userId:'presenter',name:'Apresentador',role:'apresentador',isPrimary:false,authVersion:1 }

describe('permissões de colaboradores',()=>{
  it('somente o principal cria outros administradores',()=>{
    expect(canAssignRole(primary,'admin')).toBe(true)
    expect(canAssignRole(admin,'admin')).toBe(false)
    expect(canAssignRole(admin,'auxiliar')).toBe(true)
  })
  it('a conta principal não pode ser bloqueada e o admin secundário é controlado pelo principal',()=>{
    expect(canManageTarget(primary,{ id:'principal',role:'admin',is_primary:1 })).toBe(false)
    expect(canManageTarget(primary,{ id:'admin-2',role:'admin',is_primary:0 })).toBe(true)
    expect(canManageTarget(admin,{ id:'principal',role:'admin',is_primary:1 })).toBe(false)
  })
  it('apresentador controla perguntas sem gerenciar contas',()=>{
    expect(canPresent(presenter)).toBe(true)
    expect(canAssignRole(presenter,'auxiliar')).toBe(false)
  })
})
