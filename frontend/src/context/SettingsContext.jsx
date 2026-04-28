import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const SettingsContext = createContext({ fuelTerm: '주유', settings: {}, options: { car_type: [], car_fuel: [] }, refreshSettings: () => {} })

export function SettingsProvider({ children }) {
  const [fuelTerm, setFuelTerm] = useState('주유')
  const [settings, setSettings] = useState({})
  const [options, setOptions] = useState({ car_type: [], car_fuel: [] })

  const load = useCallback(async () => {
    const [s, opts] = await Promise.all([
      api.getSettings(),
      api.getSettingsOptions(),
    ])
    setSettings(s)
    setOptions(opts)
    const match = opts.car_fuel.find(o => o.code === s.car_fuel)
    setFuelTerm(match?.ui_term ?? '주유')
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SettingsContext.Provider value={{ fuelTerm, settings, options, refreshSettings: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
