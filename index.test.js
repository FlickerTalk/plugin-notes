// The plugin's own tests (Plan §53, plan-notes §6): the model of a note, the order of the list,
// the search, and the flow of a reminder against a fake core.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREFIX,
  fromLocalInput,
  matches,
  noteFrom,
  noteKey,
  parseNote,
  proposedReminder,
  reminderState,
  reminderText,
  sortNotes,
  titleOf,
  toLocalInput,
  whenLabel,
} from "./dist/index.js";
import { LANGUAGES, catalogueOf, t } from "./dist/i18n.js";

const NOW = new Date(2026, 8, 27, 10, 0, 0).getTime();

describe("a note", () => {
  it("is born from a text the user handed over, with the way back to its conversation", () => {
    const note = noteFrom("buy milk", "ref_1", NOW);
    expect(note).toMatchObject({ text: "buy milk", ref: "ref_1", createdAt: NOW, updatedAt: NOW });
    expect(note.id).toMatch(/^[0-9a-z]+$/);
    expect(noteFrom("", null, NOW)).not.toHaveProperty("ref");
    expect(noteKey(note.id)).toBe(`${PREFIX}${note.id}`);
  });

  it("reads back from its record and rejects what is not a note", () => {
    const note = { id: "a", text: "x", createdAt: 1, updatedAt: 2, remindAt: 3, ref: "ref_a" };
    expect(parseNote(JSON.stringify(note))).toEqual(note);
    expect(parseNote(JSON.stringify({ id: "a", text: "x" }))).toEqual({ id: "a", text: "x", createdAt: 0, updatedAt: 0 });
    expect(parseNote("not json")).toBeNull();
    expect(parseNote(JSON.stringify({ id: 1 }))).toBeNull();
    expect(parseNote(null)).toBeNull();
    // A reminder that is not a number is no reminder.
    expect(parseNote(JSON.stringify({ id: "a", text: "x", remindAt: "soon" }))).not.toHaveProperty("remindAt");
  });

  it("is titled by its first line, cut short", () => {
    expect(titleOf("\n\n  Milk  \nand eggs")).toBe("Milk");
    expect(titleOf("")).toBe("");
    expect(titleOf("a".repeat(300))).toHaveLength(200);
    expect(titleOf("a".repeat(300)).endsWith("…")).toBe(true);
  });

  it("knows whether its reminder is still to come", () => {
    expect(reminderState({ text: "" }, NOW)).toBe("none");
    expect(reminderState({ text: "", remindAt: NOW + 1 }, NOW)).toBe("pending");
    expect(reminderState({ text: "", remindAt: NOW - 1 }, NOW)).toBe("overdue");
  });

  it("only says its text on the lock screen when the user allows it", () => {
    const note = { text: "Call the dentist\nat 5" };
    expect(reminderText(note, true)).toBe("Call the dentist");
    expect(reminderText(note, false)).toBe("");
  });
});

describe("the list", () => {
  const notes = [
    { id: "old", text: "old", updatedAt: 1 },
    { id: "soon", text: "soon", updatedAt: 2, remindAt: NOW + 1000 },
    { id: "later", text: "later", updatedAt: 9, remindAt: NOW + 5000 },
    { id: "overdue", text: "overdue", updatedAt: 3, remindAt: NOW - 1000 },
    { id: "new", text: "new", updatedAt: 5 },
  ];

  it("puts the reminders still to come first, soonest first, then the rest by last touched", () => {
    expect(sortNotes(notes, NOW).map((note) => note.id)).toEqual(["soon", "later", "new", "overdue", "old"]);
  });

  it("finds every word of a search, in any order and case", () => {
    const note = { text: "Buy Milk and eggs" };
    expect(matches(note, "milk")).toBe(true);
    expect(matches(note, "eggs buy")).toBe(true);
    expect(matches(note, "  ")).toBe(true);
    expect(matches(note, "bread")).toBe(false);
  });
});

