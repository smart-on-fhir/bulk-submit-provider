import { Router, Request, Response } from 'express';
import path                          from 'path';
import Submission                    from './Submission';
import db                            from './db';
import { getErrorMessage }           from './utils';
import { BASE_URL }                  from './config';
import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync
} from 'fs';


const router = Router();

// artificial delay for dev purposes
if (process.env.NODE_ENV !== 'production') {
    router.use((req, res, next) => {
        setTimeout(() => next(), 1000);
    });
}

// Submissions -----------------------------------------------------------------

// Get all Submissions
router.get('/api/sessions', (req: Request, res: Response) => {
    const sessions = Array.from(db.sessions.values());
    res.json(sessions);
});

// Create new Submission
router.post('/api/sessions', (req: Request, res: Response) => {
    const { destinationBaseUrl, name, submitter } = req.body;
    if (!destinationBaseUrl) {
        return res.status(400).json({ error: 'Missing destinationBaseUrl' });
    }
    const session = new Submission({ destinationBaseUrl, name, submitter }).save();
    res.status(201).json(session);
});

// Update Submission by ID
router.put('/api/sessions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { destinationBaseUrl, submitter, name } = req.body;
    if (!destinationBaseUrl) {
        return res.status(400).json({ error: 'Missing destinationBaseUrl' });
    }
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    session.destinationBaseUrl = destinationBaseUrl;
    session.submitter = submitter;
    session.name = name;
    session.save();
    res.json(session);
});

// Get Submission by ID
router.get('/api/sessions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(session);
});

// Delete Submission by ID
router.delete('/api/sessions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    db.sessions.delete(id);
    res.status(204).send();
});

// Complete session
router.post('/api/sessions/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    try {
        await session.complete();
    } catch (error) {
        console.error(error);
    } finally {
        session.save();
        res.json(session);
    }
});

// Manifests -------------------------------------------------------------------

// Add manifest
router.post('/api/sessions/:id/manifests', (req: Request, res: Response) => {
    const { id } = req.params;
    const { manifestUrl, outputFormat, FHIRBaseUrl } = req.body;
    if (!manifestUrl || !FHIRBaseUrl) {
        return res.status(400).json({ error: 'Missing manifestUrl or FHIRBaseUrl' });
    }
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    session.addJob(manifestUrl, FHIRBaseUrl);
    session.save();
    res.json(session);
});

// Update manifest
router.put('/api/sessions/:id/manifests/:index', (req: Request, res: Response) => {
    const { id, index } = req.params;
    
    const {
        manifestUrl,
        outputFormat,
        FHIRBaseUrl
    } = req.body;
    // if (!outputFormat) {
    //     return res.status(400).json({ error: 'Missing outputFormat' });
    // }
    const session: Submission | undefined = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    const manifest = session.manifests[+index];
    if (!manifest) {
        return res.status(404).json({ error: 'Manifest not found' });
    }
    if (manifestUrl) manifest.manifestUrl = manifestUrl;
    if (FHIRBaseUrl) manifest.FHIRBaseUrl = FHIRBaseUrl;
    // if (outputFormat) job.outputFormat = outputFormat;
    session.save();
    res.json(session);
});

// Remove manifest
router.delete('/api/sessions/:id/manifests/:index', (req: Request, res: Response) => {
    const { id, index } = req.params;
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    session.removeManifestAt(+index);
    session.save();
    res.json(session);
});

// Replace manifest
router.post('/api/sessions/:id/manifests/:index/replace', async (req: Request, res: Response) => {
    const { id, index } = req.params;
    const { newManifestUrl } = req.body;

    if (!newManifestUrl) {
        return res.status(400).json({ error: 'Missing newManifestUrl parameter' });
    }

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    try {
        await session.replaceManifestAt(+index, newManifestUrl);
        // session.save();
        // res.json(session);
    } catch (error) {
        console.error(error);
    } finally {
        session.save();
        res.json(session);
    }
});

// Abort manifest
router.post('/api/sessions/:id/manifests/:index/abort', async (req: Request, res: Response) => {
    const { id, index } = req.params;

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    try {
        await session.abortManifestAt(+index);
        // session.save();
        // res.json(session);
    } catch (error) {
        console.error(error);
    } finally {
        session.save();
        res.json(session);
    }
});

// Submit a manifest
router.post('/api/sessions/:id/submit-manifest', async (req: Request, res: Response) => {
    const { id } = req.params;

    const { manifestUrl } = req.body;

    if (!manifestUrl) {
        return res.status(400).json({ error: 'Missing manifestUrl parameter' });
    }
    
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    
    try {
        await session.submitManifest(manifestUrl);
        session.save();
        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: (error as Error).message });
    }
});

// Hosting endpoints -----------------------------------------------------------

// Return an empty manifest (used to abort manifests)
router.get('/api/manifests/empty', (req: Request, res: Response) => {    
    res.json({
        transactionTime: new Date().toISOString(),
        requiresAccessToken: false,
        output: []
    });
});

// Export manifests
router.get('/api/manifests/:id', (req: Request, res: Response) => {

    // The id is the name of a subfolder in /exports
    const { id } = req.params;

    // Verify the folder exists
    const exportPath = path.join(__dirname, '..', 'exports', id);
    if (!existsSync(exportPath) || !statSync(exportPath).isDirectory()) {
        return res.status(404).json({ error: 'Manifest not found' });
    }

    // check if manifest file exists
    const manifestPath = path.join(exportPath, 'manifest.json');
    if (existsSync(manifestPath)) {
        const manifestData = readFileSync(manifestPath, 'utf-8');
        try {
            const manifest = JSON.parse(manifestData);
            delete manifest.request;
            manifest.transactionTime = new Date().toISOString();
            manifest.requiresAccessToken = false;
            // manifest.outputOrganizedBy = "";
            // manifest.deleted = [];
            manifest.output.forEach((file: any) => {

                // Convert relative URLs to absolute for this folder
                if (!file.url.match(/^https?:\/\//)) {
                    file.url = BASE_URL + `/exports/${id}/${file.url.split('/').pop()}`;
                }
                // file.url = new URL(`/exports/${id}/${basename(file.url)}`, BASE_URL).toString();
                // delete file.destination;
            })
            return res.json(manifest);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse existing manifest.json: ' + getErrorMessage(err) });
        }
    }

    // Read the folder and collect the list of ndjson files
    const files = readdirSync(exportPath).filter(file => file.endsWith('.ndjson'));
    if (files.length === 0) {
        return res.status(404).json({ error: 'No bulk files found' });
    }

    // Build the manifest
    const baseUrl = `${req.protocol}://${req.get('host')}/exports/${id}`;
    const manifest = {
        transactionTime: new Date().toISOString(),
        // request: `${baseUrl}/`,
        requiresAccessToken: false,
        // outputOrganizedBy: "",
        // deleted: [],
        // error: [],
        output: files.map(file => ({
            type : file.match(/^(\d+\.)?(.*?)\.ndjson$/)?.[2] || 'Resource',
            url  : `${baseUrl}/${file}`,
            count: countLinesInFile(path.join(exportPath, file)) // could count lines in file for more accuracy
        }))
    };

    return res.json(manifest);
});

function countLinesInFile(filePath: string): number {
    const data = readFileSync(filePath, 'utf-8');
    return data.split('\n').length;
}

export default router;
