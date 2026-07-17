# Migração segura da máquina Linux

## Descoberta importante

O GitHub original contém:

- toda a estrutura das tabelas;
- categorias Infantil, Juvenil e Adulto;
- perfis e estados iniciais;
- 150 perguntas;
- usuários e dados de demonstração.

Ele **não contém uma cópia do banco real** com as equipes, participantes e respostas cadastradas durante o uso. Esses dados ficam no MySQL da máquina Linux ou no volume local usado pelo sistema antigo.

Essa conferência incluiu a versão principal, as ramificações `develop`, `release/0.9.0`, `feature/tdd` e `altercao-fluxo`, além das versões publicadas. O arquivo `.mwb` encontrado é a modelagem visual do banco, não os registros reais.

## Regra principal

Não formate, atualize ou remova nada da máquina Linux antes de concluir estes quatro testes:

1. criar uma cópia do banco antigo;
2. importar a cópia no projeto novo;
3. conferir equipes, participantes e resultados;
4. restaurar o backup em outro ambiente de teste.

## Como o importador funciona

O importador novo se conecta ao MySQL apenas para consultar os dados. Ele não executa exclusões nem atualizações no banco antigo.

Antes de importar, ele também cria automaticamente um backup do banco novo.

As informações de conexão devem ser colocadas em um arquivo `.env` dentro de `apps/api`:

```text
LEGACY_DB_HOST=endereco-da-maquina-linux
LEGACY_DB_PORT=3306
LEGACY_DB_USER=usuario-somente-leitura
LEGACY_DB_PASSWORD=senha
LEGACY_DB_NAME=biblebawl
```

Depois execute:

```bash
npm run importar-legado -w @bible-bawl/api
```

Isso significa: “leia o banco antigo e copie suas informações para o banco novo”.

## Antes da migração definitiva

- criar um usuário MySQL que tenha somente permissão de leitura;
- testar em uma cópia, nunca diretamente como usuário administrador;
- contar as equipes, participantes, perguntas e respostas nos dois sistemas;
- guardar o arquivo exportado em dois lugares diferentes;
- só aposentar o Linux depois de algumas semanas de funcionamento confirmado.
