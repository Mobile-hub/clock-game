// How a time or a duration is said in Spanish (Spain). Pure and covered by table tests.
// Works in the browser (window.RL.spoken) and in node (module.exports) for tests.
(function (root) {
  const T = typeof module !== 'undefined' && module.exports ? require('./timemath.js') : root.RL.timemath;

  // Index 0 is twelve o'clock on a 12-hour dial. Hours are feminine: "la una", "las dos".
  const HOURS = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'];
  const NUMBERS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
    'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés',
    'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];

  // 1–30 minutes after "y" or "menos": cuarto, media, multiples of five bare, anything else with the word "minutos".
  function minuteWords(n) {
    if (n === 15) return 'cuarto';
    if (n === 30) return 'media';
    if (n % 5 === 0) return NUMBERS[n];
    return `${NUMBERS[n]} ${n === 1 ? 'minuto' : 'minutos'}`;
  }

  // "las tres menos veinte": what the dial shows, with no part of the day. From :31 on it counts towards the next hour.
  function clockPhrase(t) {
    const h = T.hours(t);
    const m = T.minutes(t);
    const hour = (m > 30 ? h + 1 : h) % 12;
    const article = hour === 1 ? 'la' : 'las';
    const tail = m === 0 ? ' en punto' : m <= 30 ? ` y ${minuteWords(m)}` : ` menos ${minuteWords(60 - m)}`;
    return `${article} ${HOURS[hour]}${tail}`;
  }

  // Depends on the real time, not on the hour that is named: 12:45 is "la una menos cuarto del mediodía".
  function dayPart(t) {
    const h = T.hours(t);
    if (h >= 1 && h < 6) return 'de la madrugada';
    if (h >= 6 && h < 12) return 'de la mañana';
    if (h === 12) return 'del mediodía';
    if (h >= 13 && h < 21) return 'de la tarde';
    return 'de la noche';
  }

  function fullPhrase(t) {
    return `${clockPhrase(t)} ${dayPart(t)}`;
  }

  // Whole sentence for the sign: "Es la una menos cuarto del mediodía".
  function say(t) {
    const phrase = fullPhrase(t);
    return `${phrase.startsWith('la ') ? 'Es' : 'Son'} ${phrase}`;
  }

  function digitDuration(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    const hourText = h === 1 ? '1 hora' : `${h} horas`;
    const minuteText = m === 1 ? '1 minuto' : `${m} minutos`;
    if (h && m) return `${hourText} y ${minuteText}`;
    return h ? hourText : minuteText;
  }

  // "1 hora y 30 minutos"; with friendly, the everyday words where they exist: "una hora y media", "tres cuartos de hora".
  function duration(total, friendly) {
    if (friendly) {
      if (total === 15) return 'un cuarto de hora';
      if (total === 30) return 'media hora';
      if (total === 45) return 'tres cuartos de hora';
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (h >= 1 && h < 12 && (m === 0 || m === 15 || m === 30)) {
        const base = `${HOURS[h]} ${h === 1 ? 'hora' : 'horas'}`;
        return m === 0 ? base : `${base} y ${m === 15 ? 'cuarto' : 'media'}`;
      }
    }
    return digitDuration(total);
  }

  const api = { clockPhrase, dayPart, fullPhrase, say, duration };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).spoken = api;
})(typeof window !== 'undefined' ? window : globalThis);
