import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { useSettings } from './context/SettingsContext'
import BottomNav from './components/BottomNav'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import FuelForm from './pages/FuelForm'
import MaintenanceForm from './pages/MaintenanceForm'
import OtherForm from './pages/OtherForm'
import RecordForm from './pages/RecordForm'
import Records from './pages/Records'
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
  const hideNav = inOnboardingFlow

  if (needsOnboarding && !inOnboardingFlow) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <>
      <Routes>
        <Route path="/onboarding"                   element={<Onboarding />} />
        <Route path="/"                             element={<Home />} />
        <Route path="/records"                      element={<Records />} />
        <Route path="/records/new"                  element={<RecordForm />} />
        <Route path="/records/fuel/:id/edit"        element={<FuelForm />} />
        <Route path="/records/maintenance/:id/edit" element={<MaintenanceForm />} />
        <Route path="/records/other/:id/edit"       element={<OtherForm />} />
        <Route path="/settings"                     element={<Settings />} />
        <Route path="/import"                       element={<ImportGuide />} />
        <Route path="/feedback"                     element={<Feedback />} />
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
