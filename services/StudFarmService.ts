import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { PagedResponse, SearchParams } from '@/models/common';
import { StudFarm } from '@/models/StudFarm';

const baseUrl = `${API_URL}v1/stud-farms`;

export const studFarmService = {
    search: async (params: SearchParams<StudFarm>): Promise<PagedResponse<StudFarm>> => {
        const limit = params.pageRequest?.size ?? 10;
        const pageNumber = params.pageRequest?.page ?? 0;
        const offset = pageNumber * limit;
        
        let filterParams: any = {};
        if (params.filter) {
            const pairs = params.filter.split(';');
            for (const pair of pairs) {
                const [key, val] = pair.includes('==') ? pair.split('==') : pair.split('=');
                if (key && val) {
                    if (key === 'search' || key === 'q') {
                        filterParams.q = val;
                    } else if (key === 'sortBy' || key === 'sortField' || key === 'sort_by') {
                        filterParams.sortBy = val;
                    } else if (key === 'sortDir' || key === 'sortDirection' || key === 'sort_dir') {
                        filterParams.sortDir = val;
                    }
                } else if (!pair.includes('=')) {
                    filterParams.q = pair;
                }
            }
        }

        if (params.pageRequest?.sort && params.pageRequest.sort.length > 0) {
            filterParams.sortBy = params.pageRequest.sort[0].property;
            filterParams.sortDir = params.pageRequest.sort[0].direction;
        }

        const response = await axiosInstance.get(baseUrl, {
            params: {
                cursor: params.cursor || undefined,
                limit,
                offset,
                ...filterParams
            }
        });

        // Backend response is expected to match StudFarmListResponse
        const data = response.data;

        const content = (data.items ?? []).map((item: any) => ({
            id: item.id,
            firstName: item.first_name,
            lastName: item.last_name,
            email: item.email,
            phone: item.phone,
            location: item.location,
            interviewCount: item.interview_count || 0,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            latestInterviewDate: item.latest_interview_date,
            interviewerName: item.interviewer_name,
            interviewNotesUrl: item.interview_notes_url,
        }));

        const totalElements = data.totalCount ?? content.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / limit));

        return {
            content,
            page: {
                size: limit,
                number: pageNumber,
                totalElements,
                totalPages,
                hasMore: Boolean(data.hasMore),
                nextCursor: data.nextCursor ?? null,
            }
        };
    },

    createStudFarm: async (data: Partial<StudFarm>): Promise<StudFarm> => {
        const payload = {
            first_name: data.firstName,
            last_name: data.lastName ?? '',
            email: data.email ?? '',
            phone: data.phone || null,
            location: data.location || null,
        };
        const response = await axiosInstance.post(baseUrl, payload);
        const item = response.data;
        return {
            id: item.id,
            firstName: item.first_name,
            lastName: item.last_name,
            email: item.email,
            phone: item.phone,
            location: item.location,
            interviewCount: item.interview_count || 0,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            latestInterviewDate: item.latest_interview_date,
            interviewerName: item.interviewer_name,
            interviewNotesUrl: item.interview_notes_url,
        } as StudFarm;
    },

    
    updateStudFarm: async (id: string, data: Partial<StudFarm>): Promise<void> => {
        const payload = {
            first_name: data.firstName,
            last_name: data.lastName ?? '',
            email: data.email ?? '',
            phone: data.phone || null,
            location: data.location || null,
        };
        await axiosInstance.put(`${baseUrl}/${id}`, payload);
    },
    deleteStudFarm: async (id: string): Promise<void> => {
        await axiosInstance.delete(`${baseUrl}/${id}`);
    },

    addStudFarmNote: async (studFarmId: string, payload: any): Promise<void> => {
        await axiosInstance.post(`${baseUrl}/${studFarmId}/notes`, payload);
    },

    listStudFarmNotes: async (studFarmId: string): Promise<any[]> => {
        const response = await axiosInstance.get(`${baseUrl}/${studFarmId}/notes`);
        return response.data.items || [];
    },

    deleteStudFarmNote: async (studFarmId: string, noteId: string): Promise<void> => {
        await axiosInstance.delete(`${baseUrl}/${studFarmId}/notes/${noteId}`);
    },

    updateStudFarmNote: async (studFarmId: string, noteId: string, payload: any): Promise<void> => {
        await axiosInstance.put(`${baseUrl}/${studFarmId}/notes/${noteId}`, payload);
    }
};
