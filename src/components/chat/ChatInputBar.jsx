import { useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';

const ChatInputBar = ({
  disabled,
  onSend,
  onTypingChange,
  onUploadFile,
  onStartRecording,
  onStopRecording,
  isRecording,
}) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const emitTyping = (isTyping) => {
    if (typeof onTypingChange !== 'function') return;
    onTypingChange(isTyping);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ body: trimmed, type: 'text' });
    setText('');
    emitTyping(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    await onUploadFile(file);
  };

  return (
    <Form onSubmit={handleSubmit} className="d-flex align-items-center gap-2 p-2 border-top bg-white">
      <Form.Control
        as="textarea"
        rows={1}
        className="flex-grow-1"
        placeholder="Type a message..."
        value={text}
        onChange={handleChange}
        disabled={disabled}
        style={{ resize: 'none', maxHeight: '120px' }}
      />
      <Form.Label className="btn btn-outline-secondary mb-0">
        📎
        <Form.Control type="file" className="d-none" onChange={handleFileChange} disabled={disabled} />
      </Form.Label>
      <Button
        variant={isRecording ? 'danger' : 'outline-secondary'}
        type="button"
        disabled={disabled}
        onClick={isRecording ? onStopRecording : onStartRecording}
      >
        {isRecording ? 'Stop' : '🎤'}
      </Button>
      <Button type="submit" disabled={disabled || !text.trim()} variant="warning">
        Send
      </Button>
    </Form>
  );
};

export default ChatInputBar;

