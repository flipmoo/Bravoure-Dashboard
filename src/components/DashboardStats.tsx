import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { GrippProject } from '../types/gripp';
import { 
  BarChart3, 
  AlertTriangle,
  AlertCircle,
  CircleDollarSign,
  Clock,
  Users,
  Activity
} from 'lucide-react';

interface DashboardStatsProps {
  projects: GrippProject[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ projects }) => {
  const stats = useMemo(() => {
    const total = projects.length;
    const overdue = projects.filter(p => {
      if (!p.deadline) return false;
      return new Date(p.deadline.date) < new Date();
    }).length;
    
    const totalBudget = projects.reduce((sum, p) => 
      sum + parseFloat(p.totalexclvat), 0);

    const overBudgetProjects = projects.filter(p => {
      const written = p.projectlines.reduce((sum, line) => 
        sum + (line.amountwritten ? parseFloat(line.amountwritten) : 0), 0);
      const budgeted = p.projectlines.reduce((sum, line) => 
        sum + (line.amount || 0), 0);
      return budgeted > 0 && (written / budgeted) > 1;
    }).length;

    // Nieuwe berekening voor projecten die bijna uit de uren lopen
    const nearingBudgetLimit = projects.filter(p => {
      const written = p.projectlines.reduce((sum, line) => 
        sum + (line.amountwritten ? parseFloat(line.amountwritten) : 0), 0);
      const budgeted = p.projectlines.reduce((sum, line) => 
        sum + (line.amount || 0), 0);
      const percentage = budgeted > 0 ? (written / budgeted) * 100 : 0;
      return percentage >= 80 && percentage <= 100;
    }).length;

    // Nieuwe statistieken
    const activeEmployees = new Set(
      projects.flatMap(p => p.employees_starred?.map(e => e.searchname) || [])
    ).size;

    const averageProjectValue = totalBudget / total;

    const projectsWithDeadline = projects.filter(p => p.deadline).length;
    const deadlinePercentage = (projectsWithDeadline / total) * 100;

    return {
      total,
      overdue,
      totalBudget,
      overBudget: overBudgetProjects,
      nearingBudgetLimit,
      activeEmployees,
      averageProjectValue,
      deadlinePercentage
    };
  }, [projects]);

  const projectTypeData = useMemo(() => {
    // Debug logging voor alle project tags
    console.log('=== PROJECT TAGS DEBUG ===');
    projects.forEach(project => {
      console.log(`\nProject: ${project.name}`);
      console.log('Tags:', project.tags);
      if (project.tags?.length > 0) {
        project.tags.forEach(tag => {
          console.log('Tag detail:', {
            id: tag.id,
            name: tag.name,
            searchname: tag.searchname,
            type: tag.type
          });
        });
      } else {
        console.log('No tags found for this project');
      }
    });

    // Definieer de relevante tags voor project types
    const tagCategories = {
      'Nacalculatie': ['nacalculatie', 'Nacalculatie'],
      'Vaste prijs': ['vaste prijs', 'Vaste prijs', 'fixed price'],
      'Contract': ['contract', 'Contract', 'SLA', 'sla'],
      'Intern': ['intern', 'Intern', 'Bravoure-projects', 'internal'],
      'Pitch': ['pitch', 'Pitch', 'prospect'],
      'Client': ['Client', 'client', 'klant', 'customer'],
      'Prospect': ['Prospect', 'Lead', 'lead'],
      'Service': ['Service hours', 'SLA', 'service'],
      'Project': ['Project', 'project'],
      'Development': ['Front-end', 'Back-end', 'Development-filter', 'development'],
      'Design': ['Visual Design', 'Design-Filter', 'design'],
      'Overig': [] // Voor projecten zonder specifieke tags
    };

    // Kleuren voor elke categorie
    const categoryColors = {
      'Nacalculatie': '#8b5cf6', // Paars
      'Vaste prijs': '#10b981', // Groen
      'Contract': '#2563eb',    // Blauw
      'Intern': '#f97316',      // Oranje
      'Pitch': '#ec4899',       // Roze
      'Client': '#0ea5e9',      // Lichtblauw
      'Prospect': '#84cc16',    // Limoen
      'Service': '#6366f1',     // Indigo
      'Project': '#14b8a6',     // Teal
      'Development': '#8b5cf6',  // Paars
      'Design': '#f43f5e',      // Rood
      'Overig': '#6b7280'       // Grijs
    };

    // Tel projecten per categorie
    const categoryCounts = Object.keys(tagCategories).reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<string, number>);

    projects.forEach(project => {
      let matched = false;
      
      // Debug logging voor categorisering
      console.log(`\nCategorizing project: ${project.name}`);
      const projectTags = project.tags?.map(tag => ({
        name: tag.name?.toLowerCase() || '',
        searchname: tag.searchname?.toLowerCase() || '',
        type: tag.type?.toLowerCase() || ''
      })) || [];
      
      console.log('Project tags:', projectTags);
      
      // Check project tags tegen categorieën
      for (const [category, tagList] of Object.entries(tagCategories)) {
        if (tagList.length === 0) continue;

        const hasMatchingTag = projectTags.some(projectTag => 
          tagList.some(categoryTag => {
            const categoryTagLower = categoryTag.toLowerCase();
            return (
              projectTag.name.includes(categoryTagLower) ||
              projectTag.searchname.includes(categoryTagLower) ||
              projectTag.type.includes(categoryTagLower)
            );
          })
        );

        if (hasMatchingTag) {
          console.log(`Matched category: ${category} with tags:`, tagList);
          categoryCounts[category]++;
          matched = true;
          break;
        }
      }
      
      // Als geen match gevonden, tel als 'Overig'
      if (!matched) {
        console.log('No match found, counting as: Overig');
        categoryCounts['Overig']++;
      }
    });

    console.log('\nFinal category counts:', categoryCounts);

    // Converteer naar het juiste formaat voor de chart en sorteer op aantal
    return Object.entries(categoryCounts)
      .filter(([_, count]) => count > 0) // Verwijder categorieën zonder projecten
      .sort((a, b) => b[1] - a[1]) // Sorteer op aantal (hoogste eerst)
      .map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name as keyof typeof categoryColors]
      }));
  }, [projects]);

  // Budget distributie data
  const budgetDistributionData = useMemo(() => {
    const ranges = [
      { min: 0, max: 5000, label: '€0 - €5k' },
      { min: 5000, max: 10000, label: '€5k - €10k' },
      { min: 10000, max: 25000, label: '€10k - €25k' },
      { min: 25000, max: 50000, label: '€25k - €50k' },
      { min: 50000, max: Infinity, label: '€50k+' }
    ];

    const distribution = ranges.map(range => ({
      name: range.label,
      value: projects.filter(p => {
        const budget = parseFloat(p.totalexclvat);
        return budget >= range.min && budget < range.max;
      }).length
    }));

    return distribution;
  }, [projects]);

  // Project fase distributie
  const phaseDistributionData = useMemo(() => {
    const phaseCount = projects.reduce((acc, project) => {
      const phase = project.phase?.searchname || 'Onbekend';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(phaseCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  // Deadline trend data
  const deadlineTrendData = useMemo(() => {
    const now = new Date();
    const monthsAhead = 6;
    const monthData = Array.from({ length: monthsAhead }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() + i);
      return {
        name: month.toLocaleString('nl-NL', { month: 'short' }),
        value: projects.filter(p => {
          if (!p.deadline) return false;
          const deadline = new Date(p.deadline.date);
          return deadline.getMonth() === month.getMonth() &&
                 deadline.getFullYear() === month.getFullYear();
        }).length
      };
    });

    return monthData;
  }, [projects]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {/* Stat cards */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-blue-50 rounded-full">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Totaal projecten</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-red-50 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Verlopen deadlines</p>
          <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-orange-50 rounded-full">
          <AlertCircle className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Over budget</p>
          <p className="text-2xl font-bold text-gray-900">{stats.overBudget}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-purple-50 rounded-full">
          <CircleDollarSign className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Totale waarde</p>
          <p className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('nl-NL', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0 
            }).format(stats.totalBudget)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-yellow-50 rounded-full">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Bijna uit uren</p>
          <p className="text-2xl font-bold text-gray-900">{stats.nearingBudgetLimit}</p>
        </div>
      </div>

      {/* Nieuwe stat cards */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-green-50 rounded-full">
          <Users className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Actieve medewerkers</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeEmployees}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-blue-50 rounded-full">
          <Activity className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Gem. projectwaarde</p>
          <p className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('nl-NL', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0 
            }).format(stats.averageProjectValue)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
        <div className="p-3 bg-yellow-50 rounded-full">
          <Clock className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Met deadline</p>
          <p className="text-2xl font-bold text-gray-900">{stats.deadlinePercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Grafieken in een nieuwe layout */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Type & Phase Distribution naast elkaar */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Project Type Verdeling</h3>
          <div className="h-[280px] flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={projectTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {projectTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow border">
                          <p className="text-xs font-medium">{data.name}</p>
                          <p className="text-xs text-gray-500">
                            {data.value} {data.value === 1 ? 'project' : 'projecten'} ({((data.value / stats.total) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 ml-2 text-xs flex-1">
              {projectTypeData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: entry.color || '#3b82f6' }}
                  />
                  <span className="text-gray-700">{entry.name}</span>
                  <span className="font-medium text-gray-900 ml-auto">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Project Fase Verdeling</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseDistributionData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={100} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow border">
                          <p className="text-xs font-medium">{data.name}</p>
                          <p className="text-xs text-gray-500">
                            {data.value} {data.value === 1 ? 'project' : 'projecten'} ({((data.value / stats.total) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Budget Verdeling</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetDistributionData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-45} textAnchor="end" height={60} />
                <YAxis width={25} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow border">
                          <p className="text-xs font-medium">{data.name}</p>
                          <p className="text-xs text-gray-500">
                            {data.value} {data.value === 1 ? 'project' : 'projecten'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deadline Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Deadline Trend</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deadlineTrendData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis width={25} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow border">
                          <p className="text-xs font-medium">{data.name}</p>
                          <p className="text-xs text-gray-500">
                            {data.value} {data.value === 1 ? 'deadline' : 'deadlines'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats; 