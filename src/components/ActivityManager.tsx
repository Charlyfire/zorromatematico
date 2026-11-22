import { useRef, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  Play,
  Plus,
  Printer,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  Activity,
  AppDataState,
  DifficultyLevel,
  DifficultyProgression,
  LaunchSession,
  PlayMode,
} from '../types';
import { exportActivityBundle, importActivityBundle } from '../lib/db';
import { isActivityPlayable } from '../lib/activityValidation';
import { GamePictogram, GAME_TYPE_META } from './GameIcons';
import { ActivityEditor } from './ActivityEditor';
import { PrintableSheetModal } from './PrintableSheetModal';

interface ActivityManagerProps {
  state: AppDataState;
  defaultMode: PlayMode;
  defaultDifficulty: DifficultyLevel;
  defaultProgression: DifficultyProgression;
  onSaveActivity: (act: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onAddPair: (pair: AppDataState['pairs'][number]) => Promise<void>;
  onStateReplaced: (nextState: AppDataState) => void;
  onLaunch: (session: LaunchSession) => void;
}

export function ActivityManager({
  state,
  defaultMode,
  defaultDifficulty,
  defaultProgression,
  onSaveActivity,
  onDeleteActivity,
  onAddPair,
  onStateReplaced,
  onLaunch,
}: ActivityManagerProps) {
  const [editing, setEditing] = useState<'none' | 'new' | Activity>('none');
  const [printingActivity, setPrintingActivity] = useState<Activity | null>(null);
  const [page, setPage] = useState(0);
  const [statusNotice, setStatusNotice] = useState<{ kind: 'success' | 'warn'; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleDuplicate = async (act: Activity) => {
    const now = Date.now();
    const copy: Activity = {
      ...JSON.parse(JSON.stringify(act)),
      id: `act-copy-${now}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${act.title} (copia)`,
      builtIn: false,
      createdAt: now,
      updatedAt: now,
    };
    await onSaveActivity(copy);
    setStatusNotice({ kind: 'success', text: `Actividad duplicada: «${copy.title}».` });
  };

  const handleExport = async (act: Activity) => {
    try {
      const bundle = await exportActivityBundle(act, state);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = act.title
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]+/gi, '-')
        .replace(/(^-|-$)/g, '');
      a.href = url;
      a.download = `${safeName || 'actividad'}.mira-y-recuerda.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatusNotice({
        kind: 'success',
        text: `Exportada «${act.title}» en un único archivo con sus ${bundle.images.length} imágenes incluidas.`,
      });
    } catch (err) {
      setStatusNotice({
        kind: 'warn',
        text: `No se pudo exportar la actividad: ${String(err)}`,
      });
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const { activity, nextState } = await importActivityBundle(text, state);
      onStateReplaced(nextState);
      setStatusNotice({
        kind: 'success',
        text: `Actividad importada correctamente: «${activity.title}». Ya puedes jugarla.`,
      });
    } catch (err) {
      setStatusNotice({
        kind: 'warn',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo importar el archivo seleccionado.',
      });
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  if (editing !== 'none') {
    return (
      <ActivityEditor
        initialActivity={editing === 'new' ? null : editing}
        collections={state.collections}
        images={state.images}
        pairs={state.pairs}
        onAddPair={onAddPair}
        onCancel={() => setEditing('none')}
        onSave={async (saved) => {
          await onSaveActivity(saved);
          setEditing('none');
          setStatusNotice({ kind: 'success', text: `Actividad guardada: «${saved.title}».` });
        }}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(state.activities.length / 6));
  const safePage = Math.min(page, totalPages - 1);
  const pagedActivities = state.activities.slice(safePage * 6, safePage * 6 + 6);

  return (
    <div className="page-container" style={{ gap: 10 }}>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => handleImportFile(e.target.files?.[0])}
        data-testid="import-activity-input"
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
            Mis juegos ({state.activities.length})
          </h1>
          {statusNotice && (
            <span className={`chip ${statusNotice.kind === 'success' ? 'chip-sage' : 'chip-amber'}`}>
              {statusNotice.text}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setEditing('new')}
            data-testid="btn-create-activity"
          >
            <Plus size={18} /> Crear actividad
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => importInputRef.current?.click()}
            data-testid="btn-import-activity"
          >
            <Upload size={17} /> Importar (.json)
          </button>
        </div>
      </div>

      <div className="hub-six-grid">
        {pagedActivities.map((act) => {
          const meta = GAME_TYPE_META[act.gameType];
          const playable = isActivityPlayable(act, state.images, state.pairs);

          return (
            <article key={act.id} className="board-card hub-game-card" data-testid={`manage-act-${act.id}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GamePictogram type={act.gameType} size={34} />
                    <span className={`chip ${meta.chipClass}`} style={{ fontSize: '0.76rem', padding: '3px 9px' }}>
                      {meta.name}
                    </span>
                  </div>
                  <span className={`chip ${act.builtIn ? '' : 'chip-indigo'}`} style={{ fontSize: '0.74rem', padding: '2px 8px' }}>
                    {act.builtIn ? 'Base' : 'Propia'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: '1.12rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.84rem', lineHeight: 1.32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {act.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  disabled={!playable}
                  data-testid={`manage-play-${act.id}`}
                  onClick={() =>
                    onLaunch({
                      activity: act,
                      mode: defaultMode,
                      difficulty: act.defaultDifficulty || defaultDifficulty,
                      progression: act.defaultProgression || defaultProgression,
                    })
                  }
                >
                  <Play size={16} fill="currentColor" /> {playable ? 'Abrir y jugar' : 'Falta material'}
                </button>

                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 6px', fontSize: '0.78rem' }}
                    onClick={() => setEditing(act)}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 6px', fontSize: '0.78rem' }}
                    onClick={() => handleDuplicate(act)}
                  >
                    <Copy size={14} /> Copiar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 6px', fontSize: '0.78rem' }}
                    onClick={() => handleExport(act)}
                    data-testid={`export-${act.id}`}
                  >
                    <Download size={14} /> JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 6px', fontSize: '0.78rem' }}
                    disabled={!playable}
                    onClick={() => setPrintingActivity(act)}
                    data-testid={`print-${act.id}`}
                  >
                    <Printer size={14} /> PDF
                  </button>
                  {!act.builtIn && (
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: 32, height: 32, color: 'var(--accent-coral)' }}
                      onClick={() => onDeleteActivity(act.id)}
                      aria-label={`Eliminar ${act.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pager-bar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </button>
          <span className="chip">
            Página {safePage + 1} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Siguiente
          </button>
        </div>
      )}

      {printingActivity && (
        <PrintableSheetModal
          activity={printingActivity}
          images={state.images}
          pairs={state.pairs}
          onClose={() => setPrintingActivity(null)}
        />
      )}
    </div>
  );
}
