import { useMemo, useState } from 'react';
import { Check, Layers, X } from 'lucide-react';
import type { CollectionItem, ImageItem } from '../types';
import { COLLECTION_BASE_IDS } from '../data/catalog';

interface ThemePickerModalProps {
  collections: CollectionItem[];
  images: ImageItem[];
  selectedThemeIds: string[]; // ['all'] or array of 1+ collection IDs
  onApply: (nextIds: string[]) => void;
  onClose: () => void;
}

export function ThemePickerModal({
  collections,
  images,
  selectedThemeIds,
  onApply,
  onClose,
}: ThemePickerModalProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const allIds = useMemo(() => collections.map((c) => c.id), [collections]);

  const initialAll =
    selectedThemeIds.includes('all') ||
    selectedThemeIds.length === 0 ||
    selectedThemeIds.length >= collections.length;

  const [draftIds, setDraftIds] = useState<string[]>(
    initialAll ? allIds : selectedThemeIds.filter((id) => allIds.includes(id))
  );

  const isAllSelected = draftIds.length === allIds.length && allIds.length > 0;

  const toggleCollection = (colId: string) => {
    setDraftIds((prev) => {
      if (prev.includes(colId)) {
        // Keep at least 1 selected so games always have material
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== colId);
      }
      return [...prev, colId];
    });
  };

  const selectOnlyOne = (colId: string) => {
    setDraftIds([colId]);
  };

  const handleSelectAll = () => {
    setDraftIds(allIds);
  };

  const handleConfirm = () => {
    if (draftIds.length === 0) return;
    if (draftIds.length >= allIds.length) {
      onApply(['all']);
    } else {
      onApply(draftIds);
    }
    onClose();
  };

  const getThumb = (col: CollectionItem): ImageItem | undefined => {
    const base = COLLECTION_BASE_IDS[col.id];
    if (base && base[0] && imageMap.has(base[0])) return imageMap.get(base[0]);
    return images.find((i) => i.collectionId === col.id && i.kind === 'piece');
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir temáticas"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel theme-modal-panel" data-testid="theme-picker-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--accent-teal-soft)',
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.28rem', lineHeight: 1.1 }}>
                Elegir temáticas
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-secondary)' }}>
                Combina una, varias o todas las temáticas para tus juegos
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${isAllSelected ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleSelectAll}
              data-testid="modal-select-all-themes"
            >
              <Layers size={15} /> Todas ({allIds.length})
            </button>
            <button type="button" className="btn-icon" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="theme-modal-grid">
          {collections.map((col) => {
            const thumb = getThumb(col);
            const checked = draftIds.includes(col.id);
            return (
              <div
                key={col.id}
                className={`theme-modal-tile ${checked ? 'selected' : ''}`}
                data-testid={`modal-theme-${col.id}`}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => toggleCollection(col.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleCollection(col.id);
                  }
                }}
              >
                <div className="theme-modal-thumb">
                  {thumb ? <img src={thumb.src} alt="" /> : <span>{col.name[0]}</span>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      lineHeight: 1.15,
                    }}
                  >
                    {col.name}
                  </div>
                  <button
                    type="button"
                    className="theme-only-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectOnlyOne(col.id);
                    }}
                  >
                    Solo esta
                  </button>
                </div>
                <span className={`theme-modal-check ${checked ? 'checked' : ''}`}>
                  {checked && <Check size={13} strokeWidth={3} />}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span className="chip chip-teal">
            {isAllSelected
              ? `Todas las temáticas (${allIds.length})`
              : draftIds.length === 1
                ? '1 temática elegida'
                : `${draftIds.length} temáticas combinadas`}
          </span>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ padding: '10px 20px', fontSize: '0.96rem' }}
              onClick={handleConfirm}
              data-testid="modal-apply-themes"
            >
              <Check size={17} /> Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
