import { useState } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  type NavigateOptions,
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
import { stripDemoPrefix, toDemoPath } from "./services/demoMode";

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

function AdminApp({ isDemo = false }: { isDemo?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draftNotificationSelection, setDraftNotificationSelection] = useState<{
    unitId: string;
    typeId: string;
  }>({ unitId: "", typeId: "" });

  const normalizedPath = isDemo
    ? stripDemoPrefix(location.pathname)
    : location.pathname;

  function handleNavigate(to: string, options?: NavigateOptions) {
    navigate(isDemo ? toDemoPath(to) : to, options);
  }

  return (
    <CondominioProvider>
      <AppLayout
        currentPath={normalizedPath}
        onNavigate={handleNavigate}
        supabaseConfigError={isDemo ? null : supabaseConfigError}
        draftNotificationSelection={draftNotificationSelection}
        isDemo={isDemo}
      >
        <Routes>
          <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
          <Route
            path="/condominios"
            element={<CondominiosPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/acessos"
            element={<AcessosPage onNavigate={handleNavigate} />}
          />
          <Route path="/regimento-interno" element={<RegimentoInternoPage />} />
          <Route
            path="/notificacoes"
            element={<NotificationsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/relatorios"
            element={<NotificationsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/notificacoes/nova"
            element={
              <CreateNotificationPage
                onNavigate={handleNavigate}
                onSelectionChange={setDraftNotificationSelection}
              />
            }
          />
          <Route
            path="/notificacoes/:notificationId"
            element={<NotificationDetailRoute onNavigate={handleNavigate} />}
          />
          <Route
            path="/tipos-notificacao"
            element={<NotificationTypesPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/tipos-notificacao/novo"
            element={<CreateNotificationTypePage onNavigate={handleNavigate} />}
          />
          <Route
            path="/tipos-notificacao/:typeId"
            element={<NotificationTypeDetailRoute onNavigate={handleNavigate} />}
          />
          <Route
            path="/unidades"
            element={<UnitsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/unidades/:unitId/editar"
            element={<EditUnitRoute onNavigate={handleNavigate} />}
          />
          <Route
            path="/unidades/:unitId"
            element={<UnitDetailRoute onNavigate={handleNavigate} />}
          />
          <Route path="*" element={<NotFoundPage onNavigate={handleNavigate} />} />
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
        <Route path="/demo/*" element={<AdminApp isDemo />} />
        <Route path="*" element={<ProtectedApp />} />
      </Routes>
    </AuthProvider>
  );
}
