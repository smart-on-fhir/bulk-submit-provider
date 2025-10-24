import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <header>
        <nav className="navbar navbar-expand-lg bg-secondary bg-opacity-10 border-bottom border-secondary border-opacity-10">
          <div className="container">
            <Link className="navbar-brand" to="/">
                <i className='bi bi-database-up me-3 fs-4'/>
                Bulk Submit Provider
            </Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <NavLink className="nav-link" to="/sessions">Submissions</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/health">API</NavLink>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-fill">
        <div className="container py-4">
          {children}
        </div>
      </main>

      <footer className="text-muted py-3 mt-auto">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
          <div className="small">&copy; {new Date().getFullYear()} Bulk Submit Provider</div>
          <div className="small">GitHub <a href="https://github.com/smart-on-fhir/bulk-submit-provider" target="_blank" rel="noreferrer">Repository</a></div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
