import { Identifier } from "fhir/r4";

declare global {
    namespace App {

        type SubmissionStatusCode = "in-progress" | "complete" | "aborted";

        /**
         * System of http://hl7.org/fhir/uv/bulkdata/ValueSet/submission-status,
         * code of in-progress (default if parameter is omitted), complete or
         * aborted. Once a request has been submitted with a submissionStatus of
         * aborted or complete, no additional requests may be submitted for that
         * submitter and submissionId combination.
         */
        interface SubmissionStatusCoding {
            system: "http://hl7.org/fhir/uv/bulkdata/ValueSet/submission-status",
            code  : SubmissionStatusCode
        }

        /**
         * The submitter must match a system and code specified by the Data
         * Recipient (coordinated out-of-band or in an implementation guide
         * specific to a use case).
         */
        interface Submitter extends Identifier {
            system: 'http://example.org/fhir/submitter-codes',
            value : 'example-submitter'
        }

        interface Submission {
            id: string;
            name: string;
            destinationBaseUrl: string;
            createdAt: string;
            status: string;
            submitter: Submitter;
            progress: number;
            log: JobLogEntry[];
            manifests: SubmissionManifest[];
        }

        interface SubmissionManifest {
            manifestUrl: string;
            FHIRBaseUrl: string;
            status: 'not-started' | 'submitting' | 'submitted' | 'aborted' | 'failed' | 'replaced';
            startedAt: string | null;
            completedAt: string | null;
        }

        type JobLogEntryLevel = 'info' | 'warn' | 'error';

        interface JobLogEntryJson {
            timestamp: string;
            message: string;
            level: JobLogEntryLevel;
            details?: string;
            request?: JobRequest;
            response?: JobResponse;
            count: number;
        }

        interface JobRequest {
            method : string;
            url    : string;
            headers: object;
            body   : object
        }

        interface JobResponse {
            headers   : object;
            body      : object | string;
            status    : number;
            statusText: string;
        }

        interface ResultManifest {
            [key: string]: any;
        }
    }
}

export {};