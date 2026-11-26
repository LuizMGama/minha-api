# Biblioteca de Jogos

**Disciplina:** Programação Web — Fatec

**Integrantes:**

- **Júlio César Ravacci Jara** — julio.jara@aluno.cps.sp.gov.br
- **Luiz Eduardo Gama** — luiz.gama@aluno.cps.sp.gov.br

Biblioteca pessoal desenvolvida para a disciplina de Programação Web a partir da API do professor. Permite criar uma conta, entrar, organizar jogos por plataforma e status (Quero jogar, Jogando e Concluído), atribuir uma nota opcional entre 0 e 10, editar e excluir jogos próprios.

## Tecnologias e organização

Node.js com ES Modules, Express 5, MongoDB 8, Mongoose 9, JWT, bcryptjs e Docker Compose. Interface em HTML, CSS e JavaScript puro, com `fetch()`, sem bibliotecas ou serviços externos. A API segue o fluxo route → service → model.

Em relação à API original, foram adicionados o recurso de jogos vinculado ao usuário autenticado, a interface em `/app/` e o seed de demonstração. Cadastro, login JWT, recuperação didática de senha, usuários, logs e a resposta original de `GET /` foram preservados. Os logs que imprimiam tokens completos foram removidos.

## Executar em outro computador

Pré-requisitos: Node.js 22.12 ou superior (compatível com as dependências e detecção de ES Modules), npm e Docker com o comando `docker compose` disponível e em execução. As portas 27018 (MongoDB) e 3001 (API) devem estar livres para esta configuração.

1. Copie o projeto sem `node_modules`, `.env`, `docker-compose.yml` nem dados do MongoDB. Inclua `data/demo-games.json`, `.env.example` e `compose.example.yml`.
2. Na raiz do projeto, instale as dependências:

   ```sh
   npm install
   ```

3. Copie `.env.example` para `.env` (PowerShell: `Copy-Item .env.example .env`). Em um projeto já configurado, preserve o `.env` existente e acrescente apenas as variáveis que faltarem.
4. Edite o `.env` local e substitua todos os placeholders. Use um segredo JWT longo e aleatório. Defina a senha demonstrativa e uma pergunta e resposta fictícias. A senha da demonstração será entregue ao professor separadamente, sem inclusão em arquivos versionados.
5. Inicie o MongoDB usando explicitamente o exemplo versionado:

   ```sh
   docker compose --env-file .env -f compose.example.yml up -d
   ```

6. Aguarde o MongoDB ficar disponível e prepare os dados:

   ```sh
   npm run seed:demo
   ```

7. Inicie a aplicação:

   ```sh
   npm run dev
   ```

8. Abra **http://localhost:3001/app/**. Entre com `teste@exemplo.com` e a senha definida em `DEMO_PASSWORD` no `.env`. Não inicie outra instância se já existir um servidor na porta 3001.

### Credenciais do MongoDB

O Compose lê `MONGO_INITDB_ROOT_USERNAME` e `MONGO_INITDB_ROOT_PASSWORD` do `.env`. A API e o seed usam `MONGODB_URI` e `MONGODB_NAME`, conforme a configuração existente.

Mantenha o usuário e a senha da URI iguais aos definidos para o Docker. O endereço do MongoDB para o Node.js executado no computador é `127.0.0.1:27018`; dentro do container, o MongoDB usa a porta 27017. Mantenha `authSource=admin`, pois o usuário de inicialização é criado no banco `admin`. Se a senha ou o usuário tiver caracteres especiais, use a codificação de URL correspondente na URI (por exemplo, `@` vira `%40`), mantendo o valor original nas variáveis do Docker.

As credenciais de inicialização do MongoDB são aplicadas somente na criação de um volume vazio. Alterar o `.env` posteriormente não muda a senha de um usuário já existente no volume: use as credenciais originalmente configuradas. Não apague volumes para ajustar a configuração. O volume `biblioteca-demo-mongo` persiste os dados entre reinicializações e a porta publicada fica restrita a localhost.

O arquivo local `docker-compose.yml` foi preservado. O comando acima utiliza `compose.example.yml`; não suba dois containers disputando a porta 27018. `.env` e `docker-compose.yml` continuam ignorados pelo Git. Nunca versione senhas, tokens ou o `.env` real.

## Como os dados demonstrativos são recriados

