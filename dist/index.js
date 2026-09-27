// Notes with reminders for FlickerTalk (Plan §53–§55, plan-notes 2026-09-27). A note lives only
// on this phone, in the plugin's own records; a reminder is a notification for me alone, set by
// the core, and the contact never hears of it. Nothing leaves this frame.

import { t } from "./i18n.js";

/** Where a note is kept: one record each, under one prefix, so the list is one `keys` call. */
export const PREFIX = "note/";

/** The key of a note's record. */
export function noteKey(id) {
  return `${PREFIX}${id}`;
}

/** An id for a new note: time-ordered, so two made in a row list in the order they were made. */
export function newId(now = Date.now()) {
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `${now.toString(36).padStart(9, "0")}${random}`;
}

/** A note as it is born: from a text the user handed over (with the way back), or empty. */
export function noteFrom(text, ref, now = Date.now()) {
  const note = { id: newId(now), text: String(text ?? ""), createdAt: now, updatedAt: now };
  if (ref) note.ref = String(ref);
  return note;
}

/** A note read back from its record; null if what is there is not one. */
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

/** The first line of a note, as its title in the list and in a notification (200 at most). */
export function titleOf(text, limit = 200) {
  const line = String(text ?? "")
    .split("\n")
    .map((one) => one.trim())
    .find((one) => one.length > 0);
  if (!line) return "";
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
}

/** Whether a note's reminder is still to come, has passed, or there is none. */
export function reminderState(note, now = Date.now()) {
  if (typeof note.remindAt !== "number") return "none";
  return note.remindAt > now ? "pending" : "overdue";
}

/**
 * The order of the list (plan-notes §1): first the notes with a reminder still to come, the
 * soonest first; then the rest, the last touched first.
 */
export function sortNotes(notes, now = Date.now()) {
  const pending = notes.filter((note) => reminderState(note, now) === "pending").sort((a, b) => a.remindAt - b.remindAt);
  const rest = notes.filter((note) => reminderState(note, now) !== "pending").sort((a, b) => b.updatedAt - a.updatedAt);
  return [...pending, ...rest];
}

/** Whether a note says every word of the search, in any order and in any case. */
export function matches(note, query) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = note.text.toLowerCase();
  return words.every((word) => text.includes(word));
}

/** What a reminder says on the lock screen: the note's first line if the user allows it, else
 *  nothing, and the app says only that there is a reminder. */
export function reminderText(note, showText) {
  return showText ? titleOf(note.text) : "";
}

/** A moment as the phone writes it: the time alone if it is today, the day too if not. */
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

