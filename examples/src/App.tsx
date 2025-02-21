import { Routes, Route, Link } from 'react-router-dom'
import UserForm from './pages/UserForm'
import TodoList from './pages/TodoList'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                User Form
              </Link>
              <Link
                to="/todos"
                className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Todo List
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<UserForm />} />
          <Route path="/todos" element={<TodoList />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
