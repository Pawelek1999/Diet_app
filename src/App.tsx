import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useAuth } from '@/auth/authContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { QueryState } from '@/components/QueryState'
import { ScrollToTop } from '@/components/ScrollToTop'
import { TabBar } from '@/components/TabBar'
import { isSupabaseConfigured } from '@/db/supabase'
import { useSeed } from '@/hooks/useSeed'
import { LoginScreen } from '@/screens/LoginScreen'
import { TodayScreen } from '@/screens/TodayScreen'

// The start screen is in the main bundle; other screens load on demand (and are precached by the
// service worker, so they still open instantly and offline after the first visit).
const AddEntryScreen = lazy(() => import('@/screens/AddEntryScreen').then((m) => ({ default: m.AddEntryScreen })))
const DishFormScreen = lazy(() => import('@/screens/DishFormScreen').then((m) => ({ default: m.DishFormScreen })))
const DishScreen = lazy(() => import('@/screens/DishScreen').then((m) => ({ default: m.DishScreen })))
const EditEntryScreen = lazy(() => import('@/screens/EditEntryScreen').then((m) => ({ default: m.EditEntryScreen })))
const FoodsScreen = lazy(() => import('@/screens/FoodsScreen').then((m) => ({ default: m.FoodsScreen })))
const HistoryScreen = lazy(() => import('@/screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })))
const ProductFormScreen = lazy(() => import('@/screens/ProductFormScreen').then((m) => ({ default: m.ProductFormScreen })))
const SettingsScreen = lazy(() => import('@/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })))

/** Layout for signed-in screens: content + bottom tabs. Redirects to /login without a session. */
function ProtectedLayout() {
  const { session } = useAuth()
  useSeed(Boolean(session))

  if (session === undefined) return <div className="splash" aria-busy="true" />
  if (session === null) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <OfflineBanner />
      <ScrollToTop />
      <main className="app-content">
        <Suspense fallback={<QueryState isLoading error={null} />}>
          <Outlet />
        </Suspense>
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
