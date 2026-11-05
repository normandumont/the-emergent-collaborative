import type { License } from "../shared/article-schema.js";
import {
  children,
  descendants,
  text,
  value,
  type XmlNode,
} from "../shared/xml.js";

export interface LicenseDecision {
  license: License | null;
  reuseAllowed: boolean;
  reason: string | null;
}

function canonicalLicense(url: string): { id: string; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.hostname !== "creativecommons.org" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  )
    return null;
  const by = parsed.pathname.match(
    /^\/licenses\/by\/(1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/,
  );
  if (by)
    return {
      id: `CC-BY-${by[1]}`,
      url: `https://creativecommons.org/licenses/by/${by[1]}/`,
    };
  if (/^\/publicdomain\/zero\/1\.0\/?$/.test(parsed.pathname))
    return {
      id: "CC0-1.0",
      url: "https://creativecommons.org/publicdomain/zero/1.0/",
    };
  return null;
}

export function decideLicense(
  article: XmlNode,
  sets: string[],
  evidenceUrl: string,
): LicenseDecision {
  const permissions = descendants(article, "permissions");
  const licenses = permissions.flatMap((node) => children(node, "license"));
  const urls = [
    ...new Set(
      licenses.flatMap((node) => [
        ...(node.attributes["href"] ? [node.attributes["href"]] : []),
        ...descendants(node, "license_ref")
          .map(value)
          .filter((item): item is string => item !== null),
        ...descendants(node, "ext-link")
          .map((link) => link.attributes["href"])
          .filter((item): item is string => !!item),
      ]),
    ),
  ];
  const statement = licenses
    .map(text)
    .map((item) => item.trim())
    .join("\n");
  const copyright =
    permissions
      .flatMap((node) => descendants(node, "copyright-statement"))
      .map(value)
      .filter(Boolean)
      .join("\n") || null;
  const recognized = urls.map(canonicalLicense);
  const unique = [
    ...new Set(
      recognized.filter((item) => item !== null).map((item) => item.id),
    ),
  ];
  const recognizedLicense =
    unique.length === 1 ? recognized.find((item) => item !== null) : null;
  const license: License | null = licenses.length
    ? {
        id: recognizedLicense?.id ?? null,
        url:
          urls.length === 1
            ? (urls[0] ?? null)
            : (recognizedLicense?.url ?? null),
        urls,
        statement,
        copyright,
        evidenceUrl,
      }
    : null;
  if (!sets.includes("pmc-open"))
    return { license, reuseAllowed: false, reason: "not-in-pmc-open-dataset" };
  if (!licenses.length || !urls.length)
    return {
      license,
      reuseAllowed: false,
      reason: "missing-explicit-license-url",
    };
  if (
    recognized.some((item) => item === null) ||
    unique.length !== 1 ||
    /\b(?:non[- ]?commercial|no derivatives|no[- ]?derivatives|all rights reserved|permission required|share[- ]?alike)\b/i.test(
      `${statement}\n${copyright ?? ""}`,
    )
  ) {
    return {
      license,
      reuseAllowed: false,
      reason: "unsupported-or-conflicting-license",
    };
  }
  return { license, reuseAllowed: true, reason: null };
}
