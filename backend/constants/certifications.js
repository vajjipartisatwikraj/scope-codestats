/**
 * Curated catalogue of globally recognised certifications.
 *
 * This list is the single source of truth for the `recognized` flag on
 * certification achievements. The API derives the flag by matching the title
 * against these entries, so a client cannot mark its own certificate as
 * recognised. The editor also reads this list to offer suggestions.
 *
 * Each entry: { name, issuer, domain, code }
 *   domain - used to render the issuer logo
 *   code   - exam code, matched as an alias
 */
const RECOGNIZED_CERTIFICATIONS = [
  // ---------- Amazon Web Services ----------
  { name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "CLF-C02" },
  { name: "AWS Certified Solutions Architect - Associate", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "SAA-C03" },
  { name: "AWS Certified Developer - Associate", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "DVA-C02" },
  { name: "AWS Certified SysOps Administrator - Associate", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "SOA-C02" },
  { name: "AWS Certified Solutions Architect - Professional", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "SAP-C02" },
  { name: "AWS Certified DevOps Engineer - Professional", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "DOP-C02" },
  { name: "AWS Certified Security - Specialty", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "SCS-C02" },
  { name: "AWS Certified Machine Learning - Specialty", issuer: "Amazon Web Services", domain: "aws.amazon.com", code: "MLS-C01" },

  // ---------- Microsoft ----------
  { name: "Microsoft Certified: Azure Fundamentals", issuer: "Microsoft", domain: "microsoft.com", code: "AZ-900" },
  { name: "Microsoft Certified: Azure Administrator Associate", issuer: "Microsoft", domain: "microsoft.com", code: "AZ-104" },
  { name: "Microsoft Certified: Azure Developer Associate", issuer: "Microsoft", domain: "microsoft.com", code: "AZ-204" },
  { name: "Microsoft Certified: Azure Solutions Architect Expert", issuer: "Microsoft", domain: "microsoft.com", code: "AZ-305" },
  { name: "Microsoft Certified: Azure AI Engineer Associate", issuer: "Microsoft", domain: "microsoft.com", code: "AI-102" },
  { name: "Microsoft Certified: Azure Data Engineer Associate", issuer: "Microsoft", domain: "microsoft.com", code: "DP-203" },
  { name: "Microsoft Certified: Power BI Data Analyst Associate", issuer: "Microsoft", domain: "microsoft.com", code: "PL-300" },

  // ---------- Google Cloud ----------
  { name: "Google Cloud Digital Leader", issuer: "Google Cloud", domain: "cloud.google.com", code: "" },
  { name: "Google Associate Cloud Engineer", issuer: "Google Cloud", domain: "cloud.google.com", code: "" },
  { name: "Google Professional Cloud Architect", issuer: "Google Cloud", domain: "cloud.google.com", code: "" },
  { name: "Google Professional Data Engineer", issuer: "Google Cloud", domain: "cloud.google.com", code: "" },
  { name: "Google Professional Machine Learning Engineer", issuer: "Google Cloud", domain: "cloud.google.com", code: "" },

  // ---------- Security ----------
  { name: "CompTIA Security+", issuer: "CompTIA", domain: "comptia.org", code: "SY0-701" },
  { name: "CompTIA Network+", issuer: "CompTIA", domain: "comptia.org", code: "N10-009" },
  { name: "Certified Ethical Hacker", issuer: "EC-Council", domain: "eccouncil.org", code: "CEH" },
  { name: "Certified Information Systems Security Professional", issuer: "ISC2", domain: "isc2.org", code: "CISSP" },
  { name: "Certified Information Security Manager", issuer: "ISACA", domain: "isaca.org", code: "CISM" },
  { name: "Certified Information Systems Auditor", issuer: "ISACA", domain: "isaca.org", code: "CISA" },
  { name: "Offensive Security Certified Professional", issuer: "OffSec", domain: "offsec.com", code: "OSCP" },

  // ---------- Cloud native and DevOps ----------
  { name: "Certified Kubernetes Administrator", issuer: "The Linux Foundation", domain: "linuxfoundation.org", code: "CKA" },
  { name: "Certified Kubernetes Application Developer", issuer: "The Linux Foundation", domain: "linuxfoundation.org", code: "CKAD" },
  { name: "HashiCorp Certified: Terraform Associate", issuer: "HashiCorp", domain: "hashicorp.com", code: "" },
  { name: "Docker Certified Associate", issuer: "Docker", domain: "docker.com", code: "DCA" },
  { name: "Red Hat Certified System Administrator", issuer: "Red Hat", domain: "redhat.com", code: "RHCSA" },
  { name: "Red Hat Certified Engineer", issuer: "Red Hat", domain: "redhat.com", code: "RHCE" },

  // ---------- Enterprise platforms ----------
  { name: "SAP Certified Associate - Back-End Developer ABAP Cloud", issuer: "SAP", domain: "sap.com", code: "C_P2WAB_2507" },
  { name: "Salesforce Certified Administrator", issuer: "Salesforce", domain: "salesforce.com", code: "" },
  { name: "Salesforce Certified Platform Developer I", issuer: "Salesforce", domain: "salesforce.com", code: "" },
  { name: "Cisco Certified Network Associate", issuer: "Cisco", domain: "cisco.com", code: "CCNA" },
  { name: "Cisco Certified Network Professional", issuer: "Cisco", domain: "cisco.com", code: "CCNP" },

  // ---------- Oracle: Java ----------
  { name: "Oracle Certified Associate: Java SE 8 Programmer I", issuer: "Oracle", domain: "oracle.com", code: "1Z0-808" },
  { name: "Oracle Certified Professional: Java SE 8 Programmer II", issuer: "Oracle", domain: "oracle.com", code: "1Z0-809" },
  { name: "Oracle Certified Professional: Java SE 11 Developer", issuer: "Oracle", domain: "oracle.com", code: "1Z0-819" },
  { name: "Oracle Certified Professional: Java SE 17 Developer", issuer: "Oracle", domain: "oracle.com", code: "1Z0-829" },
  { name: "Oracle Certified Professional: Java SE 21 Developer", issuer: "Oracle", domain: "oracle.com", code: "1Z0-830" },

  // ---------- Oracle: Database ----------
  { name: "Oracle Database SQL Certified Associate", issuer: "Oracle", domain: "oracle.com", code: "1Z0-071" },
  { name: "Oracle Database Administration I", issuer: "Oracle", domain: "oracle.com", code: "1Z0-082" },
  { name: "Oracle Database Administration II", issuer: "Oracle", domain: "oracle.com", code: "1Z0-083" },
  { name: "Oracle Autonomous Database Cloud Professional", issuer: "Oracle", domain: "oracle.com", code: "1Z0-931" },
  { name: "Oracle MySQL 8.0 Database Administrator", issuer: "Oracle", domain: "mysql.com", code: "1Z0-908" },
  { name: "Oracle MySQL 8.0 Database Developer", issuer: "Oracle", domain: "mysql.com", code: "1Z0-909" },

  // ---------- Oracle Cloud Infrastructure ----------
  { name: "Oracle Cloud Infrastructure Foundations Associate", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1085" },
  { name: "Oracle Cloud Infrastructure Architect Associate", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1072" },
  { name: "Oracle Cloud Infrastructure Architect Professional", issuer: "Oracle", domain: "oracle.com", code: "1Z0-997" },
  { name: "Oracle Cloud Infrastructure Developer Associate", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1084" },
  { name: "Oracle Cloud Infrastructure DevOps Professional", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1109" },
  { name: "Oracle Cloud Infrastructure AI Foundations Associate", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1122" },
  { name: "Oracle Cloud Infrastructure Generative AI Professional", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1127" },
  { name: "Oracle Cloud Infrastructure Data Science Professional", issuer: "Oracle", domain: "oracle.com", code: "1Z0-1110" },

  // ---------- ServiceNow ----------
  { name: "ServiceNow Certified System Administrator", issuer: "ServiceNow", domain: "servicenow.com", code: "CSA" },
  { name: "ServiceNow Certified Application Developer", issuer: "ServiceNow", domain: "servicenow.com", code: "CAD" },
  { name: "ServiceNow Certified Implementation Specialist - ITSM", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-ITSM" },
  { name: "ServiceNow Certified Implementation Specialist - HR Service Delivery", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-HR" },
  { name: "ServiceNow Certified Implementation Specialist - Customer Service Management", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-CSM" },
  { name: "ServiceNow Certified Implementation Specialist - Discovery", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-Discovery" },
  { name: "ServiceNow Certified Implementation Specialist - Software Asset Management", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-SAM" },
  { name: "ServiceNow Certified Implementation Specialist - Vulnerability Response", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-VR" },
  { name: "ServiceNow Certified Implementation Specialist - Security Incident Response", issuer: "ServiceNow", domain: "servicenow.com", code: "CIS-SIR" },
  { name: "ServiceNow Certified Technical Architect", issuer: "ServiceNow", domain: "servicenow.com", code: "CTA" },
  { name: "ServiceNow Certified Master Architect", issuer: "ServiceNow", domain: "servicenow.com", code: "CMA" },

  // ---------- Data and AI ----------
  { name: "Databricks Certified Data Engineer Associate", issuer: "Databricks", domain: "databricks.com", code: "" },
  { name: "TensorFlow Developer Certificate", issuer: "Google", domain: "tensorflow.org", code: "" },
  { name: "Tableau Desktop Specialist", issuer: "Tableau", domain: "tableau.com", code: "" },
  { name: "MongoDB Associate Developer", issuer: "MongoDB", domain: "mongodb.com", code: "" },

  // ---------- Project management ----------
  { name: "Project Management Professional", issuer: "Project Management Institute", domain: "pmi.org", code: "PMP" },
  { name: "Certified Associate in Project Management", issuer: "Project Management Institute", domain: "pmi.org", code: "CAPM" },
  { name: "Professional Scrum Master I", issuer: "Scrum.org", domain: "scrum.org", code: "PSM I" },
  { name: "Certified ScrumMaster", issuer: "Scrum Alliance", domain: "scrumalliance.org", code: "CSM" },
  { name: "ITIL 4 Foundation", issuer: "PeopleCert", domain: "peoplecert.org", code: "" },
];

// Lowercase alphanumerics only, so punctuation and spacing never break a match
const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether a title carries this exam code.
 *
 * Codes must sit on their own boundary rather than anywhere inside a word.
 * Plain substring matching would flag short codes wrongly: "Academic
 * Excellence" contains "cad" (ServiceNow CAD) and "Package Management"
 * contains "cka" (CKA). Separators are flexible so CLF-C02, C_P2WAB_2507
 * and "PSM I" all match however the user punctuated them.
 */
const codeMatches = (title, code) => {
  if (!code) return false;

  const pattern = escapeRegex(code).replace(/[-_\s]+/g, "[-_\\s]*");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(String(title || ""));
};

const nameMatches = (title, name) => {
  const needle = normalize(title);
  const target = normalize(name);
  return Boolean(target) && (needle === target || needle.includes(target));
};

/**
 * Longest matching name wins, because one certification name can be a prefix
 * of another: "Oracle Database Administration I" sits inside "Oracle Database
 * Administration II", and picking the first match would credit the wrong exam.
 */
const bestNameMatch = (title) =>
  RECOGNIZED_CERTIFICATIONS.filter((entry) => nameMatches(title, entry.name)).sort(
    (a, b) => normalize(b.name).length - normalize(a.name).length,
  )[0] || null;

/**
 * Resolves a free-text certificate title to a catalogue entry.
 *
 * Names are checked across the whole catalogue before codes, because a full
 * name is much stronger evidence than a three-letter code. Without that order,
 * "ServiceNow Certified Implementation Specialist - Customer Service
 * Management (CIS-CSM)" could be attributed to Certified ScrumMaster on the
 * strength of its "CSM" fragment.
 */
const findRecognizedCertification = (title) => {
  if (!normalize(title)) return null;

  return (
    bestNameMatch(title) ||
    RECOGNIZED_CERTIFICATIONS.find((entry) => codeMatches(title, entry.code)) ||
    null
  );
};

const isRecognizedCertification = (title) => Boolean(findRecognizedCertification(title));

module.exports = {
  RECOGNIZED_CERTIFICATIONS,
  findRecognizedCertification,
  isRecognizedCertification,
};
