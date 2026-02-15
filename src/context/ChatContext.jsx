import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { showToast } from '../store/slices/uiSlice';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingStatus, setTypingStatus] = useState({});
  const [connected, setConnected] = useState(false);

  const channelRef = useRef(null);
  const retryRef = useRef({ attempt: 0, timer: null });

  const currentUserId = user?.id || null;

  const clearRetryTimer = () => {
    if (retryRef.current.timer) {
      clearTimeout(retryRef.current.timer);
      retryRef.current.timer = null;
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      dispatch(
        showToast({
          message: err.message || 'Failed to load chat messages',
          type: 'error',
        })
      );
    }
  }, [currentUserId, dispatch]);

  const handlePresenceSync = useCallback((channel) => {
    const state = channel.presenceState();
    const ids = Object.keys(state);
    setOnlineUserIds(ids);
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearRetryTimer();
    retryRef.current.attempt += 1;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(retryRef.current.attempt, 5));
    retryRef.current.timer = setTimeout(() => {
      setupChannel();
    }, delay);
  }, []);

  const handleInsertMessage = useCallback(
    (row) => {
      if (!currentUserId) return;
      if (row.sender_id !== currentUserId && row.receiver_id !== currentUserId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        if (row.client_id) {
          const withoutClient = prev.filter(
            (m) => !(m.client_id && m.client_id === row.client_id)
          );
          return [...withoutClient, row];
        }
        return [...prev, row];
      });
    },
    [currentUserId]
  );

  const handleUpdateMessage = useCallback((row) => {
    setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
  }, []);

  const setupChannel = useCallback(() => {
    if (!currentUserId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('chat-room', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        handlePresenceSync(channel);
      })
      .on('presence', { event: 'join' }, () => {
        handlePresenceSync(channel);
      })
      .on('presence', { event: 'leave' }, () => {
        handlePresenceSync(channel);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { from, to, isTyping } = payload.payload || {};
        if (!to || !from) return;
        if (to !== currentUserId) return;
        setTypingStatus((prev) => ({
          ...prev,
          [from]: !!isTyping,
        }));
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          handleInsertMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          handleUpdateMessage(payload.new);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          retryRef.current.attempt = 0;
          clearRetryTimer();
          await channel.track({ user_id: currentUserId });
          await fetchMessages();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnected(false);
          scheduleReconnect();
        }
      });
  }, [currentUserId, fetchMessages, handleInsertMessage, handleUpdateMessage, handlePresenceSync, scheduleReconnect]);

  useEffect(() => {
    if (!currentUserId) return;
    fetchMessages();
    setupChannel();
    return () => {
      clearRetryTimer();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, fetchMessages, setupChannel]);

  const sendMessage = useCallback(
    async ({ receiverId, body, type = 'text', attachment, suppressToast = false }) => {
      if (!currentUserId || !receiverId) return;
      const clientId = crypto.randomUUID();
      const optimistic = {
        id: clientId,
        client_id: clientId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        body,
        type,
        status: 'pending',
        attachment_url: attachment?.url || null,
        attachment_mime: attachment?.mime || null,
        attachment_size_bytes: attachment?.size || null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            client_id: clientId,
            sender_id: currentUserId,
            receiver_id: receiverId,
            body,
            type,
            status: 'sent',
            attachment_url: optimistic.attachment_url,
            attachment_mime: optimistic.attachment_mime,
            attachment_size_bytes: optimistic.attachment_size_bytes,
          })
          .select('*')
          .single();
        if (error) throw error;
        setMessages((prev) =>
          prev.map((m) => (m.client_id === clientId ? data : m))
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.client_id === clientId ? { ...m, status: 'failed' } : m
          )
        );
        if (!suppressToast) {
          dispatch(
            showToast({
              message: err.message || 'Failed to send message',
              type: 'error',
            })
          );
        }
      }
    },
    [currentUserId, dispatch]
  );

  const retryMessage = useCallback(
    async (message) => {
      if (!message) return;
      await sendMessage({
        receiverId: message.receiver_id,
        body: message.body,
        type: message.type,
        suppressToast: true,
        attachment: message.attachment_url
          ? {
              url: message.attachment_url,
              mime: message.attachment_mime,
              size: message.attachment_size_bytes,
            }
          : null,
      });
    },
    [sendMessage]
  );

  const deleteMessage = useCallback(
    async (message) => {
      if (!message?.id) return;
      const now = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, deleted_at: now } : m))
      );
      try {
        const { error } = await supabase
          .from('messages')
          .update({ deleted_at: now })
          .eq('id', message.id);
        if (error) throw error;
      } catch (err) {
        dispatch(
          showToast({
            message: err.message || 'Failed to delete message',
            type: 'error',
          })
        );
      }
    },
    [dispatch]
  );

  const sendTyping = useCallback(
    (peerUserId, isTyping) => {
      if (!currentUserId || !peerUserId) return;
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { from: currentUserId, to: peerUserId, isTyping },
      });
    },
    [currentUserId]
  );

  const markReadForPeer = useCallback(
    async (peerUserId) => {
      if (!currentUserId || !peerUserId) return;
      try {
        const { error } = await supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('receiver_id', currentUserId)
          .eq('sender_id', peerUserId)
          .neq('status', 'read');
        if (error) throw error;
      } catch (err) {
        dispatch(
          showToast({
            message: err.message || 'Failed to mark messages as read',
            type: 'error',
          })
        );
      }
    },
    [currentUserId, dispatch]
  );

  const value = {
    messages,
    sendMessage,
    deleteMessage,
    retryMessage,
    onlineStatus: {
      connected,
      onlineUserIds,
      isUserOnline: (userId) => onlineUserIds.includes(userId),
    },
    typingStatus,
    sendTyping,
    markReadForPeer,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => useContext(ChatContext);

export default ChatContext;
