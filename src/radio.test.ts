import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

interface MockElement {
  id: string;
  tagName: string;
  type: string;
  value: string;
  checked: boolean;
  options?: Array<{ value: string; textContent: string }>;
  textContent: string;
  innerHTML: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  offsetTop: number;
  disabled: boolean;
  className: string;
  style: Record<string, unknown>;
  attributes: Record<string, string>;
  classList: {
    tokens: Set<string>;
    add: (...cls: string[]) => void;
    remove: (...cls: string[]) => void;
    toggle: (cls: string, force?: boolean) => void;
    contains: (cls: string) => boolean;
    replace: (oldCls: string, newCls: string) => void;
  };
  children: MockElement[];
  appendChild: (child: MockElement) => MockElement;
  removeChild: (child: MockElement) => void;
  querySelectorAll: (selector: string) => MockElement[];
  remove: () => void;
  focus: () => void;
  select: () => void;
  click: () => void;
  setAttribute: (k: string, v: string) => void;
  getAttribute: (k: string) => string | undefined;
  addEventListener: () => void;
  isContentEditable?: boolean;
}

function createMockElement(id: string, tagName = 'DIV', type = ''): MockElement {
  const tokens = new Set<string>();
  const styleObj: Record<string, unknown> = {
    setProperty: (k: string, v: unknown) => {
      styleObj[k] = String(v);
    }
  };
  const el: MockElement = {
    id,
    tagName,
    type,
    value: '',
    checked: false,
    options: tagName === 'SELECT' ? [] : undefined,
    textContent: '',
    innerHTML: '',
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 300,
    offsetTop: 0,
    disabled: false,
    className: '',
    style: styleObj,
    attributes: {},
    children: [],
    classList: {
      tokens,
      add: (...cls: string[]) => cls.forEach(c => tokens.add(c)),
      remove: (...cls: string[]) => cls.forEach(c => tokens.delete(c)),
      toggle: (cls: string, force?: boolean) => {
        if (force === undefined) {
          if (tokens.has(cls)) tokens.delete(cls);
          else tokens.add(cls);
        } else if (force) {
          tokens.add(cls);
        } else {
          tokens.delete(cls);
        }
      },
      contains: (cls: string) => tokens.has(cls),
      replace: (oldCls: string, newCls: string) => {
        tokens.delete(oldCls);
        tokens.add(newCls);
      }
    },
    appendChild(child: MockElement) {
      this.children.push(child);
      if (this.options && child.tagName === 'OPTION') {
        this.options.push(child);
      }
      return child;
    },
    removeChild(child: MockElement) {
      this.children = this.children.filter(c => c !== child);
    },
    querySelectorAll() {
      return this.children;
    },
    remove() {},
    focus() {},
    select() {},
    click() {},
    setAttribute(k: string, v: string) {
      this.attributes[k] = v;
    },
    getAttribute(k: string) {
      return this.attributes[k];
    },
    addEventListener() {}
  };
  return el;
}

