import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { useSettings } from './context/SettingsContext'
import AddButton from './components/AddButton'
import Sheet from './components/Sheet'
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
  // 시트로 열렸으면 배경에 그릴 위치가 state에 실려 있다(sheet.js).
  // 없으면 딥링크·미지원 브라우저라 그냥 전체 페이지로 간다.
  const bg = location.state?.background
  const page = bg ?? location

  // 하단에 남은 건 '기록 추가' 버튼뿐이라 기록 목록이 있는 메인에서만 띄운다.
  // 시트가 떠 있어도 배경이 /면 버튼은 그대로 있어야 하므로 page를 본다.
  const showAdd = page.pathname === '/'

  if (needsOnboarding && !inOnboardingFlow) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <>
      <Routes location={page}>
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
      {/* 배경 위에 겹치는 시트. 같은 컴포넌트를 그대로 감싼다 */}
      {bg && (
        <Routes>
          <Route path="/records/new"                  element={<Sheet><RecordForm /></Sheet>} />
          <Route path="/records/fuel/:id/edit"        element={<Sheet><FuelForm /></Sheet>} />
          <Route path="/records/maintenance/:id/edit" element={<Sheet><MaintenanceForm /></Sheet>} />
          <Route path="/records/other/:id/edit"       element={<Sheet><OtherForm /></Sheet>} />
          <Route path="/settings"                     element={<Sheet><Settings /></Sheet>} />
        </Routes>
      )}
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
