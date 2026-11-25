import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useAuth } from '@/auth/authContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { TabBar } from '@/components/TabBar'
import { isSupabaseConfigured } from '@/db/supabase'
import { useSeed } from '@/hooks/useSeed'
import { AddEntryScreen } from '@/screens/AddEntryScreen'
import { DishFormScreen } from '@/screens/DishFormScreen'
import { DishScreen } from '@/screens/DishScreen'
import { EditEntryScreen } from '@/screens/EditEntryScreen'
import { FoodsScreen } from '@/screens/FoodsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProductFormScreen } from '@/screens/ProductFormScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { TodayScreen } from '@/screens/TodayScreen'

/** Layout for signed-in screens: content + bottom tabs. Redirects to /login without a session. */
function ProtectedLayout() {
  const { session } = useAuth()
  useSeed(Boolean(session))

  if (session === undefined) return <div className="splash" aria-busy="true" />
  if (session === null) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <OfflineBanner />
      <main className="app-content">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}

function ConfigError() {
  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Brak konfiguracji</h1>
        <p className="muted">
          Brakuje zmiennych VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Uzupełnij .env.local (lokalnie) albo
          zmienne builda w Cloudflare.
        </p>
      </div>
    </div>
  )
}

export function App() {
  if (!isSupabaseConfigured) return <ConfigError />

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/foods" element={<FoodsScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/product/new" element={<ProductFormScreen />} />
        <Route path="/product/:id" element={<ProductFormScreen />} />
        <Route path="/dish/new" element={<DishFormScreen />} />
        <Route path="/dish/:id" element={<DishScreen />} />
        <Route path="/dish/:id/edit" element={<DishFormScreen />} />
        <Route path="/entry/add" element={<AddEntryScreen />} />
        <Route path="/entry/:id" element={<EditEntryScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
