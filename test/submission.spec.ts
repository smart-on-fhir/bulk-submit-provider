import { expect }             from 'chai';
import * as utils             from '../src/utils';
import Submission             from '../src/Submission';
import { CODING_IN_PROGRESS } from '../src/config';


describe('Submission.submitManifest', () => {
    let originalSendRequest: typeof utils.sendRequest;
    let calls: Array<any> = [];

    beforeEach(() => {
        originalSendRequest = utils.sendRequest;
        
        calls = [];

        // Override sendRequest to capture calls and simulate responses
        (utils as any).sendRequest = async (url: string, opts?: any) => {
        
            calls.push({ url, opts });

            // Simulate responses for bulk-submit and bulk-submit-status endpoints
            if (url.endsWith('/$bulk-submit')) {
                return {
                    error: null,
                    request: opts,
                    response: { headers: {}, body: {} },
                    res: { status: 200, statusText: 'OK' }
                };
            }

            if (url.includes('status')) {
                // Return 200 so Submission.checkStatus treats the submission as complete
                // and does not schedule further polling timers during tests.
                return {
                    error: null,
                    request: opts,
                    response: { headers: { 'content-location': 'http://status/1' }, body: {} },
                    res: { status: 200, statusText: 'OK' }
                };
            }

            return { error: null, request: opts, response: {}, res: undefined };
        };
    });

    afterEach(() => {
        (utils as any).sendRequest = originalSendRequest;
    });

    it('sends expected parameters and marks manifest submitted (without outputFormat)', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://example.org',
            name: 'test-submission'
        });
        
        submission.addJob({
            manifestUrl: 'http://example.org/manifest1',
            fhirBaseUrl: 'http://fhir.example.org'
        });

        await submission.submitManifest('http://example.org/manifest1');

        // Prevent the internal polling timer from firing after the test
        // restores the original sendRequest implementation. The pool timer is
        // a runtime property (TypeScript `private` only), so we access it via
        // `any` here.
        if ((submission as any).poolTimer) {
            clearTimeout((submission as any).poolTimer);
            (submission as any).poolTimer = null;
        }

        // Verify that a call was made to $bulk-submit
        expect(calls.length).to.be.greaterThan(0);
        const bulkCall = calls.find(c => c.url.endsWith('/$bulk-submit'));
        expect(bulkCall, 'bulk-submit call was made').to.exist;

        // Verify the body parameters
        const body = JSON.parse(bulkCall.opts.body);
        expect(body.resourceType).to.equal('Parameters');
        const params = body.parameter;

        // Check the manifestUrl parameter
        const manifestParam = params.find((p: any) => p.name === 'manifestUrl');
        expect(manifestParam).to.exist;
        expect(manifestParam.valueString).to.equal('http://example.org/manifest1');

        // Check the fhirBaseUrl parameter
        const fhirParam = params.find((p: any) => p.name === 'fhirBaseUrl');
        expect(fhirParam).to.exist;
        expect(fhirParam.valueString).to.equal('http://fhir.example.org');

        // Check the submissionStatus parameter
        const statusParam = params.find((p: any) => p.name === 'submissionStatus');
        expect(statusParam).to.exist;
        expect(statusParam.valueCoding).to.deep.equal(CODING_IN_PROGRESS);

        // Verify that the manifest status is updated to 'submitted' within the submission
        const manifest = submission.manifests.find(m => m.manifestUrl === 'http://example.org/manifest1');
        expect(manifest).to.exist;
        expect(manifest!.status).to.equal('submitted');
        expect(submission.startedAt).to.be.instanceOf(Date);
    });

    it('includes outputFormat parameter when provided', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://example.org',
            name: 'test-submission-2'
        });

        submission.addJob({
            manifestUrl : 'http://example.org/manifest2',
            fhirBaseUrl : 'http://fhir2',
            outputFormat: 'application/fhir+ndjson'
        });

        await submission.submitManifest('http://example.org/manifest2');

        // Clear the polling timer so it doesn't call the restored sendRequest later.
        if ((submission as any).poolTimer) {
            clearTimeout((submission as any).poolTimer);
            (submission as any).poolTimer = null;
        }

        const bulkCall = calls.find(c => c.url.endsWith('/$bulk-submit'));
        expect(bulkCall, 'bulk-submit call was made').to.exist;
        const body = JSON.parse(bulkCall.opts.body);
        const params = body.parameter;
        const outParam = params.find((p: any) => p.name === 'outputFormat');
        expect(outParam).to.exist;
        expect(outParam.valueString).to.equal('application/fhir+ndjson');
    });

    it ('includes fileRequestHeaders when provided', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://example.org',
            name: 'test-submission-3'
        });
        
        submission.addJob({
            manifestUrl: 'http://example.org/manifest3',
            fhirBaseUrl: 'http://fhir3',
            fileRequestHeaders: [
                { headerName: 'Authorization', headerValue: 'Bearer token' },
                { headerName: 'Custom-Header', headerValue: 'value' }
            ]
        });

        await submission.submitManifest('http://example.org/manifest3');

        // Clear the polling timer so it doesn't call the restored sendRequest later.
        if ((submission as any).poolTimer) {
            clearTimeout((submission as any).poolTimer);
            (submission as any).poolTimer = null;
        }
            
        const bulkCall = calls.find(c => c.url.endsWith('/$bulk-submit'));
        expect(bulkCall, 'bulk-submit call was made').to.exist;
        const body = JSON.parse(bulkCall.opts.body);
        const params = body.parameter.filter((p: any) => p.name === 'fileRequestHeader');
        expect(params).to.be.an('array').with.lengthOf(2);

        params.forEach((p: any) => {
            expect(p.part).to.exist;
            const headerNamePart = p.part.find((part: any) => part.name === 'headerName');
            const headerValuePart = p.part.find((part: any) => part.name === 'headerValue');
            expect(headerNamePart).to.exist;
            expect(headerValuePart).to.exist;
        });
    });
});