/** A moment as a `datetime-local` input wants it (local time, to the minute). */
export function toLocalInput(at) {
  const day = new Date(at);
  const two = (value) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}T${two(day.getHours())}:${two(day.getMinutes())}`;
}

/** The moment a `datetime-local` input says, in ms; null if it says nothing. */
export function fromLocalInput(value) {
  if (!value) return null;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? at : null;
}

/** An hour from now, to the minute: what the reminder proposes before the user picks. */
export function proposedReminder(now = Date.now()) {
  const soon = new Date(now + 60 * 60 * 1000);
  soon.setSeconds(0, 0);
  return soon.getTime();
}

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (one) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[one]);

const STYLE = `
:host { display: block; font: 15px system-ui, sans-serif; color: #111; --ink: #111; --paper: #fff; --line: #d8d8d8; --soft: #666; --accent: #e0562b; }
@media (prefers-color-scheme: dark) { :host { color: #f4f4f4; --ink: #f4f4f4; --paper: #111; --line: #3a3a3a; --soft: #aaa; } }
:host-context([data-dark]) { color: #f4f4f4; --ink: #f4f4f4; --paper: #111; --line: #3a3a3a; --soft: #aaa; }
* { box-sizing: border-box; }
.bar { display: flex; gap: 6px; align-items: center; padding: 4px 0 10px; }
.grow { flex: 1; }
button {
  appearance: none; border: 1px solid currentColor; background: transparent; color: inherit;
  border-radius: 10px; min-width: 44px; height: 40px; font: inherit; padding: 0 10px; cursor: pointer; opacity: .8;
}
button.on { opacity: 1; box-shadow: inset 0 0 0 2px currentColor; }
button.text { min-width: 0; }
button.danger { color: var(--accent); }
.i {
  display: block; width: 22px; height: 22px; margin: auto; background: currentColor;
  -webkit-mask: var(--i) center/contain no-repeat; mask: var(--i) center/contain no-repeat;
}
.i.small { width: 16px; height: 16px; display: inline-block; vertical-align: -3px; margin: 0 4px 0 0; }
input, textarea {
  font: inherit; color: inherit; background: transparent; border: 1px solid var(--line); border-radius: 10px;
  padding: 8px 10px; width: 100%;
}
input[type="search"] { height: 40px; }
textarea { min-height: 40vh; resize: vertical; line-height: 1.4; }
ul { list-style: none; margin: 0; padding: 0; }
li { border-bottom: 1px solid var(--line); }
li button { display: block; width: 100%; text-align: start; border: 0; border-radius: 0; height: auto; padding: 10px 4px; opacity: 1; }
.title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { color: var(--soft); font-size: 13px; margin-top: 2px; display: flex; gap: 10px; }
.meta.overdue { color: var(--accent); }
.empty { color: var(--soft); text-align: center; padding: 40px 0; }
.row { display: flex; gap: 8px; align-items: center; margin: 10px 0; flex-wrap: wrap; }
.hint { color: var(--soft); font-size: 13px; margin: 4px 0 0; }
.warn { color: var(--accent); margin: 8px 0; }
label.switch { display: flex; gap: 10px; align-items: center; }
label.switch input { width: auto; }
`;

const icon = (name) => `<i class="i" style="--i:url(./icon/${name}.svg)"></i>`;
const smallIcon = (name) => `<i class="i small" style="--i:url(./icon/${name}.svg)"></i>`;

/** The plugin's view: a list of notes, one note, or the settings. */
class Notes extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
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
    this.root.innerHTML = `<style>${STYLE}</style><div class="view"></div>`;
    this.view = this.root.querySelector(".view");
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("input", (event) => this.onInput(event));
    this.root.addEventListener("change", (event) => this.onChange(event));
    globalThis.ft?.onOpen?.((opening) => this.onOpen(opening));
    this.paint();
  }

  /** What the app hands over: the language, a reminder that was tapped, or a text to keep. */
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

  /** Every note in the records, in the order of the list. */
  async load() {
    const keys = await globalThis.ft.records.keys(PREFIX);
    const notes = [];
    for (const key of keys) {
      const note = parseNote(await globalThis.ft.records.get(key));
      if (note) notes.push(note);
    }
    this.notes = notes;
  }

  /** Writes a note down; false, and a warning on screen, when there is no room. */
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
    const button = event.target.closest("button");
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
    else if (act === "close") globalThis.ft.close();
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
    } else if (field.name === "showText") {
      this.showText = field.checked;
      await globalThis.ft.store.set("showText", this.showText ? "1" : "0");
      // What the lock screen shows changes for every reminder still to come.
      for (const note of this.notes) {
        if (reminderState(note) === "pending") await globalThis.ft.remind.set(note.id, note.remindAt, reminderText(note, this.showText));
      }
    }
  }

  /** Keeps the note being written, if it says anything; an empty new note is not kept. */
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

  /** Erases the note and its reminder, after asking once: it is for good. */
  async remove() {
    const note = this.current;
    if (!note) return;
    if (this.notes.some((one) => one.id === note.id) && !confirm(t(this.lang, "confirmDelete"))) return;
    if (typeof note.remindAt === "number") await globalThis.ft.remind.cancel(note.id);
    await globalThis.ft.records.forget(noteKey(note.id));
    this.notes = this.notes.filter((one) => one.id !== note.id);
    this.list();
  }

  /** Sets the note's reminder at `at`, or takes it away with null. The note is kept with it. */
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
    const list = this.root.querySelector("ul, .empty");
    const body = rows ? `<ul>${rows}</ul>` : `<p class="empty">${escape(empty)}</p>`;
    if (list && this.screen === "list" && this.paintedLang === this.lang && this.view.querySelector('input[name="query"]')) {
      list.outerHTML = body;
      return;
    }
    this.paintedLang = this.lang;
    this.view.innerHTML = `
      <div class="bar">
        <button data-act="close" aria-label="${escape(T("close"))}">${icon("close-outline")}</button>
        <input type="search" name="query" placeholder="${escape(T("search"))}" aria-label="${escape(T("search"))}" value="${escape(this.query)}">
        <button data-act="settings" aria-label="${escape(T("settings"))}">${icon("options-outline")}</button>
        <button data-act="new" class="on" aria-label="${escape(T("newNote"))}">${icon("add-outline")}</button>
      </div>
      ${body}`;
  }

  paintNote() {
    const T = (key) => t(this.lang, key);
    const note = this.current;
    const state = reminderState(note);
    const reminder =
      state === "none"
        ? `<button data-act="remind" class="text">${icon("alarm-outline")}</button><span class="hint">${escape(T("remind"))}</span>`
        : `<span>${escape(T("reminder"))}</span>
           <input type="datetime-local" name="remindAt" value="${toLocalInput(note.remindAt)}" aria-label="${escape(T("reminder"))}" style="width:auto">
           ${state === "overdue" ? `<span class="warn">${escape(T("overdue"))}</span>` : ""}
           <button data-act="unremind" aria-label="${escape(T("cancelReminder"))}">${icon("remove-outline")}</button>`;
    const chat = note.ref
      ? this.chatGone
        ? `<p class="hint">${escape(T("chatGone"))}</p>`
        : `<button data-act="chat" class="text">${smallIcon("chatbubble-outline")}${escape(T("goToChat"))}</button>`
      : "";
    this.view.innerHTML = `
      <div class="bar">
        <button data-act="back" aria-label="${escape(T("back"))}">${icon("arrow-back-outline")}</button>
        <span class="grow"></span>
        <button data-act="delete" class="danger" aria-label="${escape(T("delete"))}">${icon("trash-outline")}</button>
        <button data-act="save" class="on" aria-label="${escape(T("save"))}">${icon("checkmark-outline")}</button>
      </div>
      <textarea name="text" placeholder="${escape(T("placeholder"))}" aria-label="${escape(T("placeholder"))}">${escape(note.text)}</textarea>
      <div class="row">${reminder}</div>
      ${this.warning ? `<p class="warn">${escape(this.warning)}</p>` : ""}
      <div class="row">${chat}</div>`;
    const area = this.view.querySelector("textarea");
    if (area && !note.text) area.focus?.();
  }

  paintSettings() {
    const T = (key) => t(this.lang, key);
    this.view.innerHTML = `
      <div class="bar">
        <button data-act="back" aria-label="${escape(T("back"))}">${icon("arrow-back-outline")}</button>
        <span class="grow"></span>
      </div>
      <label class="switch">
        <input type="checkbox" name="showText" ${this.showText ? "checked" : ""}>
        <span>${escape(T("lockScreen"))}</span>
      </label>
      <p class="hint">${escape(T("lockScreenHint"))}</p>`;
  }
}

if (!customElements.get("ft-notes")) customElements.define("ft-notes", Notes);
