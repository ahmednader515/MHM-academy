"use client";

import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, BookOpen, Award, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface ChildData {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  curriculum: string | null;
  level: string | null;
  grade: string | null;
  points: number;
  coursesCount: number;
  completedChapters: number;
  totalChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  courses: any[];
  userProgress: any[];
  recentQuizResults: any[];
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildrenData = async () => {
      try {
        const response = await fetch('/api/parent/children');
        if (response.ok) {
          const data = await response.json();
          setChildren(data);
        }
      } catch (error) {
        console.error('Error fetching children data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user && session.user.role === 'PARENT') {
      fetchChildrenData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#090919]">
            {t('parent.dashboard') || 'Parent Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {t('parent.trackChildrenProgress') || 'Track your children\'s academic progress'}
          </p>
        </div>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {t('parent.noChildrenFound') || 'No children accounts found linked to your phone number.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {children.map((child) => (
            <Card key={child.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{child.fullName}</CardTitle>
                    <CardDescription>
                      {child.curriculum} - {child.level} - {child.grade}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {child.points} {t('navigation.points') || 'Points'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full" dir={t('common.direction') || 'ltr'}>
                  <TabsList className={`grid w-full grid-cols-4 ${t('common.direction') === 'rtl' ? 'rtl:flex-row-reverse' : ''}`}>
                    <TabsTrigger value="overview">
                      {t('parent.overview') || 'نظرة عامة'}
                    </TabsTrigger>
                    <TabsTrigger value="progress">
                      {t('parent.progress') || 'التقدم'}
                    </TabsTrigger>
                    <TabsTrigger value="courses">
                      {t('parent.courses') || 'المواد'}
                    </TabsTrigger>
                    <TabsTrigger value="quizzes">
                      {t('parent.quizzes') || 'الاختبارات'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.totalCourses') || 'Total Courses'}</p>
                              <p className="text-2xl font-bold">{child.coursesCount}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.completionRate') || 'Completion Rate'}</p>
                              <p className="text-2xl font-bold">
                                {child.totalChapters > 0 ? Math.round((child.completedChapters / child.totalChapters) * 100) : 0}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.averageScore') || 'Average Score'}</p>
                              <p className="text-2xl font-bold">{child.averageScore}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.achievementPoints') || 'Achievement Points'}</p>
                              <p className="text-2xl font-bold">{child.points}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t('parent.chaptersProgress') || 'Chapters Progress'}</p>
                              <p className="text-lg font-bold">{child.completedChapters} / {child.totalChapters}</p>
                            </div>
                            <div className="w-16">
                              <Progress 
                                value={child.totalChapters > 0 ? (child.completedChapters / child.totalChapters) * 100 : 0} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t('parent.quizzesProgress') || 'Quizzes Progress'}</p>
                              <p className="text-lg font-bold">{child.completedQuizzes} / {child.totalQuizzes}</p>
                            </div>
                            <div className="w-16">
                              <Progress 
                                value={child.totalQuizzes > 0 ? (child.completedQuizzes / child.totalQuizzes) * 100 : 0} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="progress" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('parent.courseProgress') || 'Course Progress'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{t('parent.completedChapters') || 'Completed Chapters'}</span>
                              <span>{child.completedChapters} / {child.totalChapters}</span>
                            </div>
                            <Progress 
                              value={child.totalChapters > 0 ? (child.completedChapters / child.totalChapters) * 100 : 0} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="courses" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('parent.enrolledCourses') || 'المواد المسجلة'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {child.courses && child.courses.length > 0 ? (
                          <div className="space-y-3">
                            {child.courses.map((course: any) => {
                              const courseProgress = child.userProgress?.filter(
                                progress => progress.chapter?.course?.id === course.id && progress.isCompleted
                              ).length || 0;
                              const totalChapters = course.chapters?.length || 0;
                              const progressPercentage = totalChapters > 0 ? (courseProgress / totalChapters) * 100 : 0;
                              
                              return (
                                <div key={course.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">{course.title}</h4>
                                    <Badge variant="secondary">
                                      {courseProgress}/{totalChapters} {t('parent.chapters') || 'فصول'}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>{t('parent.progress') || 'التقدم'}</span>
                                      <span>{Math.round(progressPercentage)}%</span>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            {t('parent.noEnrolledCourses') || 'لا توجد دورات مسجلة'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="quizzes" className="space-y-4">
                    {/* Quiz Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.totalQuizzes') || 'Total Quizzes'}</p>
                              <p className="text-2xl font-bold">{child.totalQuizzes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.completedQuizzes') || 'Completed Quizzes'}</p>
                              <p className="text-2xl font-bold">{child.completedQuizzes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="text-sm font-medium">{t('parent.averageScore') || 'Average Score'}</p>
                              <p className="text-2xl font-bold">{child.averageScore}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Quiz Results */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('parent.recentQuizResults') || 'نتائج الاختبارات الأخيرة'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {child.recentQuizResults && child.recentQuizResults.length > 0 ? (
                          <div className="space-y-3">
                            {child.recentQuizResults.map((result: any) => (
                              <div key={result.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{result.quiz?.title}</h4>
                                  <Badge 
                                    variant={result.percentage >= 70 ? "default" : result.percentage >= 50 ? "secondary" : "destructive"}
                                  >
                                    {Math.round(result.percentage)}%
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {result.quiz?.course?.title}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>{t('parent.score') || 'الدرجة'}: {result.score}/{result.totalPoints}</span>
                                  <span>{t('parent.attempt') || 'المحاولة'}: {result.attemptNumber}</span>
                                  <span>{new Date(result.submittedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            {t('parent.noQuizResults') || 'لا توجد نتائج اختبارات'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
