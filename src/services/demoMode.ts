import type {
  Condominio,
  Notification,
  NotificationAttachment,
  NotificationType,
  Unit,
  UserAccess,
} from "../types/domain";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const { pathname } = window.location;
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function toDemoPath(to: string): string {
  if (to.startsWith("/demo")) {
    return to;
  }
  if (to === "/") {
    return "/demo";
  }
  return `/demo${to.startsWith("/") ? "" : "/"}${to}`;
}

export function stripDemoPrefix(pathname: string): string {
  if (pathname === "/demo" || pathname === "/demo/") {
    return "/";
  }
  if (pathname.startsWith("/demo/")) {
    const stripped = pathname.slice("/demo".length);
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }
  return pathname;
}

const initialDemoCondominios: Condominio[] = [
  {
    id: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Residencial Jardim das Acácias",
    location: "Av. das Palmeiras, 450 - Jardim Botânico, São Paulo - SP",
    logo_url: null,
    valor_multa: 250,
    regimento_pdf_path: null,
    regimento_pdf_filename: null,
    regimento_pdf_uploaded_at: null,
    regimento_pdf_size_bytes: null,
  },
  {
    id: "2",
    createdAt: "2026-08-01T09:00:00.000Z",
    name: "Condomínio Solar dos Ipês",
    location: "R. Heitor Penteado, 1200 - Sumaré, São Paulo - SP",
    logo_url: null,
    valor_multa: 180,
    regimento_pdf_path: null,
    regimento_pdf_filename: null,
    regimento_pdf_uploaded_at: null,
    regimento_pdf_size_bytes: null,
  },
];

const initialDemoNotificationTypes: NotificationType[] = [
  {
    id: "1",
    idCondominio: "1",
    createdAt: "2026-08-01T09:00:00.000Z",
    deletedAt: null,
    titulo: "Perturbação do Sossego e Ruídos Excessivos",
    textoRegimento: [
      {
        titulo: "Capítulo IV - Do Silêncio e Convivência",
        paragrafos: [
          {
            artigo: "Art. 14",
            texto:
              "É vedado produzir ruídos, barulhos, algazarras ou utilizar instrumentos musicais e aparelhos sonoros em volume que perturbe o sossego dos demais condôminos em qualquer horário.",
          },
          {
            artigo: "Art. 15",
            texto:
              "O horário de silêncio rigoroso compreende o período entre 22:00 horas e 08:00 horas do dia seguinte, devendo cessar qualquer atividade ruidosa no interior das unidades ou áreas comuns.",
          },
        ],
      },
    ],
    textoApoio:
      "Pedimos a colaboração para manter o volume moderado de aparelhos eletrônicos e conversas nas sacadas, preservando o direito ao descanso de todos os vizinhos.",
  },
  {
    id: "2",
    idCondominio: "1",
    createdAt: "2026-08-02T09:00:00.000Z",
    deletedAt: null,
    titulo: "Uso Indevido de Vaga de Garagem / Visitantes",
    textoRegimento: [
      {
        titulo: "Capítulo VII - Da Garagem e Estacionamento",
        paragrafos: [
          {
            artigo: "Art. 28",
            texto:
              "Os veículos deverão ser estacionados rigorosamente dentro dos limites das vagas demarcadas, não sendo permitido ultrapassar as faixas de divisão ou obstruir a circulação das pistas.",
          },
          {
            artigo: "Art. 29",
            texto:
              "As vagas destinadas a visitantes são de uso rotativo e exclusivo de convidados temporários, sendo expressamente proibido seu uso contínuo ou por veículos de moradores.",
          },
        ],
      },
    ],
    textoApoio:
      "Solicitamos que o veículo seja reposicionado dentro da vaga privativa correspondente à unidade para garantir a fluidez da garagem.",
  },
  {
    id: "3",
    idCondominio: "1",
    createdAt: "2026-08-03T09:00:00.000Z",
    deletedAt: null,
    titulo: "Descarte Irregular de Lixo e Objetos nas Áreas Comuns",
    textoRegimento: [
      {
        titulo: "Capítulo IX - Da Limpeza e Conservação",
        paragrafos: [
          {
            artigo: "Art. 41",
            texto:
              "O lixo doméstico deverá ser devidamente acondicionado em sacos plásticos resistentes e depositado exclusivamente nos coletores apropriados da lixeira central nos horários estipulados pela administração.",
          },
        ],
      },
    ],
    textoApoio:
      "É proibido deixar sacos de lixo ou caixas em corredores, halls e garagens, prevenindo odores e pragas nas áreas comuns.",
  },
  {
    id: "4",
    idCondominio: "1",
    createdAt: "2026-08-04T09:00:00.000Z",
    deletedAt: null,
    titulo: "Obras e Reformas Fora do Horário Regulamentar",
    textoRegimento: [
      {
        titulo: "Capítulo XI - Das Obras e Reformas",
        paragrafos: [
          {
            artigo: "Art. 52",
            texto:
              "A realização de obras, reformas e serviços ruidosos somente é permitida de segunda a sexta-feira, das 08:00 às 17:00 horas, sendo terminantemente proibida aos sábados, domingos e feriados.",
          },
        ],
      },
    ],
    textoApoio:
      "Toda reforma deve cumprir a NBR 16.280 com plano de reforma e termo de responsabilidade entregue previamente ao síndico.",
  },
  {
    id: "5",
    idCondominio: "2",
    createdAt: "2026-08-05T09:00:00.000Z",
    deletedAt: null,
    titulo: "Perturbação do Sossego",
    textoRegimento: [
      {
        titulo: "Capítulo III - Normas de Convivência",
        paragrafos: [
          {
            artigo: "Art. 10",
            texto: "Cumprir o horário de silêncio das 22h às 7h.",
          },
        ],
      },
    ],
    textoApoio: "Evite arrastar móveis e salto alto em horários de repouso.",
  },
  {
    id: "6",
    idCondominio: "2",
    createdAt: "2026-08-06T09:00:00.000Z",
    deletedAt: null,
    titulo: "Uso Indevido da Área de Piscina",
    textoRegimento: [
      {
        titulo: "Capítulo VI - Áreas de Lazer",
        paragrafos: [
          {
            artigo: "Art. 35",
            texto:
              "É vedado o uso de copos e garrafas de vidro no deck da piscina.",
          },
        ],
      },
    ],
    textoApoio:
      "Utilize copos e recipientes de plástico ou acrílico para segurança dos usuários.",
  },
];

