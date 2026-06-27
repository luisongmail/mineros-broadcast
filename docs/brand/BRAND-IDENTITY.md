# PlayFlow — Identidad de Marca

**Versión:** 1.0 — Aprobada  
**Fecha:** 2026-06-27  
**Estado:** ✅ APROBADA PARA IMPLEMENTACIÓN  
**Propietario:** Equipo de producto PlayFlow

---

> **Nota de contexto:** Este documento define la identidad de PlayFlow como **producto comercial independiente**.  
> El design system de overlays (paleta del club, tipografías de transmisión) es un *tema visual aplicado a cada cliente* — no la identidad de la marca del producto.  
> Ambas capas coexisten y son distintas intencionalmente.

---

## 1. Esencia de la marca

### Misión
Dar a cualquier equipo de béisbol o sóftbol del mundo la capacidad de producir transmisiones en vivo de calidad profesional.

### Visión
Ser el estándar global de software de producción deportiva para béisbol y sóftbol, desde ligas juveniles hasta organizaciones nacionales.

### Propósito (por qué existe PlayFlow)
Hoy, producir una transmisión de béisbol con overlays dinámicos, scoring en tiempo real y gráficos de estadísticas requiere equipos técnicos y presupuestos que solo las grandes organizaciones pueden pagar. PlayFlow lo democratiza.

---

## 2. Nombre

**PlayFlow**

| Elemento | Significado |
|----------|-------------|
| **Play** | Jugada, reproducción, transmisión en vivo — el corazón del béisbol |
| **Flow** | Flujo continuo de datos, del juego a la pantalla; la experiencia fluida de producción |
| Juntos | "El flujo de la jugada" — captura tanto la naturaleza del deporte como de la transmisión |

**Escritura:** siempre `PlayFlow` (camel case, sin espacio, sin guion)  
**Nunca:** `Playflow`, `PLAYFLOW`, `Play Flow`, `play flow`

---

## 3. Propuesta de valor

> **PlayFlow convierte a cualquier persona con una laptop en un productor deportivo profesional.**

En una sola plataforma:
- **Scoring en vivo** — panel táctil, reglas MLBAM/WBSC, estadísticas automáticas
- **Overlays de broadcast** — scorebug, bateador, pitcher, transiciones, anuncios, sponsors
- **Control de transmisión** — Preview/Program, escenas, integración con OBS/Vmix vía Browser Source
- **Gestión del juego** — alineaciones, sustituciones, auditoría completa

---

## 4. Audiencia objetivo

### Primaria
| Segmento | Descripción |
|----------|-------------|
| Clubes de béisbol / sóftbol | Equipos amateurs y semiprofesionales con transmisiones en redes |
| Ligas y federaciones nacionales | Organizaciones con 10-200 equipos afiliados |
| Productoras deportivas | Empresas que cubren torneos para broadcasters locales o streaming |

### Secundaria
| Segmento | Descripción |
|----------|-------------|
| Canales de YouTube deportivos | Creadores de contenido que transmiten partidos |
| Universidades y colegios | Programas atléticos con transmisiones estudiantiles |

### Geografía
**Mercado global** — con énfasis inicial en:
1. Chile (mercado de origen, validación)
2. México, República Dominicana, Venezuela, Panamá (béisbol consolidado)
3. Japón, Corea del Sur (béisbol de alto nivel, comunidad tecnológica activa)
4. USA Hispanic market (ligas comunitarias latinas)

---

## 5. Posicionamiento

> "PlayFlow es el único software diseñado específicamente para la producción de transmisiones de béisbol y sóftbol — desde el primer pitch hasta la pantalla final."

### Ventaja competitiva
| Dimensión | Competidores genéricos | PlayFlow |
|-----------|----------------------|----------|
| Especialización | Producciones genéricas | 100% béisbol/sóftbol |
| Curva de aprendizaje | Alta — requiere training | Operativo en < 30 min |
| Integración scoring + broadcast | Desacoplada | Nativa y en tiempo real |
| Precio | Enterprise / alto | SaaS accesible para clubes |
| Estándares deportivos | Ninguno | MLBAM + WBSC nativos |

