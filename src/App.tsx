import { useEffect, useState, type ReactNode } from "react";
import "./App.css";
import { AppLayout } from "./layouts/AppLayout";
import { CreateNotificationPage } from "./pages/CreateNotificationPage";
import { CreateNotificationTypePage } from "./pages/CreateNotificationTypePage";
import { EditUnitPage } from "./pages/EditUnitPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotificationDetailPage } from "./pages/NotificationDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotificationTypesPage } from "./pages/NotificationTypesPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";
import { UnitsPage } from "./pages/UnitsPage";
import { supabaseConfigError } from "./services/supabase";

function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return pathname;
}

function getParam(pathname: string, pattern: RegExp): string | null {
  const match = pattern.exec(pathname);
  return match?.[1] ?? null;
}

export default function App() {
  const pathname = usePathname();

  const navigate = (to: string) => {
    if (to === pathname) {
      return;
    }

    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const unitEditId = getParam(pathname, /^\/unidades\/([^/]+)\/editar$/);
  const unitId = getParam(pathname, /^\/unidades\/([^/]+)$/);
  const notificationId = getParam(pathname, /^\/notificacoes\/([^/]+)$/);

  let page: ReactNode;

  if (pathname === "/") {
    page = <HomePage onNavigate={navigate} />;
  } else if (pathname === "/notificacoes" || pathname === "/relatorios") {
    page = <NotificationsPage onNavigate={navigate} />;
  } else if (pathname === "/notificacoes/nova") {
    page = <CreateNotificationPage onNavigate={navigate} />;
  } else if (pathname === "/tipos-notificacao/novo") {
    page = <CreateNotificationTypePage onNavigate={navigate} />;
  } else if (pathname === "/tipos-notificacao") {
    page = <NotificationTypesPage onNavigate={navigate} />;
  } else if (notificationId && notificationId !== "nova") {
    page = (
      <NotificationDetailPage
        notificationId={notificationId}
        onNavigate={navigate}
      />
    );
  } else if (pathname === "/unidades") {
    page = <UnitsPage onNavigate={navigate} />;
  } else if (unitEditId) {
    page = <EditUnitPage unitId={unitEditId} onNavigate={navigate} />;
  } else if (unitId) {
    page = <UnitDetailPage unitId={unitId} onNavigate={navigate} />;
  } else {
    page = <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <AppLayout
      currentPath={pathname}
      onNavigate={navigate}
      supabaseConfigError={supabaseConfigError}
    >
      {page}
    </AppLayout>
  );
}
