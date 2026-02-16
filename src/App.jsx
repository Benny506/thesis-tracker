import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';
import GlobalLoader from './components/ui/GlobalLoader';
import Toast from './components/ui/Toast';

function App() {
  return (
    <HashRouter>
      <GlobalLoader />
      <Toast />
      <AuthProvider>
        <ChatProvider>
          <AppRoutes />
        </ChatProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
