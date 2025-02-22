import axios from 'axios';
import { dbService } from './dbService';
import type { 
  GrippProject, 
  GrippDateObject,
  GrippTemplateSet,
  GrippValidFor,
  GrippPhase,
  GrippCompany,
  GrippIdentity,
  GrippEmployee,
  GrippProjectLine
} from '../types/gripp';

interface GrippApiResponse<T> {
  response?: T;
  error?: string;
}

const API_TOKEN = 'mi3Pq0Pfw6CtuFAtEoQ6gXIT7cra2c';

// Create axios instance that will work with the Vite proxy
const grippApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`
  }
});

// Debug logging voor requests
grippApi.interceptors.request.use(request => {
  // Log the request details
  console.log('Request:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    data: request.data
  });
  
  return request;
});

// Debug logging voor responses
grippApi.interceptors.response.use(response => {
  console.log('Response:', {
    status: response.status,
    headers: response.headers,
    data: response.data
  });

  if (Array.isArray(response.data) && response.data[0]?.error) {
    throw new Error(`Gripp API Error: ${response.data[0].error}`);
  }

  return response;
}, error => {
  console.error('API Error:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });
  throw error;
});

interface GrippProjectResponse {
  id: number;
  name: string;
  number: number;
  color: string | null;
  archivedon: GrippDateObject | null;
  clientreference: string;
  isbasis: boolean;
  archived: boolean;
  workdeliveraddress: string;
  createdon: GrippDateObject;
  updatedon: GrippDateObject | null;
  searchname: string;
  extendedproperties: Record<string, unknown> | null;
  totalinclvat: string;
  totalexclvat: string;
  startdate: GrippDateObject | null;
  deadline: GrippDateObject | null;
  deliverydate: GrippDateObject | null;
  enddate: GrippDateObject | null;
  addhoursspecification: boolean;
  description: string;
  filesavailableforclient: boolean;
  discr: string;
  templateset: GrippTemplateSet;
  validfor: GrippValidFor | null;
  accountmanager: GrippEmployee | null;
  phase: GrippPhase;
  company: GrippCompany;
  contact: GrippEmployee | null;
  identity: GrippIdentity;
  extrapdf1: { id: number; name: string; } | null;
  extrapdf2: { id: number; name: string; } | null;
  umbrellaproject: { id: number; name: string; } | null;
  tags: Array<{ id: number; name: string; }>;
  employees: GrippEmployee[];
  employees_starred: GrippEmployee[];
  files: Array<{ id: number; name: string; }>;
  projectlines: GrippProjectLine[];
  viewonlineurl: string;
}

const transformGrippProject = (project: GrippProjectResponse): GrippProject => ({
  id: project.id,
  name: project.name || '',
  number: project.number,
  color: project.color,
  archivedon: project.archivedon,
  clientreference: project.clientreference,
  isbasis: project.isbasis,
  archived: project.archived,
  workdeliveraddress: project.workdeliveraddress,
  createdon: project.createdon,
  updatedon: project.updatedon,
  searchname: project.searchname,
  extendedproperties: project.extendedproperties,
  totalinclvat: project.totalinclvat || '0.00',
  totalexclvat: project.totalexclvat || '0.00',
  startdate: project.startdate,
  deadline: project.deadline,
  deliverydate: project.deliverydate,
  enddate: project.enddate,
  addhoursspecification: project.addhoursspecification,
  description: project.description,
  filesavailableforclient: project.filesavailableforclient,
  discr: project.discr,
  templateset: project.templateset,
  validfor: project.validfor,
  accountmanager: project.accountmanager,
  phase: project.phase,
  company: project.company,
  contact: project.contact,
  identity: project.identity,
  extrapdf1: project.extrapdf1,
  extrapdf2: project.extrapdf2,
  umbrellaproject: project.umbrellaproject,
  tags: project.tags,
  employees: project.employees,
  employees_starred: project.employees_starred,
  files: project.files,
  projectlines: project.projectlines,
  viewonlineurl: project.viewonlineurl
});

// Define filters for active projects
const filters = [
  {
    field: 'project.archived',
    operator: 'equals',
    value: false
  }
];

// Simple test function that logs everything
export const testApiConnection = async () => {
  try {
    console.log('=== API TEST START ===');
    
    const response = await grippApi.post('/public/api3.php', 
      [{
        token: API_TOKEN,
        method: 'project.get',
        params: [[{
          field: 'project.archived',
          operator: 'equals',
          value: false
        }], {
          paging: {
            firstresult: 0,
            maxresults: 50
          },
          orderings: [{
            field: 'project.id',
            direction: 'asc'
          }]
        }],
        id: 1
      }]
    );
    
    console.log('=== API TEST SUCCESS ===');
    console.log('Raw Response:', response.data);
    
    // Log project details for debugging
    if (response.data[0]?.result?.rows) {
      console.log('=== PROJECT DETAILS ===');
      response.data[0].result.rows.forEach((project: any) => {
        console.log(`Project: ${project.name}`);
        console.log('Phase:', project.phase);
        console.log('Company:', project.company);
        console.log('Template:', project.templateset);
        console.log('---');
      });
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.log('=== API TEST ERROR ===');
    if (axios.isAxiosError(error)) {
      console.log('Full Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Update fetchActiveProjects to use correct request structure
export async function fetchActiveProjects(): Promise<GrippProject[]> {
  try {
    // First try to get projects from IndexedDB
    const cachedProjects = await dbService.getAllProjects();
    
    // If we have cached projects, use them immediately
    if (cachedProjects.length > 0) {
      console.log('Using cached projects:', cachedProjects.length);
      // Only sync if cache is older than 5 minutes
      const lastModified = await dbService.getLastModified();
      const cacheAge = lastModified ? Date.now() - new Date(lastModified).getTime() : Infinity;
      if (cacheAge > 5 * 60 * 1000) {
        console.log('Cache is older than 5 minutes, syncing in background...');
        setTimeout(() => syncProjects().catch(console.error), 0);
      }
      return cachedProjects.filter(project => project.company?.id !== 95597);
    }

    // If no cached data, fetch from API
    console.log('No cached data, fetching from API...');
    const response = await grippApi.post('/public/api3.php', [{
      token: API_TOKEN,
      method: 'project.get',
      params: [
        [{
          field: 'project.archived',
          operator: 'equals',
          value: false
        }],
        {
          paging: {
            firstresult: 0,
            maxresults: 250
          },
          orderings: [{
            field: 'project.updatedon',
            direction: 'desc'
          }],
          // Request all needed fields in one go
          fields: [
            'project.id',
            'project.name',
            'project.number',
            'project.color',
            'project.totalexclvat',
            'project.totalinclvat',
            'project.deadline',
            'project.phase',
            'project.company',
            'project.projectlines',
            'project.employees_starred',
            'project.tags'
          ]
        }
      ],
      id: 1
    }]);

    if (Array.isArray(response.data) && response.data[0]?.error) {
      throw new Error(response.data[0].error);
    }

    const allProjects = response.data[0]?.result?.rows || [];
    const filteredProjects = allProjects.filter((project: any) => project.company?.id !== 95597);
    
    // Save to cache immediately
    await dbService.saveProjects(filteredProjects);
    console.log('Saved', filteredProjects.length, 'projects to cache');
    
    return filteredProjects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    // If API fails but we have cached data, use that
    const cachedProjects = await dbService.getAllProjects();
    if (cachedProjects.length > 0) {
      console.log('API failed, using cached projects');
      return cachedProjects.filter(project => project.company?.id !== 95597);
    }
    throw error;
  }
}

// New function to load full project data in the background
async function loadFullProjectData(minimalProjects: GrippProject[]): Promise<void> {
  try {
    const response = await grippApi.post('/public/api3.php', [{
      token: API_TOKEN,
      method: 'project.get',
      params: [
        [{
          field: 'project.archived',
          operator: 'equals',
          value: false
        }],
        {
          paging: {
            firstresult: 0,
            maxresults: 250
          },
          fields: [
            'project.*',
            'project.tags.*',
            'project.employees.*',
            'project.employees_starred.*'
          ]
        }
      ],
      id: 1
    }]);

    if (response.data[0]?.result?.rows) {
      const fullProjects = response.data[0].result.rows;
      await dbService.saveProjects(fullProjects);
      console.log('Full project data loaded and cached');
    }
  } catch (error) {
    console.error('Error loading full project data:', error);
  }
}

// Update fetchProjectDetails to use correct request structure
export const fetchProjectDetails = async (projectId: number): Promise<GrippProject | null> => {
  try {
    const requestData = [{
      method: 'project.get',
      params: [
        [
          {
            field: 'project.id',
            operator: 'equals',
            value: projectId
          }
        ],
        {
          paging: {
            firstresult: 0,
            maxresults: 1
          }
        }
      ],
      id: 1
    }];

    const response = await grippApi.post('/public/api3.php', requestData);
    
    if (Array.isArray(response.data) && response.data[0]?.error) {
      throw new Error(response.data[0].error);
    }

    if (!Array.isArray(response.data) || !response.data[0]?.result?.rows?.[0]) {
      throw new Error('Project niet gevonden');
    }

    // Transform project data
    const project = transformGrippProject(response.data[0].result.rows[0]);
    return project;
  } catch (error) {
    console.error('Failed to fetch project details:', error);
    return null;
  }
};

export async function syncProjects(): Promise<void> {
  try {
    const response = await grippApi.post('/public/api3.php', [{
      token: API_TOKEN,
      method: 'project.get',
      params: [
        filters,
        {
          paging: {
            firstresult: 0,
            maxresults: 50
          },
          orderings: [{
            field: 'project.id',
            direction: 'asc'
          }],
          fields: [
            'project.*',
            'project.tags.*'
          ]
        }
      ],
      id: 1
    }]);

    if (Array.isArray(response.data) && response.data[0]?.error) {
      throw new Error(response.data[0].error);
    }

    const newProjects = response.data[0]?.result?.rows || [];
    
    // Compare with cached data and only update if there are changes
    const cachedProjects = await dbService.getAllProjects();
    const hasChanges = JSON.stringify(newProjects) !== JSON.stringify(cachedProjects);
    
    if (hasChanges) {
      console.log('Changes detected, updating cache...');
      await dbService.saveProjects(newProjects);
    } else {
      console.log('No changes detected');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
} 