`scripts/seed-demo.js` carrega o `.env` por `env-cmd`, lê e valida os 20 jogos de `data/demo-games.json` e conecta ao banco indicado. Cria a conta fictícia `teste@exemplo.com` somente se ela não existir, reutilizando `createUser` para gerar os hashes da senha e da resposta de segurança.

Variáveis próprias da demonstração: `DEMO_PASSWORD`, `DEMO_SECURITY_QUESTION` e `DEMO_SECURITY_ANSWER`. Todas devem estar preenchidas. Se a conta já existir, a senha informada é comparada com o hash cadastrado antes de qualquer inserção. Se não corresponder, o script interrompe sem mudar a conta ou inserir jogos. Pergunta, resposta e senha de uma conta existente são preservadas.

Os jogos são associados ao `_id` dessa conta. Para cada título, o script verifica a combinação usuário + título e insere apenas os ausentes; jogos existentes não são atualizados. A comparação considera o título exato, após trim, e diferencia maiúsculas de minúsculas. Ao terminar, informa usuários criados, jogos inseridos e jogos já existentes, encerrando a conexão inclusive em caso de erro.

Em um banco novo, a execução bem-sucedida cria 1 usuário e 20 jogos. Em nova execução sequencial, cria 0 usuários e insere 0 jogos se os títulos forem mantidos. Não execute duas cópias do seed simultaneamente: não há índice único composto para usuário e título. Se uma execução falhar no meio, registros já inseridos ficam preservados e a execução seguinte pode completar os ausentes. O script não é executado ao iniciar o servidor e não faz exclusões.

Assim, outro computador recria o conjunto demonstrativo a partir do JSON e das configurações locais, sem receber cópia do banco, IDs originais, tokens, logs ou credenciais do autor. Os IDs e timestamps serão novos; os jogos são os definidos no JSON, sem copiar alterações posteriores feitas no banco original.

## Endpoints

Nas rotas protegidas, envie `Authorization: Bearer <token>`.

| Método | Rota | Autenticação | Função |
| --- | --- | --- | --- |
| GET | `/` | Não | Verificação de funcionamento |
| GET | `/app/` | Não | Interface web |
| POST | `/auth/register` | Não | Cadastro com nome, e-mail, senha, pergunta e resposta de segurança |
| POST | `/auth/login` | Não | Login com e-mail e senha; retorna token e usuário |
| POST | `/auth/forgot-password` | Não | Consulta a pergunta de segurança pelo e-mail |
| POST | `/auth/reset-password` | Não | Redefine a senha com e-mail, resposta e nova senha |
| GET | `/auth/me` | Sim | Usuário autenticado |
| GET | `/users` | Sim | Lista usuários, conforme API original |
| PUT, DELETE | `/users/:id` | Sim | Altera ou exclui a própria conta |
| GET | `/logs` | Sim | Últimas 100 ações do usuário |
| POST | `/games` | Sim | Cria jogo; retorna 201 |
| GET | `/games` | Sim | Lista os jogos da própria conta |
| PUT, DELETE | `/games/:id` | Sim | Atualiza ou exclui jogo próprio |

Os campos do jogo são `title`, `platform`, `status` e `rating` opcional. O proprietário vem da autenticação. Jogos alheios ou inexistentes retornam 404 na edição/exclusão.

## Limitações e verificação

Este é um projeto acadêmico para execução local. O uso de JWT em `sessionStorage` e a recuperação de senha por pergunta de segurança são simplificações didáticas, sem proteção completa para produção. Não há suíte automatizada completa: `npm test` ainda é o placeholder original. As funcionalidades da API e da interface foram verificadas manualmente durante o desenvolvimento.

Durante a validação, o script de demonstração foi executado em um banco MongoDB separado (`biblioteca_seed_teste`). Na primeira execução, foram criados 1 usuário e 20 jogos. Na segunda, o script identificou os 20 registros existentes, sem criar usuários ou duplicar jogos.

A aplicação também foi iniciada na porta 3002, utilizando o banco recriado. O login da conta de demonstração foi realizado com sucesso, e os 20 jogos foram exibidos corretamente na interface web.

O arquivo `compose.example.yml` foi validado com `docker compose config --quiet`, sem erros. A inicialização desse Compose em um ambiente totalmente novo ainda não foi testada. Para reproduzir a aplicação em outro computador, devem ser sxxeguidas as instruções de configuração e execução apresentadas neste README.
