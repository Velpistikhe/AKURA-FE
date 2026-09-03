import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../modules/dashboard/Dashboard";
import UserModule from "../modules/user/UserModule";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import RemoteAppManager from "../components/remote/RemoteAppManager";
import RemoteMarketing from "../components/remote/RemoteMarketing";
import { AppLoading } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMenu } from "../context/MenuContext";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

function AppRoute() {
  const { profileLoading } = useAuth();
  const { menus, menuLoading } = useMenu();
  const appLoading = profileLoading || menuLoading;

  const mfeComponents = {
    app_manager: RemoteAppManager,
    marketing: RemoteMarketing,
  };

  const mfeRoutes = (menus || []).reduce((routes, menu) => {
    const key = String(menu.key || "")
      .trim()
      .replace(/^\/+|\/+$/g, "");
    const Component = mfeComponents[key];
    if (key && Component && !routes.some((route) => route.key === key)) {
      routes.push({ key, Component });
    }
    return routes;
  }, []);

  if (appLoading) return <AppLoading message="Loading profile and menu..." />;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<UserModule />} />
          <Route path="settings" element={<UserModule />} />
          <Route path="user/*" element={<UserModule />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
        {mfeRoutes.map(({ key, Component }) => (
          <Route key={key} path={`/${key}`} element={<DashboardLayout />}>
            <Route index element={<Component />} />
            <Route path="*" element={<Component />} />
          </Route>
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoute;
