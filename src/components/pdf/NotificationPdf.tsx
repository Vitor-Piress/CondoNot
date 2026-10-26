import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  Condominio,
  Notification,
  NotificationType,
  Unit,
} from "../../types/domain";
import { formatCurrency, formatOnlyDateInFull } from "../../utils/format";
import { getNotificationPrintCopy } from "../../utils/notificationPrint";

export interface NotificationPdfPhoto {
  dataUrl: string;
  fileName: string;
}

interface NotificationPdfProps {
  notification: Notification;
  type: NotificationType | null;
  unit: Unit;
  condominio: Condominio | null;
  typeTitle: string;
  logoDataUrl: string | null;
  photos: NotificationPdfPhoto[];
}

const BORDER_COLOR = "#334155";

const styles = StyleSheet.create({
  borderOuter: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  borderInner: {
    position: "absolute",
    top: 17,
    left: 17,
    right: 17,
    bottom: 17,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  page: {
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontFamily: "Times-Roman",
    fontSize: 12,
    lineHeight: 1.4,
    color: "#000",
  },
  center: { alignItems: "center" },
  logo: { width: 136, height: 62, objectFit: "contain", marginBottom: 8 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    marginVertical: 10,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    textAlign: "center",
  },
  baixada: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    color: "#be123c",
    textDecoration: "underline",
    letterSpacing: 4,
    marginVertical: 8,
  },
  meta: {
    width: "100%",
    marginVertical: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    fontSize: 11,
  },
  bold: { fontFamily: "Times-Bold" },
  boldUnderline: { fontFamily: "Times-Bold", textDecoration: "underline" },
  justify: { textAlign: "justify" },
  block: { marginTop: 12 },
  escopo: { marginLeft: 10, marginBottom: 6 },
  paragrafo: { marginLeft: 10, marginTop: 3 },
  paragrafoTexto: { marginLeft: 10, textAlign: "justify" },
  signature: {
    marginTop: 60,
    alignSelf: "center",
    width: 190,
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    paddingTop: 4,
    alignItems: "center",
  },
  attachmentsTitle: {
    fontFamily: "Times-Bold",
    fontSize: 15,
    textAlign: "center",
    paddingBottom: 6,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  photoItem: { width: "47%", alignItems: "center", marginBottom: 8 },
  photo: { width: "100%", maxHeight: 280, objectFit: "contain" },
  photoCaption: { marginTop: 4, fontSize: 9, textAlign: "center" },
});

function ClosingParagraph({ kind }: { kind: "warning" | "guidance" | "fine" }) {
  const lead =
    "Sendo assim, solicitamos sua intervenção e orientação aos moradores de seu apartamento para que esse fato ";

  if (kind === "fine") {
    return (
      <Text style={[styles.justify, styles.block]}>
        {lead}
        <Text style={styles.bold}>não</Text> mais se repita, sob pena de{" "}
        <Text style={styles.bold}>multa diária</Text> por desrespeito aos
        estatutos deste Condomínio.
      </Text>
    );
  }

  if (kind === "guidance") {
    return (
      <Text style={[styles.justify, styles.block]}>
        {lead}
        <Text style={styles.boldUnderline}>não</Text> mais se repita, sob pena
        de <Text style={styles.boldUnderline}>advertência</Text> e posterior{" "}
        <Text style={styles.boldUnderline}>multa</Text> (em caso de
        reincidência) por desrespeito aos estatutos deste Condomínio.
      </Text>
    );
  }

  return (
    <Text style={[styles.justify, styles.block]}>
      {lead}
      <Text style={styles.boldUnderline}>não</Text> mais se repita, sob pena de{" "}
      <Text style={styles.boldUnderline}>multa</Text> por desrespeito aos
      estatutos deste Condomínio.
    </Text>
  );
}

function PageBorder() {
  return (
    <>
      <View style={styles.borderOuter} fixed />
      <View style={styles.borderInner} fixed />
    </>
  );
}

export function NotificationPdf({
  notification,
  type,
  unit,
  condominio,
  typeTitle,
  logoDataUrl,
  photos,
}: NotificationPdfProps) {
  const printCopy = getNotificationPrintCopy(notification.categoria);
  const formattedFine =
    notification.valorMulta === null
      ? "valor não informado"
      : formatCurrency(notification.valorMulta);

  return (
    <Document title={printCopy.title ?? `Notificação #${notification.id}`}>
      <Page size="A4" style={styles.page}>
        <PageBorder />
        <View style={styles.center}>
          {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
          <Text style={styles.title}>
            {printCopy.title ?? `Notificação #${notification.id}`}
          </Text>
          {notification.status === "baixada" ? (
            <Text style={styles.baixada}>BAIXADA</Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={styles.bold}>{typeTitle}</Text>
            <Text style={styles.bold}>
              {formatOnlyDateInFull(notification.createdAt)}
            </Text>
          </View>
        </View>

        <Text style={[styles.justify, { marginTop: 6 }]}>
          Ao condômino(a){" "}
          <Text style={styles.boldUnderline}>
            da unidade "{unit.apartamento}" do Bloco "{unit.bloco}"
          </Text>
          , do {condominio?.name ?? "condomínio"}, situado em{" "}
          {condominio?.location ?? "endereço não informado"}.
        </Text>

        <View style={styles.block}>
          <Text style={{ marginBottom: 6 }}>Prezado(a) Senhor(a),</Text>
          {printCopy.kind === "fine" ? (
            <Text style={styles.justify}>
              Na qualidade de Síndica deste Condomínio venho por meio deste,
              avisá-lo que em seu próximo boleto de condomínio, será aplicada
              uma{" "}
              <Text style={styles.bold}>
                MULTA REGIMENTAL no valor de {formattedFine}
              </Text>{" "}
              por desrespeito às normas do{" "}
              <Text style={styles.boldUnderline}>Regulamento Interno</Text>,
              conforme segue:
            </Text>
          ) : (
            <Text style={styles.justify}>
              Na qualidade de Síndica deste Condomínio, venho{" "}
              <Text style={styles.bold}>
                {printCopy.kind === "guidance" ? "orientá-lo" : "adverti-lo"}
              </Text>{" "}
              por desrespeito às normas do{" "}
              <Text style={styles.bold}>Regimento Interno</Text>, como segue:
            </Text>
          )}
        </View>

        <View style={styles.block}>
          {(type?.textoRegimento ?? []).map((escopo, escopoIndex) => (
            <View key={escopoIndex} style={styles.escopo} wrap={false}>
              <Text style={styles.bold}>{escopo.titulo || "Sem título"}</Text>
              {escopo.paragrafos.map((paragrafo, paragrafoIndex) => (
                <View key={paragrafoIndex} style={styles.paragrafo}>
                  <Text>
                    {paragrafo.artigo
                      ? `Art. ${paragrafo.artigo}`
                      : `Parágrafo ${paragrafoIndex + 1}`}
                  </Text>
                  <Text style={styles.paragrafoTexto}>{paragrafo.texto}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={[styles.boldUnderline, { marginBottom: 3 }]}>
            Motivo da Notificação
          </Text>
          <Text>{notification.motivo ?? "Sem motivo informado."}</Text>
        </View>

        {type?.textoApoio ?? notification.textoApoio ? (
          <Text style={styles.block}>
            {type?.textoApoio ?? notification.textoApoio}
          </Text>
        ) : null}

        <ClosingParagraph kind={printCopy.kind} />

        <View style={styles.signature} wrap={false}>
          <Text>Ana Paula Palmezan</Text>
          <Text>Síndica</Text>
        </View>
      </Page>

      {photos.length > 0 ? (
        <Page size="A4" style={styles.page}>
        <PageBorder />
          <Text style={styles.attachmentsTitle}>
            Anexos da notificação #{notification.id}
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem} wrap={false}>
                <Image src={photo.dataUrl} style={styles.photo} />
                <Text style={styles.photoCaption}>
                  Foto {index + 1} — {photo.fileName}
                </Text>
              </View>
            ))}
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