describe("a moment", () => {
  it("is the time alone if today, and the day too if not", () => {
    const today = new Date(2026, 8, 27, 16, 30).getTime();
    expect(whenLabel(today, NOW, "en")).toMatch(/4:30|16:30/);
    const tomorrow = new Date(2026, 8, 28, 9, 5).getTime();
    expect(whenLabel(tomorrow, NOW, "en")).toMatch(/Sep/);
    expect(whenLabel(tomorrow, NOW, "en")).not.toMatch(/2026/);
    const nextYear = new Date(2027, 0, 1, 9, 5).getTime();
    expect(whenLabel(nextYear, NOW, "en")).toMatch(/2027/);
    expect(whenLabel(tomorrow, NOW, "xx-nowhere")).toBeTruthy();
  });

  it("goes to the picker and back without losing a minute", () => {
    const at = new Date(2026, 8, 28, 9, 5).getTime();
    expect(toLocalInput(at)).toBe("2026-09-28T09:05");
    expect(fromLocalInput(toLocalInput(at))).toBe(at);
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("nonsense")).toBeNull();
  });

  it("proposes an hour from now, to the minute", () => {
    const now = new Date(2026, 8, 27, 10, 12, 45, 300).getTime();
    expect(new Date(proposedReminder(now)).toISOString()).toBe(new Date(2026, 8, 27, 11, 12, 0, 0).toISOString());
  });
});

describe("the catalogue", () => {
  it("speaks the 21 languages of the app, with the same keys in each", () => {
    expect(LANGUAGES).toHaveLength(21);
    const keys = Object.keys(catalogueOf("en")).sort();
    for (const lang of LANGUAGES) expect(Object.keys(catalogueOf(lang)).sort(), lang).toEqual(keys);
  });

  it("falls back to the base language and then to English", () => {
    expect(t("pt-BR", "save")).toBe("Guardar");
    expect(t("xx", "save")).toBe("Save");
    expect(t("es", "no-such-key")).toBe("no-such-key");
  });
});

describe("the manifest", () => {
  // The 20 languages of the app besides English, in which the catalogue shows the plugin's name
  // and summary (plugin-sdk, `locales` in module.schema.json).
  const LOCALES = ["es", "pt", "fr", "de", "it", "ro", "ru", "uk", "pl", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];
  const manifest = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "module.json"), "utf8"));
  const codePoints = (text) => [...text].length;

  it("names and sums up the plugin in the 20 other languages of the app, within the SDK's limits", () => {
    expect(Object.keys(manifest.locales ?? {})).toEqual(LOCALES);
    for (const lang of LOCALES) {
      const { name, summary } = manifest.locales[lang];
      expect(summary, lang).toBeTypeOf("string");
      expect(codePoints(summary.trim()), lang).toBeGreaterThan(0);
      expect(codePoints(summary), lang).toBeLessThanOrEqual(200);
      expect(name, lang).toBeTypeOf("string");
      expect(codePoints(name.trim()), lang).toBeGreaterThan(0);
      expect(codePoints(name), lang).toBeLessThanOrEqual(64);
    }
  });

  it("calls the plugin in each language what the plugin calls itself", () => {
    for (const lang of LOCALES) {
      expect(LANGUAGES, lang).toContain(lang);
      expect(manifest.locales?.[lang]?.name, lang).toBe(catalogueOf(lang).title);
    }
  });
});

