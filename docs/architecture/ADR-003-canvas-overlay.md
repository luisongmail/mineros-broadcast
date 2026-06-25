# ADR-003 — Canvas Único de Broadcast
## Single Overlay Canvas Architecture

**Versión:** 1.0  
**Fecha:** 2026-06-24  
**Estado:** APROBADO  
**Depende de:** ADR-001, ADR-002

---

## 1. DECISIÓN

Se reemplaza el modelo de múltiples Browser Sources individuales por un **único canvas de broadcast** que contiene todos los componentes de overlay. El fondo es completamente transparente para composición sobre la señal de video.

---

## 2. PROBLEMA DEL MODELO ANTERIOR

```
OBS — modelo anterior (12+ Browser Sources):
├── Source: /overlay/scorebug      → conexión WS propia
├── Source: /overlay/batter        → conexión WS propia
├── Source: /overlay/pitcher       → conexión WS propia
└── ... 9 más (orden manual, sin coordinación)
```

**Problemas:**
- 12+ conexiones WebSocket simultáneas al servidor
- El operador debe ordenar layers manualmente en OBS
- Transiciones entre overlays simultáneos imposibles de coordinar
- Cualquier cambio de configuración en OBS requiere modificar múltiples fuentes
- Si dos overlays deben interactuar visualmente, no pueden

---

## 3. ARQUITECTURA DEL CANVAS ÚNICO

```
OBS/Meld Studio — modelo nuevo (1 Browser Source):
└── http://broadcast-server/broadcast   [1920×1080, Allow transparency: ON]
    │
    └── BroadcastCanvas (React)
        ├── background: transparent
        ├── width: 1920px, height: 1080px
        ├── position: relative
        │
        ├── <Scorebug          zone="top-left"    state={show/hide/preview} />
        ├── <CountdownOverlay  zone="top-right"   state={show/hide/preview} />
        ├── <BatterOverlay     zone="lower-left"  state={show/hide/preview} />
        ├── <PitcherOverlay    zone="lower-right" state={show/hide/preview} />
        ├── <LineupOverlay     zone="center-left" state={show/hide/preview} />
        ├── <NextBattersOverlay zone="center-right" state={show/hide/preview} />
        ├── <InningTransition  zone="center-full" state={show/hide/preview} />
        ├── <FinalScore        zone="center-full" state={show/hide/preview} />
        ├── <SponsorBreak      zone="lower-third" state={show/hide/preview} />
        ├── <Announcement      zone="lower-third" state={show/hide/preview} />
        ├── <SocialLowerThird  zone="lower-third" state={show/hide/preview} />
        └── <GameEventOverlay  zone="center"      state={show/hide/preview} />
```

---

## 4. TRANSPARENCIA

### 4.1 HTML y CSS

```html
<!-- /broadcast — index.html -->
<!DOCTYPE html>
<html style="background: transparent;">
<body style="background: transparent; margin: 0; overflow: hidden;">
  <div id="root"></div>
</body>
</html>
```

```css
/* BroadcastCanvas */
.broadcast-canvas {
  width: 1920px;
  height: 1080px;
  position: relative;
  overflow: hidden;
  background: transparent;
}
```

### 4.2 Configuración en OBS / Meld Studio

```
Browser Source:
  URL:    http://broadcast-server.azurewebsites.net/broadcast
  Width:  1920
  Height: 1080
  ☑ Allow transparency (OBLIGATORIO)
  ☑ Shutdown source when not visible: OFF
  ☑ Refresh browser when scene becomes active: OFF
```

---

## 5. SISTEMA DE ZONAS (GRID 24×12)

```
Canvas 1920×1080 — Safe Area 60px inset

 ┌──────────────────────────────────────────────────────┐
 │ 60px safe area                                       │
 │  ┌────────────────────────────────────────────────┐  │
 │  │ [top-left]                      [top-right]    │  │
 │  │                                                │  │
 │  │              [center-full]                     │  │
 │  │              (InningTransition)                │  │
 │  │              (FinalScore)                      │  │
 │  │                                                │  │
 │  │ [lower-left]                 [lower-right]     │  │
 │  │                                                │  │
 │  │ ══════════[lower-third]══════════════════════  │  │
 │  └────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────┘

Zonas predefinidas:
  top-left:     x:60,    y:60,    w:480, h:120
  top-right:    x:1380,  y:60,    w:480, h:120
  lower-left:   x:60,    y:810,   w:600, h:210
  lower-right:  x:1260,  y:810,   w:600, h:210
  lower-third:  x:60,    y:900,   w:1800, h:120
  center-full:  x:360,   y:240,   w:1200, h:600
  center:       x:660,   y:390,   w:600,  h:300
```

---

## 6. MODELO DE VISIBILIDAD DE COMPONENTES

### 6.1 Estados

```typescript
type OverlayComponentState = 'hidden' | 'preview' | 'live';

// hidden  → display: none        — no consume GPU ni eventos
// preview → visibility: visible, opacity: 0.4  — visible en monitor de preview
// live    → visibility: visible, opacity: 1    — visible en broadcast
```

