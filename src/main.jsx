// import { StrictMode, createContext, useContext, useEffect, useMemo, useState } from 'react';
// import { createRoot } from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
// import App from './App.jsx';
// import './index.css';

// const ThemeContext = createContext({
//   theme: 'light',
//   toggleTheme: () => {},
// });

// export function useTheme() {
//   return useContext(ThemeContext);
// }

// function ThemeProvider({ children }) {
//   const [theme, setTheme] = useState(() => {
//     const saved = localStorage.getItem('secure-sms-theme');
//     if (saved === 'light' || saved === 'dark') return saved;
//     return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
//   });

//   useEffect(() => {
//     document.documentElement.classList.toggle('dark', theme === 'dark');
//     localStorage.setItem('secure-sms-theme', theme);
//   }, [theme]);

//   const value = useMemo(
//     () => ({
//       theme,
//       toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
//     }),
//     [theme]
//   );

//   return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
// }

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <ThemeProvider>
//       <BrowserRouter>
//         <App />
//       </BrowserRouter>
//     </ThemeProvider>
//   </StrictMode>
// );




import { StrictMode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('secure-sms-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('secure-sms-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const container = document.getElementById('root');

// রুট ইনস্ট্যান্স ক্যাশ করা যাতে createRoot একাধিকবার কল না হয়
if (!container._reactRoot) {
  container._reactRoot = createRoot(container);
}

container._reactRoot.render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);