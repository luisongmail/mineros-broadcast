# 01 — Layout Manager

**Sistema:** Mineros Broadcast  
**Documento:** `01-layout-manager.md`  
**Versión:** `1.2.0`  
**Estado:** CERRADO PARA REVISIÓN  
**Propietario:** Club Mineros de Santiago  
**Desarrollado por:** Merchise  

---

## 0. Alcance del documento

Este documento define el **Layout Manager** del sistema Mineros Broadcast.

El Layout Manager es el componente responsable de coordinar la operación visual de la transmisión, pero **no es un overlay** y **no renderiza contenido visual por sí mismo**.

Su responsabilidad es administrar:

- perfiles de transmisión;
- zonas visuales;
- asignación de overlays a zonas;
- operación Preview / Program;
- operación multioperador;
- locks de recursos;
- recuperación automática de estado;
- historial de cambios;
- importación y exportación de configuración;
- relación con Event Engine;
- relación con Scene Engine;
- relación con Overlay Manager;
- compatibilidad Desktop y Mobile.

Este documento no redefine el Design System.  
El Design System ya pertenece al documento `02-design-system.md`.

---

## 0.1 Documentos relacionados

| Documento | Estado | Relación |
|---|---|---|
| `00-master-index.md` | Base general | Índice maestro del sistema |
| `01-layout-manager.md` | Este documento | Layout Manager |
| `02-design-system.md` | Cerrado | Reglas visuales, logos, colores, tipografía y componentes |
| `10-scorebug.md` | Pendiente | Overlay Scorebug |
| `11-batter-overlay.md` | Pendiente | Overlay de bateador |
| `12-lineup.md` | Pendiente | Overlay de lineup |
| `13-next-batters.md` | Pendiente | Overlay de próximos bateadores |
| `14-inning-summary.md` | Pendiente | Overlay de resumen de entrada |
| `15-sponsor-overlay.md` | Pendiente | Overlay comercial |
| `16-ticker.md` | Pendiente | Overlay ticker |

---

# LM-001 — Arquitectura del Layout Manager

## 1. Objetivo

Definir la arquitectura funcional del Layout Manager dentro de Mineros Broadcast.

El Layout Manager es el orquestador de composición, operación y estado visual de la transmisión.

No debe confundirse con:

- Design System;
- Overlay Manager;
- Game Engine;
- Sponsor Engine;
- Scene Engine;
- Event Engine;
- Meld Studio;
- OBS.

---

## 2. Principio arquitectónico central

El Layout Manager administra la lógica de disposición y operación.

Los overlays renderizan contenido.

El Game Engine administra datos deportivos.

El Sponsor Engine administra reglas comerciales.

El Scene Engine administra escenas.

El Event Engine dispara acciones.

El Design System define apariencia.

---

## 3. Responsabilidades del Layout Manager

El Layout Manager debe:

- administrar zonas del sistema;
- administrar zonas personalizadas;
- cargar perfiles;
- guardar perfiles;
- clonar perfiles;
- filtrar perfiles;
- importar perfiles desde JSON;
- exportar perfiles a JSON;
- administrar Preview;
- administrar Program;
- ejecutar Take;
- ejecutar Cancel;
- ejecutar Revert;
- resolver conflictos entre overlays;
- controlar locks multioperador;
- recuperar estado después de fallas;
- mantener historial de cambios;
- validar Safe Area;
- validar compatibilidad de resolución;
- coordinar con Event Engine;
- coordinar con Scene Engine;
- entregar instrucciones al Overlay Manager.

---

## 4. Límites del Layout Manager

El Layout Manager no debe:

- modificar marcador;
- modificar inning;
- modificar outs;
- modificar bases;
- modificar lineup;
- modificar datos deportivos;
- crear logos;
- editar fotografías;
- decidir reglas comerciales;
- calcular rotación de sponsors;
- renderizar HTML de overlays;
- reemplazar a Meld Studio;
- reemplazar a OBS;
- definir colores o tipografías fuera del Design System.

---

## 5. Componentes relacionados

| Componente | Relación con Layout Manager |
|---|---|
| Operador | Ejecuta acciones desde Desktop o Mobile |
| Profile Manager | Entrega perfiles de layout |
| Game Engine | Entrega estado deportivo |
| Asset Manager | Entrega recursos visuales |
| Sponsor Engine | Entrega reglas comerciales |
| Event Engine | Dispara acciones automáticas |
| Scene Engine | Solicita activación de escenas |
| Overlay Manager | Renderiza overlays dentro de zonas |
| Design System | Define apariencia y reglas visuales |
| Meld Studio | Consume salida visual |
| OBS | Consume salida visual |

