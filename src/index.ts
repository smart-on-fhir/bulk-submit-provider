import 'dotenv/config';
import db                 from './db';
import createApp          from './app';
import { BASE_URL, PORT } from './config';
import Submission         from './Submission';


const app = createApp();

// In DEV, create a default submission for convenience
if (process.env.NODE_ENV !== 'production') {
    const defaultSubmission = new Submission({ destinationBaseUrl: 'http://localhost:3333', name: 'Example Bulk Submission' });
    (defaultSubmission as any).id = 'example-submission';
    defaultSubmission.addJob(`${BASE_URL}/api/manifests/1`, BASE_URL);
    defaultSubmission.addJob(`${BASE_URL}/api/manifests/2`, BASE_URL);
    defaultSubmission.addJob(`${BASE_URL}/api/manifests/3`, BASE_URL);
    db.sessions.set(defaultSubmission.id, defaultSubmission);
}

app.listen(Number(PORT), () => {
  console.log(`bulk-submit-provider listening on ${PORT}`);
});
