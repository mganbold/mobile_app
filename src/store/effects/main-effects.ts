import { Injectable } from '@angular/core';
import { Effect, Actions } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Storage } from "@ionic/storage";

import { Observable } from "rxjs/rx";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/observable/combineLatest";
import "rxjs/add/observable/fromPromise";

import { LOAD_METERS, LOAD_FROM_DB, AddMeters, LoadFromDb } from "../actions";
import { DatabaseProvider } from "../../providers";
import { IMeter, IUser, IRates } from "../../interfaces";
import { StoreServices } from "../../store/services";

import { CostHelper } from "../../helpers";

@Injectable()
export class MainEffects {
  /**
   * Handles load meters action.
   *
   * Updates the store with data from cache if found.
   * Otherwise, dispatch load from db action to fetch from the API.
   *
   * @memberof MainEffects
   */
  @Effect()
  public checkCacheAndThenLoadData = this._actions$
    .ofType(LOAD_METERS)
    .map((action: any) => action.payload)
    .switchMap((user: IUser) => {
      return Observable.combineLatest(
        Observable.fromPromise(
          // Check if meter data is stored locally by uid as key.
          this._storage.get(user.uid).then(meters => {
            return meters && meters.length ? meters : [];
          })
        ),
        Observable.of(user)
      );
    })
    .map((values: any[]) => {
      const [meters = [], user] = values;

      // Load data from API.
      if (!meters.length) {
        return new LoadFromDb(user);
      }
      return new AddMeters(meters);
    });

  /**
   * Handles load from database action.
   *
   * Fetches meter data from Firebase using uid.
   *
   * @memberof MainEffects
   */
  @Effect()
  public loadMetersDataFromDb = this._actions$
    .ofType(LOAD_FROM_DB)
    .map((action: any) => action.payload)
    .switchMap((user: IUser) => {

      // Send request for org path if it is not already in the store.
      return Observable.combineLatest([
        user.orgPath ? Observable.of(user.orgPath) : this._db.getOrgPathForUser(user.uid),
        Observable.of(user)
      ]);
    })
    .switchMap((values: any[]) => {
      const [orgPath, user] = values;

      // Update the user in the store once orgPath is available.
      this._storeServices.updateUser({ orgPath } as IUser);

      return Observable.combineLatest([
        this._db.getMetersForOrg(orgPath),
        Observable.of(user)
      ]);
    })
    .switchMap((values: any[]) => {
      const [meters, user] = values;

      return Observable.combineLatest([
        this._db.getReadsForMeters(meters),
        Observable.of(user)
      ]);
    })
    .switchMap((values: any[]) => {
      const [meters, user] = values;
      let rates: IRates[];
      let metersWithRates: any[];

      // Gets rates data from the store if available.
      this._storeServices.selectRates().subscribe((data: IRates[]) => {
        rates = data;
      });

      // Check if rates data is available in the store.
      if (rates && rates.length) {
        // Adds rates data to meters data since it is already available in the store.
        metersWithRates = meters.map((meter: IMeter) => {
          const rate = rates.find(r => r._guid === meter._guid);

          return Object.assign({}, meter, {
            _summer: rate ? rate._summer : null,
            _winter: rate ? rate._winter : null,
            _facilityFee: rate ? rate._facilityFee : null
          });
        });
      }

      return Observable.combineLatest([
        metersWithRates && metersWithRates.length
          ? Observable.of(metersWithRates)
          : this._db.getProviderForMeters(meters),
        Observable.of(user)
      ]);
    })
    .map((values: any[]) => {
      const [meters, user] = values;

      // Update rates data in the store.
      const rates = meters.map((meter: IMeter) => {
        return {
          _guid: meter._guid,
          _winter: meter._winter,
          _summer: meter._summer,
          _facilityFee: meter._facilityFee
        };
      });
      this._storeServices.addRates(rates);

      // Sets sum of reads diffs to _usage property.
      this._helper.calcUsageDiffs(meters);

      // Sets actual usage cost to _actualUsageCost property.
      this._helper.calcUsageCost(meters);

      // Store meter data locally by uid as key.
      this._storage.set(user.uid, meters);

      // Dispatch action to update the store.
      return new AddMeters(meters);
    });

  /**
   * Creates an instance of MainEffects.
   * @param {Actions} _actions$
   * @param {DatabaseProvider} _db
   * @memberof MainEffects
   */
  constructor(
    private readonly _actions$: Actions,
    private readonly _db: DatabaseProvider,
    private readonly _helper: CostHelper,
    private readonly _storage: Storage,
    private readonly _storeServices: StoreServices
  ) { }

}
