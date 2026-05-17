import { PhaserGame } from '../game/PhaserGame'
import { BattleHud } from './pages/BattleHud'
import { TitlePage } from './pages/TitlePage'

export function App() {
  return (
    <main className="app-shell">
      <TitlePage />
      <section className="battle-layout" aria-label="测试战斗">
        <PhaserGame />
        <BattleHud />
      </section>
    </main>
  )
}