function loadIndexSandbox(initialStorage: Record<string, string> = {}) {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const scriptCode = scriptMatches[scriptMatches.length - 1]?.[1] || '';

  const storageMap = new Map<string, string>(Object.entries(initialStorage));
  const elements = new Map<string, MockElement>();

  const registerEl = (id: string, tagName = 'DIV', type = '', value = '') => {
    const el = createMockElement(id, tagName, type);
    el.value = value;
    elements.set(id, el);
    return el;
  };

  registerEl('dyslexia-state', 'SPAN');
  registerEl('btn-dyslexia', 'BUTTON');
  registerEl('btn-simple-mode', 'BUTTON');
  registerEl('simple-mode-state', 'SPAN');
  registerEl('master-vol', 'INPUT', 'range', '0.85');
  registerEl('master-vol-val', 'SPAN');
  registerEl('mixer-status-label', 'DIV');
  registerEl('cabina-sfx-grid', 'DIV');
  registerEl('sfx-filter', 'SELECT', '', 'all');
  registerEl('sfx-search', 'INPUT', 'search', '');
  registerEl('sfx-search-clear', 'BUTTON').classList.add('hidden');
  registerEl('sfx-count-label', 'SPAN');
  registerEl('btn-stop-selected-sfx', 'BUTTON').classList.add('hidden');
  registerEl('selected-sfx-name', 'SPAN');
  registerEl('btn-sintonia-oficial', 'BUTTON');
  registerEl('sintonia-btn-icon', 'SPAN');
  registerEl('sintonia-btn-label', 'SPAN');
  registerEl('btn-sintonia-cierre', 'BUTTON');
  registerEl('sintonia-cierre-btn-icon', 'SPAN');
  registerEl('sintonia-cierre-btn-label', 'SPAN');
  registerEl('rec-status-badge', 'SPAN');
  registerEl('rec-timer', 'SPAN');
  const micChk = registerEl('rec-include-mic', 'INPUT', 'checkbox', 'on');
  micChk.checked = true;
  registerEl('mic-armed-badge', 'SPAN');
  registerEl('mic-device-select', 'SELECT', '', 'all');
  registerEl('btn-refresh-mics', 'BUTTON');
  registerEl('mic-gain-slider', 'INPUT', 'range', '1');
  registerEl('mic-gain-val', 'SPAN');
  registerEl('mic-vu-bar', 'DIV');
  registerEl('btn-mic-clean-mode', 'BUTTON');
  registerEl('btn-auto-duck', 'BUTTON');
  registerEl('btn-manual-duck', 'BUTTON');
  registerEl('manual-duck-label', 'SPAN');
  registerEl('voice-effect-select', 'SELECT', '', 'natural');
  registerEl('reverb-controls-panel', 'DIV').classList.add('hidden');
  registerEl('btn-rev-preset-small', 'BUTTON');
  registerEl('btn-rev-preset-auditorium', 'BUTTON');
  registerEl('btn-rev-preset-cathedral', 'BUTTON');
  registerEl('reverb-room-slider', 'INPUT', 'range', '2.4');
  registerEl('reverb-room-val', 'SPAN');
  registerEl('reverb-depth-slider', 'INPUT', 'range', '0.45');
  registerEl('reverb-depth-val', 'SPAN');
  registerEl('header-mode-subtitle', 'P');
  registerEl('studio-autoconfig-bar', 'DIV');
  registerEl('btn-mode-direct', 'BUTTON');
  registerEl('btn-mode-mixer', 'BUTTON');
  registerEl('studio-mode-summary', 'SPAN');
  registerEl('mixer-audacity-banner', 'DIV').classList.add('hidden');
  registerEl('direct-recorder-row', 'DIV');
  registerEl('mic-controls-row', 'DIV');
  registerEl('btn-mic-monitor', 'BUTTON');
  registerEl('btn-mic-check', 'BUTTON');
  registerEl('btn-rec-toggle', 'BUTTON');
  registerEl('btn-rec-pause', 'BUTTON').classList.add('hidden');
  registerEl('rec-preview-audio', 'AUDIO').classList.add('hidden');
  registerEl('btn-rec-download', 'BUTTON');
  registerEl('six-slots-container', 'DIV');
  registerEl('script-title', 'INPUT', 'text', '');
  registerEl('script-editor', 'TEXTAREA', '', '');
  registerEl('word-stats', 'SPAN');
  registerEl('teleprompter-box', 'DIV');
  registerEl('speaker-focus-select', 'SELECT', '', 'all');
  registerEl('btn-step-prev', 'BUTTON');
  registerEl('btn-step-next', 'BUTTON');
  registerEl('prompter-speed', 'INPUT', 'range', '3');
  registerEl('speed-label', 'SPAN');
  registerEl('prompter-font', 'INPUT', 'range', '32');
  registerEl('font-size-label', 'SPAN');
  registerEl('reading-guide-bar', 'DIV');
  registerEl('guide-status', 'SPAN');
  registerEl('mirror-status', 'SPAN');
  registerEl('prompter-play-btn', 'BUTTON');
  registerEl('quick-editor-drawer', 'DIV');
  registerEl('btn-toggle-editor', 'BUTTON');
  registerEl('tab-cabina', 'BUTTON');
  registerEl('tab-repos', 'BUTTON');
  registerEl('tab-guide', 'BUTTON');
  registerEl('view-cabina', 'SECTION');
  registerEl('view-repos', 'SECTION').classList.add('hidden');
  registerEl('view-guide', 'SECTION').classList.add('hidden');
  registerEl('file-stage', 'SELECT', '', '4-Primaria');
  registerEl('file-topic', 'INPUT', 'text', 'Viaje-Ad-Gemellas');
  registerEl('generated-filename', 'CODE');
  registerEl('checklist-container', 'DIV');
  registerEl('checklist-progress', 'SPAN');
  registerEl('toast-container', 'DIV');
  registerEl('tpl-btn-infantil', 'BUTTON');
  registerEl('tpl-btn-primaria', 'BUTTON');
  registerEl('tpl-btn-eso', 'BUTTON');
  registerEl('mobile-cabina-tabs', 'DIV');
  registerEl('mobile-tab-teleprompter', 'BUTTON');
  registerEl('mobile-tab-console', 'BUTTON');
  registerEl('mobile-tab-all', 'BUTTON');
  registerEl('btn-mobile-studio-extras', 'BUTTON');
  registerEl('mobile-extras-label', 'SPAN');
  registerEl('mobile-studio-extras', 'DIV').classList.add('hidden');
  registerEl('mobile-quick-dock', 'DIV');
  registerEl('dock-btn-play', 'BUTTON');
  registerEl('dock-btn-sintonia', 'BUTTON');
  registerEl('dock-btn-sintonia-cierre', 'BUTTON');
  registerEl('dock-btn-duck', 'BUTTON');
  registerEl('dock-btn-rec', 'BUTTON');
  registerEl('dock-btn-stop', 'BUTTON');

  const docEl = createMockElement('html', 'HTML');
  const listeners: Record<string, Array<(e: unknown) => void>> = {};

  class MockAudio {
    src: string;
    volume = 1;
    paused = true;
    currentTime = 0;
    onplay: (() => void) | null = null;
    onpause: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
    }
    play() {
      this.paused = false;
      this.onplay?.();
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      this.onpause?.();
    }
  }

  const makeParam = (initial = 0) => ({
    value: initial,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    setTargetAtTime: () => {}
  });

  class MockAudioContext {
    sampleRate = 48000;
    currentTime = 0;
    state = 'running';
    destination = {};
    resume() { return Promise.resolve(); }
    createGain() {
      return { gain: makeParam(1), connect: () => {}, disconnect: () => {} };
    }
    createConvolver() {
      return { buffer: null, connect: () => {}, disconnect: () => {} };
    }
    createOscillator() {
      return { type: 'sine', frequency: makeParam(440), connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {} };
    }
    createBuffer(channels: number, length: number, sampleRate: number) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, getChannelData: (ch: number) => data[ch] };
    }
    createBufferSource() {
      return { buffer: null, loop: false, connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {} };
    }
    createBiquadFilter() {
      return { type: 'lowpass', frequency: makeParam(1000), Q: makeParam(1), gain: makeParam(0), connect: () => {}, disconnect: () => {} };
    }
    createMediaElementSource() {
      return { connect: () => {}, disconnect: () => {} };
    }
    createMediaStreamSource() {
      return { connect: () => {}, disconnect: () => {} };
    }
    createDelay() {
      return { delayTime: makeParam(0), connect: () => {}, disconnect: () => {} };
    }
    createWaveShaper() {
      return { curve: null, oversample: 'none', connect: () => {}, disconnect: () => {} };
    }
    createDynamicsCompressor() {
      return {
        threshold: makeParam(-24),
        knee: makeParam(30),
        ratio: makeParam(12),
        attack: makeParam(0.003),
        release: makeParam(0.25),
        connect: () => {},
        disconnect: () => {}
      };
    }
    createAnalyser() {
      return {
        fftSize: 256,
        frequencyBinCount: 128,
        getByteTimeDomainData: (arr: Uint8Array) => arr.fill(128),
        connect: () => {},
        disconnect: () => {}
      };
    }
    createMediaStreamDestination() {
      return { stream: {}, connect: () => {}, disconnect: () => {} };
    }
  }

  const fakeMicDevices = [
    { kind: 'audioinput', deviceId: 'mic-usb-1', label: 'Micrófono USB Locutor 1' },
    { kind: 'audioinput', deviceId: 'mic-usb-2', label: 'Micrófono USB Locutor 2' }
  ];
  const makeFakeStream = (devId: string, label: string) => {
    const track = {
      readyState: 'live',
      enabled: true,
      label,
      getSettings: () => ({ deviceId: devId }),
      stop: () => { track.readyState = 'ended'; }
    };
    return {
      getTracks: () => [track],
      getAudioTracks: () => [track]
    };
  };

  class MockMediaRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((ev: { data: unknown }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    pause() { this.state = 'paused'; }
    resume() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop?.(); }
  }

  const sandbox: Record<string, unknown> = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    Audio: MockAudio,
    AudioContext: MockAudioContext,
    MediaRecorder: MockMediaRecorder,
    Blob: class MockBlob {
      size = 128;
      type: string;
      constructor(parts: unknown[] = [], opts?: { type?: string }) {
        this.type = opts?.type || 'audio/webm';
        if (Array.isArray(parts) && parts[0] && (parts[0] as { byteLength?: number }).byteLength) {
          this.size = (parts[0] as { byteLength: number }).byteLength;
        }
      }
    },
    navigator: {
      mediaDevices: {
        enumerateDevices: async () => fakeMicDevices,
        getUserMedia: async (constraints: { audio?: { deviceId?: { exact?: string; ideal?: string } } }) => {
          const reqId = constraints?.audio?.deviceId?.exact || constraints?.audio?.deviceId?.ideal || 'mic-usb-1';
          const dev = fakeMicDevices.find(d => d.deviceId === reqId) || fakeMicDevices[0];
          return makeFakeStream(dev.deviceId, dev.label);
        },
        addEventListener: () => {}
      }
    },
    URL: {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => {}
    },
    localStorage: {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k)
    },
    document: {
      documentElement: docEl,
      activeElement: null,
      body: createMockElement('body', 'BODY'),
      getElementById: (id: string) => elements.get(id) ?? null,
      querySelectorAll: () => [],
      createElement: (tag: string) => createMockElement('tmp', tag.toUpperCase()),
      addEventListener: (evt: string, cb: (e: unknown) => void) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(cb);
      },
      execCommand: () => true
    },
    addEventListener: () => {},
    window: {}
  };
  sandbox.window = sandbox;

  const vmContext = vm.createContext(sandbox);
  vm.runInContext(scriptCode, vmContext);
  (sandbox.window as { onload: () => void }).onload();

  const getAudioSlots = () =>
    vm.runInContext('audioSlots', vmContext) as Record<
      number,
      { customName: string; url: string; volume: number; audio: { paused: boolean } | null }
    >;

  const getVmVar = <T>(expr: string) => vm.runInContext(expr, vmContext) as T;

  return { sandbox, storageMap, elements, docEl, listeners, getAudioSlots, getVmVar };
}

