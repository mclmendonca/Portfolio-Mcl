(() => {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });

  const mode = (canvas.dataset.animate || 'on').toLowerCase();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // === VELOCIDADE ===
  let speed = parseFloat(canvas.dataset.speed || '1');
  if (!isFinite(speed) || speed <= 0) speed = 1;

 // ===== Pool de caracteres "todas as línguas" (amostra ampla e leve) =====
function buildCharArray() {
  const arr = [];

  // helper para adicionar faixas de codepoints (com amostragem/limite)
  const addRange = (start, end, step = 1, cap = Infinity) => {
    let count = 0;
    for (let cp = start; cp <= end; cp += step) {
      // pula área de surrogates
      if (cp >= 0xD800 && cp <= 0xDFFF) continue;
      arr.push(String.fromCodePoint(cp));
      if (++count >= cap) break;
    }
  };

  // Dígitos + Latim
  addRange(0x0030, 0x0039);            // 0-9
  addRange(0x0041, 0x005A);            // A-Z
  addRange(0x0061, 0x007A);            // a-z

  // Grego, Cirílico, Armênio, Georgiano
  addRange(0x0370, 0x03FF, 1, 120);    // Greek (amostra)
  addRange(0x0400, 0x04FF, 1, 120);    // Cyrillic (amostra)
  addRange(0x0531, 0x0556);            // Armenian uppercase
  addRange(0x0561, 0x0587);            // Armenian lowercase
  addRange(0x10A0, 0x10FF, 2, 80);     // Georgian (amostra)

  // Hebraico, Árabe
  // (amostra leve; evita exagero em pontos de combinação)
  addRange(0x05D0, 0x05EA);            // Hebrew letters א-ת
  addRange(0x0620, 0x063A);            // Arabic basic
  addRange(0x0641, 0x064A);            // Arabic fā’–yā’

  // Índicas: Devanágari, Bengali, Tâmil
  addRange(0x0904, 0x0939);            // Devanagari letters
  addRange(0x0985, 0x09B9);            // Bengali letters
  addRange(0x0B85, 0x0BB9);            // Tamil letters

  // Tailandês
  addRange(0x0E01, 0x0E5B);            // Thai

  // Japonês/Chinês: Hiragana, Katakana, Bopomofo, alguns Kanji
  addRange(0x3041, 0x3096);            // Hiragana
  addRange(0x30A1, 0x30FA);            // Katakana
  addRange(0x3105, 0x312F);            // Bopomofo (Zhuyin)

  // Hangul (sílabas) — amostra para não ficar enorme
  addRange(0xAC00, 0xD7A3, 64, 300);   // a cada 64 codepoints

  // Um punhado de Kanji/Kyōiku bem comuns
  '日月火水木金土人人間天中大小上下山川口田目耳手足見言心学気年時本会社出入先国東京愛楽電車雨風海空食飲'
    .split('').forEach(c => arr.push(c));

  // Remove duplicados e embaralha
  const uniq = Array.from(new Set(arr));
  for (let i = uniq.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
  }
  return uniq;
}

const charArray = buildCharArray();


  let w, h, columns, drops, fontSize, dpr, animId = null, lastTs = 0;
  const bgColor = '#000000';
  const headColor = '#c8ffdf';
  const tailColor = '#00ff9c';

  // ❗ Em vez de trailAlpha fixo por frame, usamos uma taxa por segundo:
  // 1.6 é um ponto de partida agradável; aumente para "evaporar" a trilha mais rápido.
  const TRAIL_FADE_PER_SEC_BASE = 1.6;

  function sizeCanvas() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fontSize = Math.max(14, Math.floor(w / 80));
    columns = Math.ceil(w / fontSize);
    drops = new Array(columns).fill(0).map(() => Math.random() * (h / fontSize));
    ctx.font = `${fontSize}px monospace`;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
  }

  // drawFrame AGORA recebe timestamp para calcular dt
  function drawFrame(ts) {
    const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000); // segundos; limita p/ evitar saltos
    lastTs = ts;

    // Opcional: compensa levemente quando estiver mais lento,
    // evitando “escurecer” demais a tela em speed baixo.
    const trailPerSec = TRAIL_FADE_PER_SEC_BASE * (0.7 + 0.3 * speed);

    // Alpha deste frame calculado por decaimento exponencial contínuo:
    const alphaFrame = 1 - Math.exp(-trailPerSec * dt);
    ctx.fillStyle = `rgba(0,0,0,${alphaFrame})`;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < columns; i++) {
      const char = charArray[(Math.random() * charArray.length) | 0];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      const grad = ctx.createLinearGradient(x, y - fontSize * 2, x, y + fontSize);
      grad.addColorStop(0, headColor);
      grad.addColorStop(1, tailColor);
      ctx.fillStyle = grad;
      ctx.fillText(char, x, y);

      if (y > h && Math.random() > 0.975) {
        drops[i] = 0;
      } else {
        drops[i] += speed; // mantém SEU estilo de chuva, só com multiplicador
      }
    }

    animId = requestAnimationFrame(drawFrame);
  }

  function drawStaticScatter() {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < columns; i++) {
      for (let r = 0; r < 12; r++) {
        const char = charArray[(Math.random() * charArray.length) | 0];
        const x = i * fontSize;
        const y = (Math.random() * h) | 0;
        ctx.fillStyle = r === 0 ? headColor : tailColor;
        ctx.fillText(char, x, y);
      }
    }
  }

  function start() {
    stop();
    lastTs = 0;
    animId = requestAnimationFrame(drawFrame);
  }

  function stop() {
    if (animId != null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  sizeCanvas();

  const shouldAnimate = mode === 'on' || (mode === 'auto' && !prefersReduced.matches);
  if (shouldAnimate) start(); else drawStaticScatter();

  document.addEventListener('visibilitychange', () => {
    if (!shouldAnimate) return;
    if (document.hidden) stop(); else start();
  });

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const wasAnimating = animId != null;
      sizeCanvas();
      if (wasAnimating) start(); else if (!shouldAnimate) drawStaticScatter();
    }, 120);
  });

  window.MatrixRain = {
    setSpeed: (v) => {
      const s = Math.max(0.05, Math.min(5, Number(v) || 1));
      speed = s;
      canvas.dataset.speed = String(s);
    },
    start: () => { start(); },
    stop: () => { stop(); drawStaticScatter(); },
    isAnimating: () => animId != null
  };
})();
