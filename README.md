# Condonot

Dashboard web para apoiar a administração de condomínios. O sistema centraliza o acompanhamento de unidades, moradores e notificações, oferecendo uma visão operacional das ocorrências e dos comunicados registrados.

O projeto está em desenvolvimento e foi estruturado para funcionar tanto conectado ao Supabase quanto em modo de demonstração. Quando as credenciais do Supabase não estão configuradas, a aplicação utiliza dados de exemplo para permitir a navegação local.

## Funcionalidades

- Dashboard inicial com resumo da operação e notificações recentes.
- Listagem e busca de unidades por bloco, apartamento e moradores.
- Visualização detalhada de uma unidade.
- Edição dos dados da unidade, incluindo proprietário, status de locação e inquilino.
- Listagem de notificações com busca e filtros por modelo e unidade.
- Visualização dos detalhes de uma notificação.
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

### Dados e formulários

- [Supabase](https://supabase.com/) como camada de persistencia e acesso ao banco PostgreSQL.
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

O projeto ainda não autentica usuários e já usa políticas abertas para os dados
da aplicação. As políticas da migração mantêm esse mesmo modelo para os anexos;
portanto, o bucket não é público, mas a autorização não é individual por usuário
ou condomínio. URLs assinadas não substituem autenticação e políticas de acesso
por usuário.

Os campos utilizados pela aplicação incluem, entre outros, `created_at`, `bloco`, `apartamento`, `alugado`, `proprietario`, `inquilino`, `id_tipo_notificacao`, `id_unidade`, `motivo`, `categoria`, `data_retroativa`, `valor_multa`, `titulo` e `texto_regimento`. Os dados de proprietário e inquilino são tratados como objetos JSON com nome, telefone e e-mail. O campo `texto_regimento` é um `jsonb` com até 2 escopos (`escopo_01`, `escopo_02`), cada um com `titulo` e até 5 parágrafos (`paragrafo_01`..`paragrafo_05`), cada parágrafo com `artigo` e `texto`.

Depois de criar o arquivo `.env`, reinicie o servidor de desenvolvimento para que o Vite carregue as variáveis.

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
├── components/   Componentes reutilizáveis e formulários
├── layouts/      Estrutura compartilhada da aplicação
├── pages/        Paginas e fluxos principais
├── services/     Integração com Supabase e dados de demonstração
├── types/        Tipos e normalizacao dos dados de dominio
├── utils/        Funcoes utilitarias de formatacao e busca
├── App.tsx       Roteamento e composicao das paginas
└── main.tsx      Ponto de entrada da aplicação
```

## Estado atual

O README documenta o desenvolvimento e a execução local do projeto. As instruções de deploy serão adicionadas quando o ambiente de publicação estiver definido e configurado.
