import LegalDocument from "./LegalDocument";
import { termsSections } from "../../content/legalContent";
import { TERMS_LAST_UPDATED, TERMS_VERSION } from "../../config/platform";

export default function Terms() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      version={TERMS_VERSION}
      lastUpdated={TERMS_LAST_UPDATED}
      sections={termsSections}
    />
  );
}
