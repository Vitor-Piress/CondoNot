# Condonot

Dashboard web para apoiar a administração de condomínios. O sistema centraliza o acompanhamento de unidades, moradores e notificações, oferecendo uma visão operacional das ocorrências e dos comunicados registrados.

O projeto está em desenvolvimento e foi estruturado para funcionar tanto conectado ao Supabase quanto em modo de demonstração. Quando as credenciais do Supabase não estão configuradas, a aplicação utiliza dados de exemplo para permitir a navegação local.

## Funcionalidades

- Dashboard inicial com resumo da operação e notificações recentes.
- Listagem e busca de unidades por bloco, apartamento e moradores.
- Visualização detalhada de uma unidade.
- Edição dos dados da unidade, incluindo proprietário, status de locação e inquilino.
- Listagem de notificações com busca e filtros por modelo e unidade.
- Visualização dos detalhes de uma notificação, com impressão e baixa.
- Envio da notificação por e-mail (Resend) com PDF anexo, gerado no navegador e sem ser armazenado.
- Acompanhamento do e-mail: envio, entrega, falha e abertura, via webhook do Resend.
- Confirmação de ciência pelo destinatário, em página pública acessada por link único no e-mail.
- Login com Supabase Auth e acesso isolado por condomínio (RLS).
- Gestão de condomínios, com logo e regimento interno em PDF.
- Cadastro de novas notificações com motivo, categoria, data retroativa e valor de multa.
- Inclusão de até cinco fotos JPEG, PNG ou WebP em cada notificação.
- Listagem e cadastro de modelos de notificação com título e texto padrão.
- Navegacao responsiva por menu lateral e rotas baseadas no caminho da URL.
- Estado de demonstração automático enquanto o ambiente do Supabase não está configurado.

## Tecnologias

### Aplicação

