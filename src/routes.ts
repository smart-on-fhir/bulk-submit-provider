import { Router, Request, Response }            from 'express';
import cookieParser                             from 'cookie-parser';
import path                                     from 'path';
import Submission                               from './Submission';
import db                                       from './db';
import { getErrorMessage, staticRequestLogger } from './utils';
import { createAuthenticator }                  from './authenticator';
import {
    BASE_URL,
    PRIVATE_KEY,
    PUBLIC_KEY,
    THROTTLE
} from './config';
import {
    existsSync,
    readFileSync,
    statSync
} from 'fs';


const router = Router();
router.use(cookieParser());

// artificial delay for dev purposes
router.use((req, res, next) => {
    if (THROTTLE > 0) {
        setTimeout(() => next(), THROTTLE);
    } else {
        next();
    }
});

router.use((req, res, next) => {
    const sessionId = req.cookies?.['bulkSubmitProviderSessionId'];
    if (sessionId) {
        res.locals.sessionId = sessionId;
    }
    next();
});

// Submissions -----------------------------------------------------------------

// Get all Submissions
router.get('/api/sessions', (req: Request, res: Response) => {
    const sessions = Array.from(db.sessions.values());
    res.json(sessions.filter(session => {
        const sessionId = res.locals.sessionId;
        if (!sessionId) return true;
        return !session.owner_id || session.owner_id === sessionId;
    }));
});

// Create new Submission
router.post('/api/sessions', (req: Request, res: Response) => {
    try {
        const { destinationBaseUrl, name, submitter, id, clientId, authType, tokenUrl } = req.body;
        if (!destinationBaseUrl) {
            return res.status(400).json({ error: 'Missing destinationBaseUrl' });
        }
        const session = new Submission({
            destinationBaseUrl,
            name,
            submitter,
            owner_id: res.locals.sessionId,
            clientId,
            tokenUrl,
            authType: authType as any || 'none',
            id
        }).save();
        res.status(201).json(session);
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: getErrorMessage(err) });
    }
});

// Update Submission by ID
router.put('/api/sessions/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { destinationBaseUrl, submitter, name, id: newId, clientId, authType, tokenUrl } = req.body;
        if (!destinationBaseUrl) {
            return res.status(400).json({ error: 'Missing destinationBaseUrl' });
        }
        const session = db.sessions.get(id);
        if (!session) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        if (!checkSubmissionOwnership(session, res)) {
            return;
        }

        if (destinationBaseUrl && destinationBaseUrl !== session.destinationBaseUrl) {
            session.setDestinationBaseUrl(destinationBaseUrl);
        }

        if (submitter) {
            session.setSubmitter(submitter);
        }

        if (name && name !== session.name) {
            session.setName(name);
        }

        if (clientId && clientId !== session.clientId) {
            session.setClientId(clientId);
        }

        if (authType && authType !== session.authType) {
            session.setAuthType(authType);
        }

        if (tokenUrl && tokenUrl !== session.tokenUrl) {
            session.setTokenUrl(tokenUrl);
        }

        if (newId && newId !== id) {
            const oldId = session.id;
            session.setId(newId);
            db.sessions.delete(oldId);
        }

        session.save();
        res.json(session);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: getErrorMessage(err) });
    }
});

// Get Submission by ID
router.get('/api/sessions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    if (!checkSubmissionOwnership(session, res)) {
        return;
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
    if (!checkSubmissionOwnership(session, res)) {
        return;
    }
    db.sessions.delete(id);
    res.status(204).send();
});

