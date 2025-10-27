
// The port where the Express app runs
export const PORT = process.env.PORT || '3000';

// The base URL where this app is hosted (used in manifests, links, etc).
// No trailing slash here!
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// When ran in development mode, this is where the frontend dev server runs
// In production, this should be the public URL where the app is hosted
export const APP_BASE_URL = process.env.APP_BASE_URL || BASE_URL;

// The current Node environment ('development', 'production', or 'test')
export const NODE_ENV = process.env.NODE_ENV || 'production';

// Throttle delay (ms) to delay every http response (for testing).
export const THROTTLE = parseInt(process.env.THROTTLE || (NODE_ENV === 'production' ? '0' : '1000'), 10);


export const CODING_IN_PROGRESS: App.SubmissionStatusCoding = {
    system: 'http://hl7.org/fhir/uv/bulkdata/ValueSet/submission-status',
    code  : 'in-progress'
};

export const CODING_COMPLETE: App.SubmissionStatusCoding = {
    system: 'http://hl7.org/fhir/uv/bulkdata/ValueSet/submission-status',
    code  : 'complete'
};

export const CODING_ABORTED: App.SubmissionStatusCoding = {
    system: 'http://hl7.org/fhir/uv/bulkdata/ValueSet/submission-status',
    code  : 'aborted'
};
