import { motion } from 'framer-motion';
import { Button, Spinner } from 'react-bootstrap';

const ChatMessageBubble = ({
  message,
  isOwn,
  onRetry,
  onDelete,
}) => {
  const { body, type, status, created_at, attachment_url, attachment_mime } = message;

  const timeLabel = created_at
    ? new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const renderStatusIcon = () => {
    if (status === 'pending') {
      return <Spinner animation="border" size="sm" />;
    }
    if (status === 'failed') {
      return (
        <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => onRetry(message)}>
          Retry
        </Button>
      );
    }
    if (status === 'sent') {
      return <span className="text-muted small">Sent</span>;
    }
    if (status === 'delivered') {
      return <span className="text-muted small">Delivered</span>;
    }
    if (status === 'read') {
      return <span className="text-primary small">Read</span>;
    }
    return null;
  };

  const renderAttachment = () => {
    if (!attachment_url) return null;
    if (type === 'image') {
      return (
        <img
          src={attachment_url}
          alt={body || 'Image'}
          className="rounded mb-1"
          style={{ maxWidth: '240px', maxHeight: '240px', objectFit: 'cover' }}
        />
      );
    }
    if (type === 'video') {
      return (
        <video
          src={attachment_url}
          controls
          className="rounded mb-1"
          style={{ maxWidth: '260px', maxHeight: '260px' }}
        />
      );
    }
    if (type === 'audio') {
      return (
        <audio src={attachment_url} controls className="w-100 mb-1" />
      );
    }
    if (type === 'document') {
      return (
        <a href={attachment_url} target="_blank" rel="noreferrer" className="d-inline-flex align-items-center mb-1">
          <span className="me-2">📄</span>
          <span className="text-truncate" style={{ maxWidth: '200px' }}>
            {attachment_mime || 'Document'}
          </span>
        </a>
      );
    }
    return null;
  };

  return (
    <div className={`d-flex mb-2 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-2 rounded-3 shadow-sm ${isOwn ? 'bg-warning text-dark' : 'bg-light'}`}
        style={{ maxWidth: '80%', borderRadius: isOwn ? '16px 16px 0 16px' : '16px 16px 16px 0' }}
      >
        {renderAttachment()}
        {body && <div className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{body}</div>}
        <div className="d-flex justify-content-between align-items-center gap-2 small text-muted">
          <span>{timeLabel}</span>
          <div className="d-flex align-items-center gap-2">
            {renderStatusIcon()}
            {!message.deleted_at && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted"
                onClick={() => onDelete(message)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatMessageBubble;

