# Guia de publicação — explicado em português

Este guia registra o que será feito para publicar o Bible Bawl sem lojas e sem mensalidade obrigatória.

## 1. Cloudflare: sincronização gratuita

### O que significa

A Cloudflare manterá uma cópia central do banco. Cada computador ou Android continua salvando localmente quando estiver offline e envia as mudanças quando a internet voltar.

### Etapas

1. Entrar em `https://dash.cloudflare.com/`.
2. Autorizar o Wrangler, ferramenta oficial usada para publicar o servidor.
3. Guardar duas informações secretas na Cloudflare:
   - `JWT_SECRET`: protege as sessões de login;
   - `INITIAL_ADMIN_PASSWORD`: senha da primeira conta administrativa.
4. Publicar o Worker e criar o banco D1 gratuito.
5. Testar o endereço `/api/health` e o login.
6. Guardar o endereço final na variável `VITE_API_BASE_URL` do GitHub.

Essas ações serão executadas pelo Codex depois que o proprietário concluir o login no navegador. Nenhuma senha da Cloudflare será informada ao Codex.

## 2. GitHub: código e instaladores

### O que significa

O repositório público guarda o código open source. A área Releases guardará o `.dmg`, os instaladores Windows/Linux e o APK Android.

### Etapas

1. Instalar a ferramenta oficial GitHub CLI com `brew install gh`.
2. Entrar com `gh auth login` e confirmar pelo navegador.
3. Criar o repositório público `souzarlucas/bible-bawl`.
4. Enviar o projeto sem arquivos de senha, bancos locais ou chaves privadas.
5. Configurar a proteção da branch `main` e das tags `v*`.
6. Configurar os segredos Android e a URL da Cloudflare.
7. Criar a primeira versão `v0.1.0` e aguardar os instaladores.

Em linguagem simples:

- `brew install gh` = “instale a ferramenta oficial do GitHub”;
- `gh auth login` = “conecte este Mac à minha conta GitHub”;
- `git push` = “envie uma cópia do código para o GitHub”.

## 3. Chave Android permanente

A chave foi criada com:

- proprietário: `souzarlucas`;
- nome interno: `bible-bawl`;
- algoritmo: RSA 4096;
- validade aproximada: 27 anos;
- impressão SHA-256: `F6:EA:93:A9:3F:E3:C2:40:EB:98:6C:DD:00:96:38:E3:32:53:E7:AA:67:1B:3D:12:95:C2:D6:B0:BB:7A:68:D6`.

Arquivos privados, fora do repositório:

- `~/Documents/Bible-Bawl-Segredos/bible-bawl-android-release.jks`;
- `~/Documents/Bible-Bawl-Segredos/senha-android-release.txt`;
- cópia de segurança em `Meu Drive/dev/Bible-Bawl-Segredos`.

Nunca envie essa pasta para outra pessoa. A chave permite publicar atualizações reconhecidas como sendo do mesmo aplicativo.

Na mesma pasta privada ficam `senha-admin-inicial.txt` e `jwt-secret.txt`, usadas apenas na publicação segura da sincronização.

## 4. O que o usuário final fará

- macOS: baixar o `.dmg`, abrir e arrastar Bible Bawl para Aplicativos;
- Windows: baixar e executar o instalador;
- Linux: baixar o AppImage ou pacote `.deb`;
- Android: baixar o APK e permitir a instalação pelo navegador/gerenciador de arquivos;
- nenhum usuário precisará de VS Code, Node, Java ou Terminal.
