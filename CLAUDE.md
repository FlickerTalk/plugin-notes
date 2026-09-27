# plugin-notes

Plugin **Notas** de FlickerTalk (`Plan.md §53–§58`, plan-notes 2026-09-27). Repo propio; el
paquete lo firma y publica el catálogo (`FlickerTalk/web`).

- `module.json`: `com.flickertalk.notes`, componente `ft-notes`, permisos `messages: given` y
  `remind`, abre `text/plain`, `minCoreVersion` 1.1.0.
- `dist/index.js`: el web component y las funciones puras (modelo, orden, búsqueda, fechas)
  exportadas para los tests. `dist/i18n.js`: 21 idiomas, inglés como fuente.
- Sin build: es web puro. `npm test` (Vitest + happy-dom, con un núcleo falso en `index.test.js`).

## Reglas

- Nada sale del marco: sin red, sin `invoke`, sin ver la conversación. Solo la Plugin API
  (`globalThis.ft`).
- Una nota = un registro `note/<id>` con JSON `{id, text, createdAt, updatedAt, remindAt?, ref?}`.
  El id de la nota es el id del aviso.
- La notificación no lleva el texto de la nota salvo que el usuario lo active (`showText` en
  `ft.store`); al cambiarlo se reprograman los avisos pendientes.
- Iconos: solo los que presta el núcleo (`./icon/<nombre>.svg`). Textos: solo del catálogo, y
  cada clave nueva en los 21 idiomas en el mismo cambio (el test lo exige).
- Código y comentarios en inglés; `.md` en español.
