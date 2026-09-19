import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import App from "./App";
import { theme } from "./theme";
import { cssVariables } from "./designTokens";
import "./index.css";
import "./mobile.css";
import { Provider } from "react-redux";
import { store } from "./store/store";
import ToastProvider from "./components/ToastProvider";

Object.entries(cssVariables).forEach(([key, value]) =>
  document.documentElement.style.setProperty(key, value),
);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
