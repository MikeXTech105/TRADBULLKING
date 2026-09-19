import LegalDocument from "./LegalDocument";
import { privacySections } from "../../content/legalContent";
import { PRIVACY_LAST_UPDATED, PRIVACY_VERSION } from "../../config/platform";

export default function Privacy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      version={PRIVACY_VERSION}
      lastUpdated={PRIVACY_LAST_UPDATED}
      sections={privacySections}
    />
  );
}
