import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ToolsPage } from "./pages/ToolsPage";
import { ToolCardPage } from "./pages/ToolCardPage";
import { CreateToolPage } from "./pages/CreateToolPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { CreateClientPage } from "./pages/CreateClientPage";
import { CreateRentalContractPage } from "./pages/CreateRentalContractPage";
import { isAuthenticated } from "./utils/auth";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/create"
          element={
            <ProtectedRoute>
              <CreateClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/edit/:id"
          element={
            <ProtectedRoute>
              <CreateClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <ToolsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools/create"
          element={
            <ProtectedRoute>
              <CreateToolPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools/edit/:id"
          element={
            <ProtectedRoute>
              <CreateToolPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools/:id"
          element={
            <ProtectedRoute>
              <ToolCardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/create"
          element={
            <ProtectedRoute>
              <CreateRentalContractPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute>
              <DocumentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
