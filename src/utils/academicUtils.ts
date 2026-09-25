// Helper pemetaan Program Studi Politeknik Sorowako (POLIWAKO)
// Aturan:
// - Kelas A & B: Prodi Perawatan dan Perbaikan Mesin
// - Kelas C: Prodi Rekayasa Perancangan Mekanik
// - Kelas D: Prodi Teknologi Rekayasa Pengelasan dan Fabrikasi

export interface ProdiInfo {
  name: string;
  code: string;
  badgeClass: string;
  dotColor: string;
}

export const getProdiFromClass = (className?: string, department?: string): ProdiInfo => {
  if (department && department.trim()) {
    const depUpper = department.toUpperCase();
    if (depUpper.includes('PENGELASAN') || depUpper.includes('FABRIKASI') || depUpper.includes('TRPF')) {
      return {
        name: 'Teknologi Rekayasa Pengelasan dan Fabrikasi',
        code: 'TRPF',
        badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
        dotColor: 'bg-red-600'
      };
    }
    if (depUpper.includes('PERANCANGAN') || depUpper.includes('RPM')) {
      return {
        name: 'Rekayasa Perancangan Mekanik',
        code: 'RPM',
        badgeClass: 'bg-yellow-50 text-yellow-900 border-yellow-300/80',
        dotColor: 'bg-yellow-500'
      };
    }
    if (depUpper.includes('PERAWATAN') || depUpper.includes('PERBAIKAN') || depUpper.includes('PPM')) {
      return {
        name: 'Perawatan dan Perbaikan Mesin',
        code: 'PPM',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
        dotColor: 'bg-blue-600'
      };
    }
  }

  if (!className) {
    return {
      name: 'Perawatan dan Perbaikan Mesin',
      code: 'PPM',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: 'bg-slate-400'
    };
  }

  const clean = className.toUpperCase().trim();

  // Kelas D & TRPF (e.g. '2D - TRPF', '1D', '2D', '3D', 'TRPF')
  if (clean.includes('TRPF') || /\bD\b/.test(clean) || /[0-9]D/.test(clean)) {
    return {
      name: 'Teknologi Rekayasa Pengelasan dan Fabrikasi',
      code: 'TRPF',
      badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
      dotColor: 'bg-red-600'
    };
  }

  // Kelas C & RPM (e.g. '1C', '2C', '3C', 'RPM')
  if (clean.includes('RPM') || /\bC\b/.test(clean) || /[0-9]C/.test(clean)) {
    return {
      name: 'Rekayasa Perancangan Mekanik',
      code: 'RPM',
      badgeClass: 'bg-yellow-50 text-yellow-900 border-yellow-300/80',
      dotColor: 'bg-yellow-500'
    };
  }

  // Kelas A & B & PPM (e.g. '1A', '2A', '1B', '2B', '3A', '3B', 'PPM')
  if (clean.includes('PPM') || /\b(A|B)\b/.test(clean) || /[0-9][AB]/.test(clean)) {
    return {
      name: 'Perawatan dan Perbaikan Mesin',
      code: 'PPM',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
      dotColor: 'bg-blue-600'
    };
  }

  return {
    name: 'Perawatan dan Perbaikan Mesin',
    code: 'PPM',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotColor: 'bg-blue-600'
  };
};

/** Returns a program only when a class/program value is actually available. */
export const getKnownProdiFromClass = (className?: string, department?: string): ProdiInfo | null => {
  const dep = department?.trim().toUpperCase() || '';
  const clean = className?.trim().toUpperCase() || '';
  const hasKnownDepartment = ['PENGELASAN', 'FABRIKASI', 'TRPF', 'PERANCANGAN', 'RPM', 'PERAWATAN', 'PERBAIKAN', 'PPM']
    .some(marker => dep.includes(marker));
  const hasKnownClass = clean.includes('TRPF') || /\bD\b/.test(clean) || /[0-9]D/.test(clean)
    || clean.includes('RPM') || /\bC\b/.test(clean) || /[0-9]C/.test(clean)
    || clean.includes('PPM') || /\b(A|B)\b/.test(clean) || /[0-9][AB]/.test(clean);

  if (!hasKnownDepartment && !hasKnownClass) return null;
  return getProdiFromClass(className, department);
};
