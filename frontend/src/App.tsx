import { useState, useEffect } from 'react';
import { 
  Send, 
  Search, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock3,
  Mail,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import './index.css';

interface Email {
  id: number;
  to: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
    scheduledAt: ''
  });

  const fetchEmails = async (query = '') => {
    try {
      const url = query 
        ? `${API_URL}/emails/search?q=${encodeURIComponent(query)}`
        : `${API_URL}/emails`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmails(data);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(() => fetchEmails(searchQuery), 5000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ to: '', subject: '', body: '', scheduledAt: '' });
        fetchEmails();
        showToast('Email scheduled successfully', 'success');
      } else {
        showToast('Failed to schedule email', 'error');
      }
    } catch (error) {
      console.error('Error scheduling email:', error);
      showToast('Connection error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all history?')) return;
    try {
      const res = await fetch(`${API_URL}/emails`, { method: 'DELETE' });
      if (res.ok) {
        showToast('History cleared successfully', 'success');
        fetchEmails();
      } else {
        showToast('Failed to clear history', 'error');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      showToast('Connection error', 'error');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchEmails(val);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'sent': return <CheckCircle2 size={14} />;
      case 'failed': return <XCircle size={14} />;
      default: return <Clock3 size={14} />;
    }
  };

  return (
    <div className="layout">
      {toast && (
        <div className="toast">
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#2ed573" /> : <XCircle size={18} color="#ff4757" />}
          {toast.message}
        </div>
      )}

      <header className="header">
        <h1>
          <img src="/logo.png" alt="Logo" style={{ width: '40px', height: 'auto', objectFit: 'contain' }} />
          Email Scheduler
        </h1>
        <p>High-performance transactional email delivery system</p>
      </header>

      <main className="main-grid">
        {/* Schedule Form */}
        <section className="panel">
          <div className="panel-header">
            <Send size={18} />
            New Campaign
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field">
              <label>Recipient Email</label>
              <input 
                type="email" 
                className="form-input"
                required 
                placeholder="jane@company.com"
                value={formData.to}
                onChange={e => setFormData({...formData, to: e.target.value})}
              />
            </div>
            
            <div className="form-field">
              <label>Subject</label>
              <input 
                type="text" 
                className="form-input"
                required 
                placeholder="Your weekly summary"
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Message Body</label>
              <textarea 
                className="form-input"
                required 
                placeholder="Write your email content here..."
                value={formData.body}
                onChange={e => setFormData({...formData, body: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Schedule Time (Local)</label>
              <input 
                type="datetime-local" 
                className="form-input"
                required 
                value={formData.scheduledAt}
                onChange={e => setFormData({...formData, scheduledAt: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Delivery'}
              {!isSubmitting && <Send size={16} />}
            </button>
          </form>
        </section>

        {/* Email List & Search */}
        <section className="panel" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="search-bar-wrapper">
              <div className="search-container">
                <Search className="search-icon" />
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Search across all emails via Elasticsearch..." 
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              <button className="btn-danger" onClick={handleClearHistory} title="Clear History">
                <Trash2 size={18} />
                Clear
              </button>
            </div>
          </div>

          <div style={{ padding: '1.5rem', paddingTop: '0.5rem' }}>
            <div className="email-list">
              {emails.length === 0 ? (
                <div className="empty-state">
                  <Search size={32} opacity={0.5} />
                  <p>No emails found.</p>
                </div>
              ) : (
                emails.map(email => (
                  <div key={email.id} className="email-card">
                    <div className="email-card-header">
                      <span className="email-card-subject">{email.subject}</span>
                      <span className={`badge ${email.status}`}>
                        {getStatusIcon(email.status)}
                        {email.status}
                      </span>
                    </div>
                    <div className="email-card-to">
                      <Mail size={14} />
                      {email.to}
                    </div>
                    <div className="email-card-footer">
                      <Calendar size={13} />
                      {format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
