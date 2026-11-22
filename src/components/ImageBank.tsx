import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Crop,
  FolderPlus,
  Grid2X2,
  ImagePlus,
  Link2,
  Plus,
  Scissors,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AssetKind, CollectionItem, ImageItem, ImagePair, PairKind } from '../types';
import {
  fileToDataUrl,
  processImageWithFraming,
  sliceSheetIntoPieces,
  type CropFraming,
  type SlicedSheetPiece,
} from '../lib/imageProcessing';

interface StagedUpload {
  tempId: string;
  rawSrc: string;
  previewSrc: string;
  silhouetteSrc?: string;
  hasTransparency: boolean;
  name: string;
  kind: AssetKind;
  collectionId: string;
  framing: CropFraming;
  manualSilhouetteSrc?: string;
}

interface ImageBankProps {
  collections: CollectionItem[];
  images: ImageItem[];
  pairs: ImagePair[];
  onAddImage: (img: ImageItem) => Promise<void>;
  onUpdateImage: (img: ImageItem) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onAddCollection: (col: CollectionItem) => Promise<void>;
  onAddPair: (pair: ImagePair) => Promise<void>;
  onDeletePair: (id: string) => Promise<void>;
}

const COLLECTION_COLORS = [
  '#2A9D8F',
  '#E07A5F',
  '#457B9D',
  '#5B8E55',
  '#D97706',
  '#8B5CF6',
  '#C0567B',
  '#3B5998',
];

