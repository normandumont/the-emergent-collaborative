import { XMLParser } from "fast-xml-parser";
import { SyntaxValidator } from "fast-xml-validator";
import { object } from "./config.js";
import { RagError } from "./logging.js";

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: (XmlNode | string)[];
}
const localName = (name: string) => name.split(":").at(-1) ?? name;

export function parseXml(xml: string): XmlNode {
  // External DTDs are not resolved. Internal entity definitions are rejected.
  if (/<!ENTITY/i.test(xml))
    throw new RagError(
      "malformed-source",
      "Internal XML entities are not permitted.",
    );
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: false,
    parseTagValue: false,
  });
  let parsed: unknown;
  try {
    SyntaxValidator.validate(xml);
    parsed = parser.parse(xml) as unknown;
  } catch {
    throw new RagError("malformed-source", "Cannot parse source XML.");
  }
  function nodes(value: unknown): (XmlNode | string)[] {
    if (!Array.isArray(value))
      throw new RagError("malformed-source", "Unexpected XML structure.");
    const result: (XmlNode | string)[] = [];
    for (const item of value as unknown[]) {
      if (!object(item))
        throw new RagError("malformed-source", "Unexpected XML node.");
      if (typeof item["#text"] === "string") {
        result.push(item["#text"]);
        continue;
      }
      for (const [name, children] of Object.entries(item)) {
        if (name === ":@" || name.startsWith("?") || name.startsWith("#"))
          continue;
        const attributes: Record<string, string> = {};
        if (object(item[":@"]))
          for (const [key, val] of Object.entries(item[":@"]))
            attributes[localName(key)] = String(val);
        result.push({
          name: localName(name),
          attributes,
          children: nodes(children),
        });
      }
    }
    return result;
  }
  const roots = nodes(parsed).filter(
    (item): item is XmlNode => typeof item !== "string",
  );
  if (roots.length !== 1 || !roots[0])
    throw new RagError("malformed-source", "Expected one XML document root.");
  return roots[0];
}
export function children(node: XmlNode | undefined, name?: string): XmlNode[] {
  return (
    node?.children.filter(
      (item): item is XmlNode =>
        typeof item !== "string" && (!name || item.name === name),
    ) ?? []
  );
}
export function child(
  node: XmlNode | undefined,
  name: string,
): XmlNode | undefined {
  return children(node, name)[0];
}
export function descendants(
  node: XmlNode | undefined,
  name: string,
): XmlNode[] {
  return children(node).flatMap((item) => [
    ...(item.name === name ? [item] : []),
    ...descendants(item, name),
  ]);
}
export function text(node: XmlNode | undefined): string {
  return (
    node?.children
      .map((item) => (typeof item === "string" ? item : text(item)))
      .join("") ?? ""
  );
}
export function value(node: XmlNode | undefined): string | null {
  return text(node).trim() || null;
}
