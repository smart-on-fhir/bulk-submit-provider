import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";

export default function SubmissionForm({ loading, value, onSubmit }: {
  loading: boolean;
  value?: Partial<App.Submission>;
  onSubmit: (session: Partial<App.Submission>) => void;
}) {
    const [name              , setName              ] = useState<string>(value?.name || '');
    const [destinationBaseUrl, setDestinationBaseUrl] = useState<string>(value?.destinationBaseUrl || '');
    const [id                , setId                ] = useState<string>(value?.id || '');
    const [authType          , setAuthType          ] = useState<string>(value?.authType || 'none');
    const [clientId          , setClientId          ] = useState<string>(value?.clientId || '');
    const [tokenUrl          , setTokenUrl          ] = useState<string>(value?.tokenUrl || '');
    const [authTesting       , setAuthTesting       ] = useState<boolean>(false);
    const [authTestResult    , setAuthTestResult    ] = useState<ReactNode>(null);
    const [authTestFailed    , setAuthTestFailed    ] = useState<boolean>(false);
    const [submitter         , setSubmitter         ] = useState<string>(
        value?.submitter ?
            JSON.stringify(value.submitter, null, 2) : 
            JSON.stringify({ system: 'http://example.org/fhir/submitter-codes', value: 'example-submitter' }, null, 2)
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSubmit({
            destinationBaseUrl: destinationBaseUrl.replace(/\/+$/,''),
            name,
            submitter: JSON.parse(submitter),
            id       : id || undefined,
            authType : authType as 'none' | 'bearer',
            clientId : authType === 'bearer' ? clientId : undefined,
            tokenUrl : authType === 'bearer' ? tokenUrl : undefined
        });
    };

    const testAuth = async () => {
        setAuthTesting(true);
        const response = await fetch('/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                token_url: tokenUrl
            })
        });

        const data = await response.json();

        setAuthTesting(false);

        if (!response.ok) {
            setAuthTestFailed(true);
            setAuthTestResult(data?.error || 'Authentication test failed');
        }
        else {
            setAuthTestFailed(false);
            setAuthTestResult(<b><i className="bi bi-check-circle-fill text-success me-1" />Successfully obtained access token!</b>);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <fieldset disabled={loading}>
                <div className="mb-5">
                    <label htmlFor="name" className="form-label text-primary-emphasis fw-semibold">Submission Name</label>
                    <input type="text" className="form-control" id="name" placeholder="Unnamed Bulk Submission" value={name} onChange={e => setName(e.target.value)} />
                    <div className="small mt-1 text-secondary">
                        A friendly name to help you identify this submission later.
                    </div>
                </div>
                <div className="mb-5">
                    <label htmlFor="destinationBaseUrl" className="form-label text-primary-emphasis fw-semibold lh-sm">
                        Recipient Base URL
                        { (value?.status === 'in-progress' || value?.status === 'complete') && <span className="small text-danger fw-normal ms-2">
                            Cannot edit this while the submissions that are completed or in progress
                        </span> }
                    </label>
                    <datalist id="urls">
                        <option value="https://bulk-submit-recipient.smarthealthit.org">
                            Bulk Submit Recipient Reference Implementation
                        </option>
                    </datalist>
                    <input
                        type="url"
                        className="form-control"
                        id="destinationBaseUrl"
                        placeholder="https://destination.com/fhir"
                        required
                        value={destinationBaseUrl}
                        onChange={e => setDestinationBaseUrl(e.target.value)}
                        disabled={loading || value?.status === 'in-progress'}
                        list="urls"
                    />
                    <div className="small mt-1 text-secondary">
                        The base URL of the server where the data will be submitted.
                        It must support the bulk-submit operation at <code>POST [base-url]/$bulk-submit</code>,
                        as well as the bulk-submit-status operation at <code>POST [base-url]/$bulk-submit-status</code>.
                    </div>
                </div>
                <div className="mb-5">
                    <label htmlFor="submitter" className="form-label fw-semibold text-primary-emphasis lh-sm">
                        Submitter
                        { (value?.status === 'in-progress' || value?.status === 'complete') && <span className="small text-danger fw-normal ms-2">
                            Cannot edit this while the submissions that are completed or in progress
                        </span> }
                    </label>
                    <textarea
                        className="form-control"
                        id="submitter"
                        value={submitter}
                        onChange={e => setSubmitter(e.target.value)}
                        disabled={loading || value?.status === 'in-progress'}
                        rows={4}
                        style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                    />
                    <div className="form-text text-secondary">
                        The FHIR Identifier of the entity submitting the data.
                        You can edit this to match an identifier registered in
                        your data recipient.
                    </div>
                </div>
                <div className="mb-5">
                    <label htmlFor="id" className="form-label fw-semibold text-primary-emphasis lh-sm">
                        Submission ID
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="id"
                        value={id}
                        onChange={e => setId(e.target.value)}
                        disabled={loading || value?.status === 'in-progress'}
                    />
                    <div className="small mt-1 text-secondary">
                        A unique identifier for this submission. If you leave this empty,
                        a new UUID will be generated for the submission.
                    </div>
                </div>
                <div className="mb-5">
                    <label className="form-label fw-semibold text-primary-emphasis lh-sm">
                        Authentication
                    </label>
                    <div className="small text-secondary mb-2">
                        How to authenticate to the recipient server.
                    </div>
                    <div className="form-check mb-2">
                        <div>
                            <label className="form-check-label d-block">
                                <input className="form-check-input" type="radio" name="authType" checked={ authType === 'none' } onChange={() => setAuthType('none')} />
                                None
                                <div className="small text-secondary mb-2 lh-sm">
                                    No Authorization header will be sent
                                </div>
                            </label>
                        </div>
                        <div>
                            <label className="form-check-label">
                                <input className="form-check-input" type="radio" name="authType" checked={ authType === 'bearer' } onChange={() => setAuthType('bearer')} />
                                Backend Services Authentication
                                <div className="small text-secondary mb-2 lh-sm">
                                    Obtains an access token and sends it as a Bearer token in the Authorization header.
                                </div>
                            </label>
                        </div>
                    </div>
                    { authType === 'bearer' && <div className="mb-2 ps-4">
                        <label className="form-label fw-semibold text-primary-emphasis lh-sm">Client ID</label>
                        <input type="text" className="form-control mt-1" name="client_id" value={clientId} onChange={e => setClientId(e.target.value)} />
                        <div className="small text-secondary mb-2 mt-1">
                            You should register this data provider with the Data Recipient and
                            get back a client ID. The JWKS with the public keys for this data
                            provider is available at <code>{`${window.location.origin}/keys`}</code>.
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-primary-emphasis fw-semibold lh-sm">Token URL</label>
                            <input type="url" className="form-control" name="token_url" value={tokenUrl} onChange={e => setTokenUrl(e.target.value)} />
                            <div className="small text-secondary mb-2 mt-1">
                                Authorization server's token endpoint URL.
                            </div>
                        </div>
                        <div className="small text-secondary mb-2 mt-1">
                            <div className={"p-2 rounded mb-2 " + (!authTestResult ? 'bg-secondary-subtle' : authTestFailed ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis')}>
                                <button type="button" className="btn btn-sm btn-outline-secondary bg-white text-secondary" onClick={() => testAuth()}>
                                    Test Authentication
                                </button>
                                {authTesting && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
                                <div>{ authTestResult &&
                                    <div className="mt-2 text-start" style={{ fontFamily: 'monospace', fontSize: '0.85em', whiteSpace: 'pre-wrap' }}>
                                        {authTestResult}
                                    </div>
                                }</div>
                            </div>
                        </div>
                    </div> }
                </div>
                <hr />
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