/**
 * AI Analysis Tab - تبويب تحليلات الذكاء الاصطناعي
 * يعرض رؤى وتحليلات ذكية للبيانات
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Target,
  Zap,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAnalysisTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
}

export function AIAnalysisTab({ data, language, onAction: _onAction }: AIAnalysisTabProps) {
  const isRTL = language === 'ar';
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate mock AI insights based on data
  const generateInsights = () => {
    const insights = [];
    
    // Balance/Financial insights
    if (data.current_balance !== undefined || data.balance !== undefined) {
      const balance = data.current_balance || data.balance || 0;
      if (balance > 0) {
        insights.push({
          type: 'positive',
          icon: TrendingUp,
          title: isRTL ? 'رصيد إيجابي' : 'Positive Balance',
          description: isRTL 
            ? `الرصيد الحالي ${balance.toLocaleString()} وهو مؤشر جيد على السيولة`
            : `Current balance of ${balance.toLocaleString()} indicates good liquidity`,
          score: 85,
        });
      } else if (balance < 0) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: isRTL ? 'رصيد سالب' : 'Negative Balance',
          description: isRTL 
            ? `يوجد رصيد سالب بقيمة ${Math.abs(balance).toLocaleString()} يحتاج متابعة`
            : `Negative balance of ${Math.abs(balance).toLocaleString()} needs attention`,
          score: 35,
        });
      }
    }

    // Activity insights
    if (data.transaction_count || data.transactionCount) {
      const count = data.transaction_count || data.transactionCount;
      insights.push({
        type: count > 50 ? 'positive' : 'info',
        icon: BarChart3,
        title: isRTL ? 'نشاط المعاملات' : 'Transaction Activity',
        description: isRTL 
          ? `تم تسجيل ${count} معاملة، ${count > 50 ? 'نشاط عالي' : 'نشاط معتدل'}`
          : `${count} transactions recorded, ${count > 50 ? 'high activity' : 'moderate activity'}`,
        score: Math.min(count * 2, 100),
      });
    }

    // Status insights
    if (data.status === 'active' || data.is_active) {
      insights.push({
        type: 'positive',
        icon: CheckCircle2,
        title: isRTL ? 'حالة نشطة' : 'Active Status',
        description: isRTL ? 'الحساب/السجل في حالة نشطة وجاهز للاستخدام' : 'Account/record is active and operational',
        score: 100,
      });
    }

    // Add default insights if none generated
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        icon: Lightbulb,
        title: isRTL ? 'تحليل البيانات' : 'Data Analysis',
        description: isRTL ? 'البيانات متاحة للتحليل. انقر لتحديث التحليل.' : 'Data available for analysis. Click to refresh analysis.',
        score: 50,
      });
    }

    return insights;
  };

  const insights = generateInsights();

  // Recommendations based on data type
  const getRecommendations = () => {
    const recommendations = [];
    
    if (data.credit_limit && data.current_balance) {
      const usage = (data.current_balance / data.credit_limit) * 100;
      if (usage > 80) {
        recommendations.push({
          priority: 'high',
          text: isRTL ? 'يُنصح بمراجعة الحد الائتماني - الاستخدام يتجاوز 80%' : 'Review credit limit - usage exceeds 80%',
        });
      }
    }

    if (data.last_activity) {
      const lastActivity = new Date(data.last_activity);
      const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        recommendations.push({
          priority: 'medium',
          text: isRTL ? `لا يوجد نشاط منذ ${daysSince} يوم - يُنصح بالمتابعة` : `No activity for ${daysSince} days - follow-up recommended`,
        });
      }
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        text: isRTL ? 'الحساب في وضع جيد - استمر في المتابعة الدورية' : 'Account in good standing - continue regular monitoring',
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  // Calculate overall health score
  const healthScore = Math.round(insights.reduce((sum, i) => sum + i.score, 0) / insights.length);

  const handleRefreshAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {isRTL ? 'تحليلات الذكاء الاصطناعي' : 'AI Analysis'}
            </h3>
            <p className="text-xs text-gray-500">
              {isRTL ? 'رؤى ذكية مبنية على البيانات' : 'Smart insights based on data'}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshAnalysis}
          disabled={isAnalyzing}
        >
          <RefreshCw className={cn("w-4 h-4 me-2", isAnalyzing && "animate-spin")} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Health Score */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {isRTL ? 'مؤشر الصحة العامة' : 'Overall Health Score'}
            </span>
            <Badge className={cn(
              healthScore >= 70 ? 'bg-green-500' :
              healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500',
              'text-white'
            )}>
              {healthScore}%
            </Badge>
          </div>
          <Progress value={healthScore} className="h-3" />
          <p className="text-xs text-gray-500 mt-2">
            {healthScore >= 70 
              ? (isRTL ? 'حالة ممتازة' : 'Excellent condition')
              : healthScore >= 40 
                ? (isRTL ? 'يحتاج اهتمام' : 'Needs attention')
                : (isRTL ? 'يتطلب إجراء فوري' : 'Requires immediate action')
            }
          </p>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          {isRTL ? 'الرؤى الذكية' : 'Smart Insights'}
        </h4>
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <Card 
              key={index}
              className={cn(
                "border-s-4",
                insight.type === 'positive' && "border-s-green-500",
                insight.type === 'warning' && "border-s-yellow-500",
                insight.type === 'negative' && "border-s-red-500",
                insight.type === 'info' && "border-s-blue-500"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    insight.type === 'positive' && "bg-green-100 dark:bg-green-900/30",
                    insight.type === 'warning' && "bg-yellow-100 dark:bg-yellow-900/30",
                    insight.type === 'negative' && "bg-red-100 dark:bg-red-900/30",
                    insight.type === 'info' && "bg-blue-100 dark:bg-blue-900/30"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4",
                      insight.type === 'positive' && "text-green-600",
                      insight.type === 'warning' && "text-yellow-600",
                      insight.type === 'negative' && "text-red-600",
                      insight.type === 'info' && "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-gray-800 dark:text-gray-200">
                      {insight.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {insight.score}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommendations */}
      <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Target className="w-4 h-4" />
            {isRTL ? 'التوصيات' : 'Recommendations'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <ArrowRight className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  rec.priority === 'high' ? "text-red-500" :
                  rec.priority === 'medium' ? "text-yellow-500" : "text-green-500"
                )} />
                <span className="text-gray-700 dark:text-gray-300">{rec.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs">
          <Zap className="w-3 h-3 me-1" />
          {isRTL ? 'تحليل متقدم' : 'Advanced Analysis'}
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <BarChart3 className="w-3 h-3 me-1" />
          {isRTL ? 'تقرير مفصل' : 'Detailed Report'}
        </Button>
      </div>
    </div>
  );
}
