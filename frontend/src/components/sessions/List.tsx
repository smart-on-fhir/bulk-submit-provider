import { useEffect, useState } from "react";
import { Link, useNavigate }   from "react-router-dom";


export default function List() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error  , setError  ] = useState<string | null>(null);
    const [data   , setData   ] = useState<App.Submission[]>([]);

    const fetchSession = async () => {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sessions`);
        if (response.ok) {
            const data = await response.json();
            setData(data);
        } else {
            setError("Failed to fetch submission");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSession();
    }, []);

    return (
        <div>
            <div className="row align-items-center">
                <div className="col">
                    <h1 className="mb-0">Submissions</h1>
                </div>
                <div className="col-auto">
                    <Link to="/sessions/new" className="text-decoration-none">
                        <i className="bi bi-plus-circle me-2"></i>
                        New Submission
                    </Link>
                </div>
            </div>
            <hr className="mb-4 mt-3" />
            { loading && !data?.length && <div>Loading submissions...</div> }
            { !loading && error && <div className="text-danger">Error: {error}</div> }
            { !loading && !error && <>{
                !data?.length ? (
                    <div className="text-danger">No submissions found</div>
                ) : (
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th className="text-secondary">Name</th>
                                <th className="text-secondary">Destination</th>
                                <th className="text-secondary">Created At</th>
                                <th className="text-secondary">Manifests</th>
                                <th className="text-secondary">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                        {data.map(session => (
                            <tr key={session.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sessions/${session.id}`)}>
                                <td>{session.name}</td>
                                <td>{session.destinationBaseUrl}</td>
                                <td>{new Date(session.createdAt).toLocaleString()}</td>
                                <td>{session.manifests?.length || 0}</td>
                                <td>{session.status}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )
            }</> }
        </div>
    );
}
