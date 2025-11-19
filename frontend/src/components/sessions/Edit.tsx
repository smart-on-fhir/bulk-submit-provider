import { useEffect, useState }    from "react";
import { useNavigate, useParams } from "react-router-dom";
import SubmissionForm             from "./Form";


export default function EditSubmission() {
    const { id }   = useParams();
    const navigate = useNavigate();
    const [session   , setSession   ] = useState<App.Submission | null>(null);
    const [loading   , setLoading   ] = useState(true);
    const [error     , setError     ] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchSession = async () => {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sessions/${id}`);
        if (response.ok) {
            const data = await response.json();
            setSession(data);
        } else {
            setError("Failed to fetch submission");
        }
        setLoading(false);
    };

    const handleSubmit = async (sub: Partial<App.Submission>) => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/sessions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sub)
            });

            const txt = await res.text();
            
            const data = JSON.parse(txt);

            if (!res.ok) {
                throw new Error(`Failed to update submission: ${txt}`);
            }

            if (data.error) {
                throw new Error(`Failed to update submission: ${data.error}`);
            }
            
            navigate(`/sessions/${data.id}`);
            
        } catch (error) {
            console.error('Error updating submission:', error);
            alert('Failed to update submission. Please try again.\n' + (error as Error).message);
            setSubmitting(false);
        }
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
        </div>
    );
}
