import { useState } from "react";
import { Link } from "react-router-dom";

export default function SubmissionForm({ loading, value, onSubmit }: {
  loading: boolean;
  value?: Partial<App.Submission>;
  onSubmit: (session: Partial<App.Submission>) => void;
}) {
    const [name, setName] = useState<string>(value?.name || '');
    const [destinationBaseUrl, setDestinationBaseUrl] = useState<string>(value?.destinationBaseUrl || '');
    const [submitter , setSubmitter ] = useState<string>(
        value?.submitter ?
            JSON.stringify(value.submitter, null, 2) : 
            JSON.stringify({ system: 'http://example.org/fhir/submitter-codes', value: 'example-submitter' }, null, 2)
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSubmit({ destinationBaseUrl, name, submitter: JSON.parse(submitter) });
    };

    return (
        <form onSubmit={handleSubmit}>
            <fieldset disabled={loading}>
                <div className="mb-5">
                    <label htmlFor="name" className="form-label text-primary-emphasis fw-semibold">Submission Name</label>
                    <input type="text" className="form-control" id="name" placeholder="My First Submission" value={name} onChange={e => setName(e.target.value)} />
                    <div className="small mt-1 text-secondary">
                        A friendly name to help you identify this submission later.
                    </div>
                </div>
                <div className="mb-5">
                    <label htmlFor="destinationBaseUrl" className="form-label text-primary-emphasis fw-semibold">Recipient Base URL</label>
                    <input type="url" className="form-control" id="destinationBaseUrl" placeholder="https://destination.com/fhir" required value={destinationBaseUrl} onChange={e => setDestinationBaseUrl(e.target.value)} />
                    <div className="small mt-1 text-secondary">
                        The base URL of the server where the data will be submitted.
                        It must support the bulk-submit operation at <code>POST [base-url]/$bulk-submit</code>,
                        as well as the bulk-submit-status operation at <code>POST [base-url]/$bulk-submit-status</code>.
                    </div>
                </div>
                <div className="mb-2">
                    <label htmlFor="submitter" className="form-label fw-semibold text-primary-emphasis">Submitter</label>
                    <textarea
                        className="form-control"
                        id="submitter"
                        value={submitter}
                        onChange={e => setSubmitter(e.target.value)}
                        disabled={loading}
                        rows={4}
                        style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                    />
                    <div className="form-text text-secondary">
                        The FHIR Identifier of the entity submitting the data.
                        You can edit this to match an identifier registered in
                        your data recipient.
                    </div>
                </div>
                <div className="text-center mt-5">
                    { value && <Link to={`/sessions/${value.id}`} className="btn btn-secondary me-4" style={{ width: '10em' }} aria-disabled={loading}>Cancel</Link> }
                    <button type="submit" className="btn btn-primary" style={{ minWidth: '11em' }} disabled={loading}>
                        { loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
                        { value ? 'Save Changes' : 'Create Submission' }
                    </button>
                </div>
            </fieldset>
        </form>
    );
}