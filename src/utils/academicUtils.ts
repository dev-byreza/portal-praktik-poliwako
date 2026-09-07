// Helper pemetaan Program Studi Politeknik Sorowako (POLIWAKO)
// Aturan:
// - Kelas A & B: Prodi Perawatan & Perbaikan Mesin
// - Kelas C: Prodi Rekayasa Perancangan Mekanik
// - Kelas D: Prodi Teknologi Rekayasa Pengelasan & Fabrikasi

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
        name: 'Teknologi Rekayasa Pengelasan & Fabrikasi',
        code: 'TRPF',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotColor: 'bg-amber-500'
      };
    }
    if (depUpper.includes('PERANCANGAN') || depUpper.includes('RPM')) {
      return {
        name: 'Rekayasa Perancangan Mekanik',
        code: 'RPM',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
        dotColor: 'bg-blue-500'
      };
    }
    if (depUpper.includes('PERAWATAN') || depUpper.includes('PERBAIKAN') || depUpper.includes('PPM')) {
      return {
        name: 'Perawatan & Perbaikan Mesin',
        code: 'PPM',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dotColor: 'bg-emerald-500'
      };
    }
  }

  if (!className) {
    return {
      name: 'Perawatan & Perbaikan Mesin',
      code: 'PPM',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: 'bg-slate-400'
    };
  }

  const clean = className.toUpperCase().trim();

  // Kelas D & TRPF (e.g. '2D - TRPF', '1D', '2D', '3D', 'TRPF')
  if (clean.includes('TRPF') || /\bD\b/.test(clean) || /[0-9]D/.test(clean)) {
    return {
      name: 'Teknologi Rekayasa Pengelasan & Fabrikasi',
      code: 'TRPF',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dotColor: 'bg-amber-500'
    };
  }

  // Kelas C & RPM (e.g. '1C', '2C', '3C', 'RPM')
  if (clean.includes('RPM') || /\bC\b/.test(clean) || /[0-9]C/.test(clean)) {
    return {
      name: 'Rekayasa Perancangan Mekanik',
      code: 'RPM',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
      dotColor: 'bg-blue-500'
    };
  }

  // Kelas A & B & PPM (e.g. '1A', '2A', '1B', '2B', '3A', '3B', 'PPM')
  if (clean.includes('PPM') || /\b(A|B)\b/.test(clean) || /[0-9][AB]/.test(clean)) {
    return {
      name: 'Perawatan & Perbaikan Mesin',
      code: 'PPM',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dotColor: 'bg-emerald-500'
    };
  }

  return {
    name: 'Perawatan & Perbaikan Mesin',
    code: 'PPM',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotColor: 'bg-emerald-500'
  };
};
