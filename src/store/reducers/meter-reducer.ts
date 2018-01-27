import { ActionReducerMap } from "@ngrx/store";
import { IMeter } from "../../interfaces";
import * as ActionTypes from "../actions";

export interface MeterState {
	meters: {
		data: IMeter[] | null,
		loading: boolean
	};
}

export const meterReducerMap: ActionReducerMap<MeterState> = {
	meters: meterReducer
};

export function meterReducer(state = { data: [], loading: false}, action): any {
	switch (action.type) {
		case ActionTypes.ADD_METERS:
	    return Object.assign({}, state, { data: action.payload, loading: false });
		case ActionTypes.ADD_METER:
			if (!action.payload) {
				return state;
			}
			return Object.assign({}, state, { data: state.data.concat(action.payload), loading: false });
		case ActionTypes.REMOVE_METER:
			const meterToRemove = action.payload;
			const meters = state.data.filter((meter: IMeter) => {
				return meter._guid !== meterToRemove._guid || meter._name !== meterToRemove._name;
			});

			return Object.assign({}, state, { data: meters });
    case ActionTypes.TRIGGER_UPDATE_METER_READS:
		case ActionTypes.TRIGGER_UPDATE_METER_SETTINGS:
		  return Object.assign({}, state, { loading: true });
		case ActionTypes.UPDATE_METER:
		  if (!action.payload) {
				return state;
			}

			const { _guid } = action.payload;
			const filteredMeters = state.data.filter(meter => meter._guid !== _guid);
			const allMeters = sortByKey(Object.assign([], filteredMeters.concat(action.payload)), "_name");

			return Object.assign({}, state, { data: allMeters, loading: false });
		default:
			return state;
	}
}

function sortByKey(array: any[], key: string): any[] {
	return array.sort((a, b) => {
		const x = a[key];
		const y = b[key];

		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
}
