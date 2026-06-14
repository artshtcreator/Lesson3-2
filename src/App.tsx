import { Navigate, Route, Routes } from 'react-router-dom'
import { AppSidebarLayout } from '@/components/layout/AppSidebarLayout'
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { PublicRoute } from '@/features/auth/components/PublicRoute'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { AIGeneratorPage } from '@/pages/AIGeneratorPage'
import { BillingPage } from '@/pages/BillingPage'
import { BoardDetailPage } from '@/pages/BoardDetailPage'
import { BoardListPage } from '@/pages/BoardListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TelegramInboxPage } from '@/pages/TelegramInboxPage'

const App = (): JSX.Element => (
  <>
    <AuthBootstrap />

    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppSidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/boards" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="boards" element={<BoardListPage />} />
        <Route path="boards/:boardId" element={<BoardDetailPage />} />
        <Route path="ai-generator" element={<AIGeneratorPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="telegram-inbox" element={<TelegramInboxPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/boards" replace />} />
    </Routes>
  </>
)

export default App
