import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { PublicRoute } from '@/features/auth/components/PublicRoute'
import { BoardPage } from '@/pages/BoardPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

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
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
)

export default App