/** A fake core: records, settings and reminders in memory, as the frame's `ft` would answer. */
function fakeCore() {
  const records = new Map();
  const settings = new Map();
  const reminders = new Map();
  const handlers = [];
  return {
    records,
    reminders,
    open: (opening) => Promise.all(handlers.map((handler) => handler({ text: "", dark: false, lang: "en", file: null, ref: null, reminder: null, live: false, ...opening }))),
    ft: {
      onOpen: (handler) => handlers.push(handler),
      store: {
        get: async (key) => settings.get(key) ?? null,
        set: async (key, value) => settings.set(key, value) && true,
        forget: async (key) => settings.delete(key),
      },
      records: {
        get: async (key) => records.get(key) ?? null,
        set: vi.fn(async (key, value) => (value.length > 10_000 ? false : (records.set(key, value), true))),
        forget: async (key) => records.delete(key),
        keys: async (prefix) => [...records.keys()].filter((key) => key.startsWith(prefix)).sort(),
        usage: async () => ({ used: 0, quota: 4_000_000 }),
      },
      remind: {
        set: vi.fn(async (id, at, text) => (reminders.set(id, { at, text }), true)),
        cancel: vi.fn(async (id) => reminders.delete(id)),
        list: async () => [...reminders].map(([id, one]) => ({ plugin: "com.flickertalk.notes", id, ...one })),
      },
      openChat: vi.fn(async () => false),
      close: vi.fn(),
    },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the plugin", () => {
  let core;
  let element;
  afterEach(async () => {
    for (const alert of document.querySelectorAll("ion-alert")) await alert.dismiss();
    delete globalThis.confirm;
    delete globalThis.Ionicons;
  });
  // In the page, not in a shadow root: Ionic's global styles do not cross a shadow boundary.
  const inside = () => element;
  const press = async (act) => {
    inside().querySelector(`[data-act="${act}"]`).click();
    await tick();
    await tick();
  };
  // Ionic moves a button's label to the native button inside it once it has drawn.
  const label = (one) => one?.getAttribute("aria-label") ?? one?.shadowRoot?.querySelector("button")?.getAttribute("aria-label") ?? null;
  /** The app's Ionic alert, answered as a tap on one of its buttons would. */
  const answer = async (role) => {
    let alert = null;
    for (let wait = 0; wait < 50 && !(alert = document.querySelector("ion-alert")); wait += 1) await tick();
    if (!alert) throw new Error("no alert");
    await alert.dismiss(undefined, role);
    for (let wait = 0; wait < 6; wait += 1) await tick();
    return alert;
  };

  beforeEach(async () => {
    core = fakeCore();
    globalThis.ft = core.ft;
    // The frame has no browser dialogs: confirm() answers nothing there.
    globalThis.confirm = () => {
      throw new Error("no browser dialogs in the frame");
    };
    document.body.innerHTML = "";
    element = document.createElement("ft-notes");
    document.body.append(element);
  });

  it("keeps a text the user handed over as a note that leads back to its conversation", async () => {
    await core.open({ text: "buy milk", ref: "ref_7" });
    const kept = [...core.records.values()].map((json) => JSON.parse(json));
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ text: "buy milk", ref: "ref_7" });
    expect(inside().querySelector("textarea").value).toBe("buy milk");
    // The way back is offered; when the conversation is gone, the plugin says so.
    await press("chat");
    expect(core.ft.openChat).toHaveBeenCalledWith("ref_7");
    expect(inside().textContent).toContain("That conversation is gone");
  });

  it("lists what it has, the reminders first, and finds a note by its words", async () => {
    core.records.set("note/a", JSON.stringify({ id: "a", text: "old one", updatedAt: 1 }));
    core.records.set("note/b", JSON.stringify({ id: "b", text: "with alarm", updatedAt: 2, remindAt: Date.now() + 100_000 }));
    core.records.set("note/c", JSON.stringify({ id: "c", text: "newest", updatedAt: 3 }));
    await core.open({ lang: "es" });
    const titles = () => [...inside().querySelectorAll(".title")].map((one) => one.textContent.trim());
    expect(titles()).toEqual(["with alarm", "newest", "old one"]);
    expect(label(inside().querySelector('[data-act="new"]'))).toBe("Nota nueva");
    const search = inside().querySelector('input[name="query"]');
    search.value = "old";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    expect(titles()).toEqual(["old one"]);
  });

  it("writes a new note, sets its reminder through the core and cancels it on deletion", async () => {
    await core.open({});
    await press("new");
    const area = inside().querySelector("textarea");
    area.value = "Dentist\nat five";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await press("remind");
    expect(core.ft.remind.set).toHaveBeenCalledTimes(1);
    const [id, at, text] = core.ft.remind.set.mock.calls[0];
    expect(at).toBeGreaterThan(Date.now());
    expect(text).toBe("", "the lock screen says nothing of the note unless allowed");
    expect(JSON.parse(core.records.get(`note/${id}`))).toMatchObject({ text: "Dentist\nat five", remindAt: at });
    await press("save");
    expect(inside().querySelectorAll(".title")).toHaveLength(1);

    await press("open");
    await press("delete");
    expect((await answer("cancel")).message).toBe("Delete this note? It is gone for good.");
    expect(core.records.size).toBe(1);
    await press("delete");
    await answer("destructive");
    expect(core.ft.remind.cancel).toHaveBeenCalledWith(id);
    expect(core.records.size).toBe(0);
    expect(inside().textContent).toContain("No notes yet");
  });

  it("says the note's text in the notification only once the user turns that on", async () => {
    core.records.set("note/a", JSON.stringify({ id: "a", text: "Secret plan", updatedAt: 1, remindAt: Date.now() + 100_000 }));
    await core.open({});
    await press("settings");
    const toggle = inside().querySelector('ion-toggle[name="showText"]');
    expect(toggle.checked).toBe(false);
    expect(toggle.textContent).toBe("Show the note's text in the notification");
    // What Ionic's toggle says when the user turns it on.
    toggle.checked = true;
    toggle.dispatchEvent(new CustomEvent("ionChange", { bubbles: true, detail: { checked: true } }));
    await tick();
    await tick();
    expect(core.reminders.get("a").text).toBe("Secret plan");
    expect(await core.ft.store.get("showText")).toBe("1");
  });

  it("opens the note a tapped reminder belongs to, and warns when there is no room", async () => {
    core.records.set("note/a", JSON.stringify({ id: "a", text: "Ring mum", updatedAt: 1, remindAt: Date.now() - 1000 }));
    await core.open({ reminder: "a" });
    expect(inside().querySelector("textarea").value).toBe("Ring mum");
    expect(inside().textContent).toContain("Overdue");
    const area = inside().querySelector("textarea");
    area.value = "x".repeat(20_000);
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await press("save");
    expect(inside().textContent).toContain("No room left");
    expect(inside().querySelector("textarea").value).toHaveLength(20_000);
  });

  it("does not keep an empty new note", async () => {
    await core.open({});
    await press("new");
    await press("save");
    expect(core.records.size).toBe(0);
  });

  it("asks for an app that lends Ionic", () => {
    expect(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "module.json"), "utf8")).minCoreVersion).toBe("1.6.0");
  });

  it("draws in the page, each screen in Ionic's header and content, with no close of its own", async () => {
    await core.open({});
    expect(element.shadowRoot).toBe(null);
    const toolbar = element.querySelector(":scope > ion-header > ion-toolbar");
    expect(toolbar.querySelector('input[name="query"]')).not.toBeNull();
    for (const act of ["settings", "new"]) expect(label(toolbar.querySelector(`ion-button[data-act="${act}"]`)), act).toBeTruthy();
    expect(toolbar.querySelector('ion-button[data-act="new"]').getAttribute("fill")).toBe("solid");
    expect(element.querySelector(":scope > ion-content .empty")).not.toBeNull();
    expect(element.querySelector('[data-act="close"]')).toBeNull();

    await press("new");
    const bar = element.querySelector(":scope > ion-header > ion-toolbar");
    for (const act of ["back", "delete", "save"]) expect(label(bar.querySelector(`ion-button[data-act="${act}"]`)), act).toBeTruthy();
    expect(bar.querySelector('ion-button[data-act="delete"]').getAttribute("color")).toBe("danger");
    expect(element.querySelector(":scope > ion-content textarea")).not.toBeNull();
    expect(element.querySelector('ion-content ion-button[data-act="remind"]')).not.toBeNull();

    await press("back");
    await press("settings");
    expect(element.querySelector(':scope > ion-header ion-button[data-act="back"]')).not.toBeNull();
    expect(element.querySelector(':scope > ion-content ion-toggle[name="showText"]')).not.toBeNull();
  });

  it("draws an Ionicon the app lent by name with ion-icon, and the one it serves otherwise", async () => {
    await core.open({});
    expect(element.querySelector('[data-act="new"] [slot="icon-only"]').getAttribute("style")).toContain("./icon/add-outline.svg");
    globalThis.Ionicons = { map: new Map([["add-outline", "data:image/svg+xml;utf8,<svg></svg>"]]) };
    element.paintedLang = null;
    element.paint();
    expect(element.querySelector('[data-act="new"] ion-icon[slot="icon-only"]').getAttribute("name")).toBe("add-outline");
  });
});

