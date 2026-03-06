# Frontend Implementation Guide: NBV Chat with History & Guest Registration

## Overview

This document provides comprehensive guidance for frontend developers to implement the NBV chatbot interface with session management and optional guest user registration features.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Types & Interfaces](#data-types--interfaces)
3. [Implementation Flow](#implementation-flow)
4. [React Implementation Example](#react-implementation-example)
5. [Session Management](#session-management)
6. [Guest User Registration](#guest-user-registration)
7. [Error Handling](#error-handling)
8. [UI/UX Recommendations](#uiux-recommendations)
9. [Admin Dashboard Integration](#admin-dashboard-integration)

---

## API Endpoints

### 1. Chat Endpoint (Public)

**Endpoint:** `POST /shorten/nbv`

**Purpose:** Send messages to NBV chatbot with optional session continuity and guest registration

**Request Body:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  sessionId?: string;  // Optional: UUID for session continuity
  guestUser?: {        // Optional: Register as guest user
    email: string;
    firstName: string;
    lastName: string;
  };
}
```

**Response:**
```typescript
string[]  // Array of assistant response text blocks
```

**Example Request:**
```javascript
const response = await fetch('/shorten/nbv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Tell me about sales training' }
    ],
    sessionId: 'optional-uuid-here',
    guestUser: {  // Optional
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe'
    }
  })
});

const data = await response.json();
// data = ["NBV Group offers comprehensive sales training..."]
```

### 2. Admin: List Sessions (Admin Only)

**Endpoint:** `GET /admin/chat-history/sessions`

**Authentication:** Requires admin JWT token

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10)
- `startDate` (ISO 8601 string, optional) - Filter by start date
- `endDate` (ISO 8601 string, optional) - Filter by end date
- `isAnonymous` (boolean, optional) - Filter anonymous vs registered sessions

**Response:**
```typescript
{
  sessions: Array<{
    id: string;
    sessionId: string;
    botType: 'nbv';
    messageCount: number;
    lastMessageAt: string;
    isAnonymous: boolean;
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      name: string;
      isGuest: boolean;
    } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Example Request:**
```javascript
const response = await fetch('/admin/chat-history/sessions?page=1&limit=10&isAnonymous=false', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

### 3. Admin: Get Session Details (Admin Only)

**Endpoint:** `GET /admin/chat-history/sessions/:sessionId`

**Authentication:** Requires admin JWT token

**Response:**
```typescript
{
  session: {
    id: string;
    sessionId: string;
    botType: 'nbv';
    messageCount: number;
    lastMessageAt: string;
    isAnonymous: boolean;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      name: string;
      isGuest: boolean;
    } | null;
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sequenceNumber: number;
    createdAt: string;
  }>;
}
```

---

## Data Types & Interfaces

### TypeScript Interfaces

```typescript
// Chat Message
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Guest User Registration
interface GuestUser {
  email: string;
  firstName: string;
  lastName: string;
}

// Chat Request
interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  guestUser?: GuestUser;
}

// Chat Session (from API)
interface ChatSession {
  id: string;
  sessionId: string;
  botType: 'nbv';
  messageCount: number;
  lastMessageAt: string;
  isAnonymous: boolean;
  createdAt: string;
  user: GuestUserInfo | null;
}

interface GuestUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  isGuest: boolean;
}

// Detailed Session (with messages)
interface SessionDetails {
  session: ChatSession & {
    ipAddress: string;
    userAgent: string;
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sequenceNumber: number;
    createdAt: string;
  }>;
}

// Paginated Sessions Response
interface SessionsResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## Implementation Flow

### Flow 1: Anonymous Chat (No Registration)

```
User visits chat → Messages sent without sessionId →
Backend auto-generates sessionId →
Conversation tracked anonymously →
User can continue with same sessionId
```

### Flow 2: Session Continuity (Anonymous)

```
User starts chat → Store sessionId in localStorage →
User returns → Load sessionId from localStorage →
Continue conversation with same session
```

### Flow 3: Guest User Registration

