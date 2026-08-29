import { useEffect } from 'react';
import { Modal, Typography } from 'antd';
import { HashRouter, Routes, Route } from "react-router-dom";
import { SafeNavigate } from "./components/SafeNavigate";
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
import { ActiveContractsPage } from "./pages/ActiveContractsPage";
import { CreateCategoryPage } from "./pages/CreateCategoryPage";
import { CreateTemplatePage } from "./pages/CreateTemplatePage";
import { TemplateCardPage } from "./pages/TemplateCardPage";
import { ContractHistoryPage } from "./pages/ContractHistoryPage";
import { BookingsPage } from "./pages/BookingsPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { isAuthenticated } from "./utils/auth";
import { SyncStatus } from "./components/SyncStatus";
import "./db/syncManager";


const { Text } = Typography;

function GuestRoute({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <SafeNavigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    window.electronAPI?.onUpdateReady?.((data) => {
      Modal.confirm({
        title: `Доступна версия ${data.version}`,
        width: 500, // Делаем окно чуть шире для удобного чтения
        content: (
          <div style={{ marginTop: 16 }}>
            <Text strong>Что нового:</Text>
            {/* Отрисовываем HTML-описание из GitHub Releases */}
            <div 
              style={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                background: '#f5f5f5', 
                padding: 10, 
                marginTop: 8,
                borderRadius: 6
              }}
              dangerouslySetInnerHTML={{ __html: data.notes }}
            />
            <div style={{ marginTop: 16 }}>
              Перезапустить приложение для установки?
            </div>
          </div>
        ),
        okText: 'Обновить и перезапустить',
        cancelText: 'Позже',
        onOk: () => {
          window.electronAPI?.installUpdate?.();
        }
      });
    });
  }, []);

  return (
    <HashRouter>
      <SyncStatus />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
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
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
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
          path="/categories/create"
          element={
            <ProtectedRoute>
              <CreateCategoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/create"
          element={
            <ProtectedRoute>
              <CreateTemplatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/edit/:id"
          element={
            <ProtectedRoute>
              <CreateTemplatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/:id"
          element={
            <ProtectedRoute>
              <TemplateCardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetailPage />
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
          path="/contracts/active"
          element={
            <ProtectedRoute>
              <ActiveContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:id/history"
          element={
            <ProtectedRoute>
              <ContractHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/history"
          element={
            <ProtectedRoute>
              <ContractHistoryPage />
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
          path="/rentals/create"
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
        <Route path="/" element={<SafeNavigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
