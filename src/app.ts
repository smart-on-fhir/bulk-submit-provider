import express from 'express';
import cors    from 'cors';
import path    from 'path';
import router  from './routes';


export default function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use('/', router);

    // Serve frontend build and files in /exports
    const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));

    // Serve static files in /exports
    const exportsDir = path.resolve(__dirname, '..', 'exports');
    app.use('/exports', express.static(exportsDir));
    
    // SPA fallback — serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      
        // let internal routes pass through
        if (
            req.path.startsWith('/api') ||
            req.path.startsWith('/status') ||
            req.path.startsWith('/exports')
        ) return next();

        // let React handle all other routes
        res.sendFile(path.join(frontendDist, 'index.html'), err => {
            if (err) next();
        });
    });

    return app;
}
