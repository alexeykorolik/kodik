import { useEffect, useRef, useState } from 'react'

export function useMobileLayout() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const change = () => setMobile(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return mobile
}

// Keep layout and input visibility in sync with the visible viewport, not the
// layout viewport hidden underneath a mobile keyboard. No learning state here.
export function useLessonViewport() {
  const mobile = useMobileLayout()
  const actionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const closeMenus = (event: Event) => {
      if (!(event.target instanceof Element)) return
      const target = event.target
      document.querySelectorAll<HTMLDetailsElement>('.screen-lesson .workspace-menu[open], .screen-lesson .editor-menu[open]').forEach(menu => {
        if (!menu.contains(target) || (event.type === 'click' && !!target.closest('button'))) menu.open = false
      })
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      document.querySelectorAll<HTMLDetailsElement>('.screen-lesson .workspace-menu[open], .screen-lesson .editor-menu[open]').forEach(menu => { menu.open = false })
    }
    document.addEventListener('pointerdown', closeMenus)
    document.addEventListener('click', closeMenus)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', closeMenus); document.removeEventListener('click', closeMenus); document.removeEventListener('keydown', escape) }
  }, [])
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0
    let focusFrame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const height = viewport?.height || window.innerHeight
        const top = viewport?.offsetTop || 0
        const bottom = Math.max(0, window.innerHeight - height - top)
        root.style.setProperty('--lesson-viewport-height', `${height}px`)
        root.style.setProperty('--lesson-viewport-top', `${top}px`)
        root.style.setProperty('--lesson-keyboard-bottom', `${bottom}px`)
        root.style.setProperty('--lesson-action-height', `${actionRef.current?.getBoundingClientRect().height || 80}px`)
        const host = document.querySelector<HTMLElement>('.screen-lesson .blockly-host')
        if (mobile && host) {
          const hostTop = host.getBoundingClientRect().top + window.scrollY
          const mirror = document.querySelector('.live-mirror')?.getBoundingClientRect().height || 44
          const add = document.querySelector('.workspace-actions')?.getBoundingClientRect().height || 64
          const actionHeight = actionRef.current?.getBoundingClientRect().height || 80
          const available = height - hostTop - actionHeight - mirror - add - 18
          // Blockly's SVG needs a definite pixel height. Percentage height in
          // an auto-sized flex item collapses the SVG and breaks hit testing.
          root.style.setProperty('--lesson-workspace-height', `${Math.max(height < 600 ? 170 : 280, Math.min(560, available))}px`)
        }
        const input = document.activeElement
        if (!mobile || !(input instanceof HTMLElement) || !input.matches('textarea, input:not([type="radio"]):not([type="checkbox"])')) return
        cancelAnimationFrame(focusFrame)
        focusFrame = requestAnimationFrame(() => {
          if (!input.isConnected || document.activeElement !== input) return
          const rect = input.getBoundingClientRect()
          const action = actionRef.current?.getBoundingClientRect()
          const modal = input.closest('dialog')
          const limit = modal ? top + height - 16 : Math.min(top + height, action?.top || top + height) - 12
          // Blockly positions its own field editor. Scroll the containing page
          // only when a real input is outside the unobscured input area.
          if (rect.bottom > limit) {
            if (modal) input.scrollIntoView({ block: 'nearest', behavior: 'instant' })
            else window.scrollBy({ top: rect.bottom - limit, behavior: 'instant' })
          } else if (rect.top < top + 8) {
            if (modal) input.scrollIntoView({ block: 'nearest', behavior: 'instant' })
            else window.scrollBy({ top: rect.top - top - 8, behavior: 'instant' })
          }
        })
      })
    }
    const observer = new ResizeObserver(update)
    if (actionRef.current) observer.observe(actionRef.current)
    document.querySelectorAll('.task-intro, .coach, .live-mirror').forEach(element => observer.observe(element))
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    update()
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(focusFrame); observer.disconnect()
      viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.removeEventListener('focusin', update); document.removeEventListener('focusout', update)
      for (const name of ['--lesson-viewport-height', '--lesson-viewport-top', '--lesson-keyboard-bottom', '--lesson-action-height', '--lesson-workspace-height']) root.style.removeProperty(name)
    }
  }, [mobile])
  return { mobile, actionRef }
}
