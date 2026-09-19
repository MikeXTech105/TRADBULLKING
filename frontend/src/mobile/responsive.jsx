import { useMediaQuery } from "@mui/material";

export const MOBILE_QUERY = "(max-width: 767px)";

// Renders the mobile screen on phones and the existing desktop page everywhere else.
export function responsive(Desktop, Mobile) {
  return function ResponsivePage() {
    const mobile = useMediaQuery(MOBILE_QUERY, { noSsr: true });
    return mobile ? <Mobile /> : <Desktop />;
  };
}
