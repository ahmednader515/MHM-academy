"use client";

import { useState } from "react";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLevel, getGradesByLanguage, type Grade, type Curriculum, type Level, type Language } from "@/lib/data/curriculum-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown } from "lucide-react";

interface CurriculumSelectorProps {
  selectedCurriculum?: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null;
  selectedLevel?: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null;
  selectedLanguage?: 'arabic' | 'languages' | null;
  selectedGrade?: string | null;
  onCurriculumChange: (curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null) => void;
  onLevelChange: (level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null) => void;
  onLanguageChange: (language: 'arabic' | 'languages' | null) => void;
  onGradeChange: (grade: string | null) => void;
  className?: string;
}

export const CurriculumSelector = ({
  selectedCurriculum,
  selectedLevel,
  selectedLanguage,
  selectedGrade,
  onCurriculumChange,
  onLevelChange,
  onLanguageChange,
  onGradeChange,
  className = ""
}: CurriculumSelectorProps) => {
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);

  const handleCurriculumSelect = (curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy') => {
    onCurriculumChange(curriculum);
    onLevelChange(null); // Reset level when curriculum changes
    onLanguageChange(null); // Reset language when curriculum changes
    onGradeChange(null); // Reset grade when curriculum changes
  };

  const handleLevelSelect = (level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels') => {
    onLevelChange(level);
    onLanguageChange(null); // Reset language when level changes
    onGradeChange(null); // Reset grade when level changes
    setIsLevelOpen(false);
  };

  const handleLanguageSelect = (language: 'arabic' | 'languages') => {
    onLanguageChange(language);
    onGradeChange(null); // Reset grade when language changes
    setIsLanguageOpen(false);
  };

  const handleGradeSelect = (gradeId: string) => {
    onGradeChange(gradeId);
    setIsGradeOpen(false);
  };

  const selectedCurriculumData = selectedCurriculum ? CURRICULA.find(c => c.id === selectedCurriculum) : null;
  const availableLevels = selectedCurriculum ? getLevelsByCurriculum(selectedCurriculum) : [];
  const availableLanguages = selectedCurriculum && selectedLevel ? getLanguagesByLevel(selectedCurriculum, selectedLevel) : [];
  const availableGrades = selectedCurriculum && selectedLevel && selectedLanguage ? getGradesByLanguage(selectedCurriculum, selectedLevel, selectedLanguage) : 
                         selectedCurriculum && selectedLevel ? getGradesByLevel(selectedCurriculum, selectedLevel) : [];

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

      {/* Language Selection */}
      {selectedCurriculum && selectedLevel && availableLanguages.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">عربي/لغات</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            >
              {selectedLanguage 
                ? availableLanguages.find(l => l.id === selectedLanguage)?.name 
                : "اختر عربي/لغات"
              }
              <ChevronDown className={`h-4 w-4 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isLanguageOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {availableLanguages.map((language) => (
                    <div
                      key={language.id}
                      className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedLanguage === language.id ? 'bg-[#090919]/10' : ''
                      }`}
                      onClick={() => handleLanguageSelect(language.id)}
                    >
                      <span className="text-sm">{language.name}</span>
                      {selectedLanguage === language.id && (
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

      {/* Grade Selection */}
      {selectedCurriculum && selectedLevel && (
        <div>
          <label className="block text-sm font-medium mb-2">الصف</label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsGradeOpen(!isGradeOpen)}
            >
              {selectedGrade 
                ? availableGrades.find(g => g.id === selectedGrade)?.name 
                : "اختر الصف"
              }
              <ChevronDown className={`h-4 w-4 transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isGradeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {availableGrades.map((grade) => (
                    <div
                      key={grade.id}
                      className={`px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedGrade === grade.id ? 'bg-[#090919]/10' : ''
                      }`}
                      onClick={() => handleGradeSelect(grade.id)}
                    >
                      <span className="text-sm">{grade.name}</span>
                      {selectedGrade === grade.id && (
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
    </div>
  );
};
