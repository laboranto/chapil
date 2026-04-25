import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import FuelList from './pages/FuelList'
import FuelForm from './pages/FuelForm'
import MaintenanceList from './pages/MaintenanceList'
import MaintenanceForm from './pages/MaintenanceForm'
import OtherList from './pages/OtherList'
import OtherForm from './pages/OtherForm'
import Settings from './pages/Settings'
import ImportGuide from './pages/ImportGuide'

// App: 라우터 설정. 어떤 URL에서 어떤 페이지 컴포넌트를 보여줄지 정의한다.
// BrowserRouter: 브라우저의 URL을 기반으로 라우팅한다.
// Routes / Route: URL 패턴과 컴포넌트를 매핑한다.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<Home />} />
        <Route path="/fuel"                   element={<FuelList />} />
        <Route path="/fuel/new"               element={<FuelForm />} />
        <Route path="/fuel/:id/edit"          element={<FuelForm />} />
        <Route path="/maintenance"            element={<MaintenanceList />} />
        <Route path="/maintenance/new"        element={<MaintenanceForm />} />
        <Route path="/maintenance/:id/edit"   element={<MaintenanceForm />} />
        <Route path="/other"                  element={<OtherList />} />
        <Route path="/other/new"              element={<OtherForm />} />
        <Route path="/other/:id/edit"         element={<OtherForm />} />
        <Route path="/settings"               element={<Settings />} />
        <Route path="/import"                 element={<ImportGuide />} />
      </Routes>
      {/* BottomNav와 bottom-bg는 모든 페이지에서 항상 표시된다 */}
      <BottomNav />
      <div className="bottom-bg"></div>
    </BrowserRouter>
  )
}

export default App
