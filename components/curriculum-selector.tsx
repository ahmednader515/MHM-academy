"use client";

import { useState } from "react";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLevel, getGradesByLanguage, type Grade, type Curriculum, type Level, type Language } from "@/lib/data/curriculum-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown } from "lucide-react";

interface CurriculumSelectorProps {
  selectedCurriculum?: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null;
  selectedCurriculumType?: 'morning' | 'evening' | null;
  selectedLevel?: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null;
  selectedLanguage?: 'arabic' | 'languages' | string | null; // Can be comma-separated string for multiple languages
  selectedGrade?: string | null; // Can be comma-separated string for multiple grades
  onCurriculumChange: (curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null) => void;
  onCurriculumTypeChange?: (curriculumType: 'morning' | 'evening' | null) => void;
  onLevelChange: (level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null) => void;
  onLanguageChange: (language: 'arabic' | 'languages' | string | null) => void; // Can accept comma-separated string
  onGradeChange: (grade: string | null) => void; // Can accept comma-separated string
  className?: string;
}

export const CurriculumSelector = ({
  selectedCurriculum,
  selectedCurriculumType,
  selectedLevel,
  selectedLanguage,
  selectedGrade,
  onCurriculumChange,
  onCurriculumTypeChange,
  onLevelChange,
  onLanguageChange,
  onGradeChange,
  className = ""
}: CurriculumSelectorProps) => {
  const [isCurriculumTypeOpen, setIsCurriculumTypeOpen] = useState(false);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);

  const curriculumTypes = [
    { id: 'morning' as const, name: 'صباحي' },
    { id: 'evening' as const, name: 'مسائي' },
  ];

  const handleCurriculumSelect = (curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy') => {
    onCurriculumChange(curriculum);
    // Reset curriculum type when curriculum changes (unless it's still egyptian)
    if (onCurriculumTypeChange && curriculum !== 'egyptian') {
      onCurriculumTypeChange(null);
    }
    onLevelChange(null); // Reset level when curriculum changes
    onLanguageChange(null); // Reset language when curriculum changes
    onGradeChange(null); // Reset grade when curriculum changes
  };

  const handleCurriculumTypeSelect = (curriculumType: 'morning' | 'evening') => {
    if (onCurriculumTypeChange) {
      onCurriculumTypeChange(curriculumType);
    }
    setIsCurriculumTypeOpen(false);
  };

  const handleLevelSelect = (level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels') => {
    onLevelChange(level);
    onLanguageChange(null); // Reset language when level changes
    onGradeChange(null); // Reset grade when level changes
    setIsLevelOpen(false);
  };

  const handleLanguageSelect = (language: 'arabic' | 'languages') => {
    // Parse current selected languages (comma-separated string)
    const currentLanguages = selectedLanguage 
      ? selectedLanguage.split(',').map(l => l.trim()).filter(Boolean)
      : [];
    
    // Toggle the selected language
    let newLanguages: string[];
    if (currentLanguages.includes(language)) {
      // Remove if already selected
      newLanguages = currentLanguages.filter(l => l !== language);
    } else {
      // Add if not selected
      newLanguages = [...currentLanguages, language];
    }
    
    // Update with comma-separated string, or null if empty
    const newLanguageValue = newLanguages.length > 0 ? newLanguages.join(',') : null;
    onLanguageChange(newLanguageValue);
    
    // Only reset grade if all languages are deselected
    if (newLanguages.length === 0) {
      onGradeChange(null);
    }
  };

  const handleGradeSelect = (gradeId: string) => {
    // Parse current selected grades (comma-separated string)
    const currentGrades = selectedGrade 
      ? selectedGrade.split(',').map(g => g.trim()).filter(Boolean)
      : [];
    
    // Toggle the selected grade
    let newGrades: string[];
    if (currentGrades.includes(gradeId)) {
      // Remove if already selected
      newGrades = currentGrades.filter(g => g !== gradeId);
    } else {
      // Add if not selected
      newGrades = [...currentGrades, gradeId];
    }
    
    // Update with comma-separated string, or null if empty
    const newGradeValue = newGrades.length > 0 ? newGrades.join(',') : null;
    onGradeChange(newGradeValue);
  };

  const selectedCurriculumData = selectedCurriculum ? CURRICULA.find(c => c.id === selectedCurriculum) : null;
  const availableLevels = selectedCurriculum ? getLevelsByCurriculum(selectedCurriculum) : [];
  const availableLanguages = selectedCurriculum && selectedLevel ? getLanguagesByLevel(selectedCurriculum, selectedLevel) : [];
  
  // Calculate available grades based on selected languages (supports multiple languages)
  let availableGrades: Grade[] = [];
  if (selectedCurriculum && selectedLevel) {
    if (selectedLanguage) {
      // Parse comma-separated languages
      const selectedLanguages = selectedLanguage.split(',').map(l => l.trim()).filter(Boolean) as ('arabic' | 'languages')[];
      
      // Get grades for each selected language and combine them
      const allGrades: Grade[] = [];
      selectedLanguages.forEach(lang => {
        const gradesForLang = getGradesByLanguage(selectedCurriculum, selectedLevel, lang);
        allGrades.push(...gradesForLang);
      });
      
      // Remove duplicates based on grade ID
      const uniqueGrades = allGrades.filter((grade, index, self) => 
        index === self.findIndex(g => g.id === grade.id)
      );
      
      // Sort by order
      availableGrades = uniqueGrades.sort((a, b) => a.order - b.order);
    } else {
      // If no language selected, show all grades for the level
      availableGrades = getGradesByLevel(selectedCurriculum, selectedLevel);
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Curriculum Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">المنهج</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CURRICULA.map((curriculum) => (
            <Card
              key={curriculum.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCurriculum === curriculum.id
                  ? 'ring-2 ring-[#090919] bg-[#090919]/5'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleCurriculumSelect(curriculum.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{curriculum.name}</span>
                  {selectedCurriculum === curriculum.id && (
                    <Check className="h-5 w-5 text-[#090919]" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Curriculum Type Selection (only for Egyptian curriculum) */}
      {selectedCurriculum === 'egyptian' && (
        <div>
          <label className="block text-sm font-medium mb-2">نوع المنهج</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsCurriculumTypeOpen(!isCurriculumTypeOpen)}
            >
              {selectedCurriculumType 
                ? curriculumTypes.find(t => t.id === selectedCurriculumType)?.name 
                : "اختر نوع المنهج"
              }
              <ChevronDown className={`h-4 w-4 transition-transform ${isCurriculumTypeOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isCurriculumTypeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {curriculumTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedCurriculumType === type.id ? 'bg-[#090919]/10' : ''
                      }`}
                      onClick={() => handleCurriculumTypeSelect(type.id)}
                    >
                      <span className="text-sm">{type.name}</span>
                      {selectedCurriculumType === type.id && (
                        <Check className="h-4 w-4 text-[#090919]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level Selection */}
      {selectedCurriculum && (
        <div>
          <label className="block text-sm font-medium mb-2">المرحلة</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsLevelOpen(!isLevelOpen)}
            >
              {selectedLevel 
                ? availableLevels.find(l => l.id === selectedLevel)?.name 
                : "اختر المرحلة"
              }
              <ChevronDown className={`h-4 w-4 transition-transform ${isLevelOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isLevelOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {availableLevels.map((level) => (
                    <div
                      key={level.id}
                      className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedLevel === level.id ? 'bg-[#090919]/10' : ''
                      }`}
                      onClick={() => handleLevelSelect(level.id)}
                    >
                      <span className="text-sm">{level.name}</span>
                      {selectedLevel === level.id && (
                        <Check className="h-4 w-4 text-[#090919]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Language Selection - Multiple Selection */}
      {selectedCurriculum && selectedLevel && availableLanguages.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">عربي/لغات (يمكن اختيار أكثر من قسم)</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            >
              {(() => {
                const selectedLanguages = selectedLanguage 
                  ? selectedLanguage.split(',').map(l => l.trim()).filter(Boolean)
                  : [];
                if (selectedLanguages.length === 0) {
                  return "اختر عربي/لغات";
                } else if (selectedLanguages.length === 1) {
                  return availableLanguages.find(l => l.id === selectedLanguages[0])?.name || "اختر عربي/لغات";
                } else {
                  const names = selectedLanguages
                    .map(id => availableLanguages.find(l => l.id === id)?.name)
                    .filter(Boolean)
                    .join('، ');
                  return names || "اختر عربي/لغات";
                }
              })()}
              <ChevronDown className={`h-4 w-4 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isLanguageOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {availableLanguages.map((language) => {
                    const selectedLanguages = selectedLanguage 
                      ? selectedLanguage.split(',').map(l => l.trim()).filter(Boolean)
                      : [];
                    const isSelected = selectedLanguages.includes(language.id);
                    return (
                      <div
                        key={language.id}
                        className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                          isSelected ? 'bg-[#090919]/10' : ''
                        }`}
                        onClick={() => handleLanguageSelect(language.id)}
                      >
                        <span className="text-sm">{language.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#090919]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grade Selection - Multiple Selection */}
      {selectedCurriculum && selectedLevel && availableGrades.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">الصف (يمكن اختيار أكثر من صف)</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsGradeOpen(!isGradeOpen)}
            >
              {(() => {
                const selectedGrades = selectedGrade 
                  ? selectedGrade.split(',').map(g => g.trim()).filter(Boolean)
                  : [];
                if (selectedGrades.length === 0) {
                  return "اختر الصف";
                } else if (selectedGrades.length === 1) {
                  return availableGrades.find(g => g.id === selectedGrades[0])?.name || "اختر الصف";
                } else {
                  const names = selectedGrades
                    .map(id => availableGrades.find(g => g.id === id)?.name)
                    .filter(Boolean)
                    .join('، ');
                  return names || "اختر الصف";
                }
              })()}
              <ChevronDown className={`h-4 w-4 transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isGradeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {availableGrades.map((grade) => {
                    const selectedGrades = selectedGrade 
                      ? selectedGrade.split(',').map(g => g.trim()).filter(Boolean)
                      : [];
                    const isSelected = selectedGrades.includes(grade.id);
                    return (
                      <div
                        key={grade.id}
                        className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                          isSelected ? 'bg-[#090919]/10' : ''
                        }`}
                        onClick={() => handleGradeSelect(grade.id)}
                      >
                        <span className="text-sm">{grade.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#090919]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
