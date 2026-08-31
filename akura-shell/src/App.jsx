import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, enUS } from "./components/global";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoute from "./routes/AppRoute";

const antdTheme = {
  token: {
    colorPrimary: "#000048",
    colorLink: "#000048",
    colorSuccess: "#52c41a",
    colorWarning: "#ffaa00",
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
      siderBg: "#000048",
      headerBg: "#ffffff",
      triggerBg: "#080829",
    },
    Menu: {
      darkItemBg: "#000048",
      darkSubMenuItemBg: "#080829",
      darkItemSelectedBg: "#ffaa00",
      darkItemSelectedColor: "#000048",
      darkItemHoverBg: "#111162",
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
    <ConfigProvider theme={antdTheme} locale={enUS}>
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
