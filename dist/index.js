import { t } from "./i18n.js";

export const PREFIX = "note/";

export function noteKey(id) {
  return `${PREFIX}${id}`;
}

// Time first, so ids sort in creation order.
export function newId(now = Date.now()) {
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `${now.toString(36).padStart(9, "0")}${random}`;
}

export function noteFrom(text, ref, now = Date.now()) {
  const note = { id: newId(now), text: String(text ?? ""), createdAt: now, updatedAt: now };
  if (ref) note.ref = String(ref);
  return note;
}

export function parseNote(json) {
  let read;
  try {
    read = JSON.parse(json);
  } catch {
    return null;
  }
  if (!read || typeof read !== "object" || typeof read.id !== "string" || typeof read.text !== "string") return null;
  const number = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  const note = {
    id: read.id,
    text: read.text,
    createdAt: number(read.createdAt) ?? 0,
    updatedAt: number(read.updatedAt) ?? number(read.createdAt) ?? 0,
  };
  if (number(read.remindAt) !== null) note.remindAt = read.remindAt;
  if (typeof read.ref === "string" && read.ref) note.ref = read.ref;
  return note;
}

export function titleOf(text, limit = 200) {
  const line = String(text ?? "")
    .split("\n")
    .map((one) => one.trim())
    .find((one) => one.length > 0);
  if (!line) return "";
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
}

export function reminderState(note, now = Date.now()) {
  if (typeof note.remindAt !== "number") return "none";
  return note.remindAt > now ? "pending" : "overdue";
}

export function sortNotes(notes, now = Date.now()) {
  const pending = notes.filter((note) => reminderState(note, now) === "pending").sort((a, b) => a.remindAt - b.remindAt);
  const rest = notes.filter((note) => reminderState(note, now) !== "pending").sort((a, b) => b.updatedAt - a.updatedAt);
  return [...pending, ...rest];
}

export function matches(note, query) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = note.text.toLowerCase();
  return words.every((word) => text.includes(word));
}

// Empty unless the user allowed the first line on the lock screen. The app then just says there is a reminder.
export function reminderText(note, showText) {
  return showText ? titleOf(note.text) : "";
}

export function whenLabel(at, now = Date.now(), lang = "en") {
  const day = new Date(at);
  const today = new Date(now);
  const sameDay = day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() === today.getDate();
  const options = sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  if (!sameDay && day.getFullYear() !== today.getFullYear()) options.year = "numeric";
  try {
    return new Intl.DateTimeFormat(lang, options).format(day);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(day);
  }
}

