import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const RUN_ID = 'run_20260306_151014';
const BASE_DIR = path.join(process.cwd(), '../runs', RUN_ID);

export function readCsvData(relativePath: string) {
  const fullPath = path.join(BASE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const result = Papa.parse(fileContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  
  return result.data;
}

export function readJsonData(relativePath: string) {
  const fullPath = path.join(BASE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return null;
  }
  
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(fileContent);
}

export function getStructureData() {
  return readCsvData('04-structure/folder_metrics.csv');
}

export function getValueData() {
  return readCsvData('05-value/value_scores.csv');
}

export function getMigrationData() {
  return readCsvData('07-migration/migration_map_resolved.csv');
}

export function getCollisionsData() {
  return readCsvData('07-migration/collisions.csv');
}

export function getInventoryData() {
  return readJsonData('01-inventory/files.lsjson');
}

export function getContentData() {
  return readCsvData('02-content/content_index.csv');
}

export function getFailuresData() {
  return readCsvData('02-content/extraction_failures.csv');
}

export function getGovernanceMetrics() {
  return readJsonData('10-governance/governance_metrics.json');
}

export function getStandardsViolations() {
  return readCsvData('09-standards/standards_violations.csv');
}

export function getQuarantinePlan() {
  return readCsvData('08-dedup/quarantine_plan.csv');
}

export function getCanonicalSelections() {
  return readCsvData('08-dedup/canonical_selections.csv');
}

export function saveApproval(type: string, data: any) {
  const approvalsDir = path.join(BASE_DIR, 'approvals');
  if (!fs.existsSync(approvalsDir)) {
    fs.mkdirSync(approvalsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}_${timestamp}.json`;
  const filePath = path.join(approvalsDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { success: true, file: filename };
}

