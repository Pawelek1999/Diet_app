import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { FoodsScreen } from '@/screens/FoodsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { TodayScreen } from '@/screens/TodayScreen'

export function App() {
  return (
    <div className="app">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/foods" element={<FoodsScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
