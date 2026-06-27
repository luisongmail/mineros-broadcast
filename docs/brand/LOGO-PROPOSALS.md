# PlayFlow — Propuestas de Logo

**Versión:** 1.0  
**Fecha:** 2026-06-27  
**Estado:** 🟡 EN REVISIÓN — requiere selección y aprobación

---

## Contexto de diseño

Tres propuestas distintas en dirección creativa. Cada una es ejecutable de forma independiente.  
El criterio de evaluación es:

| Criterio | Peso |
|----------|------|
| Funciona en 16×16px (favicon) y en banner 1200px | Alto |
| Evoca producción profesional + béisbol sin ser literal | Alto |
| Comunica movimiento y tecnología | Medio |
| Funciona en fondo oscuro (panel operador) y claro (landing) | Alto |
| Memorable y diferenciable de competencia | Medio |

---

## PROPUESTA A — "The Play Button"

### Concepto
El isotipo es un triángulo de reproducción (`▶`) con una modificación sutil: el vértice derecho está abierto, formando una estela de velocidad — como la trayectoria de una pelota o el cursor de un live stream.

```
    ╔══════════════════════════════════╗
    ║                                  ║
    ║   ▶╌╌╌   P l a y F l o w        ║
    ║                                  ║
    ╚══════════════════════════════════╝
```

### Anatomía detallada

**Isotipo (el símbolo):**
- Triángulo equilátero apuntando a la derecha
- Esquina derecha (vértice) abierta — 3 líneas horizontales de grosor decreciente salen hacia la derecha (`▶ ≡`)
- Las 3 líneas representan: velocidad, datos en streaming, y el eco visual de una jugada
- El triángulo tiene esquinas ligeramente redondeadas (radio: 2px en escala 32px)
- Color: **Flow Cyan `#00C4E0`** sobre fondo oscuro / **Flow Blue `#0D1F3C`** sobre fondo claro

**Wordmark:**
- Fuente: **Space Grotesk Bold 700**
- "Play" en peso normal / "Flow" en mismo peso pero con tracking ligeramente mayor (+1px)
- O alternativa: "Play" en Flow Blue + "Flow" en Flow Cyan (diferenciación cromática)
- No hay separación entre las palabras — es un solo bloque `PlayFlow`
- La `F` de "Flow" extiende su barra horizontal 4px más de lo normal (sutil, crea dirección)

**Composición completa:**
- Isotipo a la izquierda del wordmark
- Alineación centrada vertical entre isotipo y texto
- Proporción: isotipo ocupa el 80% de la altura de la x del wordmark

### Paleta de color por variante

| Variante | Fondo | Isotipo | Texto |
|----------|-------|---------|-------|
| Principal (oscuro) | `#0D1F3C` | `#00C4E0` | `#F4F7FA` |
| Principal (claro) | `#F4F7FA` | `#0D1F3C` | `#0D1F3C` |
| Monotono negro | transparente | `#070E1A` | `#070E1A` |
| Monotono blanco | transparente | `#FFFFFF` | `#FFFFFF` |
| Acento full color | transparente | `#00C4E0` | `#0D1F3C` |

### Por qué funciona
- **▶ es universalmente reconocido** como "en vivo" / "transmisión" — el usuario lo decodifica instantáneamente
- La estela de líneas agrega movimiento sin caer en clichés de béisbol
- Funciona en 16×16 (solo el triángulo + 3 líneas, sin texto) hasta billboard
- **Diferenciador:** Ningún software de béisbol usa el play button como marca central — todos usan diamante o pelota
- La apertura del vértice crea una tensión visual sutil que hace el logo más interesante que un simple triángulo

### Riesgos
- El `▶` es muy común en tech (YouTube, Netlify, Vercel) — necesita la estela para diferenciarse
- Puede confundirse con un reproductor de media genérico sin el contexto deportivo

---

## PROPUESTA B — "The Diamond Play"

### Concepto
Un diamante rotado 45° (base del béisbol) que al mismo tiempo es la letra **P** de PlayFlow — un monograma geométrico que funciona como isotipo. El wordmark usa una versión customizada de Space Grotesk donde la `P` es reemplazada por el isotipo.