function cleanFileName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Imagen';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function ImageBank({
  collections,
  images,
  pairs,
  onAddImage,
  onUpdateImage,
  onDeleteImage,
  onAddCollection,
  onAddPair,
  onDeletePair,
}: ImageBankProps) {
  const [activeTab, setActiveTab] = useState<'images' | 'pairs'>('images');
  const [selectedColId, setSelectedColId] = useState<string>('transportes');
  const [showSilhouettes, setShowSilhouettes] = useState(false);
  const [imgPage, setImgPage] = useState(0);
  const [pairPage, setPairPage] = useState(0);

  // New collection form
  const [showNewColForm, setShowNewColForm] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Multi-image upload staging wizard
  const [staged, setStaged] = useState<StagedUpload[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [savingUploads, setSavingUploads] = useState(false);

  // Pair creator state
  const [pairLabel, setPairLabel] = useState('');
  const [pairKind, setPairKind] = useState<PairKind>('related');
  const [pairItemAId, setPairItemAId] = useState('');
  const [pairItemBId, setPairItemBId] = useState('');
  const [pairFilterCol, setPairFilterCol] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sheetInputRef = useRef<HTMLInputElement | null>(null);
  const manualSilInputRef = useRef<HTMLInputElement | null>(null);
  const [manualSilTargetImage, setManualSilTargetImage] = useState<ImageItem | null>(null);

  // 2x4 Sheet Slicer state
  const [sheetRawUrl, setSheetRawUrl] = useState<string | null>(null);
  const [sheetBaseName, setSheetBaseName] = useState('Dibujo');
  const [sheetRows, setSheetRows] = useState(2);
  const [sheetCols, setSheetCols] = useState(4);
  const [sheetRemoveBg, setSheetRemoveBg] = useState(true);
  const [sheetBgTolerance, setSheetBgTolerance] = useState(22);
  const [sheetKind, setSheetKind] = useState<AssetKind>('piece');
  const [sheetCollectionId, setSheetCollectionId] = useState<string>('transportes');
  const [sheetShowSilhouettes, setSheetShowSilhouettes] = useState(false);
  const [sheetPieces, setSheetPieces] = useState<
    (SlicedSheetPiece & { included: boolean; customName: string })[]
  >([]);
  const [sheetProcessing, setSheetProcessing] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);

  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const selectedCollection = collections.find((c) => c.id === selectedColId) || collections[0];

  const colImages = useMemo(
    () => images.filter((i) => i.collectionId === selectedColId),
    [images, selectedColId]
  );

  const countsByCollection = useMemo(() => {
    const map = new Map<string, { pieces: number; scenarios: number }>();
    for (const img of images) {
      const cur = map.get(img.collectionId) || { pieces: 0, scenarios: 0 };
      if (img.kind === 'scenario') cur.scenarios++;
      else cur.pieces++;
      map.set(img.collectionId, cur);
    }
    return map;
  }, [images]);

  const handleSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const defaultFraming: CropFraming = {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      removeBackground: false,
      bgTolerance: 28,
    };

    const list: StagedUpload[] = [];
    for (const file of Array.from(files)) {
      const rawSrc = await fileToDataUrl(file);
      const processed = await processImageWithFraming(rawSrc, defaultFraming, 512, 'contain');
      list.push({
        tempId: `stg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rawSrc,
        previewSrc: processed.src,
        silhouetteSrc: processed.silhouetteSrc,
        hasTransparency: processed.hasTransparency,
        name: cleanFileName(file.name),
        kind: 'piece',
        collectionId: selectedColId,
        framing: defaultFraming,
      });
    }
    setStaged((prev) => [...prev, ...list]);
    if (list.length > 0 && !editingStageId) {
      setEditingStageId(list[0].tempId);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const editingStage = staged.find((s) => s.tempId === editingStageId) || null;

  // Re-render preview when framing/kind changes on the active staged image
  const updateStagedFraming = async (
    tempId: string,
    patch: Partial<CropFraming>,
    kindOverride?: AssetKind
  ) => {
    const item = staged.find((s) => s.tempId === tempId);
    if (!item) return;
    const nextFraming = { ...item.framing, ...patch };
    const nextKind = kindOverride ?? item.kind;
    const processed = await processImageWithFraming(
      item.rawSrc,
      nextFraming,
      512,
      nextKind === 'scenario' ? 'cover' : 'contain'
    );
    setStaged((prev) =>
      prev.map((s) =>
        s.tempId === tempId
          ? {
              ...s,
              kind: nextKind,
              framing: nextFraming,
              previewSrc: processed.src,
              silhouetteSrc: s.manualSilhouetteSrc || processed.silhouetteSrc,
              hasTransparency: processed.hasTransparency,
            }
          : s
      )
    );
  };

  const handleSaveAllStaged = async () => {
    if (staged.length === 0) return;
    setSavingUploads(true);
    try {
      for (const item of staged) {
        const imgRecord: ImageItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: item.name.trim() || 'Imagen',
          collectionId: item.collectionId,
          kind: item.kind,
          src: item.previewSrc,
          silhouetteSrc:
            item.kind === 'piece' ? item.manualSilhouetteSrc || item.silhouetteSrc : undefined,
          builtIn: false,
          createdAt: Date.now(),
        };
        await onAddImage(imgRecord);
      }
      setStaged([]);
      setEditingStageId(null);
    } finally {
      setSavingUploads(false);
    }
  };

  // Run 2x4 sheet slicer whenever sheet or parameters change
  const runSheetSlice = async (
    rawUrl: string,
    rows: number,
    cols: number,
    removeBg: boolean,
    tol: number,
    kind: AssetKind,
    baseName: string
  ) => {
    setSheetProcessing(true);
    try {
      const sliced = await sliceSheetIntoPieces(rawUrl, {
        rows,
        cols,
        removeWhiteBg: removeBg,
        bgTolerance: tol,
        mode: kind,
        baseLabel: baseName,
      });
      setSheetPieces((prev) =>
        sliced.map((sp) => {
          const old = prev.find((p) => p.index === sp.index);
          return {
            ...sp,
            included: old ? old.included : true,
            customName: old ? old.customName : sp.defaultName,
          };
        })
      );
    } finally {
      setSheetProcessing(false);
    }
  };

  const handleSelectSheetFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await fileToDataUrl(file);
    const base = cleanFileName(file.name);
    setSheetRawUrl(raw);
    setSheetBaseName(base);
    setSheetCollectionId(selectedColId);
    setSheetShowSilhouettes(false);
    setSheetPieces([]);
    if (sheetInputRef.current) sheetInputRef.current.value = '';
    await runSheetSlice(raw, sheetRows, sheetCols, sheetRemoveBg, sheetBgTolerance, sheetKind, base);
  };

  const handleSaveSheetPieces = async () => {
    const chosen = sheetPieces.filter((p) => p.included);
    if (chosen.length === 0) return;
    setSheetSaving(true);
    try {
      for (const p of chosen) {
        await onAddImage({
          id: `img-sh-${Date.now()}-${p.index}-${Math.random().toString(36).slice(2, 5)}`,
          name: p.customName.trim() || p.defaultName,
          collectionId: sheetCollectionId,
          kind: sheetKind,
          src: p.src,
          silhouetteSrc: sheetKind === 'piece' ? p.silhouetteSrc : undefined,
          builtIn: false,
          createdAt: Date.now(),
        });
      }
      setSheetRawUrl(null);
      setSheetPieces([]);
    } finally {
      setSheetSaving(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const col: CollectionItem = {
      id,
      name: newColName.trim(),
      description: newColDesc.trim() || 'Colección personalizada.',
      order: collections.length + 1,
      accentColor: COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length],
      builtIn: false,
      isCoreCatalog: false,
    };
    await onAddCollection(col);
    setSelectedColId(id);
    setNewColName('');
    setNewColDesc('');
    setShowNewColForm(false);
  };

  const handleManualSilhouetteUpload = async (file: File | undefined) => {
    if (!file || !manualSilTargetImage) return;
    const raw = await fileToDataUrl(file);
    await onUpdateImage({
      ...manualSilTargetImage,
      silhouetteSrc: raw,
    });
    setManualSilTargetImage(null);
    if (manualSilInputRef.current) manualSilInputRef.current.value = '';
  };

  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairItemAId || !pairItemBId || pairItemAId === pairItemBId) return;
    const imgA = imageMap.get(pairItemAId);
    const imgB = imageMap.get(pairItemBId);
    if (!imgA || !imgB) return;

    const newPair: ImagePair = {
      id: `pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: pairLabel.trim() || `${imgA.name} y ${imgB.name}`,
      collectionId: imgA.collectionId,
      pairKind,
      itemAId: pairItemAId,
      itemBId: pairItemBId,
      builtIn: false,
      createdAt: Date.now(),
    };
    await onAddPair(newPair);
    setPairLabel('');
    setPairItemAId('');
    setPairItemBId('');
  };

  // Keep editingStageId valid if items removed
  useEffect(() => {
    if (staged.length > 0 && !staged.some((s) => s.tempId === editingStageId)) {
      setEditingStageId(staged[0].tempId);
    }
  }, [staged, editingStageId]);

  const pairCandidateImages = useMemo(
    () =>
      images.filter(
        (i) => pairFilterCol === 'all' || i.collectionId === pairFilterCol
      ),
    [images, pairFilterCol]
  );

  const imgTotalPages = Math.max(1, Math.ceil(colImages.length / 8));
  const safeImgPage = Math.min(imgPage, imgTotalPages - 1);
  const pagedColImages = colImages.slice(safeImgPage * 8, safeImgPage * 8 + 8);

  const pairTotalPages = Math.max(1, Math.ceil(pairs.length / 6));
  const safePairPage = Math.min(pairPage, pairTotalPages - 1);
  const pagedPairs = pairs.slice(safePairPage * 6, safePairPage * 6 + 6);

  return (
    <div className="page-container" style={{ gap: 10 }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleSelectFiles(e.target.files)}
        data-testid="image-file-input"
      />
      <input
        ref={sheetInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleSelectSheetFile(e.target.files?.[0])}
        data-testid="sheet-file-input"
      />
      <input
        ref={manualSilInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleManualSilhouetteUpload(e.target.files?.[0])}
      />

      {/* Top switch: Imágenes vs Parejas */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div className="segmented" style={{ maxWidth: 420 }}>
          <button
            type="button"
            className={activeTab === 'images' ? 'active' : ''}
            onClick={() => setActiveTab('images')}
            data-testid="tab-bank-images"
          >
            Banco de imágenes ({images.length})
          </button>
          <button
            type="button"
            className={activeTab === 'pairs' ? 'active' : ''}
            onClick={() => setActiveTab('pairs')}
            data-testid="tab-bank-pairs"
          >
            Parejas reutilizables ({pairs.length})
          </button>
        </div>

        {activeTab === 'images' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="btn-upload-images"
            >
              <ImagePlus size={18} /> Añadir imágenes
            </button>
            <button
              type="button"
              className="btn btn-coral btn-sm"
              onClick={() => sheetInputRef.current?.click()}
              data-testid="btn-slice-sheet"
            >
              <Grid2X2 size={18} /> Recortar lámina 2×4
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowNewColForm(true)}
            >
              <FolderPlus size={17} /> Nueva colección
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: IMAGES & COLLECTIONS (Zero-scroll Landscape!) */}
      {activeTab === 'images' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(230px, 270px) 1fr',
            gap: 14,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Compact 13-collection sidebar fitting all 13 without scroll! */}
          <aside
            className="board-card"
            style={{
              padding: '10px 10px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.96rem', padding: '0 6px 6px', flexShrink: 0 }}>
              Colecciones ({collections.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0, justifyContent: 'space-between' }}>
              {collections.map((col) => {
                const counts = countsByCollection.get(col.id) || { pieces: 0, scenarios: 0 };
                const total = counts.pieces + counts.scenarios;
                const isSelected = col.id === selectedColId;

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setSelectedColId(col.id);
                      setImgPage(0);
                    }}
                    data-testid={`col-item-${col.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: '5px 8px',
                      borderRadius: 10,
                      textAlign: 'left',
                      background: isSelected ? 'var(--accent-teal-soft)' : 'transparent',
                      border: `1.5px solid ${isSelected ? 'rgba(33,138,128,0.35)' : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          background: col.accentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: isSelected ? 'var(--accent-teal)' : 'var(--ink-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.name}
                      </span>
                    </div>
                    <span
                      className={`chip ${total > 0 ? 'chip-teal' : ''}`}
                      style={{ fontSize: '0.7rem', padding: '1px 7px', flexShrink: 0 }}
                    >
                      {total > 0 ? total : '0'}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Selected collection paginated 4x2 gallery */}
          <section
            className="board-card"
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              gap: 10,
            }}
          >
            {selectedCollection && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: 8,
                  borderBottom: '2px solid var(--border-card)',
                  flexShrink: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {selectedCollection.name}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {imgTotalPages > 1 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={safeImgPage === 0}
                        onClick={() => setImgPage((p) => Math.max(0, p - 1))}
                      >
                        Anterior
                      </button>
                      <span className="chip" style={{ fontSize: '0.78rem' }}>
                        {safeImgPage + 1}/{imgTotalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={safeImgPage >= imgTotalPages - 1}
                        onClick={() => setImgPage((p) => Math.min(imgTotalPages - 1, p + 1))}
                      >
                        Siguiente
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={`btn btn-sm ${showSilhouettes ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowSilhouettes((v) => !v)}
                  >
                    {showSilhouettes ? 'Ilustraciones' : 'Siluetas'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-coral"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> Subir
                  </button>
                </div>
              </div>
            )}

            {colImages.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 18,
                  border: '2.5px dashed var(--border-strong)',
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, color: 'var(--ink-secondary)', fontWeight: 600 }}>
                  Esta colección aún no tiene imágenes.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={19} /> Seleccionar imágenes
                </button>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {pagedColImages.map((img) => (
                  <div
                    key={img.id}
                    data-testid={`bank-img-${img.id}`}
                    style={{
                      background: '#fffdf8',
                      border: '2px solid var(--border-card)',
                      borderRadius: 16,
                      padding: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 6,
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        borderRadius: 10,
                        background: img.kind === 'scenario' ? 'transparent' : '#f7f1e3',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: img.kind === 'scenario' ? 0 : 6,
                      }}
                    >
                      <img
                        src={showSilhouettes && img.silhouetteSrc ? img.silhouetteSrc : img.src}
                        alt={img.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: img.kind === 'scenario' ? 'cover' : 'contain',
                          opacity: showSilhouettes && !img.silhouetteSrc ? 0.35 : 1,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <strong style={{ fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {img.name}
                      </strong>
                      {!img.builtIn ? (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {img.kind === 'piece' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              onClick={() => {
                                setManualSilTargetImage(img);
                                manualSilInputRef.current?.click();
                              }}
                            >
                              Silueta
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: 24, height: 24, borderRadius: 7, color: 'var(--accent-coral)' }}
                            onClick={() => onDeleteImage(img.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: img.kind === 'scenario' ? 'var(--accent-indigo)' : 'var(--accent-sage)', fontWeight: 700, flexShrink: 0 }}>
                          {img.kind === 'scenario' ? 'Paisaje' : '✓ Sil.'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: REUSABLE PAIRS (Zero-scroll Landscape!) */}
      {activeTab === 'pairs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 380px) 1fr', gap: 14, flex: 1, minHeight: 0 }}>
          <form className="board-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }} onSubmit={handleCreatePair}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 size={20} color="var(--accent-teal)" />
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                Crear pareja reutilizable
              </h2>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pair-label-input">
                Nombre de la pareja
              </label>
              <input
                id="pair-label-input"
                type="text"
                className="text-input"
                style={{ padding: '8px 12px' }}
                placeholder="Ej.: Vaca y ternero..."
                value={pairLabel}
                onChange={(e) => setPairLabel(e.target.value)}
                data-testid="pair-label-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pair-kind-select">
                Uso principal
              </label>
              <select
                id="pair-kind-select"
                className="select-input"
                style={{ padding: '8px 12px' }}
                value={pairKind}
                onChange={(e) => setPairKind(e.target.value as PairKind)}
              >
                <option value="related">Pareja relacionada (Correspondencias y Memory)</option>
                <option value="detail">Antes y después (¿Qué ha cambiado?)</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pair-col-filter">
                Filtrar por colección
              </label>
              <select
                id="pair-col-filter"
                className="select-input"
                style={{ padding: '8px 12px' }}
                value={pairFilterCol}
                onChange={(e) => setPairFilterCol(e.target.value)}
              >
                <option value="all">Todas las colecciones</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="pair-img-a">Imagen A</label>
                <select
                  id="pair-img-a"
                  className="select-input"
                  style={{ padding: '8px 10px' }}
                  value={pairItemAId}
                  onChange={(e) => setPairItemAId(e.target.value)}
                  data-testid="pair-select-a"
                >
                  <option value="">Elegir…</option>
                  {pairCandidateImages.map((img) => (
                    <option key={img.id} value={img.id}>{img.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="pair-img-b">Imagen B</label>
                <select
                  id="pair-img-b"
                  className="select-input"
                  style={{ padding: '8px 10px' }}
                  value={pairItemBId}
                  onChange={(e) => setPairItemBId(e.target.value)}
                  data-testid="pair-select-b"
                >
                  <option value="">Elegir…</option>
                  {pairCandidateImages.map((img) => (
                    <option key={img.id} value={img.id}>{img.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 'auto' }}
              disabled={!pairItemAId || !pairItemBId || pairItemAId === pairItemBId}
              data-testid="btn-save-pair"
            >
              <Plus size={18} /> Guardar pareja
            </button>
          </form>

          <section className="board-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                Parejas guardadas ({pairs.length})
              </h2>
              {pairTotalPages > 1 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={safePairPage === 0}
                    onClick={() => setPairPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="chip">{safePairPage + 1}/{pairTotalPages}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={safePairPage >= pairTotalPages - 1}
                    onClick={() => setPairPage((p) => Math.min(pairTotalPages - 1, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {pagedPairs.map((p) => {
                const a = imageMap.get(p.itemAId);
                const b = imageMap.get(p.itemBId);
                return (
                  <div
                    key={p.id}
                    data-testid={`saved-pair-${p.id}`}
                    style={{
                      background: '#fffdf8',
                      border: '2px solid var(--border-card)',
                      borderRadius: 16,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <strong style={{ fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.label}
                      </strong>
                      {!p.builtIn && (
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: 26, height: 26, color: 'var(--accent-coral)' }}
                          onClick={() => onDeletePair(p.id)}
                          aria-label={`Eliminar pareja ${p.label}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div className="activity-thumb-box" style={{ width: 56, height: 56 }}>
                        {a && <img src={a.src} alt={a.name} />}
                      </div>
                      <Link2 size={15} color="var(--ink-muted)" />
                      <div className="activity-thumb-box" style={{ width: 56, height: 56 }}>
                        {b && <img src={b.src} alt={b.name} />}
                      </div>
                    </div>
                    <span className={`chip ${p.pairKind === 'detail' ? 'chip-amber' : 'chip-teal'}`} style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '2px 8px' }}>
                      {p.pairKind === 'detail' ? 'Detalle' : 'Corresp. + Memory'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* MODAL: New Collection */}
      {showNewColForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-panel" style={{ maxWidth: 460 }} onSubmit={handleCreateCollection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Nueva colección temática</h2>
              <button type="button" className="btn-icon" onClick={() => setShowNewColForm(false)}>
                <X size={19} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="new-col-name">
                  Nombre de la colección
                </label>
                <input
                  id="new-col-name"
                  className="text-input"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Ej.: Instrumentos musicales"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="new-col-desc">
                  Descripción (opcional)
                </label>
                <input
                  id="new-col-desc"
                  className="text-input"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Breve nota sobre las imágenes..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewColForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear colección
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Multi-Image Import + Crop/Framing + Silhouette Preview */}
      {staged.length > 0 && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Incorporar imágenes">
          <div className="modal-panel" style={{ maxWidth: 820 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
                  Revisar y ajustar imágenes ({staged.length})
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                  Ajusta el encuadre, el nombre y la silueta antes de guardarlas en tu dispositivo.
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setStaged([])}>
                <X size={20} />
              </button>
            </div>

            {/* Thumbnail strip of all selected images */}
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, marginBottom: 14 }}>
              {staged.map((s) => (
                <div
                  key={s.tempId}
                  onClick={() => setEditingStageId(s.tempId)}
                  style={{
                    minWidth: 96,
                    padding: 8,
                    borderRadius: 16,
                    border: `3px solid ${s.tempId === editingStageId ? 'var(--accent-teal)' : 'var(--border-card)'}`,
                    background: s.tempId === editingStageId ? 'var(--accent-teal-soft)' : '#fffdf8',
                    cursor: 'pointer',
                    position: 'relative',
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStaged((prev) => prev.filter((item) => item.tempId !== s.tempId));
                    }}
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: '#fff',
                      border: '1px solid var(--border-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                  <img
                    src={s.previewSrc}
                    alt={s.name}
                    style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 4px' }}
                  />
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Active staged item editor */}
            {editingStage && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 20, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 20,
                      background:
                        'repeating-conic-gradient(#efe7d7 0% 25%, #fffdf8 0% 50%) 50% / 18px 18px',
                      border: '3px solid var(--border-card)',
                      padding: editingStage.kind === 'scenario' ? 0 : 10,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={editingStage.previewSrc}
                      alt={editingStage.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: editingStage.kind === 'scenario' ? 'cover' : 'contain',
                      }}
                    />
                  </div>

                  {editingStage.kind === 'piece' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: 14,
                        background: 'var(--bg-card-subtle)',
                        border: '1.5px solid var(--border-card)',
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 10,
                          background: '#fff',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {editingStage.silhouetteSrc ? (
                          <img
                            src={editingStage.silhouetteSrc}
                            alt="Silueta"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>—</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
                        {editingStage.silhouetteSrc ? (
                          <strong style={{ color: 'var(--accent-sage)' }}>
                            Silueta lista automáticamente
                          </strong>
                        ) : (
                          <span>
                            Fondo opaco detectado. Activa «Recortar fondo» o asocia una silueta manual
                            después.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Nombre de la imagen</label>
                    <input
                      type="text"
                      className="text-input"
                      value={editingStage.name}
                      data-testid="staged-name-input"
                      onChange={(e) => {
                        const val = e.target.value;
                        setStaged((prev) =>
                          prev.map((s) =>
                            s.tempId === editingStage.tempId ? { ...s, name: val } : s
                          )
                        );
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-field">
                      <label className="form-label">Colección</label>
                      <select
                        className="select-input"
                        value={editingStage.collectionId}
                        onChange={(e) => {
                          const cid = e.target.value;
                          setStaged((prev) =>
                            prev.map((s) =>
                              s.tempId === editingStage.tempId ? { ...s, collectionId: cid } : s
                            )
                          );
                        }}
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Tipo de recurso</label>
                      <select
                        className="select-input"
                        value={editingStage.kind}
                        onChange={(e) =>
                          updateStagedFraming(
                            editingStage.tempId,
                            {},
                            e.target.value as AssetKind
                          )
                        }
                      >
                        <option value="piece">Pieza manipulable</option>
                        <option value="scenario">Escenario (fondo completo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Framing controls */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      background: 'var(--bg-card-subtle)',
                      border: '1.5px solid var(--border-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem' }}>
                      <Crop size={16} /> Ajustar encuadre
                    </div>
                    <label style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Zoom ({Math.round(editingStage.framing.zoom * 100)}%)</span>
                      <input
                        type="range"
                        min="0.7"
                        max="2.2"
                        step="0.05"
                        value={editingStage.framing.zoom}
                        onChange={(e) =>
                          updateStagedFraming(editingStage.tempId, { zoom: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Desplazar horizontal</span>
                      <input
                        type="range"
                        min="-0.45"
                        max="0.45"
                        step="0.03"
                        value={editingStage.framing.offsetX}
                        onChange={(e) =>
                          updateStagedFraming(editingStage.tempId, {
                            offsetX: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Desplazar vertical</span>
                      <input
                        type="range"
                        min="-0.45"
                        max="0.45"
                        step="0.03"
                        value={editingStage.framing.offsetY}
                        onChange={(e) =>
                          updateStagedFraming(editingStage.tempId, {
                            offsetY: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>

                  {editingStage.kind === 'piece' && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        background: 'var(--bg-card-subtle)',
                        border: '1.5px solid var(--border-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingStage.framing.removeBackground}
                          onChange={(e) =>
                            updateStagedFraming(editingStage.tempId, {
                              removeBackground: e.target.checked,
                            })
                          }
                        />
                        <Scissors size={16} /> Recortar fondo uniforme automáticamente (para generar silueta)
                      </label>
                      {editingStage.framing.removeBackground && (
                        <label style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <span>Tolerancia de color ({editingStage.framing.bgTolerance})</span>
                          <input
                            type="range"
                            min="10"
                            max="70"
                            step="2"
                            value={editingStage.framing.bgTolerance}
                            onChange={(e) =>
                              updateStagedFraming(editingStage.tempId, {
                                bgTolerance: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 14, borderTop: '2px solid var(--border-card)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStaged([])}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSaveAllStaged}
                disabled={savingUploads}
                data-testid="btn-confirm-upload"
              >
                <Check size={20} />{' '}
                {savingUploads
                  ? 'Guardando…'
                  : `Incorporar ${staged.length === 1 ? '1 imagen' : `${staged.length} imágenes`}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 2x4 Sheet Slicer Assistant */}
      {sheetRawUrl && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recortar lámina en piezas">
          <div className="modal-panel" style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
                  Asistente de recorte de lámina ({sheetRows}×{sheetCols})
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ink-secondary)' }}>
                  Recorta automáticamente cada dibujo y genera su silueta en un clic.
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setSheetRawUrl(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Slicer settings bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: 12,
                padding: 14,
                borderRadius: 18,
                background: 'var(--bg-card-subtle)',
                border: '2px solid var(--border-card)',
                marginBottom: 16,
              }}
            >
              <div className="form-field">
                <label className="form-label">Rejilla de la lámina</label>
                <select
                  className="select-input"
                  value={`${sheetRows}x${sheetCols}`}
                  onChange={(e) => {
                    const [r, c] = e.target.value.split('x').map(Number);
                    setSheetRows(r);
                    setSheetCols(c);
                    runSheetSlice(sheetRawUrl, r, c, sheetRemoveBg, sheetBgTolerance, sheetKind, sheetBaseName);
                  }}
                >
                  <option value="2x4">2 filas × 4 columnas (8 dibujos)</option>
                  <option value="2x3">2 filas × 3 columnas (6 dibujos)</option>
                  <option value="2x2">2 filas × 2 columnas (4 dibujos)</option>
                  <option value="3x3">3 filas × 3 columnas (9 dibujos)</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Colección destino</label>
                <select
                  className="select-input"
                  value={sheetCollectionId}
                  onChange={(e) => setSheetCollectionId(e.target.value)}
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Tipo</label>
                <select
                  className="select-input"
                  value={sheetKind}
                  onChange={(e) => {
                    const k = e.target.value as AssetKind;
                    setSheetKind(k);
                    runSheetSlice(sheetRawUrl, sheetRows, sheetCols, sheetRemoveBg, sheetBgTolerance, k, sheetBaseName);
                  }}
                >
                  <option value="piece">Piezas recortadas + siluetas</option>
                  <option value="scenario">Escenarios (fondo completo)</option>
                </select>
              </div>

              <div className="form-field" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sheetRemoveBg}
                    onChange={(e) => {
                      setSheetRemoveBg(e.target.checked);
                      runSheetSlice(sheetRawUrl, sheetRows, sheetCols, e.target.checked, sheetBgTolerance, sheetKind, sheetBaseName);
                    }}
                  />
                  Quitar fondo blanco
                </label>
                {sheetRemoveBg && sheetKind === 'piece' && (
                  <label style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>Sensibilidad ({sheetBgTolerance})</span>
                    <input
                      type="range"
                      min="10"
                      max="55"
                      step="2"
                      value={sheetBgTolerance}
                      onChange={(e) => {
                        const tol = Number(e.target.value);
                        setSheetBgTolerance(tol);
                        runSheetSlice(sheetRawUrl, sheetRows, sheetCols, sheetRemoveBg, tol, sheetKind, sheetBaseName);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <span className="chip chip-teal">
                {sheetProcessing
                  ? 'Recortando dibujos y generando siluetas…'
                  : `${sheetPieces.filter((p) => p.included).length} de ${sheetPieces.length} piezas seleccionadas`}
              </span>
              {sheetKind === 'piece' && (
                <button
                  type="button"
                  className={`btn btn-sm ${sheetShowSilhouettes ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSheetShowSilhouettes((v) => !v)}
                  data-testid="sheet-toggle-silhouettes"
                >
                  {sheetShowSilhouettes ? 'Ver ilustraciones' : 'Comprobar las 8 siluetas'}
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(4, sheetCols)}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {sheetPieces.map((sp) => (
                <div
                  key={sp.index}
                  data-testid={`sliced-piece-${sp.index}`}
                  style={{
                    background: '#fffdf8',
                    border: `2.5px solid ${sp.included ? 'var(--accent-teal)' : 'var(--border-card)'}`,
                    borderRadius: 16,
                    padding: 10,
                    opacity: sp.included ? 1 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={sp.included}
                        onChange={(e) =>
                          setSheetPieces((prev) =>
                            prev.map((x) =>
                              x.index === sp.index ? { ...x, included: e.target.checked } : x
                            )
                          )
                        }
                      />
                      #{sp.index}
                    </label>
                    {sp.silhouetteSrc && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-sage)' }}>
                        ✓ Silueta
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      height: 112,
                      borderRadius: 12,
                      background:
                        'repeating-conic-gradient(#efe7d7 0% 25%, #fffdf8 0% 50%) 50% / 14px 14px',
                      padding: sheetKind === 'scenario' ? 0 : 6,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={sheetShowSilhouettes && sp.silhouetteSrc ? sp.silhouetteSrc : sp.src}
                      alt={sp.customName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: sheetKind === 'scenario' ? 'cover' : 'contain',
                      }}
                    />
                  </div>

                  <input
                    type="text"
                    className="text-input"
                    style={{ padding: '6px 9px', fontSize: '0.85rem' }}
                    value={sp.customName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSheetPieces((prev) =>
                        prev.map((x) => (x.index === sp.index ? { ...x, customName: val } : x))
                      );
                    }}
                    aria-label={`Nombre recorte ${sp.index}`}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 14, borderTop: '2px solid var(--border-card)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSheetRawUrl(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={sheetSaving || sheetProcessing || sheetPieces.filter((p) => p.included).length === 0}
                onClick={handleSaveSheetPieces}
                data-testid="btn-confirm-sheet-slice"
              >
                <Check size={20} />{' '}
                {sheetSaving
                  ? 'Guardando…'
                  : `Guardar ${sheetPieces.filter((p) => p.included).length} piezas y siluetas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove bottom footer margin in zero-scroll mode */}
    </div>
  );
}
