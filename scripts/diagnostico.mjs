import { execFileSync } from 'node:child_process'

const checks = [
  ['Node.js', 'node', ['--version']],
  ['npm', 'npm', ['--version']],
  ['Git', 'git', ['--version']],
]

console.log('\nDIAGNÓSTICO DO NOVO BIBLE BAWL\n')
for (const [nome, comando, args] of checks) {
  try {
    const saida = execFileSync(comando, args, { encoding: 'utf8' }).trim()
    console.log(`✓ ${nome}: ${saida}`)
  } catch {
    console.log(`! ${nome}: não encontrado`)
  }
}

if (Number(process.versions.node.split('.')[0]) !== 24) {
  console.log('\n! Este projeto foi preparado para Node 24 LTS.')
} else {
  console.log('\n✓ Ambiente pronto para instalar e iniciar o projeto.')
}
