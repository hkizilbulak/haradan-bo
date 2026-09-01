import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { PagedResponse, SearchParams } from '@/models/common';
import { StudFarm } from '@/models/StudFarm';

const baseUrl = `${API_URL}v1/stud-farms`;

export const studFarmService = {
    search: async (params: SearchParams<StudFarm>): Promise<PagedResponse<StudFarm>> => {
        const limit = params.pageRequest.size ?? 10;
        
        let filterParams: any = {};
        if (params.filter) {
            // Very simple filter parsing for search=...
            const match = params.filter.match(/search=([^;]+)/);
            if (match) {
                filterParams.q = match[1];
            }
        }

        const response = await axiosInstance.get(baseUrl, {
            params: {
                cursor: params.cursor || undefined,
                limit,
                ...filterParams
            }
        });

        // Backend response is expected to match StudFarmListResponse
        // Let's map it safely if needed or directly return if it matches.
        const data = response.data;
        const pageNumber = params.pageRequest.page ?? 0;

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

        return {
            content,
            page: {
                size: limit,
                number: pageNumber,
                totalElements: data.totalCount ?? (data.items ?? []).length,
                totalPages: data.totalCount ? Math.max(1, Math.ceil(data.totalCount / limit)) : (data.hasMore ? pageNumber + 2 : pageNumber + 1),
                hasMore: Boolean(data.hasMore),
                nextCursor: data.nextCursor ?? null,
                cursorMode: true,
            }
        };
    },

    createStudFarm: async (data: Partial<StudFarm>): Promise<StudFarm> => {
        const payload = {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            location: data.location,
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
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            location: data.location,
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
