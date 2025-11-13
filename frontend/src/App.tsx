import { Routes, Route } from 'react-router-dom';
import Layout            from './components/Layout';
import Home              from './components/Home';
import CreateSession     from './components/sessions/Create';
import ViewSession       from './components/sessions/View';
import List              from './components/sessions/List';
import EditSubmission    from './components/sessions/Edit';
import Docs              from './components/Docs';


export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                  element={<Home />} />
        <Route path="/sessions/new"      element={<CreateSession />} />
        <Route path="/sessions/:id"      element={<ViewSession />} />
        <Route path="/sessions/:id/edit" element={<EditSubmission />} />
        <Route path="/sessions"          element={<List />} />
        <Route path="/docs"              element={<Docs />} />
      </Routes>
    </Layout>
  );
}