const initialDemoUnits: Unit[] = [
  {
    id: "101",
    idCondominio: "1",
    bloco: "A",
    apartamento: 101,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: false,
    proprietario: {
      nome: "Ana Paula Mendonça",
      contatoTelefone: "(11) 98765-4321",
      contatoEmail: "ana.mendonca@exemplo.com",
    },
    inquilino: null,
  },
  {
    id: "102",
    idCondominio: "1",
    bloco: "A",
    apartamento: 102,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: true,
    proprietario: {
      nome: "Carlos Eduardo Silva",
      contatoTelefone: "(11) 97654-3210",
      contatoEmail: "carlos.silva@exemplo.com",
    },
    inquilino: {
      nome: "Mariana Ferreira",
      contatoTelefone: "(11) 99123-4567",
      contatoEmail: "mariana.ferreira@exemplo.com",
    },
  },
  {
    id: "103",
    idCondominio: "1",
    bloco: "B",
    apartamento: 201,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: false,
    proprietario: {
      nome: "Roberto Nogueira",
      contatoTelefone: "(11) 98234-5678",
      contatoEmail: "roberto.nogueira@exemplo.com",
    },
    inquilino: null,
  },
  {
    id: "104",
    idCondominio: "1",
    bloco: "B",
    apartamento: 202,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: true,
    proprietario: {
      nome: "Fernanda Lima",
      contatoTelefone: "(11) 98345-6789",
      contatoEmail: "fernanda.lima@exemplo.com",
    },
    inquilino: {
      nome: "Lucas Albuquerque",
      contatoTelefone: "(11) 99456-7890",
      contatoEmail: "lucas.albuquerque@exemplo.com",
    },
  },
  {
    id: "105",
    idCondominio: "1",
    bloco: "C",
    apartamento: 301,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: false,
    proprietario: {
      nome: "Juliana Martins",
      contatoTelefone: "(11) 98456-7890",
      contatoEmail: "juliana.martins@exemplo.com",
    },
    inquilino: null,
  },
  {
    id: "106",
    idCondominio: "1",
    bloco: "C",
    apartamento: 302,
    createdAt: "2026-08-01T10:00:00.000Z",
    alugado: true,
    proprietario: {
      nome: "Marcelo Dantas",
      contatoTelefone: "(11) 98567-8901",
      contatoEmail: "marcelo.dantas@exemplo.com",
    },
    inquilino: {
      nome: "Camila Rocha",
      contatoTelefone: "(11) 99567-8901",
      contatoEmail: "camila.rocha@exemplo.com",
    },
  },
  {
    id: "201",
    idCondominio: "2",
    bloco: "1",
    apartamento: 11,
    createdAt: "2026-08-02T10:00:00.000Z",
    alugado: false,
    proprietario: {
      nome: "Patrícia Souza",
      contatoTelefone: "(11) 98678-9012",
      contatoEmail: "patricia.souza@exemplo.com",
    },
    inquilino: null,
  },
  {
    id: "202",
    idCondominio: "2",
    bloco: "1",
    apartamento: 12,
    createdAt: "2026-08-02T10:00:00.000Z",
    alugado: true,
    proprietario: {
      nome: "Rodrigo Carvalho",
      contatoTelefone: "(11) 98789-0123",
      contatoEmail: "rodrigo.carvalho@exemplo.com",
    },
    inquilino: {
      nome: "Beatriz Ramos",
      contatoTelefone: "(11) 99678-9012",
      contatoEmail: "beatriz.ramos@exemplo.com",
    },
  },
  {
    id: "203",
    idCondominio: "2",
    bloco: "2",
    apartamento: 21,
    createdAt: "2026-08-02T10:00:00.000Z",
    alugado: false,
    proprietario: {
      nome: "Renato Gomes",
      contatoTelefone: "(11) 98890-1234",
      contatoEmail: "renato.gomes@exemplo.com",
    },
    inquilino: null,
  },
];

