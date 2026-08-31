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
  const { menuLoading } = useMenu();
  const appLoading = profileLoading || menuLoading;

  if (appLoading) return <AppLoading message="Loading profile and menu..." />;

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<UserModule />} />
          <Route path="settings" element={<UserModule />} />
          <Route path="user/*" element={<UserModule />} />
          <Route path="appmanager/*" element={<RemoteAppManager />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
        <Route path="/marketing" element={<DashboardLayout />}>
          <Route index element={<RemoteMarketing />} />
          <Route path="*" element={<RemoteMarketing />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoute;
