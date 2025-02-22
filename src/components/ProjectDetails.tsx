import React, { useState, useMemo } from 'react';
import type { GrippProject } from '../types/gripp';

interface ProjectDetailsProps {
  project: GrippProject;
  onClose: () => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onClose }) => {
  const [viewMode, setViewMode] = useState<'detailed' | 'products'>('products');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Aggregate project lines by product
  const productGroups = useMemo(() => {
    return project.projectlines
      .filter(line => 
        !line.rowtype?.searchname?.includes('GROEPLABEL') && 
        !line.searchname?.includes('Gripp Intern') &&
        !line.searchname?.includes('Groepstotaal afronding')
      )
      .reduce((groups, line) => {
        const productName = line.searchname.split(' (')[0]; // Remove the (Fixed) part
        if (!groups[productName]) {
          groups[productName] = {
            name: productName,
            written: 0,
            budgeted: 0,
            lines: []
          };
        }
        groups[productName].written += line.amountwritten ? parseFloat(line.amountwritten) : 0;
        groups[productName].budgeted += line.amount || 0;
        groups[productName].lines.push(line);
        return groups;
      }, {} as Record<string, { name: string; written: number; budgeted: number; lines: typeof project.projectlines }>);
  }, [project.projectlines]);

  // Prevent rendering internal projects
  if (project.name?.includes('Gripp Intern')) {
    onClose();
    return null;
  }

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
      currency: 'EUR' 
    }).format(numValue);
  };

  // Format date
  const formatDate = (date: { date: string }) => {
    return new Date(date.date).toLocaleDateString('nl-NL');
  };

  // Toggle product expansion
  const toggleProduct = (productName: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {project.name || `Project #${project.number}`}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {project.company?.searchname} • {project.phase?.searchname}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-8">
            {/* Progress Bar */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Voortgang</span>
                <span 
                  className="text-sm font-medium"
                  style={{ color: getProgressColor(progressPercentage) }}
                >
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, progressPercentage)}%`,
                    backgroundColor: getProgressColor(progressPercentage)
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm text-gray-500">
                <span>{totalHoursWritten.toFixed(1)} / {totalHoursBudgeted.toFixed(1)} uur</span>
                <span>{formatCurrency(project.totalexclvat)} excl. BTW</span>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex">
              {/* Left Column - Project Info */}
              <div className="w-1/3 min-w-[400px] bg-gray-50 rounded-lg p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Informatie</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Template</dt>
                        <dd className="text-sm font-medium text-gray-900">{project.templateset?.searchname}</dd>
                      </div>
                      {project.employees_starred && project.employees_starred.length > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Project Manager</dt>
                          <dd className="text-sm font-medium text-gray-900">{project.employees_starred[0].searchname}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Project Nummer</dt>
                        <dd className="text-sm font-medium text-gray-900">#{project.number}</dd>
                      </div>
                      {project.clientreference && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Klant Referentie</dt>
                          <dd className="text-sm font-medium text-gray-900">{project.clientreference}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Planning</h3>
                    <dl className="space-y-3">
                      {project.startdate && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Start Datum</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatDate(project.startdate)}</dd>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Deadline</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatDate(project.deadline)}</dd>
                        </div>
                      )}
                      {project.deliverydate && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Opleverdatum</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatDate(project.deliverydate)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Omschrijving</h3>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div 
                          className="prose prose-sm max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: project.description }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section - Project Lines */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Project Regels</h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('detailed')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                        viewMode === 'detailed'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm">Gedetailleerd</span>
                    </button>
                    <button
                      onClick={() => setViewMode('products')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                        viewMode === 'products'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm">Per Product</span>
                    </button>
                  </div>
                </div>

                {viewMode === 'products' ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.values(productGroups)
                      .sort((a, b) => b.budgeted - a.budgeted)
                      .map((group, index) => {
                        const progress = group.budgeted > 0 
                          ? (group.written / group.budgeted) * 100 
                          : 0;

                        return (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg">
                            <button 
                              onClick={() => toggleProduct(group.name)}
                              className="w-full text-left p-4"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-medium text-gray-900">
                                      {group.name}
                                    </h4>
                                    <svg 
                                      className={`w-4 h-4 text-gray-500 transition-transform ${expandedProducts[group.name] ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      viewBox="0 0 24 24" 
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {group.lines.length} {group.lines.length === 1 ? 'regel' : 'regels'}
                                  </p>
                                </div>
                                <span 
                                  className="text-sm font-medium"
                                  style={{ color: getProgressColor(progress) }}
                                >
                                  {progress.toFixed(1)}%
                                </span>
                              </div>
                              
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.min(100, progress)}%`,
                                    backgroundColor: getProgressColor(progress)
                                  }}
                                />
                              </div>
                              
                              <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  {group.written.toFixed(1)} / {group.budgeted.toFixed(1)} uur
                                </span>
                                <span className="text-gray-500">
                                  {((group.written / totalHoursWritten) * 100).toFixed(1)}% van totaal
                                </span>
                              </div>
                            </button>

                            {/* Collapsible Project Lines Detail */}
                            {expandedProducts[group.name] && (
                              <div className="border-t border-gray-200 p-4 bg-white">
                                {group.lines.map((line, lineIndex) => {
                                  const written = line.amountwritten ? parseFloat(line.amountwritten) : 0;
                                  const budgeted = line.amount || 0;
                                  const lineProgress = budgeted > 0 ? (written / budgeted) * 100 : 0;

                                  return (
                                    <div key={lineIndex} className="text-sm py-2">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-700">{line.description || line.searchname}</span>
                                        <span 
                                          className="text-sm font-medium"
                                          style={{ color: getProgressColor(lineProgress) }}
                                        >
                                          {lineProgress.toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {written.toFixed(1)} / {budgeted.toFixed(1)} uur
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.projectlines
                      .filter(line => !line.searchname?.includes('Gripp Intern'))
                      .reduce((groups, line) => {
                        if (line.rowtype?.searchname === 'GROEPLABEL') {
                          return [...groups, { label: line.searchname, items: [] }];
                        }
                        if (groups.length === 0) {
                          return [{ label: 'Overig', items: [line] }];
                        }
                        const currentGroup = groups[groups.length - 1];
                        currentGroup.items.push(line);
                        return groups;
                      }, [] as { label: string; items: typeof project.projectlines }[])
                      .map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-3">
                          <div className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">
                            {group.label.replace(/^Groep\s+/i, '')}
                          </div>
                          <div className="space-y-3">
                            {group.items.map((line, index) => {
                              const written = line.amountwritten ? parseFloat(line.amountwritten) : 0;
                              const budgeted = line.amount || 0;
                              const progress = budgeted > 0 ? (written / budgeted) * 100 : 0;

                              return (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-gray-900">{line.description || line.searchname}</span>
                                    <span 
                                      className="text-sm font-medium"
                                      style={{ color: getProgressColor(progress) }}
                                    >
                                      {progress.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ 
                                        width: `${Math.min(100, progress)}%`,
                                        backgroundColor: getProgressColor(progress)
                                      }}
                                    />
                                  </div>
                                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                                    <span>{written.toFixed(1)} / {budgeted.toFixed(1)} uur</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails; 
