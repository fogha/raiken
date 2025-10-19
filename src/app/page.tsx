"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Zap, 
  Brain, 
  TestTube, 
  ArrowRight, 
  Play,
  Activity,
  BarChart3,
  Code2,
  Globe,
  Shield,
  Rocket
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  // Auto-redirect after 3 seconds for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/tests/editor');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Generation",
      description: "Intelligent test creation using advanced AI models",
      color: "from-purple-500 to-blue-600"
    },
    {
      icon: TestTube,
      title: "Visual Test Builder",
      description: "Interactive DOM inspection and test creation",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Activity,
      title: "Real-time Execution",
      description: "Live test execution with instant feedback",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: BarChart3,
      title: "Comprehensive Reports",
      description: "Detailed analytics with AI-powered insights",
      color: "from-orange-500 to-red-600"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-slate-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
              Raiken
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium">
              AI-Powered Test Automation Platform
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Create, execute, and analyze web tests with the power of artificial intelligence. 
              Modern testing made simple and intelligent.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button 
              asChild
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all px-8 py-3 text-lg"
            >
              <Link href="/tests/editor">
                <Play className="w-5 h-5 mr-2" />
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline" 
              size="lg"
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 text-lg"
            >
              <Link href="https://raiken-docs.vercel.app/">
                <Globe className="w-5 h-5 mr-2" />
                Documentation
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mx-auto shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Navigation */}
        <div className="pt-8">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link 
              href="/tests/editor" 
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <Code2 className="w-4 h-4" />
              Test Editor
            </Link>
            <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            <Link 
              href="/tests/manager" 
              className="flex items-center gap-2 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 transition-colors"
            >
              <Activity className="w-4 h-4" />
              Test Manager
            </Link>
            <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            <Link 
              href="/tests/reports" 
              className="flex items-center gap-2 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>

        {/* Auto-redirect notice */}
        <div className="pt-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
            <Rocket className="w-3 h-3" />
            Redirecting to Test Editor in a moment...
          </p>
        </div>
      </div>
    </div>
  );
}