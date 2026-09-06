import React from 'react';

export interface StatusItem {
  id: string;
  name: string;
  time: string;
  preview?: string;
  viewed?: boolean;
  avatarUrl?: string | null;
}

export interface StatusProps {
  items?: StatusItem[];
  onCreate?: () => void;
  onOpen?: (status: StatusItem) => void;
  className?: string;
}

export const Status: React.FC<StatusProps> = ({ items = [], onCreate, onOpen, className = '' }) => (
  <section className={`status-screen ${className}`} aria-label="Status updates">
    <header className="status-screen-header">
      <div>
        <span className="eyebrow-label">Updates</span>
        <h2>Status</h2>
      </div>
      {onCreate && <button type="button" className="status-create" onClick={onCreate} aria-label="Add status">＋</button>}
    </header>
    <button type="button" className="my-status-row" onClick={onCreate}>
      <span className="status-avatar status-avatar-own">＋</span>
      <span><strong>My status</strong><small>Add a text, photo, or video update</small></span>
    </button>
    <div className="status-list" role="list">
      {items.length === 0 && <p className="empty">No recent status updates.</p>}
      {items.map((status) => (
        <button type="button" className={`status-row ${status.viewed ? 'viewed' : ''}`} key={status.id} onClick={() => onOpen?.(status)} role="listitem">
          <span className="status-avatar">{status.avatarUrl ? <img src={status.avatarUrl} alt="" /> : status.name.charAt(0).toUpperCase()}</span>
          <span><strong>{status.name}</strong><small>{status.time}{status.preview ? ` · ${status.preview}` : ''}</small></span>
        </button>
      ))}
    </div>
  </section>
);

export default Status;
