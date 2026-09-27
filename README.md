# plugin-notes

**Notas** para [FlickerTalk](https://flickertalk.com). Notas personales con un aviso, guardadas
solo en el teléfono.

- Una nota nace **desde un mensaje** (pulsación larga → «Abrir con» → Notas: llega el texto y un
  enlace opaco a la conversación) o **desde cero** dentro del plugin.
- El aviso es una notificación **solo para mí**, a la hora que elija, una sola vez. El contacto
  nunca se entera: no toca el protocolo ni el servidor.
- Por defecto la notificación dice solo que hay un aviso; el texto de la nota se enseña únicamente
  si el usuario lo activa en los ajustes del plugin.
- La lista pone primero las notas con aviso pendiente y luego el resto por fecha; búsqueda por
  palabras.

Todo ocurre en el teléfono: el plugin no tiene red, no ve la conversación ni la identidad del
contacto y solo recibe el texto que **el usuario** le da con un gesto (`messages: given`).

## Qué usa del núcleo

| Capacidad        | Para qué                                                         |
| ---------------- | ---------------------------------------------------------------- |
| `ft.records`     | una nota por registro (`note/<id>`, JSON), dentro de la cuota    |
| `ft.remind`      | poner, cambiar y quitar el aviso (permiso `remind`)              |
| `ft.store`       | el ajuste «texto en la notificación»                             |
| `ft.openChat`    | volver a la conversación de la que nació la nota (`ref`)         |
| `onOpen`         | `text` + `ref` desde un mensaje; `reminder` cuando se toca el aviso; `lang` |

Necesita el núcleo **1.1.0** (`minCoreVersion`). El contrato está en
[plugin-sdk](https://github.com/FlickerTalk/plugin-sdk).

## Desarrollo

```sh
npm install
npm test
```

`dist/index.js` registra el web component `ft-notes`; `dist/i18n.js` lleva los textos en los 21
idiomas de la app (un test comprueba que cada idioma tiene las mismas claves que el inglés). No hay
nada que compilar. El paquete `.ftplugin` lo firma el catálogo de FlickerTalk; no se construye aquí.

## Licencia

MIT.
