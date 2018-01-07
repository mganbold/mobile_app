import { Injectable } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";

import { StoreServices } from "../../store/services";

import { Observable } from "rxjs/rx";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/observable/combineLatest";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/timeout";
import "rxjs/add/operator/timeoutWith";

import { DatabaseProvider } from "../../providers";
import { neighborhoodConfigs } from "../../configs";

import { TRIGGER_COMPARISON_READS, AddComparison, AddNeighborhoodGroup } from "../actions";
import { IComparison, IMeter } from "../../interfaces";
import { ChartHelper, CostHelper } from "../../helpers";
import { IDateRange } from "../../interfaces/date-range";

@Injectable()
export class ComparisonEffects {
  @Effect()
  public getNeighborhoodReads$ = this._actions$
    .ofType(TRIGGER_COMPARISON_READS)
    .map((action: any) => action.payload)
    .debounceTime(250)
    .switchMap((data: any) => {
      const { meter, dateRange } = data;

      let group = null;
      const subscription: Subscription = this._storeServices.selectComparisonGroup()
        .subscribe((group: any) => {
          group = group;
        });

      return Observable.combineLatest(
        Observable.of(meter),
        Observable.of(dateRange),
        group ? Observable.of(group) :
          this._db.getNeighborhoodGroup(meter).catch(error => {
            console.log("error", error);
            return Observable.of(null);
          }),
        Observable.of(subscription)
      );
    })
    .switchMap((data: any) => {
      const [ meter, dateRange, group, groupSubscription ] = data;
      const { startDate, endDate } = dateRange;
      console.log("group", group);
      if (groupSubscription) {
        groupSubscription.unsubscribe();
      }

      const neighborhoodGroupID = group ? group["group_id"] : null;
      const ncmpAvgGuid = `${neighborhoodGroupID}${neighborhoodConfigs.NEIGHBORHOOD_COMP_AVG_GUID}`;
      const ncmpEffGuid = `${neighborhoodGroupID}${neighborhoodConfigs.NEIGHBORHOOD_COMP_EFF_GUID}`;

      // Check if data is available in the store.
      let storeData;
      const subscription: Subscription = this._storeServices.selectComparisonReads()
        .subscribe((data: IComparison[]) => {
          storeData = data.find(read => {
            return read.guid === meter._guid &&
              read.startDate.toString() === startDate.toString() &&
              read.endDate.toString() === endDate.toString();
          });
      });

      return Observable.combineLatest(
        Observable.of(subscription),
        Observable.of(group),
        Observable.of(meter),
        Observable.of(dateRange),
        storeData ? Observable.of(storeData.usage) : this._db.getReadsByDateRange(meter._guid, dateRange),
        storeData ? Observable.of(storeData.avg) : (group ? this._db.getReadsByNeighborhood(ncmpAvgGuid, dateRange) : []),
        storeData ? Observable.of(storeData.eff) : (group ? this._db.getReadsByNeighborhood(ncmpEffGuid, dateRange) : []),
        storeData ? Observable.of(storeData.rank) : this._db.getNeighborhoodComparisonRanks(meter, dateRange)
      );
    })
    .flatMap((data: any[]) => {
      const [ subscription, group = null, meter, dateRange, usage = [], avg = [], eff = [], rank ] = data;

      if (subscription) {
        subscription.unsubscribe();
      }

      // No need to display chart if avg and eff data is not available.
      if (!avg.length && !eff.length) {
        return [
          new AddNeighborhoodGroup(group),
          new AddComparison(null)
        ];
      }

      // Calculate deltas and costs of average data.
      const avgResult = this._calculateDeltasAndCosts(avg, dateRange, meter);
      const avgDeltas = avgResult.deltas;
      const avgCosts = avgResult.costs;

      // Calculate deltas and costs of efficiency data.
      const effResult = this._calculateDeltasAndCosts(eff, dateRange, meter);
      const effDeltas = effResult.deltas;
      const effCosts = effResult.costs;

      // consumption data
      let useDeltas = [];
      let usageCosts = null;
      if (usage.length) {
        const rawDeltas = ChartHelper.getDeltas(usage);
        const normalizedDeltas = ChartHelper.normalizeData(rawDeltas);

        useDeltas = normalizedDeltas.length ? ChartHelper.groupDeltasByTimeSpan(dateRange, normalizedDeltas) : [];
        usageCosts = rawDeltas.length ? CostHelper.calculateCostFromDeltas(meter, rawDeltas) : null;
      }

      let calcReads = [];
      const loopDeltas = useDeltas.length ? useDeltas : avgDeltas;

      for (let i = 0; i < loopDeltas.length; i++) {
        // Check if consumption data is available.
        // If not available, show average and efficiency data in chart only.
        if (!useDeltas.length) {
          calcReads.push({
            date: loopDeltas[i].date,
            line2: avgDeltas[i].line1 || 0,
            line3: effDeltas[i].line1 || 0
          });
        }
        // Data for all three charts is available.
        else {
          calcReads.push({
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
        usage,
        usageCosts,
        avg,
        avgCosts,
        eff,
        effCosts,
        calcReads,
        rank
      };

      return [
        new AddNeighborhoodGroup(group),
        new AddComparison(payload)
      ];
    })
    .catch(error => {
      console.log("error again", error);

      return [new AddComparison(null)];
    });

  constructor(
    private readonly _actions$: Actions,
    private readonly _db: DatabaseProvider,
    private readonly _storeServices: StoreServices
  ) { }

  /**
   * Calculates deltas and costs from given array containing reads.
   *
   * TODO: Needs to declare an interface for the return type.
   * @param data
   * @param dateRange
   * @param meter
   */
  private _calculateDeltasAndCosts(data: any[], dateRange: IDateRange, meter: IMeter): { deltas: any[], costs: any } {
    let deltas = [];
    let costs = null;

    if (!data.length) {
      return { deltas: [], costs: null };
    }

    const lineData = data.map(d => {
      return {
        date: d.date,
        line1: d.delta
      }
    });

    // group efficiency data by time span
    deltas = ChartHelper.groupDeltasByTimeSpan(dateRange, lineData);
    costs = deltas.length ? CostHelper.calculateCostFromDeltas(meter, deltas) : null;

    return { deltas, costs };
  }

}
