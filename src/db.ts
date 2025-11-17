import { SUBMISSION_LIFETIME_HOURS } from "./config";
import Submission                    from "./Submission";

/**
 * We use in-memory database as our needs for this project are simple and do not
 * require a full database solution.
 */
const db = {
    sessions: new Map<string, Submission>()
};

function clearOldSubmissions() {
    const now = Date.now();
    const lifetimeMs = SUBMISSION_LIFETIME_HOURS * 60 * 60 * 1000;

    for (const [sessionId, submission] of db.sessions) {
        if (now - submission.createdAt.getTime() > lifetimeMs) {
            db.sessions.delete(sessionId);
        }
    }
}

// Clear old submissions every hour
setInterval(clearOldSubmissions, 60 * 60 * 1000).unref();

export default db;
