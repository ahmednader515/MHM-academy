"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, BookOpen, Award, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { ScrollProgress } from "@/components/scroll-progress";
import { CurrencySelector } from "@/components/currency-selector";
import { useEffect, useState } from "react";
import { db } from "@/lib/db"; // Import db client
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";

// Define types based on Prisma schema
type Course = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  targetFaculty?: string | null;
  targetLevel?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Purchase = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
  targetCurriculum?: string | null;
  targetLevel?: string | null;
  targetLanguage?: string | null;
  targetGrade?: string | null;
};

export default function HomePage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        // Fetch courses from public API endpoint
        const response = await fetch("/api/courses/public");
        
        if (!response.ok) {
          console.error("Failed to fetch courses:", response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log("Fetched courses:", data); // Debug log
        setCourses(data);

      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollIndicator(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Trigger when 50% of the hero section is visible
      }
    );

    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => {
      if (heroSection) {
        observer.unobserve(heroSection);
      }
    };
  }, []);

  const scrollToCourses = () => {
    const coursesSection = document.getElementById('courses-section');
    if (coursesSection) {
      const offset = coursesSection.offsetTop - 112; // Adjust for navbar height
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="h-full w-full bg-background">
      <Navbar />
      <ScrollProgress />
      <CurrencySelector />
      {/* Hero Section */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 md:pt-0">
        {/* Hero Container */}
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Image Section - First on mobile */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="relative flex justify-center items-center order-1 md:order-2"
                >
                  <div className="relative w-96 h-64 md:w-[28rem] md:h-80">
                    <Image
                      src="/hero-img.jpg"
                      alt="MHM Academy"
                      fill
                      priority
                      className="object-cover rounded-2xl border-4 border-[#090919]/20 shadow-lg"
                      sizes="(max-width: 768px) 384px, 448px"
                    />
                  </div>
                  
                  {/* Floating Stationery Items */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: [0, -15, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.5,
                      y: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      rotate: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                    className="absolute top-1 -right-2"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Image
                      src="/open-book.png"
                      alt="Open Book"
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: [0, -12, 0],
                      rotate: [0, -5, 0]
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.7,
                      y: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      rotate: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                    className="absolute bottom-1/3 left-6"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <Image
                      src="/certificate.png"
                      alt="Certificate"
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: [0, -18, 0],
                      rotate: [0, 10, 0]
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.9,
                      y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      rotate: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                    className="absolute top-1/2 -right-6"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Image
                      src="/idea.png"
                      alt="Idea"
                      width={55}
                      height={55}
                      className="object-contain"
                    />
                  </motion.div>
                </motion.div>

                {/* Text Section - Second on mobile */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mt-0 md:mt-0 order-2 md:order-1"
                >
                  <h1 className="text-4xl md:text-6xl font-bold mb-4 font-cairo">
                    MHM Academy
                  </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-8" suppressHydrationWarning>
                  {t('home.subtitle')}
                </p>
                  <Button size="lg" asChild className="bg-[#090919] hover:bg-[#090919]/90 text-white">
                    <Link href="/sign-up">
                      <span suppressHydrationWarning>{t('home.getStarted')}</span> <ArrowRight className="mr-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </div>
            
            {/* Bottom Bar - Connected to Container */}
            <div className="bg-[#090919] text-white px-8 py-4 rounded-b-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-right">
                  <h3 className="text-lg font-bold">ندعوكم للانضمام إلينا</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    size="sm" 
                    className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                    asChild
                  >
                    <Link href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.214-.361a9.86 9.86 0 01-1.378-5.031c0-5.449 4.436-9.884 9.884-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.449-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      واتساب
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex-col items-center gap-2 cursor-pointer hidden md:flex"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            onClick={scrollToCourses}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}
      </section>

      {/* Courses Section */}
      <section id="courses-section" className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4" suppressHydrationWarning>{t('home.availableCourses')}</h2>
            <p className="text-muted-foreground" suppressHydrationWarning>{t('home.discoverCourses')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm animate-pulse"
                >
                  <div className="w-full aspect-video bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" suppressHydrationWarning>{t('home.noCoursesAvailable')}</h3>
                    <p className="text-muted-foreground mb-4" suppressHydrationWarning>
                      {t('home.noCoursesDescription')}
                    </p>
                    <Button 
                      variant="outline" 
                      asChild
                      className="bg-[#090919] hover:bg-[#090919]/90 text-white border-[#090919]"
                    >
                      <Link href="/sign-up">
                        <span suppressHydrationWarning>{t('home.signUpForEarlyAccess')}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative w-full aspect-video">
                      <Image
                        src={course.imageUrl || "/placeholder.png"}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      
                      {/* Target Audience Info */}
                      {(course.targetCurriculum || course.targetLevel || course.targetLanguage || course.targetGrade) && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {course.targetCurriculum && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {course.targetCurriculum === 'egyptian' ? 'المنهج المصري' : 'المنهج السعودي'}
                            </span>
                          )}
                          {course.targetLevel && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {course.targetLevel}
                            </span>
                          )}
                          {course.targetLanguage && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {course.targetLanguage === 'arabic' ? 'عربي' : 'لغات'}
                            </span>
                          )}
                          {course.targetGrade && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {course.targetGrade}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {course.chapters?.length || 0} {course.chapters?.length === 1 ? t('home.chapter') : t('home.chapters')}
                          {course.quizzes && course.quizzes.length > 0 && (
                            <span className="mr-2">، {course.quizzes.length} {course.quizzes.length === 1 ? t('home.quiz') : t('home.quizzes')}</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Course Price */}
                      {course.price && course.price > 0 && (
                        <div className="mb-4">
                          <span className="text-2xl font-bold text-[#090919]">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      )}
                      <Button 
                        className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white" 
                        variant="default"
                        asChild
                      >
                        <Link href={course.chapters && course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                          <span suppressHydrationWarning>{t('home.viewCourse')}</span>
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4" suppressHydrationWarning>{t('home.platformFeatures')}</h2>
            <p className="text-muted-foreground" suppressHydrationWarning>{t('home.featuresSubtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#090919]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-[#090919]" />
              </div>
              <h3 className="text-xl font-semibold mb-2" suppressHydrationWarning>{t('home.highQuality')}</h3>
              <p className="text-muted-foreground" suppressHydrationWarning>{t('home.highQualityDesc')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#090919]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-[#090919]" />
              </div>
              <h3 className="text-xl font-semibold mb-2" suppressHydrationWarning>{t('home.activeCommunity')}</h3>
              <p className="text-muted-foreground" suppressHydrationWarning>{t('home.activeCommunityDesc')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#090919]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-[#090919]" />
              </div>
              <h3 className="text-xl font-semibold mb-2" suppressHydrationWarning>{t('home.certificates')}</h3>
              <p className="text-muted-foreground" suppressHydrationWarning>{t('home.certificatesDesc')}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" suppressHydrationWarning>{t('home.startLearningJourney')}</h2>
            <p className="text-muted-foreground mb-8" suppressHydrationWarning>
              {t('home.joinToday')}
            </p>
            <Button size="lg" asChild className="bg-[#090919] hover:bg-[#090919]/90 text-white">
              <Link href="/sign-up">
                <span suppressHydrationWarning>{t('home.signUpNow')}</span> <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 