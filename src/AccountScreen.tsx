import { useState } from 'react'
import type { Progress } from './progress'
import { cloudProgressEnabled } from './progress'
import { Icon } from './Icon'

export function AccountScreen({ progress, onSave }: { progress: Progress; onSave: (progress: Progress) => void }) {
  const [name, setName] = useState(progress.profile?.displayName || '')
  const [saved, setSaved] = useState(false)
  return <section className="account-screen" aria-label="Аккаунт">
    <div className="insights-heading"><p className="eyebrow">Твой Кодик</p><h1>Аккаунт</h1></div>
    <div className="account-identity"><span className="account-avatar"><Icon name="user" size={34} /></span><h2>{progress.profile?.displayName || 'Ученик Кодика'}</h2><p>Гостевой профиль</p></div>
    <form className="account-name-card" onSubmit={event => { event.preventDefault(); onSave({ ...progress, profile: { displayName: name.trim() } }); setSaved(true) }}><label htmlFor="profile-name">Как тебя называть?</label><div><input id="profile-name" value={name} maxLength={40} onChange={event => { setName(event.target.value); setSaved(false) }} autoComplete="nickname" placeholder="Твоё имя" /><button className="icon-button" aria-label="Сохранить имя" type="submit"><Icon name="check" /></button></div><p role="status">{saved ? 'Имя сохранено на этом устройстве' : 'Имя видно только в профиле на этом устройстве'}</p></form>
    <div className="account-note"><Icon name="book" /><div><h3>Твоё обучение</h3><p>Пройдено {progress.completed.length} заданий. {cloudProgressEnabled ? 'При доступной сети учебные результаты также сохраняются в облаке. Имя, код и история ошибок остаются на этом устройстве.' : 'Прогресс и история ошибок сохраняются на этом устройстве.'}</p></div></div>
    <div className="account-note account-soon" aria-label="Вход в аккаунт — скоро"><Icon name="cloud" /><div><h3>Вход в аккаунт <span>Скоро</span></h3><p>Пока ты учишься в гостевом профиле. Вход с другого устройства появится позже.</p></div></div>
  </section>
}
