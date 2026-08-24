export interface StudFarm {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    interviewCount: number;
    createdAt: string;
    updatedAt: string;
    latestInterviewDate?: string;
    interviewerName?: string;
    interviewNotesUrl?: string;
}

export interface StudFarmResponse {
    content: StudFarm[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
    nextCursor?: string;
    prevCursor?: string;
}

export interface CreateStudFarmRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
}