test('localStorage auto-saves script, DUA settings, and slot titles/URLs and restores on reload', () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    setTheme: (t: string) => void;
    toggleDyslexia: () => void;
    updateSlotCustomName: (id: number, name: string, norm?: boolean) => void;
    setupSlotAudio: (id: number, url: string, info: string, title: string, silent?: boolean, local?: boolean) => void;
    onScriptInput: (persist?: boolean) => void;
    onScriptTitleInput: () => void;
    updateSpeedLabel: (persist?: boolean) => void;
    updatePrompterFont: (persist?: boolean) => void;
  };

  s1.setTheme('high-contrast');
  s1.toggleDyslexia();
  first.elements.get('prompter-speed')!.value = '8';
  s1.updateSpeedLabel(true);
  first.elements.get('prompter-font')!.value = '44';
  s1.updatePrompterFont(true);
  first.elements.get('script-title')!.value = 'Programa Especial Primavera';
  s1.onScriptTitleInput();
  first.elements.get('script-editor')!.value = 'LOCUTOR 1: Hola Palenciana.';
  s1.onScriptInput(true);
  s1.updateSlotCustomName(2, 'Cajón 2 · Música Noticias', true);
  s1.setupSlotAudio(1, 'https://example.org/intro.mp3', 'URL: https://example.org/intro.mp3', 'intro');

  const persisted = Object.fromEntries(first.storageMap.entries());
  const second = loadIndexSandbox(persisted);

  assert.equal(second.docEl.getAttribute('data-theme'), 'high-contrast');
  assert.equal(second.docEl.getAttribute('data-dyslexia'), 'true');
  assert.equal(String(second.elements.get('prompter-speed')!.value), '8');
  assert.equal(String(second.elements.get('prompter-font')!.value), '44');
  assert.equal(second.elements.get('script-title')!.value, 'Programa Especial Primavera');
  assert.equal(second.elements.get('script-editor')!.value, 'LOCUTOR 1: Hola Palenciana.');

  const restoredSlots = second.getAudioSlots();
  assert.equal(restoredSlots[2].customName, 'Cajón 2 · Música Noticias');
  assert.equal(restoredSlots[1].url, 'https://example.org/intro.mp3');
});