---

## 6. Flujo general

```text
Operador
  ↓
Layout Manager
  ↓
Preview
  ↓
Take
  ↓
Program
  ↓
Overlay Manager
  ↓
Meld / OBS
```

---

## 7. Criterios de aceptación

LM-001 queda aprobado cuando:

- el Layout Manager está definido como orquestador;
- sus responsabilidades están delimitadas;
- sus límites están delimitados;
- queda claro que no renderiza overlays;
- queda claro que no modifica datos deportivos;
- queda clara su relación con Event Engine;
- queda clara su relación con Scene Engine;
- queda clara su relación con Overlay Manager.

---

# LM-002 — Preview / Program

## 1. Objetivo

Definir el modelo de operación Preview / Program para controlar cambios visuales antes de enviarlos a transmisión.

Preview representa el estado preparado.

Program representa el estado emitido.

---

## 2. Principio central

Ningún cambio visual crítico debe llegar a transmisión sin pasar por Preview.

Todo cambio preparado debe ser revisable antes de enviarse a Program.

---

## 3. Estados operativos

| Estado | Descripción |
|---|---|
| Idle | No hay cambios pendientes |
| Preview Dirty | Hay cambios preparados no emitidos |
| Ready to Take | El cambio está validado |
| Program Live | El cambio fue enviado a emisión |
| Reverted | El cambio fue deshecho |
| Error | El cambio no puede aplicarse |

---

## 4. Operaciones

### 4.1 Preview

Preview permite preparar:

- cambio de escena;
- cambio de perfil;
- activación de overlay;
- desactivación de overlay;
- cambio de zona;
- activación de sponsor;
- gráfico full screen;
- mensajes ticker;
- contenido auxiliar.

### 4.2 Take

Take envía el estado Preview a Program.

Antes de ejecutar Take, el sistema debe validar:

- conflictos de zona;
- Safe Area;
- locks activos;
- permisos de usuario;
- overlays requeridos;
- disponibilidad de assets;
- consistencia del perfil.

### 4.3 Cancel

Cancel descarta cambios preparados en Preview.

### 4.4 Revert

Revert vuelve a un estado anterior del historial.

---

## 5. Historial

El sistema debe mantener **10 niveles de historial**.

Cada entrada de historial debe registrar:

- identificador;
- fecha;
- operador;
- acción;
- recurso afectado;
- estado anterior;
- estado nuevo;
- origen de la acción;
- resultado.

---

## 6. Recuperación

Después de una caída o recarga, el sistema debe recuperar:

- perfil activo;
- escena activa;
- estado Program;
- cambios pendientes en Preview;
- overlays activos;
- zonas activas;
- locks expirados;
- historial reciente.

---

## 7. Buenas prácticas

- Preparar cambios en Preview.
- Revisar diferencias entre Preview y Program.
- Usar Take solamente cuando el estado esté validado.
- Mantener historial activo.
- Permitir Revert rápido.

---

## 8. Malas prácticas

- Aplicar cambios directos a Program.
- No diferenciar Preview de Program.
- Perder estado al recargar navegador.
- Ejecutar Take con conflictos.
- Ejecutar Take sin validar permisos.
- No registrar cambios.

---

## 9. Criterios de aceptación

LM-002 queda aprobado cuando:

- existe Preview;
- existe Program;
- existe Take;
- existe Cancel;
- existe Revert;
- existe historial de 10 niveles;
- existe recuperación automática;
- los cambios de perfil van primero a Preview;
- los conflictos impiden Take.

---

# LM-003 — Gestión de Zonas

## 1. Objetivo

Definir el modelo oficial de organización espacial usado por el Layout Manager para ubicar, controlar y coordinar overlays dentro de la transmisión.

Las zonas son contenedores lógicos administrados por el Layout Manager.

Los overlays no poseen ubicación propia.

Todo overlay debe estar asignado a una zona.

---

## 2. Referencia visual oficial

**Figura:** `LM-003-FIG-001`  
**Archivo relacionado:** `LM-003-FIG-001-gestion-de-zonas.png`  
**Estado:** Aprobada visualmente.

La figura LM-003-FIG-001 es la referencia visual normativa para Gestión de Zonas.

---

## 3. Canvas, Safe Area y Grid

