import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="text-center flex-grow-1 d-flex flex-column justify-content-center align-self-center" style={{ maxWidth: '34rem' }}>
            <div className="d-inline-block">
                <h2>Welcome to the Bulk Submit Provider</h2>
                <p className="lead text-secondary">
                    Use this UI to submit and monitor bulk data submission jobs.
                    You can start by creating a new submission and configuring
                    its submit destination.
                </p>
                <hr/>
                <div className='text-center my-5'>
                    <Link to="/sessions/new" className="btn btn-lg btn-primary">
                        Start New Submission
                    </Link>
                </div>
                <div className="alert alert-warning">
                    NOTE: This is a demo implementation of the Bulk Data Submit specification.
                    It is not intended for production use. Any data is automatically deleted
                    in 48 hours.
                    <h5 className="mt-3">Please do not use PHI!</h5>
                </div>
            </div>
        </div>
    );
}
