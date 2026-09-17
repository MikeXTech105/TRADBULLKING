import { useState } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordField({ error, helperText, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      error={Boolean(error)}
      helperText={helperText || error}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={`${visible ? "Hide" : "Show"} ${props.label?.toLowerCase() || "password"}`}
                onClick={() => setVisible(!visible)}
                edge="end"
              >
                <span className="eye-icon">
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </span>
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
