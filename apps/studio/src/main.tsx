import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles.css';
import { App } from './App';
import { SecurityContextProvider } from './modules/auth/SecurityContextProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SecurityContextProvider>
      <App />
    </SecurityContextProvider>
  </BrowserRouter>,
);
