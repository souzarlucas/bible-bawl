# Proteção do projeto no GitHub

Este arquivo registra as proteções que deverão ser ativadas no repositório público do Bible Bawl. O proprietário confirmado é `@souzarlucas` e já consta no arquivo `.github/CODEOWNERS`.

## Regra da branch `main`

Configuração recomendada:

- exigir Pull Request antes de qualquer alteração;
- exigir 1 aprovação — do proprietário ou de um colaborador-chave definido como Code Owner;
- exigir aprovação dos Code Owners;
- cancelar aprovações antigas quando novos commits forem enviados;
- exigir aprovação do commit mais recente por outra pessoa;
- exigir que todas as conversas sejam resolvidas;
- exigir o teste `Validar projeto / Testes e compilação`;
- exigir que a branch esteja atualizada antes da fusão;
- permitir somente squash merge;
- bloquear force-push;
- bloquear exclusão da branch;
- impedir bypass de colaboradores; manter bypass administrativo somente para o proprietário enquanto ele trabalhar sozinho.

Com essas opções, nem um colaborador com permissão de escrita altera diretamente a versão oficial. Ele cria uma branch e um Pull Request; a mudança só entra depois da revisão autorizada e dos testes.

## Code Owners

O arquivo `.github/CODEOWNERS` segue este formato:

```text
* @souzarlucas
/.github/ @souzarlucas
```

A segunda linha protege o próprio sistema de proteção: colaboradores não conseguem trocar os responsáveis sem a aprovação do proprietário.

Enquanto o proprietário for a única pessoa responsável, mantenha o bypass de administrador apenas para `@souzarlucas`. Sem esse bypass, o proprietário não conseguiria aprovar o próprio Pull Request. Quando colaboradores-chave forem adicionados, a política pode passar a exigir revisão cruzada.

Importante: quando vários nomes aparecem na mesma regra, o GitHub aceita a aprovação de qualquer um deles. Para exigir obrigatoriamente a aprovação do proprietário em toda mudança, mantenha somente o proprietário como Code Owner geral; colaboradores-chave podem revisar, mas não substituir sua aprovação.

## Regra para tags `v*`

As tags de versão, como `v0.1.0`, devem ter uma regra própria:

- restringir criação e atualização ao proprietário;
- bloquear atualização de uma tag existente;
- bloquear exclusão;
- não conceder bypass permanente a colaboradores.

Isso impede que outra pessoa substitua silenciosamente os instaladores de uma versão publicada.

## Permissões de colaboradores

- leitores: apenas consultam e baixam;
- triagem: organizam issues sem alterar código;
- escrita: criam branches e Pull Requests;
- manutenção/administração: reservar ao proprietário, salvo necessidade excepcional;
- segredos de assinatura e hospedagem: nunca entregar diretamente a colaboradores; o GitHub Actions os utiliza sem exibir o conteúdo.

## Limite do plano gratuito

Para usar proteção de branch e rulesets gratuitamente, o repositório deverá ser público. Isso combina com a decisão de tornar o aplicativo open source. Em repositório privado pessoal, essas proteções exigem um plano pago compatível.
