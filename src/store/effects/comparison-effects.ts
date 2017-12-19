import { Injectable } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";

import { Observable } from "rxjs/rx";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/observable/combineLatest";

import { DatabaseProvider } from "../../providers";
import { neighborhoodConfigs } from "../../configs";

import { TRIGGER_COMPARISON_READS, AddComparison } from "../actions";
import { IMeter, IComparison, IDateRange } from "../../interfaces";
import { ChartHelper } from "../../helpers/chart-helper";

@Injectable()
export class ComparisonEffects {
  @Effect()
  public getNeighborhoodReads$ = this._actions$
    .ofType(TRIGGER_COMPARISON_READS)
    .map((action: any) => action.payload)
    .switchMap((data: any) => {
      const { meter, dateRange } = data;

      return Observable.combineLatest(
        Observable.of(meter),
        Observable.of(dateRange),
        this._db.getNeighborhoodGroupIds(meter)
      )
    })
    .switchMap((data: any) => {
      const [ meter, dateRange, group ] = data;
      const { startDate, endDate } = dateRange;

      const neighborhoodGroupID = group["group_id"];
      const ncmpAvgGuid = `${neighborhoodGroupID}${neighborhoodConfigs.NEIGHBORHOOD_COMP_AVG_GUID}`;
      const ncmpEffGuid = `${neighborhoodGroupID}${neighborhoodConfigs.NEIGHBORHOOD_COMP_EFF_GUID}`;

      const newMeter = Object.assign({}, meter, {
        _ncmpAvgGuid: ncmpAvgGuid,
        _ncmpEffGuid: ncmpEffGuid
      });

      return Observable.combineLatest(
        Observable.of(newMeter),
        Observable.of(dateRange),
        this._db.getReadsByDateRange(meter._guid, startDate, endDate),
        this._db.getReadsByNeighborhood(ncmpAvgGuid, startDate, endDate),
        this._db.getReadsByNeighborhood(ncmpEffGuid, startDate, endDate)
      );
    })
    .map((data: any[]) => {
      const [ meter, dateRange, usage, avg, eff ] = data;

      if (!usage.length && !avg.length && !eff.length) {
        return new AddComparison(null);
      }

      // format data for average
      let avgDeltas = [];
      if (avg && avg.length) {
        const avgLineData = avg.map(d => {
          return {
            date: d.date,
            line1: d.delta
          }
        });

        // group data by time span
        avgDeltas = ChartHelper.groupDeltasByTimeSpan(dateRange, avgLineData);
      }

      // efficiency data
      let effDeltas = [];
      if (eff && eff.length) {
        const effLineData = eff.map(d => {
          return {
            date: d.date,
            line1: d.delta
          }
        });
        effDeltas = ChartHelper.groupDeltasByTimeSpan(dateRange, effLineData);
      }

      // consumption data
      let useDeltas = [];
      if (usage && usage.length) {
        const rawDeltas = ChartHelper.getDeltas(usage);
        const normalizedDeltas = ChartHelper.normalizeData(rawDeltas);

        useDeltas = normalizedDeltas.length ? ChartHelper.groupDeltasByTimeSpan(dateRange, normalizedDeltas) : [];
      }

      let combinedChartData = [];
      let loopDeltas;
      if (useDeltas.length) {
        loopDeltas = useDeltas;
      } else if (avgDeltas.length) {
        loopDeltas = avgDeltas;
      } else {
        loopDeltas = effDeltas;
      }

      for (let i = 0; i < loopDeltas.length; i++) {
        if (!useDeltas.length) {
          combinedChartData.push({
            date: loopDeltas[i].date,
            line2: avgDeltas[i].line1 || 0,
            line3: effDeltas[i].line1 || 0
          });
        } else if (!avgDeltas.length) {
          combinedChartData.push({
            date: loopDeltas[i].date,
            line1: useDeltas[i].line1 || 0,
            line3: effDeltas[i].line1 || 0
          });
        } else if (!effDeltas.length) {
          combinedChartData.push({
            date: loopDeltas[i].date,
            line1: useDeltas[i].line1 || 0,
            line2: avgDeltas[i].line1 || 0
          });
        } else {
          combinedChartData.push({
            date: loopDeltas[i].date,
            line1: useDeltas[i].line1 || 0,
            line2: avgDeltas[i].line1 || 0,
            line3: effDeltas[i].line1 || 0
          });
        }
      }

      const payload: IComparison = {
        guid: meter._guid,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        reads: combinedChartData
      };

      return new AddComparison(payload);
    });

  constructor(
    private readonly _actions$: Actions,
    private readonly _db: DatabaseProvider,
  ) { }
}