| Elemento | Valor |
|---|---|
| Canvas | 1920x1080 |
| Relación | 16:9 |
| Safe Area | 60px |
| Grid | 24 columnas x 12 filas |
| Coordenadas | Relativas al Canvas |

---

## 4. Zonas del sistema

| Zona | Nombre | Propósito | Prioridad | Eliminable |
|---|---|---|---:|---|
| A | Información Permanente | Scorebug, inning, outs, bases | 100 | No |
| B | Información Principal | Batter, pitcher, jugador destacado | 90 | No |
| C | Información Contextual | Próximos al bate, comparativas | 80 | No |
| D | Información Comercial | Sponsors y promociones | 70 | No |
| E | Información Auxiliar | Alertas y datos secundarios | 60 | No |
| F | Contenido Full Screen | Lineup, replay, highlights | 50 | No |

---

## 5. Zonas personalizadas G+

Las zonas G+ permiten ampliar el sistema cuando las zonas A-F no cubren una necesidad específica.

Pueden:

- crearse;
- editarse;
- eliminarse;
- asignarse a perfiles;
- asignarse a escenas;
- asociarse a overlays.

Toda zona personalizada debe tener:

- nombre;
- propósito;
- prioridad;
- posición;
- tamaño;
- reglas de visibilidad;
- relación con perfiles o escenas.

---

## 6. Configuración de zona

```json
{
  "id": "zone-b",
  "name": "Zona B",
  "purpose": "Información principal",
  "x": 72,
  "y": 300,
  "width": 520,
  "height": 240,
  "priorityBase": 90,
  "editable": true,
  "removable": false,
  "visible": true,
  "responsive": true,
  "safeAreaRequired": true,
  "assignedOverlays": ["batter", "pitcher", "matchup"]
}
```

---

## 7. Relación jerárquica

```text
Escena
  ↓
Zonas
  ↓
Overlays
```

Un overlay nunca debe posicionarse directamente sobre el Canvas sin pasar por una zona.

---

## 8. Resolución de conflictos

1. Prioridad del Overlay.
2. Prioridad de la Escena.
3. Prioridad del Perfil.
4. Última Activación.

---

## 9. Criterios de aceptación

LM-003 queda aprobado cuando:

- existen zonas A-F;
- las zonas A-F no pueden eliminarse;
- se pueden crear zonas G+;
- se pueden eliminar zonas G+;
- toda zona posee propósito documentado;
- existe resolución de conflictos;
- el Safe Area se respeta;
- la figura LM-003-FIG-001 está incorporada y explicada.

---

# LM-004 — Gestión de Perfiles

## 1. Objetivo

Definir cómo el Layout Manager administra perfiles de transmisión.

Un perfil representa una configuración reutilizable de layout, zonas, escenas, asignaciones y comportamiento operativo.

---

## 2. Modelo de persistencia

El sistema utiliza la siguiente relación:

```text
Plantilla
  ↓
Perfil
  ↓
Partido
```

### 2.1 Plantilla

Define una base reutilizable.

Ejemplos:

- Partido regular.
- Final.
- Entrenamiento.
- Clínica.
- Evento especial.

### 2.2 Perfil

Define una configuración editable basada en una plantilla.

Incluye:

- zonas activas;
- overlays asignados;
- prioridades;
- escenas disponibles;
- reglas de sponsor;
- preferencias Preview / Program;
- compatibilidad de resolución.

### 2.3 Partido

Representa una instancia real de transmisión.

Incluye:

- equipos;
- fecha;
- categoría;
- torneo;
- perfil asignado;
- estado operativo.

---

## 3. Filtros de perfiles

El sistema debe permitir filtrar perfiles por:

- nombre;
- partido;
- torneo;
- categoría;
- temporada;
- plataforma;
- creador;
- fecha de creación;
- fecha de modificación;
- estado;
- etiquetas.

---

## 4. Operaciones sobre perfiles

El operador autorizado debe poder:

- crear perfil;
- editar perfil;
- clonar perfil;
- eliminar perfil;
- activar perfil;
- desactivar perfil;
- importar perfil;
- exportar perfil;
- asignar perfil a partido;
- aplicar perfil a Preview;
- enviar perfil a Program mediante Take.

---

## 5. Regla Preview para perfiles

Todo cambio de perfil debe ir primero a Preview.

Un perfil no debe reemplazar Program directamente.

Flujo:

```text
Seleccionar Perfil
  ↓
Cargar en Preview
  ↓
Validar
  ↓
Take
  ↓
Program
```

