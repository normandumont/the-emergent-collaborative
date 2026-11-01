export const siteName = "Meridian Station";
export const headline =
  "Finding direction through evidence, experience, and emerging technology.";
export const definition =
  "Meridian Station is a research and technology initiative exploring how scientific evidence, personal experience over time, and emerging technology can help people understand complex health questions—beginning with Parkinson’s disease.";

export const contactEmail = "contact@meridianstation.org";
export const approvedCopy = {
  contactExpectation:
    "Messages are reviewed by the founder of Meridian Station. We aim to respond to project-related inquiries within 5–7 business days.",
  publicationResponsibility:
    "Publication responsibility: Norman Dumont, Founder, Meridian Station",
  materialRelationships: "Material relationships: None currently disclosed.",
  responsibleOperator:
    "Responsible operator: Norman Dumont, Founder, Meridian Station",
  authorizedRecipient:
    "Authorized recipient: Norman Dumont, Founder, Meridian Station",
  correspondencePurposes:
    "Correspondence may be used to respond to project questions, collaboration inquiries, feedback, and correction requests.",
  emailPolicy:
    "Email sent to contact@meridianstation.org is routed through Cloudflare Email Routing to the founder’s designated mailbox. Messages are retained only as long as reasonably necessary to respond, maintain project correspondence, resolve corrections, or meet legitimate recordkeeping needs. Messages may also remain temporarily in provider backups or logs outside Meridian Station’s direct control. Requests to delete correspondence will be honored where reasonably possible, subject to technical, legal, and backup limitations.",
  requestPolicy:
    "Questions about information handling, correction requests, or deletion requests may be sent to contact@meridianstation.org. Meridian Station will make reasonable efforts to respond within 5–7 business days. Requests will be handled to the extent reasonably possible, subject to legal obligations, provider-controlled backups, security logs, and other technical limitations outside Meridian Station’s direct control.",
  futureCapabilities:
    "Meridian Station is actively defining and developing a technology direction that includes AI-assisted research exploration and longitudinal-data tools. Some underlying concepts and prototypes began with the Ride for Parkinson’s project, while the broader Meridian Station platform remains under development. These capabilities are not currently offered as clinical, diagnostic, or treatment services.",
} as const;

export const primaryNavigation = [
  { label: "Our approach", href: "/#our-approach" },
  { label: "Parkinson's initiative", href: "/#parkinsons-initiative" },
  { label: "Current work", href: "/#current-work" },
  { label: "Collaborate", href: "/#collaborate" },
] as const;

export const secondaryNavigation = [
  { label: "Why change over time", href: "#why-change" },
  { label: "Our approach", href: "#our-approach" },
  { label: "Parkinson's initiative", href: "#parkinsons-initiative" },
  { label: "Origin", href: "#origin" },
  { label: "Current work", href: "#current-work" },
  { label: "Collaborate", href: "#collaborate" },
  { label: "Sources", href: "#sources" },
] as const;

export const placeholders = {
  "PH-04": "[PUBLIC CONTENT REVIEW DATE — NOT YET SET]",
  "PH-10":
    "[ACTUAL DELIVERY/SECURITY LOG FIELDS, PURPOSES, RECIPIENTS, STORAGE/COOKIES AND RETENTION — PENDING]",
  "PH-11":
    "[THIRD-PARTY AND APPLICABLE INTERNATIONAL-PROCESSING DISCLOSURES — PENDING]",
  "PH-13": "[PRIVACY NOTICE EFFECTIVE DATE — NOT YET SET]",
  "PH-14": "[PRIVACY NOTICE REVIEW DATE — NOT YET SET]",
} as const;

export type PlaceholderId = keyof typeof placeholders;
