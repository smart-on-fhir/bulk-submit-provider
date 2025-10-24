import LogEntry from "./LogEntry";


export class Log {
    private entries: LogEntry[] = [];

    add(message: string, {
        request,
        response,
        level,
        details
    }: {
        level   ?: App.JobLogEntryLevel,
        request ?: App.JobRequest,
        response?: App.JobResponse,
        details ?: string
    } = {}) {
        const newEntry = new LogEntry({
            message,
            level,
            details,
            request,
            response
        });
        const lastEntry = this.last();
        if (lastEntry && lastEntry.equals(newEntry)) {
            newEntry.count = lastEntry.count + 1;
            this.entries[this.entries.length - 1] = newEntry;
        } else {
            this.entries.push(newEntry);
        }
    }

    last(): LogEntry | null {
        if (this.entries.length === 0) {
            return null;
        }
        return this.entries[this.entries.length - 1];
    }

    getEntries() {
        return this.entries;
    }

    toJSON() {
        return this.entries.map(entry => entry.toJSON());
    }
}