---

## 6. Valores de marca

| Valor | Manifestación |
|-------|---------------|
| **Precisión** | Cada dato, cada estadística, cada overlay refleja el juego real |
| **Accesibilidad** | Funciona para el club juvenil de Santiago y para la liga nacional de Japón |
| **Fluidez** | Sin fricción entre el juego y la pantalla — todo fluye |
| **Rigor** | Estándares MLBAM y WBSC como base no negociable |
| **Confianza** | El sistema no falla en el momento más importante del juego |

---

## 7. Voz y tono

### Voz (constante)
Experta, directa, apasionada por el béisbol. Habla como un productor veterano que también es fanático del deporte.

### Tono (varía por contexto)

| Contexto | Tono | Ejemplo |
|----------|------|---------|
| Marketing / landing | Energético, inspirador | "Tu transmisión. Tu juego. Tu historia." |
| Documentación técnica | Preciso, sin ambigüedad | "El overlay scorebug se renderiza en el canvas 1920×1080." |
| Soporte al usuario | Empático, eficiente | "Entendemos que cada segundo cuenta en un juego en vivo." |
| Errores del sistema | Honesto, con solución | "No pudimos conectar. Verifica tu red y vuelve a intentarlo." |

### Lo que nunca decimos
- Jerga corporativa vacía ("synergy", "end-to-end solutions")
- Hipérbole sin sustento ("el mejor software del mundo")
- Lenguaje condescendiente con el usuario

---

## 8. Identidad visual — Paleta de color

### Criterio de diseño
PlayFlow necesita una paleta que transmita **producción profesional + tecnología + béisbol** — sin estar atada a los colores de ningún club. Debe funcionar en interfaces oscuras (el panel de control durante un juego nocturno) y claras (landing page, documentación).

### Paleta propuesta

| Rol | Nombre | Hex | Uso principal |
|-----|--------|-----|---------------|
| **Primario** | Flow Blue | `#0D1F3C` | Fondos principales, navbar, áreas de datos |
| **Acento primario** | Flow Cyan | `#00C4E0` | CTAs, highlights, elementos interactivos activos |
| **Acento secundario** | Flow Green | `#00E096` | Éxito, scoring activo, conexión en vivo |
| **Neutro claro** | Chalk White | `#F4F7FA` | Fondos de página, tarjetas en modo claro |
| **Neutro medio** | Slate | `#4A5D72` | Texto secundario, bordes, labels |
| **Fondo oscuro** | Broadcast Black | `#070E1A` | Panel de operador, modo oscuro |
| **Alerta** | Live Red | `#E8293A` | Estados de error, acciones destructivas, badge "EN VIVO" |
| **Advertencia** | Amber | `#F59E0B` | Warnings, pendientes, step-up requerido |

