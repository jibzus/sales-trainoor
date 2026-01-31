"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesFeedback } from "@/lib/types";

interface FeedbackDisplayProps {
  feedback: SalesFeedback;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }): React.ReactElement {
  // Score is 1-10, convert to percentage
  const percentage = (score / 10) * 100;

  // Color based on score
  const getColor = (s: number): string => {
    if (s >= 8) return "text-green-500";
    if (s >= 6) return "text-yellow-500";
    if (s >= 4) return "text-orange-500";
    return "text-red-500";
  };

  const getBgColor = (s: number): string => {
    if (s >= 8) return "stroke-green-500";
    if (s >= 6) return "stroke-yellow-500";
    if (s >= 4) return "stroke-orange-500";
    return "stroke-red-500";
  };

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn("transition-all duration-1000", getBgColor(score))}
          strokeDasharray={`${percentage * 2.83} 283`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", getColor(score))}>{score}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">out of 10</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }): React.ReactElement {
  const percentage = (value / 10) * 100;

  const getBarColor = (v: number): string => {
    if (v >= 8) return "bg-green-500";
    if (v >= 6) return "bg-yellow-500";
    if (v >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getBarColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function FeedbackDisplay({ feedback }: FeedbackDisplayProps): React.ReactElement {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
        <ScoreGauge score={feedback.overallScore} />
      </div>

      {/* Summary */}
      <CollapsibleSection
        title="Summary"
        icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
        defaultOpen={true}
      >
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{feedback.summary}</p>
      </CollapsibleSection>

      {/* Strengths */}
      <CollapsibleSection
        title={`Strengths (${feedback.strengths.length})`}
        icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
        defaultOpen={true}
      >
        <ul className="space-y-2">
          {feedback.strengths.map((strength, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{strength}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Areas for Improvement */}
      <CollapsibleSection
        title={`Areas for Improvement (${feedback.improvements.length})`}
        icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
        defaultOpen={true}
      >
        <ul className="space-y-2">
          {feedback.improvements.map((improvement, index) => (
            <li key={index} className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{improvement}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Key Moments */}
      {feedback.keyMoments.length > 0 && (
        <CollapsibleSection
          title={`Key Moments (${feedback.keyMoments.length})`}
          icon={<Clock className="w-5 h-5 text-purple-500" />}
        >
          <div className="space-y-4">
            {feedback.keyMoments.map((moment, index) => (
              <div
                key={index}
                className="border-l-2 border-purple-500 pl-4 py-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  {moment.timestamp && (
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {moment.timestamp}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    <span>{moment.speaker}</span>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{moment.observation}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Metrics */}
      <CollapsibleSection
        title="Detailed Metrics"
        icon={<svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>}
      >
        <div className="space-y-4">
          <MetricBar label="Tone & Professionalism" value={feedback.metrics.toneProfessionalism} />
          <MetricBar label="Active Listening" value={feedback.metrics.activeListening} />
          <MetricBar label="Objection Handling" value={feedback.metrics.objectionHandling} />
          <MetricBar label="Closing Technique" value={feedback.metrics.closingTechnique} />
          <MetricBar label="Product Knowledge" value={feedback.metrics.productKnowledge} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
