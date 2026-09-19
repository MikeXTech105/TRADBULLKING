import { useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { ChevronDown, ExternalLink, Radio } from "lucide-react";

const channels = [
  { name: "Zee Business", language: "Hindi", handle: "zeebusiness" },
  { name: "CNBC Awaaz", language: "Hindi", handle: "cnbcawaaz" },
  { name: "CNBC-TV18", language: "English", handle: "CNBC-TV18" },
  { name: "ET NOW", language: "English", handle: "ETNow" },
  { name: "NDTV Profit", language: "English", handle: "ndtvprofitindia" },
];

export default function LiveNewsMenu() {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button
        id="live-news-button"
        className="live-news-button"
        variant="outlined"
        startIcon={<Radio size={16} />}
        endIcon={<ChevronDown size={14} />}
        aria-haspopup="menu"
        aria-controls={anchor ? "live-news-menu" : undefined}
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Live News
      </Button>
      <Menu
        id="live-news-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { "aria-labelledby": "live-news-button" } }}
      >
        {channels.map((channel) => (
          <MenuItem
            key={channel.handle}
            className="live-news-channel"
            component="a"
            href={`https://www.youtube.com/@${channel.handle}/live`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAnchor(null)}
          >
            <span>
              <strong>{channel.name}</strong>
              <small>{channel.language}</small>
            </span>
            <ExternalLink size={15} aria-hidden="true" />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