test('keyboard shortcuts: Space toggles teleprompter and 1-6 trigger slots only outside text inputs', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    setupSlotAudio: (id: number, url: string, info: string, title: string) => void;
    handleGlobalKeydown: (e: unknown) => void;
  };

  s.setupSlotAudio(3, 'https://example.org/track3.mp3', 'URL: https://example.org/track3.mp3', 'track3');

  // Pressing Space while typing inside textarea should NOT toggle teleprompter
  let prevented = false;
  s.handleGlobalKeydown({
    code: 'Space',
    key: ' ',
    target: { tagName: 'TEXTAREA', type: '' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(prevented, false);
  assert.equal(ctx.elements.get('prompter-play-btn')!.innerHTML.includes('Iniciar'), true);

  // Pressing 3 while typing inside text input should NOT play slot 3
  s.handleGlobalKeydown({
    code: 'Digit3',
    key: '3',
    target: { tagName: 'INPUT', type: 'text' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(ctx.getAudioSlots()[3].audio!.paused, true);

  // Pressing Space outside text inputs SHOULD start and then pause teleprompter
  s.handleGlobalKeydown({
    code: 'Space',
    key: ' ',
    target: { tagName: 'BODY', type: '' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(prevented, true);
  assert.equal(ctx.elements.get('prompter-play-btn')!.innerHTML.includes('Pausar'), true);

  s.handleGlobalKeydown({
    code: 'Space',
    key: ' ',
    target: { tagName: 'BUTTON', type: 'button' },
    preventDefault: () => {}
  });
  assert.equal(ctx.elements.get('prompter-play-btn')!.innerHTML.includes('Iniciar'), true);

  // Pressing 3 outside text inputs SHOULD toggle play/pause on slot 3
  s.handleGlobalKeydown({
    code: 'Digit3',
    key: '3',
    target: { tagName: 'BODY', type: '' },
    preventDefault: () => {}
  });
  assert.equal(ctx.getAudioSlots()[3].audio!.paused, false);

  s.handleGlobalKeydown({
    code: 'Digit3',
    key: '3',
    target: { tagName: 'BODY', type: '' },
    preventDefault: () => {}
  });
  assert.equal(ctx.getAudioSlots()[3].audio!.paused, true);
});

test('JSON backup collectAppState & applyAppState validate and restore full program configuration', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    setTheme: (t: string) => void;
    setupSlotAudio: (id: number, url: string, info: string, title: string) => void;
    collectAppState: () => Record<string, unknown>;
    applyAppState: (data: unknown) => boolean;
    loadTemplate: (stage: string) => void;
  };

  s.setTheme('sepia');
  ctx.elements.get('script-title')!.value = 'Programa Graduación 6º';
  ctx.elements.get('script-editor')!.value = 'LOCUTOR 1: Bienvenidos a la graduación.';
  s.setupSlotAudio(5, 'https://example.org/cierre.mp3', 'URL: https://example.org/cierre.mp3', 'Cierre');
  const backup = JSON.parse(JSON.stringify(s.collectAppState()));

  // Overwrite current state
  s.setTheme('dark');
  s.loadTemplate('infantil');

  // Invalid JSON structure must return false cleanly
  assert.equal(s.applyAppState({ unrelated: true }), false);

  // Restore valid backup
  assert.equal(s.applyAppState(backup), true);
  assert.equal(ctx.docEl.getAttribute('data-theme'), 'sepia');
  assert.equal(ctx.elements.get('script-title')!.value, 'Programa Graduación 6º');
  assert.equal(ctx.elements.get('script-editor')!.value, 'LOCUTOR 1: Bienvenidos a la graduación.');
  assert.equal(ctx.getAudioSlots()[5].url, 'https://example.org/cierre.mp3');
});

test('SFX search bar filters all 24 sounds by name or category in real time and respects search input shortcut guard', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    getFilteredSfx: (query: string, category: string) => Array<{ id: string; name: string; cat: string }>;
    filterCabinaSfx: () => void;
    clearSfxSearch: () => void;
    handleGlobalKeydown: (e: unknown) => void;
  };

  assert.equal(s.getFilteredSfx('', 'all').length, 24);
  // Accent-insensitive search by name
  const laserMatches = s.getFilteredSfx('laser', 'all');
  assert.equal(laserMatches.length, 1);
  assert.equal(laserMatches[0].id, 'laser');

  // Search by category label ('espacial' matches all 5 sci-fi sounds, 'bucle' matches all 6 loop sounds)
  assert.equal(s.getFilteredSfx('espacial', 'all').length, 5);
  assert.equal(s.getFilteredSfx('bucle', 'all').length, 6);

  // Filter + empty state check
  ctx.elements.get('sfx-search')!.value = 'noticias';
  s.filterCabinaSfx();
  assert.equal(ctx.elements.get('sfx-count-label')!.textContent, '6 de 24');
  assert.equal(ctx.elements.get('cabina-sfx-grid')!.innerHTML.includes('Cambio Noticias'), true);

  ctx.elements.get('sfx-search')!.value = 'inexistente-xyz';
  s.filterCabinaSfx();
  assert.equal(ctx.elements.get('sfx-count-label')!.textContent, '0 de 24');
  assert.equal(ctx.elements.get('cabina-sfx-grid')!.innerHTML.includes('Mostrar los 24 efectos'), true);

  s.clearSfxSearch();
  assert.equal(ctx.elements.get('sfx-count-label')!.textContent, '24 de 24');

  // Pressing Space inside search input must NOT trigger teleprompter
  let prevented = false;
  s.handleGlobalKeydown({
    code: 'Space',
    key: ' ',
    target: { tagName: 'INPUT', type: 'search' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(prevented, false);
});

test('Stop selected SFX button appears when an effect plays and stops active one-shots or loops immediately', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    playSound: (type: string) => void;
    toggleLoop: (id: string) => void;
    stopSelectedSfx: () => void;
    stopAllSounds: () => void;
  };

  const stopBtn = ctx.elements.get('btn-stop-selected-sfx')!;
  const stopName = ctx.elements.get('selected-sfx-name')!;
  assert.equal(stopBtn.classList.contains('hidden'), true);

  // Play a one-shot SFX -> stop button appears with effect name
  s.playSound('applause');
  assert.equal(stopBtn.classList.contains('hidden'), false);
  assert.equal(stopName.textContent, 'Aplausos');
  assert.equal(Object.keys(ctx.getVmVar<Record<string, unknown>>('activeOneShots')).includes('applause'), true);

  // Clicking Stop Selected SFX clears activeOneShots and hides button
  s.stopSelectedSfx();
  assert.equal(stopBtn.classList.contains('hidden'), true);
  assert.equal(Object.keys(ctx.getVmVar<Record<string, unknown>>('activeOneShots')).length, 0);

  // Play an ambient loop -> stop button appears and stops loop
  s.toggleLoop('rain');
  assert.equal(stopBtn.classList.contains('hidden'), false);
  assert.equal(stopName.textContent, 'Lluvia Suave');
  s.stopSelectedSfx();
  assert.equal(stopBtn.classList.contains('hidden'), true);
  assert.equal(Object.keys(ctx.getVmVar<Record<string, unknown>>('activeLoops')).length, 0);
});

test('Sintonía Oficial button plays Palenciana_en_el_aire_7eae12fb.mp3 and WAV encoder outputs valid RIFF header', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    toggleSintoniaOficial: () => void;
    stopAllSounds: () => void;
    createWavArrayBufferFromSamples: (channels: Float32Array[], sampleRate: number) => ArrayBuffer;
  };

  s.toggleSintoniaOficial();
  const sintonia = ctx.getVmVar<{ src: string; paused: boolean }>('sintoniaAudio');
  assert.equal(sintonia.src, '/assets/aistudio/Palenciana_en_el_aire_7eae12fb.mp3');
  assert.equal(sintonia.paused, false);
  assert.equal(ctx.elements.get('sintonia-btn-label')!.textContent, 'Parar Sintonía de Inicio');

  s.toggleSintoniaOficial();
  assert.equal(sintonia.paused, true);
  assert.equal(ctx.elements.get('sintonia-btn-label')!.textContent, 'Sintonía de Inicio');

  // Verify WAV encoder builds a valid 16-bit PCM RIFF/WAVE header
  const ch0 = new Float32Array([0, 0.5, -0.5, 1]);
  const wavBuf = s.createWavArrayBufferFromSamples([ch0], 48000);
  const bytes = new Uint8Array(wavBuf);
  assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), 'RIFF');
  assert.equal(String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]), 'WAVE');
  assert.equal(wavBuf.byteLength, 44 + ch0.length * 2);
});

test('Multi-microphone capture arms all connected microphones on toggle and routes them into program recording', async () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    onIncludeMicToggle: () => Promise<void>;
    startProgramRecording: () => Promise<void>;
    stopProgramRecording: () => void;
  };

  // Toggle "Incluir Micrófono" ON -> immediately captures both detected microphones
  ctx.elements.get('rec-include-mic')!.checked = true;
  await s.onIncludeMicToggle();

  const entries = ctx.getVmVar<Array<{ deviceId: string; label: string }>>('micEntries');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].deviceId, 'mic-usb-1');
  assert.equal(entries[1].deviceId, 'mic-usb-2');
  assert.equal(ctx.elements.get('mic-armed-badge')!.textContent, '🟢 2 micros activos');
  assert.equal(ctx.getVmVar<{ gain: { value: number } }>('micMuteGateNode').gain.value, 1.0);

  // Start recording with mic included -> reuses armed mics & starts MediaRecorder
  await s.startProgramRecording();
  assert.equal(ctx.getVmVar<{ state: string }>('mediaRecorder').state, 'recording');
  s.stopProgramRecording();

  // Uncheck "Incluir Micrófono" -> mutes gate and stops mic tracks cleanly
  ctx.elements.get('rec-include-mic')!.checked = false;
  await s.onIncludeMicToggle();
  assert.equal(ctx.getVmVar<Array<unknown>>('micEntries').length, 0);
  assert.equal(ctx.elements.get('mic-armed-badge')!.textContent, 'Solo cabina');
});

test('Microphone input volume slider, all 7 voice effects, monitor toggle, and localStorage persistence work reliably', async () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    armMicrophones: (toast?: boolean) => Promise<boolean>;
    updateMicInputVolume: (val: number, persist?: boolean) => void;
    setVoiceEffect: (id: string, persist?: boolean) => void;
    toggleMicMonitor: () => void;
    cleanupMicCapture: () => void;
  };

  await s1.armMicrophones(false);

  // Modulate microphone input volume (165%)
  s1.updateMicInputVolume(1.65, true);
  assert.equal(first.elements.get('mic-gain-val')!.textContent, '165%');
  assert.equal(String(first.elements.get('mic-gain-slider')!.value), '1.65');

  // Switch across all 7 real-time voice effects without errors
  const effects = ['natural', 'radio-fm', 'megafono', 'eco', 'robot', 'ardilla', 'grave'];
  for (const fx of effects) {
    s1.setVoiceEffect(fx, true);
    assert.equal(first.getVmVar<string>('currentVoiceEffect'), fx);
    assert.equal(first.elements.get('voice-effect-select')!.value, fx);
  }

  // Toggle headphone monitor ON/OFF safely
  s1.toggleMicMonitor();
  assert.equal(first.getVmVar<boolean>('isMicMonitorOn'), true);
  assert.equal(first.elements.get('btn-mic-monitor')!.textContent, '🎧 Monitor: ON');
  s1.toggleMicMonitor();
  assert.equal(first.getVmVar<boolean>('isMicMonitorOn'), false);

  s1.cleanupMicCapture();

  // Reload from persisted localStorage and verify micGain & voiceEffect restored
  const persisted = Object.fromEntries(first.storageMap.entries());
  const second = loadIndexSandbox(persisted);
  assert.equal(second.elements.get('mic-gain-val')!.textContent, '165%');
  assert.equal(second.elements.get('voice-effect-select')!.value, 'grave');
});