```
    ╔══════════════════════════════════╗
    ║                                  ║
    ║   ◇   PlayFlow                   ║
    ║  /P\  (la P es el diamante)      ║
    ║                                  ║
    ╚══════════════════════════════════╝
```

### Anatomía detallada

**Isotipo (el diamante-P):**
- Cuadrado rotado 45° (diamante) con grosor de trazo uniforme (stroke, no fill)
- El lado izquierdo del diamante tiene una línea vertical descendente que forma el "palo" de la letra P
- El semicírculo de la P se sugiere en la esquina superior-derecha del diamante
- Resultado: quien conoce béisbol ve un diamante; quien lee ve una P
- Grosor de trazo: ~12% del ancho total del símbolo
- Esquinas del diamante: vértices levemente redondeados (radio 1.5px en 32px)
- Color fill del interior: ninguno (stroke only) en versión principal; fill en Flow Cyan en variante sólida

**Wordmark:**
- "PlayFlow" en Space Grotesk Bold
- La **P** inicial del wordmark es reemplazada por el isotipo a escala reducida
- Separación entre isotipo y el resto del texto: 6px
- Tracking del texto: 0 (normal) para peso visual limpio

**Composición completa (dos versiones):**
1. **Stacked (vertical):** Isotipo centrado sobre el wordmark — para app icon, avatar
2. **Horizontal:** Isotipo a la izquierda + "PlayFlow" a la derecha — para header, navbar

### Paleta de color por variante

| Variante | Fondo | Isotipo | Texto |
|----------|-------|---------|-------|
| Principal (oscuro) | `#0D1F3C` | `#00C4E0` stroke | `#F4F7FA` |
| Principal (claro) | `#F4F7FA` | `#0D1F3C` stroke | `#0D1F3C` |
| Filled (activo/live) | `#0D1F3C` | `#00C4E0` fill | `#00C4E0` |
| Gradient | `#0D1F3C` | gradient `#00C4E0→#00E096` | `#F4F7FA` |

### Por qué funciona
- **Doble lectura** (diamante + letra P): un logo que revela su segundo nivel al mirarlo — memorable y técnicamente sofisticado
- El diamante es el ícono universal del béisbol pero aquí está completamente reimaginado
- La versión stroke (solo trazo) es extremadamente versátil — funciona en cualquier escala
- **Diferenciador:** Es el único logo de béisbol que usa el diamante como tipografía, no como ilustración
- Funciona perfectamente como favicon (solo el diamante-P) y como logo completo

### Riesgos
- La doble lectura puede no ser evidente sin explicación en primeros contactos
- Requiere ejecución precisa — si el isotipo no está bien construido, se pierde el efecto P

---

## PROPUESTA C — "Flow Lines"

### Concepto
El isotipo son **3 líneas horizontales de longitud decreciente** organizadas en diagonal ascendente — como las líneas de velocidad de una pelota en vuelo, o como un gráfico de datos en crecimiento. Es completamente abstracto pero evoca tanto broadcast como béisbol de forma oblicua.

```
    ╔══════════════════════════════════╗
    ║                                  ║
    ║   ═══                            ║
    ║     ════   PlayFlow              ║
    ║       ═══════                    ║
    ╚══════════════════════════════════╝
```

### Anatomía detallada

**Isotipo (las flow lines):**
- 3 líneas horizontales dispuestas en diagonal ascendente (izquierda-abajo → derecha-arriba)
- Longitudes: 8px / 12px / 20px (en escala 32px de alto)
- Grosor: 3px cada línea, terminaciones redondeadas (round caps)
- Espaciado vertical entre líneas: 4px
- Color: gradiente `#00C4E0 → #00E096` (cyan a green) — de izquierda a derecha
- La línea inferior es la más corta (pasado), la superior la más larga (momentum, crecimiento)
- Ángulo de la diagonal imaginaria: 25°

