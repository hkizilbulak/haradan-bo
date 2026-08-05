import { BaseRequest } from './base-request.model';
import { ArticleTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface ArticleRequest extends BaseRequest {
  article: string;
  orderId: number;
  status: EntityStatusEnum;
  summary: string;
  title: string;
  type: ArticleTypeEnum;
}