export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms} ms`;

    let seconds = Math.floor(ms / 1000);
    const units = [
        { label: 'd'  , value: 86400 },
        { label: 'hr' , value: 3600 },
        { label: 'min', value: 60 },
        { label: 'sec', value: 1 }
    ];
    
    const parts: string[] = [];
    for (const unit of units) {
        const count = Math.floor(seconds / unit.value);
        if (count > 0) {
            parts.push(`${count} ${unit.label}`);
            seconds %= unit.value;
        }
    }
    
    if (parts.length === 0) return '0 seconds';
    if (parts.length === 1) return parts[0];
    
    return `${parts.join(', ')}`;

    // const last = parts.pop();
    // return `${parts.join(', ')} and ${last}`;
}

export function getErrorMessage(err: any, depth = 0, maxDepth = 5, visited = new Set()): string {
    if (depth > maxDepth || !err || visited.has(err)) return '';
    visited.add(err);

    let message = '';

    // Extract the main error message
    if (typeof err === 'string') {
        message = err;
    } else if (err instanceof Error) {
        message = err.message || err.name;
    } else if (typeof err === 'object' && err !== null) {
        message = err.message || err.toString?.() || 'Unknown error';
    } else {
        message = 'Unknown error';
    }

    // Handle AggregateError (e.g., from fetch failures)
    if (err instanceof AggregateError && 'errors' in err && Array.isArray((err as any).errors)) {
        const subMessages = (err as any).errors
            .map((subErr: any) => getErrorMessage(subErr, depth + 1, maxDepth, visited))
            .filter((msg: string) => msg)
            .join('; ');
        if (subMessages) {
            message += ` (errors: ${subMessages})`;
        }
    }

    // Handle nested cause
    if (err.cause) {
        const causeMessage = getErrorMessage(err.cause, depth + 1, maxDepth, visited);
        if (causeMessage) {
            message += ` (caused by: ${causeMessage})`;
        }
    }

    return message;
}

export function headerToObject(headers: Headers | [string, string][] | Record<string, string>): Record<string, string> {
    const headersObj: Record<string, string> = {};
    const headersInit = headers;
    if (headersInit instanceof Headers) {
        headersInit.forEach((value, key) => {
            headersObj[key] = value;
        });
    } else if (Array.isArray(headersInit)) {
        headersInit.forEach(([key, value]) => {
            headersObj[key] = value;
        });
    } else if (headersInit && typeof headersInit === 'object') {
        Object.entries(headersInit).forEach(([key, value]) => {
            headersObj[key] = value as string;
        });
    }
    return headersObj;
}

export async function sendRequest(url: string | URL | Request, options?: RequestInit) {

    let out: {
        res: Response | null
        request: {
            method : string,
            url    : string,
            headers: Record<string, string>,
            body   : any
        } | null,
        response: {
            headers   : Record<string, string>,
            body      : any,
            status    : number,
            statusText: string,
            // text      : string
        } | null
        error: string | null
    } = {
        res     : null,
        request : null,
        response: null,
        error   : null
    };

    try {
        out.res = await fetch(url, options)

        out.request = {
            method : options?.method || 'GET',
            url    : url.toString(),
            headers: headerToObject(options?.headers || {}),
            body   : options?.body ? JSON.parse(options.body.toString()) : null
        };

        out.response = {
            status    : out.res.status,
            statusText: out.res.statusText,
            headers   : headerToObject(out.res.headers),
            body      : null,
            // text      : await out.res.text()
        };

        const txt = await out.res.text()
        try {
            out.response.body = JSON.parse(txt);
        } catch {
            out.response.body = txt;
        }

        if (!out.res.ok) {
            out.error  = out.res.status + " " + out.res.statusText;
        } else {
            out.error  = null;
        }

    } catch (err) {
        console.error(err);
        out.error = getErrorMessage(err);
    }
    
    return out;
}
