import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axiosInstance from '@/helpers/api/axiosInstance';

export type AspectRatioOption = 'FREE' | 'WEB';

interface ImageCropperModalProps {
  show: boolean;
  imageUri: string;
  fileName?: string;
  onClose: () => void;
  onSave: (croppedUri: string, croppedFile: File) => Promise<void> | void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Web İlan Detay Galerisi ölçüsü (694.6 / 440 ≈ 1.5786)
const WEB_GALLERY_ASPECT_RATIO = 694.6 / 440;

const PRESETS: { key: AspectRatioOption; label: string; ratio: number | null }[] = [
  { key: 'FREE', label: 'Tüm Fotoğraf (Serbest)', ratio: null },
  { key: 'WEB', label: 'Web Kalıbı', ratio: WEB_GALLERY_ASPECT_RATIO },
];

export default function ImageCropperModal({
  show,
  imageUri,
  fileName = 'cropped_image.jpg',
  onClose,
  onSave,
}: ImageCropperModalProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('FREE');
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [sourceUrl, setSourceUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const dragInfoRef = useRef<{
    mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
    startX: number;
    startY: number;
    startBox: CropBox;
  } | null>(null);

  // Responsive container bounds (ideal compact size)
  const [maxDisplayBounds, setMaxDisplayBounds] = useState({ width: 600, height: 390 });

  useEffect(() => {
    const updateBounds = () => {
      if (typeof window === 'undefined') return;
      const w = Math.min(Math.max(window.innerWidth - 60, 300), 600);
      const h = Math.min(Math.max(window.innerHeight * 0.48, 240), 390);
      setMaxDisplayBounds({ width: Math.round(w), height: Math.round(h) });
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [show]);

  const isFlipped = rotation === 90 || rotation === 270;

  // Load natural dimensions when image changes or modal opens
  useEffect(() => {
    if (!show || !imageUri) {
      setNaturalSize(null);
      setLoading(true);
      setRotation(0);
      setAspectRatio('FREE');
      setSourceUrl('');
      return;
    }

    setLoading(true);
    setRotation(0);
    setAspectRatio('FREE');

    let active = true;
    let createdBlobUrl: string | null = null;

    const prepareImage = async () => {
      let resolvedSrc = imageUri;

      // Convert remote/proxy image to local blob URL to prevent tainted canvas
      if (imageUri && !imageUri.startsWith('blob:') && !imageUri.startsWith('data:')) {
        try {
          const resp = await axiosInstance.get(imageUri, { responseType: 'blob' });
          if (resp.data instanceof Blob) {
            createdBlobUrl = URL.createObjectURL(resp.data);
            resolvedSrc = createdBlobUrl;
          }
        } catch (axiosErr) {
          console.warn('Axios blob fetch failed, trying direct fetch:', axiosErr);
          try {
            const resp = await fetch(imageUri, { cache: 'no-cache' });
            if (resp.ok) {
              const blob = await resp.blob();
              createdBlobUrl = URL.createObjectURL(blob);
              resolvedSrc = createdBlobUrl;
            }
          } catch (fetchErr) {
            console.warn('Direct fetch failed, falling back to original URI:', fetchErr);
            resolvedSrc = imageUri;
          }
        }
      }

      if (!active) {
        if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
        return;
      }
      setSourceUrl(resolvedSrc);

      const isLocalBlob = resolvedSrc.startsWith('blob:') || resolvedSrc.startsWith('data:');
      const img = new Image();
      if (!isLocalBlob) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (!active) return;
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setLoading(false);
      };
      img.onerror = () => {
        // Fallback without crossOrigin
        const fallback = new Image();
        fallback.onload = () => {
          if (!active) return;
          setNaturalSize({ width: fallback.naturalWidth, height: fallback.naturalHeight });
          setLoading(false);
        };
        fallback.onerror = () => {
          if (!active) return;
          setLoading(false);
          toast.error('Fotoğraf yüklenemedi.');
        };
        fallback.src = resolvedSrc;
      };
      img.src = resolvedSrc;
    };

    prepareImage();

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [show, imageUri]);

  const initCropBox = useCallback((dispW: number, dispH: number, preset: AspectRatioOption) => {
    const targetPreset = PRESETS.find((p) => p.key === preset);
    const ratio = targetPreset?.ratio;

    if (!ratio) {
      // Free preset: fills the entire displayed area
      setCropBox({
        x: 0,
        y: 0,
        width: dispW,
        height: dispH,
      });
      return;
    }

    let bw = dispW;
    let bh = bw / ratio;

    if (bh > dispH) {
      bh = dispH;
      bw = bh * ratio;
    }

    bw = Math.round(bw);
    bh = Math.round(bh);
    const bx = Math.round((dispW - bw) / 2);
    const by = Math.round((dispH - bh) / 2);

    setCropBox({
      x: Math.max(0, bx),
      y: Math.max(0, by),
      width: Math.min(bw, dispW),
      height: Math.min(bh, dispH),
    });
  }, []);

  // Compute displayed image box dimensions based on rotation and container limits
  useEffect(() => {
    if (!naturalSize) return;

    const currentW = isFlipped ? naturalSize.height : naturalSize.width;
    const currentH = isFlipped ? naturalSize.width : naturalSize.height;

    // Scale image up or down to comfortably fit the cropper bounds
    const scale = Math.min(maxDisplayBounds.width / currentW, maxDisplayBounds.height / currentH);
    const dispW = Math.max(Math.round(currentW * scale), 200);
    const dispH = Math.max(Math.round(currentH * scale), 150);

    setDisplaySize({ width: dispW, height: dispH });
    initCropBox(dispW, dispH, aspectRatio);
  }, [naturalSize, isFlipped, maxDisplayBounds, aspectRatio, initCropBox]);

  const handleSelectPreset = (preset: AspectRatioOption) => {
    setAspectRatio(preset);
    if (displaySize.width > 0 && displaySize.height > 0) {
      initCropBox(displaySize.width, displaySize.height, preset);
    }
  };


  // Drag handling
  const startDrag = (
    mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r',
    clientX: number,
    clientY: number
  ) => {
    dragInfoRef.current = {
      mode,
      startX: clientX,
      startY: clientY,
      startBox: { ...cropBox },
    };
  };

  useEffect(() => {
    if (!show) return;

    const onPointerMove = (e: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;

      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      const { startBox, mode } = info;
      const dispW = displaySize.width;
      const dispH = displaySize.height;
      const activePreset = PRESETS.find((p) => p.key === aspectRatio);
      const ratio = activePreset?.ratio;

      const minSize = 40;

      if (mode === 'move') {
        const nextX = Math.max(0, Math.min(dispW - startBox.width, startBox.x + dx));
        const nextY = Math.max(0, Math.min(dispH - startBox.height, startBox.y + dy));
        setCropBox((prev) => ({ ...prev, x: Math.round(nextX), y: Math.round(nextY) }));
      } else if (mode === 'r') {
        let newW = Math.max(minSize, Math.min(dispW - startBox.x, startBox.width + dx));
        let newH = startBox.height;
        if (ratio) {
          newH = Math.min(dispH - startBox.y, newW / ratio);
          newW = newH * ratio;
        }
        setCropBox((prev) => ({
          ...prev,
          width: Math.round(newW),
          height: Math.round(newH),
        }));
      } else if (mode === 'b') {
        let newH = Math.max(minSize, Math.min(dispH - startBox.y, startBox.height + dy));
        let newW = startBox.width;
        if (ratio) {
          newW = Math.min(dispW - startBox.x, newH * ratio);
          newH = newW / ratio;
        }
        setCropBox((prev) => ({
          ...prev,
          width: Math.round(newW),
          height: Math.round(newH),
        }));
      } else if (mode === 't') {
        let newY = Math.max(0, Math.min(startBox.y + startBox.height - minSize, startBox.y + dy));
        let newH = startBox.height - (newY - startBox.y);
        let newW = startBox.width;
        if (ratio) {
          newW = Math.min(dispW - startBox.x, newH * ratio);
          newH = newW / ratio;
          newY = startBox.y + (startBox.height - newH);
        }
        setCropBox((prev) => ({
          ...prev,
          y: Math.round(newY),
          height: Math.round(newH),
          width: Math.round(newW),
        }));
      } else if (mode === 'l') {
        let newX = Math.max(0, Math.min(startBox.x + startBox.width - minSize, startBox.x + dx));
        let newW = startBox.width - (newX - startBox.x);
        let newH = startBox.height;
        if (ratio) {
          newH = Math.min(dispH - startBox.y, newW / ratio);
          newW = newH * ratio;
          newX = startBox.x + (startBox.width - newW);
        }
        setCropBox((prev) => ({
          ...prev,
          x: Math.round(newX),
          width: Math.round(newW),
          height: Math.round(newH),
        }));
      } else if (mode === 'br') {
        let newW = Math.max(minSize, Math.min(dispW - startBox.x, startBox.width + dx));
        let newH = ratio ? newW / ratio : Math.max(minSize, Math.min(dispH - startBox.y, startBox.height + dy));

        if (ratio && startBox.y + newH > dispH) {
          newH = dispH - startBox.y;
          newW = newH * ratio;
        }

        setCropBox((prev) => ({
          ...prev,
          width: Math.round(newW),
          height: Math.round(newH),
        }));
      } else if (mode === 'tl') {
        let newW = Math.max(minSize, startBox.width - dx);
        let newH = ratio ? newW / ratio : Math.max(minSize, startBox.height - dy);

        let newX = startBox.x + (startBox.width - newW);
        let newY = startBox.y + (startBox.height - newH);

        if (newX < 0) {
          newW += newX;
          newX = 0;
          if (ratio) newH = newW / ratio;
        }
        if (newY < 0) {
          newH += newY;
          newY = 0;
          if (ratio) newW = newH * ratio;
        }

        setCropBox({
          x: Math.round(Math.max(0, newX)),
          y: Math.round(Math.max(0, newY)),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      } else if (mode === 'tr') {
        let newW = Math.max(minSize, Math.min(dispW - startBox.x, startBox.width + dx));
        let newH = ratio ? newW / ratio : Math.max(minSize, startBox.height - dy);
        let newY = startBox.y + (startBox.height - newH);

        if (newY < 0) {
          newH += newY;
          newY = 0;
          if (ratio) newW = newH * ratio;
        }

        setCropBox({
          x: Math.round(startBox.x),
          y: Math.round(Math.max(0, newY)),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      } else if (mode === 'bl') {
        let newW = Math.max(minSize, startBox.width - dx);
        let newH = ratio ? newW / ratio : Math.max(minSize, Math.min(dispH - startBox.y, startBox.height + dy));
        let newX = startBox.x + (startBox.width - newW);

        if (newX < 0) {
          newW += newX;
          newX = 0;
          if (ratio) newH = newW / ratio;
        }
        if (ratio && startBox.y + newH > dispH) {
          newH = dispH - startBox.y;
          newW = newH * ratio;
          newX = startBox.x + (startBox.width - newW);
        }

        setCropBox({
          x: Math.round(Math.max(0, newX)),
          y: Math.round(startBox.y),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
    };

    const onPointerUp = () => {
      dragInfoRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [show, aspectRatio, displaySize]);

  // Export cropped image via HTML5 Canvas
  const handleApplyCrop = async () => {
    if (!naturalSize || displaySize.width <= 0 || displaySize.height <= 0) return;
    setProcessing(true);

    try {
      const isFlipped = rotation === 90 || rotation === 270;
      const currentNaturalW = isFlipped ? naturalSize.height : naturalSize.width;
      const currentNaturalH = isFlipped ? naturalSize.width : naturalSize.height;

      const scaleX = currentNaturalW / displaySize.width;
      const scaleY = currentNaturalH / displaySize.height;

      const realX = Math.max(0, Math.round(cropBox.x * scaleX));
      const realY = Math.max(0, Math.round(cropBox.y * scaleY));
      const realW = Math.min(currentNaturalW - realX, Math.round(cropBox.width * scaleX));
      const realH = Math.min(currentNaturalH - realY, Math.round(cropBox.height * scaleY));

      let imgToDraw: CanvasImageSource | null = null;
      if (imageElementRef.current && imageElementRef.current.complete && imageElementRef.current.naturalWidth > 0) {
        imgToDraw = imageElementRef.current;
      } else {
        const targetSrc = sourceUrl || imageUri;
        const isLocalBlob = targetSrc.startsWith('blob:') || targetSrc.startsWith('data:');
        const img = new Image();
        if (!isLocalBlob) {
          img.crossOrigin = 'anonymous';
        }

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            imgToDraw = img;
            resolve();
          };
          img.onerror = () => {
            const fallback = new Image();
            fallback.onload = () => {
              imgToDraw = fallback;
              resolve();
            };
            fallback.onerror = () => reject(new Error('Görsel yüklenemedi.'));
            fallback.src = targetSrc;
          };
          img.src = targetSrc;
        });
      }

      if (!imgToDraw) throw new Error('Görsel hazırlanamadı.');

      // 1. Draw full rotated image
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = currentNaturalW;
      fullCanvas.height = currentNaturalH;
      const fullCtx = fullCanvas.getContext('2d');
      if (!fullCtx) throw new Error('Canvas context oluşturulamadı');

      fullCtx.translate(currentNaturalW / 2, currentNaturalH / 2);
      fullCtx.rotate((rotation * Math.PI) / 180);
      fullCtx.drawImage(imgToDraw, -naturalSize.width / 2, -naturalSize.height / 2);

      // 2. Extract cropped area
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.max(1, realW);
      cropCanvas.height = Math.max(1, realH);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Crop context oluşturulamadı');

      cropCtx.drawImage(fullCanvas, realX, realY, realW, realH, 0, 0, realW, realH);

      cropCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setProcessing(false);
            toast.error('Kırpılan görsel oluşturulamadı.');
            return;
          }
          const croppedUri = URL.createObjectURL(blob);
          const safeName = (fileName || 'image.jpg').replace(/\.[^/.]+$/, '') + '_cropped.jpg';
          const croppedFile = new File([blob], safeName, { type: 'image/jpeg' });
          try {
            await onSave(croppedUri, croppedFile);
          } finally {
            setProcessing(false);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      console.error('Kırpma hatası:', err);
      toast.error('Kırpma işlemi başarısız: ' + (err?.message || 'Bilinmeyen hata'));
      setProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      size="lg"
      contentClassName="border-0 shadow-none bg-transparent"
    >
      <div
        className="text-white mx-auto w-100 overflow-hidden"
        style={{
          maxWidth: '680px',
          backgroundColor: '#151821',
          borderRadius: '22px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Header */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-3"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
              }}
            >
              <i className="fe fe-crop" style={{ fontSize: '18px' }} />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: '15px', color: '#ffffff' }}>
                Fotoğrafı Kırp ve Düzenle
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Fotoğrafın görünmesini istediğiniz alanını seçin
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-link text-secondary p-1 border-0 shadow-none"
            onClick={onClose}
            disabled={processing}
            style={{ color: '#94a3b8' }}
          >
            <i className="fe fe-x fs-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          className="d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden user-select-none"
          style={{ minHeight: `${maxDisplayBounds.height + 30}px`, backgroundColor: '#090b10' }}
        >
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="success" size="sm" className="mb-2" />
              <div className="small text-secondary">Fotoğraf yükleniyor...</div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="position-relative overflow-hidden rounded-2"
              style={{
                width: `${displaySize.width}px`,
                height: `${displaySize.height}px`,
                backgroundColor: '#ffffff',
              }}
            >
              {/* Base Image with Rotation */}
              <img
                ref={imageElementRef}
                src={sourceUrl || imageUri}
                crossOrigin={
                  (sourceUrl || imageUri).startsWith('blob:') || (sourceUrl || imageUri).startsWith('data:')
                    ? undefined
                    : 'anonymous'
                }
                alt="Kırpılacak görsel"
                draggable={false}
                style={{
                  width: isFlipped ? `${displaySize.height}px` : '100%',
                  height: isFlipped ? `${displaySize.width}px` : '100%',
                  position: isFlipped ? 'absolute' : 'relative',
                  top: isFlipped ? '50%' : undefined,
                  left: isFlipped ? '50%' : undefined,
                  transform: isFlipped
                    ? `translate(-50%, -50%) rotate(${rotation}deg)`
                    : `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                }}
              />

              {/* Shaded Regions Around Crop Box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${cropBox.y}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.62)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y + cropBox.height}px`,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.62)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y}px`,
                  left: 0,
                  width: `${cropBox.x}px`,
                  height: `${cropBox.height}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.62)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y}px`,
                  left: `${cropBox.x + cropBox.width}px`,
                  right: 0,
                  height: `${cropBox.height}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.62)',
                  pointerEvents: 'none',
                }}
              />

              {/* The Crop Box Overlay */}
              <div
                style={{
                  position: 'absolute',
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  border: '1.5px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)',
                  cursor: 'move',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startDrag('move', e.clientX, e.clientY);
                }}
              >
                {/* Rule of Thirds Grid Lines */}
                <div
                  style={{
                    position: 'absolute',
                    top: '33.33%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '66.66%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '33.33%',
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '66.66%',
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Corner Handles */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    left: '-7px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    border: '2px solid #1e293b',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                    cursor: 'nwse-resize',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('tl', e.clientX, e.clientY);
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    right: '-7px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    border: '2px solid #1e293b',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                    cursor: 'nesw-resize',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('tr', e.clientX, e.clientY);
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-7px',
                    left: '-7px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    border: '2px solid #1e293b',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                    cursor: 'nesw-resize',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('bl', e.clientX, e.clientY);
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-7px',
                    right: '-7px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    border: '2px solid #1e293b',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                    cursor: 'nwse-resize',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('br', e.clientX, e.clientY);
                  }}
                />

                {/* Edge Handles (Only in Free mode) */}
                {aspectRatio === 'FREE' && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        left: '20%',
                        right: '20%',
                        height: '10px',
                        cursor: 'ns-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('t', e.clientX, e.clientY);
                      }}
                    >
                      <div style={{ width: '28px', height: '3px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '20%',
                        right: '20%',
                        height: '10px',
                        cursor: 'ns-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('b', e.clientX, e.clientY);
                      }}
                    >
                      <div style={{ width: '28px', height: '3px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '20%',
                        bottom: '20%',
                        left: '-5px',
                        width: '10px',
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('l', e.clientX, e.clientY);
                      }}
                    >
                      <div style={{ height: '28px', width: '3px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '20%',
                        bottom: '20%',
                        right: '-5px',
                        width: '10px',
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('r', e.clientX, e.clientY);
                      }}
                    >
                      <div style={{ height: '28px', width: '3px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar: Presets */}
        <div
          className="d-flex align-items-center px-4 py-3"
          style={{
            backgroundColor: '#11141c',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '8px',
          }}
        >
          {PRESETS.map((preset) => {
            const isActive = aspectRatio === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                className="btn btn-sm rounded-pill px-3 py-1 fw-semibold transition-all border-0 shadow-none"
                style={{
                  fontSize: '12px',
                  backgroundColor: isActive ? '#22c55e' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                }}
                onClick={() => handleSelectPreset(preset.key)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div
          className="d-flex align-items-center justify-content-end gap-2 px-3 py-3"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#151821',
          }}
        >
          <button
            type="button"
            className="btn btn-sm px-4 fw-semibold text-secondary border-0 shadow-none"
            onClick={onClose}
            disabled={processing}
            style={{ color: '#94a3b8' }}
          >
            İptal
          </button>

          <button
            type="button"
            className="btn btn-success btn-sm px-4 py-1.5 rounded-pill fw-bold d-flex align-items-center gap-1.5 shadow-sm border-0"
            style={{
              backgroundColor: '#22c55e',
              fontSize: '13px',
            }}
            onClick={handleApplyCrop}
            disabled={processing || loading}
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Uygulanıyor...</span>
              </>
            ) : (
              <>
                <i className="fe fe-check" />
                <span>Kırp ve Uygula</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
