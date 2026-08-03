import React, { useState, useEffect }   from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter }   from 'react-syntax-highlighter';
import { atomDark }                     from 'react-syntax-highlighter/dist/esm/styles/prism';
import { OperationOutcome }             from 'fhir/r4';
import Collapse                         from '../Collapse';
import ManifestFormDialog               from '../ManifestFormDialog';
import ManifestReplaceDialog            from '../ManifestReplaceDialog';


export default function ViewSession() {
    const { id }                                    = useParams();
    const navigate                                  = useNavigate();
    const [showDialog       , setShowDialog       ] = useState<boolean | number>(false);
    const [session          , setSession          ] = useState<App.Submission | null>(null);
    const [loading          , setLoading          ] = useState(true);
    const [error            , setError            ] = useState<string | null>(null);
    const [completing       , setCompleting       ] = useState(false);
    const [completed        , setCompleted        ] = useState(false);
    const [showReplaceDialog, setShowReplaceDialog] = useState<number>(-1);

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

    // const abortJobAt = async (index: number) => {
    //     const job = session!.manifests[index];
    //     if (!job) return;
    //     const oldStatus = job!.status;
    //     setSession({
    //         ...session!,
    //         manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: 'submitting' } : m)
    //     });
    //     const response = await fetch(`/api/sessions/${session!.id}/manifests/${index}/abort`, { method: 'POST' });
    //     if (response.ok) {
    //         const data = await response.json();
    //         setSession(data);
    //     } else {
    //         alert('Failed to abort job. Please try again later.');
    //         setSession({
    //             ...session!,
    //             manifests: session!.manifests.map((m, i) => i === index ? { ...m, status: oldStatus } : m)
    //         });
    //     }
    // };

    const abortSubmission = async () => {
        if (!session) return;
        setLoading(true);
        const response = await fetch(`/api/sessions/${session.id}/abort`, { method: 'POST' });
        setLoading(false);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
        } else {
            alert('Failed to abort submission. Please try again later.');
        }
    };

    // Finalize submission by updating the session submissionStatus to 'complete'
    const completeSubmission = async () => {
        if (!session) return;
        setLoading(true);
        setCompleting(true);
        const response = await fetch(`/api/sessions/${session.id}/complete`, { method: 'POST' });
        setLoading(false);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
            setCompleted(true);
        } else {
            alert('Failed to finalize submission. Please try again later.');
        }
        setCompleting(false);
    };

    const pollTimeout = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchSession();
    }, [id]);

    useEffect(() => {
        const shouldPoll = session && session.status === 'in-progress';
        if (shouldPoll) {
            pollTimeout.current = setTimeout(() => fetchSession(), 5_000);
        } else {
            clearTimeout(pollTimeout.current!);
        }
        return () => {
            clearTimeout(pollTimeout.current!);
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
                        <table className="text-secondary lh-sm">
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
                                        {
                                            session.status === 'in-progress' ?
                                            <div className="progress" role="progressbar" style={{ maxWidth: '20em', boxShadow: '0 0 0 1px rgba(0,0,0,0.2) inset', borderRadius: '0.25rem' }}>
                                                <div className="progress-bar opacity-75 small" style={{ width: `${session.progress || 0}%`, transition: 'all 3s linear' }} />
                                            </div> :
                                            session.status === 'complete' ? (
                                                <b className='text-body'>Completed<i className="bi bi-check-circle-fill text-success ms-2" /></b>
                                            ) : session.status === 'failed' ? (
                                                <b className='text-danger'>Failed<i className="bi bi-x-circle-fill text-danger ms-2" /></b>
                                            ) : session.status === 'not-started' ? (
                                                <span className='text-secondary'>Not Started</span>
                                            ) : session.status === 'aborted' ? (
                                                <b className='text-danger'>Aborted<i className="bi bi-x-circle-fill text-danger ms-2" /></b>
                                            ) : null
                                        }
                                    </td>
                                </tr>
                                { session.result && (<>
                                    <tr>
                                        <td className='text-end pe-2 text-muted fw-semibold'>Started:</td>
                                        <td><code className='text-body'>{new Date(session.result.startedAt).toLocaleString()}</code></td>
                                    </tr>
                                    <tr>
                                        <td className='text-end pe-2 text-muted fw-semibold'>Completed:</td>
                                        <td><code className='text-body'>{new Date(session.result.completedAt).toLocaleString()}</code></td>
                                    </tr>
                                    <tr>
                                        <td className='text-end pe-2 text-muted fw-semibold'>Duration:</td>
                                        <td><code className='text-body'>{session.result.duration}</code></td>
                                    </tr>
                                    <tr>
                                        <td className='text-end pe-2 text-muted fw-semibold'>Total Errors:</td>
                                        <td>{
                                            session.result.totalErrors < 1 ?
                                            <code className='text-muted'>{session.result.totalErrors}</code> :
                                            <code className='badge bg-danger rounded-pill'>{session.result.totalErrors}</code>
                                        }</td>
                                    </tr>
                                </>)}
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
                        <button
                            className='btn btn-sm btn-outline-danger px-3 d-block w-100 mt-2'
                            type="button"
                            disabled={completed || ['aborted', 'complete', 'failed', 'not-started'].includes(session.status)}
                            onClick={abortSubmission}
                        >Abort</button>
                        <button
                            className='btn btn-sm btn-outline-success px-3 d-block w-100 mt-2'
                            type="button"
                            onClick={completeSubmission}
                            disabled={completing || completed || ['complete', 'failed', 'not-started', 'aborted'].includes(session.status)}
                        >
                            { completing && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
                            Complete
                        </button>
                    </div>
                </div>
            </div>


            { session.status === 'in-progress' && (
                <div className='mt-5 text-center text-danger'>
                    <div >
                        <i className='bi bi-info-circle me-2'/>
                        Next step: submit more manifests or <b>complete</b> or <b>abort</b> this submission
                    </div>
                </div>
            )}


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
                        { (session.status !== 'complete' && session.status !== 'aborted') &&
                            <button
                                className="btn btn-link text-decoration-none px-0 text-primary-emphasis"
                                onClick={() => setShowDialog(true)}>
                                <i className="bi bi-plus me-2"/>
                                Add Manifest
                            </button>
                        }
                    </div>
                </div>
                <div className='border rounded-3 jobs-table-wrapper bg-body-secondary bg-opacity-25'>
                    <table className="table table-hover m-0 table-layout-fixed align-middle">
                        <tbody>
                            {session.manifests.map((job, index) => {
                                // `outcome` is the current spec name; `error` was
                                // used in earlier drafts. Accept either.
                                const outcomeEntries = session.result?.manifest?.outcome
                                    ?? session.result?.manifest?.error;
                                const errorEntries = outcomeEntries?.filter(e => {
                                    return e.extension?.manifestUrl === job.manifestUrl;
                                });
                                return (
                                    <tr key={index}>
                                        <td>
                                            <div className="row g-1 align-items-start flex-nowrap" title={job.manifestUrl}>
                                                <div className='col-auto lh-sm'>
                                                    <i className="bi bi-file-earmark-text text-secondary mx-1" />
                                                </div>
                                                <div className='col lh-sm' style={{ wordBreak: 'break-all' }}>
                                                    {job.manifestUrl}
                                                    { errorEntries && <ManifestReport entries={errorEntries} /> }
                                                </div>
                                            </div>
                                        </td>
                                        
                                        { session.status !== 'complete' && session.status !== 'aborted' && (
                                            <>
                                                <td className="text-nowrap small" style={{ width: '10em' }}>
                                                    { job.status === "aborted"     && <span className="badge bg-danger rounded-pill">Aborted</span> }
                                                    { job.status === "failed"      && <span className="badge bg-danger rounded-pill">Failed</span>  }
                                                    { job.status === "submitted"   && <span><i className="bi bi-check-circle-fill text-success me-2" />Submitted</span> }
                                                    { job.status === "replaced"    && <span className="badge bg-warning text-dark rounded-pill">Replaced</span> }
                                                    { job.status === "submitting"  && <span className='text-secondary'><span className="spinner-border spinner-border-sm me-2" role="status" />Working...</span> }
                                                    { job.status === "not-started" && (
                                                        <button
                                                            className='btn btn-sm text-primary-emphasis border-0 p-0 bg-transparent'
                                                            onClick={() => submitJob(job)}
                                                            disabled={ completed || completing }
                                                        >
                                                            <i className='bi bi-send me-2' />Submit
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="text-nowrap" style={{ width: '2em' }}>
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

                                                            {/* <button
                                                                className="dropdown-item ps-2 rounded-1"
                                                                disabled={session.status !== 'in-progress' || !['submitting', 'submitted'].includes(job.status)}
                                                                onClick={() => abortJobAt(index)}
                                                                title="Aborting a job works by sending an empty manifest to replace the current one">
                                                                <i className='bi bi-x-circle me-3'/>
                                                                Abort
                                                            </button> */}

                                                            <button
                                                                className="dropdown-item ps-2 rounded-1"
                                                                disabled={!['submitted', 'failed'].includes(job.status)}
                                                                onClick={() => setShowReplaceDialog(index)}>
                                                                <i className='bi bi-shuffle me-3'/>
                                                                Replace
                                                            </button>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </>
                                        ) }
                                    </tr>
                                );
                            })}
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

            {(showDialog || showDialog === 0) && (<ManifestFormDialog session={session} manifestIndex={ typeof showDialog === "number" ? showDialog : undefined } close={
                (s?: App.Submission) => {
                    if (s) setSession(s);
                    setShowDialog(false)
                }
            } />)}

            {showReplaceDialog > -1 && (
                <ManifestReplaceDialog session={session} manifestIndex={ showReplaceDialog } close={(s?: App.Submission) => {
                    if (s) setSession(s);
                    setShowReplaceDialog(-1)
                }} />
            )}

        </div>
    );
}

function ManifestReport({ entries }: { entries: App.OutcomeEntry[] }) {

    const hasSuccessCount = entries.some(e => e.extension && e.extension.countSeverity?.success);
    const hasErrorCount   = entries.some(e => e.extension && e.extension.countSeverity?.error);
    const successCount    = entries.reduce((sum: number, entry) => sum + (entry.extension?.countSeverity?.success || 0), 0);
    const errorCount      = entries.reduce((sum: number, entry) => sum + (entry.extension?.countSeverity?.error || 0), 0);

    return (
        <table className='mt-1 ms-2 text-muted small'>
            <tbody>
                <tr>
                    <td className='text-end pe-1 text-nowrap'>Success Count:</td>
                    <td>
                        { hasSuccessCount ?
                            successCount ?
                                <b className='text-success'>{ successCount }</b> :
                                0 :
                            <span>No data</span>
                        }
                    </td>
                </tr>
                <tr>
                    <td className='text-end pe-1 text-nowrap'>Errors Count:</td>
                    <td>
                        { hasErrorCount ?
                            errorCount ?
                                <b className='text-danger'>{ errorCount }</b> :
                                0 :
                            <span>No data</span>
                        }
                    </td>
                </tr>
                <tr>
                    <td className='text-end pe-1 text-nowrap align-top'>Error Outcomes:</td>
                    <td className='align-top'>
                        { entries.length > 0 ? entries.map((error: any, index: number) => (
                            <a key={index} href={error.url} target='_blank' rel='noopener noreferrer' className='me-2'>
                                {error.url.split('/').pop()}
                            </a>
                        )) : <span>No data</span> }
                    </td>
                </tr>
                { ((errorCount > 0 && errorCount < 100) || (successCount > 0 && successCount < 100)) && (
                    <tr>
                        <td className='text-end pe-1 text-nowrap align-top'>Errors Preview (first 10):</td>
                        <td className='align-top'><ErrorPreview entries={entries} /></td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

function ErrorPreview({ entries }: { entries: App.OutcomeEntry[] }) {

    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        entries.forEach(entry => {
            if (entry.url) {
                fetch(entry.url)
                .then(res => res.text())
                .then(text => text.split('\n').slice(0, 10).map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line) as OperationOutcome))
                .then((resources: OperationOutcome[]) => {
                    resources.forEach(resource => {
                        const msg = resource.issue[0].details?.text || '';
                        if (msg) {
                            setMessages(prev => {
                                if (!prev.includes(msg) && prev.length < 10) {
                                    return [...prev, msg];
                                }
                                return prev;
                            });
                        }
                    });
                })
                .catch(console.error);
            }
        });

    }, [entries]);

    if (messages.length === 0) {
        return 'Loading...';
    }

    return (
        <ul className='m-0 ps-3 small' style={{ maxHeight: 220, overflowY: 'auto' }}>
            { messages.map((msg, index) => <li key={index} style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 'inherit',
                margin: '0.2em 0',
                fontFamily: 'monospace',
                tabSize: 4
            }}>{msg}</li>) }
        </ul>
    );
}
