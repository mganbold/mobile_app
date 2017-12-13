import { Action } from '@ngrx/store';
import { IReads, IMeter } from '../../interfaces';

export const ADD_READS: string = "[Reads] ADD READS";
export const LOAD_READS_FROM_DB: string = "[Reads] LOAD READS FROM DB";
export const LOAD_READS_BY_DATE: string = "[Reads] LOAD READS BY DATE";
export const LOADING_READS: string = "[Reads] LOADING READS";

export class AddReads implements Action {
	public readonly type = ADD_READS;
	public payload: IReads | null;

	constructor(private _payload: IReads) {
		this.payload = _payload;
	}
}

export class LoadReadsByDateRange implements Action {
	public readonly type = LOAD_READS_BY_DATE;
	public payload: any | null;

	constructor(private _payload: any) {
		this.payload = _payload;
	}
}

export class LoadingReads implements Action {
	public readonly type = LOADING_READS;
	public payload = null;
}

export class LoadReadsFromDb implements Action {
	public readonly type = LOAD_READS_FROM_DB;
	public payload: IMeter[] | null;

	constructor(private _payload: IMeter[]) {
		this.payload = _payload;
	}
}
