import React, { useState, useEffect }   from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter }   from 'react-syntax-highlighter';
import { atomDark }                     from 'react-syntax-highlighter/dist/esm/styles/prism';


export default function ViewSession() {
    const { id }                      = useParams();
    const navigate                    = useNavigate();
    const [showDialog, setShowDialog] = useState<boolean | number>(false);
    const [session   , setSession   ] = useState<App.Submission | null>(null);
    const [loading   , setLoading   ] = useState(true);
    const [error     , setError     ] = useState<string | null>(null);

    async function fetchSession(): Promise<App.Submission | null> {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sessions/${id}`);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
            setLoading(false);
            return data;
        } else {
            setError("Failed to fetch submission");
            setLoading(false);
            return null;
        }
    };

    const deleteSession = async () => {
        if (!session) return;
        setLoading(true);
        const response = await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
        setLoading(false);
        if (response.ok) {
            navigate('/sessions');
        } else {
            alert('Failed to delete submission. Please try again later.');
        }
    };

    const submitJob = async (job: App.SubmissionManifest) => {
        setSession({
            ...session!,
            manifests: session!.manifests.map(j => j.manifestUrl === job.manifestUrl ? { ...j, status: 'submitting' } : j)
        });
        const response = await fetch(`/api/sessions/${session!.id}/submit-manifest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manifestUrl: job.manifestUrl }) 
        });
        // setLoading(false);
        const data = await response.json();
        if (data) {
            setSession(data);
        } else {
            alert('Failed to submit manifest. ' + (data.error ? data.error : 'Please try again.'));
            setSession({
                ...session!,
                manifests: session!.manifests.map(j => j.manifestUrl === job.manifestUrl ? { ...j, status: 'not-started' } : j)
            });
        }
    };

    const removeManifestAt = async (index: number) => {
        const manifest = session!.manifests[index];
        if (!manifest) return;
        const oldStatus = manifest.status;
        setSession({
            ...session!,
            manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: 'submitting' } : m)
        });
        const response = await fetch(`/api/sessions/${session!.id}/manifests/${index}`, { method: 'DELETE' });
        setLoading(false);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
        } else {
            alert('Failed to remove manifest. Please try again.');
            setSession({
                ...session!,
                manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: oldStatus } : m)
            });
        }
    }

    const abortJobAt = async (index: number) => {
        const job = session!.manifests[index];
        if (!job) return;
        const oldStatus = job!.status;
        setSession({
            ...session!,
            manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: 'submitting' } : m)
        });
        const response = await fetch(`/api/sessions/${session!.id}/manifests/${index}/abort`, { method: 'POST' });
        if (response.ok) {
            const data = await response.json();
            setSession(data);
        } else {
            alert('Failed to abort job. Please try again later.');
            setSession({
                ...session!,
                manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: oldStatus } : m)
            });
        }
    };

    // Finalize submission by updating the session submissionStatus to 'complete'
    const completeSubmission = async () => {
        if (!session) return;
        setLoading(true);
        const response = await fetch(`/api/sessions/${session.id}/complete`, { method: 'POST' });
        setLoading(false);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
        } else {
            alert('Failed to finalize submission. Please try again later.');
        }
    };

    const poolTimeout = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchSession();
    }, [id]);

    useEffect(() => {
        const shouldPool = session && session.manifests.some(job => job.status === 'submitted');
        if (shouldPool) {
            poolTimeout.current = setTimeout(() => fetchSession(), 5_000);
        } else {
            clearTimeout(poolTimeout.current!);
        }
        return () => {
            clearTimeout(poolTimeout.current!);
        };
    }, [session]);

    if (loading && !session) {
        return <div>Loading submission...</div>;
    }

    if (error) {
        return <div className="text-danger">Error: {error}</div>;
    }

    if (!session) {
        return loading ? <div>Loading submission...</div> : <div className="text-danger">Submission not found</div>;
    }

    return (
        <div>
            <Link to="/sessions" className="mb-3 d-inline-block text-decoration-none">
                <i className="bi bi-arrow-left-circle me-2"></i>
                All Submissions
            </Link>
            <h4>{session.name}</h4>
            <div className="text-secondary rounded-3 p-4 bg-body-secondary bg-opacity-50 mb-4">
                <div className='row g-3'>
                    <div className='col'>
                        <table className="text-secondary">
                            <tbody>
                                <tr>
                                    <td className='text-end pe-2 text-muted fw-semibold'>Data&nbsp;Recipient:</td>
                                    <td><code>{session.destinationBaseUrl}</code></td>
                                </tr>
                                <tr>
                                    <td className='text-end pe-2 text-muted fw-semibold'>Submission&nbsp;id:</td>
                                    <td><code>{session.id}</code></td>
                                </tr>
                                <tr className='align-top'>
                                    <td className='text-end pe-2 text-muted fw-semibold'>Submitter:</td>
                                    <td><code style={{ wordBreak: 'break-all' }}>{JSON.stringify(session.submitter)}</code></td>
                                </tr>
                                <tr>
                                    <td className='text-end pe-2 text-muted fw-semibold'>Created:</td>
                                    <td><code className='text-body'>{new Date(session.createdAt).toLocaleString()}</code></td>
                                </tr>
                                <tr className='align-top'>
                                    <td className='text-end pe-2 text-muted fw-semibold'>Status:</td>
                                    <td className='align-middle'>
                                        { session.status === 'in-progress' ?
                                            session.progress > 0 ?
                                                <div className="progress" role="progressbar" aria-valuenow={session.progress} aria-valuemin={0} aria-valuemax={100}>
                                                    <div className="progress-bar" style={{ width: `${session.progress}%` }}>{session.progress}%</div>
                                                </div> :
                                                'In progress...' :
                                            <code className='text-body'>{session.status}</code>
                                        }

                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className='col-12 col-md-auto'>
                        <Link to={`/sessions/${id}/edit`} className='btn btn-sm btn-outline-secondary px-3 d-block w-100' type="button">Edit</Link>
                        <button className='btn btn-sm btn-outline-secondary px-3 d-block w-100 mt-2' type="button" onClick={() => {
                            if (confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
                                deleteSession();
                            }
                        }}>Delete</button>
                        <button className='btn btn-sm btn-outline-secondary px-3 d-block w-100 mt-2' type="button" disabled>Abort</button>
                        <button
                            className='btn btn-sm btn-outline-secondary px-3 d-block w-100 mt-2'
                            type="button"
                            onClick={completeSubmission}
                            disabled={session.status === 'completed' || session.status === 'unknown'}
                        >Complete</button>
                    </div>
                </div>
            </div>


            { !session.manifests || session.manifests.length === 0 ? (
                <button className="btn btn-primary mb-5 px-5" type="button" onClick={() => setShowDialog(true)}>
                    Add Manifest
                </button>
            ) : (<>
                <div className='row align-items-center mt-5'>
                    <div className='col'>
                        <h4>Manifests</h4>
                    </div>
                    <div className='col-auto'>
                        <button
                            className="btn btn-link text-decoration-none px-0 text-primary-emphasis"
                            onClick={() => setShowDialog(true)}>
                            <i className="bi bi-plus me-2"/>
                            Add Manifest
                        </button>
                    </div>
                </div>
                <div className='border rounded-3 jobs-table-wrapper bg-body-secondary bg-opacity-25'>
                    <table className="table table-hover m-0 table-layout-fixed align-middle">
                        <tbody>
                            {session.manifests.map((job, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="row g-1 align-items-start flex-nowrap" title={job.manifestUrl}>
                                            <div className='col-auto lh-sm'>
                                                <i className="bi bi-file-earmark-text text-secondary mx-1" />
                                            </div>
                                            <div className='col lh-sm' style={{ wordBreak: 'break-all' }}>
                                                {job.manifestUrl}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-nowrap small" style={{ width: '10em' }}>
                                        { job.status === "aborted"     && <span className="badge bg-danger rounded-pill">Aborted</span> }
                                        { job.status === "failed"      && <span className="badge bg-danger rounded-pill">Failed</span>  }
                                        { job.status === "submitted"   && <span><i className="bi bi-check-circle-fill text-success me-2" />Submitted</span> }
                                        { job.status === "submitting"  && <span className='text-secondary'><span className="spinner-border spinner-border-sm me-2" role="status" />Working...</span> }
                                        { job.status === "not-started" && <button className='btn btn-sm text-primary-emphasis border-0 p-0' onClick={() => submitJob(job)}><i className='bi bi-send me-2' />Submit</button> }
                                    </td>
                                    <td className="text-nowrap pe-2" style={{ width: '2em' }}>
                                        <div className="dropend">
                                            <button type="button" className="btn btn-sm btn-outline-secondary border-0 px-2" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i className='bi bi-three-dots-vertical' />
                                            </button>
                                            <ul className="dropdown-menu shadow p-1">
                                                
                                                <button
                                                    className="dropdown-item ps-2 rounded-1"
                                                    disabled={!['failed', 'aborted', 'completed'].includes(job.status)}
                                                    onClick={() => submitJob(job)}>
                                                    <i className='bi bi-arrow-clockwise me-3'/>
                                                    Retry
                                                </button>
                                                
                                                <button
                                                    className="dropdown-item ps-2 rounded-1"
                                                    disabled={!['not-started', 'aborted', 'failed'].includes(job.status)}
                                                    onClick={() => setShowDialog(index)}>
                                                    <i className="bi bi-pencil-square me-3"/>
                                                    Edit
                                                </button>
                                                
                                                <button
                                                    className="dropdown-item ps-2 rounded-1"
                                                    disabled={!['not-started', 'aborted', 'failed'].includes(job.status)}
                                                    onClick={() => removeManifestAt(index)}>
                                                    <i className="bi bi-trash me-3"/>
                                                    Remove
                                                </button>

                                                <button
                                                    className="dropdown-item ps-2 rounded-1"
                                                    disabled={!['submitting', 'submitted'].includes(job.status)}
                                                    onClick={() => abortJobAt(index)}
                                                    title="Aborting a job works by sending an empty manifest to replace the current one">
                                                    <i className='bi bi-x-circle me-3'/>
                                                    Abort
                                                </button>

                                                <button
                                                    className="dropdown-item ps-2 rounded-1"
                                                    disabled={!['submitted', 'failed'].includes(job.status)}>
                                                    <i className='bi bi-shuffle me-3'/>
                                                    Replace
                                                </button>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>)}

            { session.log?.length > 0 && (<>
                <h4 className='mt-5'>Submission Log</h4>
                <div className='rounded-3 p-3 bg-body-secondary bg-opacity-50 mb-4'>
                    { session.log.map((entry, index) => (
                        <div key={index} style={{ fontFamily: 'DejaVu Sans Mono, Menlo, monospace', lineHeight: '1.3em', fontSize: '0.9em' }}>
                            <Collapse header={
                                <div className='row flex-nowrap g-2 d-inline-flex align-items-center'>
                                    <div className='col text-wrap' style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        <span className='text-secondary me-3'>
                                            { entry.count > 1 && <span className='badge bg-primary rounded-pill me-1' title={`Entry repeated ${entry.count} times`}>{entry.count}</span>  }
                                            { entry.timestamp }
                                        </span>
                                        <span className={entry.level === 'error' ? 'text-danger' : entry.level === 'info' ? '' : 'text-warning' }>{entry.message}</span>
                                    </div>
                                </div>
                            }>
                                { entry.request || entry.response || entry.details ? <>
                                { entry.details && (
                                    <div className='text-wrap ms-1' style={{ whiteSpace: 'pre-wrap' }}>
                                        Details: {entry.details}
                                    </div>
                                ) }
                                { entry.request && (
                                    <Collapse header='Request'>
                                        <SyntaxHighlighter language="json" style={atomDark}>
                                            {JSON.stringify(entry.request, null, 2)}
                                        </SyntaxHighlighter>
                                    </Collapse>
                                )}
                                { entry.response && (
                                    <Collapse header='Response'>
                                        <SyntaxHighlighter language="json" style={atomDark}>
                                            {JSON.stringify(entry.response, null, 2)}
                                        </SyntaxHighlighter>
                                    </Collapse>
                                )}
                                </> : null }
                            </Collapse>
                        </div>
                    )) }
                </div>
            </>)}

            {(showDialog || showDialog === 0) && (<SourceDialog session={session} manifestIndex={ typeof showDialog === "number" ? showDialog : undefined } close={
                (s?: App.Submission) => {
                    if (s) setSession(s);
                    setShowDialog(false)
                }
             } />)}
            
        </div>
    );
}


// -----------------------------------------------------------------------------
// Dialogs
// -----------------------------------------------------------------------------

function SourceDialog({
    session,
    manifestIndex,
    close
}: {
    session: App.Submission,
    manifestIndex?: number,
    close: (s?: App.Submission) => void
}) {
    const job = manifestIndex !== undefined ? session.manifests[manifestIndex] : undefined;
    const [manifestUrl , setManifestUrl ] = useState(job ? job.manifestUrl : '');
    const [FHIRBaseUrl , setFHIRBaseUrl ] = useState(job ? job.FHIRBaseUrl : '');
    const [outputFormat, setOutputFormat] = useState('');
    const [loading     , setLoading     ] = useState(false);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const method = job ? 'PUT' : 'POST';
        const uri = job ? `/api/sessions/${session.id}/manifests/${manifestIndex}` : `/api/sessions/${session.id}/manifests`;
        const body = JSON.stringify({
            manifestUrl,
            outputFormat,
            FHIRBaseUrl
        });

        setLoading(true);

        fetch(uri, {
            headers: { 'Content-Type': 'application/json' },
            method,
            body
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not ok');
            }
        }).then(data => {
            close(data);
        }).catch(error => {
            console.error('Error adding manifest:', error);
            alert('Failed to add manifest. Please try again.');
        }).finally(() => {
            setLoading(false);
        });
    }

    return (
        <div>
            <div className="modal fade show" style={{display: 'block'}} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                    <div className="modal-content bg-body-tertiary p-3">
                        <form onSubmit={onSubmit}>
                            <fieldset disabled={loading}>
                                <div className="modal-header border-bottom-0">
                                    <h4 className="modal-title">
                                        { job ?
                                            <><i className='bi bi-pencil-square me-2' />Edit Manifest</> :
                                            <><i className='bi bi-plus-circle-fill me-2' />Add Manifest</>}
                                        </h4>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => close()}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">Manifest URL</label>
                                        <datalist id="manifestUrls">
                                            <option value={`${window.location.origin}/api/manifests/1`}>Should export successfully</option>
                                            <option value={`${window.location.origin}/api/manifests/2`}>Has invalid output entry linking to missing file</option>
                                            <option value={`${window.location.origin}/api/manifests/3`}>Has incorrect output entry count values</option>
                                        </datalist>
                                        <input
                                            type="url"
                                            className="form-control"
                                            required
                                            value={manifestUrl}
                                            onChange={e=>setManifestUrl(e.target.value)}
                                            placeholder="https://example.com/manifest.json"
                                            name='manifestUrl'
                                            list="manifestUrls"
                                            onInput={(e) => {
                                                const input = e.target as HTMLInputElement;
                                                const value = input.value;
                                                if (session.manifests?.some(manifest => manifest.manifestUrl === value)) {
                                                    input.setCustomValidity('This manifest URL has already been added to the session.');
                                                    input.reportValidity();
                                                } else {
                                                    input.setCustomValidity('');
                                                }
                                            }}
                                        />
                                        <div className="small mt-1 text-muted lh-sm opacity-75">
                                            Url pointing to a Bulk Export Manifest with a pre-coordinated FHIR data set.
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">FHIR Base Url</label>
                                        <input
                                            type="url"
                                            className="form-control"
                                            required
                                            placeholder="https://fhirserver.com/fhir"
                                            value={FHIRBaseUrl}
                                            onChange={e=>setFHIRBaseUrl(e.target.value)}
                                            name='FHIRBaseUrl'
                                        />
                                        <div className="small mt-1 text-muted lh-sm opacity-75">
                                            Base url to be used by the Data Recipient when resolving relative references in
                                            the submitted resources.
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">Output Format</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={outputFormat}
                                            onChange={e=>setOutputFormat(e.target.value)}
                                            placeholder="e.g. application/fhir+ndjson"
                                            name='outputFormat'
                                        />
                                        <div className="small mt-1 text-muted lh-sm opacity-75">
                                            The format for the Bulk Data files in the manifest.
                                        </div>
                                    </div>
                                    {/* <div className="mb-3">
                                        <label className="form-label text-primary">fileRequestHeaders</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">oauthMetadataUrl</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">fileEncryptionKey</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">metadata</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">import</label>
                                        TODO
                                    </div> */}
                                </div>
                                <div className="modal-footer border-top-0">
                                    <button
                                        type="button"
                                        className="btn btn-secondary opacity-75"
                                        onClick={() => close()}
                                        style={{ width: '8em' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary px-4" style={{ width: '8em' }}>
                                        { loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
                                        { job ? 'Save' : 'Add'}
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </div>
    );
}

function Collapse({ header, children, open = false }: { header: React.ReactNode, children: React.ReactNode, open?: boolean }) {

    const [isOpen, setIsOpen] = useState(open);

    useEffect(() => {
        setIsOpen(open);
    }, [open]);

    function toggle() {
        setIsOpen(!isOpen);
    }

    return (
        <div className={`vi-collapse ${isOpen ? 'show' : ''}`}>
            <div className="vi-collapse-header" onClick={toggle}>
                { !!children ?
                    <i className='bi bi-caret-right-fill me-2 small text-muted' style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} /> :
                    <i className='bi bi-dash me-2 small text-muted' /> }
                {header}
            </div>
            <div className="vi-collapse-body">
                {children}
            </div>
        </div>
    )
}
