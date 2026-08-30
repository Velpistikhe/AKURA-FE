import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, idID } from "./components/global";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoute from "./routes/AppRoute";

const antdTheme = {
  token: {
    colorPrimary: "#1a2e5e",
    colorLink: "#1a2e5e",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#e02020",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    controlHeight: 42,
    fontSize: 14,
  },
  components: {
    Button: {
      controlHeight: 42,
      borderRadius: 8,
      fontWeight: 600,
    },
    Input: {
      controlHeight: 42,
      borderRadius: 8,
    },
    Layout: {
      siderBg: "#1a2e5e",
      headerBg: "#ffffff",
      triggerBg: "#0f1e3d",
    },
    Menu: {
      darkItemBg: "#1a2e5e",
      darkSubMenuItemBg: "#0f1e3d",
      darkItemSelectedBg: "#e02020",
      darkItemHoverBg: "#2a4080",
      itemHeight: 48,
    },
    Notification: {
      borderRadiusLG: 14,
    },
    Message: {
      borderRadiusLG: 8,
    },
  },
};

function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={idID}>
      <NotificationProvider>
        <AuthProvider>
          <MenuProvider>
            <BrowserRouter>
              <AppRoute />
            </BrowserRouter>
          </MenuProvider>
        </AuthProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}

export default App;
