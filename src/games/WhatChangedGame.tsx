import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  ImagePair,
  PlayMode,
} from '../types';
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

type RoundVariant = 'disappear' | 'move' | 'rotate' | 'swap' | 'detail';
type RoundPhase = 'observe' | 'curtain' | 'question' | 'solved';

interface SlotCell {
  slotIndex: number;
  image: ImageItem | null;
  rotationDeg?: number;
}

interface WhatChangedRound {
  variant: RoundVariant;
  beforeSlots: SlotCell[];
  afterSlots: SlotCell[];
  answerImageId: string;
  targetSlotIndices: number[]; // 1 slot for disappear/move/rotate/detail, 2 slots for swap!
  choices: ImageItem[];
  hintMessage: string;
}

interface WhatChangedGameProps {
  activity: Activity;
  images: ImageItem[];
  pairs: ImagePair[];
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

interface StepSpec {
  level: DifficultyLevel;
  itemsCount: number;
  variant: RoundVariant;
  emptySlots: number;
  optionsCount: number;
}

export function WhatChangedGame({
  activity,
  images,
  pairs,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: WhatChangedGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const pairMap = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);
  const wcConfig = activity.whatChangedConfig!;
  const diffTable =
    activity.difficultyConfig?.whatChanged || DEFAULT_DIFFICULTY_CONFIG.whatChanged;

  const itemPool = useMemo(
    () => wcConfig.itemIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i)),
    [wcConfig.itemIds, imageMap]
  );

  const detailPairs = useMemo(
    () =>
      wcConfig.detailPairIds
        .map((id) => pairMap.get(id))
        .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId))),
    [wcConfig.detailPairIds, pairMap, imageMap]
  );

  const stepLadder = useMemo<StepSpec[]>(() => {
    const maxItems = Math.max(3, itemPool.length);
    const steps: StepSpec[] = [
      {
        level: 'inicial',
        itemsCount: Math.min(maxItems, diffTable.inicial.itemsCount),
        variant: 'disappear',
        emptySlots: 0,
        optionsCount: Math.min(maxItems, diffTable.inicial.optionsCount),
      },
      {
        level: 'sencillo',
        itemsCount: Math.min(maxItems, diffTable.sencillo.itemsCount),
        variant: 'disappear',
        emptySlots: 0,
        optionsCount: Math.min(maxItems, diffTable.sencillo.optionsCount),
      },
      {
        level: 'intermedio',
        itemsCount: Math.min(maxItems, diffTable.intermedio.itemsCount),
        variant: 'move',
        emptySlots: Math.max(1, diffTable.intermedio.emptySlots),
        optionsCount: Math.min(maxItems, diffTable.intermedio.optionsCount),
      },
      // Avanzado: rotate -> swap -> move with larger composition!
      {
        level: 'avanzado',
        itemsCount: Math.min(maxItems, diffTable.avanzado.itemsCount),
        variant: 'rotate',
        emptySlots: 0,
        optionsCount: Math.min(maxItems, diffTable.avanzado.optionsCount),
      },
      {
        level: 'avanzado',
        itemsCount: Math.min(maxItems, Math.min(6, maxItems)),
        variant: 'swap',
        emptySlots: 0,
        optionsCount: Math.min(maxItems, 6),
      },
      {
        level: 'avanzado',
        itemsCount: Math.min(maxItems, Math.min(6, maxItems)),
        variant: 'move',
        emptySlots: 2,
        optionsCount: Math.min(maxItems, 6),
      },
    ];
    if (detailPairs.length > 0) {
      steps.push({
        level: 'avanzado',
        itemsCount: Math.min(maxItems, 4),
        variant: 'detail',
        emptySlots: 0,
        optionsCount: Math.min(maxItems, 4),
      });
    }
    return steps;
  }, [itemPool.length, diffTable, detailPairs.length]);

  const initialStepIndex = useMemo(() => {
    const idx = stepLadder.findIndex((s) => s.level === initialDifficulty);
    return idx >= 0 ? idx : 0;
  }, [stepLadder, initialDifficulty]);

  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [roundNumber, setRoundNumber] = useState(1);
  const [firstTryStreak, setFirstTryStreak] = useState(0);
  const [ruleChangeNotice, setRuleChangeNotice] = useState<string | null>(null);

  const [round, setRound] = useState<WhatChangedRound | null>(null);
  const [phase, setPhase] = useState<RoundPhase>('observe');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([]);
  const [wrongMarks, setWrongMarks] = useState<Set<string>>(new Set());
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const curtainTimerRef = useRef<number | null>(null);
  const prevVariantRef = useRef<RoundVariant | null>(null);
  const advCycleRef = useRef<number>(0);

  const clearCurtainTimer = () => {
    if (curtainTimerRef.current !== null) {
      window.clearTimeout(curtainTimerRef.current);
      curtainTimerRef.current = null;
    }
  };

  const buildRound = useCallback(
    (sIdx: number, isFirstRound: boolean) => {
      clearCurtainTimer();
      let spec = stepLadder[Math.min(sIdx, stepLadder.length - 1)];
      if (!spec || itemPool.length < 2) return;

      // When playing Avanzado in fixed mode, rotate cleanly across rotate, swap, and move!
      if (spec.level === 'avanzado' && progression === 'fixed' && !isFirstRound) {
        const advVariants: RoundVariant[] = ['rotate', 'swap', 'move'];
        const nextVar = advVariants[advCycleRef.current % advVariants.length];
        advCycleRef.current++;
        spec = {
          ...spec,
          variant: nextVar,
          emptySlots: nextVar === 'move' ? 1 : 0,
        };
      }

      if (prevVariantRef.current && prevVariantRef.current !== spec.variant) {
        if (spec.variant === 'move') {
          setRuleChangeNotice('¡Nueva consigna! Un objeto ha cambiado de sitio: descubre cuál se ha movido.');
        } else if (spec.variant === 'rotate') {
          setRuleChangeNotice('¡Nueva consigna! Un objeto ha girado sobre sí mismo: descubre cuál se ha girado.');
        } else if (spec.variant === 'swap') {
          setRuleChangeNotice('¡Nueva consigna! Dos objetos se han intercambiado el sitio: toca los dos.');
        } else if (spec.variant === 'disappear') {
          setRuleChangeNotice('¡Nueva consigna! Ahora desaparece un objeto: descubre cuál falta.');
        } else if (spec.variant === 'detail') {
          setRuleChangeNotice('¡Nueva consigna! Fíjate bien en los detalles: uno de los dibujos ha cambiado.');
        }
      } else {
        setRuleChangeNotice(null);
      }
      prevVariantRef.current = spec.variant;

      const count = Math.min(itemPool.length, spec.itemsCount);
      let boardItems: ImageItem[] = [];
      if (
        isFirstRound &&
        wcConfig.initialItemIds &&
        wcConfig.initialItemIds.length >= count
      ) {
        const pref = wcConfig.initialItemIds
          .slice(0, count)
          .map((id) => itemPool.find((i) => i.id === id))
          .filter((x): x is ImageItem => Boolean(x));
        if (pref.length === count) boardItems = shuffleArray(pref);
      }
      if (boardItems.length !== count) {
        boardItems = shuffleArray(itemPool).slice(0, count);
      }

      if (spec.variant === 'rotate') {
        const beforeSlots: SlotCell[] = boardItems.map((img, i) => ({
          slotIndex: i,
          image: img,
          rotationDeg: 0,
        }));
        const rotIdx = Math.floor(Math.random() * count);
        const angles = [90, 180, -90];
        const chosenAngle = angles[Math.floor(Math.random() * angles.length)];
        const afterSlots: SlotCell[] = beforeSlots.map((c, i) =>
          i === rotIdx ? { ...c, rotationDeg: chosenAngle } : { ...c }
        );
        setRound({
          variant: 'rotate',
          beforeSlots,
          afterSlots,
          answerImageId: boardItems[rotIdx].id,
          targetSlotIndices: [rotIdx],
          choices: [],
          hintMessage: `Mira la orientación de cada dibujo: el de la casilla ${rotIdx + 1} está girado.`,
        });
      } else if (spec.variant === 'swap') {
        const beforeSlots: SlotCell[] = boardItems.map((img, i) => ({
          slotIndex: i,
          image: img,
          rotationDeg: 0,
        }));
        const indices = shuffleArray(Array.from({ length: count }, (_, i) => i));
        const idxA = indices[0];
        const idxB = indices[1];
        const afterSlots: SlotCell[] = beforeSlots.map((c) => ({ ...c }));
        afterSlots[idxA] = { slotIndex: idxA, image: beforeSlots[idxB].image, rotationDeg: 0 };
        afterSlots[idxB] = { slotIndex: idxB, image: beforeSlots[idxA].image, rotationDeg: 0 };

        setRound({
          variant: 'swap',
          beforeSlots,
          afterSlots,
          answerImageId: `${boardItems[idxA].id}|${boardItems[idxB].id}`,
          targetSlotIndices: [idxA, idxB].sort((a, b) => a - b),
          choices: [],
          hintMessage: `Fíjate en las casillas ${Math.min(idxA, idxB) + 1} y ${Math.max(idxA, idxB) + 1}.`,
        });
      } else if (spec.variant === 'detail' && detailPairs.length > 0) {
        const pair = detailPairs[Math.floor(Math.random() * detailPairs.length)];
        const imgA = imageMap.get(pair.itemAId)!;
        const imgB = imageMap.get(pair.itemBId)!;
        const fillers = shuffleArray(
          itemPool.filter((i) => i.id !== imgA.id && i.id !== imgB.id)
        ).slice(0, Math.max(2, count - 1));
        const placedBefore = shuffleArray([imgA, ...fillers]);
        const targetIdx = placedBefore.findIndex((i) => i.id === imgA.id);

        const beforeSlots: SlotCell[] = placedBefore.map((img, i) => ({ slotIndex: i, image: img }));
        const afterSlots: SlotCell[] = placedBefore.map((img, i) => ({
          slotIndex: i,
          image: i === targetIdx ? imgB : img,
        }));

        setRound({
          variant: 'detail',
          beforeSlots,
          afterSlots,
          answerImageId: imgB.id,
          targetSlotIndices: [targetIdx],
          choices: [],
          hintMessage: `Fíjate muy bien en el dibujo de la casilla ${targetIdx + 1}.`,
        });
      } else if (spec.variant === 'move') {
        const emptyCount = Math.max(1, spec.emptySlots);
        const totalSlots = boardItems.length + emptyCount;
        const indices = shuffleArray(Array.from({ length: totalSlots }, (_, i) => i));
        const itemSlotIndices = indices.slice(0, boardItems.length);
        const emptySlotIndices = indices.slice(boardItems.length);

        const beforeSlots: SlotCell[] = Array.from({ length: totalSlots }, (_, i) => ({
          slotIndex: i,
          image: null,
        }));
        boardItems.forEach((img, i) => {
          beforeSlots[itemSlotIndices[i]].image = img;
        });

        const moverIdxInBoard = Math.floor(Math.random() * boardItems.length);
        const fromSlot = itemSlotIndices[moverIdxInBoard];
        const toSlot = emptySlotIndices[Math.floor(Math.random() * emptySlotIndices.length)];
        const movedImage = boardItems[moverIdxInBoard];

        const afterSlots: SlotCell[] = beforeSlots.map((cell) => ({ ...cell }));
        afterSlots[fromSlot] = { slotIndex: fromSlot, image: null };
        afterSlots[toSlot] = { slotIndex: toSlot, image: movedImage };

        setRound({
          variant: 'move',
          beforeSlots,
          afterSlots,
          answerImageId: movedImage.id,
          targetSlotIndices: [toSlot],
          choices: [],
          hintMessage: `Antes había un hueco vacío donde ahora está el dibujo que se movió.`,
        });
      } else {
        const totalSlots = boardItems.length;
        const beforeSlots: SlotCell[] = boardItems.map((img, i) => ({ slotIndex: i, image: img }));
        const missingSlotIdx = Math.floor(Math.random() * totalSlots);
        const missingItem = boardItems[missingSlotIdx];

        const afterSlots: SlotCell[] = beforeSlots.map((cell, i) =>
          i === missingSlotIdx ? { slotIndex: i, image: null } : { ...cell }
        );

        const optCount = Math.min(itemPool.length, Math.max(3, spec.optionsCount));
        const otherItems = shuffleArray(itemPool.filter((i) => i.id !== missingItem.id));
        const choices = shuffleArray([missingItem, ...otherItems.slice(0, optCount - 1)]);

        setRound({
          variant: 'disappear',
          beforeSlots,
          afterSlots,
          answerImageId: missingItem.id,
          targetSlotIndices: [missingSlotIdx],
          choices,
          hintMessage: `Falta el dibujo que estaba en la casilla vacía.`,
        });
      }

      setPhase('observe');
      setSelectedChoiceId(null);
      setSelectedSlotIndices([]);
      setWrongMarks(new Set());
      setHadWrongAttempt(false);
      setUsedHint(false);
      setShakeKey(null);
      setCountdown(wcConfig.observationTimerSeconds ?? null);
    },
    [stepLadder, itemPool, detailPairs, imageMap, wcConfig, progression]
  );

  useEffect(() => {
    buildRound(initialStepIndex, true);
    return () => clearCurtainTimer();
  }, [buildRound, initialStepIndex]);

  const triggerCurtain = useCallback(() => {
    if (phase !== 'observe') return;
    playSoundCue('reveal', soundEnabled);
    setPhase('curtain');
    curtainTimerRef.current = window.setTimeout(() => {
      setPhase('question');
      if (mode === 'individual' && round) {
        const q =
          round.variant === 'move'
            ? '¿Cuál se ha movido?'
            : round.variant === 'rotate'
            ? '¿Cuál se ha girado?'
            : round.variant === 'swap'
            ? '¿Cuáles dos se han intercambiado de sitio?'
            : round.variant === 'detail'
            ? '¿Cuál ha cambiado de detalle?'
            : '¿Cuál ha desaparecido?';
        speakSpanish(q, voiceEnabled);
      }
    }, 1050);
  }, [phase, soundEnabled, mode, round, voiceEnabled]);

  useEffect(() => {
    if (phase !== 'observe' || countdown === null) return;
    if (countdown <= 0) {
      triggerCurtain();
      return;
    }
    const id = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(id);
  }, [phase, countdown, triggerCurtain]);

  const promptText = useMemo(() => {
    if (!round) return 'Observa los dibujos';
    if (phase === 'observe') return 'Mira bien todos los dibujos, su posición y orientación';
    if (phase === 'curtain') return '¡Atención! Algo está cambiando…';
    if (round.variant === 'move') return '¿Cuál se ha movido?';
    if (round.variant === 'rotate') return '¿Cuál se ha girado?';
    if (round.variant === 'swap') return '¿Cuáles dos se han intercambiado de sitio? (toca los dos)';
    if (round.variant === 'detail') return '¿Qué dibujo ha cambiado de detalle?';
    return '¿Cuál ha desaparecido?';
  }, [phase, round]);

  const markSolved = () => {
    playSoundCue('success', soundEnabled);
    setPhase('solved');
    if (!hadWrongAttempt && !usedHint) {
      setFirstTryStreak((s) => s + 1);
    } else {
      setFirstTryStreak(0);
    }
    if (mode === 'individual' && round) {
      speakSpanish('¡Muy bien! Lo has descubierto.', voiceEnabled);
    }
  };

  const handleDisappearChoice = (img: ImageItem) => {
    if (phase !== 'question' || !round || round.variant !== 'disappear') return;

    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedChoiceId(img.id);
      return;
    }

    if (img.id === round.answerImageId) {
      setSelectedChoiceId(img.id);
      markSolved();
    } else {
      playSoundCue('retry', soundEnabled);
      setHadWrongAttempt(true);
      setWrongMarks((prev) => new Set(prev).add(img.id));
      setShakeKey(img.id);
      window.setTimeout(() => setShakeKey(null), 380);
    }
  };

  const handleBoardSlotClick = (slot: SlotCell) => {
    if (phase !== 'question' || !round || !slot.image) return;
    if (round.variant === 'disappear') return;

    if (round.variant === 'swap') {
      playSoundCue('flip', soundEnabled);
      const already = selectedSlotIndices.includes(slot.slotIndex);
      const nextSel = already
        ? selectedSlotIndices.filter((i) => i !== slot.slotIndex)
        : [...selectedSlotIndices, slot.slotIndex].slice(-2);
      setSelectedSlotIndices(nextSel);

      if (mode === 'individual' && nextSel.length === 2) {
        const sorted = [...nextSel].sort((a, b) => a - b);
        if (
          sorted[0] === round.targetSlotIndices[0] &&
          sorted[1] === round.targetSlotIndices[1]
        ) {
          markSolved();
        } else {
          playSoundCue('retry', soundEnabled);
          setHadWrongAttempt(true);
          setShakeKey(`slot-${slot.slotIndex}`);
          window.setTimeout(() => {
            setShakeKey(null);
            setSelectedSlotIndices([]);
          }, 500);
        }
      }
      return;
    }

    // Single-slot targets: move, rotate, detail
    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedSlotIndices([slot.slotIndex]);
      return;
    }

    if (slot.slotIndex === round.targetSlotIndices[0]) {
      setSelectedSlotIndices([slot.slotIndex]);
      markSolved();
    } else {
      playSoundCue('retry', soundEnabled);
      setHadWrongAttempt(true);
      const key = `slot-${slot.slotIndex}`;
      setWrongMarks((prev) => new Set(prev).add(key));
      setShakeKey(key);
      window.setTimeout(() => setShakeKey(null), 380);
    }
  };

  const handleAsambleaCheck = () => {
    if (phase !== 'question' || !round) return;
    if (round.variant === 'disappear') {
      if (!selectedChoiceId) return;
      if (selectedChoiceId === round.answerImageId) markSolved();
      else {
        playSoundCue('retry', soundEnabled);
        setHadWrongAttempt(true);
        setWrongMarks((prev) => new Set(prev).add(selectedChoiceId));
        setShakeKey(selectedChoiceId);
        setSelectedChoiceId(null);
        window.setTimeout(() => setShakeKey(null), 380);
      }
    } else if (round.variant === 'swap') {
      if (selectedSlotIndices.length < 2) return;
      const sorted = [...selectedSlotIndices].sort((a, b) => a - b);
      if (
        sorted[0] === round.targetSlotIndices[0] &&
        sorted[1] === round.targetSlotIndices[1]
      ) {
        markSolved();
      } else {
        playSoundCue('retry', soundEnabled);
        setHadWrongAttempt(true);
        setSelectedSlotIndices([]);
      }
    } else {
      if (selectedSlotIndices.length === 0) return;
      if (selectedSlotIndices[0] === round.targetSlotIndices[0]) markSolved();
      else {
        playSoundCue('retry', soundEnabled);
        setHadWrongAttempt(true);
        const key = `slot-${selectedSlotIndices[0]}`;
        setWrongMarks((prev) => new Set(prev).add(key));
        setShakeKey(key);
        setSelectedSlotIndices([]);
        window.setTimeout(() => setShakeKey(null), 380);
      }
    }
  };

  const canStepUp = progression === 'progressive' && stepIndex < stepLadder.length - 1;
  const readyToStepUp = canStepUp && firstTryStreak >= 3;

  const handleNextRound = (stepUp: boolean) => {
    const nextStep = stepUp ? Math.min(stepLadder.length - 1, stepIndex + 1) : stepIndex;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setStepIndex(nextStep);
      setFirstTryStreak(0);
    }
    setRoundNumber((r) => r + 1);
    buildRound(nextStep, false);
  };

  const currentSpec = stepLadder[Math.min(stepIndex, stepLadder.length - 1)];
  const activeSlots = round ? (phase === 'observe' ? round.beforeSlots : round.afterSlots) : [];
  const totalSlots = activeSlots.length;
  const gridCols = totalSlots <= 3 ? 3 : totalSlots <= 4 ? 4 : totalSlots <= 6 ? 3 : 4;

  const nextSpecPreview = stepIndex < stepLadder.length - 1 ? stepLadder[stepIndex + 1] : null;

  const checkDisabled =
    round?.variant === 'disappear'
      ? !selectedChoiceId
      : round?.variant === 'swap'
      ? selectedSlotIndices.length < 2
      : selectedSlotIndices.length === 0;

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {phase === 'observe' && (
          <button type="button" className="btn btn-coral btn-xl" onClick={triggerCurtain} data-testid="wc-seen-btn">
            <Eye size={22} /> Ya lo he visto
          </button>
        )}
        {phase === 'question' && (
          <>
            <button type="button" className="btn btn-primary btn-xl" onClick={handleAsambleaCheck} disabled={checkDisabled}>
              <CheckCircle2 size={22} /> Comprobar
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setUsedHint(true)}>
              <Lightbulb size={20} /> Pista
            </button>
          </>
        )}
        {phase === 'solved' && readyToStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} /> Subir dificultad
              {nextSpecPreview && nextSpecPreview.variant !== currentSpec.variant
                ? ` (${
                    nextSpecPreview.variant === 'move'
                      ? 'desplazamiento'
                      : nextSpecPreview.variant === 'rotate'
                      ? 'giro'
                      : nextSpecPreview.variant === 'swap'
                      ? 'intercambio'
                      : 'nuevo reto'
                  })`
                : ''}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {phase === 'solved' && !readyToStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Siguiente ronda
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(stepIndex, false)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  const currentLevel =
    DIFFICULTY_ORDER.includes(currentSpec?.level) ? currentSpec.level : initialDifficulty;

  const variantBadge =
    round?.variant === 'rotate'
      ? 'Giro'
      : round?.variant === 'swap'
      ? 'Intercambio'
      : round?.variant === 'move'
      ? 'Desplazamiento'
      : round?.variant === 'detail'
      ? 'Detalle'
      : 'Desaparición';

  return (
    <GameShell
      title={activity.title}
      gameType="what-changed"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${variantBadge}${
        progression === 'progressive' && canStepUp ? ` · Racha ${firstTryStreak}/3` : ''
      }`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(stepIndex, false)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="wc-layout">
        {ruleChangeNotice && (
          <div className="feedback-banner info" role="status">
            <Sparkles size={20} /> {ruleChangeNotice}
          </div>
        )}

        <div className="wc-prompt-wrap">
          <h2 className="game-prompt-text" data-testid="wc-prompt">
            {promptText}
          </h2>
          {countdown !== null && phase === 'observe' && (
            <span className="chip chip-amber">{countdown}s</span>
          )}
        </div>

        <div className="wc-board-frame" data-testid="wc-board">
          <div
            className="wc-slots-grid"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
          >
            {activeSlots.map((slot) => {
              const isInteractive =
                phase === 'question' &&
                round &&
                round.variant !== 'disappear' &&
                Boolean(slot.image);
              const isSelected =
                selectedSlotIndices.includes(slot.slotIndex) && phase === 'question';
              const isCorrectSlot =
                phase === 'solved' &&
                round &&
                round.variant !== 'disappear' &&
                round.targetSlotIndices.includes(slot.slotIndex);
              const isDisappearedReveal =
                phase === 'solved' &&
                round &&
                round.variant === 'disappear' &&
                slot.slotIndex === round.targetSlotIndices[0];
              const slotKey = `slot-${slot.slotIndex}`;
              const isWrong = wrongMarks.has(slotKey);

              const displayedImage = isDisappearedReveal
                ? imageMap.get(round.answerImageId) || null
                : slot.image;

              return (
                <div
                  key={slot.slotIndex}
                  data-testid={`wc-slot-${slot.slotIndex}`}
                  data-item-id={displayedImage?.id || 'empty'}
                  data-rotation={slot.rotationDeg || 0}
                  data-target-slot={
                    round?.targetSlotIndices.includes(slot.slotIndex) ? 'true' : 'false'
                  }
                  className={`wc-slot ${!displayedImage ? 'empty-slot' : ''} ${
                    isInteractive ? 'clickable' : ''
                  } ${isSelected ? 'selected' : ''} ${
                    isCorrectSlot || isDisappearedReveal ? 'correct' : ''
                  } ${isWrong ? 'wrong' : ''} ${shakeKey === slotKey ? 'shake-once' : ''}`}
                  role={isInteractive ? 'button' : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  aria-label={
                    displayedImage
                      ? `Casilla ${slot.slotIndex + 1}: ${displayedImage.name}`
                      : `Casilla ${slot.slotIndex + 1}: vacía`
                  }
                  onClick={() => isInteractive && handleBoardSlotClick(slot)}
                  onKeyDown={(e) => {
                    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleBoardSlotClick(slot);
                    }
                  }}
                >
                  {displayedImage ? (
                    <img
                      src={displayedImage.src}
                      alt={displayedImage.name}
                      style={{
                        transform: slot.rotationDeg ? `rotate(${slot.rotationDeg}deg)` : undefined,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: '#b8a586',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.6rem',
                        fontWeight: 700,
                      }}
                      aria-hidden="true"
                    >
                      {phase === 'observe' ? '' : '?'}
                    </span>
                  )}

                  {(isCorrectSlot || isDisappearedReveal) && (
                    <span className="matched-badge">
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {phase === 'curtain' && (
            <div className="wc-curtain" role="status">
              <img src={MASCOT.lupa} alt="" style={{ width: 92, height: 92, objectFit: 'contain' }} />
              <span>¡Atención al cambio!</span>
            </div>
          )}
        </div>

        <div className="wc-lower-zone">
          {phase === 'observe' && mode === 'individual' && (
            <button
              type="button"
              className="btn btn-coral btn-xl"
              onClick={triggerCurtain}
              data-testid="wc-seen-btn"
            >
              <Eye size={22} /> Ya lo he visto
            </button>
          )}

          {phase === 'question' && round?.variant === 'disappear' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="wc-choices-row">
                {round.choices.map((img, idx) => {
                  const isSelected = selectedChoiceId === img.id;
                  const isWrong = wrongMarks.has(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      data-testid={`wc-choice-${idx}`}
                      data-correct={img.id === round.answerImageId ? 'true' : 'false'}
                      className={`wc-choice-btn ${isSelected ? 'selected' : ''} ${
                        isWrong ? 'wrong' : ''
                      } ${shakeKey === img.id ? 'shake-once' : ''}`}
                      onClick={() => handleDisappearChoice(img)}
                      aria-label={`Elegir ${img.name}`}
                    >
                      <img src={img.src} alt={img.name} />
                    </button>
                  );
                })}
              </div>
              {mode === 'individual' && !usedHint && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUsedHint(true)}>
                  <Lightbulb size={16} /> Ver pista
                </button>
              )}
            </div>
          )}

          {phase === 'question' && round && round.variant !== 'disappear' && mode === 'individual' && !usedHint && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUsedHint(true)}>
              <Lightbulb size={16} /> Ver pista
            </button>
          )}

          {usedHint && phase === 'question' && round && (
            <div className="feedback-banner warn" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.lupa} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <Lightbulb size={18} /> {round.hintMessage}
            </div>
          )}

          {phase === 'solved' && round && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
                <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                <Sparkles size={20} />
                {round.variant === 'move'
                  ? `¡Exacto! Se ha movido: ${imageMap.get(round.answerImageId)?.name}.`
                  : round.variant === 'rotate'
                  ? `¡Muy buena vista! Se había girado: ${imageMap.get(round.answerImageId)?.name}.`
                  : round.variant === 'swap'
                  ? '¡Genial! Has descubierto los dos dibujos intercambiados.'
                  : round.variant === 'detail'
                  ? `¡Muy buena vista! Cambió: ${imageMap.get(round.answerImageId)?.name}.`
                  : `¡Muy bien! Había desaparecido: ${imageMap.get(round.answerImageId)?.name}.`}
              </div>

              {mode === 'individual' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => handleNextRound(readyToStepUp)}
                  >
                    {readyToStepUp ? (
                      <>
                        <TrendingUp size={20} /> Siguiente ronda (subir nivel)
                      </>
                    ) : (
                      <>
                        <ArrowRight size={20} /> Siguiente ronda
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
