import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  Activity,
  CollectionItem,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  PlayMode,
} from '../types';
import {
  COLLECTION_BASE_IDS,
  DEFAULT_DIFFICULTY_CONFIG,
  DIFFICULTY_ORDER,
  MASCOT,
} from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

interface IntruderRound {
  items: ImageItem[];
  intruderId: string;
  ruleExplanation: string;
  hintMessage: string;
}

interface IntruderGameProps {
  activity: Activity;
  collections: CollectionItem[];
  images: ImageItem[];
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

// Curated semantic sub-groups for Intermedio & Avanzado (so the rule is truly clever & solvable!)
interface SubCategoryRule {
  label: string;
  groupIds: string[];
  intruderIds: string[];
  hint: string;
}

const SUBCATEGORY_RULES: SubCategoryRule[] = [
  {
    label: 'van por tierra',
    groupIds: ['tr-bicicleta', 'tr-autobus', 'tr-tren', 'tr-ambulancia'],
    intruderIds: ['tr-avion', 'tr-helicoptero', 'tr-globo', 'tr-velero'],
    hint: 'Piensa por dónde se desplaza cada vehículo.',
  },
  {
    label: 'vuelan por el aire',
    groupIds: ['tr-avion', 'tr-helicoptero', 'tr-globo', 'esp-cohete'],
    intruderIds: ['tr-bicicleta', 'tr-autobus', 'tr-tren', 'tr-velero'],
    hint: '¿Cuáles van por el cielo y cuál no?',
  },
  {
    label: 'son animales que viven en el agua',
    groupIds: ['pol-orca', 'pol-narval', 'pol-foca', 'pol-morsa', 'mas-pez'],
    intruderIds: ['pol-oso', 'pol-zorro', 'pol-reno', 'grj-vaca', 'abq-zorro'],
    hint: 'Fíjate en cuáles nadan en el agua y cuál vive en tierra.',
  },
  {
    label: 'son animales de granja',
    groupIds: ['grj-vaca', 'grj-cerdo', 'grj-oveja', 'grj-cabra', 'grj-caballo', 'grj-gallina', 'grj-pato', 'grj-burro'],
    intruderIds: ['pol-pinguino', 'pol-oso', 'abq-zorro', 'abq-ciervo', 'abq-buho', 'mas-geco'],
    hint: 'Todos menos uno viven en la granja.',
  },
  {
    label: 'son frutas dulces',
    groupIds: ['fru-manzana', 'fru-pera', 'fru-naranja', 'fru-limon', 'fru-kiwi'],
    intruderIds: ['fru-zanahoria', 'fru-pimiento', 'fru-berenjena', 'fru-tomate'],
    hint: 'Piensa cuáles son frutas y cuál es una hortaliza.',
  },
  {
    label: 'son prendas de abrigo y vestir',
    groupIds: ['rop-abrigo', 'rop-calcetin', 'rop-guante', 'rop-gorro', 'rop-bufanda', 'rop-bota', 'rop-camiseta', 'rop-pantalon'],
    intruderIds: ['esc-mochila', 'esc-estuche', 'jug-osito', 'pla-toalla'],
    hint: '¿Cuáles te pones para vestirte?',
  },
  {
    label: 'se usan en el cole para escribir o dibujar',
    groupIds: ['esc-lapiz', 'esc-goma', 'esc-pincel', 'esc-regla', 'esc-sacapuntas', 'esc-tijeras', 'esc-pegamento'],
    intruderIds: ['coc-cuchara', 'coc-tenedor', 'coc-espatula', 'pla-pala'],
    hint: 'Piensa cuáles pertenecen al estuche del aula.',
  },
  {
    label: 'son utensilios de cocina',
    groupIds: ['coc-taza', 'coc-cuchara', 'coc-tenedor', 'coc-cazo', 'coc-colador', 'coc-jarra', 'coc-rallador', 'coc-espatula'],
    intruderIds: ['pla-cubo', 'pla-pala', 'esc-tijeras', 'esc-regla'],
    hint: '¿Cuáles usas en la cocina para preparar o servir comida?',
  },
  {
    label: 'son elementos del espacio exterior',
    groupIds: ['esp-astronauta', 'esp-cohete', 'esp-cometa', 'esp-luna', 'esp-satelite', 'esp-saturno', 'esp-sol', 'esp-tierra'],
    intruderIds: ['tr-avion', 'tr-globo', 'jug-cometa', 'jug-pelota'],
    hint: '¿Cuáles están en el espacio exterior y cuál no?',
  },
  {
    label: 'son animales del bosque',
    groupIds: ['abq-zorro', 'abq-ardilla', 'abq-erizo', 'abq-ciervo', 'abq-jabali', 'abq-buho', 'abq-tejon', 'abq-conejo'],
    intruderIds: ['pol-zorro', 'pol-reno', 'grj-cabra', 'mas-perro', 'mas-gato'],
    hint: 'Fíjate bien en qué hábitat vive cada animal.',
  },
];

// Map collections to "near" (trickier) vs "far" (very obvious for Inicial) intruder collections
const NEAR_COLLECTIONS: Record<string, string[]> = {
  'animales-granja': ['animales-bosque', 'animales-polares', 'mascotas'],
  'animales-bosque': ['animales-granja', 'animales-polares', 'mascotas'],
  'animales-polares': ['animales-bosque', 'animales-granja', 'mascotas'],
  mascotas: ['animales-granja', 'animales-bosque', 'animales-polares'],
  transportes: ['el-espacio', 'juguetes-juegos'],
  'el-espacio': ['transportes', 'juguetes-juegos'],
  'material-escolar': ['utensilios-cocina', 'juguetes-juegos'],
  'utensilios-cocina': ['material-escolar', 'en-la-playa'],
  'ropa-complementos': ['material-escolar', 'en-la-playa'],
  'frutas-hortalizas': ['paseo-bosque', 'utensilios-cocina'],
  'paseo-bosque': ['frutas-hortalizas', 'animales-bosque'],
  'juguetes-juegos': ['en-la-playa', 'material-escolar'],
  'en-la-playa': ['juguetes-juegos', 'paseo-bosque'],
};

export function IntruderGame({
  activity,
  collections,
  images,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: IntruderGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const colMap = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);
  const cfg = activity.intruderConfig!;
  const diffTable = activity.difficultyConfig?.intruder || DEFAULT_DIFFICULTY_CONFIG.intruder;

  const baseGroupItems = useMemo(
    () => cfg.groupItemIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i)),
    [cfg.groupItemIds, imageMap]
  );

  const [levelIdx, setLevelIdx] = useState(
    Math.max(0, DIFFICULTY_ORDER.indexOf(initialDifficulty))
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [solvedAtLevel, setSolvedAtLevel] = useState(0);

  const [round, setRound] = useState<IntruderRound | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);

  const currentLevel = DIFFICULTY_ORDER[Math.min(levelIdx, DIFFICULTY_ORDER.length - 1)];

  const buildRound = useCallback(
    (lvl: DifficultyLevel) => {
      const spec = diffTable[lvl];
      const total = Math.max(4, spec.totalItems);
      const allowedCols =
        cfg.allowedCollectionIds && cfg.allowedCollectionIds.length > 0
          ? cfg.allowedCollectionIds
          : [cfg.baseCollectionId || activity.collectionIds[0] || 'transportes'];
      // Pick one of the chosen collections fresh each round so multi-theme / "Todas" stays unambiguous & varied!
      const roundColId = allowedCols[Math.floor(Math.random() * allowedCols.length)];
      const baseColId = roundColId;

      // Custom activity with explicit intruderItemIds
      if (cfg.intruderItemIds && cfg.intruderItemIds.length > 0 && baseGroupItems.length >= 3) {
        const customIntruders = cfg.intruderItemIds
          .map((id) => imageMap.get(id))
          .filter((i): i is ImageItem => Boolean(i));
        if (customIntruders.length > 0) {
          const pickedGroup = shuffleArray(baseGroupItems).slice(0, Math.min(baseGroupItems.length, total - 1));
          const intruder = customIntruders[Math.floor(Math.random() * customIntruders.length)];
          setRound({
            items: shuffleArray([...pickedGroup, intruder]),
            intruderId: intruder.id,
            ruleExplanation: `${intruder.name} no pertenece al grupo principal.`,
            hintMessage: 'Piensa qué tienen en común casi todos los dibujos.',
          });
          setSelectedId(null);
          setWrongIds(new Set());
          setShakeId(null);
          setShowHint(false);
          setSolved(false);
          return;
        }
      }

      // Intermedio / Avanzado: use rich curated semantic sub-categories (preferring ones matching active theme!)
      if (lvl === 'intermedio' || lvl === 'avanzado') {
        const matchingRules = SUBCATEGORY_RULES.filter((r) => {
          const validG = r.groupIds.filter((id) => imageMap.has(id));
          const validI = r.intruderIds.filter((id) => imageMap.has(id));
          if (validG.length < total - 1 || validI.length < 1) return false;
          const colBase = COLLECTION_BASE_IDS[baseColId] || [];
          return validG.some((id) => colBase.includes(id));
        });
        const allValidRules = SUBCATEGORY_RULES.filter(
          (r) =>
            r.groupIds.filter((id) => imageMap.has(id)).length >= total - 1 &&
            r.intruderIds.filter((id) => imageMap.has(id)).length >= 1
        );
        const pool = matchingRules.length > 0 && Math.random() < 0.7 ? matchingRules : allValidRules;
        if (pool.length > 0) {
          const rule = pool[Math.floor(Math.random() * pool.length)];
          const validG = shuffleArray(
            rule.groupIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i))
          ).slice(0, total - 1);
          const validI = rule.intruderIds
            .map((id) => imageMap.get(id))
            .filter((i): i is ImageItem => Boolean(i));
          const intruder = validI[Math.floor(Math.random() * validI.length)];

          setRound({
            items: shuffleArray([...validG, intruder]),
            intruderId: intruder.id,
            ruleExplanation: `«${intruder.name}» es el intruso: los demás ${rule.label}.`,
            hintMessage: rule.hint,
          });
          setSelectedId(null);
          setWrongIds(new Set());
          setShakeId(null);
          setShowHint(false);
          setSolved(false);
          return;
        }
      }

      // Inicial (far thematic intruder) & Sencillo (near thematic intruder)
      // Draw group items strictly from THIS round's collection (roundColId) so the category rule is 100% clear!
      const roundColBaseIds = COLLECTION_BASE_IDS[baseColId];
      const roundColItems = roundColBaseIds
        ? roundColBaseIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i))
        : images.filter((i) => i.collectionId === baseColId && i.kind === 'piece');
      const sourcePool = roundColItems.length >= 3 ? roundColItems : baseGroupItems;
      const groupItems = shuffleArray(sourcePool).slice(0, Math.min(sourcePool.length, total - 1));
      const groupColName = colMap.get(baseColId)?.name || 'esta temática';
      const nearCols = NEAR_COLLECTIONS[baseColId] || [];

      const otherColIds = Object.keys(COLLECTION_BASE_IDS).filter((cid) => cid !== baseColId);
      const candidateCols =
        lvl === 'sencillo' && nearCols.length > 0
          ? nearCols
          : otherColIds.filter((cid) => !nearCols.includes(cid));

      const chosenIntruderCol =
        candidateCols[Math.floor(Math.random() * candidateCols.length)] || otherColIds[0];
      const intruderPoolIds = COLLECTION_BASE_IDS[chosenIntruderCol] || [];
      const intruderCandidates = intruderPoolIds
        .map((id) => imageMap.get(id))
        .filter((i): i is ImageItem => Boolean(i));
      const intruder =
        intruderCandidates[Math.floor(Math.random() * intruderCandidates.length)] ||
        images.find((i) => i.collectionId !== baseColId && i.kind === 'piece')!;

      const intruderColName = colMap.get(chosenIntruderCol)?.name || 'otro grupo';
      setRound({
        items: shuffleArray([...groupItems, intruder]),
        intruderId: intruder.id,
        ruleExplanation: `«${intruder.name}» es el intruso (${intruderColName}): los demás son de ${groupColName}.`,
        hintMessage: `Casi todos los dibujos pertenecen a «${groupColName}», pero uno se ha colado de otro grupo.`,
      });
      setSelectedId(null);
      setWrongIds(new Set());
      setShakeId(null);
      setShowHint(false);
      setSolved(false);
    },
    [diffTable, cfg, activity.collectionIds, baseGroupItems, imageMap, colMap, images]
  );

  useEffect(() => {
    buildRound(currentLevel);
  }, [buildRound, currentLevel]);

  const promptText = '¿Cuál es el intruso? Todos son distintos, pero uno no pertenece al grupo';

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish('¿Cuál es el intruso? Encuentra el dibujo que no pertenece al grupo.', voiceEnabled);
    }
  }, [roundNumber, mode, voiceEnabled]);

  const handleCardClick = (item: ImageItem) => {
    if (!round || solved) return;

    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedId(item.id);
      return;
    }

    if (item.id === round.intruderId) {
      playSoundCue('success', soundEnabled);
      setSelectedId(item.id);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
      speakSpanish(`¡Muy bien! ${item.name} es el intruso.`, voiceEnabled);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(item.id));
      setShakeId(item.id);
      window.setTimeout(() => setShakeId((cur) => (cur === item.id ? null : cur)), 380);
    }
  };

  const handleAsambleaCheck = () => {
    if (!round || !selectedId || solved) return;
    if (selectedId === round.intruderId) {
      playSoundCue('success', soundEnabled);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(selectedId));
      setShakeId(selectedId);
      setSelectedId(null);
      window.setTimeout(() => setShakeId(null), 380);
    }
  };

  const canStepUp = progression === 'progressive' && levelIdx < DIFFICULTY_ORDER.length - 1;
  const readyToStepUp = canStepUp && solvedAtLevel >= 2;

  const handleNextRound = (stepUp: boolean) => {
    const nextIdx = stepUp ? Math.min(DIFFICULTY_ORDER.length - 1, levelIdx + 1) : levelIdx;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setLevelIdx(nextIdx);
      setSolvedAtLevel(0);
    }
    setRoundNumber((r) => r + 1);
    buildRound(DIFFICULTY_ORDER[nextIdx]);
  };

  const count = round?.items.length || 4;
  const cols = count <= 4 ? 4 : count === 5 ? 5 : 3;
  const rows = Math.ceil(count / cols);
  const cardSize = rows === 1 ? 'min(210px, 27vh)' : 'min(175px, 22vh)';

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!solved && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={!selectedId}
              onClick={handleAsambleaCheck}
            >
              <CheckCircle2 size={22} /> Comprobar
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setShowHint(true)}>
              <Lightbulb size={20} /> Pista
            </button>
          </>
        )}
        {solved && readyToStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} /> Subir dificultad
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {solved && !readyToStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Siguiente ronda
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(currentLevel)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  return (
    <GameShell
      title={activity.title}
      gameType="intruder"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${count} dibujos`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(currentLevel)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="wc-layout" style={{ marginBottom: 0, gap: 14 }}>
        <div className="wc-prompt-wrap">
          <h2 className="game-prompt-text" data-testid="intruder-prompt">
            {promptText}
          </h2>
        </div>

        <div
          className="intruder-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: cols === 3 ? 660 : cols === 4 ? 920 : 1060,
          }}
        >
          {round?.items.map((item, idx) => {
            const isIntruder = item.id === round.intruderId;
            const isCorrectShown = solved && isIntruder;
            const isSelected = selectedId === item.id && !solved;
            const isWrong = wrongIds.has(item.id);
            const isShaking = shakeId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                data-testid={`intruder-card-${idx}`}
                data-intruder={isIntruder ? 'true' : 'false'}
                className={`intruder-card-btn ${isCorrectShown ? 'correct' : ''} ${
                  isSelected ? 'selected' : ''
                } ${isWrong ? 'wrong' : ''} ${isShaking ? 'shake-once' : ''}`}
                style={{ width: cardSize, height: cardSize }}
                onClick={() => handleCardClick(item)}
                aria-label={item.name}
              >
                <img src={item.src} alt={item.name} />
                {isCorrectShown && (
                  <span className="matched-badge">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="wc-lower-zone" style={{ height: 'auto', minHeight: 84 }}>
          {!solved && mode === 'individual' && !showHint && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHint(true)}>
              <Lightbulb size={16} /> Ver pista
            </button>
          )}

          {showHint && !solved && round && (
            <div className="feedback-banner warn" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.lupa} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <Lightbulb size={18} /> {round.hintMessage}
            </div>
          )}

          {solved && round && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
                <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                <Sparkles size={20} /> {round.ruleExplanation}
              </div>
              {mode === 'individual' && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(readyToStepUp)}
                >
                  {readyToStepUp ? (
                    <>
                      <TrendingUp size={20} /> Siguiente ronda (subir dificultad)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Siguiente ronda
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
