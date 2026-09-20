const QUESTIONS = [
  {
    key: "has_headache",
    ask: "Headache today? (yes/no)",
    parse: (text) => {
      const t = text.toLowerCase();
      if (["yes", "y", "ja", "1"].includes(t)) return 1;
      if (["no", "n", "nej", "0"].includes(t)) return 0;
      return null;
    },
    retry: "Please answer yes or no",
  },
  {
    key: "sensitivity",
    when: (answers) => answers.has_headache === 1,
    ask: 'Any sensitivity or other symptoms? (light, sound, smells, nausea, pulsating, one-sided… or "no")',
    parse: (text) => text,
  },
  {
    key: "neck_stiffness",
    ask: "Neck stiffness? (0=none, 1=light, 2=moderate, 3=severe)",
    parse: (text) => {
      const n = parseInt(text, 10);
      return n >= 0 && n <= 3 ? n : null;
    },
    retry: "Please enter a number 0-3",
  },
  {
    key: "screen_hours",
    ask: "Hours at desk/screen today?",
    parse: (text) => {
      const n = parseFloat(text.replace(",", "."));
      return n >= 0 && n <= 24 ? n : null;
    },
    retry: "Please enter a number (e.g. 6 or 4.5)",
  },
];

function nextStep(step, answers) {
  while (step < QUESTIONS.length && QUESTIONS[step].when?.(answers) === false) {
    step++;
  }
  return step;
}

function localDay(date, timezone) {
  return date.toLocaleDateString("sv-SE", { timeZone: timezone });
}

export function createMessageHandler(database, logger, timezone = "UTC") {
  const log = logger.child({ module: "message-handler" });
  const sessions = new Map();

  function startSession(userId, entryId) {
    sessions.set(userId, { entryId, step: 0, answers: {} });
    return QUESTIONS[0].ask;
  }

  function handleMessage(message) {
    const userId = message.from?.id;
    if (!userId) {
      log.warn({ message }, "Message missing user ID");
      return "Could not identify user";
    }

    const text = message.text?.trim();
    if (!text) {
      log.warn({ userId }, "Message missing text");
      return "Please describe how you're feeling today";
    }

    if (text.toLowerCase() === "/skip" || text.toLowerCase() === "skip") {
      if (sessions.has(userId)) {
        sessions.delete(userId);
        return "Done ✓";
      }
      return "Nothing to skip";
    }

    const session = sessions.get(userId);

    if (!session) {
      const latest = database.findLatestEntry(userId);

      if (text.toLowerCase() === "/new" || text.toLowerCase() === "new") {
        if (!latest?.parent_id) {
          return "Nothing to convert";
        }
        database.promoteToEntry(latest.id);
        log.info({ userId, entryId: latest.id }, "Follow-up promoted to entry");
        return startSession(userId, latest.id);
      }

      const now = message.date ? new Date(message.date * 1000) : new Date();
      const loggedToday =
        latest &&
        localDay(new Date(`${latest.created_at.replace(" ", "T")}Z`), timezone) ===
          localDay(now, timezone);

      if (loggedToday) {
        const parentId = latest.parent_id ?? latest.id;
        const id = database.recordHeadache(userId, text, parentId);
        log.info({ userId, entryId: id, parentId }, "Follow-up recorded");
        return 'Added to today\'s entry ✓\n(type "new" to answer the questions for this one instead)';
      }

      const id = database.recordHeadache(userId, text);
      log.info({ userId, entryId: id }, "Entry recorded");
      return `Recorded ✓\n\n${startSession(userId, id)}`;
    }

    const question = QUESTIONS[session.step];
    const value = question.parse(text);

    if (value === null) {
      return `${question.retry}\n(or type "skip" to skip remaining questions)`;
    }

    database.updateEntry(session.entryId, { [question.key]: value });
    log.info(
      { userId, entryId: session.entryId, [question.key]: value },
      "Entry updated"
    );

    session.answers[question.key] = value;
    session.step = nextStep(session.step + 1, session.answers);

    if (session.step >= QUESTIONS.length) {
      sessions.delete(userId);
      return "All done ✓";
    }

    return QUESTIONS[session.step].ask;
  }

  return handleMessage;
}
