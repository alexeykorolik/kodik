import { Icon } from './Icon'
import { useEffect, useState } from 'react'
import { useAndroidBack } from './useAndroidBack'

const layouts = {
  ru: ['й ц у к е н г ш щ з х', 'ф ы в а п р о л д ж э', 'я ч с м и т ь б ю ё'],
  en: ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m'],
  numbers: ['1 2 3 4 5 6 7 8 9 0', '- . + * / ( )', '" \' : _ = ! ? ,'],
}

export function KodikKeyboard({ value, numeric, error, onChange, onDone, onCancel }: { value: string; numeric: boolean; error?: string; onChange: (value: string) => void; onDone: () => void; onCancel: () => void }) {
  useAndroidBack(()=>{ onCancel(); return true },200)
  const [layout, setLayout] = useState<'ru' | 'en' | 'numbers'>(numeric ? 'numbers' : 'ru')
  const [shift, setShift] = useState(false)
  const rows = numeric ? ['1 2 3', '4 5 6', '7 8 9', '- 0 .'] : layouts[layout]
  const press = (key: string) => { onChange(key === '⌫' ? value.slice(0, -1) : value + (key === 'Пробел' ? ' ' : shift ? key.toUpperCase() : key)); setShift(false) }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') onCancel()
      else if (event.key === 'Enter') onDone()
      else if (event.key === 'Backspace') { event.preventDefault(); onChange(value.slice(0, -1)) }
      else if (event.key.length === 1) { event.preventDefault(); onChange(value + event.key) }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [value, onChange, onCancel, onDone])
  return <div className="kodik-keyboard" role="dialog" aria-label="Клавиатура Кодик">
    <div className="kodik-keyboard-heading"><span>Введи значение</span><button className="keyboard-clear" onClick={() => onChange('')}>Очистить</button><button onClick={onCancel} aria-label="Отменить ввод"><Icon name="close" size={20} /></button></div>
    <div className="kodik-keyboard-value" aria-live="polite">{value || <span>Нажми клавиши ниже</span>}<i aria-hidden="true" /></div>
    {error && <p className="keyboard-error" role="status">{error}</p>}
    <div className="kodik-keyboard-keys">{rows.map((row, index) => <div className="kodik-keyboard-row" key={`${layout}-${index}`}>{row.split(' ').filter(Boolean).map(key => <button key={key} onClick={() => press(key)} aria-label={shift ? key.toUpperCase() : key}>{shift ? key.toUpperCase() : key}</button>)}</div>)}
      <div className="kodik-keyboard-row kodik-keyboard-controls">{!numeric && <><button onClick={() => setShift(value => !value)} aria-pressed={shift} aria-label="Заглавная буква">⇧</button><button onClick={() => setLayout(layout === 'ru' ? 'en' : 'ru')}>{layout === 'ru' ? 'EN' : 'РУ'}</button><button onClick={() => setLayout(layout === 'numbers' ? 'ru' : 'numbers')}>{layout === 'numbers' ? 'АБВ' : '123'}</button><button className="keyboard-space" onClick={() => press('Пробел')}>Пробел</button></>}<button onClick={() => press('⌫')} aria-label="Удалить последний символ">⌫</button><button className="keyboard-done" onClick={onDone}>Готово</button></div>
    </div>
  </div>
}