### 6.2 Flujo de estado

```
hidden ──[ShowOverlay]──▶ live
live   ──[HideOverlay]──▶ hidden

hidden ──[PreviewOverlay]──▶ preview  (futuro: modo preview del operador)
preview ──[Take]──▶ live
preview ──[Cancel]──▶ hidden
```

### 6.3 Visibilidad controlada por el servidor

```typescript
// WebSocket message: state
{
  type: 'state',
  payload: {
    gameState: GameState,
    visibleOverlays: ['scorebug', 'batter'],   // overlays actualmente en live
    previewOverlays: ['pitcher'],               // overlays en preview
    gameRules: GameRules                        // reglas resueltas del torneo+juego
  }
}
```

---

## 7. ACTIVACIÓN AUTOMÁTICA POR EVENTOS DEL GAME ENGINE

El `EventEngine` define reglas que conectan eventos del `GameEngine` con acciones de overlay. No es necesario que el operador active manualmente estos overlays:

| Evento GameEngine | Acción automática | Duración |
|------------------|------------------|---------|
| `InningAdvanced` | ShowOverlay(inning-transition) | 4 segundos |
| `GameStarted` | ShowOverlay(scorebug) | Permanente |
| `GameEnded` | ShowOverlay(final-score) | Manual |
| `PlayerSubstituted` | ShowOverlay(substitution) | 6 segundos |
| `HomeRun` | ShowOverlay(game-event) con type=homerun | 5 segundos |
| `ThreeUp` | ShowOverlay(game-event) con type=three_up | 3 segundos |

Reglas manuales (requieren acción del operador):
- ShowOverlay(batter), ShowOverlay(pitcher), ShowOverlay(lineup)
- ShowOverlay(sponsor-break), ShowOverlay(announcement)
- ShowOverlay(social-lower-third), ShowOverlay(countdown)

---

## 8. ADAPTACIÓN POR DISCIPLINA (GameRules)

Los componentes leen `gameRules` del contexto y se adaptan:

```tsx
// En BroadcastCanvas
const { gameState, gameRules, visibleOverlays } = useBroadcastState();

return (
  <div className="broadcast-canvas">
    <Scorebug
      visible={visibleOverlays.includes('scorebug')}
      maxInnings={gameRules.innings}
      showCount={gameRules.display.showCount}
      showPitchClock={gameRules.pitchClock !== null}
    />

    {/* PitcherOverlay solo si la disciplina tiene pitcher */}
    {gameRules.hasPitcher && (
      <PitcherOverlay
        visible={visibleOverlays.includes('pitcher')}
      />
    )}

    {/* LineupOverlay adapta cantidad de bateadores */}
    <LineupOverlay
      visible={visibleOverlays.includes('lineup')}
      continuousBatting={gameRules.continuousBattingOrder}
    />

    {/* Set counter solo en Baseball5 */}
    {gameRules.usesSets && (
      <SetCounter sets={gameState.sets} />
    )}
  </div>
);
```

---

## 9. RUTAS DE LA APLICACIÓN

```
/broadcast          → BroadcastCanvas (para OBS Browser Source)
/control            → OperatorControlPanel (panel del operador)
/scorer             → ScorerPanel (ingreso de estadísticas) [PENDIENTE]
/api/*              → REST API
ws://               → WebSocket
```

---

## 10. CONFIGURACIÓN OBS — GUÍA DEL OPERADOR

### Setup mínimo para transmisión

```
1. En OBS/Meld Studio, crear una Scene de broadcast.

2. Agregar una sola fuente:
   Tipo: Browser Source
   URL: http://{IP-del-servidor}:8080/broadcast
   Ancho: 1920  Alto: 1080
   ☑ Allow transparency  ← OBLIGATORIO
   
3. Posicionar la fuente como la capa superior sobre la señal de video.

4. Abrir el panel de control:
   http://{IP-del-servidor}:8080/control

5. Cargar el partido del día desde "Configurar Partido".

6. Los overlays se activan desde el panel de control.
```

### Preview monitor (futuro)

Cuando se implemente Preview/Program:
- `/broadcast?mode=preview` → muestra overlays en estado preview
- `/broadcast?mode=program` → solo muestra overlays en estado live
- El operador ve el preview en su monitor antes de enviar al aire

---

## 11. PACKAGES DE OVERLAYS — ESTADO

Los packages individuales en `packages/overlays/{name}/` se **mantienen** pero su objetivo cambia:

| Antes | Después |
|-------|---------|
| Cada package compila su propio bundle (Vite lib) | Solo exportan componentes React |
| Se servían como páginas independientes `/overlay/:id` | Se componen dentro de `BroadcastCanvas` |
| Cada uno tenía su propio WebSocket | Comparten el WebSocket del canvas |

**Los packages no desaparecen** — siguen siendo la unidad de desarrollo y testing de cada componente. La ruta `/overlay/:id` puede mantenerse para testing individual de cada overlay.

---

*Documento complementario de ADR-001. Modelo de datos en ADR-002.*
