import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoute from "./routes/AppRoute";

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <MenuProvider>
            <BrowserRouter>
              <AppRoute />
            </BrowserRouter>
          </MenuProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
