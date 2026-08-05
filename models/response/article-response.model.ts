import { BaseResponse } from '@/models/common';
import { ArticleTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface ArticleResponse extends BaseResponse {
  article: string;
  media: string;
  orderId: number;
  searchText: string;
  status: EntityStatusEnum;
  summary: string;
  title: string;
  type: ArticleTypeEnum;
}