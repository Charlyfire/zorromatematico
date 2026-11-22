import { Hand, Play, X } from 'lucide-react';
import type { GameType } from '../types';
import { MASCOT } from '../data/catalog';
import { GamePictogram, GAME_TYPE_META } from '../components/GameIcons';

interface DemoOverlayProps {
  gameType: GameType;
  onClose: () => void;
}

const DEMO_STEPS: Record<GameType, { headline: string; caption: string }> = {
  memory: {
    headline: 'Toca dos cartas para darles la vuelta',
    caption: 'Si hacen pareja se quedan descubiertas. ¡Intenta recordar dónde está cada dibujo!',
  },
  classification: {
    headline: 'Lleva cada pieza a su lugar',
    caption: 'Puedes arrastrarla con el dedo o tocar primero la pieza y después el grupo o casilla.',
  },
  matching: {
    headline: 'Mira el dibujo o fragmento de arriba y busca su pareja',
    caption: 'Toca la silueta o la imagen que corresponde al modelo principal.',
  },
  'what-changed': {
    headline: 'Mira bien y pulsa «Ya lo he visto»',
    caption: 'El tablero se tapará un momento. Descubre qué desapareció, se movió, giró o intercambió su sitio.',
  },
  sequence: {
    headline: 'Fíjate en el orden y reconstrúyelo',
    caption: 'Observa los dibujos numerados, pulsa «Ya lo he visto» y colócalos después en el mismo orden.',
  },
  intruder: {
    headline: 'Piensa qué tienen en común y señala al intruso',
    caption: 'Todos los dibujos son distintos, pero uno no pertenece a la misma familia o categoría.',
  },
  dobble: {
    headline: '¡Ojo de lince! Busca el dibujo repetido',
    caption: 'Compara las dos cartas circulares: solo hay un dibujo que aparece en las dos. ¡Tócalo!',
  },
  pattern: {
    headline: 'Descubre el ritmo y completa la serie',
    caption: 'Observa cómo se alternan o cambian los dibujos y elige qué ficha va en el hueco «?».',
  },
};

export function DemoOverlay({ gameType, onClose }: DemoOverlayProps) {
  const meta = GAME_TYPE_META[gameType];
  const step = DEMO_STEPS[gameType];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cómo se juega">
      <div className="modal-panel" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className={`chip ${meta.chipClass}`}>{meta.name}</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar ayuda">
            <X size={20} />
          </button>
        </div>

        {/* Visual gesture stage */}
        <div
          style={{
            background: '#f7f1e3',
            border: '2.5px solid #e5d8bf',
            borderRadius: 22,
            padding: '24px 16px',
            marginBottom: 18,
            position: 'relative',
            minHeight: 170,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {gameType === 'memory' && (
            <div style={{ display: 'flex', gap: 18, position: 'relative', alignItems: 'center' }}>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 16,
                  background: '#fffdf8',
                  border: '3px solid #218a80',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <img src="/assets/transportes/bicicleta.png" alt="Bicicleta" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 16,
                  background: '#218a80',
                  border: '3px solid #fffdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                }}
              >
                ★
              </div>
              <div
                className="demo-hand-tap"
                style={{
                  position: 'absolute',
                  left: 24,
                  bottom: -22,
                  background: '#fffdf8',
                  border: '2px solid #d98a1f',
                  borderRadius: 999,
                  padding: 7,
                  color: '#d98a1f',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                }}
              >
                <Hand size={22} />
              </div>
            </div>
          )}

          {gameType === 'classification' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <img
                  src="/assets/transportes/escenario-tierra.png"
                  alt="Tierra"
                  style={{ width: 74, height: 54, borderRadius: 12, objectFit: 'cover', border: '2.5px solid #5b8e55' }}
                />
                <img
                  src="/assets/transportes/escenario-agua.png"
                  alt="Agua"
                  style={{ width: 74, height: 54, borderRadius: 12, objectFit: 'cover', border: '2.5px solid #2575b5' }}
                />
                <img
                  src="/assets/transportes/escenario-aire.png"
                  alt="Aire"
                  style={{ width: 74, height: 54, borderRadius: 12, objectFit: 'cover', border: '2.5px solid #3b9ad9' }}
                />
              </div>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 16,
                  background: '#fffdf8',
                  border: '3px solid #218a80',
                  padding: 6,
                }}
              >
                <img src="/assets/transportes/velero.png" alt="Velero" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div
                className="demo-hand-drag"
                style={{
                  position: 'absolute',
                  top: 64,
                  background: '#fffdf8',
                  border: '2px solid #d98a1f',
                  borderRadius: 999,
                  padding: 7,
                  color: '#d98a1f',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                }}
              >
                <Hand size={22} />
              </div>
            </div>
          )}

          {gameType === 'matching' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, background: '#fffdf8', border: '3px solid #218a80', padding: 6 }}>
                <img src="/assets/transportes/globo.png" alt="Globo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: '#fffdf8', border: '2px solid #e5d8bf', padding: 6 }}>
                  <img src="/assets/transportes/bicicleta-silueta.png" alt="Silueta" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: '#e5f3e6', border: '3px solid #4c8650', padding: 6 }}>
                  <img src="/assets/transportes/globo-silueta.png" alt="Silueta correcta" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: '#fffdf8', border: '2px solid #e5d8bf', padding: 6 }}>
                  <img src="/assets/transportes/velero-silueta.png" alt="Silueta" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          )}

          {gameType === 'what-changed' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GamePictogram type="what-changed" size={74} />
              <span className="chip chip-amber">Mira → «Ya lo he visto» → Descubre el cambio</span>
            </div>
          )}

          {gameType === 'sequence' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GamePictogram type="sequence" size={74} />
              <span className="chip chip-indigo">1 → 2 → 3 · Recuerda y coloca en orden</span>
            </div>
          )}

          {gameType === 'intruder' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GamePictogram type="intruder" size={74} />
              <span className="chip chip-coral">¿Cuál no pertenece a este grupo?</span>
            </div>
          )}

          {gameType === 'dobble' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GamePictogram type="dobble" size={74} />
              <span className="chip chip-amber">1 solo dibujo repetido entre las dos cartas</span>
            </div>
          )}

          {gameType === 'pattern' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GamePictogram type="pattern" size={74} />
              <span className="chip chip-indigo">A · B · A · ? · Continúa el ritmo</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, textAlign: 'left' }}>
          <img
            src={MASCOT.lupa}
            alt="Mascota zorro con lupa"
            style={{ width: 82, height: 82, objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: '1.28rem' }}>
              {step.headline}
            </h2>
            <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.96rem', lineHeight: 1.45 }}>
              {step.caption}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
            <Play size={20} /> ¡Empezar a jugar!
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Omitir
          </button>
        </div>
      </div>
    </div>
  );
}
