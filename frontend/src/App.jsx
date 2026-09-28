import { Routes, Route } from 'react-router';

// Screens are added in the next phases: Login, Register, Project List, Project Details.
function App() {
  return (
    <Routes>
      <Route
        path="*"
        element={
          <main className="page">
            <h1>Task Manager</h1>
          </main>
        }
      />
    </Routes>
  );
}

export default App;
