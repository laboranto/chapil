import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { useSettings } from './context/SettingsContext'
import AddButton from './components/AddButton'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import FuelForm from './pages/FuelForm'
import MaintenanceForm from './pages/MaintenanceForm'
import OtherForm from './pages/OtherForm'
import RecordForm from './pages/RecordForm'
import Settings from './pages/Settings'
import ImportGuide from './pages/ImportGuide'
import Feedback from './pages/Feedback'

function AppContent() {
  const { settings, isReady } = useSettings()
  const location = useLocation()

  if (!isReady) return null

  const needsOnboarding = !settings.car_type && !settings.car_birth && !settings.car_fuel
  const isOnboarding = location.pathname === '/onboarding'
  const inOnboardingFlow = isOnboarding || new URLSearchParams(location.search).get('onboarding') === '1'
  // 하단에 남은 건 '기록 추가' 버튼뿐이라 기록 목록이 있는 메인에서만 띄운다.
  // 양식·설정 등 하위 페이지는 각자 topbar에 닫기/뒤로가기를 갖고 있다.
  const showAdd = location.pathname === '/'

  if (needsOnboarding && !inOnboardingFlow) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <>
      <Routes>
        <Route path="/onboarding"                   element={<Onboarding />} />
        <Route path="/"                             element={<Home />} />
        {/* 홈에 통합됨. 기존 북마크·히스토리용 */}
        <Route path="/records"                      element={<Navigate to="/" replace />} />
        <Route path="/records/new"                  element={<RecordForm />} />
        <Route path="/records/fuel/:id/edit"        element={<FuelForm />} />
        <Route path="/records/maintenance/:id/edit" element={<MaintenanceForm />} />
        <Route path="/records/other/:id/edit"       element={<OtherForm />} />
        <Route path="/settings"                     element={<Settings />} />
        <Route path="/import"                       element={<ImportGuide />} />
        <Route path="/feedback"                     element={<Feedback />} />
      </Routes>
      {showAdd && <AddButton />}
      {showAdd && <div className="bottom-bg"></div>}
    </>
  )
}

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
