export type StudentWorkspaceTab = 'DASHBOARD' | 'UNITS' | 'FINAL_PROJECT' | 'GRADE';

export interface StudentRouteState {
  isStudentRoute: boolean;
  isCatalog: boolean;
  slug?: string;
  tab: StudentWorkspaceTab;
}

const WORKSPACE_SECTIONS: Record<string, StudentWorkspaceTab> = {
  dashboard: 'DASHBOARD',
  unit: 'UNITS',
  'final-project': 'FINAL_PROJECT',
  nilai: 'GRADE',
};

/**
 * Resolve the student catalog/workspace state from the URL itself.
 *
 * The workspace marker in sessionStorage is only a compatibility hint. The
 * URL must remain authoritative so a refresh of a deep link cannot collapse
 * back to the catalog while enrollment data is still being restored.
 */
export const getStudentRouteState = (pathname: string): StudentRouteState => {
  const parts = pathname
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
    .split('/')
    .filter(Boolean);

  if (parts[0] !== 'mahasiswa') {
    return { isStudentRoute: false, isCatalog: true, tab: 'DASHBOARD' };
  }

  if (!parts[1]) {
    return { isStudentRoute: true, isCatalog: true, tab: 'DASHBOARD' };
  }

  const canonicalTab = WORKSPACE_SECTIONS[parts[1]];
  if (canonicalTab) {
    const slug = parts[2];
    return {
      isStudentRoute: true,
      isCatalog: !slug,
      ...(slug ? { slug } : {}),
      tab: canonicalTab,
    };
  }

  // Preserve legacy links such as /mahasiswa/cad-2-trpf/unit.
  const slug = parts[1];
  return {
    isStudentRoute: true,
    isCatalog: false,
    slug,
    tab: WORKSPACE_SECTIONS[parts[2]] || 'DASHBOARD',
  };
};
