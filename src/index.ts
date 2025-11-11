import 'dotenv/config';
import db                           from './db';
import createApp                    from './app';
import Submission                   from './Submission';
import { BASE_URL, NODE_ENV, PORT } from './config';


const app = createApp();

// In DEV, create a default submission for convenience
if (NODE_ENV !== 'production') {
    const defaultSubmission = new Submission({ destinationBaseUrl: 'http://localhost:3333', name: 'Example Bulk Submission' });
    (defaultSubmission as any).id = 'example-submission';
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/1`, FHIRBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/2`, FHIRBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/3`, FHIRBaseUrl: BASE_URL });
    db.sessions.set(defaultSubmission.id, defaultSubmission);
}

app.listen(Number(PORT), () => {
  console.log(`bulk-submit-provider listening on ${PORT}`);
});
