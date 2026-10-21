import { useState } from "react";
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
import { AuthProvider } from "./contexts/AuthProvider";
import { useAuth } from "./contexts/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { supabase } from "./services/supabase";
import { CienciaPage } from "./pages/CienciaPage";
import { CondominiosPage } from "./pages/CondominiosPage";
import { AcessosPage } from "./pages/AcessosPage";
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

function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [draftNotificationSelection, setDraftNotificationSelection] = useState<{
    unitId: string;
    typeId: string;
  }>({ unitId: "", typeId: "" });

  return (
    <CondominioProvider>
      <AppLayout
        currentPath={location.pathname}
        onNavigate={navigate}
        supabaseConfigError={supabaseConfigError}
        draftNotificationSelection={draftNotificationSelection}
      >
        <Routes>
          <Route path="/" element={<HomePage onNavigate={navigate} />} />
          <Route
            path="/condominios"
            element={<CondominiosPage onNavigate={navigate} />}
          />
          <Route
            path="/acessos"
            element={<AcessosPage onNavigate={navigate} />}
          />
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
            element={
              <CreateNotificationPage
                onNavigate={navigate}
                onSelectionChange={setDraftNotificationSelection}
              />
            }
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

function ProtectedApp() {
  const { session, loading } = useAuth();

  if (!supabase) {
    return <AdminApp />;
  }
  if (loading) {
    return null;
  }
  return session ? <AdminApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/ciencia/:token" element={<CienciaPage />} />
        <Route path="*" element={<ProtectedApp />} />
      </Routes>
    </AuthProvider>
  );
}
