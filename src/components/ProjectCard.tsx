import React from 'react';
import type { GrippProject } from '../types/gripp';

interface ProjectCardProps {
  project: GrippProject;
  onClick: (id: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const getProgressColor = (percentage: number): string => {
    if (percentage > 100) return 'var(--color-exceeded)';
    if (percentage >= 95) return 'var(--color-critical)';
    if (percentage >= 80) return 'var(--color-warning)';
    return 'var(--color-normal)';
  };

  // Calculate total hours written vs budgeted
  const totalHoursWritten = project.projectlines.reduce((acc, line) => {
    return acc + (line.amountwritten ? parseFloat(line.amountwritten) : 0);
  }, 0);

  const totalHoursBudgeted = project.projectlines.reduce((acc, line) => {
    return acc + (line.amount || 0);
  }, 0);

  const progressPercentage = totalHoursBudgeted > 0 
    ? (totalHoursWritten / totalHoursBudgeted) * 100 
    : 0;

  // Format currency
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('nl-NL', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  // Format date
  const formatDate = (date: { date: string }) => {
    return new Date(date.date).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (deadline: { date: string }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.date);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (days: number): string => {
    if (days < 0) return 'text-red-600';
    if (days <= 7) return 'text-orange-500';
    if (days <= 14) return 'text-yellow-500';
    return 'text-green-600';
  };

  return (
    <div 
      onClick={() => onClick(project.id)}
      className="bg-white rounded-xl shadow hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative border border-bravoure-gray-100"
    >
      {project.color && (
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: project.color }}
        />
      )}
      
      {/* Header Section */}
      <div className="px-6 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="font-medium text-bravoure-black text-lg truncate">
              {project.name || `Project #${project.number}`}
            </h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-bravoure-gray-500">
                <span>{project.company?.searchname}</span>
                {project.phase && (
                  <>
                    <span>•</span>
                    <span>{project.phase.searchname}</span>
                  </>
                )}
                {project.employees_starred && project.employees_starred.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-bravoure-gray-700">{project.employees_starred[0].searchname}</span>
                  </>
                )}
              </div>
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {console.log('Project tags:', project.tags)}
                  {project.tags.map(tag => (
                    <span 
                      key={tag.id} 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-bravoure-blue/5 text-bravoure-blue border border-bravoure-blue/10"
                    >
                      {tag.searchname || tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Progress and Budget */}
          <div className="flex flex-col items-end text-right">
            <div className="text-sm font-medium" style={{ color: getProgressColor(progressPercentage) }}>
              {progressPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-bravoure-gray-500">
              {formatCurrency(project.totalexclvat)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="h-1.5 bg-bravoure-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min(100, progressPercentage)}%`,
              backgroundColor: getProgressColor(progressPercentage)
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-bravoure-gray-500">
          <span>{totalHoursWritten.toFixed(1)} / {totalHoursBudgeted.toFixed(1)} uur</span>
          {project.deadline && (
            <span className={getDeadlineColor(getDaysUntilDeadline(project.deadline))}>
              {formatDate(project.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;