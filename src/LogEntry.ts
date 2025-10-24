export default class LogEntry {
    timestamp: string;
    message: string;
    level: App.JobLogEntryLevel;
    details?: string;
    request?: App.JobRequest;
    response?: App.JobResponse;
    count: number = 1;

    constructor({
        message,
        level = 'info',
        details,
        request,
        response
    }: {
        message: string
        level?: App.JobLogEntryLevel
        details?: string
        request?: App.JobRequest
        response?: App.JobResponse
    }) {
        this.timestamp = new Date().toISOString();
        this.message = message;
        this.level = level;
        this.details = details;
        this.request = request;
        this.response = response;
    }

    /**
     * Convert to JSON representation. Controls what gets sent to the client.
     */
    toJSON(): App.JobLogEntryJson {
        return {
            timestamp: this.timestamp,
            message  : this.message,
            level    : this.level,
            details  : this.details,
            request  : this.request,
            response : this.response,
            count    : this.count
        };
    }

    /**
     * This is used to determine if two log entries are the same for the purpose
     * of collapsing repeated entries. Some differences (like timestamp) are
     * intentionally ignored. The purpose is to determine if a new log entry can
     * replace the previous one and increment its count.
     */
    equals(other: LogEntry) {
        if (this.message !== other.message) {
            return false;
        }
        if (this.level !== other.level) {
            return false;
        }
        if (this.details !== other.details) {
            return false;
        }
        if (this.request?.method !== other.request?.method) {
            return false;
        }
        if (this.request?.url !== other.request?.url) {
            return false;
        }
        if (this.request?.body !== other.request?.body) {
            return false;
        }
        if (this.response?.status !== other.response?.status) {
            return false;
        }
        if (this.response?.body !== other.response?.body) {
            return false;
        }
        return true;
    }
}