- [React](https://react.dev/) 19 para a interface.
- [TypeScript](https://www.typescriptlang.org/) para tipagem estática.
- [Vite](https://vite.dev/) para desenvolvimento local e build.
- [Tailwind CSS](https://tailwindcss.com/) 4 para estilos e layout.
- [Lucide React](https://lucide.dev/) para icones.
- [@react-pdf/renderer](https://react-pdf.org/) para gerar o PDF da notificação (carregado sob demanda).

### Dados e formulários

- [Supabase](https://supabase.com/) para banco PostgreSQL, autenticação, Storage e Edge Functions.
- [Resend](https://resend.com/) para o envio de e-mails.
- [React Hook Form](https://react-hook-form.com/) para gerenciamento de formulários.
- [Zod](https://zod.dev/) e `@hookform/resolvers` para validacao dos dados de entrada.

### Qualidade e ferramentas

- ESLint com regras para TypeScript, React Hooks e React Refresh.
- TypeScript no modo de build incremental configurado pelo projeto.

## Pré-requisitos

- Node.js compativel com as versoes atuais do Vite e do TypeScript.
- npm, incluido na instalacao do Node.js.
- Uma instância do Supabase apenas para persistência real. Ela não é obrigatória para executar a interface em modo de demonstração.

## Como rodar localmente

1. Clone o repositorio e entre na pasta do projeto:

   ```bash
   git clone <url-do-repositorio>
   cd condonot
   ```

2. Instale as dependencias:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra no navegador a URL exibida pelo Vite, normalmente `http://localhost:5173`.

Para executar sem configurar o Supabase, basta seguir os passos acima. A aplicação exibirá um aviso informando que está usando dados de demonstração.

## Configuração do Supabase

Para conectar a aplicação a um projeto Supabase, crie um arquivo `.env` na raiz do repositório com as variáveis abaixo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

As variaveis com prefixo `VITE_` sao disponibilizadas pelo Vite durante o build do frontend. Nunca adicione chaves privadas ou `service_role` ao frontend.

O codigo espera as seguintes tabelas no banco:

| Tabela               | Uso                                                              |
| -------------------- | ---------------------------------------------------------------- |
| `unidades`           | Consulta e atualização das unidades, proprietários e inquilinos. |
| `notificacao`        | Consulta, filtros, detalhes e cadastro de notificações.          |
| `modelo_notificacao` | Consulta e cadastro dos modelos de notificação.                  |
| `notificacao_anexo`  | Metadados dos anexos de cada notificação.                        |
| `condominio`         | Dados do condomínio e valor vigente da multa.                    |

O campo `condominio.valor_multa` guarda o valor vigente definido por cada
condomínio. O sistema copia esse valor para `notificacao.valor_multa` ao emitir
uma multa, preservando o valor usado mesmo se a configuração mudar depois.
Em bases já existentes, aplique a migração
`supabase/migrations/20261002203000_condominium_fine_amount.sql`.

### Fotos anexas às notificações

Antes de usar anexos, aplique a migração
`supabase/migrations/20261002160000_notification_attachments.sql` no projeto
Supabase. Ela cria a tabela `notificacao_anexo` quando necessário e configura o
bucket privado `notificacoes-anexos` e as políticas para upload e leitura por
URL assinada. A migração pressupõe que as tabelas base `condominio` e
`notificacao` já existam. Se estiver preparando um banco vazio com `schema.sql`,
execute primeiro o schema base e depois a migração; não reaplique o dump inteiro
em um banco já configurado.

O formulário aceita até cinco imagens JPEG, PNG ou WebP, de no máximo 5 MB cada.
Os arquivos ficam no Storage e a tabela guarda somente caminho e metadados. Na
impressão, a galeria começa sempre em uma nova página após a carta da notificação.

Os campos utilizados pela aplicação incluem, entre outros, `created_at`, `bloco`, `apartamento`, `alugado`, `proprietario`, `inquilino`, `id_tipo_notificacao`, `id_unidade`, `motivo`, `categoria`, `data_retroativa`, `valor_multa`, `titulo` e `texto_regimento`. Os dados de proprietário e inquilino são tratados como objetos JSON com nome, telefone e e-mail. O campo `texto_regimento` é um `jsonb` com até 2 escopos (`escopo_01`, `escopo_02`), cada um com `titulo` e até 5 parágrafos (`paragrafo_01`..`paragrafo_05`), cada parágrafo com `artigo` e `texto`.

Depois de criar o arquivo `.env`, reinicie o servidor de desenvolvimento para que o Vite carregue as variáveis.

## Autenticação e segurança (RLS)

O acesso exige login com e-mail e senha do Supabase Auth. Não há cadastro pelo
app: os usuários são criados pelo painel do Supabase, com o cadastro público
desativado. Cada usuário só acessa os condomínios aos quais está vinculado na
tabela `condominio_membro`, e quem cria um condomínio é vinculado a ele
automaticamente. Para dar acesso a outra pessoa, insira uma linha em
`condominio_membro` pelo painel.

As migrations devem ser aplicadas nesta ordem:

| Migration                                  | Descrição                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `20261002160000_notification_attachments`  | Tabela de anexos e bucket `notificacoes-anexos`.                          |
| `20261002203000_condominium_fine_amount`   | Valor vigente da multa por condomínio.                                    |
| `20261013210000_notification_email_tracking` | Colunas de envio, entrega, abertura e ciência na `notificacao`.         |
| `20261013220000_membership_structure`      | `condominio_membro`, `is_membro()` e vínculo automático do criador.       |
| `20261013230000_rls_policies`              | Ativa o RLS por membro e remove o acesso `anon` (inclui o Storage).       |

Atenção: a última migration bloqueia o app até que exista um usuário, os
condomínios existentes estejam vinculados a ele e o front com login esteja
publicado. Não a aplique automaticamente por CI.

Os arquivos do Storage devem seguir o caminho `condominios/<id_condominio>/...`,
pois as policies usam o id do condomínio no caminho.

## E-mails, rastreio e ciência

O botão de sino na página da notificação envia um e-mail ao inquilino da
unidade ou, se não houver, ao proprietário (`contato_email`). O e-mail leva o PDF
da notificação (com as fotos reduzidas), gerado no navegador no momento do
clique. Há um intervalo mínimo entre reenvios, definido por
`EMAIL_RESEND_COOLDOWN_MS` em `src/services/notificationService.ts`.

| Edge Function     | Acesso                          | Função                                                              |
| ----------------- | ------------------------------- | ------------------------------------------------------------------- |
| `send-email`      | Exige login (JWT)               | Valida que o usuário é membro e que o destinatário é da unidade, e envia pelo Resend. |
| `resend-webhook`  | Pública, valida assinatura Svix | Grava entrega, abertura e falha do e-mail na notificação.            |
| `confirm-ciencia` | Pública, protegida por token    | Consulta e registra a ciência a partir de `/ciencia/<token>`.        |

A ciência só é registrada quando o destinatário clica no botão da página, para
que leitores automáticos de e-mail não confirmem sozinhos.

Configuração necessária:

```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_FROM="CondoNot <notificacoes@condonot.com.br>"   # opcional
supabase functions deploy send-email
supabase functions deploy confirm-ciencia
supabase functions deploy resend-webhook
```

No Resend, valide o domínio `condonot.com.br` (SPF e DKIM) e cadastre o webhook
apontando para `https://<projeto>.supabase.co/functions/v1/resend-webhook` com os
eventos `email.delivered`, `email.bounced`, `email.complained` e `email.opened`.
Para o evento de abertura, ative o open tracking no domínio. A abertura é apenas
um indício: leitores de e-mail podem pré-carregar ou bloquear imagens.

## Scripts disponíveis

| Comando           | Descricao                                                      |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Inicia o servidor de desenvolvimento com HMR.                  |
| `npm run build`   | Executa o type-check do TypeScript e gera o build de produção. |
| `npm run lint`    | Analisa o codigo com ESLint.                                   |
| `npm run preview` | Serve localmente o build gerado pelo Vite.                     |

Uma verificacao comum antes de abrir um pull request e:

```bash
npm run lint
npm run build
```

## Estrutura do projeto

```text
src/
├── components/   Componentes reutilizáveis, formulários e PDF (pdf/)
├── contexts/     Condomínio ativo e autenticação
├── layouts/      Estrutura compartilhada da aplicação
├── pages/        Paginas e fluxos principais
├── services/     Integração com Supabase e dados de demonstração
├── types/        Tipos e normalizacao dos dados de dominio
├── utils/        Funcoes utilitarias de formatacao e busca
├── App.tsx       Roteamento, login e composicao das paginas
└── main.tsx      Ponto de entrada da aplicação

supabase/
├── functions/    Edge Functions (send-email, resend-webhook, confirm-ciencia)
└── migrations/   Migrations SQL versionadas
```

## Estado atual

- Fluxo de notificações, e-mail com PDF, rastreio e ciência implementado.
- Autenticação e RLS por condomínio preparados em migrations. Confirme que a
  última migration foi aplicada no seu projeto antes de usar em produção.
- Ainda em aberto: corpo final do e-mail (prazo e canal de contato da
  administração), compressão das fotos conforme o uso real e instruções de
  deploy, que serão adicionadas quando o ambiente de publicação estiver definido.