const initialDemoNotifications: Notification[] = [
  {
    id: "401",
    idCondominio: "1",
    createdAt: "2026-10-10T14:30:00.000Z",
    idTipoNotificacao: "1",
    idUnidade: "101",
    tipo: "Advertência",
    motivo:
      "Música excessivamente alta e algazarra constatadas pela portaria após as 23h30.",
    textoApoio:
      "Pedimos a colaboração para manter o volume moderado de aparelhos eletrônicos.",
    categoria: "Advertência",
    dataRetroativa: "2026-10-09",
    valorMulta: null,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: true,
    emailEnviadoEm: "2026-10-10T15:00:00.000Z",
    emailEnviadoPara: "ana.mendonca@exemplo.com",
    emailResendId: "demo-resend-401",
    emailEntregueEm: "2026-10-10T15:01:00.000Z",
    emailAbertoEm: "2026-10-10T15:10:00.000Z",
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-401",
    cienciaEm: "2026-10-10T15:15:00.000Z",
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
  {
    id: "402",
    idCondominio: "1",
    createdAt: "2026-10-18T10:15:00.000Z",
    idTipoNotificacao: "1",
    idUnidade: "101",
    tipo: "Multa",
    motivo:
      "Reincidência de ruídos e som alto durante a madrugada (01h40).",
    textoApoio:
      "Conforme advertência anterior #401 sem adequação, aplica-se a penalidade de multa prevista no regimento.",
    categoria: "Multa",
    dataRetroativa: "2026-10-17",
    valorMulta: 250,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-402",
    cienciaEm: null,
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
  {
    id: "403",
    idCondominio: "1",
    createdAt: "2026-10-15T16:00:00.000Z",
    idTipoNotificacao: "2",
    idUnidade: "102",
    tipo: "Orientação",
    motivo:
      "Veículo estacionado sobre a faixa divisória, dificultando o estacionamento da vaga vizinha.",
    textoApoio: "Solicitamos atenção ao posicionamento do veículo.",
    categoria: "Orientação",
    dataRetroativa: null,
    valorMulta: null,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: true,
    emailEnviadoEm: "2026-10-15T16:20:00.000Z",
    emailEnviadoPara: "mariana.ferreira@exemplo.com",
    emailResendId: "demo-resend-403",
    emailEntregueEm: "2026-10-15T16:21:00.000Z",
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-403",
    cienciaEm: null,
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
  {
    id: "404",
    idCondominio: "1",
    createdAt: "2026-10-05T09:00:00.000Z",
    idTipoNotificacao: "3",
    idUnidade: "103",
    tipo: "Advertência",
    motivo: "Sacos de lixo orgânico deixados no corredor do 2º andar.",
    textoApoio: "O lixo deve ser descartado nos coletores centrais.",
    categoria: "Advertência",
    dataRetroativa: null,
    valorMulta: null,
    status: "baixada",
    dataBaixa: "2026-10-07T11:00:00.000Z",
    motivoBaixa:
      "Morador compareceu à administração, justificou o engano do prestador e comprometeu-se com as regras.",
    emailNotificacao: true,
    emailEnviadoEm: "2026-10-05T09:15:00.000Z",
    emailEnviadoPara: "roberto.nogueira@exemplo.com",
    emailResendId: "demo-resend-404",
    emailEntregueEm: "2026-10-05T09:16:00.000Z",
    emailAbertoEm: "2026-10-05T10:00:00.000Z",
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-404",
    cienciaEm: "2026-10-05T10:05:00.000Z",
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
  {
    id: "405",
    idCondominio: "1",
    createdAt: "2026-10-22T11:30:00.000Z",
    idTipoNotificacao: "4",
    idUnidade: "104",
    tipo: "Multa",
    motivo:
      "Execução de martelete e quebra de alvenaria em pleno domingo às 10h.",
    textoApoio:
      "Trabalhos ruidosos são vedados aos domingos conforme regimento.",
    categoria: "Multa",
    dataRetroativa: "2026-10-22",
    valorMulta: 250,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-405",
    cienciaEm: null,
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
  {
    id: "406",
    idCondominio: "1",
    createdAt: "2026-10-25T17:45:00.000Z",
    idTipoNotificacao: "2",
    idUnidade: "105",
    tipo: "Advertência",
    motivo:
      "Uso indevido e ininterrupto de vaga de visitante por mais de 72 horas consecutivas.",
    textoApoio: "Vagas de visitantes possuem limite de tempo rotativo.",
    categoria: "Advertência",
    dataRetroativa: null,
    valorMulta: null,
    status: "ativa",
    dataBaixa: null,
    motivoBaixa: null,
    emailNotificacao: false,
    emailEnviadoEm: null,
    emailEnviadoPara: null,
    emailResendId: null,
    emailEntregueEm: null,
    emailAbertoEm: null,
    emailFalhaEm: null,
    emailFalhaMotivo: null,
    cienciaToken: "demo-token-406",
    cienciaEm: null,
    criadoPor: "demo-admin",
    criadoPorEmail: "admin@condonot.com.br",
    criadoPorNome: "Administrador Demo",
  },
];

const initialDemoUsersAccess: UserAccess[] = [
  {
    userId: "demo-admin-1",
    email: "admin@condonot.com.br",
    nome: "Administrador Demo",
    isAdmin: true,
    createdAt: "2026-08-01T09:00:00.000Z",
    lastSignInAt: "2026-10-25T18:00:00.000Z",
    condominioIds: ["1", "2"],
  },
  {
    userId: "demo-user-2",
    email: "portaria.acacias@condonot.com.br",
    nome: "Portaria Acácias",
    isAdmin: false,
    createdAt: "2026-09-01T14:00:00.000Z",
    lastSignInAt: "2026-10-25T14:30:00.000Z",
    condominioIds: ["1"],
  },
];

interface DemoState {
  condominios: Condominio[];
  notificationTypes: NotificationType[];
  units: Unit[];
  notifications: Notification[];
  usersAccess: UserAccess[];
  attachments: Record<string, NotificationAttachment[]>;
  regimentoUrls: Record<string, string>;
}

function cloneInitialState(): DemoState {
  return {
    condominios: JSON.parse(JSON.stringify(initialDemoCondominios)),
    notificationTypes: JSON.parse(JSON.stringify(initialDemoNotificationTypes)),
    units: JSON.parse(JSON.stringify(initialDemoUnits)),
    notifications: JSON.parse(JSON.stringify(initialDemoNotifications)),
    usersAccess: JSON.parse(JSON.stringify(initialDemoUsersAccess)),
    attachments: {},
    regimentoUrls: {},
  };
}

let demoState: DemoState = cloneInitialState();

export function getDemoState(): DemoState {
  return demoState;
}

export function resetDemoState(): void {
  demoState = cloneInitialState();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("condonoti.demo.activeCondominioId");
  }
}
