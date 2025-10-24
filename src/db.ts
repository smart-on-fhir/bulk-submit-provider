import Submission from "./Submission";

/**
 * We use in-memory database as our needs for this project are simple and do not
 * require a full database solution.
 */
const db = {
    sessions: new Map<string, Submission>()
};

export default db;
