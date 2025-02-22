import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchActiveProjects, fetchProjectDetails } from '../services/grippApi';
import { dbService } from '../services/dbService';
import type { GrippProject } from '../types/gripp';
import ProjectCard from './ProjectCard';
import ProjectDetails from './ProjectDetails';
import DashboardStats from './DashboardStats';
import { Filter, RefreshCw, AlertTriangle, LayoutDashboard, List } from 'lucide-react';
import Navbar from './Navbar';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minuten in milliseconden

type SortOption = {
  label: string;
  value: string;
  sortFn: (a: GrippProject, b: GrippProject) => number;
};

const sortOptions: SortOption[] = [
  {
    label: 'Deadline (meest urgent)',
    value: 'deadline-asc',
    sortFn: (a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline.date).getTime() - new Date(b.deadline.date).getTime();
    }
  },
  {
    label: 'Deadline (minst urgent)',
    value: 'deadline-desc',
    sortFn: (a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(b.deadline.date).getTime() - new Date(a.deadline.date).getTime();
    }
  },
  {
    label: 'Voortgang (oplopend)',
    value: 'progress-asc',
    sortFn: (a, b) => {
      const getProgress = (project: GrippProject) => {
        const written = project.projectlines.reduce((sum, line) => 
          sum + (line.amountwritten ? parseFloat(line.amountwritten) : 0), 0);
        const budgeted = project.projectlines.reduce((sum, line) => 
          sum + (line.amount || 0), 0);
        return budgeted > 0 ? (written / budgeted) * 100 : 0;
      };
      return getProgress(a) - getProgress(b);
    }
  },
  {
    label: 'Voortgang (aflopend)',
    value: 'progress-desc',
    sortFn: (a, b) => {
      const getProgress = (project: GrippProject) => {
        const written = project.projectlines.reduce((sum, line) => 
          sum + (line.amountwritten ? parseFloat(line.amountwritten) : 0), 0);
        const budgeted = project.projectlines.reduce((sum, line) => 
          sum + (line.amount || 0), 0);
        return budgeted > 0 ? (written / budgeted) * 100 : 0;
      };
      return getProgress(b) - getProgress(a);
    }
  },
  {
    label: 'Budget (hoogste eerst)',
    value: 'budget-desc',
    sortFn: (a, b) => parseFloat(b.totalexclvat) - parseFloat(a.totalexclvat)
  },
  {
    label: 'Budget (laagste eerst)',
    value: 'budget-asc',
    sortFn: (a, b) => parseFloat(a.totalexclvat) - parseFloat(b.totalexclvat)
  },
  {
    label: 'Naam (A-Z)',
    value: 'name-asc',
    sortFn: (a, b) => (a.name || '').localeCompare(b.name || '')
  },
  {
    label: 'Naam (Z-A)',
    value: 'name-desc',
    sortFn: (a, b) => (b.name || '').localeCompare(a.name || '')
  }
];

type DeadlinePeriod = {
  label: string;
  value: string;
  filter: (deadline: { date: string }) => boolean;
};

const deadlinePeriods: DeadlinePeriod[] = [
  {
    label: 'Alle deadlines',
    value: 'all',
    filter: () => true
  },
  {
    label: 'Deze week',
    value: 'this-week',
    filter: (deadline) => {
      const today = new Date();
      const deadlineDate = new Date(deadline.date);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      return deadlineDate <= endOfWeek && deadlineDate >= today;
    }
  },
  {
    label: 'Deze maand',
    value: 'this-month',
    filter: (deadline) => {
      const today = new Date();
      const deadlineDate = new Date(deadline.date);
      return deadlineDate.getMonth() === today.getMonth() && 
             deadlineDate.getFullYear() === today.getFullYear() &&
             deadlineDate >= today;
    }
  },
  {
    label: 'Volgende maand',
    value: 'next-month',
    filter: (deadline) => {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1);
      const deadlineDate = new Date(deadline.date);
      return deadlineDate.getMonth() === nextMonth.getMonth() && 
             deadlineDate.getFullYear() === nextMonth.getFullYear();
    }
  },
  {
    label: 'Verlopen',
    value: 'overdue',
    filter: (deadline) => {
      const today = new Date();
      const deadlineDate = new Date(deadline.date);
      return deadlineDate < today;
    }
  }
];

