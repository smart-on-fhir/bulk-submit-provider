import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SubmissionForm from "./Form";

export default function EditSubmission() {
    const { id }   = useParams();
    const navigate = useNavigate();
    const [session   , setSession   ] = useState<App.Submission | null>(null);
    const [loading   , setLoading   ] = useState(true);
    const [error     , setError     ] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitter , setSubmitter ] = useState<string>('');

    const fetchSession = async () => {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sessions/${id}`);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
            setSubmitter(JSON.stringify(data.submitter, null, 2));
        } else {
            setError("Failed to fetch submission");
        }
        setLoading(false);
    };

    const handleSubmit = (sub: Partial<App.Submission>) => {
        setSubmitting(true);
        fetch(`/api/sessions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sub)
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not ok');
            }
        }).then(data => {
            navigate(`/sessions/${id}`);
        }).catch(error => {
            console.error('Error updating session:', error);
            alert('Failed to update session. Please try again.');
        }).finally(() => {
            setSubmitting(false);
        });
    };

    useEffect(() => {
        fetchSession();
    }, [id]);

    if (loading) {
        return <div>Loading submission...</div>;
    }

    if (error) {
        return <div className="text-danger">Error: {error}</div>;
    }

    if (!session) {
        return <div className="text-danger">Submission not found</div>;
    }
    
    return (
        <div>
            <h1 className="text-center">Edit Submission</h1>
            <div className='card my-4 rounded-4 bg-body-tertiary border-0' style={{ maxWidth: '840px', margin: '0 auto' }}>
                <div className='card-body p-5'>
                    <SubmissionForm loading={submitting} onSubmit={handleSubmit} value={session} />
                </div>
            </div>
            {/* <form onSubmit={handleSubmit}>
                <div className='card my-4 rounded-4 bg-body-tertiary border-0' style={{ maxWidth: '840px', margin: '0 auto' }}>
                    <div className='card-body p-5'>
                        <div className="mb-5">
                            <label htmlFor="name" className="form-label fw-semibold text-primary-emphasis">Name</label>
                            <input type="text" className="form-control" id="name" value={session.name} onChange={e => setSession({ ...session, name: e.target.value })} disabled={submitting} />
                            <div className="form-text text-secondary">
                                A friendly name for this submission to help you identify it later.
                            </div>
                        </div>
                        <div className="mb-5">
                            <label htmlFor="destinationBaseUrl" className="form-label fw-semibold text-primary-emphasis">Recipient</label>
                            <input type="text" className="form-control" id="destinationBaseUrl" value={session.destinationBaseUrl} onChange={e => setSession({ ...session, destinationBaseUrl: e.target.value })} disabled={submitting} />
                            <div className="form-text text-secondary">
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
                                disabled={submitting}
                                rows={4}
                                style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                            />
                            <div className="form-text text-secondary">
                                The FHIR Identifier of the entity submitting the data.
                                You can edit this to match an identifier registered in
                                your data recipient.
                            </div>
                        </div>
                    </div>
                </div>
                <div className='text-center pb-5'>
                    <Link to={`/sessions/${id}`} className="btn btn-secondary me-4" style={{ width: '10em' }} aria-disabled={submitting}>Cancel</Link>
                    <button type="submit" className="btn btn-primary" style={{ width: '10em' }} disabled={submitting}>
                        {submitting && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                        Save Changes
                    </button>
                </div>
            </form> */}
        </div>
    );
}
