import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

export interface PeriodDriveStructure {
  yearFolder: DriveFolderInfo;
  courseFolder: DriveFolderInfo;
  courseMasterFolder: DriveFolderInfo;
  periodFolder: DriveFolderInfo;
  instructorAssignmentFolder: DriveFolderInfo;
  studentSubmissionFolder: DriveFolderInfo;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '10o89IBj4FBAJIKwNffD7KfC0ad44r4M0';

  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, '\n'),
      root_folder_id: rootFolderId,
    };
  }

  // Fallback to local json file if present
  const localJsonPath = path.resolve(process.cwd(), 'google-service-account.json');
  if (fs.existsSync(localJsonPath)) {
    const raw = fs.readFileSync(localJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      root_folder_id: rootFolderId,
    };
  }

  throw new Error('Google Service Account credentials not found in environment or google-service-account.json');
}

export async function getDriveAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const sa = getServiceAccountCredentials();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64Url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64Url(header)}.${b64Url(claimSet)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Google Drive Auth error: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`);
  }

  cachedToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };
  return cachedToken.token;
}

export async function getOrCreateFolder(
  token: string,
  parentId: string,
  folderName: string
): Promise<DriveFolderInfo> {
  const safeName = folderName.replace(/'/g, "\\'");
  const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`;
  
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  const listData = await listRes.json().catch(() => ({ files: [] }));
  if (listData.files && listData.files.length > 0) {
    const found = listData.files[0];
    return {
      id: found.id,
      name: found.name,
      webViewLink: found.webViewLink || `https://drive.google.com/drive/folders/${found.id}`,
    };
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  const newFolder = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !newFolder.id) {
    throw new Error(`Gagal membuat folder Google Drive "${folderName}": ${newFolder.error?.message || createRes.statusText}`);
  }

  return {
    id: newFolder.id,
    name: newFolder.name || folderName,
    webViewLink: newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`,
  };
}

/**
 * Ensures the full folder structure exists for Academic Year, Course, and Period:
 * Root
 * └── [Tahun Ajaran] (e.g. "TA 2026-2027")
 *     └── [Course Name]
 *         ├── 00_Master_Dokumen_dan_Tugas_Instruktur
 *         └── [Period Name]
 *             ├── 01_Tugas_dan_Instruksi_Instruktur
 *             └── 02_Pengumpulan_Tugas_Mahasiswa
 */
export async function ensureCourseAndPeriodFolders(
  courseName: string,
  periodName: string,
  academicYear?: string
): Promise<PeriodDriveStructure> {
  const token = await getDriveAccessToken();
  const sa = getServiceAccountCredentials();
  const rootId = sa.root_folder_id;

  // 1. Academic Year Folder (e.g. "TA 2026-2027")
  const rawYear = (academicYear || '2026/2027').trim();
  const cleanYearName = `TA ${rawYear.replace(/\//g, '-')}`;
  const yearFolder = await getOrCreateFolder(token, rootId, cleanYearName);

  // 2. Course Folder inside Year Folder
  const cleanCourseName = (courseName || 'Mata Kuliah').trim();
  const courseFolder = await getOrCreateFolder(token, yearFolder.id, cleanCourseName);

  // 3. Course Master Instructor Folder
  const courseMasterFolder = await getOrCreateFolder(token, courseFolder.id, '00_Master_Dokumen_dan_Tugas_Instruktur');

  // 4. Period Folder inside Course Folder
  const cleanPeriodName = (periodName || 'Gelombang Praktik').trim();
  const periodFolder = await getOrCreateFolder(token, courseFolder.id, cleanPeriodName);

  // 5. Period Subfolders:
  // 5a. 01_Tugas_dan_Instruksi_Instruktur (Instructor Assignments & Briefs Backup)
  const instructorAssignmentFolder = await getOrCreateFolder(token, periodFolder.id, '01_Tugas_dan_Instruksi_Instruktur');

  // 5b. 02_Pengumpulan_Tugas_Mahasiswa (Student Submissions)
  const studentSubmissionFolder = await getOrCreateFolder(token, periodFolder.id, '02_Pengumpulan_Tugas_Mahasiswa');

  return {
    yearFolder,
    courseFolder,
    courseMasterFolder,
    periodFolder,
    instructorAssignmentFolder,
    studentSubmissionFolder,
  };
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  size?: number;
}

export async function uploadFileToDrive(
  parentFolderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<DriveUploadedFile> {
  const token = await getDriveAccessToken();
  const boundary = '-------PoliwakoDriveBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    }
  );

  const fileData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(fileData.error?.message || `Google Drive upload failed (${uploadRes.status})`);
  }

  // Grant read permission to anyone with link
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  }).catch(() => {});

  return {
    id: fileData.id,
    name: fileData.name || fileName,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
    webContentLink: fileData.webContentLink,
    size: Number(fileData.size || fileBuffer.length),
  };
}
