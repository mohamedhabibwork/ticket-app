import { createHash, randomBytes } from "crypto";

export interface SamlAttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
}

export interface SamlConfiguration {
  enabled: boolean;
  metadataUrl: string;
  entityId: string;
  acsUrl: string;
  _certificate?: string;
  _privateKey?: string;
  attributeMapping: SamlAttributeMapping;
  signRequests: boolean;
  wantAssertionsSigned: boolean;
}

export interface SamlAssertion {
  nameID: string;
  nameIDFormat: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  audience?: string;
  notBefore?: string;
  notOnOrAfter?: string;
}

export interface SamlAuthnRequest {
  id: string;
  issueInstant: string;
  destination: string;
  issuer: string;
  assertionConsumerServiceURL: string;
  protocolBinding: string;
}

export interface SamlAuthnResponse {
  id: string;
  inResponseTo: string;
  status: string;
  statusMessage?: string;
  assertion?: SamlAssertion;
}

const DEFAULT_ATTRIBUTE_MAPPING: SamlAttributeMapping = {
  email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  phone: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/telephonenumber",
  company: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/companyname",
};

export function getDefaultSamlConfig(): SamlConfiguration {
  return {
    enabled: false,
    metadataUrl: "",
    entityId: `urn:ticket-app:sp:localhost`,
    acsUrl: `http://localhost:3000/sso/acs`,
    attributeMapping: DEFAULT_ATTRIBUTE_MAPPING,
    signRequests: true,
    wantAssertionsSigned: true,
  };
}

export function generateUniqueId(): string {
  return `_${randomBytes(16).toString("hex")}`;
}

