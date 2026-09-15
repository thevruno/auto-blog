"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Spinner } from "@/components/admin/ui";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampOffset,
  clampZoom,
  displayedSize,
  formatAspect,
  frameSize,
  outputSize,
  sourceRect,
  type Offset,
  type Size,
} from "@/lib/crop";

export interface CropSettings {
  /** Proporción de destino (ancho / alto). La define el lugar del sitio donde se usa la foto. */
  aspect: number;
  title?: string;
  description?: string;
  /** Ancho máximo, en píxeles, del archivo recortado. */
  outputWidth?: number;
}

/** Margen entre el frame y el borde de la vista. */
const STAGE_PADDING = 16;
const DEFAULT_OUTPUT_WIDTH = 1000;

/**
 * Recortador de imágenes del panel.
 *
 * Muestra la foto completa, con el encuadre final marcado y el resto oscurecido,
 * para que se vea exactamente qué va a quedar en el sitio. Se puede arrastrar
 * (mouse o dedo), hacer zoom con la rueda, el control deslizante o el teclado.
 */
export default function ImageCropper({
  file,
  settings,
  onCancel,
  onConfirm,
}: {
  file: File;
  settings: CropSettings;
  onCancel: () => void;
  onConfirm: (cropped: File) => Promise<void> | void;
}) {
  const aspect = settings.aspect > 0 ? settings.aspect : 1;

  const [objectUrl, setObjectUrl] = useState("");
  const [image, setImage] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [stage, setStage] = useState<Size>({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; from: Offset } | null>(
    null,
  );

  // Se lee el archivo para previsualizarlo (en el callback, no en el cuerpo
  // del efecto, para no disparar renders en cascada).
  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();

    reader.onload = () => {
      if (!cancelled) setObjectUrl(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      if (!cancelled) setError("No se pudo leer el archivo elegido.");
    };
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [file]);

  // El frame se calcula midiendo la vista disponible.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const measure = () =>
      setStage({ width: element.clientWidth, height: element.clientHeight });

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const frame = useMemo(
    () =>
      frameSize(
        aspect,
        Math.max(40, stage.width - STAGE_PADDING * 2),
        Math.max(40, stage.height - STAGE_PADDING * 2),
      ),
    [aspect, stage.height, stage.width],
  );

  const frameX = Math.round((stage.width - frame.width) / 2);
  const frameY = Math.round((stage.height - frame.height) / 2);

  const displayed = image
    ? displayedSize(frame, image, zoom)
    : { width: frame.width, height: frame.height };

  const safeOffset = image ? clampOffset(offset, frame, image, zoom) : offset;

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Zoom con la rueda: hay que registrar el listener a mano porque React lo
  // agrega como pasivo y no permite frenar el scroll de la página.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) =>
        clampZoom(current * (event.deltaY < 0 ? 1.08 : 1 / 1.08)),
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: safeOffset,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !image) return;

    setOffset(
      clampOffset(
        {
          x: drag.from.x + (event.clientX - drag.startX),
          y: drag.from.y + (event.clientY - drag.startY),
        },
        frame,
        image,
        zoom,
      ),
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 24 : 8;

    if (event.key === "ArrowLeft") setOffset((o) => ({ ...o, x: o.x - step }));
    else if (event.key === "ArrowRight") setOffset((o) => ({ ...o, x: o.x + step }));
    else if (event.key === "ArrowUp") setOffset((o) => ({ ...o, y: o.y - step }));
    else if (event.key === "ArrowDown") setOffset((o) => ({ ...o, y: o.y + step }));
    else if (event.key === "+" || event.key === "=") setZoom((z) => clampZoom(z + 0.1));
    else if (event.key === "-") setZoom((z) => clampZoom(z - 0.1));
    else if (event.key === "0") reset();
    else if (event.key === "Escape") onCancel();
    else return;

    event.preventDefault();
  }

  /** Genera el archivo recortado con la parte de la imagen que quedó en el frame. */
  async function renderCrop(): Promise<File> {
    const element = imageRef.current;
    if (!element || !image) throw new Error("La imagen todavía no está lista.");

    const rect = sourceRect(frame, image, zoom, safeOffset);
    const size = outputSize(rect, settings.outputWidth ?? DEFAULT_OUTPUT_WIDTH);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no permite recortar la imagen.");

    context.imageSmoothingQuality = "high";
    context.drawImage(element, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height);

    const type =
      file.type === "image/png"
        ? "image/png"
        : file.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
    const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, type === "image/jpeg" ? 0.92 : undefined),
    );
    if (!blob) throw new Error("No se pudo generar la imagen recortada.");

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}-recorte.${extension}`, { type });
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm(await renderCrop());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo recortar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recortador-titulo"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="recortador-titulo" className="font-serif text-lg font-semibold text-ink">
          {settings.title ?? "Ajustá el encuadre"}
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          {settings.description ??
            `Recuadro ${formatAspect(aspect)}: arrastrá la foto para moverla y usá el zoom para acercarla.`}
        </p>

        <div
          ref={stageRef}
          tabIndex={0}
          role="application"
          aria-label="Área de recorte: arrastrá para mover la foto, flechas para ajustar fino, más y menos para el zoom"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="relative mt-4 h-[46vh] max-h-[420px] min-h-[220px] w-full touch-none cursor-grab overflow-hidden rounded-xl bg-ink/85 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <div
            className="absolute"
            style={{ left: frameX, top: frameY, width: frame.width, height: frame.height }}
          >
            {objectUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- es la previsualización del archivo que se está editando (blob local), no una imagen del sitio.
              <img
                ref={imageRef}
                src={objectUrl}
                alt=""
                draggable={false}
                onLoad={(event) =>
                  setImage({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: displayed.width,
                  height: displayed.height,
                  transform: `translate(-50%, -50%) translate(${safeOffset.x}px, ${safeOffset.y}px)`,
                }}
              />
            )}
          </div>

          {/* Marco del encuadre: oscurece todo lo que queda afuera. */}
          <div
            className="pointer-events-none absolute rounded-md ring-2 ring-white/90"
            style={{
              left: frameX,
              top: frameY,
              width: frame.width,
              height: frame.height,
              boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
            }}
          />

          {!image && (
            <div className="absolute inset-0 grid place-items-center text-white">
              <Spinner className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="recortador-zoom" className="text-sm text-ink/70">
            Zoom
          </label>
          <input
            id="recortador-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
            className="h-1.5 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-ink/15 accent-brand-700"
          />
          <span className="w-12 text-right text-xs tabular-nums text-ink/60">
            {Math.round(zoom * 100)}%
          </span>
          <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
            Restablecer
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={busy || !image}>
            {busy ? <Spinner className="h-4 w-4" /> : "Usar esta foto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