```
User chatting anonymously →
Decides to register →
Provides email + name →
Backend creates guest account →
Sends welcome email with password →
Links past messages to user →
Session becomes non-anonymous
```

### Flow 4: Registered User Chat

```
User provides registration info from start →
Backend creates/finds guest user →
All messages linked to user immediately →
User receives welcome email if new
```

---

## React Implementation Example

### 1. Chat Component Setup

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GuestUser {
  email: string;
  firstName: string;
  lastName: string;
}

const NBVChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Initialize or load session
  useEffect(() => {
    const storedSessionId = localStorage.getItem('nbv-chat-session');
    const storedMessages = localStorage.getItem('nbv-chat-messages');
    const storedGuestUser = localStorage.getItem('nbv-guest-user');

    if (storedSessionId) {
      setSessionId(storedSessionId);
    }

    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }

    if (storedGuestUser) {
      setGuestUser(JSON.parse(storedGuestUser));
      setIsRegistered(true);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('nbv-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const requestBody: {
        messages: Message[];
        sessionId?: string;
        guestUser?: GuestUser;
      } = {
        messages: [...messages, userMessage],
      };

      // Include sessionId if we have one
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      // Include guest user info if provided (for registration or continuation)
      if (guestUser && !isRegistered) {
        requestBody.guestUser = guestUser;
      }

      const response = await fetch('/shorten/nbv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const assistantContent = Array.isArray(data) ? data.join('\n') : data;

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Store sessionId if this is the first message
      if (!sessionId) {
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        localStorage.setItem('nbv-chat-session', newSessionId);
      }

      // Mark as registered if guest user was provided
      if (guestUser && !isRegistered) {
        setIsRegistered(true);
        localStorage.setItem('nbv-guest-user', JSON.stringify(guestUser));
        setShowGuestForm(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message in UI
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestRegistration = (data: GuestUser) => {
    setGuestUser(data);
    setShowGuestForm(false);
    // Next message will include guest user info
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setGuestUser(null);
    setIsRegistered(false);
    localStorage.removeItem('nbv-chat-session');
    localStorage.removeItem('nbv-chat-messages');
    localStorage.removeItem('nbv-guest-user');
  };

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <h2>NBV Group Sales Assistant</h2>
        <div className="header-actions">
          {!isRegistered && (
            <button onClick={() => setShowGuestForm(true)}>
              Register for History
            </button>
          )}
          {isRegistered && (
            <span className="registered-badge">
              Registered as {guestUser?.firstName}
            </span>
          )}
          <button onClick={clearChat}>Clear Chat</button>
        </div>
      </div>

      {/* Guest Registration Form */}
      {showGuestForm && (
        <GuestRegistrationForm
          onSubmit={handleGuestRegistration}
          onCancel={() => setShowGuestForm(false)}
        />
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome! How can I help you today?</h3>
            <p>Ask me about sales training, consulting services, or Lou Natale's experience.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role}`}
          >
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default NBVChat;
```

### 2. Guest Registration Form Component

```tsx
import React, { useState } from 'react';

interface GuestUser {
  email: string;
  firstName: string;
  lastName: string;
}

interface GuestRegistrationFormProps {
  onSubmit: (data: GuestUser) => void;
  onCancel: () => void;
}

const GuestRegistrationForm: React.FC<GuestRegistrationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<GuestUser>({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Partial<GuestUser>>({});

  const validate = (): boolean => {
    const newErrors: Partial<GuestUser> = {};

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.firstName || formData.firstName.length < 1) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName || formData.lastName.length < 1) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="guest-registration-modal">
      <div className="modal-content">
        <h3>Register for Chat History</h3>
        <p>
          Save your conversation and receive a welcome email with login credentials.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className={errors.firstName ? 'error' : ''}
            />
            {errors.firstName && (
              <span className="error-message">{errors.firstName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className={errors.lastName ? 'error' : ''}
            />
            {errors.lastName && (
              <span className="error-message">{errors.lastName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={errors.email ? 'error' : ''}
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit">Register</button>
          </div>
        </form>

        <div className="privacy-note">
          <small>
            Your email will only be used to send login credentials and important updates.
          </small>
        </div>
      </div>
    </div>
  );
};

export default GuestRegistrationForm;
```

### 3. Custom Hook for Chat Logic

```typescript
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GuestUser {
  email: string;
  firstName: string;
  lastName: string;
}

interface UseChatReturn {
  messages: Message[];
  sessionId: string | null;
  guestUser: GuestUser | null;
  isRegistered: boolean;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  registerGuest: (user: GuestUser) => void;
  clearChat: () => void;
}

export const useNBVChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted state
  useEffect(() => {
    const storedSessionId = localStorage.getItem('nbv-chat-session');
    const storedMessages = localStorage.getItem('nbv-chat-messages');
    const storedGuestUser = localStorage.getItem('nbv-guest-user');

    if (storedSessionId) setSessionId(storedSessionId);
    if (storedMessages) setMessages(JSON.parse(storedMessages));
    if (storedGuestUser) {
      setGuestUser(JSON.parse(storedGuestUser));
      setIsRegistered(true);
    }
  }, []);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('nbv-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = { role: 'user', content: content.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const requestBody: any = {
          messages: [...messages, userMessage],
        };

        if (sessionId) {
          requestBody.sessionId = sessionId;
        }

        if (guestUser && !isRegistered) {
          requestBody.guestUser = guestUser;
        }

        const response = await fetch('/shorten/nbv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error('Failed to send message');

        const data = await response.json();
        const assistantContent = Array.isArray(data) ? data.join('\n') : data;

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantContent },
        ]);

        // Store sessionId on first message
        if (!sessionId) {
          const newSessionId = uuidv4();
          setSessionId(newSessionId);
          localStorage.setItem('nbv-chat-session', newSessionId);
        }

        // Mark as registered
        if (guestUser && !isRegistered) {
          setIsRegistered(true);
          localStorage.setItem('nbv-guest-user', JSON.stringify(guestUser));
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, there was an error. Please try again.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, sessionId, guestUser, isRegistered, isLoading]
  );

  const registerGuest = useCallback((user: GuestUser) => {
    setGuestUser(user);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setGuestUser(null);
    setIsRegistered(false);
    localStorage.removeItem('nbv-chat-session');
    localStorage.removeItem('nbv-chat-messages');
    localStorage.removeItem('nbv-guest-user');
  }, []);

  return {
    messages,
    sessionId,
    guestUser,
    isRegistered,
    isLoading,
    sendMessage,
    registerGuest,
    clearChat,
  };
};
```

---

## Session Management

### Best Practices

1. **Generate SessionId**: Use UUID v4 for session IDs
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   const sessionId = uuidv4();
   ```

2. **Persist Session**: Store in localStorage
   ```typescript
   localStorage.setItem('nbv-chat-session', sessionId);
   ```

3. **Load on Mount**: Restore session when component mounts
   ```typescript
   useEffect(() => {
     const storedSession = localStorage.getItem('nbv-chat-session');
     if (storedSession) setSessionId(storedSession);
   }, []);
   ```

4. **Clear on Logout/Reset**: Remove session data
   ```typescript
   localStorage.removeItem('nbv-chat-session');
   localStorage.removeItem('nbv-chat-messages');
   ```

### Session Expiration (Optional)

Consider implementing client-side session expiration:

```typescript
interface SessionData {
  sessionId: string;
  timestamp: number;
}

const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

const saveSession = (sessionId: string) => {
  const data: SessionData = {
    sessionId,
    timestamp: Date.now(),
  };
  localStorage.setItem('nbv-chat-session', JSON.stringify(data));
};

const loadSession = (): string | null => {
  const stored = localStorage.getItem('nbv-chat-session');
  if (!stored) return null;

  const data: SessionData = JSON.parse(stored);
  const age = Date.now() - data.timestamp;

  if (age > SESSION_EXPIRY) {
    // Session expired
    localStorage.removeItem('nbv-chat-session');
    return null;
  }

  return data.sessionId;
};
```

---

## Guest User Registration

### When to Show Registration Prompt

1. **After X Messages**: Suggest registration after 3-5 exchanges
2. **At Natural Break**: After assistant provides comprehensive answer
3. **User Asks About Follow-up**: When user mentions wanting to save/return
4. **Exit Intent**: Modal on tab close or navigation away

### Registration Flow Example

```typescript
const ChatWithRegistrationPrompt: React.FC = () => {
  const [messageCount, setMessageCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after 3 user messages if not registered
    if (messageCount >= 3 && !isRegistered && !showPrompt) {
      setShowPrompt(true);
    }
  }, [messageCount, isRegistered, showPrompt]);

  const handleMessageSent = () => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <>
      {showPrompt && (
        <RegistrationPrompt
          onRegister={() => {/* Show registration form */}}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
      {/* Chat UI */}
    </>
  );
};
```

### Registration Prompt Component

```tsx
const RegistrationPrompt: React.FC<{
  onRegister: () => void;
  onDismiss: () => void;
}> = ({ onRegister, onDismiss }) => {
  return (
    <div className="registration-prompt">
      <div className="prompt-content">
        <h4>💡 Save Your Conversation</h4>
        <p>
          Register to access your chat history anytime and receive personalized
          follow-ups from NBV Group.
        </p>
        <div className="prompt-actions">
          <button onClick={onRegister} className="primary">
            Register Now
          </button>
          <button onClick={onDismiss} className="secondary">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Benefits to Highlight

- ✅ Access chat history from any device
- ✅ Receive personalized follow-ups
- ✅ Get exclusive insights and tips
- ✅ Priority support from NBV team
- ✅ Saves your conversation progress

---

## Error Handling

### API Error Handling

```typescript
const sendMessage = async (content: string) => {
  try {
    const response = await fetch('/shorten/nbv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, sessionId }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to send message.');
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};
```

### User-Friendly Error Messages

```tsx
const ErrorMessage: React.FC<{ error: string; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="error-message-container">
      <div className="error-icon">⚠️</div>
      <div className="error-text">{error}</div>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Retry
        </button>
      )}
    </div>
  );
};
```

### Validation Errors

```typescript
const validateGuestUser = (data: GuestUser): string[] => {
  const errors: string[] = [];

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push('First name is required');
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }

  if (data.firstName && data.firstName.length > 100) {
    errors.push('First name must be less than 100 characters');
  }

  if (data.lastName && data.lastName.length > 100) {
    errors.push('Last name must be less than 100 characters');
  }

  return errors;
};
```

---

## UI/UX Recommendations

### 1. Chat Interface Design

**Key Elements:**
- Clear message bubbles (user vs assistant)
- Timestamps for each message
- Typing indicator when loading
- Smooth scroll to bottom on new messages
- Input field with multiline support
- Send button (disabled when empty/loading)

**Layout Example:**
```
┌─────────────────────────────────────┐
│ NBV Sales Assistant          [Clear]│
│                         [Register]  │
├─────────────────────────────────────┤
│                                     │
│ [Welcome Message]                   │
│                                     │
│     ┌─────────────────────┐         │
│     │ User message        │         │
│     └─────────────────────┘         │
│                                     │
│ ┌─────────────────────┐             │
│ │ Assistant response  │             │
│ └─────────────────────┘             │
│                                     │
│     [Typing...]                     │
│                                     │
├─────────────────────────────────────┤
│ [Text Input Area]        [Send]    │
└─────────────────────────────────────┘
```

### 2. Registration UX

**Trigger Points:**
1. Prominent "Save History" button in header
2. Inline prompt after 3-5 messages
3. Banner at top of chat
4. Exit intent modal

**Form Design:**
- 3 fields only (email, first name, last name)
- Clear validation messages
- "Register" vs "Continue Anonymously" options
- Privacy note about data usage
- Success message after registration

### 3. Loading States

```tsx
const TypingIndicator: React.FC = () => (
  <div className="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
);

// CSS
.typing-indicator span {
  animation: blink 1.4s infinite;
  animation-delay: 0s, 0.2s, 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
```

### 4. Mobile Responsiveness

**Key Considerations:**
- Fixed header with collapse on scroll
- Sticky input at bottom
- Reduced padding on mobile
- Touch-friendly button sizes (min 44x44px)
- Swipe to dismiss modals
- Auto-focus on input (carefully - iOS keyboard)

---

## Admin Dashboard Integration

### Sessions List View

```tsx
import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  sessionId: string;
  botType: string;
  messageCount: number;
  lastMessageAt: string;
  isAnonymous: boolean;
  createdAt: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    isGuest: boolean;
  } | null;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AdminChatHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    isAnonymous: undefined as boolean | undefined,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchSessions();
  }, [page, filters]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (filters.isAnonymous !== undefined) {
        params.append('isAnonymous', filters.isAnonymous.toString());
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await fetch(
        `/admin/chat-history/sessions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getAdminToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch sessions');

      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-chat-history">
      <h1>Chat History</h1>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.isAnonymous?.toString() ?? ''}
          onChange={(e) =>
            setFilters({
              ...filters,
              isAnonymous:
                e.target.value === '' ? undefined : e.target.value === 'true',
            })
          }
        >
          <option value="">All Sessions</option>
          <option value="false">Registered Users</option>
          <option value="true">Anonymous Users</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          placeholder="Start Date"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="End Date"
        />
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Messages</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions?.sessions.map((session) => (
                <tr key={session.id}>
                  <td>{new Date(session.createdAt).toLocaleString()}</td>
                  <td>
                    {session.user ? (
                      <>
                        {session.user.firstName} {session.user.lastName}
                        <br />
                        <small>{session.user.email}</small>
                        {session.user.isGuest && (
                          <span className="badge">Guest</span>
                        )}
                      </>
                    ) : (
                      <span className="anonymous">Anonymous</span>
                    )}
                  </td>
                  <td>{session.messageCount}</td>
                  <td>
                    {session.isAnonymous ? (
                      <span className="badge anonymous">Anonymous</span>
                    ) : (
                      <span className="badge registered">Registered</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => viewSession(session.sessionId)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>
              Page {sessions?.page} of {sessions?.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === sessions?.totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const getAdminToken = (): string => {
  // Retrieve admin token from your auth system
  return localStorage.getItem('admin-token') || '';
};

const viewSession = (sessionId: string) => {
  // Navigate to session detail view
  window.location.href = `/admin/chat-history/${sessionId}`;
};

export default AdminChatHistory;
```

### Session Detail View

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sequenceNumber: number;
  createdAt: string;
}

interface SessionDetails {
  session: {
    id: string;
    sessionId: string;
    botType: string;
    messageCount: number;
    lastMessageAt: string;
    isAnonymous: boolean;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isGuest: boolean;
    } | null;
  };
  messages: Message[];
}

const AdminSessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/admin/chat-history/sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${getAdminToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch session details');

      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching session details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!details) return <div>Session not found</div>;

  return (
    <div className="session-detail">
      {/* Session Metadata */}
      <div className="session-metadata">
        <h1>Session Details</h1>

        <div className="metadata-grid">
          <div>
            <strong>Session ID:</strong> {details.session.sessionId}
          </div>
          <div>
            <strong>Created:</strong>{' '}
            {new Date(details.session.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Last Activity:</strong>{' '}
            {new Date(details.session.lastMessageAt).toLocaleString()}
          </div>
          <div>
            <strong>Message Count:</strong> {details.session.messageCount}
          </div>
          <div>
            <strong>IP Address:</strong> {details.session.ipAddress || 'N/A'}
          </div>
          <div>
            <strong>User Agent:</strong> {details.session.userAgent || 'N/A'}
          </div>
        </div>

        {/* User Info */}
        {details.session.user ? (
          <div className="user-info">
            <h3>User Information</h3>
            <p>
              <strong>Name:</strong> {details.session.user.firstName}{' '}
              {details.session.user.lastName}
            </p>
            <p>
              <strong>Email:</strong> {details.session.user.email}
            </p>
            <p>
              <strong>Type:</strong>{' '}
              {details.session.user.isGuest ? 'Guest User' : 'Registered User'}
            </p>
          </div>
        ) : (
          <div className="user-info">
            <h3>Anonymous Session</h3>
            <p>No user information available</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        <h2>Conversation</h2>
        {details.messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-header">
              <span className="role">{msg.role}</span>
              <span className="timestamp">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={() => window.print()}>Print</button>
        <button onClick={() => exportToCsv(details)}>Export to CSV</button>
        <button onClick={() => window.history.back()}>Back to List</button>
      </div>
    </div>
  );
};

const getAdminToken = (): string => {
  return localStorage.getItem('admin-token') || '';
};

const exportToCsv = (details: SessionDetails) => {
  // Implement CSV export logic
  const csvContent = details.messages
    .map((msg) => `${msg.role},${msg.createdAt},"${msg.content}"`)
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${details.session.sessionId}.csv`;
  a.click();
};

export default AdminSessionDetail;
```

---

## Testing Checklist

### Functional Testing

- [ ] Anonymous chat works without sessionId
- [ ] Session continuity with localStorage
- [ ] Guest registration creates user
- [ ] Welcome email sent to new guests
- [ ] Existing guest users recognized
- [ ] Messages saved to database
- [ ] Admin can view all sessions
- [ ] Admin can filter sessions
- [ ] Admin can view session details
- [ ] Pagination works correctly

### Edge Cases

- [ ] Empty messages rejected
- [ ] Very long messages handled
- [ ] Network errors handled gracefully
- [ ] Invalid email addresses rejected
- [ ] Duplicate registrations handled
- [ ] Session expired scenarios
- [ ] Multiple tabs/devices
- [ ] Browser refresh doesn't lose state

### Security Testing

- [ ] Admin endpoints require authentication
- [ ] Guest users can't access admin endpoints
- [ ] XSS protection (sanitize messages)
- [ ] CSRF protection
- [ ] Rate limiting works
- [ ] Email validation prevents injection

### Performance Testing

- [ ] Chat loads quickly
- [ ] Messages send/receive fast
- [ ] Large conversation histories load
- [ ] Pagination doesn't timeout
- [ ] Mobile performance acceptable

---

## Styling Examples

### Basic CSS

```css
/* Chat Container */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

/* Header */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #4CAF50;
  color: white;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.4;
}

.message.user .message-content {
  background: #4CAF50;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: white;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* Input */
.chat-input {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: white;
  border-top: 1px solid #ddd;
}

.chat-input textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
}

.chat-input button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: blink 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

/* Registration Modal */
.guest-registration-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group input.error {
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }

  .message-content {
    max-width: 85%;
  }

  .chat-header h2 {
    font-size: 1rem;
  }
}
```

---

## Summary

This guide provides everything needed to implement the NBV chat interface with:

✅ **Session Management** - Persistent conversations with UUID tracking
✅ **Guest Registration** - Optional email-based user accounts
✅ **Chat History** - All conversations saved and accessible
✅ **Admin Dashboard** - Full administrative oversight
✅ **Error Handling** - Robust error management
✅ **Mobile Support** - Responsive design patterns
✅ **TypeScript** - Full type safety

### Key Integration Points

1. **Chat API**: `POST /shorten/nbv` with messages array
2. **Session ID**: Auto-generated or provided UUID
3. **Guest User**: Optional object with email and name
4. **Admin API**: Two endpoints for viewing sessions and details

### Next Steps for Frontend Team

1. Choose your framework (React example provided)
2. Implement basic chat UI
3. Add session management with localStorage
4. Create guest registration form
5. Build admin dashboard views
6. Add styling and animations
7. Test all flows thoroughly
8. Deploy and monitor

For questions or clarification, refer to the backend API documentation or contact the backend team.

---

**Document Version:** 1.0
**Last Updated:** February 23, 2026
**Backend API Base URL:** `http://localhost:4000/api` (development)
