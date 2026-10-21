/**
 * The overlay a recording shows: the current URL (bottom left), each key binding pressed (bottom right) and a
 * cursor with click feedback. The functions below run inside the recorded page, so they use nothing but the DOM
 * and each other.
 */

const HUD_STYLE_ID = 'flow-hud-style';
const KEY_PILL_VISIBLE_MS = 1300;
const URL_REFRESH_MS = 150;

function buildHudStyle(hiddenTestIdentifier: string) {
  return `
    [data-testid="${hiddenTestIdentifier}"] { display: none !important; }
    .flow-hud-pill { position: fixed; bottom: 10px; z-index: 2147483647; pointer-events: none;
      font: 600 12px/1.2 ui-monospace, Consolas, monospace; color: #fff; background: rgba(20, 20, 24, 0.82);
      border-radius: 6px; padding: 5px 8px; max-width: 48vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #flow-hud-url { left: 10px; }
    #flow-hud-keys { right: 10px; font-size: 15px; transition: opacity 200ms; opacity: 0; }
    #flow-hud-cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 18px; height: 18px;
      margin: -9px 0 0 -9px; border-radius: 50%; border: 2px solid #fff; background: rgba(230, 60, 110, 0.75);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45); left: -40px; top: -40px; transition: transform 120ms; }
    #flow-hud-cursor.is-pressed { transform: scale(0.65); background: rgba(230, 60, 110, 1); }`;
}

function describeKeyPress(event: KeyboardEvent) {
  const keyLabels: Record<string, string> = { ' ': 'Space', Escape: 'Esc' };
  const keyLabel = keyLabels[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const isPlainTyping = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
  if (isPlainTyping) return `Typing ${keyLabel}`;
  const modifiers = [
    event.ctrlKey ? 'Ctrl' : null,
    event.metaKey ? 'Cmd' : null,
    event.altKey ? 'Alt' : null,
    event.shiftKey ? 'Shift' : null,
  ].filter((modifier) => modifier !== null);
  return [...modifiers, keyLabel].join(' + ');
}

function createPill(id: string) {
  return Object.assign(document.createElement('div'), { id, className: 'flow-hud-pill' });
}

/** A pill that names each key binding pressed for a moment. */
function createKeysPill(visibleMs: number) {
  const keysPill = createPill('flow-hud-keys');
  const modifierKeys = new Set(['Control', 'Shift', 'Alt', 'Meta']);
  let hideTimeout = 0;
  window.addEventListener(
    'keydown',
    (event) => {
      if (modifierKeys.has(event.key)) return;
      keysPill.textContent = describeKeyPress(event);
      keysPill.style.opacity = '1';
      window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        keysPill.style.opacity = '0';
      }, visibleMs);
    },
    true,
  );
  return keysPill;
}

/** A pill that shows the page's current URL. */
function createUrlPill(refreshMs: number) {
  const urlPill = createPill('flow-hud-url');
  const showUrl = () => {
    urlPill.textContent = window.location.href;
  };
  showUrl();
  setInterval(showUrl, refreshMs);
  return urlPill;
}

/** A dot that follows the mouse and shrinks while a button is pressed. */
function createCursor() {
  const cursor = Object.assign(document.createElement('div'), { id: 'flow-hud-cursor' });
  window.addEventListener(
    'mousemove',
    (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    },
    true,
  );
  window.addEventListener('mousedown', () => cursor.classList.add('is-pressed'), true);
  window.addEventListener('mouseup', () => cursor.classList.remove('is-pressed'), true);
  return cursor;
}

interface iFlowHudSettings {
  styleId: string;
  styleText: string;
  keyPillVisibleMs: number;
  urlRefreshMs: number;
}

function installFlowHud(settings: iFlowHudSettings) {
  const install = () => {
    if (document.getElementById(settings.styleId)) return;
    const style = Object.assign(document.createElement('style'), {
      id: settings.styleId,
      textContent: settings.styleText,
    });
    document.documentElement.append(
      style,
      createUrlPill(settings.urlRefreshMs),
      createKeysPill(settings.keyPillVisibleMs),
      createCursor(),
    );
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

/**
 * The init script that installs the overlay in every document of the recorded page; `hiddenTestIdentifier` hides
 * an element such as the devtools button. tsx names functions through an `__name` helper, which the page lacks.
 */
export function buildFlowHudScript(hiddenTestIdentifier: string) {
  const settings: iFlowHudSettings = {
    styleId: HUD_STYLE_ID,
    styleText: buildHudStyle(hiddenTestIdentifier),
    keyPillVisibleMs: KEY_PILL_VISIBLE_MS,
    urlRefreshMs: URL_REFRESH_MS,
  };
  return [
    'var __name = (target) => target;',
    ...[describeKeyPress, createPill, createKeysPill, createUrlPill, createCursor, installFlowHud].map(String),
    `installFlowHud(${JSON.stringify(settings)});`,
  ].join('\n');
}