describe("the package", () => {
  const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
  const files = readdirSync(dist);

  // Ionic is the app's, lent to the frame: a copy in the package would be a second one, and heavy.
  it("carries no Ionic of its own", () => {
    for (const file of files) {
      const code = readFileSync(join(dist, file), "utf8");
      expect(code, file).not.toMatch(/@ionic\/core|ionicframework|stencil|defineCustomElement|__registerHost/i);
      expect(code, file).not.toMatch(/^\s*import\s.*from\s+["'](?!\.\/)/m);
    }
  });

  // Small: it is plain code, no library.
  it("stays under 128 KiB", () => {
    const bytes = files.reduce((sum, file) => sum + statSync(join(dist, file)).size, 0);
    expect(bytes).toBeLessThanOrEqual(128 * 1024);
  });
});

describe("the image of the Apps grid", () => {
  // icon.svg beside module.json and dist/, signed with the rest: the app draws it on the tile; the
  // Ionicon in module.json stays as the fallback (2026-10-08).
  const image = join(import.meta.dirname, "icon.svg");

  it("is a square 64 × 64 SVG of at most 4 KB at the root of the package, and not inside dist/", () => {
    expect(existsSync(image), "icon.svg").toBe(true);
    expect(statSync(image).size).toBeLessThanOrEqual(4096);
    const svg = readFileSync(image, "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(existsSync(join(import.meta.dirname, "dist", "icon.svg"))).toBe(false);
  });
});
