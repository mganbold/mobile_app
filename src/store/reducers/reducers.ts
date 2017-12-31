import { ActionReducerMap, MetaReducer } from "@ngrx/store";
import { IMeter, IUser, IReads, IComparison, IProvider } from "../../interfaces";

import { storeFreeze } from "ngrx-store-freeze";
import { environment } from "../../environments/environment"; // Angular CLI environment

import { meterReducer } from "./meter-reducer";
import { userReducer } from "./user-reducer";
import { readsReducer } from "./reads-reducer";
import { comparisonReducer } from "./comparison-reducer";

export interface AppState {
	meters: {
		data: IMeter[] | null,
		loading: boolean,
		lastUpdatedDate: Date | null,
		providerType: any,
		provider: IProvider
	},
	reads: { data: IReads[] | null, loading: boolean },
	comparison: { data: IComparison[] | null, loading: boolean, neighborhoodGroup: any },
	user: IUser | null
}

export const reducers: ActionReducerMap<AppState> = {
	meters: meterReducer,
	user: userReducer,
	reads: readsReducer,
	comparison: comparisonReducer
};

// TODO: We may use this in the future.
/**
 * When not in production, it is initialized with a meta reducer that prevents state from being mutated.
 * When mutation occurs, an exception will be thrown.
 */
export const metaReducers: MetaReducer<AppState>[] = !environment.production ? [storeFreeze] : [];

export function metaReducedMeterReducer(state, action) {
	const newState = meterReducer(state, action);

	// TODO: We can do other stuff here such as logging, etc.

	return newState;
}
