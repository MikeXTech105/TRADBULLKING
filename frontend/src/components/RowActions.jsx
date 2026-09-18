import { useState } from "react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { MoreHorizontal } from "lucide-react";
export default function RowActions({ name, actions }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <div className="row-actions">
      <IconButton
        aria-label={`Actions for ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreHorizontal size={18} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            sx={action.danger ? { color: "error.main" } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setAnchor(null);
              action.onClick();
            }}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
