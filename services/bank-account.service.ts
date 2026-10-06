import { API_URL } from '@/contants/urls';
import { apiRequest } from '@/helpers/api/openapiClient';

export interface BankAccount {
  id: number;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string;
  account_number?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BankAccountCreateRequest {
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string;
  account_number?: string;
  is_active: boolean;
  display_order: number;
}

export interface BankAccountUpdateRequest {
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string;
  account_number?: string;
  is_active: boolean;
  display_order: number;
}

export const bankAccountService = {
  getAllAdmin: async (): Promise<BankAccount[]> => {
    return await apiRequest<BankAccount[]>('GET', `${API_URL}v1/admin/bank-accounts`);
  },

  create: async (data: BankAccountCreateRequest): Promise<BankAccount> => {
    return await apiRequest<BankAccount>('POST', `${API_URL}v1/admin/bank-accounts`, data);
  },

  update: async (id: number, data: BankAccountUpdateRequest): Promise<BankAccount> => {
    return await apiRequest<BankAccount>('PUT', `${API_URL}v1/admin/bank-accounts/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `${API_URL}v1/admin/bank-accounts/${id}`);
  }
};
