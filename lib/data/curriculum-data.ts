export interface Grade {
  id: string;
  name: string;
  curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy';
  level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels';
  language: 'arabic' | 'languages' | null;
  order: number;
}

export interface Level {
  id: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels';
  name: string;
  curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy';
  order: number;
}

export interface Language {
  id: 'arabic' | 'languages';
  name: string;
  curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy';
  level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels';
  order: number;
}

export interface Curriculum {
  id: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy';
  name: string;
  levels: Level[];
  languages: Language[];
  grades: Grade[];
}

export const CURRICULA: Curriculum[] = [
  {
    id: 'egyptian',
    name: 'المنهج المصري',
    levels: [
      { id: 'kg', name: 'كجي', curriculum: 'egyptian', order: 1 },
      { id: 'primary', name: 'المرحلة الابتدائية', curriculum: 'egyptian', order: 2 },
      { id: 'preparatory', name: 'المرحلة الاعدادية', curriculum: 'egyptian', order: 3 },
      { id: 'secondary', name: 'المرحلة الثانوية', curriculum: 'egyptian', order: 4 },
    ],
    languages: [
      { id: 'arabic', name: 'عربي', curriculum: 'egyptian', level: 'primary', order: 1 },
      { id: 'languages', name: 'لغات', curriculum: 'egyptian', level: 'primary', order: 2 },
      { id: 'arabic', name: 'عربي', curriculum: 'egyptian', level: 'preparatory', order: 3 },
      { id: 'languages', name: 'لغات', curriculum: 'egyptian', level: 'preparatory', order: 4 },
    ],
    grades: [
      // KG
      { id: 'kg1', name: 'كجي 1', curriculum: 'egyptian', level: 'kg', language: null, order: 1 },
      { id: 'kg2', name: 'كجي 2', curriculum: 'egyptian', level: 'kg', language: null, order: 2 },
      
      // Primary
      { id: 'p1_arabic', name: 'الصف الاول الابتدائي عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 3 },
      { id: 'p1_languages', name: 'الصف الاول الابتدائي لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 4 },
      { id: 'p2_arabic', name: 'الصف الثاني عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 5 },
      { id: 'p2_languages', name: 'الصف الثاني لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 6 },
      { id: 'p3_arabic', name: 'الصف التالت عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 7 },
      { id: 'p3_languages', name: 'الصف التالت لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 8 },
      { id: 'p4_arabic', name: 'الصف الرابع عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 9 },
      { id: 'p4_languages', name: 'الصف الرابع لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 10 },
      { id: 'p5_arabic', name: 'الصف الخامس عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 11 },
      { id: 'p5_languages', name: 'الصف الخامس لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 12 },
      { id: 'p6_arabic', name: 'الصف السادس عربي', curriculum: 'egyptian', level: 'primary', language: 'arabic', order: 13 },
      { id: 'p6_languages', name: 'الصف السادس لغات', curriculum: 'egyptian', level: 'primary', language: 'languages', order: 14 },
      
      // Preparatory
      { id: 'prep1_general', name: 'الصف الاول الاعدادي عام', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 15 },
      { id: 'prep1_azhar', name: 'الصف الاول الاعدادي ازهر', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 16 },
      { id: 'prep1_languages', name: 'الصف الاول الاعدادي لغات', curriculum: 'egyptian', level: 'preparatory', language: 'languages', order: 17 },
      { id: 'prep2_general', name: 'الصف الثاني الاعدادي عام', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 18 },
      { id: 'prep2_azhar', name: 'الصف الثاني الاعدادي ازهر', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 19 },
      { id: 'prep2_languages', name: 'الصف الثاني الاعدادي لغات', curriculum: 'egyptian', level: 'preparatory', language: 'languages', order: 20 },
      { id: 'prep3_general', name: 'الصف التالت الاعدادي عام', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 21 },
      { id: 'prep3_azhar', name: 'الصف التالت الاعدادي ازهر', curriculum: 'egyptian', level: 'preparatory', language: 'arabic', order: 22 },
      { id: 'prep3_languages', name: 'الصف التالت الاعدادي لغات', curriculum: 'egyptian', level: 'preparatory', language: 'languages', order: 23 },
      
      // Secondary
      { id: 'sec1_general', name: 'الصف الاول الثانوي عام', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 24 },
      { id: 'sec1_azhar', name: 'الصف الاول الثانوي ازهر', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 25 },
      { id: 'sec2_science_general', name: 'الصف الثاني الثانوي علمي عام', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 26 },
      { id: 'sec2_science_azhar', name: 'الصف الثاني الثانوي علمي ازهر', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 27 },
      { id: 'sec3_science_general', name: 'الصف الثالث الثانوي علمي عام', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 28 },
      { id: 'sec3_science_azhar', name: 'الصف الثالث الثانوي علمي ازهر', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 29 },
      { id: 'sec2_literary_general', name: 'الصف الثاني الثانوي ادبي عام', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 30 },
      { id: 'sec2_literary_azhar', name: 'الصف الثاني الثانوي ادبي ازهر', curriculum: 'egyptian', level: 'secondary', language: 'arabic', order: 31 },
    ]
  },
  {
    id: 'saudi',
    name: 'المنهج السعودي',
    levels: [
      { id: 'kg', name: 'كجي', curriculum: 'saudi', order: 1 },
      { id: 'primary', name: 'المرحلة الابتدائية', curriculum: 'saudi', order: 2 },
      { id: 'preparatory', name: 'المرحلة المتوسطة', curriculum: 'saudi', order: 3 },
    ],
    languages: [
      // Saudi curriculum doesn't have separate Arabic/Languages distinction
    ],
    grades: [
      // KG
      { id: 'kg1_saudi', name: 'Kg1', curriculum: 'saudi', level: 'kg', language: null, order: 1 },
      { id: 'kg2_saudi', name: 'Kg2', curriculum: 'saudi', level: 'kg', language: null, order: 2 },
      { id: 'kg3_saudi', name: 'Kg3', curriculum: 'saudi', level: 'kg', language: null, order: 3 },
      
      // Primary
      { id: 'p1_saudi', name: 'الصف الاول', curriculum: 'saudi', level: 'primary', language: null, order: 4 },
      { id: 'p2_saudi', name: 'الصف الثاني', curriculum: 'saudi', level: 'primary', language: null, order: 5 },
      { id: 'p3_saudi', name: 'الصف الثالث', curriculum: 'saudi', level: 'primary', language: null, order: 6 },
      { id: 'p4_saudi', name: 'الصف الرابع', curriculum: 'saudi', level: 'primary', language: null, order: 7 },
      { id: 'p5_saudi', name: 'الصف الخامس', curriculum: 'saudi', level: 'primary', language: null, order: 8 },
      { id: 'p6_saudi', name: 'الصف السادس', curriculum: 'saudi', level: 'primary', language: null, order: 9 },
      
      // Intermediate
      { id: 'int1_saudi', name: 'الصف الاول المتوسط', curriculum: 'saudi', level: 'preparatory', language: null, order: 10 },
      { id: 'int2_saudi', name: 'الصف الثاني المتوسط', curriculum: 'saudi', level: 'preparatory', language: null, order: 11 },
      { id: 'int3_saudi', name: 'الصف الثالث المتوسط', curriculum: 'saudi', level: 'preparatory', language: null, order: 12 },
    ]
  },
  {
    id: 'summer_courses',
    name: 'الكورسات الصيفية',
    levels: [
      { id: 'summer_levels', name: 'مستويات الكورسات الصيفية', curriculum: 'summer_courses', order: 1 },
    ],
    languages: [],
    grades: [
      { id: 'uc_math_1', name: 'UC Math - Level 1', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 1 },
      { id: 'uc_math_2', name: 'UC Math - Level 2', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 2 },
      { id: 'programming_1', name: 'البرمجة - Level 1', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 3 },
      { id: 'programming_2', name: 'البرمجة - Level 2', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 4 },
      { id: 'programming_3', name: 'البرمجة - Level 3', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 5 },
      { id: 'english_1', name: 'English - Level 1', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 6 },
      { id: 'english_2', name: 'English - Level 2', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 7 },
      { id: 'english_3', name: 'English - Level 3', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 8 },
      { id: 'arabic_foundation_1', name: 'تأسيس عربي - مستوي أول', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 9 },
      { id: 'arabic_foundation_2', name: 'تأسيس عربي - مستوي ثان', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 10 },
      { id: 'quran_1', name: 'القرآن الكريم - مستوي أول', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 11 },
      { id: 'quran_2', name: 'القرآن الكريم - مستوي ثان', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 12 },
      { id: 'senior_training_1', name: 'تدريب كبار - مستوي أول', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 13 },
      { id: 'senior_training_2', name: 'تدريب كبار - مستوي ثان', curriculum: 'summer_courses', level: 'summer_levels', language: null, order: 14 },
    ]
  },
  {
    id: 'center_mhm_academy',
    name: 'Center MHM Academy',
    levels: [
      { id: 'summer_levels', name: 'مستويات متخصصة', curriculum: 'center_mhm_academy', order: 1 },
    ],
    languages: [],
    grades: [
      { id: 'grade1_primary', name: 'الصف الاول الابتدائي عربي /لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 1 },
      { id: 'grade2_primary', name: 'الصف الثاني عربي /لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 2 },
      { id: 'grade3_primary', name: 'الصف التالت عربي/لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 3 },
      { id: 'grade4_primary', name: 'الصف الرابع عربي /لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 4 },
      { id: 'grade5_primary', name: 'الصف الخامس عربي /لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 5 },
      { id: 'grade6_primary', name: 'الصف السادس عربي /لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 6 },
      { id: 'grade1_preparatory', name: 'الصف الاول الاعدادي عام عربي/لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 7 },
      { id: 'grade2_preparatory', name: 'الصف الثاني الاعدادي عام عربي/لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 8 },
      { id: 'grade3_preparatory', name: 'الصف التالت الاعدادي عام عربي/لغات', curriculum: 'center_mhm_academy', level: 'summer_levels', language: null, order: 9 },
    ]
  }
];

export const getLevelsByCurriculum = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy'): Level[] => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  return curriculum ? curriculum.levels : [];
};

export const getLanguagesByLevel = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy', levelId: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels'): Language[] => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  if (!curriculum) return [];
  return curriculum.languages.filter(l => l.level === levelId);
};

export const getGradesByCurriculum = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy'): Grade[] => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  return curriculum ? curriculum.grades : [];
};

export const getGradesByLevel = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy', levelId: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels'): Grade[] => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  if (!curriculum) return [];
  return curriculum.grades.filter(g => g.level === levelId);
};

export const getGradesByLanguage = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy', levelId: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels', languageId: 'arabic' | 'languages' | null): Grade[] => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  if (!curriculum) return [];
  return curriculum.grades.filter(g => g.level === levelId && g.language === languageId);
};

export const getGradeById = (gradeId: string): Grade | undefined => {
  for (const curriculum of CURRICULA) {
    const grade = curriculum.grades.find(g => g.id === gradeId);
    if (grade) return grade;
  }
  return undefined;
};

export const getLevelById = (levelId: string, curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy'): Level | undefined => {
  const curriculum = CURRICULA.find(c => c.id === curriculumId);
  if (!curriculum) return undefined;
  return curriculum.levels.find(l => l.id === levelId);
};

export const getCurriculumById = (curriculumId: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy'): Curriculum | undefined => {
  return CURRICULA.find(c => c.id === curriculumId);
};