---

## 6. Estructura mínima de perfil

```json
{
  "id": "profile-final-2026",
  "name": "Final Campeonato 2026",
  "templateId": "template-final",
  "category": "Infantil",
  "tournament": "Liga Oriente",
  "season": "2026",
  "platform": "Meld Studio",
  "createdBy": "admin",
  "status": "active",
  "zones": [],
  "scenes": [],
  "overlayAssignments": [],
  "sponsorRules": [],
  "createdAt": "2026-06-23T00:00:00Z",
  "updatedAt": "2026-06-23T00:00:00Z"
}
```

---

## 7. Buenas prácticas

- Clonar perfiles antes de hacer cambios grandes.
- Usar nombres descriptivos.
- Asociar perfiles a torneo y categoría.
- Exportar perfiles importantes antes de modificarlos.
- Validar perfil en Preview antes de Take.

---

## 8. Malas prácticas

- Editar perfil activo directamente en Program.
- Reutilizar perfiles sin cambiar contexto.
- Crear perfiles sin categoría o torneo.
- Eliminar perfiles sin respaldo.
- Mezclar configuración de diferentes plataformas sin validación.

---

## 9. Criterios de aceptación

LM-004 queda aprobado cuando:

- existe modelo Plantilla → Perfil → Partido;
- se pueden crear perfiles;
- se pueden clonar perfiles;
- se pueden filtrar perfiles;
- se pueden exportar perfiles;
- se pueden importar perfiles;
- todo cambio de perfil pasa por Preview;
- el Take aplica el perfil validado a Program.

---

# LM-005 — Operación Multioperador y Locks

## 1. Objetivo

Definir cómo el Layout Manager permite operación simultánea de múltiples usuarios sin conflictos.

---

## 2. Roles

| Rol | Permisos principales |
|---|---|
| Administrador | Control total |
| Productor | Control de transmisión y perfiles |
| Operador | Control operativo de escenas y overlays |
| Sponsor Manager | Gestión comercial |
| Lectura | Visualización sin edición |

---

## 3. Lock por recurso

El sistema debe bloquear recursos cuando un operador los edita.

Recursos bloqueables:

- perfil;
- zona;
- escena;
- overlay assignment;
- sponsor slot;
- configuración Preview;
- configuración Program.

---

## 4. Timeout de lock

El timeout oficial es:

```text
5 minutos sin actividad
```

Después de ese tiempo, el lock puede liberarse automáticamente.

---

## 5. Información de lock

Todo lock debe registrar:

- recurso;
- operador;
- fecha de inicio;
- última actividad;
- expiración;
- estado.

---

## 6. Reglas

- Un recurso bloqueado no puede ser editado por otro operador.
- Un administrador puede forzar liberación de lock.
- El sistema debe mostrar quién tiene bloqueado un recurso.
- Los locks expirados deben liberarse en recuperación automática.
- Los locks deben respetarse antes de ejecutar Take.

---

## 7. Criterios de aceptación

LM-005 queda aprobado cuando:

- existen roles;
- existe lock por recurso;
- existe timeout de 5 minutos;
- se visualiza quién bloquea un recurso;
- se impide edición simultánea conflictiva;
- los locks se validan antes de Take.

---

# LM-006 — Recuperación Automática de Estado

## 1. Objetivo

Definir el comportamiento del Layout Manager ante caídas, recargas, pérdida de conexión o reinicio.

---

## 2. Estado recuperable

El sistema debe recuperar:

- perfil activo;
- escena activa;
- zonas activas;
- overlays activos;
- Program actual;
- Preview pendiente;
- historial reciente;
- locks activos;
- locks expirados;
- configuración de resolución;
- asignaciones de overlays;
- reglas comerciales activas.

---

## 3. Regla central

La transmisión no debe quedar sin estado después de una recarga.

El sistema debe poder reconstruir la operación desde persistencia.

---

## 4. Estrategia

El Layout Manager debe guardar snapshots operativos.

Cada snapshot debe contener:

```json
{
  "activeProfileId": "profile-final-2026",
  "activeSceneId": "scene-lineup",
  "programState": {},
  "previewState": {},
  "activeZones": [],
  "activeOverlays": [],
  "locks": [],
  "history": [],
  "updatedAt": "2026-06-23T00:00:00Z"
}
```

---

## 5. Frecuencia

El sistema debe persistir estado cuando ocurra:

