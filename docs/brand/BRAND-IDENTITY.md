# PlayFlow — Identidad de Marca

**Versión:** 0.1 — Borrador inicial  
**Fecha:** 2026-06-27  
**Estado:** 🔴 EN CONSTRUCCIÓN — requiere aprobación de definiciones marcadas con `[DEFINIR]`  
**Propietario:** Equipo de producto PlayFlow

---

> **Nota de contexto:** Este documento define la identidad de PlayFlow como **producto comercial**.  
> El design system de los overlays (paleta Mineros, tipografías de transmisión) es un *tema visual aplicado a un cliente* — no la identidad de la marca del producto.  
> Ambas capas coexisten y son distintas.

---

## ÍNDICE

1. [Esencia de la marca](#1-esencia-de-la-marca)
2. [Nombre y naming](#2-nombre-y-naming)
3. [Propuesta de valor](#3-propuesta-de-valor)
4. [Audiencia objetivo](#4-audiencia-objetivo)
5. [Posicionamiento](#5-posicionamiento)
6. [Valores de marca](#6-valores-de-marca)
7. [Voz y tono](#7-voz-y-tono)
8. [Identidad visual](#8-identidad-visual)
9. [Logotipo e isotipo](#9-logotipo-e-isotipo)
10. [Paleta de color de marca](#10-paleta-de-color-de-marca)
11. [Tipografía de marca](#11-tipografía-de-marca)
12. [Aplicaciones de marca](#12-aplicaciones-de-marca)
13. [Lo que PlayFlow no es](#13-lo-que-playflow-no-es)
14. [Diferenciadores competitivos](#14-diferenciadores-competitivos)

---

## 1. ESENCIA DE LA MARCA

### 1.1 Definición acordada del producto

> *Extraído de ADR-001 v3.0 — sección 1.3*

PlayFlow se define en tres capas:

**Núcleo — lo que diferencia el producto:**
- Event-Based Live Sports Production System
- Motor de scoring en vivo con cumplimiento MLBAM/WBSC
- Registro oficial con vocabulario profesional y métricas internacionales
- Orquestador de efectos deportivos, estadísticos y operativos
- Sistema de estado deportivo (fuente única de verdad)
- Sistema de auditoría y correcciones

**Capa de producción visual:**
- Controlador de scorebug y overlays
- Motor de automatización broadcast
- Motor de sponsors y assets

**Capa de distribución:**
- Hub de publicación multicanal
- Notificaciones a suscriptores
- Inteligencia deportiva para broadcast

### 1.2 Frase rectora del producto

> *Acordada en ADR-001 v3.0 — sección 1.5*

```
PlayFlow captura y estructura lo que ocurre en el partido,
mantiene el registro oficial con cumplimiento MLBAM/WBSC,
y lo convierte en producción en vivo, estadísticas y contenido publicable.
```

### 1.3 Misión de la marca `[DEFINIR]`

> Propuesta para validación:

```
Democratizar la producción deportiva profesional para que cualquier liga,
club o productor independiente pueda operar con los mismos estándares
que la televisión de primer nivel.
```

### 1.4 Visión `[DEFINIR]`

> Propuesta para validación:

```
Ser la plataforma de referencia para la producción deportiva en vivo
en América Latina y el Caribe, comenzando por béisbol y sóftbol.
```

---

## 2. NOMBRE Y NAMING

### 2.1 Nombre oficial

**PlayFlow**

- Una sola palabra, sin espacio.
- Capital P y capital F siempre.
- Nunca: `playflow`, `PLAYFLOW`, `Play Flow`, `Play-Flow`.

### 2.2 Significado

| Componente | Significado |
|------------|-------------|
| **Play** | El juego en vivo — el partido como evento |
| **Flow** | El flujo de producción automatizado y continuo |
| **PlayFlow** | El juego que fluye hacia la transmisión |

### 2.3 Nombre técnico interno

`playflow-server` — solo en contextos de infraestructura y código.

### 2.4 Dominio `[DEFINIR]`

- [ ] Dominio principal: `playflow.app` / `playflow.io` / `playflow.live` *(por elegir y registrar)*
- [ ] Dominio de transmisión: `playflow-overlays.azurestaticapps.net` *(temporal, dev)*

---

## 3. PROPUESTA DE VALOR

### 3.1 Para el operador de broadcast

> *Derivo de ADR-001 sección 1.2 y 1.6*

```
Producción en vivo sin depender de acciones manuales aisladas.
Un flujo controlado desde el primer pitch hasta el marcador final.
```

**Beneficios concretos:**
- Registro oficial del partido con cumplimiento MLBAM/WBSC desde el primer evento
- Overlays y scorebug sincronizados automáticamente con el estado real del juego
- Panel de control único para scorer, director y técnico
- Publicación simultánea hacia YouTube y plataformas multicanal
- Auditoría completa de cada decisión del partido

### 3.2 Para la liga o club

```
Producción profesional sin infraestructura profesional.
El estándar de la televisión al alcance de cualquier instalación.
```

**Beneficios concretos:**
- Estadísticas oficiales exportables en tiempo real
- Cumplimiento con estándares internacionales MLBAM y WBSC
- Identidad visual de la organización integrada (logos, colores, sponsors)
- Registro histórico consultable de partidos y jugadores
- Reducción de errores humanos en el marcador y estadísticas

### 3.3 Elevator pitch `[REFINAR]`

> Propuesta de 30 segundos:

*"PlayFlow es la plataforma que conecta lo que ocurre en el campo con la pantalla del espectador. Registra cada evento del partido con estándares profesionales, genera overlays y estadísticas automáticamente, y publica la transmisión en múltiples canales — todo desde un solo panel de control."*

---

## 4. AUDIENCIA OBJETIVO

### 4.1 Usuarios primarios (quienes operan PlayFlow)

| Perfil | Descripción | Dolor que resuelve |
|--------|-------------|-------------------|
| **Scorer / Anotador oficial** | Registra eventos del partido en tiempo real | Formularios manuales lentos y propensos a error |
| **Director de broadcast** | Controla overlays, tomas y pizarra durante la transmisión | Dependencia de múltiples herramientas desconectadas |
| **Técnico de producción** | Administra el estudio, OBS/Meld, assets y equipo | Integración compleja entre hardware y software |

### 4.2 Clientes (quienes contratan PlayFlow) `[DEFINIR]`

| Segmento | Ejemplo | Potencial |
|----------|---------|-----------|
| **Ligas semiprofesionales** | Liga Nacional de Béisbol Cuba, ligas independientes USA/LATAM | Alto |
| **Federaciones nacionales** | Federación Cubana de Béisbol, WBSC membresías | Alto |
| **Clubes profesionales** | Equipos con transmisión propia (YouTube, redes) | Medio-Alto |
| **Productoras deportivas independientes** | Productores freelance de transmisiones deportivas | Medio |
| **Universidades y colegios** | Programas deportivos con transmisión estudiantil | Medio |
| **Ligas recreativas premium** | Torneos con audiencia en redes sociales | Bajo-Medio |

### 4.3 Mercado inicial `[DEFINIR]`

- **Mercado geográfico prioritario:** Cuba, República Dominicana, Venezuela, México, Puerto Rico
- **Deporte inicial:** Béisbol y sóftbol (estándares MLBAM/WBSC implementados)
- **Expansión:** Otros deportes con lógica de eventos, estadísticas y transmisión en vivo

---

## 5. POSICIONAMIENTO

### 5.1 Categoría

**Plataforma de producción deportiva en vivo, event-driven y multicanal.**

### 5.2 Marco de posicionamiento `[DEFINIR]`

```
Para [ligas, clubes y productores de béisbol/sóftbol]
que necesitan [producción profesional en vivo con estadísticas oficiales]
PlayFlow es [la plataforma event-driven que automatiza el broadcast]
que [cumple estándares MLBAM/WBSC y publica en múltiples canales]
a diferencia de [soluciones manuales, overlays aislados o herramientas genéricas de streaming]
```

### 5.3 Competidores y alternativas `[COMPLETAR]`

| Alternativa | Brecha vs PlayFlow |
|-------------|-------------------|
| OBS Studio (manual) | Sin registro oficial, sin estadísticas, sin automatización |
| CasparCG / vMix | Gráficos profesionales pero sin motor deportivo integrado |
| StatsPerform / Genius Sports | Enterprise, sin acceso para ligas menores |
| Excel + scorebug manual | Sin automatización, alta tasa de error |
| SportzCast / Sportzcast | Limitado a ciertos deportes y sin API abierta |

---

## 6. VALORES DE MARCA

> *Derivados de los principios técnicos y de producto acordados*

### 6.1 Exactitud

```
El registro correcto no es opcional.
PlayFlow mantiene el estándar oficial aunque sea incómodo.
```

*Base: Principio #1 del ADR — "El partido manda". Estándares MLBAM/WBSC son irrenunciables.*

### 6.2 Fluidez

```
La producción debe fluir sin interrupciones.
Lo que ocurre en el campo debe aparecer en la pantalla en segundos.
```

*Base: WebSocket en tiempo real, EventEngine event-driven, automatización broadcast.*

### 6.3 Accesibilidad

```
Los estándares profesionales no son patrimonio de las grandes ligas.
PlayFlow los lleva a quien los necesita.
```

*Base: Costo operativo bajo, arquitectura sin licencias, diseñado para ligas sin infraestructura enterprise.*

### 6.4 Transparencia

```
Cada decisión del partido queda registrada.
Cada corrección tiene autor, motivo y trazabilidad.
```

*Base: Sistema de auditoría completo (GE-017), historial inmutable de eventos.*

### 6.5 Extensibilidad `[VALOR EMERGENTE]`

```
PlayFlow crece con el deporte que lo usa.
Béisbol primero. Lo que sigue, después.
```

*Base: Arquitectura multideporte documentada en ADR-002.*

---

## 7. VOZ Y TONO

### 7.1 Voz de la marca `[DEFINIR]`

> Propuesta de atributos de voz:

| Atributo | Significado | Ejemplo |
|----------|-------------|---------|
| **Técnico pero accesible** | Habla con precisión sin ser intimidante | "Cada evento del partido queda registrado con estándares MLBAM." |
| **Directo** | Sin rodeos — la producción en vivo no tiene tiempo | "Pitch. Evento. Overlay. Estadística. Todo en segundos." |
| **Confiable** | Comunica certeza y estabilidad | "El marcador que PlayFlow mantiene es el marcador oficial." |
| **Apasionado por el deporte** | Entiende el juego, no solo la tecnología | "Un jonrón merece más que un número en pantalla." |

### 7.2 Tono según contexto `[DEFINIR]`

| Contexto | Tono |
|----------|------|
| Documentación técnica | Preciso, directo, sin ambigüedad |
| UI del panel de control | Conciso, orientado a acción |
| Marketing y comunicación | Apasionado, claro, aspiracional |
| Soporte y onboarding | Empático, paso a paso, sin jerga innecesaria |
| Redes sociales | Dinámico, cercano, en el idioma del béisbol |

---

## 8. IDENTIDAD VISUAL

### 8.1 Principio general `[DEFINIR]`

> La identidad visual de PlayFlow como producto debe:
> - Transmitir velocidad, precisión y profesionalismo
> - Ser legible sobre fondos oscuros (contexto broadcast)
> - Funcionar en pantalla y en materiales impresos/digitales de marketing
> - No confundirse con la identidad de ningún club o equipo cliente

### 8.2 Sistema de dos capas (ya establecido en arquitectura)

```
Capa 1 — Marca PlayFlow:
  Identidad del producto comercial.
  Constante. Independiente del cliente.

Capa 2 — Tema del cliente:
  Colores, logos e identidad del equipo/liga.
  Variable. Configurada por cliente.
  Ejemplo actual: Mineros Red/Navy/Gold para Club Mineros de Santiago.
```

> **Aclaración importante:** La paleta `#D71920 / #1B2F5B / #D4AF37` del design system actual corresponde al **tema del cliente Mineros**, no a la identidad de marca de PlayFlow.

---

## 9. LOGOTIPO E ISOTIPO

### 9.1 Estado actual `[DEFINIR]`

- [ ] **Isotipo:** No definido — requiere diseño
- [ ] **Logotipo completo:** No definido — requiere diseño
- [ ] **Logotipo horizontal:** No definido
- [ ] **Logotipo para favicon / app icon:** No definido
- [ ] **Versión monocromática:** No definida

### 9.2 Dirección creativa sugerida `[VALIDAR]`

> Conceptos a explorar en el proceso de diseño:

**Concepto A — "El flujo del juego"**  
Un elemento gráfico que combine movimiento (flecha o onda) con la estructura de un diamante de béisbol. Transmite: evento → producción → pantalla.

**Concepto B — "La pantalla en el estadio"**  
Un marcador estilizado o un frame de broadcast con la letra P o el nombre completo. Transmite: presencia profesional en la transmisión.

**Concepto C — "El dato vivo"**  
Tipografía fuerte tipo Bebas Neue o DIN con un punto de color que sugiere el indicador de en vivo. Simple y funcional.

### 9.3 Usos obligatorios `[DEFINIR]`

- [ ] Pantalla de carga del panel de control
- [ ] Favicon y app icon PWA
- [ ] Marca de agua en overlays (modo no configurado)
- [ ] Documentación y presentaciones comerciales
- [ ] Pantalla de splash en Browser Source de OBS

### 9.4 Restricciones

- Nunca modificar proporciones del logo
- Nunca usar el logo sobre fondos que no tengan suficiente contraste
- Nunca superponer el logo de PlayFlow sobre el logo de un cliente en producción activa

---

## 10. PALETA DE COLOR DE MARCA

### 10.1 Paleta de marca PlayFlow `[DEFINIR]`

> Los colores de marca de PlayFlow como producto están pendientes de definición formal.  
> Los requisitos técnicos son:
> - Alta legibilidad sobre negro (`#0D0D0D` — broadcast background)
> - Alta legibilidad sobre blanco (materiales de marketing)
> - Contraste WCAG AA mínimo en todos los usos de interfaz

> Propuesta de dirección (para validar):

| Rol | Color propuesto | Hex | Notas |
|-----|----------------|-----|-------|
| **Primary** | Verde lima / eléctrico | `#00D26A` o `#39FF14` | Energía, en vivo, contrasta con negro |
| **Accent** | Blanco roto | `#F5F5F5` | Textos y elementos sobre fondo oscuro |
| **Dark base** | Negro broadcast | `#0D0D0D` | Fondo de aplicación y overlays |
| **Secondary** `[elegir]` | Azul técnico / gris grafito | TBD | Para UI secundaria |

> **Alternativa más conservadora:** Azul profundo + plateado + blanco → comunica tecnología y profesionalismo sin el riesgo visual del verde neón.

### 10.2 Paleta de temas de cliente (ya acordada)

> *Extraído del design system 02-design-system.md — para referencia*

Estos colores corresponden al **tema visual del cliente Mineros de Santiago**, implementado en los overlays:

| Nombre | Hex | Uso en overlays |
|--------|-----|----------------|
| Mineros Red | `#D71920` | Color primario del equipo |
| Mineros Navy | `#1B2F5B` | Color secundario del equipo |
| Mineros Gold | `#D4AF37` | Acento / destacados |
| Broadcast Black | `#0D0D0D` | Fondo base del canvas |
| White | `#FFFFFF` | Texto sobre oscuro |

> Nota: En la arquitectura de temas, cada cliente configura su propia paleta. La de Mineros es el preset de desarrollo.

---

## 11. TIPOGRAFÍA DE MARCA

### 11.1 Tipografía de marca PlayFlow `[DEFINIR]`

> Requiere selección formal. Consideraciones:
> - ¿Usar la misma Bebas Neue del design system de overlays o diferenciar?
> - La tipografía de marca debe funcionar en web, documentos y presentaciones
> - Debe estar disponible en Google Fonts o ser licenciada para uso comercial

> Propuesta de dirección:

| Uso | Tipografía candidata | Notas |
|-----|---------------------|-------|
| Logotipo / headlines | Bebas Neue o DIN Condensed | Ya usada en overlays — coherencia |
| Cuerpo de texto | Inter | Ya usada en design system |
| Código / técnico | JetBrains Mono | Contextos de documentación técnica |

### 11.2 Tipografía del design system (ya acordada)

> *Extraído del design system 02-design-system.md*

| Rol | Fuente | Notas |
|-----|--------|-------|
| Principal (overlays) | Bebas Neue | Para titulares y marcadores en pantalla |
| Secundaria (overlays) | Inter | Para datos y texto secundario |
| Fallback | Arial | Para entornos sin fuentes instaladas |

---

## 12. APLICACIONES DE MARCA

### 12.1 Panel de control (UI web)

- Header con logotipo PlayFlow (izquierda)
- Indicador "🔴 EN VIVO" cuando hay broadcast activo
- Paleta de marca PlayFlow en la interfaz del operador
- Paleta del cliente aplicada en previews de overlays

### 12.2 Browser Source (OBS/Meld) — overlays

- Canvas 1920×1080, fondo transparente
- Sin elementos de marca PlayFlow visibles en producción (el cliente es el protagonista)
- Marca de agua PlayFlow solo en modo demostración / no configurado `[DEFINIR]`

### 12.3 Materiales de marketing `[DEFINIR]`

- [ ] One-pager de producto (PDF)
- [ ] Presentación comercial (Google Slides / PowerPoint)
- [ ] Landing page web del producto
- [ ] Demo video / screencast
- [ ] Screenshots para redes sociales

### 12.4 Documentación y comunicación técnica

- Encabezados de documentos ADR con nombre PlayFlow
- README del repositorio con breve descripción de marca
- Changelog con nombre y versión

---

## 13. LO QUE PLAYFLOW NO ES

> *Derivado del ADR-001 v3.0 sección 1.4 — adaptado a tono de marca*

PlayFlow no es un overlay server. No es un scorebug. No es una integración con YouTube. No es un CMS deportivo ni un editor visual.

PlayFlow es el sistema que hace que todos esos elementos funcionen juntos, sincronizados con lo que realmente ocurre en el campo.

> Cada uno de esos elementos existe dentro de PlayFlow. Pero ninguno lo define.

---

## 14. DIFERENCIADORES COMPETITIVOS

### 14.1 Diferenciadores técnicos (ya implementados)

| Diferenciador | Descripción |
|--------------|-------------|
| **Cumplimiento MLBAM/WBSC** | Estándares profesionales de béisbol en software accesible |
| **Event-driven** | Toda la producción se activa por eventos deportivos reales |
| **Fuente única de verdad** | Un solo estado del partido — sin inconsistencias entre overlays y marcador |
| **Registro auditable** | Historial completo con autor, momento y correcciones |
| **Tiempo real con WebSocket** | Sin polling — cambios instantáneos en todos los clientes |
| **Multideporte** | Arquitectura preparada para extender a sóftbol y otros deportes |

### 14.2 Diferenciadores comerciales `[DESARROLLAR]`

- [ ] Costo de entrada (modelo de pricing por definir)
- [ ] Sin dependencia de hardware especializado
- [ ] Configuración por equipo/liga (temas visuales)
- [ ] Exportación de estadísticas
- [ ] Integración nativa con YouTube Live

---

## PENDIENTES DE DEFINICIÓN

| ID | Tema | Prioridad | Notas |
|----|------|-----------|-------|
| B-01 | Misión y visión oficial | Alta | Propuestas en sección 1.3/1.4 |
| B-02 | Dominio web del producto | Alta | Registrar antes de lanzamiento |
| B-03 | Diseño de logotipo e isotipo | Alta | Requiere proceso de diseño |
| B-04 | Paleta de colores de marca PlayFlow | Alta | Propuesta en sección 10.1 |
| B-05 | Tipografía oficial de marca | Media | Candidatos en sección 11.1 |
| B-06 | Modelo de negocio / pricing | Alta | SaaS, por evento, licencia anual? |
| B-07 | Mercado geográfico prioritario | Media | LATAM / Cuba / Caribe? |
| B-08 | One-pager comercial | Alta | Para primeras presentaciones a ligas |
| B-09 | Landing page del producto | Media | Después de logo y dominio |
| B-10 | Marco de posicionamiento formal | Media | Propuesto en sección 5.2 |
| B-11 | Voz y tono validados | Media | Propuesta en sección 7 |
| B-12 | Elevator pitch final | Alta | Propuesta en sección 3.3 |

---

*Para el design system de overlays (canvas broadcast, tokens visuales, componentes): ver `docs/requirements/02-design-system.md`*  
*Para la arquitectura del producto: ver `docs/architecture/ADR-001-architecture.md`*