export function toLocalInput(at) {
  const day = new Date(at);
  const two = (value) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}T${two(day.getHours())}:${two(day.getMinutes())}`;
}

export function fromLocalInput(value) {
  if (!value) return null;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? at : null;
}

export function proposedReminder(now = Date.now()) {
  const soon = new Date(now + 60 * 60 * 1000);
  soon.setSeconds(0, 0);
  return soon.getTime();
}

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (one) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[one]);

const STYLE = `
ft-notes { display: flex; flex-direction: column; height: 100%; font: 15px system-ui, sans-serif; color: var(--ion-text-color, #111); --ink: var(--ion-text-color, #111); --paper: var(--ion-background-color, #fff); --line: var(--ion-border-color, #d8d8d8); --soft: var(--ion-color-medium, #666); --accent: var(--ion-color-danger, #e0562b); }
@media (prefers-color-scheme: dark) { ft-notes { color: var(--ion-text-color, #f4f4f4); --ink: var(--ion-text-color, #f4f4f4); --paper: var(--ion-background-color, #111); --line: var(--ion-border-color, #3a3a3a); --soft: var(--ion-color-medium, #aaa); } }
[data-dark] ft-notes { color: var(--ion-text-color, #f4f4f4); --ink: var(--ion-text-color, #f4f4f4); --paper: var(--ion-background-color, #111); --line: var(--ion-border-color, #3a3a3a); --soft: var(--ion-color-medium, #aaa); }
ft-notes * { box-sizing: border-box; }
ft-notes ion-content { flex: 1; }
ft-notes .view { padding: 8px 8px 16px; }
ft-notes button {
  appearance: none; border: 1px solid currentColor; background: transparent; color: inherit;
  border-radius: 10px; min-width: 44px; height: 40px; font: inherit; padding: 0 10px; cursor: pointer; opacity: .8;
}
ft-notes .i {
  display: block; width: 22px; height: 22px; margin: auto; background: currentColor;
  -webkit-mask: var(--i) center/contain no-repeat; mask: var(--i) center/contain no-repeat;
}
ft-notes .i.small { width: 16px; height: 16px; display: inline-block; vertical-align: -3px; margin: 0 4px 0 0; }
ft-notes ion-button .i[slot="start"] { margin-inline-end: 6px; }
ft-notes ion-button .i[slot="end"] { margin-inline-start: 6px; }
ft-notes input, ft-notes textarea {
  font: inherit; color: inherit; background: transparent; border: 1px solid var(--line); border-radius: 10px;
  padding: 8px 10px; width: 100%;
}
ft-notes input[type="search"] { height: 40px; }
ft-notes ion-toolbar input[type="search"] { display: block; margin-inline-start: 8px; }
ft-notes textarea { min-height: 40vh; resize: vertical; line-height: 1.4; }
ft-notes ul { list-style: none; margin: 0; padding: 0; }
ft-notes li { border-bottom: 1px solid var(--line); }
ft-notes li button { display: block; width: 100%; text-align: start; border: 0; border-radius: 0; height: auto; padding: 10px 4px; opacity: 1; }
ft-notes .title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
ft-notes .meta { color: var(--soft); font-size: 13px; margin-top: 2px; display: flex; gap: 10px; }
ft-notes .meta.overdue { color: var(--accent); }
ft-notes .empty { color: var(--soft); text-align: center; padding: 40px 0; }
ft-notes .row { display: flex; gap: 8px; align-items: center; margin: 10px 0; flex-wrap: wrap; }
ft-notes .hint { color: var(--soft); font-size: 13px; margin: 4px 0 0; }
ft-notes .warn { color: var(--accent); margin: 8px 0; }
`;

const icon = (name, slot = "icon-only") =>
  globalThis.Ionicons?.map?.has(name)
    ? `<ion-icon slot="${slot}" name="${name}" aria-hidden="true"></ion-icon>`
    : `<i slot="${slot}" class="i" style="--i:url(./icon/${name}.svg)" aria-hidden="true"></i>`;
const smallIcon = (name) => `<i class="i small" style="--i:url(./icon/${name}.svg)" aria-hidden="true"></i>`;
const button = (act, label, name, extra = "") =>
  `<ion-button ${/\bfill=/.test(extra) ? "" : 'fill="clear"'} data-act="${act}" aria-label="${escape(label)}" ${extra}>${icon(name)}</ion-button>`;
// Ionic fills an uncoloured solid button in a toolbar with the toolbar's text colour, so name one.
const FILLED = 'fill="solid" color="primary"';

class Notes extends HTMLElement {
  constructor() {
    super();
    this.lang = "en";
    this.notes = [];
    this.query = "";
    this.screen = "list";
    this.current = null;
    this.showText = false;
    this.warning = "";
    this.chatGone = false;
    this.opened = false;
  }

  connectedCallback() {
    // No shadow root, so Ionic's global styles reach the notes.
    this.view = this;
    this.addEventListener("click", (event) => this.onClick(event));
    this.addEventListener("input", (event) => this.onInput(event));
    this.addEventListener("change", (event) => this.onChange(event));
    this.addEventListener("ionChange", (event) => this.onChange(event));
    globalThis.ft?.onOpen?.((opening) => this.onOpen(opening));
    this.paint();
  }

  async onOpen(opening) {
    this.lang = opening.lang || "en";
    this.opened = true;
    this.showText = (await globalThis.ft.store.get("showText")) === "1";
    await this.load();
    if (opening.reminder) {
      const note = this.notes.find((one) => one.id === opening.reminder);
      if (note) return this.edit(note);
    }
    if (opening.text) {
      const note = noteFrom(opening.text, opening.ref);
      if (await this.keep(note)) {
        this.notes.push(note);
        return this.edit(note);
      }
    }
    this.paint();
  }

  async load() {
    const keys = await globalThis.ft.records.keys(PREFIX);
    const notes = [];
    for (const key of keys) {
      const note = parseNote(await globalThis.ft.records.get(key));
      if (note) notes.push(note);
    }
    this.notes = notes;
  }

  async keep(note) {
    const kept = await globalThis.ft.records.set(noteKey(note.id), JSON.stringify(note));
    this.warning = kept ? "" : t(this.lang, "full");
    return kept;
  }

  edit(note) {
    this.current = { ...note };
    this.chatGone = false;
    this.warning = "";
    this.screen = "note";
    this.paint();
  }

  list() {
    this.current = null;
    this.screen = "list";
    this.paint();
  }

  async onClick(event) {
    const button = event.target.closest("button, ion-button");
    if (!button) return;
    const { act, id } = button.dataset;
    if (act === "open") {
      const note = this.notes.find((one) => one.id === id);
      if (note) this.edit(note);
    } else if (act === "new") this.edit(noteFrom("", null));
    else if (act === "settings") {
      this.screen = "settings";
      this.paint();
    } else if (act === "back") this.list();
    else if (act === "save") await this.save();
    else if (act === "delete") await this.remove();
    else if (act === "remind") await this.remind(proposedReminder());
    else if (act === "unremind") await this.remind(null);
    else if (act === "chat") {
      const there = await globalThis.ft.openChat(this.current.ref);
      if (!there) {
        this.chatGone = true;
        this.paint();
      }
    }
  }

  onInput(event) {
    const field = event.target;
    if (field.name === "query") {
      this.query = field.value;
      this.paintList();
    } else if (field.name === "text" && this.current) {
      this.current.text = field.value;
    }
  }

  async onChange(event) {
    const field = event.target;
    if (field.name === "remindAt" && this.current) {
      const at = fromLocalInput(field.value);
      if (at !== null) await this.remind(at);
    } else if (field.getAttribute?.("name") === "showText") {
      this.showText = Boolean(event.detail?.checked ?? field.checked);
      await globalThis.ft.store.set("showText", this.showText ? "1" : "0");
      for (const note of this.notes) {
        if (reminderState(note) === "pending") await globalThis.ft.remind.set(note.id, note.remindAt, reminderText(note, this.showText));
      }
    }
  }

  async save() {
    const note = this.current;
    if (!note) return;
    const known = this.notes.findIndex((one) => one.id === note.id);
    if (!note.text.trim() && known < 0) return this.list();
    note.updatedAt = Date.now();
    if (!(await this.keep(note))) return this.paint();
    if (known < 0) this.notes.push(note);
    else this.notes[known] = note;
    this.list();
  }

  async remove() {
    const note = this.current;
    if (!note) return;
    if (this.notes.some((one) => one.id === note.id) && !(await this.sure())) return;
    if (typeof note.remindAt === "number") await globalThis.ft.remind.cancel(note.id);
    await globalThis.ft.records.forget(noteKey(note.id));
    this.notes = this.notes.filter((one) => one.id !== note.id);
    this.list();
  }

  // The frame has no browser dialogs, hence the lent Ionic alert.
  async sure() {
    const alerts = globalThis.ftIonic?.alertController;
    if (!alerts) return false;
    const T = (key) => t(this.lang, key);
    const alert = await alerts.create({
      message: T("confirmDelete"),
      buttons: [
        { text: T("back"), role: "cancel" },
        { text: T("delete"), role: "destructive" },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === "destructive";
  }

  async remind(at) {
    const note = this.current;
    if (!note) return;
    if (at === null) {
      await globalThis.ft.remind.cancel(note.id);
      delete note.remindAt;
    } else {
      const set = await globalThis.ft.remind.set(note.id, at, reminderText(note, this.showText));
      if (!set) {
        this.warning = t(this.lang, "noRemind");
        return this.paint();
      }
      note.remindAt = at;
    }
    note.updatedAt = Date.now();
    if (await this.keep(note)) {
      const known = this.notes.findIndex((one) => one.id === note.id);
      if (known < 0) this.notes.push({ ...note });
      else this.notes[known] = { ...note };
    }
    this.paint();
  }

  paint() {
    if (this.screen === "note") this.paintNote();
    else if (this.screen === "settings") this.paintSettings();
    else this.paintList();
  }

  paintList() {
    const T = (key) => t(this.lang, key);
    const now = Date.now();
    const shown = sortNotes(this.notes.filter((note) => matches(note, this.query)), now);
    const rows = shown
      .map((note) => {
        const state = reminderState(note, now);
        const when = state === "none" ? "" : `<span>${smallIcon("alarm-outline")}${escape(whenLabel(note.remindAt, now, this.lang))}</span>`;
        const overdue = state === "overdue" ? `<span>${escape(T("overdue"))}</span>` : "";
        const from = note.ref ? `<span>${smallIcon("chatbubble-outline")}${escape(T("fromChat"))}</span>` : "";
        return `<li><button data-act="open" data-id="${escape(note.id)}">
          <div class="title">${escape(titleOf(note.text, 80)) || "…"}</div>
          <div class="meta ${state}">${when}${overdue}${from}</div>
        </button></li>`;
      })
      .join("");
    const empty = this.notes.length ? T("noMatch") : T("empty");
    const list = this.querySelector("ul, .empty");
    const body = rows ? `<ul>${rows}</ul>` : `<p class="empty">${escape(empty)}</p>`;
    if (list && this.screen === "list" && this.paintedLang === this.lang && this.view.querySelector('input[name="query"]')) {
      list.outerHTML = body;
      return;
    }
    this.paintedLang = this.lang;
    this.view.innerHTML = `<style>${STYLE}</style>
      <ion-header><ion-toolbar>
        <input type="search" name="query" placeholder="${escape(T("search"))}" aria-label="${escape(T("search"))}" value="${escape(this.query)}">
        <ion-buttons slot="end">
          ${button("settings", T("settings"), "options-outline")}
          ${button("new", T("newNote"), "add-outline", FILLED)}
        </ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content><div class="view">${body}</div></ion-content>`;
  }

  paintNote() {
    const T = (key) => t(this.lang, key);
    const note = this.current;
    const state = reminderState(note);
    const reminder =
      state === "none"
        ? `${button("remind", T("remind"), "alarm-outline", 'fill="outline"')}<span class="hint">${escape(T("remind"))}</span>`
        : `<span>${escape(T("reminder"))}</span>
           <input type="datetime-local" name="remindAt" value="${toLocalInput(note.remindAt)}" aria-label="${escape(T("reminder"))}" style="width:auto">
           ${state === "overdue" ? `<span class="warn">${escape(T("overdue"))}</span>` : ""}
           ${button("unremind", T("cancelReminder"), "remove-outline", 'fill="outline"')}`;
    const chat = note.ref
      ? this.chatGone
        ? `<p class="hint">${escape(T("chatGone"))}</p>`
        : `<ion-button fill="outline" data-act="chat">${icon("chatbubble-outline", "start")}${escape(T("goToChat"))}</ion-button>`
      : "";
    this.view.innerHTML = `<style>${STYLE}</style>
      <ion-header><ion-toolbar>
        <ion-buttons slot="start">${button("back", T("back"), "arrow-back-outline")}</ion-buttons>
        <ion-buttons slot="end">
          ${button("delete", T("delete"), "trash-outline", 'color="danger"')}
          ${button("save", T("save"), "checkmark-outline", FILLED)}
        </ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content><div class="view">
      <textarea name="text" placeholder="${escape(T("placeholder"))}" aria-label="${escape(T("placeholder"))}">${escape(note.text)}</textarea>
      <div class="row">${reminder}</div>
      ${this.warning ? `<p class="warn">${escape(this.warning)}</p>` : ""}
      <div class="row">${chat}</div>
      </div></ion-content>`;
    const area = this.view.querySelector("textarea");
    if (area && !note.text) area.focus?.();
  }

  paintSettings() {
    const T = (key) => t(this.lang, key);
    this.view.innerHTML = `<style>${STYLE}</style>
      <ion-header><ion-toolbar>
        <ion-buttons slot="start">${button("back", T("back"), "arrow-back-outline")}</ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content><div class="view">
      <ion-toggle name="showText" justify="space-between" ${this.showText ? "checked" : ""}>${escape(T("lockScreen"))}</ion-toggle>
      <p class="hint">${escape(T("lockScreenHint"))}</p>
      </div></ion-content>`;
  }
}

if (!customElements.get("ft-notes")) customElements.define("ft-notes", Notes);
