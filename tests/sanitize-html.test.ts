import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/utils";

describe("sanitizeHtml: contenido legítimo del editor", () => {
  it("conserva párrafos, títulos y formato", () => {
    const html = `<h2>Un título</h2><p>Texto <strong>en negrita</strong> y <em>cursiva</em>.</p>`;
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("conserva listas, citas y bloques de código", () => {
    const html = `<ul><li>uno</li><li>dos</li></ul><blockquote>cita</blockquote><pre><code>const a = 1;</code></pre>`;
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("conserva enlaces relativos y absolutos", () => {
    expect(sanitizeHtml(`<a href="/blog">blog</a>`)).toBe(`<a href="/blog">blog</a>`);
    expect(sanitizeHtml(`<a href="https://ejemplo.com/x">x</a>`)).toBe(
      `<a href="https://ejemplo.com/x">x</a>`,
    );
    expect(sanitizeHtml(`<a href="mailto:hola@ejemplo.com">mail</a>`)).toBe(
      `<a href="mailto:hola@ejemplo.com">mail</a>`,
    );
  });

  it("conserva imágenes con alt y tamaño", () => {
    const html = `<img src="https://ejemplo.com/foto.png" alt="Una foto" width="400" height="300">`;
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("normaliza etiquetas y atributos en mayúsculas", () => {
    expect(sanitizeHtml(`<IMG SRC="foto.png" ALT="foto">`)).toBe(
      `<img src="foto.png" alt="foto">`,
    );
  });

  it("acepta sub, sup, span, figure y figcaption", () => {
    const html = `<figure><img src="a.png" alt="a"><figcaption>pie</figcaption></figure><p>H<sub>2</sub>O</p>`;
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe("sanitizeHtml: scripts y handlers", () => {
  it("elimina script con su contenido", () => {
    expect(sanitizeHtml(`<p>antes</p><script>alert(1)</script>`)).toBe(`<p>antes</p>`);
  });

  it("elimina script sin cierre dejando el texto inerte", () => {
    const result = sanitizeHtml(`<script>alert(1)`);
    expect(result).not.toContain("<script");
  });

  it("elimina el atributo onerror", () => {
    expect(sanitizeHtml(`<img src="x" onerror="alert(1)">`)).toBe(`<img src="x">`);
  });

  it("elimina onerror sin comillas", () => {
    expect(sanitizeHtml(`<img src=x onerror=alert(1)>`)).toBe(`<img src="x">`);
  });

  it("elimina onclick en cualquier etiqueta", () => {
    expect(sanitizeHtml(`<p onclick="robar()">hola</p>`)).toBe(`<p>hola</p>`);
  });

  it("elimina el estilo inline (puede traer url() externas)", () => {
    expect(sanitizeHtml(`<p style="background:url(//malicioso.com/x)">hola</p>`)).toBe(
      `<p>hola</p>`,
    );
  });

  it("elimina iframe, form, object, embed y sus contenidos", () => {
    expect(sanitizeHtml(`<iframe src="//malicioso.com"></iframe>ok`)).toBe("ok");
    expect(sanitizeHtml(`<form action="//malicioso.com"><input name="x"></form>ok`)).toBe("ok");
    expect(sanitizeHtml(`<object data="x"></object>ok`)).toBe("ok");
    expect(sanitizeHtml(`<embed src="x">ok`)).toBe("ok");
  });

  it("elimina math y svg inline", () => {
    expect(sanitizeHtml(`<math><mi>x</mi></math>ok`)).toBe("ok");
    expect(sanitizeHtml(`<svg/onload=alert(1)>ok`)).toBe("ok");
    expect(sanitizeHtml(`<svg><script>alert(1)</script></svg>ok`)).toBe("ok");
  });

  it("elimina meta, link y base", () => {
    expect(sanitizeHtml(`<meta http-equiv="refresh" content="0;url=//x"><p>a</p>`)).toBe(
      `<p>a</p>`,
    );
    expect(sanitizeHtml(`<link rel="stylesheet" href="//x"><p>a</p>`)).toBe(`<p>a</p>`);
    expect(sanitizeHtml(`<base href="//malicioso.com"><p>a</p>`)).toBe(`<p>a</p>`);
  });

  it("elimina comentarios HTML", () => {
    expect(sanitizeHtml(`<p>a<!-- oculto --></p>`)).toBe(`<p>a</p>`);
  });

  it("descarta etiquetas desconocidas pero conserva el texto", () => {
    expect(sanitizeHtml(`<marquee>hola</marquee>`)).toBe(`hola`);
    expect(sanitizeHtml(`<custom-element>texto</custom-element>`)).toBe(`texto`);
  });
});

describe("sanitizeHtml: URLs peligrosas", () => {
  it("elimina href con javascript:", () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).toBe(`<a>x</a>`);
  });

  it("elimina javascript: ofuscado con entidades HTML", () => {
    expect(sanitizeHtml(`<a href="&#106;avascript:alert(1)">x</a>`)).toBe(`<a>x</a>`);
    expect(sanitizeHtml(`<a href="&#x6a;avascript:alert(1)">x</a>`)).toBe(`<a>x</a>`);
    expect(sanitizeHtml(`<a href="jav&#x61;script:alert(1)">x</a>`)).toBe(`<a>x</a>`);
  });

  it("elimina javascript: con tabulaciones o mayúsculas", () => {
    expect(sanitizeHtml(`<a href="java\tscript:alert(1)">x</a>`)).toBe(`<a>x</a>`);
    expect(sanitizeHtml(`<a href="JaVaScRiPt:alert(1)">x</a>`)).toBe(`<a>x</a>`);
  });

  it("elimina src con data:", () => {
    expect(sanitizeHtml(`<img src="data:image/svg+xml;base64,PHN2Zz4=">`)).toBe(`<img>`);
  });

  it("elimina esquemas raros (vbscript, file)", () => {
    expect(sanitizeHtml(`<a href="vbscript:msgbox(1)">x</a>`)).toBe(`<a>x</a>`);
    expect(sanitizeHtml(`<a href="file:///etc/passwd">x</a>`)).toBe(`<a>x</a>`);
  });

  it("deja el enlace sin href cuando la URL no es segura", () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)" title="ojo">x</a>`)).toBe(
      `<a title="ojo">x</a>`,
    );
  });
});

describe("sanitizeHtml: enlaces externos y texto suelto", () => {
  it("agrega rel de seguridad a los enlaces con target _blank", () => {
    expect(sanitizeHtml(`<a href="https://x.com" target="_blank">x</a>`)).toBe(
      `<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>`,
    );
  });

  it("respeta los rel propios y quita opener", () => {
    expect(
      sanitizeHtml(`<a href="https://x.com" target="_blank" rel="opener nofollow">x</a>`),
    ).toBe(`<a href="https://x.com" target="_blank" rel="nofollow noopener noreferrer">x</a>`);
  });

  it("descarta target con valores raros", () => {
    expect(sanitizeHtml(`<a href="https://x.com" target="raro">x</a>`)).toBe(
      `<a href="https://x.com">x</a>`,
    );
  });

  it("escapa los < sueltos para que no abran etiquetas", () => {
    expect(sanitizeHtml(`hola < 3 y 5 > 2`)).toBe(`hola &lt; 3 y 5 > 2`);
    expect(sanitizeHtml(`<img src=x`)).toBe(`&lt;img src=x`);
    expect(sanitizeHtml(`<img src="x" onerror=alert(1)`)).toBe(`&lt;img src="x" onerror=alert(1)`);
  });

  it("descarta width/height que no sean números", () => {
    expect(sanitizeHtml(`<img src="a.png" width="1;color:red">`)).toBe(`<img src="a.png">`);
    expect(sanitizeHtml(`<img src="a.png" height="100%">`)).toBe(`<img src="a.png">`);
  });

  it("escapa las comillas del valor de un atributo", () => {
    expect(sanitizeHtml(`<img src="a.png" alt='di "hola"'>`)).toBe(
      `<img src="a.png" alt="di &quot;hola&quot;">`,
    );
  });

  it("devuelve string vacío con entrada vacía", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
