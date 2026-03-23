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
  {
    key: "hydration",
    ask: "Hydration? (0=dehydrated, 1=partly, 2=well hydrated)",
    parse: (text) => {
      const n = parseInt(text, 10);
      return n >= 0 && n <= 2 ? n : null;
    },
    retry: "Please enter a number 0-2",
  },
];

export function createMessageHandler(database, logger) {
  const log = logger.child({ module: "message-handler" });
  const sessions = new Map();

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
      const id = database.recordHeadache(userId, text);
      log.info({ userId, entryId: id }, "Entry recorded");
      sessions.set(userId, { entryId: id, step: 0 });
      return `Recorded ✓\n\n${QUESTIONS[0].ask}`;
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

    session.step++;

    if (session.step >= QUESTIONS.length) {
      sessions.delete(userId);
      return "All done ✓";
    }

    return QUESTIONS[session.step].ask;
  }

  return handleMessage;
}
