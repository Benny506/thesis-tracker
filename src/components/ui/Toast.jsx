import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { hideToast } from '../../store/slices/uiSlice';

const toastConfig = {
  success: {
    icon: FaCheckCircle,
    color: '#198754', // Bootstrap success green
    bgColor: '#d1e7dd',
  },
  error: {
    icon: FaExclamationCircle,
    color: '#dc3545', // Bootstrap danger red
    bgColor: '#f8d7da',
  },
  warning: {
    icon: FaExclamationTriangle,
    color: '#ffc107', // Bootstrap warning yellow
    bgColor: '#fff3cd',
  },
  info: {
    icon: FaInfoCircle,
    color: '#0dcaf0', // Bootstrap info cyan
    bgColor: '#cff4fc',
  },
};

const Toast = () => {
  const dispatch = useDispatch();
  const { isVisible, message, type } = useSelector((state) => state.ui.toast);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 4000); // Auto hide after 4s
      return () => clearTimeout(timer);
    }
  }, [isVisible, dispatch]);

  const config = toastConfig[type] || toastConfig.info;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="position-fixed start-50 translate-middle-x d-flex align-items-center shadow-lg rounded-3 overflow-hidden"
          style={{
            top: '20px',
            zIndex: 10000,
            minWidth: '320px',
            maxWidth: '90vw',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderLeft: `5px solid ${config.color}`,
          }}
        >
          <div className="p-3 d-flex align-items-center flex-grow-1">
            <Icon size={24} color={config.color} className="me-3 flex-shrink-0" />
            <div className="flex-grow-1">
              <p className="mb-0 fw-medium text-dark small" style={{ lineHeight: '1.4' }}>
                {message}
              </p>
            </div>
            <button 
                onClick={() => dispatch(hideToast())}
                className="btn btn-link text-muted p-0 ms-3 d-flex align-items-center"
                style={{ textDecoration: 'none' }}
            >
                <FaTimes size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
