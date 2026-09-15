// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ImageCropper from "@/components/admin/image-cropper";

/** jsdom no implementa ResizeObserver. */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Se guarda lo que el componente le pide al canvas. */
const canvas = {
  draws: [] as unknown[][],
  types: [] as (string | undefined)[],
};

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    imageSmoothingQuality: "high",
    drawImage: (...args: unknown[]) => {
      canvas.draws.push(args);
    },
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function (
    callback: BlobCallback,
    type?: string,
  ) {
    canvas.types.push(type);
    callback(new Blob([new Uint8Array([1, 2, 3, 4])], { type: type ?? "image/jpeg" }));
  } as typeof HTMLCanvasElement.prototype.toBlob;
});

afterEach(() => {
  // Sin `globals: true` el cleanup automático no corre: cada test desmonta lo suyo.
  cleanup();
  canvas.draws = [];
  canvas.types = [];
});

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function makeFile(name = "retrato.jpg", type = "image/jpeg") {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], name, { type });
}

/** Simula que el navegador terminó de decodificar la imagen. */
async function simulateImageLoad(width = 1000, height = 1000) {
  // La previsualización usa alt="" (es parte del diálogo), así que se busca por
  // DOM. Aparece cuando FileReader termina de leer el archivo.
  await waitFor(() => expect(document.querySelector("img")).toBeTruthy());
  const image = document.querySelector("img") as HTMLImageElement;
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(image);
  return image;
}

const SETTINGS = { aspect: 4 / 5, outputWidth: 800, title: "Ajustá el encuadre de tu foto" };

describe("ImageCropper", () => {
  it("se muestra como diálogo con el encuadre pedido", () => {
    render(
      <ImageCropper file={makeFile()} settings={SETTINGS} onCancel={() => {}} onConfirm={() => {}} />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(SETTINGS.title)).toBeTruthy();
    expect(screen.getByText(/4:5/)).toBeTruthy();
  });

  it("no deja confirmar hasta que la imagen está lista", async () => {
    render(
      <ImageCropper file={makeFile()} settings={SETTINGS} onCancel={() => {}} onConfirm={() => {}} />,
    );

    const confirm = button("Usar esta foto");
    expect(confirm.disabled).toBe(true);

    await simulateImageLoad();
    await waitFor(() => expect(button("Usar esta foto").disabled).toBe(false));
  });

  it("entrega el archivo recortado con la parte visible de la imagen", async () => {
    const onConfirm = vi.fn();
    render(
      <ImageCropper
        file={makeFile()}
        settings={SETTINGS}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await simulateImageLoad(1000, 1000);
    fireEvent.click(button("Usar esta foto"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    const cropped = onConfirm.mock.calls[0][0] as File;
    expect(cropped.name).toBe("retrato-recorte.jpg");
    expect(cropped.type).toBe("image/jpeg");
    expect(cropped.size).toBeGreaterThan(0);

    // El recorte se le pide al canvas con las medidas calculadas por `sourceRect`.
    expect(canvas.draws).toHaveLength(1);
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = canvas.draws[0] as number[];
    expect(sw / sh).toBeCloseTo(4 / 5, 4);
    expect(dw).toBe(800);
    expect(dh).toBe(1000);
    expect([dx, dy]).toEqual([0, 0]);
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sx + sw).toBeLessThanOrEqual(1000.001);
    expect(sy + sh).toBeLessThanOrEqual(1000.001);
  });

  it("conserva el PNG cuando el archivo original es PNG", async () => {
    const onConfirm = vi.fn();
    render(
      <ImageCropper
        file={makeFile("logo.png", "image/png")}
        settings={SETTINGS}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await simulateImageLoad(600, 800);
    fireEvent.click(button("Usar esta foto"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect((onConfirm.mock.calls[0][0] as File).name).toBe("logo-recorte.png");
    expect(canvas.types[0]).toBe("image/png");
  });

  it("no agranda la imagen: el recorte nunca supera el tamaño original", async () => {
    const onConfirm = vi.fn();
    render(
      <ImageCropper
        file={makeFile()}
        settings={{ aspect: 4 / 5, outputWidth: 800 }}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await simulateImageLoad(300, 400);
    fireEvent.click(button("Usar esta foto"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    const [, , , sw, sh, , , dw, dh] = canvas.draws[0] as number[];
    expect(sw).toBeLessThanOrEqual(300.001);
    expect(sh).toBeLessThanOrEqual(400.001);
    expect(dw).toBeLessThanOrEqual(800);
    expect(dh).toBeLessThanOrEqual(800);
  });

  it("cambia el zoom con el control deslizante", async () => {
    render(
      <ImageCropper file={makeFile()} settings={SETTINGS} onCancel={() => {}} onConfirm={() => {}} />,
    );
    await simulateImageLoad();

    const slider = screen.getByLabelText("Zoom") as HTMLInputElement;
    expect(slider.value).toBe("1");

    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider.value).toBe("2");
    expect(screen.getByText("200%")).toBeTruthy();
  });

  it("acerca y aleja con el teclado y restablece con 0", async () => {
    render(
      <ImageCropper file={makeFile()} settings={SETTINGS} onCancel={() => {}} onConfirm={() => {}} />,
    );
    await simulateImageLoad();

    const stage = screen.getByRole("application");
    fireEvent.keyDown(stage, { key: "+" });
    expect((screen.getByLabelText("Zoom") as HTMLInputElement).value).toBe("1.1");

    fireEvent.keyDown(stage, { key: "+" });
    expect((screen.getByLabelText("Zoom") as HTMLInputElement).value).toBe("1.2");

    fireEvent.keyDown(stage, { key: "0" });
    expect((screen.getByLabelText("Zoom") as HTMLInputElement).value).toBe("1");
  });

  it("cancelar cierra el recortador sin subir nada", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ImageCropper
        file={makeFile()}
        settings={SETTINGS}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await simulateImageLoad();
    fireEvent.click(button("Cancelar"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("avisa si la subida falla y deja reintentar", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("La imagen supera los 5 MB."));
    render(
      <ImageCropper
        file={makeFile()}
        settings={SETTINGS}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await simulateImageLoad();
    fireEvent.click(button("Usar esta foto"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("5 MB");
    expect(button("Usar esta foto").disabled).toBe(false);
  });
});
