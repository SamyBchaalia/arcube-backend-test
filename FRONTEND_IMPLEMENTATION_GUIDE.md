# Frontend Implementation Guide

## Overview

This guide covers the implementation of a protected dashboard for managing LinkedIn embedded posts.

## Architecture

```
/login          → Public login page
/dashboard      → Protected route (requires authentication)
```

---

## API Endpoints

### Base URL

```
Production: https://your-api-domain.com/api
Development: http://localhost:4000/api
```

### Authentication

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "lounatale@nbvgroup.ca",
  "password": "nbvD@shboard2025"
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "lounatale@nbvgroup.ca",
    "name": "Lou Natale",
    "isActive": true,
    "lastLoginAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### Get Profile (Verify Token)

```http
GET /api/auth/profile
Authorization: Bearer <accessToken>
```

---

### LinkedIn Posts

#### Create Post (Protected)

```http
POST /api/linkedin-posts
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "link": "https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890"
}
```

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "link": "https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Get All Posts (Public)

```http
GET /api/linkedin-posts
```

**Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "link": "https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Update Post (Protected)

```http
PUT /api/linkedin-posts/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "link": "https://www.linkedin.com/embed/feed/update/urn:li:share:0987654321"
}
```

#### Delete Post (Protected)

```http
DELETE /api/linkedin-posts/:id
Authorization: Bearer <accessToken>
```

**Response (204 No Content)**

---

## Frontend Implementation

### 1. Project Setup (React + TypeScript)

```bash
npx create-react-app dashboard --template typescript
cd dashboard
npm install axios react-router-dom
npm install -D @types/react-router-dom
```

### 2. Project Structure

```
src/
├── api/
│   └── axios.ts           # Axios instance with interceptors
├── contexts/
│   └── AuthContext.tsx    # Authentication context
├── guards/
│   └── ProtectedRoute.tsx # Route protection component
├── pages/
│   ├── Login.tsx          # Login page
│   └── Dashboard.tsx      # Dashboard page
├── components/
│   ├── PostForm.tsx       # Add/Edit post form
│   ├── PostList.tsx       # List of posts
│   └── PostItem.tsx       # Single post item
├── types/
│   └── index.ts           # TypeScript interfaces
├── App.tsx
└── index.tsx
```

### 3. TypeScript Interfaces

```typescript
// src/types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface LinkedInPost {
  id: string;
  link: string;
  createdAt: string;
}

export interface CreatePostDto {
  link: string;
}
```

### 4. Axios Configuration

```typescript
// src/api/axios.ts

import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

### 5. Authentication Context

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/axios';
import { User, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      // Optionally verify token with /api/auth/profile
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const { accessToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 6. Protected Route Guard

```typescript
// src/guards/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### 7. Login Page

```typescript
// src/pages/Login.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Dashboard Login</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
```

### 8. Dashboard Page

```typescript
// src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { LinkedInPost } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [newLink, setNewLink] = useState('');
  const [editingPost, setEditingPost] = useState<LinkedInPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get<LinkedInPost[]>('/linkedin-posts');
      setPosts(response.data);
    } catch (err) {
      setError('Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post<LinkedInPost>('/linkedin-posts', { link: newLink });
      setPosts([response.data, ...posts]);
      setNewLink('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add post');
    }
  };

  const handleUpdatePost = async (id: string, link: string) => {
    try {
      const response = await api.put<LinkedInPost>(`/linkedin-posts/${id}`, { link });
      setPosts(posts.map(post => post.id === id ? response.data : post));
      setEditingPost(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/linkedin-posts/${id}`);
      setPosts(posts.filter(post => post.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete post');
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>LinkedIn Posts Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Add New Post Form */}
      <section className="add-post-section">
        <h2>Add New LinkedIn Post</h2>
        <form onSubmit={handleAddPost}>
          <input
            type="url"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="Enter LinkedIn embed link..."
            required
          />
          <button type="submit">Add Post</button>
        </form>
      </section>

      {/* Posts List */}
      <section className="posts-section">
        <h2>Manage Posts</h2>

        {isLoading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>No posts yet. Add your first LinkedIn post above.</p>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <div key={post.id} className="post-item">
                {editingPost?.id === post.id ? (
                  <EditPostForm
                    post={editingPost}
                    onSave={(link) => handleUpdatePost(post.id, link)}
                    onCancel={() => setEditingPost(null)}
                  />
                ) : (
                  <>
                    <div className="post-content">
                      <p className="post-link">{post.link}</p>
                      <small className="post-date">
                        Added: {new Date(post.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="post-actions">
                      <button onClick={() => setEditingPost(post)}>Edit</button>
                      <button onClick={() => handleDeletePost(post.id)} className="delete-btn">
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Edit Post Form Component
interface EditPostFormProps {
  post: LinkedInPost;
  onSave: (link: string) => void;
  onCancel: () => void;
}

const EditPostForm: React.FC<EditPostFormProps> = ({ post, onSave, onCancel }) => {
  const [link, setLink] = useState(post.link);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(link);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        required
      />
      <div className="edit-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default Dashboard;
```

### 9. App Router Setup

```typescript
// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './guards/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
```

### 10. Basic Styling

```css
/* src/App.css */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

/* Login Page */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  margin-bottom: 24px;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: #0077b5;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #0077b5;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #005885;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Dashboard */
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logout-btn {
  width: auto;
  padding: 8px 16px;
  background-color: #dc3545;
}

.logout-btn:hover {
  background-color: #c82333;
}

/* Add Post Section */
.add-post-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-post-section h2 {
  margin-bottom: 16px;
}

.add-post-section form {
  display: flex;
  gap: 12px;
}

.add-post-section input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.add-post-section button {
  width: auto;
  padding: 12px 24px;
}

/* Posts Section */
.posts-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.posts-section h2 {
  margin-bottom: 16px;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}

.post-content {
  flex: 1;
}

.post-link {
  word-break: break-all;
  margin-bottom: 8px;
}

.post-date {
  color: #666;
}

.post-actions {
  display: flex;
  gap: 8px;
}

.post-actions button {
  width: auto;
  padding: 8px 16px;
}

.delete-btn {
  background-color: #dc3545;
}

.delete-btn:hover {
  background-color: #c82333;
}

/* Edit Form */
.edit-form {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
}

.edit-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-actions button {
  width: auto;
  padding: 8px 16px;
}

/* Error Message */
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #f5c6cb;
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

---

## Environment Variables

Create `.env` file in frontend root:

```env
REACT_APP_API_URL=http://localhost:4000/api
```

For production:

```env
REACT_APP_API_URL=https://your-api-domain.com/api
```

---

## Security Considerations

1. **Token Storage**: JWT stored in localStorage. For enhanced security, consider:

   - HttpOnly cookies
   - Token refresh mechanism

2. **CORS**: Backend must allow frontend origin

3. **Input Validation**: Validate LinkedIn URLs on both frontend and backend

4. **Error Handling**: Never expose sensitive error details to users

---

## Testing Checklist

- [ ] Login with valid credentials redirects to /dashboard
- [ ] Login with invalid credentials shows error message
- [ ] Accessing /dashboard without auth redirects to /login
- [ ] After login, accessing /login redirects to /dashboard
- [ ] Logout clears session and redirects to /login
- [ ] Add post works and appears in list
- [ ] Edit post updates the link
- [ ] Delete post removes from list
- [ ] Token expiry redirects to /login