### Rationale de paleta
- **Flow Blue** (#0D1F3C): navy oscuro que evoca el cielo nocturno de un estadio y la seriedad de la producción televisiva. Distinto del Mineros Navy (#1B2F5B) — más profundo y neutral.
- **Flow Cyan** (#00C4E0): color de "transmisión en vivo" — evoca pantallas de broadcast, luces de estudio, flujo de datos.
- **Flow Green** (#00E096): indica actividad en tiempo real — el sistema está respondiendo, el juego está vivo.
- La triada `Blue + Cyan + Green` es tech-deportiva sin ser agresiva.

### Modo oscuro (panel de operador)
El panel de control se usa siempre en modo oscuro. Los colores primarios sobre `#070E1A` crean contraste WCAG AA en todos los casos de uso críticos.

---

## 9. Tipografía de marca

### Propuesta

| Rol | Familia | Variantes | Fuente |
|-----|---------|-----------|--------|
| **Display / Headlines** | **Space Grotesk** | Bold 700, Medium 500 | Google Fonts — libre |
| **Cuerpo / UI** | **Inter** | Regular 400, Medium 500, SemiBold 600 | Google Fonts — libre |
| **Datos / Código / IDs** | **JetBrains Mono** | Regular 400 | Google Fonts — libre |

### Rationale
- **Space Grotesk**: geométrica-humanista, con carácter técnico sin ser fría. Sus terminaciones ligeramente irregulares le dan personalidad deportiva. Funciona excepcionalmente en tamaños grandes (headlines, pantallas de score). Es moderna sin ser efímera.
- **Inter**: el estándar de facto para UI de datos — legibilidad impecable en tamaños pequeños, óptima en pantallas de alta densidad. Ya la usamos en el design system de overlays.
- **JetBrains Mono**: para IDs de juego, timestamps, valores numéricos precisos — refuerza la dimensión técnica/datos del producto.

### Escala tipográfica de marca
```
Headline XL:  Space Grotesk Bold 700 / 56px / tracking -1px
Headline L:   Space Grotesk Bold 700 / 40px / tracking -0.5px
Headline M:   Space Grotesk Medium 500 / 28px
Body L:       Inter Regular 400 / 18px / line-height 1.7
Body M:       Inter Regular 400 / 16px / line-height 1.6
Label:        Inter Medium 500 / 14px / uppercase / tracking +0.5px
Caption:      Inter Regular 400 / 12px
Code/Data:    JetBrains Mono 400 / 13px
```

### Relación con el design system de overlays
El design system de overlays (Bebas Neue + Inter) es el **tema broadcast** aplicado sobre el canvas 1920×1080. La tipografía de marca PlayFlow (Space Grotesk + Inter) aplica a todo lo que es producto: landing page, panel de control, documentación, materiales de marketing.

---

## 10. Logotipo e isotipo — Dirección conceptual

### Concepto
El logotipo de PlayFlow debe capturar **movimiento + datos + béisbol** en su forma más minimal. No debe ilustrar literalmente el deporte — el nombre ya lo dice.

### Dirección propuesta: **Wordmark dinámico**

```
  ▶ PlayFlow
```

**Elementos:**
1. **Símbolo de play (`▶`)** — icónico, universal, evoca transmisión en vivo. Puede usarse solo como isotipo en espacios pequeños (app icon, favicon).
2. **"PlayFlow"** en Space Grotesk Bold — la `F` puede tener una extensión horizontal que sugiere movimiento/velocidad (un "swipe" tipográfico).
3. **Color:** el símbolo `▶` en Flow Cyan sobre Flow Blue, o solo en Cyan sobre fondo oscuro.

### Variantes del sistema de logo
| Variante | Uso |
|----------|-----|
| Logo completo oscuro | Landing page header, documentación |
| Logo completo claro | Sobre fondos blancos, materiales impresos |
| Isotipo solo (`▶`) | App icon, favicon, avatar de redes sociales |
| Wordmark sin isotipo | Espacio horizontal reducido |

### Lo que NO debe ser el logo
- Una pelota de béisbol (demasiado literal)
- Una pantalla/TV (demasiado genérico)
- Un diamante de béisbol (cliché del béisbol)
- Una onda de audio/radio (ya lo usa todo el mundo en broadcast)

---

## 11. Dominio web

### Recomendación: `playflow.app`

| Dominio | Disponibilidad probable | Evaluación |
|---------|------------------------|------------|
| **`playflow.app`** | Alta | ✅ Ideal — `.app` refuerza el posicionamiento SaaS/software, Google fuerza HTTPS |
| `playflow.io` | Media | ✅ Alternativa sólida — estándar tech/startup |
| `playflowsports.com` | Alta | ⚠️ Descriptivo pero largo |
| `getplayflow.com` | Alta | ⚠️ Patrón SaaS clásico pero genérico |
| `playflow.dev` | Alta | ⚠️ Demasiado técnico, confunde con developer tools |

**Recomendación final:** registrar `playflow.app` como dominio principal + `playflow.io` como redirect.

---

## 12. Modelo de negocio

**SaaS por equipo/club — suscripción mensual**

### Estructura de planes propuesta (orientativa)

| Plan | Target | Precio referencial | Límites |
|------|--------|-------------------|---------|
| **Starter** | Club amateur, 1 equipo | ~$29 USD/mes | 1 operador, 50 juegos/año, overlays básicos |
| **Club** | Club activo, transmisiones regulares | ~$79 USD/mes | 3 operadores, juegos ilimitados, todos los overlays |
| **Pro** | Liga pequeña, múltiples equipos | ~$199 USD/mes | 10 operadores, multi-equipo, API, audit completo |
| **Enterprise** | Federaciones, broadcasters | Custom | Unlimited, SLA, soporte dedicado, white-label |

> Nota: Los precios son orientativos — deben validarse con investigación de mercado antes de publicar.

---

## 13. Elevator pitch

> "PlayFlow es el software que convierte a cualquier equipo de béisbol o sóftbol en un estudio de producción. Desde el scoring en tiempo real hasta los overlays de broadcast — todo en una sola plataforma, desde $29 al mes."

### Versión 30 segundos
> "Imagina que tu equipo puede transmitir un juego con la calidad visual de ESPN — scorebug en vivo, estadísticas automáticas, transiciones profesionales — sin un equipo técnico y sin gastar miles de dólares. Eso es PlayFlow. Software de producción deportiva diseñado específicamente para béisbol y sóftbol, en cualquier lugar del mundo."

---

## 14. Lo que PlayFlow NO es

| ❌ No es | ✅ Es |
|----------|-------|
| Un software genérico de streaming | Especializado en béisbol y sóftbol |
| Un reemplazo de OBS/Vmix | Un complemento inteligente que se conecta a ellos |
| Software solo para profesionales | Accesible para clubes amateurs desde el día 1 |
| La marca de un equipo o club | Una plataforma neutral que sirve a cualquier equipo |
| Un sistema de venta de tickets | Un sistema de producción y scoring |

---

## 15. Decisiones documentadas

| ID | Decisión | Aprobado |
|----|----------|---------|
| B-01 | Misión: democratizar la producción deportiva de béisbol/sóftbol | ✅ 2026-06-27 |
| B-02 | Dominio principal: `playflow.app` | ✅ 2026-06-27 |
| B-03 | Logotipo: wordmark dinámico con isotipo `▶` en Space Grotesk | ✅ 2026-06-27 |
| B-04 | Paleta: Flow Blue + Flow Cyan + Flow Green (no colores Mineros) | ✅ 2026-06-27 |
| B-05 | Tipografía: Space Grotesk (display) + Inter (UI) + JetBrains Mono (datos) | ✅ 2026-06-27 |
| B-06 | Modelo: SaaS por equipo, 4 planes (Starter/Club/Pro/Enterprise) | ✅ 2026-06-27 |
| B-07 | Mercado: Global — foco inicial Chile + Caribe + Asia + USA Hispanic | ✅ 2026-06-27 |
| B-08 | Posicionamiento: único software especializado en béisbol/sóftbol | ✅ 2026-06-27 |
| B-09 | Voz: experta, directa, apasionada — nunca corporativa ni condescendiente | ✅ 2026-06-27 |
| B-10 | Elevator pitch: "estudio de producción desde $29/mes" | ✅ 2026-06-27 |
| B-11 | Valores: Precisión, Accesibilidad, Fluidez, Rigor, Confianza | ✅ 2026-06-27 |
| B-12 | Audiencia primaria: clubes, ligas, productoras deportivas | ✅ 2026-06-27 |

---

*Este documento es la fuente de verdad de identidad de marca PlayFlow. Cualquier cambio requiere nueva versión documentada.*
