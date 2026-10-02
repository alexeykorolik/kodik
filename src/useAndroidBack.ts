import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { registerBackAction } from './nativeBack'

export function useAndroidBack(handle: () => boolean, priority = 0) {
  const latest = useRef(handle); latest.current = handle
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    return registerBackAction(()=>latest.current(), priority)
  }, [priority])
}
