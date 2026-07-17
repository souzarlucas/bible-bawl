# Bible Bawl — Copa Bíblica

Aplicativo livre e de código aberto para organizar equipes, participantes, perguntas, respostas e resultados de uma Copa Bíblica.

## Acessar a aplicação online

**[Abrir o Bible Bawl online](https://bible-bawl-app.icnovacidade.workers.dev)**

O endereço acima abre a versão oficial hospedada na Cloudflare. Use sua conta individual para entrar; os instaladores para computador e Android utilizam a mesma sincronização.

## Onde funciona

- macOS: aplicativo `.app` e imagem `.dmg`;
- Windows: instalador `.exe` ou `.msi`;
- Linux: `.AppImage`, `.deb` ou `.rpm`, conforme o build;
- Android: arquivo `.apk` instalado manualmente (sideload);
- iPhone/iPad: **não faz parte deste projeto**;
- lojas oficiais: **não são usadas**.

Quem usa os instaladores não precisa de VS Code, Node, Java nem Terminal.

## Online, offline e sincronização

Cada aparelho mantém uma cópia local dos dados. Depois da primeira entrada online, o aplicativo continua abrindo e registrando alterações sem internet. Quando a conexão retorna, a fila local envia as mudanças ao servidor e baixa a versão atualizada.

Para compartilhar os dados entre aparelhos, é necessário um endereço de sincronização. O servidor deste repositório é aberto e pode ser hospedado onde você quiser. A configuração atual usa o plano gratuito da Cloudflare; a plataforma Cloudflare não é open source, mas o código do Bible Bawl continua sendo.

## O que já funciona

- contas individuais com administrador principal protegido;
- perfis de administrador, apresentador e auxiliar;
- bloqueio de contas, redefinição de senha e histórico de atividades;
- auxiliares, equipes e participantes;
- 150 perguntas iniciais;
- liberação e bloqueio de pergunta;
- registro de acerto ou erro;
- classificação individual e por equipe;
- dados offline e fila de sincronização;
- servidor local com SQLite para desenvolvimento;
- servidor de sincronização com banco D1;
- aplicativos desktop com Tauri;
- aplicativo Android com Capacitor;
- geração automática de instaladores no GitHub;
- importação somente-leitura do sistema Linux antigo.

## Comandos em português

| Comando | Significado |
|---|---|
| `npm run iniciar` | “Abra a versão de desenvolvimento.” |
| `npm run desktop` | “Abra o aplicativo de computador para eu testar.” |
| `npm run instalador:desktop` | “Crie o instalador deste computador.” |
| `npm run preparar:android` | “Atualize o projeto Android com as telas mais recentes.” |
| `npm run apk:android` | “Crie um APK neste computador, se o Android SDK estiver instalado.” |
| `npm test` | “Confira automaticamente as regras importantes.” |
| `npm run build` | “Confira e prepare todas as partes para publicação.” |
| `npm run diagnostico` | “Mostre se meu ambiente de programação está pronto.” |

## Para desenvolver

É necessário Node.js 24. Na primeira vez:

```bash
npm install
npm run iniciar
```

Conta local inicial de desenvolvimento:

- e-mail: `admin@local`
- senha: `troque123`

Essa senha é somente para testes e deverá ser substituída antes do uso real.

## Contas e permissões

Na aplicação publicada, cada colaborador deve usar uma conta individual criada em **Acessos**. A senha do administrador principal não deve ser compartilhada.

- **Administrador principal:** cria outros administradores e não pode ser bloqueado pela interface.
- **Administrador:** configura auxiliares, equipes e participantes e gerencia contas que não sejam administrativas.
- **Apresentador:** controla a pergunta liberada e acompanha resultados.
- **Auxiliar:** registra respostas e acompanha resultados.

Ao bloquear uma conta ou redefinir sua senha, as sessões anteriores deixam de funcionar. Alterações relevantes ficam registradas no histórico administrativo.

## Estrutura

```text
apps/api       servidor SQLite para desenvolvimento e migração
apps/cloud     sincronização online e banco D1
apps/web       telas, armazenamento offline, Tauri e Android
.github        criação gratuita dos instaladores
```

Leia [DISTRIBUICAO-LIVRE.md](./DISTRIBUICAO-LIVRE.md) antes de entregar instaladores a outras pessoas e [MIGRACAO-DO-LINUX.md](./MIGRACAO-DO-LINUX.md) antes de importar o banco antigo.

As regras que impedem alterações diretas no código oficial estão documentadas em [PROTECAO-GITHUB.md](./PROTECAO-GITHUB.md).

O passo a passo da hospedagem, GitHub e assinatura Android está em [GUIA-PUBLICACAO.md](./GUIA-PUBLICACAO.md).

## Licença

Código disponibilizado sob a [licença MIT](./LICENSE): pode usar, estudar, modificar e redistribuir gratuitamente, preservando o aviso de licença.
