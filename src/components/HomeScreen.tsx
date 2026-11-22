import {
  FolderHeart,
  Images,
  Monitor,
  Play,
  Printer,
  Sparkles,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { Activity, GameType, ImageItem } from '../types';
import { MASCOT } from '../data/catalog';
import { CardBackEmblem, GamePictogram, GAME_TYPE_META } from './GameIcons';

interface HomeScreenProps {
  playableActivitiesCount: number;
  customImagesCount: number;
  builtInImagesCount: number;
  quickStartActivity?: Activity;
  previewImages: ImageItem[];
  onNavigate: (tab: 'play' | 'images' | 'games') => void;
  onQuickStart: () => void;
}

const EIGHT_GAMES: GameType[] = [
  'memory',
  'what-changed',
  'sequence',
  'matching',
  'classification',
  'intruder',
  'dobble',
  'pattern',
];

export function HomeScreen({
  playableActivitiesCount,
  customImagesCount,
  builtInImagesCount,
  quickStartActivity,
  previewImages,
  onNavigate,
  onQuickStart,
}: HomeScreenProps) {
  const fanImgs = previewImages.slice(0, 4);
  const totalImages = builtInImagesCount + customImagesCount;

  return (
    <div className="home-wrapper">
      <div className="home-showcase">
        {/* LEFT: Illustrated Board-Game Cover Presentation */}
        <section className="home-cover-board" aria-label="Presentación de Mira y Recuerda">
          {/* Top badge bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span className="home-eyebrow">
              <Sparkles size={15} /> Juego de mesa ilustrado · Desde 3 años hasta adultos
            </span>
            <span className="chip chip-teal" style={{ fontSize: '0.82rem' }}>
              Castellano · PDI y Tablet
            </span>
          </div>

          {/* Title & presentation copy */}
          <div style={{ textAlign: 'left' }}>
            <h1 className="home-cover-title">Mira y Recuerda</h1>
            <p className="home-cover-lead">
              Entrena la <strong>observación</strong>, la <strong>memoria visual</strong> y la{' '}
              <strong>clasificación lógica</strong> con ilustraciones cálidas listas para jugar en
              el aula, en rincones o en casa.
            </p>
          </div>

          {/* Illustrated centerpiece: Fox Mascot + Fanned Board-Game Cards */}
          <div className="home-cover-stage">
            <div className="home-mascot-spotlight">
              <img
                src={MASCOT.saludo}
                alt="Zorro mascota de Mira y Recuerda saludando"
                className="home-mascot-hero"
              />
            </div>

            <div className="home-card-fan" aria-hidden="true">
              {/* Decorative card back peeking behind */}
              <div className="home-fan-card fan-back">
                <div className="memory-back-pattern" style={{ borderRadius: 10 }}>
                  <CardBackEmblem size={34} />
                </div>
              </div>
              {fanImgs.map((img, idx) => (
                <div key={img.id} className={`home-fan-card fan-pos-${idx}`}>
                  <img src={img.src} alt="" />
                </div>
              ))}
            </div>
          </div>

          {/* 8 Games visual showcase strip */}
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--ink-muted)',
                marginBottom: 8,
              }}
            >
              8 juegos incluidos · Niveles Inicial a Avanzado
            </div>
            <div className="home-games-strip">
              {EIGHT_GAMES.map((gt) => (
                <button
                  key={gt}
                  type="button"
                  className="home-game-pill"
                  onClick={() => onNavigate('play')}
                  title={GAME_TYPE_META[gt].shortDesc}
                >
                  <GamePictogram type={gt} size={22} />
                  <span>{GAME_TYPE_META[gt].name.replace(' de parejas', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Play Actions */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-xl"
              style={{ flex: '1.2 1 0', padding: '15px 24px', fontSize: '1.22rem' }}
              onClick={() => onNavigate('play')}
              data-testid="home-btn-jugar"
            >
              <Play size={22} fill="currentColor" /> Jugar ahora
            </button>

            {quickStartActivity && (
              <button
                type="button"
                className="btn btn-coral btn-lg"
                style={{ flex: '1 1 0', padding: '15px 18px', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
                onClick={onQuickStart}
                data-testid="home-btn-quick-start"
              >
                <Zap size={19} /> Inicio rápido (2 parejas)
              </button>
            )}
          </div>
        </section>

        {/* RIGHT: Key Highlights + Mis imágenes + Mis juegos */}
        <aside className="home-right-col">
          {/* 3 Feature Highlight Tokens */}
          <div className="home-highlights-row" aria-label="Características principales">
            <div className="home-stat-tile">
              <strong style={{ color: 'var(--accent-teal)' }}>13</strong>
              <span>Temáticas</span>
            </div>
            <div className="home-stat-tile">
              <strong style={{ color: 'var(--accent-coral)' }}>{totalImages}</strong>
              <span>Ilustraciones</span>
            </div>
            <div className="home-stat-tile">
              <strong style={{ color: 'var(--accent-indigo)' }}>8</strong>
              <span>Juegos</span>
            </div>
          </div>

          {/* Value Badges */}
          <div className="home-badges-strip">
            <span className="chip chip-sage">
              <WifiOff size={14} /> Sin cuentas ni internet
            </span>
            <span className="chip chip-indigo">
              <Monitor size={14} /> Modo PDI y Rincones
            </span>
            <span className="chip chip-amber">
              <Printer size={14} /> Tarjetas en PDF
            </span>
          </div>

          {/* Entry 2: Mis imágenes */}
          <button
            type="button"
            className="home-entry-card"
            onClick={() => onNavigate('images')}
            data-testid="home-btn-imagenes"
          >
            <div className="home-entry-mascot" style={{ background: 'var(--accent-amber-soft)' }}>
              <img src={MASCOT.lupa} alt="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Images size={19} color="#b96f0e" />
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  Mis imágenes
                </h2>
              </div>
              <p style={{ margin: '0 0 8px', color: 'var(--ink-secondary)', fontSize: '0.88rem', lineHeight: 1.38 }}>
                Explora las 13 colecciones, recorta láminas 2×4 en un clic, sube fotos propias y
                define parejas reutilizables.
              </p>
              <span className="chip chip-amber" style={{ fontSize: '0.78rem' }}>
                {totalImages} imágenes · Siluetas automáticas
              </span>
            </div>
          </button>

          {/* Entry 3: Mis juegos */}
          <button
            type="button"
            className="home-entry-card"
            onClick={() => onNavigate('games')}
            data-testid="home-btn-juegos"
          >
            <div className="home-entry-mascot" style={{ background: 'var(--accent-indigo-soft)' }}>
              <img src={MASCOT.celebra} alt="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <FolderHeart size={19} color="var(--accent-indigo)" />
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  Mis juegos
                </h2>
              </div>
              <p style={{ margin: '0 0 8px', color: 'var(--ink-secondary)', fontSize: '0.88rem', lineHeight: 1.38 }}>
                Crea actividades mezclando temáticas, imprime tarjetas en A4 y comparte partidas en
                un único archivo.
              </p>
              <span className="chip chip-indigo" style={{ fontSize: '0.78rem' }}>
                {playableActivitiesCount} actividades guardadas
              </span>
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}
