"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, BookOpen, Award, ChevronDown, Facebook } from "lucide-react";
import { Icons } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { ScrollProgress } from "@/components/scroll-progress";
import { CurrencySelector } from "@/components/currency-selector";
import { useEffect, useState } from "react";
import { db } from "@/lib/db"; // Import db client
import { useLanguage } from "@/lib/contexts/language-context";

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
                  className="relative flex justify-center items-center order-1 md:order-2 -mx-8 md:mx-0"
          >
                  <div className="relative w-full h-64 md:w-[28rem] md:h-80">
              <Image
                src="/hero-img.jpg"
                alt="MHM Online School"
                fill
                priority
                      className="object-cover rounded-2xl border-4 border-[#090919]/20 shadow-lg"
                      sizes="(max-width: 100%) 100vw, 448px"
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
                    className="absolute top-1 right-2 md:-right-2"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Image
                      src="/saudi-arabia.png"
                      alt="Saudi Arabia"
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
                    className="absolute bottom-1/3 left-2 md:left-6"
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <Image
                      src="/egypt.png"
                      alt="Egypt"
                width={50}
                height={50}
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
                  <h3 className="text-lg font-bold" suppressHydrationWarning>{t('home.joinUsInvitation')}</h3>
                </div>
                <div className="flex flex-row gap-2">
                  <Button 
                    asChild
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-1.5 rounded-md transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <Link href="https://www.facebook.com/MHM.academy100/" target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-3.5 w-3.5" />
                      <span suppressHydrationWarning>{t('home.followUsOnFacebook')}</span>
                    </Link>
                  </Button>
                  <Button 
                    asChild
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-md transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <Link href="https://wa.me/201002095452" target="_blank" rel="noopener noreferrer">
                      <Image 
                        src="/whatsapp.png" 
                        alt="WhatsApp" 
                        width={14} 
                        height={14} 
                        className="h-3.5 w-3.5"
                      />
                      <span suppressHydrationWarning>{t('home.contactUsOnWhatsApp')}</span>
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
            <h2 className="text-3xl font-bold mb-4" suppressHydrationWarning>{t('home.chooseYourCurriculum')}</h2>
            <p className="text-muted-foreground" suppressHydrationWarning>{t('home.curriculumSubtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            {/* Egyptian Curriculum Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col h-full"
            >
              <div className="relative w-full h-48 bg-gradient-to-br from-[#090919] to-[#1a1a2e] overflow-hidden">
                <Image
                  src="/egypt.jpg"
                  alt="Egyptian Curriculum"
                  fill
                  className="object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold" suppressHydrationWarning>{t('home.egyptianCurriculum')}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-4 text-gray-900" suppressHydrationWarning>{t('home.egyptianCurriculum')}</h3>
                <ul className="space-y-3 mb-6 text-gray-600 flex-grow">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.egyptianCurriculumDesc')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.arabicLanguages')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.generalAzhar')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.scientificLiterary')}</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 mt-auto"
                  asChild
                >
                  <Link href="/sign-up">
                    <span suppressHydrationWarning>{t('home.startWithEgyptian')}</span>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Saudi Curriculum Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col h-full"
            >
              <div className="relative w-full h-48 bg-gradient-to-br from-[#090919] to-[#1a1a2e] overflow-hidden">
                <Image
                  src="/saudi.jpg"
                  alt="Saudi Curriculum"
                  fill
                  className="object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold" suppressHydrationWarning>{t('home.saudiCurriculum')}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-4 text-gray-900" suppressHydrationWarning>{t('home.saudiCurriculum')}</h3>
                <ul className="space-y-3 mb-6 text-gray-600 flex-grow">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.saudiCurriculumDesc')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.ministryApproved')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.comprehensiveSubjects')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.periodicAssessments')}</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 mt-auto"
                  asChild
                >
                  <Link href="/sign-up">
                    <span suppressHydrationWarning>{t('home.startWithSaudi')}</span>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Summer Courses Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col h-full"
            >
              <div className="relative w-full h-48 bg-gradient-to-br from-[#090919] to-[#1a1a2e] overflow-hidden">
                <Image
                  src="/summer.jpg"
                  alt="Summer Courses"
                  fill
                  className="object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold" suppressHydrationWarning>{t('home.summerCourses')}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-4 text-gray-900" suppressHydrationWarning>{t('home.summerCourses')}</h3>
                <ul className="space-y-3 mb-6 text-gray-600 flex-grow">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.summerCoursesDesc')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.programming')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.english')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.arabicFoundation')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.quran')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#090919] rounded-full"></div>
                    <span suppressHydrationWarning>{t('home.adultTraining')}</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 mt-auto"
                  asChild
                >
                  <Link href="/sign-up">
                    <span suppressHydrationWarning>{t('home.startWithSummer')}</span>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Summer Courses Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col h-full"
            >
              <div className="relative w-full h-48 bg-gradient-to-br from-[#090919] to-[#1a1a2e] overflow-hidden">
                <Image
                  src="/hero-img.jpg"
                  alt="Center MHM Academy"
                  fill
                  className="object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold" suppressHydrationWarning>{t('home.centerMHMAcademy')}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-4 text-gray-900" suppressHydrationWarning>{t('home.centerMHMAcademy')}</h3>
                <div className="mb-6 text-gray-600 flex-grow">
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الاول الابتدائي عربي /لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الثاني عربي /لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف التالت عربي/لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الرابع عربي /لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الخامس عربي /لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف السادس عربي /لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الاول الاعدادي عام عربي/لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف الثاني الاعدادي عام عربي/لغات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#090919] rounded-full"></div>
                      <span>الصف التالت الاعدادي عام عربي/لغات</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold py-3 mt-auto"
                  asChild
                >
                  <Link href="/sign-up">
                    <span suppressHydrationWarning>{t('home.startWithCenter')}</span>
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>

          {/* MHM Academy Centered Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-12"
          >
            <h2 className="text-4xl font-bold text-[#090919] mb-4" suppressHydrationWarning>{t('home.mhmAcademyTitle')}</h2>
            <p className="text-xl text-muted-foreground" suppressHydrationWarning>{t('home.mhmAcademySubtitle')}</p>
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