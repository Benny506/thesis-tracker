import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import useChat from '../../hooks/useChat';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInputBar from './ChatInputBar';

const OneToOneChat = ({ peerUserId, peerLabel }) => {
  const { user } = useAuth();
  const { messages, sendMessage, deleteMessage, retryMessage, onlineStatus, typingStatus, sendTyping, markReadForPeer } =
    useChat();

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);

  const currentUserId = user?.id;

  const filteredMessages = messages.filter(
    (m) =>
      (m.sender_id === currentUserId && m.receiver_id === peerUserId) ||
      (m.sender_id === peerUserId && m.receiver_id === currentUserId)
  );

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [filteredMessages.length]);

  useEffect(() => {
    if (!currentUserId || !peerUserId) return;
    markReadForPeer(peerUserId);
  }, [currentUserId, peerUserId, markReadForPeer, filteredMessages.length]);

  const handleTypingChange = (isTyping) => {
    if (!peerUserId) return;
    sendTyping(peerUserId, isTyping);
  };

  const uploadToStorage = async (file) => {
    const ext = file.name.split('.').pop();
    const path = `chat/${currentUserId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat_media').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('chat_media').getPublicUrl(path);
    return { url: data.publicUrl, mime: file.type, size: file.size };
  };

  const handleSend = async ({ body, type }) => {
    if (!peerUserId) return;
    await sendMessage({ receiverId: peerUserId, body, type });
  };

  const handleUploadFile = async (file) => {
    if (!peerUserId) return;
    const mime = file.type || '';
    let type = 'document';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime.startsWith('video/')) type = 'video';
    else if (mime.startsWith('audio/')) type = 'audio';
    const fileMeta = await uploadToStorage(file);
    await sendMessage({
      receiverId: peerUserId,
      body: '',
      type,
      attachment: fileMeta,
    });
  };

  const handleRetry = (msg) => {
    retryMessage(msg);
  };

  const handleDelete = (msg) => {
    deleteMessage(msg);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const meta = await uploadToStorage(file);
        await sendMessage({
          receiverId: peerUserId,
          body: '',
          type: 'audio',
          attachment: meta,
        });
        setRecording(false);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  };

  if (!currentUserId || !peerUserId) {
    return <Alert variant="warning">Chat unavailable.</Alert>;
  }

  const isPeerOnline = onlineStatus.isUserOnline(peerUserId);
  const typingByPeer = !!typingStatus[peerUserId];

  return (
    <div className="d-flex flex-column h-100 border rounded bg-white">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <div>
          <div className="fw-semibold">{peerLabel || 'Chat'}</div>
          <div className="small text-muted">
            {isPeerOnline ? (
              <>
                <span className="text-success me-1">●</span>Online
              </>
            ) : (
              <>
                <span className="text-secondary me-1">●</span>Offline
              </>
            )}
          </div>
        </div>
        {typingByPeer && (
          <Badge bg="warning" text="dark">
            Typing...
          </Badge>
        )}
      </div>

      <div className="flex-grow-1 overflow-auto p-2" style={{ background: '#f8f9fa' }}>
        {filteredMessages.length === 0 && (
          <div className="text-center text-muted small py-3">No messages yet.</div>
        )}
        {filteredMessages
          .filter((m) => !m.deleted_at)
          .map((m) => (
            <ChatMessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUserId}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))}
        <div ref={bottomRef} />
      </div>

      <ChatInputBar
        disabled={false}
        onSend={handleSend}
        onTypingChange={handleTypingChange}
        onUploadFile={handleUploadFile}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={recording}
      />
    </div>
  );
};

export default OneToOneChat;
