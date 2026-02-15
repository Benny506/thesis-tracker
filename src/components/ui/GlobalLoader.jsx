import React from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../common/Logo';

const GlobalLoader = () => {
  const { isVisible, message } = useSelector((state) => state.ui.loading);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="p-5 rounded-circle shadow-lg d-flex flex-column align-items-center justify-content-center position-relative"
            style={{
              width: '180px',
              height: '180px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(184, 134, 11, 0.2)', // Subtle gold border
            }}
          >
             {/* Spinning Gold Ring */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#B8860B', // Dark Golden Rod
                borderRightColor: '#B8860B',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Counter-Spinning Inner Ring */}
             <motion.div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                bottom: '10px',
                borderRadius: '50%',
                border: '3px solid transparent',
                borderBottomColor: '#DAA520', // Golden Rod
                borderLeftColor: '#DAA520',
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            <div className="mb-2 z-1">
                <Logo size={45} />
            </div>
            
            {message && (
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-secondary small fw-bold mb-0 text-uppercase position-absolute"
                    style={{ bottom: '-40px', letterSpacing: '2px', width: '300px', textAlign: 'center' }}
                >
                    {message}
                </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoader;
