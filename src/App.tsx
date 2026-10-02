import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";
import { AppLayout } from "./layouts/AppLayout";
import { CreateNotificationPage } from "./pages/CreateNotificationPage";
import { CreateNotificationTypePage } from "./pages/CreateNotificationTypePage";
import { EditUnitPage } from "./pages/EditUnitPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotificationDetailPage } from "./pages/NotificationDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotificationTypeDetailPage } from "./pages/NotificationTypeDetailPage";
import { NotificationTypesPage } from "./pages/NotificationTypesPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";
import { UnitsPage } from "./pages/UnitsPage";
import { supabaseConfigError } from "./services/supabase";
import { CondominioProvider } from "./contexts/CondominioProvider";
import { CondominiosPage } from "./pages/CondominiosPage";
import { RegimentoInternoPage } from "./pages/RegimentoInternoPage";

interface RoutedPageProps {
  onNavigate: (to: string) => void;
}

function NotificationDetailRoute({ onNavigate }: RoutedPageProps) {
  const { notificationId } = useParams();
  return notificationId ? (
    <NotificationDetailPage
      notificationId={notificationId}
      onNavigate={onNavigate}
    />
  ) : (
    <NotFoundPage onNavigate={onNavigate} />
  );
}

function NotificationTypeDetailRoute({ onNavigate }: RoutedPageProps) {
  const { typeId } = useParams();
  return typeId ? (
    <NotificationTypeDetailPage typeId={typeId} onNavigate={onNavigate} />
  ) : (
    <NotFoundPage onNavigate={onNavigate} />
  );
}

function UnitDetailRoute({ onNavigate }: RoutedPageProps) {
  const { unitId } = useParams();
  return unitId ? (
    <UnitDetailPage unitId={unitId} onNavigate={onNavigate} />
  ) : (
    <NotFoundPage onNavigate={onNavigate} />
  );
}

function EditUnitRoute({ onNavigate }: RoutedPageProps) {
  const { unitId } = useParams();
  return unitId ? (
    <EditUnitPage unitId={unitId} onNavigate={onNavigate} />
  ) : (
    <NotFoundPage onNavigate={onNavigate} />
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <CondominioProvider>
      <AppLayout
        currentPath={location.pathname}
        onNavigate={navigate}
        supabaseConfigError={supabaseConfigError}
      >
        <Routes>
          <Route path="/" element={<HomePage onNavigate={navigate} />} />
          <Route path="/condominios" element={<CondominiosPage />} />
          <Route path="/regimento-interno" element={<RegimentoInternoPage />} />
          <Route
            path="/notificacoes"
            element={<NotificationsPage onNavigate={navigate} />}
          />
          <Route
            path="/relatorios"
            element={<NotificationsPage onNavigate={navigate} />}
          />
          <Route
            path="/notificacoes/nova"
            element={<CreateNotificationPage onNavigate={navigate} />}
          />
          <Route
            path="/notificacoes/:notificationId"
            element={<NotificationDetailRoute onNavigate={navigate} />}
          />
          <Route
            path="/tipos-notificacao"
            element={<NotificationTypesPage onNavigate={navigate} />}
          />
          <Route
            path="/tipos-notificacao/novo"
            element={<CreateNotificationTypePage onNavigate={navigate} />}
          />
          <Route
            path="/tipos-notificacao/:typeId"
            element={<NotificationTypeDetailRoute onNavigate={navigate} />}
          />
          <Route
            path="/unidades"
            element={<UnitsPage onNavigate={navigate} />}
          />
          <Route
            path="/unidades/:unitId/editar"
            element={<EditUnitRoute onNavigate={navigate} />}
          />
          <Route
            path="/unidades/:unitId"
            element={<UnitDetailRoute onNavigate={navigate} />}
          />
          <Route path="*" element={<NotFoundPage onNavigate={navigate} />} />
        </Routes>
      </AppLayout>
    </CondominioProvider>
  );
}
