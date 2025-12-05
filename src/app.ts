import express, { Request, Response, NextFunction } from 'express';
import cors             from 'cors';
import path             from 'path';
import router           from './routes';
import { BASIC_SECRET } from './config';


/**
 * Optional Basic Auth middleware for /exports.
 * If Authorization header is present, validate it against BASIC_SECRET from config.
 * If not present, allow access (optional auth).
 */
function optionalBasicAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    // If no auth header, allow access (auth is optional)
    if (!authHeader) {
        return next();
    }

    // If auth header is present, validate it
    if (!authHeader.toLowerCase().startsWith('basic ')) {
        return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const secret = authHeader.slice(6);
    
    if (secret === BASIC_SECRET) {
        return next();
    }

    res.status(401).json({ error: 'Invalid credentials' });
}

export default function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use('/', router);

    // Serve frontend build and files in /exports
    const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));

    // Serve static files in /exports (with optional Basic Auth)
    const exportsDir = path.resolve(__dirname, '..', 'exports');
    app.use('/exports', optionalBasicAuth, express.static(exportsDir, {
        setHeaders(res, path, stat) {
            if (stat.isFile() && path.endsWith('.ndjson')) {
                res.set('Content-Type', 'application/ndjson');
            }
        }
    }));

    // SPA fallback — serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      
        // let internal routes pass through
        if (
            req.path.startsWith('/api') ||
            req.path.startsWith('/status') ||
            req.path.startsWith('/auth') ||
            req.path.startsWith('/exports')
        ) return next();

        // let React handle all other routes
        res.sendFile(path.join(frontendDist, 'index.html'), err => {
            if (err) next();
        });
    });

    return app;
}