const progressRanges = [
  { label: 'Alle percentages', value: 'all', min: 0, max: Infinity },
  { label: '0-25%', value: '0-25', min: 0, max: 25 },
  { label: '25-50%', value: '25-50', min: 25, max: 50 },
  { label: '50-75%', value: '50-75', min: 50, max: 75 },
  { label: '75-100%', value: '75-100', min: 75, max: 100 },
  { label: '>100%', value: '100+', min: 100, max: Infinity }
] as const;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<GrippProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedProject, setSelectedProject] = useState<GrippProject | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('deadline-asc');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [selectedDeadline, setSelectedDeadline] = useState<string>('all');
  const [selectedProgress, setSelectedProgress] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeProjects = await fetchActiveProjects();
      if (activeProjects) {
        setProjects(activeProjects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Er is een fout opgetreden bij het laden van de projecten.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProjectClick = useCallback(async (id: number) => {
    try {
      setLoadingDetails(true);
      setError(null);
      const project = await fetchProjectDetails(id);
      if (project) {
        setSelectedProject(project);
      } else {
        setError('Project details konden niet worden geladen');
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError('Er is een fout opgetreden bij het laden van de project details');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Filter options
  const clients = useMemo(() => {
    const uniqueClients = new Set(projects.map(p => p.company?.searchname || '').filter(Boolean));
    return Array.from(uniqueClients).sort();
  }, [projects]);

  const starredEmployees = useMemo(() => {
    const uniqueEmployees = new Set(
      projects.flatMap(p => p.employees_starred?.map(e => e.searchname) || [])
    );
    return Array.from(uniqueEmployees).sort();
  }, [projects]);

  const phases = useMemo(() => {
    const uniquePhases = new Set(projects.map(p => p.phase?.searchname || '').filter(Boolean));
    return Array.from(uniquePhases).sort();
  }, [projects]);

  // Calculate project progress
  const getProjectProgress = (project: GrippProject): number => {
    const written = project.projectlines.reduce((sum, line) => 
      sum + (line.amountwritten ? parseFloat(line.amountwritten) : 0), 0);
    const budgeted = project.projectlines.reduce((sum, line) => 
      sum + (line.amount || 0), 0);
    return budgeted > 0 ? (written / budgeted) * 100 : 0;
  };

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    const filtered = projects
      .filter(project => !project.name?.includes('Gripp Intern'))  // Filter out internal projects
      .filter(project => {
        // Client filter
        if (selectedClient && project.company?.searchname !== selectedClient) {
          return false;
        }

        // Employee starred filter
        if (selectedEmployee && !project.employees_starred?.some(e => e.searchname === selectedEmployee)) {
          return false;
        }

        // Phase filter
        if (selectedPhase && project.phase?.searchname !== selectedPhase) {
          return false;
        }

        // Deadline filter
        if (selectedDeadline !== 'all' && project.deadline) {
          const deadlinePeriod = deadlinePeriods.find(p => p.value === selectedDeadline);
          if (deadlinePeriod && !deadlinePeriod.filter(project.deadline)) {
            return false;
          }
        }

        // Progress filter
        if (selectedProgress !== 'all') {
          const progress = getProjectProgress(project);
          const range = progressRanges.find(r => r.value === selectedProgress);
          if (range && (progress < range.min || progress >= range.max)) {
            return false;
          }
        }

        return true;
      });

    const sortOption = sortOptions.find(opt => opt.value === selectedSort);
    if (sortOption) {
      return [...filtered].sort(sortOption.sortFn);
    }
    return filtered;
  }, [projects, selectedClient, selectedEmployee, selectedSort, selectedPhase, selectedDeadline, selectedProgress]);

  // Initial load and auto refresh
  useEffect(() => {
    // Initial load
    loadProjects();

    // Set up auto refresh
    const intervalId = setInterval(loadProjects, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadProjects]);

  const forceRefresh = useCallback(async () => {
    try {
      setLoading(true);
      await dbService.clearDatabase();
      await loadProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Onbekende fout';
      setError(`Fout bij verversen data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bravoure-gray-200">
        <Navbar 
          onRefresh={loadProjects} 
          lastUpdate={lastUpdate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="loading-spinner mx-auto" />
            <div className="text-xl text-bravoure-gray-600 animate-fade-in">
              <div>Projecten laden...</div>
              <div className="text-sm text-bravoure-gray-400 mt-2">Even geduld alstublieft</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bravoure-gray-200">
      <Navbar 
        onRefresh={loadProjects} 
        lastUpdate={lastUpdate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <div className="w-full px-4 py-6">
        {viewMode === 'dashboard' ? (
          <DashboardStats projects={projects} />
        ) : (
          <>
            {/* Compact Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-bravoure-gray-500" />
                  <span className="text-sm font-medium text-bravoure-gray-700">Filters:</span>
                </div>
                
                <select 
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <select 
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Alle klanten</option>
                  {clients.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>

                <select
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <option value="">Alle medewerkers</option>
                  {starredEmployees.map(employee => (
                    <option key={employee} value={employee}>{employee}</option>
                  ))}
                </select>

                <select
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                >
                  <option value="">Alle fases</option>
                  {phases.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>

                <select
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedDeadline}
                  onChange={(e) => setSelectedDeadline(e.target.value)}
                >
                  {deadlinePeriods.map(period => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>

                <select
                  className="px-2 py-1 text-sm rounded-md border border-bravoure-gray-200 focus:outline-none focus:ring-2 focus:ring-bravoure-blue focus:border-transparent"
                  value={selectedProgress}
                  onChange={(e) => setSelectedProgress(e.target.value)}
                >
                  {progressRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setSelectedSort('deadline-asc');
                    setSelectedClient('');
                    setSelectedEmployee('');
                    setSelectedPhase('');
                    setSelectedDeadline('all');
                    setSelectedProgress('all');
                  }}
                  className="px-3 py-1 text-sm rounded-md border border-bravoure-gray-200 hover:bg-bravoure-gray-50 text-bravoure-gray-600 hover:text-bravoure-gray-900 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-bravoure-red rounded-lg p-4 mb-6 animate-slide-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-bravoure-red" />
                  <h2 className="text-lg font-medium text-red-700">Error</h2>
                </div>
                <p className="mt-2 text-red-600">{error}</p>
              </div>
            )}

            {/* Projects Grid */}
            <div className="bg-bravoure-gray-100 rounded-xl p-6 shadow-sm">
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project.id)}
                  />
                ))}
              </div>

              <div className="mt-6 text-sm text-bravoure-gray-500 text-center">
                {filteredProjects.length} projecten gevonden
              </div>
            </div>
          </>
        )}

        {/* Project Details Modal */}
        {selectedProject && (
          <ProjectDetails 
            project={selectedProject} 
            onClose={() => {
              setSelectedProject(null);
              setError(null);
            }} 
          />
        )}

        {/* Loading Details Overlay */}
        {loadingDetails && (
          <div className="fixed inset-0 bg-bravoure-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-xl">
              <div className="loading-spinner mx-auto mb-4" />
              <div className="text-lg text-center">Project details laden...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
