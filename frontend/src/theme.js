import { createTheme } from "@mui/material";
import { designTokens as t } from "./designTokens";
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: t.colors.brand },
    secondary: { main: t.colors.blue },
    success: { main: t.colors.green },
    error: { main: t.colors.red },
    background: { default: t.colors.background, paper: t.colors.surface },
    text: { primary: t.colors.ink, secondary: t.colors.muted },
    divider: t.colors.border,
  },
  typography: {
    fontFamily: t.font,
    fontSize: 14,
    button: { textTransform: "none", fontWeight: 600 },
    h1: { fontSize: 24, fontWeight: 650 },
    h2: { fontSize: 18, fontWeight: 650 },
  },
  shape: { borderRadius: t.radius.control },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: 13,
          padding: "8px 16px",
          "@media(max-width:767px)": { minHeight: 44, fontSize: 14 },
        },
        outlined: {
          borderColor: t.colors.border,
          color: t.colors.ink,
          background: t.colors.surface,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          width: 40,
          height: 40,
          color: t.colors.muted,
          "@media(max-width:767px)": { width: 44, height: 44 },
        },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: t.colors.surface,
          fontSize: 14,
          minHeight: 44,
          "& fieldset": { borderColor: "#DAE1EC" },
          "&:hover fieldset": { borderColor: "#A9B7CB" },
          "@media(max-width:767px)": { minHeight: 48, fontSize: 16 },
        },
        input: { padding: "12px 14px" },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 14 } } },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, fontSize: 12 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(24,35,56,.15)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: 18,
          fontWeight: 650,
          borderBottom: `1px solid ${t.colors.border}`,
          padding: "20px 24px",
        },
      },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: 24 } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
          borderTop: `1px solid ${t.colors.border}`,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "@media(max-width:767px)": {
            bottom: "calc(148px + env(safe-area-inset-bottom))",
          },
        },
      },
    },
  },
});
