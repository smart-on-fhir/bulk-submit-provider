import 'dotenv/config';
import db                           from './db';
import createApp                    from './app';
import Submission                   from './Submission';
import { BASE_URL, NODE_ENV, PORT } from './config';


const app = createApp();

// In DEV, create a default submission for convenience
if (NODE_ENV !== 'production') {
    const defaultSubmission = new Submission({
      destinationBaseUrl: 'http://localhost:3333',
      name: 'Example Bulk Submission',
      clientId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd2tzX3VybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9rZXlzIiwiaWF0IjoxNzY0ODYzMjEzfQ.hItKTj4j1YZw5SHBS-qMsXVgUbQBAut05Z7jD_LApr8',
      authType: 'bearer',
      tokenUrl: 'http://localhost:3333/token'
    });
    (defaultSubmission as any).id = 'example-submission';
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/1`, fhirBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/2`, fhirBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/3`, fhirBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/4`, fhirBaseUrl: BASE_URL });
    defaultSubmission.addJob({ manifestUrl: `${BASE_URL}/api/manifests/5`, fhirBaseUrl: BASE_URL });
    db.sessions.set(defaultSubmission.id, defaultSubmission);
}

app.listen(Number(PORT), () => {
  console.log(`bulk-submit-provider listening on ${PORT}`);
});
