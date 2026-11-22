import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  PlayMode,
} from '../types';
import { COLLECTION_BASE_IDS, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import {
  makeAttributeShapeSvg,
  makeOrientationBadgeSvg,
  makePatternBadgeSvg,
  makeSizeBadgeSvg,
  makeTurquoisePatternShapeSvg,
  ORIENTATION_LABELS,
  PATTERN_SHAPE_LABELS,
  PATTERN_STYLE_LABELS,
  type AttrOrientationId,
  type AttrShapeId,
  type PatternShapeId,
  type PatternStyleId,
} from '../data/specialArt';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

export type MatrixCombinationMode = 'forma-patron' | 'forma-orientacion' | 'tema-tamano';

interface AttrPiece {
  id: string;
  label: string;
  src: string;
  targetKey: string;
  scaleFactor?: number; // For Temática × Tamaño visual scaling!
}

interface AttrGroupDef {
  id: string;
  name: string;
  exampleSrc: string;
  accentColor: string;
}

interface AttrMatrixDef {
  rowAxisLabel: string;
  colAxisLabel: string;
  rows: { id: string; name: string; exampleSrc: string }[];
  cols: { id: string; name: string; badgeSrc: string }[];
}

interface DragState {
  pieceId: string;
  src: string;
  scaleFactor?: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  hoveredKey: string | null;
}

interface AttributeClassificationGameProps {
  activity: Activity;
  images: ImageItem[];
  themeId?: string;
  themeIds?: string[];
  mode: PlayMode;
  initialDifficulty: DifficultyLevel;
  progression: DifficultyProgression;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  showInitialDemo: boolean;
  onDemoSeen: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

const SHAPE_META: Record<AttrShapeId, { name: string; plural: string; color: string; stroke: string }> = {
  circulo: { name: 'Círculo', plural: 'Círculos', color: '#2A9D8F', stroke: '#195E56' },
  triangulo: { name: 'Triángulo', plural: 'Triángulos', color: '#DD6B4D', stroke: '#7D3521' },
  cuadrado: { name: 'Cuadrado', plural: 'Cuadrados', color: '#466094', stroke: '#253759' },
  flecha: { name: 'Flecha', plural: 'Flechas', color: '#2A9D8F', stroke: '#185A53' },
  casa: { name: 'Casa', plural: 'Casas', color: '#D98A1F', stroke: '#784A0C' },
  bandera: { name: 'Bandera', plural: 'Banderas', color: '#C0567B', stroke: '#6E2841' },
};

const PIECE_PALETTE = [
  { color: '#2A9D8F', stroke: '#185A53' },
  { color: '#DD6B4D', stroke: '#7D3521' },
  { color: '#D98A1F', stroke: '#784A0C' },
  { color: '#466094', stroke: '#253759' },
  { color: '#5B8E55', stroke: '#2F522B' },
];

const MATRIX_MODE_LABELS: Record<MatrixCombinationMode, string> = {
  'forma-orientacion': 'Forma × Orientación',
  'forma-patron': 'Forma × Patrón',
  'tema-tamano': 'Temática × Tamaño',
};

const SIZE_SPECS: { id: 'pequeno' | 'mediano' | 'grande'; label: string; scale: number }[] = [
  { id: 'pequeno', label: 'Pequeño', scale: 0.56 },
  { id: 'mediano', label: 'Mediano', scale: 0.78 },
  { id: 'grande', label: 'Grande', scale: 1.0 },
];

export function AttributeClassificationGame({
  activity,
  images,
  themeId,
  themeIds,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: AttributeClassificationGameProps) {
  const [levelIndex, setLevelIndex] = useState(
    Math.max(0, DIFFICULTY_ORDER.indexOf(initialDifficulty))
  );
  const [matrixMode, setMatrixMode] = useState<MatrixCombinationMode>('forma-orientacion');
  const [roundNumber, setRoundNumber] = useState(1);

  const [groupsDef, setGroupsDef] = useState<AttrGroupDef[]>([]);
  const [matrixDef, setMatrixDef] = useState<AttrMatrixDef | null>(null);
  const [pieces, setPieces] = useState<AttrPiece[]>([]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [checkedResults, setCheckedResults] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [shakePieceId, setShakePieceId] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const currentLevel = DIFFICULTY_ORDER[Math.min(levelIndex, DIFFICULTY_ORDER.length - 1)];

  // Candidate pieces from ALL active themes (1, several, or all) for "Temática × Tamaño"
  const themePieces = useMemo(() => {
    const targetCols =
      themeIds && themeIds.length > 0
        ? themeIds
        : activity.collectionIds.length > 0
          ? activity.collectionIds
          : [themeId || 'transportes'];

    const seen = new Set<string>();
    const found: ImageItem[] = [];
    for (const colId of targetCols) {
      const baseIds = COLLECTION_BASE_IDS[colId];
      if (baseIds) {
        for (const id of baseIds) {
          if (seen.has(id)) continue;
          const img = images.find((i) => i.id === id);
          if (img) {
            seen.add(id);
            found.push(img);
          }
        }
      } else {
        for (const img of images) {
          if (img.collectionId === colId && img.kind === 'piece' && !seen.has(img.id)) {
            seen.add(img.id);
            found.push(img);
          }
        }
      }
    }
    if (found.length >= 3) return found;
    return images.filter((i) => i.kind === 'piece').slice(0, 8);
  }, [images, themeId, themeIds, activity.collectionIds]);

  const buildRound = useCallback(
    (lvl: DifficultyLevel, mMode: MatrixCombinationMode) => {
      setPlacements({});
      setSelectedPieceId(null);
      setCheckedResults({});
      setHintText(null);
      setRoundComplete(false);

      if (lvl === 'inicial' || lvl === 'sencillo') {
        const shapesPool: AttrShapeId[] =
          lvl === 'inicial'
            ? shuffleArray<AttrShapeId>(['circulo', 'triangulo', 'cuadrado']).slice(0, 2)
            : ['circulo', 'cuadrado', 'triangulo'];

        const gDefs: AttrGroupDef[] = shapesPool.map((sh) => ({
          id: sh,
          name: SHAPE_META[sh].plural,
          exampleSrc: makeAttributeShapeSvg(sh, '#E5D8BF', '#586475', 'arriba', false),
          accentColor: SHAPE_META[sh].color,
        }));

        const generated: AttrPiece[] = [];
        shapesPool.forEach((sh) => {
          const colors = shuffleArray(PIECE_PALETTE).slice(0, 2);
          colors.forEach((pal, idx) => {
            generated.push({
              id: `attr-${sh}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
              label: SHAPE_META[sh].name,
              src: makeAttributeShapeSvg(sh, pal.color, pal.stroke, 'arriba', idx % 2 === 1),
              targetKey: sh,
            });
          });
        });

        setMatrixDef(null);
        setGroupsDef(gDefs);
        setPieces(shuffleArray(generated));
        return;
      }

      // DOUBLE-ENTRY MATRICES (Intermedio & Avanzado)
      if (mMode === 'forma-patron') {
        const shapes: PatternShapeId[] =
          lvl === 'intermedio'
            ? ['circulo', 'cuadrado', 'triangulo']
            : ['circulo', 'cuadrado', 'triangulo', 'ovalo'];
        const patterns: PatternStyleId[] =
          lvl === 'intermedio' ? ['liso', 'rayas'] : ['liso', 'rayas', 'lunares'];

        const mDef: AttrMatrixDef = {
          rowAxisLabel: 'Forma ↓',
          colAxisLabel: 'Patrón →',
          rows: shapes.map((sh) => ({
            id: sh,
            name: PATTERN_SHAPE_LABELS[sh],
            exampleSrc: makeTurquoisePatternShapeSvg(sh, 'liso'),
          })),
          cols: patterns.map((pat) => ({
            id: pat,
            name: PATTERN_STYLE_LABELS[pat],
            badgeSrc: makePatternBadgeSvg(pat),
          })),
        };

        const combos: { sh: PatternShapeId; pat: PatternStyleId }[] = [];
        for (const sh of shapes) {
          for (const pat of patterns) combos.push({ sh, pat });
        }
        const chosen = shuffleArray(combos).slice(0, lvl === 'intermedio' ? 6 : 8);
        const generated: AttrPiece[] = chosen.map((c, idx) => ({
          id: `pat-${c.sh}-${c.pat}-${idx}`,
          label: `${PATTERN_SHAPE_LABELS[c.sh]} ${PATTERN_STYLE_LABELS[c.pat].toLowerCase()}`,
          src: makeTurquoisePatternShapeSvg(c.sh, c.pat),
          targetKey: `${c.sh}::${c.pat}`,
        }));

        setGroupsDef([]);
        setMatrixDef(mDef);
        setPieces(shuffleArray(generated));
      } else if (mMode === 'tema-tamano' && themePieces.length >= 2) {
        const rowCount = lvl === 'intermedio' ? 2 : 3;
        const chosenItems = shuffleArray(themePieces).slice(0, Math.min(rowCount, themePieces.length));
        const sizes = lvl === 'intermedio' ? [SIZE_SPECS[0], SIZE_SPECS[2]] : SIZE_SPECS;

        const mDef: AttrMatrixDef = {
          rowAxisLabel: 'Dibujo ↓',
          colAxisLabel: 'Tamaño →',
          rows: chosenItems.map((img) => ({
            id: img.id,
            name: img.name,
            exampleSrc: img.src,
          })),
          cols: sizes.map((sz) => ({
            id: sz.id,
            name: sz.label,
            badgeSrc: makeSizeBadgeSvg(sz.id),
          })),
        };

        const combos: { img: ImageItem; sz: (typeof SIZE_SPECS)[number] }[] = [];
        for (const img of chosenItems) {
          for (const sz of sizes) combos.push({ img, sz });
        }
        const chosen = shuffleArray(combos).slice(0, Math.min(combos.length, lvl === 'intermedio' ? 4 : 7));
        const generated: AttrPiece[] = chosen.map((c, idx) => ({
          id: `sz-${c.img.id}-${c.sz.id}-${idx}`,
          label: `${c.img.name} (${c.sz.label.toLowerCase()})`,
          src: c.img.src,
          scaleFactor: c.sz.scale,
          targetKey: `${c.img.id}::${c.sz.id}`,
        }));

        setGroupsDef([]);
        setMatrixDef(mDef);
        setPieces(shuffleArray(generated));
      } else {
        // Default: Forma × Orientación
        const rowsShapes: AttrShapeId[] =
          lvl === 'intermedio' ? ['flecha', 'casa'] : ['flecha', 'casa', 'bandera'];
        const colOrientations: AttrOrientationId[] =
          lvl === 'intermedio'
            ? ['arriba', 'derecha', 'abajo']
            : ['arriba', 'derecha', 'abajo', 'izquierda'];

        const mDef: AttrMatrixDef = {
          rowAxisLabel: 'Forma ↓',
          colAxisLabel: 'Orientación →',
          rows: rowsShapes.map((sh) => ({
            id: sh,
            name: SHAPE_META[sh].name,
            exampleSrc: makeAttributeShapeSvg(
              sh,
              SHAPE_META[sh].color,
              SHAPE_META[sh].stroke,
              'arriba',
              false
            ),
          })),
          cols: colOrientations.map((ori) => ({
            id: ori,
            name: ORIENTATION_LABELS[ori],
            badgeSrc: makeOrientationBadgeSvg(ori),
          })),
        };

        const combos: { shape: AttrShapeId; orientation: AttrOrientationId }[] = [];
        for (const sh of rowsShapes) {
          for (const ori of colOrientations) combos.push({ shape: sh, orientation: ori });
        }
        const chosen = shuffleArray(combos).slice(0, lvl === 'intermedio' ? 6 : 8);
        const generated: AttrPiece[] = chosen.map((c, idx) => ({
          id: `mat-${c.shape}-${c.orientation}-${idx}`,
          label: `${SHAPE_META[c.shape].name} hacia ${ORIENTATION_LABELS[c.orientation].toLowerCase()}`,
          src: makeAttributeShapeSvg(
            c.shape,
            SHAPE_META[c.shape].color,
            SHAPE_META[c.shape].stroke,
            c.orientation,
            false
          ),
          targetKey: `${c.shape}::${c.orientation}`,
        }));

        setGroupsDef([]);
        setMatrixDef(mDef);
        setPieces(shuffleArray(generated));
      }
    },
    [themePieces]
  );

  useEffect(() => {
    buildRound(currentLevel, matrixMode);
  }, [buildRound, currentLevel, matrixMode]);

  const promptText = useMemo(() => {
    if (!matrixDef) {
      return 'Separa las piezas según su forma fijándote en el ejemplo de cada grupo';
    }
    if (matrixMode === 'forma-patron') {
      return 'Coloca cada figura según su forma y su patrón (liso, rayas o lunares)';
    }
    if (matrixMode === 'tema-tamano') {
      return 'Coloca cada dibujo en su fila fijándote en su tamaño';
    }
    return 'Coloca cada pieza en la cuadrícula fijándote en su forma y orientación';
  }, [matrixDef, matrixMode]);

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish(promptText, voiceEnabled);
    }
  }, [roundNumber, mode, promptText, voiceEnabled]);

  const placePiece = useCallback(
    (pieceId: string, targetKey: string) => {
      if (roundComplete) return;
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      setSelectedPieceId(null);

      if (mode === 'individual') {
        if (piece.targetKey === targetKey) {
          const next = { ...placements, [pieceId]: targetKey };
          setPlacements(next);
          setCheckedResults((prev) => ({ ...prev, [pieceId]: 'correct' }));
          setHintText(null);
          if (Object.keys(next).length >= pieces.length) {
            playSoundCue('success', soundEnabled);
            setRoundComplete(true);
            speakSpanish('¡Fantástico! Has clasificado todas las piezas correctamente.', voiceEnabled);
          } else {
            playSoundCue('match', soundEnabled);
          }
        } else {
          playSoundCue('retry', soundEnabled);
          setShakePieceId(pieceId);
          setHintText(
            matrixDef
              ? '¡Casi! Comprueba la fila y la columna antes de colocarla.'
              : '¡Casi! Compara la forma de la pieza con el ejemplo de cada grupo.'
          );
          window.setTimeout(() => setShakePieceId((c) => (c === pieceId ? null : c)), 420);
        }
      } else {
        playSoundCue('place', soundEnabled);
        setPlacements((prev) => ({ ...prev, [pieceId]: targetKey }));
        setCheckedResults((prev) => {
          if (!prev[pieceId]) return prev;
          const copy = { ...prev };
          delete copy[pieceId];
          return copy;
        });
        setHintText(null);
      }
    },
    [mode, placements, pieces, roundComplete, soundEnabled, voiceEnabled, matrixDef]
  );

  const returnToTray = useCallback(
    (pieceId: string) => {
      if (mode !== 'asamblea' || roundComplete) return;
      setPlacements((prev) => {
        const copy = { ...prev };
        delete copy[pieceId];
        return copy;
      });
      setCheckedResults((prev) => {
        const copy = { ...prev };
        delete copy[pieceId];
        return copy;
      });
      setSelectedPieceId(null);
    },
    [mode, roundComplete]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const active = cur.active || dist > 8;
      let hoveredKey: string | null = null;
      if (active) {
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const z = els.find((el) => el.getAttribute('data-attr-target'));
        hoveredKey = z?.getAttribute('data-attr-target') || null;
      }
      const next = { ...cur, x: e.clientX, y: e.clientY, active, hoveredKey };
      dragRef.current = next;
      setDragState(next);
    };

    const onUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      dragRef.current = null;
      setDragState(null);

      if (cur.active) {
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const z = els.find((el) => el.getAttribute('data-attr-target'));
        const key = z?.getAttribute('data-attr-target');
        const trayEl = els.find((el) => el.getAttribute('data-tray') === 'true');
        if (key) placePiece(cur.pieceId, key);
        else if (trayEl && mode === 'asamblea') returnToTray(cur.pieceId);
      } else {
        setSelectedPieceId((prev) => (prev === cur.pieceId ? null : cur.pieceId));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [mode, placePiece, returnToTray]);

  const startPointer = (e: React.PointerEvent, p: AttrPiece, locked: boolean) => {
    if (roundComplete || locked) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const init: DragState = {
      pieceId: p.id,
      src: p.src,
      scaleFactor: p.scaleFactor,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      hoveredKey: null,
    };
    dragRef.current = init;
    setDragState(init);
  };

  const handleAsambleaCheck = () => {
    const res: Record<string, 'correct' | 'wrong'> = {};
    let allOk = true;
    for (const p of pieces) {
      const placed = placements[p.id];
      if (!placed) allOk = false;
      else if (placed === p.targetKey) res[p.id] = 'correct';
      else {
        res[p.id] = 'wrong';
        allOk = false;
      }
    }
    setCheckedResults(res);
    if (allOk && Object.keys(placements).length === pieces.length) {
      playSoundCue('success', soundEnabled);
      setRoundComplete(true);
      setHintText(null);
    } else {
      playSoundCue('retry', soundEnabled);
      setHintText('Revisa las piezas marcadas y vuelve a pulsar «Comprobar».');
    }
  };

  const canStepUp = progression === 'progressive' && levelIndex < DIFFICULTY_ORDER.length - 1;

  const handleNextRound = (stepUp: boolean) => {
    const nextIdx = stepUp ? Math.min(DIFFICULTY_ORDER.length - 1, levelIndex + 1) : levelIndex;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setLevelIndex(nextIdx);
    }
    setRoundNumber((r) => r + 1);
    buildRound(DIFFICULTY_ORDER[nextIdx], matrixMode);
  };

  const trayPieces = pieces.filter((p) => !placements[p.id]);

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!roundComplete && (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={handleAsambleaCheck}
            disabled={Object.keys(placements).length === 0}
          >
            <CheckCircle2 size={22} /> Comprobar
          </button>
        )}
        {roundComplete && canStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} /> Subir dificultad
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {roundComplete && !canStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Nueva ronda
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(currentLevel, matrixMode)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  return (
    <GameShell
      title={activity.title}
      gameType="classification"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${
        matrixDef ? MATRIX_MODE_LABELS[matrixMode] : `${groupsDef.length} formas`
      }`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(currentLevel, matrixMode)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="classification-layout">
        <div className="game-prompt-bar" style={{ marginBottom: 4, flexDirection: 'column', gap: 8 }}>
          <h2 className="game-prompt-text">{promptText}</h2>

          {/* Matrix combination selector when in Intermedio / Avanzado! */}
          {matrixDef && (
            <div className="segmented" style={{ maxWidth: 660 }} role="group" aria-label="Combinación de cuadrícula">
              {(
                ['forma-orientacion', 'forma-patron', 'tema-tamano'] as MatrixCombinationMode[]
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`matrix-mode-${m}`}
                  className={matrixMode === m ? 'active' : ''}
                  onClick={() => setMatrixMode(m)}
                >
                  {MATRIX_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          )}

          {selectedPieceId && !roundComplete && (
            <span className="chip chip-teal">Ahora toca la casilla correspondiente</span>
          )}
        </div>

        {/* MODE A: 2 or 3 Shape Groups with Visible Guide Example */}
        {!matrixDef && (
          <div className="classification-zones">
            {groupsDef.map((g) => {
              const placedHere = pieces.filter((p) => placements[p.id] === g.id);
              const isHovered = dragState?.active && dragState.hoveredKey === g.id;
              return (
                <div
                  key={g.id}
                  data-attr-target={g.id}
                  data-testid={`attr-group-${g.id}`}
                  role="button"
                  tabIndex={0}
                  className={`classification-zone ${isHovered ? 'drop-target' : ''} ${
                    selectedPieceId && !roundComplete ? 'tap-ready' : ''
                  }`}
                  onClick={() => selectedPieceId && placePiece(selectedPieceId, g.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && selectedPieceId) {
                      e.preventDefault();
                      placePiece(selectedPieceId, g.id);
                    }
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      background: 'var(--bg-card-subtle)',
                      borderBottom: `4px solid ${g.accentColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: 16,
                        background: '#fffdf8',
                        border: '2.5px dashed var(--border-strong)',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img src={g.exampleSrc} alt={`Ejemplo de ${g.name}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                        Ejemplo guía
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
                        {g.name}
                      </div>
                    </div>
                  </div>

                  <div className="zone-items">
                    {placedHere.length === 0 && (
                      <span style={{ color: 'var(--ink-muted)', fontWeight: 600, alignSelf: 'center' }}>
                        {selectedPieceId ? 'Toca aquí' : 'Coloca aquí'}
                      </span>
                    )}
                    {placedHere.map((p) => {
                      const status = checkedResults[p.id];
                      const locked = mode === 'individual' || roundComplete;
                      return (
                        <div
                          key={p.id}
                          className={`piece-token in-zone ${selectedPieceId === p.id ? 'selected' : ''} ${
                            status === 'correct' ? 'status-correct' : ''
                          } ${status === 'wrong' ? 'status-wrong' : ''}`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startPointer(e, p, locked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img src={p.src} alt={p.label} />
                          {status === 'correct' && (
                            <span className="matched-badge" style={{ width: 22, height: 22, top: 4, right: 4 }}>
                              <Check size={13} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE B: Double-Entry Matrix (Forma×Orientación / Forma×Patrón / Temática×Tamaño) */}
        {matrixDef && (
          <div className="attr-matrix-wrap" data-testid="attr-matrix">
            <div
              className="attr-matrix-grid"
              style={{
                gridTemplateColumns: `minmax(96px, 130px) repeat(${matrixDef.cols.length}, minmax(88px, 1fr))`,
              }}
            >
              <div className="attr-matrix-corner">
                <span>{matrixDef.rowAxisLabel}</span>
                <span>{matrixDef.colAxisLabel}</span>
              </div>

              {matrixDef.cols.map((col) => (
                <div key={col.id} className="attr-matrix-colhead">
                  <img src={col.badgeSrc} alt={col.name} />
                  <span>{col.name}</span>
                </div>
              ))}

              {matrixDef.rows.map((row) => (
                <div key={row.id} style={{ display: 'contents' }}>
                  <div className="attr-matrix-rowhead">
                    <img src={row.exampleSrc} alt={row.name} />
                    <span>{row.name}</span>
                  </div>

                  {matrixDef.cols.map((col) => {
                    const cellKey = `${row.id}::${col.id}`;
                    const placedHere = pieces.filter((p) => placements[p.id] === cellKey);
                    const isHovered = dragState?.active && dragState.hoveredKey === cellKey;
                    const isTapReady = Boolean(selectedPieceId) && !roundComplete;

                    return (
                      <div
                        key={cellKey}
                        data-attr-target={cellKey}
                        data-testid={`attr-cell-${row.id}-${col.id}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${row.name} — ${col.name}`}
                        className={`attr-matrix-cell ${isHovered ? 'drop-target' : ''} ${
                          isTapReady ? 'tap-ready' : ''
                        }`}
                        onClick={() => selectedPieceId && placePiece(selectedPieceId, cellKey)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && selectedPieceId) {
                            e.preventDefault();
                            placePiece(selectedPieceId, cellKey);
                          }
                        }}
                      >
                        {placedHere.map((p) => {
                          const status = checkedResults[p.id];
                          const locked = mode === 'individual' || roundComplete;
                          return (
                            <div
                              key={p.id}
                              className={`piece-token matrix-token ${
                                selectedPieceId === p.id ? 'selected' : ''
                              } ${status === 'correct' ? 'status-correct' : ''} ${
                                status === 'wrong' ? 'status-wrong' : ''
                              }`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                startPointer(e, p, locked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={p.src}
                                alt={p.label}
                                style={
                                  p.scaleFactor
                                    ? { transform: `scale(${p.scaleFactor})` }
                                    : undefined
                                }
                              />
                              {status === 'correct' && (
                                <span className="matched-badge" style={{ width: 20, height: 20, top: 2, right: 2 }}>
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {hintText && !roundComplete && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="feedback-banner warn" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.animo} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
              {hintText}
            </div>
          </div>
        )}

        {roundComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
              <Sparkles size={20} /> ¡Excelente! Has clasificado todas las piezas atendiendo a sus rasgos.
            </div>
            {mode === 'individual' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(canStepUp)}
                >
                  {canStepUp ? (
                    <>
                      <TrendingUp size={20} /> Subir al siguiente reto
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Nueva ronda
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {!roundComplete && (
          <div
            className="classification-tray"
            data-tray="true"
            onClick={() => {
              if (selectedPieceId && placements[selectedPieceId] && mode === 'asamblea') {
                returnToTray(selectedPieceId);
              }
            }}
          >
            {trayPieces.length === 0 ? (
              <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>
                Todas las piezas están colocadas. Pulsa «Comprobar» cuando el grupo esté listo.
              </span>
            ) : (
              trayPieces.map((p) => {
                const isDragging = dragState?.active && dragState.pieceId === p.id;
                const isSelected = selectedPieceId === p.id;
                const isShaking = shakePieceId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-testid={`attr-piece-${p.id}`}
                    data-target-key={p.targetKey}
                    className={`piece-token ${isSelected ? 'selected' : ''} ${
                      isShaking ? 'shake-once status-wrong' : ''
                    }`}
                    style={{ opacity: isDragging ? 0.3 : 1 }}
                    aria-label={p.label}
                    onPointerDown={(e) => startPointer(e, p, false)}
                  >
                    <img
                      src={p.src}
                      alt={p.label}
                      style={
                        p.scaleFactor ? { transform: `scale(${p.scaleFactor})` } : undefined
                      }
                    />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {dragState?.active && (
        <div className="drag-ghost" style={{ left: dragState.x, top: dragState.y }} aria-hidden="true">
          <img
            src={dragState.src}
            alt=""
            style={
              dragState.scaleFactor ? { transform: `scale(${dragState.scaleFactor})` } : undefined
            }
          />
        </div>
      )}
    </GameShell>
  );
}
