import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";

const COPILOTKIT_URL = (import.meta.env.VITE_API_URL ?? "") + "/copilotkit";

function DashboardWithCopilot() {
  return (
    <CopilotKit runtimeUrl={COPILOTKIT_URL} agent="sdai_assistant">
      <CopilotSidebar
        defaultOpen={false}
        labels={{
          title: "SD AI Agent Assistant",
          initial: "Hi! I'm your SD AI assistant. I can help you generate messages, review agent performance, or set up campaigns. What would you like to do?",
        }}
      >
        <Dashboard />
      </CopilotSidebar>
    </CopilotKit>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardWithCopilot />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
