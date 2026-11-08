// The school day, read from data/schedule.json so it can be edited without touching the rules of the game. Pure.
// Validation messages are in Spanish because whoever edits the file sees them on screen.
// Works in the browser (window.RL.schedule) and in node (module.exports) for tests.
(function (root) {
  const T = typeof module !== 'undefined' && module.exports ? require('./timemath.js') : root.RL.timemath;

  const SCENES = ['dark', 'empty', 'arrival', 'lesson', 'recess', 'lunch'];

  // The exercises read these moments by id, so they must exist. Any other event is optional.
  const REQUIRED_IDS = ['morningLessons', 'recess', 'afterRecess', 'lunch', 'afternoonLessons', 'schoolOut'];

  function validateSun(sun, errors) {
    if (!sun || typeof sun !== 'object') {
      errors.push('Falta el bloque "sun" con la salida y la puesta de sol.');
      return;
    }
    const sunrise = T.parse(sun.sunrise);
    const sunset = T.parse(sun.sunset);
    const twilight = sun.twilightMinutes;
    if (Number.isNaN(sunrise)) errors.push('La hora de "sunrise" debe tener el formato HH:MM.');
    if (Number.isNaN(sunset)) errors.push('La hora de "sunset" debe tener el formato HH:MM.');
    if (!Number.isInteger(twilight) || twilight < 0 || twilight > 120) errors.push('"twilightMinutes" debe ser un número entero entre 0 y 120.');
    if (Number.isNaN(sunrise) || Number.isNaN(sunset) || !Number.isInteger(twilight)) return;
    if (sunrise >= sunset) errors.push('El sol debe salir antes de ponerse.');
    if (sunrise - twilight < 0 || sunset + twilight >= T.DAY) errors.push('El amanecer y el anochecer deben caer dentro del mismo día.');
  }

  function validateEvents(events, errors) {
    if (!Array.isArray(events) || events.length === 0) {
      errors.push('La lista "events" está vacía o no existe.');
      return;
    }
    const seen = new Set();
    let previous = -1;
    events.forEach((event, i) => {
      const where = `Evento ${i + 1}`;
      if (!event || typeof event !== 'object') {
        errors.push(`${where}: no es un objeto válido.`);
        return;
      }
      if (typeof event.id !== 'string' || !event.id) errors.push(`${where}: falta el "id".`);
      else if (seen.has(event.id)) errors.push(`${where}: el id "${event.id}" está repetido.`);
      else seen.add(event.id);
      const minutes = T.parse(event.time);
      if (Number.isNaN(minutes)) {
        errors.push(`${where}: la hora "${event.time}" debe tener el formato HH:MM.`);
      } else {
        if (i === 0 && minutes !== 0) errors.push('El primer evento debe empezar a las 00:00.');
        if (minutes <= previous) errors.push(`${where}: las horas deben ir en orden creciente.`);
        previous = minutes;
      }
      if (!SCENES.includes(event.scene)) errors.push(`${where}: la escena "${event.scene}" no existe (usa: ${SCENES.join(', ')}).`);
      if (typeof event.text !== 'string' || event.text.length < 1 || event.text.length > 60) errors.push(`${where}: el texto debe tener entre 1 y 60 caracteres.`);
    });
    for (const id of REQUIRED_IDS) {
      if (!seen.has(id)) errors.push(`Falta el evento obligatorio "${id}".`);
    }
  }

  // Returns every problem found, so a single reload shows all of them.
  function validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') return ['El archivo no contiene un horario.'];
    if (data.version !== 1) errors.push('"version" debe ser 1.');
    validateSun(data.sun, errors);
    validateEvents(data.events, errors);
    return errors;
  }

  // Runtime form: times as minutes. Call only with data that passed validate().
  function build(data) {
    return {
      sun: { sunrise: T.parse(data.sun.sunrise), sunset: T.parse(data.sun.sunset), twilight: data.sun.twilightMinutes },
      events: data.events.map((e) => ({ id: e.id, start: T.parse(e.time), scene: e.scene, text: e.text })),
    };
  }

  // The event in force at minute t: the last one that has already started.
  function at(schedule, t) {
    let current = schedule.events[0];
    for (const event of schedule.events) {
      if (event.start <= t) current = event;
      else break;
    }
    return current;
  }

  function byId(schedule, id) {
    return schedule.events.find((e) => e.id === id);
  }

  function startOf(schedule, id) {
    return byId(schedule, id).start;
  }

  // Minutes until the next event starts (the last event lasts until midnight).
  function durationOf(schedule, id) {
    const i = schedule.events.findIndex((e) => e.id === id);
    const next = schedule.events[i + 1];
    return (next ? next.start : T.DAY) - schedule.events[i].start;
  }

  const api = { SCENES, REQUIRED_IDS, validate, build, at, byId, startOf, durationOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).schedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
