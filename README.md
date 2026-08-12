# Condonoti

Dashboard web para apoiar a administracao de condominios. O sistema centraliza o acompanhamento de unidades, moradores e notificacoes, oferecendo uma visao operacional das ocorrencias e dos comunicados registrados.

O projeto esta em desenvolvimento e foi estruturado para funcionar tanto conectado ao Supabase quanto em modo demonstracao. Quando as credenciais do Supabase nao estao configuradas, a aplicacao utiliza dados de exemplo para permitir a navegacao local.

## Funcionalidades

- Dashboard inicial com resumo da operacao e notificacoes recentes.
- Listagem e busca de unidades por bloco, apartamento e moradores.
- Visualizacao detalhada de uma unidade.
- Edicao dos dados da unidade, incluindo proprietario, status de locacao e inquilino.
- Listagem de notificacoes com busca e filtros por tipo e unidade.
- Visualizacao dos detalhes de uma notificacao.
- Cadastro de novas notificacoes com motivo, categoria, data retroativa e valor de multa.
- Listagem e cadastro de tipos de notificacao com titulo e texto padrao.
- Navegacao responsiva por menu lateral e rotas baseadas no caminho da URL.
- Estado de demonstracao automatico enquanto o ambiente do Supabase nao esta configurado.

## Tecnologias

### Aplicacao

- [React](https://react.dev/) 19 para a interface.
- [TypeScript](https://www.typescriptlang.org/) para tipagem estatica.
- [Vite](https://vite.dev/) para desenvolvimento local e build.
- [Tailwind CSS](https://tailwindcss.com/) 4 para estilos e layout.
- [Lucide React](https://lucide.dev/) para icones.

### Dados e formularios

- [Supabase](https://supabase.com/) como camada de persistencia e acesso ao banco PostgreSQL.
- [React Hook Form](https://react-hook-form.com/) para gerenciamento de formularios.
- [Zod](https://zod.dev/) e `@hookform/resolvers` para validacao dos dados de entrada.

### Qualidade e ferramentas

- ESLint com regras para TypeScript, React Hooks e React Refresh.
- TypeScript no modo de build incremental configurado pelo projeto.

## Pre-requisitos

- Node.js compativel com as versoes atuais do Vite e do TypeScript.
- npm, incluido na instalacao do Node.js.
- Uma instancia do Supabase apenas para persistencia real. Ela nao e obrigatoria para executar a interface em modo demonstracao.

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

Para executar sem configurar o Supabase, basta seguir os passos acima. A aplicacao exibira um aviso informando que esta usando dados de demonstracao.

## Configuracao do Supabase

Para conectar a aplicacao a um projeto Supabase, crie um arquivo `.env` na raiz do repositorio com as variaveis abaixo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

As variaveis com prefixo `VITE_` sao disponibilizadas pelo Vite durante o build do frontend. Nunca adicione chaves privadas ou `service_role` ao frontend.

O codigo espera as seguintes tabelas no banco:

| Tabela              | Uso                                                              |
| ------------------- | ---------------------------------------------------------------- |
| `unidades`          | Consulta e atualizacao das unidades, proprietarios e inquilinos. |
| `notificacao`       | Consulta, filtros, detalhes e cadastro de notificacoes.          |
| `tipos_notificacao` | Consulta e cadastro dos tipos de notificacao.                    |

Os campos utilizados pela aplicacao incluem, entre outros, `created_at`, `bloco`, `apartamento`, `alugado`, `proprietario`, `inquilino`, `id_tipo_notificacao`, `id_unidade`, `motivo`, `categoria`, `data_retroativa`, `valor_multa`, `titulo` e `texto_padrao`. Os dados de proprietario e inquilino sao tratados como objetos JSON com nome, telefone e email.

Depois de criar o arquivo `.env`, reinicie o servidor de desenvolvimento para que o Vite carregue as variaveis.

## Scripts disponiveis

| Comando           | Descricao                                                      |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Inicia o servidor de desenvolvimento com HMR.                  |
| `npm run build`   | Executa o type-check do TypeScript e gera o build de producao. |
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
├── components/   Componentes reutilizaveis e formularios
├── layouts/      Estrutura compartilhada da aplicacao
├── pages/        Paginas e fluxos principais
├── services/     Integracao com Supabase e dados de demonstracao
├── types/        Tipos e normalizacao dos dados de dominio
├── utils/        Funcoes utilitarias de formatacao e busca
├── App.tsx       Roteamento e composicao das paginas
└── main.tsx      Ponto de entrada da aplicacao
```

## Estado atual

O README documenta o desenvolvimento e a execucao local do projeto. As instrucoes de deploy serao adicionadas quando o ambiente de publicacao estiver definido e configurado.
