import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';
import GlobalLoader from './components/ui/GlobalLoader';
import Toast from './components/ui/Toast';

function App() {
  return (
    <BrowserRouter>
      <GlobalLoader />
      <Toast />
      <AuthProvider>
        <ChatProvider>
          <AppRoutes />
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
