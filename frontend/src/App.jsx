import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { useSettings } from './context/SettingsContext'
import { hasAcknowledgedNotice } from './recovery'
import RecoveryCodeModal from './components/RecoveryCodeModal'
import BottomNav from './components/BottomNav'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import FuelList from './pages/FuelList'
import FuelForm from './pages/FuelForm'
import MaintenanceList from './pages/MaintenanceList'
import MaintenanceForm from './pages/MaintenanceForm'
import OtherList from './pages/OtherList'
import OtherForm from './pages/OtherForm'
import Settings from './pages/Settings'
import ImportGuide from './pages/ImportGuide'
import Feedback from './pages/Feedback'

function AppContent() {
  const { settings, isReady } = useSettings()
  const location = useLocation()
  const [showRecoveryModal, setShowRecoveryModal] = useState(() => !hasAcknowledgedNotice())

  if (!isReady) return null

  const needsOnboarding = !settings.car_type && !settings.car_birth && !settings.car_fuel
  const isOnboarding = location.pathname === '/onboarding'
  const inOnboardingFlow = isOnboarding || new URLSearchParams(location.search).get('onboarding') === '1'
  const hideNav = inOnboardingFlow

  if (needsOnboarding && !inOnboardingFlow) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <>
      {showRecoveryModal && <RecoveryCodeModal onClose={() => setShowRecoveryModal(false)} />}
      <Routes>
        <Route path="/onboarding"              element={<Onboarding />} />
        <Route path="/"                        element={<Home />} />
        <Route path="/fuel"                    element={<FuelList />} />
        <Route path="/fuel/new"                element={<FuelForm />} />
        <Route path="/fuel/:id/edit"           element={<FuelForm />} />
        <Route path="/maintenance"             element={<MaintenanceList />} />
        <Route path="/maintenance/new"         element={<MaintenanceForm />} />
        <Route path="/maintenance/:id/edit"    element={<MaintenanceForm />} />
        <Route path="/other"                   element={<OtherList />} />
        <Route path="/other/new"               element={<OtherForm />} />
        <Route path="/other/:id/edit"          element={<OtherForm />} />
        <Route path="/settings"                element={<Settings />} />
        <Route path="/import"                  element={<ImportGuide />} />
        <Route path="/feedback"                element={<Feedback />} />
      </Routes>
      {!hideNav && <BottomNav />}
      {!hideNav && <div className="bottom-bg"></div>}
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
