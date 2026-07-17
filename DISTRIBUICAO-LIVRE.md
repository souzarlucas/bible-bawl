# Distribuição gratuita e fora das lojas

## Resultado esperado

Os arquivos ficam na área **Releases** do repositório GitHub. O usuário baixa o instalador adequado, instala e abre como qualquer aplicativo comum. Não é necessário publicar na App Store, Microsoft Store ou Google Play.

## Antes da primeira versão pública

1. Publicar o servidor de sincronização e obter o endereço HTTPS.
2. No repositório GitHub, criar a variável `VITE_API_BASE_URL` com esse endereço.
3. Trocar a senha inicial e criar uma chave secreta exclusiva para as sessões.
4. Criar e guardar a chave permanente do Android.
5. Configurar os quatro segredos Android descritos abaixo.
6. Criar uma tag como `v0.1.0`; o GitHub produzirá os instaladores.

## Assinatura Android gratuita

A chave de assinatura é gratuita e não depende da Google Play. Ela deve ser sempre a mesma para que uma versão nova possa atualizar a anterior.

Segredos usados pelo GitHub:

- `ANDROID_KEYSTORE_BASE64`: conteúdo da chave convertido para texto Base64;
- `ANDROID_KEYSTORE_PASSWORD`: senha do arquivo da chave;
- `ANDROID_KEY_ALIAS`: nome interno da chave;
- `ANDROID_KEY_PASSWORD`: senha da chave interna.

O arquivo `.jks` e suas senhas nunca devem ser enviados ao repositório. Se a chave for perdida, os usuários precisarão desinstalar a versão antiga antes de instalar uma nova.

## Avisos dos sistemas

É possível distribuir sem pagar certificados, mas há uma consequência:

- macOS pode bloquear o primeiro início pelo Gatekeeper; o usuário deverá confirmar em **Ajustes do Sistema > Privacidade e Segurança**;
- Windows pode mostrar o SmartScreen; o usuário deverá escolher **Mais informações > Executar assim mesmo**;
- Android exige permitir **Instalar apps desconhecidos** para o navegador ou gerenciador de arquivos usado;
- Linux normalmente não cobra nem exige certificado, mas pode pedir permissão para executar o AppImage.

Esses avisos não significam que o aplicativo tenha vírus. Eles aparecem porque Apple e Microsoft cobram por identidades de assinatura/reputação. O código aberto permite que qualquer pessoa audite e gere seu próprio instalador.

## O que é realmente open source

- Aplicativo, servidor, automação dos builds, banco local e formatos de dados: open source sob MIT.
- Tauri, Capacitor, Vue, Hono e demais bibliotecas utilizadas: open source.
- GitHub e Cloudflare: serviços externos; não são parte do código e suas plataformas hospedadas não são open source.

O servidor em `apps/cloud` pode ser substituído no futuro. A sincronização nunca deverá depender novamente de uma máquina Linux específica sem backup.
