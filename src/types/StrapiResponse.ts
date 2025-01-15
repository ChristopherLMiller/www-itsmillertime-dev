import { Meta } from './Meta';

export interface StrapiResponse<T> {
	data: T[];
	meta: Meta;
}