test('Auto-ducking and manual ducking lower musicDuckBus and persist autoDuck preference', () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    getAudioContext: () => unknown;
    engageVoiceAutoDuck: () => void;
    toggleAutoDucking: (persist?: boolean) => void;
    toggleManualDucking: () => void;
  };

  s1.getAudioContext();
  assert.equal(first.getVmVar<boolean>('isAutoDuckEnabled'), true);

  // Voice activity engages auto-ducking
  s1.engageVoiceAutoDuck();
  assert.equal(first.getVmVar<boolean>('isVoiceDuckActive'), true);

  // Disabling auto-duck clears voice ducking and persists OFF
  s1.toggleAutoDucking(true);
  assert.equal(first.getVmVar<boolean>('isAutoDuckEnabled'), false);
  assert.equal(first.getVmVar<boolean>('isVoiceDuckActive'), false);
  assert.equal(first.elements.get('btn-auto-duck')!.textContent, '🔉 Auto-Atenuar: OFF');

  // Manual ducking toggles independently
  s1.toggleManualDucking();
  assert.equal(first.getVmVar<boolean>('isManualDuckActive'), true);
  assert.equal(first.elements.get('manual-duck-label')!.textContent.includes('22%'), true);
  s1.toggleManualDucking();
  assert.equal(first.getVmVar<boolean>('isManualDuckActive'), false);

  // Reload preserves autoDuck = false
  const second = loadIndexSandbox(Object.fromEntries(first.storageMap.entries()));
  assert.equal(second.getVmVar<boolean>('isAutoDuckEnabled'), false);
  assert.equal(second.elements.get('btn-auto-duck')!.textContent, '🔉 Auto-Atenuar: OFF');
});

test('Interactive script cue tags, speaker focus filter, and Modo Alumno work and persist cleanly', () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    renderTeleprompter: () => void;
    resolveScriptCueTag: (cueText: string) => boolean;
    setSpeakerFocus: (speaker: string) => void;
    toggleSimpleMode: () => void;
    setupSlotAudio: (id: number, url: string, info: string, title: string) => void;
  };

  first.elements.get('script-editor')!.value = [
    '[SINTONÍA OFICIAL RADIO AD-GEMELLAS]',
    'LOCUTOR 1: Buenos días.',
    'LOCUTORA 2: Bienvenidos.',
    '[EFECTO: APLAUSOS]',
    '[CAJÓN 2]'
  ].join('\n');
  s1.renderTeleprompter();

  const boxHtml = first.elements.get('teleprompter-box')!.innerHTML;
  assert.equal(boxHtml.includes('triggerScriptCueTag(this.dataset.cue)'), true);
  assert.equal(boxHtml.includes('data-cue="EFECTO: APLAUSOS"'), true);

  // Speaker focus highlights chosen speaker and dims the other
  const speakerOptions = first.elements.get('speaker-focus-select')!.options!;
  assert.equal(speakerOptions.some(o => o.value === 'LOCUTOR 1:'), true);
  assert.equal(speakerOptions.some(o => o.value === 'LOCUTORA 2:'), true);
  s1.setSpeakerFocus('LOCUTOR 1:');
  const focusedHtml = first.elements.get('teleprompter-box')!.innerHTML;
  assert.equal(focusedHtml.includes('ring-2 ring-amber-400/70'), true);
  assert.equal(focusedHtml.includes('opacity-35'), true);

  // Resolve Sintonía, SFX, and Slot cue tags directly
  assert.equal(s1.resolveScriptCueTag('SINTONÍA OFICIAL RADIO AD-GEMELLAS'), true);
  assert.equal(first.getVmVar<{ paused: boolean }>('sintoniaAudio').paused, false);
  assert.equal(s1.resolveScriptCueTag('EFECTO: APLAUSOS'), true);
  assert.equal(Object.keys(first.getVmVar<Record<string, unknown>>('activeOneShots')).includes('applause'), true);
  s1.setupSlotAudio(2, 'https://example.org/jingle.mp3', 'URL', 'Jingle');
  assert.equal(s1.resolveScriptCueTag('CAJÓN 2'), true);
  assert.equal(first.getAudioSlots()[2].audio!.paused, false);

  // Modo Alumno toggles data-simple-mode and persists across reloads
  s1.toggleSimpleMode();
  assert.equal(first.docEl.getAttribute('data-simple-mode'), 'true');
  assert.equal(first.elements.get('simple-mode-state')!.textContent, 'ON');

  const second = loadIndexSandbox(Object.fromEntries(first.storageMap.entries()));
  assert.equal(second.docEl.getAttribute('data-simple-mode'), 'true');
  assert.equal(second.elements.get('simple-mode-state')!.textContent, 'ON');
});