- Take;
- cambio de perfil;
- cambio de escena;
- cambio de zona;
- activación de overlay;
- desactivación de overlay;
- cambio de sponsor;
- liberación de lock;
- cierre controlado.

---

## 6. Criterios de aceptación

LM-006 queda aprobado cuando:

- el estado Program se recupera;
- el perfil activo se recupera;
- la escena activa se recupera;
- los overlays activos se recuperan;
- Preview pendiente se recupera o se marca como pendiente;
- locks expirados se limpian;
- historial reciente se mantiene.

---

# LM-007 — Operación Desktop

## 1. Objetivo

Definir la experiencia de operación del Layout Manager desde escritorio.

---

## 2. Capacidades Desktop

Desktop debe permitir:

- login por OTP;
- seleccionar perfil;
- filtrar perfiles;
- editar zonas con drag & drop;
- redimensionar zonas;
- activar grid;
- activar snap;
- visualizar Safe Area;
- operar Preview;
- operar Program;
- ejecutar Take;
- ejecutar Cancel;
- ejecutar Revert;
- administrar locks;
- revisar historial;
- exportar JSON;
- importar JSON.

---

## 3. Editor visual Desktop

El editor debe soportar:

- arrastrar zona;
- redimensionar zona;
- activar guías;
- snap a grid;
- validación Safe Area;
- indicadores de conflicto;
- indicador de lock;
- preview de overlay dentro de zona.

---

## 4. Buenas prácticas

- Usar Desktop para configuración avanzada.
- Usar Mobile para operación rápida.
- Validar zonas visualmente antes de guardar perfil.
- Mantener grid activo durante configuración.

---

## 5. Criterios de aceptación

LM-007 queda aprobado cuando:

- Desktop permite edición visual;
- existe drag & drop;
- existe resize;
- existe snap;
- existe grid;
- existe Safe Area visible;
- existe Preview / Program;
- existe Take;
- existe historial.

---

# LM-008 — Operación Mobile

## 1. Objetivo

Definir la experiencia de operación del Layout Manager desde celular.

---

## 2. Principio Mobile

Mobile debe permitir operación completa, pero no necesita replicar drag & drop avanzado.

Mobile debe priorizar:

- rapidez;
- claridad;
- botones grandes;
- estados simples;
- acciones seguras;
- control de Preview / Program;
- control de escenas;
- control de overlays;
- control de sponsors.

---

## 3. Capacidades Mobile

Mobile debe permitir:

- login por OTP;
- seleccionar perfil;
- cargar perfil en Preview;
- ejecutar Take;
- activar escena;
- desactivar escena;
- activar overlay;
- desactivar overlay;
- activar sponsor;
- enviar ticker;
- revisar Program;
- revisar Preview;
- cancelar cambios;
- liberar lock propio;
- ver historial básico.

---

## 4. Edición Mobile

Mobile debe permitir edición por formularios:

- zona;
- posición X;
- posición Y;
- ancho;
- alto;
- prioridad;
- visibilidad;
- overlay asignado.

No se exige drag & drop avanzado en V1.

---

## 5. Criterios de aceptación

LM-008 queda aprobado cuando:

- Mobile permite operar transmisión;
- Mobile permite Preview / Program;
- Mobile permite Take;
- Mobile permite activar escenas;
- Mobile permite activar overlays;
- Mobile permite edición por formulario;
- Mobile respeta locks.

---

# LM-009 — Integración con Event Engine

## 1. Objetivo

Definir cómo el Layout Manager responde a eventos predefinidos.

---

## 2. Eventos V1

El Event Engine V1 puede solicitar acciones por:

- Cambio bateador;
- Cambio pitcher;
- Inicio entrada;
- Fin entrada;
- Home Run.

---

## 3. Responsabilidad del Layout Manager

Cuando recibe un evento, el Layout Manager debe:

- evaluar perfil activo;
- evaluar escena actual;
- evaluar reglas del evento;
- preparar cambios en Preview o activar directamente si la regla lo permite;
- validar zonas;
- validar conflictos;
- coordinar con Scene Engine si corresponde.

---

## 4. Reglas

- El Event Engine no posiciona overlays.
- El Event Engine no decide zonas.
- El Layout Manager resuelve dónde se muestra la consecuencia visual.
- Si el evento activa una escena, la solicitud pasa por Scene Engine.
- Si el evento activa un overlay, debe existir zona válida.

---

## 5. Ejemplo

```json
{
  "eventType": "Cambio bateador",
  "source": "GameEngine",
  "requestedAction": "showOverlay",
  "overlay": "batter",
  "preferredZone": "B",
  "mode": "preview"
}
```