**Wordmark:**
- Space Grotesk Bold 700
- Tracking: 0
- Color: `#F4F7FA` sobre oscuro / `#0D1F3C` sobre claro
- Kerning especial: la `y` y la `F` tienen -2px de kern para unidad visual

**Composición:**
- Las flow lines están alineadas verticalmente al centro del wordmark
- Proporción: el bloque de las 3 líneas ocupa el 60% del alto de la cap height

### Paleta de color por variante

| Variante | Fondo | Isotipo | Texto |
|----------|-------|---------|-------|
| Principal (oscuro) | `#0D1F3C` | gradient `#00C4E0→#00E096` | `#F4F7FA` |
| Principal (claro) | `#F4F7FA` | `#0D1F3C` monotono | `#0D1F3C` |
| Live indicator | `#070E1A` | animado (las líneas pulsan) | `#F4F7FA` |
| Monotono | cualquiera | color sólido del texto | mismo |

**Versión animada (para web/app):**
Las 3 líneas pulsan de longitud en loop — la más corta crece, la mediana sigue, la larga completa — creando una animación de "flujo de datos en vivo". Duración: 1.2s, easing ease-in-out.

### Por qué funciona
- **Completamente abstracto** — no hay riesgo de parecer "logo genérico de béisbol"
- Las líneas de velocidad son un lenguaje visual universal en sports broadcasting
- El gradiente cyan→green refuerza la paleta de marca sin necesitar explicación
- **La animación** convierte el logo en un indicador visual de "sistema activo" — perfecto para el panel de operador cuando el servidor está conectado
- Funciona en versión ultra-reducida (3 líneas siempre son reconocibles a 16px)
- Es el más versátil de las 3 propuestas para uso en interfaces de software

### Riesgos
- Sin contexto, no comunica béisbol — depende 100% del nombre "PlayFlow"
- Puede parecerse a logos de fintech o SaaS genérico si la paleta no es fuerte

---

## Comparación de propuestas

| Criterio | A — Play Button | B — Diamond Play | C — Flow Lines |
|----------|:--------------:|:---------------:|:--------------:|
| Reconocible en 16px | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Evoca béisbol | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Evoca broadcast/tech | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Originalidad vs competencia | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Facilidad de ejecución | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Versatilidad de uso | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Potencial de animación | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Total** | **28** | **27** | **30** |

---

## Recomendación

**Primera opción: C (Flow Lines)** — la más versátil, animable y diferenciada.  
**Segunda opción: A (Play Button)** — la más intuitiva y fácil de ejecutar hoy.  
**B (Diamond Play)** — la más rica en significado, recomendada si el diseñador es senior.

### Combinación posible: A+C
El isotipo de **C** (3 flow lines) + el `▶` de **A** formando un bloque: el triángulo de play seguido de las 3 líneas. Comunica broadcast (▶) y flujo de datos (≡≡≡) en un solo glifo compacto.

```
  ▶ ═══
    ═════
    ═══

  → Logo compacto: ▶≡
```

---

## Cómo ejecutarlas

### Con Figma (gratis)
1. Crea los shapes con las medidas especificadas arriba (escala base: 32×32px)
2. Usa Google Fonts: Space Grotesk Bold + Inter
3. Exporta en SVG + PNG 1x/2x/3x
4. Prueba en fondo oscuro `#0D1F3C` y claro `#F4F7FA`

### Con Midjourney / DALL-E (referencia visual rápida)
Prompt sugerido para cada propuesta:

**A:** `minimalist logo design, play button triangle with speed lines on right side, "PlayFlow" text in modern geometric sans-serif, dark navy background, cyan accent color, professional sports broadcast software brand`

**B:** `minimalist logo, baseball diamond shape that doubles as letter P monogram, stroke style, cyan and navy color palette, "PlayFlow" wordmark, clean geometric design, sports technology brand`

**C:** `minimalist logo, three horizontal lines of increasing length arranged diagonally, cyan to green gradient, "PlayFlow" in bold geometric sans-serif, dark background, sports broadcast software, data visualization aesthetic`

---

*Siguiente paso: seleccionar una propuesta o combinación para desarrollo en Figma.*
