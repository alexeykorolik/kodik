import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AppLauncher } from '@capacitor/app-launcher'
import { handleAndroidBack } from './nativeBack'

export async function startNativeShell() {
  if (Capacitor.getPlatform() !== 'android') return
  document.documentElement.dataset.nativePlatform = 'android'
  await App.addListener('backButton', () => {
    const menu = document.querySelector<HTMLDetailsElement>('details.workspace-menu[open], details.editor-menu[open]')
    if (menu) { menu.open = false; return }
    if (!handleAndroidBack()) void App.minimizeApp()
  })
  // Keep packaged routes local; future external links use the system browser.
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.download || !/^https?:/.test(link.href) || new URL(link.href).origin === location.origin) return
    event.preventDefault(); void AppLauncher.openUrl({url:link.href}).catch(()=>{})
  })
  await StatusBar.setStyle({ style:Style.Light }).catch(()=>{})
  await StatusBar.setBackgroundColor({ color:'#f8f7f2' }).catch(()=>{})
  // The React shell has already mounted. Never wait for network/AI to hide splash.
  await SplashScreen.hide()
}