---

## 6. Criterios de aceptación

LM-009 queda aprobado cuando:

- los eventos V1 están definidos;
- el Layout Manager recibe eventos;
- el Layout Manager valida zonas;
- el Layout Manager valida conflictos;
- el Event Engine no posiciona overlays;
- se puede enviar acción a Preview.

---

# LM-010 — Integración con Scene Engine

## 1. Objetivo

Definir cómo el Layout Manager responde a escenas oficiales.

---

## 2. Escenas V1

Scene Engine V1 administra:

- Inicio Partido;
- Presentación Equipos;
- Lineup;
- Cambio Bateador;
- Fin Entrada;
- MVP;
- Cierre.

---

## 3. Responsabilidad del Layout Manager

Para cada escena, el Layout Manager debe:

- cargar asignaciones de overlays;
- activar zonas requeridas;
- desactivar zonas incompatibles;
- validar conflictos;
- aplicar prioridad de escena;
- preparar Preview;
- ejecutar Take si el operador confirma;
- mantener historial.

---

## 4. Reglas

- La escena define intención.
- El Layout Manager define disposición.
- El Overlay Manager renderiza.
- El Design System define apariencia.

---

## 5. Ejemplo de escena

```json
{
  "sceneId": "scene-lineup",
  "name": "Lineup",
  "requiredZones": ["F"],
  "overlays": ["lineup"],
  "priority": 95,
  "mode": "preview"
}
```

---

## 6. Criterios de aceptación

LM-010 queda aprobado cuando:

- las escenas V1 están definidas;
- el Layout Manager recibe solicitudes del Scene Engine;
- se activan zonas requeridas;
- se validan conflictos;
- se respeta Preview / Program;
- las escenas no renderizan overlays directamente.

---

# LM-011 — Importación y Exportación JSON

## 1. Objetivo

Definir cómo el Layout Manager permite mover configuraciones entre entornos o respaldarlas.

---

## 2. Exportación

El sistema debe permitir exportar:

- perfil;
- zonas;
- asignaciones;
- escenas relacionadas;
- reglas de prioridad;
- configuración de Preview / Program;
- metadata.

---

## 3. Importación

El sistema debe permitir importar JSON validado.

Antes de aceptar una importación debe validar:

- versión;
- estructura;
- zonas requeridas;
- overlays referenciados;
- assets referenciados;
- compatibilidad con resolución;
- conflictos;
- permisos del operador.

---

## 4. Estructura base

```json
{
  "schema": "miners-broadcast-layout-profile",
  "version": "1.0.0",
  "profile": {},
  "zones": [],
  "overlayAssignments": [],
  "scenes": [],
  "priorityRules": [],
  "metadata": {
    "createdBy": "admin",
    "createdAt": "2026-06-23T00:00:00Z"
  }
}
```

---

## 5. Reglas

- No importar JSON sin versión.
- No importar JSON con zonas A-F eliminadas.
- No importar overlays inexistentes.
- No aplicar importación directamente a Program.
- La importación debe cargarse primero en Preview.

---

## 6. Criterios de aceptación

LM-011 queda aprobado cuando:

- existe exportación JSON;
- existe importación JSON;
- se valida schema;
- se valida versión;
- se valida integridad de zonas;
- se carga importación primero en Preview;
- se impide aplicar directamente a Program.

---

# LM-012 — Criterios Globales de Aceptación

El documento `01-layout-manager.md` queda cerrado cuando:

- LM-001 define arquitectura y límites;
- LM-002 define Preview / Program;
- LM-003 define zonas;
- LM-004 define perfiles;
- LM-005 define roles y locks;
- LM-006 define recuperación automática;
- LM-007 define operación Desktop;
- LM-008 define operación Mobile;
- LM-009 define integración con Event Engine;
- LM-010 define integración con Scene Engine;
- LM-011 define importación/exportación JSON;
- no se redefine el Design System;
- no se redefinen overlays específicos;
- el documento es suficiente para que Squad implemente el Layout Manager sin inferencias críticas.

---

# Historial del documento

| Versión | Estado | Descripción |
|---|---|---|
| 1.0.0 | Borrador | Documento inicial fragmentado |
| 1.1.0 | En revisión | Consolidación inicial LM-001 a LM-003 |
| 1.2.0 | Cerrado para revisión | Completa LM-001 a LM-012 y excluye Design System ya cerrado |