test('Extended keyboard shortcuts (S, D, G, Escape, ArrowDown/Up) and quick mic check behave safely', async () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    handleGlobalKeydown: (e: unknown) => void;
    runQuickMicCheck: (durationMs?: number) => Promise<void>;
    stopAllSounds: () => void;
  };

  // Press 's' -> starts Sintonía Oficial
  s.handleGlobalKeydown({ key: 's', code: 'KeyS', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<{ paused: boolean }>('sintoniaAudio').paused, false);

  // Press 'd' -> engages manual ducking
  s.handleGlobalKeydown({ key: 'd', code: 'KeyD', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<boolean>('isManualDuckActive'), true);

  // Press 'g' -> starts program recording, press 'g' again -> stops
  s.handleGlobalKeydown({ key: 'g', code: 'KeyG', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  // Allow async startProgramRecording microtasks to settle
  await new Promise(r => setTimeout(r, 30));
  assert.equal(ctx.getVmVar<{ state: string }>('mediaRecorder').state, 'recording');
  s.handleGlobalKeydown({ key: 'g', code: 'KeyG', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<{ state: string }>('mediaRecorder').state, 'inactive');

  // Press 'Escape' -> stops Sintonía Oficial
  s.handleGlobalKeydown({ key: 'Escape', code: 'Escape', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<{ paused: boolean }>('sintoniaAudio').paused, true);

  // Step teleprompter lines via ArrowDown / ArrowUp using mock line children
  const box = ctx.elements.get('teleprompter-box')!;
  const line0 = createMockElement('l0', 'P');
  line0.offsetTop = 40;
  const line1 = createMockElement('l1', 'P');
  line1.offsetTop = 220;
  box.appendChild(line0);
  box.appendChild(line1);
  s.handleGlobalKeydown({ key: 'ArrowDown', code: 'ArrowDown', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<number>('currentCueLineIndex'), 0);
  s.handleGlobalKeydown({ key: 'ArrowDown', code: 'ArrowDown', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<number>('currentCueLineIndex'), 1);
  s.handleGlobalKeydown({ key: 'ArrowUp', code: 'ArrowUp', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  assert.equal(ctx.getVmVar<number>('currentCueLineIndex'), 0);

  // Quick mic check completes cleanly and re-enables button
  await s.runQuickMicCheck(60);
  assert.equal(ctx.elements.get('btn-mic-check')!.disabled, false);
  assert.equal(ctx.getVmVar<boolean>('isQuickMicTesting'), false);
});

test('Reverb voice effect reveals room/depth controls, applies presets (small-room, auditorium, cathedral), updates audio graph, and persists', async () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    armMicrophones: (toast?: boolean) => Promise<boolean>;
    setVoiceEffect: (id: string, persist?: boolean) => void;
    applyReverbPreset: (presetKey: string) => void;
    updateReverbRoomSize: (val: number | string, persist?: boolean, immediate?: boolean) => void;
    updateReverbDepth: (val: number | string, persist?: boolean) => void;
    cleanupMicCapture: () => void;
  };

  const panel = first.elements.get('reverb-controls-panel')!;
  assert.equal(panel.classList.contains('hidden'), true);

  await s1.armMicrophones(false);

  // Select 'reverb' -> panel shows and Web Audio reverb nodes are created
  s1.setVoiceEffect('reverb', true);
  assert.equal(panel.classList.contains('hidden'), false);
  assert.equal(first.getVmVar<string>('currentVoiceEffect'), 'reverb');
  assert.notEqual(first.getVmVar<unknown>('activeReverbWetGain'), null);

  // Apply 'cathedral' preset -> updates room size (4.8s) and depth (72%)
  s1.applyReverbPreset('cathedral');
  assert.equal(first.getVmVar<number>('reverbRoomSize'), 4.8);
  assert.equal(first.getVmVar<number>('reverbDepth'), 0.72);
  assert.equal(first.elements.get('reverb-room-val')!.textContent, '4.8s');
  assert.equal(first.elements.get('reverb-depth-val')!.textContent, '72%');
  assert.equal(first.elements.get('btn-rev-preset-cathedral')!.className?.includes('theme-accent-bg') ?? true, true);

  // Apply 'small-room' preset -> updates room size (0.7s) and depth (28%)
  s1.applyReverbPreset('small-room');
  assert.equal(first.getVmVar<number>('reverbRoomSize'), 0.7);
  assert.equal(first.getVmVar<number>('reverbDepth'), 0.28);
  assert.equal(first.elements.get('reverb-room-val')!.textContent, '0.7s');
  assert.equal(first.elements.get('reverb-depth-val')!.textContent, '28%');

  // Custom slider values clamp cleanly and persist
  s1.updateReverbRoomSize(3.6, true, true);
  s1.updateReverbDepth(0.85, true);
  assert.equal(first.elements.get('reverb-room-val')!.textContent, '3.6s');
  assert.equal(first.elements.get('reverb-depth-val')!.textContent, '85%');

  // Switching back to natural hides reverb controls panel
  s1.setVoiceEffect('natural', false);
  assert.equal(panel.classList.contains('hidden'), true);

  // Switch back to reverb before reload check
  s1.setVoiceEffect('reverb', true);
  s1.cleanupMicCapture();

  // Reload from localStorage -> restores reverb effect, roomSize 3.6s, depth 85%, and visible panel
  const second = loadIndexSandbox(Object.fromEntries(first.storageMap.entries()));
  assert.equal(second.getVmVar<string>('currentVoiceEffect'), 'reverb');
  assert.equal(second.getVmVar<number>('reverbRoomSize'), 3.6);
  assert.equal(second.getVmVar<number>('reverbDepth'), 0.85);
  assert.equal(second.elements.get('reverb-room-val')!.textContent, '3.6s');
  assert.equal(second.elements.get('reverb-depth-val')!.textContent, '85%');
  assert.equal(second.elements.get('reverb-controls-panel')!.classList.contains('hidden'), false);
});

test('Studio autoconfiguration toggles between Direct In-App Recording and Mixer+Audacity cleanly and persists', async () => {
  const first = loadIndexSandbox();
  const s1 = first.sandbox as {
    armMicrophones: (toast?: boolean) => Promise<boolean>;
    setStudioMode: (mode: string, opts?: Record<string, unknown>) => Promise<boolean>;
    startProgramRecording: () => Promise<void>;
    stopProgramRecording: () => void;
    handleGlobalKeydown: (e: unknown) => void;
  };

  assert.equal(first.getVmVar<string>('currentStudioMode'), 'direct');
  assert.equal(first.docEl.getAttribute('data-studio-mode'), 'direct');

  // Arm mic and start recording -> switching to mixer-audacity must be blocked while recording
  await s1.armMicrophones(false);
  await s1.startProgramRecording();
  const blocked = await s1.setStudioMode('mixer-audacity');
  assert.equal(blocked, false);
  assert.equal(first.getVmVar<string>('currentStudioMode'), 'direct');
  s1.stopProgramRecording();

  // Switch to Mixer + Audacity when stopped -> cleans up mic, turns off auto-duck/monitor, reveals banner
  const switched = await s1.setStudioMode('mixer-audacity');
  assert.equal(switched, true);
  assert.equal(first.getVmVar<string>('currentStudioMode'), 'mixer-audacity');
  assert.equal(first.docEl.getAttribute('data-studio-mode'), 'mixer-audacity');
  assert.equal(first.elements.get('rec-include-mic')!.checked, false);
  assert.equal(first.getVmVar<Array<unknown>>('micEntries').length, 0);
  assert.equal(first.getVmVar<boolean>('isAutoDuckEnabled'), false);
  assert.equal(first.getVmVar<boolean>('isMicMonitorOn'), false);
  assert.equal(first.elements.get('direct-recorder-row')!.classList.contains('hidden'), true);
  assert.equal(first.elements.get('mic-controls-row')!.classList.contains('hidden'), true);
  assert.equal(first.elements.get('mixer-audacity-banner')!.classList.contains('hidden'), false);

  // Pressing 'g' in mixer-audacity mode should NOT start browser MediaRecorder
  s1.handleGlobalKeydown({ key: 'g', code: 'KeyG', target: { tagName: 'BODY', type: '' }, preventDefault: () => {} });
  await new Promise(r => setTimeout(r, 20));
  assert.equal(first.getVmVar<{ state: string }>('mediaRecorder').state, 'inactive');

  // Reload restores mixer-audacity mode cleanly
  const second = loadIndexSandbox(Object.fromEntries(first.storageMap.entries()));
  assert.equal(second.getVmVar<string>('currentStudioMode'), 'mixer-audacity');
  assert.equal(second.docEl.getAttribute('data-studio-mode'), 'mixer-audacity');
  assert.equal(second.elements.get('mixer-audacity-banner')!.classList.contains('hidden'), false);

  // Switch back to Direct Recording -> re-enables mic checkbox, auto-duck, and direct recorder rows
  const s2 = second.sandbox as {
    setStudioMode: (mode: string, opts?: Record<string, unknown>) => Promise<boolean>;
  };
  await s2.setStudioMode('direct');
  assert.equal(second.getVmVar<string>('currentStudioMode'), 'direct');
  assert.equal(second.elements.get('rec-include-mic')!.checked, true);
  assert.equal(second.getVmVar<boolean>('isAutoDuckEnabled'), true);
  assert.equal(second.elements.get('direct-recorder-row')!.classList.contains('hidden'), false);
  assert.equal(second.elements.get('mixer-audacity-banner')!.classList.contains('hidden'), true);
});

test('Studio clean mic constraints, duplicate/loopback mic deduplication, 400% preamp range, and lossless PCM WAV recording work cleanly', async () => {
  const first = loadIndexSandbox();
  const capturedConstraints: Array<Record<string, unknown>> = [];

  const nav = (first.sandbox as {
    navigator: {
      mediaDevices: {
        enumerateDevices: () => Promise<Array<{ kind: string; deviceId: string; label: string }>>;
        getUserMedia: (c: { audio: Record<string, unknown> }) => Promise<unknown>;
      };
    };
  }).navigator;

  const duplicateDevices = [
    { kind: 'audioinput', deviceId: 'default', label: 'Predeterminado - Micrófono USB Aula' },
    { kind: 'audioinput', deviceId: 'usb-a', label: 'Micrófono USB Aula' },
    { kind: 'audioinput', deviceId: 'stereo-mix', label: 'Mezcla estéreo (Realtek)' },
    { kind: 'audioinput', deviceId: 'usb-b', label: 'Micrófono USB Mesa 2' }
  ];

  nav.mediaDevices.enumerateDevices = async () => duplicateDevices;
  nav.mediaDevices.getUserMedia = async (c: { audio: Record<string, unknown> }) => {
    capturedConstraints.push(c.audio);
    const reqId = (c.audio.deviceId as { exact?: string; ideal?: string } | undefined)?.exact
      || (c.audio.deviceId as { exact?: string; ideal?: string } | undefined)?.ideal
      || 'default';
    const dev = duplicateDevices.find(d => d.deviceId === reqId) || duplicateDevices[0];
    const track = {
      readyState: 'live',
      enabled: true,
      label: dev.label,
      getSettings: () => ({ deviceId: dev.deviceId === 'default' ? 'usb-a' : dev.deviceId }),
      stop: () => { track.readyState = 'ended'; }
    };
    return { getTracks: () => [track], getAudioTracks: () => [track] };
  };

  const s1 = first.sandbox as {
    armMicrophones: (toast?: boolean) => Promise<boolean>;
    toggleMicCleanMode: () => Promise<void>;
    updateMicInputVolume: (val: number, persist?: boolean) => void;
    cleanupMicCapture: () => void;
    startProgramRecording: () => Promise<void>;
    stopProgramRecording: () => void;
  };

  await s1.armMicrophones(false);

  // Clean Studio mode disables WebRTC AEC/NS distortion & enables AGC
  assert.equal(capturedConstraints[0].echoCancellation, false);
  assert.equal(capturedConstraints[0].noiseSuppression, false);
  assert.equal(capturedConstraints[0].autoGainControl, true);

  // Deduplicates "Predeterminado - Micrófono USB Aula" vs "Micrófono USB Aula" and skips "Mezcla estéreo"
  const entries = first.getVmVar<Array<{ deviceId: string; label: string }>>('micEntries');
  assert.equal(entries.length, 2);
  assert.equal(entries.some(e => e.label.includes('Mezcla estéreo')), false);

  // Verify vocal preamp + makeup gain + extended 400% gain ceiling
  assert.equal(first.getVmVar<{ gain: { value: number } }>('micPreampGain').gain.value, 2.2);
  assert.equal(first.getVmVar<{ gain: { value: number } }>('micMakeupGain').gain.value, 1.85);
  s1.updateMicInputVolume(3.25, true);
  assert.equal(first.elements.get('mic-gain-val')!.textContent, '325%');

  // Toggle to Anti-Eco mode -> re-arms with echoCancellation & noiseSuppression enabled and persists
  await s1.toggleMicCleanMode();
  assert.equal(first.getVmVar<boolean>('isMicCleanMode'), false);
  assert.equal(first.elements.get('btn-mic-clean-mode')!.textContent, '🔇 Captura: Anti-Eco');
  const lastConstraint = capturedConstraints[capturedConstraints.length - 1];
  assert.equal(lastConstraint.echoCancellation, true);
  assert.equal(lastConstraint.noiseSuppression, true);

  // Simulate lossless PCM capture via ScriptProcessor fallback and verify WAV Blob output
  type AudioProcHandler = (ev: { inputBuffer: { numberOfChannels: number; getChannelData: (c: number) => Float32Array } }) => void;
  const capturedProcs: AudioProcHandler[] = [];
  (first.getVmVar<{ createScriptProcessor?: unknown }>('audioCtx')).createScriptProcessor = () => {
    let fn: AudioProcHandler | null = null;
    return {
      connect: () => {},
      disconnect: () => {},
      set onaudioprocess(handler: AudioProcHandler | null) {
        fn = handler;
        if (handler) capturedProcs.push(handler);
      },
      get onaudioprocess() { return fn; }
    };
  };

  await s1.startProgramRecording();
  assert.equal(capturedProcs.length > 0, true);
  capturedProcs[0]({
    inputBuffer: {
      numberOfChannels: 2,
      getChannelData: () => new Float32Array([0.25, -0.25, 0.5, -0.5])
    }
  });
  s1.stopProgramRecording();
  assert.equal(first.getVmVar<string>('recordedMimeType'), 'audio/wav');
  assert.equal(first.getVmVar<{ type: string }>('recordedBlob').type, 'audio/wav');

  s1.cleanupMicCapture();

  // Reload preserves Anti-Eco capture mode & 325% mic gain
  const second = loadIndexSandbox(Object.fromEntries(first.storageMap.entries()));
  assert.equal(second.getVmVar<boolean>('isMicCleanMode'), false);
  assert.equal(second.elements.get('btn-mic-clean-mode')!.textContent, '🔇 Captura: Anti-Eco');
  assert.equal(second.elements.get('mic-gain-val')!.textContent, '325%');
});

test('Sintonia Oficial Web Audio decoded buffer playback and stop work cleanly without MediaElementSource silence', async () => {
  const ctx = loadIndexSandbox();
  let startedCount = 0;
  let stoppedCount = 0;

  const sb = ctx.sandbox as {
    getAudioContext: () => {
      state: string;
      decodeAudioData?: (buf: ArrayBuffer) => Promise<{ duration: number; numberOfChannels: number }>;
      createBufferSource: () => unknown;
    };
    fetch?: (url: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>;
    toggleSintoniaOficial: () => void;
    stopSintoniaOficial: () => void;
    isSintoniaPlaying: () => boolean;
  };

  sb.fetch = async (url: string) => ({
    ok: url === '/assets/aistudio/Palenciana_en_el_aire_7eae12fb.mp3',
    arrayBuffer: async () => new ArrayBuffer(4096)
  });

  const audioCtx = sb.getAudioContext();
  audioCtx.decodeAudioData = async () => ({ duration: 179.8, numberOfChannels: 2 });
  const origCreateBufferSource = audioCtx.createBufferSource.bind(audioCtx);
  audioCtx.createBufferSource = () => {
    const src = origCreateBufferSource() as {
      buffer: unknown;
      connect: () => void;
      disconnect: () => void;
      start: () => void;
      stop: () => void;
      onended: (() => void) | null;
    };
    src.start = () => { startedCount++; };
    src.stop = () => { stoppedCount++; };
    return src;
  };

  sb.toggleSintoniaOficial();
  await new Promise(r => setTimeout(r, 25));

  assert.equal(startedCount, 1);
  assert.equal(sb.isSintoniaPlaying(), true);
  assert.equal(ctx.elements.get('sintonia-btn-label')!.textContent, 'Parar Sintonía de Inicio');
  assert.equal(ctx.elements.get('dock-btn-sintonia')!.innerHTML.includes('Parar'), true);

  sb.toggleSintoniaOficial();
  assert.equal(stoppedCount, 1);
  assert.equal(sb.isSintoniaPlaying(), false);
  assert.equal(ctx.elements.get('sintonia-btn-label')!.textContent, 'Sintonía de Inicio');
});

test('Mobile and tablet Cabina tab switcher, studio accordion, and sticky dock buttons sync state cleanly', () => {
  const ctx = loadIndexSandbox();
  const s = ctx.sandbox as {
    innerWidth?: number;
    onload: () => void;
    setMobileCabinaTab: (tab: string) => void;
    toggleMobileStudioExtras: (force?: boolean) => void;
    togglePrompterScroll: () => void;
    stopPrompterScroll: () => void;
    toggleManualDucking: () => void;
  };

  // Smartphone width defaults to teleprompter tab
  s.innerWidth = 390;
  s.onload();
  assert.equal(ctx.elements.get('view-cabina')!.getAttribute('data-mobile-cabina-tab'), 'teleprompter');
  assert.equal(ctx.elements.get('mobile-tab-teleprompter')!.getAttribute('aria-selected'), 'true');

  // Switch to console and all tabs cleanly
  s.setMobileCabinaTab('console');
  assert.equal(ctx.elements.get('view-cabina')!.getAttribute('data-mobile-cabina-tab'), 'console');
  assert.equal(ctx.elements.get('mobile-tab-console')!.getAttribute('aria-selected'), 'true');
  assert.equal(ctx.elements.get('mobile-tab-teleprompter')!.getAttribute('aria-selected'), 'false');

  s.setMobileCabinaTab('all');
  assert.equal(ctx.elements.get('view-cabina')!.getAttribute('data-mobile-cabina-tab'), 'all');

  // Toggle mobile studio extras accordion
  assert.equal(ctx.elements.get('mobile-studio-extras')!.classList.contains('hidden'), true);
  s.toggleMobileStudioExtras();
  assert.equal(ctx.elements.get('mobile-studio-extras')!.classList.contains('hidden'), false);
  assert.equal(ctx.elements.get('mobile-extras-label')!.textContent, 'Ocultar Ajustes');
  s.toggleMobileStudioExtras();
  assert.equal(ctx.elements.get('mobile-studio-extras')!.classList.contains('hidden'), true);

  // Sync sticky mobile dock buttons with teleprompter scroll and ducking
  s.togglePrompterScroll();
  assert.equal(ctx.elements.get('dock-btn-play')!.innerHTML.includes('Pausar'), true);
  s.stopPrompterScroll();
  assert.equal(ctx.elements.get('dock-btn-play')!.innerHTML.includes('Leer'), true);

  s.toggleManualDucking();
  assert.equal(ctx.elements.get('dock-btn-duck')!.getAttribute('aria-pressed'), 'true');
  s.toggleManualDucking();
  assert.equal(ctx.elements.get('dock-btn-duck')!.getAttribute('aria-pressed'), 'false');
});

test('Sintonía de Cierre plays Lights_Down_on_the_Dial_8c00f301.mp3, alternates cleanly with Sintonía de Inicio, and responds to cue tags and Stop All', async () => {
  const ctx = loadIndexSandbox();
  let startedCount = 0;

  const sb = ctx.sandbox as {
    getAudioContext: () => {
      state: string;
      decodeAudioData?: (buf: ArrayBuffer) => Promise<{ duration: number; numberOfChannels: number }>;
      createBufferSource: () => unknown;
    };
    fetch?: (url: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>;
    toggleSintoniaOficial: () => void;
    toggleSintoniaCierre: () => void;
    stopAllSounds: () => void;
    isSintoniaPlaying: () => boolean;
    isSintoniaCierrePlaying: () => boolean;
    resolveScriptCueTag: (cueText: string) => boolean;
  };

  sb.fetch = async (url: string) => ({
    ok: url === '/assets/aistudio/Palenciana_en_el_aire_7eae12fb.mp3' ||
        url === '/assets/aistudio/Lights_Down_on_the_Dial_8c00f301.mp3',
    arrayBuffer: async () => new ArrayBuffer(4096)
  });

  const audioCtx = sb.getAudioContext();
  audioCtx.decodeAudioData = async () => ({ duration: 150.0, numberOfChannels: 2 });
  const origCreateBufferSource = audioCtx.createBufferSource.bind(audioCtx);
  audioCtx.createBufferSource = () => {
    const src = origCreateBufferSource() as {
      buffer: unknown;
      connect: () => void;
      disconnect: () => void;
      start: () => void;
      stop: () => void;
      onended: (() => void) | null;
    };
    src.start = () => { startedCount++; };
    return src;
  };

  // Start Sintonía de Inicio first, then switch to Sintonía de Cierre
  sb.toggleSintoniaOficial();
  await new Promise(r => setTimeout(r, 25));
  assert.equal(sb.isSintoniaPlaying(), true);

  sb.toggleSintoniaCierre();
  await new Promise(r => setTimeout(r, 25));
  assert.equal(startedCount, 2);
  assert.equal(sb.isSintoniaPlaying(), false);
  assert.equal(sb.isSintoniaCierrePlaying(), true);
  assert.equal(ctx.elements.get('sintonia-cierre-btn-label')!.textContent, 'Parar Sintonía de Cierre');
  assert.equal(ctx.elements.get('dock-btn-sintonia-cierre')!.innerHTML.includes('Parar'), true);

  // Stop all stops Cierre cleanly
  sb.stopAllSounds();
  assert.equal(sb.isSintoniaCierrePlaying(), false);
  assert.equal(ctx.elements.get('sintonia-cierre-btn-label')!.textContent, 'Sintonía de Cierre');
  assert.equal(ctx.elements.get('dock-btn-sintonia-cierre')!.innerHTML.includes('Cierre'), true);

  // Script cue tag [SINTONÍA DE CIERRE] triggers Cierre
  assert.equal(sb.resolveScriptCueTag('SINTONÍA DE CIERRE'), true);
  await new Promise(r => setTimeout(r, 25));
  assert.equal(sb.isSintoniaCierrePlaying(), true);

  // Fallback audio element URL check
  const fallbackCtx = loadIndexSandbox();
  const fsb = fallbackCtx.sandbox as { toggleSintoniaCierre: () => void };
  fsb.toggleSintoniaCierre();
  const cierreAudio = fallbackCtx.getVmVar<{ src: string; paused: boolean }>('sintoniaCierreAudio');
  assert.equal(cierreAudio.src, '/assets/aistudio/Lights_Down_on_the_Dial_8c00f301.mp3');
  assert.equal(cierreAudio.paused, false);
});