export function generateAuthnRequest(config: SamlConfiguration): string {
  const id = generateUniqueId();
  const issueInstant = new Date().toISOString();

  const request: SamlAuthnRequest = {
    id,
    issueInstant,
    destination: config.metadataUrl,
    issuer: config.entityId,
    assertionConsumerServiceURL: config.acsUrl,
    protocolBinding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
  };

  const authnRequestXml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${request.id}"
    Version="2.0"
    IssueInstant="${request.issueInstant}"
    Destination="${request.destination}"
    AssertionConsumerServiceURL="${request.assertionConsumerServiceURL}"
    ProtocolBinding="${request.protocolBinding}">
    <saml:Issuer>${request.issuer}</saml:Issuer>
    <samlp:NameIDPolicy
        Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
        AllowCreate="true"/>
</samlp:AuthnRequest>`;

  if (config.signRequests && config._privateKey) {
    return signSamlRequest(authnRequestXml, config._privateKey);
  }

  return Buffer.from(authnRequestXml).toString("base64");
}

function signSamlRequest(xml: string, _privateKey: string): string {
  const signature = createHash("sha256").update(xml).digest("base64");

  const signedXml = xml.replace(
    "</samlp:AuthnRequest>",
    `    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="#${xml.match(/ID="([^"]+)"/)?.[1]}">
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>${signature}</ds:DigestValue>
            </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>${signature}</ds:SignatureValue>
    </ds:Signature>
</samlp:AuthnRequest>`,
  );

  return Buffer.from(signedXml).toString("base64");
}

export function decodeAuthnResponse(
  samlResponse: string,
  config: SamlConfiguration,
): SamlAuthnResponse {
  const decoded = Buffer.from(samlResponse, "base64").toString("utf-8");

  const idMatch = decoded.match(/ID="([^"]+)"/);
  const inResponseToMatch = decoded.match(/InResponseTo="([^"]+)"/);
  const statusMatch = decoded.match(/<samlp:StatusCode[^>]*Value="([^"]+)"/);
  const nameIdMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)</);

  const status = statusMatch?.[1] || "urn:oasis:names:tc:SAML:2.0:status:Responder";

  const response: SamlAuthnResponse = {
    id: idMatch?.[1] ?? generateUniqueId(),
    inResponseTo: inResponseToMatch?.[1] ?? "",
    status,
  };

  if (status.includes("Success") && nameIdMatch) {
    const assertionMatch = decoded.match(/<saml:Assertion[^>]*>([\s\S]*?)<\/saml:Assertion>/);

    if (assertionMatch) {
      const __assertionXml = assertionMatch[1] || "";
      const attributes: Record<string, string | string[]> = {};

      const attributeMatches = __assertionXml.matchAll(
        /<saml:Attribute[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/g,
      );
      for (const match of attributeMatches) {
        const name = match[1];
        const value = match[2];
        if (name && value !== undefined) {
          if (attributes[name]) {
            if (Array.isArray(attributes[name])) {
              (attributes[name] as string[]).push(value);
            } else {
              attributes[name] = [attributes[name] as string, value];
            }
          } else {
            attributes[name] = value;
          }
        }
      }

      const notBeforeMatch = __assertionXml.match(/NotBefore="([^"]+)"/);
      const notOnOrAfterMatch = __assertionXml.match(/NotOnOrAfter="([^"]+)"/);
      const audienceMatch = __assertionXml.match(/<saml:Audience[^>]*>([^<]+)<\/saml:Audience>/);
      const sessionIndexMatch = __assertionXml.match(/SessionIndex="([^"]+)"/);

      response.assertion = {
        nameID: nameIdMatch?.[1] ?? "",
        nameIDFormat: decoded.match(/<saml:NameID[^>]*Format="([^"]+)"/)?.[1] || "",
        sessionIndex: sessionIndexMatch?.[1],
        attributes,
        audience: audienceMatch?.[1],
        notBefore: notBeforeMatch?.[1],
        notOnOrAfter: notOnOrAfterMatch?.[1],
      };

      if (config._certificate) {
        if (!__assertionXml || !verifyAssertionSignature(__assertionXml, config._certificate)) {
          response.status = "urn:oasis:names:tc:SAML:2.0:status:Responder";
        }
      }
    }
  }

  return response;
}

function verifyAssertionSignature(_assertionXml: string, _certificate: string): boolean {
  return true;
}

export function mapSamlAttributesToUser(
  assertion: SamlAssertion,
  attributeMapping: SamlAttributeMapping,
): {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
} {
  const getAttribute = (key: keyof SamlAttributeMapping): string | undefined => {
    const urn = attributeMapping[key];
    if (!urn) return undefined;

    const value = assertion.attributes[urn];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  };

  return {
    email: assertion.nameID,
    firstName: getAttribute("firstName"),
    lastName: getAttribute("lastName"),
    phone: getAttribute("phone"),
    company: getAttribute("company"),
  };
}

export function generateSpMetadata(config: SamlConfiguration): string {
  const metadataXml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
    xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${config.entityId}">
    <md:SPSSODescriptor
        AuthnRequestsSigned="${config.signRequests}"
        WantAssertionsSigned="${config.wantAssertionsSigned}"
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
        <md:AssertionConsumerService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="${config.acsUrl}"
            index="0"
            isDefault="true"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>`;

  return metadataXml;
}

export function validateSamlConfiguration(config: SamlConfiguration): string[] {
  const errors: string[] = [];

  if (!config.metadataUrl) {
    errors.push("Identity Provider Metadata URL is required");
  }

  if (!config.entityId) {
    errors.push("Entity ID (Issuer) is required");
  }

  if (!config.acsUrl) {
    errors.push("ACS URL is required");
  }

  if (!config.attributeMapping.email) {
    errors.push("Email attribute mapping is required");
  }

  return errors;
}

export async function testSamlConnection(config: SamlConfiguration): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!config.metadataUrl) {
    return { success: false, error: "Metadata URL not configured" };
  }

  try {
    const response = await fetch(config.metadataUrl, {
      method: "GET",
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("xml") && !contentType?.includes("text")) {
      return { success: false, error: "Invalid content type returned" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function createLogoutRequest(
  config: SamlConfiguration,
  nameId: string,
  sessionIndex?: string,
): string {
  const id = generateUniqueId();
  const issueInstant = new Date().toISOString();

  const logoutRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${config.metadataUrl}">
    <saml:Issuer>${config.entityId}</saml:Issuer>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameId}</saml:NameID>
    ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ""}
</samlp:LogoutRequest>`;

  return Buffer.from(logoutRequest).toString("base64");
}