// Complete Submission by ID
router.post('/api/sessions/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!checkSubmissionOwnership(session, res)) {
        return;
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

// Abort Submission by ID
router.post('/api/sessions/:id/abort', async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    try {
        await session.abort();
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
    const { manifestUrl, outputFormat, fhirBaseUrl, fileRequestHeaders } = req.body;
    if (!manifestUrl || !fhirBaseUrl) {
        return res.status(400).json({ error: 'Missing manifestUrl or fhirBaseUrl' });
    }
    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    session.addJob({ manifestUrl, fhirBaseUrl, outputFormat, fileRequestHeaders });
    session.save();
    res.json(session);
});

// Update manifest
router.put('/api/sessions/:id/manifests/:index', (req: Request, res: Response) => {
    const { id, index } = req.params;
    
    const {
        manifestUrl,
        outputFormat,
        fhirBaseUrl,
        fileRequestHeaders
    } = req.body;

    const session: Submission | undefined = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    const manifest = session.manifests[+index];
    if (!manifest) {
        return res.status(404).json({ error: 'Manifest not found' });
    }
    if (manifestUrl)        manifest.manifestUrl        = manifestUrl;
    if (fhirBaseUrl)        manifest.fhirBaseUrl        = fhirBaseUrl;
    if (outputFormat)       manifest.outputFormat       = outputFormat;
    if (fileRequestHeaders) manifest.fileRequestHeaders = fileRequestHeaders;

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

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    session.removeManifestAt(+index);
    session.save();
    res.json(session);
});

// Replace manifest
router.post('/api/sessions/:id/manifests/:index/replace', async (req: Request, res: Response) => {
    const { id, index } = req.params;
    const { newManifestUrl, fhirBaseUrl, outputFormat, fileRequestHeaders } = req.body;

    if (!newManifestUrl) {
        return res.status(400).json({ error: 'Missing newManifestUrl parameter' });
    }

    const session = db.sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    try {
        await session.replaceManifestAt(+index, {
            fhirBaseUrl,
            manifestUrl: newManifestUrl,
            outputFormat,
            fileRequestHeaders
        });
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

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }

    try {
        await session.abortManifestAt(+index);
        session.save();
        res.json(session);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
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

    if (!checkSubmissionOwnership(session, res)) {
        return;
    }
    
    try {
        await session.submitManifest(manifestUrl);
    } catch (error) {
        session.log.add(`Failed to submit manifest ${manifestUrl}: ${getErrorMessage(error)}`, {
            level: 'error',
            details: (error as Error).stack
        });
    }
    session.save();
    res.json(session);
});

// Hosting endpoints -----------------------------------------------------------

// Return an empty manifest (used to abort manifests)
router.get('/api/manifests/empty', staticRequestLogger(), (req: Request, res: Response) => {    
    res.json({
        transactionTime: new Date().toISOString(),
        requiresAccessToken: false,
        output: []
    });
});

// Export manifests
router.get('/api/manifests/:id', staticRequestLogger(), (req: Request, res: Response) => {

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
            manifest.output.forEach((file: any) => {
                if (!file.url.match(/^https?:\/\//)) { // Relative to absolute
                    file.url = BASE_URL + `/exports/${id}/${file.url.split('/').pop()}`;
                }
            })
            return res.json(manifest);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse existing manifest.json: ' + getErrorMessage(err) });
        }
    }

    return res.status(404).json({ error: 'Manifest not found' });
});

// HackMD CORS proxy
router.get('/api/hack-md', async (req: Request, res: Response) => {
    const url = 'https://hackmd.io/@argonaut/rJoqHZrPle.md';
    try {
        const response = await fetch(url);
        const text = await response.text();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(text);
    } catch (err) {
        res.status(500).send('Error fetching markdown');
    }
});

// Auth endpoints --------------------------------------------------------------
router.get('/keys', (req, res) => {
    res.json({ keys: [ PUBLIC_KEY ] });
});

router.post('/auth/verify', async (req, res) => {
    const { client_id, token_url } = req.body;

    if (!client_id) {
        return res.status(400).json({ error: 'Missing client_id parameter' });
    }

    if (!token_url) {
        return res.status(400).json({ error: 'Missing token_url parameter' });
    }

    try {
        const getAccessToken = createAuthenticator({
            tokenUrl  : token_url,
            clientId  : client_id,
            privateKey: PRIVATE_KEY
        });
        const tokenResponse = await getAccessToken();
        res.json({ token: tokenResponse });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

function checkSubmissionOwnership(session: Submission, res: Response): boolean {
    if (session.owner_id && session.owner_id !== res.locals.sessionId) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
}

export default router;
